import { ageCalendar } from '$lib/server/stores/portal.js';
import { wallClockNow } from '$lib/server/dates.js';

/**
 * /store/[slug]/calendar — every scheduled AGE Open, all circuits, a month
 * at a time (?month=2026-12), so a store can see what's on before it picks
 * a date. The grid runs Sunday to Saturday around the month.
 */
export async function load({ parent, url }) {
	const { where } = await parent();
	const now = wallClockNow(where.circuit.timezone);
	const m = /^(\d{4})-(\d{2})$/.exec(url.searchParams.get('month') || '');
	const year = m ? Number(m[1]) : now.getUTCFullYear();
	const month = m ? Math.min(11, Math.max(0, Number(m[2]) - 1)) : now.getUTCMonth();

	const first = new Date(Date.UTC(year, month, 1));
	const start = new Date(first);
	start.setUTCDate(1 - first.getUTCDay());
	const last = new Date(Date.UTC(year, month + 1, 0));
	const end = new Date(last);
	end.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()) + 1);

	return {
		year,
		month,
		start: start.getTime(),
		end: end.getTime(),
		now: now.getTime(),
		events: await ageCalendar(start, end)
	};
}
