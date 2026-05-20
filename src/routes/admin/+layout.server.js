// src/routes/admin/+layout.server.js
import { requireRole } from '$lib/server/guards';
import { db } from '$lib/server/db/index.js';
import { partnerReferral } from '$lib/server/db/schema.js';
import { sql } from 'drizzle-orm';

export const load = async ({ locals }) => {
	// Admin shell is for admin + tournament staff only. CMS roles (writer,
	// creator) live at /cms — they don't need admin access.
	requireRole(locals, ['admin', 'tournament staff']);

	// Count pending referrals whose payout is due within the next 3 days (or already due)
	let partnerPayoutsSoon = 0;
	if (locals.user?.role === 'admin') {
		try {
			const [row] = await db
				.select({
					count: sql`COALESCE(SUM(CASE
						WHEN payout_status = 'pending'
						AND created_at + INTERVAL '1 month' <= NOW() + INTERVAL '3 days'
						THEN 1 ELSE 0 END), 0)::int`
				})
				.from(partnerReferral);
			partnerPayoutsSoon = row?.count || 0;
		} catch {
			// Silent fail — badge is decorative
		}
	}

	return { user: locals.user, partnerPayoutsSoon };
};
