/**
 * Where students are in their courses: the topic they opened last (to pick
 * up where they left off), which topics they've completed, and a summary
 * per course for the student dashboard.
 */
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseEnrollment,
	deskCourse,
	deskLesson,
	deskLessonProgress,
	deskMedia,
	deskModule
} from '$lib/server/db/schema.js';
import { mediaImage } from '$lib/server/desk/image.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { isNewSince } from './access.js';

/** The student opened a topic: remember it as their place in the course. */
export async function openLesson(enrollment, lessonId) {
	if (!enrollment) return;
	await db
		.update(courseEnrollment)
		.set({ lastLessonId: lessonId, lastSeenAt: new Date() })
		.where(eq(courseEnrollment.id, enrollment.id));
}

/** Mark a topic complete (or not). */
export async function setComplete(userId, lessonId, done) {
	const now = new Date();
	await db
		.insert(deskLessonProgress)
		.values({ userId, lessonId, completedAt: done ? now : null, updatedAt: now })
		.onConflictDoUpdate({
			target: [deskLessonProgress.userId, deskLessonProgress.lessonId],
			set: { completedAt: done ? now : null, updatedAt: now }
		});
}

/** Ids of the topics in a course the student has completed. */
export async function completedIn(userId, courseId) {
	if (!userId) return new Set();
	const rows = await db
		.select({ lessonId: deskLessonProgress.lessonId })
		.from(deskLessonProgress)
		.innerJoin(deskLesson, eq(deskLessonProgress.lessonId, deskLesson.id))
		.where(
			and(
				eq(deskLessonProgress.userId, userId),
				eq(deskLesson.courseId, courseId),
				isNotNull(deskLessonProgress.completedAt)
			)
		);
	return new Set(rows.map((r) => r.lessonId));
}

/**
 * Every course the student is enrolled in, most recently used first:
 * progress over the topics they can open, topics waiting for Premium, the
 * next topic to read and the one they opened last.
 */
export async function courseProgress(user) {
	if (!user) return [];
	const enrollments = await db
		.select({
			enrollment: courseEnrollment,
			course: {
				id: deskCourse.id,
				slug: deskCourse.slug,
				title: deskCourse.title,
				status: deskCourse.status,
				authorId: deskCourse.authorId,
				coverImageId: deskCourse.coverImageId,
				thumbnailImageId: deskCourse.thumbnailImageId
			}
		})
		.from(courseEnrollment)
		.innerJoin(deskCourse, eq(courseEnrollment.courseId, deskCourse.id))
		.where(and(eq(courseEnrollment.userId, user.id), isNull(courseEnrollment.revokedAt)))
		.orderBy(sql`coalesce(${courseEnrollment.lastSeenAt}, ${courseEnrollment.createdAt}) desc`);
	if (!enrollments.length) return [];
	const courseIds = enrollments.map((e) => e.course.id);

	const [topics, done, images] = await Promise.all([
		db
			.select({
				id: deskLesson.id,
				courseId: deskLesson.courseId,
				slug: deskLesson.slug,
				title: deskLesson.title,
				isPreview: deskLesson.isPreview,
				publishedAt: deskLesson.publishedAt,
				firstPublishedAt: deskLesson.firstPublishedAt,
				sectionPosition: deskModule.position
			})
			.from(deskLesson)
			.innerJoin(deskModule, eq(deskLesson.moduleId, deskModule.id))
			.where(and(inArray(deskLesson.courseId, courseIds), isNotNull(deskLesson.publishedAt)))
			.orderBy(asc(deskModule.position), asc(deskLesson.position)),
		db
			.select({ lessonId: deskLessonProgress.lessonId })
			.from(deskLessonProgress)
			.innerJoin(deskLesson, eq(deskLessonProgress.lessonId, deskLesson.id))
			.where(
				and(
					eq(deskLessonProgress.userId, user.id),
					inArray(deskLesson.courseId, courseIds),
					isNotNull(deskLessonProgress.completedAt)
				)
			),
		db
			.select()
			.from(deskMedia)
			.where(
				inArray(
					deskMedia.id,
					enrollments
						.flatMap((e) => [e.course.thumbnailImageId, e.course.coverImageId])
						.filter(Boolean)
						.concat(['00000000-0000-0000-0000-000000000000'])
				)
			)
	]);
	const completed = new Set(done.map((d) => d.lessonId));
	const mediaById = new Map(images.map((m) => [m.id, m]));
	const premium = userHasPremiumAccess(user);

	return enrollments.map(({ enrollment, course }) => {
		const all = topics.filter((t) => t.courseId === course.id);
		const open = all.filter((t) => t.isPreview || premium || !isNewSince(t, enrollment));
		const locked = all.length - open.length;
		const doneCount = open.filter((t) => completed.has(t.id)).length;
		const last = all.find((t) => t.id === enrollment.lastLessonId) || null;
		const next = open.find((t) => !completed.has(t.id)) || null;
		const media =
			mediaById.get(course.thumbnailImageId) || mediaById.get(course.coverImageId) || null;
		return {
			course: { id: course.id, slug: course.slug, title: course.title, status: course.status },
			image: media ? mediaImage(media, course.title) : null,
			enrolledAt: enrollment.createdAt,
			lastSeenAt: enrollment.lastSeenAt,
			topics: open.length,
			completed: doneCount,
			percent: open.length ? Math.round((doneCount / open.length) * 100) : 0,
			lockedForPremium: locked,
			last: last ? { slug: last.slug, title: last.title } : null,
			next: next ? { slug: next.slug, title: next.title } : null
		};
	});
}

/** The student's completed topics, newest first, across a course (for "recently done"). */
export async function recentCompletions(userId, limit = 5) {
	return db
		.select({ lessonId: deskLessonProgress.lessonId, completedAt: deskLessonProgress.completedAt })
		.from(deskLessonProgress)
		.where(and(eq(deskLessonProgress.userId, userId), isNotNull(deskLessonProgress.completedAt)))
		.orderBy(desc(deskLessonProgress.completedAt))
		.limit(limit);
}
