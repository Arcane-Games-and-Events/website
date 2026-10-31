import { error } from '@sveltejs/kit';
import mux from '$lib/server/mux.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { playerItem } from '$lib/server/studio/public.js';

/**
 * /studios/[id] — one Studio item: video in the video player, audio in the
 * audio player. The item and what's next are cached; whether this viewer
 * may play it, and the signed playback tokens, are worked out per request
 * and never cached.
 */
export async function load({ params, locals }) {
	const shared = await playerItem(params.id);
	if (!shared) throw error(404, 'Not found');
	const { item, raw } = shared;
	const canWatch = !item.isPremium || userHasPremiumAccess(locals.user);
	let tokens = null;
	if (canWatch && raw.muxPlaybackId) {
		try {
			tokens = await mux.jwt.signPlaybackId(raw.muxPlaybackId, {
				type: ['video', 'thumbnail', 'storyboard'],
				expiration: '24h'
			});
		} catch (err) {
			console.error('Error signing Mux playback tokens:', err);
		}
	}
	return {
		user: locals.user,
		item,
		playbackId: canWatch ? raw.muxPlaybackId : null,
		aspectRatio: raw.aspectRatio,
		canWatch,
		tokens,
		related: shared.related,
		next: shared.next,
		prev: shared.prev,
		member: userHasPremiumAccess(locals.user)
	};
}
