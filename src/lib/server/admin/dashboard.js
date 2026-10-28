import { db } from '$lib/server/db/index.js';
import { event, lssEvent, order, standing, ticket, user } from '$lib/server/db/schema.js';
import { desc, sql } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';

/**
 * Reads behind the admin pages. Each page takes only the pieces it shows;
 * every piece is one query, cached under the tag of the table it reads.
 * These replace the retired `get_admin_dashboard_stats()` function, which
 * assembled all of them (plus every order and user) on every admin page.
 */

const n = (v) => Number(v) || 0;

/** The headline counts shown across the admin pages, in one statement. */
export function adminCounts() {
	return cached(
		'admin:counts:v1',
		async () => {
			const result = await db.execute(sql`
				select
					(select count(*) from events) as total_events,
					(select count(*) from events where event_date >= now()) as upcoming_events,
					(select count(*) from events where event_date < now()) as past_events,
					(select count(*) from "order") as total_orders,
					(select count(*) from "user") as total_users,
					(select count(*) from "user" where role = 'premium') as premium_users,
					(select count(distinct gem_id) from standings where gem_id is not null) as total_players,
					(select count(*) from ticket where refunded is not true) as total_tickets_sold,
					(select count(*) from ticket where refunded = true) as total_refunded
			`);
			const r = (result.rows || result)[0] || {};
			return {
				totalEvents: n(r.total_events),
				upcomingEvents: n(r.upcoming_events),
				pastEvents: n(r.past_events),
				totalOrders: n(r.total_orders),
				totalUsers: n(r.total_users),
				premiumUsers: n(r.premium_users),
				totalPlayers: n(r.total_players),
				totalTicketsSold: n(r.total_tickets_sold),
				totalRefunded: n(r.total_refunded)
			};
		},
		{ tags: ['events', 'orders', 'users', 'standings', 'tickets'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/** Revenue totals and the split by order type, for /admin/orders. */
export function orderAnalytics() {
	return cached(
		'admin:order-analytics:v1',
		async () => {
			const [totals, byType] = await Promise.all([
				db.execute(sql`
					select
						coalesce(sum(amount::decimal) filter (where created_at >= date_trunc('day', now())), 0) as today,
						coalesce(sum(amount::decimal) filter (where created_at >= now() - interval '7 days'), 0) as week,
						coalesce(sum(amount::decimal) filter (where created_at >= date_trunc('month', now())), 0) as month,
						coalesce(sum(amount::decimal), 0) as all_time
					from "order"
				`),
				db.execute(sql`
					select coalesce(meta->>'type', 'unknown') as type,
						coalesce(sum(amount::decimal), 0) as total,
						count(*) as count
					from "order"
					group by meta->>'type'
					order by total desc
				`)
			]);
			const t = (totals.rows || totals)[0] || {};
			return {
				today: n(t.today),
				week: n(t.week),
				month: n(t.month),
				allTime: n(t.all_time),
				byType: (byType.rows || byType).map((r) => ({
					type: r.type,
					total: n(r.total),
					count: n(r.count)
				}))
			};
		},
		{ tags: ['orders'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/** Tickets sold, refunded and revenue per event → `{ [eventId]: {...} }`. */
export function ticketStatsByEvent() {
	return cached(
		'admin:ticket-stats:v1',
		async () => {
			const rows = await db
				.select({
					eventId: ticket.eventId,
					sold: sql`count(*)::int`,
					refunded: sql`count(*) filter (where ${ticket.refunded} = true)::int`,
					revenue: sql`coalesce(sum(${ticket.amountPaid}), 0)::float`
				})
				.from(ticket)
				.groupBy(ticket.eventId);
			return Object.fromEntries(
				rows.map((r) => [
					r.eventId,
					{ sold: n(r.sold), refunded: n(r.refunded), revenue: n(r.revenue) }
				])
			);
		},
		{ tags: ['tickets'] }
	);
}

/** The 50 most recently created events, without the bulky results JSON. */
export function listRecentEvents(limit = 50) {
	return cached(
		`admin:events:recent:${limit}`,
		() =>
			db
				.select({
					id: event.id,
					title: event.title,
					location: event.location,
					address: event.address,
					price: event.price,
					format: event.format,
					circuit: event.circuit,
					month: event.month,
					eventDate: event.eventDate,
					description: event.description,
					gemIdRequired: event.gemIdRequired,
					premiumDiscount: event.premiumDiscount,
					playerCap: event.playerCap,
					status: event.status,
					closedAt: event.closedAt,
					closedBy: event.closedBy,
					createdBy: event.createdBy,
					createdAt: event.createdAt
				})
				.from(event)
				.orderBy(desc(event.createdAt))
				.limit(limit),
		{ tags: ['events'] }
	);
}

/** Every standings row, highest points first. */
export function listStandings() {
	return cached(
		'standings:all',
		() => db.select().from(standing).orderBy(desc(standing.totalPoints)),
		{ tags: ['standings'] }
	);
}

/** Every order, newest first. */
export function listOrders() {
	return cached('admin:orders:all', () => db.select().from(order).orderBy(desc(order.createdAt)), {
		tags: ['orders']
	});
}

/** Every account: the columns the admin tables show. */
export function listUsers() {
	return cached(
		'admin:users:all',
		() =>
			db
				.select({
					id: user.id,
					email: user.email,
					role: user.role,
					createdAt: user.createdAt,
					first_name: user.firstName,
					last_name: user.lastName
				})
				.from(user)
				.orderBy(desc(user.createdAt)),
		{ tags: ['users'] }
	);
}

/** Every LSS calendar entry, latest start first. */
export function listLssEvents() {
	return cached(
		'admin:lss:all',
		() => db.select().from(lssEvent).orderBy(desc(lssEvent.startDate)),
		{ tags: ['lss'] }
	);
}
