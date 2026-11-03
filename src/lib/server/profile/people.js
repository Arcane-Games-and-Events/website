/**
 * People pages: a public page for every writer and teacher at
 * /people/<handle>, with everything they've made for AGE (Library pieces
 * and live courses). Bylines and "Your instructor" link to it.
 *
 * Handles are made and kept in ./handles.js (migration 039). Until 039 is
 * applied there are none: names aren't links and these pages 404.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { getAuthorProfile, isMissingProfileTable } from '$lib/server/desk/authorProfile.js';
import { listPublishedEntries } from '$lib/server/desk/list.js';
import { listPublishedCourses } from '$lib/server/desk/courses.js';
import { PEOPLE_TAG, isHandle, isMissingColumn, rowsOf } from './handles.js';

/** The person a handle belongs to, or null. */
async function personByHandle(handle) {
	try {
		const [row] = rowsOf(
			await db.execute(sql`
				select u.id, u.first_name, u.last_name
				from cms_author_profile p join "user" u on u.id = p.user_id
				where p.handle = ${handle}`)
		);
		return row ?? null;
	} catch (err) {
		if (isMissingColumn(err) || isMissingProfileTable(err)) return null;
		throw err;
	}
}

/** Everything their page shows, or null when they've nothing public yet. */
async function buildPersonPage(handle) {
	const person = await personByHandle(handle);
	if (!person) return null;

	const [{ profile }, entries, allCourses] = await Promise.all([
		getAuthorProfile(person.id).catch(() => ({ profile: null })),
		listPublishedEntries({ limit: 300, authorId: person.id }),
		listPublishedCourses({ limit: 200 })
	]);
	const courses = allCourses.filter((c) => c.authorId === person.id);
	if (!entries.length && !courses.length) return null;

	return {
		id: person.id,
		handle,
		name: profile?.displayName || `${person.first_name} ${person.last_name || ''}`.trim(),
		title: profile?.title || null,
		bio: profile?.bio || null,
		photo: profile?.avatar?.url || null,
		links: profile?.links ?? [],
		entries,
		courses
	};
}

/**
 * A person's public page by handle, or null (no such person, nothing public,
 * or migration 039 not applied).
 * @param {string} handle
 */
export async function getPersonPage(handle) {
	if (!isHandle(handle)) return null;
	return cached(`people:page:${handle}`, () => buildPersonPage(handle), {
		tags: [PEOPLE_TAG, 'entries', 'courses', 'media'],
		ttl: CACHE_TTL.HOUR
	});
}
