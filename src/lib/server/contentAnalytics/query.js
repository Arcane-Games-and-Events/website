import { db } from '$lib/server/db/index.js';
import { deskEntry, user as userTable } from '$lib/server/db/schema.js';
import { eq, inArray, isNotNull, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { cached } from '$lib/server/cache/index.js';
import { loadTagsForEntries } from '$lib/server/desk/list.js';
import { isMissingTable } from './collect.js';

/**
 * Content analytics — reporting.
 *
 * A "view" is a qualified (visible 3s+), non-staff ca_view row. Every
 * function runs its queries one at a time (the dev pool is small and
 * Supabase's pooler stalls on bursts) and caches for 2 minutes. When the
 * tables don't exist yet (migration 021 not applied) they return
 * `{ available: false }` instead of throwing.
 */

export const RANGES = [7, 30, 90];
export function parseRange(v) {
	const n = Number(v);
	return RANGES.includes(n) ? n : 30;
}

const TTL = 120; // 2 minutes: fresh enough to see a test view land
const BINS = 20;
const ATTRIBUTION_DAYS = 7;
const MIN_VIEWS_FOR_INSIGHTS = 20;
const BOUNCE_SECONDS = 10;

const rowsOf = (r) => r?.rows ?? r ?? [];
/** A uuid[] literal built from bound parameters (drizzle expands bare arrays). */
const uuidArray = (ids) =>
	sql`ARRAY[${sql.join(
		ids.map((id) => sql`${id}`),
		sql`, `
	)}]::uuid[]`;
/** jsonb may come back parsed or as text depending on the driver setup. */
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
const num = (v) => (v == null ? 0 : Number(v));
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
// ISO string, cast in SQL: the driver (fetch_types: false) can't bind Date objects in raw SQL.
const sinceDate = (days) => new Date(Date.now() - days * 864e5).toISOString();

async function guarded(key, fn) {
	try {
		return { available: true, ...(await cached(key, fn, { ttl: TTL })) };
	} catch (err) {
		if (isMissingTable(err)) return { available: false };
		throw err;
	}
}

function median(values) {
	const v = values.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b);
	if (!v.length) return null;
	const m = Math.floor(v.length / 2);
	return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function dailySeries(rows, days, key = 'n') {
	const map = Object.fromEntries(rows.map((r) => [r.day, r]));
	const out = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
		out.push({ day: d, n: num(map[d]?.[key]), engaged: num(map[d]?.engaged) });
	}
	return out;
}

// ------------------------------------------------------------------ core SQL

