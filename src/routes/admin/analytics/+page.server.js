import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

/**
 * Analytics page - uses RPC function for single database call
 *
 * The get_analytics_data() function consolidates 35 queries into one,
 * dramatically reducing connection usage and improving performance.
 *
 * To migrate: Run the SQL migration in supabase/migrations/001_rpc_functions.sql
 */
export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/analytics');
	}

	try {
		// Single RPC call replaces 35 individual queries
		const result = await db.execute(sql`SELECT get_analytics_data() as data`);
		const data = result.rows?.[0]?.data || result[0]?.data;

		if (!data) {
			throw new Error('No data returned from get_analytics_data()');
		}

		// Calculate additional customer metrics from the data
		const customerTotal = data.customers?.total || 0;
		const topCustomers = data.customers?.topCustomers || [];

		// Calculate growth percentages for users and tickets (done in JS for flexibility)
		const userGrowth =
			data.users?.newLastMonth > 0
				? (
						((data.users.newThisMonth - data.users.newLastMonth) / data.users.newLastMonth) *
						100
					).toFixed(1)
				: null;

		const ticketGrowth =
			data.tickets?.lastMonth > 0
				? (
						((data.tickets.thisMonth - data.tickets.lastMonth) / data.tickets.lastMonth) *
						100
					).toFixed(1)
				: null;

		return {
			user: locals.user,
			revenue: {
				today: parseFloat(data.revenue?.today) || 0,
				todayOrders: parseInt(data.revenue?.todayOrders) || 0,
				week: parseFloat(data.revenue?.week) || 0,
				weekOrders: parseInt(data.revenue?.weekOrders) || 0,
				month: parseFloat(data.revenue?.month) || 0,
				monthOrders: parseInt(data.revenue?.monthOrders) || 0,
				lastMonth: parseFloat(data.revenue?.lastMonth) || 0,
				ytd: parseFloat(data.revenue?.ytd) || 0,
				allTime: parseFloat(data.revenue?.allTime) || 0,
				allTimeOrders: parseInt(data.revenue?.allTimeOrders) || 0,
				byType: (data.revenue?.byType || []).map((r) => ({
					type: r.type,
					total: parseFloat(r.total) || 0,
					count: parseInt(r.count) || 0
				})),
				dailyTrend: (data.revenue?.dailyTrend || []).map((d) => ({
					date: d.date,
					total: parseFloat(d.total) || 0,
					count: parseInt(d.count) || 0
				})),
				monthlyTrend: (data.revenue?.monthlyTrend || []).map((m) => ({
					month: m.month,
					monthName: m.monthName,
					total: parseFloat(m.total) || 0,
					count: parseInt(m.count) || 0
				})),
				growth: data.revenue?.growth
			},
			users: {
				total: parseInt(data.users?.total) || 0,
				newThisMonth: parseInt(data.users?.newThisMonth) || 0,
				newLastMonth: parseInt(data.users?.newLastMonth) || 0,
				byRole: (data.users?.byRole || []).map((r) => ({
					role: r.role || 'unknown',
					count: parseInt(r.count) || 0
				})),
				activeSubscribers: parseInt(data.users?.activeSubscribers) || 0,
				subscriptionBreakdown: (data.users?.subscriptionBreakdown || []).map((s) => ({
					type: s.type,
					status: s.status,
					count: parseInt(s.count) || 0
				})),
				dailySignups: (data.users?.dailySignups || []).map((d) => ({
					date: d.date,
					count: parseInt(d.count) || 0
				})),
				growth: userGrowth
			},
			events: {
				total: parseInt(data.events?.total) || 0,
				upcoming: parseInt(data.events?.upcoming) || 0,
				byStatus: (data.events?.byStatus || []).map((s) => ({
					status: s.status || 'unknown',
					count: parseInt(s.count) || 0
				})),
				byCircuit: (data.events?.byCircuit || []).map((c) => ({
					circuit: c.circuit,
					count: parseInt(c.count) || 0
				})),
				byFormat: (data.events?.byFormat || []).map((f) => ({
					format: f.format,
					count: parseInt(f.count) || 0
				}))
			},
			tickets: {
				total: parseInt(data.tickets?.total) || 0,
				thisMonth: parseInt(data.tickets?.thisMonth) || 0,
				thisMonthRevenue: parseFloat(data.tickets?.thisMonthRevenue) || 0,
				lastMonth: parseInt(data.tickets?.lastMonth) || 0,
				refunded: parseInt(data.tickets?.refunded) || 0,
				totalRevenue: parseFloat(data.tickets?.totalRevenue) || 0,
				byCircuit: (data.tickets?.byCircuit || []).map((c) => ({
					circuit: c.circuit,
					count: parseInt(c.count) || 0,
					revenue: parseFloat(c.revenue) || 0
				})),
				topEvents: (data.tickets?.topEvents || []).map((e) => ({
					eventId: e.eventId,
					title: e.title,
					circuit: e.circuit,
					count: parseInt(e.count) || 0,
					revenue: parseFloat(e.revenue) || 0
				})),
				growth: ticketGrowth
			},
			courses: {
				total: parseInt(data.courses?.total) || 0,
				byProduct: (data.courses?.byProduct || []).map((e) => ({
					product: e.product,
					count: parseInt(e.count) || 0
				}))
			},
			customers: {
				total: customerTotal,
				new: topCustomers.filter((c) => c.orderCount === 1).length,
				returning: topCustomers.filter((c) => c.orderCount > 1).length,
				avgOrderValue:
					customerTotal > 0
						? (
								topCustomers.reduce((sum, c) => sum + (parseFloat(c.totalSpent) || 0), 0) /
								topCustomers.reduce((sum, c) => sum + (c.orderCount || 0), 0)
							).toFixed(2)
						: '0.00',
				topCustomers: topCustomers.slice(0, 10).map((c) => ({
					email: c.email,
					orderCount: parseInt(c.orderCount) || 0,
					totalSpent: parseFloat(c.totalSpent) || 0
				}))
			},
			players: {
				total: parseInt(data.players?.total) || 0,
				byCircuit: (data.players?.byCircuit || []).map((c) => ({
					circuit: c.circuit,
					count: parseInt(c.count) || 0
				})),
				topPlayers: (data.players?.topPlayers || []).map((p) => ({
					name: p.name,
					gemId: p.gemId,
					circuit: p.circuit,
					points: p.points || 0,
					matchesWon: p.matchesWon || 0,
					matchesPlayed: p.matchesPlayed || 0
				}))
			}
		};
	} catch (error) {
		console.error('Analytics page load error:', error);

		// Check if the error is because the function doesn't exist
		if (error.message?.includes('get_analytics_data')) {
			console.error(
				'RPC function not found. Run the migration: supabase/migrations/001_rpc_functions.sql'
			);
		}

		return {
			user: locals.user,
			error: 'Failed to load analytics data. Please ensure the RPC functions are installed.'
		};
	}
}
