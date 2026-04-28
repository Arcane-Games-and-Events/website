import { redirect, fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { partner, partnerReferral, user } from '$lib/server/db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';
import {
	normalizePartnerCode,
	calculatePayoutDueDate,
	isReadyToPayOut
} from '$lib/server/partner-code.js';

export async function load({ locals, params }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, `/login?redirect=/admin/partners/${params.partnerId}`);
	}

	const [row] = await db
		.select({
			id: partner.id,
			code: partner.code,
			displayName: partner.displayName,
			isActive: partner.isActive,
			payoutNotes: partner.payoutNotes,
			createdAt: partner.createdAt,
			userId: partner.userId,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email
		})
		.from(partner)
		.leftJoin(user, eq(partner.userId, user.id))
		.where(eq(partner.id, params.partnerId))
		.limit(1);

	if (!row) throw error(404, 'Partner not found');

	const rawReferrals = await db
		.select({
			id: partnerReferral.id,
			code: partnerReferral.code,
			subscriptionType: partnerReferral.subscriptionType,
			commissionAmount: partnerReferral.commissionAmount,
			payoutStatus: partnerReferral.payoutStatus,
			paidAt: partnerReferral.paidAt,
			paidNotes: partnerReferral.paidNotes,
			createdAt: partnerReferral.createdAt,
			referredFirstName: user.firstName,
			referredEmail: user.email
		})
		.from(partnerReferral)
		.leftJoin(user, eq(partnerReferral.referredUserId, user.id))
		.where(eq(partnerReferral.partnerId, params.partnerId))
		.orderBy(desc(partnerReferral.createdAt));

	// Enrich each referral with payout due date + ready-to-pay flag
	const referrals = rawReferrals.map((r) => ({
		...r,
		payoutDueAt: calculatePayoutDueDate(r.createdAt),
		readyToPay: isReadyToPayOut(r.createdAt, r.payoutStatus)
	}));

	return { partner: row, referrals };
}

export const actions = {
	update: async ({ request, locals, params }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const rawCode = form.get('code')?.toString();
		const displayName = form.get('displayName')?.toString().trim() || null;
		const payoutNotes = form.get('payoutNotes')?.toString() || null;
		const isActive = form.get('isActive') === 'on';

		const code = normalizePartnerCode(rawCode);
		if (!code || code.length < 3) return fail(400, { error: 'Code must be at least 3 characters' });
		if (!/^[A-Z0-9_-]+$/.test(code)) {
			return fail(400, { error: 'Code can only contain letters, numbers, underscores, hyphens' });
		}

		// Uniqueness check (exclude self)
		const [codeInUse] = await db
			.select()
			.from(partner)
			.where(sql`upper(${partner.code}) = ${code} AND ${partner.id} != ${params.partnerId}`)
			.limit(1);
		if (codeInUse) return fail(400, { error: `Code "${code}" is already taken` });

		await db
			.update(partner)
			.set({ code, displayName, payoutNotes, isActive })
			.where(eq(partner.id, params.partnerId));

		return { success: true, message: 'Partner updated' };
	},

	delete: async ({ locals, params }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Forbidden' });

		// Block deletion if there are any referrals — preserves audit trail.
		// Admin should deactivate instead (toggle isActive off).
		const [{ count }] = await db
			.select({ count: sql`COUNT(*)::int` })
			.from(partnerReferral)
			.where(eq(partnerReferral.partnerId, params.partnerId));

		if (count > 0) {
			return fail(400, {
				error: `Can't delete: this partner has ${count} referral${count === 1 ? '' : 's'} on record. Toggle "Active" off instead to disable the code.`
			});
		}

		await db.delete(partner).where(eq(partner.id, params.partnerId));
		throw redirect(303, '/admin/partners');
	},

	markPaid: async ({ request, locals, params }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const referralIds = form.getAll('referralId').map((x) => x.toString());
		const paidNotes = form.get('paidNotes')?.toString() || null;

		if (referralIds.length === 0) return fail(400, { error: 'No referrals selected' });

		// Update only referrals that belong to this partner + are pending
		for (const id of referralIds) {
			await db
				.update(partnerReferral)
				.set({
					payoutStatus: 'paid',
					paidAt: new Date(),
					paidNotes
				})
				.where(
					sql`${partnerReferral.id} = ${id}
						AND ${partnerReferral.partnerId} = ${params.partnerId}
						AND ${partnerReferral.payoutStatus} = 'pending'`
				);
		}

		return { success: true, message: `${referralIds.length} referral(s) marked paid` };
	}
};
