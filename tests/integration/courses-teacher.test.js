/**
 * The teacher's tools: the class roster, course analytics, earnings with
 * the 14-day hold, and the admin side of payouts.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { caView, partnerLedger, teacherPayout } from '$lib/server/db/schema.js';
import { POST as addRoute } from '../../src/routes/api/desk/courses/[id]/students/+server.js';
import { DELETE as removeRoute } from '../../src/routes/api/desk/courses/[id]/students/[enrollmentId]/+server.js';
import { POST as payoutRoute } from '../../src/routes/api/desk/payouts/+server.js';
import { listStudents, rosterCsv } from '$lib/server/courses/roster.js';
import { setComplete } from '$lib/server/courses/progress.js';
import { courseAnalytics } from '$lib/server/courses/analytics.js';
import { startView } from '$lib/server/contentAnalytics/collect.js';
import { outlineOf } from '$lib/server/courses/builder.js';
import { nextPayDate, payDates, teacherEarnings } from '$lib/server/courses/earnings.js';
import { monthOf, reverseSales } from '$lib/server/partner/ledger.js';
import {
	markStatementPaid,
	monthStatements,
	statementsDue
} from '$lib/server/partner/statements.js';
import { createAdmin, createUser } from '../support/factories.js';
import { callRoute, createTeacher, enrol, legacySale, liveCourse } from '../support/courses.js';

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
		return legacySale({
			courseId: live.course.id,
			teacherId,
			grossCents: gross,
			refundedCents: refunded,
			soldAt,
			payableAt: payableAt || new Date(soldAt.getTime() + 14 * DAY)
		});
	}

	test('pay dates fall on the first Monday of every month', () => {
		// November 2026 starts on a Sunday, so its first Monday is the 2nd. The
		// pay date is a pay date all day; from the next day it's next month's.
		expect(nextPayDate(new Date('2026-11-01T22:00:00Z'))).toBe('2026-11-02');
		expect(nextPayDate(new Date('2026-11-02T23:00:00Z'))).toBe('2026-11-02');
		expect(nextPayDate(new Date('2026-11-03T00:00:00Z'))).toBe('2026-12-07');
		expect(nextPayDate(new Date('2026-12-31T23:59:00Z'))).toBe('2027-01-04');
		// February 2027 starts on a Monday: that's the pay date.
		expect(nextPayDate(new Date('2027-01-20T12:00:00Z'))).toBe('2027-02-01');
		expect(payDates(new Date('2026-11-20T00:00:00Z'), 4)).toEqual([
			'2026-12-07',
			'2027-01-04',
			'2027-02-01',
			'2027-03-01'
		]);
		for (const d of payDates(new Date('2026-01-01T00:00:00Z'), 24)) {
			expect(new Date(`${d}T00:00:00Z`).getUTCDay()).toBe(1);
			expect(Number(d.slice(8))).toBeLessThanOrEqual(7);
		}
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

	// The middle of the month `n` months before this one (UTC).
	const monthsAgo = (n) => {
		const d = new Date();
		return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 15));
	};

	test('marking a month’s statement paid takes it once, and only an admin can', async () => {
		const month = monthOf(monthsAgo(1));
		await sale({ soldDaysAgo: 60, payableAt: monthsAgo(1) });
		// Payable this month: on next month's statement, not this one.
		await sale({ soldDaysAgo: 0, payableAt: new Date() });

		const asTeacher = await callRoute(payoutRoute, {
			user: teacher,
			body: { teacherId: teacher.id, month }
		});
		expect(asTeacher.status).toBe(403);

		const r = await callRoute(payoutRoute, {
			user: admin,
			body: { teacherId: teacher.id, month, reference: 'TX-1' }
		});
		expect(r.status).toBe(200);
		expect(r.body.payout).toMatchObject({ amountCents: 4500, saleCount: 1, reference: 'TX-1' });

		const again = await callRoute(payoutRoute, {
			user: admin,
			body: { teacherId: teacher.id, month }
		});
		expect(again.status).toBe(409);
		// This month isn't over yet.
		const early = await callRoute(payoutRoute, {
			user: admin,
			body: { teacherId: teacher.id, month: monthOf(new Date()) }
		});
		expect(early.status).toBe(409);
		const e = await teacherEarnings(teacher.id);
		expect(e.totals.paidCents).toBe(4500);
	});

	test('a refund after a payout doesn’t change it; it comes off the next statement', async () => {
		const month = monthOf(monthsAgo(1));
		const s = await sale({ soldDaysAgo: 60, payableAt: monthsAgo(1) });
		const payout = await markStatementPaid({ teacherId: teacher.id, month, actor: admin });
		const [row] = await db.select().from(partnerLedger).where(eq(partnerLedger.legacySaleId, s.id));
		await db.transaction((tx) => reverseSales(tx, [row], { status: 'refunded', at: new Date() }));
		const [p] = await db.select().from(teacherPayout).where(eq(teacherPayout.id, payout.id));
		expect(p.amountCents).toBe(4500);
		const [now] = await monthStatements(monthOf(new Date()));
		expect(now).toMatchObject({ deductedCents: -4500, payableCents: 0 });
	});

	test('unpaid months stay due, and show as overdue once their pay date passes', async () => {
		await sale({ soldDaysAgo: 90, payableAt: monthsAgo(2) });
		await sale({ soldDaysAgo: 60, payableAt: monthsAgo(1) });
		const [due] = await statementsDue();
		expect(due).toMatchObject({ teacherId: teacher.id, cents: 9000, sales: 2, overdue: true });
	});
});
