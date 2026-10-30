/**
 * Image processing for the Desk image library.
 *
 * An upload's original sits at `{id}/original.{ext}`. Processing makes the
 * copies pages actually serve, in the same folder:
 *
 *   - WebP at each width from `plannedWidths()` (`{id}/{w}.webp`), done
 *     straight after upload so the image is usable within a second or two;
 *   - AVIF at the same widths (`{id}/{w}.avif`), a second, slower pass the
 *     browser starts without waiting for it. Pages use WebP until it's done;
 *   - a ~20px WebP as a data URI, shown blurred while the real image loads.
 *
 * Photos get lossy settings; images with transparency (logos, cut-outs,
 * screenshots saved as PNG) get higher quality so edges and text stay
 * crisp. SVG and GIF are served as they are.
 */
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia } from '$lib/server/db/schema.js';
import { getSupabase, DESK_MEDIA_BUCKET } from '$lib/server/supabase.js';
import { plannedWidths } from '$lib/server/desk/image.js';
import { bump } from '$lib/server/cache/index.js';

/** Formats sharp can read and that are worth making copies of. */
export const RASTER_TYPES = /^image\/(jpeg|png|webp|avif|tiff)$/;

/** Upload types the library accepts at all. */
export const ACCEPTED_TYPES = /^image\/(jpeg|png|webp|avif|tiff|gif|svg\+xml)$/;

const YEAR = '31536000';

/**
 * Read an image and work out the size it really displays at (EXIF rotation
 * included) and whether it has transparency.
 * @param {Buffer | Uint8Array} bytes
 */
export async function inspect(bytes) {
	const meta = await sharp(bytes, { failOn: 'none' }).metadata();
	// Orientations 5–8 are rotated a quarter turn, so width and height swap.
	const turned = (meta.orientation ?? 1) >= 5;
	return {
		width: (turned ? meta.height : meta.width) ?? null,
		height: (turned ? meta.width : meta.height) ?? null,
		hasAlpha: !!meta.hasAlpha,
		format: meta.format ?? null
	};
}

/**
 * The WebP copies and the blur preview, in memory.
 * @param {Buffer | Uint8Array} bytes
 * @returns {Promise<{ width: number, height: number, widths: number[], files: { width: number, buffer: Buffer }[], blur: string }>}
 */
export async function renderWebp(bytes) {
	const info = await inspect(bytes);
	if (!info.width || !info.height) throw new Error('Could not read the image dimensions');
	const base = sharp(bytes, { failOn: 'none' }).rotate();
	const widths = plannedWidths(info.width);
	const webp = info.hasAlpha
		? { quality: 88, alphaQuality: 100, smartSubsample: true }
		: { quality: 78, smartSubsample: true };
	const files = await Promise.all(
		widths.map(async (width) => ({
			width,
			buffer: await base.clone().resize({ width }).webp(webp).toBuffer()
		}))
	);
	const tiny = await base.clone().resize({ width: 20 }).webp({ quality: 40 }).toBuffer();
	return {
		width: info.width,
		height: info.height,
		widths,
		files,
		blur: `data:image/webp;base64,${tiny.toString('base64')}`
	};
}

/**
 * The AVIF copies, in memory.
 * @param {Buffer | Uint8Array} bytes
 * @param {number[]} widths
 */
export async function renderAvif(bytes, widths) {
	const info = await inspect(bytes);
	const base = sharp(bytes, { failOn: 'none' }).rotate();
	const avif = { quality: info.hasAlpha ? 70 : 50, effort: 4 };
	return Promise.all(
		widths.map(async (width) => ({
			width,
			buffer: await base.clone().resize({ width }).avif(avif).toBuffer()
		}))
	);
}

/** The folder an upload lives in (`{id}/`). */
export function folderOf(row) {
	const i = row.storagePath.indexOf('/');
	return i > 0 ? row.storagePath.slice(0, i + 1) : `${row.id}/`;
}

/** Download an upload's original file. */
export async function downloadOriginal(row, supabase = getSupabase()) {
	if (!supabase) throw new Error('Storage is not configured');
	const { data, error } = await supabase.storage.from(DESK_MEDIA_BUCKET).download(row.storagePath);
	if (error || !data)
		throw new Error(`Could not read the uploaded file: ${error?.message ?? 'missing'}`);
	return Buffer.from(await data.arrayBuffer());
}

async function put(supabase, path, buffer, contentType) {
	const { error } = await supabase.storage
		.from(DESK_MEDIA_BUCKET)
		.upload(path, buffer, { contentType, cacheControl: YEAR, upsert: true });
	if (error) throw new Error(`Could not save ${path}: ${error.message}`);
}

