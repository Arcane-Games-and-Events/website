<script>
	import { onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import ArticleView from '$lib/components/age/library/ArticleView.svelte';

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
	$: hasCover = !isVideoEntry && !!data.article.coverImage?.src;
</script>

<svelte:head>
	<title>{data.article.title} — AGE</title>
	{#if hasCover && data.article.coverImage?.avifSrcset}
		<link
			rel="preload"
			as="image"
			type="image/avif"
			imagesrcset={data.article.coverImage.avifSrcset}
			imagesizes="(min-width: 1680px) 1680px, 100vw"
			fetchpriority="high"
		/>
	{:else if hasCover && data.article.coverImage?.srcset}
		<link
			rel="preload"
			as="image"
			type="image/webp"
			imagesrcset={data.article.coverImage.srcset}
			imagesizes="(min-width: 1680px) 1680px, 100vw"
			fetchpriority="high"
		/>
	{/if}
	{#if data.article.excerpt}
		<meta name="description" content={data.article.excerpt} />
	{/if}
</svelte:head>

<AgeShell>
	<ArticleView {data} />
</AgeShell>
