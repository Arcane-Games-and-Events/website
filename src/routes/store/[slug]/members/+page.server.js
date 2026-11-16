import { pickedFrom } from '$lib/server/stores/admin.js';
import { fail } from '@sveltejs/kit';
import {
	ownerAddMember,
	ownerRemove,
	ownerSetRole,
	storeAccess,
	storeMembers
} from '$lib/server/stores/portal.js';

/** /store/[slug]/members — who runs the store. Owners manage the list. */
export async function load({ parent }) {
	const { where } = await parent();
	return { members: await storeMembers(where.store.id) };
}

const act =
	(fn) =>
	async ({ request, locals, params }) => {
		const where = await storeAccess(locals.user, params.slug);
		if (!where) return fail(404, { error: 'Store not found.' });
		const res = await fn({ where, form: await request.formData(), actorId: locals.user.id });
		if (res?.error) return fail(400, { error: res.error });
		return res;
	};

export const actions = {
	add: act(async ({ where, form, actorId }) => {
		const res = await ownerAddMember(
			where,
			pickedFrom(form),
			String(form.get('role') || 'manager'),
			actorId
		);
		if (res.error) return res;
		return { saved: res.changed ? `${res.name}’s role changed.` : `${res.name} added.` };
	}),
	setRole: act(async ({ where, form, actorId }) => {
		const res = await ownerSetRole(
			where,
			String(form.get('userId')),
			String(form.get('role')),
			actorId
		);
		return res.error ? res : { saved: 'Role changed.' };
	}),
	remove: act(async ({ where, form, actorId }) => {
		const res = await ownerRemove(where, String(form.get('userId')), actorId);
		return res.error ? res : { saved: 'Removed from the store.' };
	})
};
