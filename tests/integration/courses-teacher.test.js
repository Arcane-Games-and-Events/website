/**
 * The teacher's tools: the class roster, course analytics, earnings with
 * the 14-day hold, and the admin side of payouts.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { caView, courseSale, teacherPayout } from '$lib/server/db/schema.js';
import { POST as addRoute } from '../../src/routes/api/desk/courses/[id]/students/+server.js';
import { DELETE as removeRoute } from '../../src/routes/api/desk/courses/[id]/students/[enrollmentId]/+server.js';
import { POST as payoutRoute } from '../../src/routes/api/desk/payouts/+server.js';
import { listStudents, rosterCsv } from '$lib/server/courses/roster.js';
import { setComplete } from '$lib/server/courses/progress.js';
import { courseAnalytics } from '$lib/server/courses/analytics.js';
import { startView } from '$lib/server/contentAnalytics/collect.js';
import { outlineOf } from '$lib/server/courses/builder.js';
import {
	PAYOUT_ANCHOR,
	markPaid,
	nextPayDate,
	payDates,
	payoutsDue,
	teacherEarnings
} from '$lib/server/courses/earnings.js';
import { createAdmin, createUser } from '../support/factories.js';
import { callRoute, createTeacher, enrol, liveCourse } from '../support/courses.js';

let teacher;
let admin;
let live;

beforeEach(async () => {
	teacher = await createTeacher();
	admin = await createAdmin();
	live = await liveCourse(teacher, { topics: 4 });
});

describe('the roster', () => {
	const add = (user, email) =>
		callRoute(addRoute, { params: { id: live.course.id }, user, body: { email } });

	test('a teacher adds a student free by email, once', async () => {
		const s = await createUser({ email: 'Student.One@test.age' });
		const r = await add(teacher, 'student.one@TEST.age');
		expect(r.status).toBe(200);
		expect(r.body.enrollment).toMatchObject({ userId: s.id, source: 'comp', addedBy: teacher.id });
		expect((await add(teacher, 'student.one@test.age')).status).toBe(409);
		expect((await add(teacher, 'nobody@test.age')).status).toBe(404);
	});

	test('another teacher can’t touch the roster', async () => {
		await createUser({ email: 'x@test.age' });
		expect((await add(await createTeacher(), 'x@test.age')).status).toBe(403);
	});

	test('teachers remove students they added; paying students only an admin can remove', async () => {
		const comp = await enrol(live.course, await createUser());
		const paid = await enrol(live.course, await createUser(), { source: 'purchase' });
		const remove = (user, en) =>
			callRoute(removeRoute, {
				method: 'DELETE',
				params: { id: live.course.id, enrollmentId: en.id },
				user
			});
		expect((await remove(teacher, comp)).status).toBe(200);
		expect((await remove(teacher, paid)).status).toBe(403);
		expect((await remove(admin, paid)).status).toBe(200);
		expect(await listStudents(live.course.id)).toHaveLength(0);
	});

	test('progress per student, and a CSV that spreadsheets can’t run', async () => {
		const s = await createUser({ firstName: '=HYPERLINK("x")', lastName: 'Evil' });
		await enrol(live.course, s);
		await setComplete(s.id, live.topics[0].id, true);
		await setComplete(s.id, live.topics[1].id, true);
		const [row] = await listStudents(live.course.id);
		expect(row).toMatchObject({ completed: 2, topics: 4, percent: 50 });
		const csv = rosterCsv([row]);
		expect(csv.split('\n')[1].startsWith(`"'=HYPERLINK(""x"") Evil"`)).toBe(true);
	});
});

describe('analytics', () => {
	async function view({
		lessonId = null,
		audience = 'free',
		visitor = randomUUID(),
		at = new Date()
	}) {
		await db.insert(caView).values({
			id: randomUUID(),
			courseId: live.course.id,
			lessonId,
			visitorId: visitor,
			sessionId: randomUUID(),
			audience,
			kind: lessonId ? 'topic' : 'course',
			qualified: true,
			startedAt: at
		});
	}

	test('visits, conversion, and where students stop', async () => {
		for (let i = 0; i < 4; i++) await view({});
		await view({ audience: 'staff' }); // never counted
		const students = [];
		for (let i = 0; i < 4; i++) {
			const s = await createUser();
			await enrol(live.course, s, { source: i < 2 ? 'purchase' : 'comp' });
			students.push(s);
		}
		// Everyone finishes topic 1, three finish topic 2, then only one goes on.
		const order = (await outlineOf(live.course.id)).flatMap((sec) => sec.topics);
		const [t1, t2, t3] = order;
		for (const s of students) await setComplete(s.id, t1.id, true);
		for (const s of students.slice(0, 3)) await setComplete(s.id, t2.id, true);
		await setComplete(students[0].id, t3.id, true);

		const r = await courseAnalytics(live.course.id, 30);
		expect(r.totals).toMatchObject({
			visits: 4,
			visitors: 4,
			newStudents: 4,
			bought: 2,
			conversion: 50
		});
		expect(r.funnel.map((f) => f.completedPct)).toEqual([100, 75, 25, 0]);
		expect(r.stop).toMatchObject({ after: t2.title, at: t3.title, lost: 50 });
		expect(r.daily.visits).toHaveLength(30);
		expect(r.daily.visits.at(-1).n).toBe(4);
	});

	test('topic views are recorded against the course, and a topic from another course is refused', async () => {
		const event = {
			request: new Request('http://localhost', { headers: { 'user-agent': 'Mozilla/5.0 Safari' } }),
			locals: { user: null }
		};
		const base = () => ({ id: randomUUID(), visitorId: randomUUID(), sessionId: randomUUID() });
		await startView({ ...base(), courseId: live.course.id, lessonId: live.topics[0].id }, event);
		const other = await liveCourse(await createTeacher(), { title: 'Other' });
		await startView({ ...base(), courseId: live.course.id, lessonId: other.topics[0].id }, event);
		const rows = await db.select().from(caView).where(eq(caView.courseId, live.course.id));
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ lessonId: live.topics[0].id, kind: 'topic' });
	});
});

describe('earnings and payouts', () => {
	const DAY = 864e5;
	async function sale({
		gross = 5000,
		soldDaysAgo = 20,
		teacherId = teacher.id,
		refunded = 0,
		payableAt = null
	} = {}) {
		const soldAt = new Date(Date.now() - soldDaysAgo * DAY);
		const [row] = await db
			.insert(courseSale)
			.values({
				courseId: live.course.id,
				teacherId,
				grossCents: gross,
				refundedCents: refunded,
				soldAt,
				payableAt: payableAt || new Date(soldAt.getTime() + 14 * DAY)
			})
			.returning();
		return row;
	}

	test('pay dates fall every 14 days from the anchor', () => {
		expect(nextPayDate(new Date('2026-11-01T10:00:00Z'))).toBe(PAYOUT_ANCHOR);
		expect(nextPayDate(new Date(`${PAYOUT_ANCHOR}T22:00:00Z`))).toBe(PAYOUT_ANCHOR);
		expect(nextPayDate(new Date('2026-11-14T00:00:00Z'))).toBe('2026-11-27');
		expect(nextPayDate(new Date('2026-11-27T12:00:00Z'))).toBe('2026-11-27');
		const ds = payDates(new Date('2026-12-01T00:00:00Z'), 3);
		expect(ds).toEqual(['2026-12-11', '2026-12-25', '2027-01-08']);
	});

	test('the teacher earns 90%; recent sales are on hold until 14 days have passed', async () => {
		await sale({ soldDaysAgo: 20 }); // payable
		await sale({ soldDaysAgo: 3 }); // on hold
		await sale({ soldDaysAgo: 30, refunded: 1000 }); // payable, part refunded
		const e = await teacherEarnings(teacher.id);
		expect(e.totals).toMatchObject({
			sales: 3,
			grossCents: 15000,
			refundedCents: 1000,
			earnedCents: 4500 + 4500 + 3600,
			onHoldCents: 4500,
			payableCents: 8100,
			paidCents: 0
		});
		// Someone else's sales never show.
		await sale({ teacherId: (await createTeacher()).id });
		expect((await teacherEarnings(teacher.id)).totals.sales).toBe(3);
	});

	test('marking paid takes exactly what’s due, once, and only an admin can', async () => {
		const date = nextPayDate();
		await sale({ soldDaysAgo: 20 });
		// Payable the day after this pay date: it waits for the next one.
		await sale({
			soldDaysAgo: 0,
			payableAt: new Date(new Date(`${date}T12:00:00Z`).getTime() + DAY)
		});
		const [due] = await payoutsDue(date);
		expect(due).toMatchObject({ teacherId: teacher.id, sales: 1, cents: 4500 });

		const asTeacher = await callRoute(payoutRoute, {
			user: teacher,
			body: { teacherId: teacher.id, payDate: date }
		});
		expect(asTeacher.status).toBe(403);

		const r = await callRoute(payoutRoute, {
			user: admin,
			body: { teacherId: teacher.id, payDate: date, reference: 'TX-1' }
		});
		expect(r.status).toBe(200);
		expect(r.body.payout).toMatchObject({ amountCents: 4500, saleCount: 1, reference: 'TX-1' });
		expect(await payoutsDue(date)).toHaveLength(0);

		const again = await callRoute(payoutRoute, {
			user: admin,
			body: { teacherId: teacher.id, payDate: date }
		});
		expect(again.status).toBe(409);
		const e = await teacherEarnings(teacher.id);
		expect(e.totals.paidCents).toBe(4500);
		expect(e.totals.onHoldCents).toBe(4500);
	});

	test('a refund after a payout doesn’t change the payout that was made', async () => {
		const s = await sale({ soldDaysAgo: 20 });
		const payout = await markPaid({ teacherId: teacher.id, payDate: nextPayDate(), actor: admin });
		await db.update(courseSale).set({ refundedCents: 5000 }).where(eq(courseSale.id, s.id));
		const [p] = await db.select().from(teacherPayout).where(eq(teacherPayout.id, payout.id));
		expect(p.amountCents).toBe(4500);
		expect((await teacherEarnings(teacher.id)).totals.paidCents).toBe(4500);
	});

	test('missed pay dates roll into the next payout', async () => {
		await sale({ soldDaysAgo: 60 });
		await sale({ soldDaysAgo: 20 });
		const [due] = await payoutsDue(nextPayDate());
		expect(due.sales).toBe(2);
	});
});
