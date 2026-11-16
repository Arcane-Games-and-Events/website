/**
 * Centralized circuit configuration for AGE Open Series
 * Single source of truth for circuit colors, images, and metadata
 */

export const CIRCUITS = {
	'Los Angeles': {
		id: 'los-angeles',
		name: 'Los Angeles',
		abbreviation: 'LA',
		region: 'West Coast',
		color: 'blue',
		image: '/images/circuits/los-angeles.webp',
		// Hex colors for inline styles
		hex: {
			primary: '#3b82f6', // blue-500
			light: '#60a5fa', // blue-400
			dark: '#2563eb' // blue-600
		},
		colors: {
			// Core colors
			bg: 'bg-blue-500',
			bgDark: 'bg-blue-600',
			bgLight: 'bg-blue-500/10',
			bgLighter: 'bg-blue-500/20',
			text: 'text-blue-400',
			textLight: 'text-blue-300',
			border: 'border-blue-500/30',
			borderHover: 'border-blue-400/50',
			borderSolid: 'border-blue-500',
			borderLeft: 'border-l-blue-500',
			ring: 'ring-blue-500/30',
			shadow: 'shadow-blue-500/20',
			// Animation colors
			ping: 'bg-blue-400',
			dot: 'bg-blue-500',
			// Cell/table styling
			cellBg: 'bg-blue-950/30',
			cellBorder: 'border-blue-500/20',
			// Gradients
			gradient: 'from-blue-600/30 to-blue-500/20',
			gradientHover: 'from-blue-600/50 to-blue-500/40',
			gradientSolid: 'from-blue-400 to-blue-600',
			gradientBadge: 'from-blue-400 to-blue-600',
			// Calendar/Event card hover classes (includes hover: prefix)
			eventGradient: 'from-blue-600/30 to-blue-500/20',
			eventGradientHover: 'hover:from-blue-600/50 hover:to-blue-500/40',
			eventText: 'text-blue-300',
			eventBorder: 'border-blue-500/30',
			eventBorderHover: 'hover:border-blue-400/50',
			eventShadow: 'hover:shadow-blue-500/20'
		}
	},
	'St. Louis': {
		id: 'st-louis',
		name: 'St. Louis',
		abbreviation: 'STL',
		region: 'Midwest',
		color: 'green',
		image: '/images/circuits/st-louis.webp',
		// Hex colors for inline styles
		hex: {
			primary: '#22c55e', // green-500
			light: '#4ade80', // green-400
			dark: '#16a34a' // green-600
		},
		colors: {
			bg: 'bg-green-500',
			bgDark: 'bg-green-600',
			bgLight: 'bg-green-500/10',
			bgLighter: 'bg-green-500/20',
			text: 'text-green-400',
			textLight: 'text-green-300',
			border: 'border-green-500/30',
			borderHover: 'border-green-400/50',
			borderSolid: 'border-green-500',
			borderLeft: 'border-l-green-500',
			ring: 'ring-green-500/30',
			shadow: 'shadow-green-500/20',
			ping: 'bg-green-400',
			dot: 'bg-green-500',
			cellBg: 'bg-green-950/30',
			cellBorder: 'border-green-500/20',
			gradient: 'from-green-600/30 to-green-500/20',
			gradientHover: 'from-green-600/50 to-green-500/40',
			gradientSolid: 'from-green-400 to-green-600',
			gradientBadge: 'from-green-400 to-green-600',
			eventGradient: 'from-green-600/30 to-green-500/20',
			eventGradientHover: 'hover:from-green-600/50 hover:to-green-500/40',
			eventText: 'text-green-300',
			eventBorder: 'border-green-500/30',
			eventBorderHover: 'hover:border-green-400/50',
			eventShadow: 'hover:shadow-green-500/20'
		}
	},
	'New England': {
		id: 'new-england',
		name: 'New England',
		abbreviation: 'NE',
		region: 'East Coast',
		color: 'purple',
		image: '/images/circuits/new-england.webp',
		// Hex colors for inline styles
		hex: {
			primary: '#a855f7', // purple-500
			light: '#c084fc', // purple-400
			dark: '#9333ea' // purple-600
		},
		colors: {
			bg: 'bg-purple-500',
			bgDark: 'bg-purple-600',
			bgLight: 'bg-purple-500/10',
			bgLighter: 'bg-purple-500/20',
			text: 'text-purple-400',
			textLight: 'text-purple-300',
			border: 'border-purple-500/30',
			borderHover: 'border-purple-400/50',
			borderSolid: 'border-purple-500',
			borderLeft: 'border-l-purple-500',
			ring: 'ring-purple-500/30',
			shadow: 'shadow-purple-500/20',
			ping: 'bg-purple-400',
			dot: 'bg-purple-500',
			cellBg: 'bg-purple-950/30',
			cellBorder: 'border-purple-500/20',
			gradient: 'from-purple-600/30 to-purple-500/20',
			gradientHover: 'from-purple-600/50 to-purple-500/40',
			gradientSolid: 'from-purple-400 to-purple-600',
			gradientBadge: 'from-purple-400 to-purple-600',
			eventGradient: 'from-purple-600/30 to-purple-500/20',
			eventGradientHover: 'hover:from-purple-600/50 hover:to-purple-500/40',
			eventText: 'text-purple-300',
			eventBorder: 'border-purple-500/30',
			eventBorderHover: 'hover:border-purple-400/50',
			eventShadow: 'hover:shadow-purple-500/20'
		}
	}
};

