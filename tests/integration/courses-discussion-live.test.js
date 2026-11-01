/**
 * The live discussion: the change counter open pages poll, and who's typing.
 * Redis is off in tests, so this runs on the in-memory fallback, which keeps
 * the same rules.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GET as liveRoute } from '../../src/routes/api/academy/[slug]/discussion/live/+server.js';
import { POST as typingRoute } from '../../src/routes/api/academy/[slug]/discussion/typing/+server.js';
import {
	createThread,
	deletePost,
	editPost,
	reply,
	setMuted,
	setThreadFlag
} from '$lib/server/courses/discussion.js';
import { liveState, setTyping, TYPING_MS } from '$lib/server/courses/live.js';
import { createUser } from '../support/factories.js';
import { callRoute, createTeacher, enrol, liveCourse } from '../support/courses.js';

let teacher;
let course;
let alice;
let bob;

beforeEach(async () => {
	teacher = await createTeacher();
	({ course } = await liveCourse(teacher));
	alice = await createUser({ firstName: 'Alice' });
	bob = await createUser({ firstName: 'Bob' });
	for (const s of [alice, bob]) await enrol(course, s);
});

const version = async () => (await liveState(course.id, alice.id)).v;

describe('the change counter', () => {
	test('moves with every change to the discussion', async () => {
		let v = await version();
		const next = async () => {
			const now = await version();
			expect(now).toBeGreaterThan(v);
			v = now;
		};
		const t = await createThread(course, alice, { title: 'Hi', body: 'Hello class' });
		await next();
		const r = await reply(t.id, bob, { body: 'Hello!' });
		await next();
		await editPost(r.id, bob, { body: 'Hello there!' });
		await next();
		await setThreadFlag(t.id, teacher, 'pinned', true);
		await next();
		await deletePost(r.id, bob);
		await next();
		await setMuted(course, bob.id, teacher, true);
		await next();
	});
});

describe('who’s typing', () => {
	test('others see it; it fades on its own, and stops when the reply is sent', async () => {
		const t = await createThread(course, alice, { title: 'Hi', body: 'Hello class' });
		await setTyping(course.id, t.id, bob);
		expect((await liveState(course.id, alice.id)).typing).toEqual([{ thread: t.id, name: 'Bob' }]);
		expect((await liveState(course.id, bob.id)).typing).toEqual([]); // not to yourself

		await reply(t.id, bob, { body: 'Done typing.' });
		expect((await liveState(course.id, alice.id)).typing).toEqual([]);

		await setTyping(course.id, t.id, bob);
		vi.useFakeTimers({ now: Date.now() + TYPING_MS + 1, toFake: ['Date'] });
		try {
			expect((await liveState(course.id, alice.id)).typing).toEqual([]);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('the endpoints', () => {
	test('only the course’s students and teacher can watch; only posters can type', async () => {
		const t = await createThread(course, alice, { title: 'Hi', body: 'Hello class' });
		const params = { slug: course.slug };
		const stranger = await createUser();

		expect((await callRoute(liveRoute, { method: 'GET', params, user: null })).status).toBe(401);
		expect((await callRoute(liveRoute, { method: 'GET', params, user: stranger })).status).toBe(
			403
		);
		const ok = await callRoute(liveRoute, { method: 'GET', params, user: alice });
		expect(ok.status).toBe(200);
		expect(ok.body).toMatchObject({ v: expect.any(Number), typing: [] });

		const typed = await callRoute(typingRoute, { params, user: alice, body: { threadId: t.id } });
		expect(typed.status).toBe(200);
		expect((await liveState(course.id, bob.id)).typing).toEqual([{ thread: t.id, name: 'Alice' }]);
		expect(
			(await callRoute(typingRoute, { params, user: stranger, body: { threadId: t.id } })).status
		).toBe(403);
		expect(
			(await callRoute(typingRoute, { params, user: alice, body: { threadId: 'nope' } })).status
		).toBe(400);

		await setMuted(course, bob.id, teacher, true);
		expect(
			(await callRoute(typingRoute, { params, user: bob, body: { threadId: t.id } })).status
		).toBe(403);
	});
});
