import { expect, test } from 'vitest';
import { listPriceCents, quoteFirstCharge } from '$lib/server/billing/plans.js';

test('list prices', () => {
	expect(listPriceCents('monthly')).toBe(1000);
	expect(listPriceCents('yearly')).toBe(11000);
	expect(() => listPriceCents('weekly')).toThrow();
});

test.each([
	['monthly', null, 1000, 0, 1000],
	['yearly', null, 11000, 0, 11000],
	['monthly', 'partner', 1000, 500, 500],
	// The old code charged $5 for a whole year with a partner code.
	['yearly', 'partner', 11000, 500, 10500],
	['monthly', 'member_referral', 1000, 1000, 0],
	['yearly', 'member_referral', 11000, 1000, 10000]
])('%s with %s promo', (plan, promo, listCents, discountCents, amountCents) => {
	expect(quoteFirstCharge(plan, promo)).toEqual({ listCents, discountCents, amountCents });
});
