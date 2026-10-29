/**
 * The one way money goes back.
 *
 * Every refund, from a member's own ticket page to an admin undoing a
 * membership charge, calls `refundTransaction`. It looks the charge up at
 * Authorize.net and does the right thing for its state:
 *
 *   not yet settled, whole amount   → void
 *   not yet settled, part of it     → wait; the hourly job refunds once settled
 *   settled                         → refund, with the card's real last four
 *   already voided / fully returned → record it as done
 *
 * The `refund` row is written before the gateway is called, so an unknown
 * outcome can be found again by invoice number. When the gateway says yes,
 * every effect (ledger, order, tickets, membership, referrals, access) is
 * applied in one database transaction.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	event as eventTable,
	memberReferral,
	order as orderTable,
	partnerReferral,
	payment,
	refund as refundTable,
	refundRequest,
	subscription,
	subscriptionInvoice,
	ticket as ticketTable,
	user as userTable
} from '$lib/server/db/schema.js';
import { authnet, AuthnetError, describeOutcome } from '$lib/server/authnet/client.js';
import { bump } from '$lib/server/cache/index.js';
import { logMemberEvent, markRefunded, money } from '$lib/server/payments/ledger.js';
import { nextInvoiceNumber } from '$lib/server/payments/invoice.js';
import { applyAccess } from '$lib/server/billing/access.js';
import {
	sendRefundDoneEmail,
	sendRefundRequestDecidedEmail,
	sendRefundRequestReceivedEmail
} from '$lib/server/email.js';
import { sendOnce } from '$lib/server/billing/notices.js';

const UNSETTLED = new Set([
	'capturedPendingSettlement',
	'authorizedPendingCapture',
	'FDSPendingReview',
	'FDSAuthorizedPendingReview',
	'approvedReview',
	'underReview',
	'pendingFinalSettlement',
	'pendingSettlement',
	'updatingSettlement'
]);
const SETTLED = new Set(['settledSuccessfully', 'settledSuccessfullyWithDiscrepancy']);
const NEVER_COLLECTED = new Set([
	'declined',
	'generalError',
	'expired',
	'failedReview',
	'communicationError',
	'settlementError',
	'couldNotVoid'
]);

/** Hours before an event that members can refund a ticket themselves. */
export const SELF_REFUND_CUTOFF_HOURS = 24;

/**
 * Refund (or void) part or all of a charge.
 *
 * @param {{
 *   transId: string, amountCents: number, reason?: string|null, requestedBy?: string|null,
 *   orderId?: string|null, ticketIds?: string[], subscriptionInvoiceId?: string|null,
 *   subscriptionEffect?: 'keep'|'end_now'|'cancel_at_period_end'|null, refundRequestId?: string|null,
 *   notify?: boolean
 * }} input
 * @returns {Promise<{ ok: boolean, status: 'succeeded'|'waiting_settlement'|'pending'|'failed', method?: string, message: string, refundId?: string, voided?: boolean }>}
 */
