import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { invalidateCache, CACHE_KEYS } from '$lib/server/redis/index.js';

/**
 * Webhook endpoint for Payload CMS
 * Called when articles are created, updated, or deleted
 * Invalidates Redis cache so changes appear immediately
 */
export async function POST({ request }) {
	// Verify webhook secret to prevent unauthorized calls
	const authHeader = request.headers.get('authorization');
	const expectedSecret = env.PAYLOAD_WEBHOOK_SECRET;

	if (!expectedSecret) {
		return json({ error: 'Webhook not configured' }, { status: 500 });
	}

	if (authHeader !== `Bearer ${expectedSecret}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const payload = await request.json();
		const { collection, doc } = payload;

		// Handle posts collection (articles)
		if (collection === 'posts') {
			// Invalidate the specific article cache if we have a slug
			if (doc?.slug) {
				await invalidateCache(`${CACHE_KEYS.ARTICLES}:slug:${doc.slug}`);
			}

			// Always invalidate the articles list caches. The homepage
			// remembers `:latest:12` — using any other suffix here means
			// new posts never surface until the TTL expires.
			await invalidateCache(`${CACHE_KEYS.ARTICLES}:all`);
			await invalidateCache(`${CACHE_KEYS.ARTICLES}:latest:12`);
		}

		// Handle authors collection
		if (collection === 'authors') {
			// If author is updated, refresh articles since author info is embedded
			await invalidateCache(`${CACHE_KEYS.ARTICLES}:all`);
			await invalidateCache(`${CACHE_KEYS.ARTICLES}:latest:12`);
		}

		// Handle tags collection
		if (collection === 'tags') {
			// Tags appear in article listings
			await invalidateCache(`${CACHE_KEYS.ARTICLES}:all`);
		}

		return json({ success: true, message: `Cache invalidated for ${collection}` });
	} catch (err) {
		return json({ error: 'Failed to process webhook' }, { status: 500 });
	}
}
