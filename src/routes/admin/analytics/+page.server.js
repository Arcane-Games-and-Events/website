import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/analytics');
	}

	try {
		const result = await db.execute(sql`SELECT get_analytics_data() as data`);
		const row = (result.rows || result || [])[0];
		const data = typeof row?.data === 'string' ? JSON.parse(row.data) : row?.data;

		if (!data) {
			return { user: locals.user, error: 'No analytics data returned.' };
		}

		// Compute user and ticket growth (RPC only computes revenue growth)
		const newThisMonth = data.users?.newThisMonth || 0;
		const newLastMonth = data.users?.newLastMonth || 0;
		const userGrowth =
			newLastMonth > 0 ? (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1) : null;

		const ticketsThisMonth = data.tickets?.thisMonth || 0;
		const ticketsLastMonth = data.tickets?.lastMonth || 0;
		const ticketGrowth =
			ticketsLastMonth > 0
				? (((ticketsThisMonth - ticketsLastMonth) / ticketsLastMonth) * 100).toFixed(1)
				: null;

		// Compute top customers avg order value
		const topCustomers = data.customers?.topCustomers || [];
		const totalOrders = topCustomers.reduce((s, c) => s + (c.orderCount || 0), 0);
		const avgOrderValue =
			totalOrders > 0
				? (topCustomers.reduce((s, c) => s + (c.totalSpent || 0), 0) / totalOrders).toFixed(2)
				: '0.00';

		// Compute premium metrics from the new premium section
		const p = data.premium || {};
		const paidMonthlyActive = parseInt(p.paidMonthlyActive) || 0;
		const paidYearlyActive = parseInt(p.paidYearlyActive) || 0;
		const mrr = paidMonthlyActive * 9.99 + paidYearlyActive * 8.25;
		const paidActive = parseInt(p.paidActive) || 0;
		const paidCancelled = parseInt(p.paidCancelled) || 0;
		const churn =
			paidActive + paidCancelled > 0
				? ((paidCancelled / (paidActive + paidCancelled)) * 100).toFixed(1)
				: '0.0';

		// Ticket refund rate
		const ticketTotal = parseInt(data.tickets?.total) || 0;
		const ticketRefunded = parseInt(data.tickets?.refunded) || 0;
		const refundRate = ticketTotal > 0 ? ((ticketRefunded / ticketTotal) * 100).toFixed(1) : '0.0';

		return {
			user: locals.user,
			revenue: {
				...data.revenue,
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
				byType: (data.revenue?.byType || []).map((t) => ({
					type: t.type,
					total: parseFloat(t.total) || 0,
					count: parseInt(t.count) || 0
				})),
				monthlyTrend: (data.revenue?.monthlyTrend || []).map((m) => ({
					month: m.month,
					monthName: m.monthName,
					total: parseFloat(m.total) || 0,
					count: parseInt(m.count) || 0
				})),
				growth: data.revenue?.growth != null ? String(data.revenue.growth) : null
			},
			users: {
				total: parseInt(data.users?.total) || 0,
				newThisMonth,
				newLastMonth,
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
				growth: userGrowth
			},
			premium: {
				totalPremium: parseInt(p.totalPremium) || 0,
				paidPremium: parseInt(p.paidPremium) || 0,
				assignedPremium: parseInt(p.assignedPremium) || 0,
				paidActive,
				paidCancelled,
				paidExpired: parseInt(p.paidExpired) || 0,
				paidPaymentFailed: parseInt(p.paidPaymentFailed) || 0,
				paidMonthlyActive,
				paidYearlyActive,
				paidMonthlyCancelled: parseInt(p.paidMonthlyCancelled) || 0,
				paidYearlyCancelled: parseInt(p.paidYearlyCancelled) || 0,
				mrr,
				arr: mrr * 12,
				churn,
				recentSignups: (p.recentSignups || []).map((s) => ({
					email: s.email,
					firstName: s.firstName,
					lastName: s.lastName,
					type: s.type,
					subscriptionType: s.subscriptionType,
					subscriptionStatus: s.subscriptionStatus,
					createdAt: s.createdAt
				})),
				monthlyTrend: (p.monthlyTrend || []).map((m) => ({
					month: m.month,
					monthName: m.monthName,
					paid: parseInt(m.paid) || 0,
					assigned: parseInt(m.assigned) || 0,
					total: parseInt(m.total) || 0
				}))
			},
			events: {
				total: parseInt(data.events?.total) || 0,
				upcoming: parseInt(data.events?.upcoming) || 0,
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
				total: ticketTotal,
				thisMonth: ticketsThisMonth,
				thisMonthRevenue: parseFloat(data.tickets?.thisMonthRevenue) || 0,
				lastMonth: ticketsLastMonth,
				refunded: ticketRefunded,
				refundRate,
				totalRevenue: parseFloat(data.tickets?.totalRevenue) || 0,
				avgTicketPrice: parseFloat(data.tickets?.avgTicketPrice) || 0,
				topEvents: (data.tickets?.topEvents || []).map((e) => ({
					eventId: e.eventId,
					title: e.title,
					circuit: e.circuit,
					count: parseInt(e.count) || 0,
					revenue: parseFloat(e.revenue) || 0
				})),
				byCircuit: (data.tickets?.byCircuit || []).map((c) => ({
					circuit: c.circuit,
					count: parseInt(c.count) || 0,
					revenue: parseFloat(c.revenue) || 0
				})),
				monthlyTrend: (data.tickets?.monthlyTrend || []).map((m) => ({
					month: m.month,
					monthName: m.monthName,
					count: parseInt(m.count) || 0,
					revenue: parseFloat(m.revenue) || 0
				})),
				growth: ticketGrowth
			},
			customers: {
				total: topCustomers.length,
				avgOrderValue,
				topCustomers
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
		console.error('Analytics load error:', error);
		return {
			user: locals.user,
			error: 'Failed to load analytics data.'
		};
	}
}
