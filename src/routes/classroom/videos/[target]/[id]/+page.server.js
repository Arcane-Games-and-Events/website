import { redirect } from '@sveltejs/kit';
import { videoPage } from '$lib/server/video/page.js';

/** /classroom/videos/[target]/[id] — one course video's analytics (lesson or trailer). */
export async function load(event) {
	const { params, url } = event;
	if (params.target !== 'lesson' && params.target !== 'trailer')
		throw redirect(301, `/desk/videos/${params.target}/${params.id}${url.search}`);
	return videoPage(event);
}
