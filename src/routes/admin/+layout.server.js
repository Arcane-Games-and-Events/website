import { redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth/roles.js';
import { db } from '$lib/server/db/index.js';
import { partnerReferral } from '$lib/server/db/schema.js';
import { sql } from 'drizzle-orm';

/**
 * /admin layout guard — admins only. Tournament staff run their events
 * from /staff. Logged-out visitors go to the login page and come back
 * here afterwards; everyone else goes home.
 */
export const load = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
	}
	if (!isAdmin(locals.user)) {
		throw redirect(302, '/');
	}

	// Pending partner referrals whose payout is due within 3 days (or
	// already due). Shown as a badge on the Partners tab.
	let partnerPayoutsSoon = 0;
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
		// The badge is decorative.
	}

	return { user: locals.user, partnerPayoutsSoon };
};
