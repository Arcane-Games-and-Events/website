/**
 * Buying and refunding tickets against a real database and the fake
 * gateway: the purchase endpoint, payments whose outcome never came back,
 * seat caps, and every refund path a ticket can take.
 *
 * The rules under test: the price is the server's; one purchase charges
 * once and issues its tickets once; a refund releases the seat and keeps
 * the order, ticket and ledger in step with what actually moved.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { checkout, order, payment, refund, refundRequest, ticket } from '$lib/server/db/schema.js';
import { POST as purchase } from '../../src/routes/api/events/[eventId]/purchase/+server.js';
import { GET as pollCheckout } from '../../src/routes/api/checkout/[id]/+server.js';
import { priceTickets, seatsTaken } from '$lib/server/payments/checkout.js';
import {
	approveRefundRequest,
	declineRefundRequest,
	memberRefundTicket,
	refundOrderRemainder,
	venueNow
} from '$lib/server/payments/refunds.js';
import { reconcileAll } from '$lib/server/billing/reconcile.js';
import { installFakeAuthnet } from '../support/fake-authnet.js';
import { createAdmin, createEvent, createSavedCard, createUser } from '../support/factories.js';

let gw;
let buyer;
let card;
let ev;
let keySeq = 0;

beforeEach(async () => {
	gw = installFakeAuthnet();
	buyer = await createUser({ customerProfileId: 'cp-buyer' });
	card = await createSavedCard(buyer, { customerProfileId: 'cp-buyer', paymentProfileId: 'pp-1' });
	gw.addCard('cp-buyer', 'pp-1');
	ev = await createEvent();
});

const cookies = { get: () => undefined, set: () => {}, delete: () => {} };

/** POST the purchase endpoint as the browser would. */
async function buy({
	who = buyer,
	event = ev,
	players = [{ firstName: 'Ada', lastName: 'Player' }],
	payment: pay = { savedCardId: card.id },
	idempotencyKey = `key-${++keySeq}`,
	...extra
} = {}) {
	const url = new URL(`http://localhost/api/events/${event.id}/purchase`);
	const res = await purchase({
		params: { eventId: event.id },
		request: new Request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ players, payment: pay, idempotencyKey, ...extra })
		}),
		locals: { user: who },
		cookies,
		url,
		getClientAddress: () => '127.0.0.1'
	});
	return { status: res.status, body: await res.json(), idempotencyKey };
}

async function poll(checkoutId, who = buyer) {
	const res = await pollCheckout({ params: { id: checkoutId }, locals: { user: who } });
	return { status: res.status, body: await res.json() };
}

const two = [
	{ firstName: 'Ada', lastName: 'Player' },
	{ firstName: 'Bo', lastName: 'Player' }
];
const ticketsOf = (orderId) => db.select().from(ticket).where(eq(ticket.orderId, orderId));
const checkoutsOf = (userId) => db.select().from(checkout).where(eq(checkout.userId, userId));
const reloadTicket = async (id) => (await db.select().from(ticket).where(eq(ticket.id, id)))[0];
const ledger = async (transId) =>
	(await db.select().from(payment).where(eq(payment.transId, transId)))[0];
/** Age a checkout so the hourly job looks at it. */
const age = (id, minutes) =>
	db
		.update(checkout)
		.set({ updatedAt: new Date(Date.now() - minutes * 60000) })
		.where(eq(checkout.id, id));

