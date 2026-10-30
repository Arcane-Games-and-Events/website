/**
 * The hourly billing job as Vercel Cron calls it: who may run it, the
 * BILLING_ENABLED switch, and the per-run charge cap.
 *
 * The renewal logic itself is covered in memberships.test.js; this is the
 * switchboard around it, which matters most on cutover day.
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { billingRun, subscription, user } from '$lib/server/db/schema.js';
import { GET as billingCron } from '../../src/routes/api/cron/billing/+server.js';
import { GET as syncCron } from '../../src/routes/api/cron/sync-subscriptions/+server.js';
import { cancelSubscription, startSubscription } from '$lib/server/billing/subscriptions.js';
import { installFakeAuthnet } from '../support/fake-authnet.js';
import { createAdmin, createSavedCard, createUser } from '../support/factories.js';

let gw;
const saved = {};

beforeEach(() => {
	gw = installFakeAuthnet();
	for (const k of ['BILLING_ENABLED', 'BILLING_MAX_CHARGES_PER_RUN', 'CRON_SECRET'])
		saved[k] = env[k];
});
afterEach(() => {
	Object.assign(env, saved);
});

const SECRET = () => `Bearer ${env.CRON_SECRET}`;

async function call(handler, { auth = SECRET(), who = null } = {}) {
	const headers = auth ? { authorization: auth } : {};
	const res = await handler({
		request: new Request('http://localhost/api/cron/billing', { headers }),
		locals: { user: who }
	});
	return { status: res.status, body: await res.json() };
}

/** A member whose renewal is due now. */
async function dueMember(i) {
	const m = await createUser({ customerProfileId: `cp-${i}` });
	const c = await createSavedCard(m, { customerProfileId: `cp-${i}`, paymentProfileId: `pp-${i}` });
	gw.addCard(`cp-${i}`, `pp-${i}`);
	const r = await startSubscription({
		user: m,
		plan: 'monthly',
		payment: { savedCardId: c.id },
		consent: true
	});
	const past = new Date(Date.now() - 60000);
	await db
		.update(subscription)
		.set({ nextChargeAt: past, currentPeriodEnd: past })
		.where(eq(subscription.id, r.subscription.id));
	return { member: m, sub: r.subscription };
}
/** Renewal charges only: each due member's signup charge is excluded. */
const renewals = () => gw.charges().filter((c) => c.opts.recurring !== 'first');

describe('who can run it', () => {
	test('Vercel Cron with the secret, or an admin; nobody else', async () => {
		expect((await call(billingCron, { auth: null })).status).toBe(401);
		expect((await call(billingCron, { auth: 'Bearer wrong' })).status).toBe(401);
		const member = await createUser({ role: 'premium' });
		expect((await call(billingCron, { auth: null, who: member })).status).toBe(401);
		expect(await db.select().from(billingRun)).toHaveLength(0);

		const cron = await call(billingCron);
		expect(cron.status).toBe(200);
		expect(cron.body.trigger).toBe('cron');
		const admin = await createAdmin();
		const manual = await call(billingCron, { auth: null, who: admin });
		expect(manual.status).toBe(200);
		expect(manual.body.trigger).toBe('manual');
		expect(await db.select().from(billingRun)).toHaveLength(2);
	});

	test('with no secret configured, no header gets in', async () => {
		env.CRON_SECRET = '';
		expect((await call(billingCron, { auth: 'Bearer ' })).status).toBe(401);
		expect((await call(billingCron, { auth: 'Bearer undefined' })).status).toBe(401);
		expect((await call(syncCron, { auth: 'Bearer ' })).status).toBe(401);
	});

	test('the legacy ARB sync is locked the same way', async () => {
		expect((await call(syncCron, { auth: null })).status).toBe(401);
		expect((await call(syncCron, { auth: 'Bearer wrong' })).status).toBe(401);
		expect((await call(syncCron)).status).toBe(200);
	});
});

describe('the BILLING_ENABLED switch', () => {
	test('off: the job runs and counts what’s due, but charges nobody', async () => {
		await dueMember(1);
		await dueMember(2);
		env.BILLING_ENABLED = 'false';
		const r = await call(billingCron);
		expect(r.body).toMatchObject({ mode: 'observe', due: 2 });
		expect(r.body.charged).toBeUndefined();
		expect(renewals()).toHaveLength(0);
		const [run] = await db.select().from(billingRun);
		expect(run.mode).toBe('observe');
		expect(run.finishedAt).not.toBeNull();
	});

	test('only the exact value "true" turns charging on', async () => {
		await dueMember(1);
		for (const v of ['', '1', 'TRUE', 'yes', ' true']) {
			env.BILLING_ENABLED = v;
			expect((await call(billingCron)).body.mode).toBe('observe');
		}
		expect(renewals()).toHaveLength(0);
	});

	test('off still ends memberships whose paid time is over', async () => {
		const { member, sub } = await dueMember(1);
		await cancelSubscription({ user: member });
		await db
			.update(subscription)
			.set({ currentPeriodEnd: new Date(Date.now() - 60000) })
			.where(eq(subscription.id, sub.id));
		env.BILLING_ENABLED = 'false';
		await call(billingCron);
		const [s] = await db.select().from(subscription).where(eq(subscription.id, sub.id));
		expect(s.status).toBe('ended');
		const [u] = await db.select().from(user).where(eq(user.id, member.id));
		expect(u.role).toBe('free');
	});

	test('on: each due renewal is charged once, and a second run charges nothing', async () => {
		await dueMember(1);
		await dueMember(2);
		env.BILLING_ENABLED = 'true';
		const r = await call(billingCron);
		expect(r.body.mode).toBe('live');
		expect(r.body.charged).toMatchObject({ attempted: 2, paid: 2 });
		expect(renewals()).toHaveLength(2);

		await call(billingCron);
		expect(renewals()).toHaveLength(2);
	});
});

describe('the per-run cap', () => {
	test('charges at most the cap each run, and catches up over later runs', async () => {
		for (const i of [1, 2, 3]) await dueMember(i);
		env.BILLING_ENABLED = 'true';
		env.BILLING_MAX_CHARGES_PER_RUN = '2';

		const first = await call(billingCron);
		expect(first.body.charged).toMatchObject({ attempted: 2, cap: 2 });
		expect(renewals()).toHaveLength(2);

		await call(billingCron);
		expect(renewals()).toHaveLength(3);
		// Each member exactly once.
		const charged = renewals().map((c) => c.opts.customerProfileId);
		expect(new Set(charged).size).toBe(3);

		await call(billingCron);
		expect(renewals()).toHaveLength(3);
	});
});
