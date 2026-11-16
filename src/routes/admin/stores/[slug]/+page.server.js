import { error, fail } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { listCircuits } from '$lib/server/stores/circuits.js';
import { seasonDashboard, storeEvents } from '$lib/server/stores/portal.js';
import { wallClockNow } from '$lib/server/dates.js';
import {
	addMember,
	pickedFrom,
	linkEvents,
	removeMember,
	setMemberRole,
	storeDetail,
	storeForm,
	unlinkEvent,
	updateStore
} from '$lib/server/stores/admin.js';

/** /admin/stores/[slug] — one store: members, events, payouts, details, activity. */
export async function load({ params }) {
	const [detail, circuits] = await Promise.all([
		storeDetail(params.slug),
		listCircuits({ inactive: true })
	]);
	if (!detail) throw error(404, 'Store not found');
	// The same season view the store sees, and its events as ticket strips.
	const where = { store: detail.store, circuit: detail.circuit };
	const [season, rows] = await Promise.all([seasonDashboard(where), storeEvents(detail.store.id)]);
	return {
		...detail,
		circuits,
		season,
		rows,
		now: wallClockNow(detail.circuit.timezone).getTime()
	};
}

/**
 * Wrap an action: admins only, the store looked up from the URL, and a
 * failure returned as { error } with the section it belongs to.
 */
const act = (section, fn) => async (event) => {
	const { locals, params, request } = event;
	if (!isAdmin(locals.user)) return fail(403, { section, error: 'Admins only.' });
	const detail = await storeDetail(params.slug);
	if (!detail) return fail(404, { section, error: 'That store no longer exists.' });
	const form = await request.formData();
	const res = await fn({ store: detail.store, form, actorId: locals.user.id });
	if (res?.error) return fail(400, { section, error: res.error });
	return { section, ...res };
};

export const actions = {
	update: act('details', async ({ store, form, actorId }) => {
		const { values, error: invalid } = storeForm(form);
		if (invalid) return { error: invalid };
		await updateStore(store.id, values, actorId);
		return { saved: 'Store details saved.' };
	}),

	addMember: act('members', async ({ store, form, actorId }) => {
		const res = await addMember(
			store.id,
			pickedFrom(form),
			String(form.get('role') || 'manager'),
			actorId
		);
		if (res.error) return res;
		return { saved: res.changed ? `${res.name}’s role changed.` : `${res.name} added.` };
	}),

	setRole: act('members', async ({ store, form, actorId }) => {
		const res = await setMemberRole(
			store.id,
			String(form.get('userId')),
			String(form.get('role')),
			actorId
		);
		return res.error ? res : { saved: 'Role changed.' };
	}),

	removeMember: act('members', async ({ store, form, actorId }) => {
		const res = await removeMember(store.id, String(form.get('userId')), actorId);
		return res.error ? res : { saved: 'Removed from the store.' };
	}),

	linkEvents: act('events', async ({ store, form, actorId }) => {
		const res = await linkEvents(store.id, form.getAll('eventId').map(String), actorId);
		if (res.error) return res;
		return { saved: `${res.count} ${res.count === 1 ? 'event' : 'events'} linked to this store.` };
	}),

	unlinkEvent: act('events', async ({ store, form, actorId }) => {
		const res = await unlinkEvent(store.id, String(form.get('eventId')), actorId);
		return res.error ? res : { saved: 'Event unlinked. AGE runs it now.' };
	})
};
