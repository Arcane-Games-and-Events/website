import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { auth } from '$lib/server/lucia.js';
import { eq } from 'drizzle-orm';

/**
 * Cancel a premium subscription
 *
 * When cancelled, the user keeps premium access until the end of their current
 * billing period (subscriptionEndDate). After that date, the access checking
 * logic will deny premium access.
 */
export async function POST({ locals }) {
	try {
		// Ensure user is logged in
		const currentUser = locals.user;

		if (!currentUser) {
			return json({ error: 'You must be logged in to cancel' }, { status: 401 });
		}

		// Check if user has an active subscription
		if (!currentUser.subscriptionId) {
			return json({ error: 'No active subscription found' }, { status: 400 });
		}

		// Check if subscription is already cancelled
		if (currentUser.subscriptionStatus === 'cancelled') {
			return json({ error: 'Subscription is already cancelled' }, { status: 400 });
		}

		// Cancel subscription with Authorize.net
		try {
			const result = await authnet.cancelSubscription(currentUser.subscriptionId);

			if (result.success) {
				// Calculate when access should end (the next billing date is when the paid period ends)
				// If nextBillingDate is available, use it; otherwise calculate from start date
				let subscriptionEndDate = currentUser.nextBillingDate;

				if (!subscriptionEndDate) {
					// Fallback: Calculate based on subscription start and type
					const startDate = currentUser.subscriptionStartDate || new Date();
					subscriptionEndDate = new Date(startDate);

					if (currentUser.subscriptionType === 'yearly') {
						subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
					} else {
						subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
					}
				}

				// Update subscription status to cancelled but KEEP role as premium
				// Access checking logic will handle expiration based on subscriptionEndDate
				await db
					.update(userTable)
					.set({
						subscriptionStatus: 'cancelled',
						subscriptionEndDate,
						nextBillingDate: null // No more billing
					})
					.where(eq(userTable.id, currentUser.id));

				// Invalidate current session and create new one with updated subscription status
				if (locals.session) {
					await auth.invalidateSession(locals.session.id);
				}

				// Create new session with updated user data
				const newSession = await auth.createSession(currentUser.id, {});
				const sessionCookie = auth.createSessionCookie(newSession.id);

				return json(
					{
						success: true,
						message: 'Subscription cancelled successfully',
						accessUntil: subscriptionEndDate.toISOString()
					},
					{
						headers: {
							'Set-Cookie': sessionCookie.serialize()
						}
					}
				);
			} else {
				console.error('Authorize.net cancellation failed');
				return json({ error: 'Cancellation failed' }, { status: 500 });
			}
		} catch (authError) {
			console.error('Authorize.net API error:', authError);
			return json({ error: `Cancellation error: ${authError.message}` }, { status: 500 });
		}
	} catch (err) {
		console.error('Cancellation error:', err);
		return json({ error: err.message || 'Cancellation failed' }, { status: 500 });
	}
}
