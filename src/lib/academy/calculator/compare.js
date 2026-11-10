/**
 * Metafy vs. AGE Partner: what a guide creator earns on each, and what
 * their fans pay. Pure functions with no I/O. The page validates its
 * fields with readInputs() and passes the result to calculateComparison().
 *
 * Inputs (after readInputs):
 *   plan             'core' | 'pro-annual' | 'pro-monthly'
 *   price            list price of a guide, USD
 *   copies, period   copies sold, per 'month' or per 'year'
 *   guides           how many guides those copies come from
 *   coverBuyerFees   the creator pays Metafy's buyer fees for the fan
 *   signupsPerMonth  Premium signups through the creator's AGE link
 *   includePool      add an estimated teacher pool share (shown separately)
 *   poolMembers, poolReadingShare  AGE Premium members expected, and the
 *                    creator's share (fraction) of what members read
 *   coreFeePct, coreFeeFixed  Metafy Core's cut (fraction) and fixed fee per sale
 */
import { CONSTANTS, CROSSOVER_LIMIT } from './constants.js';

export const PLANS = [
	{ v: 'core', l: 'Core', note: 'Free' },
	{ v: 'pro-annual', l: 'Pro', note: 'Billed annually, $69/mo' },
	{ v: 'pro-monthly', l: 'Pro', note: 'Billed monthly, $99/mo' }
];

/** Money per sale, to the cent (half a cent rounds up, despite float noise). */
export const cents = (n) => Math.round(Number((n * 100).toPrecision(12))) / 100;
/** Money a year, to the dollar. */
export const dollars = (n) => Math.round(Number(n.toPrecision(12)));

/** Copies a year, from copies per month or per year. */
export function copiesPerYear(copies, period) {
	return period === 'month' ? copies * 12 : copies;
}

/** What Metafy charges a plan per month. */
export function planMonthlyFee(plan, metafy = CONSTANTS.metafy) {
	if (plan === 'pro-annual') return metafy.PRO_ANNUAL_MONTHLY;
	if (plan === 'pro-monthly') return metafy.PRO_MONTHLY;
	return 0;
}

/** Metafy's fees on one order, on top of the list price. */
export function metafyBuyerFees(price, metafy = CONSTANTS.metafy) {
	const platform = Math.min(
		price * metafy.BUYER_PLATFORM_PCT + metafy.BUYER_PLATFORM_FIXED,
		metafy.BUYER_PLATFORM_CAP
	);
	const processing = price * metafy.BUYER_PROCESSING_PCT + metafy.BUYER_PROCESSING_FIXED;
	return { platform, processing, total: platform + processing };
}

/** What the creator keeps from one Metafy sale, before any monthly fee. */
export function metafyPerSale(inputs, metafy = CONSTANTS.metafy) {
	const p = inputs.price;
	let keep =
		inputs.plan === 'core'
			? p * (1 - (inputs.coreFeePct ?? metafy.CORE_FEE_PCT)) -
				(inputs.coreFeeFixed ?? metafy.CORE_FEE_FIXED)
			: p;
	if (inputs.coverBuyerFees) keep -= metafyBuyerFees(p, metafy).total;
	return keep;
}

/** The creator's Metafy earnings for a year of `y` copies, after the plan's fee. */
export function metafyYearly(inputs, y, metafy = CONSTANTS.metafy) {
	return y * metafyPerSale(inputs, metafy) - 12 * planMonthlyFee(inputs.plan, metafy);
}

/**
 * The creator's AGE sales income for `y` copies, counted from their first
 * copy (a new partner's first year). Each Partner level covers its band of
 * lifetime copies across all their guides: copies 1 to 1,000 at Partner,
 * the next 4,000 at Senior, the rest at Elite. Sales are taken as
 * non-member sales, where the higher levels apply.
 */
export function ageSalesYearly(inputs, y, age = CONSTANTS.age) {
	return age.LEVELS.reduce((sum, l, i) => {
		const next = age.LEVELS[i + 1]?.from ?? Infinity;
		const band = Math.max(0, Math.min(y, next) - l.from);
		return sum + band * inputs.price * l.share;
	}, 0);
}

/** The highest Partner level reached within `y` copies (a copy past its start). */
export function levelReached(y, age = CONSTANTS.age) {
	return age.LEVELS.filter((l) => y > l.from).pop() || age.LEVELS[0];
}

/** Where AGE's line bends: the copies at which each higher level starts. */
const bends = (age, limit) => age.LEVELS.map((l) => l.from).filter((x) => x > 0 && x < limit);

/** AGE's all-in price for an amount: the card fee covered, as at checkout. */
const allInPrice = (amount, age) => (amount + age.CARD_FEE_FIXED) / (1 - age.CARD_FEE_PCT);

/** Premium referral bonuses for a year. */
export function ageReferralYearly(inputs, age = CONSTANTS.age) {
	return 12 * (inputs.signupsPerMonth || 0) * age.REFERRAL_BONUS;
}

