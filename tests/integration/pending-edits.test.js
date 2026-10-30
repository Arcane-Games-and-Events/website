/**
 * Every change to a live piece waits for an editor or admin, who may
 * approve their own: the text in draft_*, and the web address, access,
 * tag, images and video in draft_meta. Drafts save directly. Mux is stubbed.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskEntry, deskMedia } from '$lib/server/db/schema.js';
import mux from '$lib/server/mux.js';
import { approveEntryDraft, discardEntryDraft, updateEntry } from '$lib/server/desk/entries.js';
import { findOrCreateTag, getEntryTag, setEntryTag } from '$lib/server/desk/tags.js';
import { applyMuxState, findOwner, ownerSlot } from '$lib/server/video/mux.js';
import { mediaUsage } from '$lib/server/media/library.js';
import * as approveRoute from '../../src/routes/api/desk/entries/[id]/approve-draft/+server.js';
import * as discardRoute from '../../src/routes/api/desk/entries/[id]/discard-draft/+server.js';
import * as uploadRoute from '../../src/routes/api/desk/videos/[target]/[id]/upload/+server.js';
import * as videoRoute from '../../src/routes/api/desk/videos/[target]/[id]/+server.js';
import { createAdmin, createUser } from '../support/factories.js';

let writer, editor, admin;
const muxLog = { deleted: [], created: [] };

beforeEach(async () => {
	writer = await createUser({ additionalRoles: ['writer'] });
	editor = await createUser({ additionalRoles: ['editor'] });
	admin = await createAdmin();
	muxLog.deleted = [];
	muxLog.created = [];
	mux.video.uploads.create = vi.fn(async (opts) => {
		muxLog.created.push(opts);
		return { id: `up_${muxLog.created.length}`, url: 'https://storage.example/upload' };
	});
	mux.video.uploads.cancel = vi.fn(async () => {});
	mux.video.assets.delete = vi.fn(async (id) => muxLog.deleted.push(id));
});

async function image() {
	const id = randomUUID();
	await db.insert(deskMedia).values({
		id,
		uploadedBy: writer.id,
		storagePath: `${id}/original.jpg`,
		url: `https://x.test/cms-media/${id}/original.jpg`,
		mimeType: 'image/jpeg',
		status: 'ready'
	});
	return id;
}

async function livePiece(overrides = {}) {
	const [row] = await db
		.insert(deskEntry)
		.values({
			title: 'Live piece',
			slug: `live-${randomUUID().slice(0, 8)}`,
			authorId: writer.id,
			status: 'published',
			publishedAt: new Date(),
			accessMode: 'free',
			...overrides
		})
		.returning();
	return row;
}
const reload = async (id) =>
	(await db.select().from(deskEntry).where(eq(deskEntry.id, id)).limit(1))[0];
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
const asset = (id, owner) => ({
	id,
	status: 'ready',
	duration: 120,
	aspect_ratio: '16:9',
	playback_ids: [{ id: `pb_${id}` }],
	passthrough: owner
});

describe("a writer's changes to a live piece wait", () => {
	test('web address, access, tag, cover and thumbnail are held, then approved', async () => {
		const cover = await image();
		const thumb = await image();
		const { tag: oldTag } = await findOrCreateTag('Strategy');
		const { tag: newTag } = await findOrCreateTag('Deck Tech');
		const e = await livePiece();
		await setEntryTag(e.id, oldTag.id);

		await updateEntry(
			e.id,
			{
				slug: 'A New Address',
				accessMode: 'premium',
				tagId: newTag.id,
				coverImageId: cover,
				thumbnailImageId: thumb
			},
			writer
		);
		let row = await reload(e.id);
		expect(row).toMatchObject({ slug: e.slug, accessMode: 'free', coverImageId: null });
		expect(row.draftMeta).toMatchObject({
			slug: 'a-new-address',
			accessMode: 'premium',
			tagId: newTag.id,
			coverImageId: cover,
			thumbnailImageId: thumb
		});
		expect(row.draftUpdatedAt).not.toBeNull();
		expect((await getEntryTag(e.id))?.id).toBe(oldTag.id);
		expect((await mediaUsage([cover])).get(cover)).toEqual([
			expect.objectContaining({ label: 'Pending cover' })
		]);

		const res = await approveRoute.POST(req(editor, { id: e.id }));
		expect(res.status).toBe(200);
		row = await reload(e.id);
		expect(row).toMatchObject({
			slug: 'a-new-address',
			accessMode: 'premium',
			coverImageId: cover,
			thumbnailImageId: thumb,
			draftMeta: null,
			draftUpdatedAt: null
		});
		expect((await getEntryTag(e.id))?.id).toBe(newTag.id);
	});

	test('the web address is made unique on approval', async () => {
		await livePiece({ slug: 'taken' });
		const e = await livePiece();
		await updateEntry(e.id, { slug: 'taken' }, writer);
		await approveEntryDraft(e.id, editor);
		expect((await reload(e.id)).slug).toBe('taken-2');
	});

	test('saving an unchanged value is not a change, and changing back withdraws it', async () => {
		const e = await livePiece();
		await updateEntry(e.id, { accessMode: 'free', slug: e.slug }, writer);
		expect((await reload(e.id)).draftUpdatedAt).toBeNull();
		await updateEntry(e.id, { accessMode: 'premium' }, writer);
		expect((await reload(e.id)).draftMeta).toEqual({ accessMode: 'premium' });
		await updateEntry(e.id, { accessMode: 'free' }, writer);
		const row = await reload(e.id);
		expect(row.draftMeta).toBeNull();
		expect(row.draftUpdatedAt).toBeNull();
	});

	test('an autosave of unchanged values after approval leaves nothing pending', async () => {
		const body = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } };
		const e = await livePiece({ excerpt: 'Old summary', body });
		const newBody = {
			root: {
				type: 'root',
				children: [{ type: 'paragraph', children: [{ type: 'text', text: 'New' }] }]
			}
		};
		await updateEntry(e.id, { title: 'New title', body: newBody }, admin);
		await approveEntryDraft(e.id, admin);
		const live = await reload(e.id);
		// The editor reloads and autosaves everything it shows, keys in another order.
		await updateEntry(
			e.id,
			{
				title: live.title,
				slug: live.slug,
				excerpt: live.excerpt,
				accessMode: live.accessMode,
				body: { root: { children: newBody.root.children, type: 'root' } }
			},
			admin
		);
		expect(await reload(e.id)).toMatchObject({
			draftTitle: null,
			draftBody: null,
			draftMeta: null,
			draftUpdatedAt: null
		});
	});

	test('changing text back to the live version withdraws it', async () => {
		const e = await livePiece();
		await updateEntry(e.id, { title: 'Something else' }, writer);
		expect((await reload(e.id)).draftUpdatedAt).not.toBeNull();
		await updateEntry(e.id, { title: 'Live piece' }, writer);
		expect(await reload(e.id)).toMatchObject({ draftTitle: null, draftUpdatedAt: null });
	});

	test('discard drops them and the live piece is untouched', async () => {
		const e = await livePiece();
		await updateEntry(e.id, { accessMode: 'premium', title: 'New title' }, writer);
		const res = await discardRoute.POST(req(editor, { id: e.id }));
		expect(res.status).toBe(200);
		expect(await reload(e.id)).toMatchObject({
			accessMode: 'free',
			title: 'Live piece',
			draftMeta: null,
			draftTitle: null
		});
	});

	test('writers can’t approve or discard; editors can, admins too', async () => {
		const e = await livePiece();
		await updateEntry(e.id, { accessMode: 'premium' }, writer);
		expect(await status(() => approveRoute.POST(req(writer, { id: e.id })))).toBe(403);
		expect(await status(() => discardRoute.POST(req(writer, { id: e.id })))).toBe(403);
		expect(
			await status(() => approveRoute.POST(req(editor, { id: e.id }, { asStatus: 'draft' })))
		).toBe(403);
		expect((await approveRoute.POST(req(admin, { id: e.id }))).status).toBe(200);
	});
});

describe('editors and admins', () => {
	test('their own changes wait too, and they can approve them', async () => {
		const e = await livePiece();
		await updateEntry(e.id, { accessMode: 'premium', title: 'Editor title' }, editor);
		let row = await reload(e.id);
		expect(row).toMatchObject({
			accessMode: 'free',
			title: 'Live piece',
			draftTitle: 'Editor title'
		});
		expect(row.draftMeta).toEqual({ accessMode: 'premium' });
		expect((await approveRoute.POST(req(editor, { id: e.id }))).status).toBe(200);
		row = await reload(e.id);
		expect(row).toMatchObject({ accessMode: 'premium', title: 'Editor title', draftMeta: null });
	});

	test('with a writer’s changes pending, theirs join them', async () => {
		const e = await livePiece();
		await updateEntry(e.id, { title: 'Writer title' }, writer);
		await updateEntry(e.id, { accessMode: 'premium' }, editor);
		const row = await reload(e.id);
		expect(row.accessMode).toBe('free');
		expect(row.draftMeta).toEqual({ accessMode: 'premium' });
	});

	test('a draft piece saves directly for everyone', async () => {
		const e = await livePiece({ status: 'draft', publishedAt: null });
		await updateEntry(e.id, { accessMode: 'premium' }, writer);
		expect(await reload(e.id)).toMatchObject({ accessMode: 'premium', draftMeta: null });
	});
});

describe('a writer’s video change on a live piece', () => {
	test('a replacement waits in the pending slot; approval swaps it and deletes the old video', async () => {
		const e = await livePiece({
			videoProvider: 'mux',
			muxAssetId: 'live_a',
			muxPlaybackId: 'pb_live',
			videoStatus: 'ready'
		});
		expect((await ownerSlot(writer, 'entry', e.id)).target).toBe('entryDraft');
		expect((await ownerSlot(editor, 'entry', e.id)).target).toBe('entryDraft');

		const res = await uploadRoute.POST(req(writer, { target: 'entry', id: e.id }));
		expect(res.status).toBe(200);
		expect(muxLog.created[0].new_asset_settings.passthrough).toBe(`entry:${e.id}`);
		let row = await reload(e.id);
		expect(row).toMatchObject({ muxAssetId: 'live_a', videoStatus: 'ready' });
		expect(row.draftMeta.video).toMatchObject({ provider: 'mux', muxUploadId: 'up_1' });

		// Mux reports the new asset: the webhook finds the pending slot.
		const owner = await findOwner({ uploadId: 'up_1' });
		expect(owner?.target).toBe('entryDraft');
		await applyMuxState('entryDraft', owner.row, { asset: asset('new_a', `entry:${e.id}`) });
		row = await reload(e.id);
		expect(row.muxAssetId).toBe('live_a');
		expect(row.draftMeta.video).toMatchObject({ muxAssetId: 'new_a', videoStatus: 'ready' });
		expect(muxLog.deleted).toEqual([]);

		await approveEntryDraft(e.id, editor);
		row = await reload(e.id);
		expect(row).toMatchObject({
			muxAssetId: 'new_a',
			muxPlaybackId: 'pb_new_a',
			videoStatus: 'ready',
			draftMeta: null
		});
		expect(muxLog.deleted).toEqual(['live_a']);
	});

	test('discarding a pending upload deletes it, and the live video stays', async () => {
		const e = await livePiece({ videoProvider: 'mux', muxAssetId: 'live_b', videoStatus: 'ready' });
		await uploadRoute.POST(req(writer, { target: 'entry', id: e.id }));
		const { row } = await ownerSlot(writer, 'entry', e.id);
		await applyMuxState('entryDraft', row, { asset: asset('pending_b', `entry:${e.id}`) });
		await discardEntryDraft(e.id);
		expect(muxLog.deleted).toEqual(['pending_b']);
		expect((await reload(e.id)).muxAssetId).toBe('live_b');
	});

	test('a removal waits too, then empties the slot and deletes the video', async () => {
		const e = await livePiece({ videoProvider: 'mux', muxAssetId: 'live_c', videoStatus: 'ready' });
		const res = await videoRoute.DELETE(req(writer, { target: 'entry', id: e.id }, null, 'DELETE'));
		expect(res.status).toBe(200);
		let row = await reload(e.id);
		expect(row.muxAssetId).toBe('live_c');
		expect(row.draftMeta.video.provider).toBeNull();
		expect(muxLog.deleted).toEqual([]);

		await approveEntryDraft(e.id, admin);
		row = await reload(e.id);
		expect(row).toMatchObject({ videoProvider: null, muxAssetId: null });
		expect(muxLog.deleted).toEqual(['live_c']);
	});
});
