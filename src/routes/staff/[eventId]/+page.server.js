import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { bump } from '$lib/server/cache/index.js';
import { publish, staffTopic } from '$lib/server/realtime.js';
import { event, ticket, user } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { canWorkEvent } from '$lib/server/stores/portal.js';
import QRCode from 'qrcode';

/**
 * The door sign: a QR code to the event's public page, tagged so visits
 * from it show in analytics as the door (utm_source=door, utm_medium=qr).
 *
 * @param {URL} url - this request's address, for the site's origin
 * @param {string} eventId
 */
async function doorCode(url, eventId) {
	const link = new URL(`/ageopen/${encodeURIComponent(eventId)}`, url.origin);
	link.searchParams.set('utm_source', 'door');
	link.searchParams.set('utm_medium', 'qr');
	link.searchParams.set('utm_campaign', eventId);
	const svg = await QRCode.toString(link.href, {
		type: 'svg',
		margin: 0,
		errorCorrectionLevel: 'M',
		color: { dark: '#17150f', light: '#ffffff' }
	});
	return { link: link.href, svg };
}

export async function load({ params, locals, url }) {
	// Require authentication
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Assigned staff, or the people who run the store that runs it.
	if (!(await canWorkEvent(locals.user, params.eventId))) {
		throw error(403, 'You are not assigned to this event');
	}

	try {
		// Fetch event details
		const [eventData] = await db.select().from(event).where(eq(event.id, params.eventId)).limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		if (!eventData.status) eventData.status = 'upcoming';

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
			door: await doorCode(url, eventData.id),
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

		// Verify staff assignment (or the store that runs it)
		if (!(await canWorkEvent(locals.user, params.eventId))) {
			return fail(403, { error: 'You are not assigned to this event' });
		}

		const formData = await request.formData();
		const ticketId = formData.get('ticketId');
		const enteredIntoGem = formData.get('enteredIntoGem') === 'true';

		try {
			const rows = await db
				.update(ticket)
				.set({ enteredIntoGem })
				.where(and(eq(ticket.id, String(ticketId)), eq(ticket.eventId, params.eventId)))
				.returning({ id: ticket.id });
			if (!rows.length) return fail(404, { error: 'That ticket isn’t for this event' });
			await bump('tickets');
			// Every other staff device at the event updates straight away.
			await publish(staffTopic(params.eventId), 'gem', {
				ticketId: rows[0].id,
				entered: enteredIntoGem
			});

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
