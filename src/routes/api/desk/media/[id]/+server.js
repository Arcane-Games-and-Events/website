import { json, error } from '@sveltejs/kit';
import {
	canManage,
	canUseAnyMedia,
	deleteMedia,
	getMediaRow,
	mediaUsage,
	MediaError,
	toLibraryItem,
	updateMedia
} from '$lib/server/media/library.js';

/**
 * GET    /api/desk/media/[id]  — the image and everywhere it's used.
 * PATCH  /api/desk/media/[id]  — { name?, alt?, credit?, creditUrl? }
 * DELETE /api/desk/media/[id]  — removes the image and all its files, or
 *                                 409 with the usage list if it's still used.
 *
 * Only the uploader, an editor or an admin can see or change an image.
 */
async function load(params, locals) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canUseAnyMedia(user)) throw error(403, 'Not permitted');
	const row = await getMediaRow(params.id);
	if (!row) throw error(404, 'Image not found');
	if (!canManage(user, row)) throw error(403, 'This image belongs to someone else');
	return row;
}

export async function GET({ params, locals }) {
	const row = await load(params, locals);
	const usage = (await mediaUsage([row.id])).get(row.id) ?? [];
	return json({ media: toLibraryItem(row), usage });
}

export async function PATCH({ params, locals, request }) {
	const row = await load(params, locals);
	const body = await request.json().catch(() => ({}));
	try {
		const updated = await updateMedia(row, body);
		return json({ media: toLibraryItem(updated) });
	} catch (err) {
		if (err instanceof MediaError) throw error(err.status, err.message);
		throw err;
	}
}

export async function DELETE({ params, locals }) {
	const row = await load(params, locals);
	const result = await deleteMedia(row);
	if (!result.deleted) {
		return json(
			{ deleted: false, message: 'This image is still in use.', usage: result.usage },
			{ status: 409 }
		);
	}
	return json({ deleted: true });
}
