import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { fabCardLookup } from '$lib/server/db/schema.js';
import { sql, inArray } from 'drizzle-orm';
import { requireCmsAccess } from '$lib/server/guards.js';

/**
 * GET /api/cms/cards/search?q=foo
 * Returns up to 20 unique card names matching the query, each with the list
 * of pitch variants available so the picker can show per-pitch insert buttons.
 *
 * Two-pass strategy (simpler than a single GROUP BY with FILTER aggregates):
 *   1. Pull the canonical base rows (lookup_key = name, no `:`)
 *   2. Pull the per-pitch rows for those same names and group in JS
 */
export async function GET({ url, locals }) {
	requireCmsAccess(locals);
	const q = (url.searchParams.get('q') || '').trim();
	if (q.length < 2) return json({ results: [] });

	// Pass 1 — base rows that match. These are the "canonical" entry per card.
	const baseRows = await db
		.select({
			name: fabCardLookup.name,
			imageUrl: fabCardLookup.imageUrl
		})
		.from(fabCardLookup)
		.where(
			sql`${fabCardLookup.name} ILIKE ${'%' + q + '%'} AND position(':' in ${fabCardLookup.lookupKey}) = 0`
		)
		.orderBy(fabCardLookup.name)
		.limit(20);

	if (baseRows.length === 0) return json({ results: [] });

	// Pass 2 — pull pitched variants for the same names.
	const names = baseRows.map((r) => r.name);
	const pitchRows = await db
		.select({
			name: fabCardLookup.name,
			pitch: fabCardLookup.pitch,
			lookupKey: fabCardLookup.lookupKey
		})
		.from(fabCardLookup)
		.where(
			sql`${inArray(fabCardLookup.name, names)} AND position(':' in ${fabCardLookup.lookupKey}) > 0`
		);

	// Group pitches by name. Pitch is stored as 1 (red) / 2 (yellow) / 3 (blue).
	const pitchByName = new Map();
	for (const row of pitchRows) {
		const letter =
			row.pitch === 1 ? 'r' : row.pitch === 2 ? 'y' : row.pitch === 3 ? 'b' : null;
		if (!letter) continue;
		const set = pitchByName.get(row.name) || new Set();
		set.add(letter);
		pitchByName.set(row.name, set);
	}

	const results = baseRows.map((r) => ({
		name: r.name,
		imageUrl: r.imageUrl,
		pitches: ['r', 'y', 'b'].filter((p) => pitchByName.get(r.name)?.has(p))
	}));

	return json({ results });
}
