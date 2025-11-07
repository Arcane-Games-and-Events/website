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

	return resolve(event);
};

// import { auth } from '$lib/server/lucia';

// export const handle = async ({ event, resolve }) => {
// 	const sid = event.cookies.get(auth.sessionCookieName);

// 	if (!sid) {
// 		event.locals.user = null;
// 		event.locals.session = null;
// 		return resolve(event);
// 	}

// 	const { session, user } = await auth.validateSession(sid);

// 	if (!session) {
// 		const blank = auth.createBlankSessionCookie();
// 		event.cookies.set(blank.name, blank.value, { ...blank.attributes, path: '/' });
// 		event.locals.user = null;
// 		event.locals.session = null;
// 		return resolve(event);
// 	}

// 	if (session.fresh) {
// 		const renewed = auth.createSessionCookie(session.id);
// 		event.cookies.set(renewed.name, renewed.value, { ...renewed.attributes, path: '/' });
// 	}

// 	event.locals.user = user;
// 	event.locals.session = session;
// 	return resolve(event);
// };
