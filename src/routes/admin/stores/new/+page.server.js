import { fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { listCircuits } from '$lib/server/stores/circuits.js';
import { createStore, getProgram, storeForm } from '$lib/server/stores/admin.js';

/** /admin/stores/new — a new store, with its first owner. */
export async function load({ url }) {
	const [circuits, program] = await Promise.all([listCircuits({ inactive: true }), getProgram()]);
	const pre = circuits.find((c) => c.slug === url.searchParams.get('circuit'));
	return { circuits, program, circuitId: pre?.id || null };
}

export const actions = {
	default: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const value = Object.fromEntries(form);
		const { values, error } = storeForm(form);
		if (error) return fail(400, { error, value });
		const res = await createStore(values, {
			ownerId: String(form.get('userId') || ''),
			ownerEmail: String(form.get('ownerEmail') || '').trim(),
			actorId: locals.user.id
		});
		if (res.error) return fail(400, { error: res.error, value });
		throw redirect(303, `/admin/stores/${res.store.slug}?created=1`);
	}
};
