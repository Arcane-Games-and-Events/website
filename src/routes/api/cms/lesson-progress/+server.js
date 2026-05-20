import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsLesson, cmsModule, cmsCourse, cmsLessonProgress } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { hasCourseAccess } from '$lib/server/cms/course-access.js';

/**
 * POST /api/cms/lesson-progress
 * Body: { lessonId, lastPositionSeconds, completed? }
 *
 * Upserts the user's progress on a lesson. Called periodically by the lesson
 * player. Best-effort — we silently no-op for unauthenticated users so the
 * client doesn't need to know whether the user is logged in.
 */
export async function POST({ request, locals }) {
	if (!locals.user) return json({ ok: true });

	const body = await request.json().catch(() => ({}));
	const { lessonId, lastPositionSeconds, completed } = body;
	if (!lessonId) return json({ error: 'lessonId required' }, { status: 400 });

	// Confirm access — preview lessons can be tracked too, otherwise must own course
	const [lesson] = await db.select().from(cmsLesson).where(eq(cmsLesson.id, lessonId)).limit(1);
	if (!lesson) return json({ error: 'Lesson not found' }, { status: 404 });
	const [m] = await db.select().from(cmsModule).where(eq(cmsModule.id, lesson.moduleId)).limit(1);
	const [course] = m
		? await db.select().from(cmsCourse).where(eq(cmsCourse.id, m.courseId)).limit(1)
		: [null];
	if (!course) return json({ error: 'Course not found' }, { status: 404 });

	const access = lesson.isPreview || (await hasCourseAccess(locals.user, course));
	if (!access) return json({ error: 'No access' }, { status: 403 });

	const existing = await db
		.select()
		.from(cmsLessonProgress)
		.where(
			and(
				eq(cmsLessonProgress.userId, locals.user.id),
				eq(cmsLessonProgress.lessonId, lessonId)
			)
		)
		.limit(1);

	const updates = {
		lastPositionSeconds: Math.max(0, parseInt(lastPositionSeconds || 0, 10)),
		updatedAt: new Date()
	};
	if (completed) updates.completedAt = new Date();

	if (existing.length === 0) {
		await db.insert(cmsLessonProgress).values({
			userId: locals.user.id,
			lessonId,
			...updates
		});
	} else {
		await db
			.update(cmsLessonProgress)
			.set(updates)
			.where(eq(cmsLessonProgress.id, existing[0].id));
	}

	return json({ ok: true });
}
