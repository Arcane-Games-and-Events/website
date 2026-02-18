import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { order, user, ticket, entitlement } from '$lib/server/db/schema.js';
import { eq, sql, or, ilike } from 'drizzle-orm';

// Helper to add timeout to promises
const withTimeout = (promise, ms, fallback) =>
	Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/orders');
	}

	try {
		// Single RPC call replaces 20+ individual queries with 15s timeout
		const result = await withTimeout(
			db.execute(sql`SELECT get_admin_dashboard_stats() as data`),
			15000,
			null
		);

		if (!result) {
			console.warn('Admin orders RPC timed out - returning empty data');
			return {
				user: locals.user,
				allOrders: [],
				allUsers: [],
				revenueStats: { today: 0, week: 0, month: 0, allTime: 0, byType: [] },
				refundStats: { refundedTickets: 0, totalTicketOrders: 0 },
				stats: { totalEvents: 0, totalOrders: 0, premiumUsers: 0, totalPlayers: 0, totalUsers: 0 }
			};
		}

		const data = result.rows?.[0]?.data || result[0]?.data;

		if (!data) {
			throw new Error('No data returned from get_admin_dashboard_stats()');
		}

		// Process orders and enrich with refund status
		const allOrders = data.orders || [];
		const ticketOrderIds = allOrders
			.filter((o) => o.meta?.type === 'ticket' && o.meta?.ticketId)
			.map((o) => o.meta.ticketId);

		let ticketRefundMap = new Map();
		if (ticketOrderIds.length > 0) {
			const ticketStatuses = await db
				.select({ id: ticket.id, refunded: ticket.refunded })
				.from(ticket)
				.where(sql`${ticket.id} IN ${ticketOrderIds}`);

			ticketStatuses.forEach((t) => {
				ticketRefundMap.set(t.id, t.refunded);
			});
		}

		const enrichedOrders = allOrders.map((o) => {
			let status = 'completed';
			if (o.meta?.type === 'ticket' && o.meta?.ticketId) {
				status = ticketRefundMap.get(o.meta.ticketId) ? 'refunded' : 'completed';
			} else if (o.meta?.type === 'subscription') {
				status = 'active';
			}
			// Transform snake_case from RPC to camelCase for frontend
			return {
				id: o.id,
				provider: o.provider,
				providerRef: o.provider_ref || o.providerRef,
				userEmail: o.user_email || o.userEmail,
				amount: o.amount,
				currency: o.currency,
				meta: o.meta,
				createdAt: o.created_at || o.createdAt,
				status
			};
		});

		// Revenue stats
		const revenueStats = {
			today: parseFloat(data.analytics?.todayRevenue) || 0,
			week: parseFloat(data.analytics?.weekRevenue) || 0,
			month: parseFloat(data.analytics?.monthRevenue) || 0,
			allTime: parseFloat(data.analytics?.totalRevenue) || 0,
			byType: (data.analytics?.revenueByType || []).map((r) => ({
				type: r.type,
				total: parseFloat(r.total) || 0,
				count: Number(r.count) || 0
			}))
		};

		// Refund stats
		const ticketStatsList = data.ticketStats || [];
		const refundStats = {
			refundedTickets: ticketStatsList.reduce((sum, t) => sum + (Number(t.refunded) || 0), 0),
			totalTicketOrders: revenueStats.byType.find((r) => r.type === 'ticket')?.count || 0
		};

		return {
			user: locals.user,
			allOrders: enrichedOrders,
			allUsers: data.users || [],
			revenueStats,
			refundStats,
			stats: {
				totalEvents: parseInt(data.stats?.totalEvents) || 0,
				totalOrders: parseInt(data.stats?.totalOrders) || 0,
				premiumUsers: parseInt(data.stats?.premiumUsers) || 0,
				totalPlayers: parseInt(data.stats?.totalPlayers) || 0,
				totalUsers: parseInt(data.stats?.totalUsers) || 0
			}
		};
	} catch (error) {
		console.error('Admin orders page load error:', error);

		if (error.message?.includes('get_admin_dashboard_stats')) {
			console.error(
				'RPC function not found. Run the migration: supabase/migrations/001_rpc_functions.sql'
			);
		}

		return {
			user: locals.user,
			allOrders: [],
			allUsers: [],
			revenueStats: { today: 0, week: 0, month: 0, allTime: 0, byType: [] },
			refundStats: { refundedTickets: 0, totalTicketOrders: 0 },
			stats: {
				totalEvents: 0,
				totalOrders: 0,
				premiumUsers: 0,
				totalPlayers: 0,
				totalUsers: 0
			}
		};
	}
}

