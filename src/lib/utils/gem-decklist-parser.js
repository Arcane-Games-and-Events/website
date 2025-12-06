/**
 * GEM Decklist Parser
 *
 * Parses decklists exported from GEM (Game Event Manager) format.
 *
 * GEM Format Example:
 * Weapon / Equipment
 * 1 Balance of Justice
 * 2 Cintari Saber
 * 9 Total Weapon / Equipment
 * Pitch 0/1 (Red)
 * 3 Blade Flurry
 * 40 Total Pitch 0/1
 * Pitch 2 (Yellow)
 * 3 Blood Follows Blade
 * 18 Total Pitch 2
 * Pitch 3 (Blue)
 * 3 Blade Runner
 * 13 Total Pitch 3
 */

// Section types for categorization
const SECTION_PATTERNS = {
	equipment: /^weapon\s*\/?\s*equipment$/i,
	red: /^pitch\s*0\/1\s*\(red\)$/i,
	yellow: /^pitch\s*2\s*\(yellow\)$/i,
	blue: /^pitch\s*3\s*\(blue\)$/i
};

// Pattern to detect total lines (to skip them)
const TOTAL_PATTERN = /^\d+\s+total\s+/i;

// Pattern to parse card lines: "1 Card Name" or "3 Blade Flurry"
const CARD_LINE_PATTERN = /^(\d+)\s+(.+)$/;

/**
 * Parse a GEM format decklist string
 * @param {string} rawText - The raw decklist text from GEM
 * @returns {Object} Parsed decklist with sections
 */
export function parseGemDecklist(rawText) {
	if (!rawText || typeof rawText !== 'string') {
		return {
			equipment: [],
			red: [],
			yellow: [],
			blue: [],
			allCards: [],
			totals: {
				equipment: 0,
				red: 0,
				yellow: 0,
				blue: 0,
				total: 0
			}
		};
	}

	const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);

	let currentSection = null;
	const sections = {
		equipment: [],
		red: [],
		yellow: [],
		blue: []
	};

	for (const line of lines) {
		// Check if this is a section header
		let foundSection = false;
		for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
			if (pattern.test(line)) {
				currentSection = sectionName;
				foundSection = true;
				break;
			}
		}
		if (foundSection) continue;

		// Skip total lines
		if (TOTAL_PATTERN.test(line)) continue;

		// Try to parse as a card line
		const match = line.match(CARD_LINE_PATTERN);
		if (match && currentSection) {
			const quantity = parseInt(match[1], 10);
			const name = match[2].trim();

			// Determine color based on section
			let color = null;
			if (currentSection === 'red') color = 'red';
			else if (currentSection === 'yellow') color = 'yellow';
			else if (currentSection === 'blue') color = 'blue';

			sections[currentSection].push({
				quantity,
				name,
				color,
				section: currentSection
			});
		}
	}

	// Build allCards array for easy iteration
	const allCards = [
		...sections.equipment,
		...sections.red,
		...sections.yellow,
		...sections.blue
	];

	// Calculate totals
	const totals = {
		equipment: sections.equipment.reduce((sum, c) => sum + c.quantity, 0),
		red: sections.red.reduce((sum, c) => sum + c.quantity, 0),
		yellow: sections.yellow.reduce((sum, c) => sum + c.quantity, 0),
		blue: sections.blue.reduce((sum, c) => sum + c.quantity, 0),
		total: allCards.reduce((sum, c) => sum + c.quantity, 0)
	};

	return {
		equipment: sections.equipment,
		red: sections.red,
		yellow: sections.yellow,
		blue: sections.blue,
		allCards,
		totals
	};
}

/**
 * Convert parsed GEM decklist to the format used for database storage
 * @param {Object} parsed - Output from parseGemDecklist
 * @returns {Array} Array of card objects for JSONB storage
 */
export function toStorageFormat(parsed) {
	return parsed.allCards.map(card => ({
		name: card.name,
		quantity: card.quantity,
		section: card.section,
		color: card.color
	}));
}

/**
 * Convert stored cards array back to display format
 * @param {Array} cards - Array from database
 * @returns {Object} Grouped by section
 */
export function fromStorageFormat(cards) {
	if (!Array.isArray(cards)) {
		return {
			equipment: [],
			red: [],
			yellow: [],
			blue: [],
			allCards: [],
			totals: { equipment: 0, red: 0, yellow: 0, blue: 0, total: 0 }
		};
	}

	const sections = {
		equipment: [],
		red: [],
		yellow: [],
		blue: []
	};

	for (const card of cards) {
		const section = card.section || 'equipment';
		if (sections[section]) {
			sections[section].push(card);
		}
	}

	const allCards = [...sections.equipment, ...sections.red, ...sections.yellow, ...sections.blue];

	const totals = {
		equipment: sections.equipment.reduce((sum, c) => sum + c.quantity, 0),
		red: sections.red.reduce((sum, c) => sum + c.quantity, 0),
		yellow: sections.yellow.reduce((sum, c) => sum + c.quantity, 0),
		blue: sections.blue.reduce((sum, c) => sum + c.quantity, 0),
		total: allCards.reduce((sum, c) => sum + c.quantity, 0)
	};

	return {
		equipment: sections.equipment,
		red: sections.red,
		yellow: sections.yellow,
		blue: sections.blue,
		allCards,
		totals
	};
}

/**
 * Generate standardized decklist title
 * @param {Object} options
 * @param {string} options.circuit - Circuit name (e.g., "Los Angeles")
 * @param {string} options.month - Month name (e.g., "January")
 * @param {string} options.playerName - Player's name
 * @param {number|string} options.placement - Placement (1-8)
 * @returns {string} Formatted title
 */
export function generateDecklistTitle({ circuit, month, playerName, placement }) {
	const placementSuffix = getPlacementSuffix(placement);
	return `${circuit} | ${month} | ${playerName} | ${placementSuffix}`;
}

/**
 * Get ordinal suffix for placement (1st, 2nd, 3rd, etc.)
 * @param {number|string} placement
 * @returns {string}
 */
export function getPlacementSuffix(placement) {
	const num = parseInt(placement, 10);
	if (isNaN(num)) return placement;

	if (num === 1) return '1st';
	if (num === 2) return '2nd';
	if (num === 3) return '3rd';
	return `${num}th`;
}

/**
 * Validate that the decklist has required sections
 * @param {Object} parsed - Parsed decklist
 * @returns {Object} Validation result with isValid and errors
 */
export function validateDecklist(parsed) {
	const errors = [];

	if (parsed.totals.equipment === 0) {
		errors.push('No equipment/weapons found');
	}

	if (parsed.totals.total === 0) {
		errors.push('Decklist is empty');
	}

	// Standard CC deck should have around 60 cards + equipment
	// But we'll be lenient for now

	return {
		isValid: errors.length === 0,
		errors,
		warnings: []
	};
}
