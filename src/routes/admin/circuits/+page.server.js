import { fail } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import {
	missingStores,
	parseShare,
	saveProgram,
	storesOverview
} from '$lib/server/stores/admin.js';

/** /admin/circuits — every circuit and its stores, and the program settings. */
export async function load() {
	try {
		return { ready: true, ...(await storesOverview()) };
	} catch (err) {
		if (missingStores(err)) return { ready: false };
		throw err;
	}
}

export const actions = {
	program: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const defaultShare = parseShare(form.get('defaultShare'));
		if (defaultShare === undefined) {
			return fail(400, { error: 'The default share is a percentage from 0 to 100.' });
		}
		const res = await saveProgram(
			{ defaultShare, feePayer: String(form.get('feePayer') || '') },
			locals.user.id
		);
		if (res.error) return fail(400, { error: res.error });
		return { saved: 'Program settings saved.' };
	}
};