describe('buying tickets', () => {
	test('charges the server’s price once and issues one ticket per player', async () => {
		const r = await buy({ players: two, amount: 1 });
		expect(r.status).toBe(200);
		expect(r.body.success).toBe(true);

		// $40 each; the stray `amount` the browser sent is ignored.
		expect(gw.charges()).toHaveLength(1);
		const { opts } = gw.charges()[0];
		expect(opts.amountCents).toBe(8000);
		expect(opts).toMatchObject({ customerProfileId: 'cp-buyer', paymentProfileId: 'pp-1' });

		const [co] = await checkoutsOf(buyer.id);
		expect(co.status).toBe('fulfilled');
		expect(opts.invoiceNumber).toBe(co.invoiceNumber);
		const tickets = await ticketsOf(co.orderId);
		expect(tickets.map((t) => t.firstName).sort()).toEqual(['Ada', 'Bo']);
		expect(new Set(tickets.map((t) => t.code)).size).toBe(2);
		expect(tickets.every((t) => t.transactionId === co.transId)).toBe(true);
		const pay = await ledger(co.transId);
		expect(pay).toMatchObject({ kind: 'ticket', orderId: co.orderId, eventId: ev.id });
		expect(Number(pay.amount)).toBe(80);
		expect(r.body.redirectUrl).toBe(`/account/purchases/${co.orderId}?new=1`);
	});

	test('a premium member’s discount applies to the first ticket only', async () => {
		const member = await createUser({
			role: 'premium',
			subscriptionStatus: 'active',
			customerProfileId: 'cp-prem'
		});
		const c = await createSavedCard(member, {
			customerProfileId: 'cp-prem',
			paymentProfileId: 'pp-p'
		});
		gw.addCard('cp-prem', 'pp-p');
		const expected = priceTickets(ev, 2, true);
		expect(expected.discountCents).toBeGreaterThan(0);

		await buy({ who: member, players: two, payment: { savedCardId: c.id } });
		expect(gw.charges()[0].opts.amountCents).toBe(expected.amountCents);
		const [co] = await checkoutsOf(member.id);
		const paid = (await ticketsOf(co.orderId)).map((t) => Number(t.amountPaid)).sort();
		expect(paid).toEqual([30, 40]);
	});

	test('the same purchase sent twice charges once', async () => {
		const first = await buy();
		const again = await buy({ idempotencyKey: first.idempotencyKey });
		expect(again.status).toBe(200);
		expect(again.body.orderId).toBe(first.body.orderId);
		expect(gw.charges()).toHaveLength(1);
		expect(await db.select().from(ticket)).toHaveLength(1);
	});

	test('a declined card issues nothing, and trying again can succeed', async () => {
		gw.next('declined');
		const r = await buy();
		expect(r.status).toBe(402);
		const [co] = await checkoutsOf(buyer.id);
		expect(co.status).toBe('declined');
		expect(await db.select().from(ticket)).toHaveLength(0);
		expect(await db.select().from(payment)).toHaveLength(0);

		const retry = await buy({ idempotencyKey: r.idempotencyKey });
		expect(retry.status).toBe(200);
		expect(gw.charges()).toHaveLength(2);
		expect(await db.select().from(ticket)).toHaveLength(1);
	});

	test('a full event takes no money', async () => {
		const small = await createEvent({ playerCap: 2 });
		expect((await buy({ event: small, players: two })).status).toBe(200);
		const r = await buy({ event: small });
		expect(r.status).toBe(409);
		expect(r.body.full).toBe(true);
		expect(gw.charges()).toHaveLength(1);
	});

	test('seats in a checkout still being paid for are held', async () => {
		const small = await createEvent({ playerCap: 1 });
		gw.next('timeout');
		expect((await buy({ event: small })).status).toBe(202);
		const other = await createUser({ customerProfileId: 'cp-o' });
		const oc = await createSavedCard(other, {
			customerProfileId: 'cp-o',
			paymentProfileId: 'pp-o'
		});
		gw.addCard('cp-o', 'pp-o');
		const r = await buy({ who: other, event: small, payment: { savedCardId: oc.id } });
		expect(r.status).toBe(409);
		expect(gw.charges()).toHaveLength(1);
	});

	test('nothing is charged for a closed or cancelled event, bad players, or someone else’s card', async () => {
		const past = await createEvent({ eventDate: new Date(Date.now() - 3 * 86400000) });
		const cancelled = await createEvent({ status: 'cancelled' });
		const gem = await createEvent({ gemIdRequired: true });
		const other = await createUser();
		const theirs = await createSavedCard(other, { paymentProfileId: 'pp-theirs' });

		expect((await buy({ event: past })).status).toBe(400);
		expect((await buy({ event: cancelled })).status).toBe(400);
		expect((await buy({ event: gem })).status).toBe(400);
		expect((await buy({ players: [{ firstName: 'Ada' }] })).status).toBe(400);
		expect((await buy({ players: Array(9).fill(two[0]) })).status).toBe(400);
		expect((await buy({ payment: { savedCardId: theirs.id } })).status).toBe(404);
		expect((await buy({ who: null })).status).toBe(401);
		expect(gw.charges()).toHaveLength(0);
	});

	test('a fully discounted ticket is issued without touching the gateway', async () => {
		const cheap = await createEvent({ price: '10.00' });
		const member = await createUser({ role: 'premium', subscriptionStatus: 'active' });
		const r = await buy({ who: member, event: cheap, payment: {} });
		expect(r.status).toBe(200);
		expect(gw.charges()).toHaveLength(0);
		const [t] = await db.select().from(ticket).where(eq(ticket.userId, member.id));
		expect(Number(t.amountPaid)).toBe(0);
		expect(t.transactionId).toBeNull();
	});
});

