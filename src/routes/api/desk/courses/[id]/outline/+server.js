import { outlineOf, saveOutline } from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** GET /api/desk/courses/[id]/outline */
export async function GET({ params, locals }) {
	await requireCourse(locals, params.id);
	return respond(async () => ({ outline: await outlineOf(params.id) }));
}

/** PUT /api/desk/courses/[id]/outline: { sections: [{ id, topicIds }] } in order. */
export async function PUT({ params, request, locals }) {
	await requireCourse(locals, params.id);
	const { sections } = await body(request);
	return respond(async () => {
		const outline = await saveOutline(params.id, sections);
		await logActivity(params.id, locals.user, 'outline_reordered');
		return { outline };
	});
}
