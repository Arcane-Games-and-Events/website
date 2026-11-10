/**
 * The AGE Partner model end to end, against a real
 * database and the fake gateway: checkout to the per-item ledger, levels
 * and copy numbers (with concurrent orders), refunds and chargebacks,
 * referral bonuses, the teacher pool, updates for every buyer, the backfill
 * of older sales, and monthly statements. Cases 5–10 of the brief.
 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from 'vitest';
import { HOLD_DAYS } from '$lib/academy/partner/terms.js';
import { confirmSettlements } from '$lib/server/partner/settlement.js';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	checkoutItem,
	courseChangelog,
	courseEnrollment,
	courseSale,
	deskCourse,
	order,
	partnerAccount,
	partnerAttribution,
	partnerLedger,
	partnerReferral,
	payment,
	poolRun
} from '$lib/server/db/schema.js';
import { POST as purchaseRoute } from '../../src/routes/api/academy/[slug]/purchase/+server.js';
import { POST as cartRoute } from '../../src/routes/api/academy/cart/checkout/+server.js';
import { refundOrderRemainder, refundTransaction } from '$lib/server/payments/refunds.js';
import { startSubscription } from '$lib/server/billing/subscriptions.js';
import { createTopic, publishTopic, updateTopic } from '$lib/server/courses/builder.js';
import { courseForReader } from '$lib/server/courses/reader.js';
import { monthOf } from '$lib/server/partner/ledger.js';
import { recordChargeback } from '$lib/server/partner/refunds.js';
import { staffRefundGuide } from '$lib/server/partner/guideRefunds.js';
import { decideReferralBonuses, ensureTeacherCode } from '$lib/server/partner/referrals.js';
import { previousMonth, runPool } from '$lib/server/partner/pool.js';
import { teacherEarnings } from '$lib/server/courses/earnings.js';
import {
	expectedPayouts,
	ledgerDetail,
	markStatementPaid,
	payDateOf,
	monthStatements,
	statementsCsv,
	teacherStatements
} from '$lib/server/partner/statements.js';
import { installFakeAuthnet } from '../support/fake-authnet.js';
import { createAdmin, createSavedCard, createUser, daysFromNow } from '../support/factories.js';
import { callRoute, createTeacher, doc, enrol, liveCourse } from '../support/courses.js';

let gw;
let teacher;
let student;
let card;
let seq = 0;

/** A buyer with a saved card on the fake gateway. */
async function buyer(overrides = {}) {
	const n = ++seq;
	const u = await createUser({ customerProfileId: `cp-b${n}`, ...overrides });
	const c = await createSavedCard(u, {
		customerProfileId: `cp-b${n}`,
		paymentProfileId: `pp-b${n}`
	});
	gw.addCard(`cp-b${n}`, `pp-b${n}`);
	return { user: u, card: c };
}

beforeEach(async () => {
	gw = installFakeAuthnet();
	teacher = await createTeacher();
	({ user: student, card } = await buyer());
});

const guide = async (price, t = teacher) =>
	(await liveCourse(t, { price, title: `Guide ${++seq}`, topics: 1 })).course;

const buyOne = (course, who = student, c = card) =>
	callRoute(purchaseRoute, {
		params: { slug: course.slug },
		user: who,
		body: { payment: { savedCardId: c.id }, idempotencyKey: `k-${++seq}`, consent: true }
	});

const buyCart = (courses, who = student, c = card) =>
	callRoute(cartRoute, {
		user: who,
		body: {
			courseIds: courses.map((x) => x.id),
			payment: { savedCardId: c.id },
			idempotencyKey: `k-${++seq}`,
			consent: true
		}
	});

/** Every charge settles at the fake gateway, and the sales are marked settled. */
const settleEverything = () =>
	db
		.update(partnerLedger)
		.set({ settledAt: new Date() })
		.where(eq(partnerLedger.entryType, 'sale'));

const salesOf = (teacherId) =>
	db
		.select()
		.from(partnerLedger)
		.where(and(eq(partnerLedger.teacherId, teacherId), eq(partnerLedger.entryType, 'sale')))
		.orderBy(partnerLedger.copyNumber);
const lifetime = async (teacherId) =>
	(await db.select().from(partnerAccount).where(eq(partnerAccount.teacherId, teacherId)))[0]
		?.lifetimeCopies ?? 0;
