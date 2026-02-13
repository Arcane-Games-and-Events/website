import { db } from '$lib/server/db/index.js';
import { vod, event } from '$lib/server/db/schema.js';
import { eq, and, or, ilike, asc, desc, sql } from 'drizzle-orm';
import mux from '$lib/server/mux.js';

export async function load({ locals, url }) {
	// Parse filter params
	const q = url.searchParams.get('q')?.trim() || '';
	const eventId = url.searchParams.get('event') || '';
	const hero = url.searchParams.get('hero') || '';
	const sort = url.searchParams.get('sort') || 'newest';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const perPage = 12;

	// Base conditions: published & ready
	const conditions = [eq(vod.isPublished, true), eq(vod.status, 'ready')];

	// Text search
	if (q) {
		conditions.push(
			or(
				ilike(vod.title, `%${q}%`),
				ilike(vod.player1Name, `%${q}%`),
				ilike(vod.player2Name, `%${q}%`)
			)
		);
	}

	// Event filter
	if (eventId) {
		conditions.push(eq(vod.eventId, eventId));
	}

	// Hero filter
	if (hero) {
		conditions.push(
			or(ilike(vod.player1Hero, hero), ilike(vod.player2Hero, hero))
		);
	}

	// Sort
	let orderBy;
	if (sort === 'oldest') {
		orderBy = asc(vod.publishedAt);
	} else if (sort === 'longest') {
		orderBy = desc(vod.duration);
	} else {
		orderBy = desc(vod.publishedAt);
	}

	try {
		// Run queries in parallel
		const [
			[{ count: totalCount }],
			[{ count: totalUnfiltered }],
			vods,
			heroRows,
			eventRows
		] = await Promise.all([
			// Filtered count
			db.select({ count: sql`count(*)::int` }).from(vod).where(and(...conditions)),
			// Unfiltered count (for header)
			db
				.select({ count: sql`count(*)::int` })
				.from(vod)
				.where(and(eq(vod.isPublished, true), eq(vod.status, 'ready'))),
			// Fetch VODs
			db
				.select()
				.from(vod)
				.where(and(...conditions))
				.orderBy(orderBy)
				.limit(perPage)
				.offset((page - 1) * perPage),
			// Distinct heroes
			db
				.select({
					player1Hero: vod.player1Hero,
					player2Hero: vod.player2Hero
				})
				.from(vod)
				.where(and(eq(vod.isPublished, true), eq(vod.status, 'ready'))),
			// Events that have VODs
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

		// Build hero list from distinct values
		const heroSet = new Set();
		for (const row of heroRows) {
			if (row.player1Hero) heroSet.add(row.player1Hero);
			if (row.player2Hero) heroSet.add(row.player2Hero);
		}
		const heroes = [...heroSet].sort();

		// Fetch event details for events that have VODs
		let events = [];
		const eventIds = eventRows.map((r) => r.eventId).filter(Boolean);
		if (eventIds.length > 0) {
			events = await db
				.select({ id: event.id, title: event.title })
				.from(event)
				.where(sql`${event.id} IN ${eventIds}`)
				.orderBy(desc(event.eventDate));
		}

		// Sign thumbnail tokens
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
