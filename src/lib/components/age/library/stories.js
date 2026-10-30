/**
 * Library pieces as browse-grid stories: the shape `StoryCard` renders.
 * Shared by the Library index and the tag pages, so a piece looks the same
 * wherever it is listed.
 */
import { formatDate, formatDuration } from '$lib/components/age/home/front-adapters.js';

const FALLBACK = 'https://www.age.events/banner/articles-banner.webp';

const cover = (a) => {
	const c = a?.coverImage;
	if (!c) return FALLBACK;
	if (typeof c === 'string') return c;
	return c.src || c.url || FALLBACK;
};
const coverSet = (a) => (typeof a?.coverImage === 'object' ? a.coverImage?.srcset : undefined);
const isNew = (d) => !!d && (Date.now() - new Date(d).getTime()) / 86400000 <= 7;

/**
 * A card-shaped entry from `listPublishedEntries()` as a story.
 * @param {any} a
 */
export function toStory(a) {
	return {
		slug: a.slug,
		href: `/library/${a.slug}`,
		title: a.title || 'Untitled',
		dek: a.excerpt || '',
		image: cover(a),
		srcset: coverSet(a),
		picture: typeof a.coverImage === 'object' ? a.coverImage : null,
		alt: a.coverImage?.alt || a.title || '',
		kind: a.hasVideo ? 'video' : 'article',
		rubric: a.tags?.[0]?.name || (a.hasVideo ? 'Video' : 'Article'),
		tags: (a.tags || []).map((t) => t.name),
		tagSlug: a.tags?.[0]?.slug || null,
		length: a.hasVideo
			? formatDuration(a.videoDuration)
			: a.readTime
				? `${a.readTime} min read`
				: '',
		author: a.author?.name || 'AGE Staff',
		date: formatDate(a.publishedAt),
		dateLong: a.publishedAt
			? new Date(a.publishedAt).toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				})
			: '',
		premium: !!a.isPremium,
		fresh: isNew(a.publishedAt)
	};
}

/** Newest first. @param {any[]} articles */
export function toStories(articles) {
	return [...(articles ?? [])]
		.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
		.map(toStory);
}

/** The list item's sheet colour for a card variant. @param {string} variant */
export function storyCardSheet(variant) {
	return variant === 'ink' ? 'bg-ink' : variant === 'row' ? 'bg-paper' : 'bg-paper-bg';
}
