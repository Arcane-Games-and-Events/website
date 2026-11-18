import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runChecks } from '$lib/server/status/index.js';

/**
 * GET /api/cron/status — every five minutes: check each part of the site
 * and record it for /status. Vercel Cron calls it with
 * `Authorization: Bearer ${CRON_SECRET}`; an admin can trigger it by hand.
 */
export async function GET({ request, locals }) {
	const header = request.headers.get('authorization');
	const cronOk = env.CRON_SECRET && header === `Bearer ${env.CRON_SECRET}`;
	if (!cronOk && locals.user?.role !== 'admin')
		return json({ error: 'Unauthorized' }, { status: 401 });
	try {
		return json({ success: true, results: await runChecks() });
	} catch (err) {
		console.error('[status] checks failed:', err);
		return json({ error: err?.message || 'Status checks failed' }, { status: 500 });
	}
}
