/**
 * The hourly billing job, and the pieces it is made of.
 *
 *  1. reconcile charges whose outcome we never heard
 *  2. end signups that never completed
 *  3. end memberships whose time is up (cancelled at period end,
 *     past due past the grace period)
 *  4. remind annual members a week before renewal
 *  5. hand out member-referral rewards
 *  6. charge renewals that are due (when BILLING_ENABLED is on)
 *  7. alert an admin about anything it couldn't resolve
 *
 * Every run writes a `billing_run` row. With BILLING_ENABLED off the job
 * runs in "observe" mode: steps 1–5 and 7, never a charge.
 */
import { and, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import {
	billingRun,
	memberReferral,
	order as orderTable,
	subscription,
	subscriptionInvoice,
	user as userTable
} from '$lib/server/db/schema.js';
import { authnet, describeOutcome } from '$lib/server/authnet/client.js';
import { bump } from '$lib/server/cache/index.js';
import { logMemberEvent, recordPayment } from '$lib/server/payments/ledger.js';
import { nextInvoiceNumber } from '$lib/server/payments/invoice.js';
import { PLANS } from './plans.js';
import { addMonthsAnchored, dunningSchedule, periodEndFor } from './dates.js';
import { applyAccess } from './access.js';
import { sendOnce, today } from './notices.js';
import { currentCard, expireStaleIncompletes } from './subscriptions.js';
import { reconcileAll } from './reconcile.js';
import {
	sendAdminAlert,
	sendEndedEmail,
	sendMembershipReceipt,
	sendPaymentFailedEmail,
	sendPaymentRecoveredEmail,
	sendRenewalReminder
} from '$lib/server/email.js';

export const billingEnabled = () => env.BILLING_ENABLED === 'true';
const maxChargesPerRun = () => Number(env.BILLING_MAX_CHARGES_PER_RUN) || Infinity;
const BATCH = 25;
const TIME_BUDGET_MS = 240_000;

/** Run the whole job once. */
export async function runBilling({ trigger = 'cron' } = {}) {
	const started = Date.now();
	const now = new Date();
	const mode = billingEnabled() ? 'live' : 'observe';
	const [run] = await db
		.insert(billingRun)
		.values({ mode, summary: { trigger } })
		.returning({ id: billingRun.id });
	const summary = { trigger, mode, errors: [] };
	const step = async (name, fn) => {
		try {
			summary[name] = await fn();
		} catch (err) {
			console.error(`[billing] ${name} failed:`, err);
			summary.errors.push({ step: name, error: err?.message || String(err) });
		}
	};

	await step('reconciled', () => reconcileAll({ now }));
	await step('abandoned', () => expireStaleIncompletes(null));
	await step('ended', () => endDueSubscriptions(now));
	await step('reminders', () => sendYearlyReminders(now));
	await step('referrals', () => applyReferralRewards(now));
	await step('due', () => countDue(now));
	if (mode === 'live') {
		await step('charged', () =>
			chargeDueSubscriptions({ now, deadline: started + TIME_BUDGET_MS })
		);
	}
	await step('alerts', () => raiseAlerts(now, summary));

	summary.ms = Date.now() - started;
	await db
		.update(billingRun)
		.set({
			finishedAt: new Date(),
			summary,
			error: summary.errors.length
				? summary.errors.map((e) => `${e.step}: ${e.error}`).join('; ')
				: null
		})
		.where(eq(billingRun.id, run.id));
	return { runId: run.id, ...summary };
}

// ---------------------------------------------------------------- step 3: period ends

export async function endDueSubscriptions(now = new Date()) {
	const out = { cancelled: 0, paymentFailed: 0 };
	const due = await db
		.select()
		.from(subscription)
		.where(
			sql`(${subscription.status} = 'cancelled' and ${subscription.currentPeriodEnd} <= ${now.toISOString()}::timestamptz)
			 or (${subscription.status} = 'past_due' and ${subscription.graceUntil} <= ${now.toISOString()}::timestamptz)`
		)
		.limit(200);
	for (const sub of due) {
		const reason = sub.status === 'cancelled' ? 'cancelled' : 'payment_failed';
		await db.transaction(async (tx) => {
			const [row] = await tx
				.update(subscription)
				.set({
					status: 'ended',
					endedAt: now,
					endReason: reason,
					nextChargeAt: null,
					nextAttemptAt: null,
					leaseUntil: null,
					updatedAt: now
				})
				.where(and(eq(subscription.id, sub.id), eq(subscription.status, sub.status)))
				.returning({ id: subscription.id });
			if (!row) return;
			await tx
				.update(subscriptionInvoice)
				.set({ status: 'void', updatedAt: now })
				.where(
					and(
						eq(subscriptionInvoice.subscriptionId, sub.id),
						inArray(subscriptionInvoice.status, ['open', 'failed'])
					)
				);
			await logMemberEvent(
				{
					userId: sub.userId,
					kind: 'expired',
					subscriptionId: sub.ref,
					subscriptionType: sub.plan,
					reason,
					at: now
				},
				{ tx }
			);
			await applyAccess(sub.userId, { tx });
		});
		await bump(`user:${sub.userId}`, 'users');
		out[reason === 'cancelled' ? 'cancelled' : 'paymentFailed']++;
		const [u] = await db
			.select({ email: userTable.email })
			.from(userTable)
			.where(eq(userTable.id, sub.userId))
			.limit(1);
		if (u?.email)
			await sendOnce('ended', sub.id, sub.userId, () => sendEndedEmail(u.email, { reason }));
	}
	return out;
}

// ---------------------------------------------------------------- step 4: reminders

export async function sendYearlyReminders(now = new Date()) {
	const from = new Date(now.getTime() + 6 * 86400000);
	const to = new Date(now.getTime() + 8 * 86400000);
	const rows = await db
		.select({ sub: subscription, email: userTable.email })
		.from(subscription)
		.innerJoin(userTable, eq(userTable.id, subscription.userId))
		.where(
			and(
				eq(subscription.status, 'active'),
				eq(subscription.plan, 'yearly'),
				sql`${subscription.nextChargeAt} between ${from.toISOString()}::timestamptz and ${to.toISOString()}::timestamptz`
			)
		);
	let sent = 0;
	for (const { sub, email } of rows) {
		const ref = `${sub.id}:${new Date(sub.nextChargeAt).toISOString().slice(0, 10)}`;
		const card = await currentCard(sub);
		const r = await sendOnce('renewal_reminder', ref, sub.userId, () =>
			sendRenewalReminder(email, {
				amountCents: sub.pendingPriceCents ?? sub.priceCents,
				renewsAt: sub.nextChargeAt,
				lastFour: card?.lastFour
			})
		);
		if (r === 'sent') sent++;
	}
	return { sent, candidates: rows.length };
}

// ---------------------------------------------------------------- step 5: referral rewards

/**
 * A referral earns its reward 7 days after the referee's first charge above
 * $0, as long as it wasn't refunded. The reward is a month added to the
 * referrer's current period.
 */
export async function applyReferralRewards(now = new Date()) {
	const out = { earned: 0, applied: 0, waiting: 0 };
	const cutoff = new Date(now.getTime() - 7 * 86400000);

	// Pending → earned.
	const pending = await db
		.select()
		.from(memberReferral)
		.where(
			and(eq(memberReferral.status, 'pending'), sql`${memberReferral.subscriptionId} is not null`)
		)
		.limit(200);
	for (const mr of pending) {
		const [inv] = await db
			.select()
			.from(subscriptionInvoice)
			.where(
				and(
					eq(subscriptionInvoice.subscriptionId, mr.subscriptionId),
					eq(subscriptionInvoice.status, 'paid'),
					sql`${subscriptionInvoice.amountCents} > 0`
				)
			)
			.orderBy(subscriptionInvoice.seq)
			.limit(1);
		if (!inv || !inv.paidAt || new Date(inv.paidAt) > cutoff || inv.refundedCents > 0) continue;
		await db
			.update(memberReferral)
			.set({ status: 'reward_earned', rewardEarnedAt: now, qualifyingTransId: inv.transId })
			.where(and(eq(memberReferral.id, mr.id), eq(memberReferral.status, 'pending')));
		out.earned++;
	}

	// Earned → applied (includes the backlog from before the rebuild).
	const earned = await db
		.select()
		.from(memberReferral)
		.where(eq(memberReferral.status, 'reward_earned'))
		.limit(200);
	for (const mr of earned) {
		const [ref] = await db
			.select()
			.from(subscription)
			.where(
				and(
					eq(subscription.userId, mr.referrerUserId),
					inArray(subscription.status, ['active', 'cancelled', 'past_due'])
				)
			)
			.limit(1);
		if (!ref || ref.status === 'past_due') {
			out.waiting++;
			continue;
		}
		const end = addMonthsAnchored(ref.currentPeriodEnd || now, 1, ref.anchorDay);
		await db.transaction(async (tx) => {
			await tx
				.update(subscription)
				.set({
					currentPeriodEnd: end,
					nextChargeAt: ref.status === 'active' ? end : null,
					updatedAt: now
				})
				.where(eq(subscription.id, ref.id));
			await tx
				.update(memberReferral)
				.set({
					status: 'reward_applied',
					rewardAppliedAt: now,
					rewardSubscriptionId: ref.id,
					rewardNote: `period end moved to ${end.toISOString().slice(0, 10)}`
				})
				.where(eq(memberReferral.id, mr.id));
			await logMemberEvent(
				{
					userId: ref.userId,
					kind: 'comped',
					subscriptionId: ref.ref,
					subscriptionType: ref.plan,
					reason: 'referral reward',
					at: now,
					meta: { referralId: mr.id, newEnd: end }
				},
				{ tx }
			);
			await applyAccess(ref.userId, { tx });
		});
		await bump(`user:${ref.userId}`, 'users');
		out.applied++;
	}
	return out;
}

// ---------------------------------------------------------------- step 6: renewals

const DUE = sql`${subscription.hold} = false
	and (${subscription.legacyArbId} is null or ${subscription.legacyArbCancelledAt} is not null)
	and ((${subscription.status} = 'active' and ${subscription.nextChargeAt} <= now())
	  or (${subscription.status} = 'past_due' and ${subscription.nextAttemptAt} <= now()))`;

async function countDue() {
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(subscription)
		.where(DUE);
	return Number(n) || 0;
}

/** Take a lease on up to `limit` due memberships. */
async function claimDue(limit) {
	const token = crypto.randomUUID();
	const candidates = await db
		.select({ id: subscription.id })
		.from(subscription)
		.where(
			and(DUE, sql`(${subscription.leaseUntil} is null or ${subscription.leaseUntil} < now())`)
		)
		.orderBy(sql`coalesce(${subscription.nextAttemptAt}, ${subscription.nextChargeAt})`)
		.limit(limit);
	if (candidates.length === 0) return [];
	return db
		.update(subscription)
		.set({
			leaseUntil: sql`now() + interval '10 minutes'`,
			leaseToken: token,
			updatedAt: new Date()
		})
		.where(
			and(
				inArray(
					subscription.id,
					candidates.map((c) => c.id)
				),
				sql`(${subscription.leaseUntil} is null or ${subscription.leaseUntil} < now())`
			)
		)
		.returning();
}

export async function chargeDueSubscriptions({
	now = new Date(),
	deadline = Date.now() + TIME_BUDGET_MS
} = {}) {
	const out = {
		attempted: 0,
		paid: 0,
		declined: 0,
		unknown: 0,
		skipped: 0,
		errors: 0,
		cap: maxChargesPerRun()
	};
	let remaining = out.cap;
	while (remaining > 0 && Date.now() < deadline) {
		const batch = await claimDue(Math.min(BATCH, remaining));
		if (batch.length === 0) break;
		for (const sub of batch) {
			if (Date.now() >= deadline) {
				await releaseLease(sub.id);
				continue;
			}
			out.attempted++;
			remaining--;
			try {
				const r = await chargeRenewal(sub, { now });
				out[r.result] = (out[r.result] || 0) + 1;
			} catch (err) {
				console.error(`[billing] renewal ${sub.id} failed:`, err);
				out.errors++;
				await releaseLease(sub.id);
			}
		}
	}
	return out;
}

const releaseLease = (id) =>
	db
		.update(subscription)
		.set({ leaseUntil: null, leaseToken: null })
		.where(eq(subscription.id, id));

/**
 * Charge one membership's next period. Returns `{ result }` where result is
 * paid | declined | unknown | skipped.
 */
export async function chargeRenewal(sub, { now = new Date(), manual = false } = {}) {
	// Belt and braces: only a due membership is billed, however we got here.
	const due =
		(sub.status === 'active' && sub.nextChargeAt && new Date(sub.nextChargeAt) <= now) ||
		(sub.status === 'past_due' &&
			(manual || (sub.nextAttemptAt && new Date(sub.nextAttemptAt) <= now)));
	if (!due) {
		await releaseLease(sub.id);
		return { result: 'skipped', message: 'Nothing is due.' };
	}
	// Which invoice.
	let inv = await nextInvoice(sub, now);
	if (!inv) {
		await releaseLease(sub.id);
		return { result: 'skipped', message: 'No period to bill.' };
	}
	// Claim it. Someone else may be charging it, or it may already be paid.
	const [claimed] = await db
		.update(subscriptionInvoice)
		.set({
			status: 'charging',
			attempts: sql`${subscriptionInvoice.attempts} + 1`,
			lastAttemptAt: now,
			updatedAt: now
		})
		.where(
			and(
				eq(subscriptionInvoice.id, inv.id),
				inArray(subscriptionInvoice.status, ['open', 'failed'])
			)
		)
		.returning();
	if (!claimed) {
		await releaseLease(sub.id);
		if (inv.status === 'paid') return { result: 'skipped', message: 'Already paid.' };
		return { result: 'skipped', message: `Invoice is ${inv.status}.` };
	}
	inv = claimed;

	// A member just moved off ARB: did the old subscription charge them in
	// the gap? Then that payment covers this period.
	if (sub.legacyArbId && !(sub.flags || []).includes('self_charged')) {
		const adopted = await adoptArbPayment(sub, inv, now);
		if (adopted) return { result: 'paid', adopted: true };
	}

	const [u] = await db.select().from(userTable).where(eq(userTable.id, sub.userId)).limit(1);
	if (!sub.customerProfileId || !sub.paymentProfileId) {
		return recordRenewalDecline(
			sub,
			inv,
			{ outcome: 'error', code: 'NO_CARD', message: 'No card on file.' },
			{ now, manual }
		);
	}
	const outcome = await authnet.chargeProfile({
		customerProfileId: sub.customerProfileId,
		paymentProfileId: sub.paymentProfileId,
		amountCents: inv.amountCents,
		invoiceNumber: inv.invoiceNumber,
		description: `AGE Premium ${PLANS[inv.plan || sub.plan]?.label.toLowerCase() || ''} renewal`,
		customerId: sub.userId,
		email: u?.email,
		recurring: 'subsequent',
		networkTransId: sub.networkTransId
	});

	if (outcome.outcome === 'approved') {
		await finalizePaidInvoice(sub, inv, outcome, { now });
		return { result: 'paid' };
	}
	if (outcome.outcome === 'unknown') {
		await db
			.update(subscriptionInvoice)
			.set({ status: 'unknown', lastError: outcome.message, updatedAt: now })
			.where(eq(subscriptionInvoice.id, inv.id));
		// Keep the lease so no one retries before reconciliation.
		return { result: 'unknown', message: describeOutcome(outcome) };
	}
	return recordRenewalDecline(sub, inv, outcome, { now, manual });
}

/** The invoice for the period a membership is due to pay, created if needed. */
async function nextInvoice(sub, now) {
	if (sub.status === 'past_due') {
		const [open] = await db
			.select()
			.from(subscriptionInvoice)
			.where(
				and(
					eq(subscriptionInvoice.subscriptionId, sub.id),
					inArray(subscriptionInvoice.status, ['open', 'failed', 'charging', 'unknown'])
				)
			)
			.orderBy(sql`${subscriptionInvoice.periodStart} desc`)
			.limit(1);
		if (open) return open;
	}
	if (!sub.currentPeriodEnd) return null;
	const plan = sub.pendingPlan || sub.plan;
	const price = sub.pendingPlan ? sub.pendingPriceCents : sub.priceCents;
	const periodStart = new Date(sub.currentPeriodEnd);
	const periodEnd = periodEndFor(periodStart, plan, sub.anchorDay);
	const [{ seq }] = await db
		.select({ seq: sql`coalesce(max(${subscriptionInvoice.seq}), 0)::int + 1` })
		.from(subscriptionInvoice)
		.where(eq(subscriptionInvoice.subscriptionId, sub.id));
	await db
		.insert(subscriptionInvoice)
		.values({
			subscriptionId: sub.id,
			seq: Number(seq),
			kind: 'renewal',
			plan,
			periodStart,
			periodEnd,
			listCents: price,
			discountCents: 0,
			amountCents: price,
			status: 'open',
			invoiceNumber: await nextInvoiceNumber('subscription')
		})
		.onConflictDoNothing({
			target: [subscriptionInvoice.subscriptionId, subscriptionInvoice.periodStart]
		});
	const [inv] = await db
		.select()
		.from(subscriptionInvoice)
		.where(
			and(
				eq(subscriptionInvoice.subscriptionId, sub.id),
				eq(subscriptionInvoice.periodStart, periodStart)
			)
		)
		.limit(1);
	void now;
	return inv || null;
}

/**
 * Record an approved renewal: invoice paid, period advanced, pending plan
 * applied, order + ledger, access; then the receipt.
 */
export async function finalizePaidInvoice(sub, inv, outcome, { now = new Date() } = {}) {
	const plan = inv.plan || sub.pendingPlan || sub.plan;
	const price = inv.amountCents;
	const wasPastDue = sub.status === 'past_due';
	const card = await currentCard(sub);
	const [u] = await db.select().from(userTable).where(eq(userTable.id, sub.userId)).limit(1);

	await db.transaction(async (tx) => {
		const [current] = await tx
			.select({ status: subscriptionInvoice.status })
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.id, inv.id))
			.for('update');
		if (current?.status === 'paid') return;
		let orderId = null;
		if (outcome.transId) {
			const [ord] = await tx
				.insert(orderTable)
				.values({
					provider: 'authnet',
					providerRef: outcome.transId,
					userEmail: u?.email || null,
					userId: sub.userId,
					kind: 'subscription_renewal',
					amount: (inv.amountCents / 100).toFixed(2),
					currency: 'USD',
					meta: {
						type: 'subscription_renewal',
						subscriptionId: sub.ref,
						subscriptionType: plan,
						invoiceNumber: inv.invoiceNumber,
						periodStart: inv.periodStart,
						periodEnd: inv.periodEnd,
						cardLastFour: outcome.lastFour || card?.lastFour || null,
						description: `AGE Premium ${PLANS[plan]?.label.toLowerCase() || ''} renewal`
					}
				})
				.returning({ id: orderTable.id });
			orderId = ord.id;
		}
		await tx
			.update(subscriptionInvoice)
			.set({
				status: 'paid',
				transId: outcome.transId,
				networkTransId: outcome.networkTransId || null,
				paidAt: now,
				orderId,
				lastError: null,
				updatedAt: now
			})
			.where(eq(subscriptionInvoice.id, inv.id));
		await tx
			.update(subscription)
			.set({
				status: 'active',
				plan,
				priceCents: price,
				pendingPlan: null,
				pendingPriceCents: null,
				currentPeriodStart: inv.periodStart,
				currentPeriodEnd: inv.periodEnd,
				nextChargeAt: inv.periodEnd,
				failedAttempts: 0,
				firstFailedAt: null,
				nextAttemptAt: null,
				graceUntil: null,
				networkTransId: outcome.networkTransId || sub.networkTransId || null,
				flags: sql`case when 'self_charged' = any(${subscription.flags}) then ${subscription.flags} else array_append(${subscription.flags}, 'self_charged') end`,
				leaseUntil: null,
				leaseToken: null,
				updatedAt: now
			})
			.where(eq(subscription.id, sub.id));
		if (outcome.transId) {
			await recordPayment(
				{
					transId: outcome.transId,
					kind: 'sub_renewal',
					amount: inv.amountCents / 100,
					listAmount: inv.listCents / 100,
					discountAmount: inv.discountCents / 100,
					userId: sub.userId,
					userEmail: u?.email || null,
					subscriptionId: sub.ref,
					subscriptionType: plan,
					payNum: inv.seq,
					orderId,
					occurredAt: now,
					source: 'app',
					verifiedAt: now
				},
				{ tx }
			);
		}
		if (wasPastDue) {
			await logMemberEvent(
				{
					userId: sub.userId,
					kind: 'payment_recovered',
					subscriptionId: sub.ref,
					subscriptionType: plan,
					at: now,
					meta: { invoiceNumber: inv.invoiceNumber }
				},
				{ tx }
			);
		}
		await applyAccess(sub.userId, { tx });
	});
	await bump(`user:${sub.userId}`, 'users', 'orders');

	if (u?.email && outcome.transId) {
		await sendOnce('receipt', inv.id, sub.userId, () =>
			wasPastDue
				? sendPaymentRecoveredEmail(u.email, {
						amountCents: inv.amountCents,
						periodEnd: inv.periodEnd
					})
				: sendMembershipReceipt(u.email, {
						plan,
						amountCents: inv.amountCents,
						periodEnd: inv.periodEnd,
						invoiceNumber: inv.invoiceNumber,
						lastFour: outcome.lastFour || card?.lastFour || null,
						first: false
					})
		);
	}
}

