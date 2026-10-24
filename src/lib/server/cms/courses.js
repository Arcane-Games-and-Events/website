/**
 * Public list of published CMS courses — feeds the homepage Academy
 * section. Returns a card-shaped list (cover, author, lesson count,
 * total runtime) so the page template doesn't need to touch the schema.
 *
 * Cached in Redis under a per-limit key. There is no course mutation
 * path yet; when one lands it must bust `${CACHE_KEYS.COURSES}:cms:list:`
 * the same way `invalidateListCaches` in entries.js busts articles.
 */
import { db } from '$lib/server/db/index.js';
import { cmsCourse, cmsLesson, cmsMedia, user as userTable } from '$lib/server/db/schema.js';
import { alias } from 'drizzle-orm/pg-core';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

export async function listPublishedCourses({ limit = 6 } = {}) {
	return getCachedOrFetch(
		`${CACHE_KEYS.COURSES}:cms:list:${limit}`,
		() => queryPublishedCourses({ limit }),
		CACHE_TTL.LONG
	);
}

async function queryPublishedCourses({ limit }) {
	const cover = alias(cmsMedia, 'cover_media');
	const thumb = alias(cmsMedia, 'thumb_media');

	const rows = await db
		.select({
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
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(cmsCourse)
		.leftJoin(cover, eq(cmsCourse.coverImageId, cover.id))
		.leftJoin(thumb, eq(cmsCourse.thumbnailImageId, thumb.id))
		.leftJoin(userTable, eq(cmsCourse.authorId, userTable.id))
		.where(eq(cmsCourse.status, 'published'))
		.orderBy(desc(cmsCourse.publishedAt))
		.limit(limit);

	if (rows.length === 0) return [];

	// Lesson count + total video runtime per course, one grouped query.
	const agg = await db
		.select({
			courseId: cmsLesson.courseId,
			lessons: sql`count(*)::int`,
			seconds: sql`coalesce(sum(coalesce(${cmsLesson.videoDuration}, ${cmsLesson.youtubeDuration}, 0)), 0)::int`
		})
		.from(cmsLesson)
		.where(
			inArray(
				cmsLesson.courseId,
				rows.map((r) => r.id)
			)
		)
		.groupBy(cmsLesson.courseId);
	const aggById = new Map(agg.map((a) => [a.courseId, a]));

	return rows.map((r) => {
		const image = r.coverUrl
			? { src: r.coverUrl, alt: r.coverAlt || r.title || '' }
			: r.thumbUrl
				? { src: r.thumbUrl, alt: r.thumbAlt || r.title || '' }
				: null;
		const authorName = r.authorFirstName
			? `${r.authorFirstName} ${r.authorLastName || ''}`.trim()
			: null;
		const a = aggById.get(r.id);
		const price = Number(r.price) || 0;
		return {
			slug: r.slug,
			title: r.title,
			description: r.description,
			publishedAt: r.publishedAt,
			coverImage: image,
			author: authorName ? { name: authorName } : null,
			price,
			isFree: price === 0,
			premiumDiscountPct: r.premiumDiscountPct || 0,
			lessons: a?.lessons ?? 0,
			minutes: Math.round((a?.seconds ?? 0) / 60)
		};
	});
}
