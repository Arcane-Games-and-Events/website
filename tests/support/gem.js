/**
 * GEM export fixtures.
 *
 * `loadGem(name)` reads an anonymised real event from tests/fixtures/gem.
 * `makeGemEvent()` builds a small synthetic one for a specific cut shape.
 */
import { readFileSync } from 'node:fs';

const dir = (name) => new URL(`../fixtures/gem/${name}/`, import.meta.url);

export function loadGem(name) {
	const read = (file) => readFileSync(new URL(file, dir(name)), 'utf8');
	const standings = read('standings.csv');
	const pairings = read('pairings.csv');
	let heroes = null;
	try {
		heroes = read('heroes.csv');
	} catch {
		/* not every fixture has heroes */
	}
	const ranked = standings
		.trim()
		.split('\n')
		.slice(1)
		.map((l) => l.split(','))
		.filter(([rank]) => /^\d+$/.test(rank))
		.map(([rank, name, id, wins]) => ({ rank: Number(rank), name, id, wins: Number(wins) }));
	return { standings, pairings, heroes, ranked };
}

/** Swap the result of one pairing (round, table) in a pairings CSV. */
export function flipResult(pairingsCsv, round, table) {
	return pairingsCsv
		.split('\n')
		.map((line) => {
			const cells = line.split(',');
			if (cells[0] !== String(round) || cells[1] !== String(table)) return line;
			const r = cells[cells.length - 1].trim();
			cells[cells.length - 1] = r === '1WIN' ? '2WIN' : r === '2WIN' ? '1WIN' : r;
			return cells.join(',');
		})
		.join('\n');
}

/**
 * A synthetic event: `players` players, `swissRounds` rounds of Swiss where
 * the lower-numbered player always wins, then a single-elimination cut of
 * `cut` players (0, 2, 4 or 8) where the higher seed wins unless
 * `upsetFinal` is set.
 */
export function makeGemEvent({ players = 16, swissRounds = 4, cut = 8, upsetFinal = false } = {}) {
	const people = Array.from({ length: players }, (_, i) => ({
		name: `Player ${String(i + 1).padStart(2, '0')}`,
		id: String(10000001 + i),
		index: i,
		wins: 0
	}));
	const rows = [];
	for (let r = 1; r <= swissRounds; r++) {
		// Rotate everyone but the first so pairings differ each round.
		const order = [people[0], ...people.slice(1).slice(r - 1), ...people.slice(1).slice(0, r - 1)];
		for (let t = 0; t + 1 < order.length; t += 2) {
			const [a, b] =
				order[t].index < order[t + 1].index ? [order[t], order[t + 1]] : [order[t + 1], order[t]];
			rows.push([r, t / 2 + 1, a.name, a.id, b.name, b.id, a === order[t] ? '1WIN' : '2WIN']);
			a.wins++;
		}
	}
	const ranked = [...people].sort((x, y) => y.wins - x.wins || x.index - y.index);
	let round = swissRounds + 1;
	let alive = ranked.slice(0, cut);
	while (alive.length > 1) {
		const next = [];
		const half = alive.length / 2;
		for (let t = 0; t < half; t++) {
			const hi = alive[t];
			const lo = alive[alive.length - 1 - t];
			const final = alive.length === 2;
			const result = final && upsetFinal ? '2WIN' : '1WIN';
			rows.push([round, t + 1, hi.name, hi.id, lo.name, lo.id, result]);
			next.push(result === '1WIN' ? hi : lo);
		}
		alive = next;
		round++;
	}
	const standings = [
		'Rank,Name,Player ID,Wins',
		...ranked.map((p, i) => `${i + 1},${p.name},${p.id},${p.wins}`)
	].join('\n');
	const pairings = [
		'Round,Table,Player 1 Name,Player 1 ID,Player 2 Name,Player 2 ID,Result',
		...rows.map((r) => r.join(','))
	].join('\n');
	return { standings, pairings, ranked };
}
