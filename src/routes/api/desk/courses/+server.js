import { error } from '@sveltejs/kit';
import { canEditCourses } from '$lib/server/auth/roles.js';
import { createCourse } from '$lib/server/courses/builder.js';
import { body, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** POST /api/desk/courses: a teacher (or admin) starts a new draft course. */
export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Sign in first.');
	if (!canEditCourses(locals.user)) throw error(403, 'Only teachers can create courses.');
	const { title } = await body(request);
	return respond(async () => {
		const course = await createCourse(locals.user, { title });
		await logActivity(course.id, locals.user, 'created', { data: { title: course.title } });
		return { course };
	});
}
