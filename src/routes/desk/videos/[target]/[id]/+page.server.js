import { redirect } from '@sveltejs/kit';
import { videoPage } from '$lib/server/video/page.js';

/** Course videos are the Classroom's; gameplay and article videos the Desk's. */
const CLASSROOM = new Set(['lesson', 'trailer']);

/** /desk/videos/[target]/[id] — one gameplay or article video's analytics. */
export async function load(event) {
	const { params, url } = event;
	if (CLASSROOM.has(params.target))
		throw redirect(301, `/classroom/videos/${params.target}/${params.id}${url.search}`);
	return videoPage(event);
}
