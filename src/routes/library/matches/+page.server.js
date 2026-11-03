import { archivePage } from '$lib/server/studio/archivePage.js';
import { counts } from '$lib/server/library/page.js';

/** /library/matches — every match from the Studio: search, filters, pages. */
export async function load(event) {
	const [page, drawers] = await Promise.all([archivePage(event, 'gameplay'), counts()]);
	return { ...page, drawers };
}
