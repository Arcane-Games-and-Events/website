import { editorOptions } from '$lib/server/studio/editor.js';

const KINDS = ['gameplay', 'podcast', 'interview', 'video'];

/** /studio/media/new?kind=…&show=… — a new item. */
export async function load({ url }) {
	const asked = url.searchParams.get('kind');
	return {
		item: null,
		kind: KINDS.includes(asked) ? asked : 'gameplay',
		showId: url.searchParams.get('show') || null,
		...(await editorOptions())
	};
}