const setLifetime = (teacherId, n) =>
	db
		.insert(partnerAccount)
		.values({ teacherId, lifetimeCopies: n })
		.onConflictDoUpdate({ target: partnerAccount.teacherId, set: { lifetimeCopies: n } });

describe('checkout to ledger', () => {
	test('1. a non-member pays $15.76 for a $15 guide; the teacher earns $13.50', async () => {
		const g = await guide('15.00');
		const r = await buyOne(g);
		expect(r.status).toBe(200);
		expect(r.body.redirectUrl).toBe(`/academy/${g.slug}?enrolled=1`);
		expect(gw.charges()).toHaveLength(1);
		expect(gw.charges()[0].opts.amountCents).toBe(1576);

		const [sale] = await salesOf(teacher.id);
		expect(sale).toMatchObject({
			status: 'paid',
			courseId: g.id,
			buyerId: student.id,
			buyerType: 'non_member',
			listCents: 1500,
			memberDiscountCents: 0,
			buyerPaidCents: 1576,
			cardFeeCents: 76,
			level: 'PARTNER',
			copyNumber: 1,
			teacherCents: 1350,
			ageCommissionCents: 150,
			ageNetCents: 150,
			statementMonth: monthOf(daysFromNow(HOLD_DAYS))
		});
		expect(Number(sale.shareRate)).toBe(0.9);
		expect((sale.payableAt - sale.occurredAt) / 86400000).toBe(HOLD_DAYS);
		// Not settled at Authorize.net yet: on hold until it is.
		expect(sale.settledAt).toBeNull();
		expect(await lifetime(teacher.id)).toBe(1);
		// The old table isn't written under the Partner model.
		expect(await db.select().from(courseSale)).toHaveLength(0);
		const [ord] = await db.select().from(order).where(eq(order.id, sale.orderId));
		expect(ord.meta).toMatchObject({ partnerModel: true, member: false });
	});

	test('2. a Premium member pays $14.21; the teacher still earns $13.50 and AGE nets $0', async () => {
		const g = await guide('15.00');
		const { user: member, card: mc } = await buyer({
			role: 'premium',
			subscriptionStatus: 'active'
		});
		expect((await buyOne(g, member, mc)).status).toBe(200);
		expect(gw.charges()[0].opts.amountCents).toBe(1421);
		const [sale] = await salesOf(teacher.id);
		expect(sale).toMatchObject({
			buyerType: 'member',
			memberDiscountCents: 150,
			buyerPaidCents: 1421,
			teacherCents: 1350,
			ageCommissionCents: 150,
			ageNetCents: 0
		});
	});

	test('6. a cart of $10, $15 and $20 is one charge of $46.65; fee shares add up', async () => {
		const gs = [await guide('10.00'), await guide('15.00'), await guide('20.00')];
		const r = await buyCart(gs);
		expect(r.status).toBe(200);
		expect(r.body.redirectUrl).toBe('/my-courses?new=1');
		expect(gw.charges()).toHaveLength(1);
		expect(gw.charges()[0].opts.amountCents).toBe(4665);

		const items = await db.select().from(checkoutItem);
		expect(items.map((i) => i.listCents).sort()).toEqual([1000, 1500, 2000]);
		expect(items.reduce((n, i) => n + i.feeCents, 0)).toBe(165);
		expect(items.reduce((n, i) => n + i.paidCents, 0)).toBe(4665);

		const sales = await salesOf(teacher.id);
		expect(sales).toHaveLength(3);
		expect(sales.reduce((n, s) => n + s.cardFeeCents, 0)).toBe(165);
		expect(sales.reduce((n, s) => n + s.buyerPaidCents, 0)).toBe(4665);
		expect(sales.map((s) => s.copyNumber)).toEqual([1, 2, 3]);
		const live = await db
			.select()
			.from(courseEnrollment)
			.where(eq(courseEnrollment.userId, student.id));
		expect(live).toHaveLength(3);
	});

	test('the Classroom’s figures read the ledger', async () => {
		const g = await guide('15.00');
		const { user: member, card: mc } = await buyer({
			role: 'premium',
			subscriptionStatus: 'active'
		});
		await buyOne(g);
		await buyOne(g, member, mc);
		const e = await teacherEarnings(teacher.id, { courseId: g.id });
		expect(e.totals).toMatchObject({ sales: 2, grossCents: 3000, earnedCents: 2700 });
		expect(e.sales.every((x) => x.payDate === payDateOf(monthOf(x.payableAt)))).toBe(true);
	});

	test('a cart refuses guides the buyer already has', async () => {
		const a = await guide('10.00');
		const b = await guide('15.00');
		await buyOne(a);
		const r = await buyCart([a, b]);
		expect(r.status).toBe(409);
		expect(r.body.owned).toEqual([a.id]);
		expect(gw.charges()).toHaveLength(1);
	});
});

