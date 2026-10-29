/**
 * Hero (deck) rows for an event's metagame.
 *
 * Rows are linked to their event by `event_id` (migration 023). Rows written
 * before that column existed are found by season + circuit + month — the old
 * key, which stays populated because the public pages still group by it.
 */
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { eventPlayerHero } from '$lib/server/db/schema.js';
import { eventPeriod } from '$lib/server/standings/rebuild.js';

let linked = false;

/** Whether `event_player_heroes.event_id` exists yet. Remembered once seen. */
export async function heroesLinkedToEvents() {
	if (linked) return true;
	const rows = await db.execute(
		sql`select 1 from information_schema.columns where table_name = 'event_player_heroes' and column_name = 'event_id'`
	);
	linked = rows.length > 0;
	return linked;
}

/** WHERE clause selecting this event's hero rows. */
async function heroScope(eventData) {
	const legacy = and(
		eq(eventPlayerHero.season, eventPeriod(eventData.eventDate).season),
		eq(eventPlayerHero.circuit, eventData.circuit),
		eq(eventPlayerHero.month, eventData.month)
	);
	if (!(await heroesLinkedToEvents())) return legacy;
	return or(
		eq(eventPlayerHero.eventId, eventData.id),
		and(isNull(eventPlayerHero.eventId), legacy)
	);
}

const scoped = (eventData) => !!(eventData?.id && eventData.circuit && eventData.month);

/**
 * The columns that exist before migration 023. A bare `select()` would ask
 * for `event_id` too and fail until the column is there.
 */
export const HERO_COLUMNS = {
	id: eventPlayerHero.id,
	season: eventPlayerHero.season,
	circuit: eventPlayerHero.circuit,
	month: eventPlayerHero.month,
	gemId: eventPlayerHero.gemId,
	playerName: eventPlayerHero.playerName,
	hero: eventPlayerHero.hero,
	countryRegion: eventPlayerHero.countryRegion,
	createdAt: eventPlayerHero.createdAt
};

export async function listEventHeroes(eventData, tx = db) {
	if (!scoped(eventData)) return [];
	const columns = (await heroesLinkedToEvents())
		? { ...HERO_COLUMNS, eventId: eventPlayerHero.eventId }
		: HERO_COLUMNS;
	return tx
		.select(columns)
		.from(eventPlayerHero)
		.where(await heroScope(eventData));
}

/**
 * Replace this event's hero rows. `rows` carry season, circuit, month,
 * gemId, playerName, hero and countryRegion; the event link is added here.
 */
export async function replaceEventHeroes(eventData, rows, tx = db) {
	if (!scoped(eventData)) throw new Error('Event needs a circuit and month before hero data');
	const scope = await heroScope(eventData);
	const values = (await heroesLinkedToEvents())
		? rows.map((r) => ({ ...r, eventId: eventData.id }))
		: rows;
	await tx.delete(eventPlayerHero).where(scope);
	if (values.length > 0) await tx.insert(eventPlayerHero).values(values);
}

export async function deleteEventHeroes(eventData, tx = db) {
	if (!scoped(eventData)) return;
	await tx.delete(eventPlayerHero).where(await heroScope(eventData));
}
