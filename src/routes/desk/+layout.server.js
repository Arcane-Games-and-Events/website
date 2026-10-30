import { redirect } from '@sveltejs/kit';
import {
	canAccessDesk,
	canEditEntries,
	canEditCourses,
	canEditAllEntries,
	canViewSiteAnalytics,
	isAdmin
} from '$lib/server/auth/roles.js';

/**
 * /desk layout guard.
 *
 * Requires a signed-in user with at least one Desk capability (writer, creator,
 * or admin). Everyone else is bounced — not logged in → `/login`, logged in but
 * without Desk access → `/` (home).
 *
 * Child pages consume `canEditEntries` / `canEditCourses` / `isAdmin` to
 * gate section access and admin-only controls.
 */
export const load = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (!canAccessDesk(locals.user)) {
		throw redirect(302, '/');
	}
	return {
		user: locals.user,
		canEditEntries: canEditEntries(locals.user),
		canEditCourses: canEditCourses(locals.user),
		canViewAnalytics: canViewSiteAnalytics(locals.user),
		// Videos: admins and editors see every area; course creators their courses.
		canManageVideos: canEditAllEntries(locals.user) || canEditCourses(locals.user),
		isAdmin: isAdmin(locals.user)
	};
};
