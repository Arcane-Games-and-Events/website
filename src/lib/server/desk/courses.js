/**
 * Public read side of Desk courses — the Academy index and course pages,
 * and the homepage Academy section.
 *
 * - `listPublishedCourses`  card-shaped list (cover, author, lesson count,
 *                           runtime, modules, preview lessons)
 * - `listPreviewLessons`    lessons flagged as free previews, with their
 *                           course, for the "watch free" rail
 * - `getPublishedCourseBySlug`  one course with its syllabus (modules →
 *                           lessons) for /academy/[slug]; published, or
 *                           unlisted (archived) for the students who have it
 * - `getCourseWithDrafts`   the same, uncached, with draft topics, for the
 *                           course's teacher to preview
 * - `loadCourseProgress`    per-user completion per course (uncached)
 *
 * Only published topics (`published_at` set) are ever listed to readers.
 * List + course reads are cached with the `courses` and `media` tags; the
 * course builder (src/lib/server/courses/builder.js) bumps `courses`.
 */
import { db } from '$lib/server/db/index.js';
import {
	deskCourse,
	deskModule,
	deskLesson,
	deskLessonProgress,
	deskMedia,
	user as userTable
} from '$lib/server/db/schema.js';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { cached } from '$lib/server/cache/index.js';
import { mediaImage, mediaColumns } from '$lib/server/desk/image.js';

const COURSE_TAGS = { tags: ['courses', 'media'] };

const LESSON_SECONDS = sql`coalesce(${deskLesson.videoDuration}, ${deskLesson.youtubeDuration}, coalesce(${deskLesson.readTime}, 0) * 60)`;

export async function listPublishedCourses({ limit = 6 } = {}) {
	return cached(`courses:desk:list:${limit}`, () => queryPublishedCourses({ limit }), COURSE_TAGS);
}

export async function listPreviewLessons({ limit = 6 } = {}) {
	return cached(
		`courses:desk:previews:${limit}`,
		() => queryPreviewLessons({ limit }),
		COURSE_TAGS
	);
}

export async function getPublishedCourseBySlug(slug) {
	if (!slug) return null;
	return cached(`courses:desk:course:${slug}`, () => queryCourseBySlug(slug), COURSE_TAGS);
}

/** Any status, draft topics included. Uncached: only the teacher sees it. */
export async function getCourseWithDrafts(slug) {
	if (!slug) return null;
	return queryCourseBySlug(slug, { drafts: true });
}

const LIVE_TOPIC = isNotNull(deskLesson.publishedAt);

/* ============ queries ============ */

function courseSelect(cover, thumb) {
	return {
		id: deskCourse.id,
		slug: deskCourse.slug,
		title: deskCourse.title,
		description: deskCourse.description,
		price: deskCourse.price,
		status: deskCourse.status,
		publishedAt: deskCourse.publishedAt,
		firstPublishedAt: deskCourse.firstPublishedAt,
		cover: mediaColumns(cover),
		thumb: mediaColumns(thumb),
		authorId: userTable.id,
		authorFirstName: userTable.firstName,
		authorLastName: userTable.lastName
	};
}

function shapeCourse(r, agg) {
	const image = mediaImage(r.cover, r.title || '') ?? mediaImage(r.thumb, r.title || '');
	const authorName = r.authorFirstName
		? `${r.authorFirstName} ${r.authorLastName || ''}`.trim()
		: null;
	const price = Number(r.price) || 0;
	return {
		id: r.id,
		slug: r.slug,
		title: r.title,
		description: r.description,
		status: r.status,
		publishedAt: r.publishedAt,
		firstPublishedAt: r.firstPublishedAt,
		authorId: r.authorId,
		coverImage: image,
		author: authorName ? { id: r.authorId, name: authorName } : null,
		price,
		isFree: price === 0,
		lessons: agg?.lessons ?? 0,
		previewLessons: agg?.previews ?? 0,
		modules: agg?.modules ?? 0,
		minutes: Math.round((agg?.seconds ?? 0) / 60)
	};
}

async function aggregateLessons(courseIds) {
	if (!courseIds.length) return new Map();
	const agg = await db
		.select({
			courseId: deskLesson.courseId,
			lessons: sql`count(*)::int`,
			previews: sql`count(*) filter (where ${deskLesson.isPreview})::int`,
			modules: sql`count(distinct ${deskLesson.moduleId})::int`,
			seconds: sql`coalesce(sum(${LESSON_SECONDS}), 0)::int`
		})
		.from(deskLesson)
		.where(and(inArray(deskLesson.courseId, courseIds), LIVE_TOPIC))
		.groupBy(deskLesson.courseId);
	return new Map(agg.map((a) => [a.courseId, a]));
}

async function queryPublishedCourses({ limit }) {
	const cover = alias(deskMedia, 'cover_media');
	const thumb = alias(deskMedia, 'thumb_media');
	const rows = await db
		.select(courseSelect(cover, thumb))
		.from(deskCourse)
		.leftJoin(cover, eq(deskCourse.coverImageId, cover.id))
		.leftJoin(thumb, eq(deskCourse.thumbnailImageId, thumb.id))
		.leftJoin(userTable, eq(deskCourse.authorId, userTable.id))
		.where(eq(deskCourse.status, 'published'))
		.orderBy(desc(deskCourse.publishedAt))
		.limit(limit);
	if (rows.length === 0) return [];
	const aggById = await aggregateLessons(rows.map((r) => r.id));
	return rows.map((r) => shapeCourse(r, aggById.get(r.id)));
}

