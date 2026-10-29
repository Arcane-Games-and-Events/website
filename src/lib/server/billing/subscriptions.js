/**
 * Membership operations: start, cancel, resume, switch plan, change card,
 * and the admin controls. See README.md for the state machine.
 *
 * Nothing here holds a database transaction across a gateway call: a
 * charge happens between the intent being written and the result being
 * finalized.
 */
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	memberReferral,
	order as orderTable,
	partnerReferral,
	savedCard,
	subscription,
	subscriptionInvoice,
	user as userTable
} from '$lib/server/db/schema.js';
import { authnet, describeOutcome } from '$lib/server/authnet/client.js';
import { bump } from '$lib/server/cache/index.js';
import { logMemberEvent, recordPayment } from '$lib/server/payments/ledger.js';
import { nextInvoiceNumber } from '$lib/server/payments/invoice.js';
import {
	addCardFromToken,
	isExpired,
	listCards,
	ownedCard,
	publicCard
} from '$lib/server/payments/cards.js';
import {
	validatePartnerCode,
	normalizePartnerCode,
	PARTNER_DISCOUNT_AMOUNT
} from '$lib/server/partner-code.js';
import {
	validateMemberReferralCode,
	getMemberReferralByCode
} from '$lib/server/member-referral.js';
import { PLANS, isPlan, listPriceCents, quoteFirstCharge } from './plans.js';
import { anchorDayOf, periodEndFor } from './dates.js';
import { applyAccess, liveSubscription, membershipGrantsAccess } from './access.js';
import { sendOnce } from './notices.js';
import {
	sendCancelledEmail,
	sendMembershipReceipt,
	sendMembershipWelcomeFree,
	sendPlanSwitchedEmail,
	sendResumedEmail
} from '$lib/server/email.js';

// ---------------------------------------------------------------- quotes

const PROMO_MESSAGES = {
	not_found: 'Promo code not found.',
	inactive: 'This promo code is no longer active.',
	already_used: "You've already used a promo code.",
	self_referral: "You can't redeem your own code."
};

/**
 * What a signup would cost. Resolves the promo code (member referral codes
 * first, then partner codes, as they share one namespace).
 *
 * @returns {Promise<{ ok: true, plan: string, promoKind: string|null, promoCode: string|null, listCents: number,
 *   discountCents: number, amountCents: number, renewalCents: number, partner?: any, referral?: any } | { ok: false, error: string }>}
 */
export async function quoteSignup({ user, plan, promoCode }) {
	if (!isPlan(plan)) return { ok: false, error: 'Choose a monthly or annual plan.' };
	let promoKind = null;
	let partner = null;
	let referral = null;
	const code = normalizePartnerCode(promoCode);
	if (code) {
		if (!user) return { ok: false, error: 'Sign in to use a promo code.' };
		const member = await getMemberReferralByCode(code);
		const v = member
			? await validateMemberReferralCode(code, user.id)
			: await validatePartnerCode(code, user.id);
		if (!v.valid) return { ok: false, error: PROMO_MESSAGES[v.reason] || 'Invalid promo code.' };
		if (member) {
			promoKind = 'member_referral';
			referral = v.referral;
		} else {
			promoKind = 'partner';
			partner = v.partner;
		}
	}
	const q = quoteFirstCharge(plan, promoKind);
	return {
		ok: true,
		plan,
		promoKind,
		promoCode: code || null,
		...q,
		renewalCents: listPriceCents(plan),
		partner,
		referral
	};
}

// ---------------------------------------------------------------- signup

/**
 * Start a membership.
 *
 * @param {{ user: any, plan: string, promoCode?: string|null,
 *   payment: { savedCardId?: string, opaqueData?: object, billTo?: object, expiry?: object|null },
 *   consent: boolean }} input
 * @returns {Promise<{ ok: true, subscription: any, amountCents: number } | { ok: false, status: number, error: string, pending?: boolean, subscriptionId?: string }>}
 */
