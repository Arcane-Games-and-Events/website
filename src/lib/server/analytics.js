// src/lib/server/analytics.js
// Server-side analytics tracking utility
import { db } from '$lib/server/db';
import { pageView } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Generate a session ID from IP + User-Agent for anonymous grouping.
 * Hashed so no PII is stored.
 */
export function getSessionId(event) {
	let clientAddr = 'unknown';
	try {
		clientAddr = event.getClientAddress?.() || 'unknown';
	} catch {
		// getClientAddress throws during prerendering
	}
	const ip =
		event.request.headers.get('cf-connecting-ip') ||
		event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		clientAddr;
	const ua = event.request.headers.get('user-agent') || 'unknown';
	return crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 32);
}

/**
 * Extract device type from User-Agent string.
 */
export function getDeviceType(ua) {
	if (!ua) return 'unknown';
	ua = ua.toLowerCase();
	if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet';
	if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/.test(ua)) return 'mobile';
	return 'desktop';
}

/**
 * Extract browser name from User-Agent string.
 */
export function getBrowser(ua) {
	if (!ua) return 'unknown';
	// Order matters — check more specific patterns first
	if (/edg\//i.test(ua)) return 'Edge';
	if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
	if (/brave/i.test(ua)) return 'Brave';
	if (/vivaldi/i.test(ua)) return 'Vivaldi';
	if (/chrome|crios/i.test(ua)) return 'Chrome';
	if (/firefox|fxios/i.test(ua)) return 'Firefox';
	if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
	if (/msie|trident/i.test(ua)) return 'IE';
	return 'Other';
}

/**
 * Extract country code from geolocation headers.
 * Checks Vercel (x-vercel-ip-country) and Cloudflare (cf-ipcountry).
 */
export function getCountry(event) {
	return (
		event.request.headers.get('x-vercel-ip-country') ||
		event.request.headers.get('cf-ipcountry') ||
		null
	);
}

/**
 * Extract the domain from a referrer URL.
 * Maps known platforms to friendly names.
 */
export function extractReferrerDomain(referrer) {
	if (!referrer) return null;
	try {
		const url = new URL(referrer);
		let domain = url.hostname.replace(/^www\./, '');

		// Map known platforms to friendly names
		const domainMap = {
			'google.com': 'google.com',
			'google.co.uk': 'google.com',
			'google.ca': 'google.com',
			'google.com.au': 'google.com',
			't.co': 'twitter.com',
			'x.com': 'twitter.com',
			'l.facebook.com': 'facebook.com',
			'lm.facebook.com': 'facebook.com',
			'm.facebook.com': 'facebook.com',
			'old.reddit.com': 'reddit.com',
			'out.reddit.com': 'reddit.com',
			'l.instagram.com': 'instagram.com'
		};

		return domainMap[domain] || domain;
	} catch {
		return null;
	}
}

/**
 * Log a page view. Non-blocking — generates ID synchronously and
 * fires the DB insert in the background. Never blocks the request.
 * Returns the page view ID immediately for downstream use.
 */
export function logPageView(event, user) {
	try {
		const { request } = event;
		let path;
		try {
			path = event.url.pathname;
		} catch {
			// url properties are restricted during prerendering
			return null;
		}

		// Skip non-page paths
		if (
			path.startsWith('/api/') ||
			path.startsWith('/admin/') ||
			path.startsWith('/_app/') ||
			path.startsWith('/.well-known/') ||
			path.includes('.') // static files
		) {
			return null;
		}

		const ua = request.headers.get('user-agent') || '';
		const referrer = request.headers.get('referer') || null;
		const sessionId = getSessionId(event);

		// Extract UTM params
		let utmSource = null;
		let utmMedium = null;
		let utmCampaign = null;
		try {
			utmSource = event.url.searchParams.get('utm_source') || null;
			utmMedium = event.url.searchParams.get('utm_medium') || null;
			utmCampaign = event.url.searchParams.get('utm_campaign') || null;
		} catch {
			// searchParams restricted during prerendering
		}

		// Determine if this is an article page (now served under /library/)
		const articleMatch = path.match(/^\/library\/(.+)$/);
		const articleSlug = articleMatch ? articleMatch[1] : null;

		// Generate UUID synchronously so it's available immediately
		const pageViewId = crypto.randomUUID();

		// Fire-and-forget the DB insert — never blocks the request
		(async () => {
			try {
				// Check if new visitor (quick DB lookup)
				let isNew = false;
				try {
					const result = await db
						.select({ id: pageView.id })
						.from(pageView)
						.where(eq(pageView.sessionId, sessionId))
						.limit(1);
					isNew = result.length === 0;
				} catch {
					// Table might not exist yet
				}

				await db.insert(pageView).values({
					id: pageViewId,
					userId: user?.id || null,
					sessionId,
					path,
					referrer,
					referrerDomain: extractReferrerDomain(referrer),
					utmSource,
					utmMedium,
					utmCampaign,
					deviceType: getDeviceType(ua),
					browser: getBrowser(ua),
					country: getCountry(event),
					isNewVisitor: isNew,
					articleSlug
				});
			} catch {
				// Silent fail — analytics should never break the site
			}
		})();

		return pageViewId;
	} catch {
		return null;
	}
}

/**
 * Update a page_view row with article metadata after article data is loaded.
 * Fire-and-forget — never blocks.
 */
export function enrichPageViewWithArticle(pageViewId, articleData) {
	if (!pageViewId || !articleData) return;
	(async () => {
		try {
			await db
				.update(pageView)
				.set({
					articleTitle: articleData.title || null,
					articleAuthor: articleData.author || null,
					articleTags: articleData.tags || null,
					articleAccessMode: articleData.accessMode || null
				})
				.where(eq(pageView.id, pageViewId));
		} catch {
			// Silent fail
		}
	})();
}
