import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { order, user, ticket, entitlement, event } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ params, locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin');
	}

	try {
		// Fetch order details
		const [orderData] = await db.select().from(order).where(eq(order.id, params.orderId)).limit(1);

		if (!orderData) {
			throw redirect(302, '/admin?tab=orders');
		}

		// Fetch customer info
		const [customerData] = await db
			.select()
			.from(user)
			.where(eq(user.email, orderData.userEmail))
			.limit(1);

		// Fetch related data based on order type
		let relatedData = null;

		if (orderData.meta?.type === 'ticket' && orderData.meta.ticketId) {
			const [ticketData] = await db
				.select()
				.from(ticket)
				.where(eq(ticket.id, orderData.meta.ticketId))
				.limit(1);

			let eventData = null;
			if (ticketData?.eventId) {
				const [eventResult] = await db
					.select()
					.from(event)
					.where(eq(event.id, ticketData.eventId))
					.limit(1);
				eventData = eventResult;
			}

			relatedData = {
				type: 'ticket',
				ticket: ticketData,
				event: eventData
			};
		} else if (orderData.meta?.type === 'course' && orderData.meta.entitlementId) {
			const [entitlementData] = await db
				.select()
				.from(entitlement)
				.where(eq(entitlement.id, orderData.meta.entitlementId))
				.limit(1);

			relatedData = {
				type: 'course',
				entitlement: entitlementData
			};
		} else if (orderData.meta?.type === 'subscription') {
			relatedData = {
				type: 'subscription'
			};
		}

		return {
			user: locals.user,
			order: orderData,
			customer: customerData || null,
			relatedData
		};
	} catch (err) {
		if (err.status === 302) {
			throw err;
		}
		console.error('Error loading order:', err);
		throw redirect(302, '/admin?tab=orders');
	}
}

export const actions = {
	refund: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		try {
			// Fetch order details
			const [orderData] = await db
				.select()
				.from(order)
				.where(eq(order.id, params.orderId))
				.limit(1);

			if (!orderData) {
				return fail(404, { error: 'Order not found' });
			}

			const { authnet } = await import('$lib/server/authnet/client.js');
			let refundType = '';

			// Handle subscription orders
			if (orderData.meta?.type === 'subscription') {
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
							cardNumber: orderData.meta?.cardLastFour || '1111'
						});
						refundType = 'refunded';
					} catch (refundError) {
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
					cardNumber: orderData.meta?.cardLastFour || '1111'
				});
				refundType = 'refunded';
			}

			// Update related records based on order type
			if (orderData.meta?.type === 'ticket' && orderData.meta.ticketId) {
				await db
					.update(ticket)
					.set({
						refunded: true,
						refundedAt: new Date()
					})
					.where(eq(ticket.id, orderData.meta.ticketId));
			} else if (orderData.meta?.type === 'course' && orderData.meta.entitlementId) {
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
	}
};
