/**
 * The numbers behind the Metafy vs. AGE Partner calculator
 * (/academy-calculator). Change terms here; the page and the math read
 * them from this file only.
 *
 * Shares are fractions of the guide's list price (0.90 = 90%).
 */

/** AGE Partner terms. */
export const AGE = {
	/** The teacher keeps this share of list price on every copy. */
	TEACHER_SHARE: 0.9,
	/**
	 * The top-seller rate starts after this many copies a year, counted per
	 * creator across all their guides (not per guide).
	 */
	TOP_SELLER_COPIES_PER_YEAR: 250,
	/**
	 * The teacher's share on each copy past that point in the year (AGE's
	 * cut drops to 7%). Marginal: earlier copies stay at TEACHER_SHARE.
	 */
	TOP_SELLER_TEACHER_SHARE: 0.93,
	/**
	 * Premium members pay this much less. AGE funds it: the teacher is
	 * still paid on the full list price.
	 */
	MEMBER_DISCOUNT: 0.1,
	/** Card processing, passed to the buyer inside AGE's all-in price. */
	CARD_FEE_PCT: 0.029,
	CARD_FEE_FIXED: 0.3,
	/** Paid to the teacher for each Premium signup through their link (USD). */
	REFERRAL_BONUS: 10
};

/**
 * The teacher pool: a share of AGE Premium revenue, switched on once
 * Premium has START_MEMBERS members, and split among partners by how much
 * Premium members read each guide. It doesn't depend on a creator's sales.
 * The calculator only shows it as an opt-in estimate, never in the headline.
 */
export const POOL = {
	/** The pool's share of Premium revenue. */
	PCT: 0.05,
	/** The pool is paid only when AGE Premium has at least this many members. */
	START_MEMBERS: 250,
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
	poolMembers: '400',
	poolReadingShare: '10',
	coreFeePct: '15',
	coreFeeFixed: '0'
};

// TODO: point at the AGE Partner application once it exists (there is no
// apply or contact page yet).
export const APPLY_HREF = '/contact';