/** Per-entry totals over counted views (optionally limited to some entries). */
async function perEntryTotals(since, entryIds = null) {
	const only = entryIds ? sql`AND v.entry_id = ANY(${uuidArray(entryIds)})` : sql``;
	const views = rowsOf(
		await db.execute(sql`
			SELECT v.entry_id,
				COUNT(*)::int AS views,
				COUNT(DISTINCT v.visitor_id)::int AS readers,
				SUM(v.engaged_seconds)::bigint AS engaged,
				PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY v.engaged_seconds) AS median_engaged,
				ROUND(AVG(v.max_depth))::int AS avg_depth,
				SUM(CASE WHEN v.completed THEN 1 ELSE 0 END)::int AS completions,
				SUM(CASE WHEN v.engaged_seconds < ${BOUNCE_SECONDS} THEN 1 ELSE 0 END)::int AS bounces,
				SUM(CASE WHEN v.gated THEN 1 ELSE 0 END)::int AS gated,
				SUM(CASE WHEN v.video_plays > 0 THEN 1 ELSE 0 END)::int AS video_starts,
				SUM(v.video_seconds)::bigint AS video_seconds,
				SUM(CASE WHEN v.video_completed THEN 1 ELSE 0 END)::int AS video_completions,
				SUM(CASE WHEN v.device = 'mobile' THEN 1 ELSE 0 END)::int AS mobile_views,
				SUM(CASE WHEN v.device = 'mobile' AND v.completed THEN 1 ELSE 0 END)::int AS mobile_completions
			FROM ca_view v
			WHERE v.qualified AND v.audience <> 'staff' AND v.started_at >= ${since}::timestamptz ${only}
			GROUP BY v.entry_id`)
	);
	const events = rowsOf(
		await db.execute(sql`
			SELECT e.entry_id, e.type, COUNT(*)::int AS n
			FROM ca_event e JOIN ca_view v ON v.id = e.view_id
			WHERE v.qualified AND v.audience <> 'staff' AND e.at >= ${since}::timestamptz ${only}
			GROUP BY e.entry_id, e.type`)
	);
	const conversions = await attributedConversions(since, entryIds);

	const out = new Map();
	for (const r of views) {
		out.set(r.entry_id, {
			views: num(r.views),
			readers: num(r.readers),
			engaged: num(r.engaged),
			medianEngaged: r.median_engaged == null ? null : Math.round(Number(r.median_engaged)),
			avgDepth: num(r.avg_depth),
			completions: num(r.completions),
			bounces: num(r.bounces),
			gated: num(r.gated),
			videoStarts: num(r.video_starts),
			videoSeconds: num(r.video_seconds),
			videoCompletions: num(r.video_completions),
			mobileViews: num(r.mobile_views),
			mobileCompletions: num(r.mobile_completions),
			events: {},
			signups: 0,
			upgrades: 0,
			lastTouchSignups: 0,
			lastTouchUpgrades: 0
		});
	}
	for (const e of events) {
		const t = out.get(e.entry_id);
		if (t) t.events[e.type] = num(e.n);
	}
	for (const c of conversions) {
		const t = out.get(c.entry_id);
		if (!t) continue;
		if (c.kind === 'signup') {
			t.signups += num(c.assisted);
			t.lastTouchSignups += num(c.last_touch);
		} else {
			t.upgrades += num(c.assisted);
			t.lastTouchUpgrades += num(c.last_touch);
		}
	}
	for (const t of out.values()) derive(t);
	return out;
}

/** Rates that every view of the data uses. */
function derive(t) {
	t.completionRate = pct(t.completions, t.views);
	t.bounceRate = pct(t.bounces, t.views);
	t.avgEngaged = t.views ? Math.round(t.engaged / t.views) : null;
	t.attentionMinutes = Math.round(t.engaged / 60);
	t.shares = t.events.share || 0;
	t.shareRate = t.views ? Math.round((t.shares / t.views) * 1000) / 10 : null; // per 100 views
	t.ctaViews = t.events.cta_view || 0;
	t.ctaClicks = t.events.cta_click || 0;
	t.ctaRate = pct(t.ctaClicks, t.ctaViews);
	t.videoCompletionRate = pct(t.videoCompletions, t.videoStarts);
	t.mobileCompletionRate = pct(t.mobileCompletions, t.mobileViews);
	t.desktopCompletionRate = pct(t.completions - t.mobileCompletions, t.views - t.mobileViews);
	t.conversions = t.signups + t.upgrades;
	return t;
}

/**
 * Credit each sign-up / upgrade to the pieces the reader viewed in the
 * 7 days before it ("assisted"), and the last one they viewed ("last touch").
 */
async function attributedConversions(since, entryIds = null) {
	const only = entryIds ? sql`AND t.entry_id = ANY(${uuidArray(entryIds)})` : sql``;
	return rowsOf(
		await db.execute(sql`
			WITH touches AS (
				SELECT c.id AS conv_id, c.kind, v.entry_id,
					ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY v.started_at DESC) AS rn
				FROM ca_conversion c
				JOIN ca_view v ON (
					(c.visitor_id IS NOT NULL AND v.visitor_id = c.visitor_id)
					OR (c.user_id IS NOT NULL AND v.user_id = c.user_id)
				)
				WHERE c.at >= ${since}::timestamptz
					AND v.qualified AND v.audience <> 'staff'
					AND v.started_at <= c.at
					AND v.started_at >= c.at - ${sql.raw(`interval '${ATTRIBUTION_DAYS} days'`)}
			)
			SELECT t.entry_id, t.kind,
				COUNT(DISTINCT t.conv_id)::int AS assisted,
				SUM(CASE WHEN t.rn = 1 THEN 1 ELSE 0 END)::int AS last_touch
			FROM touches t
			WHERE true ${only}
			GROUP BY t.entry_id, t.kind`)
	);
}

