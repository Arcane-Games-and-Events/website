import {
	startView,
	beatView,
	startPageview,
	beatPageview,
	recordClientConversion,
	isMissingTable
} from '$lib/server/contentAnalytics/collect.js';

/**
 * POST /api/ca — content analytics collection.
 *
 * Accepts JSON or text/plain (navigator.sendBeacon). Always answers 204 so
 * the browser never retries and readers never see an error; failures are
 * logged server-side (except "table missing", which means migration 021
 * hasn't been applied yet).
 */
export async function POST(event) {
	let body = null;
	try {
		const text = await event.request.text();
		if (text.length <= 64 * 1024) body = JSON.parse(text);
	} catch {
		body = null;
	}
	if (body && typeof body === 'object') {
		try {
			if (body.t === 'start') await startView(body, event);
			else if (body.t === 'beat') await beatView(body);
			else if (body.t === 'pv') await startPageview(body, event);
			else if (body.t === 'pvbeat') await beatPageview(body);
			else if (body.t === 'conv') await recordClientConversion(body, event);
		} catch (err) {
			if (!isMissingTable(err)) console.error('[content-analytics] collect failed:', err?.message);
		}
	}
	return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
