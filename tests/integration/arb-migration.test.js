/**
 * Moving members off Authorize.net ARB, against a real database and the
 * fake gateway: the scan, admin decisions, the move itself, and what
 * happens when the gateway misbehaves in the middle of it.
 *
 * The rules under test: a scan changes nothing; a member is never left
 * with no billing and never billed twice; the ARB is cancelled only after
 * the new membership is saved.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	legacyArb,
	payment,
	savedCard,
	subscription,
	subscriptionInvoice,
	user
} from '$lib/server/db/schema.js';
import { authnet } from '$lib/server/authnet/client.js';
import {
	cancelArb,
	completeLegacyMigration,
	decideArb,
	migrateArb,
	nextBillingDate,
	scanArbs,
	scanOne,
	unexpectedActiveArbs
} from '$lib/server/billing/migrate-arb.js';
import { chargeDueSubscriptions } from '$lib/server/billing/renewals.js';
import { startSubscription } from '$lib/server/billing/subscriptions.js';
import { addMonthsAnchored } from '$lib/server/billing/dates.js';
import { installFakeAuthnet } from '../support/fake-authnet.js';
import { createAdmin, createSavedCard, createUser, daysFromNow } from '../support/factories.js';

let gw;
let admin;
let arbSeq = 5000000;
let txSeq = 70000000000;

beforeEach(async () => {
	gw = installFakeAuthnet();
	admin = await createAdmin();
});

const day = (d) => d.toISOString().slice(0, 10);

/**
 * An ARB as `authnet.arbGet` returns it. By default: monthly at $10,
 * started 40 days ago, two approved payments (so it next charges in about
 * three weeks), with a card profile the fake gateway knows.
 */
function addArb({
	payments = 2,
	declineNext = false,
	startDaysAgo = 40,
	months = 1,
	cardProfile = true,
	...overrides
} = {}) {
	const id = String(++arbSeq);
	const start = new Date(day(daysFromNow(-startDaysAgo)) + 'T00:00:00Z');
	const transactions = [];
	for (let i = 1; i <= payments; i++) {
		transactions.push({
			transId: String(++txSeq),
			response: 'Approved',
			approved: true,
			submittedAt: addMonthsAnchored(start, (i - 1) * months, start.getUTCDate()),
			payNum: i,
			attemptNum: 1
		});
	}
	if (declineNext) {
		transactions.push({
			transId: String(++txSeq),
			response: 'Declined',
			approved: false,
			submittedAt: daysFromNow(-1),
			payNum: payments + 1,
			attemptNum: 1
		});
	}
	const cp = `cp-arb-${id}`;
	const pp = `pp-arb-${id}`;
	if (cardProfile) gw.addCard(cp, pp, { lastFour: '4242' });
	gw.addArb({
		id,
		name: 'AGE Premium',
		status: 'active',
		amountCents: months === 12 ? 11000 : 1000,
		interval: { length: months, unit: 'months' },
		startDate: day(start),
		totalOccurrences: 9999,
		customerProfileId: cardProfile ? cp : null,
		paymentProfileId: cardProfile ? pp : null,
		email: null,
		card: { lastFour: '4242', type: 'Visa', expiration: 'XXXX' },
		transactions,
		raw: {},
		...overrides
	});
	return gw.arbs.get(id);
}

/** A member paying through the given ARB, as the old system recorded them. */
const memberOn = (arb, overrides = {}) =>
	createUser({
		role: 'premium',
		subscriptionId: arb.id,
		subscriptionType: arb.interval.length === 12 ? 'yearly' : 'monthly',
		subscriptionStatus: 'active',
		subscriptionStartDate: new Date(arb.startDate),
		...overrides
	});

const row = async (arbId) =>
	(await db.select().from(legacyArb).where(eq(legacyArb.arbId, arbId)))[0];
const subFor = async (arbId) =>
	(await db.select().from(subscription).where(eq(subscription.legacyArbId, arbId)))[0];
