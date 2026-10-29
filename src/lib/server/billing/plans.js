/**
 * Membership prices and promo quotes. Every amount is in cents and every
 * quote is worked out here, on the server; the browser only ever sends the
 * plan and the code.
 */
import { PARTNER_DISCOUNT_AMOUNT } from '$lib/server/partner-code.js';
import { MEMBER_REFERRAL_DISCOUNT } from '$lib/server/member-referral.js';

export const PLANS = {
	monthly: { key: 'monthly', label: 'Monthly', priceCents: 1000, months: 1, noun: 'month' },
	yearly: { key: 'yearly', label: 'Annual', priceCents: 11000, months: 12, noun: 'year' }
};

export const isPlan = (p) => p === 'monthly' || p === 'yearly';

/** List price in cents for a plan. */
export function listPriceCents(plan) {
	const p = PLANS[plan];
	if (!p) throw new Error(`Unknown plan: ${plan}`);
	return p.priceCents;
}

/** "$10.00" for 1000. */
export function formatCents(cents) {
	const n = Number(cents || 0) / 100;
	return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}

/**
 * The first charge for a plan under a promo.
 *
 * - partner code: $5 off the first charge (the partner earns the same)
 * - member referral: the first month free; $10 off the first year
 *
 * @param {'monthly'|'yearly'} plan
 * @param {'partner'|'member_referral'|null} promoKind
 * @returns {{ listCents: number, discountCents: number, amountCents: number }}
 */
export function quoteFirstCharge(plan, promoKind = null) {
	const listCents = listPriceCents(plan);
	let discountCents = 0;
	if (promoKind === 'partner') {
		discountCents = Math.round(PARTNER_DISCOUNT_AMOUNT * 100);
	} else if (promoKind === 'member_referral') {
		discountCents = plan === 'monthly' ? listCents : Math.round(MEMBER_REFERRAL_DISCOUNT * 100);
	}
	discountCents = Math.min(discountCents, listCents);
	return { listCents, discountCents, amountCents: listCents - discountCents };
}