export async function startSubscription({ user, plan, promoCode, payment, consent }) {
	if (!consent)
		return { ok: false, status: 400, error: 'Please agree to the automatic renewal terms.' };
	const quote = await quoteSignup({ user, plan, promoCode });
	if (!quote.ok) return { ok: false, status: 400, error: quote.error };

	// Where does this member stand?
	const live = await liveSubscription(user.id);
	if (live) {
		if (live.status === 'cancelled') {
			return {
				ok: false,
				status: 409,
				error:
					'Your membership is cancelled but still running. Resume it from your account instead.',
				resume: true
			};
		}
		return { ok: false, status: 409, error: 'You already have a membership.' };
	}
	const [u] = await db.select().from(userTable).where(eq(userTable.id, user.id)).limit(1);
	if (!u) return { ok: false, status: 401, error: 'Sign in to subscribe.' };
	if (
		u.subscriptionId &&
		['active', 'payment_failed'].includes(u.subscriptionStatus) &&
		!(await hasAnyRows(u.id))
	) {
		// A member still on the old Authorize.net subscription.
		return {
			ok: false,
			status: 409,
			error: "You're already a member. Manage your membership from your account."
		};
	}

	// The card.
	let card;
	try {
		card = await resolveCard(u, payment, {
			validation: quote.amountCents > 0 ? 'none' : 'liveMode',
			source: 'subscribe'
		});
	} catch (err) {
		return {
			ok: false,
			status: err.status || 502,
			error: err.message || 'The card could not be saved.'
		};
	}
	if (card.retoken)
		return { ok: false, status: 409, error: 'retoken', retoken: true, cardId: card.card.id };
	card = card.card;

	// The intent.
	const now = new Date();
	const anchorDay = anchorDayOf(now);
	const periodEnd = periodEndFor(now, plan, anchorDay);
	await expireStaleIncompletes(u.id);
	let sub;
	let inv;
	try {
		({ sub, inv } = await db.transaction(async (tx) => {
			const [sub] = await tx
				.insert(subscription)
				.values({
					ref: sql`gen_random_uuid()::text`,
					userId: u.id,
					plan,
					priceCents: quote.renewalCents,
					anchorDay,
					status: 'incomplete',
					customerProfileId: card.customerProfileId,
					paymentProfileId: card.paymentProfileId,
					savedCardId: card.id,
					promoCode: quote.promoCode,
					promoKind: quote.promoKind
				})
				.returning();
			await tx.update(subscription).set({ ref: sub.id }).where(eq(subscription.id, sub.id));
			sub.ref = sub.id;
			const [inv] = await tx
				.insert(subscriptionInvoice)
				.values({
					subscriptionId: sub.id,
					seq: 1,
					kind: 'first',
					plan,
					periodStart: now,
					periodEnd,
					listCents: quote.listCents,
					discountCents: quote.discountCents,
					amountCents: quote.amountCents,
					status: 'charging',
					invoiceNumber: await nextInvoiceNumber('subscription', tx),
					attempts: 1,
					lastAttemptAt: now
				})
				.returning();
			return { sub, inv };
		}));
	} catch (err) {
		if (err?.code === '23505' || err?.cause?.code === '23505') {
			return {
				ok: false,
				status: 409,
				error: 'A signup is already in progress. Give it a moment.'
			};
		}
		throw err;
	}

	// The charge.
	let outcome;
	if (quote.amountCents === 0) {
		outcome = { outcome: 'approved', transId: null, networkTransId: null, lastFour: card.lastFour };
	} else {
		outcome = await authnet.chargeProfile({
			customerProfileId: card.customerProfileId,
			paymentProfileId: card.paymentProfileId,
			amountCents: quote.amountCents,
			invoiceNumber: inv.invoiceNumber,
			description: `AGE Premium ${PLANS[plan].label.toLowerCase()} membership`,
			customerId: u.id,
			email: u.email,
			recurring: 'first'
		});
	}

	if (outcome.outcome === 'approved') {
		await finalizeFirstCharge({ sub, inv, user: u, card, quote, outcome });
		const [fresh] = await db
			.select()
			.from(subscription)
			.where(eq(subscription.id, sub.id))
			.limit(1);
		return { ok: true, subscription: fresh, amountCents: quote.amountCents };
	}
	if (outcome.outcome === 'unknown') {
		await db
			.update(subscriptionInvoice)
			.set({ status: 'unknown', lastError: outcome.message, updatedAt: new Date() })
			.where(eq(subscriptionInvoice.id, inv.id));
		return {
			ok: false,
			status: 202,
			pending: true,
			subscriptionId: sub.id,
			error: describeOutcome(outcome)
		};
	}
	// Declined or error: the signup is over; the member can try another card.
	await db.transaction(async (tx) => {
		await tx
			.update(subscriptionInvoice)
			.set({ status: 'failed', lastError: outcome.message || outcome.code, updatedAt: new Date() })
			.where(eq(subscriptionInvoice.id, inv.id));
		await tx
			.update(subscription)
			.set({
				status: 'ended',
				endedAt: new Date(),
				endReason: 'signup_failed',
				updatedAt: new Date()
			})
			.where(eq(subscription.id, sub.id));
	});
	return {
		ok: false,
		status: outcome.outcome === 'declined' ? 402 : 502,
		error: describeOutcome(outcome),
		code: outcome.code
	};
}

