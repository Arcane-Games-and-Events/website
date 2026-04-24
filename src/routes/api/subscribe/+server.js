import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import {
	user as userTable,
	order,
	savedCard,
	articleEngagement,
	partnerReferral
} from '$lib/server/db/schema.js';
import { auth } from '$lib/server/lucia.js';
import { eq, and, gte } from 'drizzle-orm';
import {
	validatePartnerCode,
	normalizePartnerCode,
	PARTNER_DISCOUNT_AMOUNT
} from '$lib/server/partner-code.js';

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
			saveCard,
			// Partner program
			promoCode
		} = body;

		// Validate subscription type
		if (!['monthly', 'yearly'].includes(subscriptionType)) {
			return json({ error: 'Invalid subscription type' }, { status: 400 });
		}

		// Validate partner code if supplied
		let partnerValidation = null;
		const normalizedCode = normalizePartnerCode(promoCode);
		if (normalizedCode) {
			partnerValidation = await validatePartnerCode(normalizedCode, currentUser.id);
			if (!partnerValidation.valid) {
				const messages = {
					not_found: 'Promo code not found',
					inactive: 'This promo code is no longer active',
					already_used: 'You have already used a partner promo code',
					self_referral: "You can't redeem your own partner code"
				};
				return json(
					{ error: messages[partnerValidation.reason] || 'Invalid promo code' },
					{ status: 400 }
				);
			}
		}
		const hasPartnerDiscount = partnerValidation?.valid === true;

		// Create recurring subscription with Authorize.net ARB
		let result;
		let firstChargeResult = null; // Only set when partner code applied
		try {
			// Start date logic:
			// - Normal flow: ARB starts today
			// - Partner flow: charge $5 today + ARB starts 1 period from now
			const today = new Date();
			const todayStr = today.toISOString().split('T')[0];
			const deferredStart = calculateNextBillingDate(today, subscriptionType);
			const deferredStartStr = deferredStart.toISOString().split('T')[0];

			const arbStartDateStr = hasPartnerDiscount ? deferredStartStr : todayStr;

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

				// Partner flow: charge $5 one-time first
				if (hasPartnerDiscount) {
					firstChargeResult = await authnet.chargeCustomerProfile({
						customerProfileId: card.customerProfileId,
						paymentProfileId: card.paymentProfileId,
						amount: PARTNER_DISCOUNT_AMOUNT.toFixed(2),
						description: `AGE Premium — First ${subscriptionType === 'yearly' ? 'year' : 'month'} (partner discount)`
					});
					if (!firstChargeResult?.success) {
						return json(
							{ error: 'First-month charge failed. Please try a different card.' },
							{ status: 402 }
						);
					}
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
					startDate: arbStartDateStr,
					totalOccurrences: 9999
				});
			} else {
				// Validate new card details
				if (!cardNumber || !expirationDate || !cardCode) {
					return json({ error: 'Card details are required' }, { status: 400 });
				}

				// Partner flow: charge $5 one-time first
				if (hasPartnerDiscount) {
					firstChargeResult = await authnet.chargeCard({
						cardNumber,
						expirationDate,
						cardCode,
						amount: PARTNER_DISCOUNT_AMOUNT.toFixed(2),
						description: `AGE Premium — First ${subscriptionType === 'yearly' ? 'year' : 'month'} (partner discount)`,
						billTo
					});
					if (!firstChargeResult?.success) {
						return json(
							{ error: 'First-month charge failed. Please try a different card.' },
							{ status: 402 }
						);
					}
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
					startDate: arbStartDateStr,
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

							// Add payment profile to customer profile
							const paymentProfileResult = await authnet.addPaymentProfile({
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
									lastFour: cardNumber.slice(-4),
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
			// Partner flow: user is premium now (via the $5 charge), ARB kicks in at next billing
			// Normal flow: ARB starts today, next billing is 1 period out
			const subscriptionStartDate = new Date();
			const nextBillingDate = calculateNextBillingDate(subscriptionStartDate, subscriptionType);

			// Update user role to premium and save subscription details
			const userUpdate = {
				role: 'premium',
				subscriptionId: result.subscriptionId,
				subscriptionType,
				subscriptionStatus: 'active',
				subscriptionStartDate,
				subscriptionEndDate: null, // No end date for active subscriptions
				nextBillingDate
			};
			if (hasPartnerDiscount) {
				userUpdate.usedPartnerCode = normalizedCode;
			}
			await db.update(userTable).set(userUpdate).where(eq(userTable.id, currentUser.id));

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

			// Partner flow: only record the $5 real charge (the ARB is deferred — no money yet)
			// Normal flow: record the ARB as today's $10/$110 charge (it charges immediately)
			if (hasPartnerDiscount && firstChargeResult?.success) {
				const [firstChargeOrder] = await db
					.insert(order)
					.values({
						provider: 'authnet',
						providerRef: firstChargeResult.transactionId,
						userEmail: currentUser.email,
						amount: PARTNER_DISCOUNT_AMOUNT.toFixed(2),
						currency: 'USD',
						meta: {
							type: 'subscription_partner_first',
							subscriptionId: result.subscriptionId,
							subscriptionType,
							partnerCode: normalizedCode,
							deferredArbAmount: amount,
							description: `AGE Premium first ${subscriptionType === 'yearly' ? 'year' : 'month'} (partner discount)`
						}
					})
					.returning({ id: order.id });

				await db.insert(partnerReferral).values({
					partnerId: partnerValidation.partner.id,
					referredUserId: currentUser.id,
					code: normalizedCode,
					subscriptionType,
					discountAmount: PARTNER_DISCOUNT_AMOUNT.toFixed(2),
					commissionAmount: PARTNER_DISCOUNT_AMOUNT.toFixed(2),
					firstChargeOrderId: firstChargeOrder.id,
					payoutStatus: 'pending'
				});
			} else {
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
			}

			console.log('Order recorded in database');

			// Conversion attribution: mark recent article reads as leading to upgrade
			try {
				const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
				await db
					.update(articleEngagement)
					.set({ upgradedAfter: true })
					.where(
						and(
							eq(articleEngagement.userId, currentUser.id),
							gte(articleEngagement.createdAt, sevenDaysAgo)
						)
					);
			} catch {
				// Silent fail — conversion attribution should never block subscription
			}

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
