/**
 * Saved cards.
 *
 * A card lives at Authorize.net as a payment profile on the member's
 * customer profile; `saved_card` is our mirror of it (brand, last four,
 * expiry, status). Card numbers never reach this server: the browser
 * tokenizes them with Accept.js and we store the token's result.
 *
 * Cards are never deleted from `saved_card`, only marked, so an old order
 * can still say which card paid for it.
 */
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { savedCard, subscription, user as userTable } from '$lib/server/db/schema.js';
import {
	authnet,
	AuthnetError,
	cardTypeLabel,
	parseExpiration
} from '$lib/server/authnet/client.js';
import { bump } from '$lib/server/cache/index.js';
import { logMemberEvent } from '$lib/server/payments/ledger.js';

export const LIVE_CARD = ['active', 'expired', 'invalid'];

/** Is this card past its expiry month? */
export function isExpired(card, now = new Date()) {
	if (!card?.expYear || !card?.expMonth) return false;
	const end = Date.UTC(card.expYear, card.expMonth, 1); // first day after the expiry month
	return now.getTime() >= end;
}

/** Will the card expire within `months` months? */
export function expiresSoon(card, months = 1, now = new Date()) {
	if (!card?.expYear || !card?.expMonth) return false;
	const end = Date.UTC(card.expYear, card.expMonth, 1);
	const soon = new Date(now);
	soon.setUTCMonth(soon.getUTCMonth() + months);
	return end <= soon.getTime();
}

