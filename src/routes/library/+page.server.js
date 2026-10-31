import { db } from '$lib/server/db/index.js';
import { latest } from '$lib/server/studio/public.js';
import { vod } from '$lib/server/db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
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

	// ============ From the Studio ============
	// The newest piece of any kind as the band's spread, then the latest
	// match, episode and interview (topped up with whatever's newest).
	let studio = { lead: null, strip: [], total: 0 };
	try {
		const [lead, gameplay, podcasts, interviews, any, [{ total }]] = await Promise.all([
			latest({ limit: 1 }),
			latest({ kind: 'gameplay', limit: 2 }),
			latest({ kind: 'podcast', limit: 2 }),
			latest({ kind: 'interview', limit: 2 }),
			latest({ limit: 6 }),
			db
				.select({ total: sql`count(*)::int` })
				.from(vod)
				.where(and(eq(vod.isPublished, true), eq(vod.status, 'ready')))
		]);
		const leadId = lead[0]?.id;
		const strip = [];
		for (const list of [gameplay, podcasts, interviews]) {
			const pick = list.find((x) => x.id !== leadId && !strip.some((y) => y.id === x.id));
			if (pick) strip.push(pick);
		}
		for (const x of any) {
			if (strip.length >= 3) break;
			if (x.id !== leadId && !strip.some((y) => y.id === x.id)) strip.push(x);
		}
		studio = { lead: lead[0] ?? null, strip, total: Number(total) || 0 };
	} catch (err) {
		console.warn('Could not fetch Studio media:', err.message);
	}

	return {
		articles,
		studio
	};
}
