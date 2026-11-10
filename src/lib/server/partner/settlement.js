/**
 * Confirming that guide sales were actually collected before they're paid
 * out. A sale is on hold for HOLD_DAYS; once that's up, the hourly billing
 * job asks Authorize.net about its charge:
 *
 *   settled                → the sale is settled and lands on its statement
 *   still waiting to settle → it stays on hold and is asked about again in a day
 *   voided, declined, …    → it's never paid out; admins are told once
 *
 * One lookup per charge (a cart's guides share one), at most BATCH a run.
 */
import { and, eq, isNull, lte } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { order as orderTable, partnerLedger } from '$lib/server/db/schema.js';
import { authnet } from '$lib/server/authnet/client.js';
import { sendAdminAlert } from '$lib/server/email.js';
import { SETTLEMENT_RECHECK_HOURS } from '$lib/academy/partner/terms.js';
import { monthOf } from './ledger.js';

const SETTLED = new Set(['settledSuccessfully', 'settledSuccessfullyWithDiscrepancy']);
const WAITING = new Set([
	'capturedPendingSettlement',
	'authorizedPendingCapture',
	'FDSPendingReview',
	'FDSAuthorizedPendingReview',
	'approvedReview',
	'underReview',
	'pendingFinalSettlement',
	'pendingSettlement',
	'updatingSettlement'
]);
const BATCH = 50;
/** Far enough ahead that a charge that was never collected is never paid out. */
const NEVER_DAYS = 3650;

/** @returns {Promise<{ settled: number, waiting: number, failed: number, skipped: number }>} */
export async function confirmSettlements({ now = new Date() } = {}) {
	const out = { settled: 0, waiting: 0, failed: 0, skipped: 0 };
	const due = await db
		.select({ orderId: partnerLedger.orderId, transId: orderTable.providerRef })
		.from(partnerLedger)
		.innerJoin(orderTable, eq(partnerLedger.orderId, orderTable.id))
		.where(
			and(
				eq(partnerLedger.entryType, 'sale'),
				isNull(partnerLedger.settledAt),
				lte(partnerLedger.payableAt, now)
			)
		)
		.groupBy(partnerLedger.orderId, orderTable.providerRef)
		.limit(BATCH);

	for (const { orderId, transId } of due) {
		const rows = and(
			eq(partnerLedger.orderId, orderId),
			eq(partnerLedger.entryType, 'sale'),
			isNull(partnerLedger.settledAt)
		);
		// A free order has nothing to settle.
		if (!/^\d+$/.test(String(transId))) {
			await db.update(partnerLedger).set({ settledAt: now, updatedAt: now }).where(rows);
			out.settled++;
			continue;
		}
		let details;
		try {
			details = await authnet.getTransactionDetails(transId);
		} catch {
			out.skipped++; // Authorize.net unreachable: try again next run.
			continue;
		}
		const status = details?.status;
		if (status && SETTLED.has(status)) {
			await db.update(partnerLedger).set({ settledAt: now, updatedAt: now }).where(rows);
			out.settled++;
		} else if (!status || WAITING.has(status)) {
			await pushBack(rows, new Date(now.getTime() + SETTLEMENT_RECHECK_HOURS * 3600000), now);
			out.waiting++;
		} else {
			// Voided, declined, expired…: the money never arrived.
			await pushBack(
				rows,
				new Date(now.getTime() + NEVER_DAYS * 86400000),
				now,
				`Charge ${status}; not paid out`
			);
			await sendAdminAlert(`Guide sale not collected (${status})`, [
				`Order ${orderId}, transaction ${transId}.`,
				'Its sales are held and won’t be paid out. Check the order, then refund or record it.'
			]).catch(() => {});
			out.failed++;
		}
	}
	return out;
}

/** Keep sales on hold until `until`, moving them to that month's statement. */
async function pushBack(where, until, now, note = null) {
	await db
		.update(partnerLedger)
		.set({
			payableAt: until,
			statementMonth: monthOf(until),
			updatedAt: now,
			...(note ? { note } : {})
		})
		.where(where);
}

/** Is this sale still waiting on Authorize.net (or its hold)? */
export const awaitingSettlement = (row, now = new Date()) =>
	row.entryType === 'sale' && (!row.settledAt || new Date(row.payableAt) > now);
