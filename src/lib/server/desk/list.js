/**
 * Public list of Desk entries — used by the homepage "Newest from AGE" section
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
 * premium forever on the Desk (per the article-access memory note) — no
 * 30-day-to-free cutover, so `isFreeNow` is always false.
 */
import { db } from '$lib/server/db/index.js';
import {
	deskEntry,
	deskEntryTag,
	deskMedia,
	deskTag,
	user as userTable
} from '$lib/server/db/schema.js';
import { alias } from 'drizzle-orm/pg-core';
import { and, desc, eq, inArray, or, lte } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { mediaImage, mediaColumns } from '$lib/server/desk/image.js';

/**
 * Query the DB for published entries + related media/author rows. Cached
 * per limit so the homepage's slice and the library's full list don't stomp
 * on each other; any entry or media write makes both stale. Five minutes at
 * most, so a scheduled entry goes live without a write.
 */
export async function listPublishedEntries({ limit = 100 } = {}) {
	return cached(`articles:desk:list:${limit}`, () => queryPublishedEntries({ limit }), {
		tags: ['entries', 'media'],
		ttl: CACHE_TTL.FIVE_MINUTES
	});
}

async function queryPublishedEntries({ limit }) {
	const now = new Date();
	const cover = alias(deskMedia, 'cover_media');
	const thumb = alias(deskMedia, 'thumb_media');

	const rows = await db
		.select({
			id: deskEntry.id,
			slug: deskEntry.slug,
			title: deskEntry.title,
			excerpt: deskEntry.excerpt,
			publishedAt: deskEntry.publishedAt,
			accessMode: deskEntry.accessMode,
			readTime: deskEntry.readTime,
			videoProvider: deskEntry.videoProvider,
			videoDurationMux: deskEntry.videoDuration,
			videoDurationYoutube: deskEntry.youtubeDuration,
			youtubeThumbnailUrl: deskEntry.youtubeThumbnailUrl,
			cover: mediaColumns(cover),
			thumb: mediaColumns(thumb),
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(deskEntry)
		.leftJoin(cover, eq(deskEntry.coverImageId, cover.id))
		.leftJoin(thumb, eq(deskEntry.thumbnailImageId, thumb.id))
		.leftJoin(userTable, eq(deskEntry.authorId, userTable.id))
		.where(
			or(
				eq(deskEntry.status, 'published'),
				and(eq(deskEntry.status, 'scheduled'), lte(deskEntry.scheduledFor, now))
			)
		)
		.orderBy(desc(deskEntry.publishedAt))
		.limit(limit);

	// Tags, one query for the whole page of rows.
	const tagsByEntry = await loadTagsForEntries(rows.map((r) => r.id));

	return rows.map((r) => {
		// Thumbnail defaults to cover if no explicit thumbnail — matches
		// what the reader-page render logic falls back to. When neither a
		// cover nor a thumbnail is set on a video entry, fall further back
		// to the YouTube thumbnail so video entries always have some
		// visual in the card grid.
		const image =
			mediaImage(r.thumb, r.title || '') ??
			mediaImage(r.cover, r.title || '') ??
			(r.youtubeThumbnailUrl ? { src: r.youtubeThumbnailUrl, alt: r.title || '' } : null);
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
			tags: tagsByEntry.get(r.id) ?? [],
			readTime: r.readTime,
			isPremium: r.accessMode === 'premium',
			isFreeNow: false,
			hasVideo: !!r.videoProvider,
			videoProvider: r.videoProvider || null,
			videoDuration
		};
	});
}

/**
 * Tags for a set of entry ids → Map<entryId, [{ name, slug }]>. Exported
 * so the single-entry reader can reuse it.
 */
export async function loadTagsForEntries(ids) {
	const map = new Map();
	if (!ids.length) return map;
	const rows = await db
		.select({ entryId: deskEntryTag.entryId, name: deskTag.name, slug: deskTag.slug })
		.from(deskEntryTag)
		.innerJoin(deskTag, eq(deskEntryTag.tagId, deskTag.id))
		.where(inArray(deskEntryTag.entryId, ids))
		.orderBy(deskTag.name);
	for (const r of rows) {
		if (!map.has(r.entryId)) map.set(r.entryId, []);
		map.get(r.entryId).push({ name: r.name, slug: r.slug });
	}
	return map;
}
