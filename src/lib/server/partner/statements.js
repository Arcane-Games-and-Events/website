/**
 * Monthly statements and payouts under the Partner model.
 *
 * AGE collects every payment (Authorize.net can't split one) and pays
 * teachers outside the site. Each teacher has one statement per month: the
 * ledger rows that became payable that month (sales after their hold, once
 * Authorize.net confirms the charge settled; referral bonuses, pool shares) less refunds and chargebacks. A
 * month's statement is paid on the first Monday of the next month; an
 * admin marks it paid with a reference. A month that comes out negative
 * carries into the next one.
 *
 * Old sales copied from course_sale that an old-style payout already paid
 * are left out. Marking a statement paid also stamps the old course_sale
 * rows it covered, so the old payout screen can never pay them again.
 */
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseSale,
	deskCourse,
	partnerAccount,
	partnerLedger,
	partnerStatement,
	teacherPayout,
	user as userTable
} from '$lib/server/db/schema.js';
import { PAY_WEEKDAY } from '$lib/academy/partner/terms.js';
import { standing } from '$lib/academy/partner/pricing.js';
import { CourseError } from '$lib/server/courses/builder.js';
import { notify } from '$lib/server/courses/notifications.js';
import { monthOf } from './ledger.js';
import { awaitingSettlement } from './settlement.js';

/** The pay date for a month's statement: the first Monday of the next month. */
export function payDateOf(month) {
	const d = new Date(`${month}T00:00:00Z`);
	const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
	const day = 1 + ((PAY_WEEKDAY - first.getUTCDay() + 7) % 7);
	return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day))
		.toISOString()
		.slice(0, 10);
}

/** Has the month ended (so its statement can be paid)? */
export const monthClosed = (month, now = new Date()) => monthOf(now) > month;

/** Which part of a statement a ledger row belongs to. */
function bucketOf(row) {
	if (row.entryType === 'sale') return 'salesCents';
	if (row.entryType === 'referral_bonus') return 'referralCents';
	if (row.entryType === 'pool_share') return 'poolCents';
	return 'deductedCents'; // reversals and adjustments (negative)
}

const blank = (teacherId, month) => ({
	teacherId,
	month,
	payDate: payDateOf(month),
	copies: 0,
	salesCents: 0,
	referralCents: 0,
	poolCents: 0,
	deductedCents: 0,
	carriedCents: 0,
	totalCents: 0,
	payableCents: 0,
	status: 'pending',
	paid: null
});

/**
 * Statements built from ledger rows, per teacher and month, oldest first,
 * with negative months carried into the next.
 */
function build(rows, paidRows, now) {
	const byKey = new Map();
	for (const r of rows) {
		const key = `${r.teacherId}|${r.statementMonth}`;
		const s = byKey.get(key) || blank(r.teacherId, r.statementMonth);
		s[bucketOf(r)] += r.teacherCents;
		if (r.entryType === 'sale') s.copies++;
		if (r.entryType === 'reversal') s.copies--;
		byKey.set(key, s);
	}
	for (const p of paidRows) {
		const key = `${p.teacherId}|${p.month}`;
		const s = byKey.get(key) || blank(p.teacherId, p.month);
		s.status = p.status;
		s.paid = p;
		byKey.set(key, s);
	}
	const list = [...byKey.values()].sort(
		(a, b) => a.teacherId.localeCompare(b.teacherId) || a.month.localeCompare(b.month)
	);
	let carry = 0;
	let teacher = null;
	for (const s of list) {
		if (s.teacherId !== teacher) {
			teacher = s.teacherId;
			carry = 0;
		}
		s.totalCents = s.salesCents + s.referralCents + s.poolCents + s.deductedCents;
		s.carriedCents = carry;
		const balance = s.totalCents + carry;
		if (s.status === 'paid') {
			s.payableCents = s.paid.amountCents ?? 0;
			carry = 0;
		} else {
			s.payableCents = Math.max(0, balance);
			carry = Math.min(0, balance);
		}
		s.open = !monthClosed(s.month, now);
	}
	return list;
}

