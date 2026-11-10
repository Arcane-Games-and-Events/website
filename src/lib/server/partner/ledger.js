/**
 * The Partner ledger: what teachers earn, one row per copy sold, reversal,
 * referral bonus or pool share.
 *
 * - Each copy is numbered in its teacher's lifetime count and paid at the
 *   level the teacher held before it (see levelFor in pricing.js). The
 *   teacher's partner_account row is locked while an order is numbered, so
 *   concurrent orders take copy numbers one after another.
 * - A refund or chargeback marks the sale and adds a reversing row on the
 *   same statement or a later one (never an earlier one), and gives the
 *   copy back from the lifetime count.
 * - A row lands on the statement for the month it becomes payable: a sale
 *   after its HOLD_DAYS hold, once Authorize.net confirms the charge settled
 *   (settlement.js); everything else at once.
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { partnerAccount, partnerLedger } from '$lib/server/db/schema.js';
import { HOLD_DAYS } from '$lib/academy/partner/terms.js';
import { splitSale } from '$lib/academy/partner/pricing.js';

const DAY = 86400000;

/** The statement month a moment falls in: 'YYYY-MM-01' (UTC). */
export function monthOf(t) {
	return new Date(t).toISOString().slice(0, 7) + '-01';
}

/** Lock a teacher's counter, creating it at zero the first time. */
export async function lockAccount(tx, teacherId) {
	await tx.insert(partnerAccount).values({ teacherId }).onConflictDoNothing();
	const [acct] = await tx
		.select()
		.from(partnerAccount)
		.where(eq(partnerAccount.teacherId, teacherId))
		.for('update');
	return acct;
}

/**
 * Record the copies in a paid order. Items are numbered per teacher in
 * cart order; teachers are locked in id order so two carts can't deadlock.
 * Free guides aren't sales and aren't counted.
 *
 * @param {any} tx
 * @param {{ orderId: string, buyerId: string, member: boolean, at: Date,
 *   items: Array<{ id: string, courseId: string, teacherId: string|null, position: number,
 *     listCents: number, memberDiscountCents: number, paidCents: number, feeCents: number }> }} sale
 */
export async function recordSales(tx, { orderId, buyerId, member, at, items }) {
	const sold = items.filter((it) => it.teacherId && it.listCents > 0);
	const teachers = [...new Set(sold.map((it) => it.teacherId))].sort();
	const payableAt = new Date(at.getTime() + HOLD_DAYS * DAY);
	const rows = [];
	for (const teacherId of teachers) {
		const acct = await lockAccount(tx, teacherId);
		let copies = acct.lifetimeCopies;
		const mine = sold
			.filter((it) => it.teacherId === teacherId)
			.sort((a, b) => a.position - b.position);
		for (const it of mine) {
			const s = splitSale({ listCents: it.listCents, member, priorCopies: copies });
			rows.push({
				entryType: 'sale',
				status: 'paid',
				teacherId,
				orderId,
				checkoutItemId: it.id,
				courseId: it.courseId,
				buyerId,
				listCents: it.listCents,
				buyerType: member ? 'member' : 'non_member',
				memberDiscountCents: s.memberDiscountCents,
				buyerPaidCents: it.paidCents,
				cardFeeCents: it.feeCents,
				shareRate: String(s.shareRate),
				level: s.level,
				copyNumber: s.copyNumber,
				teacherCents: s.teacherCents,
				ageCommissionCents: s.ageCommissionCents,
				ageNetCents: s.ageNetCents,
				occurredAt: at,
				payableAt,
				statementMonth: monthOf(payableAt)
			});
			copies++;
		}
		await tx
			.update(partnerAccount)
			.set({ lifetimeCopies: copies, updatedAt: at })
			.where(eq(partnerAccount.teacherId, teacherId));
	}
	if (!rows.length) return [];
	return tx.insert(partnerLedger).values(rows).returning();
}

/**
 * Undo sales: each still-paid sale becomes `status` and gets a reversing
 * row, and its copy comes off the teacher's lifetime count.
 *
 * @param {any} tx
 * @param {any[]} sales  partner_ledger sale rows
 * @param {{ status: 'refunded'|'charged_back', at: Date, note?: string|null }} opts
 * @returns {Promise<any[]>} the reversing rows written
 */