async function entryMeta(entryIds = null, authorId = null) {
	const conds = [];
	if (entryIds) conds.push(inArray(deskEntry.id, entryIds));
	if (authorId) conds.push(eq(deskEntry.authorId, authorId));
	const rows = await db
		.select({
			id: deskEntry.id,
			title: deskEntry.title,
			slug: deskEntry.slug,
			status: deskEntry.status,
			accessMode: deskEntry.accessMode,
			readTime: deskEntry.readTime,
			videoProvider: deskEntry.videoProvider,
			publishedAt: deskEntry.publishedAt,
			authorId: deskEntry.authorId,
			authorFirst: userTable.firstName,
			authorLast: userTable.lastName
		})
		.from(deskEntry)
		.leftJoin(userTable, eq(deskEntry.authorId, userTable.id))
		.where(conds.length ? and(...conds) : isNotNull(deskEntry.id));
	return rows.map((r) => ({
		...r,
		author: r.authorFirst ? `${r.authorFirst} ${r.authorLast || ''}`.trim() : null,
		kind: r.videoProvider ? (r.readTime ? 'Article + video' : 'Video') : 'Article',
		length:
			r.videoProvider && !r.readTime
				? 'Video only'
				: !r.readTime
					? 'Unknown'
					: r.readTime < 5
						? 'Short (under 5 min)'
						: r.readTime <= 10
							? 'Medium (5–10 min)'
							: 'Long (10+ min)'
	}));
}

/** Site-wide medians across pieces with enough views — the yardstick for insights. */
function yardstick(totals) {
	const enough = [...totals.values()].filter((t) => t.views >= MIN_VIEWS_FOR_INSIGHTS);
	const pick = (k) => median(enough.map((t) => t[k]));
	return {
		pieces: enough.length,
		avgEngaged: pick('avgEngaged'),
		completionRate: pick('completionRate'),
		bounceRate: pick('bounceRate'),
		avgDepth: pick('avgDepth'),
		shareRate: pick('shareRate'),
		ctaRate: pick('ctaRate'),
		views: pick('views')
	};
}

// ------------------------------------------------------------------ insights

const fmtDur = (s) => {
	if (s == null) return '—';
	const m = Math.floor(s / 60);
	const r = Math.round(s % 60);
	return m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
};
const ratio = (a, b) => (a != null && b ? a / b : null);

/**
 * Plain-language reasons a piece is (or isn't) working, compared with the
 * site median. Each item: { tone: 'good' | 'bad' | 'note', text }.
 */
