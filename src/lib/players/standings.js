/**
 * Season standings tiebreaks, shared by the home page, AGE Open, player
 * profiles and Admin → Players so every page ranks players the same way.
 */

import { MONTH_NAMES } from '$lib/data/months.js';

const MONTH_KEYS = MONTH_NAMES.map((m) => m.toLowerCase());

/**
 * Derived stats from a standing's monthly points:
 * - eventsPlayed: months with points > 0
 * - top8Finishes: months with points >= 15 (5th-8th or better)
 * @param {Record<string, any>} standing
 */
export function calculateDerivedStats(standing) {
	const monthlyPoints = MONTH_KEYS.map((m) => standing[`${m}Points`] || 0);
	return {
		eventsPlayed: monthlyPoints.filter((p) => p > 0).length,
		top8Finishes: monthlyPoints.filter((p) => p >= 15).length
	};
}

/**
 * Sort comparator for standings. Ranks by:
 * 1. Total points
 * 2. Top 8 finishes
 * 3. Match wins
 * 4. Events attended
 * Negative when `a` ranks higher.
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 */
export function compareStandings(a, b) {
	const pointsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
	if (pointsDiff !== 0) return pointsDiff;

	const aDerived = calculateDerivedStats(a);
	const bDerived = calculateDerivedStats(b);

	const top8Diff = bDerived.top8Finishes - aDerived.top8Finishes;
	if (top8Diff !== 0) return top8Diff;

	const winsDiff = (b.matchesWon || 0) - (a.matchesWon || 0);
	if (winsDiff !== 0) return winsDiff;

	return bDerived.eventsPlayed - aDerived.eventsPlayed;
}
