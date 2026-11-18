/**
 * The status page (migration 047): a check of each part of the site every
 * five minutes (/api/cron/status), the uptime bars and current state the
 * public /status page shows, and incidents and maintenance windows that
 * admins post from /admin/status. While one is on, the site shows a banner.
 *
 * A part that isn't set up where the check runs (no Redis, no Mux or
 * Authorize.net keys, and the billing job anywhere but production) is
 * skipped rather than reported down, so a local machine doesn't fill the
 * history with false alarms.
 */
import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { billingRun, statusCheck, statusIncident, statusUpdate } from '$lib/server/db/schema.js';
import { bump, cached, redis } from '$lib/server/cache/index.js';
import { authnet } from '$lib/server/authnet/client.js';
import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';

export const COMPONENTS = [
	{ id: 'website', label: 'Website', note: 'Pages, sign-in and checkout' },
	{ id: 'database', label: 'Database', note: 'Accounts, articles, events and orders' },
	{ id: 'cache', label: 'Speed layer', note: 'Keeps pages fast' },
	{ id: 'video', label: 'Video', note: 'Matches, lessons and the Library’s videos' },
	{ id: 'payments', label: 'Payments', note: 'Tickets, memberships and guides' },
	{ id: 'billing', label: 'Renewals', note: 'The hourly membership billing run' }
];
export const COMPONENT_IDS = COMPONENTS.map((c) => c.id);

export const INCIDENT_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved'];
export const MAINTENANCE_STATUSES = ['scheduled', 'in_progress', 'completed'];
const DONE = ['resolved', 'completed'];

const ZONE = 'America/Los_Angeles';
const DAY = 86400000;
const KEEP_DAYS = 90;
const STALE_MS = 30 * 60000;
const rows = (r) => (Array.isArray(r) ? r : r?.rows || []);

// ---------------------------------------------------------------- the checks

/** Time one check; it fails if it throws or takes over `timeout` ms. */
async function timed(fn, timeout = 8000) {
	const started = Date.now();
	let timer;
	try {
		const out = await Promise.race([
			fn(),
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error(`No answer in ${timeout / 1000}s`)), timeout);
			})
		]);
		if (out === SKIP) return SKIP;
		return { ok: true, ms: Date.now() - started, note: typeof out === 'string' ? out : null };
	} catch (err) {
		return { ok: false, ms: Date.now() - started, note: String(err?.message || err).slice(0, 300) };
	} finally {
		clearTimeout(timer);
	}
}
const SKIP = Symbol('skip');

/** The real checks. Tests pass their own. */
export const CHECKS = {
	// The check ran on the server, so the site answered.
	website: async () => 'Answering',
	database: async () => {
		await db.execute(sql`select 1`);
	},
	cache: async () => {
		const client = redis();
		if (!client) return SKIP;
		await client.ping();
	},
	video: async () => {
		const { env } = await import('$env/dynamic/private');
		if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) return SKIP;
		const res = await fetch('https://api.mux.com/video/v1/assets?limit=1', {
			headers: {
				authorization: `Basic ${Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString('base64')}`
			}
		});
		if (!res.ok) throw new Error(`Mux answered ${res.status}`);
	},
	payments: async () => {
		if (!authnet.configured) return SKIP;
		await authnet.ping();
	},
	// The hourly billing job finished in the last two hours without errors.
	// Only in production: the job runs on Vercel's scheduler, which nothing
	// runs locally or on previews, so there it would always look down.
	billing: async () => {
		const { env } = await import('$env/dynamic/private');
		if (env.VERCEL_ENV !== 'production') return SKIP;
		const [last] = await db
			.select({ finishedAt: billingRun.finishedAt, error: billingRun.error })
			.from(billingRun)
			.orderBy(desc(billingRun.startedAt))
			.limit(1);
		if (!last) return SKIP;
		if (!last.finishedAt || Date.now() - last.finishedAt.getTime() > 2 * 3600000)
			throw new Error('The billing run hasn’t finished in two hours');
		if (last.error) throw new Error(`Last run: ${last.error}`.slice(0, 300));
		return 'Ran on time';
	}
};

/**
 * Run every check and record the results; old checks past 90 days are
 * cleared. Returns { component: { ok, ms, note } | 'skipped' }.
 */