describe('levels', () => {
	test('5. a teacher at 998 sells three $20 copies: 999 and 1,000 at 90%, 1,001 at 93%', async () => {
		// Rule (terms.js): a copy is paid at the level held before it sold, so
		// copies 1–1,000 are Partner and copy 1,001 is the first Senior copy.
		const gs = [await guide('20.00'), await guide('20.00'), await guide('20.00')];
		await setLifetime(teacher.id, 998);
		expect((await buyCart(gs)).status).toBe(200);
		const sales = await salesOf(teacher.id);
		expect(sales.map((s) => [s.copyNumber, s.level, s.teacherCents])).toEqual([
			[999, 'PARTNER', 1800],
			[1000, 'PARTNER', 1800],
			[1001, 'SENIOR', 1860]
		]);
		expect(await lifetime(teacher.id)).toBe(1001);
	});

	test('concurrent orders across the boundary get one copy number each', async () => {
		const a = await guide('20.00');
		const b = await guide('20.00');
		const other = await buyer();
		await setLifetime(teacher.id, 999);
		const [r1, r2] = await Promise.all([buyOne(a), buyOne(b, other.user, other.card)]);
		expect([r1.status, r2.status]).toEqual([200, 200]);
		const sales = await salesOf(teacher.id);
		expect(sales.map((s) => s.copyNumber)).toEqual([1000, 1001]);
		expect(sales.map((s) => s.level)).toEqual(['PARTNER', 'SENIOR']);
		expect(await lifetime(teacher.id)).toBe(1001);
	});
});

describe('7. refunds and chargebacks', () => {
	test('refunding one guide reverses its sale, gives back what was paid, and lowers the count', async () => {
		const a = await guide('10.00');
		const b = await guide('20.00');
		await buyCart([a, b]);
		const [ord] = await db.select().from(order);
		gw.settle(ord.providerRef);
		const itemA = ord.meta.guides.find((g) => g.courseId === a.id);

		const r = await staffRefundGuide({
			actor: await createAdmin(),
			orderId: ord.id,
			itemId: itemA.itemId
		});
		expect(r).toMatchObject({ refundStatus: 'refunded', gatewayMethod: 'refund' });
		const refunded = gw.calls.filter((c) => c.method === 'refundTransaction');
		expect(refunded.at(-1).amountCents).toBe(itemA.paidCents);

		const rows = await db.select().from(partnerLedger).where(eq(partnerLedger.orderId, ord.id));
		const saleA = rows.find((x) => x.entryType === 'sale' && x.courseId === a.id);
		const saleB = rows.find((x) => x.entryType === 'sale' && x.courseId === b.id);
		const reversal = rows.find((x) => x.entryType === 'reversal');
		expect(saleA.status).toBe('refunded');
		expect(saleB.status).toBe('paid');
		expect(reversal).toMatchObject({
			status: 'refunded',
			reversesId: saleA.id,
			teacherCents: -saleA.teacherCents,
			buyerPaidCents: -saleA.buyerPaidCents,
			// Inside the hold: it nets out on the sale's own statement.
			statementMonth: saleA.statementMonth
		});
		expect(await lifetime(teacher.id)).toBe(1);

		const enr = await db
			.select()
			.from(courseEnrollment)
			.where(eq(courseEnrollment.userId, student.id));
		expect(enr.find((e) => e.courseId === a.id).revokedReason).toBe('refunded');
		expect(enr.find((e) => e.courseId === b.id).revokedAt).toBeNull();

		// Refunding the rest of the order takes the other guide back too.
		await refundOrderRemainder({ actor: await createAdmin(), orderId: ord.id });
		expect((await salesOf(teacher.id)).every((s) => s.status === 'refunded')).toBe(true);
		expect(await lifetime(teacher.id)).toBe(0);
	});

	test('a chargeback reverses the sale the same way', async () => {
		const g = await guide('15.00');
		await buyOne(g);
		const [ord] = await db.select().from(order);
		const r = await recordChargeback({ actor: await createAdmin(), orderId: ord.id, note: 'Bank' });
		expect(r).toMatchObject({ ok: true, cents: 1576 });
		const rows = await db.select().from(partnerLedger);
		expect(rows.find((x) => x.entryType === 'sale').status).toBe('charged_back');
		expect(rows.find((x) => x.entryType === 'reversal')).toMatchObject({
			status: 'charged_back',
			teacherCents: -1350
		});
		expect(await lifetime(teacher.id)).toBe(0);
		const [en] = await db.select().from(courseEnrollment);
		expect(en.revokedReason).toBe('charged_back');
		const [pay] = await db.select().from(payment).where(eq(payment.orderId, ord.id));
		expect(Number(pay.refundedAmount)).toBe(15.76);
		// Recorded once.
		expect((await recordChargeback({ actor: null, orderId: ord.id })).ok).toBe(false);
	});
});

