/**
 * Loaders shared by the Library's pages. Every page shows the drawers with
 * their counts; the Articles and Videos drawers read their filters from the
 * address and search on the server.
 */
import { libraryTopics, searchEntries } from '$lib/server/desk/list.js';
import { toStory } from '$lib/components/age/library/stories.js';
import { drawerCounts } from './search.js';

const ZERO = { articles: 0, videos: 0, matches: 0, topics: 0 };

/** The drawer counts, never failing the page. */
export const counts = () =>
	drawerCounts().catch((err) => {
		console.warn('Library: counts failed', err?.message);
		return ZERO;
	});

export const cacheFor = (setHeaders) =>
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
		vary: 'Cookie'
	});

/** /library/articles and /library/videos. @param {'article' | 'video'} kind */
export async function drawerPage({ url, setHeaders }, kind) {
	cacheFor(setHeaders);
	const get = (k, max = 100) => (url.searchParams.get(k) || '').trim().slice(0, max);
	const filters = {
		q: get('q'),
		access: ['free', 'premium'].includes(get('access')) ? get('access') : '',
		tag: get('tag'),
		sort: get('sort') === 'oldest' ? 'oldest' : 'newest'
	};
	const page = Math.max(1, Math.min(500, parseInt(get('page')) || 1));
	const [result, topics, drawers] = await Promise.all([
		searchEntries({ ...filters, kind, page }),
		libraryTopics(),
		counts()
	]);
	return {
		kind,
		filters,
		stories: result.items.map(toStory),
		total: result.total,
		page: result.page,
		totalPages: result.totalPages,
		topics,
		drawers
	};
}
