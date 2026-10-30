/**
 * Mux Data — what Mux's own player analytics say about our videos:
 * views, unique viewers and watch time (including from before AGE tracked
 * gameplay), and playback quality (start-up time, rebuffering, failures,
 * the viewer experience score).
 *
 * Needs the Mux access token to include Data (read). Without it Mux answers
 * 403 and everything here returns `{ connected: false }`; the Desk shows a
 * note instead of the panel. Responses are cached for ten minutes.
 */
import { env } from '$env/dynamic/private';
import { cached } from '$lib/server/cache/index.js';

const BASE = 'https://api.mux.com/data/v1';
const TTL = 600;

class NotConnected extends Error {}

async function get(path, params) {
	const qs = new URLSearchParams();
	for (const [k, v] of params) qs.append(k, v);
	const auth = Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString('base64');
	const res = await fetch(`${BASE}/${path}?${qs}`, { headers: { authorization: `Basic ${auth}` } });
	if (res.status === 401 || res.status === 403) throw new NotConnected();
	if (!res.ok) throw new Error(`Mux Data ${path}: ${res.status}`);
	return res.json();
}

const timeframe = (days) => ['timeframe[]', `${days}:days`];
const byAsset = (assetId) => ['filters[]', `asset_id:${assetId}`];

async function safe(key, fn) {
	if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) return { connected: false };
	try {
		return { connected: true, ...(await cached(key, fn, { ttl: TTL })) };
	} catch (err) {
		if (err instanceof NotConnected) return { connected: false };
		console.warn('[mux-data]', err?.message);
		return { connected: true, error: 'Mux Data didn’t answer. Try again in a minute.' };
	}
}

/** Quality numbers for a filter set, each as a plain number or null. */
async function quality(filters, days) {
	const metric = async (name) => {
		const r = await get(`metrics/${name}/overall`, [timeframe(days), ...filters]);
		return r?.data?.value ?? null;
	};
	const [startup, rebuffer, failures, score] = [
		await metric('video_startup_time'),
		await metric('rebuffer_percentage'),
		await metric('playback_failure_percentage'),
		await metric('viewer_experience_score')
	];
	return {
		startupMs: startup != null ? Math.round(startup) : null,
		rebufferPct: rebuffer != null ? Math.round(rebuffer * 1000) / 10 : null,
		failurePct: failures != null ? Math.round(failures * 1000) / 10 : null,
		experience: score != null ? Math.round(score * 100) : null
	};
}

/**
 * One video, by its Mux asset id: views, unique viewers, watch time,
 * views per day, quality and top countries over the last `days`.
 */
export function muxVideoData(assetId, days) {
	if (!assetId) return Promise.resolve({ connected: true, empty: true });
	return safe(`mux:data:asset:v1:${assetId}:${days}`, async () => {
		const f = [byAsset(assetId)];
		const views = await get('metrics/views/overall', [timeframe(days), ...f]);
		const unique = await get('metrics/unique_viewers/overall', [timeframe(days), ...f]).catch(
			() => null
		);
		const series = await get('metrics/views/timeseries', [
			timeframe(days),
			['group_by', 'day'],
			...f
		]);
		const countries = await get('metrics/views/breakdown', [
			timeframe(days),
			['group_by', 'country'],
			['order_by', 'views'],
			['order_direction', 'desc'],
			['limit', '8'],
			...f
		]);
		return {
			views: views?.data?.total_views ?? views?.data?.value ?? 0,
			viewers: unique?.data?.value ?? null,
			watchSeconds: Math.round((views?.data?.total_watch_time ?? 0) / 1000),
			daily: (series?.data || []).map((row) => ({
				day: String(row[0]).slice(0, 10),
				n: Number(row[2] ?? row[1] ?? 0)
			})),
			countries: (countries?.data || []).map((r) => ({ key: r.field, n: r.views })),
			quality: await quality(f, days)
		};
	});
}

/**
 * An area's videos at once, by asset id: views and watch time per asset,
 * and quality across them. One breakdown call, then summed.
 * @param {string[]} assetIds
 */
export function muxAreaData(assetIds, days) {
	const ids = [...new Set(assetIds.filter(Boolean))].sort();
	if (!ids.length) return Promise.resolve({ connected: true, empty: true, perAsset: {} });
	const key = `mux:data:area:v1:${days}:${ids.join(',').slice(0, 900)}:${ids.length}`;
	return safe(key, async () => {
		const rows = [];
		let page = 1;
		// paged breakdown over every asset that had views
		for (;;) {
			const r = await get('metrics/views/breakdown', [
				timeframe(days),
				['group_by', 'asset_id'],
				['limit', '100'],
				['page', String(page)]
			]);
			rows.push(...(r?.data || []));
			if (!r?.data?.length || rows.length >= (r.total_row_count ?? 0) || page >= 20) break;
			page++;
		}
		const wanted = new Set(ids);
		const perAsset = {};
		let views = 0;
		let watch = 0;
		for (const r of rows) {
			if (!wanted.has(r.field)) continue;
			perAsset[r.field] = {
				views: r.views ?? 0,
				watchSeconds: Math.round((r.total_watch_time ?? 0) / 1000)
			};
			views += r.views ?? 0;
			watch += r.total_watch_time ?? 0;
		}
		return { views, watchSeconds: Math.round(watch / 1000), perAsset };
	});
}
