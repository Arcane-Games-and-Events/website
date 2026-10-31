import { error } from '@sveltejs/kit';
import { getItem } from '$lib/server/studio/list.js';
import { editorOptions } from '$lib/server/studio/editor.js';

/** /studio/media/[id] — edit one item. */
export async function load({ params, depends }) {
	depends('studio:item');
	const item = await getItem(params.id);
	if (!item) throw error(404, 'Not found');
	return { item, kind: item.kind, showId: item.showId, ...(await editorOptions()) };
}
