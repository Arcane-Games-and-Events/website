import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, eventStaff, ticket } from '$lib/server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';

export async function load({ locals }) {
	// Require tournament staff authentication
	if (!locals.user || locals.user.role !== 'tournament_staff') {
		throw redirect(302, '/login?redirect=/staff');
	}

	try {
		// Fetch events assigned to this staff member
		const staffAssignments = await db
			.select({
				eventId: eventStaff.eventId,
				assignedAt: eventStaff.createdAt
			})
			.from(eventStaff)
			.where(eq(eventStaff.userId, locals.user.id));

		// Fetch full event details for assigned events
		const assignedEventIds = staffAssignments.map(a => a.eventId);

		let assignedEvents = [];
		if (assignedEventIds.length > 0) {
			// Fetch all assigned events at once
			const events = await db
				.select()
				.from(event)
				.where(inArray(event.id, assignedEventIds));

			// Get ticket counts for each event
			for (const eventData of events) {
				const tickets = await db
					.select()
					.from(ticket)
					.where(eq(ticket.eventId, eventData.id));

				assignedEvents.push({
					...eventData,
					ticketCount: tickets.filter(t => !t.refunded).length,
					refundCount: tickets.filter(t => t.refunded).length
				});
			}
		}

		return {
			user: locals.user,
			assignedEvents
		};
	} catch (error) {
		console.error('Staff page load error:', error);
		return {
			user: locals.user,
			assignedEvents: []
		};
	}
}
