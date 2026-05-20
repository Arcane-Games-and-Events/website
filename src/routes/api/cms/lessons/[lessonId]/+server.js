import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, cmsModule, cmsLesson } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireCmsAccess, canEditOwn } from '$lib/server/guards.js';
import { updateLesson } from '$lib/server/cms/courses.js';

async function loadLessonWithCourse(lessonId) {
	const [l] = await db.select().from(cmsLesson).where(eq(cmsLesson.id, lessonId)).limit(1);
	if (!l) return null;
	const [m] = await db.select().from(cmsModule).where(eq(cmsModule.id, l.moduleId)).limit(1);
	const [c] = m ? await db.select().from(cmsCourse).where(eq(cmsCourse.id, m.courseId)).limit(1) : [null];
	return { lesson: l, module: m, course: c };
}

export async function GET({ params, locals }) {
	const user = requireCmsAccess(locals);
	const ctx = await loadLessonWithCourse(params.lessonId);
	if (!ctx) throw error(404, 'Lesson not found');
	if (!canEditOwn(user, ctx.course?.authorId)) throw error(403, 'Forbidden');
	return json({ lesson: ctx.lesson });
}

export async function PATCH({ params, request, locals }) {
	const user = requireCmsAccess(locals);
	const ctx = await loadLessonWithCourse(params.lessonId);
	if (!ctx) throw error(404, 'Lesson not found');
	if (!canEditOwn(user, ctx.course?.authorId)) throw error(403, 'Forbidden');

	const patch = await request.json().catch(() => ({}));
	const updated = await updateLesson(params.lessonId, patch, user);
	return json({ lesson: updated });
}

export async function DELETE({ params, locals }) {
	const user = requireCmsAccess(locals);
	const ctx = await loadLessonWithCourse(params.lessonId);
	if (!ctx) throw error(404, 'Lesson not found');
	if (!canEditOwn(user, ctx.course?.authorId)) throw error(403, 'Forbidden');

	await db.delete(cmsLesson).where(eq(cmsLesson.id, params.lessonId));
	return json({ ok: true });
}
