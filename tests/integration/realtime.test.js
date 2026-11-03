/**
 * Live updates (Supabase Realtime): what the server announces on which
 * channel, and the tokens browsers join with. Nothing is sent anywhere: a
 * fake sender records the messages.
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { db } from '$lib/server/db/index.js';
import { courseEnrollment, eventStaff, ticket } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import {
	publish,
	realtimeClientConfig,
	realtimeToken,
	setRealtimeSender
} from '$lib/server/realtime.js';
import { createThread, reply, setMuted } from '$lib/server/courses/discussion.js';
import { markRead, notify, unreadCounts } from '$lib/server/courses/notifications.js';
import { removeStudent } from '$lib/server/courses/roster.js';
import { GET as tokenRoute } from '../../src/routes/api/realtime/token/+server.js';
import { GET as unreadRoute } from '../../src/routes/api/notifications/unread/+server.js';
import { POST as seenRoute } from '../../src/routes/api/notifications/seen/+server.js';
import { GET as liveRoute } from '../../src/routes/api/academy/[slug]/discussion/live/+server.js';
import { actions as staffActions } from '../../src/routes/staff/[eventId]/+page.server.js';
import { createEvent, createUser } from '../support/factories.js';
import { callAction } from '../support/actions.js';
import { callRoute, createTeacher, enrol, liveCourse } from '../support/courses.js';

const SECRET = 'test-jwt-secret-that-is-long-enough-for-hs256';
/** @type {{ topic: string, event: string, payload: any }[]} */
let sent;

function switchOn() {
	env.REALTIME_ENABLED = 'true';
	env.SUPABASE_URL = 'https://example.supabase.co';
	env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
	env.SUPABASE_JWT_SECRET = SECRET;
	publicEnv.PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
}

beforeEach(() => {
	sent = [];
	setRealtimeSender(async (messages) => {
		sent.push(...messages);
	});
	switchOn();
});

afterEach(() => {
	env.REALTIME_ENABLED = '';
	env.SUPABASE_URL = '';
	env.SUPABASE_SERVICE_ROLE_KEY = '';
	env.SUPABASE_JWT_SECRET = '';
	publicEnv.PUBLIC_SUPABASE_ANON_KEY = '';
});

const on = (topic, event) => sent.filter((m) => m.topic === topic && m.event === event);

