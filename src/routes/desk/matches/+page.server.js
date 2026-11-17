import { redirect } from '@sveltejs/kit';
import { canManageBonusMatches } from '$lib/server/auth/roles.js';
import { listItems, stageOf } from '$lib/server/studio/list.js';

/** /desk/matches — every bonus match (AGE Open gameplay). Editors and admins. */
export async function load({ locals, depends }) {
	if (!canManageBonusMatches(locals.user)) throw redirect(302, '/desk');
	depends('studio:media');
	const items = (await listItems())
		.filter((i) => i.kind === 'gameplay')
		.map((i) => ({ ...i, stage: stageOf(i) }));
	return { items };
}
