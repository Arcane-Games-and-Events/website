import { networkHome, watchHome } from '$lib/server/studio/public.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { KIND } from '$lib/studio/kinds.js';

/** /studios — AGE Studios: gameplay, podcasts, interviews, video and the AGE Network. */
export async function load({ locals, setHeaders }) {
	setHeaders({
		'cache-control': locals.user
			? 'private, no-store'
			: 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
		vary: 'Cookie'
	});
	const [home, network] = await Promise.all([
		watchHome().catch((err) => {
			console.error('AGE Studios: home failed', err);
			return null;
		}),
		networkHome().catch((err) => {
			console.error('AGE Studios: network failed', err);
			return null;
		})
	]);

	// The ticker: the newest of everything, ours and the network's.
	const ours = [
		home?.lead,
		...(home?.gameplay ?? []),
		...(home?.podcasts ?? []),
		...(home?.interviews ?? []),
		...(home?.video ?? [])
	].filter(Boolean);
	const seen = new Set();
	const ticker = [...ours, ...(network?.latest ?? [])]
		.filter((i) => !seen.has(i.id) && seen.add(i.id))
		.sort(
			(a, b) =>
				new Date(b.featuredAt || b.publishedAt || 0).getTime() -
				new Date(a.featuredAt || a.publishedAt || 0).getTime()
		)
		.slice(0, 8)
		.map((i) => ({
			id: i.id,
			href: i.href,
			label: i.network ? i.creator.name : i.audio ? 'Episode' : KIND[i.kind].short,
			title: i.title
		}));

	return { home, network, ticker, member: userHasPremiumAccess(locals.user) };
}
