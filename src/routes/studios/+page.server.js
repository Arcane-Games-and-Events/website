import { watchHome } from '$lib/server/studio/public.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

/** /studios — AGE Studios: the Studio's gameplay, podcasts, interviews and video. */
export async function load({ locals, setHeaders }) {
	setHeaders({
		'cache-control': locals.user
			? 'private, no-store'
			: 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
		vary: 'Cookie'
	});
	const home = await watchHome().catch((err) => {
		console.error('Watch: home failed', err);
		return null;
	});
	return { home, member: userHasPremiumAccess(locals.user) };
}
