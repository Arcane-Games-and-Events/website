// src/lib/server/guards.js

import { redirect, error } from '@sveltejs/kit';

/**
 * Ensure a user is logged in. Throw 302 redirect to /login if not.
 * Returns the user object for convenience.
 */
export function requireUser(locals) {
	if (!locals?.user) throw redirect(302, '/login');
	return locals.user;
}

/**
 * Ensure a user has one of the allowed roles.
 * - allowed can be a string or an array of strings
 * - default behavior: redirect to /login if not logged in, 403 if wrong role
 */
export function requireRole(locals, allowed) {
	const user = requireUser(locals);
	const allowedSet = new Set(Array.isArray(allowed) ? allowed : [allowed]);

	if (!allowedSet.has(user.role)) {
		throw error(403, 'Forbidden');
	}
	return user;
}
