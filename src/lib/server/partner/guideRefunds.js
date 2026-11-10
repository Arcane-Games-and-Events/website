/**
 * Guide refunds under the guide refund policy ($lib/academy/partner/refundPolicy.js).
 *
 * A buyer asks for a refund of one guide (one line item). Duplicates and
 * unopened guides inside the window are approved by the system at once;
 * everything else waits for an admin, or for the guide's teacher, who may
 * approve (never deny). Admins, and teachers for their own guides, can
 * also refund a sale straight from the dashboard (staffRefundGuide). No
 * emails: teachers get a Classroom notification, admins have their queue,
 * buyers see where their request stands on their purchase page. An
 * approved request is refunded through the one
 * refund engine (payments/refunds.js): voided if the charge hasn't settled,
 * refunded if it has. The amount is what the buyer paid for that guide,
 * card fee share included; the engine reverses the guide's ledger sale,
 * takes the copy off the teacher's count and removes the guide.
 *
 * When a settled charge is refunded the processor keeps its original fee:
 * that is recorded as an AGE cost on the ledger, never charged to the
 * teacher. A failed refund is marked refund_failed, admins are alerted, and
 * it can be retried. One live request per line item, so nothing is refunded
 * twice.
 */
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	checkout as checkoutTable,
	checkoutItem,
	courseEnrollment,
	deskCourse,
	guideRefundRequest,
	order as orderTable,
	partnerLedger,
	refund as refundTable,
	user as userTable
} from '$lib/server/db/schema.js';
import { refundTransaction } from '$lib/server/payments/refunds.js';
import { isAdmin } from '$lib/server/auth/roles.js';
import { bump } from '$lib/server/cache/index.js';
import { sendAdminAlert } from '$lib/server/email.js';
import { adminIds, notify } from '$lib/server/courses/notifications.js';
import {
	REFUND_REASONS,
	autoApproval,
	canRequestRefund,
	isReason,
	mayDecide,
	withinRequestWindow
} from '$lib/academy/partner/refundPolicy.js';
import { REFUND_REQUEST_WINDOW_DAYS } from '$lib/academy/partner/terms.js';
import { monthOf } from './ledger.js';

export class RefundError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

const reasonLabel = (r) => REFUND_REASONS.find((x) => x.key === r)?.label || r;

/**
 * Everything the policy needs to know about one guide bought: its order,
 * line item, ledger sale, the buyer's enrollment (when it was first
 * opened), and whether the buyer has another paid purchase of the guide.
 */
export async function purchaseFacts(itemId, tx = db) {
	const [item] = await tx.select().from(checkoutItem).where(eq(checkoutItem.id, itemId)).limit(1);
	if (!item) return null;
	const [ord] = await tx
		.select()
		.from(orderTable)
		.where(eq(orderTable.checkoutId, item.checkoutId))
		.limit(1);
	if (!ord) return null;
	const [sale] = await tx
		.select()
		.from(partnerLedger)
		.where(and(eq(partnerLedger.checkoutItemId, item.id), eq(partnerLedger.entryType, 'sale')))
		.limit(1);
	const enrollments = await tx
		.select()
		.from(courseEnrollment)
		.where(
			and(eq(courseEnrollment.userId, ord.userId), eq(courseEnrollment.courseId, item.courseId))
		);
	const enrollment =
		enrollments.find((e) => e.orderId === ord.id) ||
		enrollments.find((e) => !e.revokedAt) ||
		enrollments[0] ||
		null;
	const others = sale
		? await tx
				.select({ id: partnerLedger.id })
				.from(partnerLedger)
				.where(
					and(
						eq(partnerLedger.entryType, 'sale'),
						eq(partnerLedger.status, 'paid'),
						eq(partnerLedger.buyerId, ord.userId),
						eq(partnerLedger.courseId, item.courseId),
						ne(partnerLedger.id, sale.id)
					)
				)
				.limit(1)
		: [];
	const [open] = await tx
		.select()
		.from(guideRefundRequest)
		.where(
			and(eq(guideRefundRequest.checkoutItemId, item.id), ne(guideRefundRequest.status, 'denied'))
		)
		.limit(1);
	// The latest answer, a decline included, for the buyer's purchase page.
	const [last] = await tx
		.select()
		.from(guideRefundRequest)
		.where(eq(guideRefundRequest.checkoutItemId, item.id))
		.orderBy(desc(guideRefundRequest.createdAt))
		.limit(1);
	return {
		item,
		order: ord,
		sale: sale || null,
		enrollment,
		purchasedAt: ord.createdAt,
		firstOpenedAt: enrollment?.firstOpenedAt || null,
		hasDuplicate: others.length > 0 && sale?.status === 'paid',
		refunded: !sale || sale.status !== 'paid',
		openRequest: open || null,
		lastRequest: last || null
	};
}

