/**
 * The tournament processor, against a real (anonymised) 85-player AGE Open
 * export with a Top 8, and against synthetic events for every cut shape.
 *
 * Expected values for the real event were worked out independently from
 * the CSVs, not from the processor's own output.
 */
import { describe, expect, test } from 'vitest';
import {
	AGE_POINTS,
	PARTICIPATION_POINTS,
	calculateFinalStandings,
	determineRoundStructure,
	isBye,
	isDraw,
	parsePairings,
	recordOf,
	parseSwissStandings,
	processTournamentResults
} from '$lib/server/tournament-processor.js';
import { loadGem, makeGemEvent } from '../support/gem.js';

const real = loadGem('top8-60-players');
const byRank = (n) => real.ranked[n - 1];

describe('a real 85-player Top 8 event', async () => {
	const out = await processTournamentResults(real.standings, real.pairings, { eventId: 'ev' });
	const { results } = out;
	const at = (placement) => results.filter((r) => r.placement === placement);
	const of = (player) => results.find((r) => r.playerId === player.id);

	test('reads 60 ranked players and ignores the Dropped section', () => {
		expect(parseSwissStandings(real.standings)).toHaveLength(60);
	});

	test('finds 7 Swiss rounds and a Top 8 cut starting in round 8', () => {
		expect(out.roundStructure).toMatchObject({
			totalRounds: 10,
			swissRounds: 7,
			bracketSize: 8,
			bracketStartRound: 8,
			hasTop8: true
		});
	});

	test('places the Top 8 from the bracket, not from Swiss rank', () => {
		expect(at(1)[0].playerId).toBe(byRank(4).id);
		expect(at(2)[0].playerId).toBe(byRank(2).id);
		expect(new Set([at(3)[0].playerId, at(4)[0].playerId])).toEqual(
			new Set([byRank(1).id, byRank(3).id])
		);
		expect(new Set([5, 6, 7, 8].map((p) => at(p)[0].playerId))).toEqual(
			new Set([5, 6, 7, 8].map((r) => byRank(r).id))
		);
	});

	test('places everyone after the cut in Swiss rank order', () => {
		for (let rank = 9; rank <= 60; rank++) {
			expect(at(rank)[0]?.playerId, `placement ${rank}`).toBe(byRank(rank).id);
		}
	});

	test('includes the 25 players who dropped without a rank, for participation points', () => {
		expect(results).toHaveLength(85);
		const placements = results.map((r) => r.placement).sort((a, b) => a - b);
		expect(placements).toEqual(Array.from({ length: 85 }, (_, i) => i + 1));
		for (const r of results.filter((r) => r.placement > 60)) {
			expect(r.points).toBe(PARTICIPATION_POINTS);
		}
	});

	test('awards points and prizes by placement band', () => {
		const pts = (p) => at(p)[0].points;
		expect([1, 2, 3, 4, 5, 8, 9, 12, 13, 16, 17, 60, 85].map(pts)).toEqual([
			30, 25, 20, 20, 15, 15, 12, 12, 8, 8, 1, 1, 1
		]);
		expect(out.summary.totalPointsDistributed).toBe(304);
		expect(out.summary.totalPrizeDistributed).toBe(400 + 200 + 100 * 2 + 50 * 4);
		expect(AGE_POINTS[1]).toEqual({ points: 30, prize: 400 });
	});

	test('counts Swiss and bracket matches in each record', () => {
		expect(of(byRank(1))).toMatchObject({ matchesWon: 8, matchesPlayed: 9 }); // 7-0, won QF, lost SF
		expect(of(byRank(4))).toMatchObject({ matchesWon: 9, matchesPlayed: 10 }); // the winner
		expect(of(byRank(2))).toMatchObject({ matchesWon: 8, matchesPlayed: 10 }); // lost the final
		expect(of(byRank(60))).toMatchObject({ matchesWon: 1, matchesPlayed: 7 });
	});

	test('never treats a bye as a player', () => {
		expect(results.some((r) => /^none$/i.test(r.name))).toBe(false);
		expect(isBye('', 'None')).toBe(true);
		expect(isBye('', 'BYE')).toBe(true);
		expect(isBye('123', 'None')).toBe(false);
	});

	test('keeps two players who share a name apart', () => {
		const ranked33 = byRank(33);
		const twins = results.filter((r) => r.name === ranked33.name);
		expect(twins).toHaveLength(2);
		const [kept, dropped] = [
			twins.find((t) => t.playerId === ranked33.id),
			twins.find((t) => t.playerId !== ranked33.id)
		];
		expect(kept).toMatchObject({ placement: 33, matchesWon: 4, matchesPlayed: 7 });
		expect(dropped).toMatchObject({
			matchesWon: 0,
			matchesPlayed: 1,
			points: PARTICIPATION_POINTS
		});
	});

	test('records the matches of players who dropped before the end', () => {
		// Counted independently from the pairings: every unranked player's
		// wins and matches, byes and draws included.
		const ranked = new Set(real.ranked.map((p) => p.id));
		const record = new Map();
		for (const line of real.pairings.trim().split('\n').slice(1)) {
			const [, , n1, id1, n2, id2, result] = line.split(',');
			for (const [id, name, side] of [
				[id1, n1, '1'],
				[id2, n2, '2']
			]) {
				if (!id && /^none$/i.test(name)) continue;
				const r = record.get(id) || { won: 0, played: 0 };
				r.played++;
				if (result.trim() === `${side}WIN`) r.won++;
				record.set(id, r);
			}
		}
		const dropped = results.filter((r) => !ranked.has(r.playerId));
		expect(dropped).toHaveLength(25);
		for (const r of dropped) {
			expect({ won: r.matchesWon, played: r.matchesPlayed }, r.playerId).toEqual(
				record.get(r.playerId)
			);
		}
		expect(dropped.some((r) => r.matchesWon >= 3)).toBe(true);
	});

	test('handles a short GEM ID', () => {
		const short = results.find((r) => r.playerId && r.playerId.length < 8);
		expect(short).toMatchObject({ matchesWon: 0, matchesPlayed: 1 });
	});

	test('a draw is neither a win nor a loss', () => {
		// The one draw in this event: Swiss 52nd vs 59th.
		for (const [rank, won] of [
			[52, 3],
			[59, 2]
		]) {
			const r = of(byRank(rank));
			expect(r).toMatchObject({ matchesWon: won, matchesDrawn: 1, matchesPlayed: 7 });
			expect(recordOf(r)).toEqual({ wins: won, losses: 7 - won - 1, draws: 1 });
		}
		expect(results.reduce((n, r) => n + (r.matchesDrawn || 0), 0)).toBe(2);
		expect(isDraw({ result: 'DRAW' })).toBe(true);
		expect(isDraw({ result: '1WIN' })).toBe(false);
	});

	test('stores every pairing as a match, with no winner for a draw', () => {
		expect(out.matches).toHaveLength(279);
		const draws = out.matches.filter((m) => m.winner === null);
		expect(draws).toHaveLength(1);
		const byes = out.matches.filter((m) => !m.player2GemId && /^none$/i.test(m.player2Name));
		expect(byes).toHaveLength(5);
		expect(byes.every((m) => m.winner === 'player1')).toBe(true);
	});
});

