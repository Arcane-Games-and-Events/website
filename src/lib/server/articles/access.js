// src/lib/server/articles/access.js

/**
 * Whether a user can read premium pieces.
 *
 * The role is decided by `applyAccess` (src/lib/server/billing/access.js)
 * whenever a membership changes, and the hourly billing job ends
 * memberships on time. The date checks here only cover the hour between a
 * period ending and the job noticing.
 *
 * @param {Object|null} user - locals.user
 * @returns {boolean}
 */
export function userHasPremiumAccess(user) {
	if (!user) return false;
	if (user.role === 'admin') return true;
	if (user.role !== 'premium') return false;

	// A cancelled membership, or one in its grace period after a failed
	// payment, is good until its end date and not a minute longer.
	if (
		(user.subscriptionStatus === 'cancelled' || user.subscriptionStatus === 'payment_failed') &&
		user.subscriptionEndDate
	) {
		return new Date() < new Date(user.subscriptionEndDate);
	}

	// Active members, comps, and legacy rows without a status.
	return true;
}
