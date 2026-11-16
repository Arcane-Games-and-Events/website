import { storeEvents } from '$lib/server/stores/portal.js';
import { wallClockNow } from '$lib/server/dates.js';

/** /store/[slug]/events — every event the store runs, ahead and played. */
export async function load({ parent }) {
	const { where } = await parent();
	return {
		events: await storeEvents(where.store.id),
		now: wallClockNow(where.circuit.timezone).getTime()
	};
}
