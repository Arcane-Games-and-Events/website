import { fail } from '@sveltejs/kit';
import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';
import {
	createItem,
	deleteItem,
	moveItem,
	nudgeItem,
	roadmap,
	updateItem
} from '$lib/server/roadmap.js';

/** /admin/roadmap — add, edit, order and move the items on /roadmap. */
export async function load() {
	try {
		return { ready: true, roadmap: await roadmap({ hidden: true }) };
	} catch (err) {
		if (!isMissingTable(err)) throw err;
		return { ready: false, roadmap: { now: [], next: [], later: [], shipped: [] } };
	}
}

const fields = (f) => ({
	title: String(f.get('title') || ''),
	body: String(f.get('body') || ''),
	stage: String(f.get('stage') || ''),
	area: String(f.get('area') || ''),
	isPublic: f.get('isPublic') === 'on'
});

export const actions = {
	create: async ({ request, locals }) => {
		const r = await createItem(fields(await request.formData()), locals.user.id);
		if (r.error) return fail(400, { section: 'new', error: r.error });
		return { saved: 'Added.' };
	},
	update: async ({ request }) => {
		const f = await request.formData();
		const id = String(f.get('id'));
		const r = await updateItem(id, fields(f));
		if (r.error) return fail(400, { section: id, error: r.error });
		return { saved: 'Saved.' };
	},
	move: async ({ request }) => {
		const f = await request.formData();
		const r = await moveItem(String(f.get('id')), String(f.get('stage')));
		if (r.error) return fail(400, { error: r.error });
		return {};
	},
	nudge: async ({ request }) => {
		const f = await request.formData();
		await nudgeItem(String(f.get('id')), Number(f.get('dir')) < 0 ? -1 : 1);
		return {};
	},
	remove: async ({ request }) => {
		const f = await request.formData();
		await deleteItem(String(f.get('id')));
		return { saved: 'Deleted.' };
	}
};
