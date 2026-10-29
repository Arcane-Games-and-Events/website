/**
 * Rebuild standings from the events behind them.
 *
 * Each event's `tournament_results` (written at CSV upload with the
 * authoritative Swiss rank) is the source of truth. Match rows with no
 * stored results (historical imports, older events) can only be win-sorted
 * through the processor — an approximation — so a month built from those is
 * never overwritten unless it is asked for by name. Rebuilt months are
 * replaced outright, never added to or subtracted from, which is what made
 * re-uploads drift.
 */
import { db } from '$lib/server/db/index.js';
import { event, match, standing } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { calculateFinalStandings, isBye } from '$lib/server/tournament-processor.js';
import { playerKeyFromIdName } from '$lib/server/players/key.js';
import { MONTH_NAMES } from '$lib/data/months.js';

export const MONTH_KEYS = MONTH_NAMES.map((m) => m.toLowerCase());

/**
 * The season and month an event's results count towards, from its date.
 * Event times are wall-clock values stored as UTC, so the UTC parts are the
 * ones the admin typed.
 */
export function eventPeriod(eventDate) {
	const d = eventDate ? new Date(eventDate) : new Date();
	const monthName = MONTH_NAMES[d.getUTCMonth()];
	return { season: String(d.getUTCFullYear()), monthName, monthKey: monthName.toLowerCase() };
}

/**
 * Every player's monthly contribution in a season + circuit, keyed by
 * player identity.
 */
async function collectContributions(season, circuit, tx) {
	const players = new Map();
	const sourceMonths = new Set();
	const approxMonths = new Set();
	const add = (gemId, name, monthKey, points, wins, matches) => {
		const key = playerKeyFromIdName(gemId, name);
		if (!players.has(key)) players.set(key, { gemId: gemId || null, name, months: {} });
		const p = players.get(key);
		if (name) p.name = name;
		const m = p.months[monthKey] || { points: 0, wins: 0, matches: 0 };
		p.months[monthKey] = {
			points: m.points + points,
			wins: m.wins + wins,
			matches: m.matches + matches
		};
	};

	// Events with stored results are authoritative.
	const eventRows = await tx
		.select({
			id: event.id,
			eventDate: event.eventDate,
			tournamentResults: event.tournamentResults
		})
		.from(event)
		.where(eq(event.circuit, circuit));
	const withResults = new Set();
	let events = 0;
	for (const e of eventRows) {
		if (!Array.isArray(e.tournamentResults) || e.tournamentResults.length === 0) continue;
		const period = eventPeriod(e.eventDate);
		if (period.season !== season) continue;
		withResults.add(e.id);
		events++;
		sourceMonths.add(period.monthKey);
		for (const r of e.tournamentResults) {
			add(
				r.gemId || null,
				r.playerName,
				period.monthKey,
				r.agePoints || 0,
				r.wins || 0,
				(r.wins || 0) + (r.losses || 0)
			);
		}
	}

	// Match rows for events without stored results (historical imports) are
	// win-sorted through the processor, grouped by event or, for rows with
	// no event, by month.
	const allMatches = await tx
		.select()
		.from(match)
		.where(and(eq(match.year, season), eq(match.circuit, circuit)));
	const groups = new Map();
	for (const m of allMatches) {
		if (m.eventId && withResults.has(m.eventId)) continue;
		const key = m.eventId || `month:${m.month}`;
		if (!groups.has(key)) groups.set(key, { month: m.month, matches: [] });
		groups.get(key).matches.push(m);
	}
	for (const group of groups.values()) {
		const monthKey = (group.month || '').toLowerCase();
		if (!MONTH_KEYS.includes(monthKey)) continue;
		const swiss = new Map();
		const note = (gemId, name, won) => {
			if (isBye(gemId, name)) return;
			const key = gemId || name;
			if (!swiss.has(key)) swiss.set(key, { playerId: gemId, name, wins: 0 });
			if (won) swiss.get(key).wins++;
		};
		for (const m of group.matches) {
			note(m.player1GemId, m.player1Name, m.winner === 'player1');
			note(m.player2GemId, m.player2Name, m.winner === 'player2');
		}
		const pairings = group.matches.map((m) => ({
			round: m.round,
			table: m.table,
			player1Id: m.player1GemId,
			player1Name: m.player1Name,
			player2Id: m.player2GemId,
			player2Name: m.player2Name,
			result: m.winner === 'player1' ? '1WIN' : m.winner === 'player2' ? '2WIN' : 'DRAW'
		}));
		let computed;
		try {
			computed = calculateFinalStandings([...swiss.values()], pairings);
		} catch (err) {
			console.warn(`Standings rebuild: skipping a match group (${err.message})`);
			continue;
		}
		events++;
		sourceMonths.add(monthKey);
		approxMonths.add(monthKey);
		for (const r of computed.results) {
			add(
				r.playerId || null,
				r.name,
				monthKey,
				r.points || 0,
				r.matchesWon || 0,
				r.matchesPlayed || 0
			);
		}
	}

	return { players, sourceMonths, approxMonths, events, matches: allMatches.length };
}

