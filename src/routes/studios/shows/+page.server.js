import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { latestProductions } from '$lib/server/studio/public.js';
import { listShows } from '$lib/server/studio/shows.js';

/** /studios/shows — every show, and the newest episodes, interviews and films. */
export async function load({ setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' });
	const [shows, episodes] = await Promise.all([
		cached('vods:studios:shows:all', () => listShows({ publicOnly: true }), {
			tags: ['vods', 'media'],
			ttl: CACHE_TTL.FIVE_MINUTES
		}),
		cached('vods:studios:episodes:12', () => latestProductions(12), {
			tags: ['vods', 'media'],
			ttl: CACHE_TTL.FIVE_MINUTES
		})
	]);
	return { shows, episodes };
}
