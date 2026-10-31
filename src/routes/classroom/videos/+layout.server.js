import { redirect } from '@sveltejs/kit';
import { areasFor } from '$lib/server/video/list.js';

/**
 * /classroom/videos — course videos (trailers and lesson videos), course by
 * course. Teachers see their own courses; admins and editors every course.
 */
export async function load({ locals }) {
	const { courses, allCourses } = areasFor(locals.user);
	if (!courses) throw redirect(302, '/classroom');
	return { areas: { gameplay: false, articles: false, courses, allCourses } };
}
