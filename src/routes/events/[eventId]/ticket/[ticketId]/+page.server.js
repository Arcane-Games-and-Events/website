import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { ticket, event as eventTable } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function load({ params, locals }) {
	const { eventId, ticketId } = params;

	// Fetch the ticket with event details
	const [ticketData] = await db
		.select({
			id: ticket.id,
			code: ticket.code,
			firstName: ticket.firstName,
			lastName: ticket.lastName,
			gemId: ticket.gemId,
			amountPaid: ticket.amountPaid,
			createdAt: ticket.createdAt,
			userId: ticket.userId,
			eventId: ticket.eventId,
			event: {
				id: eventTable.id,
				title: eventTable.title,
				location: eventTable.location,
				address: eventTable.address,
				eventDate: eventTable.eventDate,
				format: eventTable.format
			}
		})
		.from(ticket)
		.leftJoin(eventTable, eq(ticket.eventId, eventTable.id))
		.where(and(eq(ticket.id, ticketId), eq(ticket.eventId, eventId)))
		.limit(1);

	if (!ticketData) {
		throw error(404, 'Ticket not found');
	}

	// Optional: Verify the ticket belongs to the current user
	// Uncomment if you want to restrict access
	// if (locals.user && ticketData.userId !== locals.user.id) {
	// 	throw error(403, 'You do not have access to this ticket');
	// }

	return {
		ticket: ticketData,
		isOwner: locals.user?.id === ticketData.userId
	};
}
