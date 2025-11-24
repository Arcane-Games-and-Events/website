import { cards } from '@flesh-and-blood/cards';

/**
 * Configuration for FAB card images
 * Using the official Legend Story Studios CloudFront CDN
 */
const FAB_IMAGE_CDN = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_FAB_IMAGE_CDN)
	|| 'https://d2wlb52bya4y8z.cloudfront.net/media/cards/large';

/**
 * Find a card by name
 * @param {string} cardName - The name of the card to find
 * @param {object} options - Search options
 * @param {number} options.pitch - Optional pitch value to filter by
 * @returns {object|null} The card object or null if not found
 */
export function findCard(cardName, options = {}) {
	const { pitch } = options;

	// First try exact match
	let card = cards.find(c => c.name.toLowerCase() === cardName.toLowerCase());

	// If pitch specified, try to find the specific version
	if (card && pitch !== undefined) {
		const pitchedCard = cards.find(
			c => c.name.toLowerCase() === cardName.toLowerCase() && c.pitch === pitch
		);
		if (pitchedCard) {
			card = pitchedCard;
		}
	}

	return card || null;
}

/**
 * Search for cards by partial name match
 * @param {string} searchTerm - The search term
 * @param {number} limit - Maximum number of results to return
 * @returns {Array} Array of matching cards
 */
export function searchCards(searchTerm, limit = 10) {
	const term = searchTerm.toLowerCase();
	return cards
		.filter(c => c.name.toLowerCase().includes(term))
		.slice(0, limit);
}

/**
 * Get the image URL for a card
 * @param {object} card - The card object
 * @param {object} options - Image options
 * @param {number} options.width - Desired image width (default: 450)
 * @param {boolean} options.useSpecial - Use special/alternate art if available
 * @returns {string} The full URL to the card image
 */
export function getCardImageUrl(card, options = {}) {
	if (!card) return null;

	const { width = 450, useSpecial = false } = options;

	// Use special image if requested and available, otherwise use default
	let imageIdentifier = useSpecial && card.specialImage
		? card.specialImage
		: card.defaultImage;

	if (!imageIdentifier) {
		// Fallback: try to get from first printing
		if (card.printings && card.printings.length > 0) {
			imageIdentifier = card.printings[0].identifier;
		}
	}

	if (!imageIdentifier) return null;

	// The image identifier can be in different formats:
	// - "ASR013" (just the set code)
	// - "1HP001.width-450" (with width suffix)
	// - "1HP001" (set code without suffix)

	// Extract the base identifier (remove .width-XXX suffix if present)
	const baseIdentifier = imageIdentifier.includes('.')
		? imageIdentifier.split('.')[0]
		: imageIdentifier;

	// Construct URL using official FaB CDN
	return `${FAB_IMAGE_CDN}/${baseIdentifier}.webp`;
}

/**
 * Get card data formatted for display
 * @param {string} cardName - The name of the card
 * @param {object} options - Options for card lookup and image
 * @returns {object|null} Formatted card data or null
 */
export function getCardData(cardName, options = {}) {
	const card = findCard(cardName, options);
	if (!card) return null;

	return {
		name: card.name,
		imageUrl: getCardImageUrl(card, options),
		typeText: card.typeText,
		functionalText: card.functionalText,
		cost: card.cost,
		power: card.power,
		defense: card.defense,
		pitch: card.pitch,
		sets: card.sets,
		rarities: card.rarities,
		cardIdentifier: card.cardIdentifier,
		keywords: card.keywords || [],
	};
}

/**
 * Get all printings of a card with image URLs
 * @param {string} cardName - The name of the card
 * @returns {Array} Array of printing data
 */
export function getCardPrintings(cardName) {
	const card = findCard(cardName);
	if (!card || !card.printings) return [];

	return card.printings.map(printing => ({
		identifier: printing.identifier,
		imageUrl: `${FAB_IMAGE_CDN}/${printing.identifier}.webp`,
		set: printing.set,
		edition: printing.edition,
		foiling: printing.foiling,
		treatment: printing.treatment,
	}));
}
