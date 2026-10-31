import { redirect } from '@sveltejs/kit';
import { canUseStudio, isAdmin } from '$lib/server/auth/roles.js';
import { canSeeUnused } from '$lib/server/video/mux.js';

/**
 * /studio — the media tool, apart from the Desk (articles) and the
 * Classroom (courses): bonus gameplay, podcast episodes, interviews and
 * other video. Admins, editors and producers.
 */
export const load = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (!canUseStudio(locals.user)) throw redirect(302, '/');
	return {
		user: locals.user,
		isAdmin: isAdmin(locals.user),
		canSeeUnused: canSeeUnused(locals.user)
	};
};
