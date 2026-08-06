import { db } from '$lib/server/db/index.js';
import { vod, event } from '$lib/server/db/schema.js';
import { eq, and, or, ilike, asc, desc, sql } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';
import { getMuxThumbnailToken } from '$lib/server/mux.js';

export async function load({ locals, url }) {
	// Parse filter params
	const q = url.searchParams.get('q')?.trim() || '';
	const eventId = url.searchParams.get('event') || '';
	const hero = url.searchParams.get('hero') || '';
	const sort = url.searchParams.get('sort') || 'newest';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const perPage = 12;

	// One filter combo = one cache entry. SHORT TTL (60s) keeps memory
	// bounded even under q-search cardinality; admin VOD writes bust
	// the whole `vods:list:*` prefix so publishes surface in one hop.
	const cacheKey = `${CACHE_KEYS.VODS}:list:${sort}|${eventId || 'all'}|${hero || 'all'}|${q || 'all'}|${page}`;

	try {
		const payload = await getCachedOrFetch(
			cacheKey,
			async () => {
				// Base conditions: published & ready
				const conditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];

				if (q) {
					conditions.push(
						or(
							ilike(vod.title, `%${q}%`),
							ilike(vod.player1Name, `%${q}%`),
							ilike(vod.player2Name, `%${q}%`)
						)
					);
				}
				if (eventId) conditions.push(eq(vod.eventId, eventId));
				if (hero) conditions.push(or(ilike(vod.player1Hero, hero), ilike(vod.player2Hero, hero)));

				let orderBy;
				if (sort === 'oldest') orderBy = asc(vod.publishedAt);
				else if (sort === 'longest') orderBy = desc(vod.duration);
				else orderBy = desc(vod.publishedAt);

				const [
					[{ count: totalCount }],
					[{ count: totalUnfiltered }],
					vods,
					heroRows,
					eventRows
				] = await Promise.all([
					db.select({ count: sql`count(*)::int` }).from(vod).where(and(...conditions)),
					db
						.select({ count: sql`count(*)::int` })
						.from(vod)
						.where(and(eq(vod.isPublished, true), eq(vod.status, 'ready'))),
					db
						.select()
						.from(vod)
						.where(and(...conditions))
						.orderBy(orderBy)
						.limit(perPage)
						.offset((page - 1) * perPage),
					db
						.select({ player1Hero: vod.player1Hero, player2Hero: vod.player2Hero })
						.from(vod)
						.where(and(eq(vod.isPublished, true), eq(vod.status, 'ready'))),
					db
						.selectDistinct({ eventId: vod.eventId })
						.from(vod)
						.where(
							and(
								eq(vod.isPublished, true),
								eq(vod.status, 'ready'),
								sql`${vod.eventId} IS NOT NULL`
							)
						)
				]);

				const heroSet = new Set();
				for (const row of heroRows) {
					if (row.player1Hero) heroSet.add(row.player1Hero);
					if (row.player2Hero) heroSet.add(row.player2Hero);
				}
				const heroes = [...heroSet].sort();

				let events = [];
				const eventIds = eventRows.map((r) => r.eventId).filter(Boolean);
				if (eventIds.length > 0) {
					events = await db
						.select({
							id: event.id,
							title: event.title,
							eventDate: event.eventDate,
							circuit: event.circuit
						})
						.from(event)
						.where(sql`${event.id} IN ${eventIds}`)
						.orderBy(desc(event.eventDate));
				}

				// Sign thumbnail tokens via the cached helper (12h Redis cache
				// under `mux:thumbnail:{playbackId}`). This is per-VOD (not
				// per-filter) so signatures stay warm across every list combo.
				const vodsWithTokens = await Promise.all(
					vods.map(async (v) => {
						if (!v.muxPlaybackId) return v;
						const token = await getMuxThumbnailToken(v.muxPlaybackId);
						return token ? { ...v, thumbnailToken: token } : v;
					})
				);

				return {
					vods: vodsWithTokens,
					pagination: {
						page,
						perPage,
						total: totalCount,
						totalPages: Math.ceil(totalCount / perPage)
					},
					filters: { q, event: eventId, hero, sort },
					heroes,
					events,
					totalVods: totalUnfiltered
				};
			},
			CACHE_TTL.SHORT
		);

		return {
			user: locals.user,
			...payload
		};
	} catch (err) {
		console.warn('Could not fetch VODs:', err.message);
		return {
			user: locals.user,
			vods: [],
			pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 },
			filters: { q: '', event: '', hero: '', sort: 'newest' },
			heroes: [],
			events: [],
			totalVods: 0
		};
	}
}