async function queryPreviewLessons({ limit }) {
	const rows = await db
		.select({
			id: deskLesson.id,
			slug: deskLesson.slug,
			title: deskLesson.title,
			seconds: LESSON_SECONDS,
			hasVideo: sql`(${deskLesson.videoProvider} is not null or ${deskLesson.videoDuration} is not null or ${deskLesson.youtubeDuration} is not null)`,
			courseSlug: deskCourse.slug,
			courseTitle: deskCourse.title,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(deskLesson)
		.innerJoin(deskCourse, eq(deskLesson.courseId, deskCourse.id))
		.leftJoin(userTable, eq(deskCourse.authorId, userTable.id))
		.where(and(eq(deskLesson.isPreview, true), LIVE_TOPIC, eq(deskCourse.status, 'published')))
		.orderBy(desc(deskCourse.publishedAt), asc(deskLesson.position))
		.limit(limit);
	return rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		title: r.title,
		minutes: Math.max(1, Math.round((Number(r.seconds) || 0) / 60)),
		hasVideo: !!r.hasVideo,
		courseSlug: r.courseSlug,
		courseTitle: r.courseTitle,
		instructor: r.authorFirstName ? `${r.authorFirstName} ${r.authorLastName || ''}`.trim() : null
	}));
}

async function queryCourseBySlug(slug, { drafts = false } = {}) {
	const cover = alias(deskMedia, 'cover_media');
	const thumb = alias(deskMedia, 'thumb_media');
	const [row] = await db
		.select(courseSelect(cover, thumb))
		.from(deskCourse)
		.leftJoin(cover, eq(deskCourse.coverImageId, cover.id))
		.leftJoin(thumb, eq(deskCourse.thumbnailImageId, thumb.id))
		.leftJoin(userTable, eq(deskCourse.authorId, userTable.id))
		.where(
			drafts
				? eq(deskCourse.slug, slug)
				: and(eq(deskCourse.slug, slug), inArray(deskCourse.status, ['published', 'archived']))
		)
		.limit(1);
	if (!row) return null;

	const [modules, lessons, aggById] = await Promise.all([
		db
			.select({ id: deskModule.id, title: deskModule.title, position: deskModule.position })
			.from(deskModule)
			.where(eq(deskModule.courseId, row.id))
			.orderBy(asc(deskModule.position)),
		db
			.select({
				id: deskLesson.id,
				moduleId: deskLesson.moduleId,
				slug: deskLesson.slug,
				title: deskLesson.title,
				position: deskLesson.position,
				isPreview: deskLesson.isPreview,
				publishedAt: deskLesson.publishedAt,
				firstPublishedAt: deskLesson.firstPublishedAt,
				seconds: LESSON_SECONDS,
				hasVideo: sql`(${deskLesson.videoProvider} is not null or ${deskLesson.videoDuration} is not null or ${deskLesson.youtubeDuration} is not null)`,
				readTime: deskLesson.readTime
			})
			.from(deskLesson)
			.where(
				drafts ? eq(deskLesson.courseId, row.id) : and(eq(deskLesson.courseId, row.id), LIVE_TOPIC)
			)
			.orderBy(asc(deskLesson.position)),
		aggregateLessons([row.id])
	]);

	const shapedLessons = lessons.map((l) => ({
		id: l.id,
		moduleId: l.moduleId,
		slug: l.slug,
		title: l.title,
		isPreview: !!l.isPreview,
		publishedAt: l.publishedAt,
		firstPublishedAt: l.firstPublishedAt,
		minutes: Math.max(1, Math.round((Number(l.seconds) || 0) / 60)),
		kind: l.hasVideo ? 'video' : 'reading'
	}));
	const syllabus = modules
		.map((m) => ({
			id: m.id,
			title: m.title,
			lessons: shapedLessons.filter((l) => l.moduleId === m.id)
		}))
		// Readers never see a section with nothing published in it.
		.filter((m) => drafts || m.lessons.length);
	const orphans = shapedLessons.filter((l) => !l.moduleId);
	if (orphans.length) syllabus.push({ id: 'unsorted', title: 'Lessons', lessons: orphans });

	return { ...shapeCourse(row, aggById.get(row.id)), syllabus };
}

/**
 * Per-user progress for the Academy index: for every course the user has
 * touched, how many lessons are done out of how many, and when they were
 * last in it. Keyed by course slug. Never cached — it is personal.
 */
export async function loadCourseProgress(userId) {
	if (!userId) return {};
	const rows = await db
		.select({
			slug: deskCourse.slug,
			completed: sql`count(${deskLessonProgress.completedAt})::int`,
			touched: sql`count(*)::int`,
			lastAt: sql`max(${deskLessonProgress.updatedAt})`,
			lastLessonTitle: sql`(array_agg(${deskLesson.title} order by ${deskLessonProgress.updatedAt} desc))[1]`
		})
		.from(deskLessonProgress)
		.innerJoin(deskLesson, eq(deskLessonProgress.lessonId, deskLesson.id))
		.innerJoin(deskCourse, eq(deskLesson.courseId, deskCourse.id))
		.where(and(eq(deskLessonProgress.userId, userId), isNotNull(deskCourse.publishedAt)))
		.groupBy(deskCourse.slug);
	/** @type {Record<string, { completed: number, touched: number, lastAt: string | null, lastLessonTitle: string | null }>} */
	const out = {};
	for (const r of rows) {
		out[r.slug] = {
			completed: r.completed,
			touched: r.touched,
			lastAt: r.lastAt ? new Date(r.lastAt).toISOString() : null,
			lastLessonTitle: r.lastLessonTitle || null
		};
	}
	return out;
}
