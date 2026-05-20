import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsMedia } from '$lib/server/db/schema.js';
import { requireCmsAccess } from '$lib/server/guards.js';
import { uploadImage } from '$lib/server/cms/storage.js';

/**
 * POST /api/cms/upload
 * Multipart form: field `file` (image), optional `alt`.
 * Uploads to Supabase Storage, creates a cms_media row, returns it.
 *
 * Used by:
 *   - Article cover image picker
 *   - Editor body image insert
 */
export async function POST({ request, locals }) {
	const user = requireCmsAccess(locals);

	const form = await request.formData();
	const file = form.get('file');
	const alt = form.get('alt')?.toString() || null;
	if (!file || !(file instanceof File)) {
		throw error(400, 'No file uploaded');
	}
	if (!file.type?.startsWith('image/')) {
		throw error(400, 'Only image uploads are supported');
	}

	const arrayBuf = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuf);

	let result;
	try {
		result = await uploadImage(buffer, file.type);
	} catch (e) {
		console.error('Upload failed:', e);
		throw error(500, e?.message || 'Upload failed');
	}

	const [row] = await db
		.insert(cmsMedia)
		.values({
			uploadedBy: user.id,
			storagePath: result.storagePath,
			url: result.url,
			mimeType: result.mimeType,
			width: result.width,
			height: result.height,
			alt
		})
		.returning();

	return json({ media: row });
}
