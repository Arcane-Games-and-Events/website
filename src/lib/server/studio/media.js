/**
 * The Studio's media (the `vods` table): bonus gameplay, podcast episodes,
 * interviews and other video, with the details shown with each. Uploading,
 * replacing and deleting the file itself is in $lib/server/video/mux.js.
 */
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { vod, event, deskMedia, studioShow } from '$lib/server/db/schema.js';
import { mediaImagesById } from '$lib/server/media/library.js';
import { bump } from '$lib/server/cache/index.js';
import { VideoError } from '$lib/server/video/mux.js';

/** What a Studio item can be. */
export const KINDS = ['gameplay', 'podcast', 'interview', 'video'];
export const KIND_LABEL = {
	gameplay: 'Bonus gameplay',
	podcast: 'Podcast',
	interview: 'Interview',
	video: 'Video'
};

const TEXT = {
	title: 200,
	description: 4000,
	player1Name: 120,
	player1Hero: 120,
	player2Name: 120,
	player2Hero: 120,
	guests: 300
};

const count = (v) => {
	if (v === null || v === '' || v === undefined) return null;
	const n = Number(v);
	if (!Number.isInteger(n) || n < 0 || n > 9999) throw new VideoError(400, 'Use a whole number.');
	return n;
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
		if (!out.title) throw new VideoError(400, 'Give it a title.');
	}
	if ('eventId' in input) {
		const id = clean(input.eventId, 100);
		if (id) {
			const [row] = await db.select({ id: event.id }).from(event).where(eq(event.id, id)).limit(1);
			if (!row) throw new VideoError(400, 'That event no longer exists.');
		}
		out.eventId = id;
	}
	if ('kind' in input) {
		if (!KINDS.includes(input.kind)) throw new VideoError(400, 'Unknown kind of media.');
		out.kind = input.kind;
	}
	if ('mediaType' in input) {
		if (input.mediaType !== 'video' && input.mediaType !== 'audio')
			throw new VideoError(400, 'Media is video or audio.');
		out.mediaType = input.mediaType;
	}
	if ('showId' in input) {
		const id = input.showId || null;
		if (id) {
			const [row] = await db
				.select({ id: studioShow.id })
				.from(studioShow)
				.where(eq(studioShow.id, id))
				.limit(1)
				.catch(() => []);
			if (!row) throw new VideoError(400, 'That show no longer exists.');
		}
		out.showId = id;
	}
	if ('season' in input) out.season = count(input.season);
	if ('episodeNumber' in input) out.episodeNumber = count(input.episodeNumber);
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

/**
 * Only podcasts can be audio, and only episodes and interviews belong to a
 * show; gameplay keeps its matchup. Fields that don't fit the kind are cleared.
 */
function fitKind(fields, current = {}) {
	const kind = fields.kind ?? current.kind ?? 'gameplay';
	if (kind !== 'podcast') fields.mediaType = 'video';
	if (kind === 'gameplay') {
		fields.showId = null;
		fields.season = null;
		fields.episodeNumber = null;
	}
	return kind;
}

/** What's missing before an item can go live. */
export function publishProblems(row) {
	const out = [];
	if (row.status !== 'ready') out.push('The file has to finish processing first.');
	if (row.mediaType === 'audio' && !row.coverImageId) out.push('Audio needs a cover image.');
	if (row.kind === 'podcast' && !row.showId) out.push('Choose the podcast this episode is from.');
	return out;
}

/** A new Studio item, waiting for its file. */
export async function createItem(user, input) {
	const fields = await fieldsFrom(input, { requireTitle: true });
	fitKind(fields);
	const [row] = await db
		.insert(vod)
		.values({ isPremium: true, ...fields, status: 'waiting', createdBy: user.id })
		.returning();
	await bump('vods');
	return row;
}

/** Edit details, and publish or unpublish. Publishing needs a ready file (and see publishProblems). */
export async function updateItem(row, input) {
	const set = { ...(await fieldsFrom(input, { requireTitle: false })), updatedAt: new Date() };
	if ('kind' in input || 'mediaType' in input) fitKind(set, row);
	if ('isPublished' in input) {
		const publish = !!input.isPublished;
		if (publish) {
			const problems = publishProblems({ ...row, ...set });
			if (problems.length) {
				const status = row.status !== 'ready' ? 409 : 400;
				throw new VideoError(status, problems.join(' '));
			}
		}
		set.isPublished = publish;
		if (publish && !row.publishedAt) set.publishedAt = new Date();
	}
	const [updated] = await db.update(vod).set(set).where(eq(vod.id, row.id)).returning();
	await bump('vods');
	return updated;
}

/** Old names, from when this was gameplay only. */
export const createGameplay = createItem;
export const updateGameplay = updateItem;

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
