/**
 * The image library against a real database: who sees which images, who can
 * edit or delete them, delete being refused while an image is in use, and
 * the image processing itself (copies, blur, crop and rotate). Storage isn't
 * configured in tests, so file removal is skipped; everything else is real.
 */
import { beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	deskAuthorProfile,
	deskCourse,
	deskEntry,
	deskLesson,
	deskMedia,
	deskModule
} from '$lib/server/db/schema.js';
import {
	canManage,
	deleteMedia,
	listMedia,
	mediaUsage,
	updateMedia
} from '$lib/server/media/library.js';
import { applyEdit, inspect, renderAvif, renderWebp } from '$lib/server/media/process.js';
import * as mediaRoute from '../../src/routes/api/desk/media/[id]/+server.js';
import * as entryRoute from '../../src/routes/api/desk/entries/[id]/+server.js';
import { createAdmin, createUser } from '../support/factories.js';

const writerRoles = { additionalRoles: ['writer'] };
let writer, otherWriter, editor, admin;

beforeEach(async () => {
	writer = await createUser(writerRoles);
	otherWriter = await createUser(writerRoles);
	editor = await createUser({ additionalRoles: ['editor'] });
	admin = await createAdmin();
});

async function createMedia(owner, overrides = {}) {
	const id = randomUUID();
	const [row] = await db
		.insert(deskMedia)
		.values({
			id,
			uploadedBy: owner.id,
			storagePath: `${id}/original.jpg`,
			url: `https://x.test/cms-media/${id}/original.jpg`,
			mimeType: 'image/jpeg',
			name: `Image ${id.slice(0, 4)}`,
			width: 1200,
			height: 675,
			status: 'ready',
			...overrides
		})
		.returning();
	return row;
}

async function createEntry(author, overrides = {}) {
	const [row] = await db
		.insert(deskEntry)
		.values({
			title: 'A piece',
			slug: `piece-${randomUUID().slice(0, 8)}`,
			authorId: author.id,
			status: 'draft',
			...overrides
		})
		.returning();
	return row;
}

const event = (user, params, body) => ({
	params,
	locals: { user },
	request: new Request('http://test/api', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body ?? {})
	})
});
const status = async (fn) => {
	try {
		const res = await fn();
		return res.status;
	} catch (err) {
		return err.status;
	}
};

describe('who sees which images', () => {
	test('a writer sees only their own uploads', async () => {
		const mine = await createMedia(writer);
		await createMedia(otherWriter);
		const { items, all } = await listMedia(writer);
		expect(all).toBe(false);
		expect(items.map((i) => i.id)).toEqual([mine.id]);
	});

	test('editors and admins see everyone’s, and can narrow to their own', async () => {
		await createMedia(writer);
		await createMedia(otherWriter);
		const own = await createMedia(editor);
		for (const user of [editor, admin]) {
			const { items, all } = await listMedia(user);
			expect(all).toBe(true);
			expect(items).toHaveLength(3);
		}
		const { items } = await listMedia(editor, { scope: 'mine' });
		expect(items.map((i) => i.id)).toEqual([own.id]);
	});

	test('uploads still in progress are not listed', async () => {
		await createMedia(writer, { status: 'uploading' });
		expect((await listMedia(writer)).items).toHaveLength(0);
	});

	test('search matches name, alt text and credit', async () => {
		const a = await createMedia(writer, { name: 'Dragon cover' });
		const b = await createMedia(writer, { alt: 'a red dragon' });
		const c = await createMedia(writer, { credit: 'Art by Dragonfly' });
		await createMedia(writer, { name: 'Something else' });
		const { items } = await listMedia(writer, { q: 'dragon' });
		expect(items.map((i) => i.id).sort()).toEqual([a.id, b.id, c.id].sort());
	});
});

describe('who can change an image', () => {
	test('the uploader, editors and admins; not other writers', async () => {
		const row = await createMedia(writer);
		expect(canManage(writer, row)).toBe(true);
		expect(canManage(editor, row)).toBe(true);
		expect(canManage(admin, row)).toBe(true);
		expect(canManage(otherWriter, row)).toBe(false);
	});

	test('another writer gets 403 from GET, PATCH and DELETE', async () => {
		const row = await createMedia(writer);
		const params = { id: row.id };
		expect(await status(() => mediaRoute.GET(event(otherWriter, params)))).toBe(403);
		expect(await status(() => mediaRoute.PATCH(event(otherWriter, params, { alt: 'x' })))).toBe(
			403
		);
		expect(await status(() => mediaRoute.DELETE(event(otherWriter, params)))).toBe(403);
		expect((await db.select().from(deskMedia).where(eq(deskMedia.id, row.id))).length).toBe(1);
	});

	test('a writer can’t put someone else’s image on their entry', async () => {
		const theirs = await createMedia(otherWriter);
		const entry = await createEntry(writer);
		const res = await status(() =>
			entryRoute.PATCH(event(writer, { id: entry.id }, { coverImageId: theirs.id }))
		);
		expect(res).toBe(403);
		const mine = await createMedia(writer);
		const ok = await entryRoute.PATCH(event(writer, { id: entry.id }, { coverImageId: mine.id }));
		expect(ok.status).toBe(200);
	});

	test('name, alt text and credit change in place', async () => {
		const row = await createMedia(writer);
		const updated = await updateMedia(row, {
			name: '  New name ',
			alt: 'A hero',
			credit: 'Art by Jane',
			creditUrl: 'https://jane.example'
		});
		expect(updated).toMatchObject({
			name: 'New name',
			alt: 'A hero',
			credit: 'Art by Jane',
			creditUrl: 'https://jane.example/'
		});
	});

	test('a credit link that isn’t a web address is refused', async () => {
		const row = await createMedia(writer);
		await expect(updateMedia(row, { creditUrl: 'javascript:alert(1)' })).rejects.toMatchObject({
			status: 400
		});
	});
});

