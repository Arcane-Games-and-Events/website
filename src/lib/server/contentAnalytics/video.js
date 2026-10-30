/**
 * Video analytics — the Desk's YouTube Studio–style numbers for videos.
 *
 * Built on the same first-party views as the rest of content analytics
 * (ca_view: qualified, non-staff). A gameplay video's views carry `vod_id`
 * (migration 028); an article's video is its entry's views that pressed
 * play. Per view the tracker keeps seconds watched, the furthest point
 * reached, and seconds watched in each 5% of the video (`video_bins`), so
 * retention and re-watched stretches come from real playback.
 *
 * Words used on the page:
 *   - Visits: counted page views of the video's page.
 *   - Views: visits that started the video (YouTube's "views").
 *   - Watch time: seconds of video played.
 *   - Retention at x%: share of views that watched the 5% stretch at x.
 *
 * Lesson videos aren't tracked here (course pages don't run the tracker);
 * their numbers come from Mux Data.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { cached } from '$lib/server/cache/index.js';
import { isMissingColumn, isMissingTable } from './collect.js';

const TTL = 120;
const BINS = 20;
const SPARK_DAYS = 14;

const rowsOf = (r) => r?.rows ?? r ?? [];
const num = (v) => (v == null ? 0 : Number(v));
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const sinceDate = (days) => new Date(Date.now() - days * 864e5).toISOString();
const json = (v, fallback) => {
	if (v == null) return fallback;
	if (typeof v === 'string') {
		try {
			return JSON.parse(v);
		} catch {
			return fallback;
		}
	}
	return v;
};
const median = (values) => {
	const v = values.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b);
	if (!v.length) return null;
	const m = Math.floor(v.length / 2);
	return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

/** Cached, and `{ available: false }` before migrations 021/028. */
async function guarded(key, fn) {
	try {
		return { available: true, ...(await cached(key, fn, { ttl: TTL })) };
	} catch (err) {
		if (isMissingTable(err)) return { available: false };
		if (isMissingColumn(err)) return { available: false, needsMigration: true };
		throw err;
	}
}

/** SQL limiting views to an area's videos. */
function scopeSql(area) {
	if (area === 'gameplay') return sql`v.vod_id IS NOT NULL`;
	if (area === 'articles') return sql`v.entry_id IS NOT NULL AND v.video_plays > 0`;
	throw new Error(`No AGE analytics for area ${area}`);
}
const ownerKey = (v) => (v.vod_id ? `vod:${v.vod_id}` : `entry:${v.entry_id}`);

async function loadViews(where, since) {
	return rowsOf(
		await db.execute(sql`
			SELECT v.id, v.vod_id, v.entry_id, v.visitor_id, v.session_id, v.started_at, v.audience, v.gated,
				v.source, v.referrer_domain, v.from_path, v.device, v.country,
				v.video_seconds, v.video_duration, v.video_max_pct, v.video_bins, v.video_plays, v.video_completed
			FROM ca_view v
			WHERE ${where} AND v.qualified AND v.audience <> 'staff' AND v.started_at >= ${since}::timestamptz
			ORDER BY v.started_at`)
	);
}

/** Sign-ups and Premium joins in the same visit, after the video page opened. */
async function loadConversions(where, since) {
	return rowsOf(
		await db.execute(sql`
			SELECT DISTINCT ON (c.id) c.id, c.kind, v.vod_id, v.entry_id
			FROM ca_conversion c
			JOIN ca_view v ON v.session_id = c.session_id AND c.at >= v.started_at
			WHERE ${where} AND v.qualified AND v.audience <> 'staff'
				AND v.started_at >= ${since}::timestamptz AND c.session_id IS NOT NULL
				AND c.kind IN ('signup', 'premium')
			ORDER BY c.id, v.started_at DESC`)
	);
}

