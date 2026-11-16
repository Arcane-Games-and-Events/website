import { fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { circuitForm, createCircuit } from '$lib/server/stores/admin.js';

export const actions = {
	default: async ({ request, locals }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const { values, error } = circuitForm(form);
		if (error) return fail(400, { error, value: Object.fromEntries(form) });
		const res = await createCircuit(values);
		if (res.error) return fail(400, { error: res.error, value: Object.fromEntries(form) });
		throw redirect(303, '/admin/circuits');
	}
};
