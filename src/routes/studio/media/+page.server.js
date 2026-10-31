import { redirect } from '@sveltejs/kit';
import { listItems, stageOf } from '$lib/server/studio/list.js';

/** /studio/media — every Studio item, filtered in the page by kind, stage and search. */
export async function load({ url, depends }) {
	// The old Desk gameplay address with ?view=analytics lands here; send it on.
	if (url.searchParams.get('view') === 'analytics') throw redirect(301, '/studio/analytics');
	depends('studio:media');
	const items = (await listItems()).map((i) => ({ ...i, stage: stageOf(i) }));
	return { items };
}
