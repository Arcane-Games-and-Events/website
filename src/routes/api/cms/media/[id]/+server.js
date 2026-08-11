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
 * other CMS record still references it as a cover / thumbnail (or their
 * draft-buffered variants).
 *
 * References checked:
 *   - cms_entry.cover_image_id | thumbnail_image_id | draft_cover_image_id
 *     | draft_thumbnail_image_id
 *   - cms_course.cover_image_id | thumbnail_image_id | draft_cover_image_id
 *     | draft_thumbnail_image_id
 *
 * NOT checked: inline references inside Lexical body JSONB. Scanning
 * JSONB for every image mediaId is expensive and JSONB has no FK
 * enforcement, so we accept a small race: when a writer removes an
 * inline image widget, the widget is gone from the local editor state
 * but the autosaved body may briefly still reference the mediaId. The
 * next autosave clears that reference in the DB. If the autosave never
 * happens (page crash / connection loss), the stored body will render
 * a broken image URL on next load — a graceful degradation, not a hard
 * failure.
 *
 * Response:
 *   { deleted: true } — media row + Storage object gone
 *   { deleted: false, reason } — still referenced somewhere; nothing changed
 */
export async function DELETE({ params, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user) && !canEditCourses(user)) {
		throw error(403, 'Not permitted');
	}

	const [media] = await db.select().from(cmsMedia).where(eq(cmsMedia.id, params.id)).limit(1);
	if (!media) throw error(404, 'Media not found');

	// Reference guard — refuse to delete if the media is still bound to any
	// entry or course as a cover / thumbnail (live or draft-buffered).
	const [entryRef] = await db
		.select({ id: cmsEntry.id })
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
		return json({ deleted: false, reason: 'still referenced by an entry' });
	}

	const [courseRef] = await db
		.select({ id: cmsCourse.id })
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
		return json({ deleted: false, reason: 'still referenced by a course' });
	}

	// Delete the Storage object first. If this fails, we still delete the
	// DB row — an orphaned Storage object is easier to clean up later than
	// an orphan DB row pointing at a missing file.
	const supabase = getSupabase();
	if (supabase && media.storagePath) {
		try {
			const { error: rmError } = await supabase.storage
				.from(CMS_MEDIA_BUCKET)
				.remove([media.storagePath]);
			if (rmError) {
				console.warn(
					`[cms/media/delete] Storage remove failed (path=${media.storagePath}):`,
					rmError.message
				);
			}
		} catch (err) {
			console.warn(`[cms/media/delete] Storage remove threw:`, err?.message);
		}
	}

	await db.delete(cmsMedia).where(eq(cmsMedia.id, params.id));

	return json({ deleted: true });
}