const reloadUser = async (id) => (await db.select().from(user).where(eq(user.id, id)))[0];
const invoicesOf = (subId) =>
	db
		.select()
		.from(subscriptionInvoice)
		.where(eq(subscriptionInvoice.subscriptionId, subId))
		.orderBy(subscriptionInvoice.seq);
const arbCancels = () => gw.calls.filter((c) => c.method === 'arbCancel');
const approveAndMigrate = async (arbId) => {
	await decideArb(arbId, 'approve', { actorId: admin.id });
	return migrateArb(arbId, { actorId: admin.id });
};
/** Make a migrated membership due for renewal now. */
const dueNow = (subId) =>
	db
		.update(subscription)
		.set({
			nextChargeAt: new Date(Date.now() - 60000),
			currentPeriodEnd: new Date(Date.now() - 60000)
		})
		.where(eq(subscription.id, subId));

describe('the scan', () => {
	test('files a normal paying member as ready to move, and changes nothing else', async () => {
		const arb = addArb();
		const m = await memberOn(arb);

		const out = await scanArbs({ ids: [arb.id] });
		expect(out.rows).toEqual([
			expect.objectContaining({ id: arb.id, classification: 'migrate', flags: [] })
		]);

		const r = await row(arb.id);
		expect(r.userId).toBe(m.id);
		expect(r.matchMethod).toBe('subscription_id');
		expect(r.payCount).toBe(2);
		expect(day(r.nextBillingDate)).toBe(day(nextBillingDate(arb, 2)));
		// No flags: approved without anyone having to look.
		expect(r.decision).toBe('approve');
		expect(r.userBefore).toMatchObject({ id: m.id, subscriptionId: arb.id, role: 'premium' });

		// Nothing moved: no membership row, no gateway changes, member untouched.
		expect(await subFor(arb.id)).toBeUndefined();
		expect(arbCancels()).toHaveLength(0);
		expect(gw.charges()).toHaveLength(0);
		expect(arb.status).toBe('active');
		const u = await reloadUser(m.id);
		expect(u.role).toBe('premium');
		expect(u.subscriptionId).toBe(arb.id);
	});

	test('a member whose last renewal was declined is filed as past due and waits for a decision', async () => {
		const arb = addArb({ payments: 1, declineNext: true });
		await memberOn(arb, { subscriptionStatus: 'payment_failed' });
		await scanOne(arb.id);
		const r = await row(arb.id);
		expect(r.classification).toBe('migrate_past_due');
		expect(r.decision).toBeNull();
		expect(r.lastDeclinedAt).not.toBeNull();
	});

	test('a stopped ARB with paid time left is moved as cancelled', async () => {
		const arb = addArb({ status: 'cancelled' });
		await memberOn(arb, { subscriptionStatus: 'cancelled' });
		await scanOne(arb.id);
		expect((await row(arb.id)).classification).toBe('migrate_cancelled');
	});

	test('a stopped ARB whose paid time is over is ignored', async () => {
		const arb = addArb({ status: 'cancelled', payments: 1, startDaysAgo: 60 });
		await memberOn(arb, { subscriptionStatus: 'cancelled', role: 'free' });
		await scanOne(arb.id);
		expect((await row(arb.id)).classification).toBe('inactive');
	});

	test('an ARB still charging someone who cancelled is an orphan, with the charges listed', async () => {
		const arb = addArb({ payments: 3, startDaysAgo: 70 });
		await memberOn(arb, {
			role: 'free',
			subscriptionStatus: 'cancelled',
			subscriptionEndDate: daysFromNow(-45)
		});
		await scanOne(arb.id);
		const r = await row(arb.id);
		expect(r.classification).toBe('orphan_lapsed');
		// Payments 2 and 3 came after the member's end date.
		expect(r.chargesAfterCancel.map((c) => c.payNum).sort()).toEqual([2, 3]);
		expect(r.decision).toBeNull();
	});

	test('a second ARB for a member already paying through another is a duplicate', async () => {
		const arb = addArb();
		await createUser({
			role: 'premium',
			subscriptionId: 'some-other-arb',
			subscriptionStatus: 'active',
			lastSubscriptionId: arb.id
		});
		await scanOne(arb.id);
		expect((await row(arb.id)).classification).toBe('duplicate');
	});

	test('an ARB nobody can be matched to is unmatched', async () => {
		const arb = addArb({ email: 'stranger@mail.age' });
		await scanOne(arb.id);
		const r = await row(arb.id);
		expect(r.classification).toBe('orphan_unmatched');
		expect(r.userId).toBeNull();
	});

	test('test plans and test accounts are left alone', async () => {
		const weekly = addArb({ interval: { length: 7, unit: 'days' } });
		await memberOn(weekly);
		const testAccount = addArb();
		await memberOn(testAccount, { email: 'qa@example.com' });
		await scanArbs({ ids: [weekly.id, testAccount.id] });
		expect((await row(weekly.id)).classification).toBe('test');
		expect((await row(testAccount.id)).classification).toBe('test');
	});

	test('anything unusual is flagged and waits for a decision', async () => {
		const noCard = addArb({ cardProfile: false });
		await memberOn(noCard);
		const oddPrice = addArb({ amountCents: 800 });
		await memberOn(oddPrice);
		const expired = addArb({ card: { lastFour: '4242', type: 'Visa', expiration: '2024-01' } });
		await memberOn(expired);
		const byEmail = addArb({ email: 'Found.By@Email.age' });
		await createUser({ role: 'premium', email: 'found.by@email.age' });

		await scanArbs({ ids: [noCard.id, oddPrice.id, expired.id, byEmail.id] });
		const flagsOf = async (id) => (await row(id)).flags;
		expect(await flagsOf(noCard.id)).toContain('no_profile');
		expect(await flagsOf(oddPrice.id)).toContain('price_nonstandard');
		expect(await flagsOf(expired.id)).toContain('card_expired');
		expect(await flagsOf(byEmail.id)).toContain('weak_match');
		for (const id of [noCard.id, oddPrice.id, expired.id, byEmail.id]) {
			expect((await row(id)).classification).toBe('migrate');
			expect((await row(id)).decision).toBeNull();
		}
	});

	test('scanning again keeps the admin’s decision', async () => {
		const arb = addArb({ email: 'weak@match.age' });
		await createUser({ role: 'premium', email: 'weak@match.age' });
		await scanOne(arb.id);
		await decideArb(arb.id, 'skip', { actorId: admin.id });
		await scanOne(arb.id);
		expect((await row(arb.id)).decision).toBe('skip');
	});

	test('one ARB failing to read doesn’t stop the rest of the batch', async () => {
		const good = addArb();
		await memberOn(good);
		const fakeGet = authnet.arbGet;
		authnet.arbGet = async (id, opts) => {
			if (id === 'broken') throw new Error('E00001 An error occurred during processing.');
			return fakeGet(id, opts);
		};
		const out = await scanArbs({ ids: ['broken', good.id] });
		expect(out.processed).toBe(2);
		expect((await row('broken')).classification).toBe('error');
		expect((await row(good.id)).classification).toBe('migrate');
	});
});

