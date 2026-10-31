import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse, deskLesson } from '$lib/server/db/schema.js';
import { enrollmentFor, lessonAccess } from '$lib/server/courses/access.js';
import { setComplete } from '$lib/server/courses/progress.js';

/**
 * POST /api/academy/progress { lessonId, complete }
 * A student marks a topic done (or not done). Only for a topic they can open
 * in a course they're enrolled in.
 */
export async function POST({ request, locals }) {
	const user = locals.user;
	if (!user) return json({ error: 'Sign in first.' }, { status: 401 });
	const { lessonId, complete = true } = await request.json().catch(() => ({}));
	if (typeof lessonId !== 'string') return json({ error: 'Bad request' }, { status: 400 });

	const [lesson] = await db.select().from(deskLesson).where(eq(deskLesson.id, lessonId)).limit(1);
	if (!lesson) return json({ error: 'Not found' }, { status: 404 });
	const [course] = await db
		.select()
		.from(deskCourse)
		.where(eq(deskCourse.id, lesson.courseId))
		.limit(1);
	const enrollment = await enrollmentFor(user.id, course.id);
	if (!enrollment || lessonAccess(user, course, lesson, enrollment) !== 'open')
		return json({ error: 'Not enrolled' }, { status: 403 });

	await setComplete(user.id, lesson.id, !!complete);
	return json({ ok: true, complete: !!complete });
}
