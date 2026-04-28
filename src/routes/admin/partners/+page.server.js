import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { partner, partnerReferral, user } from '$lib/server/db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';

export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/partners');
	}

	// All partners joined with their user info + aggregated referral stats
	const partners = await db
		.select({
			id: partner.id,
			code: partner.code,
			displayName: partner.displayName,
			isActive: partner.isActive,
			createdAt: partner.createdAt,
			userId: partner.userId,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			referralCount: sql`COALESCE((
				SELECT COUNT(*)::int FROM partner_referral
				WHERE partner_referral.partner_id = ${partner.id}
			), 0)`.as('referralCount'),
			pendingCommission: sql`COALESCE((
				SELECT SUM(commission_amount) FROM partner_referral
				WHERE partner_referral.partner_id = ${partner.id}
				AND partner_referral.payout_status = 'pending'
			), 0)`.as('pendingCommission'),
			readyToPayAmount: sql`COALESCE((
				SELECT SUM(commission_amount) FROM partner_referral
				WHERE partner_referral.partner_id = ${partner.id}
				AND partner_referral.payout_status = 'pending'
				AND partner_referral.created_at + INTERVAL '1 month' <= NOW()
			), 0)`.as('readyToPayAmount'),
			paidCommission: sql`COALESCE((
				SELECT SUM(commission_amount) FROM partner_referral
				WHERE partner_referral.partner_id = ${partner.id}
				AND partner_referral.payout_status = 'paid'
			), 0)`.as('paidCommission')
		})
		.from(partner)
		.leftJoin(user, eq(partner.userId, user.id))
		.orderBy(desc(partner.createdAt));

	// Program-wide totals. "Ready to pay" = pending + payout due date (created_at + 1 month) has passed.
	const [totals] = await db
		.select({
			totalReferrals: sql`COUNT(*)::int`,
			totalPending: sql`COALESCE(SUM(CASE WHEN payout_status = 'pending' THEN commission_amount ELSE 0 END), 0)`,
			totalPaid: sql`COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN commission_amount ELSE 0 END), 0)`,
			readyToPayCount: sql`COALESCE(SUM(CASE WHEN payout_status = 'pending' AND created_at + INTERVAL '1 month' <= NOW() THEN 1 ELSE 0 END), 0)::int`,
			readyToPayAmount: sql`COALESCE(SUM(CASE WHEN payout_status = 'pending' AND created_at + INTERVAL '1 month' <= NOW() THEN commission_amount ELSE 0 END), 0)`
		})
		.from(partnerReferral);

	return {
		partners,
		totals: totals || {
			totalReferrals: 0,
			totalPending: 0,
			totalPaid: 0,
			readyToPayCount: 0,
			readyToPayAmount: 0
		}
	};
}
