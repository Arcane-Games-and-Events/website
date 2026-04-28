import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { memberReferralCode, memberReferral, user } from '$lib/server/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { getOrCreateMemberReferralCode } from '$lib/server/member-referral.js';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/login?redirect=/account/referrals');
	}

	// Eligibility: only premium members (or admins for testing) can have a referral code
	const isPremium =
		locals.user.role === 'premium' ||
		locals.user.role === 'admin';

	if (!isPremium) {
		// Render the page anyway so we can show an upsell to non-premium users
		return {
			eligible: false,
			referralCode: null,
			referrals: [],
			totals: { count: 0, earned: 0, pending: 0 }
		};
	}

	// Auto-create their code on first visit
	const codeRow = await getOrCreateMemberReferralCode(locals.user);

	const rawReferrals = await db
		.select({
			id: memberReferral.id,
			subscriptionType: memberReferral.subscriptionType,
			status: memberReferral.status,
			rewardEarnedAt: memberReferral.rewardEarnedAt,
			rewardAppliedAt: memberReferral.rewardAppliedAt,
			createdAt: memberReferral.createdAt,
			referredFirstName: user.firstName
		})
		.from(memberReferral)
		.leftJoin(user, eq(memberReferral.referredUserId, user.id))
		.where(eq(memberReferral.referrerUserId, locals.user.id))
		.orderBy(desc(memberReferral.createdAt));

	const [stats] = await db
		.select({
			count: sql`COUNT(*)::int`,
			earned: sql`COALESCE(SUM(CASE WHEN status IN ('reward_earned', 'reward_applied') THEN 1 ELSE 0 END), 0)::int`,
			pending: sql`COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0)::int`
		})
		.from(memberReferral)
		.where(eq(memberReferral.referrerUserId, locals.user.id));

	return {
		eligible: true,
		referralCode: codeRow,
		referrals: rawReferrals,
		totals: stats || { count: 0, earned: 0, pending: 0 }
	};
}
