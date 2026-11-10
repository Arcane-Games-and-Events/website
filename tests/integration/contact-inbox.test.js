/**
 * The contact inbox: messages to AGE answered on the site, never by email.
 * Guests and members write from /contact; admins read and reply from the
 * Inbox; members follow replies in Account → Messages, guests on a private
 * link; unread counts drive the badges; internal notes stay with staff.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { contactMessage, contactThread, order } from '$lib/server/db/schema.js';
import {
	actions as contactActions,
	load as contactLoad
} from '../../src/routes/contact/+page.server.js';
import {
	actions as guestActions,
	load as guestLoad
} from '../../src/routes/contact/t/[token]/+page.server.js';
import { load as messagesLoad } from '../../src/routes/account/(hub)/messages/+page.server.js';
import {
	actions as memberActions,
	load as memberLoad
} from '../../src/routes/account/(hub)/messages/[id]/+page.server.js';
import { load as inboxLayout } from '../../src/routes/admin/inbox/+layout.server.js';
import {
	actions as staffActions,
	load as staffLoad
} from '../../src/routes/admin/inbox/[id]/+page.server.js';
import { cachedMessageCounts } from '$lib/server/contact/inbox.js';
import { callAction } from '../support/actions.js';
import { createAdmin, createUser } from '../support/factories.js';

let admin;
let member;

beforeEach(async () => {
	admin = await createAdmin({ firstName: 'Ada', lastName: 'Admin' });
	member = await createUser({ firstName: 'Mia', lastName: 'Member' });
});

const url = (path) => new URL(`http://localhost${path}`);
const cookieJar = () => {
	const jar = new Map();
	return {
		get: (k) => jar.get(k),
		set: (k, v) => jar.set(k, v),
		delete: (k) => jar.delete(k)
	};
};

async function guestSends(fields = {}) {
	const r = await callAction(contactActions, 'default', {
		fields: {
			name: 'Gina Guest',
			email: 'Gina@Example.com',
			topic: 'events',
			subject: 'Seats in Boston',
			body: 'Are there seats left?',
			...fields
		}
	});
	return r;
}

async function memberSends(user = member) {
	const r = await callAction(contactActions, 'default', {
		user,
		fields: { topic: 'orders', subject: 'My receipt', body: 'Where is my receipt?' }
	});
	const id = r.redirect.split('/').pop().split('?')[0];
	return { r, id };
}

/** Run a load and return its data or where it redirected. */
async function run(load, event) {
	try {
		return { data: await load({ depends: () => {}, cookies: cookieJar(), ...event }) };
	} catch (err) {
		if (err?.status >= 300 && err?.status < 400) return { redirect: err.location };
		return { status: err?.status };
	}
}

const staffCounts = () => cachedMessageCounts(admin);
const memberCounts = () => cachedMessageCounts(member);

describe('writing to AGE', () => {
	test('a guest gets a private link; the inbox shows it unread', async () => {
		const r = await guestSends();
		expect(r.status).toBe(303);
		expect(r.redirect).toMatch(/^\/contact\/t\/[\w-]{20,}\?sent=1$/);
		const [t] = await db.select().from(contactThread);
		expect(t).toMatchObject({
			userId: null,
			name: 'Gina Guest',
			email: 'gina@example.com',
			topic: 'events',
			status: 'open'
		});
		expect((await staffCounts()).inbox).toBe(1);
		// Only admins count the inbox.
		expect((await memberCounts()).inbox).toBe(0);
	});

	test('a signed-in member writes as their account and lands in Messages', async () => {
		const { r, id } = await memberSends();
		expect(r.redirect).toBe(`/account/messages/${id}?sent=1`);
		const [t] = await db.select().from(contactThread).where(eq(contactThread.id, id));
		expect(t).toMatchObject({ userId: member.id, name: 'Mia Member', email: member.email });
	});

	test('missing pieces are sent back with what was typed', async () => {
		const r = await guestSends({ subject: '  ' });
		expect(r.status).toBe(400);
		expect(r.data).toMatchObject({ error: 'Add a subject.', body: 'Are there seats left?' });
		expect((await guestSends({ email: 'nope' })).status).toBe(400);
		expect(await db.select().from(contactThread)).toHaveLength(0);
	});
});

