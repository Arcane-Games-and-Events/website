import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, canEditEntry, isAdmin } from '$lib/server/auth/roles.js';
import {
	extractEntryCardNames,
	resolveCardImages,
	loadMedia,
	loadAuthor,
	buildEntryVideo
} from '$lib/server/desk/entryData.js';

/**
 * Preview page loader for an entry. Distinct from the public reader:
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

	const title = pick('title') || 'Untitled';
	const excerpt = pick('excerpt') || null;
	const body = pick('body') || null;

	const coverImageId = entry.draftCoverImageId || entry.coverImageId;
	const thumbnailImageId = entry.draftThumbnailImageId || entry.thumbnailImageId;

	const [cover, thumbnail, author] = await Promise.all([
		loadMedia(coverImageId),
		loadMedia(thumbnailImageId),
		loadAuthor(entry.authorId)
	]);

	// Video slot — always live on the entry (video changes don't buffer).
	const video = await buildEntryVideo(entry);

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
			author: author ? { name: `${author.firstName} ${author.lastName || ''}`.trim() } : null,
			readTime: entry.readTime || null,
			video
		},
		cardImages,
		isAdmin: isAdmin(locals.user)
	};
}
