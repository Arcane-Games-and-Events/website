import { error } from '@sveltejs/kit';
import { canEditCourses, canOverseeCourses, isAdmin } from '$lib/server/auth/roles.js';
import { listDeskCourses } from '$lib/server/courses/builder.js';
import { reviewQueue } from '$lib/server/courses/discussion.js';
import { courseOversight } from '$lib/server/courses/oversight.js';

/**
 * Classroom → Courses: a teacher's own courses; admins and editors get the
 * overview of every course. Money (what's owed, payouts) shows to admins only.
 */
export const load = async ({ locals, depends }) => {
	depends('desk:courses');
	if (!canEditCourses(locals.user)) throw error(403, 'Only teachers can manage courses.');
	const admin = canOverseeCourses(locals.user);
	const money = isAdmin(locals.user);
	if (!admin) return { courses: await listDeskCourses(locals.user), admin, money, queue: [] };
	// Admins and editors: every course, where each stands, and what's waiting on whom.
	const oversight = await courseOversight(locals.user, new Date(), { money });
	const flagged = oversight.courses.filter((c) => c.postsToReview).map((c) => c.id);
	return {
		courses: oversight.courses,
		oversight,
		admin,
		money,
		queue: flagged.length ? await reviewQueue(flagged) : []
	};
};
