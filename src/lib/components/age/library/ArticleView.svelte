<!--
  ArticleView — a Library piece as readers see it: the cover with the title
  set over it (for a video, its picture with a Watch button; the video plays
  in that frame, the words stepping aside), the author and contents rail, the body,
  the Premium gate for non-members, and the tag. Rendered by the public
  reader (/library/[slug]) and by the Desk preview, so a preview is exactly
  the live page.
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import AuthorCard from '$lib/components/age/library/AuthorCard.svelte';
	import { onMount } from 'svelte';
	import { fitTitle } from '$lib/actions/fitTitle.js';
	import { fade, fly } from 'svelte/transition';
	import CardHover from '$lib/components/CardHover.svelte';
	import RenderLexical from '$lib/desk/render/RenderLexical.svelte';
	import { extractLexicalText } from '$lib/desk/render/lexical-utils.js';
	import { ARTICLE_PROSE } from '$lib/desk/render/articleProse.js';
	import LibraryVideoBlock from '$lib/desk/render/LibraryVideoBlock.svelte';
	import HeroVideo from '$lib/components/age/library/HeroVideo.svelte';

	/**
	 * Same shape as the reader page's load data: `article` (buildArticleShape),
	 * `isPremium`, `isPreview` (a non-member's gated teaser), `cardImages`,
	 * `media`, and `user` for the gate's sign-in button.
	 */
	export let data;
	/** Where the rail's contents stick, below whatever is pinned above it (the site header). */
	export let railTop = 'calc(var(--age-header, 0px) + 24px)';
	/** The "← Library" link over the cover (the Desk preview points back to the editor). */
	export let back = { href: '/library', label: 'Library' };

	// The author card scrolls away; the contents below it stay pinned beside
	// the article, but only while they fit on screen. A very long contents
	// list scrolls with the page instead of in a box of its own.
	let rail;
	let railHeight = 0;
	let viewHeight = 0;
	$: railOffset = rail && viewHeight ? parseFloat(getComputedStyle(rail).top) || 0 : 0;
	$: railFits = railHeight + railOffset + 24 <= viewHeight;

	// Card images map from server for hover tooltips
	$: cardImages = data.cardImages || {};

	// ---- masthead labels (same vocabulary as the homepage cover) ----
	$: pubDate = data.article.publishedAt ? new Date(data.article.publishedAt) : null;
	$: pubLabel = pubDate
		? pubDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
		: '';
	$: isVideoEntry = !!data.article.video || !!data.article.videoLocked;
	$: rubric = data.article.tags?.[0]?.name || (isVideoEntry ? 'Video' : 'Article');
	$: rubricHref = data.article.tags?.[0]?.slug
		? `/library/tag/${data.article.tags[0].slug}`
		: '/library';
	$: rubricLabel = isVideoEntry && rubric !== 'Video' ? `${rubric} · Video` : rubric;
	// Articles and videos share the masthead: the cover (else, for a video,
	// its thumbnail) full width with the title over it. A video plays in that
	// same frame: its words fade away while it plays and come back when it's
	// paused or over, their Watch button now reading Resume (Pause on phones).
	$: heroImage = data.article.coverImage?.src
		? data.article.coverImage
		: isVideoEntry && data.article.thumbnailImage?.src
			? data.article.thumbnailImage
			: null;
	$: hasCover = !!heroImage;
	let started = false; // the player is in the masthead
	let stopped = false; // paused or over: the words and the play button are back
	let ended = false;
	/** @type {any} */
	let heroVideo;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let stopTimer;
	$: if (data.article.id) {
		// a new piece starts unplayed
		started = false;
		stopped = false;
		ended = false;
	}
	$: veiled = started && !stopped; // playing: the words step aside
	/** @param {'playing' | 'paused' | 'ended'} state */
	function onVideoState(state) {
		clearTimeout(stopTimer);
		if (state === 'playing') {
			stopped = false;
			ended = false;
			return;
		}
		// Scrubbing pauses for a moment; only a real stop brings the words back.
		stopTimer = setTimeout(
			() => {
				stopped = true;
				ended = state === 'ended';
			},
			state === 'ended' ? 0 : 350
		);
	}
	$: videoSeconds = data.article.video?.duration || data.article.video?.youtubeDuration || 0;
	function watch() {
		if (!data.article.video) {
			document.getElementById('video-gate')?.scrollIntoView({ behavior: 'smooth' });
			return;
		}
		clearTimeout(stopTimer);
		if (started) heroVideo?.play();
		else started = true; // mounts the player, which starts at once
		stopped = false;
		ended = false;
	}
	$: videoPoster = data.article.thumbnailImage?.src || data.article.coverImage?.src || '';
	$: lengthLabel = isVideoEntry
		? videoSeconds
			? `${Math.max(1, Math.round(videoSeconds / 60))} min video`
			: ''
		: data.article.readTime
			? `${data.article.readTime} min read`
			: '';
	// The server already turned the profile bio into escaped HTML (bioToHtml).
	$: authorBioHtml = data.article.author?.bio || '';
	$: authorLinks = (data.article.author?.socialLinks || [])
		.slice(0, 3)
		.map((link) => ({ label: getLinkLabel(link), href: normalizeUrl(link.url) }));

	const platformLabels = {
		twitter: 'Twitter / X',
		bluesky: 'Bluesky',
		youtube: 'YouTube',
		twitch: 'Twitch',
		discord: 'Discord',
		patreon: 'Patreon',
		metafy: 'Metafy',
		kofi: 'Ko-fi',
		instagram: 'Instagram',
		tiktok: 'TikTok',
		website: 'Website',
		other: 'Link'
	};

	function getLinkLabel(link) {
		return link.platform === 'other' && link.customLabel
			? link.customLabel
			: platformLabels[link.platform] || link.platform;
	}

	// Ensure URL has a protocol (https://) for external links
	function normalizeUrl(url) {
		if (!url) return '#';
		// If URL already has a protocol, return as-is
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}
		// Add https:// if it starts with www. or looks like a domain
		if (url.startsWith('www.') || url.includes('.')) {
			return `https://${url}`;
		}
		return url;
	}

	let tableOfContents = [];

	// Map of heading.id → top-level (h2) number. Only h2 entries get a number;
	// sub-headings (h3+) get a small bullet instead so the hierarchy reads at
	// a glance in the TOC sidebar.
	$: topLevelNumbers = (() => {
		const map = {};
		let n = 0;
		for (const h of tableOfContents) {
			if (h.level === 2) {
				n += 1;
				map[h.id] = n;
			}
		}
		return map;
	})();
	let activeSection = '';
	let mobileTocOpen = false;
	let expandedSections = {}; // Track which sections are expanded

	// Check if a heading has children (next headings with higher level number)
	function hasChildren(index, toc = tableOfContents) {
		if (index >= toc.length - 1) return false;
		const currentLevel = toc[index].level;
		const nextLevel = toc[index + 1]?.level;
		return nextLevel > currentLevel;
	}

	$: {
		if (data.article.content) {
			tableOfContents = extractHeadings(data.article.content);
			// Initialize sections: only h2 sections are expanded by default (showing h3)
			// h3+ sections start collapsed (hiding h4+)
			const newExpanded = { ...expandedSections };
			tableOfContents.forEach((heading, index) => {
				if (hasChildren(index, tableOfContents) && newExpanded[heading.id] === undefined) {
					// Only expand h2 sections by default
					newExpanded[heading.id] = heading.level === 2;
				}
			});
			expandedSections = newExpanded;
		}
	}

	// Check if a heading should be visible based on parent expansion state
	function isVisible(index) {
		if (index === 0) return true;
		const heading = tableOfContents[index];
		if (heading.level === 2) return true; // Top-level always visible

		// Find parent heading (previous heading with lower level number)
		for (let i = index - 1; i >= 0; i--) {
			const parent = tableOfContents[i];
			if (parent.level < heading.level) {
				// Check if parent is expanded
				if (!expandedSections[parent.id]) return false;
				// Continue checking ancestors
				if (parent.level > 2) {
					return isVisible(i);
				}
				return true;
			}
		}
		return true;
	}

	// Extract headings for table of contents
	function extractHeadings(content) {
		const headings = [];
		if (!content) return headings;

		if (content.root && content.root.type === 'root') {
			extractLexicalHeadings(content.root, headings);
		}

		// Dedupe ids so two headings with the same text ("Round 1") still
		// get distinct anchors.
		const counts = new Map();
		for (const h of headings) {
			const base = h.id || 'section';
			const n = counts.get(base) ?? 0;
			if (n > 0) h.id = `${base}-${n}`;
			counts.set(base, n + 1);
		}

		return headings;
	}

	function extractLexicalHeadings(node, headings) {
		if (!node) return;
		// headings inside a spoiler block stay out of the contents
		if (node.type === 'spoiler_block') return;

		if (node.type === 'heading') {
			// matches the heading's id on the page (render-lexical.js)
			const text = extractLexicalText(node.children, 'spoiler');
			const id = slugify(text);
			// Level usually comes as `tag: 'h2'`; older shapes (`tag: 2`,
			// `level`, `format`) are still accepted so the TOC keeps h3+.
			let level = null;
			const tag = node.tag;
			if (typeof tag === 'string') {
				const match = tag.match(/(\d+)/);
				if (match) level = parseInt(match[1], 10);
			} else if (typeof tag === 'number' && tag > 0) {
				level = tag;
			}
			if (!level && typeof node.level === 'number') level = node.level;
			if (!level && typeof node.format === 'number' && node.format >= 1 && node.format <= 6) {
				level = node.format;
			}
			headings.push({ text, id, level: level || 2 });
		}

		if (node.children) {
			node.children.forEach((child) => extractLexicalHeadings(child, headings));
		}
	}

	function slugify(text) {
		return text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	// Scroll spy for active section
	onMount(() => {
		const handleScroll = () => {
			const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
			let currentSection = '';

			headings.forEach((heading) => {
				const rect = heading.getBoundingClientRect();
				if (rect.top <= 150) {
					currentSection = heading.id;
				}
			});

			activeSection = currentSection;
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function copyLink() {
		navigator.clipboard.writeText(window.location.href);
	}

	function shareTwitter() {
		const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(data.article.title)}`;
		window.open(url, '_blank', 'width=550,height=420');
	}
</script>

{#if !hasCover}
	<!-- back to the library -->
	<div class="mx-auto w-full max-w-420 px-5 pt-4 md:px-8 md:pt-5">
		<a
			href={back.href}
			class="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase transition-[color,gap] hover:gap-3 hover:text-warm"
		>
			<span aria-hidden="true">←</span>
			{back.label}
		</a>
	</div>
{/if}

<!-- ============ COVER ============
	     The cover runs full width with the copy overlaid on its lower third
	     at md+ (white on an ink scrim), as tall as the Library's section
	     headers; on phones it's the whole 16:9 picture with the copy beneath.
	     Videos use the same masthead with their picture and play in that
	     frame: the copy fades away while the video plays and comes back
	     when it's paused or over; its Watch button becomes Pause / Resume. Pieces
	     with no picture use the paper variant with the copy centred. -->
<section class="relative">
	{#if hasCover}
		<!-- from md up, as tall as the Library's section headers and the
		     Academy's hero (78% of the screen, at most 760px) -->
		<div
			class="relative mx-auto aspect-video w-full max-w-420 overflow-hidden bg-ink md:aspect-auto md:h-[min(78vh,760px)]"
		>
			<Picture
				image={heroImage}
				sizes="(min-width: 1680px) 1680px, 100vw"
				alt={data.article.title}
				loading="eager"
				fetchpriority="high"
				class="fp-kenburns absolute inset-0 h-full w-full object-cover"
			/>
			{#if started}
				<div class="absolute inset-0">
					<HeroVideo
						bind:this={heroVideo}
						video={data.article.video}
						poster={videoPoster}
						metaId="entry:{data.article.id}"
						metaTitle={data.article.title}
						onstate={onVideoState}
					/>
				</div>
			{/if}
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-24 transition-opacity duration-500 {veiled
					? 'opacity-0'
					: ''}"
				style="background: linear-gradient(180deg, rgba(23,21,15,0.35), rgba(23,21,15,0));"
				aria-hidden="true"
			></div>
			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[78%] transition-opacity duration-500 md:block {veiled
					? 'opacity-0'
					: ''}"
				style="background: linear-gradient(180deg, rgba(23,21,15,0) 0%, rgba(23,21,15,0.3) 22%, rgba(23,21,15,0.72) 45%, rgba(23,21,15,0.92) 68%, rgba(23,21,15,0.98) 100%);"
				aria-hidden="true"
			></div>
			<a
				href={back.href}
				class="fp-fade absolute top-6 left-6 z-2 inline-flex {veiled
					? 'invisible'
					: ''} items-center gap-2 text-xs font-extrabold tracking-widest text-white uppercase transition-[gap] hover:gap-3 md:top-10 md:left-10"
				style="animation-delay: 600ms; text-shadow: 0 1px 2px rgba(23,21,15,0.6);"
			>
				<span aria-hidden="true">←</span>
				{back.label}
			</a>
		</div>
		{#if heroImage?.credit}
			<p class="mx-auto max-w-420 px-5 pt-2 text-right font-libre text-xs text-fade md:px-7">
				{#if heroImage.creditUrl}<a
						href={heroImage.creditUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="underline decoration-line2 underline-offset-2 hover:text-ink"
						>{heroImage.credit}</a
					>{:else}{heroImage.credit}{/if}
			</p>
		{/if}
	{/if}

	<div
		class="fp-rise mx-auto w-full max-w-5xl px-5 pt-7 pb-4 text-center md:px-8 {hasCover
			? 'md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:left-1/2 md:z-1 md:-translate-x-1/2 md:pb-14 md:[text-shadow:0_1px_2px_rgba(23,21,15,0.6),0_6px_24px_rgba(23,21,15,0.45)] lg:pb-16'
			: 'md:pt-12 md:pb-6'}"
	>
		<!-- fades as one block: the outer block's entrance animation owns its opacity -->
		<div
			class="transition-opacity duration-500 {veiled
				? 'md:pointer-events-none md:opacity-0 md:[&_*]:pointer-events-none'
				: ''}"
		>
			<a
				href={rubricHref}
				class="pointer-events-auto inline-flex items-center gap-3 text-xs font-extrabold tracking-widest uppercase {hasCover
					? 'text-warm md:text-white/90'
					: 'text-warm'}"
			>
				<span class={hasCover ? 'text-warm md:text-warm-light' : 'text-warm'} aria-hidden="true"
					>◆</span
				>
				{rubricLabel}
				<span class={hasCover ? 'text-warm md:text-warm-light' : 'text-warm'} aria-hidden="true"
					>◆</span
				>
			</a>
			<h1
				use:fitTitle={{ key: data.article.title, phoneLines: 3 }}
				style="--tc: {Math.max(12, (data.article.title || '').length)};"
				class="article-title mt-2 font-newsreader leading-none font-semibold tracking-tight [text-wrap:balance] md:mt-3 {hasCover
					? 'md:text-white'
					: ''}"
			>
				{data.article.title}
			</h1>
			{#if data.article.excerpt}
				<p
					class="mx-auto mt-2.5 max-w-2xl text-center font-newsreader text-lg leading-normal [text-wrap:balance] italic md:mt-3 md:text-xl {hasCover
						? 'text-soft md:text-white/85'
						: 'text-soft'}"
				>
					{data.article.excerpt}
				</p>
			{/if}
			<div
				class="mt-3.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs md:mt-4 {hasCover
					? 'text-fade md:text-white/60'
					: 'text-fade'}"
			>
				{#if data.article.author}
					{#if data.article.author.slug}
						<a
							href="/people/{data.article.author.slug}"
							class="pointer-events-auto font-extrabold tracking-widest uppercase {hasCover
								? 'text-ink hover:text-warm md:text-white/90 md:hover:text-warm-light'
								: 'text-ink hover:text-warm'}"
						>
							By {data.article.author.name}
						</a>
					{:else}
						<span
							class="font-extrabold tracking-widest uppercase {hasCover
								? 'text-ink md:text-white/90'
								: 'text-ink'}">By {data.article.author.name}</span
						>
					{/if}
					<span aria-hidden="true">·</span>
				{/if}
				{#if pubLabel || lengthLabel}
					<span class="font-semibold">{[pubLabel, lengthLabel].filter(Boolean).join(' · ')}</span>
				{/if}
				{#if data.isPremium}
					<PremiumTag />
				{/if}
			</div>
			{#if isVideoEntry && hasCover}
				<div class="mt-5 flex justify-center md:mt-6">
					{#if data.article.video}
						<button
							type="button"
							onclick={() => (veiled ? heroVideo?.pause() : watch())}
							class="pointer-events-auto inline-flex items-center gap-2.5 bg-ink px-6 py-3.5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors [text-shadow:none] hover:bg-warm md:bg-paper-bg md:text-ink md:hover:bg-warm md:hover:text-white"
						>
							{#if veiled}
								<span aria-hidden="true">❚❚</span> Pause
							{:else if ended}
								<span aria-hidden="true">↻</span> Watch again
							{:else if started}
								<span aria-hidden="true">▶</span> Resume
							{:else}
								<span aria-hidden="true">▶</span> Watch the video
							{/if}
						</button>
					{:else}
						<a
							href="#video-gate"
							class="pointer-events-auto inline-flex items-center gap-2.5 bg-prem px-6 py-3.5 text-xs font-extrabold tracking-widest text-white uppercase [text-shadow:none] hover:brightness-110"
						>
							<span aria-hidden="true">◆</span> Members only · Watch with Premium
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</section>

{#if data.article.videoLocked}
	<!-- Premium video, non-member: paywalled frame, no player -->
	<figure
		id="video-gate"
		class="m-0 mx-auto w-full max-w-page scroll-mt-24 px-5 pt-4 md:px-8 md:pt-6"
	>
		<div
			class="relative overflow-hidden bg-slate-950 md:aspect-video"
			data-premium-cta="video-gate"
		>
			{#if videoPoster}
				<img
					src={videoPoster}
					alt=""
					class="absolute inset-0 h-full w-full scale-105 object-cover blur-lg brightness-50"
				/>
			{/if}
			<div
				class="relative flex items-center justify-center px-5 py-8 md:absolute md:inset-0 md:px-6 md:py-0"
			>
				<div
					class="max-w-xl border-3 border-double border-paper-bg/80 px-6 py-8 text-center md:px-10 md:py-10"
				>
					<span
						class="mb-3 flex items-center justify-center gap-3 text-xs font-extrabold tracking-widest text-prem uppercase"
					>
						<span aria-hidden="true">◆</span>Premium · Members only<span aria-hidden="true">◆</span>
					</span>
					<h3
						class="m-0 mb-3 font-newsreader text-[clamp(28px,4vw,42px)] leading-none font-semibold tracking-tight text-white"
					>
						Watch this video with a membership.
					</h3>
					<p
						class="mx-auto mb-6 max-w-md font-newsreader text-base leading-normal italic"
						style="color: rgba(255,255,255,0.82);"
					>
						This video is for AGE Premium members. Membership unlocks every video, bonus match, and
						article on AGE.
					</p>
					<div class="flex flex-wrap items-center justify-center gap-3">
						<a
							href="/premium"
							class="inline-flex items-center border border-prem bg-prem px-6 py-3.5 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
						>
							Become a member
						</a>
						{#if !data.user}
							<a
								href="/login?redirect=/library/{data.article.slug}"
								class="inline-flex items-center border border-white/60 px-6 py-3.5 text-xs font-extrabold tracking-widest text-white uppercase transition-colors hover:bg-white/10"
							>
								Sign in
							</a>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</figure>
{:else if data.article.video && !heroImage}
	<!-- a video with no picture of its own: the player under the title -->
	<figure class="m-0 mx-auto w-full max-w-page px-5 pt-4 md:px-8 md:pt-6">
		<LibraryVideoBlock
			video={data.article.video}
			poster={videoPoster}
			metaId="entry:{data.article.id}"
			metaTitle={data.article.title}
			bare
		/>
	</figure>
{/if}

<svelte:window bind:innerHeight={viewHeight} />

<!-- ============ READING LAYOUT ============ -->
<div
	class="mx-auto grid w-full max-w-page grid-cols-1 gap-18 px-5 pt-10 pb-8 md:px-14 md:pt-14 lg:grid-cols-[232px_minmax(0,1fr)]"
>
	<!-- ============ RAIL ============ -->
	<aside class="hidden lg:block">
		{#if data.article.author}
			<!-- the rule above the contents scrolls away with the card -->
			<div
				class="pr-1 {!data.isPreview && tableOfContents.length > 0
					? 'mb-4 border-b border-line pb-5'
					: ''}"
			>
				<AuthorCard
					variant="rail"
					author={data.article.author}
					bioHtml={authorBioHtml}
					links={authorLinks}
				/>
			</div>
		{/if}

		<!-- the contents and share buttons follow the article down the page -->
		<div
			bind:this={rail}
			bind:offsetHeight={railHeight}
			class="pr-1 {railFits ? 'sticky' : ''}"
			style="top: {railTop};"
		>
			{#if !data.isPreview && tableOfContents.length > 0}
				<nav>
					<div
						class="mb-2.5 flex items-center gap-2 text-xs font-extrabold tracking-widest text-ink uppercase"
					>
						<span class="text-xs text-warm" aria-hidden="true">◆</span>
						Contents
					</div>
					{#key expandedSections}
						{#each tableOfContents as heading, index (heading.id)}
							{#if isVisible(index)}
								{@const _isTop = heading.level === 2}
								{@const _isActive = activeSection === heading.id}
								{#if _isTop}
									<!--
											Top-level: serif, large, ink, numbered.
											The dominant element in the TOC.
										-->
									<a
										href="#{heading.id}"
										class="flex items-baseline gap-3 pt-3 pb-1.5 font-newsreader text-lg leading-tight font-semibold tracking-normal transition-colors {_isActive
											? 'text-warm'
											: 'text-ink hover:text-warm'}"
									>
										<span
											class="font-mono-system text-xs font-bold {_isActive
												? 'text-warm'
												: 'text-fade'}"
										>
											{String(topLevelNumbers[heading.id] || '').padStart(2, '0')}
										</span>
										<span>{heading.text}</span>
									</a>
								{:else}
									<!--
											Sub-heading: mirror the parent h2's
											flex structure but with an *invisible*
											mono number placeholder. That spacer
											consumes the same width as `01`/`02`
											plus the gap, so the sub-text aligns
											pixel-perfectly with the parent's
											title text — no width guessing.
											Deeper levels step in by 16px on top.
										-->
									<a
										href="#{heading.id}"
										style="padding-left: {(heading.level - 3) * 16}px"
										class="flex items-baseline gap-3 py-1 text-xs leading-snug font-medium transition-colors {_isActive
											? 'text-warm'
											: 'text-soft hover:text-warm'}"
									>
										<span class="invisible font-mono-system text-xs font-bold" aria-hidden="true">
											00
										</span>
										<span>{heading.text}</span>
									</a>
								{/if}
							{/if}
						{/each}
					{/key}
				</nav>
			{/if}

			<!-- share -->
			<div class="mt-4.5 flex gap-2">
				<button
					type="button"
					onclick={copyLink}
					data-share="copy_link"
					title="Copy link"
					aria-label="Copy link"
					class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-xs font-extrabold text-soft transition-colors hover:border-accent hover:text-accent"
				>
					⧉
				</button>
				<button
					type="button"
					onclick={shareTwitter}
					data-share="x"
					title="Share on X"
					aria-label="Share on X"
					class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-xs font-extrabold text-soft transition-colors hover:border-accent hover:text-accent"
				>
					X
				</button>
			</div>
		</div>
	</aside>

	<!-- ============ BODY ============ -->
	<article class="min-w-0">
		<div class="relative">
			<!--
					Editorial reading column. The Lexical renderer emits
					semantic HTML (p, h2/h3, blockquote, a, ul/ol, img, code);
					the prose-* utilities below recolor those tags to the
					editorial tokens — Newsreader serif body, rust accents
					on h2 + blockquote rule, accent links.
				-->
			<div
				data-article-body
				class="{data.isPreview ? 'pointer-events-none blur-[7px] select-none' : ''} {ARTICLE_PROSE}"
			>
				{#if data.article.content}
					<RenderLexical content={data.article.content} {cardImages} media={data.media} />
				{:else if !data.article.video}
					<p class="text-soft">No content available.</p>
				{/if}
			</div>

			<!-- preview veil: the single blurred paragraph is decorative; this
				     sits over it so it can't be selected or inspected casually -->
			{#if data.isPreview}
				<div class="absolute inset-0" aria-hidden="true"></div>
			{/if}
		</div>

		<!-- ============ PREMIUM GATE ============ -->
		{#if data.isPreview}
			<div class="relative z-10 -mt-16 md:-mt-20" data-premium-cta="article-gate">
				<div
					class="border-3 border-double border-ink bg-paper px-6 py-9 text-center md:px-12 md:py-12"
				>
					<div
						class="flex items-center justify-center gap-3 text-xs font-extrabold tracking-widest text-prem uppercase"
					>
						<span aria-hidden="true">◆</span>
						Premium · Members only
						<span aria-hidden="true">◆</span>
					</div>
					<h3
						class="mx-auto mt-3 max-w-2xl font-newsreader text-3xl leading-none font-semibold tracking-normal [text-wrap:balance] md:text-4xl"
					>
						Keep reading with a membership.
					</h3>
					<p
						class="mx-auto mt-4 max-w-lg font-newsreader text-base leading-normal text-soft italic md:text-lg"
					>
						This story is for AGE Premium members. Membership funds every article, broadcast,
						course, and event we put on — and unlocks all of it.
					</p>
					<div
						class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 md:mt-8"
					>
						<a
							href="/premium"
							class="inline-flex items-center border border-prem bg-prem px-6 py-3.5 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
						>
							Become a member
						</a>
						{#if !data.user}
							<a
								href="/login?redirect=/library/{data.article.slug}"
								class="inline-flex items-center border border-ink px-6 py-3.5 text-xs font-extrabold tracking-widest text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg"
							>
								Sign in
							</a>
						{/if}
					</div>
					<div class="mt-4 text-xs text-fade italic">$10 a month · cancel anytime</div>
				</div>
			</div>
		{/if}

		<!-- ============ TOPICS ============ -->
		{#if !data.isPreview && data.article.tags && data.article.tags.length > 0}
			<div class="mt-11 flex flex-wrap items-center gap-3">
				<span
					class="flex items-center gap-2 text-xs font-extrabold tracking-widest text-ink uppercase"
				>
					<span class="text-xs text-warm" aria-hidden="true">◆</span>
					Filed under
				</span>
				{#each data.article.tags as tag (tag.slug)}
					<a
						href="/library/tag/{tag.slug}"
						class="border border-line2 px-3 py-1.5 text-xs font-extrabold tracking-widest text-soft uppercase transition-colors hover:border-warm hover:text-warm"
					>
						{tag.name}
					</a>
				{/each}
			</div>
		{/if}

		<!-- author card for phones/tablets (the rail above is lg-only) -->
		{#if data.article.author}
			<div class="lg:hidden">
				<AuthorCard author={data.article.author} bioHtml={authorBioHtml} links={authorLinks} />
			</div>
		{/if}
	</article>
</div>

<!-- ============ MOBILE TOC FAB ============ -->
{#if !data.isPreview && tableOfContents.length > 0}
	<button
		type="button"
		onclick={() => (mobileTocOpen = true)}
		class="fixed right-4 bottom-6 z-40 flex cursor-pointer items-center gap-2 border-none bg-ink px-4 py-2.5 text-xs font-extrabold tracking-wider text-paper-bg uppercase shadow-xl hover:brightness-110 lg:hidden"
		aria-label="Table of contents"
	>
		<svg
			class="h-3.5 w-3.5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
		</svg>
		Contents
	</button>
{/if}

<!-- ============ MOBILE TOC MODAL ============ -->
{#if mobileTocOpen}
	<div class="fixed inset-0 z-50 lg:hidden">
		<div
			transition:fade={{ duration: 200 }}
			class="absolute inset-0 bg-black/60"
			onclick={() => (mobileTocOpen = false)}
			onkeydown={(e) => e.key === 'Escape' && (mobileTocOpen = false)}
			role="button"
			tabindex="0"
			aria-label="Close table of contents"
		></div>

		<div
			transition:fly={{ y: 300, duration: 300 }}
			class="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden border-t-2 border-ink bg-paper-bg shadow-up"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-line2 bg-paper-bg px-5 py-4"
			>
				<div>
					<h3 class="font-newsreader text-lg font-semibold">Table of Contents</h3>
					<p class="text-xs font-semibold tracking-wider text-fade uppercase">
						{tableOfContents.length} sections
					</p>
				</div>
				<button
					type="button"
					onclick={() => (mobileTocOpen = false)}
					class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-soft hover:border-ink"
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<nav class="overflow-y-auto px-3 py-3" style="max-height: calc(80vh - 90px);">
				{#key expandedSections}
					{#each tableOfContents as heading, index (heading.id)}
						{#if isVisible(index)}
							{@const _isTop = heading.level === 2}
							{@const _isActive = activeSection === heading.id}
							{#if _isTop}
								<a
									href="#{heading.id}"
									onclick={() => (mobileTocOpen = false)}
									class="flex items-baseline gap-3 pt-3.5 pb-2 font-newsreader text-2xl leading-tight font-semibold tracking-normal transition-colors {_isActive
										? 'text-warm'
										: 'text-ink hover:text-warm'}"
								>
									<span
										class="font-mono-system text-xs font-bold {_isActive
											? 'text-warm'
											: 'text-fade'}"
									>
										{String(topLevelNumbers[heading.id] || '').padStart(2, '0')}
									</span>
									<span>{heading.text}</span>
								</a>
							{:else}
								<a
									href="#{heading.id}"
									onclick={() => (mobileTocOpen = false)}
									style="padding-left: {(heading.level - 3) * 18}px"
									class="flex items-baseline gap-3 py-1.5 text-sm leading-snug font-medium transition-colors {_isActive
										? 'text-warm'
										: 'text-soft hover:text-warm'}"
								>
									<span class="invisible font-mono-system text-xs font-bold" aria-hidden="true">
										00
									</span>
									<span>{heading.text}</span>
								</a>
							{/if}
						{/if}
					{/each}
				{/key}
			</nav>
		</div>
	</div>
{/if}

<!-- card hover tooltip for inline card links -->
<CardHover />

<style>
	/* Headline size, as on the homepage hero: the max for the breakpoint,
	   reduced by a character-count estimate so long titles land near two
	   lines before JS runs; the fitTitle action then sets the exact size. */
	.article-title {
		--title-max: 38px;
		--title-w: calc(100vw - 40px);
		--title-lines: 3;
		font-size: clamp(
			calc(var(--title-max) * 0.55),
			calc(var(--title-w) * var(--title-lines) / (0.55 * var(--tc))),
			var(--title-max)
		);
	}
	@media (min-width: 768px) {
		.article-title {
			--title-max: clamp(46px, 5.6vw, 84px);
			--title-w: min(896px, 100vw - 64px);
			--title-lines: 2;
		}
	}
</style>
