import { json, error } from '@sveltejs/kit';
import {
	canUseMedia,
	createUpload,
	importHeroArt,
	libraryOf,
	listMedia,
	MediaError
} from '$lib/server/media/library.js';
import { managedCourse } from '$lib/server/courses/access.js';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { canEditEntry } from '$lib/server/auth/roles.js';
import { eq } from 'drizzle-orm';

/** A Classroom request names its course; the user must manage it. */
async function courseFor(user, library, value) {
	if (library !== 'classroom' || !value) return null;
	if (!/^[0-9a-f-]{36}$/i.test(String(value))) throw error(400, 'Bad course');
	const r = await managedCourse(user, String(value));
	if (r.error) throw error(r.error === 404 ? 404 : 403, 'Not your course');
	return r.course.id;
}

/** A Desk request names its entry; the user must be able to edit it. */
async function entryFor(user, library, value) {
	if (library !== 'content' || !value) return null;
	if (!/^[0-9a-f-]{36}$/i.test(String(value))) throw error(400, 'Bad entry');
	const [row] = await db
		.select({ id: deskEntry.id, authorId: deskEntry.authorId })
		.from(deskEntry)
		.where(eq(deskEntry.id, String(value)))
		.limit(1);
	if (!row) throw error(404, 'No such entry');
	if (!canEditEntry(user, row.authorId)) throw error(403, 'Not your entry');
	return row.id;
}

/**
 * GET /api/desk/media?library=content|classroom|studio&course=&entry=&older=1&q=&scope=mine|all&uploader=&sort=new|old|name&offset=
 *   One page of one image library. Uploaders only ever get their own images;
 *   admins and editors can see everyone's. In the Classroom, `course` gives
 *   that course's images (for anyone who manages the course) and `older`
 *   the uploads not yet filed under a course. In the Desk, `entry` does the
 *   same for an article or video entry (for anyone who can edit it).
 *
 * POST /api/desk/media  { filename, mimeType, size, library, course, entry }
 *   Starts an upload: creates the library row and returns a signed URL the
 *   browser uploads the file to directly. Then POST /api/desk/media/[id]/process.
 *
 * POST /api/desk/media  { hero, library, course, entry }
 *   Puts a hero's still (the hero art) into the library instead, ready to
 *   use: { media }. The same hero in the same place gives the same image.
 */
export async function GET({ url, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	const library = libraryOf(url.searchParams.get('library'));
	if (!canUseMedia(user, library)) throw error(403, 'Not permitted');
	const course = await courseFor(user, library, url.searchParams.get('course'));
	const entry = await entryFor(user, library, url.searchParams.get('entry'));
	const result = await listMedia(user, {
		library,
		course,
		entry,
		older: url.searchParams.get('older') === '1',
		q: url.searchParams.get('q') || '',
		scope: url.searchParams.get('scope') === 'mine' ? 'mine' : 'all',
		uploader: url.searchParams.get('uploader') || undefined,
		sort: /** @type {any} */ (url.searchParams.get('sort') || 'new'),
		offset: Number(url.searchParams.get('offset')) || 0
	});
	return json(result);
}

export async function POST({ request, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	const body = await request.json().catch(() => ({}));
	const library = libraryOf(body.library);
	if (!canUseMedia(user, library)) throw error(403, 'Not permitted');
	const course = await courseFor(user, library, body.course);
	const entry = await entryFor(user, library, body.entry);
	try {
		if (typeof body.hero === 'string') {
			const media = await importHeroArt(user, body.hero, {
				library,
				courseId: course,
				entryId: entry
			});
			return json({ media }, { status: 201 });
		}
		return json(await createUpload(user, body, library, course, entry), { status: 201 });
	} catch (err) {
		if (err instanceof MediaError) throw error(err.status, err.message);
		throw err;
	}
}
