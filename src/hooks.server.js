// src/hooks.server.js
import { auth } from '$lib/server/lucia';

export const handle = async ({ event, resolve }) => {
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
	}

	// expose to routes/layouts
	event.locals.user = user;
	event.locals.session = session;

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
