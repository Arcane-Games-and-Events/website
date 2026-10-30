import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import mux from '$lib/server/mux.js';
import { applyMuxState, findOwner } from '$lib/server/video/mux.js';

/**
 * Mux webhook. Finds the one row the upload or asset belongs to (gameplay,
 * an article, a lesson or a course trailer; see $lib/server/video/mux.js)
 * and mirrors Mux's state onto it with `applyMuxState`, the same writer the
 * Desk's sync uses. Replacing a video deletes the old asset there.
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
		if (type.startsWith('video.asset.')) {
			if (!['video.asset.created', 'video.asset.ready', 'video.asset.errored'].includes(type)) {
				return json({ received: true });
			}
			const owner = await findOwner({
				assetId: data.id,
				uploadId: data.upload_id,
				passthrough: data.passthrough
			});
			if (owner) await applyMuxState(owner.target, owner.row, { asset: data });
		} else if (type === 'video.upload.asset_created') {
			const owner = await findOwner({
				uploadId: data.id,
				passthrough: data.new_asset_settings?.passthrough
			});
			if (owner && data.asset_id) {
				const asset = await mux.video.assets.retrieve(data.asset_id);
				await applyMuxState(owner.target, owner.row, { asset });
			}
		} else if (type === 'video.upload.cancelled' || type === 'video.upload.errored') {
			const owner = await findOwner({ uploadId: data.id });
			if (owner) {
				const status = type === 'video.upload.cancelled' ? 'cancelled' : 'errored';
				await applyMuxState(owner.target, owner.row, { upload: { ...data, status } });
			}
		}
	} catch (err) {
		console.error(`Error handling Mux webhook ${type}:`, err);
		return json({ error: 'Internal error' }, { status: 500 });
	}

	return json({ received: true });
}
