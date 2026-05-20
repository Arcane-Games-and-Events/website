import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, cmsModule } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireCmsAccess, canEditOwn } from '$lib/server/guards.js';
import { createModule } from '$lib/server/cms/courses.js';

export async function POST({ params, request, locals }) {
	const user = requireCmsAccess(locals);
	const [course] = await db.select().from(cmsCourse).where(eq(cmsCourse.id, params.id)).limit(1);
	if (!course) throw error(404, 'Course not found');
	if (!canEditOwn(user, course.authorId)) throw error(403, 'Forbidden');

	const body = await request.json().catch(() => ({}));
	const m = await createModule(course.id, body.title);
	return json({ module: m }, { status: 201 });
}
