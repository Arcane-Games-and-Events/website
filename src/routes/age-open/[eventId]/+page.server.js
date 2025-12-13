import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, savedCard, ticket } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export async function load({ params, locals }) {
	try {
		// Fetch event details
		const [eventData] = await db.select().from(event).where(eq(event.id, params.eventId)).limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// Check if user is premium for discount display
		const isPremium = locals.user?.role === 'premium' || locals.user?.role === 'admin';
		const hasPremiumDiscount = eventData.premiumDiscount && isPremium;

		// Calculate discounted price if applicable
		let finalPrice = parseFloat(eventData.price);
		if (hasPremiumDiscount) {
			finalPrice = finalPrice * 0.9;
		}

		// Get user's GEM ID if they have one linked to their account
		const userGemId = locals.user?.gemId || null;
		const userFirstName = locals.user?.firstName || '';
		const userLastName = locals.user?.lastName || '';

		// Fetch saved cards if user is logged in
		let userSavedCards = [];
		let userTicket = null;
		if (locals.user) {
			userSavedCards = await db
				.select()
				.from(savedCard)
				.where(eq(savedCard.userId, locals.user.id));

			// Check if user already has tickets for this event
			const existingTickets = await db
				.select()
				.from(ticket)
				.where(
					and(
						eq(ticket.userId, locals.user.id),
						eq(ticket.eventId, params.eventId),
						eq(ticket.refunded, false)
					)
				);

			userTicket = existingTickets.length > 0 ? existingTickets : null;
		}

		return {
			event: eventData,
			user: locals.user || null,
			isPremium,
			hasPremiumDiscount,
			finalPrice: finalPrice.toFixed(2),
			userGemId,
			userFirstName,
			userLastName,
			savedCards: userSavedCards,
			userTicket,
			isSandbox: env.AUTHNET_ENVIRONMENT === 'sandbox'
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event:', err);
		throw error(500, 'Failed to load event details');
	}
}
