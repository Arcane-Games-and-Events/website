import { setListed } from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';
import { notifyClassroom } from '$lib/server/courses/notifications.js';

/** POST /api/desk/courses/[id]/listing { listed }: unlist or relist an approved course. */
export async function POST({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const { listed } = await body(request);
	return respond(async () => {
		const updated = await setListed(course, !!listed);
		await logActivity(course.id, locals.user, listed ? 'listed' : 'unlisted');
		// Only news to the teacher when someone else did it.
		await notifyClassroom(course, listed ? 'course_listed' : 'course_unlisted', {
			actorId: locals.user.id
		});
		return { course: updated };
	});
}
