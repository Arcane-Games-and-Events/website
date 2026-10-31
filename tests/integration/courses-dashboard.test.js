/**
 * My courses (/my-courses): the feed of what's new across a student's
 * courses, and the activity their stats are built from.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskLesson } from '$lib/server/db/schema.js';
import { courseFeed, learnerActivity } from '$lib/server/courses/dashboard.js';
import { createThread, postUpdate, reply } from '$lib/server/courses/discussion.js';
import { setComplete } from '$lib/server/courses/progress.js';
import { createTopic, publishTopic, updateTopic } from '$lib/server/courses/builder.js';
import { load } from '../../src/routes/my-courses/+page.server.js';
import { createUser } from '../support/factories.js';
import { createTeacher, doc, enrol, liveCourse } from '../support/courses.js';

let teacher;
let course;
let sections;
let topics;
let student;
let other;

beforeEach(async () => {
	teacher = await createTeacher();
	({ course, sections, topics } = await liveCourse(teacher));
	student = await createUser({ firstName: 'Sam' });
	other = await createUser({ firstName: 'Olive' });
	await enrol(course, student, { at: new Date(Date.now() - 86400000) });
	await enrol(course, other);
});

async function newTopic(title) {
	let t = await createTopic(course.id, { sectionId: sections[0].id, title });
	t = await updateTopic(t, { body: doc() });
	return publishTopic(course, t, teacher);
}

describe('the feed', () => {
	test('threads, teacher updates and new topics from the student’s courses, newest first', async () => {
		await createThread(course, other, { title: 'Blocking question', body: 'How?' });
		await postUpdate(course, teacher, { title: 'Office hours Friday', body: 'Come by.' });
		await newTopic('Fresh tech');

		const feed = await courseFeed(student);
		expect(feed.map((i) => [i.type, i.title])).toEqual([
			['topic', 'Fresh tech'],
			['update', 'Office hours Friday'],
			['thread', 'Blocking question']
		]);
		const update = feed.find((i) => i.type === 'update');
		expect(update).toMatchObject({ byTeacher: true, course: { slug: course.slug } });
		expect(update.href).toBe(`/academy/${course.slug}/discussion/${update.id}`);
	});

	test('topics that went live with the course aren’t news', async () => {
		const feed = await courseFeed(student);
		expect(feed.filter((i) => i.type === 'topic')).toHaveLength(0);
		expect(topics.length).toBeGreaterThan(0);
	});

	test('a topic added after enrolling is flagged for Premium unless the student has it', async () => {
		await newTopic('Members only');
		const [free] = await courseFeed(student);
		expect(free.premiumOnly).toBe(true);
		const member = await createUser({ role: 'premium', subscriptionStatus: 'active' });
		await enrol(course, member, { at: new Date(Date.now() - 86400000) });
		const [paid] = await courseFeed(member);
		expect(paid.premiumOnly).toBe(false);
	});

	test('held posts and other courses stay out', async () => {
		await createThread(course, other, { title: 'Rant', body: 'this is fucking stupid' });
		const { course: elsewhere } = await liveCourse(await createTeacher(), { title: 'Elsewhere' });
		await enrol(elsewhere, other);
		await createThread(elsewhere, other, { title: 'Not yours', body: 'Hi' });
		expect(await courseFeed(student)).toEqual([]);
	});
});

describe('activity for the stats', () => {
	test('topics finished with their reading time, posts written and replies received', async () => {
		await db.update(deskLesson).set({ readTime: 7 }).where(eq(deskLesson.id, topics[0].id));
		await setComplete(student.id, topics[0].id, true);
		await setComplete(student.id, topics[1].id, true);
		await setComplete(student.id, topics[1].id, false);
		const t = await createThread(course, student, { title: 'Mine', body: 'Thoughts?' });
		await reply(t.id, other, { body: 'Yes' });
		await reply(t.id, student, { body: 'Thanks' });

		const a = await learnerActivity(student.id);
		expect(a.completions).toHaveLength(1);
		expect(a.completions[0]).toMatchObject({ minutes: 7, courseId: course.id });
		expect(a.posts.map((p) => p.reply).sort()).toEqual([false, true]);
		expect(a.repliesReceived).toBe(1);
	});
});

describe('the page', () => {
	test('sends visitors who aren’t signed in to log in', async () => {
		const url = new URL('http://localhost/my-courses');
		await expect(
			load({ locals: { user: null }, url, depends: () => {}, setHeaders: () => {} })
		).rejects.toMatchObject({ status: 302, location: '/login?redirect=%2Fmy-courses' });
	});

	test('loads courses, feed, activity and notifications together', async () => {
		await postUpdate(course, teacher, { title: 'Hello class', body: 'Welcome.' });
		const data = await load({
			locals: { user: student },
			url: new URL('http://localhost/my-courses'),
			depends: () => {},
			setHeaders: () => {}
		});
		expect(data.firstName).toBe('Sam');
		expect(data.courses).toHaveLength(1);
		expect(data.feed[0].title).toBe('Hello class');
		expect(data.notifications[0]).toMatchObject({ kind: 'course_update', unread: true });
		expect(data.notifications[0].threadId).toBe(data.feed[0].id);
	});
});
