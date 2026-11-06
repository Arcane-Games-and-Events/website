/**
 * The Metafy vs. AGE Partner calculator on /academy-calculator: earnings
 * on each, what fans pay, and where the two meet.
 */
import { describe, expect, test } from 'vitest';
import {
	calculateComparison,
	cents,
	copiesPerYear,
	dollars,
	findCrossover,
	headline,
	metafyBuyerFees,
	poolPerYear,
	projectedMembers,
	readInputs,
	saleBreakdown
} from '$lib/academy/calculator/compare.js';

const base = {
	plan: 'core',
	price: 15,
	copies: 100,
	period: 'year',
	guides: 1,
	coverBuyerFees: false,
	signupsPerMonth: 0,
	includePool: false,
	poolMembers: 400,
	poolReadingShare: 0.1,
	coreFeePct: 0.15,
	coreFeeFixed: 0
};
const run = (over = {}) => calculateComparison({ ...base, ...over });

// Pro billed annually, $25, 500 copies a year from 2 guides.
const pro500 = { plan: 'pro-annual', price: 25, copies: 500, guides: 2 };

describe('calculateComparison', () => {
	test('Pro annual, $25, 500 copies, 2 guides: AGE is behind on direct sales', () => {
		const r = run(pro500);
		expect(r.metafy.yearly).toBeCloseTo(500 * 25 - 828, 6);
		expect(r.metafy.yearly).toBeCloseTo(11672, 6);
		expect(r.age.yearly).toBeCloseTo(250 * 25 * 0.9 + 250 * 25 * 0.93, 6);
		expect(r.age.yearly).toBeCloseTo(11437.5, 6);
		expect(r.difference).toBeCloseTo(-234.5, 6);
		expect(r.age.perGuide).toBeCloseTo(11437.5 / 2, 6);
		expect(headline(r).kind).toBe('less');
		expect(headline(r).amount).toBeCloseTo(234.5, 6);
	});

	test('two referrals a month put AGE ahead', () => {
		const r = run({ ...pro500, signupsPerMonth: 2 });
		expect(r.age.referralYearly).toBe(240);
		expect(r.age.yearly).toBeCloseTo(11677.5, 6);
		expect(r.difference).toBeCloseTo(5.5, 6);
		expect(headline(r).kind).toBe('more');
	});

	test('the pool estimate, when on, is its own line and moves the headline', () => {
		const off = run(pro500);
		const on = run({ ...pro500, includePool: true, poolMembers: 400, poolReadingShare: 0.1 });
		expect(on.age.poolYearly).toBeCloseTo(0.05 * 400 * 9.2 * 12 * 0.1, 6);
		expect(on.age.poolYearly).toBeCloseTo(220.8, 6);
		// Direct earnings don't change…
		expect(on.age.yearly).toBeCloseTo(off.age.yearly, 6);
		expect(on.difference).toBeCloseTo(off.difference, 6);
		expect(on.age.yearlyWithPool).toBeCloseTo(11658.3, 6);
		// …but the headline counts the pool: −234.50 + 220.80 = −13.70.
		expect(headline(off)).toMatchObject({ kind: 'less', withPool: false });
		expect(headline(on)).toMatchObject({ kind: 'less', withPool: true });
		expect(headline(on).amount).toBeCloseTo(13.7, 6);
		// Enough reading share puts AGE ahead.
		const more = run({ ...pro500, includePool: true, poolMembers: 400, poolReadingShare: 0.2 });
		expect(headline(more).kind).toBe('more');
		expect(headline(more).amount).toBeCloseTo(441.6 - 234.5, 6);
		// Off by default.
		expect(off.age.poolYearly).toBe(0);
	});

	test('no pool below 250 copies a year, counted across all guides', () => {
		const on = { includePool: true, poolMembers: 400, poolReadingShare: 0.1 };
		expect(poolPerYear(on, 249)).toBe(0);
		expect(poolPerYear(on, 250)).toBeCloseTo(220.8, 6);
		// 200 copies: on, but not yet qualifying, so the headline is direct only.
		const below = run({ ...on, copies: 200 });
		expect(below.age.poolYearly).toBe(0);
		expect(below.includesPool).toBe(false);
		expect(headline(below).withPool).toBe(false);
		// 25 a month across three guides is 300 a year: qualifies.
		expect(run({ ...on, copies: 25, period: 'month', guides: 3 }).age.poolYearly).toBeCloseTo(
			220.8,
			6
		);
		// The member count only sizes the pool; it no longer gates it.
		expect(poolPerYear({ ...on, poolMembers: 100 }, 300)).toBeCloseTo(55.2, 6);
	});

	test('projected Premium members: the forecast, or half the copies a year if more', () => {
		expect(projectedMembers(0)).toBe(400);
		expect(projectedMembers(500)).toBe(400);
		expect(projectedMembers(800)).toBe(400);
		expect(projectedMembers(1200)).toBe(600);
		expect(projectedMembers(1201)).toBe(601);
	});

	test('Core, $15, 100 copies a year: AGE earns $75 more and fans pay less', () => {
		const r = run();
		expect(r.metafy.yearly).toBeCloseTo(1275, 6);
		expect(r.age.yearly).toBeCloseTo(1350, 6);
		expect(r.difference).toBeCloseTo(75, 6);
		expect(r.differencePct).toBeCloseTo(75 / 1275, 6);
		expect(cents(r.metafy.fanPays)).toBe(18.18);
		expect(cents(r.age.fanPays)).toBe(15.74);
		expect(cents(r.age.memberPays)).toBe(14.19);
		expect(dollars(r.difference)).toBe(75);
		expect(r.metafy.perSale).toBeCloseTo(12.75, 6);
		expect(r.age.perSale).toBeCloseTo(13.5, 6);
		expect(r.age.topSeller).toBe(false);
	});

	test('the top-seller rate counts copies across all guides', () => {
		const r = run({ price: 20, copies: 300, guides: 3 });
		expect(r.age.salesYearly).toBeCloseTo(250 * 20 * 0.9 + 50 * 20 * 0.93, 6);
		expect(r.age.salesYearly).toBeCloseTo(5430, 6);
		expect(r.age.topSeller).toBe(true);
		expect(r.age.perSale).toBeCloseTo(18, 6);
		expect(r.age.topSellerPerSale).toBeCloseTo(18.6, 6);
	});

	test('fan prices at $25', () => {
		const r = run({ price: 25 });
		expect(cents(r.metafy.fanPays)).toBe(28.84);
		expect(cents(r.age.fanPays)).toBe(26.03);
		expect(cents(r.age.memberPays)).toBe(23.45);
		expect(headline(run(pro500)).fanGap).toBe(2.81);
	});

	test('Pro billed annually, $30, 200 copies: every copy below the top-seller rate', () => {
		const r = run({ plan: 'pro-annual', price: 30, copies: 200 });
		expect(r.metafy.yearly).toBeCloseTo(5172, 6);
		expect(r.metafy.monthlyFee).toBe(69);
		expect(r.age.yearly).toBeCloseTo(5400, 6);
		expect(r.difference).toBeCloseTo(228, 6);
	});

	test('covering buyer fees lowers Metafy earnings and the fan pays list price', () => {
		const fees = metafyBuyerFees(15).total;
		const r = run({ coverBuyerFees: true });
		expect(r.metafy.fanPays).toBe(15);
		expect(r.metafy.yearly).toBeCloseTo(1275 - 100 * fees, 6);
		// The fan doesn't pay less on AGE then, so the headline doesn't say so.
		expect(headline(r).fanGap).toBeNull();
	});

	test('copies per month become copies per year', () => {
		expect(copiesPerYear(10, 'month')).toBe(120);
		expect(copiesPerYear(10, 'year')).toBe(10);
		const r = run({ copies: 10, period: 'month' });
		expect(r.copiesPerYear).toBe(120);
		expect(r.age.yearly).toBeCloseTo(120 * 13.5, 6);
	});

	test('the platform fee is capped at high prices', () => {
		const f = metafyBuyerFees(500);
		expect(f.platform).toBe(20);
		expect(f.processing).toBeCloseTo(500 * 0.029 + 0.4, 6);
		expect(run({ price: 500 }).metafy.fanPays).toBeCloseTo(500 + 20 + 14.9, 6);
	});

	test('older Core terms (12% + $1.79) are honoured', () => {
		const r = run({ coreFeePct: 0.12, coreFeeFixed: 1.79 });
		expect(r.metafy.yearly).toBeCloseTo(100 * (15 * 0.88 - 1.79), 6);
	});
});