describe('when the gateway doesn’t answer', () => {
	test('a charge that never happened is marked failed, and the buyer is told so', async () => {
		gw.next('timeout');
		const r = await buy();
		expect(r.status).toBe(202);
		expect(r.body.pending).toBe(true);
		expect((await poll(r.body.checkoutId)).body.status).toBe('pending');

		await age(r.body.checkoutId, 31);
		await reconcileAll();
		const p = await poll(r.body.checkoutId);
		expect(p.body.status).toBe('failed');
		expect(p.body.error).toMatch(/not been charged/);
		expect(await db.select().from(ticket)).toHaveLength(0);
	});

	test('a charge that did go through is found by invoice number and the tickets issued once', async () => {
		gw.next('charged_but_timeout');
		const r = await buy({ players: two });
		expect(r.status).toBe(202);
		expect(await db.select().from(ticket)).toHaveLength(0);

		await age(r.body.checkoutId, 11);
		await reconcileAll();
		await reconcileAll();
		const p = await poll(r.body.checkoutId);
		expect(p.body.status).toBe('fulfilled');
		const [co] = await checkoutsOf(buyer.id);
		expect(await ticketsOf(co.orderId)).toHaveLength(2);
		expect(await db.select().from(order)).toHaveLength(1);
		expect(gw.charges()).toHaveLength(1);
		expect(await ledger(co.transId)).toBeTruthy();
	});

	test('a retry while the first attempt is unresolved waits instead of charging again', async () => {
		gw.next('timeout');
		const r = await buy();
		const again = await buy({ idempotencyKey: r.idempotencyKey });
		expect(again.status).toBe(202);
		expect(gw.charges()).toHaveLength(1);
	});

	test('nobody else can poll your checkout', async () => {
		gw.next('timeout');
		const r = await buy();
		const stranger = await createUser();
		expect((await poll(r.body.checkoutId, stranger)).status).toBe(404);
	});
});

