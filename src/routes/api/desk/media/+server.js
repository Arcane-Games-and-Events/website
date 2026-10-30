import { json, error } from '@sveltejs/kit';
import { canUseMedia, createUpload, listMedia, MediaError } from '$lib/server/media/library.js';

/**
 * GET /api/desk/media?q=&scope=mine|all&uploader=&sort=new|old|name&offset=
 *   One page of the image library. Uploaders only ever get their own images;
 *   admins and editors can see everyone's.
 *
 * POST /api/desk/media  { filename, mimeType, size }
 *   Starts an upload: creates the library row and returns a signed URL the
 *   browser uploads the file to directly. Then POST /api/desk/media/[id]/process.
 */
export async function GET({ url, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canUseMedia(user)) throw error(403, 'Not permitted');
	const result = await listMedia(user, {
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
	if (!canUseMedia(user)) throw error(403, 'Not permitted');
	const body = await request.json().catch(() => ({}));
	try {
		return json(await createUpload(user, body), { status: 201 });
	} catch (err) {
		if (err instanceof MediaError) throw error(err.status, err.message);
		throw err;
	}
}
