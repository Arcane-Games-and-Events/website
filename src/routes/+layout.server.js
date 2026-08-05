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
	// Cached 5 min via the shared `EVENTS:upcoming:1` key so the layout
	// query stays cheap on every navigation.
	let nextEvent = null;
	try {
		const [row] = await getCachedOrFetch(
			`${CACHE_KEYS.EVENTS}:upcoming:1`,
			async () => {
				const now = new Date();
				return db
					.select({
						id: event.id,
						title: event.title,
						circuit: event.circuit,
						eventDate: event.eventDate
					})
					.from(event)
					.where(
						and(
							gte(event.eventDate, now),
							or(eq(event.status, 'upcoming'), isNull(event.status))
						)
					)
					.orderBy(asc(event.eventDate))
					.limit(1);
			},
			CACHE_TTL.MEDIUM
		);
		if (row) nextEvent = row;
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
