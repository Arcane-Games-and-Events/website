/**
 * Shared media-cleanup helper. Used by:
 *   - DELETE /api/cms/media/[id]                 (writer/creator-initiated cleanup)
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
import { cmsMedia, cmsEntry, cmsCourse } from '$lib/server/db/schema.js';
import { eq, or } from 'drizzle-orm';
import { getSupabase, CMS_MEDIA_BUCKET } from '$lib/server/supabase.js';

/**
 * @param {string | null | undefined} mediaId
 * @returns {Promise<{ deleted: boolean, reason?: string, storage?: any }>}
 */
export async function deleteMediaWithGuard(mediaId) {
	if (!mediaId) return { deleted: false, reason: 'no id' };

	const [media] = await db.select().from(cmsMedia).where(eq(cmsMedia.id, mediaId)).limit(1);
	if (!media) return { deleted: false, reason: 'not found' };

	const [entryRef] = await db
		.select({ id: cmsEntry.id })
		.from(cmsEntry)
		.where(
			or(
				eq(cmsEntry.coverImageId, mediaId),
				eq(cmsEntry.thumbnailImageId, mediaId),
				eq(cmsEntry.draftCoverImageId, mediaId),
				eq(cmsEntry.draftThumbnailImageId, mediaId)
			)
		)
		.limit(1);
	if (entryRef) {
		return { deleted: false, reason: `referenced by entry ${entryRef.id}` };
	}

	const [courseRef] = await db
		.select({ id: cmsCourse.id })
		.from(cmsCourse)
		.where(
			or(
				eq(cmsCourse.coverImageId, mediaId),
				eq(cmsCourse.thumbnailImageId, mediaId),
				eq(cmsCourse.draftCoverImageId, mediaId),
				eq(cmsCourse.draftThumbnailImageId, mediaId)
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
				.from(CMS_MEDIA_BUCKET)
				.remove([media.storagePath]);
			if (rmError) {
				console.error(
					`[cms/media/guard-delete] Storage remove failed (path=${media.storagePath}):`,
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
			console.error(`[cms/media/guard-delete] Storage remove threw:`, err);
			storage.error = err?.message || String(err);
		}
	} else if (!media.storagePath) {
		storage.error = 'no storage path stored on media row';
	}

	await db.delete(cmsMedia).where(eq(cmsMedia.id, mediaId));
	return { deleted: true, storage };
}
