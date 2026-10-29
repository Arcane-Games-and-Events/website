import { expect, test } from 'vitest';
import {
	cardTypeLabel,
	describeOutcome,
	lastFourOf,
	parseExpiration
} from '$lib/server/authnet/client.js';

test('last four from masked numbers', () => {
	expect(lastFourOf('XXXX1111')).toBe('1111');
	expect(lastFourOf('XXXX')).toBeNull();
	expect(lastFourOf(null)).toBeNull();
});

test.each([
	['2028-12', { year: 2028, month: 12 }],
	['1228', { year: 2028, month: 12 }],
	['12/28', { year: 2028, month: 12 }],
	['12/2028', { year: 2028, month: 12 }],
	['XXXX', null],
	[null, null]
])('expiry %s', (input, expected) => {
	expect(parseExpiration(input)).toEqual(expected);
});

test('card brands', () => {
	expect(cardTypeLabel('AmericanExpress')).toBe('American Express');
	expect(cardTypeLabel('Visa')).toBe('Visa');
	expect(cardTypeLabel(null)).toBe('Card');
});

test('decline messages a member can act on', () => {
	expect(describeOutcome({ outcome: 'declined', code: '27' })).toMatch(/ZIP/);
	expect(describeOutcome({ outcome: 'declined', code: '999' })).toBe('Your card was declined.');
	expect(describeOutcome({ outcome: 'unknown' })).toMatch(/don't try again/);
});
