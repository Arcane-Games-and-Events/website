/**
 * Mux videos on the site, in one place.
 *
 * Every Mux video belongs to exactly one owner row and is managed only
 * there — videos aren't a shared library:
 *
 *   vod      bonus gameplay          (vods)
 *   entry    an article's video      (cms_entry)
 *   lesson   a course lesson's video (cms_lesson)
 *   trailer  a course's trailer      (cms_course, trailer_* columns)
 *   entryDraft  an article's pending video (cms_entry.draft_meta.video):
 *            a writer's upload or removal on a live piece, which goes
 *            live only when an editor or admin approves it
 *
 * Each upload is created for its owner (passthrough `{target}:{id}`), and
 * the webhook and sync only ever write to the row whose upload or asset it
 * is. A row keeps its current asset while a replacement uploads; once the
 * new asset exists the old one is deleted from Mux, so nothing is orphaned.
 */
import { env } from '$env/dynamic/private';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { vod, deskEntry, deskLesson, deskCourse } from '$lib/server/db/schema.js';
import { bump } from '$lib/server/cache/index.js';
import {
	canEditCourses,
	canOverseeCourses,
	canUseStudio,
	canEditEntry,
	isAdmin
} from '$lib/server/auth/roles.js';
import mux from '$lib/server/mux.js';
import { holdsForApproval } from '$lib/server/desk/entries.js';

const YOUTUBE = ['Url', 'VideoId', 'Title', 'ThumbnailUrl', 'Duration'];

/** Table and column names per owner. */
export const TARGETS = {
	vod: {
		table: vod,
		cache: 'vods',
		cols: {
			upload: 'muxUploadId',
			asset: 'muxAssetId',
			playback: 'muxPlaybackId',
			status: 'status',
			duration: 'duration',
			aspect: 'aspectRatio',
			provider: null
		},
		roundDuration: false,
		youtube: []
	},
	entry: {
		table: deskEntry,
		cache: 'entries',
		cols: {
			upload: 'muxUploadId',
			asset: 'muxAssetId',
			playback: 'muxPlaybackId',
			status: 'videoStatus',
			duration: 'videoDuration',
			aspect: 'videoAspectRatio',
			provider: 'videoProvider'
		},
		roundDuration: true,
		youtube: YOUTUBE.map((k) => `youtube${k}`)
	},
	lesson: {
		table: deskLesson,
		cache: 'courses',
		cols: {
			upload: 'muxUploadId',
			asset: 'muxAssetId',
			playback: 'muxPlaybackId',
			status: 'videoStatus',
			duration: 'videoDuration',
			aspect: 'videoAspectRatio',
			provider: 'videoProvider'
		},
		roundDuration: true,
		youtube: YOUTUBE.map((k) => `youtube${k}`)
	},
	trailer: {
		table: deskCourse,
		cache: 'courses',
		cols: {
			upload: 'trailerMuxUploadId',
			asset: 'trailerMuxAssetId',
			playback: 'trailerMuxPlaybackId',
			status: 'trailerVideoStatus',
			duration: 'trailerVideoDuration',
			aspect: 'trailerVideoAspectRatio',
			provider: 'trailerVideoProvider'
		},
		roundDuration: true,
		youtube: YOUTUBE.map((k) => `trailerYoutube${k}`)
	},
	// Not columns: the slot lives in draft_meta.video (see slotOf/writeVideo).
	entryDraft: {
		table: deskEntry,
		cache: null,
		draft: true,
		cols: {
			upload: 'muxUploadId',
			asset: 'muxAssetId',
			playback: 'muxPlaybackId',
			status: 'videoStatus',
			duration: 'videoDuration',
			aspect: 'videoAspectRatio',
			provider: 'provider'
		},
		roundDuration: true,
		youtube: YOUTUBE.map((k) => `youtube${k}`)
	}
};

/** The fields a row's video is read from: the row, or its pending slot. */
const slotOf = (target, row) => (TARGETS[target].draft ? row.draftMeta?.video || {} : row);

/** The owner a target's passthrough names (a pending slot is its entry's). */
const passthroughTarget = (target) => (target === 'entryDraft' ? 'entry' : target);

