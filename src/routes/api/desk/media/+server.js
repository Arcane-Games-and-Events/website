import { json, error } from '@sveltejs/kit';
import {
	canUseMedia,
	createUpload,
	libraryOf,
	listMedia,
	MediaError
} from '$lib/server/media/library.js';

/**
 * GET /api/desk/media?library=content|classroom&q=&scope=mine|all&uploader=&sort=new|old|name&offset=
 *   One page of one image library: the Desk's (content) or the Classroom's.
 *   Uploaders only ever get their own images; admins and editors can see
 *   everyone's.
 *
 * POST /api/desk/media  { filename, mimeType, size, library }
 *   Starts an upload: creates the library row and returns a signed URL the
 *   browser uploads the file to directly. Then POST /api/desk/media/[id]/process.
 */
export async function GET({ url, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	const library = libraryOf(url.searchParams.get('library'));
	if (!canUseMedia(user, library)) throw error(403, 'Not permitted');
	const result = await listMedia(user, {
		library,
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
	try {
		return json(await createUpload(user, body, library), { status: 201 });
	} catch (err) {
		if (err instanceof MediaError) throw error(err.status, err.message);
		throw err;
	}
}
