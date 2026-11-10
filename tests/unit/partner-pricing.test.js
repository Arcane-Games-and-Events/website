/**
 * The AGE Partner terms: prices with the card fee passed on, member
 * pricing, carts, and how each copy is split between teacher and AGE.
 * Cases 1–6 of the Partner model brief.
 */
import { describe, expect, test } from 'vitest';
import {
	allIn,
	applyRate,
	guidePrices,
	itemPrice,
	levelFor,
	quoteCart,
	shownPrices,
	splitByWeight,
	splitSale,
	standing
} from '$lib/academy/partner/pricing.js';
import { LEVELS } from '$lib/academy/partner/terms.js';

// Copies already sold before the one being split, at each level.
const PARTNER = 0;
const SENIOR = 1000;
const ELITE = 5000;

describe('prices (card fee included)', () => {
	test('allIn covers the fee: roundHalfUp((amount + 0.30) / (1 − 0.029))', () => {
		expect(allIn(1500)).toBe(1576); // 15.30 / 0.971 = 15.7569…
		expect(allIn(1350)).toBe(1421); // 13.80 / 0.971 = 14.2122…
		expect(allIn(4500)).toBe(4665); // 45.30 / 0.971 = 46.6529…
		expect(allIn(0)).toBe(0); // nothing to charge, no fee
		// What the processor keeps from the all-in price leaves the amount (to the cent).
		for (const c of [100, 999, 1000, 1999, 2500, 5000, 19999]) {
			const charged = allIn(c);
			const fee = Math.round(charged * 0.029 + 30);
			expect(Math.abs(charged - fee - c)).toBeLessThanOrEqual(1);
		}
	});

	test('half a cent rounds up, in integers', () => {
		expect(applyRate(5, 0.9)).toBe(5); // 4.5 → 5
		expect(applyRate(1505, 0.9)).toBe(1355); // 1354.5 → 1355
		expect(applyRate(1999, 0.93)).toBe(1859); // 1859.07
	});

	test('product pages show both prices: "$15.76, or $14.21 with Premium"', () => {
		expect(shownPrices(1500)).toEqual({ nonMemberCents: 1576, memberCents: 1421 });
		expect(guidePrices('15.00').line).toBe('$15.76, or $14.21 with Premium');
		expect(guidePrices('15.00', true).you).toBe('$14.21');
		expect(guidePrices('15.00', false).you).toBe('$15.76');
		expect(guidePrices('0')).toBeNull();
	});

	test('members pay 10% less before the fee', () => {
		expect(itemPrice(1500, true)).toEqual({
			listCents: 1500,
			priceCents: 1350,
			memberDiscountCents: 150
		});
		expect(itemPrice(1500, false).memberDiscountCents).toBe(0);
	});
});

