/**
 * Who can read which topic: free topics for everyone, the course for its
 * students, topics added after a student enrolled for Premium members, the
 * teacher's drafts for the teacher. Plus marking topics done and picking up
 * where you left off.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseEnrollment, deskCourse, deskLesson, user } from '$lib/server/db/schema.js';
import { load as topicLoad } from '../../src/routes/academy/[slug]/[topic]/+page.server.js';
import { POST as progressRoute } from '../../src/routes/api/academy/progress/+server.js';
import { courseForReader } from '$lib/server/courses/reader.js';
import { courseProgress } from '$lib/server/courses/progress.js';
import {
	createTopic,
	publishTopic,
	unpublishTopic,
	updateTopic
} from '$lib/server/courses/builder.js';
import { createAdmin, createUser } from '../support/factories.js';
import {
	callRoute,
	createTeacher,
	doc,
	enrol,
	liveCourse,
	readyCourse
} from '../support/courses.js';

let teacher;
let live;

beforeEach(async () => {
	teacher = await createTeacher();
	live = await liveCourse(teacher, { topics: 3 });
	// The course went live ten days ago.
	await db
		.update(deskLesson)
		.set({ firstPublishedAt: daysAgo(10) })
		.where(eq(deskLesson.courseId, live.course.id));
	live.topics = await db.select().from(deskLesson).where(eq(deskLesson.courseId, live.course.id));
	// Reading order: section by section.
	const r = await courseForReader(live.course.slug, teacher);
	live.topics = r.topics.map((t) => live.topics.find((x) => x.id === t.id));
});

const access = async (who, slug) => {
	const r = await courseForReader(live.course.slug, who);
	return r?.topics.find((t) => t.slug === slug)?.access ?? 'missing';
};
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
async function newTopic(title = 'Fresh tech') {
	let t = await createTopic(live.course.id, { sectionId: live.sections[0].id, title });
	t = await updateTopic(t, { body: doc() });
	return publishTopic(live.course, t, teacher);
}
const pageFor = async (who, topic) => {
	try {
		return await topicLoad({
			params: { slug: live.course.slug, topic },
			locals: { user: who },
			setHeaders: () => {}
		});
	} catch (err) {
		return { status: err.status };
	}
};

describe('free topics', () => {
	test('a published free topic is open to everyone, signed in or not', async () => {
		const [t] = live.topics;
		await updateTopic(t, { isPreview: true });
		const premium = await createUser({ role: 'premium', subscriptionStatus: 'active' });
		for (const who of [null, await createUser(), premium]) {
			expect(await access(who, t.slug)).toBe('open');
		}
		const page = await pageFor(null, t.slug);
		expect(page.body).toBeTruthy();
	});

	test('the other topics stay locked, and turning Free off locks it again', async () => {
		const [t, other] = live.topics;
		await updateTopic(t, { isPreview: true });
		const visitor = await createUser();
		expect(await access(visitor, other.slug)).toBe('locked');
		expect((await pageFor(visitor, other.slug)).body).toBeNull();
		await updateTopic(t, { isPreview: false });
		expect(await access(visitor, t.slug)).toBe('locked');
	});

	test('a draft free topic is visible to nobody but the teacher and admins', async () => {
		let t = await createTopic(live.course.id, { sectionId: live.sections[0].id, title: 'Draft' });
		t = await updateTopic(t, { body: doc(), isPreview: true });
		expect(await access(null, t.slug)).toBe('missing');
		expect((await pageFor(await createUser(), t.slug)).status).toBe(404);
		expect(await access(teacher, t.slug)).toBe('open');
		expect(await access(await createAdmin(), t.slug)).toBe('open');
	});
});

describe('students', () => {
	test('enrolled students read every topic that was there when they enrolled', async () => {
		const s = await createUser();
		await enrol(live.course, s);
		for (const t of live.topics) expect(await access(s, t.slug)).toBe('open');
		expect(await access(await createUser(), live.topics[0].slug)).toBe('locked');
	});

	test('a topic added after enrolling needs Premium, and locks again when Premium ends', async () => {
		const s = await createUser();
		await enrol(live.course, s, { at: daysAgo(3) });
		const t = await newTopic();
		expect(await access(s, t.slug)).toBe('locked-premium');
		expect((await pageFor(s, t.slug)).body).toBeNull();

		await db
			.update(user)
			.set({ role: 'premium', subscriptionStatus: 'active' })
			.where(eq(user.id, s.id));
		const premium = (await db.select().from(user).where(eq(user.id, s.id)))[0];
		expect(await access(premium, t.slug)).toBe('open');

		await db.update(user).set({ role: 'free' }).where(eq(user.id, s.id));
		const lapsed = (await db.select().from(user).where(eq(user.id, s.id)))[0];
		expect(await access(lapsed, t.slug)).toBe('locked-premium');
		// What they bought stays theirs.
		expect(await access(lapsed, live.topics[0].slug)).toBe('open');
	});

	test('someone who enrols after a topic was added gets it, Premium or not', async () => {
		const t = await newTopic();
		const s = await createUser();
		await enrol(live.course, s);
		expect(await access(s, t.slug)).toBe('open');
	});

	test('unpublishing and republishing doesn’t make a topic new', async () => {
		const s = await createUser();
		await enrol(live.course, s, { at: daysAgo(1) });
		const [t] = live.topics; // live before they enrolled
		await unpublishTopic(t);
		expect(await access(s, t.slug)).toBe('missing');
		await publishTopic(live.course, t, teacher);
		expect(await access(s, t.slug)).toBe('open');
	});

	test('a refunded (revoked) enrollment reads like no enrollment', async () => {
		const s = await createUser();
		const en = await enrol(live.course, s);
		await db
			.update(courseEnrollment)
			.set({ revokedAt: new Date(), revokedReason: 'refunded' })
			.where(eq(courseEnrollment.id, en.id));
		expect(await access(s, live.topics[0].slug)).toBe('locked');
	});

	test('an unlisted course is still there for its students, and gone for everyone else', async () => {
		const s = await createUser();
		await enrol(live.course, s);
		await db
			.update(deskCourse)
			.set({ status: 'archived' })
			.where(eq(deskCourse.id, live.course.id));
		expect(await access(s, live.topics[0].slug)).toBe('open');
		expect(await courseForReader(live.course.slug, await createUser())).toBeNull();
	});

	test('a course waiting for approval is only the teacher’s preview', async () => {
		const { course } = await readyCourse(teacher, { title: 'Unapproved' });
		expect(await courseForReader(course.slug, null)).toBeNull();
		expect(await courseForReader(course.slug, await createTeacher())).toBeNull();
		expect((await courseForReader(course.slug, teacher)).owner).toBe(true);
	});
});

describe('progress', () => {
	test('done topics, the place you left off, and the next topic to read', async () => {
		const s = await createUser();
		await enrol(live.course, s);
		const [a, b, c] = live.topics;

		expect(
			(await callRoute(progressRoute, { user: s, body: { lessonId: a.id, complete: true } })).status
		).toBe(200);
		await pageFor(s, c.slug); // opening a topic is where you left off

		const [p] = await courseProgress(s);
		expect(p).toMatchObject({ topics: 3, completed: 1, percent: 33 });
		expect(p.last.slug).toBe(c.slug);
		expect(p.next.slug).toBe(b.slug);

		await callRoute(progressRoute, { user: s, body: { lessonId: a.id, complete: false } });
		expect((await courseProgress(s))[0].completed).toBe(0);
	});

	test('topics waiting for Premium aren’t counted against progress', async () => {
		const s = await createUser();
		await enrol(live.course, s, { at: daysAgo(2) });
		await newTopic();
		const [p] = await courseProgress(s);
		expect(p.topics).toBe(3);
		expect(p.lockedForPremium).toBe(1);
	});

	test('only enrolled students can mark a topic done', async () => {
		const stranger = await createUser();
		const r = await callRoute(progressRoute, {
			user: stranger,
			body: { lessonId: live.topics[0].id, complete: true }
		});
		expect(r.status).toBe(403);
		const s = await createUser();
		await enrol(live.course, s, { at: daysAgo(2) });
		const t = await newTopic();
		expect(
			(await callRoute(progressRoute, { user: s, body: { lessonId: t.id, complete: true } })).status
		).toBe(403);
	});
});
