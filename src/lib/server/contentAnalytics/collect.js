import { db } from '$lib/server/db/index.js';
import { caView, caEvent, caConversion, caPageview, deskEntry } from '$lib/server/db/schema.js';
import { and, eq, gt, sql } from 'drizzle-orm';
import { canEditEntries, canEditCourses, isAdmin } from '$lib/server/auth/roles.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

/**
 * Content analytics — collection.
 *
 * The browser opens a view (`start`) when an article/video page mounts and
 * then sends cumulative numbers (`beat`) every ~15s and when the page is
 * hidden or left. Everything here is defensive: inputs are validated and
 * capped, running totals can only grow (GREATEST), a view can only be
 * updated by the browser that opened it, and nothing ever throws back to
 * the reader.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID.test(v);
const int = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

const MAX_SECONDS = 4 * 60 * 60; // a single view never counts more than 4 hours
const BINS = 20;

export const EVENT_TYPES = new Set([
	'share',
	'cta_view',
	'cta_click',
	'decklist_open',
	'card_hover',
	'toc_click',
	'link_out',
	'link_in',
	'video_play',
	'video_complete',
	'copy'
]);

/** True when migration 021 hasn't been applied — collection silently no-ops. */
export function isMissingTable(err) {
	const code = err?.code || err?.cause?.code;
	return code === '42P01';
}

// ---------------------------------------------------------------- request facts

const BOT =
	/bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|embedly|quora link|whatsapp|discordbot|telegrambot|vercel|monitor|curl|wget|python|axios|node-fetch|go-http/i;

export function isBot(ua) {
	return !ua || BOT.test(ua);
}

export function parseUserAgent(ua = '') {
	const device = /ipad|tablet|(android(?!.*mobile))/i.test(ua)
		? 'tablet'
		: /mobi|iphone|ipod|android/i.test(ua)
			? 'mobile'
			: 'desktop';
	const browser = /edg\//i.test(ua)
		? 'Edge'
		: /opr\/|opera/i.test(ua)
			? 'Opera'
			: /samsungbrowser/i.test(ua)
				? 'Samsung Internet'
				: /firefox|fxios/i.test(ua)
					? 'Firefox'
					: /chrome|crios/i.test(ua)
						? 'Chrome'
						: /safari/i.test(ua)
							? 'Safari'
							: 'Other';
	const os = /iphone|ipad|ipod/i.test(ua)
		? 'iOS'
		: /android/i.test(ua)
			? 'Android'
			: /windows/i.test(ua)
				? 'Windows'
				: /cros/i.test(ua)
					? 'ChromeOS'
					: /mac os x|macintosh/i.test(ua)
						? 'macOS'
						: /linux/i.test(ua)
							? 'Linux'
							: 'Other';
	return { device, browser, os };
}

const INTERNAL_HOST =
	/(^|\.)(age\.events|arcanegamesandevents\.com)$|^localhost$|^127\.0\.0\.1$|\.vercel\.app$/i;
const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave|startpage)\./i;
const SOCIAL =
	/(^|\.)(twitter\.com|x\.com|t\.co|facebook\.com|fb\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|bsky\.app|threads\.net|lnkd\.in)$/i;
const COMMUNITY = /(^|\.)(reddit\.com|discord\.com|discord\.gg|discordapp\.com|twitch\.tv)$/i;
const EMAIL = /(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com)$/i;

/**
 * Bucket where a reader came from. `fromPath` is set by the browser when the
 * previous page was on this site (client-side navigation).
 */
export function classifySource({ referrerDomain, fromPath, utmMedium, utmSource }) {
	const medium = (utmMedium || '').toLowerCase();
	if (medium === 'email' || medium === 'newsletter') return 'email';
	if (fromPath) return 'internal';
	if (!referrerDomain) {
		if (utmSource) return 'referral';
		return 'direct';
	}
	if (INTERNAL_HOST.test(referrerDomain)) return 'internal';
	if (EMAIL.test(referrerDomain)) return 'email';
	if (SEARCH.test(referrerDomain)) return 'search';
	if (SOCIAL.test(referrerDomain)) return 'social';
	if (COMMUNITY.test(referrerDomain)) return 'community';
	return 'referral';
}

function referrerDomainOf(referrer) {
	try {
		return new URL(referrer).hostname.replace(/^www\./, '').toLowerCase() || null;
	} catch {
		return null;
	}
}

/** Who is reading. Staff (anyone with Desk access) are excluded from stats. */
export function audienceOf(user) {
	if (!user) return 'anonymous';
	if (isAdmin(user) || canEditEntries(user) || canEditCourses(user)) return 'staff';
	return userHasPremiumAccess(user) ? 'premium' : 'free';
}

// ---------------------------------------------------------------- start

