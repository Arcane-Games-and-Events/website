<!--
  Entry preview — mirrors the /library/[slug] reader layout so writers see
  exactly what visitors will see. The only differences vs the public reader:

    - Preview banner at the top so no one confuses this with the live page.
    - Draft-buffered values are always shown (never the older approved copy).
    - Engagement tracking, share buttons, and the premium paywall are
      omitted — the author already has access, and telemetry on a preview
      would pollute real metrics.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import RenderLexical from '$lib/cms/render/RenderLexical.svelte';
	import LibraryVideoBlock from '$lib/cms/render/LibraryVideoBlock.svelte';
	import CardHover from '$lib/components/CardHover.svelte';
	import { extractHeadings } from '$lib/cms/render/lexical-utils.js';

	export let data;
	$: entry = data.entry;
	$: cardImages = data.cardImages || {};

	$: tableOfContents = entry?.content ? extractHeadings(entry.content) : [];

	// Poster on the video: thumbnail wins over cover, matching the reader.
	$: videoPoster = entry?.thumbnailImage?.src || entry?.coverImage?.src || '';

	// Meta date — matches the reader's "January 2026" and "January 24, 2026"
	// formats so the preview doesn't visibly differ from the published view.
	$: pubDate = entry?.publishedAt ? new Date(entry.publishedAt) : null;

	// Active TOC section on scroll — same behavior the reader uses so the
	// sticky rail highlights whichever heading is currently on screen.
	let activeSection = '';
	function updateActiveSection() {
		const headings = document.querySelectorAll('article h1[id], article h2[id], article h3[id], article h4[id]');
		let best = '';
		let bestTop = -Infinity;
		for (const h of headings) {
			const t = h.getBoundingClientRect().top;
			if (t < 200 && t > bestTop) {
				bestTop = t;
				best = h.id;
			}
		}
		if (best) activeSection = best;
	}
	onMount(() => {
		updateActiveSection();
		window.addEventListener('scroll', updateActiveSection, { passive: true });
	});
	onDestroy(() => {
		if (typeof window !== 'undefined')
			window.removeEventListener('scroll', updateActiveSection);
	});

	function fmtBanner(d) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Preview · {entry?.title || 'Untitled'} · CMS</title>
</svelte:head>

<!-- Preview banner — sticky under the CMS sub-nav so it stays visible
     while the writer scrolls. Warm-accent so no one confuses the preview
     with the live page. -->
