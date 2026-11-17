import { error, redirect } from '@sveltejs/kit';
import { getItem } from '$lib/server/studio/list.js';
import { editorOptions } from '$lib/server/studio/editor.js';

/** /studio/media/[id] — edit one item. Bonus matches are edited in the Desk. */
export async function load({ params, depends }) {
	depends('studio:item');
	const item = await getItem(params.id);
	if (!item) throw error(404, 'Not found');
	if (item.kind === 'gameplay') throw redirect(302, `/desk/matches/${item.id}`);
	return {
		item,
		kind: item.kind,
		kinds: ['podcast', 'interview', 'video'],
		showId: item.showId,
		...(await editorOptions())
	};
}
