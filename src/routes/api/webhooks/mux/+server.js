import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { vod, cmsEntry, cmsLesson } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import mux from '$lib/server/mux.js';

/**
 * Mux webhook — dispatches events to the right table based on `passthrough`.
 *
 * Passthrough conventions:
 *   - CMS entry uploads:  passthrough = `entry:<uuid>`  → cms_entry
 *   - CMS lesson uploads: passthrough = `lesson:<uuid>` → cms_lesson
 *   - VOD uploads (legacy): bare vodId, no prefix        → vod
 *
 * Column names differ across tables (VOD has status/duration/aspectRatio,
 * CMS uses videoStatus/videoDuration/videoAspectRatio) so each branch writes
 * the correct set of columns.
 */
export async function POST({ request }) {
	const body = await request.text();
	const headers = Object.fromEntries(request.headers);

	let event;
	try {
		event = mux.webhooks.unwrap(body, headers, env.MUX_WEBHOOK_SIGNING_SECRET);
	} catch (err) {
		console.error('Mux webhook signature verification failed:', err.message);
		return json({ error: 'Invalid signature' }, { status: 401 });
	}

	const { type, data } = event;
	console.log(`Mux webhook: ${type}`);

	try {
		if (type === 'video.upload.asset_created') {
			const uploadId = data.upload_id;
			const assetId = data.asset_id || data.id;
			const target = parsePassthrough(data.passthrough);

			if (target?.type === 'entry') {
				await db
					.update(cmsEntry)
					.set({
						muxAssetId: assetId,
						videoStatus: 'preparing',
						updatedAt: new Date()
					})
					.where(eq(cmsEntry.id, target.id));
			} else if (target?.type === 'lesson') {
				await db
					.update(cmsLesson)
					.set({
						muxAssetId: assetId,
						videoStatus: 'preparing',
						updatedAt: new Date()
					})
					.where(eq(cmsLesson.id, target.id));
			} else if (uploadId) {
				await db
					.update(vod)
					.set({
						muxAssetId: assetId,
						status: 'preparing',
						updatedAt: new Date()
					})
					.where(eq(vod.muxUploadId, uploadId));
			}
		} else if (type === 'video.asset.ready') {
			const assetId = data.id;
			const playbackId = data.playback_ids?.[0]?.id;
			const duration = data.duration;
			const aspectRatio = data.aspect_ratio;
			const target = parsePassthrough(data.passthrough);

			if (target?.type === 'entry') {
				await db
					.update(cmsEntry)
					.set({
						muxPlaybackId: playbackId || null,
						videoDuration: duration ? Math.round(duration) : null,
						videoAspectRatio: aspectRatio || null,
						videoStatus: 'ready',
						updatedAt: new Date()
					})
					.where(eq(cmsEntry.id, target.id));
			} else if (target?.type === 'lesson') {
				await db
					.update(cmsLesson)
					.set({
						muxPlaybackId: playbackId || null,
						videoDuration: duration ? Math.round(duration) : null,
						videoAspectRatio: aspectRatio || null,
						videoStatus: 'ready',
						updatedAt: new Date()
					})
					.where(eq(cmsLesson.id, target.id));
			} else if (assetId) {
				await db
					.update(vod)
					.set({
						muxPlaybackId: playbackId || null,
						duration: duration || null,
						aspectRatio: aspectRatio || null,
						status: 'ready',
						updatedAt: new Date()
					})
					.where(eq(vod.muxAssetId, assetId));
			}
		} else if (type === 'video.asset.errored') {
			const assetId = data.id;
			const target = parsePassthrough(data.passthrough);

			if (target?.type === 'entry') {
				await db
					.update(cmsEntry)
					.set({ videoStatus: 'errored', updatedAt: new Date() })
					.where(eq(cmsEntry.id, target.id));
			} else if (target?.type === 'lesson') {
				await db
					.update(cmsLesson)
					.set({ videoStatus: 'errored', updatedAt: new Date() })
					.where(eq(cmsLesson.id, target.id));
			} else if (assetId) {
				await db
					.update(vod)
					.set({ status: 'errored', updatedAt: new Date() })
					.where(eq(vod.muxAssetId, assetId));
			}
		}
	} catch (err) {
		console.error(`Error handling Mux webhook ${type}:`, err);
		return json({ error: 'Internal error' }, { status: 500 });
	}

	return json({ received: true });
}

/**
 * Parse a Mux passthrough string of the form `entry:<uuid>` or `lesson:<uuid>`
 * into `{ type, id }`. Returns null for legacy VOD passthroughs (bare id or
 * empty) so the caller can fall through to the VOD branch.
 */
function parsePassthrough(passthrough) {
	if (!passthrough || typeof passthrough !== 'string') return null;
	const colonAt = passthrough.indexOf(':');
	if (colonAt <= 0) return null;
	const type = passthrough.slice(0, colonAt);
	const id = passthrough.slice(colonAt + 1);
	if ((type === 'entry' || type === 'lesson') && id) return { type, id };
	return null;
}
