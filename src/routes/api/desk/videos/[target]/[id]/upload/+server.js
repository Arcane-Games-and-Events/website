import { json, error } from '@sveltejs/kit';
import { cancelUpload, createDirectUpload, ownerSlot, VideoError } from '$lib/server/video/mux.js';

const run = async (fn) => {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof VideoError) throw error(err.status, err.message);
		throw err;
	}
};

/**
 * POST   /api/desk/videos/[target]/[id]/upload — start a direct upload to Mux
 *        for this owner's video; returns { uploadUrl } for the browser.
 * DELETE /api/desk/videos/[target]/[id]/upload — cancel an unfinished upload;
 *        the owner keeps its previous video.
 */
export async function POST({ params, locals, url }) {
	return run(async () => {
		// A writer's upload on a live piece goes to its pending slot.
		const { target, row } = await ownerSlot(locals.user, params.target, params.id);
		const { uploadUrl, uploadId } = await createDirectUpload({
			target,
			row,
			origin: url.origin
		});
		return json({ uploadUrl, uploadId });
	});
}

export async function DELETE({ params, locals }) {
	return run(async () => {
		const { target, row } = await ownerSlot(locals.user, params.target, params.id);
		await cancelUpload(target, row);
		return json({ ok: true });
	});
}