export async function refundTransaction(input) {
	const {
		transId,
		reason = null,
		requestedBy = null,
		orderId = null,
		ticketIds = [],
		subscriptionInvoiceId = null,
		subscriptionEffect = null,
		refundRequestId = null,
		notify = true
	} = input;
	let amountCents = Math.round(Number(input.amountCents));
	if (!transId || !/^\d+$/.test(String(transId))) {
		return {
			ok: false,
			status: 'failed',
			message: 'This record has no payment transaction to refund.'
		};
	}
	if (!amountCents || amountCents <= 0) {
		return { ok: false, status: 'failed', message: 'The refund amount must be more than zero.' };
	}

	// What the ledger says is still refundable.
	const [ledger] = await db
		.select()
		.from(payment)
		.where(eq(payment.transId, String(transId)))
		.limit(1);
	if (ledger) {
		const left = Math.round((Number(ledger.amount) - Number(ledger.refundedAmount)) * 100);
		if (left <= 0) {
			return {
				ok: false,
				status: 'failed',
				message: 'This charge has already been refunded in full.'
			};
		}
		if (amountCents > left) amountCents = left;
	}

	// Write the intent. The partial unique index allows one in-flight refund
	// per transaction.
	let row;
	try {
		[row] = await db
			.insert(refundTable)
			.values({
				transId: String(transId),
				amountCents,
				status: 'pending',
				reason,
				requestedBy,
				orderId,
				ticketIds,
				subscriptionInvoiceId,
				subscriptionEffect,
				refundRequestId
			})
			.returning();
	} catch (err) {
		if (err?.code === '23505' || err?.cause?.code === '23505') {
			return {
				ok: false,
				status: 'failed',
				message: 'A refund for this charge is already in progress.'
			};
		}
		throw err;
	}

	const fail = async (message) => {
		await db
			.update(refundTable)
			.set({ status: 'failed', lastError: message, completedAt: new Date() })
			.where(eq(refundTable.id, row.id));
		return { ok: false, status: 'failed', message, refundId: row.id };
	};

	// Look the charge up.
	let details;
	try {
		details = await authnet.getTransactionDetails(transId);
	} catch (err) {
		return fail(
			err instanceof AuthnetError && err.unknown
				? "Authorize.net couldn't be reached. Nothing was changed; try again in a minute."
				: `Authorize.net: ${err.message}`
		);
	}
	if (!details) return fail('Authorize.net has no record of this transaction.');
	if (
		details.type &&
		details.type !== 'authCaptureTransaction' &&
		details.type !== 'authOnlyTransaction' &&
		details.type !== 'priorAuthCaptureTransaction'
	) {
		return fail(`This transaction is a ${details.type.replace('Transaction', '')}, not a charge.`);
	}

	const collected = details.settleAmountCents ?? details.authAmountCents ?? 0;
	const returned = (details.returnedItems || []).reduce(
		(sum, r) => sum + Math.round(Number(r.amount || 0) * 100),
		0
	);
	const remaining = collected - returned;

	// Already voided, or every cent already returned: record it as done.
	if (
		details.status === 'voided' ||
		(remaining <= 0 && collected > 0 && !NEVER_COLLECTED.has(details.status))
	) {
		await completeRefund(row, {
			method: 'none',
			refundTransId: null,
			amountCents: Math.min(amountCents, collected),
			voided: details.status === 'voided',
			notify
		});
		return {
			ok: true,
			status: 'succeeded',
			method: 'none',
			voided: true,
			refundId: row.id,
			message: 'This charge had already been returned; our records are now up to date.'
		};
	}
	if (NEVER_COLLECTED.has(details.status)) {
		return fail(`This charge was never collected (status: ${details.status}). Nothing to refund.`);
	}
	if (amountCents > remaining) amountCents = remaining;

	// Unsettled: void the whole thing, or wait to refund a part of it.
	if (UNSETTLED.has(details.status)) {
		if (amountCents >= remaining && returned === 0) {
			const outcome = await authnet.voidTransaction(transId, { refId: row.id.slice(0, 20) });
			if (outcome.outcome === 'approved') {
				await completeRefund(row, {
					method: 'void',
					refundTransId: outcome.transId,
					amountCents,
					voided: true,
					notify
				});
				return {
					ok: true,
					status: 'succeeded',
					method: 'void',
					voided: true,
					refundId: row.id,
					message: 'The charge was cancelled before it settled.'
				};
			}
			if (outcome.outcome === 'unknown') {
				await db
					.update(refundTable)
					.set({ method: 'void', lastError: outcome.message })
					.where(eq(refundTable.id, row.id));
				return {
					ok: false,
					status: 'pending',
					method: 'void',
					refundId: row.id,
					message: describeOutcome(outcome)
				};
			}
			return fail(`Authorize.net would not void it: ${outcome.message || outcome.code}`);
		}
		// Part of an unsettled charge: release what's being refunded now and
		// let the hourly job send the refund once the batch settles.
		await db.transaction(async (tx) => {
			await tx
				.update(refundTable)
				.set({ status: 'waiting_settlement', method: 'refund', amountCents })
				.where(eq(refundTable.id, row.id));
			await applySideEffects(tx, { ...row, amountCents }, { at: new Date(), provisional: true });
		});
		await bump('tickets', 'orders', 'users');
		return {
			ok: true,
			status: 'waiting_settlement',
			method: 'refund',
			refundId: row.id,
			message: 'The charge settles tonight; the refund goes out automatically after that.'
		};
	}

	if (!SETTLED.has(details.status)) {
		return fail(`This charge can't be refunded right now (status: ${details.status}).`);
	}
	if (!details.lastFour)
		return fail("Authorize.net didn't return the card digits needed for a refund.");

	return executeRefund(row, { amountCents, lastFour: details.lastFour, notify });
}

