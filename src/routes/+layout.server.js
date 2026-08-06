import { db } from '$lib/server/db/index.js';
import { eventStaff, partner, event } from '$lib/server/db/schema.js';
import { eq, and, gte, or, isNull, asc } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

// Per-user Redis lookups on the layout hot path. Each is guarded so an
// individual failure just falls back to the safe default without failing
// the layout.
async function safeStaffCount(userId) {
	try {
		return await getCachedOrFetch(
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
		return 0;
	}
}

async function safeIsPartner(userId) {
	try {
		return await getCachedOrFetch(
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
		return false;
	}
}

async function safeNextEvent() {
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
			return {
				id: row.id,
				title: row.title,
				circuit: row.circuit,
				eventDate: row.eventDate
			};
		}
		return null;
	} catch {
		return null;
	}
}

export const load = async ({ locals }) => {
	// This function runs on EVERY navigation — every extra sequential
	// Redis await here compounds site-wide. Run the three cache lookups
	// in parallel so the layout latency is `max(A, B, C)` (~150 ms on
	// Upstash REST) instead of `A + B + C` (~450 ms). For logged-out
	// visitors, only the nextEvent lookup runs; the other two resolve
	// instantly to their defaults.
	const userId = locals.user?.id ?? null;

	const [assignedEventsCount, isPartner, nextEvent] = await Promise.all([
		userId ? safeStaffCount(userId) : Promise.resolve(0),
		userId ? safeIsPartner(userId) : Promise.resolve(false),
		safeNextEvent()
	]);

	const isPremiumMember =
		locals.user?.role === 'premium' || locals.user?.role === 'admin';

	return {
		user: locals.user,
		assignedEventsCount,
		isPartner,
		isPremiumMember,
		nextEvent
	};
};