/** Ledger rows that count toward statements (not settled by an old payout). */
async function ledgerRows({ teacherId = null, month = null, now = new Date() } = {}) {
	const where = [
		isNull(partnerLedger.settledPayoutId),
		// A sale on a month that has ended counts once its charge has settled.
		sql`not (${partnerLedger.entryType} = 'sale' and ${partnerLedger.settledAt} is null
			and ${partnerLedger.statementMonth} < ${monthOf(now)}::date)`
	];
	if (teacherId) where.push(eq(partnerLedger.teacherId, teacherId));
	if (month) where.push(sql`${partnerLedger.statementMonth} <= ${month}::date`);
	return db
		.select({
			teacherId: partnerLedger.teacherId,
			statementMonth: sql`to_char(${partnerLedger.statementMonth}, 'YYYY-MM-DD')`,
			entryType: partnerLedger.entryType,
			teacherCents: partnerLedger.teacherCents
		})
		.from(partnerLedger)
		.where(and(...where));
}

async function paidRows({ teacherId = null } = {}) {
	return db
		.select({
			teacherId: partnerStatement.teacherId,
			month: sql`to_char(${partnerStatement.month}, 'YYYY-MM-DD')`,
			status: partnerStatement.status,
			amountCents: partnerStatement.amountCents,
			reference: partnerStatement.reference,
			paidAt: partnerStatement.paidAt
		})
		.from(partnerStatement)
		.where(teacherId ? eq(partnerStatement.teacherId, teacherId) : sql`true`);
}

async function lifetimeOf(teacherIds) {
	if (!teacherIds.length) return new Map();
	const rows = await db
		.select()
		.from(partnerAccount)
		.where(inArray(partnerAccount.teacherId, teacherIds));
	return new Map(rows.map((r) => [r.teacherId, r.lifetimeCopies]));
}

/**
 * A teacher's dashboard: their standing (lifetime copies, level, copies to
 * the next) and their statements newest first. Every ledger row:
 * ledgerDetail().
 */
export async function teacherStatements(teacherId, { now = new Date() } = {}) {
	const [rows, paid, lifetime] = await Promise.all([
		ledgerRows({ teacherId, now }),
		paidRows({ teacherId }),
		lifetimeOf([teacherId])
	]);
	const statements = build(rows, paid, now).reverse();
	const owed = statements.filter((s) => s.status !== 'paid');
	return {
		standing: standing(lifetime.get(teacherId) || 0),
		statements,
		totals: {
			paidCents: statements
				.filter((s) => s.status === 'paid')
				.reduce((n, s) => n + s.payableCents, 0),
			dueCents: owed.filter((s) => !s.open).reduce((n, s) => n + s.payableCents, 0),
			openCents: owed.filter((s) => s.open).reduce((n, s) => n + s.payableCents, 0)
		}
	};
}

/**
 * Admin: every teacher's statement for one month, with their level and
 * lifetime copies.
 */
export async function monthStatements(month, { now = new Date() } = {}) {
	const [rows, paid] = await Promise.all([ledgerRows({ month, now }), paidRows()]);
	const list = build(rows, paid, now).filter((s) => s.month === month);
	const ids = list.map((s) => s.teacherId);
	const [lifetime, people] = await Promise.all([
		lifetimeOf(ids),
		ids.length
			? db
					.select({
						id: userTable.id,
						firstName: userTable.firstName,
						lastName: userTable.lastName,
						email: userTable.email
					})
					.from(userTable)
					.where(inArray(userTable.id, ids))
			: []
	]);
	const who = new Map(people.map((p) => [p.id, p]));
	return list
		.map((s) => {
			const p = who.get(s.teacherId);
			const st = standing(lifetime.get(s.teacherId) || 0);
			return {
				...s,
				name: `${p?.firstName || ''} ${p?.lastName || ''}`.trim() || p?.email || s.teacherId,
				email: p?.email || null,
				lifetimeCopies: st.lifetimeCopies,
				level: st.level.name
			};
		})
		.sort((a, b) => b.payableCents - a.payableCents || a.name.localeCompare(b.name));
}