/** The headline numbers for a set of views. */
export function summarize(views) {
	const plays = views.filter((v) => num(v.video_plays) > 0);
	const watch = plays.reduce((s, v) => s + num(v.video_seconds), 0);
	return {
		visits: views.length,
		views: plays.length,
		viewers: new Set(plays.map((v) => v.visitor_id)).size,
		playRate: pct(plays.length, views.length),
		watchSeconds: watch,
		avgViewSeconds: plays.length ? Math.round(watch / plays.length) : null,
		avgPct: plays.length
			? Math.round(plays.reduce((s, v) => s + num(v.video_max_pct), 0) / plays.length)
			: null,
		completionRate: pct(plays.filter((v) => v.video_completed).length, plays.length),
		paywallVisits: views.filter((v) => v.gated).length
	};
}

/**
 * Audience retention from per-view seconds-per-5% bins: the share of views
 * that watched at least a quarter of each stretch (or 2 s on short videos).
 * Also the steepest drops and the stretches watched more than once.
 */
export function retentionOf(views) {
	const plays = views.filter((v) => num(v.video_plays) > 0);
	const duration = median(plays.map((v) => num(v.video_duration)).filter(Boolean)) || null;
	if (!plays.length || !duration) return { duration, curve: [], drops: [], rewatched: [] };
	const seg = duration / BINS;
	const need = Math.max(1, Math.min(seg * 0.25, 30));
	const watched = new Array(BINS).fill(0);
	const seconds = new Array(BINS).fill(0);
	for (const v of plays) {
		const arr = json(v.video_bins, []);
		for (let i = 0; i < BINS; i++) {
			const s = num(arr[i]);
			if (s >= need) watched[i]++;
			seconds[i] += s;
		}
	}
	const curve = watched.map((c, i) => ({
		at: i * 5,
		second: Math.round(i * seg),
		pct: pct(c, plays.length) ?? 0
	}));

	const drops = [];
	for (let i = 1; i < BINS; i++) {
		const lost = curve[i - 1].pct - curve[i].pct;
		if (lost >= 5) drops.push({ at: curve[i].at, second: curve[i].second, lost: Math.round(lost) });
	}
	drops.sort((a, b) => b.lost - a.lost);

	// Watched more than once: average seconds per watcher well over the
	// stretch's own length.
	const rewatched = [];
	for (let i = 0; i < BINS; i++) {
		if (watched[i] < Math.max(3, plays.length * 0.1)) continue;
		const per = seconds[i] / watched[i];
		const times = per / seg;
		if (times >= 1.3) {
			rewatched.push({
				at: i * 5,
				second: Math.round(i * seg),
				times: Math.round(times * 10) / 10
			});
		}
	}
	rewatched.sort((a, b) => b.times - a.times);
	return { duration, curve, drops: drops.slice(0, 3), rewatched: rewatched.slice(0, 3) };
}

function tally(views, fn, limit = 8) {
	const m = new Map();
	for (const v of views) {
		const k = fn(v);
		if (k == null || k === '') continue;
		m.set(k, (m.get(k) || 0) + 1);
	}
	return [...m]
		.map(([key, n]) => ({ key, n, pct: pct(n, views.length) }))
		.sort((a, b) => b.n - a.n)
		.slice(0, limit);
}

function dailyOf(views, days) {
	const by = new Map();
	for (const v of views) {
		if (!(num(v.video_plays) > 0)) continue;
		const d = new Date(v.started_at).toISOString().slice(0, 10);
		const x = by.get(d) || { n: 0, watch: 0 };
		x.n++;
		x.watch += num(v.video_seconds);
		by.set(d, x);
	}
	const out = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
		// `engaged` is what the shared chart reads as its second series
		out.push({ day: d, n: by.get(d)?.n ?? 0, engaged: by.get(d)?.watch ?? 0 });
	}
	return out;
}

/** Views per hour over the last 48 hours, oldest first. */
function realtimeOf(views) {
	const now = Date.now();
	const hours = new Array(48).fill(0);
	for (const v of views) {
		if (!(num(v.video_plays) > 0)) continue;
		const ago = Math.floor((now - new Date(v.started_at).getTime()) / 36e5);
		if (ago >= 0 && ago < 48) hours[47 - ago]++;
	}
	return {
		hours,
		last48: hours.reduce((a, b) => a + b, 0),
		lastHour: hours[47]
	};
}

