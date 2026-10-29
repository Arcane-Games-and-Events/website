/**
 * `applyAccess` is the only place that turns a membership into what the
 * rest of the site reads: `user.role` (for non-admins) and the
 * `user.subscription_*` mirror columns that the session, the paywall and
 * the admin reports use.
 *
 * Every change to a `subscription` row ends with a call here. A user with
 * no subscription rows at all is left untouched, which is what protects
 * members who have not yet been moved off Authorize.net ARB.
 */
import { and, desc, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { subscription, user as userTable } from '$lib/server/db/schema.js';
import { bump } from '$lib/server/cache/index.js';

/** Statuses a membership can be in while it still exists. */
export const LIVE_STATUSES = ['active', 'past_due', 'cancelled'];

/** Whether a membership row grants access right now. */
export function membershipGrantsAccess(sub, now = new Date()) {
	if (!sub) return false;
	switch (sub.status) {
		case 'active':
			return true;
		case 'past_due':
			return !sub.graceUntil || now < new Date(sub.graceUntil);
		case 'cancelled':
			return !!sub.currentPeriodEnd && now < new Date(sub.currentPeriodEnd);
		default:
			return false;
	}
}

/** The `user.subscription_status` value the rest of the site expects. */
export function mirrorStatus(status) {
	switch (status) {
		case 'active':
			return 'active';
		case 'past_due':
			return 'payment_failed';
		case 'cancelled':
			return 'cancelled';
		case 'ended':
			return 'expired';
		default:
			return null;
	}
}

/** The member's live membership (active, past_due or cancelled), if any. */
export async function liveSubscription(userId, tx = db) {
	const rows = await tx
		.select()
		.from(subscription)
		.where(
			and(
				eq(subscription.userId, userId),
				ne(subscription.status, 'ended'),
				ne(subscription.status, 'incomplete')
			)
		)
		.limit(1);
	return rows[0] || null;
}

/**
 * Recompute a user's role and mirror columns from their subscription rows.
 *
 * @param {string} userId
 * @param {{ tx?: any }} [opts]
 * @returns {Promise<{ changed: boolean, role?: string, access?: boolean } | null>}
 */
export async function applyAccess(userId, { tx = db } = {}) {
	const [u] = await tx.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
	if (!u) return null;

	const subs = await tx
		.select()
		.from(subscription)
		.where(eq(subscription.userId, userId))
		.orderBy(desc(subscription.createdAt));
	const live = subs.find((s) => LIVE_STATUSES.includes(s.status));
	const latestEnded = subs.find((s) => s.status === 'ended');
	// Only incomplete rows, or none: nothing to say about this member yet.
	if (!live && !latestEnded) return { changed: false };

	const now = new Date();
	const admin = u.role === 'admin';
	let changes;
	let access;

	if (live) {
		access = membershipGrantsAccess(live, now);
		changes = {
			subscriptionId: live.ref,
			lastSubscriptionId: live.ref,
			subscriptionType: live.plan,
			subscriptionStatus: mirrorStatus(live.status),
			subscriptionStartDate: live.startedAt ?? u.subscriptionStartDate,
			subscriptionEndDate:
				live.status === 'cancelled'
					? live.currentPeriodEnd
					: live.status === 'past_due'
						? live.graceUntil
						: null,
			nextBillingDate: live.status === 'active' ? live.nextChargeAt : null,
			role: admin ? 'admin' : access ? 'premium' : 'free',
			// A paying member is not a comp.
			compReason: null,
			compedAt: null,
			compedBy: null
		};
	} else {
		// The membership has ended. Comps keep their standing.
		access = !!u.compReason;
		changes = {
			subscriptionId: null,
			lastSubscriptionId: latestEnded.ref,
			subscriptionType: latestEnded.plan,
			subscriptionStatus: 'expired',
			subscriptionEndDate: latestEnded.endedAt ?? latestEnded.currentPeriodEnd ?? now,
			nextBillingDate: null,
			role: admin ? 'admin' : u.compReason ? 'premium' : 'free'
		};
	}

	const changed = Object.keys(changes).some((k) => !same(u[k], changes[k]));
	if (changed) {
		await tx.update(userTable).set(changes).where(eq(userTable.id, userId));
		// A stale bump (if the surrounding transaction rolls back) only costs
		// one cache miss.
		await bump(`user:${userId}`, 'users');
	}
	return { changed, role: changes.role, access };
}

function same(a, b) {
	if (a instanceof Date || b instanceof Date) {
		const ta = a ? new Date(a).getTime() : null;
		const tb = b ? new Date(b).getTime() : null;
		return ta === tb;
	}
	return (a ?? null) === (b ?? null);
}
