import { db } from '$lib/server/db/index.js';
import { vod, event } from '$lib/server/db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getMuxThumbnailToken } from '$lib/server/mux.js';
import { listPublishedEntries } from '$lib/server/cms/list.js';

export async function load({ setHeaders }) {
	// Cache articles list for 5 minutes, allow stale for 1 hour while revalidating
	// Vary by Cookie ensures sidebar updates properly after login/logout
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
		vary: 'Cookie'
	});

	// ============ Articles (CMS entries) ============
	// Payload is turned off — CMS is now the single source for library
	// articles + videos. The list helper caches under a per-limit key so
	// this stays cheap on repeat hits.
	let articles = [];
	try {
		articles = await listPublishedEntries({ limit: 100 });
	} catch (error) {
		console.error('Error fetching CMS entries:', error);
	}

	// ============ VODs (bonus match films from /studios) ============
	let vods = [];
	let vodTotal = 0;
	try {
		const baseConditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];

		// Left-join the event for circuit + month context so cards can show
		// "AGE Open · Los Angeles · January" style metadata.
		const [countResult, recentVods] = await Promise.all([
			db
				.select({ count: sql`count(*)::int` })
				.from(vod)
				.where(and(...baseConditions)),
			db
				.select({
					id: vod.id,
					muxPlaybackId: vod.muxPlaybackId,
					title: vod.title,
					description: vod.description,
					duration: vod.duration,
					thumbnail: vod.thumbnail,
					player1Name: vod.player1Name,
					player1Hero: vod.player1Hero,
					player2Name: vod.player2Name,
					player2Hero: vod.player2Hero,
					isPremium: vod.isPremium,
					publishedAt: vod.publishedAt,
					eventCircuit: event.circuit,
					eventMonth: event.month,
					eventTitle: event.title
				})
				.from(vod)
				.leftJoin(event, eq(vod.eventId, event.id))
				.where(and(...baseConditions))
				.orderBy(desc(vod.publishedAt))
				.limit(6)
		]);

		vodTotal = countResult[0]?.count || 0;

		// Sign Mux thumbnail tokens via the cached helper (12h Redis cache
		// under `mux:thumbnail:{playbackId}` — one sign per playbackId per
		// half-day, not per request). Failure on a single VOD is silent;
		// the card falls back to the stored thumbnail.
		vods = await Promise.all(
			recentVods.map(async (v) => {
				if (!v.muxPlaybackId) return v;
				const token = await getMuxThumbnailToken(v.muxPlaybackId);
				return token ? { ...v, thumbnailToken: token } : v;
			})
		);
	} catch (err) {
		console.warn('Could not fetch VODs:', err.message);
	}

	return {
		articles,
		vods,
		vodTotal
	};
}
