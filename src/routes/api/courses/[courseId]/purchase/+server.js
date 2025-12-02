import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { entitlement, order, savedCard, user } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Purchase a course (one-time payment)
 */
export async function POST({ params, request, locals }) {
	try {
		const { courseId } = params;
		const currentUser = locals.user;

		if (!currentUser) {
			return json({ error: 'You must be logged in to purchase a course' }, { status: 401 });
		}

		const body = await request.json();
		const {
			amount,
			cardNumber,
			expirationDate,
			cardCode,
			description,
			billTo,
			// Saved card fields
			useSavedCard,
			savedCardId,
			// Save card option
			saveCard
		} = body;

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

			// Process payment with saved card
			result = await authnet.chargeCustomerProfile({
				customerProfileId: card.customerProfileId,
				paymentProfileId: card.paymentProfileId,
				amount,
				description
			});
		} else {
			// Process one-time payment with new card
			result = await authnet.chargeCard({
				amount,
				cardNumber,
				expirationDate,
				cardCode,
				description,
				billTo
			});

			// If payment successful and user wants to save card, save it
			if (result.success && saveCard) {
				try {
					// Get or create customer profile
					const profileId = await authnet.getOrCreateCustomerProfile({
						email: currentUser.email,
						description: `Customer: ${currentUser.email}`
					});

					// Save customer profile ID to user if not already saved
					if (profileId) {
						await db
							.update(user)
							.set({ customerProfileId: profileId })
							.where(eq(user.id, currentUser.id));

						// Add payment profile
						const paymentProfile = await authnet.addPaymentProfile({
							customerProfileId: profileId,
							cardNumber,
							expirationDate,
							cardCode,
							billTo
						});

						if (paymentProfile) {
							// Check if card already exists (by last four and expiration)
							const [existingCard] = await db
								.select()
								.from(savedCard)
								.where(
									and(
										eq(savedCard.userId, currentUser.id),
										eq(savedCard.lastFour, paymentProfile.lastFour)
									)
								)
								.limit(1);

							if (!existingCard) {
								// Check if user has any saved cards (to set default)
								const userCards = await db
									.select()
									.from(savedCard)
									.where(eq(savedCard.userId, currentUser.id))
									.limit(1);

								const isFirstCard = userCards.length === 0;

								// Save the card to database
								await db.insert(savedCard).values({
									userId: currentUser.id,
									customerProfileId: profileId,
									paymentProfileId: paymentProfile.paymentProfileId,
									cardType: paymentProfile.cardType,
									lastFour: paymentProfile.lastFour,
									expirationMonth: paymentProfile.expirationMonth,
									expirationYear: paymentProfile.expirationYear,
									isDefault: isFirstCard
								});
							}
						}
					}
				} catch (saveError) {
					// Log but don't fail the purchase if card save fails
					console.error('Error saving card:', saveError);
				}
			}
		}

		if (result.success) {
			// Grant course entitlement
			const [newEntitlement] = await db.insert(entitlement).values({
				userId: currentUser.id,
				product: courseId
			}).returning();

			// Record the order
			await db.insert(order).values({
				provider: 'authnet',
				providerRef: result.transactionId,
				userEmail: currentUser.email,
				amount,
				currency: 'USD',
				meta: {
					type: 'course',
					courseId,
					entitlementId: newEntitlement.id,
					transactionId: result.transactionId
				}
			});

			return json({
				success: true,
				entitlementId: newEntitlement.id,
				redirectUrl: `/courses/${courseId}`
			});
		} else {
			return json({ error: result.error || 'Payment failed' }, { status: 500 });
		}
	} catch (err) {
		console.error('Course purchase error:', err);
		return json({ error: err.message || 'Payment processing failed' }, { status: 500 });
	}
}