describe('refunding tickets', () => {
	const bought = async (opts) => {
		const r = await buy(opts);
		const [co] = await db
			.select()
			.from(checkout)
			.where(eq(checkout.idempotencyKey, r.idempotencyKey));
		return { co, tickets: await ticketsOf(co.orderId) };
	};

	test('a member refunds their own ticket before the cutoff: voided, seat released', async () => {
		const { co, tickets } = await bought();
		expect(await seatsTaken(ev.id)).toBe(1);

		const r = await memberRefundTicket({ user: buyer, ticketId: tickets[0].id });
		expect(r).toMatchObject({ ok: true, method: 'void' });
		expect(gw.transactions.get(co.transId).status).toBe('voided');
		expect((await reloadTicket(tickets[0].id)).refunded).toBe(true);
		expect(await seatsTaken(ev.id)).toBe(0);
		expect(Number((await ledger(co.transId)).refundedAmount)).toBe(40);
		const [ord] = await db.select().from(order).where(eq(order.id, co.orderId));
		expect(Number(ord.refundedAmount)).toBe(40);
	});

	test('one ticket of a settled order is refunded alone, to the card it was paid with', async () => {
		const { co, tickets } = await bought({ players: two });
		gw.settle(co.transId);
		const [a, b] = tickets;
		const r = await memberRefundTicket({ user: buyer, ticketId: a.id });
		expect(r).toMatchObject({ ok: true, method: 'refund' });
		const sent = gw.calls.find((c) => c.method === 'refundTransaction');
		expect(sent).toMatchObject({ transId: co.transId, amountCents: 4000, lastFour: '1111' });
		expect((await reloadTicket(a.id)).refunded).toBe(true);
		expect((await reloadTicket(b.id)).refunded).toBe(false);
		expect(Number((await ledger(co.transId)).refundedAmount)).toBe(40);
	});

	test('part of a charge that hasn’t settled: the seat is released now, the money after settlement', async () => {
		const { co, tickets } = await bought({ players: two });
		const r = await memberRefundTicket({ user: buyer, ticketId: tickets[0].id });
		expect(r).toMatchObject({ ok: true, status: 'waiting_settlement' });
		expect((await reloadTicket(tickets[0].id)).refunded).toBe(true);
		expect(await seatsTaken(ev.id)).toBe(1);
		// No money has moved, so the ledger hasn't either.
		expect(Number((await ledger(co.transId)).refundedAmount)).toBe(0);
		expect(gw.calls.filter((c) => c.method === 'refundTransaction')).toHaveLength(0);

		// Still unsettled: the hourly job leaves it.
		await reconcileAll();
		expect(gw.calls.filter((c) => c.method === 'refundTransaction')).toHaveLength(0);

		gw.settle(co.transId);
		await reconcileAll();
		expect(gw.calls.filter((c) => c.method === 'refundTransaction')).toHaveLength(1);
		const [row] = await db.select().from(refund).where(eq(refund.transId, co.transId));
		expect(row.status).toBe('succeeded');
		expect(Number((await ledger(co.transId)).refundedAmount)).toBe(40);
		await reconcileAll();
		expect(gw.calls.filter((c) => c.method === 'refundTransaction')).toHaveLength(1);
	});

	test('a ticket can’t be refunded twice', async () => {
		const { tickets } = await bought();
		await memberRefundTicket({ user: buyer, ticketId: tickets[0].id });
		const again = await memberRefundTicket({ user: buyer, ticketId: tickets[0].id });
		expect(again.ok).toBe(false);
		expect(gw.calls.filter((c) => c.method === 'voidTransaction')).toHaveLength(1);
	});

	test('nobody can refund someone else’s ticket', async () => {
		const { tickets } = await bought();
		const stranger = await createUser();
		const r = await memberRefundTicket({ user: stranger, ticketId: tickets[0].id });
		expect(r.ok).toBe(false);
		expect((await reloadTicket(tickets[0].id)).refunded).toBe(false);
	});

	describe('inside 24 hours', () => {
		let soon;
		beforeEach(async () => {
			soon = await createEvent({
				eventDate: new Date(venueNow('Los Angeles').getTime() + 12 * 3600000)
			});
		});

		test('the member’s refund becomes a request; nothing is refunded until an admin approves', async () => {
			const { co, tickets } = await bought({ event: soon });
			const r = await memberRefundTicket({ user: buyer, ticketId: tickets[0].id, reason: 'sick' });
			expect(r.status).toBe('requested');
			expect(gw.calls.filter((c) => c.method === 'voidTransaction')).toHaveLength(0);
			expect((await reloadTicket(tickets[0].id)).refunded).toBe(false);
			// Asking twice doesn't file twice.
			await memberRefundTicket({ user: buyer, ticketId: tickets[0].id });
			const reqs = await db.select().from(refundRequest);
			expect(reqs).toHaveLength(1);

			const admin = await createAdmin();
			const ok = await approveRefundRequest({ actor: admin, requestId: reqs[0].id });
			expect(ok.ok).toBe(true);
			expect((await reloadTicket(tickets[0].id)).refunded).toBe(true);
			expect(gw.transactions.get(co.transId).status).toBe('voided');
			const [req] = await db.select().from(refundRequest);
			expect(req.status).toBe('approved');
		});

		test('a declined request refunds nothing', async () => {
			const { tickets } = await bought({ event: soon });
			await memberRefundTicket({ user: buyer, ticketId: tickets[0].id });
			const [req] = await db.select().from(refundRequest);
			const admin = await createAdmin();
			await declineRefundRequest({ actor: admin, requestId: req.id, note: 'Too late' });
			expect((await reloadTicket(tickets[0].id)).refunded).toBe(false);
			expect(gw.calls.filter((c) => /void|refund/i.test(c.method))).toHaveLength(0);
			expect((await approveRefundRequest({ actor: admin, requestId: req.id })).ok).toBe(false);
		});
	});

	test('once the event has started, members can’t refund', async () => {
		const started = await createEvent({
			eventDate: new Date(venueNow('Los Angeles').getTime() - 3600000)
		});
		// Bought earlier in the day, while registration was open.
		const { tickets } = await bought({ event: started });
		const r = await memberRefundTicket({ user: buyer, ticketId: tickets[0].id });
		expect(r.ok).toBe(false);
		expect(await db.select().from(refundRequest)).toHaveLength(0);
	});

	test('an admin refunds what’s left of an order, once', async () => {
		const { co, tickets } = await bought({ players: two });
		gw.settle(co.transId);
		await memberRefundTicket({ user: buyer, ticketId: tickets[0].id });
		const admin = await createAdmin();

		const r = await refundOrderRemainder({
			actor: admin,
			orderId: co.orderId,
			reason: 'event moved'
		});
		expect(r.ok).toBe(true);
		const refunds = gw.calls.filter((c) => c.method === 'refundTransaction');
		expect(refunds.map((c) => c.amountCents)).toEqual([4000, 4000]);
		const left = await db
			.select()
			.from(ticket)
			.where(and(eq(ticket.orderId, co.orderId), eq(ticket.refunded, false)));
		expect(left).toHaveLength(0);
		expect(Number((await ledger(co.transId)).refundedAmount)).toBe(80);

		const again = await refundOrderRemainder({ actor: admin, orderId: co.orderId });
		expect(again.ok).toBe(false);
		expect(gw.calls.filter((c) => c.method === 'refundTransaction')).toHaveLength(2);
	});
});
