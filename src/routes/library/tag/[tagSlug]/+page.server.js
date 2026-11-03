import { error } from '@sveltejs/kit';
import { libraryTopics, searchEntries } from '$lib/server/desk/list.js';
import { getTagBySlug } from '$lib/server/desk/tags.js';
import { cacheFor, counts } from '$lib/server/library/page.js';
import { toStory } from '$lib/components/age/library/stories.js';

/** A topic's shelf: every live piece filed under it, newest first, a page at a time. */
export async function load({ params, url, setHeaders }) {
	const tag = await getTagBySlug(params.tagSlug);
	if (!tag) throw error(404, 'Topic not found');
	cacheFor(setHeaders);
	const page = Math.max(1, Math.min(500, parseInt(url.searchParams.get('page') || '1') || 1));
	const [result, topics, drawers] = await Promise.all([
		searchEntries({ tag: tag.slug, page }),
		libraryTopics(),
		counts()
	]);
	return {
		tag: { name: tag.name, slug: tag.slug },
		stories: result.items.map(toStory),
		total: result.total,
		page: result.page,
		totalPages: result.totalPages,
		otherTopics: topics.filter((t) => t.slug !== tag.slug),
		drawers
	};
}