// Default/fallback circuit config (gray theme)
export const DEFAULT_CIRCUIT = {
	id: 'default',
	name: 'AGE Open',
	abbreviation: 'AGE',
	region: '',
	color: 'gray',
	image: '/images/circuits/los-angeles.webp',
	// Hex colors for inline styles
	hex: {
		primary: '#6b7280', // gray-500
		light: '#9ca3af', // gray-400
		dark: '#4b5563' // gray-600
	},
	colors: {
		bg: 'bg-gray-500',
		bgDark: 'bg-gray-600',
		bgLight: 'bg-gray-500/10',
		bgLighter: 'bg-gray-500/20',
		text: 'text-gray-400',
		textLight: 'text-gray-300',
		border: 'border-gray-500/30',
		borderHover: 'border-gray-400/50',
		borderSolid: 'border-gray-500',
		borderLeft: 'border-l-gray-500',
		ring: 'ring-gray-500/30',
		shadow: 'shadow-gray-500/20',
		ping: 'bg-gray-400',
		dot: 'bg-gray-500',
		cellBg: 'bg-gray-950/30',
		cellBorder: 'border-gray-500/20',
		gradient: 'from-gray-600/30 to-gray-500/20',
		gradientHover: 'from-gray-600/50 to-gray-500/40',
		gradientSolid: 'from-gray-400 to-gray-600',
		gradientBadge: 'from-gray-400 to-gray-600',
		eventGradient: 'from-gray-600/30 to-gray-500/20',
		eventGradientHover: 'hover:from-gray-600/50 hover:to-gray-500/40',
		eventText: 'text-gray-300',
		eventBorder: 'border-gray-500/30',
		eventBorderHover: 'hover:border-gray-400/50',
		eventShadow: 'hover:shadow-gray-500/20'
	}
};

/**
 * Get circuit configuration by name
 * @param {string} circuitName - The circuit name (e.g., "Los Angeles", "St. Louis", "New England")
 * @returns {object} Circuit configuration object
 */
export function getCircuit(circuitName) {
	return CIRCUITS[circuitName] || DEFAULT_CIRCUIT;
}

const CIRCUIT_SLUG = { 'Los Angeles': 'la', 'St. Louis': 'stl', 'New England': 'ne' };

/**
 * A circuit name as its address slug: "St. Louis" → "st-louis". Matches
 * the `circuit.slug` the admin creates (see stores/admin.js slugify).
 * @param {string | null | undefined} name
 */
export function circuitSlug(name) {
	return String(name || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * A circuit's accent colour as CSS. The root layout writes every circuit's
 * colour from the database as `--cc-<slug>`; until then (or for a name it
 * doesn't know) the original three keep their `--ed-cc-*` colours and
 * anything else is ink.
 * @param {string} circuitName
 * @returns {string}
 */
export function circuitVar(circuitName) {
	const legacy = CIRCUIT_SLUG[circuitName];
	const fallback = legacy ? `var(--ed-cc-${legacy})` : 'var(--color-ink)';
	return `var(--cc-${circuitSlug(circuitName) || 'none'}, ${fallback})`;
}

/**
 * The circuits to list, from the root layout's database list
 * (`page.data.circuits`), or the original three before migration 045.
 * @param {{ name: string, short?: string }[] | null | undefined} fromLayout
 * @returns {{ name: string, short: string, region: string, image: string }[]}
 */
export function circuitsFrom(fromLayout) {
	if (fromLayout?.length) {
		return fromLayout.map((c) => ({
			name: c.name,
			short: c.short || c.name,
			region: c.region || CIRCUITS[c.name]?.region || '',
			image: circuitImage(c.name, fromLayout)
		}));
	}
	return Object.values(CIRCUITS).map((c) => ({
		name: c.name,
		short: c.abbreviation,
		region: c.region,
		image: c.image
	}));
}

/**
 * A circuit's picture: the one uploaded in admin (from the root layout's
 * list), else the original circuits' built-in picture, else the AGE Open
 * banner.
 * @param {string | null | undefined} name
 * @param {{ name: string, image?: string | null }[] | null | undefined} fromLayout
 */
export function circuitImage(name, fromLayout) {
	const uploaded = fromLayout?.find((c) => c.name === name)?.image;
	return uploaded || CIRCUITS[name || '']?.image || '/banner/age-open-banner.webp';
}

/**
 * Get all circuit names as an array
 * @returns {string[]} Array of circuit names
 */
export function getCircuitNames() {
	return Object.keys(CIRCUITS);
}
