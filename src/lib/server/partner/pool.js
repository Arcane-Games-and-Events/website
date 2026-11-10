/**
 * The teacher pool (built now, off by default).
 *
 * Reading is tracked from today: the first time each month a Premium
 * member opens a guide they own counts as one unique read.
 *
 * Once a month the pool job looks at the month just ended. It does nothing
 * unless the pool is on (POOL_ENABLED in terms.js) and AGE has at least
 * POOL_START_MEMBERS active Premium members. Then the pool is POOL_PCT of
 * that month's net Premium revenue (payments less refunds), shared among
 * teachers by their guides' unique member reads. A teacher shares in it
 * once they've sold POOL_MIN_COPIES_PER_YEAR copies in the twelve months
 * to the end of that month; reads of other teachers' guides don't count.
 */
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	deskCourse,
	guideRead,
	partnerLedger,
	payment,
	poolRun,
	subscription
} from '$lib/server/db/schema.js';
import {
	POOL_ENABLED,
	POOL_MIN_COPIES_PER_YEAR,
	POOL_PCT,
	POOL_START_MEMBERS
} from '$lib/academy/partner/terms.js';
import { applyRate, splitByWeight } from '$lib/academy/partner/pricing.js';
import { monthOf } from './ledger.js';

/** Count a Premium owner's read of a guide, once per month. Never fails the page. */
export async function recordGuideRead(userId, courseId, at = new Date()) {
	try {
		await db
			.insert(guideRead)
			.values({ userId, courseId, month: monthOf(at), firstReadAt: at })
			.onConflictDoNothing();
	} catch (err) {
		console.warn('[pool] read not recorded:', err?.message || err);
	}
}

/** The first of the month before `t`'s month: 'YYYY-MM-01'. */
export function previousMonth(t = new Date()) {
	const d = new Date(t);
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
}

const nextMonthOf = (month) => {
	const d = new Date(`${month}T00:00:00Z`);
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
};

/** Premium members right now: memberships running, cancelled ones until they end. */
export async function activeMembers() {
	const [{ n }] = await db
		.select({ n: sql`count(distinct ${subscription.userId})::int` })
		.from(subscription)
		.where(inArray(subscription.status, ['active', 'past_due', 'cancelled']));
	return Number(n);
}

/** A month's net Premium revenue in cents: membership payments less refunds. */
export async function netPremiumRevenue(month) {
	const from = new Date(`${month}T00:00:00Z`);
	const to = nextMonthOf(month);
	const [{ cents }] = await db
		.select({
			cents: sql`coalesce(round(sum(${payment.amount} - ${payment.refundedAmount}) * 100), 0)::int`
		})
		.from(payment)
		.where(
			and(
				inArray(payment.kind, ['sub_first', 'sub_renewal', 'sub_promo_first']),
				gte(payment.occurredAt, from),
				lt(payment.occurredAt, to)
			)
		);
	return Number(cents);
}

/**
 * Run the pool for a month (by default the one just ended). Once per
 * month: a month already paid is left alone.
 *
 * @returns {Promise<{ status: 'disabled'|'done_already'|'skipped'|'paid', reason?: string, poolCents?: number, shares?: any[] }>}
 */
export async function runPool({
	month = previousMonth(),
	now = new Date(),
	enabled = POOL_ENABLED
} = {}) {
	if (!enabled) return { status: 'disabled' };
	const [ran] = await db.select().from(poolRun).where(eq(poolRun.month, month)).limit(1);
	if (ran?.status === 'paid') return { status: 'done_already' };

	const skip = async (reason, extra = {}) => {
		const row = { month, status: 'skipped', reason, ranAt: now, ...extra };
		await db.insert(poolRun).values(row).onConflictDoUpdate({ target: poolRun.month, set: row });
		return { status: 'skipped', reason, ...extra };
	};

	const members = await activeMembers();
	if (members < POOL_START_MEMBERS) return skip('below_members', { activeMembers: members });
	const net = await netPremiumRevenue(month);
	const poolCents = applyRate(Math.max(0, net), POOL_PCT);
	if (poolCents <= 0)
		return skip('no_revenue', { activeMembers: members, netRevenueCents: net, poolCents: 0 });

	// Reads per teacher, for the month.
	const reads = await db
		.select({ teacherId: deskCourse.authorId, reads: sql`count(*)::int` })
		.from(guideRead)
		.innerJoin(deskCourse, eq(guideRead.courseId, deskCourse.id))
		.where(and(eq(guideRead.month, month), sql`${deskCourse.authorId} is not null`))
		.groupBy(deskCourse.authorId);

	// Teachers who sold enough copies in the twelve months to the month's end.
	const end = nextMonthOf(month);
	const yearAgo = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), 1));
	const sold = await db
		.select({ teacherId: partnerLedger.teacherId, copies: sql`count(*)::int` })
		.from(partnerLedger)
		.where(
			and(
				eq(partnerLedger.entryType, 'sale'),
				eq(partnerLedger.status, 'paid'),
				gte(partnerLedger.occurredAt, yearAgo),
				lt(partnerLedger.occurredAt, end)
			)
		)
		.groupBy(partnerLedger.teacherId);
	const copies = new Map(sold.map((r) => [r.teacherId, Number(r.copies)]));
	const eligible = reads
		.filter((r) => (copies.get(r.teacherId) || 0) >= POOL_MIN_COPIES_PER_YEAR)
		.sort((a, b) => String(a.teacherId).localeCompare(String(b.teacherId)));
	const totalReads = eligible.reduce((n, r) => n + Number(r.reads), 0);
	const base = { activeMembers: members, netRevenueCents: net, poolCents, totalReads };
	if (!totalReads) return skip('no_eligible_reads', base);

	const cents = splitByWeight(
		poolCents,
		eligible.map((r) => Number(r.reads))
	);
	const shares = eligible.map((r, i) => ({
		teacherId: r.teacherId,
		reads: Number(r.reads),
		cents: cents[i]
	}));
	await db.transaction(async (tx) => {
		const row = { month, status: 'paid', reason: null, ranAt: now, ...base };
		await tx.insert(poolRun).values(row).onConflictDoUpdate({ target: poolRun.month, set: row });
		const rows = shares
			.filter((s) => s.cents > 0)
			.map((s) => ({
				entryType: 'pool_share',
				status: 'earned',
				teacherId: s.teacherId,
				poolMonth: month,
				teacherCents: s.cents,
				ageNetCents: -s.cents,
				occurredAt: now,
				payableAt: now,
				statementMonth: monthOf(now),
				note: `Teacher pool for ${month.slice(0, 7)}: ${s.reads} of ${totalReads} member reads`
			}));
		if (rows.length) await tx.insert(partnerLedger).values(rows).onConflictDoNothing();
	});
	return { status: 'paid', ...base, shares };
}
