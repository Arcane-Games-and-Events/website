import { adminCounts, orderAnalytics, ticketStatsByEvent } from '$lib/server/admin/dashboard.js';
import {
	attention,
	memberFigures,
	newStoreEvents,
	nextEvents,
	recentOrders
} from '$lib/server/admin/home.js';
import { monthlyLedger } from '$lib/server/admin/revenue.js';
import { cachedMessageCounts } from '$lib/server/contact/inbox.js';
import { readyPayoutCount } from '$lib/server/stores/payouts.js';
import { expiringComps } from '$lib/server/admin/comps.js';

const safe = (promise, fallback) =>
	promise.catch((err) => {
		console.error('Admin home:', err);
		return fallback;
	});

export async function load({ locals }) {
	const [
		counts,
		revenue,
		members,
		needs,
		events,
		orders,
		ticketStats,
		ledger,
		contact,
		storePay,
		storeEvents,
		compsEnding
	] = await Promise.all([
		safe(adminCounts(), null),
		safe(orderAnalytics(), null),
		safe(memberFigures(), null),
		safe(attention(), null),
		safe(nextEvents(5), []),
		safe(recentOrders(5), []),
		safe(ticketStatsByEvent(), {}),
		safe(monthlyLedger({ months: 12 }), null),
		cachedMessageCounts(locals.user),
		safe(readyPayoutCount(), 0),
		safe(newStoreEvents(), []),
		safe(expiringComps({ days: 14 }), [])
	]);

	return {
		firstName: locals.user?.firstName || '',
		counts,
		revenue,
		// The ledger (migration 022) is the real figure; orders are the fallback.
		ledger: ledger?.available ? ledger.figures : null,
		months: ledger?.available
			? ledger.months.map((m) => ({ month: m.month, label: m.label, net: m.net }))
			: [],
		share: ledger?.available ? ledger.share : null,
		members,
		needs: needs
			? {
					...needs,
					inboxUnread: contact.inbox,
					storePayouts: storePay,
					compsEnding: compsEnding.length
				}
			: null,
		events: events.map((e) => ({
			...e,
			players: ticketStats[e.id]?.sold ?? 0,
			revenue: ticketStats[e.id]?.revenue ?? 0
		})),
		storeEvents: storeEvents.map((e) => ({
			...e,
			players: ticketStats[e.id]?.sold ?? 0,
			revenue: ticketStats[e.id]?.revenue ?? 0
		})),
		now: Date.now(),
		orders
	};
}