/** Send the refund for a settled charge and record the result. */
export async function executeRefund(row, { amountCents, lastFour, notify = true }) {
	const invoiceNumber = row.invoiceNumber || (await nextInvoiceNumber('refund'));
	await db
		.update(refundTable)
		.set({
			method: 'refund',
			invoiceNumber,
			amountCents,
			status: row.status === 'waiting_settlement' ? 'waiting_settlement' : 'pending'
		})
		.where(eq(refundTable.id, row.id));
	const outcome = await authnet.refundTransaction({
		transId: row.transId,
		amountCents,
		lastFour,
		invoiceNumber
	});
	if (outcome.outcome === 'approved') {
		await completeRefund(
			{ ...row, invoiceNumber },
			{
				method: 'refund',
				refundTransId: outcome.transId,
				amountCents,
				voided: false,
				notify,
				lastFour
			}
		);
		return {
			ok: true,
			status: 'succeeded',
			method: 'refund',
			refundId: row.id,
			message: `${dollars(amountCents)} refunded to the card ending ${lastFour}.`
		};
	}
	if (outcome.outcome === 'unknown') {
		await db
			.update(refundTable)
			.set({ lastError: outcome.message })
			.where(eq(refundTable.id, row.id));
		return {
			ok: false,
			status: 'pending',
			method: 'refund',
			refundId: row.id,
			message: describeOutcome(outcome)
		};
	}
	const message = `Authorize.net declined the refund: ${outcome.message || outcome.code}`;
	await db
		.update(refundTable)
		.set({ status: 'failed', lastError: message, completedAt: new Date() })
		.where(eq(refundTable.id, row.id));
	return { ok: false, status: 'failed', message, refundId: row.id };
}

/** Mark the refund done and apply every effect, in one transaction. */
async function completeRefund(
	row,
	{ method, refundTransId, amountCents, voided, notify, lastFour = null }
) {
	const at = new Date();
	const info = await db.transaction(async (tx) => {
		await tx
			.update(refundTable)
			.set({ status: 'succeeded', method, refundTransId, amountCents, completedAt: at })
			.where(eq(refundTable.id, row.id));
		// Effects already applied when the refund began waiting for settlement.
		if (row.status === 'waiting_settlement') return await describeFor(tx, row);
		return await applySideEffects(tx, { ...row, amountCents }, { at });
	});
	await bump('tickets', 'orders', 'users');
	if (notify && info?.email) {
		await sendOnce('refund_done', row.id, info.userId, () =>
			sendRefundDoneEmail(info.email, {
				amountCents,
				what: info.what,
				lastFour: lastFour || info.lastFour,
				voided
			})
		);
	}
}

/**
 * Everything a successful refund changes. `provisional` is the partial
 * unsettled case: the ticket is released now and the ledger catches up
 * when the money actually moves.
 */
