/**
 * AGE Studios' kinds of project, shared by the Studio and the public pages.
 * Each kind prints in its own flat colour on /studios (Premium's green is
 * kept for Premium): projects in orange, blue, green or ink, shows and
 * films in gold, partners in purple, matches in the Library's blue. Class
 * names are written out whole for Tailwind. `plate` is the colour a block
 * lifts off on hover (a CSS colour for --plate): ink, or orange under ink.
 */

export const PROJECT_TYPES = ['interactive', 'stats', 'software', 'film', 'feature'];

export const PROJECT_TYPE = {
	interactive: {
		label: 'Interactive',
		plural: 'Interactive',
		blurb: 'Pages to play with: rankings, explorers, tools.',
		block: 'bg-studio text-white',
		text: 'text-studio',
		plate: 'var(--color-ink)'
	},
	stats: {
		label: 'Stats',
		plural: 'Stats',
		blurb: 'The numbers behind the game.',
		block: 'bg-warm text-white',
		text: 'text-warm',
		plate: 'var(--color-ink)'
	},
	software: {
		label: 'Software',
		plural: 'Software',
		blurb: 'Things we’ve built for players.',
		block: 'bg-cc-stl text-white',
		text: 'text-cc-stl',
		plate: 'var(--color-ink)'
	},
	film: {
		label: 'Film',
		plural: 'Films',
		blurb: 'Documentaries and short films.',
		block: 'bg-gold text-[#241b07]',
		text: 'text-[#8a6116]',
		plate: 'var(--color-ink)'
	},
	feature: {
		label: 'Feature',
		plural: 'Features',
		blurb: 'Big stories, told our way.',
		block: 'bg-ink text-paper-bg',
		text: 'text-ink',
		plate: 'var(--color-studio)'
	}
};

/** Shows and partners print in their own colours too. */
export const SECTION_TONE = {
	shows: { block: 'bg-gold text-[#241b07]', text: 'text-[#8a6116]', plate: 'var(--color-ink)' },
	partners: { block: 'bg-cc-ne text-white', text: 'text-cc-ne', plate: 'var(--color-ink)' },
	matches: { block: 'bg-warm text-white', text: 'text-warm', plate: 'var(--color-ink)' }
};
