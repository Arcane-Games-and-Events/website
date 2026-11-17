import { redirect } from '@sveltejs/kit';
import { canManageBonusMatches } from '$lib/server/auth/roles.js';
import { editorOptions } from '$lib/server/studio/editor.js';

/** /desk/matches/new — a new bonus match. Editors and admins. */
export async function load({ locals }) {
	if (!canManageBonusMatches(locals.user)) throw redirect(302, '/desk');
	return {
		item: null,
		kind: 'gameplay',
		kinds: ['gameplay'],
		base: '/desk/matches',
		backLabel: 'Bonus matches',
		showId: null,
		...(await editorOptions())
	};
}