describe('the conversation', () => {
	test('an admin reads, replies and marks it done; the member sees a badge until they open it', async () => {
		const { id } = await memberSends();

		const opened = await run(staffLoad, { params: { id }, locals: { user: admin } });
		expect(opened.data.thread.messages).toHaveLength(1);
		expect((await staffCounts()).inbox).toBe(0);

		const reply = await callAction(staffActions, 'reply', {
			params: { id },
			user: admin,
			fields: { body: 'Sent it again, check Purchases.', internal: '0', done: '1' }
		});
		expect(reply.data).toEqual({ sent: 'reply' });
		expect((await memberCounts()).messages).toBe(1);

		const list = await messagesLoad({ locals: { user: member } });
		expect(list.threads[0]).toMatchObject({ id, unread: true, status: 'done' });
		expect(list.threads[0].last).toMatchObject({ fromStaff: true });

		const seen = await run(memberLoad, {
			params: { id },
			locals: { user: member },
			url: url(`/account/messages/${id}`)
		});
		expect(seen.data.thread.messages.map((m) => m.fromStaff)).toEqual([false, true]);
		expect(seen.data.thread.messages[1].authorFirst).toBe('Ada');
		expect((await memberCounts()).messages).toBe(0);
	});

	test('internal notes stay with staff and don’t count as a reply', async () => {
		const { id } = await memberSends();
		await callAction(staffActions, 'reply', {
			params: { id },
			user: admin,
			fields: { body: 'Check the gateway first.', internal: '1' }
		});
		expect((await memberCounts()).messages).toBe(0);
		const mine = await run(memberLoad, {
			params: { id },
			locals: { user: member },
			url: url(`/account/messages/${id}`)
		});
		expect(mine.data.thread.messages).toHaveLength(1);
		const staff = await run(staffLoad, { params: { id }, locals: { user: admin } });
		expect(staff.data.thread.messages.map((m) => m.internal)).toEqual([false, true]);
	});

	test('writing back reopens a done conversation and makes it unread for staff', async () => {
		const { id } = await memberSends();
		await run(staffLoad, { params: { id }, locals: { user: admin } });
		await callAction(staffActions, 'status', {
			params: { id },
			user: admin,
			fields: { status: 'done' }
		});
		expect(
			(await inboxLayout({ url: url('/admin/inbox'), depends: () => {} })).threads
		).toHaveLength(0);

		const r = await callAction(memberActions, 'default', {
			params: { id },
			user: member,
			fields: { body: 'One more thing.' }
		});
		expect(r.data).toEqual({ replied: true });
		const [t] = await db.select().from(contactThread).where(eq(contactThread.id, id));
		expect(t.status).toBe('open');
		expect((await staffCounts()).inbox).toBe(1);
	});

	test('mark unread puts it back for whoever looks next', async () => {
		const { id } = await memberSends();
		await run(staffLoad, { params: { id }, locals: { user: admin } });
		const r = await callAction(staffActions, 'unread', {
			params: { id },
			user: admin,
			fields: { back: '?show=all' }
		});
		expect(r.redirect).toBe('/admin/inbox?show=all');
		expect((await staffCounts()).inbox).toBe(1);
	});

	test('nobody else can open a member’s conversation', async () => {
		const { id } = await memberSends();
		const other = await createUser();
		const r = await run(memberLoad, {
			params: { id },
			locals: { user: other },
			url: url(`/account/messages/${id}`)
		});
		expect(r.status).toBe(404);
		const reply = await callAction(memberActions, 'default', {
			params: { id },
			user: other,
			fields: { body: 'hi' }
		}).catch((err) => ({ status: err.status }));
		expect(reply.status).toBe(404);
	});
});

describe('guests', () => {
	test('the private link shows the conversation and takes replies', async () => {
		const r = await guestSends();
		const token = r.redirect.split('/').pop().split('?')[0];
		const [t] = await db.select().from(contactThread);
		await callAction(staffActions, 'reply', {
			params: { id: t.id },
			user: admin,
			fields: { body: 'Yes, 12 left.', internal: '0' }
		});

		const page = await run(guestLoad, {
			params: { token },
			locals: { user: null },
			url: url(`/contact/t/${token}`)
		});
		expect(page.data.thread.messages.map((m) => m.body)).toEqual([
			'Are there seats left?',
			'Yes, 12 left.'
		]);
		expect(page.data.thread.token).toBeUndefined();

		const back = await callAction(guestActions, 'default', {
			params: { token },
			fields: { body: 'Great, thanks!' }
		});
		expect(back.data).toEqual({ replied: true });
		expect(await db.select().from(contactMessage)).toHaveLength(3);

		expect(
			(await run(guestLoad, { params: { token: 'nope' }, locals: {}, url: url('/contact/t/nope') }))
				.status
		).toBe(404);
	});

	test('the contact page lists what this browser sent', async () => {
		const r = await guestSends();
		const token = r.redirect.split('/').pop().split('?')[0];
		const cookies = cookieJar();
		cookies.set('age_contact', token);
		const data = await contactLoad({ locals: { user: null }, cookies, url: url('/contact') });
		expect(data.threads).toHaveLength(1);
		expect(data.threads[0].href).toBe(`/contact/t/${token}`);
		expect(data.threads[0].token).toBeUndefined();
	});

	test('opening the link signed in with the same email moves it into the account', async () => {
		const gina = await createUser({ email: 'gina@example.com' });
		const r = await guestSends();
		const token = r.redirect.split('/').pop().split('?')[0];
		const [t] = await db.select().from(contactThread);

		const other = await run(guestLoad, {
			params: { token },
			locals: { user: member },
			url: url(`/contact/t/${token}`)
		});
		expect(other.data).toBeTruthy();

		const mine = await run(guestLoad, {
			params: { token },
			locals: { user: gina },
			url: url(`/contact/t/${token}`)
		});
		expect(mine.redirect).toBe(`/account/messages/${t.id}`);
		const [after] = await db.select().from(contactThread);
		expect(after.userId).toBe(gina.id);
	});
});