export const actions = {
	// Admin refund order - bypasses user restrictions
	refundOrder: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const orderId = formData.get('orderId');

		if (!orderId) {
			return fail(400, { error: 'Order ID is required' });
		}

		try {
			// Fetch order details
			const [orderData] = await db.select().from(order).where(eq(order.id, orderId)).limit(1);

			if (!orderData) {
				return fail(404, { error: 'Order not found' });
			}

			const { authnet } = await import('$lib/server/authnet/client.js');
			let refundType = '';

			// Handle subscription orders
			if (orderData.meta?.type === 'subscription') {
				// Cancel the subscription if we have the ID
				if (orderData.meta.subscriptionId) {
					try {
						await authnet.cancelSubscription(orderData.meta.subscriptionId);
					} catch (cancelErr) {
						console.log(
							'Subscription cancellation error (may already be cancelled):',
							cancelErr.message
						);
					}
				}

				// Downgrade user to free tier
				await db
					.update(user)
					.set({
						subscriptionStatus: 'cancelled',
						role: 'free'
					})
					.where(eq(user.email, orderData.userEmail));

				// Try to void/refund the payment
				try {
					await authnet.voidTransaction(orderData.providerRef);
					refundType = 'voided';
				} catch (voidError) {
					console.log('Void failed, attempting refund:', voidError.message);
					try {
						await authnet.refundTransaction({
							transactionId: orderData.providerRef,
							amount: orderData.amount,
							cardNumber: '1111'
						});
						refundType = 'refunded';
					} catch (refundError) {
						// Payment might already be refunded or too old
						console.log('Refund also failed:', refundError.message);
						refundType = 'subscription cancelled (payment refund failed - may be too old)';
					}
				}

				return {
					success: true,
					message: `Subscription cancelled and ${refundType}. User downgraded to free tier.`
				};
			}

			// For ticket and course orders: Try VOID first, then REFUND
			try {
				await authnet.voidTransaction(orderData.providerRef);
				refundType = 'voided';
			} catch (voidError) {
				console.log('Void failed, attempting refund:', voidError.message);
				await authnet.refundTransaction({
					transactionId: orderData.providerRef,
					amount: orderData.amount,
					cardNumber: '1111'
				});
				refundType = 'refunded';
			}

			// Update related records based on order type
			if (orderData.meta?.type === 'ticket' && orderData.meta.ticketId) {
				// Mark ticket as refunded
				await db
					.update(ticket)
					.set({
						refunded: true,
						refundedAt: new Date()
					})
					.where(eq(ticket.id, orderData.meta.ticketId));
			} else if (orderData.meta?.type === 'course' && orderData.meta.entitlementId) {
				// Revoke course entitlement
				await db.delete(entitlement).where(eq(entitlement.id, orderData.meta.entitlementId));
			}

			return {
				success: true,
				message: `Order ${refundType} successfully`
			};
		} catch (err) {
			console.error('Error refunding order:', err);
			return fail(500, { error: err.message || 'Failed to process refund' });
		}
	},

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
				.where(or(ilike(order.userEmail, searchPattern), ilike(order.id, searchPattern)))
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
