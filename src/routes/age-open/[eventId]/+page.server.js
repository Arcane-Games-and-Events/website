import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, savedCard, ticket } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { calculatePremiumDiscount } from '$lib/server/premium-discount.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

/**
 * Cached fetch for the public event row. Event rows change rarely (title,
 * price, cap tweaks — not per-page-view), so MEDIUM TTL is safe. Admins
 * editing an event already invalidate `events:all`; extending that to also
 * invalidate `events:detail:*` is a follow-up if desired.
 */
async function fetchEvent(eventId) {
	return getCachedOrFetch(
		`${CACHE_KEYS.EVENTS}:detail:${eventId}`,
		async () => {
			const [row] = await db.select().from(event).where(eq(event.id, eventId)).limit(1);
			return row || null;
		},
		CACHE_TTL.MEDIUM
	);
}

/**
 * Cached ticket count for capacity checks. Short TTL because capacity is
 * time-sensitive during registration bursts. Both this route and the
 * checkout route share the same key so the second hit is free.
 */
async function fetchRegisteredCount(eventId) {
	return getCachedOrFetch(
		`${CACHE_KEYS.EVENTS}:ticket-count:${eventId}`,
		async () => {
			const [{ count }] = await db
				.select({ count: sql`count(*)::int` })
				.from(ticket)
				.where(and(eq(ticket.eventId, eventId), eq(ticket.refunded, false)));
			return count;
		},
		CACHE_TTL.SHORT
	);
}

export async function load({ params, locals }) {
	try {
		// Kick every independent fetch in parallel. The event fetch is
		// public-cacheable via Redis; the capacity count too; user-scoped
		// queries only run when a user is signed in.
		const [eventData, registeredCount, userSavedCards, existingTickets] = await Promise.all([
			fetchEvent(params.eventId),
			// Only compute a capacity count if the event has a cap set. We
			// can't know that until the event row loads, so this either
			// races against fetchEvent (harmless — key is per-event and
			// idempotent) or short-circuits after.
			fetchRegisteredCount(params.eventId),
			locals.user
				? db.select().from(savedCard).where(eq(savedCard.userId, locals.user.id))
				: Promise.resolve([]),
			locals.user
				? db
						.select()
						.from(ticket)
						.where(
							and(
								eq(ticket.userId, locals.user.id),
								eq(ticket.eventId, params.eventId),
								eq(ticket.refunded, false)
							)
						)
				: Promise.resolve([])
		]);

		if (!eventData) throw error(404, 'Event not found');

		// Check if user is premium for discount display
		const isPremium = locals.user?.role === 'premium' || locals.user?.role === 'admin';
		const hasPremiumDiscount = eventData.premiumDiscount && isPremium;

		// Calculate discounted price if applicable
		let finalPrice = parseFloat(eventData.price);
		let discountAmount = 0;
		let discountLabel = '';
		if (hasPremiumDiscount) {
			const discount = calculatePremiumDiscount(finalPrice, eventData.eventDate);
			finalPrice = discount.finalPrice;
			discountAmount = discount.discountAmount;
			discountLabel = discount.discountLabel;
		}

		// Get user's GEM ID if they have one linked to their account
		const userGemId = locals.user?.gemId || null;
		const userFirstName = locals.user?.firstName || '';
		const userLastName = locals.user?.lastName || '';

		return {
			event: eventData,
			user: locals.user || null,
			isPremium,
			hasPremiumDiscount,
			finalPrice: finalPrice.toFixed(2),
			discountAmount: discountAmount.toFixed(2),
			discountLabel,
			userGemId,
			userFirstName,
			userLastName,
			savedCards: userSavedCards,
			// Match the legacy shape: array-with-length OR null (not [])
			userTicket: existingTickets.length > 0 ? existingTickets : null,
			// Zero out the capacity count when the event has no cap so the
			// UI's capacity-chip logic (only shown if playerCap != null)
			// doesn't accidentally start rendering.
			registeredCount: eventData.playerCap != null ? registeredCount : 0,
			isSandbox: env.AUTHNET_ENVIRONMENT === 'sandbox'
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event:', err);
		throw error(500, 'Failed to load event details');
	}
}
