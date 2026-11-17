import { redirect } from '@sveltejs/kit';
import { listItems, stageOf } from '$lib/server/studio/list.js';

/** /studio/media — the Studio's items (not bonus matches), filtered by kind, stage and search. */
export async function load({ url, depends }) {
	// The old Desk gameplay address with ?view=analytics lands here; send it on.
	if (url.searchParams.get('view') === 'analytics') throw redirect(301, '/studio/analytics');
	depends('studio:media');
	// Bonus matches live in the Desk (/desk/matches).
	const items = (await listItems())
		.filter((i) => i.kind !== 'gameplay')
		.map((i) => ({ ...i, stage: stageOf(i) }));
	return { items };
}