async function applySideEffects(tx, row, { at, provisional = false }) {
	const amount = money(row.amountCents / 100);
	let userId = null;
	let email = null;
	let what = 'your purchase';
	let lastFour = null;

	if (!provisional) await markRefunded(row.transId, row.amountCents / 100, at, { tx });

	// The order.
	let ord = null;
	if (row.orderId) {
		[ord] = await tx.select().from(orderTable).where(eq(orderTable.id, row.orderId)).limit(1);
	} else {
		[ord] = await tx
			.select()
			.from(orderTable)
			.where(eq(orderTable.providerRef, String(row.transId)))
			.limit(1);
	}
	if (ord) {
		const total = Number(ord.amount) || 0;
		const refunded = Math.min(total, Number(ord.refundedAmount || 0) + Number(amount));
		await tx
			.update(orderTable)
			.set({
				refundedAmount: money(refunded),
				refundedAt: refunded >= total - 0.001 || !ord.refundedAt ? at : ord.refundedAt
			})
			.where(eq(orderTable.id, ord.id));
		userId = ord.userId || null;
		email = ord.userEmail || null;
		lastFour = ord.meta?.cardLastFour || null;
		if (ord.meta?.eventTitle) what = `your ticket to ${ord.meta.eventTitle}`;
		if (
			ord.kind === 'subscription_first' ||
			ord.kind === 'subscription_renewal' ||
			ord.meta?.type?.startsWith('subscription')
		) {
			what = 'your AGE membership';
		}
	}

	// Tickets.
	let ticketIds = row.ticketIds || [];
	if (ticketIds.length === 0 && ord && (ord.kind === 'ticket' || ord.meta?.type === 'ticket')) {
		// A whole-order refund with no tickets named: all of the order's tickets.
		const left = Math.round(((Number(ord.amount) || 0) - Number(ord.refundedAmount || 0)) * 100);
		if (row.amountCents >= left - 1) {
			const rows = await tx
				.select({ id: ticketTable.id })
				.from(ticketTable)
				.where(and(eq(ticketTable.orderId, ord.id), eq(ticketTable.refunded, false)));
			ticketIds = rows.map((r) => r.id);
		}
	}
	if (ticketIds.length) {
		const rows = await tx
			.update(ticketTable)
			.set({ refunded: true, refundedAt: at })
			.where(and(inArray(ticketTable.id, ticketIds), eq(ticketTable.refunded, false)))
			.returning({ id: ticketTable.id, userId: ticketTable.userId, eventId: ticketTable.eventId });
		if (rows[0]) {
			userId = userId || rows[0].userId;
			const [ev] = await tx
				.select({ title: eventTable.title })
				.from(eventTable)
				.where(eq(eventTable.id, rows[0].eventId))
				.limit(1);
			if (ev)
				what =
					rows.length > 1 ? `${rows.length} tickets to ${ev.title}` : `your ticket to ${ev.title}`;
		}
	}

	// A membership charge.
	let inv = null;
	if (row.subscriptionInvoiceId) {
		[inv] = await tx
			.select()
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.id, row.subscriptionInvoiceId))
			.limit(1);
	} else {
		[inv] = await tx
			.select()
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.transId, String(row.transId)))
			.limit(1);
	}
	if (inv) {
		const refundedCents = Math.min(inv.amountCents, inv.refundedCents + row.amountCents);
		await tx
			.update(subscriptionInvoice)
			.set({
				refundedCents,
				status: refundedCents >= inv.amountCents ? 'refunded' : inv.status,
				updatedAt: at
			})
			.where(eq(subscriptionInvoice.id, inv.id));
		const [sub] = await tx
			.select()
			.from(subscription)
			.where(eq(subscription.id, inv.subscriptionId))
			.limit(1);
		if (sub) {
			userId = userId || sub.userId;
			what = 'your AGE membership';
			const effect = row.subscriptionEffect || 'keep';
			if (effect === 'end_now' && sub.status !== 'ended') {
				await tx
					.update(subscription)
					.set({
						status: 'ended',
						endedAt: at,
						endReason: 'refunded',
						nextChargeAt: null,
						nextAttemptAt: null,
						leaseUntil: null,
						updatedAt: at
					})
					.where(eq(subscription.id, sub.id));
				await logMemberEvent(
					{
						userId: sub.userId,
						kind: 'ended',
						subscriptionId: sub.ref,
						subscriptionType: sub.plan,
						reason: 'refunded',
						actorId: row.requestedBy,
						at
					},
					{ tx }
				);
			} else if (
				effect === 'cancel_at_period_end' &&
				(sub.status === 'active' || sub.status === 'past_due')
			) {
				await tx
					.update(subscription)
					.set({
						status: 'cancelled',
						cancelledAt: at,
						nextChargeAt: null,
						nextAttemptAt: null,
						pendingPlan: null,
						pendingPriceCents: null,
						updatedAt: at
					})
					.where(eq(subscription.id, sub.id));
				await logMemberEvent(
					{
						userId: sub.userId,
						kind: 'cancelled',
						subscriptionId: sub.ref,
						subscriptionType: sub.plan,
						reason: 'refunded',
						actorId: row.requestedBy,
						at
					},
					{ tx }
				);
			}
			// Promo bookkeeping: a refunded first charge voids the partner's
			// commission and stops a pending member-referral reward.
			if (inv.seq === 1) {
				await tx
					.update(partnerReferral)
					.set({ voidedAt: at, voidReason: 'first charge refunded' })
					.where(
						and(
							eq(partnerReferral.subscriptionId, sub.id),
							eq(partnerReferral.payoutStatus, 'pending'),
							sql`${partnerReferral.voidedAt} is null`
						)
					);
				await tx
					.update(memberReferral)
					.set({ status: 'cancelled' })
					.where(
						and(eq(memberReferral.subscriptionId, sub.id), eq(memberReferral.status, 'pending'))
					);
			}
		}
	}

	if (row.refundRequestId) {
		await tx
			.update(refundRequest)
			.set({ status: 'approved', decidedAt: at, decidedBy: row.requestedBy, refundId: row.id })
			.where(eq(refundRequest.id, row.refundRequestId));
	}

	if (userId) {
		await logMemberEvent(
			{
				userId,
				kind: 'refunded',
				reason: row.reason,
				actorId: row.requestedBy,
				at,
				meta: { transId: row.transId, amountCents: row.amountCents, what }
			},
			{ tx }
		);
		await applyAccess(userId, { tx });
		if (!email) {
			const [u] = await tx
				.select({ email: userTable.email })
				.from(userTable)
				.where(eq(userTable.id, userId))
				.limit(1);
			email = u?.email || null;
		}
	}
	return { userId, email, what, lastFour };
}

