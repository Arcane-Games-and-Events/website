/**
 * The store's Players page and AGE's oversight of store events: who a
 * store sees as its players (only buyers of its own events, with GEM ID,
 * Premium status and their tickets there), an admin unpublishing a store
 * event (off the site, no tickets, logged for the store), and the admin
 * home's list of events stores scheduled themselves.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	circuit,
	event,
	store,
	storeActivity,
	storeMember,
	ticket
} from '$lib/server/db/schema.js';
import { storePlayers } from '$lib/server/stores/players.js';
import { newStoreEvents } from '$lib/server/admin/home.js';
import { load as storeLayout } from '../../src/routes/store/[slug]/+layout.server.js';
import { load as playersLoad } from '../../src/routes/store/[slug]/players/+page.server.js';
import { actions as adminEventActions } from '../../src/routes/admin/events/[eventId]/+page.server.js';
import { POST as purchase } from '../../src/routes/api/events/[eventId]/purchase/+server.js';
import { callAction } from '../support/actions.js';
import { createAdmin, createEvent, createUser, daysFromNow } from '../support/factories.js';

let admin, owner, shop, other;

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
	[shop] = await db
		.insert(store)
		.values({ name: 'Bay Area Games', slug: 'bay-area-games', circuitId: la.id })
		.returning();
	[other] = await db
		.insert(store)
		.values({ name: 'Other Games', slug: 'other-games', circuitId: la.id })
		.returning();
	await db.insert(storeMember).values({ storeId: shop.id, userId: owner.id, role: 'owner' });
});

let n = 0;
const sell = (ev, over = {}) =>
	db
		.insert(ticket)
		.values({ eventId: ev.id, code: `p${++n}-${Math.random()}`, amountPaid: '40.00', ...over })
		.returning()
		.then((r) => r[0]);

const pageAs = (who, slug = shop.slug) => {
	const url = new URL(`http://t/store/${slug}/players`);
	return playersLoad({
		parent: () => storeLayout({ locals: { user: who }, params: { slug }, url })
	});
};

describe('the Players page', () => {
	test('one row per player across the store’s events, never another store’s', async () => {
		const ada = await createUser({
			firstName: 'Ada',
			lastName: 'Lovelace',
			gemId: '111',
			role: 'premium'
		});
		const first = await createEvent({
			storeId: shop.id,
			title: 'Bay Open Oct',
			eventDate: daysFromNow(-30),
			status: 'completed'
		});
		const second = await createEvent({
			storeId: shop.id,
			title: 'Bay Open Dec',
			eventDate: daysFromNow(20)
		});
		const elsewhere = await createEvent({ storeId: other.id, title: 'Other Open' });

		await sell(first, { userId: ada.id, firstName: 'Ada', lastName: 'Lovelace', gemId: '111' });
		await sell(second, {
			userId: ada.id,
			firstName: 'Ada',
			lastName: 'Lovelace',
			gemId: '111',
			amountPaid: '35.00'
		});
		await sell(second, { firstName: 'Guest', lastName: 'Player', gemId: '222', refunded: true });
		await sell(elsewhere, {
			userId: ada.id,
			firstName: 'Ada',
			lastName: 'Lovelace',
			amountPaid: '99.00'
		});

		const players = await storePlayers(shop.id);
		expect(players).toHaveLength(2);
		const a = players.find((p) => p.gemId === '111');
		expect(a).toMatchObject({
			name: 'Ada Lovelace',
			premium: true,
			events: 2,
			spent: 75,
			hasAccount: true
		});
		expect(a.history.map((h) => [h.title, h.state])).toEqual([
			['Bay Open Dec', 'registered'],
			['Bay Open Oct', 'played']
		]);
		const guest = players.find((p) => p.gemId === '222');
		expect(guest).toMatchObject({ premium: false, events: 0, spent: 0, hasAccount: false });
		expect(guest.history[0].state).toBe('refunded');
		// Nothing from the other store, and no emails anywhere.
		expect(JSON.stringify(players)).not.toMatch(/Other Open|@/);
	});

	test('only the store’s members (and admins) can open it', async () => {
		const ev = await createEvent({ storeId: shop.id });
		await sell(ev, { firstName: 'Ada', lastName: 'L' });
		expect((await pageAs(owner)).players).toHaveLength(1);
		expect((await pageAs(admin)).players).toHaveLength(1);
		await expect(pageAs(await createUser())).rejects.toMatchObject({ status: 404 });
		await expect(pageAs(owner, other.slug)).rejects.toMatchObject({ status: 404 });
	});
});

describe('unpublishing a store event', () => {
	const setStatus = (ev, status, user = admin) =>
		callAction(adminEventActions, 'updateStatus', {
			user,
			params: { eventId: ev.id },
			fields: { status }
		});

	test('an admin takes it off the site; the store sees it in its activity', async () => {
		const ev = await createEvent({ storeId: shop.id, title: 'Bay Open' });
		const r = await setStatus(ev, 'unpublished');
		expect(r.data.success).toBe(true);
		const [row] = await db.select().from(event).where(eq(event.id, ev.id));
		expect(row.status).toBe('unpublished');

		await setStatus(ev, 'upcoming');
		const kinds = (
			await db.select().from(storeActivity).where(eq(storeActivity.storeId, shop.id))
		).map((a) => a.kind);
		expect(kinds).toEqual(expect.arrayContaining(['event_unpublished', 'event_republished']));
	});

	test('only admins can unpublish', async () => {
		const ev = await createEvent({ storeId: shop.id });
		const staff = await createUser({ role: 'tournament staff' });
		expect((await setStatus(ev, 'unpublished', staff)).status).toBe(403);
	});

	test('nobody can buy a ticket to an unpublished event', async () => {
		const ev = await createEvent({ storeId: shop.id, status: 'unpublished' });
		const buyer = await createUser();
		const url = new URL(`http://localhost/api/events/${ev.id}/purchase`);
		const res = await purchase({
			params: { eventId: ev.id },
			request: new Request(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					players: [{ firstName: 'Ada', lastName: 'L' }],
					payment: { savedCardId: 'x' },
					idempotencyKey: 'k-unpub'
				})
			}),
			locals: { user: buyer },
			cookies: { get: () => undefined, set: () => {}, delete: () => {} },
			url,
			getClientAddress: () => '127.0.0.1'
		});
		expect(res.status).toBe(404);
	});
});

describe('new store events on the admin home', () => {
	test('lists events stores scheduled lately, not AGE’s own', async () => {
		await createEvent({ storeId: shop.id, title: 'Store scheduled' });
		await createEvent({ title: 'AGE scheduled' });
		const old = await createEvent({ storeId: shop.id, title: 'Long ago' });
		await db
			.update(event)
			.set({ createdAt: daysFromNow(-30) })
			.where(eq(event.id, old.id));

		const rows = await newStoreEvents();
		expect(rows.map((r) => r.title)).toEqual(['Store scheduled']);
		expect(rows[0]).toMatchObject({ storeName: 'Bay Area Games', storeSlug: 'bay-area-games' });
	});
});
