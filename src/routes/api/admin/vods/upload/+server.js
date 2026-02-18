import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { vod } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import mux from '$lib/server/mux.js';

export async function POST({ request, locals, url }) {
	// Admin only
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, 'Forbidden');
	}

	const { vodId } = await request.json();
	if (!vodId) {
		throw error(400, 'vodId is required');
	}

	// Verify the VOD exists
	const [existing] = await db.select().from(vod).where(eq(vod.id, vodId)).limit(1);
	if (!existing) {
		throw error(404, 'VOD not found');
	}

	// Create a Mux direct upload
	const origin = url.origin;
	const upload = await mux.video.uploads.create({
		new_asset_settings: {
			playback_policy: ['signed'],
			passthrough: vodId
		},
		cors_origin: origin
	});

	// Store the upload ID on the VOD record
	await db
		.update(vod)
		.set({
			muxUploadId: upload.id,
			status: 'waiting',
			updatedAt: new Date()
		})
		.where(eq(vod.id, vodId));

	return json({ uploadUrl: upload.url });
}