describe('8. referral bonuses', () => {
	const join = (who, c, promoCode) =>
		startSubscription({
			user: who,
			plan: 'monthly',
			promoCode,
			payment: { savedCardId: c.id },
			consent: true
		});

	test('recorded after the refund window, once per member, never for the teacher themself', async () => {
		const code = (await ensureTeacherCode(teacher)).code;
		expect((await ensureTeacherCode(teacher)).code).toBe(code);
		const r = await join(student, card, code);
		expect(r.ok).toBe(true);
		// The partner discount still applies to the new member.
		expect(gw.charges()[0].opts.amountCents).toBe(500);
		const [att] = await db.select().from(partnerAttribution);
		expect(att).toMatchObject({
			teacherId: teacher.id,
			referredUserId: student.id,
			status: 'pending'
		});
		// No partner commission as well.
		const [pr] = await db.select().from(partnerReferral);
		expect(Number(pr.commissionAmount)).toBe(0);

		expect(await decideReferralBonuses({ now: daysFromNow(13) })).toMatchObject({
			recorded: 0,
			waiting: 1
		});
		expect(await decideReferralBonuses({ now: daysFromNow(15) })).toMatchObject({ recorded: 1 });
		expect(await decideReferralBonuses({ now: daysFromNow(16) })).toMatchObject({ recorded: 0 });
		const bonuses = await db
			.select()
			.from(partnerLedger)
			.where(eq(partnerLedger.entryType, 'referral_bonus'));
		expect(bonuses).toHaveLength(1);
		expect(bonuses[0]).toMatchObject({ teacherId: teacher.id, teacherCents: 1000 });

		// A teacher can't use their own code, and the table refuses it too.
		const self = await buyer({ additionalRoles: ['creator'] });
		const selfCode = (await ensureTeacherCode(self.user)).code;
		const selfTry = await join(self.user, self.card, selfCode);
		expect(selfTry).toMatchObject({
			ok: false,
			error: 'You can’t redeem your own code.'.replace('’', "'")
		});
		await expect(
			db
				.insert(partnerAttribution)
				.values({ referredUserId: teacher.id, teacherId: teacher.id, source: 'code' })
		).rejects.toThrow();
	});

	test('no bonus when the first payment is refunded', async () => {
		const code = (await ensureTeacherCode(teacher)).code;
		await join(student, card, code);
		const [pay] = await db.select().from(payment).where(eq(payment.userId, student.id));
		await refundTransaction({ transId: pay.transId, amountCents: 500 });
		expect(await decideReferralBonuses({ now: daysFromNow(15) })).toMatchObject({
			recorded: 0,
			voided: 1
		});
		const [att] = await db.select().from(partnerAttribution);
		expect(att).toMatchObject({ status: 'void', voidReason: 'refunded' });
	});
});