export async function runChecks({ checks = CHECKS, now = new Date() } = {}) {
	const results = {};
	await Promise.all(
		COMPONENT_IDS.map(async (id) => {
			results[id] = checks[id] ? await timed(checks[id]) : SKIP;
		})
	);
	const recorded = COMPONENT_IDS.filter((id) => results[id] !== SKIP).map((id) => ({
		component: id,
		ok: results[id].ok,
		ms: results[id].ms,
		note: results[id].note,
		at: now
	}));
	if (recorded.length) await db.insert(statusCheck).values(recorded);
	await db.delete(statusCheck).where(lt(statusCheck.at, new Date(now.getTime() - KEEP_DAYS * DAY)));
	await bump('status');
	return Object.fromEntries(
		COMPONENT_IDS.map((id) => [id, results[id] === SKIP ? 'skipped' : results[id]])
	);
}

// ---------------------------------------------------------------- reading

const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(d);

/**
 * Each part of the site: whether its last check passed, uptime over the
 * last 90 days, and a bar per day (Pacific) with how many checks passed.
 */
export async function componentHistory({ days = KEEP_DAYS, now = new Date() } = {}) {
	const since = new Date(now.getTime() - days * DAY);
	const [daily, latest] = await Promise.all([
		db.execute(sql`
			select component, to_char(at at time zone ${ZONE}, 'YYYY-MM-DD') as day,
				count(*)::int as total, count(*) filter (where ok)::int as ok
			from status_check where at >= ${since.toISOString()}::timestamptz
			group by 1, 2
		`),
		db.execute(sql`
			select distinct on (component) component, ok, ms, note, at
			from status_check order by component, at desc
		`)
	]);
	const byKey = new Map(rows(daily).map((r) => [`${r.component}|${r.day}`, r]));
	const last = new Map(rows(latest).map((r) => [r.component, r]));
	const dayList = Array.from({ length: days }, (_, i) =>
		dayKey(new Date(now.getTime() - (days - 1 - i) * DAY))
	);
	return COMPONENTS.map((c) => {
		const bars = dayList.map((day) => {
			const r = byKey.get(`${c.id}|${day}`);
			return { day, total: r?.total || 0, ok: r?.ok || 0 };
		});
		const total = bars.reduce((s, b) => s + b.total, 0);
		const ok = bars.reduce((s, b) => s + b.ok, 0);
		const l = last.get(c.id);
		return {
			...c,
			bars,
			uptime: total ? ok / total : null,
			// A last check older than half an hour isn't the current state
			// (the job stopped, or this part isn't checked here any more).
			current:
				l && now.getTime() - new Date(l.at).getTime() < STALE_MS
					? { ok: l.ok, ms: l.ms, note: l.note, at: new Date(l.at) }
					: null,
			lastAt: l ? new Date(l.at) : null
		};
	});
}

const withUpdates = async (incidents) => {
	if (!incidents.length) return [];
	const updates = await db
		.select()
		.from(statusUpdate)
		.where(
			inArray(
				statusUpdate.incidentId,
				incidents.map((i) => i.id)
			)
		)
		.orderBy(desc(statusUpdate.createdAt));
	return incidents.map((i) => ({ ...i, updates: updates.filter((u) => u.incidentId === i.id) }));
};

/**
 * Incidents and maintenance: what's on now, maintenance coming up, and
 * what was resolved in the last `pastDays` days. Each with its updates,
 * newest first.
 */
export async function incidents({ pastDays = 14, now = new Date() } = {}) {
	const list = await db
		.select()
		.from(statusIncident)
		.where(
			or(
				isNull(statusIncident.resolvedAt),
				gte(statusIncident.resolvedAt, new Date(now.getTime() - pastDays * DAY))
			)
		)
		.orderBy(desc(statusIncident.startsAt));
	const all = await withUpdates(list);
	const upcoming = (i) => i.kind === 'maintenance' && i.status === 'scheduled' && i.startsAt > now;
	return {
		active: all.filter((i) => !i.resolvedAt && !upcoming(i)),
		scheduled: all.filter((i) => !i.resolvedAt && upcoming(i)).reverse(),
		past: all.filter((i) => i.resolvedAt)
	};
}

/**
 * The whole picture in one word, for the top of /status and the banner:
 * 'maintenance' (a window is on), 'major' (a major incident, or a part
 * down at its last check), 'minor' (a minor incident), or 'ok'.
 */
export function overall(components, active) {
	if (active.some((i) => i.kind === 'incident' && i.impact === 'major')) return 'major';
	if (components.some((c) => c.current && !c.current.ok)) return 'major';
	if (active.some((i) => i.kind === 'incident')) return 'minor';
	if (active.some((i) => i.kind === 'maintenance')) return 'maintenance';
	return 'ok';
}

/** Everything /status shows, cached for a minute. Null before 047. */
export async function statusPage() {
	try {
		return await cached(
			'status:page:v1',
			async () => {
				const [components, inc] = await Promise.all([componentHistory(), incidents()]);
				return { components, ...inc, overall: overall(components, inc.active) };
			},
			{ tags: ['status'], ttl: 60 }
		);
	} catch (err) {
		if (isMissingTable(err)) return null;
		throw err;
	}
}