/**
 * Open a view. Called once per article/video page mount.
 * @param {any} p   payload from the browser
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function startView(p, event) {
	if (!isUuid(p?.id) || !isUuid(p?.entryId) || !isUuid(p?.visitorId) || !isUuid(p?.sessionId))
		return;
	const ua = event.request.headers.get('user-agent') || '';
	if (isBot(ua)) return;

	const [entry] = await db
		.select({
			id: deskEntry.id,
			readTime: deskEntry.readTime,
			videoProvider: deskEntry.videoProvider
		})
		.from(deskEntry)
		.where(eq(deskEntry.id, p.entryId))
		.limit(1);
	if (!entry) return;

	const kind = entry.videoProvider ? (entry.readTime ? 'article+video' : 'video') : 'article';
	const referrerDomain = referrerDomainOf(p.referrer);
	const fromPath = str(p.fromPath, 300);
	const utmSource = str(p.utm?.source, 100);
	const utmMedium = str(p.utm?.medium, 100);
	const utmCampaign = str(p.utm?.campaign, 150);
	const user = event.locals.user;
	const source = classifySource({ referrerDomain, fromPath, utmMedium, utmSource });

	await db
		.insert(caView)
		.values({
			id: p.id,
			entryId: entry.id,
			visitorId: p.visitorId,
			sessionId: p.sessionId,
			userId: user?.id || null,
			audience: audienceOf(user),
			gated: !!p.gated,
			kind,
			source,
			// only outside sites count as referrers; internal visits keep from_path
			referrerDomain: source === 'internal' ? null : referrerDomain,
			fromPath,
			utmSource,
			utmMedium,
			utmCampaign,
			...parseUserAgent(ua),
			country: str(event.request.headers.get('x-vercel-ip-country'), 2),
			viewportW: int(p.viewportW, 10000) || null
		})
		.onConflictDoNothing();
}

// ---------------------------------------------------------------- beat

const bins = (arr) =>
	Array.from({ length: BINS }, (_, i) => int(Array.isArray(arr) ? arr[i] : 0, MAX_SECONDS));

function cleanSections(raw) {
	const out = {};
	if (!raw || typeof raw !== 'object') return out;
	for (const [k, v] of Object.entries(raw).slice(0, 60)) {
		const key = String(k).slice(0, 80);
		if (!key) continue;
		out[key] = { t: str(v?.t, 120) || key, s: int(v?.s, MAX_SECONDS), i: int(v?.i, 999) };
	}
	return out;
}

/**
 * Update a view with the browser's cumulative numbers, and log any new
 * discrete events. Only the browser that opened the view (same visitor id)
 * can update it, and only within 12 hours of opening.
 */
export async function beatView(p) {
	if (!isUuid(p?.id) || !isUuid(p?.visitorId)) return;

	const visible = int(p.visible, MAX_SECONDS);
	const engaged = Math.min(int(p.engaged, MAX_SECONDS), visible);
	const v = p.video || {};
	const exitType = ['internal', 'external', 'closed'].includes(p.exit?.type) ? p.exit.type : null;

	const set = {
		lastSeenAt: new Date(),
		visibleSeconds: sql`GREATEST(${caView.visibleSeconds}, ${visible})`,
		engagedSeconds: sql`GREATEST(${caView.engagedSeconds}, ${engaged})`,
		qualified: sql`${caView.qualified} OR ${visible >= 3}`,
		maxDepth: sql`GREATEST(${caView.maxDepth}, ${int(p.maxDepth, 100)})`,
		depthSeconds: bins(p.depthSeconds),
		sections: cleanSections(p.sections),
		completed: sql`${caView.completed} OR ${!!p.completed}`,
		videoSeconds: sql`GREATEST(${caView.videoSeconds}, ${int(v.seconds, MAX_SECONDS)})`,
		videoMaxPct: sql`GREATEST(${caView.videoMaxPct}, ${int(v.maxPct, 100)})`,
		videoBins: bins(v.bins),
		videoPlays: sql`GREATEST(${caView.videoPlays}, ${int(v.plays, 500)})`,
		videoSeeks: sql`GREATEST(${caView.videoSeeks}, ${int(v.seeks, 5000)})`,
		videoCompleted: sql`${caView.videoCompleted} OR ${!!v.completed}`
	};
	const dur = int(v.duration, 24 * 60 * 60);
	if (dur) set.videoDuration = dur;
	if (exitType) {
		set.exitType = exitType;
		set.exitTarget = str(p.exit.target, 300);
	}

	const [row] = await db
		.update(caView)
		.set(set)
		.where(
			and(
				eq(caView.id, p.id),
				eq(caView.visitorId, p.visitorId),
				gt(caView.startedAt, new Date(Date.now() - 12 * 60 * 60 * 1000))
			)
		)
		.returning({ entryId: caView.entryId });
	if (!row) return;

	const events = (Array.isArray(p.events) ? p.events : [])
		.filter((e) => EVENT_TYPES.has(e?.type))
		.slice(0, 50)
		.map((e) => ({
			viewId: p.id,
			entryId: row.entryId,
			type: e.type,
			label: str(e.label, 200),
			depth: e.depth == null ? null : int(e.depth, 100)
		}));
	if (events.length) await db.insert(caEvent).values(events);
}

