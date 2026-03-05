import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, savedCard, ticket } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export async function load({ params, locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, `/login?redirect=/events/${params.eventId}/checkout`);
	}

	try {
		// Fetch event details and saved cards in parallel
		const [eventData, userSavedCards] = await Promise.all([
			db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1)
				.then((rows) => rows[0]),
			db.select().from(savedCard).where(eq(savedCard.userId, locals.user.id))
		]);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// Check capacity — redirect if full
		if (eventData.playerCap !== null && eventData.playerCap !== undefined) {
			const [{ count: activeCount }] = await db
				.select({ count: sql`count(*)::int` })
				.from(ticket)
				.where(and(eq(ticket.eventId, params.eventId), eq(ticket.refunded, false)));

			if (activeCount >= eventData.playerCap) {
				throw redirect(302, `/age-open?full=${params.eventId}`);
			}
		}

		// Calculate price (with premium discount if applicable)
		let finalPrice = parseFloat(eventData.price);
		const isPremium = locals.user.role === 'premium' || locals.user.role === 'admin';

		if (eventData.premiumDiscount && isPremium) {
			finalPrice = finalPrice * 0.9; // 10% discount
		}

		return {
			user: locals.user,
			event: eventData,
			finalPrice: finalPrice.toFixed(2),
			hasPremiumDiscount: eventData.premiumDiscount && isPremium,
			savedCards: userSavedCards,
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