/**
 * The banner across the site: the most serious incident or maintenance
 * that's on and asks for one. Null when there's none (or before 047).
 */
export async function siteBanner() {
	try {
		return await cached(
			'status:banner:v1',
			async () => {
				const now = new Date();
				const on = await db
					.select({
						id: statusIncident.id,
						kind: statusIncident.kind,
						title: statusIncident.title,
						impact: statusIncident.impact,
						status: statusIncident.status
					})
					.from(statusIncident)
					.where(
						and(
							isNull(statusIncident.resolvedAt),
							eq(statusIncident.banner, true),
							sql`not (${statusIncident.kind} = 'maintenance' and ${statusIncident.status} = 'scheduled' and ${statusIncident.startsAt} > ${now.toISOString()}::timestamptz)`
						)
					)
					.orderBy(desc(statusIncident.startsAt));
				const rank = { major: 0, minor: 1, maintenance: 2 };
				return on.sort((a, b) => rank[a.impact] - rank[b.impact])[0] || null;
			},
			{ tags: ['status'], ttl: 60, mem: 15 }
		);
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------- writing

const clean = (v, max) =>
	String(v ?? '')
		.trim()
		.slice(0, max);
const when = (v) => {
	const s = String(v || '').trim();
	if (!s) return null;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * Post an incident or a maintenance window, with its first update.
 * @returns {Promise<{ error?: string, id?: string }>}
 */
export async function createIncident(form, actorId) {
	const kind = form.kind === 'maintenance' ? 'maintenance' : 'incident';
	const title = clean(form.title, 160);
	const body = clean(form.body, 4000);
	const components = [].concat(form.components || []).filter((c) => COMPONENT_IDS.includes(c));
	const statuses = kind === 'maintenance' ? MAINTENANCE_STATUSES : INCIDENT_STATUSES;
	const status = statuses.includes(form.status) ? form.status : statuses[0];
	const impact =
		kind === 'maintenance' ? 'maintenance' : form.impact === 'major' ? 'major' : 'minor';
	const startsAt = when(form.startsAt);
	const endsAt = when(form.endsAt);
	if (!title) return { error: 'Give it a title.' };
	if (!body) return { error: 'Say what’s happening.' };
	if (startsAt === undefined || endsAt === undefined) return { error: 'That time isn’t valid.' };
	if (startsAt && endsAt && endsAt <= startsAt) return { error: 'It has to end after it starts.' };
	const [row] = await db
		.insert(statusIncident)
		.values({
			kind,
			title,
			impact,
			components,
			status,
			startsAt: startsAt || new Date(),
			endsAt,
			banner: form.banner !== false,
			resolvedAt: DONE.includes(status) ? new Date() : null,
			createdBy: actorId
		})
		.returning({ id: statusIncident.id });
	await db.insert(statusUpdate).values({ incidentId: row.id, status, body, createdBy: actorId });
	await bump('status');
	return { id: row.id };
}

/** Post an update; resolving (or completing) it closes it. */
export async function addUpdate(incidentId, form, actorId) {
	const [inc] = await db.select().from(statusIncident).where(eq(statusIncident.id, incidentId));
	if (!inc) return { error: 'That incident isn’t there any more.' };
	const statuses = inc.kind === 'maintenance' ? MAINTENANCE_STATUSES : INCIDENT_STATUSES;
	const status = statuses.includes(form.status) ? form.status : inc.status;
	const body = clean(form.body, 4000);
	if (!body) return { error: 'Say what’s changed.' };
	await db.insert(statusUpdate).values({ incidentId, status, body, createdBy: actorId });
	await db
		.update(statusIncident)
		.set({
			status,
			resolvedAt: DONE.includes(status) ? inc.resolvedAt || new Date() : null,
			...(form.impact === 'major' || form.impact === 'minor'
				? inc.kind === 'incident'
					? { impact: form.impact }
					: {}
				: {})
		})
		.where(eq(statusIncident.id, incidentId));
	await bump('status');
	return { ok: true };
}

/** Show or hide the site banner for one incident. */
export async function setBanner(incidentId, on) {
	await db.update(statusIncident).set({ banner: !!on }).where(eq(statusIncident.id, incidentId));
	await bump('status');
}

/** Delete an incident and its updates (a mistake, a test). */
export async function deleteIncident(incidentId) {
	await db.delete(statusIncident).where(eq(statusIncident.id, incidentId));
	await bump('status');
}
