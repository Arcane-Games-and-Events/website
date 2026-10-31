/**
 * Teacher earnings and payouts.
 *
 * - Each paid enrollment is a `course_sale`: the teacher earns share_pct
 *   (90%) of what the student paid, less any refund.
 * - A sale is on hold for 14 days (the refund window), then payable.
 * - AGE pays teachers every two weeks, on PAYOUT_ANCHOR and every 14 days
 *   after. A payout covers every unpaid sale that is payable by its pay
 *   date. AGE pays outside the site; an admin marks the payout as paid
 *   here, which stamps the sales so they can never be paid twice.
 * - A refund after a sale was paid doesn't change the payout already made.
 */
import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseSale, deskCourse, teacherPayout, user as userTable } from '$lib/server/db/schema.js';
import { CourseError } from './builder.js';

/** The first pay date (a Friday). Every pay date is this plus a multiple of 14 days. */
export const PAYOUT_ANCHOR = '2026-11-13';
const DAY = 864e5;
const anchor = () => new Date(`${PAYOUT_ANCHOR}T00:00:00Z`).getTime();
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
/** A pay date covers sales payable any time that day (UTC). */
export const endOfDay = (date) => new Date(`${date}T23:59:59.999Z`);

/** The teacher's part of a sale, in cents. */
export const shareOf = (s) =>
	Math.round(((s.grossCents - s.refundedCents) * (s.sharePct ?? 90)) / 100);

/** The first pay date on or after `from` (YYYY-MM-DD). */
export function nextPayDate(from = new Date()) {
	const today = new Date(ymd(from) + 'T00:00:00Z').getTime();
	const a = anchor();
	if (today <= a) return PAYOUT_ANCHOR;
	const steps = Math.ceil((today - a) / (14 * DAY));
	return ymd(a + steps * 14 * DAY);
}

/** `count` pay dates starting from the next one. */
export function payDates(from = new Date(), count = 6) {
	const first = new Date(nextPayDate(from) + 'T00:00:00Z').getTime();
	return Array.from({ length: count }, (_, i) => ymd(first + i * 14 * DAY));
}

/** The pay date a sale will be paid on, if it isn't paid already. */
export function payDateFor(sale) {
	return nextPayDate(new Date(sale.payableAt));
}

/**
 * Everything a teacher has earned, optionally for one course.
 * @param {string} teacherId
 * @param {{ courseId?: string, now?: Date }} [opts]
 */
export async function teacherEarnings(teacherId, { courseId = null, now = new Date() } = {}) {
	const where = [eq(courseSale.teacherId, teacherId)];
	if (courseId) where.push(eq(courseSale.courseId, courseId));
	const sales = await db
		.select({
			id: courseSale.id,
			courseId: courseSale.courseId,
			courseTitle: deskCourse.title,
			grossCents: courseSale.grossCents,
			refundedCents: courseSale.refundedCents,
			sharePct: courseSale.sharePct,
			soldAt: courseSale.soldAt,
			payableAt: courseSale.payableAt,
			payoutId: courseSale.payoutId
		})
		.from(courseSale)
		.innerJoin(deskCourse, eq(courseSale.courseId, deskCourse.id))
		.where(and(...where))
		.orderBy(desc(courseSale.soldAt));

	const next = nextPayDate(now);
	const nextEnd = endOfDay(next);
	const unpaid = sales.filter((s) => !s.payoutId);
	const sum = (list) => list.reduce((n, s) => n + shareOf(s), 0);

	const payouts = courseId
		? []
		: await db
				.select()
				.from(teacherPayout)
				.where(eq(teacherPayout.teacherId, teacherId))
				.orderBy(desc(teacherPayout.payDate));

	// Money still on hold, grouped by the pay date it will go out on.
	const schedule = new Map();
	for (const s of unpaid) {
		const d = payDateFor(s);
		const x = schedule.get(d) || { payDate: d, cents: 0, sales: 0 };
		x.cents += shareOf(s);
		x.sales++;
		schedule.set(d, x);
	}

	const byCourse = new Map();
	for (const s of sales) {
		const x = byCourse.get(s.courseId) || {
			courseId: s.courseId,
			title: s.courseTitle,
			sales: 0,
			grossCents: 0,
			refundedCents: 0,
			earnedCents: 0
		};
		x.sales++;
		x.grossCents += s.grossCents;
		x.refundedCents += s.refundedCents;
		x.earnedCents += shareOf(s);
		byCourse.set(s.courseId, x);
	}

	return {
		sharePct: 90,
		holdDays: 14,
		totals: {
			sales: sales.length,
			grossCents: sales.reduce((n, s) => n + s.grossCents, 0),
			refundedCents: sales.reduce((n, s) => n + s.refundedCents, 0),
			earnedCents: sum(sales),
			paidCents: courseId
				? sum(sales.filter((s) => s.payoutId))
				: payouts.reduce((n, p) => n + p.amountCents, 0),
			onHoldCents: sum(unpaid.filter((s) => new Date(s.payableAt) > now)),
			payableCents: sum(unpaid.filter((s) => new Date(s.payableAt) <= now))
		},
		next: {
			payDate: next,
			cents: sum(unpaid.filter((s) => new Date(s.payableAt) <= nextEnd)),
			sales: unpaid.filter((s) => new Date(s.payableAt) <= nextEnd).length
		},
		schedule: [...schedule.values()].sort((a, b) => a.payDate.localeCompare(b.payDate)),
		courses: [...byCourse.values()].sort((a, b) => b.earnedCents - a.earnedCents),
		sales: sales.slice(0, 100).map((s) => ({
			...s,
			earnedCents: shareOf(s),
			status: s.payoutId ? 'paid' : new Date(s.payableAt) > now ? 'on_hold' : 'payable',
			payDate: s.payoutId ? null : payDateFor(s)
		})),
		payouts
	};
}