describe('delete is refused while an image is used', () => {
	test('as a cover, a draft thumbnail, inline in a body, in a lesson, or as an author photo', async () => {
		const cover = await createMedia(writer);
		const draftThumb = await createMedia(writer);
		const inline = await createMedia(writer);
		const inLesson = await createMedia(writer);
		const photo = await createMedia(writer);
		const free = await createMedia(writer);

		await createEntry(writer, {
			title: 'Cover piece',
			coverImageId: cover.id,
			draftThumbnailImageId: draftThumb.id,
			body: {
				root: {
					type: 'root',
					children: [{ type: 'upload', version: 1, value: { url: 'x', mediaId: inline.id } }]
				}
			}
		});
		const [course] = await db
			.insert(deskCourse)
			.values({ title: 'Course', slug: `c-${randomUUID().slice(0, 6)}`, authorId: writer.id })
			.returning();
		const [mod] = await db
			.insert(deskModule)
			.values({ courseId: course.id, title: 'Module', position: 0 })
			.returning();
		await db.insert(deskLesson).values({
			courseId: course.id,
			moduleId: mod.id,
			slug: 'lesson',
			title: 'Lesson',
			body: { root: { children: [{ type: 'upload', value: { mediaId: inLesson.id } }] } }
		});
		await db.insert(deskAuthorProfile).values({ userId: writer.id, avatarMediaId: photo.id });

		const usage = await mediaUsage([cover.id, draftThumb.id, inline.id, inLesson.id, photo.id]);
		expect(usage.get(cover.id)).toEqual([expect.objectContaining({ label: 'Cover' })]);
		expect(usage.get(draftThumb.id)).toEqual([
			expect.objectContaining({ label: 'Draft thumbnail' })
		]);
		expect(usage.get(inline.id)).toEqual([expect.objectContaining({ label: 'In the text' })]);
		expect(usage.get(inLesson.id)).toEqual([expect.objectContaining({ kind: 'lesson' })]);
		expect(usage.get(photo.id)).toEqual([expect.objectContaining({ kind: 'profile' })]);

		for (const row of [cover, draftThumb, inline, inLesson, photo]) {
			const res = await mediaRoute.DELETE(event(writer, { id: row.id }));
			expect(res.status).toBe(409);
			const body = await res.json();
			expect(body.usage.length).toBeGreaterThan(0);
		}
		expect((await deleteMedia(free)).deleted).toBe(true);
		expect((await db.select().from(deskMedia).where(eq(deskMedia.id, free.id))).length).toBe(0);
	});
});

describe('processing', () => {
	const photo = () =>
		sharp({
			create: { width: 3000, height: 1688, channels: 3, background: { r: 180, g: 60, b: 40 } }
		})
			.jpeg()
			.toBuffer();

	test('a big photo gets WebP copies at each width up to 2400, and a blur', async () => {
		const out = await renderWebp(await photo());
		expect(out.widths).toEqual([480, 960, 1600, 2400]);
		expect(out.width).toBe(3000);
		expect(out.files).toHaveLength(4);
		const big = await sharp(out.files[3].buffer).metadata();
		expect(big).toMatchObject({ format: 'webp', width: 2400 });
		expect(out.blur.startsWith('data:image/webp;base64,')).toBe(true);
		expect(out.blur.length).toBeLessThan(1500);
	});

	test('AVIF copies come out smaller than the WebP ones', async () => {
		const bytes = await photo();
		const [avif] = await renderAvif(bytes, [960]);
		const { files } = await renderWebp(bytes);
		expect((await sharp(avif.buffer).metadata()).format).toBe('heif');
		expect(avif.buffer.length).toBeLessThan(files.find((f) => f.width === 960).buffer.length);
	});

	test('transparency survives', async () => {
		const png = await sharp({
			create: { width: 800, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
		})
			.png()
			.toBuffer();
		const { files } = await renderWebp(png);
		expect((await sharp(files[0].buffer).metadata()).hasAlpha).toBe(true);
	});

	test('rotate, then crop in fractions of the rotated image', async () => {
		const bytes = await photo();
		const out = await applyEdit(bytes, { rotate: 90, crop: { x: 0, y: 0.5, w: 1, h: 0.5 } });
		const info = await inspect(out.buffer);
		// 3000×1688 turned a quarter is 1688×3000; the bottom half is 1688×1500
		expect(info.width).toBe(1688);
		expect(info.height).toBe(1500);
		expect(out.mimeType).toBe('image/webp');
	});
});