/** Re-derive who to tell about a refund whose effects were applied earlier. */
async function describeFor(tx, row) {
	let userId = null;
	let email = null;
	let what = 'your purchase';
	let lastFour = null;
	if (row.orderId) {
		const [ord] = await tx.select().from(orderTable).where(eq(orderTable.id, row.orderId)).limit(1);
		if (ord) {
			userId = ord.userId;
			email = ord.userEmail;
			lastFour = ord.meta?.cardLastFour || null;
			if (ord.meta?.eventTitle) what = `your ticket to ${ord.meta.eventTitle}`;
		}
	}
	if (!email && (row.ticketIds || []).length) {
		const [t] = await tx
			.select({ userId: ticketTable.userId })
			.from(ticketTable)
			.where(eq(ticketTable.id, row.ticketIds[0]))
			.limit(1);
		userId = userId || t?.userId || null;
	}
	if (userId && !email) {
		const [u] = await tx
			.select({ email: userTable.email })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.limit(1);
		email = u?.email || null;
	}
	return { userId, email, what, lastFour };
}

const dollars = (c) => `$${(c / 100).toFixed(2)}`;

// ---------------------------------------------------------------- tickets

/** Hours until an event starts (negative once it has). */
/**
 * Event times are stored as the venue's wall clock (see src/lib/server/dates.js),
 * so "now" has to be expressed the same way before the two are compared.
 */
const VENUE_TZ = {
	'Los Angeles': 'America/Los_Angeles',
	'St. Louis': 'America/Chicago',
	'New England': 'America/New_York'
};
export function venueNow(circuit, now = new Date()) {
	const tz = VENUE_TZ[circuit] || 'America/Chicago';
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
			.formatToParts(now)
			.map((p) => [p.type, p.value])
	);
	return new Date(
		Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
	);
}

