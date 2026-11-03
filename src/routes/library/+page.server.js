import { redirect } from '@sveltejs/kit';
import { libraryTopics, searchEntries } from '$lib/server/desk/list.js';
import { getTagBySlug } from '$lib/server/desk/tags.js';
import { titleToSlug } from '$lib/desk/slug.js';
import { latest } from '$lib/server/studio/public.js';
import { cacheFor, counts } from '$lib/server/library/page.js';
import { toStory } from '$lib/components/age/library/stories.js';

/**
 * Addresses from the old single-page Library (?kind=, ?access=, ?tag=, ?q=)
 * and the footer's old ?tier=, ?series=, ?topic= links, sent to the drawer
 * or search that now does the job. `tag` held a topic's name, not its slug.
 */
async function oldAddress(url) {
	const p = url.searchParams;
	if (![...p.keys()].length) return null;
	if (p.get('topic')) return `/library/tag/${encodeURIComponent(p.get('topic'))}`;
	if (p.get('series')) return `/library/search?q=${encodeURIComponent(p.get('series'))}`;
	const access = p.get('access') || (p.get('tier') === 'premium' ? 'premium' : '');
	const drawer = p.get('kind') === 'video' ? '/library/videos' : '/library/articles';
	const next = new URLSearchParams();
	if (p.get('q') && !p.get('kind')) return `/library/search?q=${encodeURIComponent(p.get('q'))}`;
	if (p.get('q')) next.set('q', p.get('q'));
	if (access === 'free' || access === 'premium') next.set('access', access);
	if (p.get('tag')) {
		// A topic's address is made from its name ("Set Review" → set-review).
		const topic = await getTagBySlug(titleToSlug(p.get('tag')));
		if (topic) next.set('tag', topic.slug);
	}
	if (!p.get('kind') && !next.toString()) return null;
	const s = next.toString();
	return `${drawer}${s ? `?${s}` : ''}`;
}

/** /library — the reading room: one search, the drawers, what's new, the topics. */
export async function load({ url, setHeaders }) {
	const moved = await oldAddress(url);
	if (moved) throw redirect(301, moved);
	cacheFor(setHeaders);
	const none = { items: [] };
	const [newest, article, video, matches, topics, drawers] = await Promise.all([
		searchEntries({ perPage: 9 }).catch(() => none),
		searchEntries({ kind: 'article', perPage: 1 }).catch(() => none),
		searchEntries({ kind: 'video', perPage: 1 }).catch(() => none),
		latest({ kind: 'gameplay', limit: 3 }).catch(() => []),
		libraryTopics().catch(() => []),
		counts()
	]);
	const stories = newest.items.map(toStory);
	return {
		newest: stories,
		// The top of the page: the newest of each kind.
		spotlight: {
			read: article.items[0] ? toStory(article.items[0]) : null,
			watch: video.items[0] ? toStory(video.items[0]) : null,
			replay: matches[0] ?? null
		},
		matches,
		topics: topics.slice(0, 12),
		drawers
	};
}
