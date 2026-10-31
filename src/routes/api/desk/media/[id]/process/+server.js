import { json, error } from '@sveltejs/kit';
import {
	canManage,
	canUseAnyMedia,
	getMediaRow,
	toLibraryItem
} from '$lib/server/media/library.js';
import { processAvif, processMedia } from '$lib/server/media/process.js';

export const config = { maxDuration: 60 };

/**
 * POST /api/desk/media/[id]/process
 *   After the browser has uploaded the original: make the WebP copies and
 *   blur, and mark the image ready. Returns the library item.
 *
 * POST /api/desk/media/[id]/process?avif=1
 *   The slower AVIF pass. The browser starts it and doesn't wait; pages use
 *   the WebP copies until it's done.
 */
export async function POST({ params, locals, url }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canUseAnyMedia(user)) throw error(403, 'Not permitted');
	const row = await getMediaRow(params.id);
	if (!row) throw error(404, 'Image not found');
	if (!canManage(user, row)) throw error(403, 'This image belongs to someone else');

	try {
		if (url.searchParams.get('avif')) {
			if (row.status !== 'ready') throw error(409, 'The image is not ready yet');
			const done = await processAvif(row);
			return json({ media: toLibraryItem(done) });
		}
		const ready = await processMedia(row);
		return json({ media: toLibraryItem(ready) });
	} catch (err) {
		if (err?.status) throw err;
		console.error(`[media/process] ${row.id}:`, err?.message || err);
		throw error(422, "That file couldn't be read as an image. Try saving it as a JPEG or PNG.");
	}
}