function breakdowns(views) {
	const plays = views.filter((v) => num(v.video_plays) > 0);
	return {
		sources: tally(plays, (v) => v.source),
		referrers: tally(plays, (v) => v.referrer_domain),
		fromPages: tally(plays, (v) => v.from_path, 6),
		devices: tally(plays, (v) => v.device),
		countries: tally(plays, (v) => v.country, 10),
		audiences: tally(views, (v) => (v.gated ? 'paywall' : v.audience))
	};
}

function conversionsOf(rows) {
	return {
		signups: rows.filter((r) => r.kind === 'signup').length,
		premium: rows.filter((r) => r.kind === 'premium').length
	};
}

/** Area-wide figures; the range is in days (7, 30, 90). */
export function videoOverview(area, days) {
	return guarded(`ca:video:overview:v1:${area}:${days}`, async () => {
		const since = sinceDate(Math.max(days, 2));
		const where = scopeSql(area);
		const all = await loadViews(where, since);
		const cutoff = Date.now() - days * 864e5;
		const views = all.filter((v) => new Date(v.started_at).getTime() >= cutoff);
		const conv = await loadConversions(where, sinceDate(days));

		// per video
		const per = new Map();
		for (const v of views) {
			const k = ownerKey(v);
			if (!per.has(k)) per.set(k, []);
			per.get(k).push(v);
		}
		const convBy = new Map();
		for (const c of conv) {
			const k = c.vod_id ? `vod:${c.vod_id}` : `entry:${c.entry_id}`;
			convBy.set(k, (convBy.get(k) || 0) + 1);
		}
		const videos = [...per].map(([key, vs]) => ({
			key,
			...summarize(vs),
			conversions: convBy.get(key) || 0,
			spark: dailyOf(vs, SPARK_DAYS).map((d) => d.n)
		}));
		videos.sort((a, b) => b.views - a.views || b.watchSeconds - a.watchSeconds);

		return {
			area,
			days,
			totals: { ...summarize(views), ...conversionsOf(conv) },
			daily: dailyOf(views, days),
			realtime: realtimeOf(all),
			videos,
			...breakdowns(views)
		};
	});
}

/**
 * One video's report: totals against the area's typical video, retention
 * and key moments, daily and realtime views, where viewers came from, who
 * they are, and what they did next.
 * @param {'vod' | 'entry'} target
 */
export function videoDetail(target, id, days) {
	return guarded(`ca:video:detail:v1:${target}:${id}:${days}`, async () => {
		const area = target === 'vod' ? 'gameplay' : 'articles';
		const since = sinceDate(Math.max(days, 2));
		const where = target === 'vod' ? sql`v.vod_id = ${id}::uuid` : sql`v.entry_id = ${id}::uuid`;
		const all = await loadViews(where, since);
		const cutoff = Date.now() - days * 864e5;
		const views = all.filter((v) => new Date(v.started_at).getTime() >= cutoff);
		const totals = {
			...summarize(views),
			...conversionsOf(await loadConversions(where, sinceDate(days)))
		};

		// "Typical": the median video in the same area over the same range.
		const overview = await videoOverview(area, days);
		const others = (overview.videos || []).filter((x) => x.views >= 5);
		const typical = others.length
			? {
					views: median(others.map((x) => x.views)),
					avgViewSeconds: median(others.map((x) => x.avgViewSeconds)),
					avgPct: median(others.map((x) => x.avgPct)),
					completionRate: median(others.map((x) => x.completionRate)),
					playRate: median(others.map((x) => x.playRate)),
					videos: others.length
				}
			: null;

		const viewers = new Map();
		for (const v of views.filter((x) => num(x.video_plays) > 0)) {
			viewers.set(v.visitor_id, (viewers.get(v.visitor_id) || 0) + 1);
		}
		const cameBack = [...viewers.values()].filter((n) => n > 1).length;

		return {
			target,
			id,
			days,
			totals,
			typical,
			retention: retentionOf(views),
			daily: dailyOf(views, days),
			realtime: realtimeOf(all),
			returning: { viewers: viewers.size, cameBack, pct: pct(cameBack, viewers.size) },
			...breakdowns(views)
		};
	});
}