/** True when the user has any subscription rows (i.e. is on the new system). */
async function hasAnyRows(userId) {
	const [row] = await db
		.select({ id: subscription.id })
		.from(subscription)
		.where(eq(subscription.userId, userId))
		.limit(1);
	return !!row;
}

/** Signups that never heard back and are older than 30 minutes are over. */
export async function expireStaleIncompletes(userId = null, { olderThanMinutes = 30 } = {}) {
	const cutoff = new Date(Date.now() - olderThanMinutes * 60000);
	const rows = await db
		.select({ id: subscription.id, userId: subscription.userId })
		.from(subscription)
		.where(
			and(
				eq(subscription.status, 'incomplete'),
				sql`${subscription.createdAt} < ${cutoff.toISOString()}::timestamptz`,
				userId ? eq(subscription.userId, userId) : sql`true`
			)
		);
	for (const r of rows) {
		// Leave one whose invoice is still being looked into.
		const [inv] = await db
			.select({ status: subscriptionInvoice.status })
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.subscriptionId, r.id))
			.limit(1);
		if (inv && (inv.status === 'unknown' || inv.status === 'charging') && !userId) continue;
		await db.transaction(async (tx) => {
			await tx
				.update(subscriptionInvoice)
				.set({ status: 'void', updatedAt: new Date() })
				.where(
					and(
						eq(subscriptionInvoice.subscriptionId, r.id),
						inArray(subscriptionInvoice.status, ['open', 'charging', 'failed', 'unknown'])
					)
				);
			await tx
				.update(subscription)
				.set({
					status: 'ended',
					endedAt: new Date(),
					endReason: 'abandoned',
					updatedAt: new Date()
				})
				.where(and(eq(subscription.id, r.id), eq(subscription.status, 'incomplete')));
		});
	}
	return rows.length;
}

/**
 * Resolve the card a member is paying with: a saved one they own, or a
 * new token stored now.
 */
async function resolveCard(user, payment, { validation, source }) {
	if (payment?.savedCardId) {
		const card = await ownedCard(user.id, payment.savedCardId);
		if (card.status !== 'active' || isExpired(card)) {
			const err = new Error('That saved card has expired. Add a new card.');
			err.status = 400;
			throw err;
		}
		return { card };
	}
	if (payment?.opaqueData) {
		return addCardFromToken({
			user,
			opaqueData: payment.opaqueData,
			billTo: payment.billTo,
			expiry: payment.expiry || null,
			validation,
			source,
			makeDefault: !!payment.makeDefault
		});
	}
	const err = new Error('Choose a saved card or enter a new one.');
	err.status = 400;
	throw err;
}

