import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Cache warming for public read-heavy pages.
 *
 * Vercel Cron pings this endpoint on a schedule. We fan out to the
 * public URLs listed below with `Cache-Control: no-cache` so Vercel's
 * edge revalidates → origin runs → Redis + the edge cache both warm
 * in one hop. Real visitors then hit the warm cache instead of paying
 * the cold-DB tax on the first request after a TTL expiry.
 *
 * Can be called by:
 * - Vercel Cron (configured in vercel.json)
 * - An external cron service (uptime-robot, cron-job.org, GitHub Actions)
 *   with the CRON_SECRET header
 * - An admin, for manual triggering / debugging
 *
 * Security: requires `Authorization: Bearer ${CRON_SECRET}` OR an
 * authenticated admin session. Rejects anything else so nobody can
 * DoS us by hammering this endpoint.
 */

// URLs to warm. These are the read-heavy public pages that benefit
// most from being cached and hurt the most when they're cold. Skip
// per-record dynamic routes (`/library/[slug]`, `/age-open/[eventId]`)
// — there are too many combinations to warm meaningfully. AGE Open
// tabs are listed explicitly because the outer page cache keys tab.
const WARM_URLS = [
	'/',
	'/library',
	'/library/vods',
	'/age-open',
	'/age-open?tab=events',
	'/age-open?tab=standings',
	'/age-open?tab=results',
	'/age-open?tab=decklists',
	'/age-open?tab=rules',
	'/academy',
	'/premium'
];

async function warm(baseUrl, path) {
	const started = Date.now();
	const url = new URL(path, baseUrl).toString();
	try {
		const res = await fetch(url, {
			method: 'GET',
			// Force the CDN to revalidate against origin instead of
			// serving a cached response back to us — we want origin to
			// actually execute so Redis warms.
			headers: {
				'Cache-Control': 'no-cache',
				'User-Agent': 'age-events-cache-warmer/1.0'
			}
		});
		return {
			path,
			status: res.status,
			edgeCache: res.headers.get('x-vercel-cache') || null,
			ms: Date.now() - started
		};
	} catch (err) {
		return { path, error: err.message, ms: Date.now() - started };
	}
}

export async function GET({ request, locals, url }) {
	// Verify authorization — same pattern as the sync-subscriptions cron.
	const authHeader = request.headers.get('authorization');
	const isValidCronSecret = env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`;
	const isAdmin = locals.user?.role === 'admin';

	if (!isValidCronSecret && !isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const baseUrl = url.origin;
	const startedAt = Date.now();
	const results = await Promise.all(WARM_URLS.map((path) => warm(baseUrl, path)));
	const totalMs = Date.now() - startedAt;

	const ok = results.filter((r) => !r.error && r.status >= 200 && r.status < 400).length;
	const failed = results.length - ok;

	return json({
		success: true,
		warmed: results.length,
		ok,
		failed,
		totalMs,
		results
	});
}
