import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runPool } from '$lib/server/partner/pool.js';

/**
 * GET /api/cron/partner-pool — the monthly teacher pool, for the month
 * just ended. Does nothing unless the pool is on (POOL_ENABLED in terms.js)
 * and AGE has enough active Premium members; see partner/pool.js.
 * Vercel Cron calls it with `Authorization: Bearer ${CRON_SECRET}`; an
 * admin can trigger it by hand.
 */
export async function GET({ request, locals }) {
	const header = request.headers.get('authorization');
	const cronOk = env.CRON_SECRET && header === `Bearer ${env.CRON_SECRET}`;
	if (!cronOk && locals.user?.role !== 'admin')
		return json({ error: 'Unauthorized' }, { status: 401 });
	try {
		return json({ success: true, ...(await runPool()) });
	} catch (err) {
		console.error('[pool] run failed:', err);
		return json({ error: err?.message || 'Pool run failed' }, { status: 500 });
	}
}
