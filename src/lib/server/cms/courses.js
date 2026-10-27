/**
 * Public read side of CMS courses — the Academy index and course pages,
 * and the homepage Academy section.
 *
 * - `listPublishedCourses`  card-shaped list (cover, author, lesson count,
 *                           runtime, modules, preview lessons)
 * - `listPreviewLessons`    lessons flagged as free previews, with their
 *                           course, for the "watch free" rail
 * - `getPublishedCourseBySlug`  one course with its syllabus (modules →
 *                           lessons) for /academy/[slug]
 * - `loadCourseProgress`    per-user completion per course (uncached)
 *
 * List + course reads are cached in Redis under `courses:cms:…`. There
 * is no course mutation path yet; when one lands it must bust
 * `${CACHE_KEYS.COURSES}:cms:` the same way `invalidateListCaches` in
 * entries.js busts articles.
 */
import { db } from '$lib/server/db/index.js';
import {
	cmsCourse,
	cmsModule,
	cmsLesson,
	cmsLessonProgress,
	cmsMedia,
	user as userTable
} from '$lib/server/db/schema.js';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

const LESSON_SECONDS = sql`coalesce(${cmsLesson.videoDuration}, ${cmsLesson.youtubeDuration}, coalesce(${cmsLesson.readTime}, 0) * 60)`;

export async function listPublishedCourses({ limit = 6 } = {}) {
	return getCachedOrFetch(
		`${CACHE_KEYS.COURSES}:cms:list:${limit}`,
		() => queryPublishedCourses({ limit }),
		CACHE_TTL.LONG
	);
}

export async function listPreviewLessons({ limit = 6 } = {}) {
	return getCachedOrFetch(
		`${CACHE_KEYS.COURSES}:cms:previews:${limit}`,
		() => queryPreviewLessons({ limit }),
		CACHE_TTL.LONG
	);
}

export async function getPublishedCourseBySlug(slug) {
	if (!slug) return null;
	return getCachedOrFetch(
		`${CACHE_KEYS.COURSES}:cms:course:${slug}`,
		() => queryCourseBySlug(slug),
		CACHE_TTL.LONG
	);
}

/* ============ queries ============ */

function courseSelect(cover, thumb) {
	return {
		id: cmsCourse.id,
		slug: cmsCourse.slug,
		title: cmsCourse.title,
		description: cmsCourse.description,
		price: cmsCourse.price,
		premiumDiscountPct: cmsCourse.premiumDiscountPct,
		publishedAt: cmsCourse.publishedAt,
		coverUrl: cover.url,
		coverAlt: cover.alt,
		thumbUrl: thumb.url,
		thumbAlt: thumb.alt,
		authorId: userTable.id,
		authorFirstName: userTable.firstName,
		authorLastName: userTable.lastName
	};
}

function shapeCourse(r, agg) {
	const image = r.coverUrl
		? { src: r.coverUrl, alt: r.coverAlt || r.title || '' }
		: r.thumbUrl
			? { src: r.thumbUrl, alt: r.thumbAlt || r.title || '' }
			: null;
	const authorName = r.authorFirstName
		? `${r.authorFirstName} ${r.authorLastName || ''}`.trim()
		: null;
	const price = Number(r.price) || 0;
	return {
		id: r.id,
		slug: r.slug,
		title: r.title,
		description: r.description,
		publishedAt: r.publishedAt,
		coverImage: image,
		author: authorName ? { id: r.authorId, name: authorName } : null,
		price,
		isFree: price === 0,
		premiumDiscountPct: r.premiumDiscountPct || 0,
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
			courseId: cmsLesson.courseId,
			lessons: sql`count(*)::int`,
			previews: sql`count(*) filter (where ${cmsLesson.isPreview})::int`,
			modules: sql`count(distinct ${cmsLesson.moduleId})::int`,
			seconds: sql`coalesce(sum(${LESSON_SECONDS}), 0)::int`
		})
		.from(cmsLesson)
		.where(inArray(cmsLesson.courseId, courseIds))
		.groupBy(cmsLesson.courseId);
	return new Map(agg.map((a) => [a.courseId, a]));
}