/** A renewal was declined (or the card profile is gone): schedule dunning. */
export async function recordRenewalDecline(
	sub,
	inv,
	outcome,
	{ now = new Date(), manual = false } = {}
) {
	const attempt = manual ? Math.max(1, sub.failedAttempts) : sub.failedAttempts + 1;
	const firstFailedAt = sub.firstFailedAt || now;
	const schedule = dunningSchedule(firstFailedAt, attempt);
	const message =
		outcome.code === 'NO_CARD' || outcome.code === 'E00040'
			? 'No valid card on file.'
			: describeOutcome(outcome);
	await db.transaction(async (tx) => {
		await tx
			.update(subscriptionInvoice)
			.set({
				status: 'failed',
				lastError: `${outcome.code || ''} ${outcome.message || ''}`.trim(),
				updatedAt: now
			})
			.where(eq(subscriptionInvoice.id, inv.id));
		await tx
			.update(subscription)
			.set({
				status: 'past_due',
				failedAttempts: attempt,
				firstFailedAt,
				nextAttemptAt: manual ? sub.nextAttemptAt : schedule.nextAttemptAt,
				graceUntil: sub.graceUntil || schedule.graceUntil,
				flags:
					outcome.code === 'NO_CARD' || outcome.code === 'E00040'
						? sql`case when 'no_card' = any(${subscription.flags}) then ${subscription.flags} else array_append(${subscription.flags}, 'no_card') end`
						: subscription.flags,
				leaseUntil: null,
				leaseToken: null,
				updatedAt: now
			})
			.where(eq(subscription.id, sub.id));
		if (sub.status !== 'past_due') {
			await logMemberEvent(
				{
					userId: sub.userId,
					kind: 'payment_failed',
					subscriptionId: sub.ref,
					subscriptionType: sub.plan,
					at: now,
					meta: { code: outcome.code, message: outcome.message, graceUntil: schedule.graceUntil }
				},
				{ tx }
			);
		}
		await applyAccess(sub.userId, { tx });
	});
	await bump(`user:${sub.userId}`, 'users');
	if (!manual) {
		const [u] = await db
			.select({ email: userTable.email })
			.from(userTable)
			.where(eq(userTable.id, sub.userId))
			.limit(1);
		const card = await currentCard(sub);
		if (u?.email) {
			await sendOnce('payment_failed', `${inv.id}:${attempt}`, sub.userId, () =>
				sendPaymentFailedEmail(u.email, {
					attempt,
					nextAttemptAt: schedule.nextAttemptAt,
					graceUntil: sub.graceUntil || schedule.graceUntil,
					amountCents: inv.amountCents,
					lastFour: card?.lastFour
				})
			);
		}
	}
	return { result: 'declined', message };
}