describe('saleBreakdown', () => {
	const sum = (b) => b.you + b.platform + b.fees;

	test('each side adds up to what the fan pays', () => {
		const b = saleBreakdown(base);
		expect(b.age.you).toBeCloseTo(13.5, 6);
		expect(b.age.platform).toBeCloseTo(1.5, 6);
		expect(sum(b.age)).toBeCloseTo(b.age.fanPays, 6);
		expect(b.metafy.platform).toBeCloseTo(2.25, 6);
		expect(sum(b.metafy)).toBeCloseTo(b.metafy.fanPays, 6);
	});

	test('covering buyer fees comes out of the creator’s share', () => {
		const b = saleBreakdown({ ...base, plan: 'pro-annual', coverBuyerFees: true });
		expect(b.metafy.fanPays).toBe(15);
		expect(b.metafy.platform).toBe(0);
		expect(b.metafy.monthlyFee).toBe(69);
		expect(sum(b.metafy)).toBeCloseTo(15, 6);
	});
});

describe('findCrossover', () => {
	test('Pro billed annually catches up once the fee is covered', () => {
		// AGE leads while 10% of $30 a copy is under $828 a year: 276 copies,
		// but the top-seller rate at 250 narrows the gap to 7% a copy.
		const c = findCrossover({ ...base, plan: 'pro-annual', price: 30 });
		const expected = 250 + (828 - 250 * 30 * 0.1) / (30 * 0.07);
		expect(c?.copies).toBeCloseTo(expected, 4);
		expect(c?.ageAheadAfter).toBe(false);
	});

	test('Core never catches AGE at standard terms', () => {
		expect(findCrossover(base)).toBeNull();
		expect(run().crossover).toBeNull();
	});

	test('the chart runs to twice the current volume or past the crossover', () => {
		expect(run().chart.max).toBe(200);
		const pro = run({ plan: 'pro-annual', price: 30, copies: 10 });
		expect(pro.chart.max).toBeCloseTo(pro.crossover.copies * 1.2, 6);
	});
});

