import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

// Helper to add timeout to promises
const withTimeout = (promise, ms, fallback) =>
	Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

function getEmptyEventsData() {
	return {
		events: [],
		eventAnalytics: {
			totalEvents: 0,
			upcomingEvents: 0,
			pastEvents: 0,
			eventsNoDate: 0,
			totalTicketsSold: 0,
			totalTicketRevenue: 0,
			avgTicketPrice: 0,
			byCircuit: [],
			byFormat: [],
			byStatus: { upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 },
			upcomingEventsList: [],
			topEventsByTickets: [],
			topEventsByRevenue: [],
			recentCompletedEvents: [],
			ticketsByEvent: {}
		},
		dbError: true
	};
}

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	try {
		// Single RPC call with 15s timeout
		const result = await withTimeout(
			db.execute(sql`SELECT get_admin_dashboard_stats() as data`),
			15000,
			null
		);

		if (!result) {
			console.warn('Admin events RPC timed out - returning empty data');
			return getEmptyEventsData();
		}

		const data = result.rows?.[0]?.data || result[0]?.data;

		if (!data) {
			throw new Error('No data returned from get_admin_dashboard_stats()');
		}

		// Parse the RPC result
		const currentDate = new Date();
		const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

		// Extract events and transform snake_case to camelCase
		const rawEvents = data.events || [];
		const events = rawEvents.map((e) => ({
			id: e.id,
			title: e.title,
			location: e.location,
			address: e.address,
			price: e.price,
			format: e.format,
			circuit: e.circuit,
			month: e.month,
			eventDate: e.event_date,
			description: e.description,
			gemIdRequired: e.gem_id_required,
			premiumDiscount: e.premium_discount,
			status: e.status,
			closedAt: e.closed_at,
			closedBy: e.closed_by,
			createdBy: e.created_by,
			createdAt: e.created_at
		}));

		const ticketStatsList = data.ticketStats || [];

		// Convert ticket stats to Map for fast lookup
		const ticketsByEvent = new Map();
		for (const t of ticketStatsList) {
			ticketsByEvent.set(t.eventId, {
				sold: Number(t.sold) || 0,
				refunded: Number(t.refunded) || 0,
				revenue: parseFloat(t.revenue) || 0
			});
		}

		// Compute event analytics from events
		let upcomingEvents = 0;
		let pastEvents = 0;
		let eventsNoDate = 0;
		let totalTicketsSold = 0;
		let totalTicketRevenue = 0;
		const eventsByCircuit = {};
		const eventsByFormat = {};
		const eventsByStatus = { upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 };
		const upcomingEventsList = [];

		for (const e of events) {
			const status = e.status || 'upcoming';
			eventsByStatus[status] = (eventsByStatus[status] || 0) + 1;

			if (e.eventDate) {
				const eventDate = new Date(e.eventDate);
				if (eventDate > currentDate) {
					upcomingEvents++;
					if (eventDate <= thirtyDaysFromNow) {
						upcomingEventsList.push(e);
					}
				} else {
					pastEvents++;
				}
			} else {
				eventsNoDate++;
			}

			const circuit = e.circuit || 'Unassigned';
			eventsByCircuit[circuit] = (eventsByCircuit[circuit] || 0) + 1;

			const format = e.format || 'Unknown';
			eventsByFormat[format] = (eventsByFormat[format] || 0) + 1;

			const ticketStats = ticketsByEvent.get(e.id);
			if (ticketStats) {
				totalTicketsSold += ticketStats.sold;
				totalTicketRevenue += ticketStats.revenue;
			}
		}

		upcomingEventsList.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

		// Top events by tickets/revenue
		const eventsWithTickets = events
			.map((e) => {
				const stats = ticketsByEvent.get(e.id) || { sold: 0, revenue: 0, refunded: 0 };
				return {
					id: e.id,
					title: e.title,
					circuit: e.circuit,
					eventDate: e.eventDate,
					status: e.status,
					ticketsSold: stats.sold,
					revenue: stats.revenue,
					refunded: stats.refunded
				};
			})
			.filter((e) => e.ticketsSold > 0);

		const topEventsByTickets = [...eventsWithTickets]
			.sort((a, b) => b.ticketsSold - a.ticketsSold)
			.slice(0, 5);

		const topEventsByRevenue = [...eventsWithTickets]
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 5);

		const recentCompletedEvents = events
			.filter(
				(e) => e.status === 'completed' || (e.eventDate && new Date(e.eventDate) < currentDate)
			)
			.slice(0, 5)
			.map((e) => {
				const stats = ticketsByEvent.get(e.id) || { sold: 0, revenue: 0 };
				return { ...e, ticketsSold: stats.sold, revenue: stats.revenue };
			});

		const eventAnalytics = {
			totalEvents: events.length,
			upcomingEvents,
			pastEvents,
			eventsNoDate,
			totalTicketsSold,
			totalTicketRevenue,
			avgTicketPrice: totalTicketsSold > 0 ? (totalTicketRevenue / totalTicketsSold).toFixed(2) : 0,
			byCircuit: Object.entries(eventsByCircuit).map(([name, count]) => ({ name, count })),
			byFormat: Object.entries(eventsByFormat).map(([name, count]) => ({ name, count })),
			byStatus: eventsByStatus,
			upcomingEventsList: upcomingEventsList.slice(0, 5),
			topEventsByTickets,
			topEventsByRevenue,
			recentCompletedEvents,
			ticketsByEvent: Object.fromEntries(ticketsByEvent)
		};

		return {
			events,
			eventAnalytics
		};
	} catch (error) {
		console.error('Failed to load admin events data:', error);
		return getEmptyEventsData();
	}
}