export function hoursUntil(eventDate, now = new Date(), circuit = null) {
	if (!eventDate) return Infinity;
	return (new Date(eventDate).getTime() - venueNow(circuit, now).getTime()) / 3600000;
}

/**
 * What a member can do about a ticket right now.
 * @returns {'refund' | 'request' | 'none'} plus a reason when 'none'
 */
export function ticketRefundability(ticket, event, pendingRequest = null, now = new Date()) {
	if (!ticket || ticket.refunded) return { action: 'none', reason: 'Already refunded.' };
	if (!ticket.transactionId || !(Number(ticket.amountPaid) > 0)) {
		return { action: 'none', reason: 'This ticket was free.' };
	}
	const h = hoursUntil(event?.eventDate, now, event?.circuit);
	if (h <= 0) return { action: 'none', reason: 'The event has started.' };
	if (pendingRequest)
		return { action: 'none', reason: 'A refund request is waiting for review.', pending: true };
	if (h > SELF_REFUND_CUTOFF_HOURS) return { action: 'refund' };
	return { action: 'request' };
}

/**
 * A member refunds their own ticket. Inside the cutoff, a request is filed
 * for an admin instead.
 */
export async function memberRefundTicket({ user, ticketId, reason = null }) {
	const [t] = await db
		.select()
		.from(ticketTable)
		.where(and(eq(ticketTable.id, ticketId), eq(ticketTable.userId, user.id)))
		.limit(1);
	if (!t) return { ok: false, status: 'failed', message: 'Ticket not found.' };
	const [ev] = await db.select().from(eventTable).where(eq(eventTable.id, t.eventId)).limit(1);
	const [pending] = await db
		.select({ id: refundRequest.id })
		.from(refundRequest)
		.where(and(eq(refundRequest.ticketId, t.id), eq(refundRequest.status, 'pending')))
		.limit(1);
	const can = ticketRefundability(t, ev, pending);
	if (can.action === 'none') return { ok: false, status: 'failed', message: can.reason };

	if (can.action === 'request') {
		const [req] = await db
			.insert(refundRequest)
			.values({ ticketId: t.id, userId: user.id, reason })
			.onConflictDoNothing()
			.returning();
		if (req) {
			await sendOnce('refund_request_received', req.id, user.id, () =>
				sendRefundRequestReceivedEmail(user.email, { eventTitle: ev?.title || 'the event' })
			);
			await bump('orders');
		}
		return {
			ok: true,
			status: 'requested',
			message:
				"The event is less than 24 hours away, so we've sent your request to the team. You'll hear back by email."
		};
	}

	return refundTransaction({
		transId: t.transactionId,
		amountCents: Math.round(Number(t.amountPaid) * 100),
		reason: reason || 'member self-service',
		requestedBy: user.id,
		orderId: t.orderId,
		ticketIds: [t.id]
	});
}

export async function withdrawRefundRequest({ user, requestId }) {
	const [row] = await db
		.update(refundRequest)
		.set({ status: 'withdrawn', decidedAt: new Date() })
		.where(
			and(
				eq(refundRequest.id, requestId),
				eq(refundRequest.userId, user.id),
				eq(refundRequest.status, 'pending')
			)
		)
		.returning();
	if (row) await bump('orders');
	return { ok: !!row };
}

