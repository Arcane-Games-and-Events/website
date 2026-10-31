/**
 * The student's My courses page (/my-courses): what's been happening in
 * their courses (new threads, teacher updates, new topics) and the raw
 * activity behind their stats (topics finished, posts written). Streaks,
 * the activity grid and milestones are worked out in the browser so they
 * follow the student's own time zone.
 */
import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseEnrollment,
	coursePost,
	deskCourse,
	deskLesson,
	deskLessonProgress,
	user as userTable
} from '$lib/server/db/schema.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { isNewSince } from './access.js';

/** How far back the feed looks. */
const FEED_DAYS = 120;
const EXCERPT = 220;

/**
 * Recent happenings across the student's courses, newest first: threads
 * started (teacher updates marked as such) and topics added since launch.
 * Only visible posts; a topic is flagged `premiumOnly` when this student
 * would need Premium to open it.
 */
export async function courseFeed(user, { limit = 40 } = {}) {
	if (!user) return [];
	const enrollments = await db
		.select({ enrollment: courseEnrollment })
		.from(courseEnrollment)
		.where(and(eq(courseEnrollment.userId, user.id), isNull(courseEnrollment.revokedAt)));
	if (!enrollments.length) return [];
	const byCourse = new Map(enrollments.map(({ enrollment }) => [enrollment.courseId, enrollment]));
	const courseIds = [...byCourse.keys()];
	const since = new Date(Date.now() - FEED_DAYS * 86400000);

	const [threads, topics] = await Promise.all([
		db
			.select({
				id: coursePost.id,
				kind: coursePost.kind,
				title: coursePost.title,
				excerpt: sql`left(${coursePost.body}, ${EXCERPT + 1})`,
				createdAt: coursePost.createdAt,
				lastReplyAt: coursePost.lastReplyAt,
				authorId: coursePost.authorId,
				authorFirst: userTable.firstName,
				authorLast: userTable.lastName,
				replies: sql`(select count(*)::int from course_post r where r.parent_id = ${coursePost.id} and r.status = 'visible' and r.deleted_at is null)`,
				courseSlug: deskCourse.slug,
				courseTitle: deskCourse.title,
				courseAuthorId: deskCourse.authorId,
				lessonTitle: deskLesson.title
			})
			.from(coursePost)
			.innerJoin(deskCourse, eq(coursePost.courseId, deskCourse.id))
			.leftJoin(userTable, eq(coursePost.authorId, userTable.id))
			.leftJoin(deskLesson, eq(coursePost.lessonId, deskLesson.id))
			.where(
				and(
					inArray(coursePost.courseId, courseIds),
					isNull(coursePost.parentId),
					isNull(coursePost.deletedAt),
					eq(coursePost.status, 'visible'),
					gte(coursePost.createdAt, since)
				)
			)
			.orderBy(desc(coursePost.createdAt))
			.limit(limit),
		db
			.select({
				id: deskLesson.id,
				slug: deskLesson.slug,
				title: deskLesson.title,
				isPreview: deskLesson.isPreview,
				firstPublishedAt: deskLesson.firstPublishedAt,
				courseId: deskLesson.courseId,
				courseSlug: deskCourse.slug,
				courseTitle: deskCourse.title
			})
			.from(deskLesson)
			.innerJoin(deskCourse, eq(deskLesson.courseId, deskCourse.id))
			.where(
				and(
					inArray(deskLesson.courseId, courseIds),
					isNotNull(deskLesson.publishedAt),
					gte(deskLesson.firstPublishedAt, since),
					// Topics that went live with the course aren't news.
					gt(deskLesson.firstPublishedAt, deskCourse.firstPublishedAt),
					ne(deskCourse.status, 'draft')
				)
			)
			.orderBy(desc(deskLesson.firstPublishedAt))
			.limit(limit)
	]);

	const premium = userHasPremiumAccess(user);
	const items = [
		...threads.map((t) => {
			const text = String(t.excerpt || '');
			return {
				type: t.kind === 'update' ? 'update' : 'thread',
				id: t.id,
				at: t.createdAt,
				title: t.title,
				excerpt: text.length > EXCERPT ? `${text.slice(0, EXCERPT).trimEnd()}…` : text,
				author: t.authorFirst ? `${t.authorFirst} ${t.authorLast || ''}`.trim() : 'Former student',
				byTeacher: !!t.authorId && t.authorId === t.courseAuthorId,
				mine: t.authorId === user.id,
				replies: Number(t.replies) || 0,
				lastReplyAt: t.lastReplyAt,
				topic: t.lessonTitle || null,
				course: { slug: t.courseSlug, title: t.courseTitle },
				href: `/academy/${t.courseSlug}/discussion/${t.id}`
			};
		}),
		...topics.map((t) => ({
			type: 'topic',
			id: t.id,
			at: t.firstPublishedAt,
			title: t.title,
			premiumOnly: !t.isPreview && !premium && isNewSince(t, byCourse.get(t.courseId)),
			course: { slug: t.courseSlug, title: t.courseTitle },
			href: `/academy/${t.courseSlug}/${t.slug}`
		}))
	];
	return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

/**
 * Everything the stats are made from: each finished topic (when, and its
 * reading time) and each post the student wrote, plus how many replies
 * other people left on their threads.
 */
export async function learnerActivity(userId) {
	if (!userId) return { completions: [], posts: [], repliesReceived: 0 };
	const [completions, posts, [received]] = await Promise.all([
		db
			.select({
				at: deskLessonProgress.completedAt,
				minutes: deskLesson.readTime,
				courseId: deskLesson.courseId
			})
			.from(deskLessonProgress)
			.innerJoin(deskLesson, eq(deskLessonProgress.lessonId, deskLesson.id))
			.where(and(eq(deskLessonProgress.userId, userId), isNotNull(deskLessonProgress.completedAt)))
			.orderBy(desc(deskLessonProgress.completedAt))
			.limit(5000),
		db
			.select({ at: coursePost.createdAt, reply: sql`${coursePost.parentId} is not null` })
			.from(coursePost)
			.where(
				and(
					eq(coursePost.authorId, userId),
					isNull(coursePost.deletedAt),
					ne(coursePost.status, 'removed')
				)
			)
			.orderBy(desc(coursePost.createdAt))
			.limit(5000),
		db
			.select({ n: sql`count(*)::int` })
			.from(coursePost)
			.where(
				and(
					sql`${coursePost.parentId} in (select t.id from course_post t where t.author_id = ${userId})`,
					ne(coursePost.authorId, userId),
					eq(coursePost.status, 'visible'),
					isNull(coursePost.deletedAt)
				)
			)
	]);
	return {
		completions: completions.map((c) => ({
			at: c.at,
			minutes: c.minutes || 0,
			courseId: c.courseId
		})),
		posts: posts.map((p) => ({ at: p.at, reply: !!p.reply })),
		repliesReceived: Number(received?.n) || 0
	};
}
