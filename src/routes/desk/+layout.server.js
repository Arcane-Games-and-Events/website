import { redirect } from '@sveltejs/kit';
import {
	canAccessDesk,
	canEditEntries,
	canEditAllEntries,
	canUseClassroom,
	canViewSiteAnalytics,
	isAdmin
} from '$lib/server/auth/roles.js';

/**
 * /desk layout guard.
 *
 * The Desk is for articles, videos and bonus gameplay: writers, editors and
 * admins. Teachers who only teach go to the Classroom (/classroom); anyone
 * else signed in goes home, and signed-out visitors to /login.
 *
 * Child pages consume `canEditEntries` / `isAdmin` to gate sections and
 * admin-only controls.
 */
export const load = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (!canAccessDesk(locals.user)) {
		throw redirect(302, canUseClassroom(locals.user) ? '/classroom' : '/');
	}
	return {
		user: locals.user,
		canEditEntries: canEditEntries(locals.user),
		canViewAnalytics: canViewSiteAnalytics(locals.user),
		// Videos: gameplay and article videos, for admins and editors.
		canManageVideos: canEditAllEntries(locals.user),
		isAdmin: isAdmin(locals.user)
	};
};
