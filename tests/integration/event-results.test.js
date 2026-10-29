/**
 * Uploading GEM results from the admin event page, against a real
 * database: matches, stored results, standings, heroes, and what
 * re-uploading or deleting an event does to them.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { event, eventPlayerHero, match, standing } from '$lib/server/db/schema.js';
import { actions } from '../../src/routes/admin/events/[eventId]/+page.server.js';
import { callAction } from '../support/actions.js';
import { createAdmin, createEvent, createUser } from '../support/factories.js';
import { flipResult, loadGem } from '../support/gem.js';

const real = loadGem('top8-60-players');
const winner = real.ranked[3]; // won the Top 8 from 4th seed
const finalist = real.ranked[1];

let admin;
let ev;

beforeEach(async () => {
	admin = await createAdmin();
	ev = await createEvent({
		circuit: 'Los Angeles',
		month: 'March',
		eventDate: new Date('2026-03-28T18:45:00Z'),
		status: 'upcoming'
	});
});

const upload = (
	eventId,
	{ standings = real.standings, pairings = real.pairings, user = admin } = {}
) =>
	callAction(actions, 'processCSV', {
		params: { eventId },
		user,
		files: { swissStandings: ['standings.csv', standings], pairings: ['pairings.csv', pairings] }
	});

const uploadHeroes = (eventId, csv = real.heroes) =>
	callAction(actions, 'uploadHeroes', {
		params: { eventId },
		user: admin,
		files: { heroesFile: ['heroes.csv', csv] }
	});

/** Every standings row for the circuit's 2026 season, as plain values. */
async function standingsSnapshot() {
	const rows = await db
		.select({
			gemId: standing.gemId,
			name: standing.playerName,
			total: standing.totalPoints,
			won: standing.matchesWon,
			played: standing.matchesPlayed,
			march: standing.marchPoints
		})
		.from(standing)
		.where(and(eq(standing.season, '2026'), eq(standing.circuit, 'Los Angeles')));
	return rows.sort((a, b) => `${a.gemId}${a.name}`.localeCompare(`${b.gemId}${b.name}`));
}
const pointsOf = async (gemId) =>
	(await standingsSnapshot()).find((r) => r.gemId === gemId)?.total ?? 0;
const matchCount = async (eventId) =>
	Number(
		(
			await db
				.select({ n: sql`count(*)` })
				.from(match)
				.where(eq(match.eventId, eventId))
		)[0].n
	);

describe('uploading results', () => {
	test('stores matches and results, starts the event, and builds the standings', async () => {
		const r = await upload(ev.id);
		expect(r.status, JSON.stringify(r.data)).toBe(200);

		expect(await matchCount(ev.id)).toBe(279);
		const [stored] = await db.select().from(event).where(eq(event.id, ev.id));
		expect(stored.status).toBe('in_progress');
		expect(stored.tournamentResults).toHaveLength(85);
		expect(stored.tournamentResults.find((p) => p.placement === 1).gemId).toBe(winner.id);

		const rows = await standingsSnapshot();
		expect(rows).toHaveLength(85);
		expect(rows.reduce((s, x) => s + x.total, 0)).toBe(304);
		const top = rows.find((x) => x.gemId === winner.id);
		expect(top).toMatchObject({ total: 30, march: 30, won: 9, played: 10 });
	});

	test('stores a draw as a draw, and counts it as played in the standings', async () => {
		await upload(ev.id);
		const [stored] = await db.select().from(event).where(eq(event.id, ev.id));
		const drawn = real.ranked[51]; // Swiss 52nd: 3 wins, 1 draw, 3 losses
		expect(stored.tournamentResults.find((p) => p.gemId === drawn.id)).toMatchObject({
			wins: 3,
			losses: 3,
			draws: 1
		});
		const row = (await standingsSnapshot()).find((x) => x.gemId === drawn.id);
		expect(row).toMatchObject({ won: 3, played: 7 });
	});

	test('re-uploading the same files changes nothing', async () => {
		await upload(ev.id);
		const first = await standingsSnapshot();
		await upload(ev.id);
		expect(await standingsSnapshot()).toEqual(first);
		expect(await matchCount(ev.id)).toBe(279);
	});

	test('a corrected upload replaces the old results', async () => {
		await upload(ev.id);
		expect(await pointsOf(winner.id)).toBe(30);
		// The final went the other way.
		await upload(ev.id, { pairings: flipResult(real.pairings, 10, 1) });
		expect(await pointsOf(finalist.id)).toBe(30);
		expect(await pointsOf(winner.id)).toBe(25);
		expect(await matchCount(ev.id)).toBe(279);
		expect((await standingsSnapshot()).reduce((s, x) => s + x.total, 0)).toBe(304);
	});

	test('two events in the same month add up, and deleting one takes its points away', async () => {
		const second = await createEvent({
			circuit: 'Los Angeles',
			month: 'March',
			eventDate: new Date('2026-03-14T18:00:00Z')
		});
		await upload(ev.id);
		await upload(second.id);
		expect(await pointsOf(winner.id)).toBe(60);

		const r = await callAction(actions, 'deleteEvent', {
			params: { eventId: second.id },
			user: admin
		});
		expect(r.redirect).toBe('/admin/events');
		expect(await pointsOf(winner.id)).toBe(30);
		expect(await matchCount(second.id)).toBe(0);
	});

	test('a completed event keeps its status on re-upload', async () => {
		await db.update(event).set({ status: 'completed' }).where(eq(event.id, ev.id));
		await upload(ev.id);
		const [stored] = await db.select().from(event).where(eq(event.id, ev.id));
		expect(stored.status).toBe('completed');
	});

	test('a broken file changes nothing', async () => {
		await upload(ev.id);
		const before = await standingsSnapshot();
		// The page logs the error it catches; that's expected here.
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const r = await upload(ev.id, { pairings: 'Round,Table\n' });
		expect(log).toHaveBeenCalled();
		log.mockRestore();
		expect(r.status).toBe(500);
		expect(await standingsSnapshot()).toEqual(before);
		expect(await matchCount(ev.id)).toBe(279);
	});

	test('only admins and tournament staff can upload', async () => {
		const member = await createUser();
		expect((await upload(ev.id, { user: member })).status).toBe(403);
		expect((await upload(ev.id, { user: null })).status).toBe(403);
		expect(await matchCount(ev.id)).toBe(0);
	});
});

describe('heroes', () => {
	const heroRows = (eventId) =>
		db.select().from(eventPlayerHero).where(eq(eventPlayerHero.eventId, eventId));

	test('stores one row per player with a hero, linked to the event', async () => {
		const r = await uploadHeroes(ev.id);
		expect(r.status, JSON.stringify(r.data)).toBe(200);
		expect(await heroRows(ev.id)).toHaveLength(83); // two players have no hero listed
	});

	test('re-uploading replaces rather than adds', async () => {
		await uploadHeroes(ev.id);
		await uploadHeroes(ev.id);
		expect(await heroRows(ev.id)).toHaveLength(83);
	});

	test('two events in the same circuit and month keep their own heroes', async () => {
		const second = await createEvent({
			circuit: 'Los Angeles',
			month: 'March',
			eventDate: new Date('2026-03-14T18:00:00Z')
		});
		await uploadHeroes(ev.id);
		await uploadHeroes(second.id);
		expect(await heroRows(ev.id)).toHaveLength(83);
		expect(await heroRows(second.id)).toHaveLength(83);
		await callAction(actions, 'deleteEvent', { params: { eventId: second.id }, user: admin });
		expect(await heroRows(ev.id)).toHaveLength(83);
	});
});
