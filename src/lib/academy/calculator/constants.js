/**
 * The numbers behind the Metafy vs. AGE Partner calculator
 * (/academy-calculator). AGE's terms come from the Partner terms module
 * ($lib/academy/partner/terms.js), the same numbers checkout and payouts
 * use, so the calculator can't promise anything the site doesn't pay.
 * Metafy's terms and the calculator's own forecasts live here.
 *
 * Shares are fractions of the guide's list price (0.90 = 90%).
 */
import {
	CARD_FEE_FIXED_CENTS,
	CARD_FEE_PCT,
	LEVELS,
	MEMBER_DISCOUNT,
	MEMBER_SALE_SHARE,
	POOL_MIN_COPIES_PER_YEAR,
	POOL_PCT,
	POOL_START_MEMBERS,
	REFERRAL_BONUS_CENTS
} from '$lib/academy/partner/terms.js';

/** AGE Partner terms. */
export const AGE = {
	/** The teacher keeps this share of list price on every copy at the first level. */
	TEACHER_SHARE: LEVELS[0].share,
	/**
	 * Partner levels by lifetime copies, across all of a creator's guides:
	 * a copy is paid at the level the creator held before it sold. The
	 * higher rates apply to non-member sales.
	 */
	LEVELS,
	/** Sales to Premium members pay this at every level. */
	MEMBER_SALE_SHARE,
	/**
	 * Premium members pay this much less. AGE funds it: the teacher is
	 * still paid on the full list price.
	 */
	MEMBER_DISCOUNT,
	/** Card processing, passed to the buyer inside AGE's all-in price. */
	CARD_FEE_PCT,
	CARD_FEE_FIXED: CARD_FEE_FIXED_CENTS / 100,
	/** Paid to the teacher for each Premium signup through their link or code (USD). */
	REFERRAL_BONUS: REFERRAL_BONUS_CENTS / 100
};

/**
 * The teacher pool: a share of AGE Premium revenue, once AGE has
 * START_MEMBERS active Premium members, open to a creator once they sell
 * START_COPIES_PER_YEAR copies a year (across all their guides), and split
 * by how much Premium members read each guide. The calculator only shows
 * it as an opt-in estimate.
 */
export const POOL = {
	/** The pool's share of Premium revenue. */
	PCT: POOL_PCT,
	/** A creator shares in the pool once they sell this many copies a year, across all guides. */
	START_COPIES_PER_YEAR: POOL_MIN_COPIES_PER_YEAR,
	/** The pool runs once AGE has this many active Premium members. */
	START_MEMBERS: POOL_START_MEMBERS,
	/** AGE's own forecast of Premium members, the projection's floor. */
	FORECAST_MEMBERS: 400,
	/**
	 * Premium members projected per copy a creator sells a year: a creator
	 * selling well grows Premium with them, so the projection is the larger
	 * of the forecast and this share of their copies.
	 */
	MEMBERS_PER_COPY: 0.5,
	/** Premium revenue per member per month, after fees (USD). */
	NET_REVENUE_PER_MEMBER_MONTH: 9.2
};

/**
 * Metafy's published terms.
 * Last verified: November 2026.
 */
export const METAFY = {
	/** Core (free plan): Metafy keeps this share of list price, plus a fixed fee per sale. */
	CORE_FEE_PCT: 0.15,
	CORE_FEE_FIXED: 0,
	/** Pro, per month: billed annually, or billed monthly. Pro creators keep 100% of list price. */
	PRO_ANNUAL_MONTHLY: 69,
	PRO_MONTHLY: 99,
	/** The buyer's platform fee on each order: a share plus a fixed amount, capped. */
	BUYER_PLATFORM_PCT: 0.037,
	BUYER_PLATFORM_FIXED: 1.79,
	BUYER_PLATFORM_CAP: 20,
	/** The buyer's processing fee on each order. */
	BUYER_PROCESSING_PCT: 0.029,
	BUYER_PROCESSING_FIXED: 0.4
};

export const METAFY_LAST_VERIFIED = 'November 2026';
export const METAFY_SOURCES = [
	{
		label: 'Metafy pricing update (April 2026)',
		href: 'https://help.metafy.gg/en/articles/14668355-metafy-pricing-update-april-2026'
	},
	{
		label: 'Metafy buyer fees breakdown',
		href: 'https://help.metafy.gg/en/articles/14676126-buyer-fees-breakdown'
	}
];

/** Every number the math uses, in one object (the default for calculateComparison). */
export const CONSTANTS = { age: AGE, metafy: METAFY, pool: POOL };

/** The furthest the break-even search looks, in copies per year. */
export const CROSSOVER_LIMIT = 100_000;

/** The calculator's inputs, as the page first shows them. */
export const DEFAULTS = {
	plan: 'core',
	price: '15',
	copies: '100',
	period: 'year',
	guides: '1',
	coverBuyerFees: false,
	signupsPerMonth: '0',
	includePool: false,
	poolMembers: String(POOL.FORECAST_MEMBERS),
	poolReadingShare: '10',
	coreFeePct: '15',
	coreFeeFixed: '0'
};

// TODO: point at the AGE Partner application once it exists (there is no
// apply or contact page yet).
export const APPLY_HREF = '/contact';
