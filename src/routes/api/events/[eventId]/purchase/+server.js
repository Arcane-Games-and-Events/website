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

		// Require authentication
		if (!currentUser) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const body = await request.json();
		const { amount, cardNumber, expirationDate, cardCode, description, billTo, gemId } = body;

		// Verify event exists
		const [eventData] = await db.select().from(eventTable).where(eq(eventTable.id, eventId));
		if (!eventData) {
			return json({ error: 'Event not found' }, { status: 404 });
		}

		// Validate Gem ID if required
		if (eventData.gemIdRequired && !gemId) {
			return json({ error: 'Gem ID is required for this event' }, { status: 400 });
		}

		// Calculate expected price with premium discount
		let expectedPrice = parseFloat(eventData.price);
		const isPremium = currentUser.role === 'premium' || currentUser.role === 'admin';

		if (eventData.premiumDiscount && isPremium) {
			expectedPrice = expectedPrice * 0.9; // 10% discount
		}

		// Validate amount matches expected price
		if (Math.abs(parseFloat(amount) - expectedPrice) > 0.01) {
			return json({ error: 'Invalid payment amount' }, { status: 400 });
		}

		// Process one-time payment
		const result = await authnet.chargeCard({
			amount,
			cardNumber,
			expirationDate,
			cardCode,
			description: description || `Ticket for ${eventData.title}`,
			billTo
		});

		if (result.success) {
			// Generate unique ticket code
			const ticketCode = crypto.randomBytes(8).toString('hex').toUpperCase();

			// Create ticket record with new fields
			const [newTicket] = await db.insert(ticket).values({
				userId: currentUser.id,
				eventId,
				code: ticketCode,
				quantity: 1,
				firstName: billTo?.firstName || null,
				lastName: billTo?.lastName || null,
				gemId: gemId || null,
				amountPaid: parseFloat(amount).toFixed(2),
				transactionId: result.transactionId,
				enteredIntoGem: false
			}).returning();

			// Record the order
			await db.insert(order).values({
				provider: 'authnet',
				providerRef: result.transactionId,
				userEmail: currentUser.email,
				amount,
				currency: 'USD',
				meta: {
					type: 'ticket',
					eventId,
					eventTitle: eventData.title,
					ticketId: newTicket.id,
					ticketCode,
					gemId: gemId || null,
					transactionId: result.transactionId,
					premiumDiscount: eventData.premiumDiscount && isPremium
				}
			});

			return json({
				success: true,
				ticketCode,
				ticketId: newTicket.id,
				redirectUrl: `/events/${eventId}/ticket/${newTicket.id}`
			});
		} else {
			return json({ error: result.error || 'Payment failed' }, { status: 500 });
		}
	} catch (err) {
		console.error('Ticket purchase error:', err);
		return json({ error: err.message || 'Payment processing failed' }, { status: 500 });
	}
}
