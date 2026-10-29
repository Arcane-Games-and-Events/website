/**
 * "Did it go through?"
 *
 * A charge whose outcome never came back (timeout, held for review,
 * duplicate filter) is never retried blindly. Every charge carries an
 * invoice number, so the gateway is asked what it has under that number:
 * the customer's transaction list first, then today's unsettled batch.
 * Found and approved → finalized as paid. Found and declined → declined.
 * Not found after half an hour → nothing happened; the invoice reopens.
 */
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	checkout as checkoutTable,
	refund as refundTable,
	subscription,
	subscriptionInvoice,
	user as userTable
} from '$lib/server/db/schema.js';
import { authnet } from '$lib/server/authnet/client.js';
import { fulfilCheckout, markCheckout } from '$lib/server/payments/checkout.js';
import { resolvePendingRefund, settleWaitingRefund } from '$lib/server/payments/refunds.js';
import { getPartnerByCode } from '$lib/server/partner-code.js';
import { getMemberReferralByCode } from '$lib/server/member-referral.js';
import { quoteFirstCharge } from './plans.js';

const APPROVED = new Set([
	'capturedPendingSettlement',
	'settledSuccessfully',
	'settledSuccessfullyWithDiscrepancy',
	'authorizedPendingCapture',
	'pendingSettlement',
	'pendingFinalSettlement',
	'updatingSettlement'
]);
const DECLINED = new Set([
	'declined',
	'generalError',
	'expired',
	'failedReview',
	'communicationError',
	'voided'
]);
const STILL_UNKNOWN = new Set([
	'FDSPendingReview',
	'FDSAuthorizedPendingReview',
	'underReview',
	'approvedReview'
]);

const MINUTES = 60000;
const LOOKBACK_MINUTES = 10; // how long a 'charging' row may sit before we look
const GIVE_UP_MINUTES = 30; // not found after this → nothing was charged

/** Look a charge up by its invoice number. */
export async function findByInvoiceNumber({ invoiceNumber, customerProfileId = null }) {
	if (!invoiceNumber) return null;
	if (customerProfileId) {
		try {
			const list = await authnet.listForCustomer(customerProfileId, { limit: 100 });
			const hit = list.find((t) => t.invoiceNumber === invoiceNumber);
			if (hit) return hit;
		} catch (err) {
			console.warn('[reconcile] listForCustomer failed:', err?.message);
		}
	}
	try {
		const unsettled = await authnet.listUnsettled({ limit: 1000 });
		const hit = unsettled.find((t) => t.invoiceNumber === invoiceNumber);
		if (hit) return hit;
	} catch (err) {
		console.warn('[reconcile] listUnsettled failed:', err?.message);
	}
	return null;
}

export async function reconcileAll({ now = new Date() } = {}) {
	const out = { invoices: 0, checkouts: 0, refunds: 0, resolved: 0 };
	const lookback = new Date(now.getTime() - LOOKBACK_MINUTES * MINUTES);

	const invoices = await db
		.select()
		.from(subscriptionInvoice)
		.where(
			sql`${subscriptionInvoice.status} = 'unknown' or (${subscriptionInvoice.status} = 'charging' and ${subscriptionInvoice.lastAttemptAt} < ${lookback.toISOString()}::timestamptz)`
		)
		.limit(50);
	for (const inv of invoices) {
		out.invoices++;
		try {
			if (await reconcileInvoice(inv, { now })) out.resolved++;
		} catch (err) {
			console.error(`[reconcile] invoice ${inv.id}:`, err?.message || err);
		}
	}

	const checkouts = await db
		.select()
		.from(checkoutTable)
		.where(
			and(
				inArray(checkoutTable.status, ['charging', 'unknown', 'paid']),
				lte(checkoutTable.updatedAt, lookback)
			)
		)
		.limit(50);
	for (const co of checkouts) {
		out.checkouts++;
		try {
			if (await reconcileCheckout(co, { now })) out.resolved++;
		} catch (err) {
			console.error(`[reconcile] checkout ${co.id}:`, err?.message || err);
		}
	}

	const refunds = await db
		.select()
		.from(refundTable)
		.where(
			sql`${refundTable.status} = 'waiting_settlement' or (${refundTable.status} = 'pending' and ${refundTable.createdAt} < ${lookback.toISOString()}::timestamptz)`
		)
		.limit(50);
	for (const r of refunds) {
		out.refunds++;
		try {
			const done =
				r.status === 'waiting_settlement'
					? await settleWaitingRefund(r)
					: await resolvePendingRefund(r, { now });
			if (done) out.resolved++;
		} catch (err) {
			console.error(`[reconcile] refund ${r.id}:`, err?.message || err);
		}
	}
	return out;
}

