/**
 * Buying guides under the Partner model: one or more guides in one charge.
 *
 * The server prices the cart (quoteCart): members pay 10% less on every
 * guide, and the card fee is charged once on the whole cart, inside the
 * prices shown. The `checkout` row and its `checkout_item`s are written
 * before the card is charged, so the total shown is exactly what's
 * charged. `fulfilGuideCheckout` turns an approved charge into an order, a
 * payment, an enrollment per guide and the teacher ledger, exactly once.
 *
 * The checkout keeps its first guide in `course_id` (with
 * payload.kind = 'guides'), so reconciliation and polling find it as a
 * course checkout.
 */
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	checkout as checkoutTable,
	checkoutItem,
	courseEnrollment,
	deskCourse,
	order as orderTable,
	user as userTable
} from '$lib/server/db/schema.js';
import { quoteCart } from '$lib/academy/partner/pricing.js';
import { REFUND_CONSENT_TEXT } from '$lib/academy/partner/terms.js';
import { recordPayment } from '$lib/server/payments/ledger.js';
import { nextInvoiceNumber } from '$lib/server/payments/invoice.js';
import { bump } from '$lib/server/cache/index.js';
import { sendGuidesReceipt } from '$lib/server/email.js';
import { sendOnce } from '$lib/server/billing/notices.js';
import { recordSales } from './ledger.js';

/** At most this many guides in one checkout. */
export const MAX_CART_ITEMS = 20;

/** A guide's list price in cents. */
export const listCentsOf = (course) => Math.max(0, Math.round(Number(course.price || 0) * 100));

/** Is this checkout a Partner-model guides checkout? */
export const isGuidesCheckout = (co) => co?.payload?.kind === 'guides';

/**
 * The published guides behind a list of ids, in the order given, with
 * duplicates and unknown ids dropped.
 */
export async function guidesByIds(ids) {
	const wanted = [...new Set((ids || []).map(String))].slice(0, MAX_CART_ITEMS);
	if (!wanted.length) return [];
	const rows = await db
		.select()
		.from(deskCourse)
		.where(and(inArray(deskCourse.id, wanted), eq(deskCourse.status, 'published')));
	const byId = new Map(rows.map((c) => [c.id, c]));
	return wanted.map((id) => byId.get(id)).filter(Boolean);
}

/** The guides in a list that the user already has. */
export async function ownedAmong(userId, courseIds) {
	if (!userId || !courseIds.length) return new Set();
	const rows = await db
		.select({ courseId: courseEnrollment.courseId })
		.from(courseEnrollment)
		.where(
			and(
				eq(courseEnrollment.userId, userId),
				inArray(courseEnrollment.courseId, courseIds),
				isNull(courseEnrollment.revokedAt)
			)
		);
	return new Set(rows.map((r) => r.courseId));
}

/** Price guides for a buyer: the quote the cart page shows and the checkout charges. */
export function priceGuides(courses, { member }) {
	const q = quoteCart(
		courses.map((c) => ({ listCents: listCentsOf(c) })),
		{ member }
	);
	return {
		...q,
		items: q.items.map((it, i) => ({
			...it,
			courseId: courses[i].id,
			slug: courses[i].slug,
			title: courses[i].title,
			teacherId: courses[i].authorId || null
		}))
	};
}

/**
 * The buyer's refund-policy consent, from a checkout request: the exact text
 * shown, and where it came from. Null unless the box was ticked.
 */
export function consentFrom(request, getClientAddress, given) {
	if (given !== true) return null;
	let ip = null;
	try {
		ip = getClientAddress();
	} catch {
		/* not every caller has an address */
	}
	return {
		text: REFUND_CONSENT_TEXT,
		ip,
		userAgent: (request.headers.get('user-agent') || '').slice(0, 500) || null
	};
}

/**
 * Create (or return) the checkout for an idempotency key. A paid checkout
 * needs the buyer's refund-policy consent (consentFrom()), stored with it.
 * @returns {Promise<{ checkout: any, existing: boolean } | { error: string, status: number }>}
 */
export async function createGuideCheckout({
	user,
	courses,
	member,
	idempotencyKey,
	consent = null
}) {
	if (!courses.length) return { error: 'Your cart is empty.', status: 400 };
	const [existing] = await db
		.select()
		.from(checkoutTable)
		.where(eq(checkoutTable.idempotencyKey, idempotencyKey))
		.limit(1);
	if (existing) {
		const same =
			existing.userId === user.id &&
			isGuidesCheckout(existing) &&
			(existing.payload.courseIds || []).join() === courses.map((c) => c.id).join();
		if (!same) return { error: 'Invalid request', status: 400 };
		return { checkout: existing, existing: true };
	}
	const quote = priceGuides(courses, { member });
	if (quote.totalCents > 0 && !consent)
		return {
			error: 'Please tick the box to confirm you understand the refund policy.',
			status: 400,
			consent: true
		};
	const first = courses[0];
	try {
		const co = await db.transaction(async (tx) => {
			const [row] = await tx
				.insert(checkoutTable)
				.values({
					userId: user.id,
					courseId: first.id,
					idempotencyKey,
					invoiceNumber: await nextInvoiceNumber('course'),
					status: 'pending',
					quantity: courses.length,
					listCents: quote.listCents,
					discountCents: quote.memberDiscountCents,
					amountCents: quote.totalCents,
					...(consent
						? {
								consentGiven: true,
								consentText: consent.text,
								consentAt: new Date(),
								consentIp: consent.ip,
								consentUserAgent: consent.userAgent
							}
						: {}),
					payload: {
						kind: 'guides',
						member,
						courseIds: courses.map((c) => c.id),
						courseTitle: courses.length === 1 ? first.title : `${courses.length} guides`,
						courseSlug: first.slug,
						subtotalCents: quote.subtotalCents,
						feeCents: quote.feeCents
					}
				})
				.returning();
			await tx.insert(checkoutItem).values(
				quote.items.map((it, i) => ({
					checkoutId: row.id,
					courseId: it.courseId,
					teacherId: it.teacherId,
					position: i,
					title: it.title,
					listCents: it.listCents,
					memberDiscountCents: it.memberDiscountCents,
					priceCents: it.priceCents,
					feeCents: it.feeCents,
					paidCents: it.paidCents
				}))
			);
			return row;
		});
		return { checkout: co, existing: false };
	} catch (err) {
		if (err?.code === '23505' || err?.cause?.code === '23505') {
			const [row] = await db
				.select()
				.from(checkoutTable)
				.where(eq(checkoutTable.idempotencyKey, idempotencyKey))
				.limit(1);
			if (row) return { checkout: row, existing: true };
		}
		throw err;
	}
}

