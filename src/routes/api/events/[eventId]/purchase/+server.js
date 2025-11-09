import { json } from '@sveltejs/kit';
import { authnet } from '$lib/server/authnet/client.js';
import { db } from '$lib/server/db/index.js';
import { ticket, order, event as eventTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Purchase event tickets (one-time payment)
 */
export async function POST({ params, request, locals }) {
	try {
		const { eventId } = params;
		const currentUser = locals.user;

		const body = await request.json();
		const { amount, cardNumber, expirationDate, cardCode, description, billTo } = body;

		// Verify event exists
		const events = await db.select().from(eventTable).where(eq(eventTable.id, eventId));
		if (events.length === 0) {
			return json({ error: 'Event not found' }, { status: 404 });
		}

		// Process one-time payment
		const result = await authnet.chargeCard({
			amount,
			cardNumber,
			expirationDate,
			cardCode,
			description,
			billTo
		});

		if (result.success) {
			// Generate unique ticket code
			const ticketCode = crypto.randomBytes(8).toString('hex').toUpperCase();

			// Create ticket record
			const [newTicket] = await db.insert(ticket).values({
				userId: currentUser?.id || null,
				eventId,
				code: ticketCode,
				quantity: 1 // You can enhance this to support multiple quantities
			}).returning();

			// Record the order
			await db.insert(order).values({
				provider: 'authnet',
				providerRef: result.transactionId,
				userEmail: currentUser?.email || billTo.firstName + '@example.com',
				amount,
				currency: 'USD',
				meta: {
					type: 'ticket',
					eventId,
					ticketId: newTicket.id,
					ticketCode,
					transactionId: result.transactionId
				}
			});

			return json({
				success: true,
				ticketCode,
				ticketId: newTicket.id,
				redirectUrl: `/tickets/${newTicket.id}`
			});
		} else {
			return json({ error: 'Payment failed' }, { status: 500 });
		}
	} catch (err) {
		console.error('Ticket purchase error:', err);
		return json({ error: err.message || 'Payment processing failed' }, { status: 500 });
	}
}
