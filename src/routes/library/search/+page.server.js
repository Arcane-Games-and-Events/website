import { redirect } from '@sveltejs/kit';
import { searchLibrary } from '$lib/server/library/search.js';
import { cacheFor, counts } from '$lib/server/library/page.js';
import { libraryTopics } from '$lib/server/desk/list.js';
import { toStory } from '$lib/components/age/library/stories.js';

/** /library/search?q= — one search across articles, videos and matches, grouped. */
export async function load({ url, setHeaders }) {
	const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
	if (!q) throw redirect(303, '/library');
	cacheFor(setHeaders);
	const [found, drawers, topics] = await Promise.all([searchLibrary(q), counts(), libraryTopics()]);
	const needle = q.toLowerCase();
	return {
		q,
		drawers,
		total: found.total,
		articles: { stories: found.articles.items.map(toStory), total: found.articles.total },
		videos: { stories: found.videos.items.map(toStory), total: found.videos.total },
		matches: found.matches,
		// A topic whose name matches is worth its own shelf link.
		topics: topics.filter((t) => t.name.toLowerCase().includes(needle)).slice(0, 6),
		suggestions: topics.slice(0, 8)
	};
}
