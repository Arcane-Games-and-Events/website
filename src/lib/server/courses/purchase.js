/**
 * Course checkouts from before the AGE Partner model, and course refunds.
 *
 * Guides are bought through $lib/server/partner/checkout.js now. What's
 * left here finishes a one-course checkout that was still in flight when
 * the Partner model switched on (reconciliation finds it by invoice
 * number), and applies refunds to course orders: guides orders on the
 * Partner ledger, older orders on their course_sale row and its copy in
 * the ledger.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	checkout as checkoutTable,
	courseEnrollment,
	courseSale,
	deskCourse,
	order as orderTable,
	user as userTable
} from '$lib/server/db/schema.js';
import { recordPayment } from '$lib/server/payments/ledger.js';
import { bump } from '$lib/server/cache/index.js';
import { sendCourseReceipt } from '$lib/server/email.js';
import { sendOnce } from '$lib/server/billing/notices.js';
import { applyGuideRefund, applyLegacyRefund } from '$lib/server/partner/refunds.js';
import { recordLegacySale } from '$lib/server/partner/ledger.js';
import { HOLD_DAYS } from '$lib/academy/partner/terms.js';

/** Older one-course sales paid the teacher this share of what the student paid. */
const LEGACY_SHARE_PCT = 90;

/**
 * Turn a paid (or free) course checkout into an order, a ledger row, an
 * enrollment and a teacher sale. Safe to call twice.
 *
 * @param {string} checkoutId
 * @param {{ transId: string|null, lastFour?: string|null, cardType?: string|null, email?: string|null }} charge
 */
export async function fulfilCourseCheckout(checkoutId, charge) {
	const now = new Date();
	const result = await db.transaction(async (tx) => {
		const [co] = await tx
			.select()
			.from(checkoutTable)
			.where(eq(checkoutTable.id, checkoutId))
			.for('update');
		if (!co || !co.courseId) throw new Error('Course checkout not found');
		const [course] = await tx
			.select()
			.from(deskCourse)
			.where(eq(deskCourse.id, co.courseId))
			.limit(1);
		if (co.status === 'fulfilled' && co.orderId) {
			const [ord] = await tx.select().from(orderTable).where(eq(orderTable.id, co.orderId));
			return { checkout: co, order: ord, course, already: true };
		}
		const [u] = await tx.select().from(userTable).where(eq(userTable.id, co.userId)).limit(1);
		const email = charge.email || u?.email || null;
		const transId = charge.transId || null;

		const [ord] = await tx
			.insert(orderTable)
			.values({
				provider: 'authnet',
				providerRef: transId || `free:${co.id}`,
				userEmail: email,
				userId: co.userId,
				kind: 'course',
				amount: (co.amountCents / 100).toFixed(2),
				currency: 'USD',
				checkoutId: co.id,
				meta: {
					type: 'course',
					courseId: co.courseId,
					courseTitle: course?.title || co.payload?.courseTitle,
					courseSlug: course?.slug || co.payload?.courseSlug,
					transactionId: transId,
					cardLastFour: charge.lastFour || null,
					cardType: charge.cardType || null,
					invoiceNumber: co.invoiceNumber
				}
			})
			.returning();

		if (transId) {
			await recordPayment(
				{
					transId,
					kind: 'course',
					amount: co.amountCents / 100,
					listAmount: co.listCents / 100,
					userId: co.userId,
					userEmail: email,
					orderId: ord.id,
					source: 'app',
					verifiedAt: now
				},
				{ tx }
			);
		}

		// The enrollment. A student added free earlier who now pays keeps one row.
		const [live] = await tx
			.select()
			.from(courseEnrollment)
			.where(
				and(
					eq(courseEnrollment.courseId, co.courseId),
					eq(courseEnrollment.userId, co.userId),
					isNull(courseEnrollment.revokedAt)
				)
			)
			.limit(1);
		let enrollment;
		if (live) {
			[enrollment] = await tx
				.update(courseEnrollment)
				.set({ source: 'purchase', orderId: ord.id })
				.where(eq(courseEnrollment.id, live.id))
				.returning();
		} else {
			[enrollment] = await tx
				.insert(courseEnrollment)
				.values({ courseId: co.courseId, userId: co.userId, source: 'purchase', orderId: ord.id })
				.returning();
		}

		if (co.amountCents > 0) {
			const [sale] = await tx
				.insert(courseSale)
				.values({
					courseId: co.courseId,
					teacherId: course?.authorId || null,
					enrollmentId: enrollment.id,
					orderId: ord.id,
					transId,
					grossCents: co.amountCents,
					sharePct: LEGACY_SHARE_PCT,
					soldAt: now,
					payableAt: new Date(now.getTime() + HOLD_DAYS * 86400000)
				})
				.returning();
			if (sale.teacherId) await recordLegacySale(tx, sale, co.userId);
		}

		await tx
			.update(checkoutTable)
			.set({ status: 'fulfilled', orderId: ord.id, transId, updatedAt: now, lastError: null })
			.where(eq(checkoutTable.id, co.id));
		return { checkout: co, order: ord, course, enrollment, email, already: false };
	});

	await bump('orders', 'courses');
	if (!result.already && result.email && result.course) {
		const [teacher] = result.course.authorId
			? await db
					.select({ firstName: userTable.firstName, lastName: userTable.lastName })
					.from(userTable)
					.where(eq(userTable.id, result.course.authorId))
					.limit(1)
			: [];
		await sendOnce('course_receipt', result.order.id, result.checkout.userId, () =>
			sendCourseReceipt(result.email, {
				courseTitle: result.course.title,
				courseSlug: result.course.slug,
				teacher: teacher ? `${teacher.firstName} ${teacher.lastName || ''}`.trim() : null,
				amountCents: result.checkout.amountCents,
				lastFour: charge.lastFour || null,
				invoiceNumber: result.checkout.invoiceNumber
			})
		);
	}
	return result;
}

/**
 * A refund reached a course order: reduce the teacher's sale and, once the
 * whole price is back, take the course away. Runs inside the refund's
 * transaction (see payments/refunds.js).
 *
 * A guides order is refunded guide by guide on the Partner ledger instead
 * (see $lib/server/partner/refunds.js); an older order also keeps its
 * copied ledger row in step.
 */
export async function applyCourseRefund(tx, ord, amountCents, at, { itemIds = [] } = {}) {
	if (ord.meta?.partnerModel) return applyGuideRefund(tx, ord, { amountCents, at, itemIds });
	const legacy = await applyOldCourseRefund(tx, ord, amountCents, at);
	await applyLegacyRefund(tx, ord, { amountCents, at, fully: legacy.fully });
	return legacy;
}

async function applyOldCourseRefund(tx, ord, amountCents, at) {
	const [sale] = await tx.select().from(courseSale).where(eq(courseSale.orderId, ord.id)).limit(1);
	let fully = false;
	if (sale) {
		const refundedCents = Math.min(sale.grossCents, sale.refundedCents + amountCents);
		await tx.update(courseSale).set({ refundedCents }).where(eq(courseSale.id, sale.id));
		fully = refundedCents >= sale.grossCents;
	}
	if (fully) {
		await tx
			.update(courseEnrollment)
			.set({ revokedAt: at, revokedReason: 'refunded' })
			.where(and(eq(courseEnrollment.orderId, ord.id), isNull(courseEnrollment.revokedAt)));
	}
	return { fully };
}
