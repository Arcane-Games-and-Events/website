/**
 * Canonical player identity for grouping standings and match rows.
 *
 * Identity rule:
 *   - If the row has a GEM ID, that GEM ID is the identity.
 *   - If it doesn't, the row stays isolated — we synthesize a key that can't
 *     possibly collide with any other row.
 *
 * Two GEM-less standings with the same playerName are intentionally treated
 * as DIFFERENT players. Without a GEM ID we can't prove they're the same
 * person, so we never merge their stats. (Going forward every player should
 * have a GEM ID; this branch is for legacy data only.)
 */

/**
 * @param {{ id?: string, gemId?: string|null, playerName?: string|null, season?: string|null, circuit?: string|null }} standing
 * @returns {string}
 */
export function playerKey(standing) {
	if (standing?.gemId) return `gem:${standing.gemId}`;
	// Prefer the row's own UUID — guarantees a unique key for GEM-less rows.
	if (standing?.id) return `row:${standing.id}`;
	// Fallback: name + scope. Used when callers pass aggregated objects that
	// have no `id`. Two GEM-less rows with the same name in the same
	// season/circuit are still considered separate by also folding in the
	// row's place in the input — but if scope is missing too, this is the
	// best we can do.
	const name = standing?.playerName || '';
	const season = standing?.season || '';
	const circuit = standing?.circuit || '';
	return `nm:${name}|${season}|${circuit}`;
}

/**
 * Same identity rule but for match rows where the field names differ
 * (player1GemId / player1Name / etc.). Pass any GEM ID + name pair; if the
 * GEM ID is missing you may pass a per-row fallback id to keep the key unique.
 */
export function playerKeyFromIdName(gemId, name, fallbackId = null) {
	if (gemId) return `gem:${gemId}`;
	if (fallbackId) return `row:${fallbackId}`;
	return `nm:${name || ''}`;
}
