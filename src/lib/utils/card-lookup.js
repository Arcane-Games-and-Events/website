/**
 * Card Lookup Utility
 * Interface with fab-cards package for card data and images
 */

import { cards } from 'fab-cards';

// FAB TCG image CDN base URL
const IMAGE_CDN_BASE = 'https://storage.googleapis.com/fabmaster/media/images';

// Cache for card lookups to improve performance
const cardCache = new Map();

/**
 * Normalize card name for lookup
 * Handles variations like "Card Name (red)" -> "Card Name"
 */
function normalizeCardName(name) {
	if (!name) return '';

	// Remove color suffix if present (e.g., "(red)", "(yellow)", "(blue)")
	const normalized = name.replace(/\s*\((?:red|yellow|blue)\)\s*$/i, '').trim();

	// Convert to lowercase for case-insensitive matching
	return normalized.toLowerCase();
}

/**
 * Find a card by name in the fab-cards database
 * @param {string} cardName - Card name to look up
 * @param {string} color - Optional color (red, yellow, blue)
 * @returns {Object|null} Card data or null if not found
 */
export function findCard(cardName, color = null) {
	if (!cardName) return null;

	const normalized = normalizeCardName(cardName);
	const cacheKey = `${normalized}_${color || 'any'}`;

	// Check cache first
	if (cardCache.has(cacheKey)) {
		return cardCache.get(cacheKey);
	}

	// Search through all cards
	let foundCard = null;

	for (const card of cards) {
		const cardNameNormalized = card.name?.toLowerCase();

		if (cardNameNormalized === normalized) {
			// Exact match found
			// If color specified, try to match it
			if (color) {
				const cardPitch = card.pitch;
				const colorLower = color.toLowerCase();
				// Match pitch value: 1=red, 2=yellow, 3=blue
				if ((cardPitch === 1 && colorLower === 'red') ||
					(cardPitch === 2 && colorLower === 'yellow') ||
					(cardPitch === 3 && colorLower === 'blue')) {
					foundCard = card;
					break;
				}
			} else {
				// No color specified, return first match
				foundCard = card;
				break;
			}
		}
	}

	// Cache the result (even if null)
	cardCache.set(cacheKey, foundCard);

	return foundCard;
}

/**
 * Get card image URL
 * @param {string} cardName - Card name
 * @param {string} color - Optional color
 * @returns {string|null} Image URL or null
 */
export function getCardImage(cardName, color = null) {
	const card = findCard(cardName, color);
	if (!card) return null;

	// Get image identifier from card data
	let imageIdentifier = null;

	// Try to get the most appropriate image
	if (card.defaultImage) {
		imageIdentifier = card.defaultImage;
	} else if (card.printings && card.printings.length > 0) {
		// Use the first printing's image
		const firstPrinting = card.printings[0];
		imageIdentifier = firstPrinting.image || firstPrinting.identifier;
	}

	if (!imageIdentifier) return null;

	// Construct the full CDN URL
	// Handle both formats: "WTR006" and "WTR006.width-450"
	const cleanIdentifier = imageIdentifier.replace(/\.width-\d+$/, '');
	return `${IMAGE_CDN_BASE}/${cleanIdentifier}.width-450.webp`;
}

/**
 * Get official card page URL
 * @param {string} cardName - Card name
 * @param {string} color - Optional color
 * @returns {string} Official card page URL
 */
export function getCardUrl(cardName, color = null) {
	const card = findCard(cardName, color);

	if (card && card.cardIdentifier) {
		// Use official FAB TCG card database with cardIdentifier
		return `https://cards.fabtcg.com/card/${card.cardIdentifier}`;
	}

	// Fallback: construct search URL from card name
	return `https://cards.fabtcg.com/search?q=${encodeURIComponent(cardName)}`;
}

/**
 * Get complete card data including image and URL
 * @param {string} cardName - Card name
 * @param {string} color - Optional color
 * @returns {Object} Complete card data
 */
export function getCardData(cardName, color = null) {
	const card = findCard(cardName, color);

	return {
		name: cardName,
		color,
		found: !!card,
		image: getCardImage(cardName, color),
		url: getCardUrl(cardName, color),
		rawData: card
	};
}

/**
 * Preload card images for a decklist
 * Useful for improving hover performance
 * @param {Array} cards - Array of card objects with {name, color}
 */
export function preloadCardImages(cards) {
	if (!cards || !Array.isArray(cards)) return;

	for (const card of cards) {
		const imageUrl = getCardImage(card.name, card.color);
		if (imageUrl) {
			// Create image element to trigger browser preload
			const img = new Image();
			img.src = imageUrl;
		}
	}
}

/**
 * Clear the card lookup cache
 * Useful when fab-cards package is updated
 */
export function clearCardCache() {
	cardCache.clear();
}

export default {
	findCard,
	getCardImage,
	getCardUrl,
	getCardData,
	preloadCardImages,
	clearCardCache
};
