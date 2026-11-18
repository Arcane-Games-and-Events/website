<script>
	import { onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import ArticleView from '$lib/components/age/library/ArticleView.svelte';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { page } from '$app/stores';
	import { breadcrumbs, isoDuration } from '$lib/seo.js';

	export let data;

	// --- Content analytics: one view per piece, restarted when the reader
	// moves straight from one article to another (same component). ---
	/** @type {{ stop: (next?: string) => void } | null} */
	let tracker = null;
	let trackedId = null;
	afterNavigate(({ to }) => {
		const id = data.article?.id;
		if (!id || id === trackedId) return;
		tracker?.stop(to?.url?.pathname);
		trackedId = id;
		tracker = createContentTracker({
			entryId: id,
			gated: !!data.isPreview,
			readTimeMinutes: data.article.readTime,
			getBody: () => document.querySelector('[data-article-body]')
		});
	});
	onDestroy(() => tracker?.stop());

	$: isVideoEntry = !!data.article.video || !!data.article.videoLocked;
	// The masthead picture: the cover, else (for a video) its thumbnail.
	$: heroImage = data.article.coverImage?.src
		? data.article.coverImage
		: isVideoEntry && data.article.thumbnailImage?.src
			? data.article.thumbnailImage
			: null;
	$: hasCover = !!heroImage;

	// For search engines and AI assistants: an article (or a video), who
	// wrote it, and whether it's free. Premium pieces reach them as the same
	// short preview a non-member sees.
	$: origin = $page.url.origin;
	$: a = data.article;
	$: shareImage = heroImage?.src || a.thumbnailImage?.src || null;
	$: author = a.author
		? {
				'@type': 'Person',
				name: a.author.name,
				...(a.author.slug ? { url: `${origin}/people/${a.author.slug}` } : {})
			}
		: { '@id': `${origin}/#organization` };
	$: ld = [
		{
			'@type': isVideoEntry ? 'VideoObject' : 'Article',
			'@id': `${origin}/library/${a.slug}#main`,
			[isVideoEntry ? 'name' : 'headline']: a.title,
			description: a.excerpt || undefined,
			image: shareImage ? [shareImage] : undefined,
			...(isVideoEntry
				? {
						thumbnailUrl: shareImage || undefined,
						uploadDate: a.publishedAt || undefined,
						duration: isoDuration(a.video?.duration)
					}
				: { datePublished: a.publishedAt || undefined }),
			dateModified: a.updatedAt || a.publishedAt || undefined,
			author,
			publisher: { '@id': `${origin}/#organization` },
			mainEntityOfPage: `${origin}/library/${a.slug}`,
			keywords: a.tags?.length ? a.tags.map((t) => t.name).join(', ') : undefined,
			isAccessibleForFree: !data.isPremium,
			...(data.isPremium
				? {
						hasPart: {
							'@type': 'WebPageElement',
							isAccessibleForFree: false,
							cssSelector: '[data-article-body]'
						}
					}
				: {})
		},
		breadcrumbs(origin, [
			['Library', '/library'],
			...(a.tags?.[0] ? [[a.tags[0].name, `/library/tag/${a.tags[0].slug}`]] : []),
			[a.title, `/library/${a.slug}`]
		])
	];
</script>

<Seo
	title="{a.title} — AGE"
	description={a.excerpt}
	image={shareImage}
	imageAlt={heroImage?.alt || a.title}
	type="article"
	jsonld={ld}
/>

<svelte:head>
	{#if hasCover && heroImage?.avifSrcset}
		<link
			rel="preload"
			as="image"
			type="image/avif"
			imagesrcset={heroImage.avifSrcset}
			imagesizes="(min-width: 1680px) 1680px, 100vw"
			fetchpriority="high"
		/>
	{:else if hasCover && heroImage?.srcset}
		<link
			rel="preload"
			as="image"
			type="image/webp"
			imagesrcset={heroImage.srcset}
			imagesizes="(min-width: 1680px) 1680px, 100vw"
			fetchpriority="high"
		/>
	{/if}
</svelte:head>

<AgeShell>
	<ArticleView {data} />
</AgeShell>