describe('moving a member', () => {
	test('copies plan, price, billing date and card, then cancels the ARB', async () => {
		const arb = addArb();
		const m = await memberOn(arb);
		await scanOne(arb.id);

		const r = await migrateArb(arb.id, { actorId: admin.id });
		expect(r).toMatchObject({ ok: true, status: 'active', cancelled: true });

		const sub = await subFor(arb.id);
		expect(sub).toMatchObject({
			ref: arb.id,
			userId: m.id,
			plan: 'monthly',
			priceCents: 1000,
			status: 'active',
			customerProfileId: arb.customerProfileId,
			paymentProfileId: arb.paymentProfileId
		});
		// Billed on the day the ARB would have charged next.
		const next = nextBillingDate(arb, 2);
		expect(day(sub.currentPeriodEnd)).toBe(day(next));
		expect(day(sub.nextChargeAt)).toBe(day(next));
		expect(sub.anchorDay).toBe(next.getUTCDate());
		expect(sub.legacyArbCancelledAt).not.toBeNull();

		// The current paid period is on record, so history and refunds line up.
		const [inv] = await invoicesOf(sub.id);
		expect(inv).toMatchObject({ kind: 'migrated', status: 'paid', amountCents: 1000, seq: 2 });
		const lastTrans = arb.transactions[1].transId;
		expect(inv.transId).toBe(lastTrans);
		const [pay] = await db.select().from(payment).where(eq(payment.transId, lastTrans));
		expect(pay).toMatchObject({ kind: 'sub_renewal', subscriptionId: arb.id, userId: m.id });

		// The card behind the ARB is saved to the member's account.
		const [card] = await db.select().from(savedCard).where(eq(savedCard.userId, m.id));
		expect(card).toMatchObject({ paymentProfileId: arb.paymentProfileId, lastFour: '4242' });
		expect(sub.savedCardId).toBe(card.id);

		// Same access, same references, nothing charged, ARB stopped.
		const u = await reloadUser(m.id);
		expect(u).toMatchObject({
			role: 'premium',
			subscriptionId: arb.id,
			subscriptionStatus: 'active'
		});
		expect(day(u.nextBillingDate)).toBe(day(next));
		expect(gw.charges()).toHaveLength(0);
		expect(arb.status).toBe('cancelled');
		expect((await row(arb.id)).migratedAt).not.toBeNull();
	});

	test('the ARB is cancelled only after the new membership is saved', async () => {
		const arb = addArb();
		await memberOn(arb);
		await scanOne(arb.id);
		const fakeCancel = authnet.arbCancel;
		let savedFirst = null;
		authnet.arbCancel = async (id) => {
			savedFirst = !!(await subFor(id));
			return fakeCancel(id);
		};
		await migrateArb(arb.id);
		expect(savedFirst).toBe(true);
	});

	test('nothing moves without an admin decision', async () => {
		const arb = addArb({ amountCents: 800 });
		await memberOn(arb);
		await scanOne(arb.id);
		const r = await migrateArb(arb.id);
		expect(r.ok).toBe(false);
		expect(await subFor(arb.id)).toBeUndefined();
		expect(arbCancels()).toHaveLength(0);
	});

	test('an unscanned or unmigratable ARB is refused', async () => {
		const arb = addArb();
		await memberOn(arb);
		expect((await migrateArb(arb.id)).ok).toBe(false);

		const orphan = addArb({ email: 'stranger@mail.age' });
		await scanOne(orphan.id);
		await decideArb(orphan.id, 'approve', { actorId: admin.id });
		expect((await migrateArb(orphan.id)).ok).toBe(false);
		expect(arbCancels()).toHaveLength(0);
	});

	test('running it twice moves the member once', async () => {
		const arb = addArb();
		await memberOn(arb);
		await scanOne(arb.id);
		await migrateArb(arb.id);
		const again = await migrateArb(arb.id);
		expect(again).toMatchObject({ ok: true, already: true });
		expect(await db.select().from(subscription)).toHaveLength(1);
		expect(arbCancels()).toHaveLength(1);
	});

	test('a member still on ARB can’t also sign up for the new billing', async () => {
		const arb = addArb();
		const m = await memberOn(arb, { customerProfileId: 'cp-new' });
		const card = await createSavedCard(m, {
			customerProfileId: 'cp-new',
			paymentProfileId: 'pp-new'
		});
		gw.addCard('cp-new', 'pp-new');
		const r = await startSubscription({
			user: m,
			plan: 'monthly',
			payment: { savedCardId: card.id },
			consent: true
		});
		expect(r).toMatchObject({ ok: false, status: 409 });
		expect(gw.charges()).toHaveLength(0);
	});

	test('a member who joined the new billing meanwhile is not moved', async () => {
		const arb = addArb();
		const m = await memberOn(arb, { customerProfileId: 'cp-new' });
		await scanOne(arb.id);
		// Their ARB link was cleared (say, by hand) and they signed up afresh.
		await db.update(user).set({ subscriptionId: null }).where(eq(user.id, m.id));
		const card = await createSavedCard(m, {
			customerProfileId: 'cp-new',
			paymentProfileId: 'pp-new'
		});
		gw.addCard('cp-new', 'pp-new');
		const joined = await startSubscription({
			user: { ...m, subscriptionId: null },
			plan: 'monthly',
			payment: { savedCardId: card.id },
			consent: true
		});
		expect(joined.ok).toBe(true);

		const r = await migrateArb(arb.id);
		expect(r.ok).toBe(false);
		expect(r.error).toMatch(/already has a live membership/);
		expect(arbCancels()).toHaveLength(0);
		expect(arb.status).toBe('active');
	});

	test('a past-due member moves with retries scheduled and keeps access through the grace period', async () => {
		const arb = addArb({ payments: 1, declineNext: true });
		const m = await memberOn(arb, { subscriptionStatus: 'payment_failed' });
		await scanOne(arb.id);
		const r = await approveAndMigrate(arb.id);
		expect(r).toMatchObject({ ok: true, status: 'past_due' });

		const sub = await subFor(arb.id);
		expect(sub.failedAttempts).toBe(1);
		expect(sub.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
		expect(sub.graceUntil.getTime()).toBeGreaterThan(daysFromNow(6).getTime());
		const invs = await invoicesOf(sub.id);
		expect(invs.map((i) => [i.kind, i.status])).toEqual([
			['migrated', 'paid'],
			['renewal', 'failed']
		]);
		expect((await reloadUser(m.id)).role).toBe('premium');
		expect(gw.charges()).toHaveLength(0);
	});

	test('a cancelled member keeps access until their paid time runs out, and is never charged', async () => {
		const arb = addArb({ status: 'cancelled' });
		const m = await memberOn(arb, { subscriptionStatus: 'cancelled' });
		await scanOne(arb.id);
		const r = await approveAndMigrate(arb.id);
		expect(r).toMatchObject({ ok: true, status: 'cancelled' });

		const sub = await subFor(arb.id);
		expect(day(sub.currentPeriodEnd)).toBe(day(nextBillingDate(arb, 2)));
		expect(sub.nextChargeAt).toBeNull();
		const u = await reloadUser(m.id);
		expect(u.role).toBe('premium');
		expect(day(u.subscriptionEndDate)).toBe(day(sub.currentPeriodEnd));
	});

	test('a yearly member on the $5 partner first charge renews at the list price', async () => {
		const arb = addArb({ months: 12, payments: 1, startDaysAgo: 100, amountCents: 500 });
		await memberOn(arb);
		await scanOne(arb.id);
		expect((await row(arb.id)).flags).toContain('yearly_partner_5');
		await approveAndMigrate(arb.id);

		const sub = await subFor(arb.id);
		expect(sub.plan).toBe('yearly');
		expect(sub.priceCents).toBe(11000);
		expect(sub.flags).toContain('price_reset');
		const [inv] = await invoicesOf(sub.id);
		expect(inv).toMatchObject({ amountCents: 500, discountCents: 10500 });
	});

	test('a member on a non-standard price keeps it', async () => {
		const arb = addArb({ amountCents: 800 });
		await memberOn(arb);
		await scanOne(arb.id);
		await approveAndMigrate(arb.id);
		expect((await subFor(arb.id)).priceCents).toBe(800);
	});

	test('an unmatched ARB can be assigned to a member and then moved', async () => {
		const arb = addArb({ email: 'stranger@mail.age' });
		const m = await createUser({ role: 'premium' });
		await scanOne(arb.id);
		await decideArb(arb.id, 'assign', { actorId: admin.id, userId: m.id });
		const r = await migrateArb(arb.id);
		expect(r.ok).toBe(true);
		expect((await subFor(arb.id)).userId).toBe(m.id);
		expect((await row(arb.id)).matchMethod).toBe('manual');
	});
});

describe('when the card can’t be found', () => {
	test('a card profile is rebuilt from the last payment', async () => {
		const arb = addArb({ cardProfile: false });
		const m = await memberOn(arb);
		await scanOne(arb.id);
		const r = await approveAndMigrate(arb.id);
		expect(r.ok).toBe(true);
		const sub = await subFor(arb.id);
		expect(sub.customerProfileId).toBeTruthy();
		expect(sub.paymentProfileId).toBeTruthy();
		const [card] = await db.select().from(savedCard).where(eq(savedCard.userId, m.id));
		expect(card.source).toBe('migration');
	});

	test('if that fails too, the ARB keeps running until the member adds a card', async () => {
		const arb = addArb({ cardProfile: false });
		const m = await memberOn(arb);
		await scanOne(arb.id);
		authnet.createProfileFromTransaction = async () => {
			throw new Error('E00040 The record cannot be found.');
		};
		const r = await approveAndMigrate(arb.id);
		expect(r).toMatchObject({ ok: false, needsCard: true });

		// Still billed by the ARB, still premium, nothing half-done.
		expect(arb.status).toBe('active');
		expect(arbCancels()).toHaveLength(0);
		expect(await subFor(arb.id)).toBeUndefined();
		expect((await reloadUser(m.id)).role).toBe('premium');
		expect((await row(arb.id)).flags).toContain('no_profile');

		// The member saves a card on their account page: the move finishes.
		gw.addCard('cp-own', 'pp-own', { lastFour: '9999' });
		const card = await createSavedCard(m, {
			customerProfileId: 'cp-own',
			paymentProfileId: 'pp-own'
		});
		const done = await completeLegacyMigration(m.id, card);
		expect(done.ok).toBe(true);
		const sub = await subFor(arb.id);
		expect(sub).toMatchObject({ customerProfileId: 'cp-own', paymentProfileId: 'pp-own' });
		expect(arb.status).toBe('cancelled');
	});
});

describe('when the gateway misbehaves mid-move', () => {
	test('a failed cancel holds renewals until the ARB is stopped, and a retry finishes it', async () => {
		const arb = addArb();
		await memberOn(arb);
		await scanOne(arb.id);
		const fakeCancel = authnet.arbCancel;
		authnet.arbCancel = async () => {
			throw new Error('E00001 An error occurred during processing.');
		};
		const r = await migrateArb(arb.id);
		expect(r).toMatchObject({ ok: true, cancelled: false });
		let sub = await subFor(arb.id);
		expect(sub.legacyArbCancelledAt).toBeNull();
		expect(sub.flags).toContain('arb_cancel_failed');
		expect((await row(arb.id)).error).toMatch(/cancel failed/);

		// Due, but not charged: the ARB might still bill them.
		await dueNow(sub.id);
		const run = await chargeDueSubscriptions();
		expect(run.attempted).toBe(0);
		expect(gw.charges()).toHaveLength(0);

		// Retrying the move only retries the cancel.
		authnet.arbCancel = fakeCancel;
		const retry = await migrateArb(arb.id);
		expect(retry.ok).toBe(true);
		sub = await subFor(arb.id);
		expect(sub.legacyArbCancelledAt).not.toBeNull();
		expect(arb.status).toBe('cancelled');
		expect(await db.select().from(subscription)).toHaveLength(1);
	});

	test('a charge the ARB takes during the move counts as the next renewal', async () => {
		const arb = addArb();
		const m = await memberOn(arb);
		await scanOne(arb.id);
		const fakeCancel = authnet.arbCancel;
		authnet.arbCancel = async (id) => {
			// The overnight batch charges between our read and the cancel.
			arb.transactions.push({
				transId: 'late-charge',
				response: 'Approved',
				approved: true,
				submittedAt: new Date(),
				payNum: 3,
				attemptNum: 1
			});
			return fakeCancel(id);
		};
		await migrateArb(arb.id);

		const sub = await subFor(arb.id);
		const next = nextBillingDate(arb, 2);
		const after = addMonthsAnchored(next, 1, next.getUTCDate());
		expect(day(sub.currentPeriodStart)).toBe(day(next));
		expect(day(sub.currentPeriodEnd)).toBe(day(after));
		expect(day(sub.nextChargeAt)).toBe(day(after));
		const invs = await invoicesOf(sub.id);
		expect(invs.map((i) => [i.kind, i.transId])).toEqual([
			['migrated', arb.transactions[1].transId],
			['renewal', 'late-charge']
		]);
		const [pay] = await db.select().from(payment).where(eq(payment.transId, 'late-charge'));
		expect(pay.userId).toBe(m.id);
		expect(gw.charges()).toHaveLength(0);
	});
});

describe('after the move', () => {
	test('the first renewal charges the saved card once, at the member’s price', async () => {
		const arb = addArb({ amountCents: 800 });
		await memberOn(arb);
		await scanOne(arb.id);
		await approveAndMigrate(arb.id);
		const sub = await subFor(arb.id);
		await dueNow(sub.id);

		const run = await chargeDueSubscriptions();
		expect(run.paid).toBe(1);
		expect(gw.charges()).toHaveLength(1);
		expect(gw.charges()[0].opts).toMatchObject({
			customerProfileId: arb.customerProfileId,
			paymentProfileId: arb.paymentProfileId,
			amountCents: 800
		});
		await chargeDueSubscriptions();
		expect(gw.charges()).toHaveLength(1);
	});

	test('if the ARB charged anyway, the renewal adopts that payment instead of charging again', async () => {
		const arb = addArb();
		await memberOn(arb);
		await scanOne(arb.id);
		await migrateArb(arb.id);
		const sub = await subFor(arb.id);
		arb.transactions.push({
			transId: 'stray-arb-charge',
			response: 'Approved',
			approved: true,
			submittedAt: new Date(),
			payNum: 3,
			attemptNum: 1
		});
		await dueNow(sub.id);

		const run = await chargeDueSubscriptions();
		expect(run.paid).toBe(1);
		expect(gw.charges()).toHaveLength(0);
		const invs = await invoicesOf(sub.id);
		expect(invs.at(-1)).toMatchObject({ status: 'paid', transId: 'stray-arb-charge' });
	});
});

describe('orphans and the sentinel', () => {
	test('cancelling an orphan stops the ARB without touching the member', async () => {
		const arb = addArb({ payments: 3, startDaysAgo: 70 });
		const m = await memberOn(arb, {
			role: 'free',
			subscriptionStatus: 'cancelled',
			subscriptionEndDate: daysFromNow(-45)
		});
		await scanOne(arb.id);
		const r = await cancelArb(arb.id, { actorId: admin.id });
		expect(r.ok).toBe(true);
		expect(arb.status).toBe('cancelled');
		const lr = await row(arb.id);
		expect(lr).toMatchObject({ decision: 'cancel', arbStatus: 'cancelled' });
		expect(lr.cancelledAt).not.toBeNull();
		expect(await subFor(arb.id)).toBeUndefined();
		expect((await reloadUser(m.id)).role).toBe('free');
		// Refunds are a separate, deliberate step.
		expect(gw.calls.filter((c) => c.method === 'refundTransaction')).toHaveLength(0);
	});

	test('reports ARBs still charging that shouldn’t be', async () => {
		// Migrated, but the cancel didn't go through.
		const stuck = addArb();
		await memberOn(stuck);
		await scanOne(stuck.id);
		authnet.arbCancel = async () => {
			throw new Error('E00001');
		};
		await migrateArb(stuck.id);
		// Never scanned at all.
		const unknown = addArb();
		// Scanned and waiting to move: expected to still be active.
		const waiting = addArb();
		await memberOn(waiting);
		await scanOne(waiting.id);

		const found = (await unexpectedActiveArbs()).map((s) => s.id).sort();
		expect(found).toEqual([stuck.id, unknown.id].sort());
	});
});