/** What the buyer can do about one guide, for their purchases page. */
export function eligibility(facts, now = new Date()) {
	if (!facts) return { canRequest: false };
	return {
		canRequest:
			facts.item.paidCents > 0 &&
			canRequestRefund(
				{
					purchasedAt: facts.purchasedAt,
					hasDuplicate: facts.hasDuplicate,
					refunded: facts.refunded,
					openRequest: !!facts.openRequest
				},
				now
			),
		opened: !!facts.firstOpenedAt,
		request: facts.lastRequest
			? {
					id: facts.lastRequest.id,
					status: facts.lastRequest.status,
					refundStatus: facts.lastRequest.refundStatus,
					// What the person who decided wrote to the buyer.
					note: facts.lastRequest.decidedBy !== 'system' ? facts.lastRequest.decisionNote : null
				}
			: null
	};
}

/** A buyer's guides from one order, each with its refund options. */
export async function orderRefundOptions(userId, orderId, now = new Date()) {
	const [ord] = await db.select().from(orderTable).where(eq(orderTable.id, orderId)).limit(1);
	if (!ord || ord.userId !== userId || !ord.meta?.partnerModel) return [];
	const out = [];
	for (const g of ord.meta.guides || []) {
		const facts = await purchaseFacts(g.itemId);
		out.push({ ...g, ...eligibility(facts, now) });
	}
	return out;
}

/**
 * A buyer asks for a refund of one guide. Approved and refunded at once
 * when the policy allows it without a person (duplicate, unopened);
 * otherwise waits for an admin or the teacher.
 *
 * @param {{ user: any, itemId: string, reason: string, message?: string|null, now?: Date }} input
 */
