/**
 * The Studio's lists: every item with its thumbnail, show, event and plays,
 * and the production board on the Studio home.
 */
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { event, studioShow, vod } from '$lib/server/db/schema.js';
import { videoOf } from '$lib/server/video/mux.js';
import { withThumb } from '$lib/server/video/list.js';
import { videoOverview } from '$lib/server/contentAnalytics/video.js';
import { withCovers } from './media.js';
import { listShows } from './shows.js';

/** Counted plays per item (all time), or an empty map before analytics exist. */
async function playsById() {
	try {
		const r = await db.execute(
			sql`SELECT vod_id, count(*)::int AS n FROM ca_view WHERE vod_id IS NOT NULL AND qualified AND audience <> 'staff' AND video_plays > 0 GROUP BY vod_id`
		);
		return new Map((r?.rows ?? r ?? []).map((x) => [x.vod_id, Number(x.n)]));
	} catch {
		return new Map();
	}
}

/** Every Studio item, newest first, ready for the Media list (or just `id`). */
export async function listItems({ id = null } = {}) {
	const [rows, plays] = await Promise.all([
		db
			.select({
				v: vod,
				eventTitle: event.title,
				circuit: event.circuit,
				showName: studioShow.name,
				showSlug: studioShow.slug
			})
			.from(vod)
			.leftJoin(event, eq(vod.eventId, event.id))
			.leftJoin(studioShow, eq(vod.showId, studioShow.id))
			.where(id ? eq(vod.id, id) : undefined)
			.orderBy(desc(vod.createdAt)),
		playsById()
	]);
	const covered = await withCovers(rows.map((r) => r.v));
	const out = [];
	for (const [i, r] of rows.entries()) {
		out.push({
			...covered[i],
			event: r.v.eventId ? { title: r.eventTitle, circuit: r.circuit } : null,
			show: r.v.showId ? { id: r.v.showId, name: r.showName, slug: r.showSlug } : null,
			plays: plays.get(r.v.id) || 0,
			video: await withThumb(videoOf('vod', r.v))
		});
	}
	return out;
}

/** One item as the editor needs it, or null. */
export async function getItem(id) {
	const [item] = await listItems({ id });
	return item ?? null;
}

/** Where an item is in production. */
export function stageOf(item) {
	const status = item.video?.status;
	if (status === 'errored') return 'failed';
	if (!item.video?.provider) return 'no-file';
	if (status !== 'ready') return 'processing';
	return item.isPublished ? 'live' : 'draft';
}

/** The Studio home: figures, what's in production, recent and top items, and shows. */
export async function studioHome() {
	const [items, shows, report] = await Promise.all([
		listItems(),
		listShows(),
		videoOverview('studio', 30).catch(() => ({ available: false }))
	]);
	const live = items.filter((i) => stageOf(i) === 'live');
	const byKind = (k) => live.filter((i) => i.kind === k).length;
	const seconds = live.reduce((n, i) => n + Number(i.duration || 0), 0);

	const inProduction = items
		.filter((i) => stageOf(i) !== 'live')
		.map((i) => ({ ...i, stage: stageOf(i) }))
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

	const byId = new Map(items.map((i) => [i.id, i]));
	const top = (report?.videos || [])
		.map((v) => ({ ...v, item: byId.get(String(v.key).replace(/^vod:/, '')) }))
		.filter((v) => v.item)
		.slice(0, 5);

	return {
		figures: {
			gameplay: byKind('gameplay'),
			podcast: byKind('podcast'),
			interview: byKind('interview'),
			video: byKind('video'),
			hours: Math.round((seconds / 3600) * 10) / 10,
			views30: report?.totals?.views ?? null
		},
		inProduction,
		recent: live
			.slice()
			.sort(
				(a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
			)
			.slice(0, 6),
		top,
		shows: shows.map((s) => ({
			...s,
			latest:
				items
					.filter((i) => i.showId === s.id && i.isPublished)
					.sort(
						(a, b) =>
							new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
					)[0] || null
		}))
	};
}
