import cardsData from '$lib/data/cards.json';

/**
 * Configuration for FAB card images
 * Using the official Legend Story Studios CloudFront CDN
 */
export const FAB_IMAGE_CDN = 'https://d2wlb52bya4y8z.cloudfront.net/media/cards/large';

/**
 * Normalize pitch/color input to pitch number (1, 2, 3) or null
 * Accepts: 1, 2, 3, "1", "2", "3", "r", "y", "b", "red", "yellow", "blue"
 */
export function normalizePitch(input) {
	if (input === null || input === undefined || input === '') return null;

	// Already a number
	if (typeof input === 'number') {
		return [1, 2, 3].includes(input) ? input : null;
	}

	const str = String(input).toLowerCase().trim();

	// Numeric string
	if (str === '1' || str === '2' || str === '3') {
		return parseInt(str);
	}

	// Single letter
	if (str === 'r') return 1;
	if (str === 'y') return 2;
	if (str === 'b') return 3;

	// Full color name
	if (str === 'red') return 1;
	if (str === 'yellow') return 2;
	if (str === 'blue') return 3;

	return null;
}

// Sets that don't work with the official CDN (promos, special sets)
const NON_CDN_SETS = new Set([
	'FAB', 'LGS', 'HER', 'JDG', 'WIN', 'LSS', 'GEM', 'TCC',
	'AAZ', 'AGB', 'AIO', 'AKO', 'AMX', 'APR', 'APS', 'ASB', 'ASR', 'AST',
	'AUA', 'AVS', 'BET', 'BOL', 'BRI', 'CHN', 'CIN', 'DRO', 'DVR', 'ENG',
	'FAI', 'FLR', 'FNG', 'KSI', 'KYO', 'LEV', 'LXI', 'NUU', 'OLA', 'OLD',
	'OSC', 'PSM', 'RHI', 'RVD', 'VER', 'VIC', 'WOD', 'ZEN'
]);

// Build lookup map on module load
const cardImageMap = new Map();
const pitchToSection = { 1: 'red', 2: 'yellow', 3: 'blue', '1': 'red', '2': 'yellow', '3': 'blue' };

/**
 * Find the best printing for a card (CDN-compatible, non-foil preferred)
 */
function findBestPrinting(printings) {
	const excludedRarities = ['P', 'V'];
	const excludedEditions = ['N'];

	const passesBasicFilters = (p) =>
		p.id && !excludedRarities.includes(p.rarity) && !excludedEditions.includes(p.edition);
	const isCdnCompatible = (p) => !NON_CDN_SETS.has(p.set_id);

	// Try CDN-compatible non-foil first
	const cdnNonFoil = printings.find(p => passesBasicFilters(p) && isCdnCompatible(p) && (!p.foiling || p.foiling === ''));
	if (cdnNonFoil) return { printing: cdnNonFoil, useCdn: true };

	// Try CDN-compatible cold foil
	const cdnColdFoil = printings.find(p => passesBasicFilters(p) && isCdnCompatible(p) && p.foiling === 'S');
	if (cdnColdFoil) return { printing: cdnColdFoil, useCdn: true };

	// Try CDN-compatible rainbow foil
	const cdnRainbowFoil = printings.find(p => passesBasicFilters(p) && isCdnCompatible(p) && p.foiling === 'R');
	if (cdnRainbowFoil) return { printing: cdnRainbowFoil, useCdn: true };

	// Try any CDN-compatible printing (non-gold)
	const anyCdnPrinting = printings.find(p => p.id && isCdnCompatible(p) && p.foiling !== 'G');
	if (anyCdnPrinting) return { printing: anyCdnPrinting, useCdn: true };

	// Fallback to image_url if available
	const fallbackNonFoil = printings.find(p => p.image_url && (!p.foiling || p.foiling === ''));
	if (fallbackNonFoil) return { printing: fallbackNonFoil, useCdn: false };

	const fallbackAny = printings.find(p => p.image_url && p.foiling !== 'G');
	if (fallbackAny) return { printing: fallbackAny, useCdn: false };

	// Last resort
	const lastResort = printings.find(p => p.image_url || p.id);
	return lastResort ? { printing: lastResort, useCdn: !!lastResort.id && isCdnCompatible(lastResort) } : null;
}

// Build the lookup map from cards.json
for (const card of cardsData) {
	if (card.name && card.printings && card.printings.length > 0) {
		const result = findBestPrinting(card.printings);
		if (result) {
			const { printing, useCdn } = result;
			const imageUrl = useCdn ? `${FAB_IMAGE_CDN}/${printing.id}.webp` : printing.image_url;

			if (imageUrl) {
				const cardData = {
					name: card.name,
					imageUrl,
					fallbackUrl: printing.image_url,
					color: card.color,
					pitch: card.pitch,
					types: card.types || [],
					typeText: card.type_text,
					cost: card.cost,
					power: card.power,
					defense: card.defense,
					keywords: card.keywords || []
				};

				const baseName = card.name.toLowerCase();
				const section = pitchToSection[card.pitch];

				// Store by name:pitch for pitch-specific lookups
				if (section) {
					cardImageMap.set(`${baseName}:${section}`, cardData);
				}
				// Store by base name (first match wins for cards without pitch)
				if (!cardImageMap.has(baseName)) {
					cardImageMap.set(baseName, cardData);
				}
			}
		}
	}
}

/**
 * Find a card by name
 * @param {string} cardName - The name of the card to find
 * @param {object} options - Search options
 * @param {number} options.pitch - Optional pitch value to filter by (1=red, 2=yellow, 3=blue)
 * @returns {object|null} The card object or null if not found
 */
