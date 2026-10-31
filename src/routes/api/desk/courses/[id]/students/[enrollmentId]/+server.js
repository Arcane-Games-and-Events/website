import { removeStudent } from '$lib/server/courses/roster.js';
import { requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** DELETE: take a student out of the course (paying students: admins only). */
export async function DELETE({ params, locals }) {
	const course = await requireCourse(locals, params.id);
	return respond(async () => {
		await removeStudent(course, params.enrollmentId, locals.user);
		await logActivity(course.id, locals.user, 'student_removed', {
			data: { enrollmentId: params.enrollmentId }
		});
		return { ok: true };
	});
}
