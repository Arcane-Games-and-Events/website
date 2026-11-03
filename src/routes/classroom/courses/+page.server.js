import { error } from '@sveltejs/kit';
import { canOverseeCourses, isAdmin } from '$lib/server/auth/roles.js';
import { courseOversight } from '$lib/server/courses/oversight.js';
import { mediaImagesById } from '$lib/server/media/library.js';

/**
 * Classroom → Courses (admins and editors): every course, where each stands,
 * whose move it is and since when. Money columns are for admins.
 */
export const load = async ({ locals, url, depends }) => {
	depends('desk:courses');
	if (!canOverseeCourses(locals.user))
		throw error(403, 'Only admins and editors see every course.');
	const money = isAdmin(locals.user);
	const { courses } = await courseOversight(locals.user, new Date(), { money });
	const covers = await mediaImagesById(courses.map((c) => c.coverImageId));
	return {
		money,
		stage: url.searchParams.get('stage') || 'all',
		courses: courses.map((c) => ({
			id: c.id,
			title: c.title,
			cover: (c.coverImageId && covers[c.coverImageId]) || null,
			price: c.price,
			author: c.author,
			authorId: c.authorId,
			standing: c.standing,
			liveProblems: c.liveProblems,
			postsToReview: c.postsToReview,
			topics: c.topics,
			liveTopics: c.liveTopics,
			pendingTopics: c.pendingTopics,
			paidStudents: c.paidStudents,
			compStudents: c.compStudents,
			submittedAt: c.submittedAt,
			...(money ? { grossCents: c.grossCents - c.refundedCents, owedCents: c.owedCents } : {})
		}))
	};
};
