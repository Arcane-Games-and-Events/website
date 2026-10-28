import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { vod, deskEntry, deskLesson } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import mux from '$lib/server/mux.js';

/**
 * Mux webhook — dispatches events to whichever row's Mux upload_id or
 * asset_id matches. Tries all three video-owning tables in order (VOD,
 * cms_entry, cms_lesson) and updates the first match.
 *
 * Column names differ per table (VOD has status/duration/aspectRatio, Desk
 * uses videoStatus/videoDuration/videoAspectRatio), so each branch writes
 * the correct set. Matching by ID rather than by passthrough is more
 * robust — Mux's event data structure places passthrough at different
 * paths depending on the event type, and we already store both upload_id
 * and asset_id on our own rows anyway.
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
			const uploadId = data.upload_id || data.id;
			const assetId = data.asset_id;
			if (!uploadId) return json({ received: true });
			await updateByUploadId(uploadId, {
				vod: { muxAssetId: assetId, status: 'preparing' },
				desk: { muxAssetId: assetId, videoStatus: 'preparing' }
			});
		} else if (type === 'video.asset.ready') {
			const assetId = data.id;
			const playbackId = data.playback_ids?.[0]?.id || null;
			const duration = data.duration ?? null;
			const aspectRatio = data.aspect_ratio || null;
			if (!assetId) return json({ received: true });
			await updateByAssetId(assetId, {
				vod: {
					muxPlaybackId: playbackId,
					duration,
					aspectRatio,
					status: 'ready'
				},
				desk: {
					muxPlaybackId: playbackId,
					videoDuration: duration ? Math.round(duration) : null,
					videoAspectRatio: aspectRatio,
					videoStatus: 'ready'
				}
			});
		} else if (type === 'video.asset.errored') {
			const assetId = data.id;
			if (!assetId) return json({ received: true });
			await updateByAssetId(assetId, {
				vod: { status: 'errored' },
				desk: { videoStatus: 'errored' }
			});
		}
	} catch (err) {
		console.error(`Error handling Mux webhook ${type}:`, err);
		return json({ error: 'Internal error' }, { status: 500 });
	}

	return json({ received: true });
}

/**
 * Update the first row that matches `uploadId` in the vod / cms_entry /
 * cms_lesson tables. Column sets differ per table, so the caller passes
 * both the VOD-shape and Desk-shape update objects.
 */
async function updateByUploadId(uploadId, { vod: vodSet, desk: deskSet }) {
	const stamp = { updatedAt: new Date() };
	const vodRes = await db
		.update(vod)
		.set({ ...vodSet, ...stamp })
		.where(eq(vod.muxUploadId, uploadId))
		.returning({ id: vod.id });
	if (vodRes.length) return;
	const entryRes = await db
		.update(deskEntry)
		.set({ ...deskSet, ...stamp })
		.where(eq(deskEntry.muxUploadId, uploadId))
		.returning({ id: deskEntry.id });
	if (entryRes.length) return;
	await db
		.update(deskLesson)
		.set({ ...deskSet, ...stamp })
		.where(eq(deskLesson.muxUploadId, uploadId));
}

/**
 * Update the first row that matches `assetId` in the vod / cms_entry /
 * cms_lesson tables. Same shape as updateByUploadId but keyed on asset ID.
 */
async function updateByAssetId(assetId, { vod: vodSet, desk: deskSet }) {
	const stamp = { updatedAt: new Date() };
	const vodRes = await db
		.update(vod)
		.set({ ...vodSet, ...stamp })
		.where(eq(vod.muxAssetId, assetId))
		.returning({ id: vod.id });
	if (vodRes.length) return;
	const entryRes = await db
		.update(deskEntry)
		.set({ ...deskSet, ...stamp })
		.where(eq(deskEntry.muxAssetId, assetId))
		.returning({ id: deskEntry.id });
	if (entryRes.length) return;
	await db
		.update(deskLesson)
		.set({ ...deskSet, ...stamp })
		.where(eq(deskLesson.muxAssetId, assetId));
}
