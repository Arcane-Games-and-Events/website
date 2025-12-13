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

		// Compute status for each event
		const assignedEvents = assignments.map((a) => {
			let computedStatus = a.eventStatus;
			if (a.eventStatus !== 'completed' && a.eventStatus !== 'cancelled') {
				const now = new Date();
				const eventDate = a.eventDate ? new Date(a.eventDate) : null;
				if (eventDate) {
					if (now < eventDate) {
						computedStatus = 'upcoming';
					} else {
						computedStatus = 'in_progress';
					}
				}
			}
			return {
				...a,
				computedStatus
			};
		});

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
