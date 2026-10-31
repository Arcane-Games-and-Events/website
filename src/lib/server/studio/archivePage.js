/** Shared loader for AGE Studios' archives (/studios/gameplay, /studios/podcasts, …). */
import { archive } from './public.js';

const SORTS = new Set(['newest', 'oldest', 'longest']);

export async function archivePage({ url, setHeaders }, kind) {
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
		vary: 'Cookie'
	});
	const filters = {
		q: (url.searchParams.get('q') || '').trim().slice(0, 100),
		event: kind === 'gameplay' ? url.searchParams.get('event') || '' : '',
		hero: kind === 'gameplay' ? url.searchParams.get('hero') || '' : '',
		sort: SORTS.has(url.searchParams.get('sort')) ? url.searchParams.get('sort') : 'newest'
	};
	const page = Math.max(1, Math.min(500, parseInt(url.searchParams.get('page') || '1') || 1));
	try {
		return {
			filters,
			archive: await archive({
				kind,
				q: filters.q,
				eventId: filters.event,
				hero: filters.hero,
				sort: filters.sort,
				page
			})
		};
	} catch (err) {
		console.warn('Watch: archive failed', err?.message);
		return {
			filters,
			archive: { items: [], total: 0, totalAll: 0, page: 1, totalPages: 1, heroes: [], events: [] }
		};
	}
}
