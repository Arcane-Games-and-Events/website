import { db } from '$lib/server/db/index.js';
import { eventStaff, partner, event } from '$lib/server/db/schema.js';
import { eq, and, gte, or, isNull, asc } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { cachedUnreadCount } from '$lib/server/courses/notifications.js';
import { realtimeClientConfig } from '$lib/server/realtime.js';
import { readCart } from '$lib/server/partner/cart.js';
import { cachedMessageCounts } from '$lib/server/contact/inbox.js';
import { cachedStoreCount } from '$lib/server/stores/members.js';
import { listCircuits } from '$lib/server/stores/circuits.js';
import { siteBanner } from '$lib/server/status/index.js';

// Per-user cached lookups on the layout hot path. Each is guarded so an
// individual failure just falls back to the safe default without failing
// the layout. Staff assignment and partner changes bump `user:{id}`.
async function safeStaffCount(userId) {
	try {
		return await cached(
			`layout:user:${userId}:staff_count`,
			async () => {
				const assignments = await db
					.select({ id: eventStaff.id })
					.from(eventStaff)
					.where(eq(eventStaff.userId, userId));
				return assignments.length;
			},
			{ tags: [`user:${userId}`] }
		);
	} catch {
		return 0;
	}
}

async function safeIsPartner(userId) {
	try {
		return await cached(
			`layout:user:${userId}:is_partner`,
			async () => {
				const [partnerRow] = await db
					.select({ id: partner.id })
					.from(partner)
					.where(eq(partner.userId, userId))
					.limit(1);
				return !!partnerRow;
			},
			{ tags: [`user:${userId}`] }
		);
	} catch {
		return false;
	}
}

async function safeNextEvent() {
	try {
		// Read on every navigation, so it is also held in memory for 15s. Five
		// minutes at most, so a started event drops off without a write.
		const rows = await cached(
			'events:upcoming:3',
			async () => {
				const now = new Date();
				// Match the homepage's fuller `.select()` shape so both
				// surfaces populate this key identically.
				return db
					.select()
					.from(event)
					.where(
						and(gte(event.eventDate, now), or(eq(event.status, 'upcoming'), isNull(event.status)))
					)
					.orderBy(asc(event.eventDate))
					.limit(3);
			},
			{ tags: ['events'], ttl: CACHE_TTL.FIVE_MINUTES, mem: 15 }
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

export const load = async ({ locals, cookies, depends }) => {
	// Adding to or emptying the cart refreshes the count in the header.
	depends('app:cart');
	// This function runs on EVERY navigation — every extra sequential
	// Redis await here compounds site-wide. Run the three cache lookups
	// in parallel so the layout latency is `max(A, B, C)` (~150 ms on
	// Upstash REST) instead of `A + B + C` (~450 ms). For logged-out
	// visitors, only the nextEvent lookup runs; the other two resolve
	// instantly to their defaults.
	const userId = locals.user?.id ?? null;

	const [
		assignedEventsCount,
		isPartner,
		nextEvent,
		unread,
		contact,
		storeCount,
		circuits,
		statusBanner
	] = await Promise.all([
		userId ? safeStaffCount(userId) : Promise.resolve(0),
		userId ? safeIsPartner(userId) : Promise.resolve(false),
		safeNextEvent(),
		userId ? cachedUnreadCount(userId) : Promise.resolve({ learning: 0, classroom: 0 }),
		cachedMessageCounts(locals.user),
		cachedStoreCount(userId),
		listCircuits().catch(() => []),
		// An incident or maintenance that's on (Admin → Status), for the banner.
		siteBanner()
	]);

	const isPremiumMember = locals.user?.role === 'premium' || locals.user?.role === 'admin';

	return {
		user: locals.user,
		assignedEventsCount,
		isPartner,
		// Stores this account helps run: the Store link in the account menu.
		storeCount,
		isPremiumMember,
		nextEvent,
		// My courses (replies, updates, new topics) and the Classroom (approvals,
		// students, flagged posts…) count separately.
		unreadNotifications: unread?.learning ?? 0,
		classroomUnread: unread?.classroom ?? 0,
		// Replies from AGE to this person's messages, and (admins) unread
		// conversations in the contact inbox.
		messagesUnread: contact.messages,
		inboxUnread: contact.inbox,
		// Where signed-in browsers connect for live updates (null when off).
		realtime: userId ? realtimeClientConfig() : null,
		// The AGE Open circuits (cached): names for filters, colours as CSS.
		circuits: circuits.map(({ name, slug, short, region, color, imageUrl, blurb }) => ({
			name,
			slug,
			short,
			region,
			color,
			image: imageUrl || null,
			blurb: blurb || null
		})),
		statusBanner,
		// Guides in the cart (a cookie; no database read).
		cartCount: readCart(cookies).length
	};
};
