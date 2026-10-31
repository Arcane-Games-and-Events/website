import { error } from '@sveltejs/kit';
import { channelVideos, getChannel, withAvatars } from '$lib/server/studio/network.js';

/** /studio/network/[id] — one creator: their details and the videos to pick from. */
export async function load({ params, url, depends }) {
	depends('studio:network');
	const row = await getChannel(params.id);
	if (!row) throw error(404, 'Creator not found');
	const show = ['featured', 'new'].includes(url.searchParams.get('show') ?? '')
		? url.searchParams.get('show')
		: 'all';
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const [[channel], videos, featured] = await Promise.all([
		withAvatars([row]),
		channelVideos(row.id, { show, q }),
		channelVideos(row.id, { show: 'featured' })
	]);
	return { channel, videos, featured, show, q };
}
