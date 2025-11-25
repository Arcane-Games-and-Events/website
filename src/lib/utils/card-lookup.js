/**
 * Card Lookup Utility
 * Uses local card data from the-fab-cube/flesh-and-blood-cards repository
 * for up-to-date card information including newer sets
 */

import cardData from '$lib/data/cards.json';

// Sets to exclude from printing selection
const EXCLUDED_SETS = new Set(['1HP']);

// Rarities to exclude from printing selection
const EXCLUDED_RARITIES = new Set(['P', 'V']);

// Cache for card lookups
let cardIndexByName = null;

/**
 * Normalize card name for lookup
 * Handles variations like "Card Name (red)" -> "Card Name"
 */
function normalizeCardName(name) {
	if (!name) return '';
	// Remove color suffix if present (e.g., "(red)", "(yellow)", "(blue)")
	const normalized = name.replace(/\s*\((?:red|yellow|blue)\)\s*$/i, '').trim();
	return normalized.toLowerCase();
}

/**
 * Filter printings to exclude certain sets and rarities
 * @param {Array} printings - Array of printing objects
 * @returns {Array} Filtered printings
 */
function filterPrintings(printings) {
	if (!printings) return [];
	return printings.filter(p => {
		// Exclude specific sets
		if (EXCLUDED_SETS.has(p.set_id)) return false;
		// Exclude specific rarities
		if (EXCLUDED_RARITIES.has(p.rarity)) return false;
		return true;
	});
}

/**
 * Get best printing for image display
 * Prefers standard (non-foil) printings
 * @param {Array} printings - Filtered array of printing objects
 * @returns {Object|null} Best printing or null
 */
function getBestPrinting(printings) {
	if (!printings || printings.length === 0) return null;
	// Prefer standard foiling (S), then any other
	return printings.find(p => p.foiling === 'S') || printings[0];
}

/**
 * Build index of cards by normalized name for fast lookups
 */
function buildCardIndex() {
	if (cardIndexByName) return;

	cardIndexByName = new Map();

	for (const card of cardData) {
		const normalizedName = normalizeCardName(card.name);

		if (!cardIndexByName.has(normalizedName)) {
			cardIndexByName.set(normalizedName, []);
		}
		cardIndexByName.get(normalizedName).push(card);
	}
}

// Build index on module load
buildCardIndex();

/**
 * Find a card by name in the database
 * @param {string} cardName - Card name to look up
 * @param {string} color - Optional color (red, yellow, blue)
 * @returns {Object|null} Card data or null if not found
 */
export function findCard(cardName, color = null) {
	if (!cardName) return null;

	if (!cardIndexByName) buildCardIndex();

	const normalized = normalizeCardName(cardName);
	const matches = cardIndexByName.get(normalized);

	if (!matches || matches.length === 0) {
		return null;
	}

	// If color specified, find matching color variant
	if (color) {
		const colorLower = color.toLowerCase();
		const colorMatch = matches.find(card => {
			const cardColor = card.color?.toLowerCase();
			return cardColor === colorLower;
		});
		if (colorMatch) return colorMatch;
	}

	// Return first match (or only match for non-colored cards)
	return matches[0];
}

/**
 * Get card image URL
 * Uses image_url from filtered printings (excludes 1HP, P, V)
 * @param {string} cardName - Card name
 * @param {string} color - Optional color
 * @returns {string|null} Image URL or null
 */
export function getCardImage(cardName, color = null) {
	const card = findCard(cardName, color);
	if (!card) return null;

	// Filter printings and get best one
	const validPrintings = filterPrintings(card.printings);
	const printing = getBestPrinting(validPrintings);

	// Use the image_url from the JSON data
	if (printing && printing.image_url) {
		return printing.image_url;
	}

	return null;
}

/**
 * Get official card page URL
 * @param {string} cardName - Card name
 * @param {string} color - Optional color
 * @returns {string} Official card page URL
 */
export function getCardUrl(cardName, color = null) {
	const card = findCard(cardName, color);

	if (card) {
		const validPrintings = filterPrintings(card.printings);
		const printing = getBestPrinting(validPrintings);
		if (printing && printing.id) {
			return `https://cards.fabtcg.com/?search=${encodeURIComponent(printing.id)}`;
		}
	}

	// Fallback: construct search URL from card name
	return `https://cards.fabtcg.com/?search=${encodeURIComponent(cardName)}`;
}

/**
 * Get complete card data including image and URL
 * @param {string} cardName - Card name
 * @param {string} color - Optional color
 * @returns {Object} Complete card data
 */
export function getCardData(cardName, color = null) {
	const card = findCard(cardName, color);
	const image = getCardImage(cardName, color);
	const url = getCardUrl(cardName, color);

	return {
		name: cardName,
		color,
		found: !!card,
		image,
		url,
		rawData: card
	};
}

/**
 * Get total number of cards in database
 * @returns {number}
 */
export function getCardCount() {
	return cardData.length;
}

/**
 * Check if card data is loaded
 * @returns {boolean}
 */
export function isCardDataLoaded() {
	return cardData && cardData.length > 0;
}

export default {
	findCard,
	getCardImage,
	getCardUrl,
	getCardData,
	getCardCount,
	isCardDataLoaded
};
