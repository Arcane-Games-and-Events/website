import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ params, locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, `/login?redirect=/events/${params.eventId}/checkout`);
	}

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
			hasPremiumDiscount: eventData.premiumDiscount && isPremium
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event:', err);
		throw error(500, 'Failed to load event details');
	}
}
