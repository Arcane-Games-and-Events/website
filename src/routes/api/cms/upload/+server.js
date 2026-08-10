import { json, error } from '@sveltejs/kit';
import { canEditEntries, canEditCourses } from '$lib/server/auth/roles.js';
// import { db } from '$lib/server/db/index.js';
// import { cmsMedia } from '$lib/server/db/schema.js';

/**
 * POST /api/cms/upload
 *
 * Accepts a multipart form with a single `file` field, uploads the bytes
 * to Supabase Storage, and inserts a `cms_media` row pointing at the
 * upload. Returns the new media row shape so the caller (the Lexical
 * editor's inline-image widget, or the Cover/Thumbnail pickers) can drop
 * the reference into the entry/lesson body immediately.
 *
 * Auth: any user with either the writer or creator capability (or admin).
 * Anyone else gets 403.
 *
 * ---------------------------------------------------------------------
 * Phase 1 status: auth + input parsing wired. Actual bytes-to-Supabase
 * step and DB insert are a Phase 2 concern — they need a decision on
 * SDK (`@supabase/supabase-js` recommended), bucket naming, and public
 * vs signed URLs. See the CMS plan Phase 2 (Editor + backend).
 * ---------------------------------------------------------------------
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

	// TODO(Phase 2): stream the file to Supabase Storage and insert a
	// cms_media row. Placeholder shape below documents the response the
	// editor expects. Uncomment the imports up top and something like:
	//
	//   const path = `entries/${crypto.randomUUID()}/${file.name}`;
	//   await supabase.storage.from('cms-media').upload(path, file, { ... });
	//   const { data: { publicUrl } } = supabase.storage.from('cms-media').getPublicUrl(path);
	//   const [row] = await db.insert(cmsMedia).values({
	//     uploadedBy: user.id,
	//     storagePath: path,
	//     url: publicUrl,
	//     mimeType: file.type
	//   }).returning();
	//   return json(row);

	return json(
		{
			error: 'Not implemented',
			detail:
				'Image upload endpoint scaffolded in Phase 1 (auth + validation). ' +
				'Supabase Storage integration lands in Phase 2 alongside the CMS editor UI.'
		},
		{ status: 501 }
	);
}
