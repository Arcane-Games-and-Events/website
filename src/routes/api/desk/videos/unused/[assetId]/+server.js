import { json, error } from '@sveltejs/kit';
import { canSeeUnused, deleteUnusedAsset, VideoError } from '$lib/server/video/mux.js';

/**
 * DELETE /api/desk/videos/unused/[assetId] — delete a Mux asset no row uses.
 * Admins only, and only on the live site (dev shares the Mux account).
 */
export async function DELETE({ params, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!canSeeUnused(locals.user)) throw error(403, 'Not permitted');
	try {
		await deleteUnusedAsset(params.assetId);
		return json({ ok: true });
	} catch (err) {
		if (err instanceof VideoError) throw error(err.status, err.message);
		throw err;
	}
}
