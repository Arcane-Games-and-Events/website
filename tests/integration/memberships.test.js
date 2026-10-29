/**
 * The membership lifecycle against a real database and the fake gateway:
 * signup, renewal, failed payments, cancel and resume, refunds, and
 * charges whose outcome never came back.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { order, payment, subscription, subscriptionInvoice, user } from '$lib/server/db/schema.js';
import {
	cancelSubscription,
	resumeSubscription,
	startSubscription,
	switchPlan
} from '$lib/server/billing/subscriptions.js';
import {
	chargeDueSubscriptions,
	chargeRenewal,
	endDueSubscriptions
} from '$lib/server/billing/renewals.js';
import { reconcileAll } from '$lib/server/billing/reconcile.js';
import { refundTransaction } from '$lib/server/payments/refunds.js';
import { installFakeAuthnet } from '../support/fake-authnet.js';
import { createSavedCard, createUser } from '../support/factories.js';

let gw;
let member;
let card;

beforeEach(async () => {
	gw = installFakeAuthnet();
	member = await createUser({ customerProfileId: 'cp-member' });
	card = await createSavedCard(member, {
		customerProfileId: 'cp-member',
		paymentProfileId: 'pp-1'
	});
	gw.addCard('cp-member', 'pp-1');
});

const reload = async (table, id) => (await db.select().from(table).where(eq(table.id, id)))[0];
const join = (plan = 'monthly', promoCode = null) =>
	startSubscription({
		user: member,
		plan,
		promoCode,
		payment: { savedCardId: card.id },
		consent: true
	});
/** Make a membership due now. */
const dueNow = (id) =>
	db
		.update(subscription)
		.set({
			nextChargeAt: new Date(Date.now() - 60000),
			currentPeriodEnd: new Date(Date.now() - 60000)
		})
		.where(eq(subscription.id, id));

describe('signup', () => {
	test('charges the first period and makes the member premium', async () => {
		const r = await join();
		expect(r.ok).toBe(true);
		expect(r.subscription.status).toBe('active');
		expect(r.subscription.priceCents).toBe(1000);

		const u = await reload(user, member.id);
		expect(u.role).toBe('premium');
		expect(u.subscriptionStatus).toBe('active');
		expect(u.subscriptionId).toBe(r.subscription.ref);

		const [inv] = await db
			.select()
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.subscriptionId, r.subscription.id));
		expect(inv.status).toBe('paid');
		expect(inv.invoiceNumber).toMatch(/^AGE-S\d+$/);
		expect(gw.charges()[0].opts.amountCents).toBe(1000);
		expect(gw.charges()[0].opts.recurring).toBe('first');

		const [pay] = await db.select().from(payment).where(eq(payment.transId, inv.transId));
		expect(pay.kind).toBe('sub_first');
		const [ord] = await db.select().from(order).where(eq(order.providerRef, inv.transId));
		expect(ord.kind).toBe('subscription_first');
	});

	test('requires consent to auto-renewal', async () => {
		const r = await startSubscription({
			user: member,
			plan: 'monthly',
			payment: { savedCardId: card.id },
			consent: false
		});
		expect(r.ok).toBe(false);
		expect(gw.charges()).toHaveLength(0);
	});

	test('a second signup is refused', async () => {
		await join();
		const r = await join();
		expect(r.ok).toBe(false);
		expect(r.status).toBe(409);
		expect(gw.charges()).toHaveLength(1);
	});

	test('a declined first charge leaves the member free', async () => {
		gw.next('declined');
		const r = await join();
		expect(r.ok).toBe(false);
		expect(r.status).toBe(402);
		expect((await reload(user, member.id)).role).toBe('free');
		// and they can try again
		expect((await join()).ok).toBe(true);
	});
});

