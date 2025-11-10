import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
import { asc } from 'drizzle-orm';

export async function load() {
	try {
		// Get events sorted by date (upcoming first)
		const events = await db
			.select()
			.from(event)
			.orderBy(asc(event.eventDate));
		return { events };
	} catch (error) {
		console.error('Error loading events:', error);
		return { events: [] };
	}
}
