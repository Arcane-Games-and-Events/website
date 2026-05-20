import { redirect, error } from '@sveltejs/kit';
import { canEditOwn, userHasAnyRole } from '$lib/server/guards.js';
import { getCourseStructure } from '$lib/server/cms/courses.js';

export async function load({ params, locals }) {
	if (!userHasAnyRole(locals.user, ['admin', 'creator'])) throw redirect(302, '/cms');

	const struct = await getCourseStructure(params.id);
	if (!struct) throw error(404, 'Course not found');
	if (!canEditOwn(locals.user, struct.course.authorId)) throw error(403, 'Forbidden');

	return { course: struct.course, modules: struct.modules };
}
