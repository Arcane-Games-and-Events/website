import { redirect } from '@sveltejs/kit';
import { canAccessCms, canEditEntries, canEditCourses, isAdmin } from '$lib/server/auth/roles.js';

/**
 * /cms layout guard.
 *
 * Requires a signed-in user with at least one CMS capability (writer, creator,
 * or admin). Everyone else is bounced — not logged in → `/login`, logged in but
 * without CMS access → `/` (home).
 *
 * Child pages consume `canEditEntries` / `canEditCourses` / `isAdmin` to
 * gate section access and admin-only controls.
 */
export const load = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (!canAccessCms(locals.user)) {
		throw redirect(302, '/');
	}
	return {
		user: locals.user,
		canEditEntries: canEditEntries(locals.user),
		canEditCourses: canEditCourses(locals.user),
		isAdmin: isAdmin(locals.user)
	};
};