/** A checkout's guides, in cart order. */
export async function itemsOf(checkoutId, tx = db) {
	return tx
		.select()
		.from(checkoutItem)
		.where(eq(checkoutItem.checkoutId, checkoutId))
		.orderBy(asc(checkoutItem.position));
}

/**
 * Turn a paid (or free) guides checkout into an order, a payment, an
 * enrollment per guide and the teacher ledger. Safe to call twice.
 *
 * @param {string} checkoutId
 * @param {{ transId: string|null, lastFour?: string|null, cardType?: string|null, email?: string|null }} charge
 */
export async function fulfilGuideCheckout(checkoutId, charge) {
	const now = new Date();
	const result = await db.transaction(async (tx) => {
		const [co] = await tx
			.select()
			.from(checkoutTable)
			.where(eq(checkoutTable.id, checkoutId))
			.for('update');
		if (!co || !isGuidesCheckout(co)) throw new Error('Guides checkout not found');
		const items = await itemsOf(co.id, tx);
		const courses = await tx
			.select()
			.from(deskCourse)
			.where(
				inArray(
					deskCourse.id,
					items.map((it) => it.courseId)
				)
			);
		const courseOf = new Map(courses.map((c) => [c.id, c]));
		if (co.status === 'fulfilled' && co.orderId) {
			const [ord] = await tx.select().from(orderTable).where(eq(orderTable.id, co.orderId));
			return { checkout: co, order: ord, items, courseOf, already: true };
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
					partnerModel: true,
					courseId: co.courseId,
					courseTitle: co.payload.courseTitle,
					courseSlug: co.payload.courseSlug,
					member: !!co.payload.member,
					guides: items.map((it) => ({
						itemId: it.id,
						courseId: it.courseId,
						title: it.title,
						slug: courseOf.get(it.courseId)?.slug || null,
						listCents: it.listCents,
						paidCents: it.paidCents
					})),
					feeCents: co.payload.feeCents ?? 0,
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
					discountAmount: co.discountCents / 100,
					discountKind: co.discountCents > 0 ? 'premium_guide' : null,
					userId: co.userId,
					userEmail: email,
					orderId: ord.id,
					source: 'app',
					verifiedAt: now
				},
				{ tx }
			);
		}

		// An enrollment per guide. A student added free earlier who now pays keeps one row.
		for (const it of items) {
			const [live] = await tx
				.select()
				.from(courseEnrollment)
				.where(
					and(
						eq(courseEnrollment.courseId, it.courseId),
						eq(courseEnrollment.userId, co.userId),
						isNull(courseEnrollment.revokedAt)
					)
				)
				.limit(1);
			if (live) {
				await tx
					.update(courseEnrollment)
					.set({ source: 'purchase', orderId: ord.id })
					.where(eq(courseEnrollment.id, live.id));
			} else {
				await tx.insert(courseEnrollment).values({
					courseId: it.courseId,
					userId: co.userId,
					source: 'purchase',
					orderId: ord.id
				});
			}
		}

		if (co.amountCents > 0) {
			await recordSales(tx, {
				orderId: ord.id,
				buyerId: co.userId,
				member: !!co.payload.member,
				at: now,
				items: items.map((it) => ({
					...it,
					// The guide's teacher now, in case the checkout was written before a handover.
					teacherId: courseOf.get(it.courseId)?.authorId || it.teacherId
				}))
			});
		}

		await tx
			.update(checkoutTable)
			.set({ status: 'fulfilled', orderId: ord.id, transId, updatedAt: now, lastError: null })
			.where(eq(checkoutTable.id, co.id));
		return { checkout: co, order: ord, items, courseOf, email, already: false };
	});

	await bump('orders', 'courses');
	// Sales show on Earnings; the Classroom's updates are about running courses.
	if (!result.already) {
		if (result.email) {
			await sendOnce('course_receipt', result.order.id, result.checkout.userId, () =>
				sendGuidesReceipt(result.email, {
					items: result.items.map((it) => ({
						title: it.title,
						slug: result.courseOf.get(it.courseId)?.slug,
						paidCents: it.paidCents
					})),
					memberDiscountCents: result.checkout.discountCents,
					amountCents: result.checkout.amountCents,
					lastFour: charge.lastFour || null,
					invoiceNumber: result.checkout.invoiceNumber
				})
			);
		}
	}
	return result;
}

/** Where to send the buyer once a guides checkout is fulfilled. */
export function doneUrl(co) {
	const ids = co.payload?.courseIds || [];
	return ids.length === 1 ? `/academy/${co.payload.courseSlug}?enrolled=1` : '/my-courses?new=1';
}
