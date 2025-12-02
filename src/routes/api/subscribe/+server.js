import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { user as userTable, order } from '$lib/server/db/schema.js';
import { auth } from '$lib/server/lucia.js';
import { eq } from 'drizzle-orm';

/**
 * Calculate the next billing date based on subscription type
 * @param {Date} startDate - The subscription start date
 * @param {string} subscriptionType - 'monthly' or 'yearly'
 * @returns {Date} The next billing date
 */
function calculateNextBillingDate(startDate, subscriptionType) {
	const nextDate = new Date(startDate);
	if (subscriptionType === 'yearly') {
		nextDate.setFullYear(nextDate.getFullYear() + 1);
	} else {
		nextDate.setMonth(nextDate.getMonth() + 1);
	}
	return nextDate;
}

/**
 * Create a premium subscription
 */
export async function POST({ request, locals }) {
	console.log('=== SUBSCRIBE ENDPOINT CALLED ===');
	try {
		// Ensure user is logged in
		const currentUser = locals.user;
		console.log('Current user:', currentUser?.email, 'Role:', currentUser?.role);

		if (!currentUser) {
			return json({ error: 'You must be logged in to subscribe' }, { status: 401 });
		}

		// Check if already premium with active subscription
		if ((currentUser.role === 'premium' && currentUser.subscriptionStatus === 'active') || currentUser.role === 'admin') {
			return json({ error: 'You already have premium access' }, { status: 400 });
		}

		const body = await request.json();
		const { amount, cardNumber, expirationDate, cardCode, description, billTo, subscriptionType = 'monthly' } = body;

		// Validate subscription type
		if (!['monthly', 'yearly'].includes(subscriptionType)) {
			return json({ error: 'Invalid subscription type' }, { status: 400 });
		}

		console.log('Creating subscription for:', currentUser.email, 'Amount:', amount, 'Type:', subscriptionType);
		console.log('Payment details:', { cardNumber: cardNumber.slice(-4), expirationDate });

		// Create recurring subscription with Authorize.net ARB
		let result;
		try {
			console.log('Creating recurring subscription for premium...');

			// Calculate start date (today)
			const startDate = new Date();
			const startDateStr = startDate.toISOString().split('T')[0];

			// Configure interval based on subscription type
			const intervalLength = subscriptionType === 'yearly' ? 12 : 1;
			const subscriptionName = subscriptionType === 'yearly'
				? 'AGE Premium Yearly Subscription'
				: 'AGE Premium Monthly Subscription';

			result = await authnet.createSubscription({
				amount,
				cardNumber,
				expirationDate,
				cardCode,
				email: currentUser.email,
				subscriptionName,
				intervalLength,
				intervalUnit: 'months',
				startDate: startDateStr,
				totalOccurrences: 9999, // 9999 = unlimited/ongoing
				billTo: {
					firstName: billTo.firstName,
					lastName: billTo.lastName
				}
			});
			console.log('Authorize.net subscription response:', result);
		} catch (authError) {
			console.error('Authorize.net API error:', authError);
			console.error('Error details:', authError.message, authError.stack);
			throw new Error(`Payment gateway error: ${authError.message}`);
		}

		if (result.success) {
			console.log('Authorize.net subscription created! Subscription ID:', result.subscriptionId);

			// Calculate dates
			const subscriptionStartDate = new Date();
			const nextBillingDate = calculateNextBillingDate(subscriptionStartDate, subscriptionType);

			// Update user role to premium and save subscription details
			await db.update(userTable)
				.set({
					role: 'premium',
					subscriptionId: result.subscriptionId,
					subscriptionType,
					subscriptionStatus: 'active',
					subscriptionStartDate,
					subscriptionEndDate: null, // No end date for active subscriptions
					nextBillingDate
				})
				.where(eq(userTable.id, currentUser.id));

			console.log('User role updated to premium with subscription details saved');

			// Invalidate current session and create new one with updated role
			if (locals.session) {
				await auth.invalidateSession(locals.session.id);
				console.log('Old session invalidated');
			}

			// Create new session with updated user data
			const newSession = await auth.createSession(currentUser.id, {});
			const sessionCookie = auth.createSessionCookie(newSession.id);

			console.log('New session created with updated role');

			// Record the order
			await db.insert(order).values({
				provider: 'authnet',
				providerRef: result.subscriptionId,
				userEmail: currentUser.email,
				amount,
				currency: 'USD',
				meta: {
					type: 'subscription',
					subscriptionId: result.subscriptionId,
					subscriptionType,
					description
				}
			});

			console.log('Order recorded in database');

			return json(
				{
					success: true,
					subscriptionId: result.subscriptionId,
					subscriptionType,
					nextBillingDate: nextBillingDate.toISOString(),
					redirectUrl: '/account?tab=plan'
				},
				{
					headers: {
						'Set-Cookie': sessionCookie.serialize()
					}
				}
			);
		} else {
			console.error('Authorize.net subscription creation failed');
			return json({ error: 'Subscription creation failed' }, { status: 500 });
		}
	} catch (err) {
		console.error('Subscription error:', err);
		return json({ error: err.message || 'Payment processing failed' }, { status: 500 });
	}
}
