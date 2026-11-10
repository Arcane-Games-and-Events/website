/**
 * The rebuilt Classroom: who hears about what (Classroom notifications kept
 * apart from My courses), each course's own images (and migration 037
 * filing older ones), the home page's numbers and next steps for teachers,
 * admins and editors, the review queue, and the old URLs.
 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse, deskMedia, notification } from '$lib/server/db/schema.js';
import { POST as reviewRoute } from '../../src/routes/api/desk/courses/[id]/review/+server.js';
import { POST as listingRoute } from '../../src/routes/api/desk/courses/[id]/listing/+server.js';
import { POST as studentsRoute } from '../../src/routes/api/desk/courses/[id]/students/+server.js';
import { POST as readRoute } from '../../src/routes/api/notifications/read/+server.js';
import { GET as mediaList, POST as mediaUpload } from '../../src/routes/api/desk/media/+server.js';
import { load as statusLoad } from '../../src/routes/classroom/courses/[id]/status/+page.server.js';
import { load as videosLoad } from '../../src/routes/classroom/videos/+page.server.js';
import { load as courseVideosLoad } from '../../src/routes/classroom/videos/[courseId]/+page.server.js';
import { load as imagesLoad } from '../../src/routes/classroom/images/+page.server.js';
import {
	CLASSROOM_KINDS,
	listNotifications,
	unreadCounts
} from '$lib/server/courses/notifications.js';
import { createThread, reportPost } from '$lib/server/courses/discussion.js';
import { markStatementPaid } from '$lib/server/partner/statements.js';
import { monthOf } from '$lib/server/partner/ledger.js';
import { classroomAnalytics } from '$lib/server/courses/analytics.js';
import { classroomHome, nextSteps } from '$lib/server/courses/home.js';
import { courseOversight, nextInQueue } from '$lib/server/courses/oversight.js';
import {
	createCourse,
	createTopic,
	outlineOf,
	readinessItems,
	updateTopic
} from '$lib/server/courses/builder.js';
import { listMedia } from '$lib/server/media/library.js';
import { createAdmin, createUser } from '../support/factories.js';
import {
	callRoute,
	createMedia,
	createTeacher,
	enrol,
	liveCourse,
	legacySale,
	readyCourse
} from '../support/courses.js';

let admin;
let editor;
let teacher;

beforeEach(async () => {
	admin = await createAdmin({ firstName: 'Ada' });
	editor = await createUser({ firstName: 'Eve', additionalRoles: ['editor'] });
	teacher = await createTeacher({ firstName: 'Tess', lastName: 'Ramirez' });
});

const notesOf = (user, kind) =>
	db
		.select()
		.from(notification)
		.where(and(eq(notification.userId, user.id), eq(notification.kind, kind)));
const review = (course, user, body) =>
	callRoute(reviewRoute, { params: { id: course.id }, user, body });

describe('Classroom notifications', () => {
	test('sending tells every admin and editor (with the note), never the teacher', async () => {
		const { course } = await readyCourse(teacher);
		expect(
			(await review(course, teacher, { action: 'submit', note: 'Two more topics soon.' })).status
		).toBe(200);

		const [toAdmin] = await notesOf(admin, 'course_submitted');
		expect(toAdmin.data).toMatchObject({ note: 'Two more topics soon.', title: course.title });
		expect(await notesOf(editor, 'course_submitted')).toHaveLength(1);
		expect(await notesOf(teacher, 'course_submitted')).toHaveLength(0);

		await review(course, teacher, { action: 'withdraw' });
		expect(await notesOf(admin, 'course_withdrawn')).toHaveLength(1);
	});

	test('returning and approving tell the teacher, not the admin who did it', async () => {
		const { course } = await readyCourse(teacher);
		await review(course, teacher, { action: 'submit' });
		await review(course, admin, { action: 'return', note: 'Add a fuller description.' });
		const [back] = await notesOf(teacher, 'course_returned');
		expect(back.data.note).toBe('Add a fuller description.');
		expect(await notesOf(admin, 'course_returned')).toHaveLength(0);

		await review(course, teacher, { action: 'submit' });
		await review(course, editor, { action: 'approve' });
		expect(await notesOf(teacher, 'course_approved')).toHaveLength(1);
		expect(await notesOf(editor, 'course_approved')).toHaveLength(0);
	});

	test('the teacher hears when someone else unlists or relists, not when they do', async () => {
		const { course } = await liveCourse(teacher);
		await callRoute(listingRoute, {
			params: { id: course.id },
			user: teacher,
			body: { listed: false }
		});
		expect(await notesOf(teacher, 'course_unlisted')).toHaveLength(0);
		await callRoute(listingRoute, {
			params: { id: course.id },
			user: admin,
			body: { listed: true }
		});
		expect(await notesOf(teacher, 'course_listed')).toHaveLength(1);
	});

	test('flagged posts and payouts reach the teacher; new students don’t', async () => {
		const { course } = await liveCourse(teacher, { price: '0' });
		const student = await createUser();
		const r = await callRoute(studentsRoute, {
			params: { id: course.id },
			user: admin,
			body: { email: student.email }
		});
		expect(r.status).toBe(200);
		// The Classroom's updates are about running the course, not each new student.
		expect(await notesOf(teacher, 'new_student')).toHaveLength(0);

		// Reported by enough students, a post is held: the teacher is told once.
		const thread = await createThread(course, student, { title: 'Hello', body: 'Hi all' });
		for (let i = 0; i < 3; i++) {
			const s = await createUser();
			await enrol(course, s);
			await reportPost(thread.id, s);
		}
		expect(await notesOf(teacher, 'post_flagged')).toHaveLength(1);

		await legacySale({
			courseId: course.id,
			teacherId: teacher.id,
			grossCents: 5000,
			sharePct: 90,
			soldAt: new Date(Date.now() - 30 * 864e5),
			payableAt: new Date(Date.now() - 16 * 864e5)
		});
		await markStatementPaid({
			teacherId: teacher.id,
			month: monthOf(new Date(Date.now() - 16 * 864e5)),
			actor: admin,
			now: new Date(Date.now() + 40 * 864e5)
		});
		const [paid] = await notesOf(teacher, 'payout_paid');
		expect(paid.data.cents).toBe(4500);
	});

	test('Classroom and My courses keep their own lists and unread counts', async () => {
		const { course } = await liveCourse(teacher);
		const student = await createUser();
		await enrol(course, student);
		// new_thread to the teacher is Classroom news.
		await createThread(course, student, { title: 'Question', body: 'How do I start?' });
		await db
			.insert(notification)
			.values({ userId: teacher.id, kind: 'reply', courseId: course.id });

		expect(await unreadCounts(teacher.id)).toEqual({ learning: 1, classroom: 1 });
		const classroom = await listNotifications(teacher.id, { scope: 'classroom' });
		expect(classroom.map((n) => n.kind)).toEqual(['new_thread']);
		expect(classroom[0].href).toMatch(new RegExp(`^/academy/${course.slug}/discussion/`));
		expect((await listNotifications(teacher.id, { scope: 'learning' })).map((n) => n.kind)).toEqual(
			['reply']
		);

		// "Mark all read" in the Classroom leaves My courses alone.
		await callRoute(readRoute, { user: teacher, body: { scope: 'classroom' } });
		expect(await unreadCounts(teacher.id)).toEqual({ learning: 1, classroom: 0 });
		await callRoute(readRoute, { user: teacher, body: {} });
		expect(await unreadCounts(teacher.id)).toEqual({ learning: 0, classroom: 0 });
		expect(CLASSROOM_KINDS).toContain('course_returned');
	});

	test('Classroom notifications link into the Classroom', async () => {
		const { course } = await readyCourse(teacher);
		await review(course, teacher, { action: 'submit' });
		const [n] = await listNotifications(admin.id, { scope: 'classroom' });
		expect(n.href).toBe(`/classroom/courses/${course.id}/review`);
		await review(course, admin, { action: 'return', note: 'More please.' });
		const [back] = await listNotifications(teacher.id, { scope: 'classroom' });
		expect(back.href).toBe(`/classroom/courses/${course.id}`);
	});
});

describe('each course has its own images', () => {
	const classroomImage = async (owner, courseId = null) => {
		const row = await createMedia(owner);
		await db
			.update(deskMedia)
			.set({ library: 'classroom', courseId })
			.where(eq(deskMedia.id, row.id));
		return row;
	};
	const listUrl = (q) => `http://localhost/api/desk/media?${new URLSearchParams(q)}`;

	test('a course lists its own images, whoever uploaded them; older uploads apart', async () => {
		const a = await createCourse(teacher, { title: 'A' });
		const b = await createCourse(teacher, { title: 'B' });
		const inA = await classroomImage(teacher, a.id);
		const byAdmin = await classroomImage(admin, a.id);
		await classroomImage(teacher, b.id);
		const older = await classroomImage(teacher, null);

		const ids = (r) => r.items.map((i) => i.id).sort();
		expect(ids(await listMedia(teacher, { library: 'classroom', course: a.id }))).toEqual(
			[inA.id, byAdmin.id].sort()
		);
		expect(
			ids(await listMedia(teacher, { library: 'classroom', course: a.id, older: true }))
		).toEqual([older.id]);
	});

	test('the API checks the course is yours, and files uploads under it', async () => {
		const mine = await createCourse(teacher, { title: 'Mine' });
		const other = await createCourse(await createTeacher(), { title: 'Theirs' });
		const own = await callRoute(mediaList, {
			method: 'GET',
			user: teacher,
			url: listUrl({ library: 'classroom', course: mine.id })
		});
		expect(own.status).toBe(200);
		const theirs = await callRoute(mediaList, {
			method: 'GET',
			user: teacher,
			url: listUrl({ library: 'classroom', course: other.id })
		});
		expect(theirs.status).toBe(403);
		// Admins can open any course's images.
		expect(
			(
				await callRoute(mediaList, {
					method: 'GET',
					user: admin,
					url: listUrl({ library: 'classroom', course: other.id })
				})
			).status
		).toBe(200);
		const refused = await callRoute(mediaUpload, {
			user: teacher,
			body: {
				filename: 'x.jpg',
				mimeType: 'image/jpeg',
				size: 10,
				library: 'classroom',
				course: other.id
			}
		});
		expect(refused.status).toBe(403);
	});

	test('migration 037 files older images by what uses them', async () => {
		const solo = await createTeacher();
		const { course } = await readyCourse(teacher, { title: 'Covered' });
		const second = await createCourse(teacher, { title: 'Second' });
		const soloCourse = await createCourse(solo, { title: 'Solo' });
		// The cover readyCourse() made, moved into the Classroom's library.
		await db
			.update(deskMedia)
			.set({ library: 'classroom', courseId: null })
			.where(eq(deskMedia.id, course.coverImageId));
		// An image inside a topic of "Second".
		const inline = await classroomImage(teacher);
		const [section] = await outlineOf(second.id);
		const topic = await createTopic(second.id, { sectionId: section.id, title: 'Inline' });
		await updateTopic(topic, {
			body: {
				root: {
					type: 'root',
					version: 1,
					children: [{ type: 'image', version: 1, mediaId: inline.id, src: 'x' }]
				}
			}
		});
		const soloImage = await classroomImage(solo);
		const unsure = await classroomImage(teacher); // two courses: can't tell which
		const content = await createMedia(teacher); // the Desk's: never touched

		const run = async () => {
			for (const stmt of readFileSync('supabase/migrations/037_course_media.sql', 'utf8')
				.replace(/--.*$/gm, '')
				.split(/;\s*\n/)
				.map((s) => s.trim())
				.filter(Boolean))
				await db.execute(sql.raw(stmt));
		};
		await run();
		await run(); // safe to re-run

		const courseOf = async (id) =>
			(await db.select({ c: deskMedia.courseId }).from(deskMedia).where(eq(deskMedia.id, id)))[0].c;
		expect(await courseOf(course.coverImageId)).toBe(course.id);
		expect(await courseOf(inline.id)).toBe(second.id);
		expect(await courseOf(soloImage.id)).toBe(soloCourse.id);
		expect(await courseOf(unsure.id)).toBeNull();
		expect(await courseOf(content.id)).toBeNull();
	});
});

describe('the Classroom home', () => {
	test('numbers across courses add up to each course’s', async () => {
		const { course: a } = await liveCourse(teacher, { title: 'A' });
		const { course: b } = await liveCourse(teacher, { title: 'B' });
		const s1 = await createUser();
		const s2 = await createUser();
		const s3 = await createUser();
		await enrol(a, s1);
		await enrol(a, s2, { source: 'purchase' });
		await enrol(b, s3, { source: 'purchase' });
		await legacySale([
			{
				courseId: a.id,
				teacherId: teacher.id,
				grossCents: 4000,
				sharePct: 90,
				soldAt: new Date(),
				payableAt: new Date()
			},
			{
				courseId: b.id,
				teacherId: teacher.id,
				grossCents: 2000,
				sharePct: 90,
				soldAt: new Date(),
				payableAt: new Date()
			}
		]);
		const r = await classroomAnalytics([a.id, b.id], 30);
		expect(r.totals).toMatchObject({
			newStudents: 3,
			bought: 2,
			netCents: 6000,
			earnedCents: 5400
		});
		expect(r.courses[a.id]).toMatchObject({ newStudents: 2, bought: 1, netCents: 4000 });
		expect(r.daily.students.at(-1).n).toBe(3);
		expect(r.daily.students).toHaveLength(30);
		expect((await classroomAnalytics([], 7)).totals.newStudents).toBe(0);
	});

	test('a teacher’s next steps: returned first with the note, then ready to send', async () => {
		const { course: back } = await readyCourse(teacher, { title: 'Back' });
		await review(back, teacher, { action: 'submit' });
		await review(back, admin, { action: 'return', note: 'Brighter cover.' });
		await readyCourse(teacher, { title: 'Ready' });
		await createCourse(teacher, { title: 'Bare' });

		const home = await classroomHome(teacher);
		expect(home.oversee).toBe(false);
		expect(home.all).toBeUndefined();
		expect(home.steps.map((s) => s.kind)).toEqual(['returned', 'ready', 'building']);
		expect(home.steps[0]).toMatchObject({ note: 'Brighter cover.' });
		expect(home.steps[1].href).toMatch(/\?send=1$/);
		expect(home.steps[2].href).toMatch(/\/details$/); // first missing: a description
		expect(home.mine).toHaveLength(3);
		expect(home.updates.map((n) => n.kind)).toEqual(['course_returned']);
	});

	test('admins see every course and the money; editors don’t see money', async () => {
		const { course } = await liveCourse(teacher);
		await legacySale({
			courseId: course.id,
			teacherId: teacher.id,
			grossCents: 4000,
			sharePct: 90,
			soldAt: new Date(),
			payableAt: new Date()
		});
		const asAdmin = await classroomHome(admin);
		expect(asAdmin.all).toHaveLength(1);
		expect(asAdmin.all[0].grossCents).toBe(4000);
		expect(asAdmin.figures.owedCents).toBe(3600);
		expect(asAdmin.mine).toHaveLength(0);

		const asEditor = await classroomHome(editor);
		expect(asEditor.money).toBe(false);
		expect(asEditor.all[0].grossCents).toBe(0);
		expect(asEditor.all[0].owedCents).toBe(0);
		expect(asEditor.figures.owedCents).toBe(0);
	});

	test('the checklist says what’s done and where to fix the rest', async () => {
		const bare = await createCourse(teacher, { title: 'Bare' });
		const items = await readinessItems(bare);
		expect(items.map((i) => [i.key, i.done, i.fix])).toEqual([
			['title', true, 'details'],
			['description', false, 'details'],
			['cover', false, 'details'],
			['topic', false, 'outline']
		]);
		const own = await courseOversight(teacher, new Date(), { money: false, all: false });
		expect(own.courses[0].readiness).toHaveLength(4);
		expect(nextSteps(own.courses)[0].kind).toBe('building');
	});

	test('review next goes to the oldest course still waiting', async () => {
		const { course: first } = await readyCourse(teacher, { title: 'First' });
		const { course: second } = await readyCourse(teacher, { title: 'Second' });
		const { course: third } = await readyCourse(teacher, { title: 'Third' });
		for (const [c, daysAgo] of [
			[first, 3],
			[second, 2],
			[third, 1]
		])
			await db
				.update(deskCourse)
				.set({ status: 'in_review', submittedAt: new Date(Date.now() - daysAgo * 864e5) })
				.where(eq(deskCourse.id, c.id));
		expect((await nextInQueue(first.id)).id).toBe(second.id);
		expect((await nextInQueue(second.id)).id).toBe(first.id);
	});
});

describe('old Classroom addresses', () => {
	const redirectOf = async (fn, event) => {
		try {
			await fn(event);
		} catch (r) {
			return [r.status, r.location];
		}
		return null;
	};
	test('Images, Videos and Status land on the new pages', async () => {
		expect(await redirectOf(imagesLoad, {})).toEqual([301, '/classroom']);
		expect(await redirectOf(videosLoad, {})).toEqual([301, '/classroom']);
		expect(await redirectOf(courseVideosLoad, { params: { courseId: 'abc' } })).toEqual([
			301,
			'/classroom/courses/abc/details'
		]);
		expect(await redirectOf(statusLoad, { params: { id: 'abc' } })).toEqual([
			301,
			'/classroom/courses/abc'
		]);
	});
});
