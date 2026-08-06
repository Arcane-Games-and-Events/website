import { db } from '$lib/server/db/index.js';
import { eventStaff, partner, event } from '$lib/server/db/schema.js';
import { eq, and, gte, or, isNull, asc } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

export const load = async ({ locals }) => {
	// locals.user is set in hooks.server.js by Lucia
	let assignedEventsCount = 0;
	let isPartner = false;

	// Per-user lookups run on every navigation. They almost never change, so
	// cache for the full TTL window. If a user is granted/removed as event
	// staff or partner, they'll see the updated chrome within the TTL.
	if (locals.user) {
		const userId = locals.user.id;

		try {
			assignedEventsCount = await getCachedOrFetch(
				`layout:user:${userId}:staff_count`,
				async () => {
					const assignments = await db
						.select({ id: eventStaff.id })
						.from(eventStaff)
						.where(eq(eventStaff.userId, userId));
					return assignments.length;
				},
				CACHE_TTL.HOUR
			);
		} catch {
			// Ignore errors - just don't show the events link
		}

		try {
			isPartner = await getCachedOrFetch(
				`layout:user:${userId}:is_partner`,
				async () => {
					const [partnerRow] = await db
						.select({ id: partner.id })
						.from(partner)
						.where(eq(partner.userId, userId))
						.limit(1);
					return !!partnerRow;
				},
				CACHE_TTL.HOUR
			);
		} catch {
			// Silent fail — link is optional
		}
	}

	const isPremiumMember =
		locals.user?.role === 'premium' || locals.user?.role === 'admin';

	// Next upcoming event powers the marquee banner in the header.
	// Shares the `EVENTS:upcoming:3` cache with the homepage so admin
	// invalidations reach both surfaces in one shot — we just take the
	// first row.
	let nextEvent = null;
	try {
		const rows = await getCachedOrFetch(
			`${CACHE_KEYS.EVENTS}:upcoming:3`,
			async () => {
				const now = new Date();
				// Match the homepage's fuller `.select()` shape so both
				// surfaces populate this key identically.
				return db
					.select()
					.from(event)
					.where(
						and(
							gte(event.eventDate, now),
							or(eq(event.status, 'upcoming'), isNull(event.status))
						)
					)
					.orderBy(asc(event.eventDate))
					.limit(3);
			},
			CACHE_TTL.SHORT
		);
		if (rows && rows.length > 0) {
			const row = rows[0];
			nextEvent = {
				id: row.id,
				title: row.title,
				circuit: row.circuit,
				eventDate: row.eventDate
			};
		}
	} catch {
		// Silent — banner just hides the event link if we couldn't load
	}

	return {
		user: locals.user,
		assignedEventsCount,
		isPartner,
		isPremiumMember,
		nextEvent
	};
};
