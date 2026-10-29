import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';
import { guarded, n, first, rows } from './util.js';

/**
 * Site-wide traffic and the premium funnel, from `ca_pageview` and
 * `ca_conversion` (migration 022). Staff visits are excluded.
 */

const NOT_STAFF = sql`audience <> 'staff'`;
const TTL = 120;

/** Visitors, page views, daily series and breakdowns for the last `days` days. */
export function siteOverview({ days = 30 } = {}) {
	return guarded(
		`admin:site:overview:v1:${days}`,
		async () => {
			const since = sql`now() - make_interval(days => ${days})`;
			const [totals, daily, groups, pages, entries, members] = await Promise.all([
				db.execute(sql`
					with v as (
						select visitor_id, count(distinct session_id) as sessions
						from ca_pageview where started_at >= ${since} and ${NOT_STAFF}
						group by visitor_id
					)
					select
						(select count(*) from ca_pageview where started_at >= ${since} and ${NOT_STAFF}) as pageviews,
						(select count(distinct session_id) from ca_pageview where started_at >= ${since} and ${NOT_STAFF}) as sessions,
						(select count(*) from v) as visitors,
						(select count(*) from v where sessions >= 2) as returning,
						(select count(*) from ca_conversion where at >= ${since} and kind = 'signup') as signups,
						(select count(*) from ca_conversion where at >= ${since} and kind = 'premium') as upgrades
				`),
				db.execute(sql`
					select to_char(started_at at time zone 'UTC', 'YYYY-MM-DD') as day,
						count(*) as n, count(distinct visitor_id) as visitors
					from ca_pageview where started_at >= ${since} and ${NOT_STAFF}
					group by 1 order by 1
				`),
				db.execute(sql`
					select 'source' as dim, coalesce(source, 'direct') as key, count(*) as n
					from ca_pageview where started_at >= ${since} and ${NOT_STAFF} group by 2
					union all
					select 'device', coalesce(device, 'desktop'), count(*)
					from ca_pageview where started_at >= ${since} and ${NOT_STAFF} group by 2
					union all
					select 'country', coalesce(country, '—'), count(*)
					from ca_pageview where started_at >= ${since} and ${NOT_STAFF} group by 2
					union all
					select 'audience', audience, count(*)
					from ca_pageview where started_at >= ${since} and ${NOT_STAFF} group by 2
					union all
					select 'referrer', referrer_domain, count(*)
					from ca_pageview where started_at >= ${since} and ${NOT_STAFF} and referrer_domain is not null group by 2
				`),
				db.execute(sql`
					select path as key, count(*) as n
					from ca_pageview where started_at >= ${since} and ${NOT_STAFF}
					group by 1 order by 2 desc limit 15
				`),
				db.execute(sql`
					select path as key, count(*) as n from (
						select distinct on (session_id) session_id, path
						from ca_pageview where started_at >= ${since} and ${NOT_STAFF}
						order by session_id, started_at
					) e group by 1 order by 2 desc limit 10
				`),
				db.execute(sql`
					select
						count(distinct user_id) filter (where started_at >= now() - interval '1 day') as dau,
						count(distinct user_id) filter (where started_at >= now() - interval '7 days') as wau,
						count(distinct user_id) filter (where started_at >= now() - interval '30 days') as mau
					from ca_pageview where user_id is not null and ${NOT_STAFF} and started_at >= now() - interval '30 days'
				`)
			]);
			const t = first(totals);
			const pick = (dim, limit = 10) =>
				rows(groups)
					.filter((r) => r.dim === dim)
					.map((r) => ({ key: r.key, n: n(r.n) }))
					.sort((a, b) => b.n - a.n)
					.slice(0, limit);
			const m = first(members);
			const sessions = n(t.sessions);
			return {
				days,
				figures: {
					pageviews: n(t.pageviews),
					sessions,
					visitors: n(t.visitors),
					pagesPerVisit: sessions ? n(t.pageviews) / sessions : 0,
					returningPct: n(t.visitors) ? n(t.returning) / n(t.visitors) : 0,
					signups: n(t.signups),
					upgrades: n(t.upgrades)
				},
				daily: rows(daily).map((r) => ({ day: r.day, n: n(r.n), visitors: n(r.visitors) })),
				topPages: rows(pages).map((r) => ({ key: r.key, n: n(r.n) })),
				entryPages: rows(entries).map((r) => ({ key: r.key, n: n(r.n) })),
				bySource: pick('source'),
				byDevice: pick('device'),
				byCountry: pick('country'),
				byAudience: pick('audience'),
				referrers: pick('referrer', 8),
				members: { dau: n(m.dau), wau: n(m.wau), mau: n(m.mau) }
			};
		},
		{ ttl: TTL }
	);
}

/**
 * The premium funnel per visit: saw the premium page → started checkout →
 * joined, plus sign-ups and ticket purchases, by the visit's source.
 */
export function premiumFunnel({ days = 30 } = {}) {
	return guarded(
		`admin:site:funnel:v1:${days}`,
		async () => {
			const since = sql`now() - make_interval(days => ${days})`;
			const result = await db.execute(sql`
				with s as (
					select session_id,
						(array_agg(coalesce(source, 'direct') order by started_at))[1] as source,
						bool_or(path like '/premium%') as premium
					from ca_pageview
					where started_at >= ${since} and ${NOT_STAFF}
					group by session_id
				),
				c as (
					select session_id,
						bool_or(kind = 'checkout_started') as checkout,
						bool_or(kind = 'premium') as subscribed,
						bool_or(kind = 'signup') as signup,
						bool_or(kind = 'ticket') as ticket
					from ca_conversion
					where at >= ${since} and session_id is not null
					group by session_id
				)
				select s.source,
					count(*) as sessions,
					count(*) filter (where s.premium) as premium_views,
					count(*) filter (where c.checkout) as checkout_started,
					count(*) filter (where c.subscribed) as subscribed,
					count(*) filter (where c.signup) as signups,
					count(*) filter (where c.ticket) as tickets
				from s left join c on c.session_id = s.session_id
				group by s.source
				order by sessions desc
			`);
			const bySource = rows(result).map((r) => ({
				source: r.source,
				sessions: n(r.sessions),
				premiumViews: n(r.premium_views),
				checkoutStarted: n(r.checkout_started),
				subscribed: n(r.subscribed),
				signups: n(r.signups),
				tickets: n(r.tickets)
			}));
			const sum = (k) => bySource.reduce((s, r) => s + r[k], 0);
			return {
				bySource,
				steps: [
					{ key: 'visits', label: 'Visits', n: sum('sessions') },
					{ key: 'premium', label: 'Saw the premium page', n: sum('premiumViews') },
					{ key: 'checkout', label: 'Started checkout', n: sum('checkoutStarted') },
					{ key: 'joined', label: 'Joined premium', n: sum('subscribed') }
				]
			};
		},
		{ ttl: TTL }
	);
}