// ---------------------------------------------------------------- conversions

/**
 * Record a sign-up or Premium upgrade so content can be credited for it.
 * Reads the anonymous visitor id the browser stores in the `age_vid`
 * cookie. Never throws.
 * @param {{ cookies: import('@sveltejs/kit').Cookies }} event
 * @param {string | null | undefined} userId
 * @param {'signup' | 'premium'} kind
 */
export async function recordConversion(event, userId, kind, extra = {}) {
	try {
		const vid = event.cookies.get('age_vid');
		const sid = extra.sessionId ?? event.cookies.get('age_sid');
		await db.insert(caConversion).values({
			visitorId: isUuid(vid) ? vid : null,
			userId: userId || null,
			kind,
			sessionId: isUuid(sid) ? sid : null,
			path: extra.path ?? event.url?.pathname ?? null,
			meta: extra.meta ?? null
		});
	} catch (err) {
		if (isMissingColumn(err)) {
			// Migration 022 not run yet — keep the old shape.
			try {
				const vid = event.cookies.get('age_vid');
				await db
					.insert(caConversion)
					.values({ visitorId: isUuid(vid) ? vid : null, userId: userId || null, kind });
			} catch {
				// Best effort.
			}
			return;
		}
		if (!isMissingTable(err)) console.error('[content-analytics] conversion failed:', err?.message);
	}
}

/** Postgres "column does not exist" (42703). */
export function isMissingColumn(err) {
	const code = err?.code || err?.cause?.code;
	return code === '42703';
}

// ---------------------------------------------------------------- page views

/**
 * Open a page view (any public page). Same request facts as a content
 * view; `entryId` and `viewId` tie a Library page to its ca_view row.
 * @param {any} p
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function startPageview(p, event) {
	if (!isUuid(p?.id) || !isUuid(p?.visitorId) || !isUuid(p?.sessionId)) return;
	const path = str(p.path, 300);
	if (!path || !path.startsWith('/')) return;
	const ua = event.request.headers.get('user-agent') || '';
	if (isBot(ua)) return;

	const referrerDomain = referrerDomainOf(p.referrer);
	const fromPath = str(p.fromPath, 300);
	const utmSource = str(p.utm?.source, 100);
	const utmMedium = str(p.utm?.medium, 100);
	const utmCampaign = str(p.utm?.campaign, 150);
	const user = event.locals.user;
	const source = classifySource({ referrerDomain, fromPath, utmMedium, utmSource });

	await db
		.insert(caPageview)
		.values({
			id: p.id,
			visitorId: p.visitorId,
			sessionId: p.sessionId,
			userId: user?.id || null,
			audience: audienceOf(user),
			path,
			route: str(p.route, 200),
			entryId: isUuid(p.entryId) ? p.entryId : null,
			viewId: isUuid(p.viewId) ? p.viewId : null,
			source,
			referrerDomain: source === 'internal' ? null : referrerDomain,
			fromPath,
			utmSource,
			utmMedium,
			utmCampaign,
			...parseUserAgent(ua),
			country: str(event.request.headers.get('x-vercel-ip-country'), 2),
			viewportW: int(p.viewportW, 10000) || null
		})
		.onConflictDoNothing();
}

/** Record how long a page was visible. */
export async function beatPageview(p) {
	if (!isUuid(p?.id)) return;
	const visible = int(p.visible, MAX_SECONDS);
	await db
		.update(caPageview)
		.set({
			visibleSeconds: sql`greatest(${caPageview.visibleSeconds}, ${visible})`,
			lastSeenAt: new Date()
		})
		.where(eq(caPageview.id, p.id));
}

const CLIENT_KINDS = new Set(['checkout_started']);

/**
 * A funnel step reported by the browser. Money steps (sign-up, subscribe,
 * ticket) are recorded by the server, so only `checkout_started` is
 * accepted here.
 */
export async function recordClientConversion(p, event) {
	if (!CLIENT_KINDS.has(p?.kind)) return;
	const ua = event.request.headers.get('user-agent') || '';
	if (isBot(ua)) return;
	await db.insert(caConversion).values({
		visitorId: isUuid(p.visitorId) ? p.visitorId : null,
		sessionId: isUuid(p.sessionId) ? p.sessionId : null,
		userId: event.locals.user?.id || null,
		kind: p.kind,
		path: str(p.path, 300),
		meta: p.meta && typeof p.meta === 'object' ? p.meta : null
	});
}
