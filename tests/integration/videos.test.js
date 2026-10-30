/**
 * Videos against a real database, with Mux stubbed: who may manage which
 * video, videos staying with the row they were uploaded for, replacing and
 * deleting (and the Mux asset going with them), the webhook, unused assets,
 * and the gameplay analytics built from tracked views.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import {
	caConversion,
	caView,
	deskCourse,
	deskEntry,
	deskLesson,
	deskModule,
	vod
} from '$lib/server/db/schema.js';
import mux from '$lib/server/mux.js';
import {
	applyMuxState,
	canManageVideoOf,
	createDirectUpload,
	deleteOwnerVideo,
	deleteUnusedAsset,
	syncFromMux
} from '$lib/server/video/mux.js';
import { listArticleVideos, listGameplay } from '$lib/server/video/list.js';
import { startView } from '$lib/server/contentAnalytics/collect.js';
import { retentionOf, summarize, videoDetail } from '$lib/server/contentAnalytics/video.js';
import * as uploadRoute from '../../src/routes/api/desk/videos/[target]/[id]/upload/+server.js';
import * as videoRoute from '../../src/routes/api/desk/videos/[target]/[id]/+server.js';
import * as createVodRoute from '../../src/routes/api/desk/videos/vod/+server.js';
import * as webhook from '../../src/routes/api/webhooks/mux/+server.js';
import { createAdmin, createUser } from '../support/factories.js';

let writer, otherWriter, editor, creator, admin;
const muxLog = { deleted: [], cancelled: [], created: [] };

beforeEach(async () => {
	writer = await createUser({ additionalRoles: ['writer'] });
	otherWriter = await createUser({ additionalRoles: ['writer'] });
	editor = await createUser({ additionalRoles: ['editor'] });
	creator = await createUser({ additionalRoles: ['creator'] });
	admin = await createAdmin();

	muxLog.deleted = [];
	muxLog.cancelled = [];
	muxLog.created = [];
	mux.video.uploads.create = vi.fn(async (opts) => {
		muxLog.created.push(opts);
		return { id: `up_${muxLog.created.length}`, url: 'https://storage.example/upload' };
	});
	mux.video.uploads.cancel = vi.fn(async (id) => muxLog.cancelled.push(id));
	mux.video.assets.delete = vi.fn(async (id) => muxLog.deleted.push(id));
});

afterEach(() => {
	env.VERCEL_ENV = '';
});

async function makeVod(overrides = {}) {
	const [row] = await db
		.insert(vod)
		.values({ title: 'Match', status: 'waiting', createdBy: admin.id, ...overrides })
		.returning();
	return row;
}
async function makeEntry(author, overrides = {}) {
	const [row] = await db
		.insert(deskEntry)
		.values({
			title: 'Piece',
			slug: `piece-${randomUUID().slice(0, 8)}`,
			authorId: author.id,
			status: 'draft',
			...overrides
		})
		.returning();
	return row;
}
async function makeLesson(courseAuthor) {
	const [course] = await db
		.insert(deskCourse)
		.values({ title: 'Course', slug: `c-${randomUUID().slice(0, 6)}`, authorId: courseAuthor.id })
		.returning();
	const [mod] = await db
		.insert(deskModule)
		.values({ courseId: course.id, title: 'One', position: 0 })
		.returning();
	const [lesson] = await db
		.insert(deskLesson)
		.values({ courseId: course.id, moduleId: mod.id, slug: 'l', title: 'Lesson' })
		.returning();
	return { course, lesson };
}

const req = (user, params, body, method = 'POST') => ({
	params,
	locals: { user },
	url: new URL('http://test/api'),
	request: new Request('http://test/api', {
		method,
		headers: { 'content-type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	})
});
const status = async (fn) => {
	try {
		return (await fn()).status;
	} catch (err) {
		return err.status;
	}
};
const asset = (id, owner, extra = {}) => ({
	id,
	status: 'ready',
	duration: 1834.2,
	aspect_ratio: '16:9',
	playback_ids: [{ id: `pb_${id}`, policy: 'signed' }],
	passthrough: owner,
	...extra
});

describe('who manages which video', () => {
	test('gameplay: admins and editors only', async () => {
		const v = await makeVod();
		expect(await canManageVideoOf(admin, 'vod', v)).toBe(true);
		expect(await canManageVideoOf(editor, 'vod', v)).toBe(true);
		expect(await canManageVideoOf(writer, 'vod', v)).toBe(false);
		expect(await status(() => uploadRoute.POST(req(writer, { target: 'vod', id: v.id })))).toBe(
			403
		);
		expect(await status(() => videoRoute.DELETE(req(writer, { target: 'vod', id: v.id })))).toBe(
			403
		);
		expect(await status(() => createVodRoute.POST(req(writer, {}, { title: 'X' })))).toBe(403);
		expect(await status(() => createVodRoute.POST(req(editor, {}, { title: 'X' })))).toBe(201);
	});

	test('an article: its writer, editors and admins; not other writers', async () => {
		const e = await makeEntry(writer);
		expect(
			await status(() => uploadRoute.POST(req(otherWriter, { target: 'entry', id: e.id })))
		).toBe(403);
		const res = await uploadRoute.POST(req(writer, { target: 'entry', id: e.id }));
		expect(res.status).toBe(200);
		expect(await canManageVideoOf(editor, 'entry', e)).toBe(true);
	});

	test('a lesson: its course author with the creator role, editors and admins', async () => {
		const mine = await makeLesson(creator);
		const theirs = await makeLesson(admin);
		expect(await canManageVideoOf(creator, 'lesson', mine.lesson)).toBe(true);
		expect(await canManageVideoOf(creator, 'trailer', mine.course)).toBe(true);
		expect(await canManageVideoOf(creator, 'lesson', theirs.lesson)).toBe(false);
		expect(await canManageVideoOf(editor, 'lesson', theirs.lesson)).toBe(true);
		expect(await canManageVideoOf(writer, 'lesson', mine.lesson)).toBe(false);
	});
});

describe('uploads', () => {
	test('a direct upload is made for its owner, with a day to finish', async () => {
		const e = await makeEntry(writer);
		const { row } = await createDirectUpload({ target: 'entry', row: e, origin: 'http://x' });
		const opts = muxLog.created[0];
		expect(opts.timeout).toBe(86400);
		expect(opts.new_asset_settings.passthrough).toBe(`entry:${e.id}`);
		expect(opts.new_asset_settings.video_quality).toBe('basic');
		expect(row).toMatchObject({
			videoProvider: 'mux',
			muxUploadId: 'up_1',
			videoStatus: 'waiting'
		});
	});

	test('replacing keeps the old video until the new one exists, then deletes it', async () => {
		const v = await makeVod({ muxAssetId: 'old', muxPlaybackId: 'pb_old', status: 'ready' });
		const { row } = await createDirectUpload({ target: 'vod', row: v, origin: 'http://x' });
		expect(row).toMatchObject({ muxAssetId: 'old', status: 'ready', muxUploadId: 'up_1' });
		const updated = await applyMuxState('vod', row, { asset: asset('new', `vod:${v.id}`) });
		expect(updated).toMatchObject({ muxAssetId: 'new', muxPlaybackId: 'pb_new', status: 'ready' });
		expect(muxLog.deleted).toEqual(['old']);
	});

	test('an asset made for another row is never attached', async () => {
		const a = await makeVod({ muxUploadId: 'up_a' });
		const b = await makeVod();
		const same = await applyMuxState('vod', a, { asset: asset('stray', `vod:${b.id}`) });
		expect(same.muxAssetId).toBeNull();
	});

	test('an upload that times out falls back to the old video, or fails', async () => {
		const withOld = await makeVod({ muxAssetId: 'old', muxUploadId: 'up_x', status: 'waiting' });
		const a = await applyMuxState('vod', withOld, { upload: { id: 'up_x', status: 'timed_out' } });
		expect(a.status).toBe('ready');
		const fresh = await makeVod({ muxUploadId: 'up_y', status: 'waiting' });
		const b = await applyMuxState('vod', fresh, { upload: { id: 'up_y', status: 'timed_out' } });
		expect(b.status).toBe('errored');
	});

	test('sync asks Mux and mirrors it, without a webhook', async () => {
		const v = await makeVod({ muxUploadId: 'up_s', status: 'waiting' });
		mux.video.uploads.retrieve = vi.fn(async () => ({
			id: 'up_s',
			status: 'asset_created',
			asset_id: 'a_s'
		}));
		mux.video.assets.retrieve = vi.fn(async () => asset('a_s', `vod:${v.id}`));
		const row = await syncFromMux('vod', v);
		expect(row).toMatchObject({ muxAssetId: 'a_s', status: 'ready' });
		expect(Math.round(row.duration)).toBe(1834);
	});
});

describe('deleting', () => {
	test('gameplay goes from the site and Mux', async () => {
		const v = await makeVod({ muxAssetId: 'a1', status: 'ready' });
		const res = await videoRoute.DELETE(req(editor, { target: 'vod', id: v.id }, null, 'DELETE'));
		expect(res.status).toBe(200);
		expect(await db.select().from(vod).where(eq(vod.id, v.id))).toHaveLength(0);
		expect(muxLog.deleted).toEqual(['a1']);
	});

	test('an article keeps its page and loses only the video', async () => {
		const e = await makeEntry(writer, {
			videoProvider: 'mux',
			muxAssetId: 'a2',
			muxPlaybackId: 'pb',
			videoStatus: 'ready'
		});
		await deleteOwnerVideo('entry', e);
		const [row] = await db.select().from(deskEntry).where(eq(deskEntry.id, e.id));
		expect(row).toMatchObject({ videoProvider: null, muxAssetId: null, videoStatus: null });
		expect(muxLog.deleted).toEqual(['a2']);
	});

	test('unused assets are only deleted on the live site, and only if still unused', async () => {
		await expect(deleteUnusedAsset('loose')).rejects.toMatchObject({ status: 403 });
		env.VERCEL_ENV = 'production';
		await makeVod({ muxAssetId: 'taken' });
		await expect(deleteUnusedAsset('taken')).rejects.toMatchObject({ status: 409 });
		await deleteUnusedAsset('loose');
		expect(muxLog.deleted).toEqual(['loose']);
	});
});

describe('the webhook', () => {
	test('lands each event on the row it belongs to', async () => {
		const e = await makeEntry(writer, {
			videoProvider: 'mux',
			muxUploadId: 'up_w',
			videoStatus: 'waiting'
		});
		mux.webhooks.unwrap = () => ({
			type: 'video.asset.ready',
			data: asset('a_w', `entry:${e.id}`, { upload_id: 'up_w' })
		});
		const res = await webhook.POST({
			request: new Request('http://x', { method: 'POST', body: '{}' })
		});
		expect(res.status).toBe(200);
		const [row] = await db.select().from(deskEntry).where(eq(deskEntry.id, e.id));
		expect(row).toMatchObject({ muxAssetId: 'a_w', videoStatus: 'ready', videoDuration: 1834 });
	});
});

describe('areas', () => {
	test('each area lists only its own videos', async () => {
		const v = await makeVod({ title: 'Gameplay one' });
		const e = await makeEntry(writer, {
			title: 'With video',
			videoProvider: 'mux',
			muxAssetId: 'ae'
		});
		await makeEntry(writer, { title: 'No video' });
		expect((await listGameplay()).map((x) => x.id)).toEqual([v.id]);
		expect((await listArticleVideos()).map((x) => x.id)).toEqual([e.id]);
	});
});

describe('gameplay analytics', () => {
	const event = (user = null) => ({
		locals: { user },
		request: new Request('http://x', { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh)' } })
	});

	test('a gameplay page view is recorded against the video', async () => {
		const v = await makeVod();
		const id = randomUUID();
		await startView({ id, vodId: v.id, visitorId: randomUUID(), sessionId: randomUUID() }, event());
		const [row] = await db.select().from(caView).where(eq(caView.id, id));
		expect(row).toMatchObject({ vodId: v.id, entryId: null, kind: 'gameplay' });
		await startView(
			{ id: randomUUID(), vodId: randomUUID(), visitorId: randomUUID(), sessionId: randomUUID() },
			event()
		);
		expect(await db.select().from(caView)).toHaveLength(1);
	});

	test('retention, key moments and totals come from the watched seconds', () => {
		// 200 s video: each 5% stretch is 10 s.
		const full = Array(20).fill(10);
		const halfway = [...Array(10).fill(10), ...Array(10).fill(0)];
		const rewatch = [...Array(10).fill(10), 40, ...Array(9).fill(10)];
		const view = (bins, extra = {}) => ({
			video_plays: 1,
			video_duration: 200,
			video_seconds: bins.reduce((a, b) => a + b, 0),
			video_max_pct: 100,
			video_bins: bins,
			video_completed: true,
			visitor_id: randomUUID(),
			...extra
		});
		const views = [
			view(full),
			view(full),
			view(rewatch),
			view(halfway, { video_max_pct: 50, video_completed: false }),
			{ video_plays: 0, visitor_id: randomUUID() }
		];
		const r = retentionOf(views);
		expect(r.curve[0].pct).toBe(100);
		expect(r.curve[10].pct).toBe(75);
		expect(r.drops[0]).toMatchObject({ at: 50, lost: 25 });
		expect(r.rewatched[0]).toMatchObject({ at: 50 });
		const t = summarize(views);
		expect(t).toMatchObject({ visits: 5, views: 4, playRate: 80, completionRate: 75 });
	});

	test('staff views are left out and sign-ups after watching are credited', async () => {
		const v = await makeVod({ muxAssetId: 'av', status: 'ready' });
		const session = randomUUID();
		const base = {
			vodId: v.id,
			visitorId: randomUUID(),
			sessionId: session,
			qualified: true,
			kind: 'gameplay',
			videoPlays: 1,
			videoSeconds: 120,
			videoDuration: 200,
			videoMaxPct: 60,
			videoBins: Array(20).fill(6),
			startedAt: new Date(Date.now() - 3600e3)
		};
		await db.insert(caView).values([
			{ ...base, id: randomUUID(), audience: 'anonymous' },
			{ ...base, id: randomUUID(), audience: 'staff', sessionId: randomUUID() }
		]);
		await db
			.insert(caConversion)
			.values({ kind: 'signup', sessionId: session, at: new Date(Date.now() - 1800e3) });
		const report = await videoDetail('vod', v.id, 7);
		expect(report.available).toBe(true);
		expect(report.totals).toMatchObject({ views: 1, signups: 1, premium: 0 });
		expect(report.realtime.last48).toBe(1);
	});

	test('deleting a gameplay video deletes its views', async () => {
		const v = await makeVod();
		await db.insert(caView).values({
			id: randomUUID(),
			vodId: v.id,
			visitorId: randomUUID(),
			sessionId: randomUUID(),
			audience: 'anonymous',
			kind: 'gameplay'
		});
		await deleteOwnerVideo('vod', v);
		expect(await db.select().from(caView)).toHaveLength(0);
	});
});

describe('Mux Data', () => {
	test('a token without Data access reads as not connected', async () => {
		const { muxVideoData } = await import('$lib/server/video/muxData.js');
		env.MUX_TOKEN_ID = 'id';
		env.MUX_TOKEN_SECRET = 'secret';
		const realFetch = globalThis.fetch;
		globalThis.fetch = vi.fn(async () => new Response('{}', { status: 403 }));
		try {
			expect(await muxVideoData(`asset-${randomUUID()}`, 30)).toEqual({ connected: false });
		} finally {
			globalThis.fetch = realFetch;
			env.MUX_TOKEN_ID = '';
			env.MUX_TOKEN_SECRET = '';
		}
	});
});

describe('gameplay covers', () => {
	test('a cover is saved, shown with the video, and counts as a use of the image', async () => {
		const { deskMedia } = await import('$lib/server/db/schema.js');
		const { updateGameplay, withCovers } = await import('$lib/server/video/gameplay.js');
		const { mediaUsage } = await import('$lib/server/media/library.js');
		const id = randomUUID();
		await db.insert(deskMedia).values({
			id,
			uploadedBy: admin.id,
			storagePath: `${id}/original.jpg`,
			url: `https://x.test/cms-media/${id}/original.jpg`,
			mimeType: 'image/jpeg',
			alt: 'Dash and Rhinar',
			status: 'ready'
		});
		const v = await makeVod({ title: 'Final' });
		const saved = await updateGameplay(v, { coverImageId: id });
		expect(saved.coverImageId).toBe(id);
		const [withCover] = await withCovers([saved]);
		expect(withCover.cover).toMatchObject({
			src: expect.stringContaining(id),
			alt: 'Dash and Rhinar'
		});
		expect((await mediaUsage([id])).get(id)).toEqual([
			expect.objectContaining({ kind: 'gameplay', title: 'Final' })
		]);
		await expect(updateGameplay(saved, { coverImageId: randomUUID() })).rejects.toMatchObject({
			status: 400
		});
		const cleared = await updateGameplay(saved, { coverImageId: null });
		expect(cleared.coverImageId).toBeNull();
		expect((await withCovers([cleared]))[0].cover).toBeNull();
	});
});