async function queryPublishedCourses({ limit }) {
	const cover = alias(cmsMedia, 'cover_media');
	const thumb = alias(cmsMedia, 'thumb_media');
	const rows = await db
		.select(courseSelect(cover, thumb))
		.from(cmsCourse)
		.leftJoin(cover, eq(cmsCourse.coverImageId, cover.id))
		.leftJoin(thumb, eq(cmsCourse.thumbnailImageId, thumb.id))
		.leftJoin(userTable, eq(cmsCourse.authorId, userTable.id))
		.where(eq(cmsCourse.status, 'published'))
		.orderBy(desc(cmsCourse.publishedAt))
		.limit(limit);
	if (rows.length === 0) return [];
	const aggById = await aggregateLessons(rows.map((r) => r.id));
	return rows.map((r) => shapeCourse(r, aggById.get(r.id)));
}

async function queryPreviewLessons({ limit }) {
	const rows = await db
		.select({
			id: cmsLesson.id,
			slug: cmsLesson.slug,
			title: cmsLesson.title,
			seconds: LESSON_SECONDS,
			hasVideo: sql`(${cmsLesson.videoProvider} is not null or ${cmsLesson.videoDuration} is not null or ${cmsLesson.youtubeDuration} is not null)`,
			courseSlug: cmsCourse.slug,
			courseTitle: cmsCourse.title,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(cmsLesson)
		.innerJoin(cmsCourse, eq(cmsLesson.courseId, cmsCourse.id))
		.leftJoin(userTable, eq(cmsCourse.authorId, userTable.id))
		.where(and(eq(cmsLesson.isPreview, true), eq(cmsCourse.status, 'published')))
		.orderBy(desc(cmsCourse.publishedAt), asc(cmsLesson.position))
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

async function queryCourseBySlug(slug) {
	const cover = alias(cmsMedia, 'cover_media');
	const thumb = alias(cmsMedia, 'thumb_media');
	const [row] = await db
		.select(courseSelect(cover, thumb))
		.from(cmsCourse)
		.leftJoin(cover, eq(cmsCourse.coverImageId, cover.id))
		.leftJoin(thumb, eq(cmsCourse.thumbnailImageId, thumb.id))
		.leftJoin(userTable, eq(cmsCourse.authorId, userTable.id))
		.where(and(eq(cmsCourse.slug, slug), eq(cmsCourse.status, 'published')))
		.limit(1);
	if (!row) return null;

	const [modules, lessons, aggById] = await Promise.all([
		db
			.select({ id: cmsModule.id, title: cmsModule.title, position: cmsModule.position })
			.from(cmsModule)
			.where(eq(cmsModule.courseId, row.id))
			.orderBy(asc(cmsModule.position)),
		db
			.select({
				id: cmsLesson.id,
				moduleId: cmsLesson.moduleId,
				slug: cmsLesson.slug,
				title: cmsLesson.title,
				position: cmsLesson.position,
				isPreview: cmsLesson.isPreview,
				seconds: LESSON_SECONDS,
				hasVideo: sql`(${cmsLesson.videoProvider} is not null or ${cmsLesson.videoDuration} is not null or ${cmsLesson.youtubeDuration} is not null)`,
				readTime: cmsLesson.readTime
			})
			.from(cmsLesson)
			.where(eq(cmsLesson.courseId, row.id))
			.orderBy(asc(cmsLesson.position)),
		aggregateLessons([row.id])
	]);

	const shapedLessons = lessons.map((l) => ({
		id: l.id,
		moduleId: l.moduleId,
		slug: l.slug,
		title: l.title,
		isPreview: !!l.isPreview,
		minutes: Math.max(1, Math.round((Number(l.seconds) || 0) / 60)),
		kind: l.hasVideo ? 'video' : 'reading'
	}));
	const syllabus = modules.map((m) => ({
		id: m.id,
		title: m.title,
		lessons: shapedLessons.filter((l) => l.moduleId === m.id)
	}));
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
			slug: cmsCourse.slug,
			completed: sql`count(${cmsLessonProgress.completedAt})::int`,
			touched: sql`count(*)::int`,
			lastAt: sql`max(${cmsLessonProgress.updatedAt})`,
			lastLessonTitle: sql`(array_agg(${cmsLesson.title} order by ${cmsLessonProgress.updatedAt} desc))[1]`
		})
		.from(cmsLessonProgress)
		.innerJoin(cmsLesson, eq(cmsLessonProgress.lessonId, cmsLesson.id))
		.innerJoin(cmsCourse, eq(cmsLesson.courseId, cmsCourse.id))
		.where(and(eq(cmsLessonProgress.userId, userId), isNotNull(cmsCourse.publishedAt)))
		.groupBy(cmsCourse.slug);
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