export function explain(t, y, extra = {}) {
	const out = [];
	if (!t || t.views < MIN_VIEWS_FOR_INSIGHTS) {
		return [
			{
				tone: 'note',
				text: `Not enough views yet for fair comparisons (${t?.views || 0} of ${MIN_VIEWS_FOR_INSIGHTS}).`
			}
		];
	}
	const r = ratio(t.avgEngaged, y.avgEngaged);
	if (r && r >= 1.3)
		out.push({
			tone: 'good',
			text: `Holds attention: ${fmtDur(t.avgEngaged)} engaged per view, ${r.toFixed(1)}× the typical piece (${fmtDur(y.avgEngaged)}).`
		});
	else if (r && r <= 0.7)
		out.push({
			tone: 'bad',
			text: `Readers move on quickly: ${fmtDur(t.avgEngaged)} engaged per view vs ${fmtDur(y.avgEngaged)} typical.`
		});

	if (t.completionRate != null && y.completionRate != null) {
		const d = t.completionRate - y.completionRate;
		if (d >= 10)
			out.push({
				tone: 'good',
				text: `${t.completionRate}% finish it, ${Math.round(d)} points above the typical ${y.completionRate}%.`
			});
		else if (d <= -10)
			out.push({
				tone: 'bad',
				text: `Only ${t.completionRate}% finish it, ${Math.round(-d)} points below the typical ${y.completionRate}%.`
			});
	}
	if (t.bounceRate != null && y.bounceRate != null && t.bounceRate - y.bounceRate >= 10)
		out.push({
			tone: 'bad',
			text: `${t.bounceRate}% leave within ${BOUNCE_SECONDS} seconds (typical ${y.bounceRate}%). The opening or headline may not match what readers expected.`
		});
	if (
		t.shareRate != null &&
		y.shareRate != null &&
		t.shares >= 3 &&
		t.shareRate >= Math.max(0.5, y.shareRate * 2)
	)
		out.push({
			tone: 'good',
			text: `Gets shared: ${t.shares} shares, ${t.shareRate} per 100 views (typical ${y.shareRate ?? 0}).`
		});
	if (t.conversions > 0)
		out.push({
			tone: 'good',
			text: `Helped convert readers: ${[t.signups ? `${t.signups} sign-up${t.signups === 1 ? '' : 's'}` : null, t.upgrades ? `${t.upgrades} Premium upgrade${t.upgrades === 1 ? '' : 's'}` : null].filter(Boolean).join(' and ')} within ${ATTRIBUTION_DAYS} days of reading.`
		});
	if (t.ctaViews >= 10 && t.ctaRate != null && y.ctaRate != null) {
		if (t.ctaRate >= y.ctaRate * 1.5 && t.ctaRate > 0)
			out.push({
				tone: 'good',
				text: `The Premium prompt works here: ${t.ctaRate}% of readers who see it click (typical ${y.ctaRate}%).`
			});
	}
	if (
		t.mobileViews >= 10 &&
		t.views - t.mobileViews >= 10 &&
		t.mobileCompletionRate != null &&
		t.desktopCompletionRate != null &&
		t.desktopCompletionRate - t.mobileCompletionRate >= 15
	)
		out.push({
			tone: 'bad',
			text: `Mobile readers finish ${Math.round(t.desktopCompletionRate - t.mobileCompletionRate)} points less often than desktop (${t.mobileCompletionRate}% vs ${t.desktopCompletionRate}%). Check how it reads on a phone.`
		});
	if (extra.topSource && extra.topSource.share >= 40)
		out.push({
			tone: 'note',
			text: `${extra.topSource.share}% of views came from ${extra.topSource.label}.`
		});
	if (extra.biggestDrop && extra.biggestDrop.lost >= 15)
		out.push({
			tone: 'bad',
			text: `The biggest drop-off is around ${extra.biggestDrop.at}% of the way through${extra.biggestDrop.section ? `, in “${extra.biggestDrop.section}”` : ''}: ${extra.biggestDrop.lost}% of readers stop there.`
		});
	if (!out.length)
		out.push({ tone: 'note', text: 'Performing close to the typical piece on every measure.' });
	return out;
}

// ------------------------------------------------------------------ overview