/**
 * Rebuild some months of a season + circuit's standings.
 *
 * With `months` (month keys, e.g. ['september']) exactly those months are
 * rebuilt — what a CSV upload or event delete does for the event's own
 * month; a month left with no source at all is zeroed. Without it, every
 * month whose sources are all stored results is rebuilt, and months that
 * would have to be approximated from bare matches are skipped and reported.
 * Months not rebuilt keep their figures. Totals are re-summed from the
 * twelve monthly columns.
 *
 * @param {{ season: string, circuit: string, months?: string[] }} scope
 * @param tx a db or transaction handle
 * @returns {Promise<{ updated: number, created: number, months: string[], skipped: string[], events: number, matches: number }>}
 */
export async function rebuildStandings({ season, circuit, months: only }, tx = db) {
	const { players, sourceMonths, approxMonths, events, matches } = await collectContributions(
		season,
		circuit,
		tx
	);
	const months = only
		? MONTH_KEYS.filter((k) => only.includes(k))
		: MONTH_KEYS.filter((k) => sourceMonths.has(k) && !approxMonths.has(k));
	const skipped = only ? [] : MONTH_KEYS.filter((k) => approxMonths.has(k));
	if (months.length === 0) return { updated: 0, created: 0, months, skipped, events, matches };

	const existing = await tx
		.select()
		.from(standing)
		.where(and(eq(standing.season, season), eq(standing.circuit, circuit)));
	// GEM-ID rows match only by GEM ID; GEM-less rows by name, and only
	// against GEM-less results — two same-named players never merge.
	const byGemId = new Map(existing.filter((s) => s.gemId).map((s) => [s.gemId, s]));
	const byGemlessName = new Map(existing.filter((s) => !s.gemId).map((s) => [s.playerName, s]));
	const keyOf = (row) => playerKeyFromIdName(row.gemId, row.playerName);

	// Monthly columns for one row: covered months from the sources (or zero),
	// everything else as it is on the row now.
	const monthColumns = (row, contribution) => {
		const cols = {};
		for (const k of MONTH_KEYS) {
			const m = months.includes(k) ? contribution?.months[k] || null : null;
			cols[`${k}Points`] = months.includes(k) ? m?.points || 0 : row?.[`${k}Points`] || 0;
			cols[`${k}MatchesWon`] = months.includes(k) ? m?.wins || 0 : row?.[`${k}MatchesWon`] || 0;
			cols[`${k}Matches`] = months.includes(k) ? m?.matches || 0 : row?.[`${k}Matches`] || 0;
		}
		return cols;
	};
	const figures = (cols) => {
		let totalPoints = 0;
		let totalWins = 0;
		let totalMatches = 0;
		for (const k of MONTH_KEYS) {
			totalPoints += cols[`${k}Points`];
			totalWins += cols[`${k}MatchesWon`];
			totalMatches += cols[`${k}Matches`];
		}
		return {
			...cols,
			totalPoints,
			matchesWon: totalWins,
			matchesPlayed: totalMatches,
			winPercentage: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 10000) / 100 : null
		};
	};

	let updated = 0;
	let created = 0;
	const seen = new Set();
	for (const row of existing) {
		const contribution = players.get(keyOf(row)) || null;
		seen.add(keyOf(row));
		const next = figures(monthColumns(row, contribution));
		// Decimals come back from the driver as strings, so compare as numbers.
		const same = (a, b) => (a == null && b == null) || Number(a) === Number(b);
		const changed = Object.keys(next).some((k) => !same(row[k], next[k]));
		if (!changed) continue;
		await tx
			.update(standing)
			.set({ ...next, updatedAt: new Date() })
			.where(eq(standing.id, row.id));
		updated++;
	}
	for (const [key, p] of players) {
		if (seen.has(key)) continue;
		if (!months.some((k) => p.months[k])) continue;
		const row = p.gemId ? byGemId.get(p.gemId) : byGemlessName.get(p.name);
		if (row) continue; // matched above under a different key spelling
		await tx.insert(standing).values({
			season,
			circuit,
			gemId: p.gemId,
			playerName: p.name,
			...figures(monthColumns(null, p))
		});
		created++;
	}

	return { updated, created, months, skipped, events, matches };
}
