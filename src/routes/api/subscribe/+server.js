import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { user as userTable, order } from '$lib/server/db/schema.js';
import { auth } from '$lib/server/lucia.js';
import { eq } from 'drizzle-orm';

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

		// Check if already premium
		if (currentUser.role === 'premium' || currentUser.role === 'admin') {
			return json({ error: 'You already have premium access' }, { status: 400 });
		}

		const body = await request.json();
		const { amount, cardNumber, expirationDate, cardCode, description, billTo } = body;

		console.log('Creating subscription for:', currentUser.email, 'Amount:', amount);
		console.log('Payment details:', { cardNumber: cardNumber.slice(-4), expirationDate });

		// Create recurring subscription with Authorize.net ARB
		let result;
		try {
			console.log('Creating recurring subscription for premium...');

			// Calculate start date (today)
			const startDate = new Date().toISOString().split('T')[0];

			result = await authnet.createSubscription({
				amount,
				cardNumber,
				expirationDate,
				cardCode,
				email: currentUser.email,
				subscriptionName: 'Premium Monthly Subscription',
				intervalLength: 1,
				intervalUnit: 'months',
				startDate,
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

			// Update user role to premium and save subscription ID
			await db.update(userTable)
				.set({
					role: 'premium',
					subscriptionId: result.subscriptionId
				})
				.where(eq(userTable.id, currentUser.id));

			console.log('User role updated to premium and subscription ID saved');

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
					description
				}
			});

			console.log('Order recorded in database');

			return json(
				{
					success: true,
					subscriptionId: result.subscriptionId,
					redirectUrl: '/premium'
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
