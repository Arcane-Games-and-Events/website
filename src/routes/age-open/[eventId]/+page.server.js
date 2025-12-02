import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, savedCard } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ params, locals }) {
	try {
		// Fetch event details
		const [eventData] = await db
			.select()
			.from(event)
			.where(eq(event.id, params.eventId))
			.limit(1);

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
		if (locals.user) {
			userSavedCards = await db
				.select()
				.from(savedCard)
				.where(eq(savedCard.userId, locals.user.id));
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
			savedCards: userSavedCards
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event:', err);
		throw error(500, 'Failed to load event details');
	}
}
