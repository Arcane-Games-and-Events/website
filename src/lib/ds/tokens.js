/**
 * The token names, grouped (the values only live in tokens.css), and the
 * text and surface pairs the contrast test checks.
 */
export const TOKEN_GROUPS = [
	{
		name: 'Surfaces',
		note: 'Backgrounds, from the page itself to things floating above it.',
		tokens: [
			['canvas', 'The page behind everything'],
			['surface', 'Cards, panels, inputs'],
			['surface-raised', 'Menus, dialogs, toasts'],
			['surface-sunken', 'Wells, table headers, hover'],
			['overlay', 'Behind a dialog']
		]
	},
	{
		name: 'Text',
		note: 'Four steps. Most text is fg or fg-muted.',
		tokens: [
			['fg', 'Headings, body, values'],
			['fg-muted', 'Secondary text, labels'],
			['fg-subtle', 'Hints, timestamps, placeholders'],
			['fg-on-accent', 'Text on accent and danger fills']
		]
	},
	{
		name: 'Lines',
		note: 'Hairlines between things, and the focus ring.',
		tokens: [
			['border', 'Card edges, dividers'],
			['border-strong', 'Inputs, secondary buttons'],
			['ring', 'Keyboard focus']
		]
	},
	{
		name: 'Accent',
		note: 'The AGE blue. One main action per view.',
		tokens: [
			['accent', 'Primary buttons, selected states'],
			['accent-hover', 'Primary buttons on hover'],
			['accent-soft', 'Tinted backgrounds'],
			['accent-text', 'Links and accent text']
		]
	},
	{
		name: 'Status',
		note: 'Only for state — never decoration. Each comes as a solid, a soft background and text.',
		tokens: [
			['success', 'Paid, active, done'],
			['success-soft', ''],
			['success-text', ''],
			['warning', 'Needs a look soon'],
			['warning-soft', ''],
			['warning-text', ''],
			['danger', 'Failed, overdue, destructive'],
			['danger-soft', ''],
			['danger-text', ''],
			['info', 'Neutral news'],
			['info-soft', ''],
			['info-text', '']
		]
	}
];

/** Brand colours: the same in every look. */
export const BRAND = [
	['warm', 'AGE blue (the Library)'],
	['prem', 'Premium'],
	['studio', 'AGE Studios'],
	['academy', 'Academy'],
	['gold', 'Gold'],
	['hero-as', 'Violet'],
	['hero-wz', 'Cobalt'],
	['cc-la', 'Los Angeles circuit'],
	['cc-stl', 'St. Louis circuit'],
	['cc-ne', 'New England circuit']
];

/** Text on surface: each must reach 4.5:1 in every look and mode. */
export const CONTRAST_PAIRS = [
	['fg', 'canvas'],
	['fg', 'surface'],
	['fg', 'surface-sunken'],
	['fg', 'surface-raised'],
	['fg-muted', 'canvas'],
	['fg-muted', 'surface'],
	['fg-muted', 'surface-sunken'],
	['fg-subtle', 'surface'],
	['fg-subtle', 'canvas'],
	['fg-on-accent', 'accent'],
	['fg-on-accent', 'accent-hover'],
	['fg-on-accent', 'danger'],
	['accent-text', 'surface'],
	['accent-text', 'accent-soft'],
	['success-text', 'success-soft'],
	['success-text', 'surface'],
	['warning-text', 'warning-soft'],
	['warning-text', 'surface'],
	['danger-text', 'danger-soft'],
	['danger-text', 'surface'],
	['info-text', 'info-soft'],
	['info-text', 'surface']
];

export const LOOKS = ['editorial', 'app'];
export const MODES = ['light', 'dark'];
