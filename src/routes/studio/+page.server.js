import { studioHome } from '$lib/server/studio/list.js';

/** /studio — the production board. */
export async function load({ depends }) {
	depends('studio:media');
	return { home: await studioHome() };
}