describe('the inbox list', () => {
	test('filters and search', async () => {
		await guestSends();
		const { id } = await memberSends();
		await callAction(staffActions, 'status', {
			params: { id },
			user: admin,
			fields: { status: 'done' }
		});

		const open = await inboxLayout({ url: url('/admin/inbox'), depends: () => {} });
		expect(open.threads.map((t) => t.subject)).toEqual(['Seats in Boston']);
		expect(open.counts).toMatchObject({ open: 1, unread: 1, done: 1, all: 2 });

		const done = await inboxLayout({ url: url('/admin/inbox?show=done'), depends: () => {} });
		expect(done.threads.map((t) => t.subject)).toEqual(['My receipt']);

		// Message text is searched too.
		const inBody = await inboxLayout({
			url: url('/admin/inbox?show=all&q=seats%20left'),
			depends: () => {}
		});
		expect(inBody.threads.map((t) => t.subject)).toEqual(['Seats in Boston']);
		expect(inBody.threads[0].messages).toBe(1);

		const found = await inboxLayout({
			url: url('/admin/inbox?show=all&q=receipt'),
			depends: () => {}
		});
		expect(found.threads).toHaveLength(1);
		const byEmail = await inboxLayout({
			url: url('/admin/inbox?show=all&q=gina@'),
			depends: () => {}
		});
		expect(byEmail.threads.map((t) => t.name)).toEqual(['Gina Guest']);
	});
});

describe('who wrote', () => {
	const addOrder = (fields) =>
		db
			.insert(order)
			.values({ provider: 'authnet', providerRef: `ref-${Math.random()}`, ...fields });

	test('a member’s profile: orders by account or email, refunds taken off', async () => {
		await addOrder({
			userId: member.id,
			amount: '40.00',
			meta: { type: 'ticket', eventTitle: 'AGE Open LA' }
		});
		await addOrder({
			userEmail: member.email.toUpperCase(),
			amount: '25.00',
			refundedAmount: '25.00'
		});
		const { id } = await memberSends();
		const opened = await run(staffLoad, { params: { id }, locals: { user: admin } });
		const p = opened.data.profile;
		expect(p.account).toMatchObject({ id: member.id, firstName: 'Mia' });
		expect(p.matchedByEmail).toBe(false);
		expect(p.orders).toMatchObject({ count: 2, spent: 40 });
		expect(p.orders.recent.map((o) => o.label)).toContain('AGE Open LA');
		expect(p.href).toBe(`/admin/customers/${member.id}`);
	});

	test('a guest whose email has an account is matched to it', async () => {
		await createUser({ email: 'gina@example.com', firstName: 'Gina' });
		await guestSends();
		const [t] = await db.select().from(contactThread);
		const p = (await run(staffLoad, { params: { id: t.id }, locals: { user: admin } })).data
			.profile;
		expect(p.matchedByEmail).toBe(true);
		expect(p.account.firstName).toBe('Gina');
	});

	test('a guest with only orders links to the customer page by email; one with nothing has no profile', async () => {
		await guestSends();
		const [t] = await db.select().from(contactThread);
		expect(
			(await run(staffLoad, { params: { id: t.id }, locals: { user: admin } })).data.profile
		).toBeNull();
		await addOrder({ userEmail: 'gina@example.com', amount: '40.00' });
		const p = (await run(staffLoad, { params: { id: t.id }, locals: { user: admin } })).data
			.profile;
		expect(p).toMatchObject({ account: undefined, orders: { count: 1 } });
		expect(p.href).toBe('/admin/customers/gina%40example.com');
	});
});
