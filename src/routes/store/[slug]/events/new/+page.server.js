import { error, fail, redirect } from '@sveltejs/kit';
import {
	FORMATS,
	ageCalendar,
	createStoreEvent,
	storeEvents,
	eventForm,
	storeAccess
} from '$lib/server/stores/portal.js';
import { wallClockNow } from '$lib/server/dates.js';

/**
 * /store/[slug]/events/new — schedule an Open. ?date=YYYY-MM-DD (from the
 * calendar or the season track) fills in the day, at 11 AM. Every AGE Open
 * in the next year comes along so the form can show what's nearby.
 */
export async function load({ parent, url }) {
	const { where } = await parent();
	if (!where.store.active) throw error(403, 'This store is inactive, so it can’t add events.');
	const now = wallClockNow(where.circuit.timezone);
	const asked = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '')
		? `${url.searchParams.get('date')}T11:00`
		: '';
	const [soon, mine] = await Promise.all([
		ageCalendar(new Date(now.getTime() - 7 * 86400000), new Date(now.getTime() + 400 * 86400000)),
		storeEvents(where.store.id)
	]);
	// Most stores run the same setup each month: start from the last one.
	const last = mine.find((e) => e.status !== 'cancelled') || null;
	return {
		formats: FORMATS,
		date: asked,
		nearby: soon,
		now: now.getTime(),
		usual: last ? { price: last.price, playerCap: last.playerCap, format: last.format } : null
	};
}

export const actions = {
	default: async ({ request, locals, params }) => {
		const where = await storeAccess(locals.user, params.slug);
		if (!where) return fail(404, { error: 'Store not found.' });
		const form = await request.formData();
		const value = Object.fromEntries(form);
		const { values, error: invalid } = eventForm(form, where);
		if (invalid) return fail(400, { error: invalid, value });
		const res = await createStoreEvent(where, values, locals.user.id);
		if (res.error) return fail(400, { error: res.error, value });
		throw redirect(303, `/store/${where.store.slug}/events/${res.id}?created=1`);
	}
};
