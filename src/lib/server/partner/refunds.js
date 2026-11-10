/**
 * Refunds and chargebacks of guides, on the Partner ledger.
 *
 * A guide is refunded whole: the buyer gets back everything they paid for
 * it, card fee included (AGE absorbs the processor's fee), the sale is
 * reversed, the copy comes off the teacher's lifetime count and the guide
 * is taken away. A refund names its guides (`checkoutItemIds`); one that
 * doesn't (an admin refunding an amount) gives back the guides it covers,
 * in cart order.
 *
 * Sales from before the Partner model (legacy rows copied from
 * course_sale) can be refunded in part: each refund deducts the teacher's
 * share of it, and the copy comes off the count once all of it is back.
 *
 * Chargebacks arrive outside the site (Authorize.net doesn't send them);
 * an admin records one on the order page. The bank's fee is an AGE cost
 * (CHARGEBACK_FEE_CENTS), passed to the teacher only if
 * CHARGEBACK_FEE_TO_TEACHER. Buyer refund requests: guideRefunds.js.
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseEnrollment,
	order as orderTable,
	partnerAccount,
	partnerLedger
} from '$lib/server/db/schema.js';
import { markRefunded, money } from '$lib/server/payments/ledger.js';
import { bump } from '$lib/server/cache/index.js';
import { applyRate, splitByWeight } from '$lib/academy/partner/pricing.js';
import { CHARGEBACK_FEE_CENTS, CHARGEBACK_FEE_TO_TEACHER } from '$lib/academy/partner/terms.js';
import { recordAgeCost } from './guideRefunds.js';
import { lockAccount, monthOf, reverseSales, salesForOrder } from './ledger.js';

const guidesOf = (ord) => ord.meta?.guides || [];

/**
 * Take the guides away from the buyer, unless they bought a guide twice
 * and the other purchase still stands: then the enrollment moves to it.
 */
async function revoke(tx, ord, courseIds, at, reason) {
	if (!courseIds.length) return;
	const kept = await tx
		.select({ courseId: partnerLedger.courseId, orderId: partnerLedger.orderId })
		.from(partnerLedger)
		.where(
			and(
				eq(partnerLedger.entryType, 'sale'),
				eq(partnerLedger.status, 'paid'),
				eq(partnerLedger.buyerId, ord.userId),
				inArray(partnerLedger.courseId, courseIds),
				sql`${partnerLedger.orderId} <> ${ord.id}`
			)
		);
	for (const k of kept)
		await tx
			.update(courseEnrollment)
			.set({ orderId: k.orderId })
			.where(
				and(
					eq(courseEnrollment.orderId, ord.id),
					eq(courseEnrollment.courseId, k.courseId),
					isNull(courseEnrollment.revokedAt)
				)
			);
	courseIds = courseIds.filter((id) => !kept.some((k) => k.courseId === id));
	if (!courseIds.length) return;
	await tx
		.update(courseEnrollment)
		.set({ revokedAt: at, revokedReason: reason })
		.where(
			and(
				eq(courseEnrollment.orderId, ord.id),
				inArray(courseEnrollment.courseId, courseIds),
				isNull(courseEnrollment.revokedAt)
			)
		);
}

/**
 * Which guides a refund gives back. Named ones if given; otherwise, in cart
 * order, each guide still held whose price fits inside what has now been
 * refunded on the order in total.
 */
export function guidesCovered(guides, { itemIds = [], reversedIds, refundedCents }) {
	if (itemIds.length) return guides.filter((g) => itemIds.includes(g.itemId));
	let used = guides.filter((g) => reversedIds.has(g.itemId)).reduce((n, g) => n + g.paidCents, 0);
	const out = [];
	for (const g of guides) {
		if (reversedIds.has(g.itemId)) continue;
		if (used + g.paidCents > refundedCents) break;
		used += g.paidCents;
		out.push(g);
	}
	return out;
}

/**
 * A refund reached a Partner-model guides order. Runs inside the refund's
 * transaction (see payments/refunds.js), after the order's refunded amount
 * was raised by `amountCents`.
 */
