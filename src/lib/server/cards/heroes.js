/**
 * Every hero name, straight from the `@flesh-and-blood/cards` package, so a
 * new set's heroes show up with `pnpm update @flesh-and-blood/cards`.
 * Spellings match GEM exports (e.g. "Jarl Vetreiði", "Dorinthea Ironsong"),
 * which is what event_player_heroes stores.
 */
import { cards } from '@flesh-and-blood/cards';

const g = /** @type {any} */ (globalThis);

/** @returns {string[]} hero names, A–Z */
export function listHeroNames() {
	if (g.__ageHeroNames) return g.__ageHeroNames;
	const names = new Set();
	for (const c of cards) if (c.types?.includes('Hero')) names.add(c.name);
	g.__ageHeroNames = [...names].sort((a, b) => a.localeCompare(b));
	return g.__ageHeroNames;
}
