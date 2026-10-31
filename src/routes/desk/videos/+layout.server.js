import { redirect } from '@sveltejs/kit';
import { areasFor } from '$lib/server/video/list.js';
import { canSeeUnused } from '$lib/server/video/mux.js';

/**
 * /desk/videos — the Desk's Mux videos: the videos on articles, for admins
 * and editors. Gameplay, podcasts and interviews live in the Studio
 * (/studio); course videos in the Classroom (/classroom/videos).
 */
export async function load({ locals }) {
	const { articles } = areasFor(locals.user);
	if (!articles) throw redirect(302, '/desk');
	return {
		areas: { gameplay: false, articles, courses: false, allCourses: false },
		canSeeUnused: canSeeUnused(locals.user)
	};
}
