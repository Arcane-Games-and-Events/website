import { redirect } from '@sveltejs/kit';
import { canSeeAllMedia, canUseMedia, listUploaders } from './library.js';

/**
 * One image library's page. The Desk's (/desk/images) holds article and
 * author images; the Classroom's (/classroom/images) course images; the
 * Studio's (/studio/images) gameplay, episode and show covers. Everyone who can upload sees their own images; admins and editors
 * see everyone's and can filter by uploader. The grid loads from
 * /api/desk/media (the browser sends the library for the page it's on).
 *
 * @param {'content' | 'classroom' | 'studio'} library
 */
export async function imagesPage(locals, library) {
	if (!canUseMedia(locals.user, library))
		throw redirect(302, library === 'content' ? '/desk' : `/${library}`);
	const all = canSeeAllMedia(locals.user, library);
	const uploaders = all
		? (await listUploaders(library)).map((u) => ({
				id: u.id,
				name: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unknown',
				count: u.count
			}))
		: [];
	return { canSeeAll: all, uploaders, library };
}
