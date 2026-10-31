import { setListed } from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** POST /api/desk/courses/[id]/listing { listed }: unlist or relist an approved course. */
export async function POST({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const { listed } = await body(request);
	return respond(async () => {
		const updated = await setListed(course, !!listed);
		await logActivity(course.id, locals.user, listed ? 'listed' : 'unlisted');
		return { course: updated };
	});
}
