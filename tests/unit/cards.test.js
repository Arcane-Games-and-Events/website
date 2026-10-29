import { expect, test } from 'vitest';
import { expiryFromInput, isExpired, publicCard } from '$lib/server/payments/cards.js';

test('a card is good through the last day of its expiry month', () => {
	expect(isExpired({ expMonth: 10, expYear: 2026 }, new Date('2026-10-31T23:00:00Z'))).toBe(false);
	expect(isExpired({ expMonth: 10, expYear: 2026 }, new Date('2026-11-01T00:00:00Z'))).toBe(true);
});

test('expired cards are listed but not usable', () => {
	const base = { id: 'c', cardType: 'Visa', lastFour: '0027', status: 'active' };
	expect(publicCard({ ...base, expMonth: 12, expYear: 2099 }).usable).toBe(true);
	const old = publicCard({ ...base, expMonth: 1, expYear: 2020 });
	expect(old.usable).toBe(false);
	expect(old.status).toBe('expired');
	expect(publicCard({ ...base, expMonth: 12, expYear: 2099, status: 'invalid' }).usable).toBe(
		false
	);
});

test('expiry input', () => {
	expect(expiryFromInput('12', '28')).toEqual({ month: 12, year: 2028 });
	expect(expiryFromInput('13', '28')).toBeNull();
});
