import { redirect } from '@sveltejs/kit';
import { editorOptions } from '$lib/server/studio/editor.js';

// Bonus matches are made in the Desk (/desk/matches); the Studio makes the rest.
const KINDS = ['podcast', 'interview', 'video'];

/** /studio/media/new?kind=…&show=… — a new item. */
export async function load({ url }) {
	const asked = url.searchParams.get('kind');
	if (asked === 'gameplay') throw redirect(302, '/desk/matches/new');
	return {
		item: null,
		kind: KINDS.includes(asked) ? asked : 'podcast',
		kinds: KINDS,
		showId: url.searchParams.get('show') || null,
		...(await editorOptions())
	};
}
