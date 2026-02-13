import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { vod, event } from '$lib/server/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		return fail(403, { error: 'Unauthorized' });
	}

	// Fetch VODs
	let vods = [];
	try {
		const rawVods = await db
			.select()
			.from(vod)
			.orderBy(desc(vod.createdAt));

		// Sign thumbnail tokens for signed playback VODs
		const muxMod = await import('$lib/server/mux.js');
		const muxClient = muxMod.default;
		vods = await Promise.all(
			rawVods.map(async (v) => {
				if (!v.muxPlaybackId) return v;
				try {
					const thumbnailToken = await muxClient.jwt.signPlaybackId(v.muxPlaybackId, {
						type: 'thumbnail',
						expiration: '24h'
					});
					return { ...v, thumbnailToken };
				} catch {
					return v;
				}
			})
		);
	} catch (vodErr) {
		console.warn('Could not fetch VODs (table may not exist yet):', vodErr.message);
	}

	// Fetch events for the event selector dropdown
	let events = [];
	try {
		events = await db
			.select({
				id: event.id,
				title: event.title,
				circuit: event.circuit,
				eventDate: event.eventDate
			})
			.from(event)
			.orderBy(desc(event.eventDate));
	} catch (eventErr) {
		console.warn('Could not fetch events:', eventErr.message);
	}

	return {
		user: locals.user,
		vods,
		events
	};
}

export const actions = {
	createVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const player1Name = formData.get('player1Name')?.toString().trim();
		const player1Hero = formData.get('player1Hero')?.toString().trim();
		const player2Name = formData.get('player2Name')?.toString().trim();
		const player2Hero = formData.get('player2Hero')?.toString().trim();
		const eventId = formData.get('eventId')?.toString().trim();
		const isPremium = formData.get('isPremium') !== 'false';

		if (!title) {
			return fail(400, { error: 'Title is required' });
		}

		try {
			const [newVod] = await db
				.insert(vod)
				.values({
					title,
					description: description || null,
					player1Name: player1Name || null,
					player1Hero: player1Hero || null,
					player2Name: player2Name || null,
					player2Hero: player2Hero || null,
					eventId: eventId || null,
					isPremium,
					status: 'waiting',
					createdBy: locals.user.id
				})
				.returning();

			return { success: true, vod: newVod };
		} catch (err) {
			console.error('Error creating VOD:', err);
			return fail(500, { error: 'Failed to create VOD' });
		}
	},

	// Update VOD
	updateVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const player1Name = formData.get('player1Name')?.toString().trim();
		const player1Hero = formData.get('player1Hero')?.toString().trim();
		const player2Name = formData.get('player2Name')?.toString().trim();
		const player2Hero = formData.get('player2Hero')?.toString().trim();
		const eventId = formData.get('eventId')?.toString().trim();
		const isPremium = formData.get('isPremium') !== 'false';

		if (!vodId || !title) {
			return fail(400, { error: 'VOD ID and title are required' });
		}

		try {
			const [updated] = await db
				.update(vod)
				.set({
					title,
					description: description || null,
					player1Name: player1Name || null,
					player1Hero: player1Hero || null,
					player2Name: player2Name || null,
					player2Hero: player2Hero || null,
					eventId: eventId || null,
					isPremium,
					updatedAt: new Date()
				})
				.where(eq(vod.id, vodId))
				.returning();

			return { success: true, vod: updated };
		} catch (err) {
			console.error('Error updating VOD:', err);
			return fail(500, { error: 'Failed to update VOD' });
		}
	},

	// Delete VOD (also deletes Mux asset)
	deleteVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();

		if (!vodId) {
			return fail(400, { error: 'VOD ID is required' });
		}

		try {
			const [vodRecord] = await db.select().from(vod).where(eq(vod.id, vodId)).limit(1);

			if (!vodRecord) {
				return fail(404, { error: 'VOD not found' });
			}

			// Delete Mux asset if it exists
			if (vodRecord.muxAssetId) {
				try {
					const mux = (await import('$lib/server/mux.js')).default;
					await mux.video.assets.delete(vodRecord.muxAssetId);
				} catch (muxErr) {
					console.warn('Could not delete Mux asset:', muxErr.message);
				}
			}

			await db.delete(vod).where(eq(vod.id, vodId));
			return { success: true };
		} catch (err) {
			console.error('Error deleting VOD:', err);
			return fail(500, { error: 'Failed to delete VOD' });
		}
	},

	// Publish VOD
	publishVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();

		if (!vodId) {
			return fail(400, { error: 'VOD ID is required' });
		}

		try {
			await db
				.update(vod)
				.set({
					isPublished: true,
					publishedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(vod.id, vodId));

			return { success: true };
		} catch (err) {
			console.error('Error publishing VOD:', err);
			return fail(500, { error: 'Failed to publish VOD' });
		}
	},

	// Unpublish VOD
	unpublishVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();

		if (!vodId) {
			return fail(400, { error: 'VOD ID is required' });
		}

		try {
			await db
				.update(vod)
				.set({
					isPublished: false,
					updatedAt: new Date()
				})
				.where(eq(vod.id, vodId));

			return { success: true };
		} catch (err) {
			console.error('Error unpublishing VOD:', err);
			return fail(500, { error: 'Failed to unpublish VOD' });
		}
	},

	// Sync VOD status from Mux (workaround for webhook failures)
	syncVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();

		if (!vodId) {
			return fail(400, { error: 'VOD ID is required' });
		}

		try {
			const [vodRecord] = await db.select().from(vod).where(eq(vod.id, vodId)).limit(1);
			if (!vodRecord) {
				return fail(404, { error: 'VOD not found' });
			}

			const mux = (await import('$lib/server/mux.js')).default;

			// If we have an upload ID but no asset ID, fetch from the upload
			let assetId = vodRecord.muxAssetId;
			if (!assetId && vodRecord.muxUploadId) {
				const upload = await mux.video.uploads.retrieve(vodRecord.muxUploadId);
				assetId = upload.asset_id;
				if (assetId) {
					await db
						.update(vod)
						.set({ muxAssetId: assetId, updatedAt: new Date() })
						.where(eq(vod.id, vodId));
				}
			}

			if (!assetId) {
				return fail(400, { error: 'No Mux asset found for this VOD. Upload may still be processing.' });
			}

			// Fetch asset details from Mux
			const asset = await mux.video.assets.retrieve(assetId);
			const playbackId = asset.playback_ids?.[0]?.id;

			const updateData = {
				muxAssetId: assetId,
				muxPlaybackId: playbackId || vodRecord.muxPlaybackId,
				duration: asset.duration || vodRecord.duration,
				aspectRatio: asset.aspect_ratio || vodRecord.aspectRatio,
				status: asset.status === 'ready' ? 'ready' : asset.status === 'errored' ? 'errored' : 'preparing',
				updatedAt: new Date()
			};

			await db.update(vod).set(updateData).where(eq(vod.id, vodId));

			return { success: true, syncedStatus: updateData.status };
		} catch (err) {
			console.error('Error syncing VOD from Mux:', err);
			return fail(500, { error: `Failed to sync: ${err.message}` });
		}
	}
};
