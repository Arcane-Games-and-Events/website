/**
 * Public list of CMS entries — used by the homepage "Newest from AGE" section
 * and the library index. Returns a card-shaped list that both surfaces
 * consume without further transformation.
 *
 * Public-visibility filter:
 *   - status = 'published' — the normal case.
 *   - status = 'scheduled' with a scheduledFor time already in the past —
 *     the DB status might lag behind reality until the next update touches
 *     the row, so we treat past-scheduled entries as live everywhere.
 *
 * Card shape mirrors what the legacy Payload path produced so downstream
 * page templates work unchanged after the swap. Premium entries stay
 * premium forever on the CMS (per the article-access memory note) — no
 * 30-day-to-free cutover, so `isFreeNow` is always false.
 */
import { db } from '$lib/server/db/index.js';
import { cmsEntry, cmsMedia, user as userTable } from '$lib/server/db/schema.js';
import { alias } from 'drizzle-orm/pg-core';
import { and, desc, eq, or, lte } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

/**
 * Query the DB for published entries + related media/author rows. Cached in
 * Redis under a per-limit key so the homepage's 12-item slice and the
 * library's full list don't stomp on each other.
 */
export async function listPublishedEntries({ limit = 100 } = {}) {
	return getCachedOrFetch(
		`${CACHE_KEYS.ARTICLES}:cms:list:${limit}`,
		() => queryPublishedEntries({ limit }),
		CACHE_TTL.LONG
	);
}

async function queryPublishedEntries({ limit }) {
	const now = new Date();
	const cover = alias(cmsMedia, 'cover_media');
	const thumb = alias(cmsMedia, 'thumb_media');

	const rows = await db
		.select({
			slug: cmsEntry.slug,
			title: cmsEntry.title,
			excerpt: cmsEntry.excerpt,
			publishedAt: cmsEntry.publishedAt,
			accessMode: cmsEntry.accessMode,
			readTime: cmsEntry.readTime,
			videoProvider: cmsEntry.videoProvider,
			videoDurationMux: cmsEntry.videoDuration,
			videoDurationYoutube: cmsEntry.youtubeDuration,
			youtubeThumbnailUrl: cmsEntry.youtubeThumbnailUrl,
			coverUrl: cover.url,
			coverAlt: cover.alt,
			thumbUrl: thumb.url,
			thumbAlt: thumb.alt,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(cmsEntry)
		.leftJoin(cover, eq(cmsEntry.coverImageId, cover.id))
		.leftJoin(thumb, eq(cmsEntry.thumbnailImageId, thumb.id))
		.leftJoin(userTable, eq(cmsEntry.authorId, userTable.id))
		.where(
			or(
				eq(cmsEntry.status, 'published'),
				and(eq(cmsEntry.status, 'scheduled'), lte(cmsEntry.scheduledFor, now))
			)
		)
		.orderBy(desc(cmsEntry.publishedAt))
		.limit(limit);

	return rows.map((r) => {
		// Thumbnail defaults to cover if no explicit thumbnail — matches
		// what the reader-page render logic falls back to. When neither a
		// cover nor a thumbnail is set on a video entry, fall further back
		// to the YouTube thumbnail so video entries always have some
		// visual in the card grid.
		const image = r.thumbUrl
			? { src: r.thumbUrl, alt: r.thumbAlt || r.title || '' }
			: r.coverUrl
				? { src: r.coverUrl, alt: r.coverAlt || r.title || '' }
				: r.youtubeThumbnailUrl
					? { src: r.youtubeThumbnailUrl, alt: r.title || '' }
					: null;
		const authorName = r.authorFirstName
			? `${r.authorFirstName} ${r.authorLastName || ''}`.trim()
			: null;
		const videoDuration = r.videoDurationMux ?? r.videoDurationYoutube ?? null;
		return {
			slug: r.slug,
			title: r.title,
			excerpt: r.excerpt,
			publishedAt: r.publishedAt,
			accessMode: r.accessMode,
			coverImage: image,
			author: authorName
				? {
						name: authorName,
						slug: null,
						profilePicture: null
					}
				: null,
			tags: [],
			readTime: r.readTime,
			isPremium: r.accessMode === 'premium',
			isFreeNow: false,
			hasVideo: !!r.videoProvider,
			videoProvider: r.videoProvider || null,
			videoDuration
		};
	});
}
