import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { vod } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import mux from '$lib/server/mux.js';

export async function POST({ request }) {
	const body = await request.text();
	const headers = Object.fromEntries(request.headers);

	// Verify webhook signature
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
			// An asset was created from a direct upload
			// Link the mux asset ID to the VOD via the upload ID or passthrough
			const uploadId = data.upload_id;
			const assetId = data.asset_id || data.id;

			if (uploadId) {
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
			// Asset is fully processed and ready for playback
			const assetId = data.id;
			const playbackId = data.playback_ids?.[0]?.id;
			const duration = data.duration;
			const aspectRatio = data.aspect_ratio;

			if (assetId) {
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
			// Asset processing failed
			const assetId = data.id;

			if (assetId) {
				await db
					.update(vod)
					.set({
						status: 'errored',
						updatedAt: new Date()
					})
					.where(eq(vod.muxAssetId, assetId));
			}
		}
	} catch (err) {
		console.error(`Error handling Mux webhook ${type}:`, err);
		return json({ error: 'Internal error' }, { status: 500 });
	}

	return json({ received: true });
}