/** @param {string} target */
export const isTarget = (target) => Object.hasOwn(TARGETS, target);

/** Upload states after which no asset will ever arrive. */
const UPLOAD_ENDED = new Set(['timed_out', 'cancelled', 'errored']);

export class VideoError extends Error {
	/** @param {number} status @param {string} message */
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

// ---------------------------------------------------------------- rows

/** The owner row, or null. */
export async function getOwner(target, id) {
	const t = TARGETS[target];
	if (!t || !id) return null;
	try {
		const [row] = await db.select().from(t.table).where(eq(t.table.id, id)).limit(1);
		return row ?? null;
	} catch {
		return null; // not a uuid
	}
}

/** The video fields of a row, named the same for every owner. */
export function videoOf(target, row) {
	const c = TARGETS[target].cols;
	row = slotOf(target, row);
	return {
		provider: c.provider ? row[c.provider] : row[c.upload] || row[c.asset] ? 'mux' : null,
		uploadId: row[c.upload] ?? null,
		assetId: row[c.asset] ?? null,
		playbackId: row[c.playback] ?? null,
		status: row[c.status] ?? null,
		duration: row[c.duration] != null ? Number(row[c.duration]) : null,
		aspectRatio: row[c.aspect] ?? null,
		// Studio podcast episodes can be audio only (no frames to show).
		audio: target === 'vod' && row.mediaType === 'audio'
	};
}

async function writeVideo(target, id, fields) {
	const t = TARGETS[target];
	if (t.draft) return writePendingVideo(id, fields);
	const set = { updatedAt: new Date() };
	for (const [k, v] of Object.entries(fields)) {
		const col = t.cols[k];
		if (col) set[col] = v;
	}
	const [row] = await db.update(t.table).set(set).where(eq(t.table.id, id)).returning();
	await bump(t.cache);
	return row;
}

/**
 * Merge fields into an entry's pending video slot (draft_meta.video) and
 * mark the entry as having pending changes. `fields` uses the slot's names
 * (upload, asset, …) and may include the YouTube keys.
 */
async function writePendingVideo(id, fields) {
	const c = TARGETS.entryDraft.cols;
	const [row] = await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1);
	if (!row) return null;
	const slot = { ...(row.draftMeta?.video || {}) };
	for (const [k, v] of Object.entries(fields)) slot[c[k] || k] = v;
	const [updated] = await db
		.update(deskEntry)
		.set({
			draftMeta: { ...(row.draftMeta || {}), video: slot },
			draftUpdatedAt: row.draftUpdatedAt || new Date(),
			updatedAt: new Date()
		})
		.where(eq(deskEntry.id, id))
		.returning();
	return updated;
}

// ---------------------------------------------------------------- permissions

/**
 * Who may upload, replace or delete an owner's video. Studio media (gameplay,
 * episodes, interviews): anyone in the Studio. An article: whoever can edit the entry. A lesson or trailer:
 * admins and editors (who oversee every course), or the course's own teacher.
 */
export async function canManageVideoOf(user, target, row) {
	if (!user || !row) return false;
	if (target === 'vod') return canUseStudio(user);
	if (target === 'entry') return canEditEntry(user, row.authorId);
	if (canOverseeCourses(user)) return true;
	if (!canEditCourses(user)) return false;
	const authorId =
		target === 'trailer'
			? row.authorId
			: (
					await db
						.select({ authorId: deskCourse.authorId })
						.from(deskCourse)
						.where(eq(deskCourse.id, row.courseId))
						.limit(1)
				)[0]?.authorId;
	return !!authorId && authorId === user.id;
}

/** Load an owner and check the user may manage its video; throws VideoError. */
export async function ownerFor(user, target, id) {
	if (!isTarget(target) || TARGETS[target].draft) throw new VideoError(404, 'Unknown video');
	const row = await getOwner(target, id);
	if (!row) throw new VideoError(404, 'Not found');
	if (!(await canManageVideoOf(user, target, row))) throw new VideoError(403, 'Not permitted');
	return row;
}

