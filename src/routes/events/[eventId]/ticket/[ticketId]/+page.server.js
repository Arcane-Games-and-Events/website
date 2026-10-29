import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { ticket, event as eventTable } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function load({ params, locals, url }) {
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
			refunded: ticket.refunded,
			enteredIntoGem: ticket.enteredIntoGem,
			orderId: ticket.orderId,
			userId: ticket.userId,
			eventId: ticket.eventId,
			event: {
				id: eventTable.id,
				title: eventTable.title,
				location: eventTable.location,
				address: eventTable.address,
				eventDate: eventTable.eventDate,
				format: eventTable.format,
				circuit: eventTable.circuit,
				price: eventTable.price
			}
		})
		.from(ticket)
		.leftJoin(eventTable, eq(ticket.eventId, eventTable.id))
		.where(and(eq(ticket.id, ticketId), eq(ticket.eventId, eventId)))
		.limit(1);

	if (!ticketData) {
		throw error(404, 'Ticket not found');
	}

	// Only the buyer, an admin or event staff can see a ticket. Anyone else
	// gets the same 404 as a ticket that doesn't exist.
	const u = locals.user;
	const isOwner = !!u && ticketData.userId === u.id;
	const isStaff =
		!!u && (u.role === 'admin' || (u.additionalRoles || []).includes('tournament staff'));
	if (!isOwner && !isStaff) {
		throw error(404, 'Ticket not found');
	}

	// Any other tickets from the same order, for the "and N more" line.
	const siblings = ticketData.orderId
		? await db
				.select({ id: ticket.id, firstName: ticket.firstName, lastName: ticket.lastName })
				.from(ticket)
				.where(and(eq(ticket.orderId, ticketData.orderId), eq(ticket.refunded, false)))
		: [];

	return {
		ticket: ticketData,
		siblings: siblings.filter((t) => t.id !== ticketData.id),
		isOwner,
		isNew: url.searchParams.get('new') === '1'
	};
}
