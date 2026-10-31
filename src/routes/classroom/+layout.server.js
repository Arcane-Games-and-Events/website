import { redirect } from '@sveltejs/kit';
import {
	canAccessDesk,
	canOverseeCourses,
	canUseClassroom,
	isAdmin,
	isTeacher
} from '$lib/server/auth/roles.js';

/**
 * /classroom — the course tool, apart from the Desk (articles, videos,
 * gameplay). Teachers build and run their own courses here; admins and
 * editors oversee every course. Money (payouts, teacher earnings) is for
 * admins. Course images and videos live here and only here.
 */
export const load = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (!canUseClassroom(locals.user)) throw redirect(302, '/');
	return {
		user: locals.user,
		oversee: canOverseeCourses(locals.user),
		isAdmin: isAdmin(locals.user),
		isTeacher: isTeacher(locals.user),
		canAccessDesk: canAccessDesk(locals.user)
	};
};
