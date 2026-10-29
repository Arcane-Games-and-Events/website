import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { eventStaff, event } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	try {
		// Fetch all events the user is assigned to
		const assignments = await db
			.select({
				assignmentId: eventStaff.id,
				assignedAt: eventStaff.createdAt,
				eventId: event.id,
				eventTitle: event.title,
				eventDate: event.eventDate,
				eventLocation: event.location,
				eventFormat: event.format,
				eventCircuit: event.circuit,
				eventStatus: event.status
			})
			.from(eventStaff)
			.innerJoin(event, eq(eventStaff.eventId, event.id))
			.where(eq(eventStaff.userId, locals.user.id))
			.orderBy(event.eventDate);

		// The stored status is the status; nothing is inferred from the date.
		const assignedEvents = assignments.map((a) => ({ ...a, status: a.eventStatus || 'upcoming' }));

		return {
			user: locals.user,
			assignedEvents
		};
	} catch (err) {
		console.error('Error loading assigned events:', err);
		return {
			user: locals.user,
			assignedEvents: []
		};
	}
}
