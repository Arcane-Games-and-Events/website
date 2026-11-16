import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import {
	circuitDetail,
	circuitForm,
	deleteCircuit,
	removeCircuitImage,
	setCircuitActive,
	setCircuitImage,
	updateCircuit
} from '$lib/server/stores/admin.js';

/** /admin/circuits/[slug] — edit one circuit and its picture; lists its stores. */
export async function load({ params }) {
	const detail = await circuitDetail(params.slug);
	if (!detail) throw error(404, 'Circuit not found');
	return detail;
}

/** Admins only, with the circuit from the URL. */
const act =
	(fn) =>
	async ({ request, locals, params }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: 'Admins only.' });
		const detail = await circuitDetail(params.slug);
		if (!detail) return fail(404, { error: 'That circuit no longer exists.' });
		const res = await fn(detail.circuit, await request.formData());
		if (res?.error) return fail(400, { error: res.error, section: res.section });
		return res;
	};

export const actions = {
	save: act(async (c, form) => {
		const { values, error: invalid } = circuitForm(form);
		if (invalid) return { error: invalid };
		const res = await updateCircuit(c.id, values);
		if (res.error) return res;
		throw redirect(303, '/admin/circuits');
	}),

	image: act(async (c, form) => {
		const res = await setCircuitImage(c.id, /** @type {File} */ (form.get('image')));
		return res.error ? res : { saved: 'Picture uploaded. It’s on the AGE Open pages now.' };
	}),

	// Active / inactive: only from the danger zone, after the page's own
	// confirmation step (sent as confirmed=yes) and the browser's.
	active: act(async (c, form) => {
		const res = await setCircuitActive(c.id, form.get('active') === 'true', {
			confirmed: form.get('confirmed') === 'yes'
		});
		if (res.error) return { ...res, section: 'delete' };
		return {
			saved: res.active
				? `${res.name} is active again and back on the AGE Open.`
				: `${res.name} is inactive. It’s off the AGE Open’s circuit lists; its history is kept.`
		};
	}),

	// Deleting needs the circuit's exact name typed and a box ticked; the
	// rules (empty circuits only) are checked again in deleteCircuit.
	delete: act(async (c, form) => {
		const res = await deleteCircuit(c.id, {
			typed: String(form.get('confirmName') || ''),
			understood: form.get('understood') === 'on'
		});
		if (res.error) return { ...res, section: 'delete' };
		throw redirect(303, `/admin/circuits?deleted=${encodeURIComponent(res.name)}`);
	}),

	removeImage: act(async (c) => {
		const res = await removeCircuitImage(c.id);
		return res.error ? res : { saved: 'Picture removed.' };
	})
};
