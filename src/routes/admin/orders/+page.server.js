import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { bump } from '$lib/server/cache/index.js';
import {
	adminCounts,
	listOrders,
	listUsers,
	orderAnalytics,
	ticketStatsByEvent
} from '$lib/server/admin/dashboard.js';
import { order, user, ticket, entitlement } from '$lib/server/db/schema.js';
import { eq, sql, or, ilike } from 'drizzle-orm';

const EMPTY = {
	allOrders: [],
	allUsers: [],
	revenueStats: { today: 0, week: 0, month: 0, allTime: 0, byType: [] },
	refundStats: { refundedTickets: 0, totalTicketOrders: 0 },
	stats: { totalEvents: 0, totalOrders: 0, premiumUsers: 0, totalPlayers: 0, totalUsers: 0 }
};

export async function load({ locals }) {
	try {
		const [allOrders, allUsers, revenueStats, counts, ticketStats] = await Promise.all([
			listOrders(),
			listUsers(),
			orderAnalytics(),
			adminCounts(),
			ticketStatsByEvent()
		]);

		// Ticket orders show the ticket's refund state.
		const ticketOrderIds = allOrders
			.filter((o) => o.meta?.type === 'ticket' && o.meta?.ticketId)
			.map((o) => o.meta.ticketId);

		const ticketRefundMap = new Map();
		if (ticketOrderIds.length > 0) {
			const ticketStatuses = await db
				.select({ id: ticket.id, refunded: ticket.refunded })
				.from(ticket)
				.where(sql`${ticket.id} IN ${ticketOrderIds}`);
			ticketStatuses.forEach((t) => ticketRefundMap.set(t.id, t.refunded));
		}

		const enrichedOrders = allOrders.map((o) => {
			let status = 'completed';
			if (o.meta?.type === 'ticket' && o.meta?.ticketId) {
				status = ticketRefundMap.get(o.meta.ticketId) ? 'refunded' : 'completed';
			} else if (o.meta?.type === 'subscription') {
				status = 'active';
			}
			return { ...o, status };
		});

		const refundStats = {
			refundedTickets: Object.values(ticketStats).reduce((sum, t) => sum + t.refunded, 0),
			totalTicketOrders: revenueStats.byType.find((r) => r.type === 'ticket')?.count || 0
		};

		return {
			user: locals.user,
			allOrders: enrichedOrders,
			allUsers,
			revenueStats,
			refundStats,
			stats: {
				totalEvents: counts.totalEvents,
				totalOrders: counts.totalOrders,
				premiumUsers: counts.premiumUsers,
				totalPlayers: counts.totalPlayers,
				totalUsers: counts.totalUsers
			}
		};
	} catch (error) {
		console.error('Admin orders page load error:', error);
		return { user: locals.user, ...EMPTY };
	}
}

export const actions = {
	// Server-side search for orders
	searchOrders: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const query = formData.get('query')?.toString().trim();

		if (!query || query.length < 2) {
			return fail(400, { error: 'Search query must be at least 2 characters' });
		}

		try {
			const searchPattern = `%${query}%`;
			const results = await db
				.select()
				.from(order)
				.where(
					or(ilike(order.userEmail, searchPattern), sql`${order.id}::text ILIKE ${searchPattern}`)
				)
				.orderBy(order.createdAt)
				.limit(100);

			return {
				success: true,
				searchType: 'orders',
				results
			};
		} catch (err) {
			console.error('Error searching orders:', err);
			return fail(500, { error: 'Failed to search orders' });
		}
	}
};
