import { resolveFromPackage } from './fromPackage.js';

/** 1 | 2 | 3 from a pitch number, letter (r/y/b) or colour name; else null. */
function normalizePitch(input) {
	if (input === null || input === undefined || input === '') return null;
	if (typeof input === 'number') return [1, 2, 3].includes(input) ? input : null;

	const str = String(input).toLowerCase().trim();
	if (str === '1' || str === '2' || str === '3') return parseInt(str);
	if (str === 'r' || str === 'red') return 1;
	if (str === 'y' || str === 'yellow') return 2;
	if (str === 'b' || str === 'blue') return 3;
	return null;
}

/**
 * A card's image by name (and pitch), from the `@flesh-and-blood/cards`
 * package only: new sets show up with `pnpm update @flesh-and-blood/cards`.
 *
 * @param {string | { name: string, color?: string | null, pitch?: number | string | null }} input
 * @param {{ pitch?: number | string | null, color?: string | null }} [options]
 */
export function resolveCardImage(input, options = {}) {
	let cardName;
	let pitch;
	if (typeof input === 'object' && input !== null) {
		cardName = input.name;
		pitch = normalizePitch(input.color) || normalizePitch(input.pitch);
	} else {
		cardName = input;
		pitch = normalizePitch(options.pitch) || normalizePitch(options.color);
	}

	if (!cardName || typeof cardName !== 'string') {
		return { imageUrl: null, fallbackUrl: null, name: null, pitch: null, found: false };
	}
	return (
		resolveFromPackage({ name: cardName, pitch }) || {
			imageUrl: null,
			fallbackUrl: null,
			name: cardName,
			pitch,
			found: false
		}
	);
}