describe('readInputs', () => {
	const raw = {
		plan: 'core',
		price: '15',
		copies: '100',
		period: 'year',
		guides: '1',
		coverBuyerFees: false,
		signupsPerMonth: '0',
		includePool: false,
		poolMembers: '400',
		poolReadingShare: '10',
		coreFeePct: '15',
		coreFeeFixed: '0'
	};

	test('reads the defaults cleanly', () => {
		const { inputs, errors } = readInputs(raw);
		expect(errors).toEqual({});
		expect(inputs).toMatchObject({ price: 15, copies: 100, coreFeePct: 0.15 });
	});

	test('flags empty, negative, non-numeric and out-of-range fields', () => {
		const { errors } = readInputs({
			...raw,
			price: '',
			copies: '-3',
			guides: 'two',
			coreFeePct: '150'
		});
		expect(Object.keys(errors).sort()).toEqual(['copies', 'coreFeePct', 'guides', 'price']);
		expect(readInputs({ ...raw, price: '250' }).errors.price).toBe('Use 1 to 200.');
		expect(readInputs({ ...raw, price: '$19.99' }).errors).toEqual({});
		expect(readInputs({ ...raw, signupsPerMonth: '101' }).errors.signupsPerMonth).toBe(
			'Use 0 to 100.'
		);
	});

	test('pool fields are checked only when the pool estimate is on', () => {
		expect(readInputs({ ...raw, poolMembers: '', poolReadingShare: 'x' }).errors).toEqual({});
		const on = readInputs({ ...raw, includePool: true, poolReadingShare: '150' });
		expect(on.errors).toEqual({ poolReadingShare: 'Use 0 to 100.' });
		expect(readInputs({ ...raw, includePool: true }).inputs).toMatchObject({
			includePool: true,
			poolMembers: 400,
			poolReadingShare: 0.1
		});
	});
});
