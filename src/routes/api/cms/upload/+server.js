import { json, error } from '@sveltejs/kit';
import { canEditEntries, canEditCourses } from '$lib/server/auth/roles.js';
import { db } from '$lib/server/db/index.js';
import { cmsMedia } from '$lib/server/db/schema.js';
import { getSupabase, CMS_MEDIA_BUCKET } from '$lib/server/supabase.js';

/**
 * POST /api/cms/upload
 *
 * Accepts a multipart form with a single `file` field, uploads the bytes
 * to Supabase Storage, and inserts a `cms_media` row pointing at the
 * upload. Returns the new media row so the caller (the Lexical editor's
 * inline-image widget, the Cover/Thumbnail pickers, etc.) can drop the
 * reference into the entry/lesson body immediately.
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

	// UUID-prefixed path prevents collisions; original filename preserved
	// (sanitized) so the Supabase dashboard stays human-readable.
	const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100) || 'upload';
	const storagePath = `${crypto.randomUUID()}-${safeName}`;

	const bytes = new Uint8Array(await file.arrayBuffer());
	const { error: uploadError } = await supabase.storage
		.from(CMS_MEDIA_BUCKET)
		.upload(storagePath, bytes, {
			contentType: file.type,
			cacheControl: '31536000',
			upsert: false
		});
	if (uploadError) {
		console.error('[cms/upload] Supabase Storage upload failed:', uploadError);
		throw error(500, 'Upload failed');
	}

	const {
		data: { publicUrl }
	} = supabase.storage.from(CMS_MEDIA_BUCKET).getPublicUrl(storagePath);

	const [row] = await db
		.insert(cmsMedia)
		.values({
			uploadedBy: user.id,
			storagePath,
			url: publicUrl,
			mimeType: file.type
		})
		.returning();

	return json({ media: row }, { status: 201 });
}