export function siteOverview(days) {
	return guarded(`ca:overview:v1:${days}`, async () => {
		const since = sinceDate(days);
		const totals = await perEntryTotals(since);
		const meta = await entryMeta();
		const tags = await loadTagsForEntries(meta.map((m) => m.id));

		const dailyRows = rowsOf(
			await db.execute(sql`
				SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day,
					COUNT(*)::int AS n, SUM(engaged_seconds)::bigint AS engaged
				FROM ca_view WHERE qualified AND audience <> 'staff' AND started_at >= ${since}::timestamptz
				GROUP BY 1`)
		);
		const breakdown = async (col) =>
			rowsOf(
				await db.execute(sql`
					SELECT COALESCE(${sql.raw(col)}, 'unknown') AS key, COUNT(*)::int AS n,
						SUM(CASE WHEN completed THEN 1 ELSE 0 END)::int AS completions,
						SUM(engaged_seconds)::bigint AS engaged
					FROM ca_view WHERE qualified AND audience <> 'staff' AND started_at >= ${since}::timestamptz
					GROUP BY 1 ORDER BY 2 DESC LIMIT 10`)
			).map((r) => ({
				key: r.key,
				n: num(r.n),
				completionRate: pct(num(r.completions), num(r.n)),
				avgEngaged: num(r.n) ? Math.round(num(r.engaged) / num(r.n)) : null
			}));
		const sources = await breakdown('source');
		const referrers = await breakdown('referrer_domain');
		const devices = await breakdown('device');
		const audiences = await breakdown('audience');
		const countries = await breakdown('country');
		const [conv] = rowsOf(
			await db.execute(sql`
				SELECT SUM(CASE WHEN kind = 'signup' THEN 1 ELSE 0 END)::int AS signups,
					SUM(CASE WHEN kind = 'premium' THEN 1 ELSE 0 END)::int AS upgrades
				FROM ca_conversion WHERE at >= ${since}::timestamptz`)
		);
		const [uniq] = rowsOf(
			await db.execute(sql`
				SELECT COUNT(DISTINCT visitor_id)::int AS readers
				FROM ca_view WHERE qualified AND audience <> 'staff' AND started_at >= ${since}::timestamptz`)
		);

		const y = yardstick(totals);
		const all = [...totals.values()];
		const sum = (k) => all.reduce((s, t) => s + (t[k] || 0), 0);
		const site = derive({
			views: sum('views'),
			readers: num(uniq?.readers),
			engaged: sum('engaged'),
			completions: sum('completions'),
			bounces: sum('bounces'),
			gated: sum('gated'),
			videoStarts: sum('videoStarts'),
			videoSeconds: sum('videoSeconds'),
			videoCompletions: sum('videoCompletions'),
			mobileViews: sum('mobileViews'),
			mobileCompletions: sum('mobileCompletions'),
			avgDepth: null,
			events: all.reduce((acc, t) => {
				for (const [k, v] of Object.entries(t.events)) acc[k] = (acc[k] || 0) + v;
				return acc;
			}, {}),
			signups: num(conv?.signups),
			upgrades: num(conv?.upgrades)
		});

		const pieces = meta
			.filter((m) => totals.has(m.id))
			.map((m) => {
				const t = totals.get(m.id);
				return {
					...m,
					tags: tags.get(m.id) || [],
					...t,
					insights: explain(t, y).slice(0, 3)
				};
			})
			.sort((a, b) => b.engaged - a.engaged);

		// "What works": compare groups of pieces on per-view attention and completion
		const groupBy = (keyFn) => {
			const g = new Map();
			for (const p of pieces) {
				for (const k of [keyFn(p)].flat().filter(Boolean)) {
					const x = g.get(k) || {
						key: k,
						pieces: 0,
						views: 0,
						engaged: 0,
						completions: 0,
						conversions: 0
					};
					x.pieces++;
					x.views += p.views;
					x.engaged += p.engaged;
					x.completions += p.completions;
					x.conversions += p.conversions;
					g.set(k, x);
				}
			}
			return [...g.values()]
				.map((x) => ({
					...x,
					avgEngaged: x.views ? Math.round(x.engaged / x.views) : null,
					completionRate: pct(x.completions, x.views),
					viewsPerPiece: x.pieces ? Math.round(x.views / x.pieces) : 0
				}))
				.sort((a, b) => b.views - a.views);
		};

		return {
			days,
			site,
			yardstick: y,
			daily: dailySeries(dailyRows, days),
			pieces,
			whatWorks: {
				format: groupBy((p) => p.kind),
				length: groupBy((p) => p.length),
				access: groupBy((p) => (p.accessMode === 'premium' ? 'Premium' : 'Free')),
				tag: groupBy((p) => p.tags.map((t) => t.name)).slice(0, 10),
				author: groupBy((p) => p.author || 'Unknown')
			},
			sources,
			referrers: referrers.filter((r) => r.key !== 'unknown'),
			devices,
			audiences,
			countries
		};
	});
}

// ------------------------------------------------------------------ one piece

