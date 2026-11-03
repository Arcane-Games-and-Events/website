import { error } from '@sveltejs/kit';
import { canEditCourses } from '$lib/server/auth/roles.js';
import { classroomHome } from '$lib/server/courses/home.js';

/**
 * The Classroom home. Teachers: their courses, what's next on each, their
 * updates, numbers and earnings. Admins and editors get the same, plus the
 * approval pipeline of every course and what's waiting on an admin.
 */
export const load = async ({ locals, url, depends, setHeaders }) => {
	depends('desk:courses');
	if (!canEditCourses(locals.user)) throw error(403, 'Only teachers can manage courses.');
	setHeaders({ 'cache-control': 'private, no-store' });
	const d = Number(url.searchParams.get('days'));
	const days = [7, 30, 90].includes(d) ? d : 30;
	return { home: await classroomHome(locals.user, { days }) };
};
