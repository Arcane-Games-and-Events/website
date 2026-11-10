/**
 * Teacher earnings, for the Classroom's summaries (the Classroom home, a
 * course's Earnings tab).
 *
 * - Sales come from the Partner ledger (see $lib/server/partner/sales.js):
 *   each copy at the share it was sold at (90%, 93% or 95%) of its list
 *   price, less refunds. Sales from before the Partner model are in the
 *   ledger too.
 * - A sale is on hold for HOLD_DAYS, and until its charge settles, then lands on that
 *   month's statement, paid on the first Monday of the next month.
 * - Payouts are made from monthly statements: see partner/statements.js.
 */
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse, teacherPayout, user as userTable } from '$lib/server/db/schema.js';
import { salesSource } from '$lib/server/partner/sales.js';
import { monthOf } from '$lib/server/partner/ledger.js';
import { payDateOf } from '$lib/server/partner/statements.js';
import { HOLD_DAYS, PAY_WEEKDAY } from '$lib/academy/partner/terms.js';

const ymd = (t) => new Date(t).toISOString().slice(0, 10);
/** The pay date (the month's first Monday) in the month `monthsOn` months after `t`'s month. */
const payDayOf = (t, monthsOn = 0) => {
	const d = new Date(t);
	const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthsOn, 1));
	const day = 1 + ((PAY_WEEKDAY - first.getUTCDay() + 7) % 7);
	return ymd(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day));
};
/** The teacher's part of a sale, in cents. */
export const shareOf = (s) =>
	Math.round(((s.grossCents - s.refundedCents) * (s.sharePct ?? 90)) / 100);

/** The first pay date (a month's first Monday) on or after `from` (YYYY-MM-DD). */
export function nextPayDate(from = new Date()) {
	const today = ymd(from);
	const thisMonth = payDayOf(from);
	return today <= thisMonth ? thisMonth : payDayOf(from, 1);
}

/** `count` pay dates starting from the next one. */
export function payDates(from = new Date(), count = 6) {
	const first = new Date(`${nextPayDate(from)}T00:00:00Z`).getTime();
	return Array.from({ length: count }, (_, i) => payDayOf(first, i));
}

/** The pay date a sale will be paid on, if it isn't paid already. */
export function payDateFor(sale) {
	return payDateOf(monthOf(sale.payableAt));
}

/**
 * Everything a teacher has earned, optionally for one course.
 * @param {string} teacherId
 * @param {{ courseId?: string, now?: Date }} [opts]
 */
export async function teacherEarnings(teacherId, { courseId = null, now = new Date() } = {}) {
	const S = salesSource();
	const where = [eq(S.teacherId, teacherId)];
	if (courseId) where.push(eq(S.courseId, courseId));
	const sales = await db
		.select({
			id: S.id,
			courseId: S.courseId,
			courseTitle: deskCourse.title,
			grossCents: S.grossCents,
			refundedCents: S.refundedCents,
			sharePct: S.sharePct,
			soldAt: S.soldAt,
			payableAt: S.payableAt,
			payoutId: S.payoutId
		})
		.from(S)
		.innerJoin(deskCourse, eq(S.courseId, deskCourse.id))
		.where(and(...where))
		.orderBy(desc(S.soldAt));

	const next = nextPayDate(now);
	// Paid on or before the next pay date: their statement month has ended by then.
	const dueNext = (s) => payDateFor(s) <= next;
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
		holdDays: HOLD_DAYS,
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
			cents: sum(unpaid.filter(dueNext)),
			sales: unpaid.filter(dueNext).length
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
