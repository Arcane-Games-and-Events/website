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
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, lte, sql } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { mediaImage, mediaColumns } from '$lib/server/desk/image.js';

/**
 * Query the DB for published entries + related media/author rows. Cached
 * per limit so the homepage's slice and the library's full list don't stomp
 * on each other; any entry or media write makes both stale. Five minutes at
 * most, so a scheduled entry goes live without a write.
 */
export async function listPublishedEntries({ limit = 100, authorId = null } = {}) {
	const key = authorId
		? `articles:desk:list:${limit}:by:${authorId}`
		: `articles:desk:list:${limit}`;
	return cached(key, () => queryPublishedEntries({ limit, authorId }), {
		tags: ['entries', 'media'],
		ttl: CACHE_TTL.FIVE_MINUTES
	});
}

/** Entries readers can see: published, or scheduled for a time that's passed. */
const live = (now = new Date()) =>
	or(
		eq(deskEntry.status, 'published'),
		and(eq(deskEntry.status, 'scheduled'), lte(deskEntry.scheduledFor, now))
	);

/** Entry rows with their pictures and author, as cards (tags included). */
async function entryRows({ where, order = [desc(deskEntry.publishedAt)], limit, offset = 0 }) {
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
		.where(where)
		.orderBy(...order)
		.limit(limit)
		.offset(offset);

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

function queryPublishedEntries({ limit, authorId }) {
	return entryRows({
		where: and(live(), authorId ? eq(deskEntry.authorId, authorId) : undefined),
		limit
	});
}

export const LIBRARY_PER_PAGE = 12;

/** `kind`: written pieces have no video; videos do. */
const kindIs = (kind) =>
	kind === 'article'
		? isNull(deskEntry.videoProvider)
		: kind === 'video'
			? isNotNull(deskEntry.videoProvider)
			: undefined;

/**
 * One page of the Library's articles or videos (or both), searched and
 * filtered on the server. The search matches the title, the summary, the
 * author's name and the topic.
 *
 * @param {{ q?: string, kind?: 'article' | 'video' | '', access?: 'free' | 'premium' | '',
 *   tag?: string, sort?: 'newest' | 'oldest', page?: number, perPage?: number }} opts
 */
export function searchEntries({
	q = '',
	kind = '',
	access = '',
	tag = '',
	sort = 'newest',
	page = 1,
	perPage = LIBRARY_PER_PAGE
} = {}) {
	const key = `articles:desk:search:${kind || 'all'}|${access || 'all'}|${tag || 'all'}|${sort}|${perPage}|${page}|${q.toLowerCase() || 'all'}`;
	return cached(
		key,
		async () => {
			const where = [live(), kindIs(kind)];
			if (access === 'free' || access === 'premium') where.push(eq(deskEntry.accessMode, access));
			if (tag)
				where.push(
					sql`exists (select 1 from ${deskEntryTag} et join ${deskTag} t on t.id = et.tag_id where et.entry_id = ${deskEntry.id} and t.slug = ${tag})`
				);
			if (q) {
				const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
				where.push(
					or(
						ilike(deskEntry.title, like),
						ilike(deskEntry.excerpt, like),
						sql`exists (select 1 from ${userTable} u where u.id = ${deskEntry.authorId} and (u.first_name || ' ' || coalesce(u.last_name, '')) ilike ${like})`,
						sql`exists (select 1 from ${deskEntryTag} et join ${deskTag} t on t.id = et.tag_id where et.entry_id = ${deskEntry.id} and t.name ilike ${like})`
					)
				);
			}
			const all = and(...where);
			const [[{ total }], items] = await Promise.all([
				db
					.select({ total: sql`count(*)::int` })
					.from(deskEntry)
					.where(all),
				entryRows({
					where: all,
					order: [sort === 'oldest' ? asc(deskEntry.publishedAt) : desc(deskEntry.publishedAt)],
					limit: perPage,
					offset: (page - 1) * perPage
				})
			]);
			return {
				items,
				total: Number(total),
				page,
				totalPages: Math.max(1, Math.ceil(Number(total) / perPage))
			};
		},
		{ tags: ['entries', 'media'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/** Topics with live pieces, most first: { name, slug, count }. */
export function libraryTopics() {
	return cached(
		'articles:desk:topics',
		async () => {
			const rows = await db
				.select({ name: deskTag.name, slug: deskTag.slug, count: sql`count(*)::int` })
				.from(deskTag)
				.innerJoin(deskEntryTag, eq(deskEntryTag.tagId, deskTag.id))
				.innerJoin(deskEntry, eq(deskEntryTag.entryId, deskEntry.id))
				.where(live())
				.groupBy(deskTag.id)
				.orderBy(desc(sql`count(*)`), asc(deskTag.name));
			return rows.map((r) => ({ ...r, count: Number(r.count) }));
		},
		{ tags: ['entries'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}

/** How many written pieces and videos the Library holds. */
export function libraryCounts() {
	return cached(
		'articles:desk:counts',
		async () => {
			const [row] = await db
				.select({
					articles: sql`count(*) filter (where ${deskEntry.videoProvider} is null)::int`,
					videos: sql`count(*) filter (where ${deskEntry.videoProvider} is not null)::int`
				})
				.from(deskEntry)
				.where(live());
			return { articles: Number(row?.articles) || 0, videos: Number(row?.videos) || 0 };
		},
		{ tags: ['entries'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
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
