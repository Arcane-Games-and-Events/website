/**
 * Guide refunds under the guide refund policy, against a real database and
 * the fake gateway: consent at checkout, first-open tracking, automatic and
 * reviewed refunds, teacher approval, per-guide amounts, void vs refund,
 * gateway failures, chargebacks, and never refunding a guide twice.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { authnet } from '$lib/server/authnet/client.js';
import {
	checkout,
	courseEnrollment,
	guideRefundRequest,
	notification,
	order,
	partnerAccount,
	partnerLedger
} from '$lib/server/db/schema.js';
import { POST as purchaseRoute } from '../../src/routes/api/academy/[slug]/purchase/+server.js';
import { POST as cartRoute } from '../../src/routes/api/academy/cart/checkout/+server.js';
import { POST as requestRoute } from '../../src/routes/api/academy/refunds/+server.js';
import { POST as decideRoute } from '../../src/routes/api/academy/refunds/[id]/+server.js';
import { POST as staffRoute } from '../../src/routes/api/academy/refunds/staff/+server.js';
import { load as topicLoad } from '../../src/routes/academy/[slug]/[topic]/+page.server.js';
import { REFUND_CONSENT_TEXT } from '$lib/academy/partner/terms.js';
import { load as refundsPage } from '../../src/routes/classroom/refunds/+page.server.js';
import {
	orderRefundOptions,
	pendingRefundCount,
	processGuideRefund,
	requestGuideRefund,
	retryGuideRefund
} from '$lib/server/partner/guideRefunds.js';
import { recordChargeback } from '$lib/server/partner/refunds.js';
import { createGuideCheckout } from '$lib/server/partner/checkout.js';
import { payGuideCheckout } from '$lib/server/partner/pay.js';
import { updateTopic } from '$lib/server/courses/builder.js';
import { installFakeAuthnet } from '../support/fake-authnet.js';
import { createAdmin, createSavedCard, createUser } from '../support/factories.js';
import { callRoute, createTeacher, liveCourse } from '../support/courses.js';

let gw;
let teacher;
let student;
let card;
let admin;
let seq = 0;

async function buyer() {
	const n = ++seq;
	const u = await createUser({ customerProfileId: `cp-r${n}` });
	const c = await createSavedCard(u, {
		customerProfileId: `cp-r${n}`,
		paymentProfileId: `pp-r${n}`
	});
	gw.addCard(`cp-r${n}`, `pp-r${n}`);
	return { user: u, card: c };
}

beforeEach(async () => {
	gw = installFakeAuthnet();
	teacher = await createTeacher();
	admin = await createAdmin();
	({ user: student, card } = await buyer());
});

const guide = async (price = '15.00', t = teacher) =>
	await liveCourse(t, { price, title: `Refund guide ${++seq}`, topics: 2 });

const buyOne = (course, { consent = true, who = student, c = card } = {}) =>
	callRoute(purchaseRoute, {
		params: { slug: course.slug },
		user: who,
		body: { payment: { savedCardId: c.id }, idempotencyKey: `k-${++seq}`, consent }
	});
const buyCart = (courses) =>
	callRoute(cartRoute, {
		user: student,
		body: {
			courseIds: courses.map((x) => x.id),
			payment: { savedCardId: card.id },
			idempotencyKey: `k-${++seq}`,
			consent: true
		}
	});

const orderOf = async (userId = student.id) =>
	(await db.select().from(order).where(eq(order.userId, userId)))[0];
const itemFor = (ord, courseId) => ord.meta.guides.find((g) => g.courseId === courseId);
const salesOf = (courseId) =>
	db
		.select()
		.from(partnerLedger)
		.where(and(eq(partnerLedger.courseId, courseId), eq(partnerLedger.entryType, 'sale')));
const lifetime = async () =>
	(await db.select().from(partnerAccount).where(eq(partnerAccount.teacherId, teacher.id)))[0]
		?.lifetimeCopies ?? 0;
const enrollmentOf = async (courseId, userId = student.id) =>
	(
		await db
			.select()
			.from(courseEnrollment)
			.where(and(eq(courseEnrollment.courseId, courseId), eq(courseEnrollment.userId, userId)))
	)[0];
const backdate = (ord, days) =>
	db
		.update(order)
		.set({ createdAt: new Date(Date.now() - days * 86400000) })
		.where(eq(order.id, ord.id));
const ageCosts = () =>
	db.select().from(partnerLedger).where(eq(partnerLedger.entryType, 'age_cost'));
const openTopic = (course, topic, user = student) =>
	topicLoad({
		params: { slug: course.slug, topic: topic.slug },
		locals: { user },
		setHeaders: () => {}
	});

describe('1. consent at checkout', () => {
	test('payment is refused until the box is ticked; the exact text is stored', async () => {
		const { course } = await guide();
		const r = await buyOne(course, { consent: false });
		expect(r.status).toBe(400);
		expect(r.body.error).toMatch(/refund policy/);
		expect(gw.charges()).toHaveLength(0);

		expect((await buyOne(course)).status).toBe(200);
		const [co] = await db.select().from(checkout).where(eq(checkout.status, 'fulfilled'));
		expect(co).toMatchObject({
			consentGiven: true,
			consentText: REFUND_CONSENT_TEXT,
			consentIp: '127.0.0.1'
		});
		expect(co.consentAt).toBeInstanceOf(Date);
		expect(REFUND_CONSENT_TEXT).toBe(
			'I want immediate access to this guide and understand that I lose my right to a refund once I open it.'
		);
	});
});

describe('2. first opened', () => {
	test('set by the first paid topic opened, once; not by the guide page or a free preview', async () => {
		const { course, topics } = await guide();
		await buyOne(course);
		const [free, paid] = topics;
		await updateTopic(free, { isPreview: true });

		await openTopic(course, free);
		expect((await enrollmentOf(course.id)).firstOpenedAt).toBeNull();

		await openTopic(course, paid);
		const first = (await enrollmentOf(course.id)).firstOpenedAt;
		expect(first).toBeInstanceOf(Date);
		await new Promise((r) => setTimeout(r, 15));
		await openTopic(course, paid);
		expect((await enrollmentOf(course.id)).firstOpenedAt).toEqual(first);
	});
});

describe('requests', () => {
	test('3. unopened within 7 days: approved and refunded at once, access and ledger reversed', async () => {
		const { course } = await guide();
		await buyOne(course);
		const ord = await orderOf();
		const item = itemFor(ord, course.id);
		const r = await callRoute(requestRoute, {
			user: student,
			body: { itemId: item.itemId, reason: 'unopened' }
		});
		expect(r.status).toBe(200);
		expect(r.body.request).toMatchObject({
			status: 'auto_approved',
			autoReason: 'unopened',
			refundStatus: 'refunded'
		});
		// 9. Not settled yet: voided, and a void leaves no card fee to absorb.
		expect(gw.transactions.get(ord.providerRef).status).toBe('voided');
		expect(await ageCosts()).toHaveLength(0);

		expect((await enrollmentOf(course.id)).revokedReason).toBe('refunded');
		const [sale] = await salesOf(course.id);
		expect(sale.status).toBe('refunded');
		const [reversal] = await db
			.select()
			.from(partnerLedger)
			.where(eq(partnerLedger.reversesId, sale.id));
		expect(reversal).toMatchObject({
			entryType: 'reversal',
			teacherCents: -sale.teacherCents,
			ageCommissionCents: -sale.ageCommissionCents,
			memberDiscountCents: -sale.memberDiscountCents || 0,
			cardFeeCents: -sale.cardFeeCents
		});
		expect(await lifetime()).toBe(0);
	});

	test('4. opened, "other", day 3: waits; an admin approves it, or denies and nothing changes', async () => {
		const a = await guide();
		const b = await guide();
		await buyOne(a.course);
		await buyOne(b.course);
		for (const g of [a, b]) await openTopic(g.course, g.topics[0]);
		const orders = await db.select().from(order).where(eq(order.userId, student.id));
		const itemOf = (g) => orders.map((o) => itemFor(o, g.course.id)).find(Boolean);
		for (const o of orders) await backdate(o, 3);

		const ra = await requestGuideRefund({
			user: student,
			itemId: itemOf(a).itemId,
			reason: 'other',
			message: 'Not for me'
		});
		const rb = await requestGuideRefund({
			user: student,
			itemId: itemOf(b).itemId,
			reason: 'other'
		});
		expect(ra).toMatchObject({ status: 'pending', refundStatus: 'none' });
		expect(gw.calls.filter((c) => c.method === 'voidTransaction')).toHaveLength(0);

		const approved = await callRoute(decideRoute, {
			params: { id: ra.id },
			user: admin,
			body: { action: 'approve', note: 'OK this once' }
		});
		expect(approved.body.request).toMatchObject({ status: 'approved', refundStatus: 'refunded' });
		expect((await enrollmentOf(a.course.id)).revokedAt).not.toBeNull();

		const denied = await callRoute(decideRoute, {
			params: { id: rb.id },
			user: admin,
			body: { action: 'deny', note: 'Opened and read' }
		});
		expect(denied.body.request.status).toBe('denied');
		expect((await enrollmentOf(b.course.id)).revokedAt).toBeNull();
		expect((await salesOf(b.course.id))[0].status).toBe('paid');
		expect(await lifetime()).toBe(1);
	});

	test('5. a duplicate purchase is refunded automatically, even after 14 days, and access stays', async () => {
		const { course } = await guide();
		// Two checkouts for the same guide paid at the same moment.
		const make = async () =>
			(
				await createGuideCheckout({
					user: student,
					courses: [course],
					member: false,
					idempotencyKey: `dup-${++seq}`,
					consent: { text: REFUND_CONSENT_TEXT, ip: null, userAgent: null }
				})
			).checkout;
		const [c1, c2] = [await make(), await make()];
		const cookies = { get: () => undefined, set: () => {}, delete: () => {} };
		const url = new URL('http://localhost/x');
		await payGuideCheckout({
			user: student,
			co: c1,
			payment: { savedCardId: card.id },
			cookies,
			url
		});
		await payGuideCheckout({
			user: student,
			co: c2,
			payment: { savedCardId: card.id },
			cookies,
			url
		});
		expect(gw.charges()).toHaveLength(2);
		const [o1, o2] = await db.select().from(order).orderBy(order.createdAt);
		await openTopic(course, (await guideTopics(course))[0]);
		await backdate(o1, 20);
		await backdate(o2, 20);

		const r = await requestGuideRefund({
			user: student,
			itemId: itemFor(o2, course.id).itemId,
			reason: 'duplicate'
		});
		expect(r).toMatchObject({
			status: 'auto_approved',
			autoReason: 'duplicate',
			refundStatus: 'refunded'
		});
		// The first purchase still stands: the guide stays theirs.
		const en = await enrollmentOf(course.id);
		expect(en.revokedAt).toBeNull();
		expect(en.orderId).toBe(o1.id);
		// And that one is no longer a duplicate.
		const [left] = await orderRefundOptions(student.id, o1.id);
		expect(left.canRequest).toBe(false);
	});

	test('6. after 14 days the button is gone and the request is refused', async () => {
		const { course } = await guide();
		await buyOne(course);
		const ord = await orderOf();
		await backdate(ord, 15);
		const [g] = await orderRefundOptions(student.id, ord.id);
		expect(g.canRequest).toBe(false);
		const r = await callRoute(requestRoute, {
			user: student,
			body: { itemId: g.itemId, reason: 'broken' }
		});
		expect(r.status).toBe(403);
		expect(await db.select().from(guideRefundRequest)).toHaveLength(0);
	});

	test('7. the teacher approves on their own guide only, and can’t deny', async () => {
		const { course, topics } = await guide();
		const other = await createTeacher();
		await buyOne(course);
		await openTopic(course, topics[0]);
		const ord = await orderOf();
		const req = await requestGuideRefund({
			user: student,
			itemId: itemFor(ord, course.id).itemId,
			reason: 'broken'
		});

		const asOther = await callRoute(decideRoute, {
			params: { id: req.id },
			user: other,
			body: { action: 'approve' }
		});
		expect(asOther.status).toBe(403);
		const deny = await callRoute(decideRoute, {
			params: { id: req.id },
			user: teacher,
			body: { action: 'deny' }
		});
		expect(deny.status).toBe(403);
		const ok = await callRoute(decideRoute, {
			params: { id: req.id },
			user: teacher,
			body: { action: 'approve' }
		});
		expect(ok.body.request).toMatchObject({ status: 'approved', refundStatus: 'refunded' });
		const [row] = await db.select().from(guideRefundRequest);
		expect(row.decidedBy).toBe('teacher');
	});
});

describe('processing', () => {
	test('8. one guide of a settled cart: only its amount is refunded, the rest stays', async () => {
		const a = await guide('10.00');
		const b = await guide('20.00');
		await buyCart([a.course, b.course]);
		const ord = await orderOf();
		gw.settle(ord.providerRef);
		const ia = itemFor(ord, a.course.id);
		const r = await requestGuideRefund({ user: student, itemId: ia.itemId, reason: 'unopened' });
		expect(r).toMatchObject({ refundStatus: 'refunded', gatewayMethod: 'refund' });
		const refunds = gw.calls.filter((c) => c.method === 'refundTransaction');
		expect(refunds).toHaveLength(1);
		expect(refunds[0].amountCents).toBe(ia.paidCents);
		expect((await salesOf(b.course.id))[0].status).toBe('paid');
		expect((await enrollmentOf(b.course.id)).revokedAt).toBeNull();
		expect((await enrollmentOf(a.course.id)).revokedAt).not.toBeNull();
		// 9. A settled charge was refunded: the processor keeps its fee, an AGE cost.
		const [cost] = await ageCosts();
		const [sale] = await salesOf(a.course.id);
		expect(cost).toMatchObject({ teacherCents: 0, ageNetCents: -sale.cardFeeCents });
		// The teacher never sees it.
		const mine = await db
			.select()
			.from(partnerLedger)
			.where(eq(partnerLedger.teacherId, teacher.id));
		expect(mine.filter((x) => x.entryType === 'age_cost').every((x) => x.teacherCents === 0)).toBe(
			true
		);
	});

	test('9. a gateway failure is refund_failed, admins can retry it', async () => {
		const { course } = await guide();
		await buyOne(course);
		const ord = await orderOf();
		gw.settle(ord.providerRef);
		const real = authnet.refundTransaction;
		authnet.refundTransaction = async () => ({
			outcome: 'error',
			code: 'E00001',
			message: 'Gateway down'
		});
		const r = await requestGuideRefund({
			user: student,
			itemId: itemFor(ord, course.id).itemId,
			reason: 'unopened'
		});
		expect(r.refundStatus).toBe('refund_failed');
		expect((await enrollmentOf(course.id)).revokedAt).toBeNull();
		expect((await salesOf(course.id))[0].status).toBe('paid');

		authnet.refundTransaction = real;
		await expect(retryGuideRefund({ actor: student, requestId: r.id })).rejects.toMatchObject({
			status: 403
		});
		const again = await retryGuideRefund({ actor: admin, requestId: r.id });
		expect(again).toMatchObject({ refundStatus: 'refunded', attempts: 2 });
		expect((await enrollmentOf(course.id)).revokedAt).not.toBeNull();
	});

	test('10. a chargeback reverses the sale and adds the fee as an AGE cost, not the teacher’s', async () => {
		const { course } = await guide();
		await buyOne(course);
		const ord = await orderOf();
		await recordChargeback({ actor: admin, orderId: ord.id });
		const [sale] = await salesOf(course.id);
		expect(sale.status).toBe('charged_back');
		expect(await lifetime()).toBe(0);
		const [fee] = await ageCosts();
		expect(fee).toMatchObject({ note: 'Chargeback fee', ageNetCents: -2500, teacherCents: 0 });
		const adjustments = await db
			.select()
			.from(partnerLedger)
			.where(eq(partnerLedger.entryType, 'adjustment'));
		expect(adjustments).toHaveLength(0);
	});

	test('10. with the fee passed to teachers, it comes off their statement too', async () => {
		const { course } = await guide();
		await buyOne(course);
		const ord = await orderOf();
		await recordChargeback({ actor: admin, orderId: ord.id, feeToTeacher: true });
		const [adj] = await db
			.select()
			.from(partnerLedger)
			.where(eq(partnerLedger.entryType, 'adjustment'));
		expect(adj).toMatchObject({ teacherId: teacher.id, teacherCents: -2500 });
	});

	test('11. a guide is never refunded twice', async () => {
		const { course } = await guide();
		await buyOne(course);
		const ord = await orderOf();
		const itemId = itemFor(ord, course.id).itemId;
		const r = await requestGuideRefund({ user: student, itemId, reason: 'unopened' });
		expect(r.refundStatus).toBe('refunded');
		await expect(
			requestGuideRefund({ user: student, itemId, reason: 'duplicate' })
		).rejects.toMatchObject({ status: 409 });
		await processGuideRefund(r.id);
		const gatewayCalls = gw.calls.filter((c) =>
			['voidTransaction', 'refundTransaction'].includes(c.method)
		);
		expect(gatewayCalls).toHaveLength(1);
		// The database refuses a second live request for the same guide too.
		await expect(
			db.insert(guideRefundRequest).values({
				checkoutItemId: itemId,
				orderId: ord.id,
				userId: student.id,
				reason: 'other'
			})
		).rejects.toThrow();
	});
});

describe('refunds from the dashboard, and no emails', () => {
	test('a pending request reaches the teacher in the Classroom', async () => {
		const { course, topics } = await guide();
		await buyOne(course);
		await openTopic(course, topics[0]);
		const ord = await orderOf();
		const req = await requestGuideRefund({
			user: student,
			itemId: itemFor(ord, course.id).itemId,
			reason: 'not_as_described'
		});
		const [n] = await db
			.select()
			.from(notification)
			.where(eq(notification.userId, teacher.id))
			.then((rows) => rows.filter((x) => x.kind === 'refund_request'));
		expect(n).toMatchObject({ courseId: course.id, actorId: student.id });
		expect(n.data).toMatchObject({ requestId: req.id, reason: 'It’s not as described' });
		// Admins hear too, and both are pointed at Classroom → Refunds.
		const adminNotes = await db
			.select()
			.from(notification)
			.where(eq(notification.userId, admin.id));
		expect(adminNotes.filter((x) => x.kind === 'refund_request')).toHaveLength(1);
		const { listNotifications } = await import('$lib/server/courses/notifications.js');
		const [shown] = await listNotifications(teacher.id, { scope: 'classroom' });
		expect(shown.href).toBe('/classroom/refunds');
		// The count on the Refunds tab.
		expect(await pendingRefundCount(teacher.id)).toBe(1);
		expect(await pendingRefundCount(null)).toBe(1);
		expect(await pendingRefundCount((await createTeacher()).id)).toBe(0);
	});

	test('Classroom → Refunds: a teacher sees only their guides and no consent details', async () => {
		const mine = await guide();
		const theirs = await guide('20.00', await createTeacher());
		await buyOne(mine.course);
		await buyOne(theirs.course);
		await openTopic(mine.course, mine.topics[0]);
		await openTopic(theirs.course, theirs.topics[0]);
		const orders = await db.select().from(order).where(eq(order.userId, student.id));
		for (const g of [mine, theirs]) {
			const item = orders.map((o) => itemFor(o, g.course.id)).find(Boolean);
			await requestGuideRefund({ user: student, itemId: item.itemId, reason: 'broken' });
		}
		const run = (user) => refundsPage({ locals: { user }, depends: () => {} });
		const t = await run(teacher);
		expect(t.admin).toBe(false);
		expect(t.pending.map((r) => r.title)).toEqual([mine.course.title]);
		expect(t.pending[0].buyerEmail).toBeNull();
		expect(t.pending[0].consent.ip).toBeUndefined();
		const a = await run(admin);
		expect(a.pending).toHaveLength(2);
		expect(a.pending[0].consent.ip).toBe('127.0.0.1');
		await expect(run(await createUser())).rejects.toMatchObject({ status: 403 });
	});

	test('teachers refund their own sales within the window; admins any sale, any time', async () => {
		const a = await guide();
		const b = await guide('20.00', await createTeacher());
		await buyOne(a.course);
		await buyOne(b.course);
		const orders = await db.select().from(order).where(eq(order.userId, student.id));
		const itemOf = (g) => orders.map((o) => itemFor(o, g.course.id)).find(Boolean);
		const staff = (user, item, note) =>
			callRoute(staffRoute, { user, body: { itemId: item.itemId, note } });

		// Not another teacher's guide.
		expect((await staff(teacher, itemOf(b))).status).toBe(403);
		// Their own, opened or not, within the window.
		await openTopic(a.course, a.topics[0]);
		const ok = await staff(teacher, itemOf(a), 'Sorry it wasn’t right for you');
		expect(ok.body.request).toMatchObject({ status: 'approved', refundStatus: 'refunded' });
		const [row] = await db
			.select()
			.from(guideRefundRequest)
			.where(eq(guideRefundRequest.id, ok.body.request.id));
		expect(row).toMatchObject({
			decidedBy: 'teacher',
			decisionNote: 'Sorry it wasn’t right for you'
		});
		expect((await enrollmentOf(a.course.id)).revokedAt).not.toBeNull();
		// Again: refused.
		expect((await staff(teacher, itemOf(a))).status).toBe(409);

		// After the window only an admin can.
		for (const o of orders) await backdate(o, 30);
		const bTeacher = (await salesOf(b.course.id))[0].teacherId;
		const bOwner = (
			await db.select().from(partnerAccount).where(eq(partnerAccount.teacherId, bTeacher))
		)[0];
		expect(bOwner).toBeTruthy();
		const byAdmin = await staff(admin, itemOf(b));
		expect(byAdmin.body.request.refundStatus).toBe('refunded');
		// The buyer sees the answer on their purchase page.
		const [opt] = await orderRefundOptions(
			student.id,
			orders.find((o) => itemFor(o, a.course.id)).id
		);
		expect(opt.request).toMatchObject({
			status: 'approved',
			note: 'Sorry it wasn’t right for you'
		});
	});

	test('a teacher can’t refund their own sale after the window', async () => {
		const { course } = await guide();
		await buyOne(course);
		const ord = await orderOf();
		await backdate(ord, 15);
		const r = await callRoute(staffRoute, {
			user: teacher,
			body: { itemId: itemFor(ord, course.id).itemId }
		});
		expect(r.status).toBe(403);
		expect(gw.calls.filter((c) => c.method === 'voidTransaction')).toHaveLength(0);
	});
});

async function guideTopics(course) {
	const { courseForReader } = await import('$lib/server/courses/reader.js');
	return (await courseForReader(course.slug, teacher)).topics;
}
