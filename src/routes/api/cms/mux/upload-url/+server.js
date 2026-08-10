import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry, cmsLesson } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, canEditCourses, ownsOrAdmin, isAdmin } from '$lib/server/auth/roles.js';
import mux from '$lib/server/mux.js';

/**
 * POST /api/cms/mux/upload-url
 *
 * Creates a Mux direct-upload session bound to a specific CMS record
 * (entry or lesson). Writes the upload_id + video_provider='mux' +
 * video_status='waiting' onto the target row so the picker can show
 * "waiting for upload" state immediately. The client then PUTs the file
 * bytes directly to `uploadUrl`, and the Mux webhook fills in assetId,
 * playbackId, duration, aspectRatio, and status='ready' asynchronously.
 *
 * Request body: { target: 'entry' | 'lesson', id: uuid }
 *
 * Passthrough format on the Mux upload: `${target}:${id}` — the webhook
 * parses this to know which table to update. Existing VOD uploads (which
 * use a bare vodId with no prefix) still flow through the VOD branch.
 */
export async function POST({ request, locals, url }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const { target, id } = await request.json().catch(() => ({}));
	if (!id || (target !== 'entry' && target !== 'lesson')) {
		throw error(400, "Body must be { target: 'entry' | 'lesson', id }");
	}

	// Auth + row load. Two branches so each capability check reads naturally.
	let row;
	if (target === 'entry') {
		if (!canEditEntries(user)) throw error(403, 'Not permitted');
		[row] = await db.select().from(cmsEntry).where(eq(cmsEntry.id, id)).limit(1);
		if (!row) throw error(404, 'Entry not found');
		if (!ownsOrAdmin(user, row.authorId)) throw error(403, 'Forbidden');
	} else {
		if (!canEditCourses(user)) throw error(403, 'Not permitted');
		[row] = await db.select().from(cmsLesson).where(eq(cmsLesson.id, id)).limit(1);
		if (!row) throw error(404, 'Lesson not found');
		// Lessons don't carry an author — creators + admins can touch any lesson.
		if (!isAdmin(user) && !canEditCourses(user)) throw error(403, 'Forbidden');
	}

	const passthrough = `${target}:${id}`;
	const upload = await mux.video.uploads.create({
		new_asset_settings: {
			playback_policy: ['signed'],
			passthrough
		},
		cors_origin: url.origin
	});

	const table = target === 'entry' ? cmsEntry : cmsLesson;
	await db
		.update(table)
		.set({
			videoProvider: 'mux',
			muxUploadId: upload.id,
			// Clear anything left over from a previous provider so we don't render
			// stale YouTube metadata alongside the new Mux upload.
			muxAssetId: null,
			muxPlaybackId: null,
			videoStatus: 'waiting',
			videoDuration: null,
			videoAspectRatio: null,
			youtubeUrl: null,
			youtubeVideoId: null,
			youtubeTitle: null,
			youtubeThumbnailUrl: null,
			youtubeDuration: null,
			updatedAt: new Date()
		})
		.where(eq(table.id, id));

	return json({ uploadUrl: upload.url, uploadId: upload.id });
}