export async function applyGuideRefund(tx, ord, { amountCents, at, itemIds = [] }) {
	const sales = await salesForOrder(tx, ord.id);
	const reversedIds = new Set(
		sales.filter((s) => s.status !== 'paid').map((s) => s.checkoutItemId)
	);
	const refundedCents = Math.round(Number(ord.refundedAmount || 0) * 100) + amountCents;
	const guides = guidesOf(ord);
	const covered = guidesCovered(guides, { itemIds, reversedIds, refundedCents });
	const ids = new Set(covered.map((g) => g.itemId));
	await reverseSales(
		tx,
		sales.filter((s) => ids.has(s.checkoutItemId)),
		{ status: 'refunded', at }
	);
	await revoke(
		tx,
		ord,
		covered.map((g) => g.courseId),
		at,
		'refunded'
	);
	return { fully: refundedCents >= Math.round(Number(ord.amount) * 100) - 1, guides: covered };
}

/** The legacy (pre-Partner) sale behind an old course order, if it was copied over. */
async function legacySaleFor(tx, orderId) {
	const [row] = await tx
		.select()
		.from(partnerLedger)
		.where(
			and(
				eq(partnerLedger.orderId, orderId),
				eq(partnerLedger.entryType, 'sale'),
				sql`${partnerLedger.legacySaleId} is not null`
			)
		)
		.for('update')
		.limit(1);
	return row || null;
}

/** What has already been taken back from a legacy sale, in teacher cents (a negative number). */
async function deductedFrom(tx, entry) {
	const [{ cents }] = await tx
		.select({ cents: sql`coalesce(sum(${partnerLedger.teacherCents}), 0)::int` })
		.from(partnerLedger)
		.where(and(eq(partnerLedger.reversesId, entry.id), eq(partnerLedger.entryType, 'adjustment')));
	return Number(cents);
}

/**
 * Deduct part (or the rest) of a legacy sale. When `close` is set, or the
 * whole price is back, the sale is marked and its copy comes off the count.
 */
async function deductLegacy(tx, entry, { cents, status, at, close }) {
	const already = await deductedFrom(tx, entry);
	const left = entry.teacherCents + already;
	const share = Number(entry.shareRate ?? 0.9);
	const take = close ? left : Math.min(left, applyRate(cents, share));
	if (take > 0) {
		const thisMonth = monthOf(at);
		await tx.insert(partnerLedger).values({
			entryType: 'adjustment',
			status,
			teacherId: entry.teacherId,
			orderId: entry.orderId,
			courseId: entry.courseId,
			buyerId: entry.buyerId,
			reversesId: entry.id,
			buyerPaidCents: -cents,
			teacherCents: -take,
			occurredAt: at,
			payableAt: at,
			statementMonth: entry.statementMonth > thisMonth ? entry.statementMonth : thisMonth,
			note: status === 'charged_back' ? 'Chargeback' : 'Refund'
		});
	}
	if (close || take >= left) {
		await tx
			.update(partnerLedger)
			.set({ status, updatedAt: at })
			.where(eq(partnerLedger.id, entry.id));
		await lockAccount(tx, entry.teacherId);
		await tx
			.update(partnerAccount)
			.set({
				lifetimeCopies: sql`greatest(0, ${partnerAccount.lifetimeCopies} - 1)`,
				updatedAt: at
			})
			.where(eq(partnerAccount.teacherId, entry.teacherId));
	}
}

/**
 * A refund reached an old course order (sold before the Partner model).
 * Keeps its legacy ledger row in step; course_sale is handled as before.
 */
export async function applyLegacyRefund(tx, ord, { amountCents, at, fully }) {
	const entry = await legacySaleFor(tx, ord.id);
	if (!entry || entry.status !== 'paid') return;
	await deductLegacy(tx, entry, { cents: amountCents, status: 'refunded', at, close: fully });
}

/**
 * Admin: record a chargeback on a guides order (or an old course order).
 * The guides named (or all of them) are reversed as charged back and taken
 * away, and the money is marked as gone in the payment ledger so it can't
 * also be refunded.
 *
 * @param {{ actor: any, orderId: string, itemIds?: string[], note?: string|null, at?: Date }} input
 */
