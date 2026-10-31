import { postUpdate } from '$lib/server/courses/discussion.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** POST { title, body }: a pinned update every student is told about. */
export async function POST({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const b = await body(request);
	return respond(async () => {
		const post = await postUpdate(course, locals.user, b);
		await logActivity(course.id, locals.user, 'update_posted', { data: { title: post.title } });
		return { post };
	});
}
