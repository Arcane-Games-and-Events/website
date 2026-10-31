import { videoPage } from '$lib/server/video/page.js';

/** /studio/media/[id]/analytics — one item's numbers (the shared video analytics page). */
export const load = (event) =>
	videoPage({ ...event, params: { target: 'vod', id: event.params.id } });
