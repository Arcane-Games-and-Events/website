import { error, redirect } from '@sveltejs/kit';
import { canManageBonusMatches } from '$lib/server/auth/roles.js';
import { getItem } from '$lib/server/studio/list.js';
import { videoPage } from '$lib/server/video/page.js';

/** /desk/matches/[id]/analytics — one bonus match's numbers. Editors and admins. */
export async function load(event) {
	if (!canManageBonusMatches(event.locals.user)) throw redirect(302, '/desk');
	const item = await getItem(event.params.id);
	if (!item) throw error(404, 'Not found');
	if (item.kind !== 'gameplay') throw redirect(302, `/studio/media/${item.id}/analytics`);
	return videoPage({ ...event, params: { target: 'vod', id: item.id } });
}