/** An admin approves a late refund request: the ticket is refunded in full. */
export async function approveRefundRequest({ actor, requestId, note = null }) {
	const [req] = await db
		.select()
		.from(refundRequest)
		.where(eq(refundRequest.id, requestId))
		.limit(1);
	if (!req || req.status !== 'pending')
		return { ok: false, status: 'failed', message: 'This request is no longer pending.' };
	const [t] = await db.select().from(ticketTable).where(eq(ticketTable.id, req.ticketId)).limit(1);
	if (!t || t.refunded) {
		await db
			.update(refundRequest)
			.set({ status: 'approved', decidedAt: new Date(), decidedBy: actor.id, decisionNote: note })
			.where(eq(refundRequest.id, req.id));
		return {
			ok: true,
			status: 'succeeded',
			message: 'The ticket was already refunded; the request is closed.'
		};
	}
	const result = await refundTransaction({
		transId: t.transactionId,
		amountCents: Math.round(Number(t.amountPaid) * 100),
		reason: note || req.reason || 'refund request approved',
		requestedBy: actor.id,
		orderId: t.orderId,
		ticketIds: [t.id],
		refundRequestId: req.id
	});
	if (result.ok && result.status !== 'pending') {
		const [ev] = await db
			.select({ title: eventTable.title })
			.from(eventTable)
			.where(eq(eventTable.id, t.eventId))
			.limit(1);
		const [u] = await db
			.select({ email: userTable.email })
			.from(userTable)
			.where(eq(userTable.id, req.userId))
			.limit(1);
		if (note)
			await db
				.update(refundRequest)
				.set({ decisionNote: note })
				.where(eq(refundRequest.id, req.id));
		if (u?.email) {
			await sendOnce('refund_request_decided', req.id, req.userId, () =>
				sendRefundRequestDecidedEmail(u.email, {
					eventTitle: ev?.title || 'the event',
					approved: true,
					note
				})
			);
		}
	}
	return result;
}

export async function declineRefundRequest({ actor, requestId, note = null }) {
	const [req] = await db
		.update(refundRequest)
		.set({ status: 'declined', decidedAt: new Date(), decidedBy: actor.id, decisionNote: note })
		.where(and(eq(refundRequest.id, requestId), eq(refundRequest.status, 'pending')))
		.returning();
	if (!req) return { ok: false, message: 'This request is no longer pending.' };
	const [t] = await db
		.select({ eventId: ticketTable.eventId })
		.from(ticketTable)
		.where(eq(ticketTable.id, req.ticketId))
		.limit(1);
	const [ev] = t
		? await db
				.select({ title: eventTable.title })
				.from(eventTable)
				.where(eq(eventTable.id, t.eventId))
				.limit(1)
		: [];
	const [u] = await db
		.select({ email: userTable.email })
		.from(userTable)
		.where(eq(userTable.id, req.userId))
		.limit(1);
	if (u?.email) {
		await sendOnce('refund_request_decided', req.id, req.userId, () =>
			sendRefundRequestDecidedEmail(u.email, {
				eventTitle: ev?.title || 'the event',
				approved: false,
				note
			})
		);
	}
	await bump('orders');
	return { ok: true, message: 'Request declined.' };
}

/**
 * Admin: refund what is left of an order. Membership orders recorded under
 * the old system point at an ARB id, not a charge; those are refunded from
 * the ledger (per transaction) instead.
 */
export async function refundOrderRemainder({
	actor,
	orderId,
	reason = null,
	subscriptionEffect = null
}) {
	const [ord] = await db.select().from(orderTable).where(eq(orderTable.id, orderId)).limit(1);
	if (!ord) return { ok: false, status: 'failed', message: 'Order not found.' };
	if (
		!/^\d+$/.test(String(ord.providerRef)) ||
		ord.kind === 'legacy_subscription' ||
		ord.meta?.type === 'subscription'
	) {
		return {
			ok: false,
			status: 'failed',
			message:
				'This membership order records a subscription, not a charge. Refund individual charges from the member’s payment history.'
		};
	}
	const left = Math.round(((Number(ord.amount) || 0) - Number(ord.refundedAmount || 0)) * 100);
	if (left <= 0)
		return {
			ok: false,
			status: 'failed',
			message: 'This order has already been refunded in full.'
		};
	return refundTransaction({
		transId: ord.providerRef,
		amountCents: left,
		reason,
		requestedBy: actor.id,
		orderId: ord.id,
		subscriptionEffect
	});
}