describe('renewals', () => {
	test('a due renewal is charged once and the period moves on', async () => {
		const { subscription: sub } = await join();
		await dueNow(sub.id);
		const out = await chargeDueSubscriptions({ now: new Date() });
		expect(out.paid).toBe(1);
		const again = await chargeDueSubscriptions({ now: new Date() });
		expect(again.attempted).toBe(0);
		const fresh = await reload(subscription, sub.id);
		expect(new Date(fresh.nextChargeAt) > new Date()).toBe(true);
		expect(gw.charges()).toHaveLength(2);
		expect(gw.charges()[1].opts.recurring).toBe('subsequent');
	});

	test('nothing is charged before it is due', async () => {
		const { subscription: sub } = await join();
		const r = await chargeRenewal(await reload(subscription, sub.id), {});
		expect(r.result).toBe('skipped');
		expect(gw.charges()).toHaveLength(1);
	});

	test('a plan switch applies at the next renewal, at list price', async () => {
		const { subscription: sub } = await join();
		await switchPlan({ user: member, plan: 'yearly' });
		await dueNow(sub.id);
		await chargeRenewal(await reload(subscription, sub.id), {});
		const fresh = await reload(subscription, sub.id);
		expect(fresh.plan).toBe('yearly');
		expect(fresh.priceCents).toBe(11000);
		expect(gw.charges()[1].opts.amountCents).toBe(11000);
	});

	test('failed renewals retry, keep access through grace, then end', async () => {
		const { subscription: sub } = await join();
		await dueNow(sub.id);
		gw.next('declined', 'declined', 'declined', 'declined');

		await chargeRenewal(await reload(subscription, sub.id), {});
		let s = await reload(subscription, sub.id);
		expect(s.status).toBe('past_due');
		expect(s.failedAttempts).toBe(1);
		let u = await reload(user, member.id);
		expect(u.role).toBe('premium');
		expect(u.subscriptionStatus).toBe('payment_failed');

		for (let i = 2; i <= 4; i++) {
			await db
				.update(subscription)
				.set({ nextAttemptAt: new Date(Date.now() - 1000) })
				.where(eq(subscription.id, sub.id));
			await chargeRenewal(await reload(subscription, sub.id), {});
		}
		s = await reload(subscription, sub.id);
		expect(s.failedAttempts).toBe(4);
		expect(s.nextAttemptAt).toBeNull();

		await db
			.update(subscription)
			.set({ graceUntil: new Date(Date.now() - 1000) })
			.where(eq(subscription.id, sub.id));
		await endDueSubscriptions(new Date());
		s = await reload(subscription, sub.id);
		expect(s.status).toBe('ended');
		expect(s.endReason).toBe('payment_failed');
		u = await reload(user, member.id);
		expect(u.role).toBe('free');
		expect(u.subscriptionId).toBeNull();
	});

	test('a retry that succeeds restores the membership', async () => {
		const { subscription: sub } = await join();
		await dueNow(sub.id);
		gw.next('declined');
		await chargeRenewal(await reload(subscription, sub.id), {});
		await db
			.update(subscription)
			.set({ nextAttemptAt: new Date(Date.now() - 1000) })
			.where(eq(subscription.id, sub.id));
		await chargeRenewal(await reload(subscription, sub.id), {});
		const s = await reload(subscription, sub.id);
		expect(s.status).toBe('active');
		expect(s.failedAttempts).toBe(0);
		expect((await reload(user, member.id)).subscriptionStatus).toBe('active');
	});
});

