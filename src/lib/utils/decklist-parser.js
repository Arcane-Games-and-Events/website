/**
 * Decklist Parser Utility
 * Parses Fabrary text export format into structured decklist data
 */

/**
 * Parse a single card line into structured data
 * Format: "3x Card Name" or "3x Card Name (red)"
 * @param {string} line - Card line to parse
 * @returns {Object|null} Parsed card data or null if invalid
 */
function parseCardLine(line) {
	if (!line || !line.trim()) return null;

	const trimmed = line.trim();

	// Match pattern: "Nx Card Name" or "Nx Card Name (color)"
	// Also handles cards without quantity prefix
	const match = trimmed.match(/^(\d+)x\s+(.+?)(?:\s+\((red|yellow|blue)\))?$/i);

	if (match) {
		return {
			quantity: parseInt(match[1], 10),
			name: match[2].trim(),
			color: match[3]?.toLowerCase() || null
		};
	}

	// Handle cards without quantity (e.g., hero, equipment listed as just names)
	// These typically appear in arena cards section
	const simpleMatch = trimmed.match(/^(.+?)(?:\s+\((red|yellow|blue)\))?$/i);
	if (simpleMatch && !trimmed.startsWith('Made with') && !trimmed.startsWith('See the full')) {
		return {
			quantity: 1,
			name: simpleMatch[1].trim(),
			color: simpleMatch[2]?.toLowerCase() || null
		};
	}

	return null;
}

/**
 * Parse full Fabrary export text into structured decklist data
 * @param {string} rawText - Full Fabrary export text
 * @returns {Object} Parsed decklist data
 */
export function parseFabraryExport(rawText) {
	if (!rawText || typeof rawText !== 'string') {
		return {
			deckName: null,
			hero: null,
			format: null,
			fabraryUrl: null,
			arenaCards: [],
			deckCards: []
		};
	}

	const lines = rawText.split('\n').map(line => line.trim());

	let deckName = null;
	let hero = null;
	let format = null;
	let fabraryUrl = null;
	const arenaCards = [];
	const deckCards = [];

	let currentSection = null; // 'arena' or 'deck'

	for (const line of lines) {
		// Parse metadata lines
		if (line.startsWith('Name:')) {
			deckName = line.substring(5).trim();
			continue;
		}

		if (line.startsWith('Hero:')) {
			hero = line.substring(5).trim();
			continue;
		}

		if (line.startsWith('Format:')) {
			format = line.substring(7).trim();
			continue;
		}

		// Parse URL from footer
		if (line.includes('fabrary.net/decks/')) {
			const urlMatch = line.match(/(https?:\/\/fabrary\.net\/decks\/[^\s]+)/);
			if (urlMatch) {
				fabraryUrl = urlMatch[1];
			}
			continue;
		}

		// Skip footer lines
		if (line.startsWith('Made with') || line.startsWith('See the full')) {
			continue;
		}

		// Detect section headers
		if (line.toLowerCase() === 'arena cards') {
			currentSection = 'arena';
			continue;
		}

		if (line.toLowerCase() === 'deck cards') {
			currentSection = 'deck';
			continue;
		}

		// Skip empty lines
		if (!line) {
			continue;
		}

		// Parse card lines based on current section
		const card = parseCardLine(line);
		if (card) {
			if (currentSection === 'arena') {
				arenaCards.push(card);
			} else if (currentSection === 'deck') {
				deckCards.push(card);
			}
		}
	}

	return {
		deckName,
		hero,
		format,
		fabraryUrl,
		arenaCards,
		deckCards
	};
}

/**
 * Convert parsed decklist to format expected by Decklist component
 * @param {Object} parsed - Parsed decklist from parseFabraryExport
 * @returns {Object} Decklist data for component
 */
export function toComponentFormat(parsed) {
	return {
		deckName: parsed.deckName,
		creator: null, // Could be extracted if Fabrary includes it
		hero: parsed.hero,
		format: parsed.format,
		fabraryUrl: parsed.fabraryUrl,
		parsedCards: {
			arenaCards: parsed.arenaCards,
			deckCards: parsed.deckCards
		}
	};
}

export default {
	parseFabraryExport,
	toComponentFormat,
	parseCardLine
};
