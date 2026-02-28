// src/hooks.server.js
import { auth } from '$lib/server/lucia';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { logPageView } from '$lib/server/analytics.js';

// Paths exempt from CSRF protection (external webhooks)
const CSRF_EXEMPT_PATHS = ['/api/webhooks/'];

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

	// CRITICAL: Always set Vary: Cookie so CDN caches separate versions
	// for logged-in vs logged-out users. This ensures the sidebar updates
	// immediately after login/logout.
	response.headers.set('vary', 'Cookie');

	// For authenticated users, also prevent any CDN caching
	if (user) {
		response.headers.set('cache-control', 'private, no-cache, no-store, must-revalidate');
	}

	return response;
};
