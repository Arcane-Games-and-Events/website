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

	// Fetch published VODs with search/filter/sort
	let vods = [];

	try {
		// Build conditions
		const conditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];

		const q = url.searchParams.get('q')?.trim();
		if (q) {
			conditions.push(
				or(
					ilike(vod.title, `%${q}%`),
					ilike(vod.player1Name, `%${q}%`),
					ilike(vod.player2Name, `%${q}%`)
				)
			);
		}

		const eventId = url.searchParams.get('event');
		if (eventId) {
			conditions.push(eq(vod.eventId, eventId));
		}

		// Sort
		const sort = url.searchParams.get('sort') || 'newest';
		let orderBy;
		if (sort === 'oldest') {
			orderBy = asc(vod.publishedAt);
		} else if (sort === 'longest') {
			orderBy = desc(vod.duration);
		} else {
			orderBy = desc(vod.publishedAt);
		}

		// Pagination
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
		const perPage = 9;
		const offset = (page - 1) * perPage;

		// Count total
		const [{ count: totalCount }] = await db
			.select({ count: sql`count(*)::int` })
			.from(vod)
			.where(and(...conditions));

		// Fetch VODs
		vods = await db
			.select()
			.from(vod)
			.where(and(...conditions))
			.orderBy(orderBy)
			.limit(perPage)
			.offset(offset);

		// Sign thumbnail tokens for signed playback VODs
		const vodsWithTokens = await Promise.all(
			vods.map(async (v) => {
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

		return {
			user: locals.user,
			podcasts: podcastsWithEpisodes,
			vods: vodsWithTokens,
			vodPagination: {
				page,
				perPage,
				total: totalCount,
				totalPages: Math.ceil(totalCount / perPage)
			},
			vodFilters: {
				q: q || '',
				sort: sort || 'newest'
			}
		};
	} catch (err) {
		console.warn('Could not fetch VODs:', err.message);
	}

	return {
		user: locals.user,
		podcasts: podcastsWithEpisodes,
		vods: [],
		vodPagination: { page: 1, perPage: 9, total: 0, totalPages: 0 },
		vodFilters: { q: '', sort: 'newest' }
	};
}
