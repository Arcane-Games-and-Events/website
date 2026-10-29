import { expect, test } from 'vitest';
import { nextBillingDate, planOf } from '$lib/server/billing/migrate-arb.js';

const iso = (d) => d.toISOString().slice(0, 10);
const monthly = (startDate) => ({ startDate, interval: { length: 1, unit: 'months' } });

test('plan from the ARB interval', () => {
	expect(planOf({ interval: { length: 12, unit: 'months' } })).toBe('yearly');
	expect(planOf({ interval: { length: 1, unit: 'months' } })).toBe('monthly');
	expect(planOf({ interval: { length: 7, unit: 'days' } })).toBe('test');
});

test('next billing date is start plus payments, on the start day', () => {
	expect(iso(nextBillingDate(monthly('2026-01-31T00:00:00'), 1))).toBe('2026-02-28');
	expect(iso(nextBillingDate(monthly('2026-01-31'), 3))).toBe('2026-04-30');
	expect(
		iso(nextBillingDate({ startDate: '2025-10-15', interval: { length: 12, unit: 'months' } }, 1))
	).toBe('2026-10-15');
});

test('a subscription that has not charged yet bills on its start date', () => {
	expect(iso(nextBillingDate(monthly('2026-11-28'), 0))).toBe('2026-11-28');
});
