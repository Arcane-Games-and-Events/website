import { networkArchive } from '$lib/server/studio/public.js';

/** /studios/partners — AGE Studios partners: every creator and every featured video. */
export async function load({ url, setHeaders }) {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' });
	const kind = ['podcast', 'video'].includes(url.searchParams.get('kind') ?? '')
		? url.searchParams.get('kind')
		: '';
	const creator = (url.searchParams.get('creator') ?? '').slice(0, 120);
	const page = Math.max(1, Math.min(500, Number(url.searchParams.get('page')) || 1));
	return { kind, creator, ...(await networkArchive({ kind, creator, page })) };
}
