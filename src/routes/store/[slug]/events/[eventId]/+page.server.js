import { pickedFrom } from '$lib/server/stores/admin.js';
import { error, fail } from '@sveltejs/kit';
import { wallClockNow } from '$lib/server/dates.js';
import {
	FORMATS,
	addEventStaff,
	ageCalendar,
	cancelStoreEvent,
	eventForm,
	eventRoster,
	removeEventStaff,
	setGemEntry,
	storeAccess,
	storeEvent,
	updateStoreEvent
} from '$lib/server/stores/portal.js';

/**
 * /store/[slug]/events/[eventId] — one event: who's signed up and
 * event-day check-in, staff, details and cancelling.
 */
export async function load({ parent, params }) {
	const { where } = await parent();
	const ev = await storeEvent(where.store.id, params.eventId);
	if (!ev) throw error(404, 'Event not found');
	const now = wallClockNow(where.circuit.timezone);
	const [roster, nearby] = await Promise.all([
		eventRoster(ev.id),
		// Other AGE Opens in the year ahead, dotted on the date picker.
		ageCalendar(new Date(now.getTime() - 7 * 86400000), new Date(now.getTime() + 400 * 86400000))
	]);
	return {
		ev,
		roster,
		nearby: nearby.filter((e) => e.id !== ev.id),
		formats: FORMATS,
		now: now.getTime()
	};
}

/** Each action: the store from the URL, checked against who's asking. */
const act =
	(section, fn) =>
	async ({ request, locals, params }) => {
		const where = await storeAccess(locals.user, params.slug);
		if (!where) return fail(404, { section, error: 'Store not found.' });
		const form = await request.formData();
		const res = await fn({ where, form, eventId: params.eventId, actorId: locals.user.id });
		if (res?.error) return fail(400, { section, error: res.error });
		return { section, ...res };
	};

export const actions = {
	update: act('details', async ({ where, form, eventId, actorId }) => {
		const { values, error: invalid } = eventForm(form, where);
		if (invalid) return { error: invalid };
		const res = await updateStoreEvent(where, eventId, values, actorId);
		if (res.error) return res;
		return {
			saved: res.priceKept
				? 'Saved. Tickets have sold, so the entry fee stayed as it was.'
				: 'Event saved.'
		};
	}),

	addStaff: act('staff', async ({ where, form, eventId, actorId }) => {
		const res = await addEventStaff(where, eventId, pickedFrom(form), actorId);
		return res.error ? res : { saved: `${res.name} is on staff.` };
	}),

	removeStaff: act('staff', async ({ where, form, eventId, actorId }) => {
		const res = await removeEventStaff(where, eventId, String(form.get('userId')), actorId);
		return res.error ? res : { saved: 'Taken off staff.' };
	}),

	// Event day: a player entered into GEM (or not).
	gem: act('gem', async ({ where, form, eventId }) =>
		setGemEntry(where, eventId, String(form.get('ticketId')), form.get('entered') === 'true')
	),

	cancel: act('cancel', async ({ where, eventId, actorId }) => {
		const res = await cancelStoreEvent(where, eventId, actorId);
		return res.error ? res : { saved: 'Event cancelled.' };
	})
};