/**
 * Record an approved first charge: invoice paid, membership active,
 * order + ledger, promo rows, access. Then the receipt.
 */
export async function finalizeFirstCharge({ sub, inv, user, card, quote, outcome }) {
	const now = new Date();
	await db.transaction(async (tx) => {
		const [fresh] = await tx
			.select()
			.from(subscription)
			.where(eq(subscription.id, sub.id))
			.for('update');
		if (fresh.status !== 'incomplete') return; // already finalized (reconciliation raced us)

		let orderId = null;
		if (outcome.transId) {
			const [ord] = await tx
				.insert(orderTable)
				.values({
					provider: 'authnet',
					providerRef: outcome.transId,
					userEmail: user.email,
					userId: user.id,
					kind: 'subscription_first',
					amount: (quote.amountCents / 100).toFixed(2),
					currency: 'USD',
					meta: {
						type:
							quote.promoKind === 'partner'
								? 'subscription_partner_first'
								: quote.promoKind === 'member_referral'
									? 'subscription_member_first'
									: 'subscription',
						subscriptionId: sub.ref,
						subscriptionType: sub.plan,
						promoCode: quote.promoCode,
						invoiceNumber: inv.invoiceNumber,
						cardLastFour: card.lastFour,
						cardType: card.cardType,
						description: `AGE Premium ${PLANS[sub.plan].label.toLowerCase()} membership`
					}
				})
				.returning({ id: orderTable.id });
			orderId = ord.id;
		}
		await tx
			.update(subscriptionInvoice)
			.set({
				status: 'paid',
				transId: outcome.transId,
				networkTransId: outcome.networkTransId || null,
				paidAt: now,
				orderId,
				lastError: null,
				updatedAt: now
			})
			.where(eq(subscriptionInvoice.id, inv.id));
		await tx
			.update(subscription)
			.set({
				status: 'active',
				startedAt: inv.periodStart,
				currentPeriodStart: inv.periodStart,
				currentPeriodEnd: inv.periodEnd,
				nextChargeAt: inv.periodEnd,
				networkTransId: outcome.networkTransId || null,
				flags: sql`array_append(${subscription.flags}, 'self_charged')`,
				updatedAt: now
			})
			.where(eq(subscription.id, sub.id));

		await recordPayment(
			{
				transId: outcome.transId || `member0:${sub.ref}`,
				kind: quote.promoKind ? 'sub_promo_first' : 'sub_first',
				amount: quote.amountCents / 100,
				listAmount: quote.listCents / 100,
				discountAmount: quote.discountCents / 100,
				discountKind: quote.promoKind,
				promoCode: quote.promoCode,
				userId: user.id,
				userEmail: user.email,
				subscriptionId: sub.ref,
				subscriptionType: sub.plan,
				payNum: 1,
				orderId,
				occurredAt: now,
				source: 'app',
				verifiedAt: now
			},
			{ tx }
		);

		if (quote.promoKind === 'partner' && quote.partner) {
			const [pr] = await tx
				.insert(partnerReferral)
				.values({
					partnerId: quote.partner.id,
					referredUserId: user.id,
					code: quote.promoCode,
					subscriptionType: sub.plan,
					discountAmount: PARTNER_DISCOUNT_AMOUNT.toFixed(2),
					commissionAmount: PARTNER_DISCOUNT_AMOUNT.toFixed(2),
					firstChargeOrderId: orderId,
					payoutStatus: 'pending',
					subscriptionId: sub.id
				})
				.returning({ id: partnerReferral.id });
			await tx
				.update(subscription)
				.set({ partnerReferralId: pr.id })
				.where(eq(subscription.id, sub.id));
		} else if (quote.promoKind === 'member_referral' && quote.referral) {
			const [mr] = await tx
				.insert(memberReferral)
				.values({
					referrerUserId: quote.referral.userId,
					referredUserId: user.id,
					code: quote.promoCode,
					subscriptionType: sub.plan,
					status: 'pending',
					subscriptionId: sub.id
				})
				.returning({ id: memberReferral.id });
			await tx
				.update(subscription)
				.set({ memberReferralId: mr.id })
				.where(eq(subscription.id, sub.id));
		}
		if (quote.promoCode) {
			await tx
				.update(userTable)
				.set({ usedPartnerCode: quote.promoCode })
				.where(eq(userTable.id, user.id));
		}
		await logMemberEvent(
			{
				userId: user.id,
				kind: 'subscribed',
				subscriptionId: sub.ref,
				subscriptionType: sub.plan,
				at: now,
				meta: {
					promo: quote.promoCode,
					amountCents: quote.amountCents,
					invoiceNumber: inv.invoiceNumber
				}
			},
			{ tx }
		);
		await applyAccess(user.id, { tx });
	});
	await bump(`user:${user.id}`, 'users', 'orders');

	await sendOnce('receipt', inv.id, user.id, () =>
		quote.amountCents > 0
			? sendMembershipReceipt(user.email, {
					plan: sub.plan,
					amountCents: quote.amountCents,
					listCents: quote.listCents,
					discountCents: quote.discountCents,
					promoCode: quote.promoCode,
					periodEnd: inv.periodEnd,
					invoiceNumber: inv.invoiceNumber,
					lastFour: card.lastFour,
					first: true
				})
			: sendMembershipWelcomeFree(user.email, { periodEnd: inv.periodEnd, plan: sub.plan })
	);
}

