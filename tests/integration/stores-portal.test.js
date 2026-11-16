/**
 * The store side (/store/[slug]): who gets in, creating and editing the
 * store's events (live straight away, circuit and month set for them),
 * cancelling, event staff and event day, and owners managing members.
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
import { load as storeLayout } from '../../src/routes/store/[slug]/+layout.server.js';
import { load as storeChooser } from '../../src/routes/store/+page.server.js';
import { actions as newEventActions } from '../../src/routes/store/[slug]/events/new/+page.server.js';
import { actions as eventActions } from '../../src/routes/store/[slug]/events/[eventId]/+page.server.js';
import { actions as memberActions } from '../../src/routes/store/[slug]/members/+page.server.js';
import { load as staffEventLoad } from '../../src/routes/staff/[eventId]/+page.server.js';
import {
	ageCalendar,
	canWorkEvent,
	eventRoster,
	seasonDashboard,
	storeAccess
} from '$lib/server/stores/portal.js';
import { GET as peopleSearch } from '../../src/routes/store/[slug]/people/+server.js';
import { searchAccounts, maskEmail } from '$lib/server/stores/people.js';
import { load as newEventLoad } from '../../src/routes/store/[slug]/events/new/+page.server.js';
import { handle } from '../../src/hooks.server.js';
import { withVenueZone } from '$lib/server/payments/refunds.js';
import { callAction } from '../support/actions.js';
import { createAdmin, createEvent, createUser } from '../support/factories.js';

let owner;
let manager;
let shop;
const params = () => ({ slug: 'bay-area-games' });

const eventFields = (over = {}) => ({
	title: 'AGE Open LA · December',
	location: 'Bay Area Games',
	address: '1 Main St',
	eventDate: '2026-12-12T11:00',
	format: 'Classic Constructed',
	price: '40',
	playerCap: '64',
	gemIdRequired: 'on',
	premiumDiscount: 'on',
	...over
});

async function publish(over = {}, as = manager) {
	const r = await callAction(newEventActions, 'default', {
		user: as,
		params: params(),
		fields: eventFields(over)
	});
	expect(r.status).toBe(303);
	const id = r.redirect.split('/events/')[1].split('?')[0];
	const [row] = await db.select().from(event).where(eq(event.id, id));
	return row;
}

const sell = (eventId, n = 1) =>
	db.insert(ticket).values(
		Array.from({ length: n }, (_, i) => ({
			eventId,
			code: `T${i}${Math.random().toString(36).slice(2, 6)}`,
			amountPaid: '40.00'
		}))
	);

beforeEach(async () => {
	const [la] = await db
		.insert(circuit)
		.values({
			name: 'Los Angeles',
			slug: 'los-angeles',
			short: 'LA',
			timezone: 'America/Los_Angeles',
			color: '#1b4f9c'
		})
		.returning();
	[shop] = await db
		.insert(store)
		.values({ name: 'Bay Area Games', slug: 'bay-area-games', circuitId: la.id })
		.returning();
	owner = await createUser({ email: 'owner@shop.test', firstName: 'Olive', lastName: 'Owner' });
	manager = await createUser({ email: 'manager@shop.test', firstName: 'Max', lastName: 'Manager' });
	await db.insert(storeMember).values([
		{ storeId: shop.id, userId: owner.id, role: 'owner' },
		{ storeId: shop.id, userId: manager.id, role: 'manager' }
	]);
});

describe('who gets in', () => {
	const open = (user) =>
		storeLayout({
			locals: { user },
			params: params(),
			url: new URL('http://x/store/bay-area-games')
		});

	test('members get in with their role; admins as owners; others get a 404', async () => {
		expect((await open(manager)).where.role).toBe('manager');
		const admin = await createAdmin();
		expect((await open(admin)).where).toMatchObject({ role: 'owner', viaAdmin: true });
		await expect(open(await createUser())).rejects.toMatchObject({ status: 404 });
		await expect(open(null)).rejects.toMatchObject({ status: 302 });
	});

	test('/store goes straight to the store when there is only one', async () => {
		await expect(
			storeChooser({ locals: { user: owner }, url: new URL('http://x/store') })
		).rejects.toMatchObject({ status: 302, location: '/store/bay-area-games' });
	});
});

describe('events', () => {
	test('a new event is live, in the store’s circuit, filed under the month of its date', async () => {
		const e = await publish();
		expect(e).toMatchObject({
			storeId: shop.id,
			circuit: 'Los Angeles',
			month: 'December',
			status: 'upcoming',
			price: '40.00',
			playerCap: 64,
			gemIdRequired: true,
			createdBy: manager.id
		});
		expect(e.eventDate.toISOString()).toBe('2026-12-12T11:00:00.000Z');
		const log = await db.select().from(storeActivity).where(eq(storeActivity.storeId, shop.id));
		expect(log.map((a) => a.kind)).toEqual(['event_created']);
	});

	test('a missing format, a bad fee or no date is refused', async () => {
		for (const [over, msg] of [
			[{ format: 'Poker' }, /format/],
			[{ price: '-5' }, /entry fee/],
			[{ eventDate: '' }, /date/]
		]) {
			const r = await callAction(newEventActions, 'default', {
				user: manager,
				params: params(),
				fields: eventFields(over)
			});
			expect(r.data.error).toMatch(msg);
		}
	});

	test('an inactive store can’t add events', async () => {
		await db.update(store).set({ active: false }).where(eq(store.id, shop.id));
		const r = await callAction(newEventActions, 'default', {
			user: manager,
			params: params(),
			fields: eventFields()
		});
		expect(r.data.error).toMatch(/inactive/);
	});

	test('someone outside the store can’t add one', async () => {
		const r = await callAction(newEventActions, 'default', {
			user: await createUser(),
			params: params(),
			fields: eventFields()
		});
		expect(r.status).toBe(404);
	});

	test('once tickets sell, the fee stays and the cap can’t drop below the players', async () => {
		const e = await publish();
		await sell(e.id, 3);
		const save = (over) =>
			callAction(eventActions, 'update', {
				user: manager,
				params: { ...params(), eventId: e.id },
				fields: eventFields(over)
			});
		const r = await save({ price: '10', title: 'Renamed' });
		expect(r.data.saved).toMatch(/fee stayed/);
		const [after] = await db.select().from(event).where(eq(event.id, e.id));
		expect(after).toMatchObject({ title: 'Renamed', price: '40.00' });

		const cap = await save({ playerCap: '2' });
		expect(cap.data.error).toMatch(/3 players/);
	});

	test('another store’s event can’t be edited from here', async () => {
		const other = await createEvent({ circuit: 'Los Angeles' });
		const r = await callAction(eventActions, 'update', {
			user: owner,
			params: { ...params(), eventId: other.id },
			fields: eventFields()
		});
		expect(r.data.error).toMatch(/isn’t this store’s/);
	});

	test('cancelling works until someone has a ticket', async () => {
		const sold = await publish();
		await sell(sold.id);
		const no = await callAction(eventActions, 'cancel', {
			user: owner,
			params: { ...params(), eventId: sold.id }
		});
		expect(no.data.error).toMatch(/need refunds/);

		const empty = await publish({ title: 'Quiet one' });
		const yes = await callAction(eventActions, 'cancel', {
			user: owner,
			params: { ...params(), eventId: empty.id }
		});
		expect(yes.data.saved).toBe('Event cancelled.');
		const [after] = await db.select().from(event).where(eq(event.id, empty.id));
		expect(after.status).toBe('cancelled');
	});
});

describe('event day', () => {
	test('staff are added by email; store members and staff can open event day', async () => {
		const e = await publish();
		const judge = await createUser({ email: 'judge@test.age', firstName: 'Jo', lastName: 'Judge' });
		const outsider = await createUser();

		const r = await callAction(eventActions, 'addStaff', {
			user: manager,
			params: { ...params(), eventId: e.id },
			fields: { email: 'JUDGE@test.age' }
		});
		expect(r.data.saved).toBe('Jo Judge is on staff.');

		expect(await canWorkEvent(judge, e.id)).toBe(true);
		expect(await canWorkEvent(owner, e.id)).toBe(true);
		expect(await canWorkEvent(outsider, e.id)).toBe(false);

		const day = await staffEventLoad({ locals: { user: owner }, params: { eventId: e.id } });
		expect(day.event.id).toBe(e.id);
		await expect(
			staffEventLoad({ locals: { user: outsider }, params: { eventId: e.id } })
		).rejects.toMatchObject({ status: 403 });

		await callAction(eventActions, 'removeStaff', {
			user: manager,
			params: { ...params(), eventId: e.id },
			fields: { userId: judge.id }
		});
		expect(await canWorkEvent(judge, e.id)).toBe(false);
	});
});

describe('members', () => {
	const call = (name, user, fields) =>
		callAction(memberActions, name, { user, params: params(), fields });

	test('owners add people; managers can’t', async () => {
		await createUser({ email: 'new@test.age', firstName: 'Nia', lastName: 'New' });
		const no = await call('add', manager, { email: 'new@test.age', role: 'manager' });
		expect(no.data.error).toMatch(/Only owners/);
		const yes = await call('add', owner, { email: 'new@test.age', role: 'manager' });
		expect(yes.data.saved).toBe('Nia New added.');
	});

	test('the last owner can’t be removed or made a manager', async () => {
		const demote = await call('setRole', owner, { userId: owner.id, role: 'manager' });
		expect(demote.data.error).toMatch(/at least one owner/);
		const remove = await call('remove', owner, { userId: owner.id });
		expect(remove.data.error).toMatch(/at least one owner/);

		await call('setRole', owner, { userId: manager.id, role: 'owner' });
		const now = await call('remove', owner, { userId: owner.id });
		expect(now.data.saved).toMatch(/Removed/);
	});
});

describe('venue time zones', () => {
	test('refund timing reads the circuit’s time zone from the database', async () => {
		await db
			.update(circuit)
			.set({ timezone: 'Pacific/Honolulu' })
			.where(eq(circuit.slug, 'los-angeles'));
		const { bump } = await import('$lib/server/cache/index.js');
		await bump('circuits');
		const ev = await withVenueZone({ id: 'x', circuit: 'Los Angeles' });
		expect(ev.timezone).toBe('Pacific/Honolulu');
		expect(await withVenueZone({ id: 'y', circuit: 'Nowhere' })).toEqual({
			id: 'y',
			circuit: 'Nowhere'
		});
	});
});

describe('the event page: who’s signed up, and event day', () => {
	test('the roster shows players without emails, marks first Opens, and refunds come last', async () => {
		const veteran = await createUser({ firstName: 'Vee', lastName: 'Vet', role: 'premium' });
		const earlier = await createEvent({
			circuit: 'Los Angeles',
			eventDate: new Date('2026-01-10T11:00:00Z')
		});
		await db
			.insert(ticket)
			.values({ eventId: earlier.id, code: 'OLD1', userId: veteran.id, amountPaid: '40' });

		const e = await publish();
		await db.insert(ticket).values([
			{ eventId: e.id, code: 'A1', userId: veteran.id, gemId: '111', amountPaid: '36' },
			{
				eventId: e.id,
				code: 'A2',
				firstName: 'Nina',
				lastName: 'New',
				gemId: '222',
				amountPaid: '40'
			},
			{
				eventId: e.id,
				code: 'A3',
				firstName: 'Rae',
				lastName: 'Refund',
				amountPaid: '40',
				refunded: true
			}
		]);
		const roster = await eventRoster(e.id);
		expect(roster.map((p) => [p.name, p.premium, p.firstOpen, p.out])).toEqual([
			['Vee Vet', true, false, false],
			['Nina New', false, true, false],
			['Rae Refund', false, true, true]
		]);
		expect(Object.keys(roster[0])).not.toContain('email');
	});

	test('the GEM switch is the store’s, for its own event only', async () => {
		const e = await publish();
		await db.insert(ticket).values({ eventId: e.id, code: 'G1', gemId: '9', amountPaid: '40' });
		const [t] = await db.select().from(ticket).where(eq(ticket.eventId, e.id));
		const r = await callAction(eventActions, 'gem', {
			user: manager,
			params: { ...params(), eventId: e.id },
			fields: { ticketId: t.id, entered: 'true' }
		});
		expect(r.status).toBe(200);
		const [after] = await db.select().from(ticket).where(eq(ticket.id, t.id));
		expect(after.enteredIntoGem).toBe(true);

		const outsider = await callAction(eventActions, 'gem', {
			user: await createUser(),
			params: { ...params(), eventId: e.id },
			fields: { ticketId: t.id, entered: 'false' }
		});
		expect(outsider.status).toBe(404);
	});
});

describe('the season', () => {
	test('eight slots, months with Opens, the next one, and every circuit’s progress', async () => {
		const where = await storeAccess(owner, 'bay-area-games');
		const at = new Date('2026-06-15T18:00:00Z');
		await publish({ eventDate: '2026-02-14T11:00' });
		await publish({ eventDate: '2026-05-09T11:00' });
		const next = await publish({ eventDate: '2026-07-11T11:00' });
		await publish({ eventDate: '2025-12-12T11:00' }); // last season

		const d = await seasonDashboard(where, at);
		expect(d).toMatchObject({ year: 2026, done: 2, scheduled: 1, toSchedule: 5 });
		expect(d.slots.filter(Boolean).map((s) => s.played)).toEqual([true, true, false]);
		expect(d.next.id).toBe(next.id);
		expect(d.months.filter((m) => m.events.length).map((m) => m.label)).toEqual([
			'Feb',
			'May',
			'Jul'
		]);
		expect(d.gap.label).toBe('Jun');
		expect(d.circuits).toEqual([
			expect.objectContaining({ name: 'Los Angeles', mine: true, played: 2, scheduled: 1, open: 5 })
		]);
	});

	test('the calendar shows every circuit’s Opens, not cancelled ones', async () => {
		await publish({ eventDate: '2026-12-12T11:00' });
		await createEvent({ circuit: 'New England', eventDate: new Date('2026-12-13T12:00:00Z') });
		await createEvent({
			circuit: 'St. Louis',
			eventDate: new Date('2026-12-19T12:00:00Z'),
			status: 'cancelled'
		});
		const cal = await ageCalendar(new Date('2026-12-01'), new Date('2027-01-01'));
		expect(cal.map((e) => [e.circuit, e.storeName])).toEqual([
			['Los Angeles', 'Bay Area Games'],
			['New England', null]
		]);
	});

	test('scheduling from the calendar fills in the day at 11 AM', async () => {
		const where = await storeAccess(owner, 'bay-area-games');
		const out = await newEventLoad({
			parent: async () => ({ where }),
			url: new URL('http://x/store/bay-area-games/events/new?date=2026-12-12')
		});
		expect(out.date).toBe('2026-12-12T11:00');
	});
});

describe('the AGE Open address', () => {
	const go = (path) =>
		handle({
			event: {
				request: new Request(`http://x${path}`),
				url: new URL(`http://x${path}`),
				locals: {},
				cookies: { get: () => undefined }
			},
			resolve: () => new Response('ok')
		});

	test('old /age-open links move to /ageopen, keeping the rest of the address', async () => {
		await expect(go('/age-open/abc123/results?x=1')).rejects.toMatchObject({
			status: 301,
			location: '/ageopen/abc123/results?x=1'
		});
		await expect(go('/age-open')).rejects.toMatchObject({ status: 301, location: '/ageopen' });
	});
});

describe('finding people to add', () => {
	beforeEach(async () => {
		await createUser({
			email: 'jordan.lee@gmail.com',
			firstName: 'Jordan',
			lastName: 'Lee',
			gemId: '4455'
		});
		await createUser({ email: 'jo@shop.test', firstName: 'Joanna', lastName: 'Park' });
		await createUser({ email: 'sam@x.test', firstName: 'Sam', lastName: 'Jordanson' });
	});

	test('by first or last name, the start of an email, or an exact GEM ID', async () => {
		expect((await searchAccounts('jo')).map((p) => p.name)).toEqual(
			expect.arrayContaining(['Jordan Lee', 'Joanna Park', 'Sam Jordanson'])
		);
		expect((await searchAccounts('jordan lee')).map((p) => p.name)).toEqual(['Jordan Lee']);
		expect((await searchAccounts('jordan.lee@')).map((p) => p.name)).toEqual(['Jordan Lee']);
		expect((await searchAccounts('4455')).map((p) => p.name)).toEqual(['Jordan Lee']);
		expect(await searchAccounts('j')).toEqual([]);
		expect(await searchAccounts('%')).toEqual([]);
	});

	test('emails come back masked', async () => {
		const [p] = await searchAccounts('jordan lee');
		expect(p).toEqual({
			id: expect.any(String),
			name: 'Jordan Lee',
			initials: 'JL',
			email: 'j•••@gmail.com',
			gemId: '4455'
		});
		expect(maskEmail('a@b.co')).toBe('a•••@b.co');
	});

	test('only the store’s people can search', async () => {
		const ask = (user) =>
			peopleSearch({
				locals: { user },
				params: params(),
				url: new URL('http://x/store/bay-area-games/people?q=jordan')
			});
		const res = await ask(manager);
		expect((await res.json()).people.map((p) => p.name)).toContain('Jordan Lee');
		await expect(ask(await createUser())).rejects.toMatchObject({ status: 404 });
	});

	test('a picked account is added to the team and to an event’s staff by id', async () => {
		const [jordan] = await searchAccounts('jordan lee');
		const team = await callAction(memberActions, 'add', {
			user: owner,
			params: params(),
			fields: { userId: jordan.id, role: 'manager' }
		});
		expect(team.data.saved).toBe('Jordan Lee added.');

		const e = await publish();
		const staff = await callAction(eventActions, 'addStaff', {
			user: manager,
			params: { ...params(), eventId: e.id },
			fields: { userId: jordan.id }
		});
		expect(staff.data.saved).toBe('Jordan Lee is on staff.');

		const none = await callAction(eventActions, 'addStaff', {
			user: manager,
			params: { ...params(), eventId: e.id },
			fields: {}
		});
		expect(none.data.error).toMatch(/Find the person/);
	});
});
