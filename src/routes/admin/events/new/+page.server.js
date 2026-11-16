import { redirect, fail } from '@sveltejs/kit';
import { asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '$lib/server/db/index.js';
import { bump } from '$lib/server/cache/index.js';
import { event, store } from '$lib/server/db/schema.js';
import { isAdmin } from '$lib/server/auth/roles.js';
import { parseDatetimeLocal, wallClockNow } from '$lib/server/dates.js';
import { eventPeriod } from '$lib/server/standings/rebuild.js';
import { listCircuits } from '$lib/server/stores/circuits.js';
import { FORMATS, ageCalendar } from '$lib/server/stores/portal.js';
import { logStoreActivity } from '$lib/server/stores/admin.js';

/**
 * /admin/events/new — an AGE Open event on any circuit, run by AGE or by
 * one of the circuit's stores. ?circuit=<slug> and ?store=<slug> pick them
 * up front. The month follows the date (standings file under it).
 */
export async function load({ url }) {
	const now = wallClockNow('America/Chicago');
	const [circuits, stores, nearby] = await Promise.all([
		listCircuits({ inactive: true }),
		db
			.select({
				id: store.id,
				name: store.name,
				slug: store.slug,
				circuitId: store.circuitId,
				active: store.active,
				address: store.address,
				city: store.city,
				state: store.state
			})
			.from(store)
			.orderBy(asc(store.name))
			.catch(() => []),
		ageCalendar(
			new Date(now.getTime() - 7 * 86400000),
			new Date(now.getTime() + 400 * 86400000)
		).catch(() => [])
	]);
	const pickStore = stores.find((s) => s.slug === url.searchParams.get('store'));
	const pickCircuit =
		circuits.find((c) => c.id === pickStore?.circuitId) ||
		circuits.find((c) => c.slug === url.searchParams.get('circuit')) ||
		null;
	return {
		circuits,
		stores,
		nearby,
		formats: FORMATS,
		now: now.getTime(),
		pick: { circuit: pickCircuit?.name || '', store: pickStore?.id || '' }
	};
}

export const actions = {
	default: async ({ locals, request }) => {
		if (!isAdmin(locals.user)) return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const value = Object.fromEntries(form);
		const text = (k) => String(form.get(k) ?? '').trim();

		const title = text('title');
		const location = text('location');
		const format = text('format');
		const circuit = text('circuit');
		const eventDate = parseDatetimeLocal(text('eventDate'));
		if (!title || !location || !format || !eventDate || Number.isNaN(eventDate.getTime())) {
			return fail(400, { error: 'Fill in the title, venue, format, date and start time.', value });
		}
		if (!circuit) return fail(400, { error: 'Pick the circuit.', value });
		const priceNum = Number(text('price'));
		if (text('price') === '' || !Number.isFinite(priceNum) || priceNum < 0) {
			return fail(400, { error: 'The entry fee is a dollar amount, 0 or more.', value });
		}
		const capRaw = text('playerCap');
		const playerCap = capRaw ? Number(capRaw) : null;
		if (playerCap != null && (!Number.isInteger(playerCap) || playerCap < 1)) {
			return fail(400, { error: 'The player cap is a whole number, or no cap.', value });
		}

		// A store, if one runs it: it has to be on the event's circuit.
		let storeId = text('storeId') || null;
		if (storeId) {
			const circuits = await listCircuits({ inactive: true });
			const c = circuits.find((x) => x.name === circuit);
			const [s] = await db
				.select({ id: store.id, circuitId: store.circuitId })
				.from(store)
				.where(sql`${store.id} = ${storeId}`)
				.limit(1);
			if (!s || !c || s.circuitId !== c.id) {
				return fail(400, { error: 'That store isn’t on the chosen circuit.', value });
			}
		}

		const eventId = nanoid(10);
		await db.insert(event).values({
			id: eventId,
			title,
			location,
			address: text('address') || null,
			price: priceNum.toFixed(2),
			format,
			circuit,
			month: eventPeriod(eventDate).monthName,
			eventDate,
			description: text('description') || null,
			gemIdRequired: form.get('gemIdRequired') === 'on',
			premiumDiscount: form.get('premiumDiscount') === 'on',
			playerCap,
			storeId,
			createdBy: locals.user.id
		});
		if (storeId) {
			await logStoreActivity(storeId, locals.user.id, 'event_created', {
				eventId,
				note: `${title} (by AGE)`
			});
		}
		await bump('events');
		throw redirect(303, `/admin/events/${eventId}`);
	}
};