export async function requestGuideRefund({
	user,
	itemId,
	reason,
	message = null,
	now = new Date()
}) {
	if (!isReason(reason)) throw new RefundError(400, 'Choose a reason.');
	const facts = await purchaseFacts(itemId);
	if (!facts || facts.order.userId !== user.id || !facts.order.meta?.partnerModel)
		throw new RefundError(404, 'Purchase not found.');
	if (facts.item.paidCents <= 0) throw new RefundError(400, 'This guide was free.');
	if (facts.refunded) throw new RefundError(409, 'This guide has already been refunded.');
	if (facts.openRequest)
		throw new RefundError(409, 'You’ve already asked for a refund of this guide.');
	if (!canRequestRefund({ purchasedAt: facts.purchasedAt, hasDuplicate: facts.hasDuplicate }, now))
		throw new RefundError(
			403,
			`Refunds can be requested within ${REFUND_REQUEST_WINDOW_DAYS} days of purchase.`
		);

	const auto = autoApproval(
		{
			purchasedAt: facts.purchasedAt,
			firstOpenedAt: facts.firstOpenedAt,
			hasDuplicate: facts.hasDuplicate
		},
		now
	);
	let row;
	try {
		[row] = await db
			.insert(guideRefundRequest)
			.values({
				checkoutItemId: facts.item.id,
				orderId: facts.order.id,
				userId: user.id,
				courseId: facts.item.courseId,
				teacherId: facts.sale?.teacherId || facts.item.teacherId,
				reason,
				message: message ? String(message).slice(0, 2000) : null,
				amountCents: facts.item.paidCents,
				...(auto
					? {
							status: 'auto_approved',
							autoReason: auto,
							decidedBy: 'system',
							decidedAt: now,
							decisionNote:
								auto === 'duplicate'
									? 'Charged twice for the same guide.'
									: 'Not opened, and asked within the unopened refund window.'
						}
					: {}),
				createdAt: now,
				updatedAt: now
			})
			.returning();
	} catch (err) {
		if (err?.code === '23505' || err?.cause?.code === '23505')
			throw new RefundError(409, 'You’ve already asked for a refund of this guide.');
		throw err;
	}

	if (auto) return processGuideRefund(row.id);

	// The teacher and every admin hear in the Classroom, where Refunds has
	// the request. The buyer follows it on their purchase page.
	try {
		await notify([row.teacherId, ...(await adminIds())], {
			kind: 'refund_request',
			courseId: facts.item.courseId,
			actorId: user.id,
			data: { title: facts.item.title, reason: reasonLabel(reason), requestId: row.id }
		});
	} catch (err) {
		console.warn('[refunds] notification not sent:', err?.message || err);
	}
	return row;
}

/**
 * An admin approves or denies a pending request, or the guide's teacher
 * approves one. Approving refunds it.
 *
 * @param {{ actor: any, requestId: string, action: 'approve'|'deny', note?: string|null, now?: Date }} input
 */
export async function decideGuideRefund({
	actor,
	requestId,
	action,
	note = null,
	now = new Date()
}) {
	if (action !== 'approve' && action !== 'deny') throw new RefundError(400, 'Approve or deny.');
	const [req] = await db
		.select()
		.from(guideRefundRequest)
		.where(eq(guideRefundRequest.id, requestId))
		.limit(1);
	if (!req) throw new RefundError(404, 'Request not found.');
	const admin = isAdmin(actor);
	if (!mayDecide(action, { isAdmin: admin, isGuideTeacher: !!actor && req.teacherId === actor.id }))
		throw new RefundError(403, admin ? 'Not permitted.' : 'Only AGE can decline a refund.');
	const [updated] = await db
		.update(guideRefundRequest)
		.set({
			status: action === 'approve' ? 'approved' : 'denied',
			decidedBy: admin ? 'admin' : 'teacher',
			decidedByUser: actor.id,
			decisionNote: note ? String(note).slice(0, 2000) : null,
			decidedAt: now,
			updatedAt: now
		})
		.where(and(eq(guideRefundRequest.id, requestId), eq(guideRefundRequest.status, 'pending')))
		.returning();
	if (!updated) throw new RefundError(409, 'This request has already been decided.');
	if (action === 'approve') return processGuideRefund(updated.id);
	return updated;
}

/**
 * Refund one guide straight from the dashboard, without the buyer asking:
 * an admin, any guide at any time; a teacher, their own guide within the
 * request window (their discretion under the policy). It's recorded as an
 * approved request made on the buyer's behalf and goes through the same
 * path as every refund.
 *
 * @param {{ actor: any, itemId: string, orderId?: string|null, note?: string|null, now?: Date }} input
 */
