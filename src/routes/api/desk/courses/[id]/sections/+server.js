import { createSection } from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** POST /api/desk/courses/[id]/sections { title } */
export async function POST({ params, request, locals }) {
	await requireCourse(locals, params.id);
	const { title } = await body(request);
	return respond(async () => {
		const section = await createSection(params.id, { title });
		await logActivity(params.id, locals.user, 'section_added', { data: { title: section.title } });
		return { section };
	});
}
