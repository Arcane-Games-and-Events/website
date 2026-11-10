/**
 * Buying a course with the fake gateway, through the real endpoint: the
 * all-in price (10% less for Premium), one charge per purchase, the
 * enrollment and the teacher's sale on the Partner ledger created
 * together, and refunds taking it back. (Carts, levels and the rest of the
 * Partner terms: partner-model.test.js.)
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	checkout,
	courseEnrollment,
	deskCourse,
	order,
	partnerLedger,
	payment
} from '$lib/server/db/schema.js';
import { POST as purchaseRoute } from '../../src/routes/api/academy/[slug]/purchase/+server.js';
import { GET as pollRoute } from '../../src/routes/api/checkout/[id]/+server.js';
import { refundOrderRemainder } from '$lib/server/payments/refunds.js';
import { reconcileAll } from '$lib/server/billing/reconcile.js';
import { installFakeAuthnet } from '../support/fake-authnet.js';
import { HOLD_DAYS } from '$lib/academy/partner/terms.js';
import { createAdmin, createSavedCard, createUser } from '../support/factories.js';
import { callRoute, createTeacher, liveCourse, readyCourse } from '../support/courses.js';

let gw;
let teacher;
let student;
let card;
let course;
let keySeq = 0;

beforeEach(async () => {
	gw = installFakeAuthnet();
	teacher = await createTeacher();
	student = await createUser({ customerProfileId: 'cp-student' });
	card = await createSavedCard(student, {
		customerProfileId: 'cp-student',
		paymentProfileId: 'pp-s'
	});
	gw.addCard('cp-student', 'pp-s');
	({ course } = await liveCourse(teacher, { price: '50.00' }));
});

async function buy({
	who = student,
	c = course,
	payment: pay,
	key = `ck-${++keySeq}`,
	...extra
} = {}) {
	const r = await callRoute(purchaseRoute, {
		params: { slug: c.slug },
		user: who,
		body: {
			payment: pay ?? { savedCardId: card.id },
			idempotencyKey: key,
			consent: true,
			...extra
		},
		url: `http://localhost/api/academy/${c.slug}/purchase`
	});
	return { ...r, key };
}

const enrollmentsOf = (userId) =>
	db.select().from(courseEnrollment).where(eq(courseEnrollment.userId, userId));
const sales = () => db.select().from(partnerLedger).where(eq(partnerLedger.entryType, 'sale'));

describe('buying a course', () => {
	test('charges the all-in price once and enrols the student, with the teacher’s sale', async () => {
		const r = await buy({ amount: 1 });
		expect(r.status).toBe(200);
		expect(r.body.redirectUrl).toBe(`/academy/${course.slug}?enrolled=1`);

		expect(gw.charges()).toHaveLength(1);
		// $50 with the card fee included: (50 + 0.30) / (1 − 0.029) = $51.80.
		expect(gw.charges()[0].opts.amountCents).toBe(5180);
		expect(gw.charges()[0].opts.invoiceNumber).toMatch(/^AGE-C\d+$/);

		const [en] = await enrollmentsOf(student.id);
		expect(en).toMatchObject({ courseId: course.id, source: 'purchase', revokedAt: null });
		const [ord] = await db.select().from(order).where(eq(order.id, en.orderId));
		expect(ord).toMatchObject({ kind: 'course', userId: student.id });
		expect(Number(ord.amount)).toBe(51.8);
		const [pay] = await db.select().from(payment).where(eq(payment.orderId, ord.id));
		expect(pay.kind).toBe('course');

		const [sale] = await sales();
		expect(sale).toMatchObject({
			courseId: course.id,
			teacherId: teacher.id,
			status: 'paid',
			listCents: 5000,
			buyerPaidCents: 5180,
			teacherCents: 4500
		});
		const days = (sale.payableAt - sale.occurredAt) / 86400000;
		expect(days).toBe(HOLD_DAYS);
	});

	test('Premium members pay 10% less, card fee included', async () => {
		const member = await createUser({
			role: 'premium',
			subscriptionStatus: 'active',
			customerProfileId: 'cp-m'
		});
		const mc = await createSavedCard(member, {
			customerProfileId: 'cp-m',
			paymentProfileId: 'pp-m'
		});
		gw.addCard('cp-m', 'pp-m');
		expect((await buy({ who: member, payment: { savedCardId: mc.id } })).status).toBe(200);
		expect(gw.charges()[0].opts.amountCents).toBe(4665);
	});

	test('the same purchase twice charges once; buying again once enrolled is refused', async () => {
		const first = await buy();
		const again = await buy({ key: first.key });
		expect(again.status).toBe(409);
		expect(again.body.redirectUrl).toBe(`/academy/${course.slug}?enrolled=1`);
		expect((await buy()).status).toBe(409);
		expect(gw.charges()).toHaveLength(1);
		expect(await enrollmentsOf(student.id)).toHaveLength(1);
	});

	test('a declined card enrols nobody, and trying again can succeed', async () => {
		gw.next('declined');
		const r = await buy();
		expect(r.status).toBe(402);
		expect(await enrollmentsOf(student.id)).toHaveLength(0);
		expect(await sales()).toHaveLength(0);
		expect((await buy({ key: r.key })).status).toBe(200);
		expect(await enrollmentsOf(student.id)).toHaveLength(1);
	});

	test('a charge whose answer never came is found by the hourly job and enrols once', async () => {
		gw.next('charged_but_timeout');
		const r = await buy();
		expect(r.status).toBe(202);
		expect(await enrollmentsOf(student.id)).toHaveLength(0);
		await db
			.update(checkout)
			.set({ updatedAt: new Date(Date.now() - 11 * 60000) })
			.where(eq(checkout.id, r.body.checkoutId));
		await reconcileAll();
		await reconcileAll();
		expect(await enrollmentsOf(student.id)).toHaveLength(1);
		expect(await sales()).toHaveLength(1);
		const poll = await callRoute(pollRoute, {
			method: 'GET',
			params: { id: r.body.checkoutId },
			user: student
		});
		expect(poll.body).toMatchObject({
			status: 'fulfilled',
			redirectUrl: `/academy/${course.slug}?enrolled=1`
		});
	});

	test('only a live course can be bought', async () => {
		const { course: draft } = await readyCourse(teacher, { title: 'Not yet' });
		expect((await buy({ c: draft })).status).toBe(404);
		await db.update(deskCourse).set({ status: 'archived' }).where(eq(deskCourse.id, course.id));
		expect((await buy()).status).toBe(404);
		expect((await buy({ who: null })).status).toBe(401);
		expect(gw.charges()).toHaveLength(0);
	});

	test('a free course enrols without the gateway and earns nothing', async () => {
		const { course: free } = await liveCourse(teacher, { title: 'Free intro', price: '0.00' });
		const r = await buy({ c: free, payment: {} });
		expect(r.status).toBe(200);
		expect(gw.charges()).toHaveLength(0);
		expect(await enrollmentsOf(student.id)).toHaveLength(1);
		expect(await sales()).toHaveLength(0);
	});
});

describe('refunds', () => {
	test('a full refund takes the course away and reverses the sale', async () => {
		await buy();
		const [en] = await enrollmentsOf(student.id);
		const admin = await createAdmin();
		const r = await refundOrderRemainder({ actor: admin, orderId: en.orderId });
		expect(r).toMatchObject({ ok: true, method: 'void' });
		const [after] = await enrollmentsOf(student.id);
		expect(after.revokedAt).not.toBeNull();
		expect(after.revokedReason).toBe('refunded');
		const [sale] = await sales();
		expect(sale.status).toBe('refunded');
	});

	test('a refund of less than the guide keeps the course and the sale', async () => {
		await buy();
		const [en] = await enrollmentsOf(student.id);
		const [ord] = await db.select().from(order).where(eq(order.id, en.orderId));
		gw.settle(ord.providerRef);
		const { refundTransaction } = await import('$lib/server/payments/refunds.js');
		const r = await refundTransaction({
			transId: ord.providerRef,
			amountCents: 2000,
			orderId: ord.id
		});
		expect(r).toMatchObject({ ok: true, method: 'refund' });
		const [after] = await enrollmentsOf(student.id);
		expect(after.revokedAt).toBeNull();
		const [sale] = await sales();
		expect(sale.status).toBe('paid');
	});

	test('after a refund the student can buy it again', async () => {
		await buy();
		const [en] = await enrollmentsOf(student.id);
		await refundOrderRemainder({ actor: await createAdmin(), orderId: en.orderId });
		expect((await buy()).status).toBe(200);
		const live = (await enrollmentsOf(student.id)).filter((e) => !e.revokedAt);
		expect(live).toHaveLength(1);
	});
});