// ---------------------------------------------------------------- member actions

/** Cancel: an active membership runs to its period end; a past-due one ends now. */
export async function cancelSubscription({ user, actorId = null, reason = null }) {
	const sub = await liveSubscription(user.id);
	if (!sub) return { ok: false, status: 404, error: 'No membership to cancel.' };
	if (sub.status === 'cancelled')
		return {
			ok: false,
			status: 409,
			error: 'Your membership is already cancelled.',
			accessUntil: sub.currentPeriodEnd
		};
	const now = new Date();
	const endsNow = sub.status === 'past_due';
	await db.transaction(async (tx) => {
		if (endsNow) {
			await tx
				.update(subscription)
				.set({
					status: 'ended',
					cancelledAt: now,
					endedAt: now,
					endReason: 'cancelled',
					nextChargeAt: null,
					nextAttemptAt: null,
					pendingPlan: null,
					pendingPriceCents: null,
					leaseUntil: null,
					updatedAt: now
				})
				.where(eq(subscription.id, sub.id));
			await tx
				.update(subscriptionInvoice)
				.set({ status: 'void', updatedAt: now })
				.where(
					and(
						eq(subscriptionInvoice.subscriptionId, sub.id),
						inArray(subscriptionInvoice.status, ['open', 'failed'])
					)
				);
		} else {
			await tx
				.update(subscription)
				.set({
					status: 'cancelled',
					cancelledAt: now,
					nextChargeAt: null,
					pendingPlan: null,
					pendingPriceCents: null,
					updatedAt: now
				})
				.where(eq(subscription.id, sub.id));
		}
		await logMemberEvent(
			{
				userId: user.id,
				kind: 'cancelled',
				subscriptionId: sub.ref,
				subscriptionType: sub.plan,
				reason,
				actorId,
				at: now,
				meta: { accessUntil: endsNow ? now : sub.currentPeriodEnd }
			},
			{ tx }
		);
		await applyAccess(user.id, { tx });
	});
	await bump(`user:${user.id}`, 'users');
	const [u] = await db
		.select({ email: userTable.email })
		.from(userTable)
		.where(eq(userTable.id, user.id))
		.limit(1);
	if (u?.email && !endsNow) {
		await sendOnce('cancelled', `${sub.id}:${now.toISOString().slice(0, 10)}`, user.id, () =>
			sendCancelledEmail(u.email, { accessUntil: sub.currentPeriodEnd })
		);
	}
	return { ok: true, accessUntil: endsNow ? now : sub.currentPeriodEnd, endedNow: endsNow };
}

