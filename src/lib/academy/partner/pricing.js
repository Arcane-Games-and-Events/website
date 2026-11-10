/**
 * Guide prices and the Partner split, in whole cents. Pure functions, used
 * by checkout, the ledger, product pages and the calculator alike.
 *
 * Rounding is half-up to the cent, done in integers so 15.765 can't come
 * out as 15.76 through floating point.
 */
import {
	CARD_FEE_FIXED_CENTS,
	CARD_FEE_PCT,
	LEVELS,
	MEMBER_DISCOUNT,
	MEMBER_SALE_SHARE
} from './terms.js';

/** A rate as whole basis points (0.029 → 290), so the maths below stays in integers. */
const bp = (rate) => Math.round(rate * 10000);

/** cents × rate, rounded half-up to the cent. */
export function applyRate(cents, rate) {
	return Math.floor((2 * cents * bp(rate) + 10000) / 20000);
}

/**
 * What to charge so the card fee is fully covered:
 * allIn(amount) = roundHalfUp((amount + fixed fee) / (1 − fee %)).
 * Nothing to pay means no charge at all, so no fee.
 */
export function allIn(cents) {
	if (cents <= 0) return 0;
	const keep = 10000 - bp(CARD_FEE_PCT);
	return Math.floor((2 * (cents + CARD_FEE_FIXED_CENTS) * 10000 + keep) / (2 * keep));
}

/** A guide's price before the card fee: the list price, less 10% for Premium members. */
export function itemPrice(listCents, member) {
	const priceCents = member ? applyRate(listCents, 1 - MEMBER_DISCOUNT) : listCents;
	return { listCents, priceCents, memberDiscountCents: listCents - priceCents };
}

/** Both prices a product page shows, card fee included. */
export function shownPrices(listCents) {
	return {
		nonMemberCents: allIn(listCents),
		memberCents: allIn(itemPrice(listCents, true).priceCents)
	};
}

/**
 * Price a cart. The card fee is charged once on the whole cart, then
 * shared across the items in proportion to their price (largest remainder,
 * so the shares always add up to the fee collected).
 *
 * @param {{ listCents: number }[]} items
 * @param {{ member: boolean }} opts
 */
export function quoteCart(items, { member }) {
	const priced = items.map((it) => ({ ...it, ...itemPrice(it.listCents, member) }));
	const subtotalCents = priced.reduce((n, it) => n + it.priceCents, 0);
	const totalCents = allIn(subtotalCents);
	const feeCents = totalCents - subtotalCents;
	const shares = splitByWeight(
		feeCents,
		priced.map((it) => it.priceCents)
	);
	return {
		member,
		items: priced.map((it, i) => ({
			...it,
			feeCents: shares[i],
			paidCents: it.priceCents + shares[i]
		})),
		listCents: priced.reduce((n, it) => n + it.listCents, 0),
		memberDiscountCents: priced.reduce((n, it) => n + it.memberDiscountCents, 0),
		subtotalCents,
		feeCents,
		totalCents
	};
}

/**
 * Share `total` cents across weights, largest remainder first (earlier
 * items win ties). The parts always add up to `total`.
 */
export function splitByWeight(total, weights) {
	const sum = weights.reduce((n, w) => n + w, 0);
	if (!total || !sum) return weights.map(() => 0);
	const exact = weights.map((w) => (total * w) / sum);
	const parts = exact.map(Math.floor);
	let left = total - parts.reduce((n, p) => n + p, 0);
	const order = exact
		.map((x, i) => ({ i, r: x - Math.floor(x) }))
		.sort((a, b) => b.r - a.r || a.i - b.i);
	for (let k = 0; left > 0; k = (k + 1) % order.length, left--) parts[order[k].i]++;
	return parts;
}

/**
 * The level a teacher sells at, given the copies they'd sold before this
 * one: under 1,000 is Partner, so copy 1,000 is still Partner and copy
 * 1,001 is the first Senior sale.
 */
export function levelFor(priorCopies) {
	let level = LEVELS[0];
	for (const l of LEVELS) if (priorCopies >= l.from) level = l;
	return level;
}

/** A teacher's standing: their level, the next one, and how many copies away it is. */
export function standing(lifetimeCopies) {
	const level = levelFor(lifetimeCopies);
	const next = LEVELS.find((l) => l.from > lifetimeCopies) || null;
	return {
		lifetimeCopies,
		level,
		next,
		copiesToNext: next ? next.from - lifetimeCopies : 0
	};
}

/**
 * Split one copy of a guide. Always on the full list price, whatever the
 * buyer paid: the teacher's part is P × share, AGE's commission the rest,
 * and AGE's net is its commission less the member discount it paid for.
 *
 * @param {{ listCents: number, member: boolean, priorCopies: number }} sale
 */
export function splitSale({ listCents, member, priorCopies }) {
	const level = levelFor(priorCopies);
	const shareRate = member ? MEMBER_SALE_SHARE : level.share;
	const { memberDiscountCents } = itemPrice(listCents, member);
	const teacherCents = applyRate(listCents, shareRate);
	const ageCommissionCents = listCents - teacherCents;
	return {
		level: level.key,
		shareRate,
		copyNumber: priorCopies + 1,
		teacherCents,
		ageCommissionCents,
		memberDiscountCents,
		ageNetCents: ageCommissionCents - memberDiscountCents
	};
}

/** $15.76 */
export const usd = (cents) =>
	(cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/**
 * What a product page shows for a guide whose list price is `price`
 * dollars: both prices, card fee included, and the viewer's own.
 * Null for a free guide.
 */
export function guidePrices(price, member = false) {
	const listCents = Math.round(Number(price || 0) * 100);
	if (!(listCents > 0)) return null;
	const { nonMemberCents, memberCents } = shownPrices(listCents);
	return {
		nonMemberCents,
		memberCents,
		youCents: member ? memberCents : nonMemberCents,
		nonMember: usd(nonMemberCents),
		member: usd(memberCents),
		you: usd(member ? memberCents : nonMemberCents),
		// "$15.76, or $14.21 with Premium"
		line: `${usd(nonMemberCents)}, or ${usd(memberCents)} with Premium`
	};
}
