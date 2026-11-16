/**
 * The admin AGE Open area: scheduling an event on any circuit (run by AGE
 * or one of the circuit's stores), and the series overview — the season by
 * circuit and what's coming up.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { circuit, event, store, storeActivity, ticket } from '$lib/server/db/schema.js';
import {
	actions as newEvent,
	load as newEventLoad
} from '../../src/routes/admin/events/new/+page.server.js';
import { seriesOverview } from '$lib/server/ageopen/overview.js';
import { actions as eventActions } from '../../src/routes/admin/events/[eventId]/+page.server.js';
import { callAction } from '../support/actions.js';
import { createAdmin, createEvent, createUser } from '../support/factories.js';

let admin;
let la;
let ne;
let shop;

const fields = (over = {}) => ({
	circuit: 'Los Angeles',
	title: 'AGE Open LA · March',
	location: 'Bay Area Games',
	eventDate: '2026-03-14T11:00',
	format: 'Classic Constructed',
	price: '40',
	gemIdRequired: 'on',
	...over
});

beforeEach(async () => {
	admin = await createAdmin();
	[la, ne] = await db
		.insert(circuit)
		.values([
			{ name: 'Los Angeles', slug: 'los-angeles', short: 'LA', color: '#1b4f9c', sort: 1 },
			{ name: 'New England', slug: 'new-england', short: 'NE', color: '#6a4a86', sort: 2 }
		])
		.returning();
	[shop] = await db
		.insert(store)
		.values({ name: 'Bay Area Games', slug: 'bay-area-games', circuitId: la.id })
		.returning();
});

describe('scheduling an event from admin', () => {
	test('run by a store: on its circuit, month from the date, logged for the store', async () => {
		const r = await callAction(newEvent, 'default', {
			user: admin,
			fields: fields({ storeId: shop.id })
		});
		expect(r.redirect).toMatch(/^\/admin\/events\/[\w-]{10}$/);
		const id = r.redirect.split('/').pop();
		const [e] = await db.select().from(event).where(eq(event.id, id));
		expect(e).toMatchObject({
			circuit: 'Los Angeles',
			month: 'March',
			storeId: shop.id,
			price: '40.00'
		});
		const log = await db.select().from(storeActivity).where(eq(storeActivity.storeId, shop.id));
		expect(log.map((a) => a.kind)).toEqual(['event_created']);
	});

	test('run by AGE: no store', async () => {
		const r = await callAction(newEvent, 'default', { user: admin, fields: fields() });
		const [e] = await db
			.select()
			.from(event)
			.where(eq(event.id, r.redirect.split('/').pop()));
		expect(e.storeId).toBeNull();
	});

	test('a store from another circuit, a missing circuit, or a non-admin is refused', async () => {
		const wrong = await callAction(newEvent, 'default', {
			user: admin,
			fields: fields({ circuit: 'New England', storeId: shop.id })
		});
		expect(wrong.data.error).toMatch(/isn’t on the chosen circuit/);
		const none = await callAction(newEvent, 'default', {
			user: admin,
			fields: fields({ circuit: '' })
		});
		expect(none.data.error).toMatch(/circuit/);
		const nobody = await callAction(newEvent, 'default', {
			user: await createUser(),
			fields: fields()
		});
		expect(nobody.status).toBe(403);
		expect(await db.select().from(event)).toHaveLength(0);
	});

	test('?store= picks the store and its circuit up front', async () => {
		const out = await newEventLoad({
			url: new URL('http://x/admin/events/new?store=bay-area-games')
		});
		expect(out.pick).toEqual({ circuit: 'Los Angeles', store: shop.id });
	});
});

describe('editing an event from its page', () => {
	test('moves it to a store on its circuit; the month follows the date; no cap clears the cap', async () => {
		const ev = await createEvent({ circuit: 'New England', month: 'March', playerCap: 32 });
		const r = await callAction(eventActions, 'updateEvent', {
			params: { eventId: ev.id },
			user: admin,
			fields: fields({ storeId: shop.id, eventDate: '2026-05-09T11:00', price: '35' })
		});
		expect(r.data.success).toBe(true);
		const [e] = await db.select().from(event).where(eq(event.id, ev.id));
		expect(e).toMatchObject({
			circuit: 'Los Angeles',
			month: 'May',
			storeId: shop.id,
			price: '35.00',
			playerCap: null,
			gemIdRequired: true,
			premiumDiscount: false
		});
	});

	test('a store from another circuit, or a non-admin, is refused', async () => {
		const ev = await createEvent({ circuit: 'Los Angeles', title: 'Before' });
		const wrong = await callAction(eventActions, 'updateEvent', {
			params: { eventId: ev.id },
			user: admin,
			fields: fields({ circuit: 'New England', storeId: shop.id })
		});
		expect(wrong.data.error).toMatch(/isn’t on the chosen circuit/);
		const nobody = await callAction(eventActions, 'updateEvent', {
			params: { eventId: ev.id },
			user: await createUser(),
			fields: fields()
		});
		expect(nobody.status).toBe(403);
		const [e] = await db.select().from(event).where(eq(event.id, ev.id));
		expect(e.title).toBe('Before');
	});
});

describe('the series overview', () => {
	test('the season by circuit and what’s coming up', async () => {
		const at = new Date('2026-06-15T18:00:00Z');
		await createEvent({
			circuit: 'Los Angeles',
			eventDate: new Date('2026-02-14T11:00:00Z'),
			status: 'completed'
		});
		// Played in May but never closed out still counts as played.
		await createEvent({
			circuit: 'Los Angeles',
			eventDate: new Date('2026-05-09T11:00:00Z'),
			status: 'upcoming'
		});
		const next = await createEvent({
			circuit: 'New England',
			eventDate: new Date('2026-06-20T11:00:00Z'),
			storeId: null
		});
		await db.insert(ticket).values({ eventId: next.id, code: 'X1', amountPaid: '40' });

		const o = await seriesOverview(at);
		expect(o.race).toEqual([
			expect.objectContaining({ name: 'Los Angeles', played: 2, scheduled: 0, open: 6 }),
			expect.objectContaining({ name: 'New England', played: 0, scheduled: 1, open: 7 })
		]);
		expect(o.totals).toMatchObject({ played: 2, scheduled: 1, slots: 16, players: 1, sales: 40 });
		expect(o.upcoming.map((e) => e.id)).toEqual([next.id]);
		expect(o.upcoming[0].color).toBe('#6a4a86');
	});
});