export function findCard(cardName, options = {}) {
	const { pitch } = options;
	const normalizedName = cardName.trim().toLowerCase();

	// If pitch specified, try pitch-specific lookup first
	if (pitch !== undefined) {
		const section = pitchToSection[pitch];
		if (section) {
			const pitchKey = `${normalizedName}:${section}`;
			if (cardImageMap.has(pitchKey)) {
				return cardImageMap.get(pitchKey);
			}
		}
	}

	// Try direct name match
	if (cardImageMap.has(normalizedName)) {
		return cardImageMap.get(normalizedName);
	}

	// Try without pitch suffix (e.g., "Snatch (1)" -> "snatch")
	const withoutPitchSuffix = normalizedName.replace(/\s*\(\d\)\s*$/, '').replace(/\s*\((red|yellow|blue)\)\s*$/i, '');
	if (cardImageMap.has(withoutPitchSuffix)) {
		return cardImageMap.get(withoutPitchSuffix);
	}

	// Try partial match (prefix)
	for (const [key, value] of cardImageMap) {
		if (key.startsWith(normalizedName) || normalizedName.startsWith(key.split(':')[0])) {
			return value;
		}
	}

	return null;
}

/**
 * Search for cards by partial name match
 * @param {string} searchTerm - The search term
 * @param {number} limit - Maximum number of results to return
 * @returns {Array} Array of matching cards
 */
export function searchCards(searchTerm, limit = 10) {
	const term = searchTerm.toLowerCase();
	const results = [];
	const seen = new Set();

	for (const [key, card] of cardImageMap) {
		// Skip pitch-specific entries to avoid duplicates
		if (key.includes(':')) continue;

		if (card.name.toLowerCase().includes(term)) {
			if (!seen.has(card.name)) {
				seen.add(card.name);
				results.push(card);
				if (results.length >= limit) break;
			}
		}
	}

	return results;
}

/**
 * Get the image URL for a card
 * @param {object} card - The card object from findCard
 * @returns {string|null} The full URL to the card image
 */
export function getCardImageUrl(card) {
	if (!card) return null;
	return card.imageUrl || card.fallbackUrl || null;
}

/**
 * Get card data formatted for display
 * @param {string} cardName - The name of the card
 * @param {object} options - Options for card lookup
 * @returns {object|null} Formatted card data or null
 */
export function getCardData(cardName, options = {}) {
	const card = findCard(cardName, options);
	if (!card) return null;

	return {
		name: card.name,
		imageUrl: card.imageUrl,
		fallbackUrl: card.fallbackUrl,
		typeText: card.typeText,
		cost: card.cost,
		power: card.power,
		defense: card.defense,
		pitch: card.pitch,
		types: card.types,
		keywords: card.keywords || []
	};
}

/**
 * Get all printings of a card with image URLs
 * @param {string} cardName - The name of the card
 * @returns {Array} Array of printing data
 */
export function getCardPrintings(cardName) {
	const normalizedName = cardName.trim().toLowerCase();

	// Find the original card in cardsData to get all printings
	const card = cardsData.find(c => c.name.toLowerCase() === normalizedName);
	if (!card || !card.printings) return [];

	return card.printings.map(printing => ({
		identifier: printing.id,
		imageUrl: printing.id && !NON_CDN_SETS.has(printing.set_id)
			? `${FAB_IMAGE_CDN}/${printing.id}.webp`
			: printing.image_url,
		set: printing.set_id,
		edition: printing.edition,
		foiling: printing.foiling,
		rarity: printing.rarity
	})).filter(p => p.imageUrl);
}

/**
 * UNIFIED CARD IMAGE RESOLVER
 * Single entry point for getting card images across the entire site.
 * Accepts multiple input formats and returns consistent output.
 *
 * @param {string|object} input - Card name string OR object with name/pitch/color
 * @param {object} options - Additional options when input is a string
 * @param {number|string} options.pitch - Pitch value (1/2/3, "r"/"y"/"b", "red"/"yellow"/"blue")
 * @param {string} options.color - Color name ("red", "yellow", "blue") - alias for pitch
 *
 * @returns {object} { imageUrl, fallbackUrl, name, pitch, found }
 *
 * @example
 * // String with pitch option
 * resolveCardImage('Snatch', { pitch: 1 })
 * resolveCardImage('Snatch', { pitch: 'r' })
 * resolveCardImage('Snatch', { color: 'red' })
 *
 * @example
 * // Object input (from decklists)
 * resolveCardImage({ name: 'Snatch', color: 'red' })
 * resolveCardImage({ name: 'Fyendal\'s Spring Tunic' }) // equipment, no pitch
 *
 * @example
 * // From data attributes
 * resolveCardImage(element.dataset.cardName, { pitch: element.dataset.cardPitch })
 */
export function resolveCardImage(input, options = {}) {
	let cardName;
	let pitch;

	// Handle object input (from decklist components)
	if (typeof input === 'object' && input !== null) {
		cardName = input.name;
		// Try color first (decklist format), then pitch
		pitch = normalizePitch(input.color) || normalizePitch(input.pitch);
	} else {
		// String input
		cardName = input;
		// Options can have pitch or color
		pitch = normalizePitch(options.pitch) || normalizePitch(options.color);
	}

	// Validate card name
	if (!cardName || typeof cardName !== 'string') {
		return { imageUrl: null, fallbackUrl: null, name: null, pitch: null, found: false };
	}

	// Look up the card
	const card = findCard(cardName, { pitch });

	if (!card) {
		return {
			imageUrl: null,
			fallbackUrl: null,
			name: cardName,
			pitch,
			found: false
		};
	}

	return {
		imageUrl: card.imageUrl || null,
		fallbackUrl: card.fallbackUrl || null,
		name: card.name,
		pitch: card.pitch,
		found: true
	};
}
