import { fail } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { missingStores, storesOverview } from '$lib/server/stores/admin.js';
import { parseFee, saveFee } from '$lib/server/stores/payouts.js';

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
	// The card fee taken from every store's ticket sales (migration 050).
	program: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const fee = parseFee(form.get('feePct'), form.get('feeFixed'));
		if ('error' in fee) return fail(400, { error: fee.error });
		await saveFee(fee, locals.user.id);
		return { saved: 'Card fee saved. New ticket sales use it; earlier ones keep theirs.' };
	}
};