/** The months that have statements, newest first (and this month). */
export async function statementMonths({ now = new Date() } = {}) {
	const rows = await db
		.selectDistinct({ month: sql`to_char(${partnerLedger.statementMonth}, 'YYYY-MM-DD')` })
		.from(partnerLedger);
	const set = new Set(rows.map((r) => r.month));
	set.add(monthOf(now));
	return [...set].sort().reverse();
}

const csvCell = (v) => {
	const s = v == null ? '' : String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const dollars = (c) => (c / 100).toFixed(2);

/** Admin: a month's statements as CSV. */
export async function statementsCsv(month, opts) {
	const list = await monthStatements(month, opts);
	const head = [
		'month',
		'pay_date',
		'teacher',
		'email',
		'level',
		'lifetime_copies',
		'copies_this_month',
		'sales_earnings',
		'referral_bonuses',
		'pool_share',
		'refunds_and_chargebacks',
		'carried_from_earlier',
		'net_payable',
		'status',
		'reference'
	];
	const lines = list.map((s) =>
		[
			s.month.slice(0, 7),
			s.payDate,
			s.name,
			s.email,
			s.level,
			s.lifetimeCopies,
			s.copies,
			dollars(s.salesCents),
			dollars(s.referralCents),
			dollars(s.poolCents),
			dollars(s.deductedCents),
			dollars(s.carriedCents),
			dollars(s.payableCents),
			s.status,
			s.paid?.reference || ''
		]
			.map(csvCell)
			.join(',')
	);
	return [head.join(','), ...lines].join('\n') + '\n';
}

/**
 * Admin: record that a teacher's statement for a month was paid. The
 * month must have ended and have something to pay; a month is paid once.
 */
export async function markStatementPaid({
	teacherId,
	month,
	reference = null,
	note = null,
	actor,
	now = new Date()
}) {
	if (!/^\d{4}-\d{2}-01$/.test(String(month || ''))) throw new CourseError(400, 'Choose a month.');
	if (!monthClosed(month, now))
		throw new CourseError(409, 'This month isn’t over yet. Statements are paid once it ends.');
	const payout = await db.transaction(async (tx) => {
		// One payment at a time per teacher.
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'statement:' + teacherId}))`);
		const [s] = (await monthStatements(month, { now })).filter((x) => x.teacherId === teacherId);
		if (!s) throw new CourseError(404, 'No statement for this teacher and month.');
		if (s.status === 'paid') throw new CourseError(409, 'This statement is already paid.');
		if (s.payableCents <= 0)
			throw new CourseError(409, 'Nothing to pay this month; it carries into the next.');
		const [payout] = await tx
			.insert(teacherPayout)
			.values({
				teacherId,
				payDate: payDateOf(month),
				amountCents: s.payableCents,
				saleCount: Math.max(0, s.copies),
				paidBy: actor?.id ?? null,
				reference: reference ? String(reference).slice(0, 200) : null,
				note: note ? String(note).slice(0, 2000) : null
			})
			.returning();
		await tx
			.insert(partnerStatement)
			.values({
				teacherId,
				month,
				status: 'paid',
				amountCents: s.payableCents,
				payoutId: payout.id,
				reference: payout.reference,
				note: payout.note,
				paidAt: now,
				paidBy: actor?.id ?? null
			})
			.onConflictDoUpdate({
				target: [partnerStatement.teacherId, partnerStatement.month],
				set: {
					status: 'paid',
					amountCents: s.payableCents,
					payoutId: payout.id,
					reference: payout.reference,
					note: payout.note,
					paidAt: now,
					paidBy: actor?.id ?? null
				}
			});
		// Old course_sale rows this statement covered.
		const legacy = await tx
			.select({ id: partnerLedger.legacySaleId })
			.from(partnerLedger)
			.where(
				and(
					eq(partnerLedger.teacherId, teacherId),
					isNull(partnerLedger.settledPayoutId),
					sql`${partnerLedger.legacySaleId} is not null`,
					sql`${partnerLedger.statementMonth} = ${month}::date`
				)
			);
		if (legacy.length)
			await tx
				.update(courseSale)
				.set({ payoutId: payout.id })
				.where(
					and(
						inArray(
							courseSale.id,
							legacy.map((r) => r.id)
						),
						isNull(courseSale.payoutId)
					)
				);
		return payout;
	});
	try {
		await notify([teacherId], {
			kind: 'payout_paid',
			actorId: actor?.id ?? null,
			data: { cents: payout.amountCents, payDate: payout.payDate, sales: payout.saleCount }
		});
	} catch (err) {
		console.warn('[partner] payout notification not sent:', err?.message || err);
	}
	return payout;
}

/** Statement months of ledger rows, ascending, for one teacher (used by tests and the dashboard). */
export async function ledgerFor(teacherId) {
	return db
		.select()
		.from(partnerLedger)
		.where(eq(partnerLedger.teacherId, teacherId))
		.orderBy(asc(partnerLedger.occurredAt), asc(partnerLedger.createdAt));
}

/**
 * Admin: what each teacher is owed from months that have ended and aren't
 * paid yet, for the Classroom's to-do list. `overdue` when a pay date has
 * already passed.
 */
export async function statementsDue({ now = new Date() } = {}) {
	const [rows, paid] = await Promise.all([ledgerRows({ now }), paidRows()]);
	const today = now.toISOString().slice(0, 10);
	const byTeacher = new Map();
	for (const s of build(rows, paid, now)) {
		if (s.status === 'paid' || s.open || s.payableCents <= 0) continue;
		const t = byTeacher.get(s.teacherId) || {
			teacherId: s.teacherId,
			cents: 0,
			sales: 0,
			overdue: false
		};
		t.cents += s.payableCents;
		t.sales += Math.max(0, s.copies);
		if (s.payDate < today) t.overdue = true;
		byTeacher.set(s.teacherId, t);
	}
	return [...byTeacher.values()];
}

/**
 * Where one ledger row stands for the teacher: refunded or charged back,
 * still on hold (its hold, or waiting for its charge to settle), on this
 * month's statement, due (the month has
 * ended), or paid, with the pay date it goes out on.
 */
function rowStatus(row, paid, now) {
	if (row.entryType === 'sale' && row.status !== 'paid') return row.status; // refunded | charged_back
	if (row.settledPayoutId) return 'paid';
	if (paid.has(`${row.teacherId}|${row.statementMonth}`)) return 'paid';
	if (awaitingSettlement(row, now)) return 'on_hold';
	if (new Date(row.payableAt) > now) return 'on_hold';
	return monthClosed(row.statementMonth, now) ? 'due' : 'this_month';
}

/**
 * Every sale, bonus, pool share and deduction on the ledger, newest first,
 * each with where it stands and when it's paid: for a teacher's Earnings
 * (teacherId) or every teacher's (admins). AGE's own costs are left out.
 *
 * @param {{ teacherId?: string|null, limit?: number, now?: Date }} [opts]
 */
export async function ledgerDetail({ teacherId = null, limit = 1000, now = new Date() } = {}) {
	const where = [ne(partnerLedger.entryType, 'age_cost')];
	if (teacherId) where.push(eq(partnerLedger.teacherId, teacherId));
	const [rows, paid] = await Promise.all([
		db
			.select({
				id: partnerLedger.id,
				entryType: partnerLedger.entryType,
				status: partnerLedger.status,
				teacherId: partnerLedger.teacherId,
				teacherFirst: userTable.firstName,
				teacherLast: userTable.lastName,
				courseTitle: deskCourse.title,
				courseSlug: deskCourse.slug,
				orderId: partnerLedger.orderId,
				checkoutItemId: partnerLedger.checkoutItemId,
				buyerType: partnerLedger.buyerType,
				listCents: partnerLedger.listCents,
				buyerPaidCents: partnerLedger.buyerPaidCents,
				shareRate: partnerLedger.shareRate,
				level: partnerLedger.level,
				copyNumber: partnerLedger.copyNumber,
				teacherCents: partnerLedger.teacherCents,
				ageNetCents: partnerLedger.ageNetCents,
				occurredAt: partnerLedger.occurredAt,
				payableAt: partnerLedger.payableAt,
				statementMonth: sql`to_char(${partnerLedger.statementMonth}, 'YYYY-MM-DD')`,
				settledPayoutId: partnerLedger.settledPayoutId,
				settledAt: partnerLedger.settledAt,
				note: partnerLedger.note
			})
			.from(partnerLedger)
			.leftJoin(deskCourse, eq(partnerLedger.courseId, deskCourse.id))
			.leftJoin(userTable, eq(partnerLedger.teacherId, userTable.id))
			.where(and(...where))
			.orderBy(sql`${partnerLedger.occurredAt} desc`, sql`${partnerLedger.createdAt} desc`)
			.limit(limit),
		paidRows({ teacherId })
	]);
	const paidSet = new Set(
		paid.filter((p) => p.status === 'paid').map((p) => `${p.teacherId}|${p.month}`)
	);
	return rows.map((r) => {
		const status = rowStatus(r, paidSet, now);
		// On hold past its hold date: waiting on Authorize.net to settle.
		const awaitingBank = status === 'on_hold' && !r.settledAt && new Date(r.payableAt) <= now;
		return {
			...r,
			teacher: `${r.teacherFirst || ''} ${r.teacherLast || ''}`.trim() || null,
			status,
			payDate: payDateOf(r.statementMonth),
			awaitingBank,
			// Refunded sales come off through their reversal row; they earn nothing here.
			countsCents:
				r.entryType === 'sale' && (status === 'refunded' || status === 'charged_back')
					? 0
					: r.teacherCents
		};
	});
}

/**
 * What's still to be paid, by pay date: each unpaid statement (this month's
 * included, as it stands so far), with how much of it is still in the
 * hold. One teacher's, or every teacher's added together.
 *
 * @param {{ teacherId?: string|null, now?: Date }} [opts]
 */
export async function expectedPayouts({ teacherId = null, now = new Date() } = {}) {
	const [rows, paid] = await Promise.all([ledgerRows({ teacherId, now }), paidRows({ teacherId })]);
	const held = await db
		.select({
			teacherId: partnerLedger.teacherId,
			month: sql`to_char(${partnerLedger.statementMonth}, 'YYYY-MM-DD')`,
			cents: sql`coalesce(sum(${partnerLedger.teacherCents}), 0)::int`
		})
		.from(partnerLedger)
		.where(
			and(
				eq(partnerLedger.entryType, 'sale'),
				eq(partnerLedger.status, 'paid'),
				sql`(${partnerLedger.payableAt} > ${now.toISOString()}::timestamptz or ${partnerLedger.settledAt} is null)`,
				teacherId ? eq(partnerLedger.teacherId, teacherId) : sql`true`
			)
		)
		.groupBy(partnerLedger.teacherId, partnerLedger.statementMonth);
	const heldBy = new Map(held.map((h) => [`${h.teacherId}|${h.month}`, Number(h.cents)]));
	const byDate = new Map();
	for (const s of build(rows, paid, now)) {
		if (s.status === 'paid' || s.payableCents <= 0) continue;
		const x = byDate.get(s.payDate) || {
			payDate: s.payDate,
			month: s.month,
			cents: 0,
			onHoldCents: 0,
			teachers: 0,
			due: !s.open
		};
		x.cents += s.payableCents;
		x.onHoldCents += Math.min(s.payableCents, heldBy.get(`${s.teacherId}|${s.month}`) || 0);
		x.teachers++;
		byDate.set(s.payDate, x);
	}
	return [...byDate.values()].sort((a, b) => a.payDate.localeCompare(b.payDate));
}
