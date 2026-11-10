import { redirect } from '@sveltejs/kit';
import { pendingRefundCount } from '$lib/server/partner/guideRefunds.js';
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
 * admins. Course images and videos live inside each course.
 */
export const load = async ({ locals, url, depends }) => {
	// Deciding a refund refreshes the count on the Refunds tab.
	depends('classroom:refunds');
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (!canUseClassroom(locals.user)) throw redirect(302, '/');
	return {
		user: locals.user,
		oversee: canOverseeCourses(locals.user),
		isAdmin: isAdmin(locals.user),
		isTeacher: isTeacher(locals.user),
		canAccessDesk: canAccessDesk(locals.user),
		// Refund requests waiting: every guide's for admins, their own for teachers.
		refundsPending:
			isAdmin(locals.user) || isTeacher(locals.user)
				? await pendingRefundCount(isAdmin(locals.user) ? null : locals.user.id).catch(() => 0)
				: 0
	};
};
