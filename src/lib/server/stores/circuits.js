/**
 * The AGE Open circuits, from the `circuit` table (migration 045): name,
 * colour, time zone and order. Until 045 is applied, the three original
 * circuits are served from code so nothing that lists circuits breaks.
 */
import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { circuit } from '$lib/server/db/schema.js';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';

export const CIRCUITS_TAG = 'circuits';

/** The circuits as they were before 045, in the same shape as a row. */
const BEFORE_045 = [
	['Los Angeles', 'los-angeles', 'LA', 'West Coast', 'America/Los_Angeles', '#1b4f9c'],
	['St. Louis', 'st-louis', 'STL', 'Midwest', 'America/Chicago', '#2f7d46'],
	['New England', 'new-england', 'NE', 'East Coast', 'America/New_York', '#6a4a86']
].map(([name, slug, short, region, timezone, color], i) => ({
	id: slug,
	name,
	slug,
	short,
	region,
	timezone,
	color,
	blurb: null,
	imageUrl: null,
	sort: i + 1,
	active: true
}));

const missingTable = (err) => err?.code === '42P01' || err?.cause?.code === '42P01';

async function load() {
	try {
		return await db.select().from(circuit).orderBy(asc(circuit.sort), asc(circuit.name));
	} catch (err) {
		if (missingTable(err)) return BEFORE_045;
		throw err;
	}
}

/**
 * Every circuit, in display order. Inactive ones are left out unless asked
 * for (admin lists them; public pages don't).
 * @param {{ inactive?: boolean }} [opts]
 */
export async function listCircuits({ inactive = false } = {}) {
	const rows = await cached('circuits:all', load, {
		tags: [CIRCUITS_TAG],
		ttl: CACHE_TTL.DAY,
		mem: 15
	});
	return inactive ? rows : rows.filter((c) => c.active);
}

/**
 * One circuit by its name as events store it ("St. Louis"), ignoring case
 * and stray spaces. Null when there's no such circuit.
 * @param {string | null | undefined} name
 */
export async function circuitByName(name) {
	const key = (name || '').trim().toLowerCase();
	if (!key) return null;
	const rows = await listCircuits({ inactive: true });
	return rows.find((c) => c.name.toLowerCase() === key) ?? null;
}