/**
 * Did the old ARB subscription charge this member after migration? If so,
 * that payment is the renewal.
 */
async function adoptArbPayment(sub, inv, now) {
	let arb;
	try {
		arb = await authnet.arbGet(sub.legacyArbId);
	} catch {
		return false;
	}
	const since = sub.migratedAt ? new Date(sub.migratedAt).getTime() - 86400000 : 0;
	const paid = (arb?.transactions || [])
		.filter((t) => t.approved && t.submittedAt && t.submittedAt.getTime() > since)
		.sort((a, b) => b.submittedAt - a.submittedAt)[0];
	if (!paid) return false;
	const [known] = await db
		.select({ id: subscriptionInvoice.id })
		.from(subscriptionInvoice)
		.where(eq(subscriptionInvoice.transId, paid.transId))
		.limit(1);
	if (known) return false;
	let details = null;
	try {
		details = await authnet.getTransactionDetails(paid.transId);
	} catch {
		/* the ledger row still gets written */
	}
	await finalizePaidInvoice(
		sub,
		inv,
		{
			transId: paid.transId,
			networkTransId: details?.networkTransId || null,
			lastFour: details?.lastFour || null
		},
		{ now }
	);
	await sendAdminAlert('ARB charged a migrated member', [
		`Subscription ${sub.ref} (user ${sub.userId}) was charged by ARB ${sub.legacyArbId} after migration; transaction ${paid.transId} was adopted as the renewal. Make sure the ARB is cancelled.`
	]);
	return true;
}

