/**
 * Handles: the short name in someone's people page address, /people/<handle>
 * (cms_author_profile.handle, migration 039). Made from the name they go by
 * the first time it's asked for, then kept so shared links keep working.
 * Null everywhere until 039 is applied, so names just aren't links.
 *
 * The column isn't in the Drizzle schema (see the note there), so it's read
 * and written with SQL. Kept apart from people.js so the course and entry
 * loaders can use it without importing the people page's own loaders.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { isMissingProfileTable } from '$lib/server/desk/authorProfile.js';

/** Cache tag for handles and people pages; profile saves bump it. */
export const PEOPLE_TAG = 'people';

export const rowsOf = (r) => (Array.isArray(r) ? r : (r?.rows ?? []));
export const isMissingColumn = (err) => (err?.code || err?.cause?.code) === '42703';
const isTaken = (err) => (err?.code || err?.cause?.code) === '23505';

/** "Elliot Silva" → "elliot-silva". */
export function slugifyName(name) {
	return String(name ?? '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/, '');
}

/** True for something shaped like a handle (what /people/[handle] accepts). */
export const isHandle = (v) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(v ?? ''));

async function ensureHandle(userId) {
	try {
		const [have] = rowsOf(
			await db.execute(sql`select handle from cms_author_profile where user_id = ${userId}`)
		);
		if (have?.handle) return have.handle;

		const [u] = rowsOf(
			await db.execute(sql`
				select u.first_name, u.last_name, p.display_name
				from "user" u left join cms_author_profile p on p.user_id = u.id
				where u.id = ${userId}`)
		);
		if (!u) return null;
		const base =
			slugifyName(u.display_name?.trim() || `${u.first_name} ${u.last_name || ''}`) ||
			'contributor';
		for (let n = 1; n <= 50; n++) {
			const handle = n === 1 ? base : `${base}-${n}`;
			try {
				const [row] = rowsOf(
					await db.execute(sql`
						insert into cms_author_profile (user_id, handle) values (${userId}, ${handle})
						on conflict (user_id) do update
							set handle = coalesce(cms_author_profile.handle, excluded.handle)
						returning handle`)
				);
				return row?.handle ?? null;
			} catch (err) {
				if (!isTaken(err)) throw err;
			}
		}
		return null;
	} catch (err) {
		if (isMissingColumn(err) || isMissingProfileTable(err)) return null;
		throw err;
	}
}

/**
 * The handle for someone's people page, made the first time it's asked for.
 * Null when there's no such user or migration 039 isn't applied yet.
 * @param {string | null | undefined} userId
 * @returns {Promise<string | null>}
 */
export async function handleFor(userId) {
	if (!userId) return null;
	return cached(`people:handle:${userId}`, () => ensureHandle(userId), {
		tags: [PEOPLE_TAG],
		ttl: CACHE_TTL.DAY
	}).catch((err) => {
		console.error('[people] handle lookup failed:', err?.message || err);
		return null;
	});
}
