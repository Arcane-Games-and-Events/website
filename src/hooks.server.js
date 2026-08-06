// src/hooks.server.js
import { auth } from '$lib/server/lucia';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { logPageView } from '$lib/server/analytics.js';

// Paths exempt from CSRF protection (external webhooks)
const CSRF_EXEMPT_PATHS = ['/api/webhooks/'];

// Paths where the response MUST never be cached by any shared cache
// (Vercel edge, ISPs, corporate proxies). These are the routes that
// serve per-user private state — auth flows, admin surfaces, checkout,
// server APIs. Everything else lets its page-level `setHeaders` decide
// whether it can be edge-cached.
const NEVER_CACHE_PREFIXES = [
	'/account',
	'/admin',
	'/api',
	'/staff',
	'/checkout',
	'/login',
	'/signup',
	'/logout',
	'/reset-password',
	'/forgot-password'
];

export const handle = async ({ event, resolve }) => {
	// Custom CSRF protection (exempts webhook paths)
	const { request, url } = event;
	const isExempt = CSRF_EXEMPT_PATHS.some((path) => url.pathname.startsWith(path));

	if (!isExempt && request.method !== 'GET' && request.method !== 'HEAD') {
		const origin = request.headers.get('origin');
		const host = url.origin;

		// Block if Origin is present but doesn't match
		if (origin && origin !== host) {
			throw error(403, 'Cross-site POST form submissions are forbidden');
		}
	}

	// read the session id from the cookie
	const sid = event.cookies.get(auth.sessionCookieName);
	let user = null;
	let session = null;

	if (sid) {
		// validate the session id with Lucia v3
		const validated = await auth.validateSession(sid);
		session = validated.session;
		user = validated.user;

		// if invalid, clear cookie
		if (!session) {
			const blank = auth.createBlankSessionCookie();
			event.cookies.set(blank.name, blank.value, { ...blank.attributes, path: '/' });
		} else if (session.fresh) {
			// if valid & fresh, renew cookie
			const renewed = auth.createSessionCookie(session.id);
			event.cookies.set(renewed.name, renewed.value, { ...renewed.attributes, path: '/' });
		}

		// Check for expired subscriptions (cancelled or payment_failed) and downgrade to free
		if (user && user.role === 'premium') {
			const now = new Date();
			let shouldDowngrade = false;

			if (user.subscriptionEndDate) {
				const endDate = new Date(user.subscriptionEndDate);

				// Handle cancelled subscriptions that have reached their end date
				if (user.subscriptionStatus === 'cancelled' && now >= endDate) {
					shouldDowngrade = true;
				}

				// Handle payment_failed subscriptions that have exceeded grace period
				if (user.subscriptionStatus === 'payment_failed' && now >= endDate) {
					shouldDowngrade = true;
				}
			} else if (user.subscriptionStatus === 'payment_failed') {
				// payment_failed but no subscriptionEndDate was ever set (e.g. webhook missed)
				// Downgrade immediately — there's no valid grace period
				shouldDowngrade = true;
			}

			if (shouldDowngrade) {
				await db
					.update(userTable)
					.set({
						role: 'free',
						subscriptionStatus: 'expired',
						subscriptionId: null
					})
					.where(eq(userTable.id, user.id));

				user = {
					...user,
					role: 'free',
					subscriptionStatus: 'expired',
					subscriptionId: null
				};
			}
		}
	}

	// expose to routes/layouts
	event.locals.user = user;
	event.locals.session = session;

	// Track page views for GET requests — non-blocking (DB writes happen in background)
	if (request.method === 'GET') {
		const pageViewId = logPageView(event, user);
		if (pageViewId) {
			event.locals.pageViewId = pageViewId;
		}
	}

	// Resolve the request
	const response = await resolve(event);

	// CRITICAL: Always set Vary: Cookie so shared caches (Vercel edge)
	// keep separate entries for logged-in vs logged-out visitors — and
	// for different users when both are logged in. This means public
	// pages get one shared entry for anonymous traffic and one entry
	// per cookie fingerprint for authed traffic. Anonymous is the big
	// win; authed users benefit on their second navigation.
	response.headers.set('vary', 'Cookie');

	// Sensitive routes are always uncached, regardless of auth state
	// (an unauthed hit still gets `no-store` on `/account` — the redirect
	// itself shouldn't be cached either). Non-sensitive routes let the
	// page's own `setHeaders({...})` decide whether it's edge-cacheable.
	// This is the change that finally lets `/`, `/library`, `/age-open`
	// etc. serve from Vercel's edge for logged-in members.
	const isSensitive = NEVER_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p));
	if (isSensitive) {
		response.headers.set('cache-control', 'private, no-cache, no-store, must-revalidate');
	}

	return response;
};
