import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { mediaImagesById } from '$lib/server/media/library.js';
import { extractMediaIds } from '$lib/desk/render/lexical-utils.js';
import { getEntryTag, getTag } from '$lib/server/desk/tags.js';
import { canEditEntries, canEditEntry } from '$lib/server/auth/roles.js';
import {
	extractEntryCardNames,
	resolveCardImages,
	loadMedia,
	loadAuthor,
	countAuthorPieces,
	buildArticleShape
} from '$lib/server/desk/entryData.js';

/**
 * Preview page loader for an entry. Builds the same `article` the public
 * reader renders (`buildArticleShape`), so the page is the live article
 * view under a preview banner. What differs from the public reader:
 *
 *   - Bypasses the "public-visibility" filter — drafts, scheduled entries,
 *     and archived entries all render here so the writer can see what
 *     they'd look like before hitting Publish.
 *   - Prefers the DRAFT-buffered version of each field when a live entry
 *     has pending edits, so the preview mirrors what the writer just
 *     typed instead of the older approved copy.
 *   - Gated by Desk auth: writers see only entries they authored;
 *     admins see all. Non-Desk users are 403'd by the /desk layout guard.
 */
export async function load({ params, locals }) {
	if (!canEditEntries(locals.user)) throw error(403, 'Not permitted');

	const [entry] = await db.select().from(deskEntry).where(eq(deskEntry.id, params.id)).limit(1);
	if (!entry) throw error(404, 'Entry not found');
	if (!canEditEntry(locals.user, entry.authorId)) throw error(403, 'Forbidden');

	// Whichever value is live at render-time — if a live entry has a draft
	// buffer, show the draft; otherwise show the live value.
	function pick(field) {
		const draftKey = `draft${field[0].toUpperCase()}${field.slice(1)}`;
		if (entry.draftUpdatedAt && entry[draftKey] !== null && entry[draftKey] !== undefined) {
			return entry[draftKey];
		}
		return entry[field];
	}

	// The entry as it will read once its pending edits go live: the text
	// from draft_*, and the access, images, tag and video from draft_meta.
	const meta = entry.draftMeta || {};
	const pendingVideo = meta.video
		? {
				videoProvider: meta.video.provider ?? null,
				...Object.fromEntries(Object.entries(meta.video).filter(([k]) => k !== 'provider'))
			}
		: {};
	const merged = {
		...entry,
		...pendingVideo,
		accessMode: meta.accessMode ?? entry.accessMode,
		title: pick('title') || 'Untitled',
		excerpt: pick('excerpt') || null,
		body: pick('body') || null,
		readTime: pick('readTime') || null
	};
	const coverImageId =
		'coverImageId' in meta ? meta.coverImageId : entry.draftCoverImageId || entry.coverImageId;
	const thumbnailImageId =
		'thumbnailImageId' in meta
			? meta.thumbnailImageId
			: entry.draftThumbnailImageId || entry.thumbnailImageId;

	const [cover, thumbnail, author, pieces, tag] = await Promise.all([
		loadMedia(coverImageId),
		loadMedia(thumbnailImageId),
		loadAuthor(entry.authorId),
		countAuthorPieces(entry.authorId),
		'tagId' in meta
			? meta.tagId
				? getTag(meta.tagId).then((t) => t && { id: t.id, name: t.name, slug: t.slug })
				: null
			: getEntryTag(entry.id)
	]);
	const article = await buildArticleShape({
		entry: merged,
		cover,
		thumbnail,
		author: author ? { ...author, pieces } : null,
		tags: tag ? [tag] : []
	});
	const body = merged.body;

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
		const names = extractEntryCardNames(body);
		if (names.size > 0) cardImages = await resolveCardImages(names);
	}

	const media = body ? await mediaImagesById(extractMediaIds(body)) : {};

	return {
		article,
		isPremium: merged.accessMode === 'premium',
		cardImages,
		media,
		preview: {
			id: entry.id,
			slug: entry.slug,
			status: entry.status,
			scheduledFor: entry.scheduledFor,
			isLive,
			hasPendingDraft
		}
	};
}
