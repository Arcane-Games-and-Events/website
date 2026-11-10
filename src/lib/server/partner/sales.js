/**
 * Partner-ledger sales in the shape of the old course_sale table, so the
 * Classroom's figures (course lists, a course's money, its analytics) are
 * worked out the same way they always were. Sales from before the Partner
 * model are in the ledger too (copied by migration 042).
 *
 *   gross     the list price (what the teacher's share is worked out on)
 *   refunded  all of it once refunded or charged back (and, for sales from
 *             before the Partner model, any part refunded then)
 *   sharePct  the share the copy was paid at: 90, 93 or 95
 *   payoutId  the payout that paid its statement, if any
 */
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { partnerLedger, partnerStatement } from '$lib/server/db/schema.js';

function ledgerSales() {
	return db
		.select({
			id: partnerLedger.id,
			courseId: partnerLedger.courseId,
			teacherId: partnerLedger.teacherId,
			grossCents: sql`${partnerLedger.listCents}`.mapWith(Number).as('gross_cents'),
			refundedCents:
				sql`(case when ${partnerLedger.status} <> 'paid' then ${partnerLedger.listCents}
				when ${partnerLedger.legacySaleId} is not null then ${partnerLedger.listCents} - ${partnerLedger.buyerPaidCents}
				else 0 end)`
					.mapWith(Number)
					.as('refunded_cents'),
			sharePct: sql`round(coalesce(${partnerLedger.shareRate}, 0.9) * 100)::int`
				.mapWith(Number)
				.as('share_pct'),
			soldAt: sql`${partnerLedger.occurredAt}`.as('sold_at'),
			payableAt: sql`${partnerLedger.payableAt}`.as('payable_at'),
			payoutId: sql`coalesce(${partnerLedger.settledPayoutId}, (
				select ${partnerStatement.payoutId} from ${partnerStatement}
				where ${partnerStatement.teacherId} = ${partnerLedger.teacherId}
					and ${partnerStatement.month} = ${partnerLedger.statementMonth}
					and ${partnerStatement.status} = 'paid'))`.as('payout_id')
		})
		.from(partnerLedger)
		.where(and(eq(partnerLedger.entryType, 'sale'), sql`${partnerLedger.courseId} is not null`))
		.as('course_sale');
}

/** Sales to read the Classroom's figures from, as a table. */
export function salesSource() {
	return ledgerSales();
}

/** The same, for raw SQL: `FROM ${salesSql()} s`. */
export function salesSql() {
	return sql`(SELECT course_id, teacher_id, occurred_at AS sold_at, payable_at,
		list_cents AS gross_cents,
		CASE WHEN status <> 'paid' THEN list_cents
			WHEN legacy_sale_id IS NOT NULL THEN list_cents - buyer_paid_cents
			ELSE 0 END AS refunded_cents,
		round(coalesce(share_rate, 0.9) * 100)::int AS share_pct
		FROM partner_ledger WHERE entry_type = 'sale' AND course_id IS NOT NULL)`;
}
