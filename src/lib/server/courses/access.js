/**
 * Who can do what with a course.
 *
 * - A course belongs to its teacher (`author_id`, holding the creator role).
 *   Teachers manage only their own courses; admins manage every course.
 *   Editors and writers have no course access.
 * - Students take a course through a live `course_enrollment` (bought once,
 *   kept forever, or added free by the teacher or an admin).
 * - A topic marked Free to read (`is_preview`) is open to everyone once it is
 *   published, signed in or not.
 * - A topic first published after a student enrolled is open to them only
 *   while they are a Premium member. That is what Premium adds to a course.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseEnrollment, deskCourse } from '$lib/server/db/schema.js';
import { canEditCourses, canOverseeCourses } from '$lib/server/auth/roles.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

/** The course's own teacher, or an admin or editor (they oversee every course). */
export function canManageCourse(user, course) {
	if (!user || !course) return false;
	if (canOverseeCourses(user)) return true;
	return canEditCourses(user) && !!course.authorId && course.authorId === user.id;
}

/** Load a course the user may manage, or a reason it can't be. */
export async function managedCourse(user, courseId) {
	if (!user) return { error: 401 };
	const [course] = await db.select().from(deskCourse).where(eq(deskCourse.id, courseId)).limit(1);
	if (!course) return { error: 404 };
	if (!canManageCourse(user, course)) return { error: 403 };
	return { course };
}

/** The student's live enrollment in a course, if any. */
export async function enrollmentFor(userId, courseId) {
	if (!userId) return null;
	const [row] = await db
		.select()
		.from(courseEnrollment)
		.where(
			and(
				eq(courseEnrollment.userId, userId),
				eq(courseEnrollment.courseId, courseId),
				isNull(courseEnrollment.revokedAt)
			)
		)
		.limit(1);
	return row || null;
}

/** 'owner' (teacher or admin) | 'enrolled' | 'none' */
export function courseRole(user, course, enrollment) {
	if (canManageCourse(user, course)) return 'owner';
	if (enrollment && !enrollment.revokedAt) return 'enrolled';
	return 'none';
}

/**
 * Can this person read this topic?
 *
 * @returns {'open' | 'locked-premium' | 'locked' | 'hidden'}
 *   open            show the topic
 *   locked-premium  enrolled, but the topic is new since they enrolled and
 *                   they aren't Premium: show the upgrade prompt
 *   locked          not enrolled: show the course paywall
 *   hidden          a draft, or the course isn't public: don't show it at all
 */
export function lessonAccess(user, course, lesson, enrollment) {
	const owner = canManageCourse(user, course);
	if (owner) return 'open';
	if (course.status !== 'published' && course.status !== 'archived') return 'hidden';
	if (!lesson.publishedAt) return 'hidden';
	if (lesson.isPreview) return 'open';
	if (!enrollment || enrollment.revokedAt) return 'locked';
	if (isNewSince(lesson, enrollment) && !userHasPremiumAccess(user)) return 'locked-premium';
	return 'open';
}

/** Was this topic first published after the student enrolled? */
export function isNewSince(lesson, enrollment) {
	if (!lesson.firstPublishedAt || !enrollment) return false;
	return new Date(lesson.firstPublishedAt) > new Date(enrollment.createdAt);
}

/** A course is visible to the public once approved; archived ones only to their students. */
export function courseIsPublic(course) {
	return course?.status === 'published';
}
