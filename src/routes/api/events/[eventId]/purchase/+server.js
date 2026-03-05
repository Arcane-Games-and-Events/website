import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { ticket, order, event as eventTable, savedCard, user } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Purchase event tickets (one-time payment)
 */
export async function POST({ params, request, locals }) {
	try {
		const { eventId } = params;
		const currentUser = locals.user;

		// Require authentication
		if (!currentUser) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const body = await request.json();
		const {
			amount,
			cardNumber,
			expirationDate,
			cardCode,
			description,
			billTo,
			gemId,
			// Saved card fields
			useSavedCard,
			savedCardId,
			customerProfileId,
			paymentProfileId,
			// Save card option
			saveCard
		} = body;

		// Verify event exists
		const [eventData] = await db.select().from(eventTable).where(eq(eventTable.id, eventId));
		if (!eventData) {
			return json({ error: 'Event not found' }, { status: 404 });
		}

		// Validate Gem ID if required
		if (eventData.gemIdRequired && !gemId) {
			return json({ error: 'Gem ID is required for this event' }, { status: 400 });
		}

		// Check capacity if player cap is set
		if (eventData.playerCap !== null && eventData.playerCap !== undefined) {
			const [{ count: activeTicketCount }] = await db
				.select({ count: sql`count(*)::int` })
				.from(ticket)
				.where(and(eq(ticket.eventId, eventId), eq(ticket.refunded, false)));

			if (activeTicketCount >= eventData.playerCap) {
				return json({ error: 'Event is full', full: true }, { status: 409 });
			}
		}

		// Calculate expected price with premium discount
		let expectedPrice = parseFloat(eventData.price);
		const isPremium = currentUser.role === 'premium' || currentUser.role === 'admin';

		if (eventData.premiumDiscount && isPremium) {
			expectedPrice = expectedPrice * 0.9; // 10% discount
		}

		// Validate amount matches expected price
		if (Math.abs(parseFloat(amount) - expectedPrice) > 0.01) {
			return json({ error: 'Invalid payment amount' }, { status: 400 });
		}

		let result;
		let cardLastFour = null;

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

			cardLastFour = card.lastFour;

			// Process payment with saved card
			result = await authnet.chargeCustomerProfile({
				customerProfileId: card.customerProfileId,
				paymentProfileId: card.paymentProfileId,
				amount,
				description: description || `Ticket for ${eventData.title}`
			});
		} else {
			// Process one-time payment with new card
			cardLastFour = cardNumber ? cardNumber.slice(-4) : null;
			result = await authnet.chargeCard({
				amount,
				cardNumber,
				expirationDate,
				cardCode,
				description: description || `Ticket for ${eventData.title}`,
				billTo
			});

			// If payment successful and user wants to save card, save it
			if (result.success && saveCard) {
				try {
					// Get or create customer profile
					const profileResult = await authnet.getOrCreateCustomerProfile({
						customerId: currentUser.id,
						email: currentUser.email
					});

					// Save customer profile ID to user if not already saved
					if (profileResult && profileResult.customerProfileId) {
						await db
							.update(user)
							.set({ customerProfileId: profileResult.customerProfileId })
							.where(eq(user.id, currentUser.id));

						// Add payment profile
						const paymentProfile = await authnet.addPaymentProfile({
							customerProfileId: profileResult.customerProfileId,
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
									customerProfileId: profileResult.customerProfileId,
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
			// Generate unique ticket code
			const ticketCode = crypto.randomBytes(8).toString('hex').toUpperCase();

			// Create order record first (so we can link ticket to it)
			const [newOrder] = await db
				.insert(order)
				.values({
					provider: 'authnet',
					providerRef: result.transactionId,
					userEmail: currentUser.email,
					amount,
					currency: 'USD',
					meta: {
						type: 'ticket',
						eventId,
						eventTitle: eventData.title,
						ticketCode,
						gemId: gemId || null,
						transactionId: result.transactionId,
						premiumDiscount: eventData.premiumDiscount && isPremium,
						cardLastFour
					}
				})
				.returning();

			// Create ticket record with orderId link
			// Use billTo name if provided, otherwise fall back to user's account name
			const [newTicket] = await db
				.insert(ticket)
				.values({
					userId: currentUser.id,
					eventId,
					orderId: newOrder.id,
					code: ticketCode,
					quantity: 1,
					firstName: billTo?.firstName || currentUser.firstName || null,
					lastName: billTo?.lastName || currentUser.lastName || null,
					gemId: gemId || null,
					amountPaid: parseFloat(amount).toFixed(2),
					transactionId: result.transactionId,
					enteredIntoGem: false
				})
				.returning();

			// Update order meta with ticketId for backwards compatibility
			await db
				.update(order)
				.set({ meta: { ...newOrder.meta, ticketId: newTicket.id } })
				.where(eq(order.id, newOrder.id));

			return json({
				success: true,
				ticketCode,
				ticketId: newTicket.id,
				redirectUrl: `/events/${eventId}/ticket/${newTicket.id}`
			});
		} else {
			return json({ error: result.error || 'Payment failed' }, { status: 500 });
		}
	} catch (err) {
		console.error('Ticket purchase error:', err);
		return json({ error: err.message || 'Payment processing failed' }, { status: 500 });
	}
}
