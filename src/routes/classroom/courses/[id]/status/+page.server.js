import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse } from '$lib/server/db/schema.js';
import { canOverseeCourses } from '$lib/server/auth/roles.js';
import { courseStatus } from '$lib/server/courses/oversight.js';

/** Admins and editors: where this course stands, what's open, its money and its history. */
export const load = async ({ params, parent, locals, depends }) => {
	depends('desk:course');
	await parent();
	if (!canOverseeCourses(locals.user))
		throw error(403, 'Only admins and editors can see a course’s status page.');
	const [course] = await db.select().from(deskCourse).where(eq(deskCourse.id, params.id)).limit(1);
	return { status: await courseStatus(course) };
};
