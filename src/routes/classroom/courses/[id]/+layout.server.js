import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { canOverseeCourses, isAdmin } from '$lib/server/auth/roles.js';
import { managedCourse } from '$lib/server/courses/access.js';
import { readinessOf, reviewCount } from '$lib/server/courses/builder.js';

/** One course in the Classroom: its teacher, or an admin or editor. */
export const load = async ({ locals, params, depends }) => {
	depends('desk:course');
	const r = await managedCourse(locals.user, params.id);
	if (r.error) throw error(r.error, r.error === 404 ? 'Course not found' : 'Not permitted');
	const course = r.course;
	const [teacher] = course.authorId
		? await db
				.select({ firstName: userTable.firstName, lastName: userTable.lastName })
				.from(userTable)
				.where(eq(userTable.id, course.authorId))
				.limit(1)
		: [];
	return {
		course,
		teacher: teacher ? `${teacher.firstName} ${teacher.lastName || ''}`.trim() : null,
		problems: course.status === 'draft' ? await readinessOf(course) : [],
		needsReview: await reviewCount(course.id),
		// Admins and editors oversee every course; money is for admins.
		admin: canOverseeCourses(locals.user),
		money: isAdmin(locals.user),
		ownsIt: course.authorId === locals.user.id
	};
};
