import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { order, ticket, entitlement } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function load({ params, locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/account');
	}

	try {
		// Fetch order details
		const [orderData] = await db
			.select()
			.from(order)
			.where(eq(order.id, params.orderId))
			.limit(1);

		if (!orderData) {
			throw error(404, 'Order not found');
		}

		// Verify the order belongs to the logged-in user
		if (orderData.userEmail !== locals.user.email) {
			throw error(403, 'You do not have permission to view this order');
		}

		// Fetch additional details based on order type
		let additionalData = null;

		if (orderData.meta?.type === 'ticket' && orderData.meta.ticketId) {
			// Fetch ticket details
			const [ticketData] = await db
				.select()
				.from(ticket)
				.where(eq(ticket.id, orderData.meta.ticketId))
				.limit(1);

			additionalData = {
				type: 'ticket',
				ticket: ticketData
			};
		} else if (orderData.meta?.type === 'course' && orderData.meta.entitlementId) {
			// Fetch entitlement details
			const [entitlementData] = await db
				.select()
				.from(entitlement)
				.where(eq(entitlement.id, orderData.meta.entitlementId))
				.limit(1);

			additionalData = {
				type: 'course',
				entitlement: entitlementData
			};
		} else if (orderData.meta?.type === 'subscription') {
			additionalData = {
				type: 'subscription'
			};
		}

		return {
			user: locals.user,
			order: orderData,
			additionalData
		};
	} catch (err) {
		if (err.status === 404 || err.status === 403) {
			throw err;
		}
		console.error('Error loading order:', err);
		throw error(500, 'Failed to load order details');
	}
}

export const actions = {
	refund: async ({ params, request, locals }) => {
		// Require authentication
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
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

			// Verify the order belongs to the logged-in user
			if (orderData.userEmail !== locals.user.email) {
				return fail(403, { error: 'You do not have permission to refund this order' });
			}

			// Can't refund subscriptions through this endpoint
			if (orderData.meta?.type === 'subscription') {
				return fail(400, { error: 'Subscriptions cannot be refunded. Please cancel your subscription instead.' });
			}

			const { authnet } = await import('$lib/server/authnet/client.js');
			let refundType = '';

			// Try VOID first (for unsettled transactions within ~24 hours)
			try {
				await authnet.voidTransaction(orderData.providerRef);
				refundType = 'voided';
			} catch (voidError) {
				// If void fails, try REFUND (for settled transactions)
				console.log('Void failed, attempting refund:', voidError.message);

				// Note: In production, you should store the last 4 digits of the card during checkout
				// For sandbox/testing, we use "1111" as a placeholder
				await authnet.refundTransaction({
					transactionId: orderData.providerRef,
					amount: orderData.amount,
					cardNumber: '1111' // Placeholder - should store last 4 digits in production
				});
				refundType = 'refunded';
			}

			// Handle refund based on order type
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
				await db
					.delete(entitlement)
					.where(eq(entitlement.id, orderData.meta.entitlementId));
			}

			return {
				success: true,
				message: `Order ${refundType} successfully through Authorize.net. ${
					orderData.meta?.type === 'course' ? 'Course access has been revoked.' : ''
				}`
			};
		} catch (err) {
			console.error('Error refunding order:', err);
			return fail(500, { error: err.message || 'Failed to process refund' });
		}
	}
};
