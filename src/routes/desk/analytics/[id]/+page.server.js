import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, canEditEntry } from '$lib/server/auth/roles.js';
import { entryDetail, parseRange } from '$lib/server/contentAnalytics/query.js';

/**
 * /desk/analytics/[id] — one piece in depth. Editors and admins can open
 * any piece; writers only their own.
 */
export async function load({ locals, params, url }) {
	if (!canEditEntries(locals.user)) throw redirect(302, '/desk');
	const [entry] = await db
		.select({ id: cmsEntry.id, authorId: cmsEntry.authorId })
		.from(cmsEntry)
		.where(eq(cmsEntry.id, params.id))
		.limit(1);
	if (!entry) throw error(404, 'Entry not found');
	if (!canEditEntry(locals.user, entry.authorId)) throw error(403, 'Forbidden');

	const range = parseRange(url.searchParams.get('range'));
	let report = null;
	try {
		report = await entryDetail(entry.id, range);
	} catch (err) {
		console.error('content analytics detail failed:', err);
	}
	return { range, report, entryId: entry.id };
}
