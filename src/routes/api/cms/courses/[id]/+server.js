import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireCmsAccess, canEditOwn, userHasAnyRole } from '$lib/server/guards.js';
import { updateCourse } from '$lib/server/cms/courses.js';

async function loadCourse(id) {
	const [row] = await db.select().from(cmsCourse).where(eq(cmsCourse.id, id)).limit(1);
	return row || null;
}

export async function GET({ params, locals }) {
	const user = requireCmsAccess(locals);
	const course = await loadCourse(params.id);
	if (!course) throw error(404, 'Course not found');
	if (!canEditOwn(user, course.authorId)) throw error(403, 'Forbidden');
	return json({ course });
}

export async function PATCH({ params, request, locals }) {
	const user = requireCmsAccess(locals);
	const course = await loadCourse(params.id);
	if (!course) throw error(404, 'Course not found');
	if (!canEditOwn(user, course.authorId)) throw error(403, 'Forbidden');

	const patch = await request.json().catch(() => ({}));
	if (patch.status === 'published' && !userHasAnyRole(user, 'admin')) {
		throw error(403, 'Only an admin can publish');
	}
	const updated = await updateCourse(params.id, patch);
	return json({ course: updated });
}

export async function DELETE({ params, locals }) {
	const user = requireCmsAccess(locals);
	const course = await loadCourse(params.id);
	if (!course) throw error(404, 'Course not found');
	if (!canEditOwn(user, course.authorId)) throw error(403, 'Forbidden');
	if (course.status !== 'draft' && !userHasAnyRole(user, 'admin')) {
		throw error(400, 'Only draft courses can be deleted. Archive instead.');
	}
	await db.delete(cmsCourse).where(eq(cmsCourse.id, params.id));
	return json({ ok: true });
}
