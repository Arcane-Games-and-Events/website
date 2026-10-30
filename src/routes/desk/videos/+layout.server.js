import { redirect } from '@sveltejs/kit';
import { areasFor } from '$lib/server/video/list.js';
import { canSeeUnused } from '$lib/server/video/mux.js';

/**
 * /desk/videos — every Mux video on the site, area by area. Admins and
 * editors see Gameplay, Articles and Courses; course creators see their own
 * courses only.
 */
export async function load({ locals }) {
	const areas = areasFor(locals.user);
	if (!areas.gameplay && !areas.articles && !areas.courses) throw redirect(302, '/desk');
	return { areas, canSeeUnused: canSeeUnused(locals.user) };
}
