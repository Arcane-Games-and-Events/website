import { adminCounts, orderAnalytics, ticketStatsByEvent } from '$lib/server/admin/dashboard.js';
import { attention, memberFigures, nextEvents, recentOrders } from '$lib/server/admin/home.js';
import { monthlyLedger } from '$lib/server/admin/revenue.js';

const safe = (promise, fallback) =>
	promise.catch((err) => {
		console.error('Admin home:', err);
		return fallback;
	});

export async function load({ locals }) {
	const [counts, revenue, members, needs, events, orders, ticketStats, ledger] = await Promise.all([
		safe(adminCounts(), null),
		safe(orderAnalytics(), null),
		safe(memberFigures(), null),
		safe(attention(), null),
		safe(nextEvents(5), []),
		safe(recentOrders(5), []),
		safe(ticketStatsByEvent(), {}),
		safe(monthlyLedger({ months: 2 }), null)
	]);

	return {
		firstName: locals.user?.firstName || '',
		counts,
		revenue,
		// The ledger (migration 022) is the real figure; orders are the fallback.
		ledger: ledger?.available ? ledger.figures : null,
		members,
		needs,
		events: events.map((e) => ({ ...e, sold: ticketStats[e.id]?.sold ?? 0 })),
		orders
	};
}
