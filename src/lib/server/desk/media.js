/**
 * Shared media-cleanup helper. Used by:
 *   - DELETE /api/desk/media/[id]                 (writer/creator-initiated cleanup)
 *   - approveEntryDraft / discardEntryDraft     (buffered-edit cleanup)
 *   - approveCourseDraft / discardCourseDraft   (future)
 *
 * Guarantees:
 *   1. No delete happens while ANY entry/course still references the media
 *      in a cover / thumbnail slot (live or draft).
 *   2. Storage remove is best-effort — if it fails, we still drop the DB
 *      row so we don't accumulate orphan pointers.
 *
 * Returns a diagnostic object so callers can log why nothing happened.
 */
import { db } from '$lib/server/db/index.js';
import { deskMedia, deskEntry, deskCourse } from '$lib/server/db/schema.js';
import { eq, or } from 'drizzle-orm';
import { getSupabase, DESK_MEDIA_BUCKET } from '$lib/server/supabase.js';
import { bump } from '$lib/server/cache/index.js';

/**
 * @param {string | null | undefined} mediaId
 * @returns {Promise<{ deleted: boolean, reason?: string, storage?: any }>}
 */
export async function deleteMediaWithGuard(mediaId) {
	if (!mediaId) return { deleted: false, reason: 'no id' };

	const [media] = await db.select().from(deskMedia).where(eq(deskMedia.id, mediaId)).limit(1);
	if (!media) return { deleted: false, reason: 'not found' };

	const [entryRef] = await db
		.select({ id: deskEntry.id })
		.from(deskEntry)
		.where(
			or(
				eq(deskEntry.coverImageId, mediaId),
				eq(deskEntry.thumbnailImageId, mediaId),
				eq(deskEntry.draftCoverImageId, mediaId),
				eq(deskEntry.draftThumbnailImageId, mediaId)
			)
		)
		.limit(1);
	if (entryRef) {
		return { deleted: false, reason: `referenced by entry ${entryRef.id}` };
	}

	const [courseRef] = await db
		.select({ id: deskCourse.id })
		.from(deskCourse)
		.where(
			or(
				eq(deskCourse.coverImageId, mediaId),
				eq(deskCourse.thumbnailImageId, mediaId),
				eq(deskCourse.draftCoverImageId, mediaId),
				eq(deskCourse.draftThumbnailImageId, mediaId)
			)
		)
		.limit(1);
	if (courseRef) {
		return { deleted: false, reason: `referenced by course ${courseRef.id}` };
	}

	// Storage side. `data` can be [] on success when the path doesn't
	// match any object — surfaced via storage.error for the caller.
	const supabase = getSupabase();
	const storage = { path: media.storagePath, removed: [], error: null };
	if (supabase && media.storagePath) {
		try {
			const { data, error: rmError } = await supabase.storage
				.from(DESK_MEDIA_BUCKET)
				.remove([media.storagePath]);
			if (rmError) {
				console.error(
					`[desk/media/guard-delete] Storage remove failed (path=${media.storagePath}):`,
					rmError
				);
				storage.error = rmError.message || String(rmError);
			} else {
				const removedNames = Array.isArray(data) ? data.map((r) => r?.name).filter(Boolean) : [];
				storage.removed = removedNames;
				if (removedNames.length === 0) {
					storage.error = 'no files matched the storage path';
				}
			}
		} catch (err) {
			console.error(`[desk/media/guard-delete] Storage remove threw:`, err);
			storage.error = err?.message || String(err);
		}
	} else if (!media.storagePath) {
		storage.error = 'no storage path stored on media row';
	}

	await db.delete(deskMedia).where(eq(deskMedia.id, mediaId));
	await bump('media');
	return { deleted: true, storage };
}