/** Resume a cancelled membership before its period ends. */
export async function resumeSubscription({ user }) {
	const sub = await liveSubscription(user.id);
	if (!sub || sub.status !== 'cancelled')
		return { ok: false, status: 409, error: 'There is no cancelled membership to resume.' };
	const now = new Date();
	if (!sub.currentPeriodEnd || now >= new Date(sub.currentPeriodEnd)) {
		return {
			ok: false,
			status: 409,
			error: 'This membership has already ended. Start a new one from the Premium page.'
		};
	}
	const card = await currentCard(sub);
	if (!card || !publicCard(card).usable) {
		return {
			ok: false,
			status: 409,
			error: 'Add a valid card first, then resume.',
			needsCard: true
		};
	}
	await db.transaction(async (tx) => {
		await tx
			.update(subscription)
			.set({
				status: 'active',
				cancelledAt: null,
				nextChargeAt: sub.currentPeriodEnd,
				updatedAt: now
			})
			.where(and(eq(subscription.id, sub.id), eq(subscription.status, 'cancelled')));
		await logMemberEvent(
			{
				userId: user.id,
				kind: 'resumed',
				subscriptionId: sub.ref,
				subscriptionType: sub.plan,
				at: now
			},
			{ tx }
		);
		await applyAccess(user.id, { tx });
	});
	await bump(`user:${user.id}`, 'users');
	const [u] = await db
		.select({ email: userTable.email })
		.from(userTable)
		.where(eq(userTable.id, user.id))
		.limit(1);
	if (u?.email) {
		await sendOnce('resumed', `${sub.id}:${now.toISOString()}`, user.id, () =>
			sendResumedEmail(u.email, { nextChargeAt: sub.currentPeriodEnd, amountCents: sub.priceCents })
		);
	}
	return { ok: true, nextChargeAt: sub.currentPeriodEnd };
}

/** Schedule a plan change for the next renewal (list price; no proration). */
export async function switchPlan({ user, plan }) {
	if (!isPlan(plan)) return { ok: false, status: 400, error: 'Choose a monthly or annual plan.' };
	const sub = await liveSubscription(user.id);
	if (!sub || sub.status !== 'active')
		return { ok: false, status: 409, error: 'Plan changes need an active membership.' };
	const now = new Date();
	if (plan === sub.plan) {
		await db
			.update(subscription)
			.set({ pendingPlan: null, pendingPriceCents: null, updatedAt: now })
			.where(eq(subscription.id, sub.id));
		return { ok: true, cleared: true };
	}
	const price = listPriceCents(plan);
	await db.transaction(async (tx) => {
		await tx
			.update(subscription)
			.set({ pendingPlan: plan, pendingPriceCents: price, updatedAt: now })
			.where(eq(subscription.id, sub.id));
		await logMemberEvent(
			{
				userId: user.id,
				kind: 'plan_switched',
				subscriptionId: sub.ref,
				subscriptionType: sub.plan,
				at: now,
				meta: { to: plan, effectiveAt: sub.currentPeriodEnd, priceCents: price }
			},
			{ tx }
		);
	});
	const [u] = await db
		.select({ email: userTable.email })
		.from(userTable)
		.where(eq(userTable.id, user.id))
		.limit(1);
	if (u?.email) {
		await sendOnce('plan_switch', `${sub.id}:${plan}:${now.toISOString()}`, user.id, () =>
			sendPlanSwitchedEmail(u.email, {
				fromPlan: sub.plan,
				toPlan: plan,
				effectiveAt: sub.currentPeriodEnd,
				newAmountCents: price
			})
		);
	}
	return { ok: true, effectiveAt: sub.currentPeriodEnd, priceCents: price };
}

