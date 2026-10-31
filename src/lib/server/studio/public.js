/**
 * The Studio on the public site: AGE Studios (/studios). Everything here
 * reads published, ready items only; Premium gating and playback tokens are
 * the player page's job.
 */
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { event, studioShow, vod } from '$lib/server/db/schema.js';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { getMuxThumbnailToken } from '$lib/server/mux.js';
import { withCovers } from './media.js';
import { listShows, getShowBySlug } from './shows.js';

const LIVE = and(eq(vod.isPublished, true), eq(vod.status, 'ready'));
const PER_PAGE = 12;

const fields = {
	v: vod,
	eventTitle: event.title,
	circuit: event.circuit,
	showName: studioShow.name,
	showSlug: studioShow.slug
};

/** The public card for an item: what every AGE Studios list shows. */
async function cardsOf(rows) {
	const covered = await withCovers(rows.map((r) => r.v));
	return Promise.all(
		covered.map(async (v, i) => {
			const r = rows[i];
			const audio = v.mediaType === 'audio';
			// A frame from the video when there's no cover (audio has none).
			let still = null;
			if (!v.cover && !audio && v.muxPlaybackId) {
				const token = await getMuxThumbnailToken(v.muxPlaybackId).catch(() => null);
				still = `https://image.mux.com/${v.muxPlaybackId}/thumbnail.webp?width=960&height=540&fit_mode=smartcrop${token ? `&token=${token}` : ''}`;
			}
			return {
				id: v.id,
				href: `/studios/${v.id}`,
				kind: v.kind,
				audio,
				title: v.title,
				description: v.description,
				player1Name: v.player1Name,
				player1Hero: v.player1Hero,
				player2Name: v.player2Name,
				player2Hero: v.player2Hero,
				guests: v.guests,
				season: v.season,
				episodeNumber: v.episodeNumber,
				show: v.showId ? { id: v.showId, name: r.showName, slug: r.showSlug } : null,
				event: v.eventId ? { id: v.eventId, title: r.eventTitle, circuit: r.circuit } : null,
				isPremium: v.isPremium !== false,
				duration: v.duration,
				publishedAt: v.publishedAt,
				cover: v.cover,
				still
			};
		})
	);
}

function base() {
	return db
		.select(fields)
		.from(vod)
		.leftJoin(event, eq(vod.eventId, event.id))
		.leftJoin(studioShow, eq(vod.showId, studioShow.id));
}

/** The newest published items of a kind (or of any kind). */
export async function latest({ kind = null, limit = 6 } = {}) {
	const rows = await base()
		.where(kind ? and(LIVE, eq(vod.kind, kind)) : LIVE)
		.orderBy(desc(vod.publishedAt))
		.limit(limit);
	return cardsOf(rows);
}

