import { error } from '@sveltejs/kit';
import { networkPlayer } from '$lib/server/studio/public.js';

/**
 * /studios/partners/[slug]/[videoId] — an AGE Network video, playing
 * through YouTube's embed. Free to everyone.
 */
export async function load({ params, setHeaders }) {
	if (!/^[\w-]{6,20}$/.test(params.videoId)) throw error(404, 'Video not found');
	const page = await networkPlayer(params.slug, params.videoId);
	if (!page) throw error(404, 'Video not found');
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' });
	return page;
}