describe('cut shapes', () => {
	const structure = (e) =>
		determineRoundStructure(parsePairings(e.pairings), parseSwissStandings(e.standings));
	const winnerOf = (e) =>
		calculateFinalStandings(
			parseSwissStandings(e.standings),
			parsePairings(e.pairings)
		).results.find((r) => r.placement === 1);

	test('16 players, Top 8', () => {
		const e = makeGemEvent({ players: 16, swissRounds: 4, cut: 8 });
		expect(structure(e)).toMatchObject({ swissRounds: 4, bracketSize: 8, bracketStartRound: 5 });
		expect(winnerOf(e).playerId).toBe(e.ranked[0].id);
	});

	test('16 players, Top 4', () => {
		const e = makeGemEvent({ players: 16, swissRounds: 4, cut: 4 });
		expect(structure(e)).toMatchObject({ swissRounds: 4, bracketSize: 4, bracketStartRound: 5 });
	});

	test('a lone final', () => {
		const e = makeGemEvent({ players: 6, swissRounds: 3, cut: 2, upsetFinal: true });
		expect(structure(e)).toMatchObject({ swissRounds: 3, bracketSize: 2, bracketStartRound: 4 });
		expect(winnerOf(e).playerId).toBe(e.ranked[1].id);
	});

	test('8 players with a Top 8: Swiss rounds also have 4 matches, the win count decides', () => {
		const e = makeGemEvent({ players: 8, swissRounds: 3, cut: 8 });
		expect(structure(e)).toMatchObject({ swissRounds: 3, bracketSize: 8, bracketStartRound: 4 });
	});

	test('no cut: every round is Swiss and placements follow rank', () => {
		const e = makeGemEvent({ players: 8, swissRounds: 3, cut: 0 });
		expect(structure(e)).toMatchObject({ swissRounds: 3, bracketSize: 0, hasBracket: false });
		expect(winnerOf(e).playerId).toBe(e.ranked[0].id);
	});

	test('an upset final crowns the lower seed', () => {
		const e = makeGemEvent({ players: 16, swissRounds: 4, cut: 8, upsetFinal: true });
		const final = calculateFinalStandings(
			parseSwissStandings(e.standings),
			parsePairings(e.pairings)
		).results;
		expect(final.find((r) => r.placement === 2).playerId).toBe(e.ranked[0].id);
	});
});

describe('bad input', () => {
	test('empty standings are refused', async () => {
		await expect(
			processTournamentResults('Rank,Name,Player ID,Wins\n', real.pairings, {})
		).rejects.toThrow(/Swiss Standings/);
	});
	test('empty pairings are refused', async () => {
		await expect(processTournamentResults(real.standings, 'Round,Table\n', {})).rejects.toThrow(
			/Pairings/
		);
	});
});
