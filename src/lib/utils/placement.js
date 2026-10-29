/**
 * Decklist finishes are recorded as Top 8 bands: the two semi-final losers
 * tie for 3rd–4th and the quarter-final losers for 5th–8th, so a placement
 * is stored as the first place in its band (1, 2, 3 or 5).
 */
export const PLACEMENT_BANDS = [
	{ value: '1', label: '1st' },
	{ value: '2', label: '2nd' },
	{ value: '3', label: '3rd–4th' },
	{ value: '5', label: '5th–8th' }
];

/** The band value (as the select option string) for any placement, '' for none. */
export function placementBand(placement) {
	const p = Number(placement) || 0;
	if (p <= 0) return '';
	if (p >= 5) return '5';
	if (p >= 3) return '3';
	return String(p);
}

/** "1st", "2nd", "3rd–4th", "5th–8th"; placements past the cut keep their ordinal. */
export function placementLabel(placement) {
	const p = Number(placement) || 0;
	if (p <= 0) return '—';
	if (p > 8) return `${p}th`;
	return PLACEMENT_BANDS.find((b) => b.value === placementBand(p))?.label || `${p}th`;
}
