/**
 * Library web addresses: built from the title, at most 140 characters,
 * tidy while typed, and unique with a -n suffix that still fits.
 */
import { describe, expect, test } from 'vitest';
import {
	SLUG_MAX,
	cleanTypedSlug,
	slugMatchesTitle,
	titleToSlug,
	withSuffix
} from '../../src/lib/desk/slug.js';

describe('titleToSlug', () => {
	test('lowercase words joined by single hyphens', () => {
		expect(titleToSlug('Set Review: The Ten Cards That Will Define the Next Calling')).toBe(
			'set-review-the-ten-cards-that-will-define-the-next-calling'
		);
	});
	test('drops apostrophes and accents, and punctuation becomes a break', () => {
		expect(titleToSlug("Don't Fear the Café — Part 2!")).toBe('dont-fear-the-cafe-part-2');
	});
	test('no leading or trailing hyphens', () => {
		expect(titleToSlug('  --Hello, world--  ')).toBe('hello-world');
	});
	test('never longer than 140 characters, and never ends in a hyphen', () => {
		const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
		const slug = titleToSlug(long);
		expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
		expect(SLUG_MAX).toBe(140);
		expect(slug.endsWith('-')).toBe(false);
	});
	test('nothing usable gives an empty string', () => {
		expect(titleToSlug('!!!')).toBe('');
	});
});

describe('cleanTypedSlug', () => {
	test('keeps a trailing hyphen so the next word can be typed', () => {
		expect(cleanTypedSlug('My Slug ')).toBe('my-slug-');
		expect(cleanTypedSlug('my-slug-')).toBe('my-slug-');
	});
	test('cleans everything else', () => {
		expect(cleanTypedSlug('My  Great__Piece')).toBe('my-great-piece');
	});
});

describe('withSuffix', () => {
	test('adds -n', () => {
		expect(withSuffix('piece', 2)).toBe('piece-2');
	});
	test('trims the base so the whole address still fits', () => {
		const base = 'a'.repeat(140);
		const out = withSuffix(base, 12);
		expect(out.length).toBe(140);
		expect(out.endsWith('-12')).toBe(true);
	});
});

describe('slugMatchesTitle', () => {
	test('the title’s own address, with or without a uniqueness suffix', () => {
		expect(slugMatchesTitle('the-high-tide', 'The High Tide')).toBe(true);
		expect(slugMatchesTitle('the-high-tide-3', 'The High Tide')).toBe(true);
	});
	test('a placeholder or empty address follows the title', () => {
		expect(slugMatchesTitle('untitled', 'Anything')).toBe(true);
		expect(slugMatchesTitle('untitled-4', 'Anything')).toBe(true);
		expect(slugMatchesTitle('', 'Anything')).toBe(true);
	});
	test('an address set by hand does not', () => {
		expect(slugMatchesTitle('tide-guide', 'The High Tide')).toBe(false);
	});
});
