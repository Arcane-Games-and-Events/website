import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { user as userTable, order, savedCard } from '$lib/server/db/schema.js';
import { auth } from '$lib/server/lucia.js';
import { eq, and } from 'drizzle-orm';

/**
 * DEV ONLY: Create a 7-day interval subscription for testing webhooks
 *
 * This creates a real Authorize.net subscription that bills every 7 days,
 * so you can verify the webhook works in a week.
 *
 * Note: Authorize.net requires minimum 7 days for day-based subscriptions.
 *
 * Usage:
 * POST /api/test/subscribe-daily
 * Body (new card): { cardNumber, expirationDate, cardCode, billTo: { firstName, lastName } }
 * Body (saved card): { useSavedCard: true, savedCardId: "..." }
 */
export async function POST({ request, locals }) {
	// Only allow in development
	if (!dev) {
		return json({ error: 'This endpoint is only available in development' }, { status: 403 });
	}

	const currentUser = locals.user;
	if (!currentUser) {
		return json({ error: 'You must be logged in' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { cardNumber, expirationDate, cardCode, billTo, useSavedCard, savedCardId } = body;

		// Calculate start date (today)
		const startDate = new Date();
		const startDateStr = startDate.toISOString().split('T')[0];

		// Create unique subscription name
		const timestamp = Date.now().toString(36);
		const subscriptionName = `AGE Test Weekly - ${timestamp}`;

		let result;

		if (useSavedCard && savedCardId) {
			// Verify the saved card belongs to the user
			const [card] = await db
				.select()
				.from(savedCard)
				.where(
					and(
						eq(savedCard.id, savedCardId),
						eq(savedCard.userId, currentUser.id)
					)
				)
				.limit(1);

			if (!card) {
				return json({ error: 'Saved card not found' }, { status: 404 });
			}

			// Create subscription from customer profile
			result = await authnet.createSubscriptionFromCustomerProfile({
				customerProfileId: card.customerProfileId,
				paymentProfileId: card.paymentProfileId,
				amount: 0.01,
				email: currentUser.email,
				subscriptionName,
				intervalLength: 7, // Minimum allowed by Authorize.net
				intervalUnit: 'days',
				startDate: startDateStr,
				totalOccurrences: 5
			});
		} else {
			// Validate new card details
			if (!cardNumber || !expirationDate || !cardCode) {
				return json({ error: 'Card details are required' }, { status: 400 });
			}

			// Create subscription with 7-day interval (minimum allowed)
			result = await authnet.createSubscription({
				amount: 0.01, // Use minimal amount for testing
				cardNumber,
				expirationDate,
				cardCode,
				email: currentUser.email,
				subscriptionName,
				intervalLength: 7, // Minimum allowed by Authorize.net
				intervalUnit: 'days',
				startDate: startDateStr,
				totalOccurrences: 5, // Only 5 occurrences for testing
				billTo: {
					firstName: billTo?.firstName || 'Test',
					lastName: billTo?.lastName || 'User'
				}
			});
		}

		if (!result.success) {
			return json({ error: 'Subscription creation failed' }, { status: 500 });
		}

		// Calculate next billing date (7 days from now)
		const nextBillingDate = new Date();
		nextBillingDate.setDate(nextBillingDate.getDate() + 7);

		// Update user
		await db.update(userTable)
			.set({
				role: 'premium',
				subscriptionId: result.subscriptionId,
				subscriptionType: 'weekly_test', // Mark as test
				subscriptionStatus: 'active',
				subscriptionStartDate: startDate,
				subscriptionEndDate: null,
				nextBillingDate
			})
			.where(eq(userTable.id, currentUser.id));

		// Invalidate session and create new one
		if (locals.session) {
			await auth.invalidateSession(locals.session.id);
		}
		const newSession = await auth.createSession(currentUser.id, {});
		const sessionCookie = auth.createSessionCookie(newSession.id);

		// Record the order
		await db.insert(order).values({
			provider: 'authnet',
			providerRef: result.subscriptionId,
			userEmail: currentUser.email,
			amount: 0.01,
			currency: 'USD',
			meta: {
				type: 'subscription',
				subscriptionId: result.subscriptionId,
				subscriptionType: 'weekly_test',
				description: 'Weekly test subscription for webhook verification'
			}
		});

		return json(
			{
				success: true,
				subscriptionId: result.subscriptionId,
				message: 'Weekly test subscription created! Check your webhook in 7 days.',
				nextBillingDate: nextBillingDate.toISOString(),
				note: 'This subscription will bill $0.01 every 7 days for 5 payments. Cancel it after testing!',
				redirectUrl: '/premium-test/confirmation'
			},
			{
				headers: {
					'Set-Cookie': sessionCookie.serialize()
				}
			}
		);

	} catch (err) {
		console.error('Weekly subscription error:', err);
		return json({ error: err.message }, { status: 500 });
	}
}
