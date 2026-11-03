/** Shared loader for archives of Studio items: the Library's matches (/library/matches). */
import { archive } from './public.js';

const SORTS = new Set(['newest', 'oldest', 'longest']);
const STAGES = new Set(['swiss', 'top']);

export async function archivePage({ url, setHeaders }, kind) {
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
		vary: 'Cookie'
	});
	const matches = kind === 'gameplay';
	const param = (k, max = 120) => (url.searchParams.get(k) || '').trim().slice(0, max);
	const filters = {
		q: param('q', 100),
		event: matches ? param('event') : '',
		hero: matches ? param('hero') : '',
		format: matches ? param('format') : '',
		stage: matches && STAGES.has(param('stage')) ? param('stage') : '',
		sort: SORTS.has(param('sort')) ? param('sort') : 'newest'
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
				format: filters.format,
				stage: filters.stage,
				sort: filters.sort,
				page
			})
		};
	} catch (err) {
		console.warn('Matches: archive failed', err?.message);
		return {
			filters,
			archive: {
				items: [],
				total: 0,
				totalAll: 0,
				page: 1,
				totalPages: 1,
				heroes: [],
				formats: [],
				events: [],
				hasRounds: false
			}
		};
	}
}
