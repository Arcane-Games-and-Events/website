import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, cmsModule } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireCmsAccess, canEditOwn } from '$lib/server/guards.js';
import { createLesson } from '$lib/server/cms/courses.js';

export async function POST({ params, request, locals }) {
	const user = requireCmsAccess(locals);
	const [m] = await db.select().from(cmsModule).where(eq(cmsModule.id, params.moduleId)).limit(1);
	if (!m) throw error(404, 'Module not found');
	const [course] = await db.select().from(cmsCourse).where(eq(cmsCourse.id, m.courseId)).limit(1);
	if (!course) throw error(404, 'Course not found');
	if (!canEditOwn(user, course.authorId)) throw error(403, 'Forbidden');

	const body = await request.json().catch(() => ({}));
	const lesson = await createLesson(m.id, body.title);
	return json({ lesson }, { status: 201 });
}