export async function cancelPlanSwitch({ user }) {
	const sub = await liveSubscription(user.id);
	if (!sub) return { ok: false, status: 404, error: 'No membership found.' };
	await db
		.update(subscription)
		.set({ pendingPlan: null, pendingPriceCents: null, updatedAt: new Date() })
		.where(eq(subscription.id, sub.id));
	return { ok: true };
}

/**
 * Point the membership at a different card: one already saved, or a new
 * token. A past-due membership is charged right away.
 */
export async function setSubscriptionCard({ user, payment, chargeNow }) {
	const sub = await liveSubscription(user.id);
	if (!sub) return { ok: false, status: 404, error: 'No membership found.' };
	const [u] = await db.select().from(userTable).where(eq(userTable.id, user.id)).limit(1);
	let card;
	try {
		card = await resolveCard(u, payment, { validation: 'liveMode', source: 'account' });
	} catch (err) {
		return { ok: false, status: err.status || 502, error: err.message };
	}
	if (card.retoken)
		return { ok: false, status: 409, error: 'retoken', retoken: true, cardId: card.card.id };
	card = card.card;
	await db.transaction(async (tx) => {
		await tx
			.update(subscription)
			.set({
				customerProfileId: card.customerProfileId,
				paymentProfileId: card.paymentProfileId,
				savedCardId: card.id,
				updatedAt: new Date()
			})
			.where(eq(subscription.id, sub.id));
		await logMemberEvent(
			{
				userId: user.id,
				kind: 'card_updated',
				subscriptionId: sub.ref,
				subscriptionType: sub.plan,
				meta: { cardId: card.id, lastFour: card.lastFour }
			},
			{ tx }
		);
	});
	await bump(`user:${user.id}`);
	if (sub.status === 'past_due' || chargeNow) {
		const { chargeSubscriptionNow } = await import('./renewals.js');
		const result = await chargeSubscriptionNow(sub.id, { reason: 'card_updated' });
		return {
			ok: result.ok,
			status: result.ok ? 200 : 402,
			error: result.ok ? undefined : result.message,
			charged: result.ok,
			card: publicCard(card)
		};
	}
	return { ok: true, card: publicCard(card) };
}

/** The saved_card row a membership charges. */
export async function currentCard(sub, tx = db) {
	if (sub.savedCardId) {
		const [c] = await tx.select().from(savedCard).where(eq(savedCard.id, sub.savedCardId)).limit(1);
		if (c) return c;
	}
	if (sub.paymentProfileId) {
		const [c] = await tx
			.select()
			.from(savedCard)
			.where(
				and(
					eq(savedCard.userId, sub.userId),
					eq(savedCard.paymentProfileId, sub.paymentProfileId),
					ne(savedCard.status, 'deleted')
				)
			)
			.limit(1);
		if (c) return c;
	}
	return null;
}

// ---------------------------------------------------------------- admin

export async function adminEndNow({ subscriptionId, actorId, reason = 'admin' }) {
	const [sub] = await db
		.select()
		.from(subscription)
		.where(eq(subscription.id, subscriptionId))
		.limit(1);
	if (!sub || sub.status === 'ended') return { ok: false, error: 'Already ended.' };
	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.update(subscription)
			.set({
				status: 'ended',
				endedAt: now,
				endReason: reason,
				nextChargeAt: null,
				nextAttemptAt: null,
				leaseUntil: null,
				updatedAt: now
			})
			.where(eq(subscription.id, sub.id));
		await tx
			.update(subscriptionInvoice)
			.set({ status: 'void', updatedAt: now })
			.where(
				and(
					eq(subscriptionInvoice.subscriptionId, sub.id),
					inArray(subscriptionInvoice.status, ['open', 'failed'])
				)
			);
		await logMemberEvent(
			{
				userId: sub.userId,
				kind: 'ended',
				subscriptionId: sub.ref,
				subscriptionType: sub.plan,
				reason,
				actorId,
				at: now
			},
			{ tx }
		);
		await applyAccess(sub.userId, { tx });
	});
	await bump(`user:${sub.userId}`, 'users');
	return { ok: true };
}

