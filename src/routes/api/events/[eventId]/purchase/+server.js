import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { ticket, order, event as eventTable, player, playerAlias } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Links a player by GEM ID when they register for an event.
 * This reconciles historical name-based records with GEM IDs.
 *
 * @param {string} gemId - The player's GEM ID
 * @param {string} playerName - The player's current name (firstName + lastName)
 * @returns {Promise<string|null>} - The player ID if linked/created, null if no gemId provided
 */
async function linkPlayerByGemId(gemId, playerName) {
	if (!gemId || !playerName) return null;

	try {
		// 1. Check if player with this GEM ID already exists
		const [existingPlayer] = await db
			.select()
			.from(player)
			.where(eq(player.gemId, gemId))
			.limit(1);

		if (existingPlayer) {
			// Player already linked - add this name as alias if new
			const [existingAlias] = await db
				.select()
				.from(playerAlias)
				.where(eq(playerAlias.aliasName, playerName))
				.limit(1);

			if (!existingAlias) {
				// Add new alias for this player
				await db.insert(playerAlias).values({
					playerId: existingPlayer.id,
					aliasName: playerName
				});
			}
			return existingPlayer.id;
		}

		// 2. Check if playerName exists as alias (from historical data)
		const [existingAlias] = await db
			.select()
			.from(playerAlias)
			.where(eq(playerAlias.aliasName, playerName))
			.limit(1);

		if (existingAlias) {
			// Link GEM ID to existing player
			await db
				.update(player)
				.set({ gemId, updatedAt: new Date() })
				.where(eq(player.id, existingAlias.playerId));
			return existingAlias.playerId;
		}

		// 3. Create new player with GEM ID
		const [newPlayer] = await db
			.insert(player)
			.values({
				displayName: playerName,
				gemId
			})
			.returning();

		// Create alias for this player name
		await db.insert(playerAlias).values({
			playerId: newPlayer.id,
			aliasName: playerName
		});

		return newPlayer.id;
	} catch (err) {
		console.error('Error linking player by GEM ID:', err);
		return null;
	}
}

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
		const { amount, cardNumber, expirationDate, cardCode, description, billTo, gemId } = body;

		// Verify event exists
		const [eventData] = await db.select().from(eventTable).where(eq(eventTable.id, eventId));
		if (!eventData) {
			return json({ error: 'Event not found' }, { status: 404 });
		}

		// Validate Gem ID if required
		if (eventData.gemIdRequired && !gemId) {
			return json({ error: 'Gem ID is required for this event' }, { status: 400 });
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

		// Process one-time payment
		const result = await authnet.chargeCard({
			amount,
			cardNumber,
			expirationDate,
			cardCode,
			description: description || `Ticket for ${eventData.title}`,
			billTo
		});

		if (result.success) {
			// Generate unique ticket code
			const ticketCode = crypto.randomBytes(8).toString('hex').toUpperCase();

			// Create ticket record with new fields
			const [newTicket] = await db.insert(ticket).values({
				userId: currentUser.id,
				eventId,
				code: ticketCode,
				quantity: 1,
				firstName: billTo?.firstName || null,
				lastName: billTo?.lastName || null,
				gemId: gemId || null,
				amountPaid: parseFloat(amount).toFixed(2),
				transactionId: result.transactionId,
				enteredIntoGem: false
			}).returning();

			// Link player by GEM ID for standings tracking
			// This reconciles historical name-based records with GEM IDs
			const playerName = [billTo?.firstName, billTo?.lastName].filter(Boolean).join(' ');
			if (gemId && playerName) {
				await linkPlayerByGemId(gemId, playerName);
			}

			// Record the order
			await db.insert(order).values({
				provider: 'authnet',
				providerRef: result.transactionId,
				userEmail: currentUser.email,
				amount,
				currency: 'USD',
				meta: {
					type: 'ticket',
					eventId,
					eventTitle: eventData.title,
					ticketId: newTicket.id,
					ticketCode,
					gemId: gemId || null,
					transactionId: result.transactionId,
					premiumDiscount: eventData.premiumDiscount && isPremium
				}
			});

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
