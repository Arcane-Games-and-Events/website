/**
 * Loading helpers shared by the public reader (`/library/[slug]`) and the
 * Desk preview (`/desk/entries/[id]/preview`), so both render an entry the
 * same way.
 */
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia, user as userTable } from '$lib/server/db/schema.js';
import { getMuxPlaybackToken, getMuxThumbnailToken } from '$lib/server/mux.js';
import { resolveCardImage, mapWithConcurrency } from '$lib/server/cards/index.js';
import { extractCardNamesFromLexical } from '$lib/desk/render/lexical-utils.js';

const PITCH_LETTER = { red: 'r', yellow: 'y', blue: 'b' };
const PITCH_NUMBER = { r: 1, y: 2, b: 3 };

/**
 * Every card an entry body mentions: `card:` links plus the cards inside
 * decklist widgets (which aren't links). Returns a Set of
 * `JSON.stringify({ name, pitch })` with pitch 'r' | 'y' | 'b' | null.
 */
export function extractEntryCardNames(body) {
	const names = extractCardNamesFromLexical(body);
	function walk(node) {
		if (!node) return;
		if (node.type === 'decklist' && node.parsedCards) {
			const { arenaCards = [], deckCards = [] } = node.parsedCards;
			for (const c of arenaCards) {
				if (c?.name) names.add(JSON.stringify({ name: c.name, pitch: null }));
			}
			for (const c of deckCards) {
				if (c?.name)
					names.add(JSON.stringify({ name: c.name, pitch: PITCH_LETTER[c.color] ?? null }));
			}
		}
		if (Array.isArray(node.children)) node.children.forEach(walk);
		if (node.root) walk(node.root);
	}
	walk(body);
	return names;
}

/**
 * Resolve card names to images, keyed `name` and `name:pitch` (lowercase),
 * the shape `lookupCardImage` reads. At most 8 lookups run at once so a
 * deck tech with 70+ cards doesn't saturate the DB pool on a cold cache.
 */
export async function resolveCardImages(namesSet) {
	const cardImages = {};
	const cards = Array.from(namesSet).map((json) => JSON.parse(json));

	await mapWithConcurrency(cards, 8, async ({ name, pitch }) => {
		const resolved = await resolveCardImage({ name, pitch: PITCH_NUMBER[pitch] ?? null });
		if (!resolved.found) return;
		const image = { imageUrl: resolved.imageUrl, fallbackUrl: resolved.fallbackUrl };
		const base = name.toLowerCase();
		cardImages[pitch ? `${base}:${pitch}` : base] = image;
		// A pitched card also answers for its bare name
		if (pitch && !cardImages[base]) cardImages[base] = image;
	});

	return cardImages;
}

/** One `cms_media` row, or null. */
export async function loadMedia(id) {
	if (!id) return null;
	const [row] = await db.select().from(deskMedia).where(eq(deskMedia.id, id)).limit(1);
	return row || null;
}

/** The author's id and name, or null. */
export async function loadAuthor(id) {
	if (!id) return null;
	const [row] = await db
		.select({ id: userTable.id, firstName: userTable.firstName, lastName: userTable.lastName })
		.from(userTable)
		.where(eq(userTable.id, id))
		.limit(1);
	return row || null;
}

/** The entry's featured video slot, with signed Mux tokens. Null when empty. */
export async function buildEntryVideo(entry) {
	if (entry.videoProvider === 'mux' && entry.muxPlaybackId) {
		const [playbackToken, thumbnailToken] = await Promise.all([
			getMuxPlaybackToken(entry.muxPlaybackId),
			getMuxThumbnailToken(entry.muxPlaybackId)
		]);
		return {
			provider: 'mux',
			muxPlaybackId: entry.muxPlaybackId,
			playbackToken,
			thumbnailToken,
			duration: entry.videoDuration,
			aspectRatio: entry.videoAspectRatio
		};
	}
	if (entry.videoProvider === 'youtube' && entry.youtubeVideoId) {
		return {
			provider: 'youtube',
			youtubeVideoId: entry.youtubeVideoId,
			youtubeTitle: entry.youtubeTitle,
			youtubeThumbnailUrl: entry.youtubeThumbnailUrl,
			youtubeDuration: entry.youtubeDuration
		};
	}
	return null;
}
