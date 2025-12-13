import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, ticket, user, eventStaff } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function load({ params, locals }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Check if user is assigned to this event
	const assignment = await db
		.select()
		.from(eventStaff)
		.where(and(eq(eventStaff.userId, locals.user.id), eq(eventStaff.eventId, params.eventId)))
		.limit(1);

	if (assignment.length === 0) {
		throw error(403, 'You are not assigned to this event');
	}

	try {
		// Fetch event details
		const [eventData] = await db.select().from(event).where(eq(event.id, params.eventId)).limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// Compute dynamic status
		let computedStatus = eventData.status;
		if (eventData.status !== 'completed' && eventData.status !== 'cancelled') {
			const now = new Date();
			const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : null;
			if (eventDate) {
				if (now < eventDate) {
					computedStatus = 'upcoming';
				} else {
					computedStatus = 'in_progress';
				}
			}
		}
		eventData.computedStatus = computedStatus;

		// Fetch all tickets for this event with user information
		const tickets = await db
			.select({
				ticketId: ticket.id,
				ticketCode: ticket.code,
				quantity: ticket.quantity,
				firstName: ticket.firstName,
				lastName: ticket.lastName,
				gemId: ticket.gemId,
				refunded: ticket.refunded,
				enteredIntoGem: ticket.enteredIntoGem,
				createdAt: ticket.createdAt,
				userId: ticket.userId,
				userEmail: user.email
			})
			.from(ticket)
			.leftJoin(user, eq(ticket.userId, user.id))
			.where(eq(ticket.eventId, params.eventId));

		// Calculate totals (staff can see counts but not revenue)
		const totalTickets = tickets.filter((t) => !t.refunded).length;
		const totalRefunded = tickets.filter((t) => t.refunded).length;

		return {
			user: locals.user,
			event: eventData,
			tickets,
			stats: {
				totalTickets,
				totalRefunded
			}
		};
	} catch (err) {
		if (err.status === 404 || err.status === 403) {
			throw err;
		}
		console.error('Error loading staff event:', err);
		throw error(500, 'Failed to load event');
	}
}

export const actions = {
	// Toggle "Entered into Gem?" status - staff can do this
	toggleGemEntry: async ({ params, request, locals }) => {
		if (!locals.user) {
			return fail(403, { error: 'Unauthorized' });
		}

		// Verify staff assignment
		const assignment = await db
			.select()
			.from(eventStaff)
			.where(and(eq(eventStaff.userId, locals.user.id), eq(eventStaff.eventId, params.eventId)))
			.limit(1);

		if (assignment.length === 0) {
			return fail(403, { error: 'You are not assigned to this event' });
		}

		const formData = await request.formData();
		const ticketId = formData.get('ticketId');
		const enteredIntoGem = formData.get('enteredIntoGem') === 'true';

		try {
			await db.update(ticket).set({ enteredIntoGem }).where(eq(ticket.id, ticketId));

			return {
				success: true,
				message: `Ticket ${enteredIntoGem ? 'marked as entered' : 'unmarked'} in GEM`
			};
		} catch (err) {
			console.error('Error toggling Gem entry status:', err);
			return fail(500, { error: 'Failed to update GEM entry status' });
		}
	}
};
