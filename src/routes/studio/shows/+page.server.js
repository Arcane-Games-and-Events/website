import { listShows } from '$lib/server/studio/shows.js';

/** /studio/shows — podcasts and interview series. */
export async function load({ depends }) {
	depends('studio:shows');
	return { shows: await listShows() };
}
