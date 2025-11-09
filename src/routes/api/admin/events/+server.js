import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';

/**
 * Create a new event (Admin only)
 */
export async function POST({ request, locals }) {
	try {
		// Ensure user is admin
		const currentUser = locals.user;
		if (!currentUser || currentUser.role !== 'admin') {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const body = await request.json();
		const { id, title, price, description } = body;

		// Validate required fields
		if (!id || !title || !price) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Create event
		const [newEvent] = await db.insert(event).values({
			id,
			title,
			price
		}).returning();

		return json({
			success: true,
			event: newEvent
		});
	} catch (err) {
		console.error('Event creation error:', err);

		// Check for duplicate ID error
		if (err.message?.includes('duplicate') || err.code === '23505') {
			return json({ error: 'An event with this ID already exists' }, { status: 400 });
		}

		return json({ error: 'Failed to create event' }, { status: 500 });
	}
}
