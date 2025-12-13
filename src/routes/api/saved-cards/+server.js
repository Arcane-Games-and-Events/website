import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { savedCard, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { authnet } from '$lib/server/authnet/client.js';

/**
 * GET /api/saved-cards
 * Get all saved cards for the current user
 */
export async function GET({ locals }) {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const cards = await db
			.select({
				id: savedCard.id,
				cardType: savedCard.cardType,
				lastFour: savedCard.lastFour,
				expirationMonth: savedCard.expirationMonth,
				expirationYear: savedCard.expirationYear,
				isDefault: savedCard.isDefault,
				nickname: savedCard.nickname,
				createdAt: savedCard.createdAt
			})
			.from(savedCard)
			.where(eq(savedCard.userId, locals.user.id))
			.orderBy(savedCard.createdAt);

		return json({ cards });
	} catch (err) {
		console.error('Error fetching saved cards:', err);
		throw error(500, 'Failed to fetch saved cards');
	}
}

/**
 * POST /api/saved-cards
 * Add a new saved card
 */
export async function POST({ request, locals }) {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const body = await request.json();
		const { cardNumber, expirationDate, cardCode, billTo, nickname, setAsDefault } = body;

		// Validate required fields
		if (!cardNumber || !expirationDate || !cardCode) {
			throw error(400, 'Card number, expiration date, and CVV are required');
		}

		// Get or create customer profile
		let customerProfileId = locals.user.customerProfileId;

		if (!customerProfileId) {
			// Create customer profile in Authorize.net
			const profileResult = await authnet.getOrCreateCustomerProfile({
				customerId: locals.user.id,
				email: locals.user.email
			});

			customerProfileId = profileResult.customerProfileId;

			// Save customer profile ID to user
			await db.update(user).set({ customerProfileId }).where(eq(user.id, locals.user.id));
		}

		// Add payment profile to Authorize.net
		const paymentResult = await authnet.addPaymentProfile({
			customerProfileId,
			cardNumber,
			expirationDate,
			cardCode,
			billTo
		});

		// If setting as default, unset other defaults
		if (setAsDefault) {
			await db
				.update(savedCard)
				.set({ isDefault: false })
				.where(eq(savedCard.userId, locals.user.id));
		}

		// Check if this is the first card (make it default automatically)
		const existingCards = await db
			.select()
			.from(savedCard)
			.where(eq(savedCard.userId, locals.user.id));

		const isFirstCard = existingCards.length === 0;

		// Save card to database
		const [newCard] = await db
			.insert(savedCard)
			.values({
				userId: locals.user.id,
				customerProfileId,
				paymentProfileId: paymentResult.paymentProfileId,
				cardType: paymentResult.cardType,
				lastFour: paymentResult.lastFour,
				expirationMonth: paymentResult.expirationMonth,
				expirationYear: paymentResult.expirationYear,
				isDefault: setAsDefault || isFirstCard,
				nickname: nickname || null
			})
			.returning();

		return json({
			success: true,
			card: {
				id: newCard.id,
				cardType: newCard.cardType,
				lastFour: newCard.lastFour,
				expirationMonth: newCard.expirationMonth,
				expirationYear: newCard.expirationYear,
				isDefault: newCard.isDefault,
				nickname: newCard.nickname
			}
		});
	} catch (err) {
		console.error('Error adding saved card:', err);
		throw error(500, err.message || 'Failed to add card');
	}
}
