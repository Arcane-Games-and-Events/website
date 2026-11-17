/**
 * Circuits and stores, the admin side (migration 045): creating and
 * renaming circuits, creating stores with a first owner, members, linking
 * events, the overview's figures and the program settings.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	circuit,
	event,
	standing,
	store,
	storeActivity,
	storeMember,
	storeProgram,
	ticket
} from '$lib/server/db/schema.js';
import { actions as overviewActions } from '../../src/routes/admin/circuits/+page.server.js';
import { actions as newCircuitActions } from '../../src/routes/admin/circuits/new/+page.server.js';
import { actions as editCircuitActions } from '../../src/routes/admin/circuits/[slug]/+page.server.js';
import { actions as newStoreActions } from '../../src/routes/admin/stores/new/+page.server.js';
import {
	actions as storeActions,
	load as storeLoad
} from '../../src/routes/admin/stores/[slug]/+page.server.js';
import sharp from 'sharp';
import {
	linkEvents,
	deleteCircuit,
	removeCircuitImage,
	setCircuitImage,
	storesOverview
} from '$lib/server/stores/admin.js';
import { listCircuits } from '$lib/server/stores/circuits.js';
import { load as rootLayout } from '../../src/routes/+layout.server.js';
import { load as storeHome } from '../../src/routes/store/+page.server.js';
import { callAction } from '../support/actions.js';
import { createAdmin, createEvent, createUser } from '../support/factories.js';

let admin;
let la;

const circuitFields = (over = {}) => ({
	name: 'Los Angeles',
	short: 'LA',
	region: 'West Coast',
	timezone: 'America/Los_Angeles',
	color: '#1b4f9c',
	sort: '1',
	...over
});

async function newStore(fields = {}) {
	const r = await callAction(newStoreActions, 'default', {
		user: admin,
		fields: { name: 'Bay Area Games', circuitId: la.id, ...fields }
	});
	expect(r.status).toBe(303);
	const slug = r.redirect.split('/').pop().split('?')[0];
	const [s] = await db.select().from(store).where(eq(store.slug, slug));
	return s;
}

beforeEach(async () => {
	admin = await createAdmin({ firstName: 'Ada', lastName: 'Admin' });
	const r = await callAction(newCircuitActions, 'default', {
		user: admin,
		fields: circuitFields()
	});
	expect(r.redirect).toBe('/admin/circuits');
	[la] = await db.select().from(circuit).where(eq(circuit.slug, 'los-angeles'));
});

describe('circuits', () => {
	test('a new circuit gets a slug and is listed', async () => {
		await callAction(newCircuitActions, 'default', {
			user: admin,
			fields: circuitFields({ name: 'Bay Area', short: 'bay', color: '#AA3311', sort: '5' })
		});
		const rows = await listCircuits();
		const bay = rows.find((c) => c.name === 'Bay Area');
		expect(bay).toMatchObject({ slug: 'bay-area', short: 'BAY', color: '#aa3311', sort: 5 });
	});

	test('a duplicate name, a bad colour or an unknown time zone is refused', async () => {
		const dup = await callAction(newCircuitActions, 'default', {
			user: admin,
			fields: circuitFields({ name: 'los angeles' })
		});
		expect(dup.status).toBe(400);
		const colour = await callAction(newCircuitActions, 'default', {
			user: admin,
			fields: circuitFields({ name: 'X', color: 'blue' })
		});
		expect(colour.data.error).toMatch(/colour/);
		const zone = await callAction(newCircuitActions, 'default', {
			user: admin,
			fields: circuitFields({ name: 'Y', timezone: 'Mars/Olympus' })
		});
		expect(zone.data.error).toMatch(/time zone/);
	});

	test('renaming a circuit renames it on its events and standings', async () => {
		const ev = await createEvent({ circuit: 'Los Angeles' });
		await db.insert(standing).values({
			season: '2026',
			circuit: 'Los Angeles',
			gemId: 'g1',
			playerName: 'P'
		});
		const r = await callAction(editCircuitActions, 'save', {
			user: admin,
			params: { slug: 'los-angeles' },
			fields: circuitFields({ name: 'Southern California' })
		});
		expect(r.redirect).toBe('/admin/circuits');
		const [e] = await db.select().from(event).where(eq(event.id, ev.id));
		expect(e.circuit).toBe('Southern California');
		const st = await db.select().from(standing);
		expect(st.every((s) => s.circuit === 'Southern California')).toBe(true);
	});

	test('only admins can create one', async () => {
		const someone = await createUser();
		const r = await callAction(newCircuitActions, 'default', {
			user: someone,
			fields: circuitFields({ name: 'Z' })
		});
		expect(r.status).toBe(403);
	});
});

describe('stores', () => {
	test('a new store gets its first owner, and the activity says so', async () => {
		const owner = await createUser({
			email: 'Owner@Store.test',
			firstName: 'Olive',
			lastName: 'Owner'
		});
		const s = await newStore({ ownerEmail: 'owner@store.test' });
		expect(s).toMatchObject({ slug: 'bay-area-games', active: true });
		const members = await db.select().from(storeMember).where(eq(storeMember.storeId, s.id));
		expect(members).toEqual([expect.objectContaining({ userId: owner.id, role: 'owner' })]);
		const log = await db.select().from(storeActivity).where(eq(storeActivity.storeId, s.id));
		expect(log.map((a) => a.kind).sort()).toEqual(['member_added', 'store_created']);
	});

	test('an owner email without an account is refused, and nothing is created', async () => {
		const r = await callAction(newStoreActions, 'default', {
			user: admin,
			fields: { name: 'Ghost Games', circuitId: la.id, ownerEmail: 'nobody@x.test' }
		});
		expect(r.status).toBe(400);
		expect(r.data.error).toMatch(/sign up first/);
		expect(await db.select().from(store)).toHaveLength(0);
	});

	test('a second store with the same name gets its own address', async () => {
		await newStore();
		const second = await newStore();
		expect(second.slug).toBe('bay-area-games-2');
	});

	test('unticking Active on the details form makes the store inactive', async () => {
		const s = await newStore();
		await callAction(storeActions, 'update', {
			user: admin,
			params: { slug: s.slug },
			fields: { name: s.name, circuitId: la.id, hasActive: '1' }
		});
		const [after] = await db.select().from(store).where(eq(store.id, s.id));
		expect(after.active).toBe(false);
	});
});

describe('members', () => {
	test('add, change role and remove, by account email', async () => {
		const s = await newStore();
		const mia = await createUser({ email: 'mia@test.age', firstName: 'Mia', lastName: 'M' });
		const params = { slug: s.slug };

		const add = await callAction(storeActions, 'addMember', {
			user: admin,
			params,
			fields: { email: ' MIA@test.age ', role: 'manager' }
		});
		expect(add.data.saved).toBe('Mia M added.');

		const again = await callAction(storeActions, 'addMember', {
			user: admin,
			params,
			fields: { email: 'mia@test.age', role: 'manager' }
		});
		expect(again.data.error).toMatch(/already a manager/);

		await callAction(storeActions, 'setRole', {
			user: admin,
			params,
			fields: { userId: mia.id, role: 'owner' }
		});
		let [m] = await db
			.select()
			.from(storeMember)
			.where(and(eq(storeMember.storeId, s.id), eq(storeMember.userId, mia.id)));
		expect(m.role).toBe('owner');

		await callAction(storeActions, 'removeMember', {
			user: admin,
			params,
			fields: { userId: mia.id }
		});
		[m] = await db.select().from(storeMember).where(eq(storeMember.storeId, s.id));
		expect(m).toBeUndefined();

		const log = await db.select().from(storeActivity).where(eq(storeActivity.storeId, s.id));
		expect(log.find((a) => a.kind === 'member_removed')?.note).toBe('Mia M');
	});

	test('the store page lists members with their GEM ID', async () => {
		const s = await newStore();
		await createUser({ email: 'gem@test.age', gemId: '12345' });
		await callAction(storeActions, 'addMember', {
			user: admin,
			params: { slug: s.slug },
			fields: { email: 'gem@test.age', role: 'manager' }
		});
		const data = await storeLoad({ params: { slug: s.slug } });
		expect(data.members[0]).toMatchObject({
			email: 'gem@test.age',
			gemId: '12345',
			role: 'manager'
		});
	});
});

describe('events', () => {
	test('only unlinked events in the store’s circuit can be linked', async () => {
		const s = await newStore();
		const mine = await createEvent({ circuit: 'Los Angeles' });
		const elsewhere = await createEvent({ circuit: 'New England' });

		const before = await storeLoad({ params: { slug: s.slug } });
		expect(before.unlinked.map((e) => e.id)).toEqual([mine.id]);

		const res = await linkEvents(s.id, [mine.id, elsewhere.id], admin.id);
		expect(res.count).toBe(1);
		const [e] = await db.select().from(event).where(eq(event.id, elsewhere.id));
		expect(e.storeId).toBeNull();

		const r = await callAction(storeActions, 'unlinkEvent', {
			user: admin,
			params: { slug: s.slug },
			fields: { eventId: mine.id }
		});
		expect(r.data.saved).toMatch(/unlinked/);
	});

	test('the overview counts this month’s players and ticket sales, after refunds', async () => {
		const s = await newStore();
		const ev = await createEvent({ circuit: 'Los Angeles', eventDate: new Date(), storeId: s.id });
		const t = (over) =>
			db.insert(ticket).values({
				eventId: ev.id,
				code: Math.random().toString(36).slice(2),
				amountPaid: '40.00',
				...over
			});
		await t({});
		await t({ amountPaid: '36.00' });
		await t({ refunded: true });
		await t({ voidedAt: new Date() });

		const o = await storesOverview();
		const row = o.circuits.find((c) => c.id === la.id).stores[0];
		expect(row).toMatchObject({ playersMonth: 2, revenueMonth: 76, upcoming: expect.any(Number) });
		expect(o.totals).toMatchObject({ stores: 1, playersMonth: 2, revenueMonth: 76, owedCents: 0 });
	});
});

describe('the card fee', () => {
	test('saving the rate stores a percentage and cents', async () => {
		const r = await callAction(overviewActions, 'program', {
			user: admin,
			fields: { feePct: '2.75%', feeFixed: '$0.25' }
		});
		expect(r.data.saved).toBeTruthy();
		const [p] = await db.select().from(storeProgram);
		expect(p).toMatchObject({ feePct: '0.0275', feeFixedCents: 25, updatedBy: admin.id });
	});

	test('a rate that isn’t a number is refused', async () => {
		const r = await callAction(overviewActions, 'program', {
			user: admin,
			fields: { feePct: 'lots', feeFixed: '0.30' }
		});
		expect(r.status).toBe(400);
	});
});

describe('the Store link in the account menu', () => {
	const layoutFor = (u) =>
		rootLayout({ locals: { user: u }, cookies: { get: () => undefined }, depends: () => {} });

	test('appears once an account is added to a store, and goes when it’s removed', async () => {
		const s = await newStore();
		const mia = await createUser({ email: 'mia@test.age' });
		expect((await layoutFor(mia)).storeCount).toBe(0);

		await callAction(storeActions, 'addMember', {
			user: admin,
			params: { slug: s.slug },
			fields: { email: 'mia@test.age', role: 'manager' }
		});
		expect((await layoutFor(mia)).storeCount).toBe(1);
		// With one store, /store goes straight into it.
		await expect(
			storeHome({ locals: { user: mia }, url: new URL('http://x/store') })
		).rejects.toMatchObject({ status: 302, location: '/store/bay-area-games' });

		await callAction(storeActions, 'removeMember', {
			user: admin,
			params: { slug: s.slug },
			fields: { userId: mia.id }
		});
		expect((await layoutFor(mia)).storeCount).toBe(0);
	});

	test('/store sends people who aren’t in a store to their account', async () => {
		const someone = await createUser();
		await expect(
			storeHome({ locals: { user: someone }, url: new URL('http://x/store') })
		).rejects.toMatchObject({ status: 302, location: '/account' });
		await expect(
			storeHome({ locals: { user: null }, url: new URL('http://x/store') })
		).rejects.toMatchObject({ status: 302, location: '/login?redirect=%2Fstore' });
	});
});

describe('circuit pictures', () => {
	// A stand-in for Supabase storage: remembers uploads and removals.
	const fakeStorage = () => {
		const files = new Map();
		const removed = [];
		return {
			files,
			removed,
			storage: {
				from: () => ({
					upload: async (path, body) => (files.set(path, body), { error: null }),
					getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
					remove: async (paths) => (removed.push(...paths), { error: null })
				})
			}
		};
	};
	const png = async (w, h) =>
		new File(
			[
				await sharp({ create: { width: w, height: h, channels: 3, background: '#1b4f9c' } })
					.png()
					.toBuffer()
			],
			'la.png',
			{ type: 'image/png' }
		);

	test('an upload is cropped to 1600×900 WebP, listed, and replaces the old file', async () => {
		const store = fakeStorage();
		const first = await setCircuitImage(la.id, await png(3000, 3000), { storage: store });
		expect(first.url).toMatch(/^https:\/\/cdn\.test\/circuits\/los-angeles-.+\.webp$/);
		const [path] = [...store.files.keys()];
		const meta = await sharp(store.files.get(path)).metadata();
		expect(meta).toMatchObject({ width: 1600, height: 900, format: 'webp' });
		expect((await listCircuits()).find((c) => c.name === 'Los Angeles').imageUrl).toBe(first.url);

		await setCircuitImage(la.id, await png(1200, 800), { storage: store });
		expect(store.removed).toEqual([path]);

		const gone = await removeCircuitImage(la.id, { storage: store });
		expect(gone.ok).toBe(true);
		expect((await listCircuits()).find((c) => c.name === 'Los Angeles').imageUrl).toBeNull();
	});

	test('non-pictures and empty uploads are refused', async () => {
		const store = fakeStorage();
		const text = new File(['hello'], 'notes.txt', { type: 'text/plain' });
		expect((await setCircuitImage(la.id, text, { storage: store })).error).toMatch(/JPEG/);
		expect((await setCircuitImage(la.id, null, { storage: store })).error).toMatch(/Choose/);
		const broken = new File(['not really a png'], 'x.png', { type: 'image/png' });
		expect((await setCircuitImage(la.id, broken, { storage: store })).error).toMatch(
			/couldn’t be read/
		);
		expect(store.files.size).toBe(0);
	});
});

describe('deleting a circuit', () => {
	let bay;
	beforeEach(async () => {
		await callAction(newCircuitActions, 'default', {
			user: admin,
			fields: circuitFields({ name: 'Bay Area', short: 'BAY', sort: '9' })
		});
		[bay] = await db.select().from(circuit).where(eq(circuit.slug, 'bay-area'));
	});
	const del = (fields, user = admin) =>
		callAction(editCircuitActions, 'delete', { user, params: { slug: 'bay-area' }, fields });
	const stillThere = async () =>
		(await db.select().from(circuit).where(eq(circuit.id, bay.id))).length === 1;

	test('needs the exact name typed and the box ticked', async () => {
		expect((await del({ confirmName: 'bay area', understood: 'on' })).data.error).toMatch(
			/exactly/
		);
		expect((await del({ confirmName: 'Bay Area' })).data.error).toMatch(/Tick the box/);
		expect(await stillThere()).toBe(true);
	});

	test('only admins can delete', async () => {
		const r = await del({ confirmName: 'Bay Area', understood: 'on' }, await createUser());
		expect(r.status).toBe(403);
		expect(await stillThere()).toBe(true);
	});

	test('a circuit with a store, events or standings can only be made inactive', async () => {
		const [s] = await db
			.insert(store)
			.values({ name: 'Bay Games', slug: 'bay-games', circuitId: bay.id })
			.returning();
		expect((await del({ confirmName: 'Bay Area', understood: 'on' })).data.error).toMatch(
			/1 store/
		);
		await db.delete(store).where(eq(store.id, s.id));

		const ev = await createEvent({ circuit: 'Bay Area' });
		expect((await del({ confirmName: 'Bay Area', understood: 'on' })).data.error).toMatch(
			/1 event\b.*inactive/
		);
		await db.delete(event).where(eq(event.id, ev.id));

		await db.insert(standing).values({ season: '2026', circuit: 'bay area', playerName: 'P' });
		expect((await del({ confirmName: 'Bay Area', understood: 'on' })).data.error).toMatch(
			/1 standing/
		);
		expect(await stillThere()).toBe(true);
	});

	test('an empty circuit is deleted, with its picture', async () => {
		const removed = [];
		await db
			.update(circuit)
			.set({ imageUrl: 'https://cdn.test/x.webp', imagePath: 'circuits/x.webp' })
			.where(eq(circuit.id, bay.id));
		const storage = {
			storage: { from: () => ({ remove: async (p) => (removed.push(...p), {}) }) }
		};
		const res = await deleteCircuit(bay.id, { typed: 'Bay Area', understood: true, storage });
		expect(res).toEqual({ ok: true, name: 'Bay Area' });
		expect(await stillThere()).toBe(false);
		expect(removed).toEqual(['circuits/x.webp']);
		expect((await listCircuits({ inactive: true })).map((c) => c.name)).not.toContain('Bay Area');
	});

	test('the page action sends you back to the list once it’s gone', async () => {
		const r = await del({ confirmName: 'Bay Area', understood: 'on' });
		expect(r.redirect).toBe('/admin/circuits?deleted=Bay%20Area');
	});
});

describe('making a circuit inactive', () => {
	const flip = (fields, user = admin) =>
		callAction(editCircuitActions, 'active', { user, params: { slug: 'los-angeles' }, fields });
	const isActive = async () =>
		(await db.select().from(circuit).where(eq(circuit.id, la.id)))[0].active;

	test('the edit form can’t change it any more', async () => {
		await callAction(editCircuitActions, 'save', {
			user: admin,
			params: { slug: 'los-angeles' },
			fields: circuitFields({ region: 'SoCal' })
		});
		expect(await isActive()).toBe(true);
	});

	test('it needs the page’s confirmation, then takes the circuit off public lists', async () => {
		const unconfirmed = await flip({ active: 'false' });
		expect(unconfirmed.data.error).toMatch(/Confirm/);
		expect(await isActive()).toBe(true);

		const off = await flip({ active: 'false', confirmed: 'yes' });
		expect(off.data.saved).toMatch(/inactive/);
		expect(await isActive()).toBe(false);
		expect((await listCircuits()).map((c) => c.name)).not.toContain('Los Angeles');
		expect((await listCircuits({ inactive: true })).map((c) => c.name)).toContain('Los Angeles');

		expect((await flip({ active: 'false', confirmed: 'yes' })).data.error).toMatch(
			/already inactive/
		);
		expect((await flip({ active: 'true', confirmed: 'yes' })).data.saved).toMatch(/active again/);
		expect(await isActive()).toBe(true);
	});

	test('only admins', async () => {
		expect((await flip({ active: 'false', confirmed: 'yes' }, await createUser())).status).toBe(
			403
		);
	});
});
