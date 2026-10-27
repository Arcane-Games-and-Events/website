import { playerKey } from './key.js';

/**
 * Each circuit's leaderboard: AGE Points earned on that circuit only,
 * summed across seasons, highest first. Used by the circuit pop-outs on
 * the homepage and the AGE Open hub.
 *
 * @param {any[]} rows standings rows (one per player, season and circuit)
 * @param {number} [limit]
 * @returns {Record<string, { gemId: string | null, playerName: string, totalPoints: number }[]>}
 */
export function topByCircuit(rows, limit = 10) {
	/** @type {Map<string, Map<string, any>>} */
	const byCircuit = new Map();
	for (const s of rows ?? []) {
		if (!s.circuit) continue;
		if (!byCircuit.has(s.circuit)) byCircuit.set(s.circuit, new Map());
		const m = byCircuit.get(s.circuit);
		const key = playerKey(s);
		const cur = m.get(key) ?? { gemId: s.gemId ?? null, playerName: s.playerName, totalPoints: 0 };
		cur.totalPoints += s.totalPoints || 0;
		m.set(key, cur);
	}
	/** @type {Record<string, any[]>} */
	const out = {};
	for (const [c, m] of byCircuit) {
		out[c] = [...m.values()].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, limit);
	}
	return out;
}
