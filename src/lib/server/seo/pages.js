/**
 * Every public page worth finding, for /sitemap.xml and /llms.txt: the
 * fixed pages, then Library pieces and topics, AGE Open events with their
 * results and decklists, Academy courses, people pages and AGE Studios.
 * Each part is read on its own, so one that fails (a table not there yet
 * before a migration) just drops out. Cached for an hour.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { cached } from '$lib/server/cache/index.js';

/** @typedef {{ path: string, lastmod?: string | null, priority?: number, changefreq?: string }} Page */

const FIXED = [
	['/', 1, 'daily'],
	['/library', 0.9, 'daily'],
	['/library/topics', 0.5, 'weekly'],
	['/library/matches', 0.7, 'daily'],
	['/ageopen', 0.9, 'daily'],
	['/academy', 0.8, 'weekly'],
	['/studios', 0.8, 'daily'],
	['/studios/shows', 0.6, 'weekly'],
	['/studios/projects', 0.5, 'weekly'],
	['/premium', 0.7, 'monthly'],
	['/roadmap', 0.5, 'weekly'],
	['/status', 0.3, 'daily'],
	['/contact', 0.3, 'yearly'],
	['/academy-calculator', 0.4, 'monthly'],
	['/terms', 0.2, 'yearly'],
	['/privacy', 0.2, 'yearly'],
	['/refund-policy', 0.2, 'yearly']
];

const rowsOf = (r) => /** @type {any[]} */ (r?.rows ?? r ?? []);
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

async function part(query, map) {
	try {
		return rowsOf(await db.execute(query)).map(map);
	} catch (err) {
		console.error('sitemap part failed:', err?.message || err);
		return [];
	}
}

/** @returns {Promise<Page[]>} */
async function buildPages() {
	const fixed = FIXED.map(([path, priority, changefreq]) => ({ path, priority, changefreq }));

	// one at a time: the pooler dislikes bursts of fresh connections
	const entries = await part(
		sql`SELECT slug, updated_at, published_at FROM cms_entry
			WHERE status = 'published' OR (status = 'scheduled' AND scheduled_for <= now())
			ORDER BY published_at DESC NULLS LAST`,
		(r) => ({
			path: `/library/${r.slug}`,
			lastmod: day(r.updated_at || r.published_at),
			priority: 0.8
		})
	);
	const topics = await part(
		sql`SELECT DISTINCT t.slug FROM cms_tag t
			JOIN cms_entry_tag et ON et.tag_id = t.id
			JOIN cms_entry e ON e.id = et.entry_id
			WHERE e.status = 'published' OR (e.status = 'scheduled' AND e.scheduled_for <= now())`,
		(r) => ({ path: `/library/tag/${r.slug}`, priority: 0.5, changefreq: 'weekly' })
	);
	const events = await part(
		sql`SELECT id, status, event_date FROM events
			WHERE coalesce(status, 'upcoming') NOT IN ('unpublished', 'cancelled')
			ORDER BY event_date DESC NULLS LAST`,
		(r) => r
	);
	const eventPages = events.flatMap((r) => [
		{
			path: `/ageopen/${encodeURIComponent(r.id)}`,
			lastmod: day(r.event_date),
			priority: r.status === 'upcoming' ? 0.8 : 0.6
		},
		...(r.status === 'completed' || r.status === 'in_progress'
			? [{ path: `/ageopen/${encodeURIComponent(r.id)}/results`, priority: 0.7 }]
			: [])
	]);
	const decklists = await part(
		sql`SELECT d.id, d.event_id FROM decklists d
			JOIN events e ON e.id = d.event_id
			WHERE e.status = 'completed'`,
		(r) => ({
			path: `/ageopen/${encodeURIComponent(r.event_id)}/decklist/${r.id}`,
			priority: 0.4,
			changefreq: 'yearly'
		})
	);
	const courses = await part(
		sql`SELECT slug, updated_at FROM cms_course WHERE status = 'published'`,
		(r) => ({ path: `/academy/${r.slug}`, lastmod: day(r.updated_at), priority: 0.8 })
	);
	const people = await part(
		sql`SELECT u.handle FROM "user" u
			WHERE u.handle IS NOT NULL AND (
				EXISTS (SELECT 1 FROM cms_entry e WHERE e.author_id = u.id
					AND (e.status = 'published' OR (e.status = 'scheduled' AND e.scheduled_for <= now())))
				OR EXISTS (SELECT 1 FROM cms_course c WHERE c.author_id = u.id AND c.status = 'published'))`,
		(r) => ({ path: `/people/${r.handle}`, priority: 0.5, changefreq: 'weekly' })
	);
	const videos = await part(
		sql`SELECT id, updated_at FROM vods WHERE is_published AND status = 'ready'
			ORDER BY published_at DESC NULLS LAST`,
		(r) => ({ path: `/studios/${r.id}`, lastmod: day(r.updated_at), priority: 0.6 })
	);
	const shows = await part(sql`SELECT slug, updated_at FROM studio_show WHERE is_active`, (r) => ({
		path: `/studios/shows/${r.slug}`,
		lastmod: day(r.updated_at),
		priority: 0.5
	}));

	return [
		...fixed,
		...entries,
		...topics,
		...eventPages,
		...decklists,
		...courses,
		...people,
		...videos,
		...shows
	];
}

/** @returns {Promise<Page[]>} */
export function publicPages() {
	return cached('seo:pages:v1', buildPages, { tags: ['entries', 'sitemap'], ttl: 3600 });
}