export function entryDetail(entryId, days) {
	return guarded(`ca:entry:v1:${entryId}:${days}`, async () => {
		const since = sinceDate(days);
		const [meta] = await entryMeta([entryId]);
		if (!meta) return { meta: null };

		const totals = (await perEntryTotals(since, [entryId])).get(entryId) || null;
		// the yardstick needs every piece's totals; cached separately
		const y = await cached(
			`ca:yardstick:v1:${days}`,
			async () => yardstick(await perEntryTotals(since)),
			{ ttl: TTL }
		);

		const views = rowsOf(
			await db.execute(sql`
				SELECT visitor_id, started_at, engaged_seconds, max_depth, depth_seconds, sections, completed,
					source, referrer_domain, from_path, device, audience, gated, country,
					video_seconds, video_duration, video_max_pct, video_bins, video_plays, video_completed,
					exit_type, exit_target
				FROM ca_view
				WHERE entry_id = ${entryId} AND qualified AND audience <> 'staff' AND started_at >= ${since}::timestamptz
				ORDER BY started_at`)
		);
		const events = rowsOf(
			await db.execute(sql`
				SELECT e.type, e.label, e.depth
				FROM ca_event e JOIN ca_view v ON v.id = e.view_id
				WHERE e.entry_id = ${entryId} AND v.qualified AND v.audience <> 'staff' AND e.at >= ${since}::timestamptz`)
		);

		const n = views.length;
		const count = (fn) => views.filter(fn).length;

		// --- reach: % of views that got at least this far through the body
		const reach = Array.from({ length: BINS + 1 }, (_, i) => {
			const at = i * 5;
			return {
				at,
				pct: pct(
					count((v) => num(v.max_depth) >= at),
					n
				)
			};
		});
		const steps = [25, 50, 75, 90];
		const funnel = [
			{ label: 'Opened', n, pct: n ? 100 : null },
			...steps.map((s) => {
				const c = count((v) => num(v.max_depth) >= s);
				return { label: `${s}% through`, n: c, pct: pct(c, n) };
			}),
			{
				label: 'Finished',
				n: count((v) => v.completed),
				pct: pct(
					count((v) => v.completed),
					n
				)
			}
		];

		// --- attention: average engaged seconds spent at each 5% of the body
		const heat = new Array(BINS).fill(0);
		for (const v of views) {
			const arr = json(v.depth_seconds, []);
			for (let i = 0; i < BINS; i++) heat[i] += num(arr[i]);
		}
		const attention = heat.map((s, i) => ({
			from: i * 5,
			to: i * 5 + 5,
			avgSeconds: n ? Math.round((s / n) * 10) / 10 : 0
		}));

		// --- sections
		const sec = new Map();
		for (const v of views) {
			const obj = json(v.sections, {}) || {};
			for (const [key, val] of Object.entries(obj)) {
				const s = sec.get(key) || {
					key,
					title: val.t || key,
					order: num(val.i),
					seconds: 0,
					readers: 0
				};
				s.seconds += num(val.s);
				s.readers += 1;
				s.title = val.t || s.title;
				sec.set(key, s);
			}
		}
		const sections = [...sec.values()]
			.sort((a, b) => a.order - b.order)
			.map((s) => ({
				...s,
				reachPct: pct(s.readers, n),
				avgSeconds: s.readers ? Math.round(s.seconds / s.readers) : 0
			}));

		// biggest single 5% drop in reach, and the section it falls in
		let biggestDrop = null;
		for (let i = 1; i < reach.length - 1; i++) {
			const lost = (reach[i - 1].pct ?? 0) - (reach[i].pct ?? 0);
			if (!biggestDrop || lost > biggestDrop.lost)
				biggestDrop = { at: reach[i].at, lost: Math.round(lost) };
		}

		// --- how they read
		const style = [
			{ key: 'Bounced', n: count((v) => num(v.engaged_seconds) < BOUNCE_SECONDS) },
			{
				key: 'Skimmed',
				n: count(
					(v) => num(v.engaged_seconds) >= BOUNCE_SECONDS && num(v.max_depth) < 50 && !v.completed
				)
			},
			{
				key: 'Read part',
				n: count(
					(v) => num(v.engaged_seconds) >= BOUNCE_SECONDS && num(v.max_depth) >= 50 && !v.completed
				)
			},
			{ key: 'Finished', n: count((v) => v.completed) }
		].map((x) => ({ ...x, pct: pct(x.n, n) }));

		// --- video
		const vv = views.filter((v) => num(v.video_plays) > 0);
		const vbins = new Array(BINS).fill(0);
		for (const v of vv) {
			const arr = json(v.video_bins, []);
			for (let i = 0; i < BINS; i++) if (num(arr[i]) > 0) vbins[i]++;
		}
		const video = vv.length
			? {
					starts: vv.length,
					startRate: pct(vv.length, n),
					avgWatched: Math.round(vv.reduce((s, v) => s + num(v.video_seconds), 0) / vv.length),
					avgPct: Math.round(vv.reduce((s, v) => s + num(v.video_max_pct), 0) / vv.length),
					completionRate: pct(vv.filter((v) => v.video_completed).length, vv.length),
					duration: Math.max(0, ...vv.map((v) => num(v.video_duration))) || null,
					retention: vbins.map((c, i) => ({ at: i * 5, pct: pct(c, vv.length) }))
				}
			: null;

		// --- where from / who / where next
		const tally = (fn, limit = 8) => {
			const m = new Map();
			for (const v of views) {
				const k = fn(v);
				if (k == null || k === '') continue;
				m.set(k, (m.get(k) || 0) + 1);
			}
			return [...m]
				.map(([key, c]) => ({ key, n: c, pct: pct(c, n) }))
				.sort((a, b) => b.n - a.n)
				.slice(0, limit);
		};
		const sources = tally((v) => v.source);
		const SOURCE_LABEL = {
			internal: 'elsewhere on the site',
			search: 'search engines',
			social: 'social media',
			community: 'community sites',
			email: 'email',
			referral: 'other websites',
			direct: 'direct visits'
		};
		const topSource = sources[0]
			? {
					share: Math.round(sources[0].pct ?? 0),
					label: SOURCE_LABEL[sources[0].key] || sources[0].key
				}
			: null;
		const dropSection =
			biggestDrop &&
			[...sections]
				.filter((s) => s.order > 0)
				.reduce((best, s) => {
					// the section whose reach is closest to the drop point
					const d = Math.abs(
						(s.reachPct ?? 0) - (reach.find((r) => r.at === biggestDrop.at)?.pct ?? 0)
					);
					return !best || d < best.d ? { d, title: s.title } : best;
				}, null)?.title;

		const evCount = (type) => events.filter((e) => e.type === type).length;
		const evTop = (type, limit = 8) => {
			const m = new Map();
			for (const e of events.filter((x) => x.type === type))
				m.set(e.label || '—', (m.get(e.label || '—') || 0) + 1);
			return [...m]
				.map(([key, c]) => ({ key, n: c }))
				.sort((a, b) => b.n - a.n)
				.slice(0, limit);
		};
		const avgEventDepth = (type) => {
			const d = events.filter((e) => e.type === type && e.depth != null).map((e) => num(e.depth));
			return d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : null;
		};

		const dailyMap = new Map();
		for (const v of views) {
			const d = new Date(v.started_at).toISOString().slice(0, 10);
			const x = dailyMap.get(d) || { day: d, n: 0, engaged: 0 };
			x.n++;
			x.engaged += num(v.engaged_seconds);
			dailyMap.set(d, x);
		}

		return {
			meta,
			days,
			totals,
			yardstick: y,
			insights: explain(totals, y, {
				topSource,
				biggestDrop: biggestDrop ? { ...biggestDrop, section: dropSection } : null
			}),
			daily: dailySeries([...dailyMap.values()], days),
			returning: (() => {
				const per = new Map();
				for (const v of views) per.set(v.visitor_id, (per.get(v.visitor_id) || 0) + 1);
				const back = [...per.values()].filter((c) => c > 1).length;
				return { readers: per.size, cameBack: back, pct: pct(back, per.size) };
			})(),
			funnel,
			reach,
			attention,
			sections,
			style,
			video,
			sources,
			referrers: tally((v) => v.referrer_domain),
			fromPages: tally((v) => v.from_path, 6),
			devices: tally((v) => v.device),
			audiences: tally((v) => (v.gated ? `${v.audience} (paywall)` : v.audience)),
			countries: tally((v) => v.country),
			exits: tally((v) => v.exit_type || 'unknown'),
			nextPages: tally((v) => (v.exit_type === 'internal' ? v.exit_target : null), 6),
			outbound: evTop('link_out'),
			interactions: {
				shares: evTop('share'),
				shareCount: evCount('share'),
				shareDepth: avgEventDepth('share'),
				ctaViews: evCount('cta_view'),
				ctaClicks: evCount('cta_click'),
				cards: evTop('card_hover', 10),
				toc: evTop('toc_click', 8),
				copies: evCount('copy'),
				internalLinks: evTop('link_in', 6)
			}
		};
	});
}