describe('cancel and resume', () => {
	test('cancelling stops charges but keeps access to the period end', async () => {
		const { subscription: sub } = await join();
		await cancelSubscription({ user: member });
		let s = await reload(subscription, sub.id);
		expect(s.status).toBe('cancelled');
		expect(s.nextChargeAt).toBeNull();
		const u = await reload(user, member.id);
		expect(u.role).toBe('premium');
		expect(u.subscriptionStatus).toBe('cancelled');

		// Even when the period ends, a cancelled membership is never charged.
		await dueNow(sub.id);
		expect((await chargeDueSubscriptions({ now: new Date() })).attempted).toBe(0);
		await endDueSubscriptions(new Date());
		s = await reload(subscription, sub.id);
		expect(s.status).toBe('ended');
		expect((await reload(user, member.id)).role).toBe('free');
		expect(gw.charges()).toHaveLength(1);
	});

	test('resuming before the period ends brings renewals back', async () => {
		const { subscription: sub } = await join();
		await cancelSubscription({ user: member });
		const r = await resumeSubscription({ user: member });
		expect(r.ok).toBe(true);
		const s = await reload(subscription, sub.id);
		expect(s.status).toBe('active');
		expect(s.nextChargeAt).toEqual(s.currentPeriodEnd);
	});

	test('cancelling while past due ends the membership now', async () => {
		const { subscription: sub } = await join();
		await dueNow(sub.id);
		gw.next('declined');
		await chargeRenewal(await reload(subscription, sub.id), {});
		const r = await cancelSubscription({ user: member });
		expect(r.endedNow).toBe(true);
		expect((await reload(subscription, sub.id)).status).toBe('ended');
		expect((await reload(user, member.id)).role).toBe('free');
	});
});

describe('refunds of membership charges', () => {
	test('an unsettled first charge is voided and can end the membership', async () => {
		const { subscription: sub } = await join();
		const [inv] = await db
			.select()
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.subscriptionId, sub.id));
		const r = await refundTransaction({
			transId: inv.transId,
			amountCents: 1000,
			subscriptionEffect: 'end_now'
		});
		expect(r.ok).toBe(true);
		expect(r.method).toBe('void');
		expect((await reload(subscription, sub.id)).status).toBe('ended');
		expect((await reload(subscriptionInvoice, inv.id)).status).toBe('refunded');
		const [pay] = await db.select().from(payment).where(eq(payment.transId, inv.transId));
		expect(Number(pay.refundedAmount)).toBe(10);
		expect((await reload(user, member.id)).role).toBe('free');
	});

	test('a settled charge is refunded with the real last four, partially, never beyond the total', async () => {
		const { subscription: sub } = await join();
		const [inv] = await db
			.select()
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.subscriptionId, sub.id));
		gw.settle(inv.transId);
		expect((await refundTransaction({ transId: inv.transId, amountCents: 400 })).method).toBe(
			'refund'
		);
		expect((await refundTransaction({ transId: inv.transId, amountCents: 600 })).ok).toBe(true);
		const third = await refundTransaction({ transId: inv.transId, amountCents: 100 });
		expect(third.ok).toBe(false);
		expect(gw.calls.find((c) => c.method === 'refundTransaction').lastFour).toBe('1111');
		// Keep is the default: the membership carries on.
		expect((await reload(subscription, sub.id)).status).toBe('active');
	});
});

describe('unknown outcomes', () => {
	test('a timed-out signup that never charged ends as failed, without a retry', async () => {
		gw.next('timeout');
		const r = await join();
		expect(r.pending).toBe(true);
		await db
			.update(subscriptionInvoice)
			.set({
				lastAttemptAt: new Date(Date.now() - 31 * 60000),
				updatedAt: new Date(Date.now() - 31 * 60000)
			})
			.where(eq(subscriptionInvoice.subscriptionId, r.subscriptionId));
		await reconcileAll({ now: new Date() });
		expect((await reload(subscription, r.subscriptionId)).status).toBe('ended');
		expect(gw.charges()).toHaveLength(1);
	});

	test('a timed-out signup that did charge is found by invoice number and activated', async () => {
		gw.next('charged_but_timeout');
		const r = await join();
		expect(r.pending).toBe(true);
		await db
			.update(subscriptionInvoice)
			.set({
				lastAttemptAt: new Date(Date.now() - 11 * 60000),
				updatedAt: new Date(Date.now() - 11 * 60000)
			})
			.where(eq(subscriptionInvoice.subscriptionId, r.subscriptionId));
		await reconcileAll({ now: new Date() });
		expect((await reload(subscription, r.subscriptionId)).status).toBe('active');
		expect((await reload(user, member.id)).role).toBe('premium');
		expect(gw.charges()).toHaveLength(1);
	});
});