/**
 * The owner and the slot this person's change goes to: a writer's change
 * to a live piece's video goes to its pending slot (`entryDraft`) and waits
 * for an editor or admin; everything else acts on the live video.
 * @returns {Promise<{ target: string, row: any }>}
 */
export async function ownerSlot(user, target, id) {
	const row = await ownerFor(user, target, id);
	if (target === 'entry' && holdsForApproval(row, user)) return { target: 'entryDraft', row };
	return { target, row };
}

// ---------------------------------------------------------------- uploads

/**
 * Start a direct upload for an owner. The row keeps its current asset and
 * status (a live video stays live; the replacement deletes it once the new
 * one exists); any earlier upload that never finished is cancelled.
 *
 * @returns {Promise<{ uploadUrl: string, uploadId: string, row: any }>}
 */
export async function createDirectUpload({ target, row, origin }) {
	const v = videoOf(target, row);
	// An earlier upload that never finished is cancelled (one that did is
	// already done, and Mux just refuses).
	if (v.uploadId) await mux.video.uploads.cancel(v.uploadId).catch(() => {});
	const upload = await mux.video.uploads.create({
		cors_origin: origin,
		// Long recordings on venue Wi-Fi need more than Mux's one-hour default.
		timeout: 86400,
		new_asset_settings: {
			playback_policy: ['signed'],
			video_quality: 'basic',
			max_resolution_tier: '1080p',
			passthrough: `${passthroughTarget(target)}:${row.id}`
		}
	});

	const t = TARGETS[target];
	const wasMux = v.provider === 'mux';
	// A replacement leaves the row as it is (status included), so a live
	// video keeps playing until the new one exists; only a row with no video
	// yet waits for the file.
	const set = { upload: upload.id };
	if (!v.assetId || !wasMux) set.status = 'waiting';
	// Switching from a YouTube link (or nothing): the Mux side starts empty.
	if (t.cols.provider && !wasMux) {
		Object.assign(set, {
			provider: 'mux',
			asset: null,
			playback: null,
			duration: null,
			aspect: null
		});
		if (t.draft) for (const k of t.youtube) set[k] = null;
	}
	let updated = await writeVideo(target, row.id, set);
	if (!t.draft && t.youtube.length && !wasMux) {
		const clear = Object.fromEntries(t.youtube.map((c) => [c, null]));
		[updated] = await db.update(t.table).set(clear).where(eq(t.table.id, row.id)).returning();
	}
	return { uploadUrl: upload.url, uploadId: upload.id, row: updated };
}

/** Cancel an open Mux upload; one that already finished is left alone. */
export async function cancelMuxUpload(uploadId) {
	if (uploadId) await mux.video.uploads.cancel(uploadId).catch(() => {});
}

/** Stop an upload that hasn't finished; the row keeps its previous video. */
export async function cancelUpload(target, row) {
	const v = videoOf(target, row);
	if (!v.uploadId) return row;
	await mux.video.uploads.cancel(v.uploadId).catch(() => {});
	return applyMuxState(target, row, { upload: { id: v.uploadId, status: 'cancelled' } });
}

// ---------------------------------------------------------------- state

/** How many rows anywhere point at this asset, pending videos included. */
export async function assetUses(assetId) {
	if (!assetId) return 0;
	let n = 0;
	for (const t of Object.values(TARGETS)) {
		if (t.draft) continue;
		const col = t.table[t.cols.asset];
		n += (await db.select({ id: t.table.id }).from(t.table).where(eq(col, assetId))).length;
	}
	n += (
		await db
			.select({ id: deskEntry.id })
			.from(deskEntry)
			.where(sql`${deskEntry.draftMeta} -> 'video' ->> 'muxAssetId' = ${assetId}`)
	).length;
	return n;
}

/** Delete an asset from Mux; already gone counts as done. */
export async function deleteAsset(assetId) {
	if (!assetId) return;
	try {
		await mux.video.assets.delete(assetId);
	} catch (err) {
		if (err?.status !== 404) throw err;
	}
}

/** The owner a Mux passthrough names, or null for anything else. */
export function parsePassthrough(passthrough) {
	const m = /^(vod|entry|lesson|trailer):([0-9a-f-]{36})$/i.exec(passthrough || '');
	return m ? { target: m[1], id: m[2] } : null;
}