export async function staffRefundGuide({
	actor,
	itemId,
	orderId = null,
	note = null,
	now = new Date()
}) {
	const facts = await purchaseFacts(itemId);
	if (!facts || (orderId && facts.order.id !== orderId))
		throw new RefundError(404, 'Guide not found on this order.');
	const admin = isAdmin(actor);
	const teacherId = facts.sale?.teacherId || facts.item.teacherId;
	if (!admin) {
		if (!actor || teacherId !== actor.id)
			throw new RefundError(403, 'You can refund only your own guides.');
		if (!withinRequestWindow(facts.purchasedAt, now))
			throw new RefundError(
				403,
				`Teachers can refund within ${REFUND_REQUEST_WINDOW_DAYS} days of purchase. Ask AGE for anything older.`
			);
	}
	if (facts.item.paidCents <= 0) throw new RefundError(400, 'This guide was free.');
	if (facts.refunded) throw new RefundError(409, 'This guide has already been refunded.');
	if (facts.openRequest) {
		if (facts.openRequest.status === 'pending')
			return decideGuideRefund({
				actor,
				requestId: facts.openRequest.id,
				action: 'approve',
				note,
				now
			});
		return processGuideRefund(facts.openRequest.id);
	}
	const [row] = await db
		.insert(guideRefundRequest)
		.values({
			checkoutItemId: facts.item.id,
			orderId: facts.order.id,
			userId: facts.order.userId,
			courseId: facts.item.courseId,
			teacherId,
			reason: 'other',
			message: null,
			amountCents: facts.item.paidCents,
			status: 'approved',
			decidedBy: admin ? 'admin' : 'teacher',
			decidedByUser: actor?.id ?? null,
			decisionNote: note || (admin ? 'Refunded by AGE.' : 'Refunded by the teacher.'),
			decidedAt: now,
			createdAt: now,
			updatedAt: now
		})
		.returning();
	return processGuideRefund(row.id);
}

/**
 * Refund an approved request at the gateway (or try again after a
 * failure). Safe to call twice: a request already refunded or in progress
 * is left alone.
 */
export async function processGuideRefund(requestId) {
	const claimed = await db.transaction(async (tx) => {
		const [req] = await tx
			.select()
			.from(guideRefundRequest)
			.where(eq(guideRefundRequest.id, requestId))
			.for('update');
		if (!req || (req.status !== 'approved' && req.status !== 'auto_approved')) return null;
		if (req.refundStatus === 'refunded' || req.refundStatus === 'processing')
			return { req, skip: true };
		const [updated] = await tx
			.update(guideRefundRequest)
			.set({
				refundStatus: 'processing',
				attempts: sql`${guideRefundRequest.attempts} + 1`,
				updatedAt: new Date()
			})
			.where(eq(guideRefundRequest.id, requestId))
			.returning();
		return { req: updated, skip: false };
	});
	if (!claimed) throw new RefundError(409, 'This request isn’t approved.');
	if (claimed.skip) return claimed.req;
	const req = claimed.req;

	const facts = await purchaseFacts(req.checkoutItemId);
	// Already refunded some other way (a whole-order refund, a chargeback).
	if (facts?.refunded) {
		const [done] = await db
			.update(guideRefundRequest)
			.set({
				refundStatus: 'refunded',
				gatewayResponse: 'Already refunded.',
				updatedAt: new Date()
			})
			.where(eq(guideRefundRequest.id, req.id))
			.returning();
		return done;
	}

	let result;
	try {
		result = await refundTransaction({
			transId: facts.order.providerRef,
			amountCents: facts.item.paidCents,
			reason: `Guide refund (${req.autoReason || req.reason}): ${facts.item.title}`.slice(0, 500),
			requestedBy: req.decidedByUser,
			orderId: facts.order.id,
			checkoutItemIds: [facts.item.id],
			guideRefundRequestId: req.id,
			notify: false
		});
	} catch (err) {
		result = { ok: false, status: 'failed', message: err?.message || String(err) };
	}

	const refundStatus =
		result.status === 'succeeded'
			? 'refunded'
			: result.status === 'failed'
				? 'refund_failed'
				: 'processing';
	const [after] = await db
		.update(guideRefundRequest)
		.set({
			refundStatus,
			refundId: result.refundId ?? req.refundId,
			gatewayMethod: result.method ?? null,
			gatewayResponse: String(result.message || '').slice(0, 1000),
			updatedAt: new Date()
		})
		.where(eq(guideRefundRequest.id, req.id))
		.returning();
	await bump('orders', 'courses');

	if (refundStatus === 'refund_failed') {
		await sendAdminAlert(`Guide refund failed: ${facts.item.title}`, [
			`Order ${facts.order.id}, ${(facts.item.paidCents / 100).toFixed(2)} USD.`,
			`Gateway: ${result.message}`,
			'Retry it from Classroom → Refunds.'
		]).catch(() => {});
	}
	return after;
}

