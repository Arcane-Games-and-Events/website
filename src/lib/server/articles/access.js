// src/lib/server/blog/access.js
export function isPremiumNow(post, now = new Date()) {
	// sanity check
	if (!post) return true;

	// ALWAYS free/premium when declared
	if (post.accessMode === 'free') return false;
	if (post.accessMode === 'premium') return true;

	// Default mode: premium for 14 days after publish
	if (post.accessMode === 'premium_window') {
		if (!post.publishedAt) return true; // if missing, stay gated
		const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
		const published = new Date(post.publishedAt).getTime();
		return Date.now() < published + twoWeeksMs;
	}

	// Unknown / mis-typed value? Be safe and gate.
	return true;
}
