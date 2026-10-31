import { error } from '@sveltejs/kit';
import { body, requireStudio, respond } from '$lib/server/studio/http.js';
import { getVideo, setFeatured } from '$lib/server/studio/network.js';

/** PATCH { isFeatured }: put a creator's video on the site, or take it off. */
export async function PATCH({ locals, params, request }) {
	const user = requireStudio(locals);
	const video = await getVideo(params.videoId);
	if (!video) throw error(404, 'Video not found');
	const { isFeatured } = await body(request);
	return respond(async () => ({ video: await setFeatured(user, video, !!isFeatured) }));
}