/**
 * The AGE Premium membership projected for a creator selling `y` copies a
 * year: AGE's forecast, or half their copies once that's more.
 */
export function projectedMembers(y, pool = CONSTANTS.pool) {
	return Math.max(pool.FORECAST_MEMBERS, Math.round(pool.MEMBERS_PER_COPY * y));
}

/**
 * An estimated teacher pool share for the year, when the creator asks for
 * one: nothing until they sell enough copies a year (`y`, across all
 * guides) to qualify, then the pool's share of Premium revenue times the
 * creator's share of member reading.
 */
export function poolPerYear(inputs, y, pool = CONSTANTS.pool) {
	if (!inputs.includePool || y < pool.START_COPIES_PER_YEAR) return 0;
	const members = inputs.poolMembers || 0;
	// The pool only runs once AGE has enough Premium members.
	if (members < (pool.START_MEMBERS ?? 0)) return 0;
	return (
		pool.PCT * members * pool.NET_REVENUE_PER_MEMBER_MONTH * 12 * (inputs.poolReadingShare || 0)
	);
}

/** The two yearly lines being compared, at `y` copies a year: direct earnings only. */
export function yearlyAt(inputs, y, constants = CONSTANTS) {
	return {
		metafy: metafyYearly(inputs, y, constants.metafy),
		age: ageSalesYearly(inputs, y, constants.age) + ageReferralYearly(inputs, constants.age)
	};
}

const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/**
 * The copies a year at which the two lines meet, searched from 0 to
 * `limit` with the same functions as everything else. Both lines are
 * straight between the points where a new level starts, so each stretch
 * has at most one crossing, found by bisection.
 * @returns {{ copies: number, ageAheadAfter: boolean } | null}
 */
export function findCrossover(inputs, constants = CONSTANTS, limit = CROSSOVER_LIMIT) {
	const gap = (y) => {
		const v = yearlyAt(inputs, y, constants);
		return v.age - v.metafy;
	};
	// AGE's line bends where each higher level starts.
	const points = [0, ...bends(constants.age, limit), limit];
	for (let i = 0; i < points.length - 1; i++) {
		let a = points[i];
		let b = points[i + 1];
		const sa = sign(gap(a));
		const sb = sign(gap(b));
		if (sa === 0 || sb === sa) continue;
		if (sb === 0) return { copies: b, ageAheadAfter: sign(gap(limit)) > 0 };
		for (let n = 0; n < 80; n++) {
			const mid = (a + b) / 2;
			if (sign(gap(mid)) === sa) a = mid;
			else b = mid;
		}
		return { copies: (a + b) / 2, ageAheadAfter: sb > 0 };
	}
	return null;
}

/** The full comparison the page shows. */
export function calculateComparison(inputs, constants = CONSTANTS) {
	const { age, metafy } = constants;
	const y = copiesPerYear(inputs.copies, inputs.period);
	const g = inputs.guides;
	const p = inputs.price;

	const fees = metafyBuyerFees(p, metafy);
	const metafyTotal = metafyYearly(inputs, y, metafy);
	const sales = ageSalesYearly(inputs, y, age);
	const referral = ageReferralYearly(inputs, age);
	// Direct earnings: what the headline compares. The pool is extra.
	const ageTotal = sales + referral;
	const pool = poolPerYear(inputs, y, constants.pool);
	const difference = ageTotal - metafyTotal;

	const fanMetafy = inputs.coverBuyerFees ? p : p + fees.total;
	const fanAge = allInPrice(p, age);
	const memberAge = allInPrice(p * (1 - age.MEMBER_DISCOUNT), age);

	const crossover = findCrossover(inputs, constants);
	const max = Math.max(2 * y, crossover ? crossover.copies * 1.2 : 0) || 100;
	const xs = [0, ...bends(age, max), max];
	const level = levelReached(y, age);

	return {
		copiesPerYear: y,
		guides: g,
		metafy: {
			plan: inputs.plan,
			perSale: metafyPerSale(inputs, metafy),
			salesYearly: y * metafyPerSale(inputs, metafy),
			yearly: metafyTotal,
			perGuide: metafyTotal / g,
			monthlyFee: planMonthlyFee(inputs.plan, metafy),
			buyerFees: fees,
			fanPays: fanMetafy
		},
		age: {
			perSale: p * age.TEACHER_SHARE,
			// The best level these copies reach, and what a copy pays there.
			level,
			levelPerSale: p * level.share,
			topSeller: level !== age.LEVELS[0],
			salesYearly: sales,
			referralYearly: referral,
			yearly: ageTotal,
			poolYearly: pool,
			yearlyWithPool: ageTotal + pool,
			perGuide: ageTotal / g,
			monthlyFee: 0,
			fanPays: fanAge,
			memberPays: memberAge
		},
		difference,
		differencePerGuide: difference / g,
		differencePct: metafyTotal > 0 ? difference / metafyTotal : null,
		// The same comparison with the pool estimate added (equal when it's
		// off, or the creator doesn't sell enough to qualify).
		includesPool: pool > 0,
		differenceWithPool: difference + pool,
		differencePctWithPool: metafyTotal > 0 ? (difference + pool) / metafyTotal : null,
		fanGap: cents(fanMetafy) - cents(fanAge),
		fanSaving: {
			nonMember: (fanMetafy - fanAge) / fanMetafy,
			member: (fanMetafy - memberAge) / fanMetafy
		},
		crossover,
		chart: { max, points: xs.map((x) => ({ copies: x, ...yearlyAt(inputs, x, constants) })) }
	};
}

