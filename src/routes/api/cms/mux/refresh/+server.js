import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsEntry, cmsLesson } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { canEditEntries, canEditCourses, ownsOrAdmin, isAdmin } from '$lib/server/auth/roles.js';
import mux from '$lib/server/mux.js';

/**
 * POST /api/cms/mux/refresh
 *
 * Pull the latest Mux state for a specific entry or lesson's video slot
 * directly from the Mux API and mirror it onto the DB row. Meant as an
 * on-demand fallback for environments where the async webhook can't reach
 * this server — local dev (Mux can't hit localhost), preview branches with
 * changing URLs, or any transient webhook delivery failure.
 *
 * Uses the stored muxUploadId to resolve upload → asset → status. The
 * webhook is still the primary sync path in production.
 *
 * Request body: { target: 'entry' | 'lesson', id: uuid }
 * Response:     { entry | lesson: <row> } — updated row for the client to re-render.
 */
export async function POST({ request, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const { target, id } = await request.json().catch(() => ({}));
	if (!id || (target !== 'entry' && target !== 'lesson')) {
		throw error(400, "Body must be { target: 'entry' | 'lesson', id }");
	}

	const table = target === 'entry' ? cmsEntry : cmsLesson;
	if (target === 'entry' && !canEditEntries(user)) throw error(403, 'Not permitted');
	if (target === 'lesson' && !canEditCourses(user)) throw error(403, 'Not permitted');

	const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
	if (!row) throw error(404, `${target} not found`);
	if (target === 'entry' && !ownsOrAdmin(user, row.authorId)) throw error(403, 'Forbidden');
	if (target === 'lesson' && !canEditCourses(user) && !isAdmin(user)) throw error(403, 'Forbidden');

	if (row.videoProvider !== 'mux') {
		return json({ [target]: row, skipped: 'no Mux video on this row' });
	}
	if (!row.muxUploadId) {
		return json({ [target]: row, skipped: 'no muxUploadId to refresh from' });
	}

	// Resolve the asset id if we don't already have it. The Mux Upload
	// object exposes `asset_id` once transcoding starts, so this catches
	// the "webhook missed .upload.asset_created" case.
	let assetId = row.muxAssetId;
	if (!assetId) {
		try {
			const upload = await mux.video.uploads.retrieve(row.muxUploadId);
			assetId = upload?.asset_id || null;
		} catch (err) {
			console.warn('[cms/mux/refresh] uploads.retrieve failed:', err?.message);
		}
	}

	if (!assetId) {
		// Upload exists but no asset yet — either bytes never landed, or Mux
		// hasn't started processing. Nothing to update; leave the row alone.
		return json({ [target]: row, skipped: 'no asset yet' });
	}

	// Pull the asset and mirror its state onto our row.
	let asset;
	try {
		asset = await mux.video.assets.retrieve(assetId);
	} catch (err) {
		console.error('[cms/mux/refresh] assets.retrieve failed:', err?.message);
		throw error(502, 'Failed to fetch Mux asset status');
	}

	const playbackId = asset?.playback_ids?.[0]?.id || null;
	const duration = asset?.duration ?? null;
	const aspectRatio = asset?.aspect_ratio || null;
	// Mux status values we care about: 'preparing' | 'ready' | 'errored'.
	const videoStatus = asset?.status || row.videoStatus;

	await db
		.update(table)
		.set({
			muxAssetId: assetId,
			muxPlaybackId: playbackId,
			videoDuration: duration ? Math.round(duration) : null,
			videoAspectRatio: aspectRatio,
			videoStatus,
			updatedAt: new Date()
		})
		.where(eq(table.id, id));

	const [updated] = await db.select().from(table).where(eq(table.id, id)).limit(1);
	return json({ [target]: updated });
}
