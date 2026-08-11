import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsMedia, cmsEntry, cmsCourse } from '$lib/server/db/schema.js';
import { eq, or } from 'drizzle-orm';
import { canEditEntries, canEditCourses } from '$lib/server/auth/roles.js';
import { getSupabase, CMS_MEDIA_BUCKET } from '$lib/server/supabase.js';

/**
 * DELETE /api/cms/media/[id]
 *
 * Deletes a cms_media row + its Supabase Storage object, but only if no
 * other CMS record still references it as a cover / thumbnail (live or
 * draft-buffered).
 *
 * References checked:
 *   - cms_entry.cover_image_id | thumbnail_image_id | draft_cover_image_id
 *     | draft_thumbnail_image_id
 *   - cms_course.cover_image_id | thumbnail_image_id | draft_cover_image_id
 *     | draft_thumbnail_image_id
 *
 * NOT checked: inline references inside Lexical body JSONB — scanning
 * JSONB per mediaId is expensive and JSONB has no FK enforcement anyway.
 * When a writer removes an inline image widget, this endpoint deletes
 * the file even if the last autosave hasn't yet cleared the JSONB URL.
 * The next autosave clears the URL; if that never happens the reader
 * renders a broken image URL (graceful).
 *
 * Response — always JSON, with the same shape for both success and
 * refusal so the client can log a single line either way:
 *   { deleted: true,  storage: { path, removed: [...], error?: string } }
 *   { deleted: false, reason: string, blockedBy?: 'entry' | 'course' }
 */
export async function DELETE({ params, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user) && !canEditCourses(user)) {
		throw error(403, 'Not permitted');
	}

	const [media] = await db.select().from(cmsMedia).where(eq(cmsMedia.id, params.id)).limit(1);
	if (!media) throw error(404, 'Media not found');

	// -------------------------------------------------------------------
	// Reference guard — refuse to delete if any entry or course still
	// binds this media as a cover / thumbnail (live or draft-buffered).
	// The result identifies WHICH slot is holding the reference so the
	// client / server logs make the "why" obvious.
	// -------------------------------------------------------------------
	const [entryRef] = await db
		.select({
			id: cmsEntry.id,
			slug: cmsEntry.slug,
			coverImageId: cmsEntry.coverImageId,
			thumbnailImageId: cmsEntry.thumbnailImageId,
			draftCoverImageId: cmsEntry.draftCoverImageId,
			draftThumbnailImageId: cmsEntry.draftThumbnailImageId
		})
		.from(cmsEntry)
		.where(
			or(
				eq(cmsEntry.coverImageId, params.id),
				eq(cmsEntry.thumbnailImageId, params.id),
				eq(cmsEntry.draftCoverImageId, params.id),
				eq(cmsEntry.draftThumbnailImageId, params.id)
			)
		)
		.limit(1);
	if (entryRef) {
		const heldBy = [
			entryRef.coverImageId === params.id && 'coverImageId',
			entryRef.thumbnailImageId === params.id && 'thumbnailImageId',
			entryRef.draftCoverImageId === params.id && 'draftCoverImageId',
			entryRef.draftThumbnailImageId === params.id && 'draftThumbnailImageId'
		].filter(Boolean);
		return json({
			deleted: false,
			reason: `still referenced by entry ${entryRef.slug} in ${heldBy.join(', ')}`,
			blockedBy: 'entry',
			entryId: entryRef.id,
			heldBy
		});
	}

	const [courseRef] = await db
		.select({ id: cmsCourse.id, slug: cmsCourse.slug })
		.from(cmsCourse)
		.where(
			or(
				eq(cmsCourse.coverImageId, params.id),
				eq(cmsCourse.thumbnailImageId, params.id),
				eq(cmsCourse.draftCoverImageId, params.id),
				eq(cmsCourse.draftThumbnailImageId, params.id)
			)
		)
		.limit(1);
	if (courseRef) {
		return json({
			deleted: false,
			reason: `still referenced by course ${courseRef.slug}`,
			blockedBy: 'course',
			courseId: courseRef.id
		});
	}

	// Storage delete. `data` can be [] even on success (path didn't match
	// any object) — surfaced back to the client via `storage.error` so the
	// caller can decide whether to care.
	const supabase = getSupabase();
	let storage = { path: media.storagePath, removed: [], error: null };

	if (!supabase) {
		storage.error = 'supabase client unavailable';
	} else if (!media.storagePath) {
		storage.error = 'no storage path stored on media row';
	} else {
		try {
			const { data, error: rmError } = await supabase.storage
				.from(CMS_MEDIA_BUCKET)
				.remove([media.storagePath]);
			if (rmError) {
				console.error(
					`[cms/media/delete] Storage remove failed (path=${media.storagePath}):`,
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
			console.error(`[cms/media/delete] Storage remove threw:`, err);
			storage.error = err?.message || String(err);
		}
	}

	await db.delete(cmsMedia).where(eq(cmsMedia.id, params.id));

	return json({ deleted: true, storage });
}
