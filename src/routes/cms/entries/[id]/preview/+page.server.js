import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry, cmsMedia, user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, ownsOrAdmin, isAdmin } from '$lib/server/auth/roles.js';
import { getMuxPlaybackToken, getMuxThumbnailToken } from '$lib/server/mux.js';
import { extractCardNamesFromLexical } from '$lib/cms/render/lexical-utils.js';
import { resolveCardImage, mapWithConcurrency } from '$lib/server/cards/index.js';

/**
 * Walk a Lexical body and pull every card-linked name — from `card:` link
 * URLs AND from inline decklist widget nodes' parsedCards. Returns the same
 * `Set<JSON string>` shape the reader-side resolver expects.
 */
function extractPreviewCardNames(body) {
	const names = extractCardNamesFromLexical(body);
	function walk(node) {
		if (!node) return;
		if (node.type === 'decklist' && node.parsedCards) {
			const { arenaCards = [], deckCards = [] } = node.parsedCards;
			for (const c of arenaCards) {
				if (c?.name) names.add(JSON.stringify({ name: c.name, pitch: null }));
			}
			for (const c of deckCards) {
				if (!c?.name) continue;
				const pitch =
					c.color === 'red' ? 'r' : c.color === 'yellow' ? 'y' : c.color === 'blue' ? 'b' : null;
				names.add(JSON.stringify({ name: c.name, pitch }));
			}
		}
		if (Array.isArray(node.children)) node.children.forEach(walk);
		if (node.root) walk(node.root);
	}
	walk(body);
	return names;
}

/**
 * Resolve card names to image URLs. Same shape the reader consumes:
 * `{ [name.toLowerCase()]: { imageUrl, fallbackUrl }, [name.toLowerCase() + ':' + pitchLetter]: { ... } }`.
 * Concurrency is capped at 8 in-flight lookups so a deck-tech article with
 * 70+ unique cards doesn't saturate the DB pool on a cold cache.
 */
async function resolveCardImages(namesSet) {
	const cardImages = {};
	const cards = Array.from(namesSet).map((jsonStr) => JSON.parse(jsonStr));

	await mapWithConcurrency(cards, 8, async ({ name, pitch }) => {
		const pitchNum = pitch === 'r' ? 1 : pitch === 'y' ? 2 : pitch === 'b' ? 3 : null;
		const resolved = await resolveCardImage({ name, pitch: pitchNum });
		if (!resolved.found) return;
		const key = pitch ? `${name.toLowerCase()}:${pitch}` : name.toLowerCase();
		cardImages[key] = {
			imageUrl: resolved.imageUrl,
			fallbackUrl: resolved.fallbackUrl
		};
		if (pitch && !cardImages[name.toLowerCase()]) {
			cardImages[name.toLowerCase()] = {
				imageUrl: resolved.imageUrl,
				fallbackUrl: resolved.fallbackUrl
			};
		}
	});

	return cardImages;
}

/**
 * Preview page loader for an entry. Distinct from the public reader:
 *
 *   - Bypasses the "public-visibility" filter — drafts, scheduled entries,
 *     and archived entries all render here so the writer can see what
 *     they'd look like before hitting Publish.
 *   - Prefers the DRAFT-buffered version of each field when a live entry
 *     has pending edits, so the preview mirrors what the writer just
 *     typed instead of the older approved copy.
 *   - Gated by CMS auth: writers see only entries they authored;
 *     admins see all. Non-CMS users are 403'd by the /cms layout guard.
 */
export async function load({ params, locals }) {
	if (!canEditEntries(locals.user)) throw error(403, 'Not permitted');

	const [entry] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, params.id)).limit(1);
	if (!entry) throw error(404, 'Entry not found');
	if (!ownsOrAdmin(locals.user, entry.authorId)) throw error(403, 'Forbidden');

	// Whichever value is live at render-time — if a live entry has a draft
	// buffer, show the draft; otherwise show the live value.
	function pick(field) {
		const draftKey = `draft${field[0].toUpperCase()}${field.slice(1)}`;
		if (entry.draftUpdatedAt && entry[draftKey] !== null && entry[draftKey] !== undefined) {
			return entry[draftKey];
		}
		return entry[field];
	}

	const title = pick('title') || 'Untitled';
	const excerpt = pick('excerpt') || null;
	const body = pick('body') || null;

	const coverImageId = entry.draftCoverImageId || entry.coverImageId;
	const thumbnailImageId = entry.draftThumbnailImageId || entry.thumbnailImageId;

	// Load related rows in parallel — same joins the reader page does.
	const [cover, thumbnail, author] = await Promise.all([
		coverImageId
			? db
					.select()
					.from(cmsMedia)
					.where(eq(cmsMedia.id, coverImageId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null),
		thumbnailImageId
			? db
					.select()
					.from(cmsMedia)
					.where(eq(cmsMedia.id, thumbnailImageId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null),
		entry.authorId
			? db
					.select({
						id: userTable.id,
						firstName: userTable.firstName,
						lastName: userTable.lastName
					})
					.from(userTable)
					.where(eq(userTable.id, entry.authorId))
					.limit(1)
					.then((r) => r[0] || null)
			: Promise.resolve(null)
	]);

	// Video slot — always live on the entry (video changes don't buffer).
	let video = null;
	if (entry.videoProvider === 'mux' && entry.muxPlaybackId) {
		const [playbackToken, thumbnailToken] = await Promise.all([
			getMuxPlaybackToken(entry.muxPlaybackId),
			getMuxThumbnailToken(entry.muxPlaybackId)
		]);
		video = {
			provider: 'mux',
			muxPlaybackId: entry.muxPlaybackId,
			playbackToken,
			thumbnailToken,
			duration: entry.videoDuration,
			aspectRatio: entry.videoAspectRatio
		};
	} else if (entry.videoProvider === 'youtube' && entry.youtubeVideoId) {
		video = {
			provider: 'youtube',
			youtubeVideoId: entry.youtubeVideoId,
			youtubeTitle: entry.youtubeTitle,
			youtubeThumbnailUrl: entry.youtubeThumbnailUrl,
			youtubeDuration: entry.youtubeDuration
		};
	}

	// Effective published-ness for the banner labels — a scheduled entry
	// past its start time counts as public everywhere else on the site.
	const effectiveStatus =
		entry.status === 'scheduled' &&
		entry.scheduledFor &&
		new Date(entry.scheduledFor).getTime() <= Date.now()
			? 'published'
			: entry.status;
	const isLive = effectiveStatus === 'published';
	const hasPendingDraft = !!entry.draftUpdatedAt;

	// Card image resolution — walks card: link URLs + decklist widget
	// parsedCards so the CardHover tooltip on the preview page works the
	// same way it does on the published reader.
	let cardImages = {};
	if (body) {
		const names = extractPreviewCardNames(body);
		if (names.size > 0) cardImages = await resolveCardImages(names);
	}

	return {
		entry: {
			id: entry.id,
			slug: entry.slug,
			title,
			excerpt,
			content: body,
			publishedAt: entry.publishedAt,
			scheduledFor: entry.scheduledFor,
			accessMode: entry.accessMode,
			status: entry.status,
			effectiveStatus,
			isLive,
			hasPendingDraft,
			coverImage: cover ? { src: cover.url, alt: cover.alt || '' } : null,
			thumbnailImage: thumbnail ? { src: thumbnail.url, alt: thumbnail.alt || '' } : null,
			author: author
				? { name: `${author.firstName} ${author.lastName || ''}`.trim() }
				: null,
			readTime: entry.readTime || null,
			video
		},
		cardImages,
		isAdmin: isAdmin(locals.user)
	};
}
