import { error } from '@sveltejs/kit';
import { listPublishedEntries } from '$lib/server/desk/list.js';
import { getTagBySlug } from '$lib/server/desk/tags.js';

/**
 * A tag (topic) page: every live piece filed under the tag, newest first,
 * and the other topics with live pieces. Reads the same cached list as the
 * Library index, so it costs one tag lookup.
 */
export async function load({ params, setHeaders }) {
	const tag = await getTagBySlug(params.tagSlug);
	if (!tag) throw error(404, 'Topic not found');

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
		vary: 'Cookie'
	});

	let all = [];
	try {
		all = await listPublishedEntries({ limit: 100 });
	} catch (err) {
		console.error('Error fetching Desk entries:', err);
	}

	const articles = all.filter((a) => a.tags?.some((t) => t.slug === tag.slug));
	const others = new Map();
	for (const a of all) {
		const t = a.tags?.[0];
		if (!t || t.slug === tag.slug) continue;
		const o = others.get(t.slug) ?? { name: t.name, slug: t.slug, count: 0 };
		o.count += 1;
		others.set(t.slug, o);
	}

	return {
		tag: { name: tag.name, slug: tag.slug },
		articles,
		otherTopics: [...others.values()].sort((a, b) => a.name.localeCompare(b.name))
	};
}
