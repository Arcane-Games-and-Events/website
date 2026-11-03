/**
 * The Library's one search: written pieces, videos and matches together,
 * a few of each, with how many there are of each so the page can offer
 * "All N articles →" into that drawer.
 */
import { libraryCounts, libraryTopics, searchEntries } from '$lib/server/desk/list.js';
import { archive } from '$lib/server/studio/public.js';

const EACH = 6;

/** @param {string} q */
export async function searchLibrary(q) {
	const [articles, videos, matches] = await Promise.all([
		searchEntries({ q, kind: 'article', perPage: EACH }),
		searchEntries({ q, kind: 'video', perPage: EACH }),
		archive({ kind: 'gameplay', q }).catch(() => ({ items: [], total: 0 }))
	]);
	return {
		articles: { items: articles.items, total: articles.total },
		videos: { items: videos.items, total: videos.total },
		matches: { items: matches.items.slice(0, EACH), total: matches.total },
		total: articles.total + videos.total + matches.total
	};
}

/** The drawer counts every Library page shows: articles, videos, matches, topics. */
export async function drawerCounts() {
	const [counts, topics, matches] = await Promise.all([
		libraryCounts(),
		libraryTopics(),
		archive({ kind: 'gameplay' }).catch(() => ({ totalAll: 0 }))
	]);
	return { ...counts, matches: matches.totalAll, topics: topics.length };
}
