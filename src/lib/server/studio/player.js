/**
 * The player page's loader, shared by AGE Studios (/studios/[id]: shows,
 * interviews, films) and the Library (/library/matches/[id]: matches). An
 * item opened at the other one's address is sent to its own. The item and
 * what's next are cached; whether this viewer may play it, and the signed
 * playback tokens, are worked out per request and never cached.
 */
import { error, redirect } from '@sveltejs/kit';
import mux from '$lib/server/mux.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { playerItem } from './public.js';

/** @param {{ params: { id: string }, locals: any }} event @param {'matches' | 'studios'} home */
export async function playerLoad({ params, locals }, home) {
	const shared = await playerItem(params.id);
	if (!shared) throw error(404, 'Not found');
	const { item, raw } = shared;
	const isMatch = item.kind === 'gameplay';
	if (isMatch !== (home === 'matches')) throw redirect(301, item.href);

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
