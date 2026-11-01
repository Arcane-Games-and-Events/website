import { listPublishedEntries } from '$lib/server/desk/list.js';

export async function load({ setHeaders }) {
	// Short edge cache — 60s fresh, 60s stale-while-revalidate. A newly
	// published entry appears on the library within a minute of publish
	// even after CDN caching (Redis on the origin is busted immediately
	// via invalidateListCaches). Previously 300s+3600s, which was too long
	// for a Desk user to notice new content.
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
		vary: 'Cookie'
	});

	// ============ Articles (Desk entries) ============
	// Payload is turned off — Desk is now the single source for library
	// articles + videos. The list helper caches under a per-limit key so
	// this stays cheap on repeat hits.
	let articles = [];
	try {
		articles = await listPublishedEntries({ limit: 100 });
	} catch (error) {
		console.error('Error fetching Desk entries:', error);
	}

	return {
		articles
	};
}
