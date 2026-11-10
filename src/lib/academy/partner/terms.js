/**
 * The AGE Partner terms: every number the guide marketplace runs on, in
 * one place. Prices and the split, levels, referral bonus, the teacher
 * pool and payouts all read from here, and so does the earnings
 * calculator, so what we advertise and what we pay can't drift apart.
 *
 * Money is in cents. Rates are fractions (0.9 = 90%).
 *
 * Safe to import anywhere (no server code).
 */

/** Premium members get this much off every guide. AGE pays for it, not the teacher. */
export const MEMBER_DISCOUNT = 0.1;

/**
 * Authorize.net's all-in-one card fee: 2.9% + 30¢ per transaction. Every
 * buyer pays it inside the price they see; it's never added at checkout.
 */
export const CARD_FEE_PCT = 0.029;
export const CARD_FEE_FIXED_CENTS = 30;

/** The price range we recommend teachers set, in cents. */
export const RECOMMENDED_PRICE_CENTS = { min: 1000, max: 3000 };

/**
 * Partner levels, by lifetime copies sold across all of a teacher's guides
 * (net of refunds and chargebacks; it never resets). A copy is paid at the
 * level the teacher held before it sold: copies 1–1,000 at Partner, copy
 * 1,001 is the first Senior sale, copy 5,001 the first Elite sale.
 *
 * `share` is the teacher's part of the list price on a non-member sale.
 * Member sales always pay MEMBER_SALE_SHARE, at every level: AGE's 10%
 * covers the member discount exactly, so AGE never loses money on a sale.
 */
export const LEVELS = [
	{ key: 'PARTNER', name: 'Partner', from: 0, share: 0.9 },
	{ key: 'SENIOR', name: 'Senior', from: 1000, share: 0.93 },
	{ key: 'ELITE', name: 'Elite', from: 5000, share: 0.95 }
];
export const MEMBER_SALE_SHARE = 0.9;

/**
 * A sale is on hold this long, and until Authorize.net confirms its charge
 * settled (usually the same night; the hourly billing job checks), before
 * it lands on a statement. A refund after that comes off the next
 * statement instead.
 */
export const HOLD_DAYS = 3;
/** A sale whose charge hasn't settled yet is checked again this much later. */
export const SETTLEMENT_RECHECK_HOURS = 24;

/**
 * Teacher referrals: $10 for every new Premium member who signs up through
 * the teacher's link (within REFERRAL_LINK_DAYS of clicking it) or with
 * their code. Recorded once the member's first payment is past the refund
 * window. One bonus per member, ever; teachers can't refer themselves.
 */
export const REFERRAL_BONUS_CENTS = 1000;
export const REFERRAL_LINK_DAYS = 30;
export const REFERRAL_REFUND_WINDOW_DAYS = 14;
/** The cookie a teacher's link (?ref=CODE) sets. */
export const REFERRAL_COOKIE = 'age_ref';

/**
 * The teacher pool, built now and off by default. Once AGE has
 * POOL_START_MEMBERS active Premium members, POOL_PCT of each month's net
 * Premium revenue is shared among teachers by unique member reads of their
 * guides. A teacher shares in it once they've sold POOL_MIN_COPIES_PER_YEAR
 * copies in the twelve months to the end of that month.
 */
export const POOL_ENABLED = false;
export const POOL_PCT = 0.05;
export const POOL_START_MEMBERS = 250;
export const POOL_MIN_COPIES_PER_YEAR = 250;

/** Exclusivity agreements run this many months, and renew unless switched off. */
export const EXCLUSIVITY_MONTHS = 12;

/** Payouts: monthly statements, paid on the first Monday of the next month (UTC). */
export const PAY_WEEKDAY = 1;

/**
 * Guide refunds (see $lib/academy/partner/refundPolicy.js and
 * /refund-policy). Guides are non-refundable once opened, except:
 *   duplicate         charged twice or by mistake: approved automatically, any time
 *   broken            won't load and we can't fix it within BROKEN_FIX_DAYS: admin decides
 *   not_as_described  substantially different from its description: admin decides
 *   unopened          never opened, asked within UNOPENED_REFUND_DAYS: approved automatically
 *   teacher           the teacher approves a refund of their own guide
 * Every request but a duplicate must come within REFUND_REQUEST_WINDOW_DAYS.
 */
export const UNOPENED_REFUND_DAYS = 7;
export const REFUND_REQUEST_WINDOW_DAYS = 14;
export const BROKEN_FIX_DAYS = 3;

/** What a chargeback costs AGE, and whether the teacher pays it too. */
export const CHARGEBACK_FEE_CENTS = 2500;
export const CHARGEBACK_FEE_TO_TEACHER = false;

/** The checkbox above every guide payment. Stored word for word with the order. */
export const REFUND_CONSENT_TEXT =
	'I want immediate access to this guide and understand that I lose my right to a refund once I open it.';
