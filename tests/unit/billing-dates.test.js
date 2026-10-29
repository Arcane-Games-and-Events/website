import { describe, expect, test } from 'vitest';
import {
	addMonthsAnchored,
	anchorDayOf,
	dunningSchedule,
	periodEndFor
} from '$lib/server/billing/dates.js';

const iso = (d) => d.toISOString().slice(0, 10);

describe('anchored months', () => {
	test('a membership started on the 31st renews on the last day of short months', () => {
		expect(iso(addMonthsAnchored(new Date('2026-01-31T10:00:00Z'), 1, 31))).toBe('2026-02-28');
		expect(iso(addMonthsAnchored(new Date('2026-02-28T10:00:00Z'), 1, 31))).toBe('2026-03-31');
	});
	test('crosses year boundaries', () => {
		expect(iso(addMonthsAnchored(new Date('2026-11-30T00:00:00Z'), 3, 30))).toBe('2027-02-28');
	});
	test('goes backwards', () => {
		expect(iso(addMonthsAnchored(new Date('2026-03-31T00:00:00Z'), -1, 31))).toBe('2026-02-28');
	});
	test('a leap-day yearly membership renews on Feb 28', () => {
		expect(iso(periodEndFor(new Date('2028-02-29T00:00:00Z'), 'yearly', 29))).toBe('2029-02-28');
	});
	test('monthly period end', () => {
		expect(iso(periodEndFor(new Date('2026-10-15T00:00:00Z'), 'monthly', 15))).toBe('2026-11-15');
	});
	test('anchor day is the UTC day of the start', () => {
		expect(anchorDayOf(new Date('2026-10-29T23:00:00Z'))).toBe(29);
	});
});

describe('dunning schedule', () => {
	const t0 = new Date('2026-10-01T12:00:00Z');
	test('retries on day 1, 3 and 7, then stops', () => {
		expect(iso(dunningSchedule(t0, 1).nextAttemptAt)).toBe('2026-10-02');
		expect(iso(dunningSchedule(t0, 2).nextAttemptAt)).toBe('2026-10-04');
		expect(iso(dunningSchedule(t0, 3).nextAttemptAt)).toBe('2026-10-08');
		expect(dunningSchedule(t0, 4).nextAttemptAt).toBeNull();
		expect(dunningSchedule(t0, 4).exhausted).toBe(true);
	});
	test('access is kept for 7 days plus two hours after the first failure', () => {
		expect(dunningSchedule(t0, 1).graceUntil.toISOString()).toBe('2026-10-08T14:00:00.000Z');
	});
});
