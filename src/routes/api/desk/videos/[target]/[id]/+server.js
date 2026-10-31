import { json, error } from '@sveltejs/kit';
import { deleteOwnerVideo, ownerFor, ownerSlot, VideoError } from '$lib/server/video/mux.js';
import { updateGameplay } from '$lib/server/studio/media.js';

const run = async (fn) => {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof VideoError) throw error(err.status, err.message);
		throw err;
	}
};

/**
 * PATCH  /api/desk/videos/vod/[id] — edit gameplay details, publish/unpublish.
 * DELETE /api/desk/videos/[target]/[id] — delete the video from Mux. Gameplay
 *        is removed from the site; an article, lesson or trailer keeps its
 *        page and just loses the video. A writer's removal on a live piece
 *        waits for approval instead.
 */
export async function PATCH({ params, locals, request }) {
	if (params.target !== 'vod') throw error(405, 'Only gameplay has details to edit here');
	return run(async () => {
		const row = await ownerFor(locals.user, 'vod', params.id);
		const input = await request.json().catch(() => ({}));
		return json({ vod: await updateGameplay(row, input) });
	});
}

export async function DELETE({ params, locals }) {
	return run(async () => {
		// A writer removing a live piece's video only asks for it; an editor
		// or admin approves the removal.
		const { target, row } = await ownerSlot(locals.user, params.target, params.id);
		await deleteOwnerVideo(target, row);
		return json({ ok: true });
	});
}
