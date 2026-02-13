import { db } from '$lib/server/db/index.js';
import { podcast, podcastEpisode, vod, event } from '$lib/server/db/schema.js';
import { eq, desc, and, or, ilike, asc, sql } from 'drizzle-orm';
import mux from '$lib/server/mux.js';

export async function load({ locals, url }) {
	// Fetch podcasts and episodes
	let podcasts = [];
	let episodes = [];

	try {
		// Get active podcasts
		podcasts = await db
			.select()
			.from(podcast)
			.where(eq(podcast.isActive, true))
			.orderBy(podcast.sortOrder, podcast.createdAt);

		// Get published episodes for active podcasts
		if (podcasts.length > 0) {
			episodes = await db
				.select()
				.from(podcastEpisode)
				.where(eq(podcastEpisode.isPublished, true))
				.orderBy(desc(podcastEpisode.publishedAt));
		}
	} catch (err) {
		// Tables may not exist yet
		console.warn('Could not fetch podcasts:', err.message);
	}

	// Group episodes by podcast
	const podcastsWithEpisodes = podcasts.map((p) => ({
		...p,
		episodes: episodes.filter((ep) => ep.podcastId === p.id)
	}));

	// Fetch the latest 6 published VODs for the preview section
	let vods = [];
	let vodTotal = 0;

	try {
		const baseConditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];

		const [countResult, recentVods] = await Promise.all([
			db.select({ count: sql`count(*)::int` }).from(vod).where(and(...baseConditions)),
			db.select().from(vod).where(and(...baseConditions)).orderBy(desc(vod.publishedAt)).limit(6)
		]);

		vodTotal = countResult[0]?.count || 0;

		// Sign thumbnail tokens
		vods = await Promise.all(
			recentVods.map(async (v) => {
				if (!v.muxPlaybackId) return v;
				try {
					const token = await mux.jwt.signPlaybackId(v.muxPlaybackId, {
						type: 'thumbnail',
						expiration: '24h'
					});
					return { ...v, thumbnailToken: token };
				} catch {
					return v;
				}
			})
		);
	} catch (err) {
		console.warn('Could not fetch VODs:', err.message);
	}

	return {
		user: locals.user,
		podcasts: podcastsWithEpisodes,
		vods,
		vodTotal
	};
}
