import { json, error } from '@sveltejs/kit';
import { canEditEntries, canEditCourses } from '$lib/server/auth/roles.js';
import { db } from '$lib/server/db/index.js';
import { deskMedia } from '$lib/server/db/schema.js';
import { getSupabase, DESK_MEDIA_BUCKET } from '$lib/server/supabase.js';
import { VARIANT_WIDTHS } from '$lib/server/desk/image.js';
import sharp from 'sharp';

/**
 * POST /api/desk/upload
 *
 * Accepts a multipart form with a single `file` field, uploads the bytes
 * to Supabase Storage, and inserts a `cms_media` row pointing at the
 * upload. Returns the new media row so the caller (the Lexical editor's
 * inline-image widget, the Cover/Thumbnail pickers, etc.) can drop the
 * reference into the entry/lesson body immediately.
 *
 * Raster images also get resized WebP copies at the widths in
 * `VARIANT_WIDTHS`, stored beside the original so pages can serve a
 * phone-sized file to a phone (see $lib/server/desk/image.js). A failed
 * resize never fails the upload — the row just has no variants.
 *
 * Auth: any user with either the writer or creator capability (or admin).
 * Anyone else gets 403.
 */
export async function POST({ request, locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!canEditEntries(user) && !canEditCourses(user)) {
		throw error(403, 'Not permitted');
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		throw error(400, 'Expected multipart form with a `file` field');
	}
	if (!file.type?.startsWith('image/')) {
		throw error(400, 'Only image uploads are supported');
	}
	if (file.size > 10 * 1024 * 1024) {
		throw error(413, 'Image must be 10 MB or smaller');
	}

	const supabase = getSupabase();
	if (!supabase) {
		throw error(500, 'Storage backend not configured');
	}

	// One folder per upload, named by UUID: the original keeps its extension
	// and the resized copies sit beside it. The original filename stays out
	// of the path because sanitized names can produce shapes Supabase
	// Storage's path parser rejects.
	const ext = file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
	const folder = crypto.randomUUID();
	const storagePath = `${folder}/original${ext ? `.${ext}` : ''}`;

	const bytes = new Uint8Array(await file.arrayBuffer());
	const { error: uploadError } = await supabase.storage
		.from(DESK_MEDIA_BUCKET)
		.upload(storagePath, bytes, {
			contentType: file.type,
			cacheControl: '31536000',
			upsert: false
		});
	if (uploadError) {
		console.error(
			`[desk/upload] Supabase Storage upload failed (bucket=${DESK_MEDIA_BUCKET}, path=${storagePath}):`,
			uploadError
		);
		throw error(500, `Upload failed: ${uploadError.message || 'unknown error'}`);
	}

	const {
		data: { publicUrl }
	} = supabase.storage.from(DESK_MEDIA_BUCKET).getPublicUrl(storagePath);

	const { width, height } = await writeVariants(supabase, folder, bytes, file.type);

	const [row] = await db
		.insert(deskMedia)
		.values({
			uploadedBy: user.id,
			storagePath,
			url: publicUrl,
			mimeType: file.type,
			width,
			height
		})
		.returning();

	return json({ media: row }, { status: 201 });
}

/**
 * Read the image's dimensions and store resized WebP copies for every
 * variant width narrower than the original. SVG and animated formats are
 * left alone. Returns the dimensions, or nulls when the file isn't a
 * raster image sharp can read.
 */
async function writeVariants(supabase, folder, bytes, mimeType) {
	if (!/^image\/(jpeg|png|webp|avif|tiff)$/.test(mimeType)) return { width: null, height: null };
	try {
		const source = sharp(bytes, { failOn: 'none' }).rotate();
		const meta = await source.metadata();
		const width = meta.width ?? null;
		const height = meta.height ?? null;
		if (!width) return { width, height };

		await Promise.all(
			VARIANT_WIDTHS.filter((w) => w < width).map(async (w) => {
				const out = await source.clone().resize({ width: w }).webp({ quality: 80 }).toBuffer();
				const { error: err } = await supabase.storage
					.from(DESK_MEDIA_BUCKET)
					.upload(`${folder}/${w}.webp`, out, {
						contentType: 'image/webp',
						cacheControl: '31536000',
						upsert: true
					});
				if (err) console.error(`[desk/upload] variant ${w}w failed for ${folder}:`, err);
			})
		);
		return { width, height };
	} catch (err) {
		console.error(`[desk/upload] variants skipped for ${folder}:`, err?.message || err);
		return { width: null, height: null };
	}
}
