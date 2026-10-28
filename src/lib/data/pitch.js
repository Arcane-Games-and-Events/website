/** Pitch colours used for card captions and decklist sections. */
export const PITCH_STYLE = {
	red: { label: 'Red', hex: '#A8392C' },
	yellow: { label: 'Yellow', hex: '#C8922E' },
	blue: { label: 'Blue', hex: '#2C5BA8' },
	colorless: { label: 'Colorless', hex: '#56503F' }
};

const BY_NUMBER = { 1: 'red', 2: 'yellow', 3: 'blue' };

/**
 * Style for a pitch given as 1 | 2 | 3 (number or string), or null when the
 * pitch is unknown.
 * @param {number | string | null | undefined} pitch
 */
export function pitchStyle(pitch) {
	return PITCH_STYLE[BY_NUMBER[pitch]] ?? null;
}
