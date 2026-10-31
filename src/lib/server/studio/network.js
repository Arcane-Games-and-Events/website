/**
 * The AGE Network: outside creators' YouTube channels on AGE Studios.
 *
 * Staff add a creator once from their channel link. Syncing pulls the
 * channel's newest uploads in as candidates (Shorts are skipped); nothing
 * is public until staff feature it, and a sync never changes what's
 * featured. A featured video YouTube no longer plays (deleted, private,
 * embedding switched off) is marked unavailable and drops off the site.
 */
import { and, asc, count, desc, eq, ilike, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia, studioChannel, studioChannelVideo } from '$lib/server/db/schema.js';
import { bump } from '$lib/server/cache/index.js';
import { mediaImagesById } from '$lib/server/media/library.js';
import { titleToSlug, withSuffix } from '$lib/desk/slug.js';
import { VideoError } from '$lib/server/video/mux.js';
import {
	channelUploads,
	extractYouTubeVideoId,
	resolveChannel,
	stillAvailable,
	videoDetails
} from '$lib/server/video/youtube.js';

export const CHANNEL_KINDS = ['podcast', 'video'];
/** How stale a channel can get before the hourly job syncs it again. */
const SYNC_EVERY_MS = 60 * 60 * 1000;

const clean = (v, max) => {
	const s = String(v ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
	return s || null;
};

/** A web address no other creator has. */
async function freeSlug(desired, exceptId = null) {
	const base = titleToSlug(desired) || 'creator';
	for (let i = 1; i < 200; i++) {
		const slug = i === 1 ? base : withSuffix(base, i);
		const where = exceptId
			? and(eq(studioChannel.slug, slug), ne(studioChannel.id, exceptId))
			: eq(studioChannel.slug, slug);
		const [taken] = await db
			.select({ id: studioChannel.id })
			.from(studioChannel)
			.where(where)
			.limit(1);
		if (!taken) return slug;
	}
	throw new VideoError(409, 'Pick a different web address.');
}

export async function getChannel(id) {
	if (!id) return null;
	const [row] = await db.select().from(studioChannel).where(eq(studioChannel.id, id)).limit(1);
	return row ?? null;
}

export async function getVideo(id) {
	if (!id) return null;
	const [row] = await db
		.select()
		.from(studioChannelVideo)
		.where(eq(studioChannelVideo.id, id))
		.limit(1);
	return row ?? null;
}

/** Look a channel link up without saving anything: the preview before adding. */
export async function previewChannel(link) {
	const c = await resolveChannel(link);
	const [existing] = await db
		.select({ id: studioChannel.id, name: studioChannel.name })
		.from(studioChannel)
		.where(eq(studioChannel.youtubeChannelId, c.channelId))
		.limit(1);
	return { ...c, existing: existing ?? null };
}

/** Add a creator from their channel link, then pull in their uploads. */
export async function addChannel(user, input) {
	const c = await resolveChannel(input.url);
	const [existing] = await db
		.select({ id: studioChannel.id })
		.from(studioChannel)
		.where(eq(studioChannel.youtubeChannelId, c.channelId))
		.limit(1);
	if (existing) throw new VideoError(409, 'That creator is already in the network.');
	const kind = CHANNEL_KINDS.includes(input.kind) ? input.kind : 'video';
	const [row] = await db
		.insert(studioChannel)
		.values({
			slug: await freeSlug(c.handle || c.name),
			name: clean(c.name, 120) || 'Untitled channel',
			kind,
			youtubeChannelId: c.channelId,
			youtubeUrl: c.url,
			handle: c.handle,
			avatarUrl: c.avatarUrl,
			bannerUrl: c.bannerUrl,
			description: c.description ? String(c.description).slice(0, 4000) : null,
			createdBy: user.id
		})
		.returning();
	const sync = await syncChannel(row).catch((err) => ({ error: err.message }));
	return { channel: (await getChannel(row.id)) ?? row, sync };
}

export async function updateChannel(row, input) {
	const out = {};
	if ('name' in input) {
		const name = clean(input.name, 120);
		if (!name) throw new VideoError(400, 'Give the creator a name.');
		out.name = name;
	}
	if ('kind' in input) {
		if (!CHANNEL_KINDS.includes(input.kind)) throw new VideoError(400, 'Unknown kind of creator.');
		out.kind = input.kind;
	}
	if ('description' in input) {
		out.description =
			String(input.description ?? '')
				.replace(/\r\n?/g, '\n')
				.trim()
				.slice(0, 4000) || null;
	}
	if ('isActive' in input) out.isActive = !!input.isActive;
	if ('sortOrder' in input)
		out.sortOrder = Math.max(0, Math.min(999, Number(input.sortOrder) || 0));
	if ('coverImageId' in input) {
		const id = input.coverImageId || null;
		if (id) {
			const [img] = await db
				.select({ id: deskMedia.id })
				.from(deskMedia)
				.where(eq(deskMedia.id, id))
				.limit(1);
			if (!img) throw new VideoError(400, 'That image no longer exists.');
		}
		out.coverImageId = id;
	}
	if ('slug' in input) out.slug = await freeSlug(input.slug || out.name || row.name, row.id);
	const [updated] = await db
		.update(studioChannel)
		.set({ ...out, updatedAt: new Date() })
		.where(eq(studioChannel.id, row.id))
		.returning();
	await bump('vods');
	return updated;
}

/** Remove a creator and every video of theirs from the site. */
export async function deleteChannel(row) {
	await db.delete(studioChannel).where(eq(studioChannel.id, row.id));
	await bump('vods');
}

const videoValues = (channelId, v) => ({
	channelId,
	youtubeVideoId: v.youtubeVideoId,
	title: clean(v.title, 300) || 'Untitled',
	description: v.description ? String(v.description).slice(0, 5000) : null,
	publishedAt: v.publishedAt,
	thumbnailUrl: v.thumbnailUrl,
	duration: v.duration,
	isShort: !!v.isShort,
	isAvailable: v.available !== false
});

/**
 * Pull a channel's newest uploads in. New ones arrive unfeatured; known
 * ones get their title, picture and length refreshed. Featured videos are
 * checked against YouTube and dropped from the site if they've gone.
 * Returns `{ added, seen }`; records the outcome on the channel either way.
 */
export async function syncChannel(row) {
	try {
		const uploads = await channelUploads({ channelId: row.youtubeChannelId });
		const keep = uploads.filter((v) => v.youtubeVideoId && !v.isShort);

		let added = 0;
		if (keep.length) {
			const known = new Set(
				(
					await db
						.select({ y: studioChannelVideo.youtubeVideoId })
						.from(studioChannelVideo)
						.where(
							inArray(
								studioChannelVideo.youtubeVideoId,
								keep.map((v) => v.youtubeVideoId)
							)
						)
				).map((r) => r.y)
			);
			added = keep.filter((v) => !known.has(v.youtubeVideoId)).length;
			await db
				.insert(studioChannelVideo)
				.values(keep.map((v) => videoValues(row.id, v)))
				.onConflictDoUpdate({
					target: studioChannelVideo.youtubeVideoId,
					set: {
						title: sql`excluded.title`,
						description: sql`excluded.description`,
						thumbnailUrl: sql`excluded.thumbnail_url`,
						duration: sql`coalesce(excluded.duration, ${studioChannelVideo.duration})`,
						publishedAt: sql`coalesce(excluded.published_at, ${studioChannelVideo.publishedAt})`,
						isAvailable: sql`excluded.is_available`,
						updatedAt: new Date()
					},
					// Only this channel's rows; a video can't move between channels.
					setWhere: eq(studioChannelVideo.channelId, row.id)
				});
		}

		// Featured videos the uploads list didn't cover: still on YouTube?
		const seen = new Set(keep.map((v) => v.youtubeVideoId));
		const featured = (
			await db
				.select({ y: studioChannelVideo.youtubeVideoId })
				.from(studioChannelVideo)
				.where(
					and(eq(studioChannelVideo.channelId, row.id), eq(studioChannelVideo.isFeatured, true))
				)
		)
			.map((r) => r.y)
			.filter((y) => !seen.has(y));
		if (featured.length) {
			const ok = await stillAvailable(featured);
			const gone = featured.filter((y) => !ok.has(y));
			const back = featured.filter((y) => ok.has(y));
			if (gone.length)
				await db
					.update(studioChannelVideo)
					.set({ isAvailable: false, updatedAt: new Date() })
					.where(inArray(studioChannelVideo.youtubeVideoId, gone));
			if (back.length)
				await db
					.update(studioChannelVideo)
					.set({ isAvailable: true })
					.where(
						and(
							inArray(studioChannelVideo.youtubeVideoId, back),
							eq(studioChannelVideo.isAvailable, false)
						)
					);
		}

		await db
			.update(studioChannel)
			.set({ lastSyncedAt: new Date(), syncError: null })
			.where(eq(studioChannel.id, row.id));
		await bump('vods');
		return { added, seen: keep.length };
	} catch (err) {
		await db
			.update(studioChannel)
			.set({ lastSyncedAt: new Date(), syncError: String(err?.message || err).slice(0, 500) })
			.where(eq(studioChannel.id, row.id));
		throw err;
	}
}

/**
 * Sync the active channels that are due, oldest first, a few per run so a
 * cron call stays short. Failures are recorded on the channel, not thrown.
 */
export async function syncDue({ limit = 8, now = new Date() } = {}) {
	const due = await db
		.select()
		.from(studioChannel)
		.where(
			and(
				eq(studioChannel.isActive, true),
				or(
					isNull(studioChannel.lastSyncedAt),
					lt(studioChannel.lastSyncedAt, new Date(now.getTime() - SYNC_EVERY_MS))
				)
			)
		)
		.orderBy(sql`${studioChannel.lastSyncedAt} asc nulls first`)
		.limit(limit);
	const results = [];
	for (const row of due) {
		try {
			results.push({ id: row.id, ...(await syncChannel(row)) });
		} catch (err) {
			results.push({ id: row.id, error: err.message });
		}
	}
	return results;
}

/**
 * Add one video of this creator's by its link — for an older upload the
 * sync didn't reach — and feature it. It must be from their channel.
 */
export async function addVideoByLink(user, channel, link) {
	const id = extractYouTubeVideoId(link);
	if (!id) throw new VideoError(400, 'Paste a link to a YouTube video.');
	const v = await videoDetails(id);
	if (!v) throw new VideoError(404, 'YouTube doesn’t have that video (or it’s private).');
	const ours = v.channelId
		? v.channelId === channel.youtubeChannelId
		: !!v.authorUrl &&
			[channel.youtubeUrl, channel.handle && `https://www.youtube.com/@${channel.handle}`]
				.filter(Boolean)
				.some((u) => u.toLowerCase() === String(v.authorUrl).toLowerCase());
	if (!ours) throw new VideoError(400, `That video isn’t from ${channel.name}’s channel.`);
	if (!v.available) throw new VideoError(400, 'That video can’t be played on other sites.');

	const [existing] = await db
		.select()
		.from(studioChannelVideo)
		.where(eq(studioChannelVideo.youtubeVideoId, id))
		.limit(1);
	const row =
		existing ??
		(await db.insert(studioChannelVideo).values(videoValues(channel.id, v)).returning())[0];
	return setFeatured(user, row, true);
}

/** Feature a video on the site, or take it off. */
export async function setFeatured(user, row, featured) {
	const [updated] = await db
		.update(studioChannelVideo)
		.set(
			featured
				? {
						isFeatured: true,
						featuredAt: row.isFeatured ? row.featuredAt : new Date(),
						featuredBy: row.isFeatured ? row.featuredBy : user.id,
						updatedAt: new Date()
					}
				: {
						isFeatured: false,
						featuredAt: null,
						featuredBy: null,
						sortOrder: null,
						updatedAt: new Date()
					}
		)
		.where(eq(studioChannelVideo.id, row.id))
		.returning();
	await bump('vods');
	return updated;
}

/** Hand order for a creator's featured videos: `ids` first to last. */
export async function orderFeatured(channel, ids) {
	const list = Array.isArray(ids) ? ids.filter((x) => typeof x === 'string').slice(0, 500) : [];
	await db.transaction(async (tx) => {
		await tx
			.update(studioChannelVideo)
			.set({ sortOrder: null })
			.where(eq(studioChannelVideo.channelId, channel.id));
		for (const [i, id] of list.entries()) {
			await tx
				.update(studioChannelVideo)
				.set({ sortOrder: i })
				.where(and(eq(studioChannelVideo.id, id), eq(studioChannelVideo.channelId, channel.id)));
		}
	});
	await bump('vods');
}

/** The picture for a creator: the Studio image staff chose, else their YouTube avatar. */
export async function withAvatars(rows) {
	const images = await mediaImagesById(rows.map((r) => r.coverImageId));
	return rows.map((r) => {
		const img = r.coverImageId ? images[r.coverImageId] : null;
		return { ...r, avatar: img?.src || img?.url || r.avatarUrl || null, image: img ?? null };
	});
}

/** Every creator for the Studio: counts, newest upload and how the last sync went. */
export async function listChannels() {
	const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
	const rows = await db
		.select({
			c: studioChannel,
			videos: count(studioChannelVideo.id),
			featured: sql`count(*) filter (where ${studioChannelVideo.isFeatured} and ${studioChannelVideo.isAvailable})::int`,
			unavailable: sql`count(*) filter (where ${studioChannelVideo.isFeatured} and not ${studioChannelVideo.isAvailable})::int`,
			fresh: sql`count(*) filter (where not ${studioChannelVideo.isFeatured} and ${studioChannelVideo.publishedAt} > ${weekAgo}::timestamptz)::int`,
			newestAt: sql`max(${studioChannelVideo.publishedAt})`
		})
		.from(studioChannel)
		.leftJoin(studioChannelVideo, eq(studioChannelVideo.channelId, studioChannel.id))
		.groupBy(studioChannel.id)
		.orderBy(asc(studioChannel.sortOrder), asc(studioChannel.name));
	const withPics = await withAvatars(rows.map((r) => r.c));
	return rows.map((r, i) => ({
		...withPics[i],
		videos: Number(r.videos) || 0,
		featured: Number(r.featured) || 0,
		unavailable: Number(r.unavailable) || 0,
		fresh: Number(r.fresh) || 0,
		newestAt: r.newestAt ? new Date(r.newestAt) : null
	}));
}

/**
 * A creator's videos for the picker: featured first (in their order),
 * then everything else newest first. `show` is all | featured | new.
 */
export async function channelVideos(channelId, { show = 'all', q = '' } = {}) {
	const where = [eq(studioChannelVideo.channelId, channelId)];
	if (show === 'featured') where.push(eq(studioChannelVideo.isFeatured, true));
	if (show === 'new') where.push(eq(studioChannelVideo.isFeatured, false));
	if (q) {
		const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
		where.push(ilike(studioChannelVideo.title, like));
	}
	return db
		.select()
		.from(studioChannelVideo)
		.where(and(...where))
		.orderBy(
			desc(studioChannelVideo.isFeatured),
			sql`${studioChannelVideo.sortOrder} asc nulls last`,
			desc(studioChannelVideo.publishedAt)
		)
		.limit(200);
}

/** For the Studio home: creators, new uploads this week, failed syncs. */
export async function networkSummary() {
	const channels = await listChannels();
	return {
		creators: channels.length,
		fresh: channels.reduce((n, c) => n + c.fresh, 0),
		featured: channels.reduce((n, c) => n + c.featured, 0),
		failing: channels
			.filter((c) => c.syncError)
			.map((c) => ({ id: c.id, name: c.name, error: c.syncError })),
		gone: channels.reduce((n, c) => n + c.unavailable, 0)
	};
}
