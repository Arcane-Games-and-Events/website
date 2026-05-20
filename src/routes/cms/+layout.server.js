// src/routes/cms/+layout.server.js
//
// CMS surface — separate from /admin. Open to admin, writer, and creator
// roles (any combo, including stacked via additionalRoles).
import { redirect } from '@sveltejs/kit';
import { userHasAnyRole } from '$lib/server/guards.js';

export const load = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (!userHasAnyRole(locals.user, ['admin', 'writer', 'creator'])) {
		// Logged in but no CMS access — bounce to home.
		throw redirect(302, '/');
	}
	return {
		user: locals.user,
		canEditArticles: userHasAnyRole(locals.user, ['admin', 'writer']),
		canEditCourses: userHasAnyRole(locals.user, ['admin', 'creator'])
	};
};