/**
 * For admins: what each teacher is owed on a pay date (every unpaid sale
 * payable by then, including any missed from earlier pay dates).
 */
export async function payoutsDue(payDate = nextPayDate()) {
	const rows = await db
		.select({
			teacherId: courseSale.teacherId,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			email: userTable.email,
			sales: sql`count(*)::int`,
			cents: sql`coalesce(sum(round((${courseSale.grossCents} - ${courseSale.refundedCents}) * ${courseSale.sharePct} / 100.0)), 0)::int`,
			oldest: sql`min(${courseSale.payableAt})`
		})
		.from(courseSale)
		.innerJoin(userTable, eq(courseSale.teacherId, userTable.id))
		.where(and(isNull(courseSale.payoutId), lte(courseSale.payableAt, endOfDay(payDate))))
		.groupBy(courseSale.teacherId, userTable.firstName, userTable.lastName, userTable.email)
		.orderBy(desc(sql`sum(${courseSale.grossCents})`));
	return rows.map((r) => ({
		teacherId: r.teacherId,
		name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email,
		email: r.email,
		sales: Number(r.sales),
		cents: Number(r.cents),
		overdue: r.oldest ? nextPayDate(new Date(r.oldest)) < payDate : false
	}));
}

/** Recent payouts across all teachers, for the admin history. */
export async function payoutHistory({ limit = 50 } = {}) {
	const rows = await db
		.select({
			payout: teacherPayout,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			email: userTable.email
		})
		.from(teacherPayout)
		.innerJoin(userTable, eq(teacherPayout.teacherId, userTable.id))
		.orderBy(desc(teacherPayout.paidAt))
		.limit(limit);
	return rows.map((r) => ({
		...r.payout,
		teacher: `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email
	}));
}

/** The sales a payout paid. */
export async function payoutSales(payoutId) {
	return db
		.select({
			id: courseSale.id,
			courseTitle: deskCourse.title,
			grossCents: courseSale.grossCents,
			refundedCents: courseSale.refundedCents,
			sharePct: courseSale.sharePct,
			soldAt: courseSale.soldAt
		})
		.from(courseSale)
		.innerJoin(deskCourse, eq(courseSale.courseId, deskCourse.id))
		.where(eq(courseSale.payoutId, payoutId))
		.orderBy(asc(courseSale.soldAt));
}

/**
 * Admin: record that a teacher was paid for a pay date. Takes exactly the
 * unpaid sales payable by then; a sale is never paid twice.
 */
export async function markPaid({ teacherId, payDate, reference = null, note = null, actor }) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payDate || '')))
		throw new CourseError(400, 'Choose a pay date.');
	return db.transaction(async (tx) => {
		const sales = await tx
			.select()
			.from(courseSale)
			.where(
				and(
					eq(courseSale.teacherId, teacherId),
					isNull(courseSale.payoutId),
					lte(courseSale.payableAt, endOfDay(payDate))
				)
			)
			.for('update');
		if (!sales.length) throw new CourseError(409, 'Nothing is owed to this teacher for that date.');
		const amountCents = sales.reduce((n, s) => n + shareOf(s), 0);
		const [payout] = await tx
			.insert(teacherPayout)
			.values({
				teacherId,
				payDate,
				amountCents,
				saleCount: sales.length,
				paidBy: actor?.id ?? null,
				reference: reference ? String(reference).slice(0, 200) : null,
				note: note ? String(note).slice(0, 2000) : null
			})
			.returning();
		await tx
			.update(courseSale)
			.set({ payoutId: payout.id })
			.where(
				and(
					inArray(
						courseSale.id,
						sales.map((s) => s.id)
					),
					isNull(courseSale.payoutId)
				)
			);
		return payout;
	});
}