export async function recordChargeback({
	actor,
	orderId,
	itemIds = [],
	note = null,
	at = new Date(),
	feeCents = CHARGEBACK_FEE_CENTS,
	feeToTeacher = CHARGEBACK_FEE_TO_TEACHER
}) {
	const out = await db.transaction(async (tx) => {
		const [ord] = await tx
			.select()
			.from(orderTable)
			.where(eq(orderTable.id, orderId))
			.for('update');
		if (!ord || ord.kind !== 'course') return { ok: false, message: 'Not a guide order.' };
		let cents = 0;
		let courseIds = [];
		if (ord.meta?.partnerModel) {
			const sales = await salesForOrder(tx, ord.id);
			const live = new Set(sales.filter((s) => s.status === 'paid').map((s) => s.checkoutItemId));
			const guides = guidesOf(ord).filter(
				(g) => (!itemIds.length || itemIds.includes(g.itemId)) && live.has(g.itemId)
			);
			if (!guides.length)
				return { ok: false, message: 'Nothing left on this order to charge back.' };
			const ids = new Set(guides.map((g) => g.itemId));
			await reverseSales(
				tx,
				sales.filter((s) => ids.has(s.checkoutItemId)),
				{ status: 'charged_back', at, note }
			);
			cents = guides.reduce((n, g) => n + g.paidCents, 0);
			courseIds = guides.map((g) => g.courseId);
			// The bank's chargeback fee: an AGE cost, shared across the guides,
			// and deducted from the teacher too only when the terms say so.
			const bySale = new Map(sales.map((s) => [s.checkoutItemId, s]));
			const shares = splitByWeight(
				feeCents,
				guides.map((g) => g.paidCents)
			);
			for (const [i, g] of guides.entries()) {
				const sale = bySale.get(g.itemId);
				if (!sale || !shares[i]) continue;
				await recordAgeCost(tx, {
					teacherId: sale.teacherId,
					orderId: ord.id,
					checkoutItemId: g.itemId,
					courseId: g.courseId,
					cents: shares[i],
					at,
					note: 'Chargeback fee'
				});
				if (feeToTeacher)
					await tx.insert(partnerLedger).values({
						entryType: 'adjustment',
						status: 'charged_back',
						teacherId: sale.teacherId,
						orderId: ord.id,
						checkoutItemId: g.itemId,
						courseId: g.courseId,
						reversesId: sale.id,
						teacherCents: -shares[i],
						ageNetCents: shares[i],
						occurredAt: at,
						payableAt: at,
						statementMonth: monthOf(at),
						note: 'Chargeback fee'
					});
			}
		} else {
			const entry = await legacySaleFor(tx, ord.id);
			if (!entry || entry.status !== 'paid')
				return { ok: false, message: 'Nothing left on this order to charge back.' };
			cents = Math.round((Number(ord.amount) - Number(ord.refundedAmount || 0)) * 100);
			await deductLegacy(tx, entry, { cents, status: 'charged_back', at, close: true });
			courseIds = [ord.meta?.courseId].filter(Boolean);
		}
		await revoke(tx, ord, courseIds, at, 'charged_back');
		const total = Number(ord.amount) || 0;
		const refunded = Math.min(total, Number(ord.refundedAmount || 0) + cents / 100);
		await tx
			.update(orderTable)
			.set({
				refundedAmount: money(refunded),
				refundedAt: at,
				meta: {
					...ord.meta,
					chargebacks: [
						...(ord.meta?.chargebacks || []),
						{ at: at.toISOString(), cents, by: actor?.id ?? null, note }
					]
				}
			})
			.where(eq(orderTable.id, ord.id));
		if (/^\d+$/.test(String(ord.providerRef)))
			await markRefunded(ord.providerRef, cents / 100, at, { tx });
		return { ok: true, cents, message: `Recorded a chargeback of $${(cents / 100).toFixed(2)}.` };
	});
	if (out.ok) await bump('orders', 'courses');
	return out;
}
