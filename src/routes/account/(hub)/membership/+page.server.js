import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { auth, forgetSession } from '$lib/server/lucia.js';
import { acceptConfig } from '$lib/server/payments/accept-config.js';
import { expiryFromInput } from '$lib/server/payments/cards.js';
import {
	cancelPlanSwitch,
	cancelSubscription,
	membershipFor,
	resumeSubscription,
	setSubscriptionCard,
	switchPlan
} from '$lib/server/billing/subscriptions.js';
import { cancelLegacyMembership } from '$lib/server/billing/legacy.js';
import { chargeSubscriptionNow } from '$lib/server/billing/renewals.js';
import { liveSubscription } from '$lib/server/billing/access.js';

export async function load({ locals }) {
	const m = await membershipFor(locals.user.id);
	const sub = m.subscription;
	return {
		membership: sub
			? {
					id: sub.id,
					status: sub.status,
					plan: sub.plan,
					priceCents: sub.priceCents,
					currentPeriodStart: sub.currentPeriodStart,
					currentPeriodEnd: sub.currentPeriodEnd,
					nextChargeAt: sub.nextChargeAt,
					cancelledAt: sub.cancelledAt,
					graceUntil: sub.graceUntil,
					nextAttemptAt: sub.nextAttemptAt,
					failedAttempts: sub.failedAttempts,
					pendingPlan: sub.pendingPlan,
					pendingPriceCents: sub.pendingPriceCents,
					startedAt: sub.startedAt,
					legacyArbId: sub.legacyArbId,
					flags: sub.flags
				}
			: null,
		latest:
			m.latest && !sub
				? {
						status: m.latest.status,
						endedAt: m.latest.endedAt,
						endReason: m.latest.endReason,
						plan: m.latest.plan
					}
				: null,
		invoices: m.invoices.map((i) => ({
			id: i.id,
			seq: i.seq,
			kind: i.kind,
			plan: i.plan,
			periodStart: i.periodStart,
			periodEnd: i.periodEnd,
			amountCents: i.amountCents,
			discountCents: i.discountCents,
			refundedCents: i.refundedCents,
			status: i.status,
			paidAt: i.paidAt,
			invoiceNumber: i.invoiceNumber,
			orderId: i.orderId
		})),
		card: m.card,
		cards: m.cards,
		comp: m.comp,
		compReason: m.user.compReason,
		legacy: m.legacy,
		legacyUser: m.legacy
			? {
					status: m.user.subscriptionStatus,
					plan: m.user.subscriptionType,
					nextBillingDate: m.user.nextBillingDate,
					endDate: m.user.subscriptionEndDate,
					startDate: m.user.subscriptionStartDate
				}
			: null,
		plans: Object.values(m.plans).map((p) => ({
			key: p.key,
			label: p.label,
			priceCents: p.priceCents,
			noun: p.noun
		})),
		accept: acceptConfig()
	};
}

/** Give the browser a session that reflects a changed role. */
async function refreshSession(locals, cookies) {
	if (!locals.session) return;
	await auth.invalidateSession(locals.session.id);
	await forgetSession(locals.session.id);
	const session = await auth.createSession(locals.user.id, {});
	const c = auth.createSessionCookie(session.id);
	cookies.set(c.name, c.value, { ...c.attributes, path: '/' });
}

export const actions = {
	cancel: async ({ locals, cookies, request }) => {
		const form = await request.formData();
		const reason = form.get('reason')?.toString().slice(0, 300) || null;
		let r;
		if (await liveSubscription(locals.user.id)) {
			r = await cancelSubscription({ user: locals.user, reason });
		} else {
			const [u] = await db
				.select()
				.from(userTable)
				.where(eq(userTable.id, locals.user.id))
				.limit(1);
			if (!u?.subscriptionId || u.subscriptionStatus === 'cancelled')
				return fail(400, { error: 'There is no membership to cancel.' });
			r = await cancelLegacyMembership(u);
			if (!r.ok) return fail(502, { error: r.error });
		}
		if (!r.ok) return fail(r.status || 400, { error: r.error });
		await refreshSession(locals, cookies);
		return {
			success: true,
			message: r.endedNow
				? 'Your membership has ended. Nothing more will be charged.'
				: `Your membership is cancelled. Nothing more will be charged, and your access continues until ${fmt(r.accessUntil)}.`
		};
	},

	resume: async ({ locals, cookies }) => {
		const r = await resumeSubscription({ user: locals.user });
		if (!r.ok) return fail(r.status || 400, { error: r.error, needsCard: r.needsCard });
		await refreshSession(locals, cookies);
		return { success: true, message: `Welcome back. Your next renewal is ${fmt(r.nextChargeAt)}.` };
	},

	switchPlan: async ({ locals, request }) => {
		const form = await request.formData();
		const r = await switchPlan({ user: locals.user, plan: form.get('plan')?.toString() });
		if (!r.ok) return fail(r.status || 400, { error: r.error });
		return {
			success: true,
			message: r.cleared
				? 'Plan change cancelled.'
				: `Done. Your plan changes on ${fmt(r.effectiveAt)}, when the new price takes effect.`
		};
	},

	cancelSwitch: async ({ locals }) => {
		const r = await cancelPlanSwitch({ user: locals.user });
		if (!r.ok) return fail(400, { error: r.error });
		return { success: true, message: "Plan change cancelled. You'll stay on your current plan." };
	},

	/** Use a saved card, or a card tokenized in the browser. */
	setCard: async ({ locals, request, cookies }) => {
		const form = await request.formData();
		const payment = paymentFrom(form);
		if (!payment) return fail(400, { error: 'Choose a saved card or enter a new one.' });
		const r = await setSubscriptionCard({
			user: locals.user,
			payment,
			chargeNow: form.get('chargeNow') === '1'
		});
		if (!r.ok)
			return fail(r.status || 400, {
				error: r.retoken
					? 'This card is already saved with an older expiry. Update it under Payment methods first.'
					: r.error
			});
		if (r.charged !== undefined) await refreshSession(locals, cookies);
		return {
			success: true,
			message: r.charged
				? 'Card updated and your renewal went through. Thank you.'
				: r.charged === false
					? `Card saved, but the charge didn't go through: ${r.error || 'declined'}.`
					: 'Card updated. Future renewals will use it.'
		};
	},

	retry: async ({ locals, cookies }) => {
		const sub = await liveSubscription(locals.user.id);
		if (!sub || sub.status !== 'past_due') return fail(400, { error: 'Nothing to retry.' });
		const r = await chargeSubscriptionNow(sub.id, { reason: 'member_retry' });
		if (!r.ok) return fail(402, { error: r.message });
		await refreshSession(locals, cookies);
		return { success: true, message: 'Your payment went through. Thank you.' };
	}
};

function paymentFrom(form) {
	const savedCardId = form.get('savedCardId')?.toString();
	if (savedCardId) return { savedCardId };
	const dataValue = form.get('dataValue')?.toString();
	const dataDescriptor = form.get('dataDescriptor')?.toString();
	if (!dataValue || !dataDescriptor) return null;
	return {
		opaqueData: { dataDescriptor, dataValue },
		expiry: expiryFromInput(form.get('expMonth'), form.get('expYear')),
		lastFour: form.get('lastFour')?.toString() || null,
		billTo: {
			firstName: form.get('firstName')?.toString(),
			lastName: form.get('lastName')?.toString(),
			zip: form.get('zip')?.toString()
		},
		makeDefault: form.get('makeDefault') === '1'
	};
}

const fmt = (d) =>
	d
		? new Date(d).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
				timeZone: 'UTC'
			})
		: '—';
