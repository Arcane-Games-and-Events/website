import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * DEV ONLY: Simulate subscription webhook events for testing
 *
 * Usage:
 * POST /api/test/simulate-webhook
 * Body: { action: 'payment_success' | 'payment_failed' | 'expire_now', email?: string }
 */
export async function POST({ request, locals }) {
	// Only allow in development
	if (!dev) {
		return json({ error: 'This endpoint is only available in development' }, { status: 403 });
	}

	// Require authentication
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { action, email } = body;

		// Use provided email or current user's email
		const targetEmail = email || locals.user.email;

		// Find the user
		const [user] = await db
			.select()
			.from(userTable)
			.where(eq(userTable.email, targetEmail))
			.limit(1);

		if (!user) {
			return json({ error: `User not found: ${targetEmail}` }, { status: 404 });
		}

		let result = {};

		switch (action) {
			case 'payment_success': {
				// Simulate successful subscription payment
				// Use stacking behavior: add to existing nextBillingDate (for testing multiple cycles)
				const baseDate = user.nextBillingDate ? new Date(user.nextBillingDate) : new Date();
				const nextBillingDate = new Date(baseDate);
				if (user.subscriptionType === 'yearly') {
					nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
				} else if (user.subscriptionType === 'weekly_test') {
					nextBillingDate.setDate(nextBillingDate.getDate() + 7);
				} else {
					nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
				}

				await db.update(userTable)
					.set({
						role: 'premium',
						subscriptionStatus: 'active',
						nextBillingDate,
						subscriptionEndDate: null
					})
					.where(eq(userTable.id, user.id));

				result = {
					message: 'Simulated successful payment (stacking)',
					subscriptionType: user.subscriptionType,
					previousBillingDate: baseDate.toISOString(),
					status: 'active',
					nextBillingDate: nextBillingDate.toISOString()
				};
				break;
			}

			case 'payment_failed': {
				// Simulate failed subscription payment with 7-day grace period
				const gracePeriodEnd = new Date();
				gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

				await db.update(userTable)
					.set({
						subscriptionStatus: 'payment_failed',
						subscriptionEndDate: gracePeriodEnd
					})
					.where(eq(userTable.id, user.id));

				result = {
					message: 'Simulated failed payment',
					status: 'payment_failed',
					gracePeriodEnd: gracePeriodEnd.toISOString()
				};
				break;
			}

			case 'expire_now': {
				// Set the end date to the past so the next request triggers expiration
				const expiredDate = new Date();
				expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

				// Set status to cancelled or payment_failed with expired date
				const currentStatus = user.subscriptionStatus;
				const newStatus = (currentStatus === 'payment_failed' || currentStatus === 'cancelled')
					? currentStatus
					: 'cancelled';

				await db.update(userTable)
					.set({
						subscriptionStatus: newStatus,
						subscriptionEndDate: expiredDate
					})
					.where(eq(userTable.id, user.id));

				result = {
					message: `Set subscription to expire. Status: ${newStatus}. Refresh any page to trigger downgrade.`,
					status: newStatus,
					endDate: expiredDate.toISOString()
				};
				break;
			}

			case 'restore_premium': {
				// Restore user to active premium (useful after testing)
				const nextBillingDate = new Date();
				nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

				await db.update(userTable)
					.set({
						role: 'premium',
						subscriptionStatus: 'active',
						subscriptionEndDate: null,
						nextBillingDate
					})
					.where(eq(userTable.id, user.id));

				result = {
					message: 'Restored premium status',
					status: 'active',
					nextBillingDate: nextBillingDate.toISOString()
				};
				break;
			}

			case 'status': {
				// Just return current subscription status
				result = {
					email: user.email,
					role: user.role,
					subscriptionId: user.subscriptionId,
					subscriptionStatus: user.subscriptionStatus,
					subscriptionType: user.subscriptionType,
					subscriptionEndDate: user.subscriptionEndDate,
					nextBillingDate: user.nextBillingDate
				};
				break;
			}

			default:
				return json({
					error: 'Invalid action',
					validActions: ['payment_success', 'payment_failed', 'expire_now', 'restore_premium', 'status']
				}, { status: 400 });
		}

		return json({ success: true, ...result });

	} catch (err) {
		console.error('Simulate webhook error:', err);
		return json({ error: err.message }, { status: 500 });
	}
}
