import { json, error } from '@sveltejs/kit';
import Search from '@flesh-and-blood/search';
import { cards } from '@flesh-and-blood/cards';
import { canEditEntries, canEditCourses } from '$lib/server/auth/roles.js';

/**
 * GET /api/cms/cards/search?q=foo
 *
 * Returns up to 20 unique card names matching the query, each with the list
 * of pitch variants available (`['r', 'y', 'b']`) so the picker can render one
 * button per pitch. Response shape matches the legacy custom card lookup so
 * the InsertCardLinkDialog is a drop-in replacement.
 *
 * Backend: `@flesh-and-blood/search` on top of the `@flesh-and-blood/cards`
 * data set. Updates now ship via `npm update @flesh-and-blood/search` — no
 * manual CSV uploads through `/admin/cards`, no custom `fab_card_lookup`
 * table to keep in sync as new sets release.
 */

// The Search instance builds a Fuse index over ~2000 cards, ~50-200ms on first
// call. Cache on globalThis so Vite HMR reuses the built index between
// server-file saves and cold-start pays it only once per Node process.
const g = /** @type {any} */ (globalThis);

function getFabSearch() {
	if (g.__ageFabSearch) return g.__ageFabSearch;
	g.__ageFabSearch = new Search(cards);
	return g.__ageFabSearch;
}

// Card.pitch is 1 | 2 | 3 (Red / Yellow / Blue) in the FAB dataset.
const PITCH_LETTERS = { 1: 'r', 2: 'y', 3: 'b' };
const PITCH_ORDER = ['r', 'y', 'b'];

export async function GET({ url, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user) && !canEditCourses(user)) {
		throw error(403, 'Not permitted');
	}

	const q = (url.searchParams.get('q') || '').trim();
	if (q.length < 2) return json({ results: [] });

	const searchResults = getFabSearch().search(q)?.searchResults || [];

	// Group by canonical card name, aggregate pitch variants.
	const byName = new Map();
	for (const card of searchResults) {
		const name = card.name;
		if (!name) continue;
		const pitchLetter = PITCH_LETTERS[card.pitch] || null;
		const imageUrl = card.defaultImage || card.printings?.[0]?.image || '';

		const existing = byName.get(name);
		if (existing) {
			if (pitchLetter) existing.pitches.add(pitchLetter);
			// Prefer the first non-empty image we see.
			if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
		} else {
			byName.set(name, {
				name,
				imageUrl,
				pitches: new Set(pitchLetter ? [pitchLetter] : [])
			});
		}
	}

	const results = Array.from(byName.values())
		.slice(0, 20)
		.map((r) => ({
			name: r.name,
			imageUrl: r.imageUrl,
			pitches: PITCH_ORDER.filter((p) => r.pitches.has(p))
		}));

	return json({ results });
}