/**
 * Called by the refund engine when a gateway refund for a guide request
 * completes (inside its transaction): the request is refunded, and when a
 * settled charge was refunded, the card fee the processor keeps is an AGE
 * cost on the ledger.
 */
export async function settleGuideRefund(tx, refundRow, method, at = new Date()) {
	if (!refundRow.guideRefundRequestId) return;
	const [req] = await tx
		.update(guideRefundRequest)
		.set({ refundStatus: 'refunded', gatewayMethod: method, updatedAt: at })
		.where(eq(guideRefundRequest.id, refundRow.guideRefundRequestId))
		.returning();
	if (!req || method !== 'refund') return;
	const [item] = await tx
		.select()
		.from(checkoutItem)
		.where(eq(checkoutItem.id, req.checkoutItemId))
		.limit(1);
	if (!item?.feeCents || !req.teacherId) return;
	const [already] = await tx
		.select({ id: partnerLedger.id })
		.from(partnerLedger)
		.where(
			and(
				eq(partnerLedger.entryType, 'age_cost'),
				eq(partnerLedger.checkoutItemId, item.id),
				sql`${partnerLedger.note} like 'Card fee%'`
			)
		)
		.limit(1);
	if (already) return;
	await recordAgeCost(tx, {
		teacherId: req.teacherId,
		orderId: req.orderId,
		checkoutItemId: item.id,
		courseId: req.courseId,
		cents: item.feeCents,
		at,
		note: 'Card fee kept by the processor on a refund'
	});
}

/** An AGE cost on the ledger: lowers AGE's net, never the teacher's pay. */
export async function recordAgeCost(
	tx,
	{
		teacherId,
		orderId = null,
		checkoutItemId = null,
		courseId = null,
		cents,
		at = new Date(),
		note
	}
) {
	await tx.insert(partnerLedger).values({
		entryType: 'age_cost',
		status: 'earned',
		teacherId,
		orderId,
		checkoutItemId,
		courseId,
		cardFeeCents: note.startsWith('Card fee') ? cents : 0,
		teacherCents: 0,
		ageNetCents: -cents,
		occurredAt: at,
		payableAt: at,
		statementMonth: monthOf(at),
		note
	});
}

/**
 * Requests for the admin queue (or one teacher's guides), newest first,
 * with the purchase, whether it was opened, and the consent given.
 *
 * @param {{ status?: 'pending'|'failed'|'decided'|'all', teacherId?: string|null, limit?: number }} [opts]
 */
