import { json, error } from '@sveltejs/kit';
import { ownerSlot, syncFromMux, videoOf, VideoError } from '$lib/server/video/mux.js';

/**
 * POST /api/desk/videos/[target]/[id]/sync
 * Check Mux for this owner's video and mirror it onto the row (so status
 * moves on even where the webhook can't reach). Returns { video }.
 */
export async function POST({ params, locals }) {
	try {
		const { target, row } = await ownerSlot(locals.user, params.target, params.id);
		const updated = await syncFromMux(target, row);
		return json({
			video: videoOf(target, updated),
			row: updated,
			pending: target === 'entryDraft'
		});
	} catch (err) {
		if (err instanceof VideoError) throw error(err.status, err.message);
		throw err;
	}
}
