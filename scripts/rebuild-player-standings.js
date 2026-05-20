/**
 * Rebuild standings rows for a single player from existing match data.
 *
 * Use case: you deleted a player's standings rows (e.g., to fix the
 * duplicate-name merge bug) and want to recreate them from the source-of-truth
 * matches table without touching every other player.
 *
 * Runs the same monthly placement-by-wins logic as the admin
 * `recalculateStandings` action, but only INSERTs rows for the specified GEM
 * ID. All other players in the same season/circuit are left untouched.
 *
 * Caveat: AGE points come from a simplified placement table (1st=30, 2nd=25,
 * 3rd-4th=20, 5th-8th=15, 9th-12th=12, 13th-16th=8, rest=1) — same as the
 * admin recalc action. These will not match the actual Top-8 bracket
 * placements you'd get from a fresh per-event Swiss/Pairings re-upload.
 *
 * Usage:
 *   node scripts/rebuild-player-standings.js <gemId>
 *
 * Example:
 *   node scripts/rebuild-player-standings.js 35252899
 */

import 'dotenv/config';
import { db } from '../src/lib/server/db/index.js';
import { match, standing } from '../src/lib/server/db/schema.js';
import { eq, and, or } from 'drizzle-orm';

const POINTS_TABLE = {
	1: 30,
	2: 25,
	3: 20,
	4: 20,
	5: 15,
	6: 15,
	7: 15,
	8: 15,
	9: 12,
	10: 12,
	11: 12,
	12: 12,
	13: 8,
	14: 8,
	15: 8,
	16: 8
};

const MONTH_KEYS = [
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december'
];

async function rebuildForGemId(gemId) {
	const playerMatches = await db
		.select()
		.from(match)
		.where(or(eq(match.player1GemId, gemId), eq(match.player2GemId, gemId)));

	if (playerMatches.length === 0) {
		console.log(`No matches found for GEM ID ${gemId}`);
		return;
	}

	// Group by (season, circuit) → month → matches
	const grouped = new Map(); // key: "season|circuit" → { season, circuit, monthsToMatches: Map<monthName, matches[]>, playerName }

	for (const m of playerMatches) {
		const season = m.year;
		const circuit = m.circuit;
		const monthName = m.month;
		const playerName =
			m.player1GemId === gemId ? m.player1Name : m.player2Name;

		if (!season || !circuit || !monthName) continue;

		const key = `${season}|${circuit}`;
		if (!grouped.has(key)) {
			grouped.set(key, {
				season,
				circuit,
				playerName,
				monthsToMatches: new Map()
			});
		}
		const entry = grouped.get(key);
		// Keep latest non-empty name we see (in case it varies between matches)
		if (playerName) entry.playerName = playerName;
		if (!entry.monthsToMatches.has(monthName)) {
			entry.monthsToMatches.set(monthName, []);
		}
		entry.monthsToMatches.get(monthName).push(m);
	}

	let inserted = 0;
	let skipped = 0;

	for (const [groupKey, { season, circuit, playerName, monthsToMatches }] of grouped) {
		console.log(`\nProcessing ${season} ${circuit} (${monthsToMatches.size} months)`);

		// Refuse to overwrite an existing standing row — caller must delete it
		// first if they want to rebuild. Keeps this script safe to re-run.
		const existing = await db
			.select()
			.from(standing)
			.where(
				and(eq(standing.season, season), eq(standing.circuit, circuit), eq(standing.gemId, gemId))
			)
			.limit(1);

		if (existing.length > 0) {
			console.log(
				`  Standing row already exists (id=${existing[0].id}). Skipping. Delete it first if you want to rebuild.`
			);
			skipped++;
			continue;
		}

		// For each month, compute everyone's wins to determine THIS player's
		// placement (and therefore their points).
		const monthlyUpdate = {};
		let totalPoints = 0;
		let totalWins = 0;
		let totalMatches = 0;

		for (const monthKey of MONTH_KEYS) {
			monthlyUpdate[`${monthKey}Points`] = 0;
			monthlyUpdate[`${monthKey}MatchesWon`] = 0;
			monthlyUpdate[`${monthKey}Matches`] = 0;
		}

		for (const [monthName, monthMatches] of monthsToMatches) {
			const monthKey = monthName.toLowerCase();
			if (!MONTH_KEYS.includes(monthKey)) continue;

			// Fetch ALL matches for this season/circuit/month to rank everyone
			const allMonthMatches = await db
				.select()
				.from(match)
				.where(
					and(eq(match.year, season), eq(match.circuit, circuit), eq(match.month, monthName))
				);

			// Tally wins per player (key by gemId if present, else name)
			const stats = new Map();
			const keyFor = (id, name) => (id ? `gem:${id}` : `nm:${name || ''}`);

			for (const m of allMonthMatches) {
				const p1k = keyFor(m.player1GemId, m.player1Name);
				if (!stats.has(p1k)) stats.set(p1k, { wins: 0, matches: 0 });
				stats.get(p1k).matches++;
				if (m.winner === 'player1') stats.get(p1k).wins++;

				const p2k = keyFor(m.player2GemId, m.player2Name);
				if (!stats.has(p2k)) stats.set(p2k, { wins: 0, matches: 0 });
				stats.get(p2k).matches++;
				if (m.winner === 'player2') stats.get(p2k).wins++;
			}

			// Rank players by wins (descending) — same logic as recalculateStandings
			const sorted = Array.from(stats.entries()).sort((a, b) => b[1].wins - a[1].wins);

			const myKey = keyFor(gemId, playerName);
			const myIndex = sorted.findIndex(([k]) => k === myKey);
			if (myIndex === -1) {
				console.log(`  ${monthName}: player not found in ranked stats — skipping month`);
				continue;
			}

			const placement = myIndex + 1;
			const points = POINTS_TABLE[placement] || 1;
			const { wins, matches } = sorted[myIndex][1];

			monthlyUpdate[`${monthKey}Points`] = points;
			monthlyUpdate[`${monthKey}MatchesWon`] = wins;
			monthlyUpdate[`${monthKey}Matches`] = matches;
			totalPoints += points;
			totalWins += wins;
			totalMatches += matches;

			console.log(
				`  ${monthName}: placement ${placement} of ${sorted.length}, ${wins}W/${matches}M, +${points} pts`
			);
		}

		const winPercentage =
			totalMatches > 0 ? Math.round((totalWins / totalMatches) * 10000) / 100 : null;

		await db.insert(standing).values({
			season,
			circuit,
			playerName,
			gemId,
			totalPoints,
			matchesWon: totalWins,
			matchesPlayed: totalMatches,
			winPercentage,
			...monthlyUpdate
		});

		console.log(
			`  ✓ Inserted standing: ${totalPoints} pts, ${totalWins}W/${totalMatches}M, ${winPercentage ?? '—'}%`
		);
		inserted++;
	}

	console.log(
		`\nDone. Inserted ${inserted} standing row${inserted === 1 ? '' : 's'}, skipped ${skipped}.`
	);
}

const gemId = process.argv[2];
if (!gemId) {
	console.error('Usage: node scripts/rebuild-player-standings.js <gemId>');
	process.exit(1);
}

rebuildForGemId(gemId)
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('Failed:', err);
		process.exit(1);
	});
