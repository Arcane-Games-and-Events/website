// src/lib/server/articles/access.js

/**
 * Check if a user has premium access
 * This takes into account:
 * - Admin role (always has access)
 * - Premium role with active subscription
 * - Premium role with cancelled subscription but within paid period
 *
 * @param {Object|null} user - The user object from locals.user
 * @returns {boolean} Whether the user has premium access
 */
export function userHasPremiumAccess(user) {
	if (!user) return false;

	// Admins always have premium access
	if (user.role === 'admin') return true;

	// Check if user has premium role
	if (user.role !== 'premium') return false;

	// Premium with active subscription
	if (user.subscriptionStatus === 'active') return true;

	// Premium with cancelled subscription - check if within paid period
	if (user.subscriptionStatus === 'cancelled' && user.subscriptionEndDate) {
		const endDate = new Date(user.subscriptionEndDate);
		const now = new Date();
		return now < endDate;
	}

	// Legacy: Premium role without subscription tracking (backwards compatibility)
	// If they have subscriptionId but no subscriptionStatus, assume active
	if (user.subscriptionId && !user.subscriptionStatus) return true;

	// Legacy: Premium role with no subscription tracking at all (manual upgrade)
	// If they have premium role but no subscription fields, assume active
	if (!user.subscriptionId && !user.subscriptionStatus) return true;

	return false;
}

/**
 * Check if a user's premium subscription is expired
 * Returns true if they had premium but it has expired
 *
 * @param {Object|null} user - The user object from locals.user
 * @returns {boolean} Whether the subscription is expired
 */
export function isPremiumExpired(user) {
	if (!user) return false;
	if (user.role !== 'premium') return false;

	// Cancelled and past end date
	if (user.subscriptionStatus === 'cancelled' && user.subscriptionEndDate) {
		const endDate = new Date(user.subscriptionEndDate);
		const now = new Date();
		return now >= endDate;
	}

	// Status is 'expired'
	if (user.subscriptionStatus === 'expired') return true;

	return false;
}

/**
 * Check if an article requires premium access based on its settings
 */
export function isPremiumNow(post, now = new Date()) {
	// Sanity check
	if (!post) return true;

	// Handle new capitalized values
	const accessMode = post.accessMode;

	// ALWAYS free when declared as Free
	if (accessMode === 'Free' || accessMode === 'free') {
		return false;
	}

	// Premium posts become free after 1 month
	if (accessMode === 'Premium' || accessMode === 'premium') {
		// If no published date, keep it gated
		if (!post.publishedAt) return true;

		// Calculate 1 month (30 days) in milliseconds
		const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
		const publishedTime = new Date(post.publishedAt).getTime();
		const currentTime = now.getTime();

		// Check if it's been more than 1 month since publication
		const isPremiumPeriod = currentTime < publishedTime + oneMonthMs;
		return isPremiumPeriod;
	}

	// Legacy support: premium for 14 days after publish
	if (accessMode === 'premium_window') {
		if (!post.publishedAt) return true;
		const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
		const published = new Date(post.publishedAt).getTime();
		return Date.now() < published + twoWeeksMs;
	}

	// Unknown/mis-typed value? Be safe and gate.
	return true;
}