// ------------------------------------------------------------------ writer + desk

/** One writer's pieces — what a writer sees about their own work. */
export function authorStats(authorId, days) {
	return guarded(`ca:author:v1:${authorId}:${days}`, async () => {
		const since = sinceDate(days);
		const meta = (await entryMeta(null, authorId)).filter((m) => m.publishedAt);
		const ids = meta.map((m) => m.id);
		const totals = ids.length ? await perEntryTotals(since, ids) : new Map();
		const dailyRows = ids.length
			? rowsOf(
					await db.execute(sql`
						SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day,
							COUNT(*)::int AS n, SUM(engaged_seconds)::bigint AS engaged
						FROM ca_view
						WHERE entry_id = ANY(${uuidArray(ids)}) AND qualified AND audience <> 'staff' AND started_at >= ${since}::timestamptz
						GROUP BY 1`)
				)
			: [];
		const [uniq] = ids.length
			? rowsOf(
					await db.execute(sql`
						SELECT COUNT(DISTINCT visitor_id)::int AS readers FROM ca_view
						WHERE entry_id = ANY(${uuidArray(ids)}) AND qualified AND audience <> 'staff' AND started_at >= ${since}::timestamptz`)
				)
			: [];
		const rows = meta
			.map((m) => ({ ...m, ...(totals.get(m.id) || derive(emptyTotals())) }))
			.sort((a, b) => b.engaged - a.engaged || b.views - a.views);
		const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
		return {
			days,
			published: meta.length,
			totals: {
				views: sum('views'),
				readers: num(uniq?.readers),
				engaged: sum('engaged'),
				avgEngaged: sum('views') ? Math.round(sum('engaged') / sum('views')) : null,
				completionRate: pct(sum('completions'), sum('views')),
				conversions: sum('conversions')
			},
			daily: dailySeries(dailyRows, days),
			rows
		};
	});
}

