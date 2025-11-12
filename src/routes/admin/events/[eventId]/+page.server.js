import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, ticket, user, eventStaff } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function load({ params, locals }) {
	// Require authentication (admin or tournament staff)
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const isAdmin = locals.user.role === 'admin';
	const isTournamentStaff = locals.user.role === 'tournament_staff';

	// If tournament staff, check if they're assigned to this event
	if (isTournamentStaff) {
		const assignment = await db
			.select()
			.from(eventStaff)
			.where(and(
				eq(eventStaff.userId, locals.user.id),
				eq(eventStaff.eventId, params.eventId)
			))
			.limit(1);

		if (assignment.length === 0) {
			throw error(403, 'You are not assigned to this event. Please contact an administrator to be assigned to this event.');
		}
	} else if (!isAdmin) {
		// Not admin and not tournament staff
		throw redirect(302, '/login');
	}

	try {
		// Fetch event details
		const [eventData] = await db
			.select()
			.from(event)
			.where(eq(event.id, params.eventId))
			.limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// Fetch all tickets for this event with user information
		const tickets = await db
			.select({
				ticketId: ticket.id,
				ticketCode: ticket.code,
				quantity: ticket.quantity,
				firstName: ticket.firstName,
				lastName: ticket.lastName,
				gemId: ticket.gemId,
				amountPaid: ticket.amountPaid,
				transactionId: ticket.transactionId,
				refunded: ticket.refunded,
				refundedAt: ticket.refundedAt,
				enteredIntoGem: ticket.enteredIntoGem,
				createdAt: ticket.createdAt,
				userEmail: user.email
			})
			.from(ticket)
			.leftJoin(user, eq(ticket.userId, user.id))
			.where(eq(ticket.eventId, params.eventId));

		// Calculate totals (only for admin)
		const totalRevenue = tickets
			.filter((t) => !t.refunded)
			.reduce((sum, t) => sum + parseFloat(t.amountPaid || 0), 0);

		const totalTickets = tickets.filter((t) => !t.refunded).length;
		const totalRefunded = tickets.filter((t) => t.refunded).length;

		return {
			user: locals.user,
			isAdmin,
			isTournamentStaff,
			event: eventData,
			tickets,
			stats: {
				totalRevenue: isAdmin ? totalRevenue.toFixed(2) : null, // Hide revenue from tournament staff
				totalTickets,
				totalRefunded
			}
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event management:', err);
		throw error(500, 'Failed to load event management page');
	}
}

export const actions = {
	// Refund a ticket
	refund: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament_staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const ticketId = formData.get('ticketId');

		try {
			// First, fetch the ticket details
			const [ticketData] = await db
				.select()
				.from(ticket)
				.where(eq(ticket.id, ticketId))
				.limit(1);

			if (!ticketData) {
				return fail(404, { error: 'Ticket not found' });
			}

			if (ticketData.refunded) {
				return fail(400, { error: 'Ticket already refunded' });
			}

			if (!ticketData.transactionId || !ticketData.amountPaid) {
				return fail(400, { error: 'Ticket does not have transaction information' });
			}

			const { authnet } = await import('$lib/server/authnet/client.js');
			let refundType = '';

			// Try VOID first (for unsettled transactions within ~24 hours)
			try {
				await authnet.voidTransaction(ticketData.transactionId);
				refundType = 'voided';
			} catch (voidError) {
				// If void fails, try REFUND (for settled transactions)
				console.log('Void failed, attempting refund:', voidError.message);

				// Note: In production, you should store the last 4 digits of the card during checkout
				// For sandbox/testing, we use "1111" as a placeholder
				await authnet.refundTransaction({
					transactionId: ticketData.transactionId,
					amount: ticketData.amountPaid,
					cardNumber: '1111' // Placeholder - should store last 4 digits in production
				});
				refundType = 'refunded';
			}

			// Update ticket as refunded in database
			await db
				.update(ticket)
				.set({
					refunded: true,
					refundedAt: new Date()
				})
				.where(eq(ticket.id, ticketId));

			return { success: true, message: `Ticket ${refundType} successfully through Authorize.net` };
		} catch (err) {
			console.error('Error refunding ticket:', err);
			return fail(500, { error: err.message || 'Failed to refund ticket' });
		}
	},

	// Update event details
	updateEvent: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament_staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const isAdmin = locals.user.role === 'admin';
		const formData = await request.formData();
		const title = formData.get('title');
		const location = formData.get('location');
		const price = formData.get('price');
		const format = formData.get('format');
		const circuit = formData.get('circuit');
		const eventDate = formData.get('eventDate');
		const description = formData.get('description');
		const gemIdRequired = formData.get('gemIdRequired') === 'on';
		const premiumDiscount = formData.get('premiumDiscount') === 'on';

		try {
			// Prepare update object
			const updateData = {
				title,
				location,
				format,
				circuit: circuit || null,
				eventDate: new Date(eventDate),
				description: description || null,
				gemIdRequired,
				premiumDiscount
			};

			// Only admin can update price
			if (isAdmin) {
				const priceNum = parseFloat(price);
				if (isNaN(priceNum) || priceNum < 0) {
					return fail(400, { error: 'Invalid price' });
				}
				updateData.price = priceNum.toFixed(2);
			}

			// Update event
			await db
				.update(event)
				.set(updateData)
				.where(eq(event.id, params.eventId));

			return { success: true, message: 'Event updated successfully' };
		} catch (err) {
			console.error('Error updating event:', err);
			return fail(500, { error: 'Failed to update event' });
		}
	},

	// Toggle "Entered into Gem?" status
	toggleGemEntry: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament_staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const ticketId = formData.get('ticketId');
		const enteredIntoGem = formData.get('enteredIntoGem') === 'true';

		try {
			// Update ticket's enteredIntoGem status
			await db
				.update(ticket)
				.set({
					enteredIntoGem
				})
				.where(eq(ticket.id, ticketId));

			return { success: true, message: `Ticket ${enteredIntoGem ? 'marked as entered' : 'unmarked as entered'} into Gem` };
		} catch (err) {
			console.error('Error toggling Gem entry status:', err);
			return fail(500, { error: 'Failed to update Gem entry status' });
		}
	}
};
