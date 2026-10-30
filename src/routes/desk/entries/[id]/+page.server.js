import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskMedia, user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canApproveEdits, canEditEntries, isAdmin, canEditEntry } from '$lib/server/auth/roles.js';
import { toLibraryItem } from '$lib/server/media/library.js';
import { getEntryTag, getTag, listTags } from '$lib/server/desk/tags.js';
import { holdsForApproval, videoSlotOf } from '$lib/server/desk/entries.js';

async function mediaItem(id) {
	if (!id) return null;
	const [row] = await db.select().from(deskMedia).where(eq(deskMedia.id, id)).limit(1);
	return row ? toLibraryItem(row) : null;
}

export async function load({ params, locals }) {
	if (!canEditEntries(locals.user)) throw redirect(302, '/desk');

	const [entry] = await db.select().from(deskEntry).where(eq(deskEntry.id, params.id)).limit(1);
	if (!entry) throw error(404, 'Entry not found');
	if (!canEditEntry(locals.user, entry.authorId)) throw error(403, 'Forbidden');

	// The sidebar edits what the piece will be: a pending change (draft_meta,
	// or the older draft_* image columns) wins over the live value. The live
	// values come along so each field can say what's on the site now.
	const meta = entry.draftMeta || {};
	const liveCoverId = entry.coverImageId;
	const liveThumbId = entry.thumbnailImageId;
	const editingCoverId =
		'coverImageId' in meta ? meta.coverImageId : entry.draftCoverImageId || liveCoverId;
	const editingThumbnailId =
		'thumbnailImageId' in meta ? meta.thumbnailImageId : entry.draftThumbnailImageId || liveThumbId;

	const [coverImage, thumbnailImage, liveCover, liveThumb, author, liveTag, tags] =
		await Promise.all([
			mediaItem(editingCoverId),
			mediaItem(editingThumbnailId),
			mediaItem(liveCoverId),
			mediaItem(liveThumbId),
			entry.authorId
				? db
						.select({
							id: userTable.id,
							firstName: userTable.firstName,
							lastName: userTable.lastName,
							email: userTable.email
						})
						.from(userTable)
						.where(eq(userTable.id, entry.authorId))
						.limit(1)
						.then((r) => r[0] || null)
				: Promise.resolve(null),
			getEntryTag(entry.id),
			listTags()
		]);
	const pendingTag =
		'tagId' in meta && meta.tagId
			? await getTag(meta.tagId).then((t) => t && { id: t.id, name: t.name, slug: t.slug })
			: null;

	return {
		entry,
		// library items, so the pickers can show the responsive preview
		coverImage,
		thumbnailImage,
		author,
		tag: 'tagId' in meta ? pendingTag : liveTag,
		tags,
		// What's live, for the "Live: …" lines and the pending summary.
		live: {
			cover: liveCover,
			thumbnail: liveThumb,
			tag: liveTag,
			accessMode: entry.accessMode,
			slug: entry.slug,
			video: videoSlotOf(entry)
		},
		// Whether this person's edits here wait for approval.
		held: holdsForApproval(entry, locals.user),
		canApprove: canApproveEdits(locals.user),
		isAdmin: isAdmin(locals.user)
	};
}
