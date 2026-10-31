import { deleteCourse, updateCourse } from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** PATCH /api/desk/courses/[id]: title, slug, description, price, cover, thumbnail. */
export async function PATCH({ params, request, locals }) {
	const course = await requireCourse(locals, params.id);
	const b = await body(request);
	const fields = {};
	for (const k of ['title', 'slug', 'description', 'price', 'coverImageId', 'thumbnailImageId'])
		if (k in b) fields[k] = b[k];
	return respond(async () => {
		const updated = await updateCourse(course, fields);
		// What changed, with before and after for the fields that matter most.
		const changes = {};
		for (const k of Object.keys(fields)) {
			if (String(course[k] ?? '') === String(updated[k] ?? '')) continue;
			changes[k] = k === 'description' ? true : { from: course[k] ?? null, to: updated[k] ?? null };
		}
		if (Object.keys(changes).length)
			await logActivity(course.id, locals.user, 'details_changed', { data: changes });
		return { course: updated };
	});
}

/** DELETE /api/desk/courses/[id]: only a course nobody has joined. */
export async function DELETE({ params, locals }) {
	const course = await requireCourse(locals, params.id);
	return respond(async () => {
		await deleteCourse(course);
		return { ok: true };
	});
}
