import { deleteSection, renameSection } from '$lib/server/courses/builder.js';
import { body, requireCourse, respond } from '$lib/server/courses/http.js';
import { logActivity } from '$lib/server/courses/activity.js';

/** PATCH { title } */
export async function PATCH({ params, request, locals }) {
	await requireCourse(locals, params.id);
	const { title } = await body(request);
	return respond(async () => {
		const section = await renameSection(params.id, params.sectionId, title);
		await logActivity(params.id, locals.user, 'section_renamed', {
			data: { title: section.title }
		});
		return { section };
	});
}

/** DELETE ?withTopics=1 to delete the topics in it too. */
export async function DELETE({ params, url, locals }) {
	await requireCourse(locals, params.id);
	return respond(async () => {
		const withTopics = url.searchParams.get('withTopics') === '1';
		await deleteSection(params.id, params.sectionId, { withTopics });
		await logActivity(params.id, locals.user, 'section_deleted', { data: { withTopics } });
		return { ok: true };
	});
}
