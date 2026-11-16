/**
 * Circuit colours on the public site: circuitVar() reads the colour the
 * root layout writes from the database, falling back to the original
 * three circuits' colours, then ink.
 */
import { describe, expect, test } from 'vitest';
import { circuitImage, circuitSlug, circuitVar, circuitsFrom } from '$lib/data/circuits.js';

describe('circuit colours', () => {
	test('slugs match the ones the admin creates', () => {
		expect(circuitSlug('St. Louis')).toBe('st-louis');
		expect(circuitSlug('Bay Area')).toBe('bay-area');
		expect(circuitSlug('Montréal')).toBe('montreal');
	});

	test('the original circuits fall back to their fixed colours', () => {
		expect(circuitVar('St. Louis')).toBe('var(--cc-st-louis, var(--ed-cc-stl))');
	});

	test('a new circuit reads its database colour, else ink', () => {
		expect(circuitVar('Bay Area')).toBe('var(--cc-bay-area, var(--color-ink))');
		expect(circuitVar('')).toBe('var(--cc-none, var(--color-ink))');
	});

	test('the list comes from the database when there is one', () => {
		expect(circuitsFrom([{ name: 'Bay Area', short: 'BAY', region: 'West' }])).toEqual([
			{ name: 'Bay Area', short: 'BAY', region: 'West', image: '/banner/age-open-banner.webp' }
		]);
		expect(circuitsFrom(null).map((c) => c.short)).toEqual(['LA', 'STL', 'NE']);
	});

	test('a circuit’s picture: the uploaded one, else the built-in one, else the banner', () => {
		const list = [{ name: 'Los Angeles', image: 'https://cdn.test/la.webp' }];
		expect(circuitImage('Los Angeles', list)).toBe('https://cdn.test/la.webp');
		expect(circuitImage('St. Louis', list)).toBe('/images/circuits/st-louis.webp');
		expect(circuitImage('Bay Area', list)).toBe('/banner/age-open-banner.webp');
	});
});
