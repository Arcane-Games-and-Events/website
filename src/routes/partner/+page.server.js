import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { partner, partnerReferral, user } from '$lib/server/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { calculatePayoutDueDate, isReadyToPayOut } from '$lib/server/partner-code.js';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/partner');
	}

	const [partnerRow] = await db
		.select()
		.from(partner)
		.where(eq(partner.userId, locals.user.id))
		.limit(1);

	if (!partnerRow) {
		// User is not a partner — show a 404-ish state so non-partners can't discover the page's structure
		throw error(404, 'Not found');
	}

	const rawReferrals = await db
		.select({
			id: partnerReferral.id,
			subscriptionType: partnerReferral.subscriptionType,
			commissionAmount: partnerReferral.commissionAmount,
			payoutStatus: partnerReferral.payoutStatus,
			paidAt: partnerReferral.paidAt,
			createdAt: partnerReferral.createdAt,
			referredFirstName: user.firstName
		})
		.from(partnerReferral)
		.leftJoin(user, eq(partnerReferral.referredUserId, user.id))
		.where(eq(partnerReferral.partnerId, partnerRow.id))
		.orderBy(desc(partnerReferral.createdAt));

	const referrals = rawReferrals.map((r) => ({
		...r,
		payoutDueAt: calculatePayoutDueDate(r.createdAt),
		readyToPay: isReadyToPayOut(r.createdAt, r.payoutStatus)
	}));

	const [totals] = await db
		.select({
			count: sql`COUNT(*)::int`,
			pending: sql`COALESCE(SUM(CASE WHEN payout_status = 'pending' THEN commission_amount ELSE 0 END), 0)`,
			paid: sql`COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN commission_amount ELSE 0 END), 0)`
		})
		.from(partnerReferral)
		.where(eq(partnerReferral.partnerId, partnerRow.id));

	return {
		partner: partnerRow,
		referrals,
		totals: totals || { count: 0, pending: 0, paid: 0 }
	};
}