describe('9. the teacher pool', () => {
	const now = new Date();
	const month = previousMonth(now);
	const inMonth = `${month}T12:00:00Z`;

	async function setUp() {
		// 250 active Premium members, $2,000 of net Premium revenue that month.
		await db.execute(sql`insert into "user" (id, email, hashed_password, first_name, last_name, role)
			select 'pool-' || g, 'pool' || g || '@test.age', 'x', 'Pool', 'Member', 'premium'
			from generate_series(1, 260) g`);
		const members = (n) =>
			db.execute(sql`insert into subscription (ref, user_id, plan, price_cents, anchor_day, status)
				select 'pool-sub-' || g, 'pool-' || g, 'monthly', 1000, 1, 'active'
				from generate_series(1, ${n}::int) g`);
		await db.execute(sql`insert into payment (trans_id, kind, amount, occurred_at, source)
			values ('pool-p1', 'sub_renewal', 1500.00, ${inMonth}::timestamptz, 'app'),
			       ('pool-p2', 'sub_first', 600.00, ${inMonth}::timestamptz, 'app')`);
		await db.execute(sql`update payment set refunded_amount = 100.00 where trans_id = 'pool-p2'`);
		// Teachers A and B sold 250 copies in the year; C only 10.
		const a = teacher;
		const b = await createTeacher();
		const c = await createTeacher();
		for (const [t, n] of [
			[a, 250],
			[b, 260],
			[c, 10]
		])
			await db.execute(sql`insert into partner_ledger (entry_type, status, teacher_id, teacher_cents, statement_month, occurred_at)
				select 'sale', 'paid', ${t.id}, 0, ${month}::date, ${inMonth}::timestamptz
				from generate_series(1, ${n}::int)`);
		const course = async (t) =>
			(
				await db
					.insert(deskCourse)
					.values({
						slug: `pool-${t.id}`,
						title: 'Pool guide',
						authorId: t.id,
						status: 'published'
					})
					.returning()
			)[0];
		const reads = (c, from, to) =>
			db.execute(sql`insert into guide_read (user_id, course_id, month)
				select 'pool-' || g, ${c.id}::uuid, ${month}::date from generate_series(${from}::int, ${to}::int) g`);
		const [ca, cb, cc] = [await course(a), await course(b), await course(c)];
		await reads(ca, 1, 30); // 30 reads
		await reads(cb, 31, 40); // 10 reads
		await reads(cc, 41, 90); // 50 reads, but C doesn't qualify
		return { members, a, b, c };
	}

	test('does nothing while disabled or below 250 members; splits by unique reads when on', async () => {
		const { members, a, b, c } = await setUp();
		const shares = () =>
			db.select().from(partnerLedger).where(eq(partnerLedger.entryType, 'pool_share'));

		// Disabled (POOL_ENABLED is false in terms.js).
		expect(await runPool({ month, now })).toEqual({ status: 'disabled' });
		expect(await db.select().from(poolRun)).toHaveLength(0);

		const enabled = true;
		await members(249);
		expect(await runPool({ month, now, enabled })).toMatchObject({
			status: 'skipped',
			reason: 'below_members',
			activeMembers: 249
		});
		expect(await shares()).toHaveLength(0);

		await db.execute(sql`insert into subscription (ref, user_id, plan, price_cents, anchor_day, status)
			values ('pool-sub-250', 'pool-250', 'monthly', 1000, 1, 'active')`);
		const r = await runPool({ month, now, enabled });
		// 5% of $2,000 net = $100, split 30:10 between A and B.
		expect(r).toMatchObject({
			status: 'paid',
			netRevenueCents: 200000,
			poolCents: 10000,
			totalReads: 40
		});
		const paid = await shares();
		const by = Object.fromEntries(paid.map((s) => [s.teacherId, s.teacherCents]));
		expect(by).toEqual({ [a.id]: 7500, [b.id]: 2500 });
		expect(by[c.id]).toBeUndefined();

		// Once a month.
		expect(await runPool({ month, now, enabled })).toEqual({ status: 'done_already' });
		expect(await shares()).toHaveLength(2);
	});
});

