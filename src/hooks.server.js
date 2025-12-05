// src/hooks.server.js
import { auth } from '$lib/server/lucia';

export const handle = async ({ event, resolve }) => {
	// read the session id from the cookie
	const sid = event.cookies.get(auth.sessionCookieName);

	if (!sid) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// validate the session id with Lucia v3
	const { session, user } = await auth.validateSession(sid);

	// if invalid, clear cookie
	if (!session) {
		const blank = auth.createBlankSessionCookie();
		event.cookies.set(blank.name, blank.value, { ...blank.attributes, path: '/' });
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// if valid & fresh, renew cookie
	if (session.fresh) {
		const renewed = auth.createSessionCookie(session.id);
		event.cookies.set(renewed.name, renewed.value, { ...renewed.attributes, path: '/' });
	}

	// expose to routes/layouts
	event.locals.user = user;
	event.locals.session = session;

	// Resolve the request
	const response = await resolve(event);

	// CRITICAL: Prevent Vercel CDN from caching authenticated user responses
	// This prevents user data from leaking between sessions via cached pages
	if (user) {
		response.headers.set('cache-control', 'private, no-cache, no-store, must-revalidate');
		response.headers.set('vary', 'Cookie');
	}

	return response;
};
