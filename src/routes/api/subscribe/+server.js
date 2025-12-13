import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { user as userTable, order, savedCard } from '$lib/server/db/schema.js';
import { auth } from '$lib/server/lucia.js';
import { eq, and } from 'drizzle-orm';

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
	try {
		// Ensure user is logged in
		const currentUser = locals.user;

		if (!currentUser) {
			return json({ error: 'You must be logged in to subscribe' }, { status: 401 });
		}

		// Check if already premium with active subscription
		if (
			(currentUser.role === 'premium' && currentUser.subscriptionStatus === 'active') ||
			currentUser.role === 'admin'
		) {
			return json({ error: 'You already have premium access' }, { status: 400 });
		}

		const body = await request.json();
		const {
			amount,
			cardNumber,
			expirationDate,
			cardCode,
			description,
			billTo,
			subscriptionType = 'monthly',
			// Saved card fields
			useSavedCard,
			savedCardId,
			// Save card option
			saveCard
		} = body;

		// Validate subscription type
		if (!['monthly', 'yearly'].includes(subscriptionType)) {
			return json({ error: 'Invalid subscription type' }, { status: 400 });
		}

		// Create recurring subscription with Authorize.net ARB
		let result;
		try {
			// Calculate start date (today)
			const startDate = new Date();
			const startDateStr = startDate.toISOString().split('T')[0];

			// Configure interval based on subscription type
			const intervalLength = subscriptionType === 'yearly' ? 12 : 1;
			// Include timestamp to prevent duplicate subscription errors when resubscribing
			const timestamp = Date.now().toString(36);
			const subscriptionName =
				subscriptionType === 'yearly'
					? `AGE Premium Yearly - ${timestamp}`
					: `AGE Premium Monthly - ${timestamp}`;

			if (useSavedCard && savedCardId) {
				// Verify the saved card belongs to the user
				const [card] = await db
					.select()
					.from(savedCard)
					.where(and(eq(savedCard.id, savedCardId), eq(savedCard.userId, currentUser.id)))
					.limit(1);

				if (!card) {
					return json({ error: 'Saved card not found' }, { status: 404 });
				}

				// Create subscription from customer profile
				result = await authnet.createSubscriptionFromCustomerProfile({
					customerProfileId: card.customerProfileId,
					paymentProfileId: card.paymentProfileId,
					amount,
					email: currentUser.email,
					subscriptionName,
					intervalLength,
					intervalUnit: 'months',
					startDate: startDateStr,
					totalOccurrences: 9999
				});
			} else {
				// Validate new card details
				if (!cardNumber || !expirationDate || !cardCode) {
					return json({ error: 'Card details are required' }, { status: 400 });
				}

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
						firstName: billTo?.firstName,
						lastName: billTo?.lastName
					}
				});

				// If subscription created and user wants to save card, save it
				if (result.success && saveCard) {
					try {
						// Get or create customer profile
						const profileResult = await authnet.getOrCreateCustomerProfile({
							customerId: currentUser.id,
							email: currentUser.email
						});

						if (profileResult && profileResult.customerProfileId) {
							// Update user with customer profile ID
							await db
								.update(userTable)
								.set({ customerProfileId: profileResult.customerProfileId })
								.where(eq(userTable.id, currentUser.id));

							// Create payment profile
							const paymentProfileResult = await authnet.createPaymentProfile({
								customerProfileId: profileResult.customerProfileId,
								cardNumber,
								expirationDate,
								cardCode,
								billTo
							});

							if (paymentProfileResult && paymentProfileResult.paymentProfileId) {
								// Save the card to database
								await db.insert(savedCard).values({
									userId: currentUser.id,
									customerProfileId: profileResult.customerProfileId,
									paymentProfileId: paymentProfileResult.paymentProfileId,
									lastFourDigits: cardNumber.slice(-4),
									cardType: paymentProfileResult.cardType || 'Unknown',
									expirationMonth: expirationDate.split('/')[0] || expirationDate.substring(0, 2),
									expirationYear: expirationDate.split('/')[1] || expirationDate.substring(2)
								});
							}
						}
					} catch (saveCardError) {
						console.error('Failed to save card:', saveCardError);
						// Don't fail the subscription if saving card fails
					}
				}
			}
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
			await db
				.update(userTable)
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
					redirectUrl: '/premium/confirmation'
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