/** AGE Studios' front page, cached until anything in the Studio changes. */
export function watchHome() {
	return cached(
		'vods:watch:home',
		async () => {
			const [lead, gameplay, podcasts, interviews, video, shows, counts] = await Promise.all([
				latest({ limit: 1 }),
				latest({ kind: 'gameplay', limit: 9 }),
				latest({ kind: 'podcast', limit: 6 }),
				latest({ kind: 'interview', limit: 6 }),
				latest({ kind: 'video', limit: 6 }),
				listShows({ publicOnly: true }),
				db
					.select({ kind: vod.kind, n: sql`count(*)::int` })
					.from(vod)
					.where(LIVE)
					.groupBy(vod.kind)
			]);
			return {
				lead: lead[0] ?? null,
				gameplay: gameplay.filter((g) => g.id !== lead[0]?.id).slice(0, 8),
				podcasts,
				interviews,
				video,
				shows: shows.map((s) => ({
					id: s.id,
					slug: s.slug,
					name: s.name,
					kind: s.kind,
					host: s.host,
					description: s.description,
					cover: s.cover,
					episodes: s.episodes
				})),
				counts: Object.fromEntries(counts.map((c) => [c.kind, Number(c.n)]))
			};
		},
		{ tags: ['vods', 'media'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/**
 * One page of an archive: one kind, with search; gameplay also by event
 * and hero; sorted newest, oldest or longest.
 */
export function archive({ kind, q = '', eventId = '', hero = '', sort = 'newest', page = 1 }) {
	const key = `vods:watch:${kind}:${sort}|${eventId || 'all'}|${hero || 'all'}|${q || 'all'}|${page}`;
	return cached(
		key,
		async () => {
			const where = [LIVE, eq(vod.kind, kind)];
			if (q) {
				const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
				where.push(
					or(
						ilike(vod.title, like),
						ilike(vod.player1Name, like),
						ilike(vod.player2Name, like),
						ilike(vod.guests, like),
						ilike(studioShow.name, like)
					)
				);
			}
			if (eventId) where.push(eq(vod.eventId, eventId));
			if (hero) where.push(or(ilike(vod.player1Hero, hero), ilike(vod.player2Hero, hero)));
			const order =
				sort === 'oldest'
					? asc(vod.publishedAt)
					: sort === 'longest'
						? desc(vod.duration)
						: desc(vod.publishedAt);
			const [[{ total }], rows, all] = await Promise.all([
				db
					.select({ total: sql`count(*)::int` })
					.from(vod)
					.leftJoin(studioShow, eq(vod.showId, studioShow.id))
					.where(and(...where)),
				base()
					.where(and(...where))
					.orderBy(order)
					.limit(PER_PAGE)
					.offset((page - 1) * PER_PAGE),
				db
					.select({ p1: vod.player1Hero, p2: vod.player2Hero, eventId: vod.eventId })
					.from(vod)
					.where(and(LIVE, eq(vod.kind, kind)))
			]);
			const heroes = [...new Set(all.flatMap((r) => [r.p1, r.p2]).filter(Boolean))].sort();
			const eventIds = [...new Set(all.map((r) => r.eventId).filter(Boolean))];
			const events = eventIds.length
				? await db
						.select({ id: event.id, title: event.title, circuit: event.circuit })
						.from(event)
						.where(inArray(event.id, eventIds))
						.orderBy(desc(event.eventDate))
				: [];
			return {
				items: await cardsOf(rows),
				total: Number(total),
				totalAll: all.length,
				page,
				totalPages: Math.max(1, Math.ceil(Number(total) / PER_PAGE)),
				heroes,
				events
			};
		},
		{ tags: ['vods', 'events', 'media'], ttl: CACHE_TTL.MINUTE }
	);
}

/** A show and its published episodes: newest first, and in order for "start from the beginning". */
export function showPage(slug) {
	return cached(
		`vods:watch:show:${slug}`,
		async () => {
			const show = await getShowBySlug(slug);
			if (!show || !show.isActive) return null;
			const rows = await base()
				.where(and(LIVE, eq(vod.showId, show.id)))
				.orderBy(desc(vod.season), desc(vod.episodeNumber), desc(vod.publishedAt));
			const [withCover] = await withCovers([{ ...show, title: show.name }]);
			return { show: { ...show, cover: withCover.cover }, episodes: await cardsOf(rows) };
		},
		{ tags: ['vods', 'media'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/**
 * The player page's shared part (cached): the item, its show, and what to
 * watch next — for gameplay, matches with the same players or event; for
 * an episode, the next and previous in its show and more from it.
 */
export function playerItem(id) {
	return cached(
		`vods:viewer:${id}`,
		async () => {
			const [row] = await base().where(eq(vod.id, id)).limit(1);
			if (!row || !row.v.isPublished || row.v.status !== 'ready') return null;
			const [item] = await cardsOf([row]);
			const raw = row.v;

			let related = [];
			let next = null;
			let prev = null;
			if (raw.showId) {
				const eps = await base()
					.where(and(LIVE, eq(vod.showId, raw.showId)))
					.orderBy(asc(vod.season), asc(vod.episodeNumber), asc(vod.publishedAt));
				const at = eps.findIndex((e) => e.v.id === raw.id);
				const ordered = await cardsOf(eps);
				prev = at > 0 ? ordered[at - 1] : null;
				next = at >= 0 && at < ordered.length - 1 ? ordered[at + 1] : null;
				related = ordered
					.filter((e) => e.id !== raw.id)
					.reverse()
					.slice(0, 4);
			} else {
				const rows = await base()
					.where(and(LIVE, eq(vod.kind, raw.kind)))
					.orderBy(desc(vod.publishedAt))
					.limit(13);
				const players = [raw.player1Name, raw.player2Name].filter(Boolean);
				const score = (v) =>
					[v.player1Name, v.player2Name].filter((p) => p && players.includes(p)).length * 2 +
					(v.eventId && v.eventId === raw.eventId ? 3 : 0);
				const picked = rows
					.filter((r) => r.v.id !== raw.id)
					.sort((a, b) => score(b.v) - score(a.v))
					.slice(0, 4);
				related = await cardsOf(picked);
			}
			return {
				item,
				raw: {
					muxPlaybackId: raw.muxPlaybackId,
					aspectRatio: raw.aspectRatio
				},
				related,
				next,
				prev
			};
		},
		{ tags: ['vods', 'media'] }
	);
}