/**
 * Mirror Mux's state onto the owner row — the one writer used by both the
 * webhook and sync.
 *
 * @param {string} target
 * @param {any} row
 * @param {{ asset?: any, upload?: any }} state  Mux asset and/or upload objects
 * @returns {Promise<any>} the updated row
 */
export async function applyMuxState(target, row, { asset, upload } = {}) {
	const v = videoOf(target, row);

	if (asset?.id) {
		// An asset made for another row never lands here.
		const owner = parsePassthrough(asset.passthrough);
		if (owner && (owner.target !== passthroughTarget(target) || owner.id !== row.id)) return row;

		const t = TARGETS[target];
		const duration = asset.duration ?? null;
		const fields = {
			asset: asset.id,
			playback: asset.playback_ids?.[0]?.id ?? null,
			duration: duration != null && t.roundDuration ? Math.round(duration) : duration,
			aspect: asset.aspect_ratio ?? null,
			status:
				asset.status === 'ready' ? 'ready' : asset.status === 'errored' ? 'errored' : 'preparing'
		};
		const replaced = v.assetId && v.assetId !== asset.id ? v.assetId : null;
		const updated = await writeVideo(target, row.id, fields);
		// The old video is no longer used by this row; drop it unless something
		// else still points at it.
		if (replaced && (await assetUses(replaced)) === 0) {
			await deleteAsset(replaced).catch((err) =>
				console.warn('[video] could not delete replaced asset', replaced, err?.message)
			);
		}
		return updated;
	}

	if (upload?.id && upload.id === v.uploadId && UPLOAD_ENDED.has(upload.status)) {
		// The upload never produced a video: keep playing the previous one if
		// there is one, otherwise mark it failed.
		return writeVideo(target, row.id, { status: v.assetId ? 'ready' : 'errored' });
	}
	return row;
}

/**
 * Ask Mux directly — for when the webhook can't reach this server (dev,
 * previews) or missed an event. Returns the updated row.
 */
export async function syncFromMux(target, row) {
	const v = videoOf(target, row);
	if (v.provider !== 'mux') return row;

	if (v.uploadId) {
		let upload = null;
		try {
			upload = await mux.video.uploads.retrieve(v.uploadId);
		} catch (err) {
			if (err?.status !== 404) throw err;
		}
		if (upload?.asset_id) {
			const asset = await mux.video.assets.retrieve(upload.asset_id);
			return applyMuxState(target, row, { asset });
		}
		if (upload && UPLOAD_ENDED.has(upload.status)) return applyMuxState(target, row, { upload });
		if (upload) return row; // still waiting for the file
	}
	if (v.assetId) {
		try {
			const asset = await mux.video.assets.retrieve(v.assetId);
			return applyMuxState(target, row, { asset });
		} catch (err) {
			if (err?.status === 404) return writeVideo(target, row.id, { status: 'errored' });
			throw err;
		}
	}
	return row;
}

/**
 * Remove an owner's video from Mux. Gameplay rows are deleted outright;
 * articles, lessons and trailers just have their video slot emptied.
 */
export async function deleteOwnerVideo(target, row) {
	const v = videoOf(target, row);
	if (v.uploadId) {
		await mux.video.uploads.cancel(v.uploadId).catch(() => {});
	}
	const t = TARGETS[target];
	if (target === 'vod') {
		await db.delete(vod).where(eq(vod.id, row.id));
		await bump(t.cache);
	} else if (t.draft) {
		// A pending removal: the live video stays until it's approved.
		const clear = { provider: null, upload: null, asset: null, playback: null, status: null };
		for (const k of t.youtube) clear[k] = null;
		await writeVideo(target, row.id, { ...clear, duration: null, aspect: null });
	} else {
		const clear = {
			provider: null,
			upload: null,
			asset: null,
			playback: null,
			status: null,
			duration: null,
			aspect: null
		};
		await writeVideo(target, row.id, clear);
		if (t.youtube.length) {
			await db
				.update(t.table)
				.set(Object.fromEntries(t.youtube.map((c) => [c, null])))
				.where(eq(t.table.id, row.id));
		}
	}
	if (v.assetId && (await assetUses(v.assetId)) === 0) await deleteAsset(v.assetId);
}

