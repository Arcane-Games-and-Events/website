// src/lib/server/articles/access.js
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
