import { describe, expect, test } from 'vitest';
import { priceTickets, validatePlayers } from '$lib/server/payments/checkout.js';
import { ticketRefundability, venueNow } from '$lib/server/payments/refunds.js';

describe('ticket pricing', () => {
	const ev = { price: '35.00', premiumDiscount: true, eventDate: '2026-12-01T00:00:00Z' };
	test('the member discount applies to the first ticket only', () => {
		const p = priceTickets(ev, 3, true);
		expect(p.amountCents).toBe(2500 + 3500 + 3500);
		expect(p.discountCents).toBe(1000);
		expect(p.lines.map((l) => l.amountCents)).toEqual([2500, 3500, 3500]);
	});
	test('no discount for non-members', () => {
		const p = priceTickets(ev, 2, false);
		expect(p.amountCents).toBe(7000);
		expect(p.discountCents).toBe(0);
	});
	test('a $10 event is free for a member', () => {
		expect(priceTickets({ ...ev, price: '10.00' }, 1, true).amountCents).toBe(0);
	});
	test('events before April 14 2026 used 10% off', () => {
		expect(priceTickets({ ...ev, eventDate: '2026-01-01T00:00:00Z' }, 1, true).amountCents).toBe(
			3150
		);
	});
	test('no discount when the event has none', () => {
		expect(priceTickets({ ...ev, premiumDiscount: false }, 1, true).amountCents).toBe(3500);
	});
});

describe('player validation', () => {
	test('needs first and last names', () => {
		expect(validatePlayers([{ firstName: 'A', lastName: '' }], {}).error).toBeTruthy();
	});
	test('needs a GEM ID when the event requires one', () => {
		expect(
			validatePlayers([{ firstName: 'A', lastName: 'B' }], { gemIdRequired: true }).error
		).toBeTruthy();
	});
	test('trims input', () => {
		const { players } = validatePlayers([{ firstName: ' A ', lastName: 'B', gemId: ' 123 ' }], {
			gemIdRequired: true
		});
		expect(players[0]).toEqual({ firstName: 'A', lastName: 'B', gemId: '123' });
	});
	test('caps an order at 8 tickets', () => {
		expect(
			validatePlayers(new Array(9).fill({ firstName: 'A', lastName: 'B' }), {}).error
		).toBeTruthy();
	});
	test('rejects an empty order', () => {
		expect(validatePlayers([], {}).error).toBeTruthy();
	});
});

describe('refund window', () => {
	// Event times are stored as the venue's wall clock in UTC fields.
	const now = new Date('2026-10-29T19:00:00Z'); // 12:00 in Los Angeles
	const paid = { refunded: false, transactionId: '1', amountPaid: '35.00' };
	const la = (iso) => ({ eventDate: iso, circuit: 'Los Angeles' });

	test('venue clock', () => {
		expect(venueNow('Los Angeles', now).toISOString()).toBe('2026-10-29T12:00:00.000Z');
		expect(venueNow('St. Louis', now).toISOString()).toBe('2026-10-29T14:00:00.000Z');
		expect(venueNow('New England', now).toISOString()).toBe('2026-10-29T15:00:00.000Z');
	});
	test('more than 24 hours out: instant refund', () => {
		expect(ticketRefundability(paid, la('2026-11-05T11:00:00Z'), null, now).action).toBe('refund');
	});
	test('inside 24 hours: request', () => {
		expect(ticketRefundability(paid, la('2026-10-30T11:00:00Z'), null, now).action).toBe('request');
	});
	test('an 11am event has not started at 12pm UTC-equivalent elsewhere, only by the venue clock', () => {
		// 13:00 venue time today is still ahead of noon in Los Angeles.
		expect(ticketRefundability(paid, la('2026-10-29T13:00:00Z'), null, now).action).toBe('request');
		expect(ticketRefundability(paid, la('2026-10-29T11:00:00Z'), null, now).action).toBe('none');
	});
	test('free tickets, refunded tickets and pending requests offer nothing', () => {
		expect(
			ticketRefundability({ ...paid, amountPaid: '0.00' }, la('2026-11-05T11:00:00Z'), null, now)
				.action
		).toBe('none');
		expect(
			ticketRefundability({ ...paid, refunded: true }, la('2026-11-05T11:00:00Z'), null, now).action
		).toBe('none');
		expect(ticketRefundability(paid, la('2026-11-05T11:00:00Z'), { id: 'r' }, now).action).toBe(
			'none'
		);
	});
});
