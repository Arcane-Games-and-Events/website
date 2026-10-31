/**
 * Studio shows: a podcast or an interview series. Episodes are Studio items
 * (`vods`) with `show_id` set; the public site lists a show's episodes on
 * /studios/shows/[slug].
 */
import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia, studioShow, vod } from '$lib/server/db/schema.js';
import { mediaImagesById } from '$lib/server/media/library.js';
import { bump } from '$lib/server/cache/index.js';
import { titleToSlug, withSuffix } from '$lib/desk/slug.js';
import { VideoError } from '$lib/server/video/mux.js';

export const SHOW_KINDS = ['podcast', 'interview', 'video'];

const clean = (v, max) => {
	const s = String(v ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
	return s || null;
};

/** A web address no other show has. */
async function freeSlug(desired, exceptId = null) {
	const base = titleToSlug(desired) || 'show';
	for (let i = 1; i < 200; i++) {
		const slug = i === 1 ? base : withSuffix(base, i);
		const where = exceptId
			? and(eq(studioShow.slug, slug), ne(studioShow.id, exceptId))
			: eq(studioShow.slug, slug);
		const [taken] = await db.select({ id: studioShow.id }).from(studioShow).where(where).limit(1);
		if (!taken) return slug;
	}
	throw new VideoError(409, 'Pick a different web address.');
}

async function fieldsFrom(input, current = null) {
	const out = {};
	if ('name' in input || !current) {
		const name = clean(input.name, 120);
		if (!name) throw new VideoError(400, 'Give the show a name.');
		out.name = name;
	}
	if ('kind' in input) {
		if (!SHOW_KINDS.includes(input.kind)) throw new VideoError(400, 'Unknown kind of show.');
		out.kind = input.kind;
	}
	if ('host' in input) out.host = clean(input.host, 200);
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
			const [row] = await db
				.select({ id: deskMedia.id })
				.from(deskMedia)
				.where(eq(deskMedia.id, id))
				.limit(1);
			if (!row) throw new VideoError(400, 'That image no longer exists.');
		}
		out.coverImageId = id;
	}
	if ('slug' in input && current) out.slug = await freeSlug(input.slug || out.name, current.id);
	return out;
}

export async function createShow(user, input) {
	const fields = await fieldsFrom(input);
	const [row] = await db
		.insert(studioShow)
		.values({ ...fields, slug: await freeSlug(input.slug || fields.name), createdBy: user.id })
		.returning();
	await bump('vods');
	return row;
}

export async function updateShow(row, input) {
	const fields = await fieldsFrom(input, row);
	const [updated] = await db
		.update(studioShow)
		.set({ ...fields, updatedAt: new Date() })
		.where(eq(studioShow.id, row.id))
		.returning();
	await bump('vods');
	return updated;
}

/** Only a show with no episodes can be deleted. */
export async function deleteShow(row) {
	const [{ n }] = await db
		.select({ n: sql`count(*)::int` })
		.from(vod)
		.where(eq(vod.showId, row.id));
	if (Number(n))
		throw new VideoError(409, 'Move or delete its episodes first, or mark the show inactive.');
	await db.delete(studioShow).where(eq(studioShow.id, row.id));
	await bump('vods');
}

export async function getShow(id) {
	if (!id) return null;
	const [row] = await db.select().from(studioShow).where(eq(studioShow.id, id)).limit(1);
	return row ?? null;
}

export async function getShowBySlug(slug) {
	const [row] = await db.select().from(studioShow).where(eq(studioShow.slug, slug)).limit(1);
	return row ?? null;
}

/**
 * Shows with their cover and episode counts (all episodes for the Studio,
 * published ones for readers), in the order they're listed.
 */
export async function listShows({ publicOnly = false } = {}) {
	const rows = await db
		.select({
			show: studioShow,
			episodes: publicOnly
				? sql`(select count(*)::int from vods v where v.show_id = studio_show.id and v.is_published and v.status = 'ready')`
				: sql`(select count(*)::int from vods v where v.show_id = studio_show.id)`,
			latestAt: sql`(select max(v.published_at) from vods v where v.show_id = studio_show.id and v.is_published)`
		})
		.from(studioShow)
		.where(publicOnly ? eq(studioShow.isActive, true) : undefined)
		.orderBy(asc(studioShow.sortOrder), desc(studioShow.createdAt));
	const images = await mediaImagesById(rows.map((r) => r.show.coverImageId));
	return rows
		.filter((r) => !publicOnly || Number(r.episodes) > 0)
		.map((r) => {
			const img = r.show.coverImageId ? images[r.show.coverImageId] : null;
			return {
				...r.show,
				cover: img ? { ...img, alt: img.alt || r.show.name } : null,
				episodes: Number(r.episodes) || 0,
				latestAt: r.latestAt ? new Date(r.latestAt) : null
			};
		});
}
