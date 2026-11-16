/**
 * Finding an AGE account to add to a store's team or an event's staff, by
 * name, email or GEM ID, for the search box on those forms. What comes
 * back is enough to tell people apart without handing out their email:
 * the name, a masked email (j•••@gmail.com) and the GEM ID.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';

/** "jordan@gmail.com" → "j•••@gmail.com". */
export function maskEmail(email) {
	const [name, domain] = String(email || '').split('@');
	if (!domain) return '';
	return `${name.slice(0, 1)}•••@${domain}`;
}

/**
 * Up to `limit` accounts matching the words typed: each word must match the
 * start of the first or last name, or the email starts with what's typed,
 * or the GEM ID is exactly it. Two characters at least.
 * @param {string} q
 * @param {{ limit?: number }} [opts]
 */
export async function searchAccounts(q, { limit = 8 } = {}) {
	const text = String(q || '')
		.trim()
		.slice(0, 80);
	if (text.length < 2) return [];
	const like = (s) => `${s.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
	const words = text.split(/\s+/).filter(Boolean).slice(0, 4);
	const nameMatch = sql.join(
		words.map(
			(w) =>
				sql`(lower(coalesce(${user.firstName}, '')) LIKE ${like(w)} OR lower(coalesce(${user.lastName}, '')) LIKE ${like(w)})`
		),
		sql` AND `
	);
	const rows = await db
		.select({
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			gemId: user.gemId
		})
		.from(user)
		.where(
			sql`(${nameMatch}) OR lower(${user.email}) LIKE ${like(text)} OR ${user.gemId} = ${text}`
		)
		.orderBy(sql`lower(${user.email}) = ${text.toLowerCase()} DESC`, user.firstName, user.lastName)
		.limit(limit);
	return rows.map((r) => {
		const name = `${r.firstName || ''} ${r.lastName || ''}`.trim();
		return {
			id: r.id,
			name: name || maskEmail(r.email),
			initials:
				`${(r.firstName || '')[0] || ''}${(r.lastName || '')[0] || ''}`.toUpperCase() ||
				(r.email || '?')[0].toUpperCase(),
			email: maskEmail(r.email),
			gemId: r.gemId || null
		};
	});
}
