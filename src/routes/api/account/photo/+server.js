import { error, json } from '@sveltejs/kit';
import { MediaError } from '$lib/server/media/library.js';
import { removeProfilePhoto, setProfilePhoto } from '$lib/server/profile/photo.js';

export const config = { maxDuration: 60 };

/**
 * POST /api/account/photo  (multipart: file)
 *   Set your profile photo. Anyone signed in, whatever their role; the same
 *   photo shows on your course pages and bylines. Returns { photo: { id, url } }.
 *
 * DELETE /api/account/photo
 *   Remove it.
 */
export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Sign in first.');
	const form = await request.formData().catch(() => null);
	const file = form?.get('file');
	try {
		return json({ photo: await setProfilePhoto(locals.user, /** @type {File} */ (file)) });
	} catch (err) {
		if (err instanceof MediaError) throw error(err.status, err.message);
		throw err;
	}
}

export async function DELETE({ locals }) {
	if (!locals.user) throw error(401, 'Sign in first.');
	await removeProfilePhoto(locals.user);
	return json({ ok: true });
}
