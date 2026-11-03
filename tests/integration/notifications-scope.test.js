/**
 * People who run a course (its teacher, admins and editors) hear about it in
 * the Classroom, never in My courses.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { createThread, deletePost, removePost, reply } from '$lib/server/courses/discussion.js';
import {
	listNotifications,
	markRead,
	notify,
	unreadCounts,
	unreadThreads
} from '$lib/server/courses/notifications.js';
import { createAdmin, createUser } from '../support/factories.js';
import { createTeacher, enrol, liveCourse } from '../support/courses.js';

let teacher, course, alice, bob;
beforeEach(async () => {
	teacher = await createTeacher();
	({ course } = await liveCourse(teacher));
	alice = await createUser({ firstName: 'Alice' });
	bob = await createUser({ firstName: 'Bob' });
	for (const s of [alice, bob]) await enrol(course, s);
});

const kinds = async (user, scope) =>
	(await listNotifications(user.id, { scope })).map((n) => n.kind);

describe('replies', () => {
	test('a reply to the teacher goes to the Classroom; students still get theirs', async () => {
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		await reply(t.id, teacher, { body: 'Like this.' });
		await reply(t.id, bob, { body: 'Thanks!' });

		expect(await kinds(teacher, 'learning')).toEqual([]);
		expect(await kinds(teacher, 'classroom')).toContain('course_reply');
		const [r] = (await listNotifications(teacher.id, { scope: 'classroom' })).filter(
			(n) => n.kind === 'course_reply'
		);
		expect(r.href).toBe(`/academy/${course.slug}/discussion/${t.id}`);

		// Both replies share one notification (see below).
		expect(await kinds(alice, 'learning')).toEqual(['reply']);
		expect((await unreadCounts(alice.id)).classroom).toBe(0);
	});

	test('an admin taking part hears about it in the Classroom too', async () => {
		const admin = await createAdmin();
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		await reply(t.id, admin, { body: 'An admin answer.' });
		await reply(t.id, bob, { body: 'Thanks!' });
		expect(await kinds(admin, 'learning')).toEqual([]);
		expect(await kinds(admin, 'classroom')).toContain('course_reply');
	});
});

describe('other student news', () => {
	test('the teacher’s removed post is a Classroom update', async () => {
		const admin = await createAdmin();
		const t = await createThread(course, teacher, { title: 'Welcome', body: 'Hi all' });
		await removePost(t.id, admin, { note: 'Off topic' });
		expect(await kinds(teacher, 'learning')).toEqual([]);
		expect(await kinds(teacher, 'classroom')).toContain('course_post_removed');
	});

	test('course updates and new topics skip the people who run the course', async () => {
		const editor = await createUser({ additionalRoles: ['editor'] });
		await notify([alice.id, teacher.id, editor.id], {
			kind: 'new_topic',
			courseId: course.id
		});
		expect(await kinds(alice, 'learning')).toEqual(['new_topic']);
		expect(await kinds(teacher, 'all')).toEqual([]);
		expect(await kinds(editor, 'all')).toEqual([]);
	});

	test('another teacher taking the course as a student still gets it in My courses', async () => {
		const otherTeacher = await createTeacher();
		await enrol(course, otherTeacher);
		await notify([otherTeacher.id], { kind: 'new_topic', courseId: course.id });
		expect(await kinds(otherTeacher, 'learning')).toEqual(['new_topic']);
	});
});

describe('deleted and removed posts', () => {
	test('deleting a reply takes its notifications off the feeds and the badge', async () => {
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		const r = await reply(t.id, bob, { body: 'Like this.' });
		expect(await kinds(alice, 'learning')).toEqual(['reply']);
		await deletePost(r.id, bob);
		expect(await kinds(alice, 'learning')).toEqual([]);
		expect(await unreadCounts(alice.id)).toEqual({ learning: 0, classroom: 0 });
	});

	test('deleting a conversation takes its replies’ notifications too, for everyone', async () => {
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		await reply(t.id, bob, { body: 'Like this.' });
		await reply(t.id, teacher, { body: 'Or this.' });
		expect((await unreadCounts(teacher.id)).classroom).toBeGreaterThan(0);
		await deletePost(t.id, alice);
		expect(await kinds(alice, 'all')).toEqual([]);
		expect(await kinds(bob, 'all')).toEqual([]);
		expect(await kinds(teacher, 'classroom')).toEqual([]);
	});

	test('a removed post’s notifications go, but its author keeps the removal notice', async () => {
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		const r = await reply(t.id, bob, { body: 'Something rude.' });
		await removePost(r.id, teacher, { note: 'Be kind' });
		expect(await kinds(alice, 'learning')).toEqual([]);
		expect(await kinds(bob, 'learning')).toEqual(['post_removed']);
	});
});

describe('replies in one conversation share a notification', () => {
	test('until it’s read: one row, the latest reply, who and how many', async () => {
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		await reply(t.id, bob, { body: 'One.' });
		await reply(t.id, bob, { body: 'Two.' });
		const r3 = await reply(t.id, teacher, { body: 'Three.' });

		const list = await listNotifications(alice.id, { scope: 'learning' });
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ kind: 'reply', threadId: t.id, unread: true });
		expect(list[0].data).toMatchObject({ threadId: t.id, count: 3 });
		expect(list[0].data.actorIds.sort()).toEqual([bob.id, teacher.id].sort());
		expect(list[0].actor).toBe(`${teacher.firstName} ${teacher.lastName}`.trim());
		expect(await unreadCounts(alice.id)).toEqual({ learning: 1, classroom: 0 });
		expect(r3).toBeTruthy();
	});

	test('a reply after it’s read starts a new one; other conversations stay apart', async () => {
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		const u = await createThread(course, alice, { title: 'Another', body: 'Why?' });
		await reply(t.id, bob, { body: 'One.' });
		await reply(u.id, bob, { body: 'Elsewhere.' });
		expect(await unreadCounts(alice.id)).toEqual({ learning: 2, classroom: 0 });

		await markRead(alice.id);
		await reply(t.id, bob, { body: 'Later.' });
		const list = await listNotifications(alice.id, { scope: 'learning' });
		expect(list.filter((n) => n.unread)).toHaveLength(1);
		expect(list.filter((n) => n.unread)[0].data.count).toBe(1);
		expect(list).toHaveLength(3);
	});

	test('the teacher’s Classroom version is grouped the same way', async () => {
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		await reply(t.id, teacher, { body: 'Answer.' });
		await reply(t.id, alice, { body: 'Thanks!' });
		await reply(t.id, bob, { body: 'Me too.' });
		const replies = (await listNotifications(teacher.id, { scope: 'classroom' })).filter(
			(n) => n.kind === 'course_reply'
		);
		expect(replies).toHaveLength(1);
		expect(replies[0].data.count).toBe(2);
	});
});

describe('unread conversations', () => {
	test('a conversation is unread while you have notifications about it', async () => {
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		const u = await createThread(course, alice, { title: 'Other', body: 'Why?' });
		await reply(t.id, bob, { body: 'One.' });
		await reply(t.id, teacher, { body: 'Two.' });
		await reply(u.id, bob, { body: 'Elsewhere.' });
		expect(await unreadThreads(alice.id, course.id)).toEqual({ [t.id]: 2, [u.id]: 1 });
		// The teacher: new conversations are unread for them.
		expect(Object.keys(await unreadThreads(teacher.id, course.id)).sort()).toEqual(
			[t.id, u.id].sort()
		);
	});

	test('"Mark all read" for a course clears its conversations, not other courses’', async () => {
		const other = (await liveCourse(teacher, { title: 'Other course' })).course;
		await enrol(other, alice);
		const t = await createThread(course, alice, { title: 'Question', body: 'How?' });
		const o = await createThread(other, alice, { title: 'Elsewhere', body: 'Hi' });
		await reply(t.id, bob, { body: 'One.' });
		await reply(o.id, teacher, { body: 'Two.' });
		await markRead(alice.id, null, 'learning', { courseId: course.id });
		expect(await unreadThreads(alice.id, course.id)).toEqual({});
		expect(await unreadThreads(alice.id, other.id)).toEqual({ [o.id]: 1 });
	});
});
