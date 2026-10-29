import { db } from '$lib/server/db/index.js';
import { memberEvent, payment, user as userTable } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { isMissingTable, isMissingColumn } from '$lib/server/contentAnalytics/collect.js';

/**
 * The money ledger and the membership history (migration 022).
 *
 * `payment` holds one row per Authorize.net transaction: subscription first
 * charges and renewals, promo first charges and ticket sales, each with the
 * discount it carried. `member_event` records every change to a member's
 * standing. Both are written from the payment paths and read by the admin
 * revenue and member pages.
 *
 * Called on their own, these functions swallow errors (a missed ledger
 * row is recoverable, a failed payment is not). Called with `{ tx }` inside
 * a database transaction they rethrow, so the transaction rolls back as a
 * whole: either every effect of a payment is recorded or none is.
 */

const quiet = (label) => (err) => {
	if (!isMissingTable(err)) console.error(`[ledger] ${label} failed:`, err?.message || err);
};

/** Rethrow inside a transaction; log and carry on outside one. */
function settle(label, err, tx) {
	if (tx) throw err;
	quiet(label)(err);
}

/**
 * Record a transaction. Safe to call twice for the same transaction: the
 * second call is ignored.
 *
 * @param {{
 *   transId: string, kind: 'sub_first'|'sub_renewal'|'sub_promo_first'|'ticket',
 *   amount: number|string, occurredAt?: Date, source: 'app'|'webhook'|'sync'|'backfill',
 *   userId?: string|null, userEmail?: string|null, subscriptionId?: string|null,
 *   subscriptionType?: string|null, payNum?: number|null, orderId?: string|null,
 *   ticketId?: string|null, eventId?: string|null, listAmount?: number|string|null,
 *   discountAmount?: number|string|null, discountKind?: string|null, promoCode?: string|null,
 *   refundedAt?: Date|null, refundedAmount?: number|string|null, verifiedAt?: Date|null
 * }} row
 * @param {{ tx?: any }} [opts]
 * @returns {Promise<boolean>} true when a row was inserted
 */
export async function recordPayment(row, { tx } = {}) {
	try {
		const inserted = await (tx || db)
			.insert(payment)
			.values({
				provider: 'authnet',
				transId: String(row.transId),
				kind: row.kind,
				userId: row.userId ?? null,
				userEmail: row.userEmail ?? null,
				subscriptionId: row.subscriptionId ?? null,
				subscriptionType: row.subscriptionType ?? null,
				payNum: row.payNum ?? null,
				orderId: row.orderId ?? null,
				ticketId: row.ticketId ?? null,
				eventId: row.eventId ?? null,
				amount: money(row.amount),
				listAmount: row.listAmount == null ? null : money(row.listAmount),
				discountAmount: money(row.discountAmount ?? 0),
				discountKind: row.discountKind ?? null,
				promoCode: row.promoCode ?? null,
				occurredAt: row.occurredAt ?? new Date(),
				refundedAmount: money(row.refundedAmount ?? 0),
				refundedAt: row.refundedAt ?? null,
				source: row.source,
				verifiedAt: row.verifiedAt ?? null
			})
			.onConflictDoNothing({ target: payment.transId })
			.returning({ id: payment.id });
		return inserted.length > 0;
	} catch (err) {
		settle('recordPayment', err, tx);
		return false;
	}
}

/**
 * Mark a transaction refunded or voided. `amount` defaults to the full
 * amount collected; a partial refund adds to what was already returned,
 * capped at the amount collected.
 */
export async function markRefunded(transId, amount = null, at = new Date(), { tx } = {}) {
	if (!transId) return;
	try {
		await (tx || db)
			.update(payment)
			.set({
				refundedAt: at,
				refundedAmount:
					amount == null
						? sql`${payment.amount}`
						: sql`least(${payment.amount}, ${payment.refundedAmount} + ${money(amount)}::numeric)`
			})
			.where(eq(payment.transId, String(transId)));
	} catch (err) {
		settle('markRefunded', err, tx);
	}
}