<div class="sticky top-[52px] z-10 border-b border-warm bg-warm/10 backdrop-blur-sm">
	<div
		class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-14"
	>
		<div class="flex items-center gap-2 text-[11px] font-mono-system">
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-warm/25 px-2 py-0.5 font-bold uppercase tracking-wider text-warm"
			>
				<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-warm"></span>
				Preview mode
			</span>
			<span class="text-ink/70">
				{#if entry.status === 'draft'}
					Draft — not published yet.
				{:else if entry.status === 'scheduled' && !entry.isLive}
					Scheduled for {fmtBanner(entry.scheduledFor)}.
				{:else if entry.hasPendingDraft}
					Pending edits — this is what the draft will look like once approved.
				{:else if entry.status === 'published'}
					Published entry — this preview matches what visitors see.
				{:else if entry.status === 'archived'}
					Archived — not shown on the public site.
				{/if}
			</span>
		</div>
		<div class="flex items-center gap-2 text-[11px] font-mono-system">
			<a
				href="/cms/entries/{entry.id}"
				class="rounded-md border border-line2 bg-paper px-3 py-1.5 text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
			>
				← Back to editor
			</a>
			{#if entry.isLive && !entry.hasPendingDraft && entry.slug}
				<a
					href="/library/{entry.slug}"
					target="_blank"
					rel="noopener"
					class="rounded-md border border-line2 bg-paper px-3 py-1.5 text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
				>
					Open published ↗
				</a>
			{/if}
		</div>
	</div>
</div>

<!-- ============ HEADER ============ -->
<!-- Same kicker + headline + sell-row structure as /library/[slug]. Kicker
     shows a type badge (Article / Video) plus the Premium chip when the
     entry is behind the paywall. -->
{#if entry}
	<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[46px] pb-[34px]">
		<div class="mb-[22px] flex items-center gap-[18px]">
			<span
				class="bg-warm inline-flex items-center px-3 py-[6px] text-[11px] font-extrabold tracking-[0.14em] text-white uppercase"
			>
				{entry.video ? 'Video' : 'Article'}
			</span>
			{#if entry.accessMode === 'premium'}
				<span
					class="font-mono-system text-prem text-[11px] font-bold tracking-[0.14em] uppercase"
				>
					Premium
				</span>
			{/if}
			<span class="bg-line2 h-[1px] flex-1"></span>
			{#if pubDate}
				<span
					class="font-mono-system text-fade text-[11px] font-bold tracking-[0.14em] uppercase"
				>
					{pubDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
				</span>
			{:else}
				<span
					class="font-mono-system text-fade text-[11px] font-bold tracking-[0.14em] uppercase"
				>
					Not yet published
				</span>
			{/if}
		</div>

		<h1
			class="font-newsreader max-w-[1140px] text-[clamp(46px,7vw,90px)] leading-[0.9] font-semibold tracking-[-0.03em] [text-wrap:balance]"
		>
			{entry.title}
		</h1>

		<div class="mt-[26px] flex flex-col items-start justify-between gap-12 md:flex-row md:items-end">
			{#if entry.excerpt}
				<p
					class="font-newsreader text-soft m-0 max-w-[680px] text-[21px] leading-[1.42] italic"
				>
					{entry.excerpt}
				</p>
			{:else}
				<span class="block max-w-[680px]"></span>
			{/if}

			{#if entry.author}
				<span class="flex flex-shrink-0 items-center gap-[13px]">
					<span
						class="border-warm bg-panel text-soft flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-lg font-bold"
					>
						{entry.author.name.charAt(0).toUpperCase()}
					</span>
					<span>
						<span class="block text-[16px] font-extrabold tracking-[-0.01em]">
							{entry.author.name}
						</span>
						{#if pubDate}
							<span
								class="font-mono-system text-warm mt-[6px] block text-[12px] font-extrabold tracking-[0.08em] uppercase"
							>
								{pubDate.toLocaleDateString('en-US', {
									month: 'long',
									day: 'numeric',
									year: 'numeric'
								})}
							</span>
						{/if}
						{#if entry.readTime}
							<span
								class="font-mono-system text-fade mt-[3px] block text-[10.5px] font-bold tracking-[0.06em] uppercase"
							>
								{entry.readTime} min read
							</span>
						{/if}
					</span>
				</span>
			{/if}
		</div>
	</header>
{/if}

<!-- ============ HERO FIGURE ============ -->
<!-- Video takes precedence over cover, same as the public reader. -->
{#if entry?.video}
	<figure class="mx-auto m-0 w-full max-w-[1600px] px-4 md:px-10 lg:px-14">
		<LibraryVideoBlock video={entry.video} poster={videoPoster} />
		<figcaption class="flex gap-3 py-3">
			<span
				class="font-mono-system text-warm pt-[2px] text-[10px] font-bold tracking-[0.14em] whitespace-nowrap uppercase"
			>
				Video
			</span>
			<span class="font-newsreader text-soft text-[13px] italic">
				{entry.title}
			</span>
		</figcaption>
	</figure>
{:else if entry?.coverImage?.src}
	<figure class="mx-auto m-0 w-full max-w-[1600px] px-4 md:px-10 lg:px-14">
		<div class="border-ink border-y-[3px] border-double">
			<img
				src={entry.coverImage.src}
				alt={entry.title}
				loading="eager"
				class="aspect-video w-full object-cover"
			/>
		</div>
		<figcaption class="flex gap-3 py-3">
			<span
				class="font-mono-system text-warm pt-[2px] text-[10px] font-bold tracking-[0.14em] whitespace-nowrap uppercase"
			>
				Cover
			</span>
			<span class="font-newsreader text-soft text-[13px] italic">
				{entry.title}
			</span>
		</figcaption>
	</figure>
{/if}

<!-- ============ READING LAYOUT ============ -->
<!-- Same grid + sticky sidebar the reader uses. TOC + author card on the
     rail, article body in the main column, both rendered with the reader's
     prose-* utility set for pixel-parity. -->
<div
	class="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-[72px] px-4 pt-[60px] pb-[30px] md:px-14 lg:grid-cols-[232px_minmax(0,1fr)]"
>
	<aside class="hidden lg:block">
		<div class="sticky top-[110px] max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
			{#if entry?.author}
				<div class="font-newsreader text-[20px] font-semibold">
					{entry.author.name}
				</div>
			{/if}

			{#if tableOfContents.length > 0}
				<nav class="border-line2 mt-5 border-t pt-[15px]">
					<div class="text-fade mb-[10px] text-[10px] font-extrabold tracking-[0.16em] uppercase">
						Table of Contents
					</div>
					{#each tableOfContents as heading (heading.id)}
						{@const isTop = heading.level === 2}
						{@const isActive = activeSection === heading.id}
						<a
							href="#{heading.id}"
							style="padding-left: {(heading.level - 2) * 12}px"
							class="flex items-baseline gap-[11px] py-[4px] {isTop
								? 'text-[13px] font-semibold'
								: 'text-[12.5px] font-medium'} leading-[1.4] transition-colors {isActive
								? 'text-warm'
								: 'text-soft hover:text-warm'}"
						>
							<span>{heading.text}</span>
						</a>
					{/each}
				</nav>
			{/if}
		</div>
	</aside>

	<!-- ============ BODY ============ -->
	<article class="min-w-0">
		<div
			class="prose max-w-[760px]
				prose-headings:font-newsreader prose-headings:tracking-[-0.02em] prose-headings:scroll-mt-24
				prose-h2:mt-[56px] prose-h2:mb-[18px]
				prose-h2:text-[38px] prose-h2:font-semibold prose-h2:text-warm
				prose-h3:mt-10 prose-h3:mb-3 prose-h3:text-[24px] prose-h3:font-semibold
				prose-p:font-newsreader prose-p:text-ink
				prose-p:text-[21px] prose-p:leading-[1.7]
				prose-p:my-0 prose-p:mb-[24px]
				prose-strong:font-semibold prose-strong:text-ink
				prose-em:italic
				prose-a:text-accent prose-a:underline prose-a:underline-offset-[3px] prose-a:decoration-[1px]
				prose-blockquote:border-l-[3px] prose-blockquote:border-warm
				prose-blockquote:pl-7 prose-blockquote:my-9
				prose-blockquote:not-italic
				[&_blockquote_p]:font-newsreader [&_blockquote_p]:text-[26px]
				[&_blockquote_p]:italic [&_blockquote_p]:font-medium
				[&_blockquote_p]:leading-[1.32] [&_blockquote_p]:text-ink
				[&_blockquote_p]:tracking-[-0.01em]
				prose-li:font-newsreader prose-li:text-ink prose-li:text-[21px] prose-li:leading-[1.7]
				prose-code:font-mono prose-code:bg-panel prose-code:text-warm prose-code:px-[5px] prose-code:py-[2px]
				prose-code:rounded-none prose-code:text-[14px]
				prose-code:before:content-none prose-code:after:content-none
				prose-pre:bg-paper prose-pre:border prose-pre:border-line2 prose-pre:rounded-none
				prose-img:border prose-img:border-line2 prose-img:rounded-none
				prose-hr:border-line2
				[&>:first-child]:mt-0"
		>
			{#if entry?.content}
				<RenderLexical content={entry.content} {cardImages} />
			{:else if entry?.video}
				<p class="text-soft">Video-only entry — no article body.</p>
			{:else}
				<p class="text-soft">No content yet. Start writing in the editor to see it here.</p>
			{/if}
		</div>
	</article>
</div>

<!-- Global card-hover tooltip — listens for hovers on any element with
     `data-card-name` inside the article and pops up the card image.
     Matches the published reader's behavior exactly. -->
<CardHover />
