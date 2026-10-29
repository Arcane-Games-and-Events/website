import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runBilling } from '$lib/server/billing/renewals.js';

/** Vercel gives this route up to five minutes. */
export const config = { maxDuration: 300 };

/**
 * GET /api/cron/billing — the hourly billing job.
 *
 * Reconciles charges with unknown outcomes, ends memberships whose time is
 * up, sends reminders, applies referral rewards and, when BILLING_ENABLED
 * is "true", charges the renewals that are due. Vercel Cron calls it with
 * `Authorization: Bearer ${CRON_SECRET}`; an admin can trigger it by hand.
 */
export async function GET({ request, locals }) {
	const header = request.headers.get('authorization');
	const cronOk = env.CRON_SECRET && header === `Bearer ${env.CRON_SECRET}`;
	if (!cronOk && locals.user?.role !== 'admin')
		return json({ error: 'Unauthorized' }, { status: 401 });
	try {
		const summary = await runBilling({ trigger: cronOk ? 'cron' : 'manual' });
		return json({ success: true, ...summary });
	} catch (err) {
		console.error('[billing] run failed:', err);
		return json({ error: err?.message || 'Billing run failed' }, { status: 500 });
	}
}
