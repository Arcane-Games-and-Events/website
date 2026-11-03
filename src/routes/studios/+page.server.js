import { studiosHub } from '$lib/server/studio/public.js';

/**
 * /studios — AGE Studios: everything AGE makes. Projects (featured ones
 * first), shows and their newest episodes, partners, and the newest
 * matches (which live in the Library).
 */
export async function load({ locals, setHeaders }) {
	setHeaders({
		'cache-control': locals.user
			? 'private, no-store'
			: 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
		vary: 'Cookie'
	});
	try {
		return { hub: await studiosHub() };
	} catch (err) {
		console.error('AGE Studios: hub failed', err);
		return {
			hub: { projects: [], shows: [], episodes: [], partners: null, matches: [] }
		};
	}
}