describe('tokens', () => {
	test('signed with the JWT secret, for this user, for an hour', () => {
		const user = { id: 'u-1' };
		const now = Date.UTC(2026, 10, 3);
		const { token, expiresAt } = /** @type {any} */ (realtimeToken(user, now));
		const [head, body, sig] = token.split('.');
		expect(createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url')).toBe(sig);
		const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
		expect(claims).toMatchObject({ sub: 'u-1', role: 'authenticated', aud: 'authenticated' });
		expect(claims.exp - claims.iat).toBe(3600);
		expect(expiresAt).toBe(claims.exp * 1000);
	});

	test('the endpoint needs a signed-in user, and is off when live updates are', async () => {
		expect((await callRoute(tokenRoute, { method: 'GET' })).status).toBe(401);
		const user = await createUser();
		const ok = await callRoute(tokenRoute, { method: 'GET', user });
		expect(ok.status).toBe(200);
		expect(ok.body.token.split('.')).toHaveLength(3);

		env.REALTIME_ENABLED = '';
		expect((await callRoute(tokenRoute, { method: 'GET', user })).status).toBe(404);
		expect(realtimeClientConfig()).toBeNull();
	});

	test('off unless every key is set', () => {
		expect(realtimeClientConfig()).toEqual({ url: 'https://example.supabase.co', key: 'anon-key' });
		env.SUPABASE_JWT_SECRET = '';
		expect(realtimeClientConfig()).toBeNull();
		expect(realtimeToken({ id: 'u-1' })).toBeNull();
	});
});

describe('publishing', () => {
	test('never throws, and sends nothing when off', async () => {
		setRealtimeSender(async () => {
			throw new Error('down');
		});
		await expect(publish('user:x', 'notes')).resolves.toBeUndefined();
	});

	test('one event to many topics goes in batches of 100', async () => {
		const batches = [];
		setRealtimeSender(async (m) => batches.push(m.length));
		await publish(
			Array.from({ length: 230 }, (_, i) => `user:${i}`),
			'notes'
		);
		expect(batches).toEqual([100, 100, 30]);
	});
});

describe('notification badges', () => {
	test('each person notified hears about it (never the actor), and reading clears other tabs', async () => {
		const [a, b, actor] = [await createUser(), await createUser(), await createUser()];
		await notify([a.id, b.id, actor.id], { kind: 'course_update', actorId: actor.id });
		expect(sent.map((m) => m.topic).sort()).toEqual([`user:${a.id}`, `user:${b.id}`].sort());
		expect(sent[0]).toMatchObject({ event: 'notes', payload: { kind: 'course_update' } });

		sent = [];
		await markRead(a.id);
		expect(on(`user:${a.id}`, 'notes')).toHaveLength(1);
	});

	test('the badge endpoint returns the counts', async () => {
		const a = await createUser();
		await notify([a.id], { kind: 'course_update' });
		await notify([a.id], { kind: 'new_student' });
		const r = await callRoute(unreadRoute, { method: 'GET', user: a });
		expect(r.body).toEqual({ learning: 1, classroom: 1 });
		expect((await callRoute(unreadRoute, { method: 'GET' })).status).toBe(401);
	});
});

describe('course discussion', () => {
	let teacher, course, alice, bob;
	beforeEach(async () => {
		teacher = await createTeacher();
		({ course } = await liveCourse(teacher));
		alice = await createUser({ firstName: 'Alice' });
		bob = await createUser({ firstName: 'Bob' });
		for (const s of [alice, bob]) await enrol(course, s);
		sent = [];
	});

	test('every change is announced on the course channel, with ids only', async () => {
		const t = await createThread(course, alice, { title: 'Hi', body: 'Hello class' });
		const r = await reply(t.id, bob, { body: 'Hello!' });
		const changes = on(`course:${course.id}`, 'changed').map((m) => m.payload);
		expect(changes).toEqual([
			{ kind: 'thread', threadId: t.id },
			{ kind: 'reply', threadId: t.id, postId: r.id }
		]);
		expect(JSON.stringify(changes)).not.toContain('Hello');
	});

	test('muting or removing a student tells their open page', async () => {
		await setMuted(course, bob.id, teacher, true);
		expect(on(`course:${course.id}`, 'changed').at(-1)?.payload).toEqual({
			kind: 'muted',
			userId: bob.id
		});
		const [en] = await db
			.select()
			.from(courseEnrollment)
			.where(and(eq(courseEnrollment.courseId, course.id), eq(courseEnrollment.userId, alice.id)));
		const admin = await createUser({ role: 'admin' });
		await removeStudent(course, en.id, admin);
		expect(on(`course:${course.id}`, 'changed').at(-1)?.payload).toEqual({
			kind: 'removed',
			userId: alice.id
		});
	});

	test('the page learns which channel to join, and who it is', async () => {
		const r = await callRoute(liveRoute, {
			method: 'GET',
			user: alice,
			params: { slug: course.slug }
		});
		expect(r.body).toMatchObject({
			courseId: course.id,
			me: { id: alice.id, name: 'Alice' },
			post: true
		});
	});
});

describe('staff console', () => {
	test('a GEM mark is announced to the event’s staff, and only for its own tickets', async () => {
		const ev = await createEvent();
		const other = await createEvent();
		const staff = await createUser();
		await db.insert(eventStaff).values({ userId: staff.id, eventId: ev.id });
		const [mine] = await db
			.insert(ticket)
			.values({ eventId: ev.id, code: randomUUID().slice(0, 8) })
			.returning();
		const [theirs] = await db
			.insert(ticket)
			.values({ eventId: other.id, code: randomUUID().slice(0, 8) })
			.returning();

		const ok = await callAction(staffActions, 'toggleGemEntry', {
			user: staff,
			params: { eventId: ev.id },
			fields: { ticketId: mine.id, enteredIntoGem: 'true' }
		});
		expect(ok.status).toBe(200);
		expect(on(`staff:${ev.id}`, 'gem').map((m) => m.payload)).toEqual([
			{ ticketId: mine.id, entered: true }
		]);

		const refused = await callAction(staffActions, 'toggleGemEntry', {
			user: staff,
			params: { eventId: ev.id },
			fields: { ticketId: theirs.id, enteredIntoGem: 'true' }
		});
		expect(refused.status).toBe(404);
		const [still] = await db.select().from(ticket).where(eq(ticket.id, theirs.id));
		expect(still.enteredIntoGem).toBeFalsy();
	});
});

describe('opening a notification’s page reads it', () => {
	test('a reply is read when its conversation is opened, however you got there', async () => {
		const teacher = await createTeacher();
		const { course } = await liveCourse(teacher);
		const alice = await createUser({ firstName: 'Alice' });
		const bob = await createUser({ firstName: 'Bob' });
		for (const s of [alice, bob]) await enrol(course, s);
		const t = await createThread(course, alice, { title: 'Hi', body: 'Hello class' });
		await reply(t.id, bob, { body: 'Hello!' });
		expect(await unreadCounts(alice.id)).toEqual({ learning: 1, classroom: 0 });

		// Somewhere else: nothing changes.
		let r = await callRoute(seenRoute, { user: alice, body: { path: `/academy/${course.slug}` } });
		expect(r.body).toEqual({ marked: 0, counts: { learning: 1, classroom: 0 } });

		// The conversation itself (a trailing slash is the same page).
		r = await callRoute(seenRoute, {
			user: alice,
			body: { path: `/academy/${course.slug}/discussion/${t.id}/` }
		});
		expect(r.body).toEqual({ marked: 1, counts: { learning: 0, classroom: 0 } });
		expect(on(`user:${alice.id}`, 'notes').length).toBeGreaterThan(0);

		// The teacher's "new conversation" stays until they open it.
		expect((await unreadCounts(teacher.id)).classroom).toBe(1);
	});

	test('needs a signed-in user and a page', async () => {
		expect((await callRoute(seenRoute, { body: { path: '/' } })).status).toBe(401);
		const a = await createUser();
		expect((await callRoute(seenRoute, { user: a, body: { path: 'nope' } })).status).toBe(400);
	});
});
