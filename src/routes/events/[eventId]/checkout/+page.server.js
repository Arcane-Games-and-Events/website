import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ params, url }) {
	const { eventId } = params;
	const quantity = parseInt(url.searchParams.get('quantity') || '1', 10);

	// Fetch event from database
	const events = await db.select().from(event).where(eq(event.id, eventId));

	if (events.length === 0) {
		throw error(404, 'Event not found');
	}

	const eventData = events[0];

	// You'll need to add a price field to your event schema
	// For now, we'll use a placeholder
	return {
		event: {
			id: eventData.id,
			title: eventData.title,
			price: '25.00' // This should come from the database
		},
		quantity
	};
}
