/**
 * The Desk course builder: who can build and see courses, the outline and
 * its drag-and-drop order, review before the first publish, and topics
 * going live (with the "new since you enrolled" stamp).
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse, deskLesson, notification } from '$lib/server/db/schema.js';
import { POST as createRoute } from '../../src/routes/api/desk/courses/+server.js';
import { PATCH as patchRoute } from '../../src/routes/api/desk/courses/[id]/+server.js';
import { PUT as outlineRoute } from '../../src/routes/api/desk/courses/[id]/outline/+server.js';
import { POST as reviewRoute } from '../../src/routes/api/desk/courses/[id]/review/+server.js';
import { PATCH as topicRoute } from '../../src/routes/api/desk/courses/[id]/topics/[topicId]/+server.js';
import {
	createTopic,
	deleteCourse,
	listDeskCourses,
	outlineOf,
	publishTopic,
	saveOutline,
	unpublishTopic,
	updateTopic
} from '$lib/server/courses/builder.js';
import { canManageVideoOf } from '$lib/server/video/mux.js';
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
let otherTeacher;
let admin;

beforeEach(async () => {
	teacher = await createTeacher();
	otherTeacher = await createTeacher();
	admin = await createAdmin();
});

const reload = async (id) => (await db.select().from(deskCourse).where(eq(deskCourse.id, id)))[0];
const topicRow = async (id) => (await db.select().from(deskLesson).where(eq(deskLesson.id, id)))[0];

describe('who can build courses', () => {
	test('a teacher creates a draft course with a first section', async () => {
		const r = await callRoute(createRoute, { user: teacher, body: { title: 'Deck Building 101' } });
		expect(r.status).toBe(200);
		expect(r.body.course).toMatchObject({
			status: 'draft',
			authorId: teacher.id,
			slug: 'deck-building-101'
		});
		const outline = await outlineOf(r.body.course.id);
		expect(outline).toHaveLength(1);
	});

	test('editors can create courses; writers and members can’t', async () => {
		const editor = await createUser({ additionalRoles: ['editor'] });
		expect((await callRoute(createRoute, { user: editor, body: {} })).status).toBe(200);
		for (const roles of [['writer'], []]) {
			const u = await createUser({ additionalRoles: roles });
			expect((await callRoute(createRoute, { user: u, body: {} })).status).toBe(403);
		}
		expect((await callRoute(createRoute, { user: null, body: {} })).status).toBe(401);
	});

	test('a teacher can’t touch another teacher’s course; admins and editors can', async () => {
		const { course } = await readyCourse(teacher);
		const editor = await createUser({ additionalRoles: ['editor'] });
		const writer = await createUser({ additionalRoles: ['writer'] });
		const params = { id: course.id };
		for (const who of [otherTeacher, writer]) {
			const r = await callRoute(patchRoute, { params, user: who, body: { title: 'Mine' } });
			expect(r.status).toBe(403);
		}
		let r = await callRoute(patchRoute, { params, user: editor, body: { title: 'Editor fix' } });
		expect(r.status).toBe(200);
		r = await callRoute(patchRoute, { params, user: admin, body: { title: 'Fixed typo' } });
		expect(r.status).toBe(200);
		expect((await reload(course.id)).title).toBe('Fixed typo');
	});

	test('teachers list only their own courses; admins list everyone’s', async () => {
		await readyCourse(teacher, { title: 'Mine' });
		await readyCourse(otherTeacher, { title: 'Theirs' });
		expect((await listDeskCourses(teacher)).map((c) => c.title)).toEqual(['Mine']);
		expect((await listDeskCourses(admin, { all: true })).map((c) => c.title).sort()).toEqual([
			'Mine',
			'Theirs'
		]);
	});

	test('course videos: the course’s teacher, admins and editors; never another teacher', async () => {
		const { course, topics } = await readyCourse(teacher);
		const editor = await createUser({ additionalRoles: ['editor'] });
		expect(await canManageVideoOf(teacher, 'trailer', course)).toBe(true);
		expect(await canManageVideoOf(admin, 'trailer', course)).toBe(true);
		expect(await canManageVideoOf(editor, 'trailer', course)).toBe(true);
		expect(await canManageVideoOf(otherTeacher, 'trailer', course)).toBe(false);
		expect(await canManageVideoOf(editor, 'lesson', topics[0])).toBe(true);
		expect(await canManageVideoOf(teacher, 'lesson', topics[0])).toBe(true);
	});

	test('the price is checked', async () => {
		const { course } = await readyCourse(teacher);
		const params = { id: course.id };
		for (const price of [-1, 'abc', 20000]) {
			const r = await callRoute(patchRoute, { params, user: teacher, body: { price } });
			expect(r.status).toBe(400);
		}
		await callRoute(patchRoute, { params, user: teacher, body: { price: '19.5' } });
		expect((await reload(course.id)).price).toBe('19.50');
	});
});

describe('the outline', () => {
	test('topics move between sections and sections reorder, in one save', async () => {
		const { course, sections, topics } = await readyCourse(teacher, { topics: 4 });
		const [a, b] = sections;
		// Everything into section 2, reversed, and section 2 first.
		const r = await callRoute(outlineRoute, {
			method: 'PUT',
			params: { id: course.id },
			user: teacher,
			body: {
				sections: [
					{ id: b.id, topicIds: topics.map((t) => t.id).reverse() },
					{ id: a.id, topicIds: [] }
				]
			}
		});
		expect(r.status).toBe(200);
		const outline = await outlineOf(course.id);
		expect(outline.map((s) => s.id)).toEqual([b.id, a.id]);
		expect(outline[0].topics.map((t) => t.id)).toEqual(topics.map((t) => t.id).reverse());
		expect(outline[1].topics).toHaveLength(0);
		expect((await topicRow(topics[0].id)).moduleId).toBe(b.id);
	});

	test('an outline that doesn’t match the course is refused and nothing changes', async () => {
		const { course, sections, topics } = await readyCourse(teacher, { topics: 2 });
		const { topics: foreign } = await readyCourse(otherTeacher, { topics: 1 });
		const before = await outlineOf(course.id);
		const [a, b] = sections;
		const bad = [
			// a topic from another course
			[
				{ id: a.id, topicIds: [topics[0].id, foreign[0].id] },
				{ id: b.id, topicIds: [topics[1].id] }
			],
			// a topic twice
			[
				{ id: a.id, topicIds: [topics[0].id, topics[0].id] },
				{ id: b.id, topicIds: [topics[1].id] }
			],
			// a topic missing
			[
				{ id: a.id, topicIds: [topics[0].id] },
				{ id: b.id, topicIds: [] }
			],
			// a section missing
			[{ id: a.id, topicIds: topics.map((t) => t.id) }]
		];
		for (const layout of bad) {
			await expect(saveOutline(course.id, layout)).rejects.toMatchObject({ status: 400 });
		}
		expect(await outlineOf(course.id)).toEqual(before);
	});

	test('topic addresses are unique within a course', async () => {
		const { course, sections } = await readyCourse(teacher, { topics: 0 });
		const t1 = await createTopic(course.id, { sectionId: sections[0].id, title: 'Blocking' });
		const t2 = await createTopic(course.id, { sectionId: sections[0].id, title: 'Blocking' });
		expect(t1.slug).toBe('blocking');
		expect(t2.slug).toBe('blocking-2');
		const r = await callRoute(topicRoute, {
			method: 'PATCH',
			params: { id: course.id, topicId: t2.id },
			user: teacher,
			body: { slug: 'blocking' }
		});
		expect(r.body.topic.slug).toBe('blocking-2');
	});
});

describe('review before the first publish', () => {
	test('a course needs a description, a cover and a published topic first', async () => {
		const { course } = await readyCourse(teacher, { topics: 0, drafts: 1 });
		const r = await callRoute(reviewRoute, {
			params: { id: course.id },
			user: teacher,
			body: { action: 'submit' }
		});
		expect(r.status).toBe(400);
		expect(r.body.message).toMatch(/Publish at least one topic/);
	});

	test('the teacher submits, only an admin approves, and the course goes live', async () => {
		const { course, topics } = await readyCourse(teacher, { topics: 2, drafts: 1 });
		const params = { id: course.id };
		expect(topics[0].firstPublishedAt).toBeNull();

		expect(
			(await callRoute(reviewRoute, { params, user: teacher, body: { action: 'submit' } })).status
		).toBe(200);
		expect((await reload(course.id)).status).toBe('in_review');
		expect(
			(await callRoute(reviewRoute, { params, user: teacher, body: { action: 'approve' } })).status
		).toBe(403);

		expect(
			(await callRoute(reviewRoute, { params, user: admin, body: { action: 'approve' } })).status
		).toBe(200);
		const live = await reload(course.id);
		expect(live.status).toBe('published');
		expect(live.firstPublishedAt).not.toBeNull();
		// Published topics went live with it; the draft didn't.
		expect((await topicRow(topics[0].id)).firstPublishedAt).toEqual(live.firstPublishedAt);
		expect((await topicRow(topics[2].id)).firstPublishedAt).toBeNull();
	});

	test('an admin can return a course with a note', async () => {
		const { course } = await readyCourse(teacher);
		const params = { id: course.id };
		await callRoute(reviewRoute, { params, user: teacher, body: { action: 'submit' } });
		await callRoute(reviewRoute, {
			params,
			user: admin,
			body: { action: 'return', note: 'Add a section on sideboarding.' }
		});
		const c = await reload(course.id);
		expect(c).toMatchObject({ status: 'draft', reviewNote: 'Add a section on sideboarding.' });
	});

	test('a course students have joined can’t be deleted', async () => {
		const { course } = await liveCourse(teacher);
		await enrol(course, await createUser());
		await expect(deleteCourse(course)).rejects.toMatchObject({ status: 409 });
	});
});

describe('topics in a live course', () => {
	test('a new topic is stamped once and tells students, flagged Premium-only for non-members', async () => {
		const { course, sections } = await liveCourse(teacher);
		const free = await createUser();
		const premium = await createUser({ role: 'premium', subscriptionStatus: 'active' });
		await enrol(course, free);
		await enrol(course, premium);

		let t = await createTopic(course.id, { sectionId: sections[0].id, title: 'New tech' });
		t = await updateTopic(t, { body: doc() });
		t = await publishTopic(course, t, teacher);
		const stamped = t.firstPublishedAt;
		expect(stamped).not.toBeNull();

		const notes = await db.select().from(notification).where(eq(notification.lessonId, t.id));
		const byUser = Object.fromEntries(notes.map((n) => [n.userId, n.data.premiumOnly]));
		expect(byUser).toEqual({ [free.id]: true, [premium.id]: false });

		// Unpublish and republish: not new again, nobody told twice.
		await unpublishTopic(t);
		await publishTopic(course, await topicRow(t.id), teacher);
		expect((await topicRow(t.id)).firstPublishedAt).toEqual(stamped);
		expect(
			await db.select().from(notification).where(eq(notification.lessonId, t.id))
		).toHaveLength(2);
	});

	test('an empty topic can’t be published', async () => {
		const { course, sections } = await liveCourse(teacher);
		const t = await createTopic(course.id, { sectionId: sections[0].id, title: 'Empty' });
		await expect(publishTopic(course, t, teacher)).rejects.toMatchObject({ status: 400 });
	});
});
