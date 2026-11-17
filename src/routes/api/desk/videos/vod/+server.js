import { json, error } from '@sveltejs/kit';
import { canManageBonusMatches, canUseStudio } from '$lib/server/auth/roles.js';
import { createGameplay } from '$lib/server/studio/media.js';
import { VideoError } from '$lib/server/video/mux.js';

/**
 * POST /api/desk/videos/vod — a new bonus gameplay video (details only).
 * Then POST /api/desk/videos/vod/[id]/upload for the file. Anyone in the
 * Studio; a bonus match (the default kind) only editors and admins.
 */
export async function POST({ locals, request }) {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!canUseStudio(locals.user)) throw error(403, 'Not permitted');
	const input = await request.json().catch(() => ({}));
	if ((input.kind ?? 'gameplay') === 'gameplay' && !canManageBonusMatches(locals.user)) {
		throw error(403, 'Only editors and admins can add bonus matches');
	}
	try {
		const vod = await createGameplay(locals.user, input);
		return json({ vod }, { status: 201 });
	} catch (err) {
		if (err instanceof VideoError) throw error(err.status, err.message);
		throw err;
	}
}
