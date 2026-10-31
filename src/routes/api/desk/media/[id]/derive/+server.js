import { json, error } from '@sveltejs/kit';
import {
	canManage,
	canUseAnyMedia,
	deriveMedia,
	getMediaRow,
	MediaError,
	toLibraryItem
} from '$lib/server/media/library.js';

export const config = { maxDuration: 60 };

/**
 * POST /api/desk/media/[id]/derive  { rotate?: 0|90|180|270, crop?: { x, y, w, h } }
 *   Saves a rotated and/or cropped copy as a new library image (the crop is
 *   in fractions of the rotated image). The original and its uses are left
 *   alone. Returns the new image, ready to use; its AVIF copies are started
 *   by the browser as for any upload.
 */
export async function POST({ params, locals, request }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canUseAnyMedia(user)) throw error(403, 'Not permitted');
	const source = await getMediaRow(params.id);
	if (!source) throw error(404, 'Image not found');
	if (!canManage(user, source)) throw error(403, 'This image belongs to someone else');

	const body = await request.json().catch(() => ({}));
	const crop =
		body.crop && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(Number(body.crop[k])))
			? body.crop
			: null;
	const rotate = Number(body.rotate) || 0;
	if (!crop && !rotate) throw error(400, 'Nothing to change');
	try {
		const created = await deriveMedia(user, source, { crop, rotate });
		return json({ media: toLibraryItem(created) }, { status: 201 });
	} catch (err) {
		if (err instanceof MediaError) throw error(err.status, err.message);
		throw err;
	}
}