/** Pending refund requests with their ticket, event and member. */
export async function listRefundRequests({ status = 'pending', limit = 100 } = {}) {
	return db
		.select({
			id: refundRequest.id,
			status: refundRequest.status,
			reason: refundRequest.reason,
			createdAt: refundRequest.createdAt,
			decidedAt: refundRequest.decidedAt,
			decisionNote: refundRequest.decisionNote,
			ticketId: ticketTable.id,
			ticketCode: ticketTable.code,
			amountPaid: ticketTable.amountPaid,
			transactionId: ticketTable.transactionId,
			eventId: eventTable.id,
			eventTitle: eventTable.title,
			eventDate: eventTable.eventDate,
			userId: userTable.id,
			email: userTable.email,
			firstName: userTable.firstName,
			lastName: userTable.lastName
		})
		.from(refundRequest)
		.innerJoin(ticketTable, eq(ticketTable.id, refundRequest.ticketId))
		.innerJoin(eventTable, eq(eventTable.id, ticketTable.eventId))
		.innerJoin(userTable, eq(userTable.id, refundRequest.userId))
		.where(status === 'all' ? sql`true` : eq(refundRequest.status, status))
		.orderBy(sql`${refundRequest.createdAt} desc`)
		.limit(limit);
}

export async function countPendingRefundRequests() {
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(refundRequest)
		.where(eq(refundRequest.status, 'pending'));
	return Number(n) || 0;
}

// ---------------------------------------------------------------- reconciliation

/**
 * A partial refund of a charge that hadn't settled: once the charge has
 * settled, send the refund. Returns true when the refund is finished.
 */
export async function settleWaitingRefund(row) {
	let details;
	try {
		details = await authnet.getTransactionDetails(row.transId);
	} catch {
		return false;
	}
	if (!details) return false;
	if (details.status === 'voided') {
		await completeRefund(row, {
			method: 'none',
			refundTransId: null,
			amountCents: row.amountCents,
			voided: true,
			notify: true
		});
		return true;
	}
	if (!SETTLED.has(details.status)) return false;
	if (!details.lastFour) return false;
	const r = await executeRefund(row, { amountCents: row.amountCents, lastFour: details.lastFour });
	return r.status !== 'pending';
}

/**
 * A refund or void we sent but never heard back about. Looks for it at the
 * gateway: a returned item on the original charge, or a transaction under
 * the refund's invoice number. After two hours with nothing found, the
 * attempt is recorded as failed so it can be made again.
 */
export async function resolvePendingRefund(row, { now = new Date() } = {}) {
	let details;
	try {
		details = await authnet.getTransactionDetails(row.transId);
	} catch {
		return false;
	}
	if (details?.status === 'voided') {
		await completeRefund(row, {
			method: 'void',
			refundTransId: null,
			amountCents: row.amountCents,
			voided: true,
			notify: true
		});
		return true;
	}
	const since = new Date(row.createdAt).getTime() - 60000;
	const item = (details?.returnedItems || []).find(
		(r) =>
			Math.round(Number(r.amount || 0) * 100) === row.amountCents &&
			(!r.dateUTC || new Date(r.dateUTC).getTime() >= since)
	);
	if (item) {
		await completeRefund(row, {
			method: 'refund',
			refundTransId: item.transId ? String(item.transId) : null,
			amountCents: row.amountCents,
			voided: false,
			notify: true,
			lastFour: details?.lastFour
		});
		return true;
	}
	if (row.invoiceNumber) {
		try {
			const unsettled = await authnet.listUnsettled({ limit: 1000 });
			const hit = unsettled.find((t) => t.invoiceNumber === row.invoiceNumber);
			if (hit) {
				await completeRefund(row, {
					method: 'refund',
					refundTransId: hit.transId,
					amountCents: row.amountCents,
					voided: false,
					notify: true,
					lastFour: details?.lastFour
				});
				return true;
			}
		} catch {
			/* try again next run */
		}
	}
	if (now.getTime() - new Date(row.createdAt).getTime() > 2 * 3600000) {
		await db
			.update(refundTable)
			.set({
				status: 'failed',
				lastError:
					'Outcome could not be confirmed with Authorize.net; check the dashboard before refunding again.',
				completedAt: now
			})
			.where(eq(refundTable.id, row.id));
		return true;
	}
	return false;
}
