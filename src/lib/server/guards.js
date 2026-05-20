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
 * Return every role tag a user carries: their primary `role` plus any
 * stacked `additionalRoles`. Order isn't significant; callers should treat
 * it as a set.
 */
export function userRoles(user) {
	if (!user) return [];
	const extra = Array.isArray(user.additionalRoles) ? user.additionalRoles : [];
	return [user.role, ...extra].filter(Boolean);
}

/**
 * Does the user carry any of the requested roles (primary or additional)?
 */
export function userHasAnyRole(user, allowed) {
	const allowedSet = new Set(Array.isArray(allowed) ? allowed : [allowed]);
	return userRoles(user).some((r) => allowedSet.has(r));
}

/**
 * Ensure a user has one of the allowed roles (primary or additional).
 * - allowed can be a string or an array of strings
 * - default behavior: redirect to /login if not logged in, 403 if wrong role
 */
export function requireRole(locals, allowed) {
	const user = requireUser(locals);
	if (!userHasAnyRole(user, allowed)) {
		throw error(403, 'Forbidden');
	}
	return user;
}

/**
 * Roles allowed to use the CMS:
 *   - admin   : full access (all articles + courses)
 *   - writer  : article editing
 *   - creator : course editing
 * Editors can have both roles via admin override (admin role grants both).
 *
 * The CMS admin entry pages call this. Per-resource ownership checks (writer
 * editing someone else's article) live next to the relevant API/route handlers.
 */
export function requireCmsAccess(locals) {
	return requireRole(locals, ['admin', 'writer', 'creator']);
}

/**
 * Convenience predicate for ownership checks on articles/courses.
 * Admin can edit anything (whether it's their primary role or an additional
 * role). Writers/creators only their own resources.
 */
export function canEditOwn(user, ownerId) {
	if (!user) return false;
	if (userHasAnyRole(user, 'admin')) return true;
	return user.id === ownerId;
}
