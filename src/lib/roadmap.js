/**
 * The roadmap's stages and areas, shared by /roadmap and Admin → Roadmap.
 */

/** In the order an item travels, which is the order shown. (Migration 051.) */
export const STAGES = [
	{ id: 'upcoming', label: 'Upcoming', note: 'Planned', tone: 'var(--color-soft)' },
	{ id: 'development', label: 'In development', note: 'Being built', tone: 'var(--color-warm)' },
	{ id: 'testing', label: 'Testing', note: 'Being tried out', tone: 'var(--color-warm-deep)' },
	{ id: 'shipped', label: 'Shipped', note: 'Out now', tone: 'var(--color-prem)' }
];
export const STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s]));
export const STAGE_IDS = STAGES.map((s) => s.id);

/** The part of AGE an item belongs to, with its colour. */
export const AREAS = [
	{ id: 'library', label: 'Library', tone: 'var(--color-warm)' },
	{ id: 'academy', label: 'Academy', tone: 'var(--color-gold)' },
	{ id: 'ageopen', label: 'AGE Open', tone: 'var(--color-hero-rb)' },
	{ id: 'studios', label: 'Studios', tone: 'var(--color-studio)' },
	{ id: 'membership', label: 'Membership', tone: 'var(--color-prem)' },
	{ id: 'site', label: 'The site', tone: 'var(--color-soft)' }
];
export const AREA = Object.fromEntries(AREAS.map((a) => [a.id, a]));

export const LIMITS = { title: 140, body: 600 };