/**
 * Charge a membership now, outside the schedule: after a card update while
 * past due, or an admin's "charge now".
 */
export async function chargeSubscriptionNow(subscriptionId, { reason = 'manual' } = {}) {
	const now = new Date();
	const [leased] = await db
		.update(subscription)
		.set({
			leaseUntil: sql`now() + interval '10 minutes'`,
			leaseToken: crypto.randomUUID(),
			updatedAt: now
		})
		.where(
			and(
				eq(subscription.id, subscriptionId),
				inArray(subscription.status, ['active', 'past_due']),
				sql`(${subscription.leaseUntil} is null or ${subscription.leaseUntil} < now())`
			)
		)
		.returning();
	if (!leased)
		return {
			ok: false,
			message: 'This membership is being billed right now; try again in a few minutes.'
		};
	if (leased.status === 'active' && leased.nextChargeAt && new Date(leased.nextChargeAt) > now) {
		await releaseLease(leased.id);
		return { ok: false, message: 'Nothing is due yet.' };
	}
	if (leased.legacyArbId && !leased.legacyArbCancelledAt) {
		await releaseLease(leased.id);
		return {
			ok: false,
			message:
				'The old Authorize.net subscription is still active for this member; cancel it first.'
		};
	}
	try {
		const r = await chargeRenewal(leased, { now, manual: true });
		void reason;
		return {
			ok: r.result === 'paid',
			result: r.result,
			message: r.message || (r.result === 'paid' ? 'Charged.' : 'Not charged.')
		};
	} catch (err) {
		await releaseLease(leased.id);
		throw err;
	}
}

