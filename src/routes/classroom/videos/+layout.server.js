import { redirect } from '@sveltejs/kit';
import { areasFor } from '$lib/server/video/list.js';

/**
 * /classroom/videos/[target]/[id] — one course video's analytics (a lesson's
 * or a trailer's), opened from the course. Teachers see their own courses'
 * videos; admins and editors every course's.
 */
export async function load({ locals }) {
	const { courses, allCourses } = areasFor(locals.user);
	if (!courses) throw redirect(302, '/classroom');
	return { areas: { gameplay: false, articles: false, courses, allCourses } };
}