/** Shape a saved_card row for a page or API response. */
export function publicCard(card) {
	if (!card) return null;
	const expired = card.status === 'expired' || isExpired(card);
	return {
		id: card.id,
		brand: cardTypeLabel(card.cardType),
		lastFour: card.lastFour,
		expMonth: card.expMonth,
		expYear: card.expYear,
		expiry:
			card.expMonth && card.expYear
				? `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
				: null,
		isDefault: !!card.isDefault,
		nickname: card.nickname || null,
		status: expired ? 'expired' : card.status,
		usable: !expired && card.status === 'active',
		addedAt: card.createdAt
	};
}

/** A member's cards that still exist, default first. */
export async function listCards(userId, tx = db) {
	const rows = await tx
		.select()
		.from(savedCard)
		.where(and(eq(savedCard.userId, userId), inArray(savedCard.status, LIVE_CARD)))
		.orderBy(desc(savedCard.isDefault), desc(savedCard.createdAt));
	return rows;
}

/** The card a checkout should offer first: the default, if it's usable. */
export function pickDefault(cards) {
	const usable = cards.filter((c) => publicCard(c).usable);
	return usable.find((c) => c.isDefault) || usable[0] || null;
}

/**
 * The member's Authorize.net customer profile id, creating the profile if
 * they have none. Stored on the user row.
 */
export async function ensureCustomerProfile(user, { tx = db } = {}) {
	if (user.customerProfileId) return String(user.customerProfileId);
	const [fresh] = await tx
		.select({ customerProfileId: userTable.customerProfileId })
		.from(userTable)
		.where(eq(userTable.id, user.id))
		.limit(1);
	if (fresh?.customerProfileId) return String(fresh.customerProfileId);

	const { customerProfileId } = await authnet.createCustomerProfile({
		merchantCustomerId: user.id,
		email: user.email,
		description: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
	});
	await tx.update(userTable).set({ customerProfileId }).where(eq(userTable.id, user.id));
	await bump(`user:${user.id}`);
	return customerProfileId;
}

/**
 * Write or refresh our row for a gateway payment profile.
 *
 * @param {{ userId: string, customerProfileId: string, profile: { paymentProfileId: string, cardType?: string|null, lastFour?: string|null, expMonth?: number|null, expYear?: number|null },
 *   source: string, makeDefault?: boolean, nickname?: string|null }} input
 */
export async function upsertCard(
	{ userId, customerProfileId, profile, source, makeDefault = false, nickname = null },
	tx = db
) {
	const status = profile.expMonth && profile.expYear && isExpired(profile) ? 'expired' : 'active';
	const values = {
		userId,
		customerProfileId: String(customerProfileId),
		paymentProfileId: String(profile.paymentProfileId),
		cardType: profile.cardType || 'Card',
		lastFour: profile.lastFour || '••••',
		expirationMonth: profile.expMonth ? String(profile.expMonth).padStart(2, '0') : '',
		expirationYear: profile.expYear ? String(profile.expYear) : '',
		expMonth: profile.expMonth ?? null,
		expYear: profile.expYear ?? null,
		status,
		source,
		environment: authnet.environment,
		verifiedAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		nickname
	};
	const [row] = await tx
		.insert(savedCard)
		.values(values)
		.onConflictDoUpdate({
			target: [savedCard.userId, savedCard.paymentProfileId],
			targetWhere: sql`status not in ('deleted', 'duplicate')`,
			set: {
				cardType: values.cardType,
				lastFour: values.lastFour,
				expirationMonth: values.expirationMonth,
				expirationYear: values.expirationYear,
				expMonth: values.expMonth,
				expYear: values.expYear,
				status,
				verifiedAt: values.verifiedAt,
				updatedAt: values.updatedAt,
				...(nickname ? { nickname } : {})
			}
		})
		.returning();

	// First usable card becomes the default; `makeDefault` moves it.
	const others = await tx
		.select({ id: savedCard.id, isDefault: savedCard.isDefault })
		.from(savedCard)
		.where(
			and(
				eq(savedCard.userId, userId),
				inArray(savedCard.status, LIVE_CARD),
				ne(savedCard.id, row.id)
			)
		);
	const hasDefault = others.some((c) => c.isDefault);
	if (makeDefault || !hasDefault) {
		if (hasDefault) {
			await tx.update(savedCard).set({ isDefault: false }).where(eq(savedCard.userId, userId));
		}
		if (!row.isDefault) {
			await tx.update(savedCard).set({ isDefault: true }).where(eq(savedCard.id, row.id));
			row.isDefault = true;
		}
	}
	return row;
}

/**
 * Store a card tokenized in the browser.
 *
 * `validation` is 'none' when a charge follows at once (the charge proves
 * the card), or 'liveMode' when the card is being saved for later.
 *
 * If the gateway already holds this card number, the stored profile is
 * reused. When the member typed a newer expiry than the stored one (a
 * reissued card), `{ retoken: true, cardId }` is returned: the browser must
 * tokenize again and call `updateCardFromToken`, because a token is
 * single-use.
 *
 * @param {{ user: any, opaqueData: object, billTo?: object, expiry?: { month: number, year: number } | null,
 *   validation?: 'none' | 'liveMode', source: string, makeDefault?: boolean, nickname?: string|null }} input
 * @returns {Promise<{ card: any, duplicate: boolean, retoken?: boolean }>}
 */
export async function addCardFromToken({
	user,
	opaqueData,
	billTo,
	expiry = null,
	validation = 'none',
	source,
	makeDefault = false,
	nickname = null
}) {
	const customerProfileId = await ensureCustomerProfile(user);
	const created = await authnet.createPaymentProfile({
		customerProfileId,
		opaqueData,
		billTo,
		validationMode: validation
	});
	const profile = await authnet.getPaymentProfile(customerProfileId, created.paymentProfileId);
	if (!profile)
		throw new AuthnetError('The card was stored but could not be read back', { code: 'E00040' });
	profile.cardType = cardTypeLabel(profile.cardType);

	const card = await upsertCard({
		userId: user.id,
		customerProfileId,
		profile,
		source,
		makeDefault,
		nickname
	});

	if (
		created.duplicate &&
		expiry &&
		(expiry.month !== profile.expMonth || expiry.year !== profile.expYear)
	) {
		return { card, duplicate: true, retoken: true };
	}
	return { card, duplicate: created.duplicate };
}

/** Replace the card behind a saved card (reissued card, new expiry). */
export async function updateCardFromToken({ user, cardId, opaqueData, billTo }) {
	const card = await ownedCard(user.id, cardId);
	await authnet.updatePaymentProfile({
		customerProfileId: card.customerProfileId,
		paymentProfileId: card.paymentProfileId,
		opaqueData,
		billTo,
		validationMode: 'liveMode'
	});
	const refreshed = await refreshCard(card);
	await logMemberEvent({ userId: user.id, kind: 'card_updated', meta: { cardId } });
	return refreshed;
}

/** Re-read a card from the gateway and bring our row up to date. */
export async function refreshCard(card, tx = db) {
	let profile = null;
	try {
		profile = await authnet.getPaymentProfile(card.customerProfileId, card.paymentProfileId);
	} catch (err) {
		if (!(err instanceof AuthnetError) || err.unknown) throw err;
	}
	if (!profile) {
		const [row] = await tx
			.update(savedCard)
			.set({ status: 'invalid', verifiedAt: new Date(), updatedAt: new Date() })
			.where(eq(savedCard.id, card.id))
			.returning();
		return row;
	}
	profile.cardType = cardTypeLabel(profile.cardType);
	return upsertCard(
		{
			userId: card.userId,
			customerProfileId: card.customerProfileId,
			profile,
			source: card.source || 'account'
		},
		tx
	);
}

/**
 * Save the card that paid for a transaction (a one-time charge the member
 * asked us to remember). Best effort: returns null when it can't be done.
 */
export async function saveCardFromTransaction({ user, transId, source }) {
	try {
		const customerProfileId = await ensureCustomerProfile(user);
		const result = await authnet.createProfileFromTransaction({ transId, customerProfileId });
		let paymentProfileId = result.paymentProfileId;
		if (!paymentProfileId) {
			// The card was already on the profile: find it by the transaction's last four.
			const [details, cp] = await Promise.all([
				authnet.getTransactionDetails(transId),
				authnet.getCustomerProfile(customerProfileId)
			]);
			const match = cp?.paymentProfiles.find((p) => p.lastFour && p.lastFour === details?.lastFour);
			paymentProfileId = match?.paymentProfileId ?? null;
		}
		if (!paymentProfileId) return null;
		const profile = await authnet.getPaymentProfile(customerProfileId, paymentProfileId);
		if (!profile) return null;
		profile.cardType = cardTypeLabel(profile.cardType);
		return await upsertCard({ userId: user.id, customerProfileId, profile, source });
	} catch (err) {
		console.error('[cards] saveCardFromTransaction failed:', err?.message || err);
		return null;
	}
}

/**
 * Remove a saved card. Refused while a live membership charges it.
 * The gateway profile is deleted first; a profile that is already gone
 * counts as deleted.
 */
export async function removeCard({ user, cardId }) {
	const card = await ownedCard(user.id, cardId);
	const [backing] = await db
		.select({ id: subscription.id })
		.from(subscription)
		.where(
			and(
				eq(subscription.userId, user.id),
				inArray(subscription.status, ['active', 'past_due', 'cancelled']),
				eq(subscription.paymentProfileId, card.paymentProfileId)
			)
		)
		.limit(1);
	if (backing) {
		return {
			ok: false,
			error: 'This card pays for your membership. Add another card and switch to it first.'
		};
	}
	await authnet.deletePaymentProfile(card.customerProfileId, card.paymentProfileId);
	await db
		.update(savedCard)
		.set({ status: 'deleted', deletedAt: new Date(), isDefault: false, updatedAt: new Date() })
		.where(eq(savedCard.id, card.id));
	if (card.isDefault) {
		const rest = await listCards(user.id);
		const next = pickDefault(rest);
		if (next) await db.update(savedCard).set({ isDefault: true }).where(eq(savedCard.id, next.id));
	}
	return { ok: true };
}

export async function setDefaultCard({ user, cardId }) {
	const card = await ownedCard(user.id, cardId);
	await db.update(savedCard).set({ isDefault: false }).where(eq(savedCard.userId, user.id));
	await db
		.update(savedCard)
		.set({ isDefault: true, updatedAt: new Date() })
		.where(eq(savedCard.id, card.id));
	return { ok: true };
}

/** A card row that belongs to the member and still exists, or a 404-ish error. */
export async function ownedCard(userId, cardId, tx = db) {
	const [card] = await tx
		.select()
		.from(savedCard)
		.where(
			and(
				eq(savedCard.id, cardId),
				eq(savedCard.userId, userId),
				inArray(savedCard.status, LIVE_CARD)
			)
		)
		.limit(1);
	if (!card) {
		const err = new Error('Saved card not found');
		err.status = 404;
		throw err;
	}
	return card;
}

/** Normalize an expiry the browser sent alongside a token. */
export function expiryFromInput(month, year) {
	const m = Number(month);
	let y = Number(year);
	if (!m || m < 1 || m > 12 || !y) return null;
	if (y < 100) y += 2000;
	return { month: m, year: y };
}

export { parseExpiration };
