import { redirect } from '@sveltejs/kit';
import { canSeeAllMedia, canUseMedia, listUploaders } from '$lib/server/media/library.js';

/**
 * /desk/images — the image library. Everyone who can upload sees their own
 * images; admins and editors see everyone's and can filter by uploader.
 * The grid itself loads from /api/desk/media.
 */
export async function load({ locals }) {
	if (!canUseMedia(locals.user)) throw redirect(302, '/desk');
	const all = canSeeAllMedia(locals.user);
	const uploaders = all
		? (await listUploaders()).map((u) => ({
				id: u.id,
				name: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unknown',
				count: u.count
			}))
		: [];
	return { canSeeAll: all, uploaders };
}