/**
 * How the headline reads: AGE ahead (or level), or behind, with the
 * yearly gap, the gap as a share of Metafy, and how much less a fan pays
 * on AGE (null when they don't pay less). It compares direct earnings,
 * plus the pool estimate when the creator has switched it on.
 * @returns {{ kind: 'more' | 'less', withPool: boolean, amount: number,
 *   pct: number | null, fanGap: number | null }}
 */
export function headline(result) {
	const withPool = result.includesPool;
	const gap = withPool ? result.differenceWithPool : result.difference;
	const pct = withPool ? result.differencePctWithPool : result.differencePct;
	return {
		kind: gap >= 0 ? 'more' : 'less',
		withPool,
		amount: Math.abs(gap),
		pct: pct === null ? null : Math.abs(pct),
		fanGap: result.fanGap > 0 ? Number(result.fanGap.toFixed(2)) : null
	};
}

/**
 * Where one sale's money goes on each, at the creator's first copies
 * (the Partner level): what the fan pays, split into the creator's share,
 * the platform's cut and the fees. The parts add up to what the fan pays.
 */
export function saleBreakdown(inputs, constants = CONSTANTS) {
	const { age, metafy } = constants;
	const p = inputs.price;
	const fanAge = allInPrice(p, age);
	const fees = metafyBuyerFees(p, metafy);
	const cut =
		inputs.plan === 'core'
			? p * (inputs.coreFeePct ?? metafy.CORE_FEE_PCT) +
				(inputs.coreFeeFixed ?? metafy.CORE_FEE_FIXED)
			: 0;
	return {
		age: {
			fanPays: fanAge,
			you: p * age.TEACHER_SHARE,
			platform: p * (1 - age.TEACHER_SHARE),
			fees: fanAge - p
		},
		metafy: {
			fanPays: inputs.coverBuyerFees ? p : p + fees.total,
			you: metafyPerSale(inputs, metafy),
			platform: cut,
			fees: fees.total,
			monthlyFee: planMonthlyFee(inputs.plan, metafy)
		}
	};
}

/**
 * Turn the page's raw fields (strings from text inputs, booleans from
 * toggles) into calculator inputs, with an error per bad field.
 * @returns {{ inputs: any, errors: Record<string, string> }}
 */
export function readInputs(raw) {
	/** @type {Record<string, string>} */
	const errors = {};
	const num = (key, label, { min = 0, max = Infinity, whole = false } = {}) => {
		const s = String(raw[key] ?? '')
			.replace(/[$,%\s]/g, '')
			.trim();
		if (s === '') {
			errors[key] = `Enter ${label}.`;
			return NaN;
		}
		const n = Number(s);
		if (!Number.isFinite(n)) errors[key] = `${cap(label)} must be a number.`;
		else if (n < 0) errors[key] = `${cap(label)} can’t be negative.`;
		else if (whole && !Number.isInteger(n)) errors[key] = `${cap(label)} must be a whole number.`;
		else if (n < min || n > max)
			errors[key] =
				max === Infinity ? `${cap(label)} must be at least ${min}.` : `Use ${min} to ${max}.`;
		return n;
	};
	const inputs = {
		plan: PLANS.some((p) => p.v === raw.plan) ? raw.plan : 'core',
		price: num('price', 'a price', { min: 1, max: 200 }),
		copies: num('copies', 'copies sold', { whole: true }),
		period: raw.period === 'month' ? 'month' : 'year',
		guides: num('guides', 'the number of guides', { min: 1, whole: true }),
		coverBuyerFees: !!raw.coverBuyerFees,
		signupsPerMonth: num('signupsPerMonth', 'referrals', { max: 100, whole: true }),
		includePool: !!raw.includePool,
		// Only checked when the pool estimate is on; otherwise it plays no part.
		poolMembers: raw.includePool
			? num('poolMembers', 'a member count', { whole: true })
			: Number(raw.poolMembers) || 0,
		poolReadingShare:
			(raw.includePool
				? num('poolReadingShare', 'a share', { max: 100 })
				: Number(raw.poolReadingShare) || 0) / 100,
		coreFeePct: num('coreFeePct', 'a fee', { max: 100 }) / 100,
		coreFeeFixed: num('coreFeeFixed', 'a fixed fee')
	};
	return { inputs, errors };
}

const cap = (s) => s.replace(/^(a |an |the )/, '').replace(/^./, (c) => c.toUpperCase());
