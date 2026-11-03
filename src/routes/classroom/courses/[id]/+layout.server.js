import { error } from '@sveltejs/kit';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseEnrollment, user as userTable } from '$lib/server/db/schema.js';
import { canOverseeCourses, isAdmin } from '$lib/server/auth/roles.js';
import { managedCourse } from '$lib/server/courses/access.js';
import { readinessItems, reviewCount } from '$lib/server/courses/builder.js';
import { listActivity } from '$lib/server/courses/activity.js';
import { standing } from '$lib/server/courses/oversight.js';

/** One course in the Classroom: its teacher, or an admin or editor. */
export const load = async ({ locals, params, depends }) => {
	depends('desk:course');
	const r = await managedCourse(locals.user, params.id);
	if (r.error) throw error(r.error, r.error === 404 ? 'Course not found' : 'Not permitted');
	const course = r.course;
	const [[teacher], readiness, needsReview, log, [enrolled]] = await Promise.all([
		course.authorId
			? db
					.select({ firstName: userTable.firstName, lastName: userTable.lastName })
					.from(userTable)
					.where(eq(userTable.id, course.authorId))
					.limit(1)
			: Promise.resolve([]),
		readinessItems(course),
		reviewCount(course.id),
		course.status === 'draft' && course.reviewNote ? listActivity(course.id, { limit: 50 }) : null,
		// For the unlist dialog: everyone who keeps their access.
		db
			.select({ n: sql`count(*)::int` })
			.from(courseEnrollment)
			.where(and(eq(courseEnrollment.courseId, course.id), isNull(courseEnrollment.revokedAt)))
	]);
	const problems = readiness.filter((i) => !i.done);
	return {
		course,
		teacher: teacher ? `${teacher.firstName} ${teacher.lastName || ''}`.trim() : null,
		// The checklist before sending, and what's still missing (drafts only).
		readiness,
		problems: course.status === 'draft' ? problems.map((i) => i.problem) : [],
		standing: standing({
			...course,
			problems: problems.map((i) => i.problem),
			liveTopics: readiness.find((i) => i.key === 'topic')?.done ? 1 : 0,
			returnedAt: log?.find((a) => a.kind === 'returned')?.createdAt || null
		}),
		needsReview,
		students: Number(enrolled?.n) || 0,
		// Admins and editors oversee every course; money is for admins.
		admin: canOverseeCourses(locals.user),
		money: isAdmin(locals.user),
		ownsIt: course.authorId === locals.user.id
	};
};