// ---------------------------------------------------------------- step 7: alerts

async function raiseAlerts(now, summary) {
	const lines = [];
	const hourAgo = new Date(now.getTime() - 3600000);
	const [{ n: unknownInvoices }] = await db
		.select({ n: sql`count(*)::int` })
		.from(subscriptionInvoice)
		.where(
			and(eq(subscriptionInvoice.status, 'unknown'), lte(subscriptionInvoice.updatedAt, hourAgo))
		);
	if (unknownInvoices > 0)
		lines.push(
			`${unknownInvoices} membership charge(s) have had an unknown outcome for over an hour.`
		);
	const [{ n: stuck }] = await db
		.select({ n: sql`count(*)::int` })
		.from(subscription)
		.where(
			and(
				inArray(subscription.status, ['active', 'past_due']),
				isNull(subscription.hold),
				sql`${subscription.leaseUntil} < ${hourAgo.toISOString()}::timestamptz`
			)
		);
	if (stuck > 0) lines.push(`${stuck} membership(s) hold a stale billing lease.`);
	if (summary.errors.length)
		lines.push(...summary.errors.map((e) => `Step ${e.step} failed: ${e.error}`));
	if (summary.charged?.errors)
		lines.push(`${summary.charged.errors} renewal(s) threw while charging.`);
	if (lines.length === 0) return { sent: false };
	const r = await sendOnce('billing_alert', today(), null, () =>
		sendAdminAlert('Billing needs attention', lines)
	);
	return { sent: r === 'sent', lines };
}