// ---------------------------------------------------------------- webhook lookup

/** The row a Mux upload or asset belongs to: { target, row } or null. */
export async function findOwner({ uploadId, assetId, passthrough }) {
	// A writer's pending video on a live piece.
	for (const [key, value] of [
		['muxUploadId', uploadId],
		['muxAssetId', assetId]
	]) {
		if (!value) continue;
		const [row] = await db
			.select()
			.from(deskEntry)
			.where(sql`${deskEntry.draftMeta} -> 'video' ->> ${key} = ${value}`)
			.limit(1);
		if (row) return { target: 'entryDraft', row };
	}
	for (const [target, t] of Object.entries(TARGETS)) {
		if (t.draft) continue;
		const conds = [];
		if (uploadId) conds.push(eq(t.table[t.cols.upload], uploadId));
		if (assetId) conds.push(eq(t.table[t.cols.asset], assetId));
		for (const cond of conds) {
			const [row] = await db.select().from(t.table).where(cond).limit(1);
			if (row) return { target, row };
		}
	}
	const owner = parsePassthrough(passthrough);
	if (owner) {
		const row = await getOwner(owner.target, owner.id);
		// only claim it if the row is waiting on an upload
		if (row && owner.target === 'entry' && videoOf('entryDraft', row).status === 'waiting')
			return { target: 'entryDraft', row };
		if (row && videoOf(owner.target, row).status === 'waiting')
			return { target: owner.target, row };
	}
	return null;
}

// ---------------------------------------------------------------- unused assets

/** Deleting unused assets is only safe where the site's database is the
 * whole picture: dev shares the Mux account with production. */
export function canDeleteUnused() {
	return env.VERCEL_ENV === 'production';
}

/** Every asset id some row points at. */
async function usedAssetIds() {
	const used = new Set();
	const pending = await db
		.select({ a: sql`${deskEntry.draftMeta} -> 'video' ->> 'muxAssetId'` })
		.from(deskEntry)
		.where(sql`${deskEntry.draftMeta} -> 'video' ->> 'muxAssetId' IS NOT NULL`);
	for (const r of pending) used.add(r.a);
	for (const t of Object.values(TARGETS)) {
		if (t.draft) continue;
		const col = t.table[t.cols.asset];
		const rows = await db.select({ a: col }).from(t.table);
		for (const r of rows) if (r.a) used.add(r.a);
	}
	return used;
}

const OWNER_WORD = {
	vod: 'gameplay',
	entry: 'an article',
	lesson: 'a lesson',
	trailer: 'a trailer'
};

/** Mux assets no row uses: [{ id, playbackId, duration, createdAt, was }]. */
export async function listUnusedAssets() {
	const used = await usedAssetIds();
	const out = [];
	for await (const a of mux.video.assets.list({ limit: 100 })) {
		if (used.has(a.id)) continue;
		const owner = parsePassthrough(a.passthrough);
		out.push({
			id: a.id,
			playbackId: a.playback_ids?.[0]?.id ?? null,
			duration: a.duration ?? null,
			status: a.status,
			createdAt: a.created_at ? new Date(Number(a.created_at) * 1000) : null,
			was: owner ? OWNER_WORD[owner.target] : a.passthrough ? 'gameplay (older upload)' : null
		});
	}
	return out.sort((x, y) => (y.createdAt?.getTime() ?? 0) - (x.createdAt?.getTime() ?? 0));
}

/** Delete an unused asset; refused off production or if a row now uses it. */
export async function deleteUnusedAsset(assetId) {
	if (!canDeleteUnused()) {
		throw new VideoError(403, 'Unused videos can only be deleted on the live site.');
	}
	if ((await assetUses(assetId)) > 0) throw new VideoError(409, 'That video is in use.');
	await deleteAsset(assetId);
}

/** Admins only — unused assets belong to no area. */
export const canSeeUnused = (user) => isAdmin(user);
