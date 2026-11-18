import { fail } from '@sveltejs/kit';
import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';
import {
	addUpdate,
	componentHistory,
	createIncident,
	deleteIncident,
	incidents,
	overall,
	runChecks,
	setBanner
} from '$lib/server/status/index.js';

/** /admin/status — the checks, and posting incidents and maintenance. */
export async function load() {
	try {
		const [components, inc] = await Promise.all([componentHistory(), incidents({ pastDays: 60 })]);
		return { ready: true, components, ...inc, overall: overall(components, inc.active) };
	} catch (err) {
		if (!isMissingTable(err)) throw err;
		return { ready: false, components: [], active: [], scheduled: [], past: [], overall: 'ok' };
	}
}

const pick = async (request) => {
	const f = await request.formData();
	return {
		kind: String(f.get('kind') || ''),
		title: String(f.get('title') || ''),
		impact: String(f.get('impact') || ''),
		status: String(f.get('status') || ''),
		body: String(f.get('body') || ''),
		components: f.getAll('components').map(String),
		startsAt: String(f.get('startsAt') || ''),
		endsAt: String(f.get('endsAt') || ''),
		banner: f.get('banner') === 'on',
		id: String(f.get('id') || '')
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const form = await pick(request);
		const r = await createIncident(form, locals.user.id);
		if (r.error) return fail(400, { section: 'new', error: r.error });
		return {
			section: 'new',
			saved: form.kind === 'maintenance' ? 'Maintenance posted.' : 'Incident posted.'
		};
	},
	update: async ({ request, locals }) => {
		const form = await pick(request);
		const r = await addUpdate(form.id, form, locals.user.id);
		if (r.error) return fail(400, { section: form.id, error: r.error });
		return { section: form.id, saved: 'Update posted.' };
	},
	banner: async ({ request }) => {
		const f = await request.formData();
		await setBanner(String(f.get('id')), f.get('on') === '1');
		return {
			section: String(f.get('id')),
			saved: f.get('on') === '1' ? 'Banner on.' : 'Banner off.'
		};
	},
	remove: async ({ request }) => {
		const f = await request.formData();
		await deleteIncident(String(f.get('id')));
		return { saved: 'Deleted.' };
	},
	run: async () => {
		await runChecks();
		return { saved: 'Checked just now.' };
	}
};