export async function listGuideRefunds({ status = 'pending', teacherId = null, limit = 200 } = {}) {
	const where = [];
	if (status === 'pending') where.push(eq(guideRefundRequest.status, 'pending'));
	if (status === 'failed')
		where.push(inArray(guideRefundRequest.refundStatus, ['refund_failed', 'processing']));
	if (status === 'decided') where.push(ne(guideRefundRequest.status, 'pending'));
	if (teacherId) where.push(eq(guideRefundRequest.teacherId, teacherId));
	const rows = await db
		.select({
			r: guideRefundRequest,
			title: checkoutItem.title,
			paidCents: checkoutItem.paidCents,
			listCents: checkoutItem.listCents,
			slug: deskCourse.slug,
			buyerFirst: userTable.firstName,
			buyerLast: userTable.lastName,
			buyerEmail: userTable.email,
			orderAt: orderTable.createdAt,
			invoice: sql`${orderTable.meta}->>'invoiceNumber'`,
			consentGiven: checkoutTable.consentGiven,
			consentText: checkoutTable.consentText,
			consentAt: checkoutTable.consentAt,
			consentIp: checkoutTable.consentIp,
			refundRowStatus: refundTable.status,
			refundRowError: refundTable.lastError
		})
		.from(guideRefundRequest)
		.innerJoin(checkoutItem, eq(guideRefundRequest.checkoutItemId, checkoutItem.id))
		.innerJoin(orderTable, eq(guideRefundRequest.orderId, orderTable.id))
		.innerJoin(userTable, eq(guideRefundRequest.userId, userTable.id))
		.leftJoin(checkoutTable, eq(checkoutItem.checkoutId, checkoutTable.id))
		.leftJoin(deskCourse, eq(guideRefundRequest.courseId, deskCourse.id))
		.leftJoin(refundTable, eq(guideRefundRequest.refundId, refundTable.id))
		.where(where.length ? and(...where) : sql`true`)
		.orderBy(desc(guideRefundRequest.createdAt))
		.limit(limit);
	const opened = rows.length
		? await db
				.select({
					userId: courseEnrollment.userId,
					courseId: courseEnrollment.courseId,
					orderId: courseEnrollment.orderId,
					firstOpenedAt: courseEnrollment.firstOpenedAt
				})
				.from(courseEnrollment)
				.where(
					inArray(
						courseEnrollment.userId,
						rows.map((x) => x.r.userId)
					)
				)
		: [];
	return rows.map((x) => {
		const en =
			opened.find((e) => e.orderId === x.r.orderId && e.courseId === x.r.courseId) ||
			opened.find((e) => e.userId === x.r.userId && e.courseId === x.r.courseId);
		// A refund waiting on the hourly job that then failed shows as failed.
		const refundStatus =
			x.r.refundStatus === 'processing' && x.refundRowStatus === 'failed'
				? 'refund_failed'
				: x.r.refundStatus;
		return {
			...x.r,
			refundStatus,
			reasonLabel: reasonLabel(x.r.reason),
			title: x.title,
			slug: x.slug,
			paidCents: x.paidCents,
			listCents: x.listCents,
			buyer: `${x.buyerFirst || ''} ${x.buyerLast || ''}`.trim() || x.buyerEmail,
			buyerEmail: x.buyerEmail,
			orderAt: x.orderAt,
			invoice: x.invoice,
			firstOpenedAt: en?.firstOpenedAt || null,
			consent: {
				given: !!x.consentGiven,
				text: x.consentText,
				at: x.consentAt,
				ip: x.consentIp
			},
			gatewayError:
				refundStatus === 'refund_failed' ? x.r.gatewayResponse || x.refundRowError : null
		};
	});
}

/** Retry a refund that failed at the gateway (admins). */
export async function retryGuideRefund({ actor, requestId }) {
	if (!isAdmin(actor)) throw new RefundError(403, 'Admins only.');
	const [req] = await db
		.select()
		.from(guideRefundRequest)
		.where(eq(guideRefundRequest.id, requestId))
		.limit(1);
	if (!req) throw new RefundError(404, 'Request not found.');
	if (req.refundStatus !== 'refund_failed' && req.refundStatus !== 'processing')
		throw new RefundError(409, 'Nothing to retry.');
	await db
		.update(guideRefundRequest)
		.set({ refundStatus: 'refund_failed', updatedAt: new Date() })
		.where(eq(guideRefundRequest.id, requestId));
	return processGuideRefund(requestId);
}

/** Requests waiting for a decision: one teacher's guides, or (null) every guide. */
export async function pendingRefundCount(teacherId = null) {
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(guideRefundRequest)
		.where(
			and(
				eq(guideRefundRequest.status, 'pending'),
				teacherId ? eq(guideRefundRequest.teacherId, teacherId) : sql`true`
			)
		);
	return Number(n);
}
