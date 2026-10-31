import { createTopic } from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** POST /api/desk/courses/[id]/topics { sectionId, title } */
export async function POST({ params, request, locals }) {
	await requireCourse(locals, params.id);
	const { sectionId, title } = await body(request);
	return respond(async () => {
		const topic = await createTopic(params.id, { sectionId, title });
		await logActivity(params.id, locals.user, 'topic_added', { lessonId: topic.id });
		return { topic };
	});
}
