import { error, redirect } from '@sveltejs/kit';
import { canManageBonusMatches } from '$lib/server/auth/roles.js';
import { getItem } from '$lib/server/studio/list.js';
import { editorOptions } from '$lib/server/studio/editor.js';

/** /desk/matches/[id] — edit one bonus match. Editors and admins. */
export async function load({ locals, params, depends }) {
	if (!canManageBonusMatches(locals.user)) throw redirect(302, '/desk');
	depends('studio:item');
	const item = await getItem(params.id);
	if (!item) throw error(404, 'Not found');
	if (item.kind !== 'gameplay') throw redirect(302, `/studio/media/${item.id}`);
	return {
		item,
		kind: 'gameplay',
		kinds: ['gameplay'],
		base: '/desk/matches',
		backLabel: 'Bonus matches',
		showId: null,
		...(await editorOptions())
	};
}