describe('10. updates for every buyer', () => {
	test('existing buyers get topics added after launch, without Premium', async () => {
		const { course, sections } = await liveCourse(teacher, { price: '15.00', title: 'Updates' });
		const launched = new Date(Date.now() - 86400000);
		await db
			.update(deskCourse)
			.set({ firstPublishedAt: launched })
			.where(eq(deskCourse.id, course.id));
		await enrol(course, student, { at: launched, source: 'purchase' });
		const [live] = await db.select().from(deskCourse).where(eq(deskCourse.id, course.id));
		let t = await createTopic(course.id, { sectionId: sections[0].id, title: 'Added later' });
		t = await updateTopic(t, { body: doc('New material') });
		await publishTopic(live, t, teacher, { note: 'A new chapter on mulligans' });

		// The student isn't Premium, enrolled before the topic existed, and can read it.
		const { topics } = await courseForReader(course.slug, student);
		expect(topics.find((x) => x.id === t.id).access).toBe('open');

		// Version history: the changelog line, and "last updated".
		const [line] = await db.select().from(courseChangelog);
		expect(line).toMatchObject({ kind: 'topic_added', note: 'A new chapter on mulligans' });
		const [after] = await db.select().from(deskCourse).where(eq(deskCourse.id, course.id));
		expect(after.contentUpdatedAt).not.toBeNull();
		expect(after.exclusive).toBe(true);
		expect(after.exclusivityStart).toBeTruthy();
	});
});

describe('the backfill of older sales', () => {
	test('old sales become legacy ledger rows and count toward the level, once', async () => {
		const g = await guide('50.00');
		// Two sales from before the Partner model; the second refunded in full.
		const now = new Date();
		await db.insert(courseSale).values([
			{
				courseId: g.id,
				teacherId: teacher.id,
				grossCents: 5000,
				soldAt: now,
				payableAt: daysFromNow(14)
			},
			{
				courseId: g.id,
				teacherId: teacher.id,
				grossCents: 5000,
				refundedCents: 5000,
				soldAt: now,
				payableAt: daysFromNow(14)
			}
		]);

		const file = readFileSync(
			new URL('../../supabase/migrations/042_partner_model.sql', import.meta.url),
			'utf8'
		);
		const part = file.slice(file.indexOf('-- Old sales become legacy ledger sales'));
		await db.execute(sql.raw(part));
		await db.execute(sql.raw(part)); // safe to run twice

		const rows = await salesOf(teacher.id);
		expect(rows).toHaveLength(2);
		expect(rows.find((r) => r.status === 'paid')).toMatchObject({
			teacherCents: 4500,
			level: 'PARTNER',
			copyNumber: 1,
			note: 'Sold before the Partner model'
		});
		expect(rows.find((r) => r.status === 'refunded').teacherCents).toBe(0);
		expect(await lifetime(teacher.id)).toBe(1);
	});
});

