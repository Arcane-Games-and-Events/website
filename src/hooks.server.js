// src/hooks.server.js
import { auth, sessionCacheKey } from '$lib/server/lucia';
import { db } from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';

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

// Lucia looks the session and its user up in the database on every
// request. Keep the answer for a minute so a member's page views don't
// each pay for that query. Anything that changes a user's role or
// subscription bumps `user:{id}`; logging out forgets the session key
// (see `forgetSession` in lucia.js). Only valid sessions are cached. The
// session id itself is never stored: the key is a hash of it and the id is
// put back from the cookie on read. Date fields are revived since the
// cache stores JSON.
const USER_DATES = ['subscriptionStartDate', 'subscriptionEndDate', 'nextBillingDate', 'createdAt'];
const revive = (obj, fields) => {
	for (const f of fields) if (obj[f]) obj[f] = new Date(obj[f]);
	return obj;
};
async function validateSessionCached(sid) {
	// `fresh` means Lucia just extended the session and the cookie should
	// be renewed. That happens on the request that ran the lookup, so it
	// is kept out of the cached copy.
	let fresh = false;
	const hit = await cached(
		sessionCacheKey(sid),
		async () => {
			const { session, user } = await auth.validateSession(sid);
			if (!session) return null;
			fresh = session.fresh;
			const { id: _id, fresh: _fresh, ...rest } = session;
			return { session: rest, user };
		},
		{ ttl: CACHE_TTL.MINUTE, tags: (v) => [`user:${v.user.id}`] }
	);
	if (!hit) return { session: null, user: null };
	return {
		session: { ...revive({ ...hit.session }, ['expiresAt']), id: sid, fresh },
		user: revive({ ...hit.user }, USER_DATES)
	};
}

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
		const validated = await validateSessionCached(sid);
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
	}

	// expose to routes/layouts
	event.locals.user = user;
	event.locals.session = session;

	// /admin is for admins only. Checked here, before any load function
	// runs, because SvelteKit runs page and layout loads in parallel and a
	// page's queries would otherwise execute for a visitor the admin
	// layout is about to turn away.
	if (url.pathname.startsWith('/admin')) {
		if (!user) {
			throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
		}
		if (user.role !== 'admin') throw redirect(302, '/');
	}

	// Content analytics are collected in the browser (see /api/ca), so
	// nothing is logged per request here.

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
