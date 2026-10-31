import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { syncDue } from '$lib/server/studio/network.js';

/**
 * GET /api/cron/studio-network — the AGE Network's hourly sync.
 *
 * Pulls new uploads in from the creators that are due (see syncDue in
 * $lib/server/studio/network.js) so staff have them to choose from. It
 * never features anything itself.
 *
 * Security: requires `Authorization: Bearer ${CRON_SECRET}` OR an
 * authenticated admin session, as the other cron routes do.
 */
export async function GET({ request, locals }) {
	const authHeader = request.headers.get('authorization');
	const isValidCronSecret = env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`;
	const isAdmin = locals.user?.role === 'admin';
	if (!isValidCronSecret && !isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const results = await syncDue();
	return json({
		synced: results.length,
		added: results.reduce((n, r) => n + (r.added || 0), 0),
		failed: results.filter((r) => r.error).map((r) => ({ id: r.id, error: r.error }))
	});
}