describe('statements', () => {
	test('a month is paid once, with its CSV', async () => {
		const g = await guide('15.00');
		await buyOne(g);
		await settleEverything();
		const [sale] = await salesOf(teacher.id);
		const month = sale.statementMonth;
		const later = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 3));

		const mine = await teacherStatements(teacher.id, { now: later });
		expect(mine.standing).toMatchObject({ lifetimeCopies: 1, copiesToNext: 999 });
		const [s] = await monthStatements(month, { now: later });
		expect(s).toMatchObject({ teacherId: teacher.id, salesCents: 1350, payableCents: 1350 });
		expect(await statementsCsv(month, { now: later })).toContain('13.50');

		await expect(
			markStatementPaid({ teacherId: teacher.id, month, actor: null, now: new Date() })
		).rejects.toThrow(/isn’t over/);
		const paid = await markStatementPaid({
			teacherId: teacher.id,
			month,
			reference: 'TR-1',
			actor: await createAdmin(),
			now: later
		});
		expect(paid.amountCents).toBe(1350);
		await expect(
			markStatementPaid({ teacherId: teacher.id, month, actor: null, now: later })
		).rejects.toThrow(/already paid/);
	});

	test('every sale shows where it stands, and expected payouts add up by pay date', async () => {
		const a = await guide('15.00');
		const b = await guide('20.00');
		const c = await guide('10.00');
		await buyOne(a);
		await buyOne(b);
		await buyOne(c);
		// One sale from two months ago, past its hold: due on an ended month.
		const [old] = await db
			.select()
			.from(partnerLedger)
			.where(and(eq(partnerLedger.courseId, a.id), eq(partnerLedger.entryType, 'sale')));
		const longAgo = new Date(
			Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 2, 10)
		);
		await db
			.update(partnerLedger)
			.set({
				occurredAt: longAgo,
				payableAt: longAgo,
				statementMonth: monthOf(longAgo),
				settledAt: longAgo
			})
			.where(eq(partnerLedger.id, old.id));
		// One refunded.
		const ord = (await db.select().from(order)).find((o) => o.meta.courseId === c.id);
		await refundOrderRemainder({ actor: await createAdmin(), orderId: ord.id });

		const rows = await ledgerDetail({ teacherId: teacher.id });
		const of = (course) =>
			rows.find((r) => r.courseTitle === course.title && r.entryType === 'sale');
		expect(of(a)).toMatchObject({ status: 'due', payDate: payDateOf(monthOf(longAgo)) });
		expect(of(b)).toMatchObject({ status: 'on_hold', countsCents: 1800 });
		expect(of(c)).toMatchObject({ status: 'refunded', countsCents: 0 });

		const expected = await expectedPayouts({ teacherId: teacher.id });
		const total = expected.reduce((n, x) => n + x.cents, 0);
		expect(total).toBe(1350 + 1800);
		expect(expected[0]).toMatchObject({ month: monthOf(longAgo), cents: 1350, due: true });
		expect(expected.at(-1).onHoldCents).toBe(1800);

		// Paid: the row says so, and it drops out of what's expected.
		await markStatementPaid({ teacherId: teacher.id, month: monthOf(longAgo), actor: null });
		expect(
			(await ledgerDetail({ teacherId: teacher.id })).find((r) => r.id === old.id).status
		).toBe('paid');
		expect(
			(await expectedPayouts({ teacherId: teacher.id })).reduce((n, x) => n + x.cents, 0)
		).toBe(1800);
	});

	test('a refund inside the hold leaves nothing to pay', async () => {
		const g = await guide('15.00');
		await buyOne(g);
		const [ord] = await db.select().from(order);
		await refundOrderRemainder({ actor: await createAdmin(), orderId: ord.id });
		const [sale] = await salesOf(teacher.id);
		const later = new Date(
			Date.UTC(Number(sale.statementMonth.slice(0, 4)), Number(sale.statementMonth.slice(5, 7)), 3)
		);
		const [s] = await monthStatements(sale.statementMonth, { now: later });
		expect(s.payableCents).toBe(0);
	});
});

describe('settlement at Authorize.net', () => {
	test('a sale is payable only once its charge settles; one never collected is never paid', async () => {
		const a = await guide('15.00');
		const b = await guide('20.00');
		await buyOne(a);
		await buyOne(b);
		const orders = await db.select().from(order);
		const ordOf = (g) => orders.find((o) => o.meta.courseId === g.id);
		const afterHold = daysFromNow(HOLD_DAYS + 1);

		// Before the hold is up, nothing is asked.
		expect(await confirmSettlements({ now: new Date() })).toMatchObject({ settled: 0, waiting: 0 });

		// A settled; B still waiting on the night's batch.
		gw.settle(ordOf(a).providerRef);
		const r1 = await confirmSettlements({ now: afterHold });
		expect(r1).toMatchObject({ settled: 1, waiting: 1 });
		const [sa] = await salesOf(teacher.id).then((rows) => rows.filter((x) => x.courseId === a.id));
		const [sb] = await salesOf(teacher.id).then((rows) => rows.filter((x) => x.courseId === b.id));
		expect(sa.settledAt).not.toBeNull();
		expect(sb.settledAt).toBeNull();
		expect(sb.payableAt.getTime()).toBeGreaterThan(afterHold.getTime());
		const detail = await ledgerDetail({ teacherId: teacher.id, now: afterHold });
		expect(detail.find((x) => x.id === sb.id)).toMatchObject({ status: 'on_hold' });

		// B's charge is voided at the gateway: it's never paid out.
		gw.transactions.get(ordOf(b).providerRef).status = 'voided';
		const r2 = await confirmSettlements({ now: daysFromNow(HOLD_DAYS + 3) });
		expect(r2.failed).toBe(1);
		const [sb2] = await salesOf(teacher.id).then((rows) => rows.filter((x) => x.courseId === b.id));
		expect(sb2.settledAt).toBeNull();
		expect(sb2.payableAt.getTime()).toBeGreaterThan(daysFromNow(365).getTime());
	});
});