/**
 * Make the WebP copies and blur for an upload and mark it ready. Images that
 * aren't raster (SVG, GIF) are marked ready with no copies.
 *
 * @param {any} row - the cms_media row
 * @param {{ bytes?: Buffer }} [opts] - the original, if already in memory
 * @returns the updated row
 */
export async function processMedia(row, opts = {}) {
	const supabase = getSupabase();
	if (!supabase) throw new Error('Storage is not configured');
	await db
		.update(deskMedia)
		.set({ status: 'processing', updatedAt: new Date() })
		.where(eq(deskMedia.id, row.id));

	try {
		const bytes = opts.bytes ?? (await downloadOriginal(row, supabase));
		const fileSize = bytes.length;

		if (!RASTER_TYPES.test(row.mimeType || '')) {
			let size = { width: row.width, height: row.height };
			if (row.mimeType === 'image/gif') size = await inspect(bytes).catch(() => size);
			const [ready] = await db
				.update(deskMedia)
				.set({
					status: 'ready',
					fileSize,
					width: size.width ?? null,
					height: size.height ?? null,
					updatedAt: new Date()
				})
				.where(eq(deskMedia.id, row.id))
				.returning();
			return ready;
		}

		const out = await renderWebp(bytes);
		const prefix = folderOf(row);
		await Promise.all(
			out.files.map((f) => put(supabase, `${prefix}${f.width}.webp`, f.buffer, 'image/webp'))
		);
		const [ready] = await db
			.update(deskMedia)
			.set({
				status: 'ready',
				fileSize,
				width: out.width,
				height: out.height,
				variantPrefix: prefix,
				variantWidths: out.widths,
				hasAvif: false,
				blur: out.blur,
				updatedAt: new Date()
			})
			.where(eq(deskMedia.id, row.id))
			.returning();
		await bump('media');
		return ready;
	} catch (err) {
		await db
			.update(deskMedia)
			.set({ status: 'failed', updatedAt: new Date() })
			.where(eq(deskMedia.id, row.id));
		throw err;
	}
}

/**
 * Make the AVIF copies for an upload that already has its WebP copies.
 * @param {any} row
 */
export async function processAvif(row) {
	if (!row.variantPrefix || !row.variantWidths?.length || row.hasAvif) return row;
	const supabase = getSupabase();
	if (!supabase) throw new Error('Storage is not configured');
	const bytes = await downloadOriginal(row, supabase);
	const files = await renderAvif(bytes, row.variantWidths);
	await Promise.all(
		files.map((f) => put(supabase, `${row.variantPrefix}${f.width}.avif`, f.buffer, 'image/avif'))
	);
	const [done] = await db
		.update(deskMedia)
		.set({ hasAvif: true, updatedAt: new Date() })
		.where(eq(deskMedia.id, row.id))
		.returning();
	await bump('media');
	return done;
}

/**
 * Rotate, then crop, an image. The crop is given as fractions (0–1) of the
 * rotated image, so it doesn't depend on the size it was drawn at.
 *
 * @param {Buffer | Uint8Array} bytes
 * @param {{ rotate?: number, crop?: { x: number, y: number, w: number, h: number } | null }} edit
 * @returns {Promise<{ buffer: Buffer, mimeType: string, ext: string }>}
 */
export async function applyEdit(bytes, edit) {
	const rotate = [0, 90, 180, 270].includes(Number(edit.rotate)) ? Number(edit.rotate) : 0;
	const info = await inspect(bytes);
	// Bake in EXIF orientation first, then the requested turn.
	const upright = await sharp(bytes, { failOn: 'none' }).rotate().toBuffer();
	let img = sharp(upright, { failOn: 'none' });
	if (rotate) img = sharp(await img.rotate(rotate).toBuffer(), { failOn: 'none' });
	const turned = rotate === 90 || rotate === 270;
	const W = turned ? info.height : info.width;
	const H = turned ? info.width : info.height;
	if (edit.crop) {
		const c = edit.crop;
		const clamp = (v) => Math.min(1, Math.max(0, Number(v) || 0));
		const left = Math.round(clamp(c.x) * W);
		const top = Math.round(clamp(c.y) * H);
		const width = Math.max(1, Math.min(W - left, Math.round(clamp(c.w) * W)));
		const height = Math.max(1, Math.min(H - top, Math.round(clamp(c.h) * H)));
		img = img.extract({ left, top, width, height });
	}
	const buffer = info.hasAlpha
		? await img.webp({ lossless: true }).toBuffer()
		: await img.webp({ quality: 92 }).toBuffer();
	return { buffer, mimeType: 'image/webp', ext: 'webp' };
}