/** Confirm rows that came in through the unsigned webhook. */
export async function markVerified(transIds, at = new Date()) {
	if (!transIds?.length) return;
	try {
		await db
			.update(payment)
			.set({ verifiedAt: at })
			.where(sql`${payment.transId} in ${transIds.map(String)} and ${payment.verifiedAt} is null`);
	} catch (err) {
		quiet('markVerified')(err);
	}
}

/**
 * Add a line to a member's history.
 *
 * @param {{
 *   userId: string,
 *   kind: 'subscribed'|'cancelled'|'resumed'|'plan_switched'|'payment_failed'|'payment_recovered'|'expired'|'ended'|'refunded'|'migrated'|'card_updated'|'comped'|'comp_removed',
 *   subscriptionId?: string|null, subscriptionType?: string|null, reason?: string|null,
 *   actorId?: string|null, meta?: object|null, at?: Date
 * }} row
 * @param {{ tx?: any }} [opts]
 */
export async function logMemberEvent(row, { tx } = {}) {
	try {
		await (tx || db).insert(memberEvent).values({
			userId: row.userId,
			kind: row.kind,
			subscriptionId: row.subscriptionId ?? null,
			subscriptionType: row.subscriptionType ?? null,
			reason: row.reason ?? null,
			actorId: row.actorId ?? null,
			at: row.at ?? new Date(),
			meta: row.meta ?? null
		});
	} catch (err) {
		settle('logMemberEvent', err, tx);
	}
}

/** Reasons an admin can give for comping a membership. */
export const COMP_REASONS = ['staff', 'writer', 'teacher', 'partner', 'friend', 'trial', 'other'];

/**
 * Change a member's billing role from the admin pages, keeping the comp
 * fields and the member history in step:
 *
 * - premium without a subscription → a comp; needs a reason
 * - leaving premium from a comp → comp removed
 *
 * Before migration 022 the comp columns don't exist; then only the role
 * is written. Returns `{ ok, error? }`.
 *
 * @param {{ userId: string, role: string, compReason?: string|null, actorId: string }} input
 */
export async function setMemberRole({ userId, role, compReason, actorId }) {
	const [row] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
	if (!row) return { ok: false, error: 'User not found' };

	// A paying member's role follows their membership (see billing/access.js);
	// the role controls are for comps and admins.
	if (row.subscriptionId && row.role !== 'admin' && role !== 'admin') {
		return {
			ok: false,
			error: 'This member has a paid membership. Manage it from the Membership panel instead.'
		};
	}

	const becomesComp = role === 'premium' && !row.subscriptionId;
	const wasComp = row.role === 'premium' && !row.subscriptionId;
	if (becomesComp && !wasComp && !COMP_REASONS.includes(compReason || '')) {
		return { ok: false, error: 'Choose a reason for the free membership.' };
	}

	const changes = { role };
	if (becomesComp) {
		if (COMP_REASONS.includes(compReason || '')) changes.compReason = compReason;
		if (!wasComp) {
			changes.compedAt = new Date();
			changes.compedBy = actorId;
		}
	} else if (wasComp) {
		changes.compReason = null;
		changes.compedAt = null;
		changes.compedBy = null;
	}

	try {
		await db.update(userTable).set(changes).where(eq(userTable.id, userId));
	} catch (err) {
		if (!isMissingColumn(err)) throw err;
		await db.update(userTable).set({ role }).where(eq(userTable.id, userId));
	}

	if (becomesComp && (!wasComp || (compReason && compReason !== row.compReason))) {
		await logMemberEvent({ userId, kind: 'comped', reason: compReason, actorId });
	} else if (wasComp && !becomesComp) {
		await logMemberEvent({ userId, kind: 'comp_removed', reason: row.compReason, actorId });
	}
	return { ok: true };
}

/** Two-decimal string for a numeric column. */
export function money(v) {
	return (Math.round(Number(v || 0) * 100) / 100).toFixed(2);
}

/** Two-decimal string for an amount in cents. */
export const centsToMoney = (cents) => (Number(cents || 0) / 100).toFixed(2);