export async function reverseSales(tx, sales, { status, at, note = null }) {
	const ids = sales.filter((s) => s.entryType === 'sale').map((s) => s.id);
	if (!ids.length) return [];
	// Re-read under lock: a sale already reversed is left alone.
	const live = await tx
		.select()
		.from(partnerLedger)
		.where(and(inArray(partnerLedger.id, ids), eq(partnerLedger.status, 'paid')))
		.orderBy(asc(partnerLedger.teacherId))
		.for('update');
	if (!live.length) return [];
	const thisMonth = monthOf(at);
	const rows = live.map((s) => ({
		entryType: 'reversal',
		status,
		teacherId: s.teacherId,
		orderId: s.orderId,
		checkoutItemId: s.checkoutItemId,
		courseId: s.courseId,
		buyerId: s.buyerId,
		reversesId: s.id,
		listCents: -s.listCents,
		buyerType: s.buyerType,
		memberDiscountCents: -s.memberDiscountCents,
		buyerPaidCents: -s.buyerPaidCents,
		cardFeeCents: -s.cardFeeCents,
		shareRate: s.shareRate,
		level: s.level,
		copyNumber: s.copyNumber,
		teacherCents: -s.teacherCents,
		ageCommissionCents: -s.ageCommissionCents,
		ageNetCents: -s.ageNetCents,
		occurredAt: at,
		payableAt: at,
		// Never on an earlier statement than the sale: a refund inside the
		// hold nets out on the sale's own statement.
		statementMonth: s.statementMonth > thisMonth ? s.statementMonth : thisMonth,
		note
	}));
	await tx
		.update(partnerLedger)
		.set({ status, updatedAt: at })
		.where(
			inArray(
				partnerLedger.id,
				live.map((s) => s.id)
			)
		);
	const written = await tx.insert(partnerLedger).values(rows).returning();

	const perTeacher = new Map();
	for (const s of live) perTeacher.set(s.teacherId, (perTeacher.get(s.teacherId) || 0) + 1);
	for (const [teacherId, n] of [...perTeacher].sort()) {
		await lockAccount(tx, teacherId);
		await tx
			.update(partnerAccount)
			.set({
				lifetimeCopies: sql`greatest(0, ${partnerAccount.lifetimeCopies} - ${n})`,
				updatedAt: at
			})
			.where(eq(partnerAccount.teacherId, teacherId));
	}
	return written;
}

/** The sales recorded for an order, in cart order. */
export async function salesForOrder(tx, orderId) {
	return tx
		.select()
		.from(partnerLedger)
		.where(and(eq(partnerLedger.orderId, orderId), eq(partnerLedger.entryType, 'sale')))
		.orderBy(asc(partnerLedger.occurredAt), asc(partnerLedger.copyNumber));
}

/**
 * Copy an older one-course sale (a course_sale row) into the ledger, as
 * migration 042's backfill does: 90% of what was paid, counted as a copy.
 * For a checkout that was still in flight when the Partner model began.
 */
export async function recordLegacySale(tx, sale, buyerId) {
	const acct = await lockAccount(tx, sale.teacherId);
	const teacherCents = Math.round((sale.grossCents * sale.sharePct) / 100);
	const [row] = await tx
		.insert(partnerLedger)
		.values({
			entryType: 'sale',
			status: 'paid',
			teacherId: sale.teacherId,
			orderId: sale.orderId,
			courseId: sale.courseId,
			buyerId,
			legacySaleId: sale.id,
			listCents: sale.grossCents,
			buyerType: 'non_member',
			buyerPaidCents: sale.grossCents,
			shareRate: String(sale.sharePct / 100),
			level: 'PARTNER',
			copyNumber: acct.lifetimeCopies + 1,
			teacherCents,
			ageCommissionCents: sale.grossCents - teacherCents,
			ageNetCents: sale.grossCents - teacherCents,
			occurredAt: sale.soldAt,
			payableAt: sale.payableAt,
			statementMonth: monthOf(sale.payableAt),
			note: 'Sold before the Partner model'
		})
		.onConflictDoNothing()
		.returning();
	if (row)
		await tx
			.update(partnerAccount)
			.set({ lifetimeCopies: acct.lifetimeCopies + 1, updatedAt: new Date() })
			.where(eq(partnerAccount.teacherId, sale.teacherId));
	return row || null;
}
