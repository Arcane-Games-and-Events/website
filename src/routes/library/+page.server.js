import { redirect } from '@sveltejs/kit';
import { libraryTopics, searchEntries, topicCovers } from '$lib/server/desk/list.js';
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

/**
 * /library — the Library's front page: the newest article, video and match
 * at the top, the rest of the newest as the mosaic, the newest matches as a
 * filmstrip, and the topics as picture tiles.
 */
export async function load({ url, setHeaders }) {
	const moved = await oldAddress(url);
	if (moved) throw redirect(301, moved);
	cacheFor(setHeaders);
	const none = { items: [] };
	// one after another: the pooler dislikes bursts of fresh connections
	const perPage = 13;
	const newest = await searchEntries({ perPage }).catch(() => none);
	const matches = await latest({ kind: 'gameplay', limit: 8 }).catch(() => []);
	const topics = await libraryTopics().catch(() => []);
	const covers = await topicCovers().catch(() => ({}));
	const drawers = await counts();
	// the top: the newest article, video and match
	const article = await searchEntries({ kind: 'article', perPage: 1 }).catch(() => none);
	const video = await searchEntries({ kind: 'video', perPage: 1 }).catch(() => none);
	return {
		newest: newest.items.map(toStory),
		spotlight: {
			read: article.items[0] ? toStory(article.items[0]) : null,
			watch: video.items[0] ? toStory(video.items[0]) : null,
			replay: matches[0] ?? null
		},
		matches,
		topics: topics.slice(0, 8).map((t) => ({ ...t, cover: covers[t.slug] ?? null })),
		allTopics: topics.slice(0, 12),
		drawers
	};
}
