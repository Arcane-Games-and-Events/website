import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';

export async function load() {
	try {
		const events = await db.select().from(event);
		return { events };
	} catch (error) {
		console.error('Error loading events:', error);
		return { events: [] };
	}
}
