import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	event,
	order,
	user,
	seasonStanding,
	ticket,
	entitlement
} from '$lib/server/db/schema.js';
import { desc, eq, count, sql, gte, and, lt } from 'drizzle-orm';

export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/analytics');
	}

	try {
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const yearStart = new Date(now.getFullYear(), 0, 1);

		// Run ALL queries in parallel for maximum performance
		const [
			// Revenue queries
			[todayRevenue],
			[weekRevenue],
			[monthRevenue],
			[lastMonthRevenue],
			[ytdRevenue],
			[allTimeRevenue],
			revenueByType,
			dailyRevenue,
			monthlyRevenue,
			// User queries
			[totalUsers],
			[newUsersMonth],
			[newUsersLastMonth],
			usersByRole,
			[activeSubscribers],
			subscriptionBreakdown,
			dailySignups,
			// Event queries
			[totalEvents],
			eventsByStatus,
			eventsByCircuit,
			eventsByFormat,
			[upcomingEvents],
			// Ticket queries
			[totalTickets],
			[ticketsThisMonth],
			[ticketsLastMonth],
			[refundedTickets],
			[ticketRevenue],
			ticketsByCircuitRaw,
			topSellingEventsRaw,
			// Course queries
			[totalEntitlements],
			entitlementsByProduct,
			// Customer/Player queries
			customerStats,
			[totalPlayers],
			playersByCircuit,
			topPlayers
		] = await Promise.all([
			// Revenue queries
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`, count: count() })
				.from(order)
				.where(gte(order.createdAt, todayStart)),
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`, count: count() })
				.from(order)
				.where(gte(order.createdAt, weekStart)),
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`, count: count() })
				.from(order)
				.where(gte(order.createdAt, monthStart)),
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`, count: count() })
				.from(order)
				.where(and(gte(order.createdAt, lastMonthStart), lt(order.createdAt, monthStart))),
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`, count: count() })
				.from(order)
				.where(gte(order.createdAt, yearStart)),
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`, count: count() })
				.from(order),
			db.select({
				type: sql`COALESCE(meta->>'type', 'unknown')`,
				total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
				count: count()
			})
				.from(order)
				.groupBy(sql`meta->>'type'`)
				.orderBy(desc(sql`SUM(CAST(amount AS DECIMAL))`)),
			db.select({
				date: sql`DATE(created_at)`,
				total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
				count: count()
			})
				.from(order)
				.where(gte(order.createdAt, thirtyDaysAgo))
				.groupBy(sql`DATE(created_at)`)
				.orderBy(sql`DATE(created_at)`),
			db.select({
				month: sql`TO_CHAR(created_at, 'YYYY-MM')`,
				monthName: sql`TO_CHAR(created_at, 'Mon YYYY')`,
				total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
				count: count()
			})
				.from(order)
				.groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`, sql`TO_CHAR(created_at, 'Mon YYYY')`)
				.orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
				.limit(12),

			// User queries
			db.select({ count: count() }).from(user),
			db.select({ count: count() }).from(user).where(gte(user.createdAt, monthStart)),
			db.select({ count: count() }).from(user)
				.where(and(gte(user.createdAt, lastMonthStart), lt(user.createdAt, monthStart))),
			db.select({ role: user.role, count: count() })
				.from(user)
				.groupBy(user.role)
				.orderBy(desc(count())),
			db.select({ count: count() }).from(user).where(eq(user.subscriptionStatus, 'active')),
			db.select({
				type: user.subscriptionType,
				status: user.subscriptionStatus,
				count: count()
			})
				.from(user)
				.where(sql`subscription_type IS NOT NULL`)
				.groupBy(user.subscriptionType, user.subscriptionStatus),
			db.select({ date: sql`DATE(created_at)`, count: count() })
				.from(user)
				.where(gte(user.createdAt, thirtyDaysAgo))
				.groupBy(sql`DATE(created_at)`)
				.orderBy(sql`DATE(created_at)`),

			// Event queries
			db.select({ count: count() }).from(event),
			db.select({ status: event.status, count: count() })
				.from(event)
				.groupBy(event.status),
			db.select({ circuit: sql`COALESCE(circuit, 'Unassigned')`, count: count() })
				.from(event)
				.groupBy(sql`COALESCE(circuit, 'Unassigned')`)
				.orderBy(desc(count())),
			db.select({ format: sql`COALESCE(format, 'Unknown')`, count: count() })
				.from(event)
				.groupBy(sql`COALESCE(format, 'Unknown')`)
				.orderBy(desc(count())),
			db.select({ count: count() }).from(event).where(gte(event.eventDate, now)),

			// Ticket queries
			db.select({ count: count() }).from(ticket),
			db.select({
				count: count(),
				revenue: sql`COALESCE(SUM(CAST(amount_paid AS DECIMAL)), 0)`
			})
				.from(ticket)
				.where(gte(ticket.createdAt, monthStart)),
			db.select({
				count: count(),
				revenue: sql`COALESCE(SUM(CAST(amount_paid AS DECIMAL)), 0)`
			})
				.from(ticket)
				.where(and(gte(ticket.createdAt, lastMonthStart), lt(ticket.createdAt, monthStart))),
			db.select({ count: count() }).from(ticket).where(eq(ticket.refunded, true)),
			db.select({ total: sql`COALESCE(SUM(CAST(amount_paid AS DECIMAL)), 0)` })
				.from(ticket)
				.where(sql`refunded IS NOT TRUE`),
			db.execute(sql`
				SELECT
					COALESCE(e.circuit, 'Unassigned') as circuit,
					COUNT(*) as count,
					COALESCE(SUM(CAST(t.amount_paid AS DECIMAL)), 0) as revenue
				FROM ticket t
				LEFT JOIN event e ON t.event_id = e.id
				GROUP BY e.circuit
				ORDER BY count DESC
			`),
			db.execute(sql`
				SELECT
					t.event_id as "eventId",
					e.title as "eventTitle",
					e.circuit,
					COUNT(*) as "ticketCount",
					COALESCE(SUM(CAST(t.amount_paid AS DECIMAL)), 0) as revenue
				FROM ticket t
				LEFT JOIN event e ON t.event_id = e.id
				WHERE t.refunded IS NOT TRUE
				GROUP BY t.event_id, e.title, e.circuit
				ORDER BY COUNT(*) DESC
				LIMIT 10
			`),

			// Course queries
			db.select({ count: count() }).from(entitlement),
			db.select({ product: entitlement.product, count: count() })
				.from(entitlement)
				.groupBy(entitlement.product)
				.orderBy(desc(count())),

			// Customer/Player queries
			db.select({
				email: order.userEmail,
				orderCount: count(),
				totalSpent: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
				firstOrder: sql`MIN(created_at)`,
				lastOrder: sql`MAX(created_at)`
			})
				.from(order)
				.groupBy(order.userEmail),
			db.select({ count: sql`COUNT(DISTINCT gem_id)` })
				.from(seasonStanding)
				.where(sql`gem_id IS NOT NULL`),
			db.select({
				circuit: seasonStanding.circuit,
				count: sql`COUNT(DISTINCT gem_id)`
			})
				.from(seasonStanding)
				.groupBy(seasonStanding.circuit)
				.orderBy(desc(sql`COUNT(DISTINCT gem_id)`)),
			db.select({
				playerName: seasonStanding.playerName,
				gemId: seasonStanding.gemId,
				circuit: seasonStanding.circuit,
				totalPoints: seasonStanding.totalPoints,
				matchesWon: seasonStanding.matchesWon,
				matchesPlayed: seasonStanding.matchesPlayed
			})
				.from(seasonStanding)
				.orderBy(desc(seasonStanding.totalPoints))
				.limit(10)
		]);

		// Process raw query results
		const ticketsByCircuit = ticketsByCircuitRaw.rows || [];
		const topSellingEvents = topSellingEventsRaw.rows || [];

		// Calculate customer stats
		const newCustomers = customerStats.filter((c) => Number(c.orderCount) === 1).length;
		const returningCustomers = customerStats.filter((c) => Number(c.orderCount) > 1).length;
		const avgOrderValue = customerStats.length > 0
			? customerStats.reduce((sum, c) => sum + parseFloat(c.totalSpent), 0) / customerStats.reduce((sum, c) => sum + Number(c.orderCount), 0)
			: 0;

		const topCustomers = [...customerStats]
			.sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
			.slice(0, 10)
			.map((c) => ({
				email: c.email,
				orderCount: Number(c.orderCount),
				totalSpent: parseFloat(c.totalSpent) || 0
			}));

		// Calculate growth percentages
		const monthOverMonthRevenueGrowth = parseFloat(lastMonthRevenue?.total) > 0
			? ((parseFloat(monthRevenue?.total) - parseFloat(lastMonthRevenue?.total)) / parseFloat(lastMonthRevenue?.total) * 100).toFixed(1)
			: null;

		const monthOverMonthUserGrowth = Number(newUsersLastMonth?.count) > 0
			? ((Number(newUsersMonth?.count) - Number(newUsersLastMonth?.count)) / Number(newUsersLastMonth?.count) * 100).toFixed(1)
			: null;

		const monthOverMonthTicketGrowth = Number(ticketsLastMonth?.count) > 0
			? ((Number(ticketsThisMonth?.count) - Number(ticketsLastMonth?.count)) / Number(ticketsLastMonth?.count) * 100).toFixed(1)
			: null;

		return {
			user: locals.user,
			revenue: {
				today: parseFloat(todayRevenue?.total) || 0,
				todayOrders: Number(todayRevenue?.count) || 0,
				week: parseFloat(weekRevenue?.total) || 0,
				weekOrders: Number(weekRevenue?.count) || 0,
				month: parseFloat(monthRevenue?.total) || 0,
				monthOrders: Number(monthRevenue?.count) || 0,
				lastMonth: parseFloat(lastMonthRevenue?.total) || 0,
				ytd: parseFloat(ytdRevenue?.total) || 0,
				allTime: parseFloat(allTimeRevenue?.total) || 0,
				allTimeOrders: Number(allTimeRevenue?.count) || 0,
				byType: revenueByType.map((r) => ({
					type: r.type,
					total: parseFloat(r.total) || 0,
					count: Number(r.count) || 0
				})),
				dailyTrend: dailyRevenue.map((d) => ({
					date: d.date,
					total: parseFloat(d.total) || 0,
					count: Number(d.count) || 0
				})),
				monthlyTrend: monthlyRevenue.map((m) => ({
					month: m.month,
					monthName: m.monthName,
					total: parseFloat(m.total) || 0,
					count: Number(m.count) || 0
				})),
				growth: monthOverMonthRevenueGrowth
			},
			users: {
				total: Number(totalUsers?.count) || 0,
				newThisMonth: Number(newUsersMonth?.count) || 0,
				newLastMonth: Number(newUsersLastMonth?.count) || 0,
				byRole: usersByRole.map((r) => ({
					role: r.role || 'unknown',
					count: Number(r.count) || 0
				})),
				activeSubscribers: Number(activeSubscribers?.count) || 0,
				subscriptionBreakdown: subscriptionBreakdown.map((s) => ({
					type: s.type,
					status: s.status,
					count: Number(s.count) || 0
				})),
				dailySignups: dailySignups.map((d) => ({
					date: d.date,
					count: Number(d.count) || 0
				})),
				growth: monthOverMonthUserGrowth
			},
			events: {
				total: Number(totalEvents?.count) || 0,
				upcoming: Number(upcomingEvents?.count) || 0,
				byStatus: eventsByStatus.map((s) => ({
					status: s.status || 'unknown',
					count: Number(s.count) || 0
				})),
				byCircuit: eventsByCircuit.map((c) => ({
					circuit: c.circuit,
					count: Number(c.count) || 0
				})),
				byFormat: eventsByFormat.map((f) => ({
					format: f.format,
					count: Number(f.count) || 0
				}))
			},
			tickets: {
				total: Number(totalTickets?.count) || 0,
				thisMonth: Number(ticketsThisMonth?.count) || 0,
				thisMonthRevenue: parseFloat(ticketsThisMonth?.revenue) || 0,
				lastMonth: Number(ticketsLastMonth?.count) || 0,
				refunded: Number(refundedTickets?.count) || 0,
				totalRevenue: parseFloat(ticketRevenue?.total) || 0,
				byCircuit: ticketsByCircuit.map((c) => ({
					circuit: c.circuit,
					count: Number(c.count) || 0,
					revenue: parseFloat(c.revenue) || 0
				})),
				topEvents: topSellingEvents.map((e) => ({
					eventId: e.eventId,
					title: e.eventTitle,
					circuit: e.circuit,
					count: Number(e.ticketCount) || 0,
					revenue: parseFloat(e.revenue) || 0
				})),
				growth: monthOverMonthTicketGrowth
			},
			courses: {
				total: Number(totalEntitlements?.count) || 0,
				byProduct: entitlementsByProduct.map((e) => ({
					product: e.product,
					count: Number(e.count) || 0
				}))
			},
			customers: {
				total: customerStats.length,
				new: newCustomers,
				returning: returningCustomers,
				avgOrderValue: avgOrderValue.toFixed(2),
				topCustomers
			},
			players: {
				total: Number(totalPlayers?.count) || 0,
				byCircuit: playersByCircuit.map((c) => ({
					circuit: c.circuit,
					count: Number(c.count) || 0
				})),
				topPlayers: topPlayers.map((p) => ({
					name: p.playerName,
					gemId: p.gemId,
					circuit: p.circuit,
					points: p.totalPoints || 0,
					matchesWon: p.matchesWon || 0,
					matchesPlayed: p.matchesPlayed || 0
				}))
			}
		};
	} catch (error) {
		console.error('Analytics page load error:', error);
		return {
			user: locals.user,
			error: 'Failed to load analytics data'
		};
	}
}
