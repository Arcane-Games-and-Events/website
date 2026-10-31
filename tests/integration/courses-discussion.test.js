/**
 * Course discussion with heavy moderation, and the notifications it sends.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseEnrollment, coursePost, notification } from '$lib/server/db/schema.js';
import { POST as moderateRoute } from '../../src/routes/api/academy/discussion/[postId]/moderate/+server.js';
import {
	approvePost,
	createThread,
	deletePost,
	editPost,
	getThread,
	listThreads,
	postUpdate,
	removePost,
	reply,
	reportPost,
	reviewQueue,
	setMuted,
	setThreadFlag
} from '$lib/server/courses/discussion.js';
import { listNotifications, markRead, unreadCount } from '$lib/server/courses/notifications.js';
import { createAdmin, createUser } from '../support/factories.js';
import { callRoute, createTeacher, enrol, liveCourse } from '../support/courses.js';

let teacher;
let course;
let alice;
let bob;
let cara;

beforeEach(async () => {
	teacher = await createTeacher();
	({ course } = await liveCourse(teacher));
	alice = await createUser({ firstName: 'Alice' });
	bob = await createUser({ firstName: 'Bob' });
	cara = await createUser({ firstName: 'Cara' });
	for (const s of [alice, bob, cara]) await enrol(course, s);
});

const notesFor = (u, kind) =>
	db
		.select()
		.from(notification)
		.where(and(eq(notification.userId, u.id), eq(notification.kind, kind)));
const titles = async (viewer) => (await listThreads(course, viewer)).map((t) => t.title);
const thread = (who = alice, title = 'How do I block?', body = 'Asking about topic 2.') =>
	createThread(course, who, { title, body });

describe('who can take part', () => {
	test('only the course’s students, its teacher and admins', async () => {
		const stranger = await createUser();
		await expect(listThreads(course, stranger)).rejects.toMatchObject({ status: 403 });
		await expect(thread(stranger)).rejects.toMatchObject({ status: 403 });
		await expect(listThreads(course, null)).rejects.toMatchObject({ status: 401 });
		await thread();
		expect(await titles(bob)).toEqual(['How do I block?']);
		expect(await titles(teacher)).toEqual(['How do I block?']);
		expect(await titles(await createAdmin())).toEqual(['How do I block?']);
	});

	test('a removed student loses the discussion', async () => {
		await db
			.update(courseEnrollment)
			.set({ revokedAt: new Date() })
			.where(eq(courseEnrollment.userId, bob.id));
		await expect(listThreads(course, bob)).rejects.toMatchObject({ status: 403 });
	});
});

describe('threads, replies and notifications', () => {
	test('a new thread tells the teacher; a reply tells everyone in the thread but the replier', async () => {
		const t = await thread();
		expect(await notesFor(teacher, 'new_thread')).toHaveLength(1);

		await reply(t.id, bob, { body: 'Block with the yellow.' });
		await reply(t.id, cara, { body: 'Or pitch it.' });
		expect(await notesFor(alice, 'reply')).toHaveLength(2);
		expect(await notesFor(bob, 'reply')).toHaveLength(1); // Cara's
		expect(await notesFor(cara, 'reply')).toHaveLength(0);

		const view = await getThread(course, bob, t.id);
		expect(view.replies.map((r) => r.body)).toEqual(['Block with the yellow.', 'Or pitch it.']);
	});

	test('a teacher update is pinned and reaches every student', async () => {
		await thread();
		await postUpdate(course, teacher, {
			title: 'New topic up',
			body: 'Check out the new section.'
		});
		const list = await listThreads(course, alice);
		expect(list[0]).toMatchObject({
			title: 'New topic up',
			kind: 'update',
			pinned: true,
			isTeacher: true
		});
		for (const s of [alice, bob, cara]) expect(await notesFor(s, 'course_update')).toHaveLength(1);
		await expect(postUpdate(course, alice, { title: 'x', body: 'y' })).rejects.toMatchObject({
			status: 403
		});
	});

	test('a locked thread takes no more replies from students; deleted posts disappear', async () => {
		const t = await thread();
		await setThreadFlag(t.id, teacher, 'locked', true);
		await expect(reply(t.id, bob, { body: 'hello?' })).rejects.toMatchObject({ status: 409 });
		await reply(t.id, teacher, { body: 'Answered in the update.' });

		await deletePost(t.id, alice);
		expect(await titles(bob)).toEqual([]);
		const other = await thread(bob, 'Mine');
		await expect(deletePost(other.id, alice)).rejects.toMatchObject({ status: 403 });
	});

	test('the dashboard feed links each notification and counts what’s unread', async () => {
		const t = await thread();
		await reply(t.id, bob, { body: 'Reply!' });
		const [n] = await listNotifications(alice.id);
		expect(n).toMatchObject({ kind: 'reply', unread: true, threadTitle: 'How do I block?' });
		expect(n.href).toBe(`/academy/${course.slug}/discussion/${t.id}`);
		expect(n.actor).toMatch(/^Bob/);
		expect(await unreadCount(alice.id)).toBe(1);
		await markRead(alice.id);
		expect(await unreadCount(alice.id)).toBe(0);
	});
});

describe('moderation', () => {
	test('a post that trips the filter is held: hidden from others, announced only once approved', async () => {
		const t = await thread(alice, 'This matchup', 'This matchup is fucking impossible');
		expect(t.status).toBe('held');
		expect(t.flagReasons).toContain('profanity:fucking');
		expect(await titles(bob)).toEqual([]);
		expect(await titles(alice)).toEqual(['This matchup']); // the author sees it
		expect(await titles(teacher)).toEqual(['This matchup']); // and the teacher
		expect(await notesFor(teacher, 'new_thread')).toHaveLength(0);

		const [queued] = await reviewQueue([course.id]);
		expect(queued).toMatchObject({ id: t.id, status: 'held' });

		await approvePost(t.id, teacher);
		expect(await titles(bob)).toEqual(['This matchup']);
		expect(await reviewQueue([course.id])).toHaveLength(0);
	});

	test('a held reply tells the thread only when approved', async () => {
		const t = await thread();
		const r = await reply(t.id, bob, { body: 'DM me at bob@mail.test for the list' });
		expect(r.status).toBe('held');
		expect(await notesFor(alice, 'reply')).toHaveLength(0);
		await approvePost(r.id, teacher);
		expect(await notesFor(alice, 'reply')).toHaveLength(1);
	});

	test('one report queues a post, three hide it, and approving it sends nothing new', async () => {
		const t = await thread();
		const dave = await createUser();
		await enrol(course, dave);
		await reportPost(t.id, bob, { reason: 'rude' });
		let [q] = await reviewQueue([course.id]);
		expect(q).toMatchObject({ id: t.id, status: 'visible' });
		expect(q.reports).toHaveLength(1);
		await reportPost(t.id, bob, { reason: 'again' }); // the same student twice counts once
		await reportPost(t.id, cara);
		expect(await titles(dave)).toEqual(['How do I block?']);
		await reportPost(t.id, dave);
		expect(await titles(dave)).toEqual([]);
		[q] = await reviewQueue([course.id]);
		expect(q.flagReasons).toContain('reported');

		const before = (await notesFor(teacher, 'new_thread')).length;
		await approvePost(t.id, teacher);
		expect(await titles(dave)).toEqual(['How do I block?']);
		expect(await reviewQueue([course.id])).toHaveLength(0);
		expect(await notesFor(teacher, 'new_thread')).toHaveLength(before);
		await expect(reportPost(t.id, alice)).rejects.toMatchObject({ status: 400 });
	});

	test('removing a post tells its author why; removing and muting stops them posting', async () => {
		const t = await thread(bob, 'Spam', 'Buy cheap cards at cardz.ru');
		await removePost(t.id, teacher, { note: 'No selling here.', mute: true });
		const [note] = await notesFor(bob, 'post_removed');
		expect(note.data).toMatchObject({ note: 'No selling here.' });
		expect(await titles(bob)).toEqual([]);
		await expect(thread(bob, 'Hi', 'hello')).rejects.toMatchObject({ status: 403 });
		expect(await listThreads(course, bob)).toEqual([]); // can still read
		await setMuted(course, bob.id, teacher, false);
		expect((await thread(bob, 'Sorry', 'won’t happen again')).status).toBe('visible');
	});

	test('only the course’s teacher or an admin can moderate', async () => {
		const t = await thread();
		const otherTeacher = await createTeacher();
		for (const who of [bob, otherTeacher]) {
			const r = await callRoute(moderateRoute, {
				params: { postId: t.id },
				user: who,
				body: { action: 'remove' }
			});
			expect(r.status).toBe(403);
		}
		const r = await callRoute(moderateRoute, {
			params: { postId: t.id },
			user: await createAdmin(),
			body: { action: 'pin' }
		});
		expect(r.status).toBe(200);
		const [row] = await db.select().from(coursePost).where(eq(coursePost.id, t.id));
		expect(row.pinned).toBe(true);
	});

	test('an edit that adds bad language is held again, without a second announcement', async () => {
		const t = await thread();
		const edited = await editPost(t.id, alice, { title: t.title, body: 'nvm this is shit' });
		expect(edited.status).toBe('held');
		expect(edited.flagReasons).toEqual(expect.arrayContaining(['profanity:shit', 'edited']));
		expect(await titles(bob)).toEqual([]);
		await approvePost(t.id, teacher);
		expect(await notesFor(teacher, 'new_thread')).toHaveLength(1);
		await expect(editPost(t.id, bob, { body: 'hijack' })).rejects.toMatchObject({ status: 403 });
	});

	test('the teacher’s own words are checked but never held', async () => {
		const t = await thread(teacher, 'Hot take', 'This card is shit, never play it');
		expect(t.status).toBe('visible');
		expect(t.flagReasons).toContain('profanity:shit');
	});

	test('posting too fast is held', async () => {
		const t = await thread();
		for (let i = 0; i < 5; i++) await reply(t.id, bob, { body: `point number ${i}` });
		const sixth = await reply(t.id, bob, { body: 'and another thing' });
		expect(sixth.status).toBe('held');
		expect(sixth.flagReasons).toContain('spam:too-fast');
	});
});
