import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, cmsModule } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireCmsAccess, canEditOwn } from '$lib/server/guards.js';

async function loadModuleWithCourse(moduleId) {
	const [m] = await db.select().from(cmsModule).where(eq(cmsModule.id, moduleId)).limit(1);
	if (!m) return null;
	const [c] = await db.select().from(cmsCourse).where(eq(cmsCourse.id, m.courseId)).limit(1);
	return { module: m, course: c };
}

export async function PATCH({ params, request, locals }) {
	const user = requireCmsAccess(locals);
	const ctx = await loadModuleWithCourse(params.moduleId);
	if (!ctx) throw error(404, 'Module not found');
	if (!canEditOwn(user, ctx.course.authorId)) throw error(403, 'Forbidden');

	const patch = await request.json().catch(() => ({}));
	const updates = { updatedAt: new Date() };
	if ('title' in patch) updates.title = patch.title || ctx.module.title;
	if ('position' in patch && Number.isInteger(patch.position)) updates.position = patch.position;
	await db.update(cmsModule).set(updates).where(eq(cmsModule.id, params.moduleId));
	const [m] = await db.select().from(cmsModule).where(eq(cmsModule.id, params.moduleId)).limit(1);
	return json({ module: m });
}

export async function DELETE({ params, locals }) {
	const user = requireCmsAccess(locals);
	const ctx = await loadModuleWithCourse(params.moduleId);
	if (!ctx) throw error(404, 'Module not found');
	if (!canEditOwn(user, ctx.course.authorId)) throw error(403, 'Forbidden');
	await db.delete(cmsModule).where(eq(cmsModule.id, params.moduleId));
	return json({ ok: true });
}