/** Resolve one membership invoice. Returns true when it is no longer unknown. */
export async function reconcileInvoice(inv, { now = new Date() } = {}) {
	const [sub] = await db
		.select()
		.from(subscription)
		.where(eq(subscription.id, inv.subscriptionId))
		.limit(1);
	if (!sub) return false;
	const found = await findByInvoiceNumber({
		invoiceNumber: inv.invoiceNumber,
		customerProfileId: sub.customerProfileId
	});
	const { finalizePaidInvoice, recordRenewalDecline } = await import('./renewals.js');
	const { finalizeFirstCharge, currentCard } = await import('./subscriptions.js');

	if (found && APPROVED.has(found.status)) {
		let details = null;
		try {
			details = await authnet.getTransactionDetails(found.transId);
		} catch {
			/* finalize without the network id */
		}
		const outcome = {
			outcome: 'approved',
			transId: found.transId,
			networkTransId: details?.networkTransId || null,
			lastFour: found.lastFour || details?.lastFour || null
		};
		if (inv.kind === 'first' && sub.status === 'incomplete') {
			const [user] = await db.select().from(userTable).where(eq(userTable.id, sub.userId)).limit(1);
			const card = (await currentCard(sub)) || {
				lastFour: outcome.lastFour,
				cardType: found.cardType
			};
			const quote = {
				...quoteFirstCharge(inv.plan || sub.plan, sub.promoKind),
				promoKind: sub.promoKind,
				promoCode: sub.promoCode,
				partner: sub.promoKind === 'partner' ? await getPartnerByCode(sub.promoCode) : null,
				referral:
					sub.promoKind === 'member_referral' ? await getMemberReferralByCode(sub.promoCode) : null
			};
			await finalizeFirstCharge({ sub, inv, user, card, quote, outcome });
		} else {
			await finalizePaidInvoice(sub, inv, outcome, { now });
		}
		return true;
	}

	const declinedNow = found && DECLINED.has(found.status);
	const nothingHappened =
		!found &&
		inv.lastAttemptAt &&
		now.getTime() - new Date(inv.lastAttemptAt).getTime() > GIVE_UP_MINUTES * MINUTES;
	if (declinedNow || nothingHappened) {
		if (inv.kind === 'first' && sub.status === 'incomplete') {
			await db.transaction(async (tx) => {
				await tx
					.update(subscriptionInvoice)
					.set({
						status: 'failed',
						lastError: declinedNow ? `gateway status ${found.status}` : 'no transaction found',
						updatedAt: now
					})
					.where(eq(subscriptionInvoice.id, inv.id));
				await tx
					.update(subscription)
					.set({ status: 'ended', endedAt: now, endReason: 'signup_failed', updatedAt: now })
					.where(and(eq(subscription.id, sub.id), eq(subscription.status, 'incomplete')));
			});
			return true;
		}
		if (declinedNow) {
			await recordRenewalDecline(
				sub,
				inv,
				{ outcome: 'declined', code: found.status, message: `Gateway status ${found.status}` },
				{ now }
			);
		} else {
			// Nothing was charged: reopen and let the next run try again.
			await db
				.update(subscriptionInvoice)
				.set({ status: 'open', lastError: 'no transaction found; reopened', updatedAt: now })
				.where(eq(subscriptionInvoice.id, inv.id));
			await db
				.update(subscription)
				.set({ leaseUntil: null, leaseToken: null })
				.where(eq(subscription.id, sub.id));
		}
		return true;
	}
	if (found && STILL_UNKNOWN.has(found.status)) {
		await db
			.update(subscriptionInvoice)
			.set({
				status: 'unknown',
				lastError: `gateway status ${found.status}`,
				transId: found.transId,
				updatedAt: now
			})
			.where(eq(subscriptionInvoice.id, inv.id));
	}
	return false;
}

/** Resolve one ticket checkout. Returns true when it is settled one way or the other. */
export async function reconcileCheckout(co, { now = new Date() } = {}) {
	if (co.status === 'paid' && co.transId) {
		const [u] = await db
			.select({ email: userTable.email })
			.from(userTable)
			.where(eq(userTable.id, co.userId))
			.limit(1);
		await fulfilCheckout(co.id, { transId: co.transId, email: u?.email });
		return true;
	}
	const [u] = await db
		.select({ email: userTable.email, customerProfileId: userTable.customerProfileId })
		.from(userTable)
		.where(eq(userTable.id, co.userId))
		.limit(1);
	const found = await findByInvoiceNumber({
		invoiceNumber: co.invoiceNumber,
		customerProfileId: u?.customerProfileId
	});
	if (found && APPROVED.has(found.status)) {
		await fulfilCheckout(co.id, {
			transId: found.transId,
			lastFour: found.lastFour,
			cardType: found.cardType,
			email: u?.email
		});
		return true;
	}
	if (found && DECLINED.has(found.status)) {
		await markCheckout(co.id, 'declined', {
			error: `gateway status ${found.status}`,
			transId: found.transId
		});
		return true;
	}
	if (!found && now.getTime() - new Date(co.updatedAt).getTime() > GIVE_UP_MINUTES * MINUTES) {
		await markCheckout(co.id, 'failed', { error: 'no transaction found' });
		return true;
	}
	if (found)
		await markCheckout(co.id, 'unknown', {
			error: `gateway status ${found.status}`,
			transId: found.transId
		});
	return false;
}
