import { json, error } from '@sveltejs/kit';
import { canEditAllEntries } from '$lib/server/auth/roles.js';
import { createGameplay } from '$lib/server/video/gameplay.js';
import { VideoError } from '$lib/server/video/mux.js';

/**
 * POST /api/desk/videos/vod — a new bonus gameplay video (details only).
 * Then POST /api/desk/videos/vod/[id]/upload for the file. Admins and editors.
 */
export async function POST({ locals, request }) {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!canEditAllEntries(locals.user)) throw error(403, 'Not permitted');
	try {
		const vod = await createGameplay(locals.user, await request.json().catch(() => ({})));
		return json({ vod }, { status: 201 });
	} catch (err) {
		if (err instanceof VideoError) throw error(err.status, err.message);
		throw err;
	}
}
