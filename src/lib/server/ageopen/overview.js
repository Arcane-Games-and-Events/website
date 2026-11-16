/**
 * The admin AGE Open overview: the season across every circuit, what's
 * coming up, and every store — so the series can be
 * run from one page.
 */
import { and, asc, eq, gte, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { circuit, event, store } from '$lib/server/db/schema.js';
import { wallClockNow } from '$lib/server/dates.js';
import { storesOverview } from '$lib/server/stores/admin.js';
import { SEASON_EVENTS } from '$lib/server/stores/portal.js';

const PLAYERS = sql`(SELECT coalesce(sum(coalesce(t.quantity, 1)), 0)::int FROM ticket t
	WHERE t.event_id = events.id AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL)`;
const SALES = sql`(SELECT coalesce(sum(t.amount_paid), 0)::float FROM ticket t
	WHERE t.event_id = events.id AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL)`;

const DAY = 86400000;
/** Played once it's completed or its day is over (as the public tracker counts). */
const played = (e, now) =>
	e.status === 'completed' ||
	e.status === 'in_progress' ||
	(e.eventDate && new Date(e.eventDate).getTime() + DAY <= now.getTime());

/** Everything the overview shows. `at` is for tests. */
export async function seriesOverview(at = new Date()) {
	// Event times are venue wall clocks; Central is the middle of the map.
	const now = wallClockNow('America/Chicago', at);
	const year = now.getUTCFullYear();
	const from = new Date(Date.UTC(year, 0, 1));
	const to = new Date(Date.UTC(year + 1, 0, 1));
	const live = or(isNull(event.status), ne(event.status, 'cancelled'));

	const [circuits, season, upcoming, stores] = await Promise.all([
		db.select().from(circuit).orderBy(asc(circuit.sort), asc(circuit.name)),
		db
			.select({
				circuit: event.circuit,
				eventDate: event.eventDate,
				status: event.status,
				players: PLAYERS,
				sales: SALES
			})
			.from(event)
			.where(and(gte(event.eventDate, from), lt(event.eventDate, to), live)),
		db
			.select({
				id: event.id,
				title: event.title,
				location: event.location,
				format: event.format,
				eventDate: event.eventDate,
				status: event.status,
				circuit: event.circuit,
				playerCap: event.playerCap,
				storeName: store.name,
				storeSlug: store.slug,
				players: PLAYERS,
				sales: SALES
			})
			.from(event)
			.leftJoin(store, eq(store.id, event.storeId))
			.where(
				and(
					gte(event.eventDate, new Date(now.getTime() - DAY)),
					or(isNull(event.status), eq(event.status, 'upcoming'), eq(event.status, 'in_progress'))
				)
			)
			.orderBy(asc(event.eventDate))
			.limit(8),
		storesOverview(at)
	]);

	const active = circuits.filter((c) => c.active);
	const byName = (name) => (e) =>
		(e.circuit || '').trim().toLowerCase() === (name || '').toLowerCase();
	const race = active.map((c) => {
		const evs = season.filter(byName(c.name));
		const p = evs.filter((e) => played(e, now)).length;
		return {
			name: c.name,
			slug: c.slug,
			short: c.short,
			color: c.color,
			played: p,
			scheduled: evs.length - p,
			open: Math.max(0, SEASON_EVENTS - evs.length)
		};
	});
	const colorOf = (name) =>
		circuits.find((c) => c.name.toLowerCase() === (name || '').trim().toLowerCase())?.color ||
		'#5c5a52';

	return {
		year,
		now: now.getTime(),
		target: SEASON_EVENTS,
		race,
		totals: {
			played: race.reduce((n, c) => n + c.played, 0),
			scheduled: race.reduce((n, c) => n + c.scheduled, 0),
			slots: race.length * SEASON_EVENTS,
			players: season.reduce((n, e) => n + e.players, 0),
			sales: season.reduce((n, e) => n + e.sales, 0),
			stores: stores.totals.stores,
			owedCents: stores.totals.owedCents
		},
		upcoming: upcoming.map((e) => ({ ...e, color: colorOf(e.circuit) })),
		circuits: stores.circuits
	};
}