function emptyTotals() {
	return {
		views: 0,
		readers: 0,
		engaged: 0,
		medianEngaged: null,
		avgDepth: 0,
		completions: 0,
		bounces: 0,
		gated: 0,
		videoStarts: 0,
		videoSeconds: 0,
		videoCompletions: 0,
		mobileViews: 0,
		mobileCompletions: 0,
		events: {},
		signups: 0,
		upgrades: 0,
		lastTouchSignups: 0,
		lastTouchUpgrades: 0
	};
}

/** The desk's small reader panel: views over 30 days, 14-day trend, top 5. */
export function deskReads(entryIds, scopeKey) {
	return guarded(`ca:desk:v1:${scopeKey}`, async () => {
		const empty = { total: 0, daily: [], top: [] };
		if (entryIds && !entryIds.length) return empty;
		const since = sinceDate(30);
		const totals = await perEntryTotals(since, entryIds);
		const only = entryIds ? sql`AND entry_id = ANY(${uuidArray(entryIds)})` : sql``;
		const dailyRows = rowsOf(
			await db.execute(sql`
				SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
				FROM ca_view
				WHERE qualified AND audience <> 'staff' AND started_at >= ${sinceDate(14)}::timestamptz ${only}
				GROUP BY 1`)
		);
		const meta = totals.size ? await entryMeta([...totals.keys()]) : [];
		const byId = Object.fromEntries(meta.map((m) => [m.id, m]));
		return {
			total: [...totals.values()].reduce((s, t) => s + t.views, 0),
			daily: dailySeries(dailyRows, 14),
			top: [...totals]
				.filter(([id]) => byId[id])
				.sort((a, b) => b[1].views - a[1].views)
				.slice(0, 5)
				.map(([id, t]) => ({
					id,
					slug: byId[id].slug,
					title: byId[id].title,
					views: t.views,
					finishRate: t.completionRate == null ? null : Math.round(t.completionRate)
				}))
		};
	});
}
