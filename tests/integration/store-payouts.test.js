/**
 * Store payouts (migration 050), against a real database: the card fee per
 * payment, the ledger written from tickets (and only once), refunds coming
 * off in full with AGE absorbing the fee, a payout ready once its event is
 * closed out, marking it paid, money that arrives later carried into the
 * next payout, adjustments, and who can see and do what.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { circuit, event, store, storeLedger, storeMember, ticket } from '$lib/server/db/schema.js';
import {
	paymentFee,
	splitFee,
	storeOwed,
	storePayouts,
	syncLedger
} from '$lib/server/stores/payouts.js';
import { actions as storeActions } from '../../src/routes/admin/stores/[slug]/+page.server.js';
import { load as portalPayouts } from '../../src/routes/store/[slug]/payouts/+page.server.js';
import { GET as portalCsv } from '../../src/routes/store/[slug]/payouts/payouts.csv/+server.js';
import { load as storeLayout } from '../../src/routes/store/[slug]/+layout.server.js';
import { callAction } from '../support/actions.js';
import { createAdmin, createEvent, createUser } from '../support/factories.js';

let admin, owner, shop, other;

async function newShop(name, slug, circuitId) {
	const [s] = await db.insert(store).values({ name, slug, circuitId }).returning();
	return s;
}

let n = 0;
const sell = (ev, amount, over = {}) =>
	db
		.insert(ticket)
		.values({ eventId: ev.id, code: `c${++n}-${Math.random()}`, amountPaid: amount, ...over })
		.returning()
		.then((r) => r[0]);

const close = (ev) => db.update(event).set({ status: 'completed' }).where(eq(event.id, ev.id));
const payoutOf = async (ev) =>
	(await storePayouts(shop.id)).payouts.find((p) => p.eventId === ev.id);
const markPaid = (ev, fields = {}) =>
	callAction(storeActions, 'markPaid', {
		user: admin,
		params: { slug: shop.slug },
		fields: { eventId: ev.id, method: 'ACH', reference: 'T-1', paidAt: '2026-11-16', ...fields }
	});

beforeEach(async () => {
	admin = await createAdmin();
	owner = await createUser({ email: 'owner@shop.test' });
	const [la] = await db
		.insert(circuit)
		.values({
			name: 'Los Angeles',
			slug: 'los-angeles',
			short: 'LA',
			timezone: 'America/Los_Angeles'
		})
		.returning();
	shop = await newShop('Bay Area Games', 'bay-area-games', la.id);
	other = await newShop('Other Games', 'other-games', la.id);
	await db.insert(storeMember).values({ storeId: shop.id, userId: owner.id, role: 'owner' });
});

describe('the card fee', () => {
	test('2.9% + 30¢ per payment; free tickets have none', () => {
		expect(paymentFee(4000)).toBe(146); // $40 → $1.16 + $0.30
		expect(paymentFee(0)).toBe(0);
		expect(paymentFee(10000, { feePct: '0.0275', feeFixedCents: 25 })).toBe(300);
	});

	test('a payment’s fee splits across its tickets and adds back up', () => {
		const parts = splitFee(233, [4000, 3500, 4000]);
		expect(parts.reduce((a, b) => a + b, 0)).toBe(233);
		expect(parts[0]).toBe(parts[2]);
		expect(splitFee(0, [100, 100])).toEqual([0, 0]);
	});
});

describe('the ledger', () => {
	test('each ticket is written once: what the player paid, less its part of the fee', async () => {
		const ev = await createEvent({ storeId: shop.id });
		// two players in one card payment: $40 and a member's $35
		await sell(ev, '40.00', { transactionId: 'tx-1' });
		await sell(ev, '35.00', { transactionId: 'tx-1' });
		await sell(ev, '0.00'); // free
		await sell(ev, '40.00', { transactionId: 'tx-2', voidedAt: new Date() }); // voided

		expect(await syncLedger({ storeId: shop.id })).toBe(3);
		expect(await syncLedger({ storeId: shop.id })).toBe(0);
		const rows = await db.select().from(storeLedger).where(eq(storeLedger.storeId, shop.id));
		expect(rows).toHaveLength(3);
		const fee = paymentFee(7500); // one payment: 2.9% of $75 + 30¢
		expect(rows.reduce((a, r) => a + r.feeCents, 0)).toBe(fee);
		expect(rows.reduce((a, r) => a + r.storeCents, 0)).toBe(7500 - fee);

		const p = await payoutOf(ev);
		expect(p).toMatchObject({
			state: 'running',
			players: 3,
			gross: 7500,
			fees: fee,
			owed: 7500 - fee
		});
	});

	test('a refund comes off in full, fee included; AGE absorbs the fee', async () => {
		const ev = await createEvent({ storeId: shop.id });
		const kept = await sell(ev, '40.00', { transactionId: 'tx-a' });
		const back = await sell(ev, '40.00', { transactionId: 'tx-b' });
		await syncLedger({ storeId: shop.id });
		await db.update(ticket).set({ refunded: true }).where(eq(ticket.id, back.id));
		await syncLedger({ storeId: shop.id });

		const refund = (
			await db.select().from(storeLedger).where(eq(storeLedger.ticketId, back.id))
		).find((r) => r.entryType === 'refund');
		expect(refund).toMatchObject({
			grossCents: -4000,
			feeCents: -146,
			storeCents: -(4000 - 146),
			ageCents: -146
		});
		const p = await payoutOf(ev);
		expect(p).toMatchObject({ players: 1, refunds: -4000, owed: 4000 - 146 });
		expect(kept.id).toBeTruthy();
	});
});

describe('paying a store', () => {
	test('ready once the event is closed out, then marked paid and frozen', async () => {
		const ev = await createEvent({ storeId: shop.id });
		await sell(ev, '40.00', { transactionId: 'tx-1' });
		expect(await storeOwed(shop.id)).toBe(0); // still running

		const early = await markPaid(ev);
		expect(early.status).toBe(400);
		expect(early.data.error).toMatch(/Close out/);

		await close(ev);
		expect(await storeOwed(shop.id)).toBe(4000 - 146);
		expect((await payoutOf(ev)).state).toBe('ready');

		const r = await markPaid(ev);
		expect(r.data.saved).toMatch(/38\.54/);
		const p = await payoutOf(ev);
		expect(p).toMatchObject({ state: 'paid', owed: 3854, method: 'ACH', reference: 'T-1' });
		expect(await storeOwed(shop.id)).toBe(0);
		expect((await markPaid(ev)).data.error).toMatch(/already/);
	});

	test('a refund after the payout was paid is carried into the next payout', async () => {
		const first = await createEvent({ storeId: shop.id });
		const t = await sell(first, '40.00', { transactionId: 'tx-1' });
		await close(first);
		await markPaid(first);

		await db.update(ticket).set({ refunded: true }).where(eq(ticket.id, t.id));
		const after = await storePayouts(shop.id);
		expect(after.carriedCents).toBe(-3854);
		expect(after.payouts.find((p) => p.eventId === first.id).owed).toBe(3854); // unchanged

		const next = await createEvent({ storeId: shop.id });
		await sell(next, '40.00', { transactionId: 'tx-2' });
		await close(next);
		expect(await storeOwed(shop.id)).toBe(0); // 3854 earned, 3854 carried back
		await markPaid(next);
		const p = (await storePayouts(shop.id)).payouts.find((x) => x.eventId === next.id);
		expect(p).toMatchObject({ carried: -3854, owed: 0 });
	});

	test('an adjustment needs a reason and shows on the payout', async () => {
		const ev = await createEvent({ storeId: shop.id });
		const add = (fields) =>
			callAction(storeActions, 'adjust', {
				user: admin,
				params: { slug: shop.slug },
				fields: { eventId: ev.id, ...fields }
			});
		expect((await add({ amount: '25' })).data.error).toMatch(/why/);
		expect((await add({ amount: 'abc', note: 'x' })).data.error).toMatch(/amount/);
		expect((await add({ amount: '25', note: 'Venue cost' })).data.saved).toBeTruthy();
		expect((await add({ amount: '-5', note: 'Prize support' })).data.saved).toBeTruthy();
		expect(await payoutOf(ev)).toMatchObject({ adjust: 2000, owed: 2000 });
	});

	test('only admins pay a store, and only for its own events', async () => {
		const ev = await createEvent({ storeId: other.id, status: 'completed' });
		expect((await markPaid(ev)).data.error).toMatch(/isn’t this store’s/);
		const r = await callAction(storeActions, 'markPaid', {
			user: owner,
			params: { slug: shop.slug },
			fields: { eventId: ev.id, method: 'ACH' }
		});
		expect(r.status).toBe(403);
	});
});

describe('the store’s view', () => {
	const asOwner = async (user, slug) => {
		const url = new URL(`http://t/store/${slug}/payouts`);
		const parent = () => storeLayout({ locals: { user }, params: { slug }, url });
		return { parent };
	};

	test('a store sees its own payouts and CSV, never another store’s', async () => {
		const ev = await createEvent({ storeId: shop.id, title: 'Bay Open' });
		await sell(ev, '40.00', { transactionId: 'tx-1' });
		const { parent } = await asOwner(owner, shop.slug);
		const page = await portalPayouts({ parent });
		expect(page.payouts.payouts.map((p) => p.title)).toEqual(['Bay Open']);

		const csv = await (
			await portalCsv({ locals: { user: owner }, params: { slug: shop.slug } })
		).text();
		expect(csv).toMatch(/^Event date,Event,State/);
		expect(csv).toMatch(/Bay Open,running,1,40\.00/);

		await expect(
			portalCsv({ locals: { user: owner }, params: { slug: other.slug } })
		).rejects.toMatchObject({ status: 404 });
	});
});
