/**
 * Bonus gameplay (the `vods` table): the details shown with each match.
 * Uploading, replacing and deleting the video itself is in ./mux.js.
 */
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { vod, event, deskMedia } from '$lib/server/db/schema.js';
import { mediaImagesById } from '$lib/server/media/library.js';
import { bump } from '$lib/server/cache/index.js';
import { VideoError } from './mux.js';

const TEXT = {
	title: 200,
	description: 4000,
	player1Name: 120,
	player1Hero: 120,
	player2Name: 120,
	player2Hero: 120
};

const clean = (v, max) => {
	const s = String(v ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
	return s || null;
};

// Descriptions keep their line breaks.
const cleanBlock = (v, max) => {
	const s = String(v ?? '')
		.replace(/\r\n?/g, '\n')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
		.slice(0, max);
	return s || null;
};

/** The editable fields present in `input`, cleaned. Throws VideoError on bad values. */
async function fieldsFrom(input, { requireTitle }) {
	const out = {};
	for (const [k, max] of Object.entries(TEXT)) {
		if (k in input) out[k] = k === 'description' ? cleanBlock(input[k], max) : clean(input[k], max);
	}
	if (requireTitle || 'title' in input) {
		if (!out.title) throw new VideoError(400, 'Give the video a title.');
	}
	if ('eventId' in input) {
		const id = clean(input.eventId, 100);
		if (id) {
			const [row] = await db.select({ id: event.id }).from(event).where(eq(event.id, id)).limit(1);
			if (!row) throw new VideoError(400, 'That event no longer exists.');
		}
		out.eventId = id;
	}
	if ('isPremium' in input) out.isPremium = !!input.isPremium;
	if ('coverImageId' in input) {
		const id = input.coverImageId || null;
		if (id) {
			const [row] = await db
				.select({ id: deskMedia.id })
				.from(deskMedia)
				.where(eq(deskMedia.id, id))
				.limit(1)
				.catch(() => []);
			if (!row) throw new VideoError(400, 'That image no longer exists.');
		}
		out.coverImageId = id;
	}
	return out;
}

/** A new gameplay row, waiting for its video. */
export async function createGameplay(user, input) {
	const fields = await fieldsFrom(input, { requireTitle: true });
	const [row] = await db
		.insert(vod)
		.values({ isPremium: true, ...fields, status: 'waiting', createdBy: user.id })
		.returning();
	await bump('vods');
	return row;
}

/** Edit details, and publish or unpublish. Publishing needs a ready video. */
export async function updateGameplay(row, input) {
	const set = { ...(await fieldsFrom(input, { requireTitle: false })), updatedAt: new Date() };
	if ('isPublished' in input) {
		const publish = !!input.isPublished;
		if (publish && row.status !== 'ready') {
			throw new VideoError(409, 'The video has to finish processing before it can be published.');
		}
		set.isPublished = publish;
		if (publish && !row.publishedAt) set.publishedAt = new Date();
	}
	const [updated] = await db.update(vod).set(set).where(eq(vod.id, row.id)).returning();
	await bump('vods');
	return updated;
}

/**
 * Gameplay rows with their cover image attached as `cover` (the responsive
 * shape `<Picture>` takes), or null when there's no cover. One query for
 * the whole list.
 * @template {{ coverImageId?: string | null, title?: string }} T
 * @param {T[]} rows
 * @returns {Promise<(T & { cover: any })[]>}
 */
export async function withCovers(rows) {
	const images = await mediaImagesById(rows.map((r) => r.coverImageId));
	return rows.map((r) => {
		const img = r.coverImageId ? images[r.coverImageId] : null;
		return { ...r, cover: img ? { ...img, alt: img.alt || r.title || '' } : null };
	});
}
