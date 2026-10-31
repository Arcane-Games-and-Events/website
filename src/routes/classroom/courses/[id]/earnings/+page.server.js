import { error } from '@sveltejs/kit';
import { teacherEarnings } from '$lib/server/courses/earnings.js';

/** This course's sales and the teacher's share: for its teacher and admins. */
export const load = async ({ parent }) => {
	const { course, money, ownsIt } = await parent();
	if (!money && !ownsIt) throw error(403, 'Only the teacher and admins see a course’s earnings.');
	return {
		earnings: course.authorId
			? await teacherEarnings(course.authorId, { courseId: course.id })
			: null
	};
};
