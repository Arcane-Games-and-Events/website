import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
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

		return {
			event: eventData,
			user: locals.user || null,
			isPremium,
			hasPremiumDiscount,
			finalPrice: finalPrice.toFixed(2)
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event:', err);
		throw error(500, 'Failed to load event details');
	}
}