describe('the split, always on the full list price', () => {
	test('1. non-member, P = $15: shown $15.76; teacher $13.50, AGE $1.50, AGE net $1.50', () => {
		expect(shownPrices(1500).nonMemberCents).toBe(1576);
		expect(splitSale({ listCents: 1500, member: false, priorCopies: PARTNER })).toMatchObject({
			level: 'PARTNER',
			shareRate: 0.9,
			teacherCents: 1350,
			ageCommissionCents: 150,
			memberDiscountCents: 0,
			ageNetCents: 150
		});
	});

	test('2. member, P = $15: shown $14.21; teacher $13.50, discount $1.50, AGE net $0.00', () => {
		expect(shownPrices(1500).memberCents).toBe(1421);
		expect(splitSale({ listCents: 1500, member: true, priorCopies: PARTNER })).toMatchObject({
			teacherCents: 1350,
			ageCommissionCents: 150,
			memberDiscountCents: 150,
			ageNetCents: 0
		});
	});

	test('3. Senior: non-member teacher $13.95, AGE $1.05; member teacher $13.50, AGE net $0', () => {
		expect(splitSale({ listCents: 1500, member: false, priorCopies: SENIOR })).toMatchObject({
			level: 'SENIOR',
			shareRate: 0.93,
			teacherCents: 1395,
			ageCommissionCents: 105,
			ageNetCents: 105
		});
		expect(splitSale({ listCents: 1500, member: true, priorCopies: SENIOR })).toMatchObject({
			level: 'SENIOR',
			shareRate: 0.9,
			teacherCents: 1350,
			ageNetCents: 0
		});
	});

	test('4. Elite non-member, P = $15: teacher $14.25, AGE $0.75', () => {
		expect(splitSale({ listCents: 1500, member: false, priorCopies: ELITE })).toMatchObject({
			level: 'ELITE',
			shareRate: 0.95,
			teacherCents: 1425,
			ageCommissionCents: 75,
			ageNetCents: 75
		});
	});

	test('AGE never loses money on a member sale, at any price or level', () => {
		for (let p = 1; p <= 30000; p += 37)
			for (const prior of [0, 1000, 5000])
				expect(splitSale({ listCents: p, member: true, priorCopies: prior }).ageNetCents).toBe(0);
	});

	test('5. the level boundary: a copy is paid at the level held before it sold', () => {
		// Rule: copies 1–1,000 are Partner (0–999 sold before them); copy
		// 1,001 is the first Senior copy; copy 5,001 the first Elite copy.
		expect(levelFor(999).key).toBe('PARTNER'); // copy 1,000
		expect(levelFor(1000).key).toBe('SENIOR'); // copy 1,001
		expect(levelFor(4999).key).toBe('SENIOR'); // copy 5,000
		expect(levelFor(5000).key).toBe('ELITE'); // copy 5,001
		// A teacher at 998 sells three $20 copies: 999 and 1,000 at 90%, 1,001 at 93%.
		const copies = [998, 999, 1000].map((prior) =>
			splitSale({ listCents: 2000, member: false, priorCopies: prior })
		);
		expect(copies.map((c) => c.copyNumber)).toEqual([999, 1000, 1001]);
		expect(copies.map((c) => c.teacherCents)).toEqual([1800, 1800, 1860]);
	});

	test('standing: level, and copies to the next', () => {
		expect(standing(998)).toMatchObject({ copiesToNext: 2, level: { key: 'PARTNER' } });
		expect(standing(1000)).toMatchObject({ copiesToNext: 4000, level: { key: 'SENIOR' } });
		expect(standing(7000)).toMatchObject({ copiesToNext: 0, next: null });
		expect(LEVELS.map((l) => l.share)).toEqual([0.9, 0.93, 0.95]);
	});
});

describe('carts', () => {
	test('6. three guides ($10, $15, $20), non-member: one fixed fee, charged $46.65', () => {
		const q = quoteCart([{ listCents: 1000 }, { listCents: 1500 }, { listCents: 2000 }], {
			member: false
		});
		expect(q.subtotalCents).toBe(4500);
		expect(q.totalCents).toBe(4665);
		expect(q.feeCents).toBe(165);
		// Cheaper than three separate checkouts, each with its own 30¢.
		expect(allIn(1000) + allIn(1500) + allIn(2000)).toBeGreaterThan(q.totalCents);
		// The fee shares add up to the fee collected; items add up to the charge.
		expect(q.items.reduce((n, it) => n + it.feeCents, 0)).toBe(q.feeCents);
		expect(q.items.reduce((n, it) => n + it.paidCents, 0)).toBe(q.totalCents);
	});

	test('a member cart: 10% off each guide, fee once', () => {
		const q = quoteCart([{ listCents: 1000 }, { listCents: 1500 }, { listCents: 2000 }], {
			member: true
		});
		expect(q.subtotalCents).toBe(4050);
		expect(q.memberDiscountCents).toBe(450);
		expect(q.totalCents).toBe(allIn(4050));
		expect(q.items.reduce((n, it) => n + it.paidCents, 0)).toBe(q.totalCents);
	});

	test('fee shares always add up, whatever the prices', () => {
		for (const prices of [[1], [1, 1, 1], [999, 1, 1], [1234, 5678, 9, 3000], [0, 1500]]) {
			const q = quoteCart(
				prices.map((listCents) => ({ listCents })),
				{ member: false }
			);
			expect(q.items.reduce((n, it) => n + it.feeCents, 0)).toBe(q.feeCents);
		}
		expect(splitByWeight(10, [1, 1, 1])).toEqual([4, 3, 3]);
		expect(splitByWeight(0, [5, 5])).toEqual([0, 0]);
	});
});
