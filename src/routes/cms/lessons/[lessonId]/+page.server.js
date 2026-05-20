import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsLesson, cmsModule, cmsCourse } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditOwn, userHasAnyRole } from '$lib/server/guards.js';

export async function load({ params, locals }) {
	if (!userHasAnyRole(locals.user, ['admin', 'creator'])) throw redirect(302, '/cms');

	const [lesson] = await db
		.select()
		.from(cmsLesson)
		.where(eq(cmsLesson.id, params.lessonId))
		.limit(1);
	if (!lesson) throw error(404, 'Lesson not found');

	const [module_] = await db
		.select()
		.from(cmsModule)
		.where(eq(cmsModule.id, lesson.moduleId))
		.limit(1);
	const [course] = module_
		? await db.select().from(cmsCourse).where(eq(cmsCourse.id, module_.courseId)).limit(1)
		: [null];

	if (!canEditOwn(locals.user, course?.authorId)) throw error(403, 'Forbidden');

	return { lesson, module: module_, course };
}
