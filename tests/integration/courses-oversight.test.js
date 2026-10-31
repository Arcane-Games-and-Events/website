/**
 * The admin's view of the courses in the Desk: where each course stands and
 * whose move it is, what's waiting on an admin and on teachers, and the
 * history recorded as people act on a course.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseSale, deskCourse } from '$lib/server/db/schema.js';
import { POST as reviewRoute } from '../../src/routes/api/desk/courses/[id]/review/+server.js';
import { PATCH as patchRoute } from '../../src/routes/api/desk/courses/[id]/+server.js';
import { POST as listingRoute } from '../../src/routes/api/desk/courses/[id]/listing/+server.js';
import { courseOversight, courseStatus } from '$lib/server/courses/oversight.js';
import { listActivity } from '$lib/server/courses/activity.js';
import { createThread } from '$lib/server/courses/discussion.js';
import { createCourse, updateTopic } from '$lib/server/courses/builder.js';
import { createAdmin, createUser } from '../support/factories.js';
import {
	callRoute,
	createTeacher,
	doc,
	enrol,
	liveCourse,
	readyCourse
} from '../support/courses.js';

let admin;
let teacher;

beforeEach(async () => {
	admin = await createAdmin();
	teacher = await createTeacher({ firstName: 'Tess', lastName: 'Ramirez' });
});

const byTitle = (o, title) => o.courses.find((c) => c.title === title);
const reload = async (id) => (await db.select().from(deskCourse).where(eq(deskCourse.id, id)))[0];

describe('where each course stands', () => {
	test('every stage says whose move it is', async () => {
		await createCourse(teacher, { title: 'Just started' });
		const { course: sent } = await readyCourse(teacher, { title: 'Sent' });
		await callRoute(reviewRoute, {
			params: { id: sent.id },
			user: teacher,
			body: { action: 'submit' }
		});
		const { course: back } = await readyCourse(teacher, { title: 'Sent back' });
		await callRoute(reviewRoute, {
			params: { id: back.id },
			user: teacher,
			body: { action: 'submit' }
		});
		await callRoute(reviewRoute, {
			params: { id: back.id },
			user: admin,
			body: { action: 'return', note: 'Add a cover photo of the board.' }
		});
		const { course: live } = await liveCourse(teacher, { title: 'Live one' });
		const { course: hidden } = await liveCourse(teacher, { title: 'Hidden one' });
		await callRoute(listingRoute, {
			params: { id: hidden.id },
			user: admin,
			body: { listed: false }
		});

		const o = await courseOversight(admin);
		expect(byTitle(o, 'Just started').standing).toMatchObject({ stage: 'draft', whose: 'teacher' });
		expect(byTitle(o, 'Just started').standing.line).toMatch(/Publish at least one topic/);
		expect(byTitle(o, 'Sent').standing).toMatchObject({ stage: 'in_review', whose: 'admin' });
		expect(byTitle(o, 'Sent back').standing).toMatchObject({ stage: 'returned', whose: 'teacher' });
		expect(byTitle(o, 'Sent back').reviewNote).toBe('Add a cover photo of the board.');
		expect(o.waiting.find((w) => w.kind === 'returned').detail).toContain(
			'Add a cover photo of the board.'
		);
		expect(byTitle(o, 'Live one').standing).toMatchObject({ stage: 'live', whose: 'none' });
		expect(byTitle(o, 'Hidden one').standing.stage).toBe('unlisted');
		expect(o.figures).toMatchObject({ live: 1, inReview: 1, returned: 1, drafts: 1, unlisted: 1 });
		expect(live.id).toBeTruthy();
	});
});

describe('what’s waiting on whom', () => {
	test('approvals, flagged posts and live problems need an admin', async () => {
		const { course: sent } = await readyCourse(teacher, { title: 'Sent' });
		await callRoute(reviewRoute, {
			params: { id: sent.id },
			user: teacher,
			body: { action: 'submit' }
		});
		const { course: live } = await liveCourse(teacher, { title: 'Flagged' });
		const student = await createUser();
		await enrol(live, student);
		await createThread(live, student, { title: 'Rant', body: 'this is fucking stupid' });
		// A live course with nothing published: buyers would get an empty course.
		const { course: empty } = await liveCourse(teacher, { title: 'Empty', topics: 1 });
		await db.execute(`update cms_lesson set published_at = null where course_id = '${empty.id}'`);

		const o = await courseOversight(admin);
		const kinds = o.needsYou.map((n) => [n.kind, n.course?.title]);
		expect(kinds).toEqual(
			expect.arrayContaining([
				['approval', 'Sent'],
				['posts', 'Flagged'],
				['problem', 'Empty']
			])
		);
		expect(o.needsYou.find((n) => n.kind === 'problem').text).toMatch(/no published topics/);
	});

	test('returned courses, drafts and changes not put live wait on teachers', async () => {
		await createCourse(teacher, { title: 'Draft' });
		const { course: live, topics } = await liveCourse(teacher, { title: 'Live' });
		await updateTopic(topics[0], { body: doc('A rewrite') }, { staged: true });

		const o = await courseOversight(admin);
		const kinds = o.waiting.map((w) => [w.kind, w.course.title]);
		expect(kinds).toEqual(
			expect.arrayContaining([
				['draft', 'Draft'],
				['changes', 'Live']
			])
		);
		expect(byTitle(o, 'Live').pendingTopics).toBe(1);
		expect(live.id).toBeTruthy();
	});

	test('money owed to teachers shows as a payout to make', async () => {
		const { course } = await liveCourse(teacher, { title: 'Sold' });
		const student = await createUser();
		const en = await enrol(course, student, { source: 'purchase' });
		await db.insert(courseSale).values({
			courseId: course.id,
			teacherId: teacher.id,
			enrollmentId: en.id,
			grossCents: 5000,
			sharePct: 90,
			soldAt: new Date(Date.now() - 30 * 864e5),
			payableAt: new Date(Date.now() - 16 * 864e5)
		});
		const o = await courseOversight(admin);
		expect(byTitle(o, 'Sold').owedCents).toBe(4500);
		const pay = o.needsYou.find((n) => n.kind.startsWith('payout'));
		expect(pay.cents).toBe(4500);
	});
});

describe('one course’s status and history', () => {
	test('records who did what, with the return note and details changes', async () => {
		const { course } = await readyCourse(teacher, { title: 'Tracked' });
		const params = { id: course.id };
		await callRoute(reviewRoute, { params, user: teacher, body: { action: 'submit' } });
		await callRoute(reviewRoute, {
			params,
			user: admin,
			body: { action: 'return', note: 'Needs a stronger first topic.' }
		});
		await callRoute(patchRoute, { params, user: teacher, body: { price: '55' } });
		await callRoute(reviewRoute, { params, user: teacher, body: { action: 'submit' } });
		await callRoute(reviewRoute, { params, user: admin, body: { action: 'approve' } });

		const log = await listActivity(course.id);
		expect(log.map((a) => a.kind)).toEqual([
			'approved',
			'submitted',
			'details_changed',
			'returned',
			'submitted'
		]);
		expect(log[3]).toMatchObject({
			note: 'Needs a stronger first topic.',
			actor: expect.any(String)
		});
		expect(log[2].data.price).toEqual({ from: '40.00', to: '55.00' });

		const s = await courseStatus(await reload(course.id));
		expect(s.standing.stage).toBe('live');
		expect(s.steps.every((x) => x.done)).toBe(true);
		expect(s.events.find((e) => e.kind === 'returned').note).toBe('Needs a stronger first topic.');
		expect(s.author).toBe('Tess Ramirez');
	});

	test('students and money add up', async () => {
		const { course } = await liveCourse(teacher, { title: 'Money' });
		const buyer = await createUser();
		const en = await enrol(course, buyer, { source: 'purchase' });
		await enrol(course, await createUser());
		await db.insert(courseSale).values({
			courseId: course.id,
			teacherId: teacher.id,
			enrollmentId: en.id,
			grossCents: 4000,
			refundedCents: 1000,
			sharePct: 90,
			soldAt: new Date(),
			payableAt: new Date(Date.now() + 14 * 864e5)
		});
		const s = await courseStatus(await reload(course.id));
		expect(s.students).toEqual({ paid: 1, comp: 1, removed: 0 });
		expect(s.money).toMatchObject({
			grossCents: 4000,
			refundedCents: 1000,
			shareCents: 2700,
			onHoldCents: 2700,
			payableCents: 0,
			platformCents: 300
		});
		expect(s.events.filter((e) => e.kind === 'sale')).toHaveLength(1);
	});
});