/** Push the period end (and next charge) out by `days`. */
export async function adminExtend({ subscriptionId, actorId, days }) {
	const [sub] = await db
		.select()
		.from(subscription)
		.where(eq(subscription.id, subscriptionId))
		.limit(1);
	if (!sub || !['active', 'cancelled', 'past_due'].includes(sub.status))
		return { ok: false, error: 'Only a live membership can be extended.' };
	const d = Number(days);
	if (!d || d < 1 || d > 366) return { ok: false, error: 'Days must be between 1 and 366.' };
	const now = new Date();
	const end = new Date(new Date(sub.currentPeriodEnd || now).getTime() + d * 86400000);
	await db.transaction(async (tx) => {
		await tx
			.update(subscription)
			.set({
				currentPeriodEnd: end,
				nextChargeAt: sub.status === 'active' ? end : sub.nextChargeAt,
				graceUntil: sub.status === 'past_due' ? end : sub.graceUntil,
				updatedAt: now
			})
			.where(eq(subscription.id, sub.id));
		await logMemberEvent(
			{
				userId: sub.userId,
				kind: 'comped',
				subscriptionId: sub.ref,
				subscriptionType: sub.plan,
				reason: `extended ${d} days`,
				actorId,
				at: now,
				meta: { days: d, newEnd: end }
			},
			{ tx }
		);
		await applyAccess(sub.userId, { tx });
	});
	await bump(`user:${sub.userId}`, 'users');
	return { ok: true, end };
}

export async function adminHold({ subscriptionId, hold, actorId }) {
	const [sub] = await db
		.update(subscription)
		.set({ hold: !!hold, updatedAt: new Date() })
		.where(eq(subscription.id, subscriptionId))
		.returning();
	if (!sub) return { ok: false, error: 'Not found.' };
	await logMemberEvent({
		userId: sub.userId,
		kind: hold ? 'comped' : 'resumed',
		subscriptionId: sub.ref,
		subscriptionType: sub.plan,
		reason: hold ? 'billing held' : 'billing hold lifted',
		actorId
	});
	return { ok: true };
}

/** End a user's membership when their account is deleted. */
export async function endForDeletedUser(userId, tx = db) {
	const now = new Date();
	await tx
		.update(subscription)
		.set({
			status: 'ended',
			endedAt: now,
			endReason: 'account_deleted',
			nextChargeAt: null,
			nextAttemptAt: null,
			updatedAt: now
		})
		.where(and(eq(subscription.userId, userId), ne(subscription.status, 'ended')));
}

// ---------------------------------------------------------------- reads

/**
 * Everything the member's Membership page needs.
 */
export async function membershipFor(userId) {
	const [u] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
	if (!u) return null;
	const subs = await db
		.select()
		.from(subscription)
		.where(eq(subscription.userId, userId))
		.orderBy(desc(subscription.createdAt));
	const live = subs.find((s) => ['active', 'past_due', 'cancelled'].includes(s.status)) || null;
	const latest = live || subs.find((s) => s.status === 'ended') || null;
	const invoices = latest
		? await db
				.select()
				.from(subscriptionInvoice)
				.where(eq(subscriptionInvoice.subscriptionId, latest.id))
				.orderBy(desc(subscriptionInvoice.periodStart))
		: [];
	const card = live ? await currentCard(live) : null;
	const cards = await listCards(userId);
	const legacy =
		!live &&
		!!u.subscriptionId &&
		['active', 'payment_failed', 'cancelled'].includes(u.subscriptionStatus || '') &&
		subs.length === 0;
	return {
		user: u,
		subscription: live,
		latest,
		access: live ? membershipGrantsAccess(live) : u.role === 'premium' || u.role === 'admin',
		invoices,
		card: card ? publicCard(card) : null,
		cards: cards.map(publicCard),
		comp: !live && u.role === 'premium' && !!u.compReason,
		legacy,
		plans: PLANS
	};
}
