<script>
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import AuthorCard from '$lib/components/age/library/AuthorCard.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import { fitTitle } from '$lib/actions/fitTitle.js';
	import { fade, fly } from 'svelte/transition';
	import CardHover from '$lib/components/CardHover.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import RenderLexical from '$lib/desk/render/RenderLexical.svelte';
	import { ARTICLE_PROSE } from '$lib/desk/render/articleProse.js';
	import LibraryVideoBlock from '$lib/desk/render/LibraryVideoBlock.svelte';

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
	$: hasCover = !isVideoEntry && !!data.article.coverImage?.src;
	$: videoPoster = data.article.thumbnailImage?.src || data.article.coverImage?.src || '';
	$: lengthLabel = data.article.readTime ? `${data.article.readTime} min read` : '';
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

		if (node.type === 'heading') {
			const text = extractLexicalText(node.children);
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

	function extractLexicalText(children) {
		if (!children) return '';
		return children.map((child) => child.text || extractLexicalText(child.children)).join('');
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

<svelte:head>
	<title>{data.article.title} — AGE</title>
	{#if data.article.excerpt}
		<meta name="description" content={data.article.excerpt} />
	{/if}
</svelte:head>

<AgeShell>
	{#if !hasCover}
		<!-- back to the library -->
		<div class="mx-auto w-full max-w-[1680px] px-5 pt-4 md:px-8 md:pt-5">
			<a
				href="/library"
				class="inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[color,gap] hover:gap-3 hover:text-warm"
			>
				<span aria-hidden="true">←</span>
				Library
			</a>
		</div>
	{/if}

	<!-- ============ COVER ============
	     Same composition as the homepage latest release: the 16:9 cover sits
	     in a plate frame with the copy overlaid on its lower third at md+
	     (white on an ink scrim) and set beneath it on phones. Video
	     entries and entries without a cover use the paper variant with
	     the copy centred above the media. -->
	<section class="relative">
		{#if hasCover}
			<div class="relative mx-auto aspect-video w-full max-w-[1680px] overflow-hidden bg-ink">
				<img
					src={data.article.coverImage.src}
					srcset={data.article.coverImage.srcset}
					sizes="(min-width: 1680px) 1680px, 100vw"
					alt={data.article.title}
					loading="eager"
					fetchpriority="high"
					class="fp-kenburns absolute inset-0 h-full w-full object-cover"
				/>
				<div
					class="absolute inset-x-0 top-0 h-24"
					style="background: linear-gradient(180deg, rgba(23,21,15,0.35), rgba(23,21,15,0));"
					aria-hidden="true"
				></div>
				<div
					class="absolute inset-x-0 bottom-0 hidden h-[78%] md:block"
					style="background: linear-gradient(180deg, rgba(23,21,15,0) 0%, rgba(23,21,15,0.3) 22%, rgba(23,21,15,0.72) 45%, rgba(23,21,15,0.92) 68%, rgba(23,21,15,0.98) 100%);"
					aria-hidden="true"
				></div>
				<div
					class="fp-fade pointer-events-none absolute inset-3 border border-white/70 md:inset-7"
					style="animation-delay: 400ms;"
					aria-hidden="true"
				></div>
				<a
					href="/library"
					class="fp-fade absolute top-6 left-6 z-[2] inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] text-white uppercase transition-[gap] hover:gap-3 md:top-10 md:left-10"
					style="animation-delay: 600ms; text-shadow: 0 1px 2px rgba(23,21,15,0.6);"
				>
					<span aria-hidden="true">←</span>
					Library
				</a>
			</div>
		{/if}

		<div
			class="fp-rise mx-auto w-full max-w-[960px] px-5 pt-7 pb-4 text-center md:px-8 {hasCover
				? 'md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:left-1/2 md:z-[1] md:-translate-x-1/2 md:pb-14 md:[text-shadow:0_1px_2px_rgba(23,21,15,0.6),0_6px_24px_rgba(23,21,15,0.45)] lg:pb-16'
				: 'md:pt-12 md:pb-6'}"
		>
			<a
				href={rubricHref}
				class="pointer-events-auto inline-flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.24em] uppercase md:text-[11.5px] {hasCover
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
				class="article-title mt-2 font-newsreader leading-[1.0] font-semibold tracking-[-0.02em] [text-wrap:balance] md:mt-3 md:leading-[0.96] {hasCover
					? 'md:text-white'
					: ''}"
			>
				{data.article.title}
			</h1>
			{#if data.article.excerpt}
				<p
					class="mx-auto mt-2.5 max-w-[640px] text-center font-newsreader text-[17px] leading-[1.45] [text-wrap:balance] italic md:mt-3 md:text-[21px] {hasCover
						? 'text-soft md:text-white/85'
						: 'text-soft'}"
				>
					{data.article.excerpt}
				</p>
			{/if}
			<div
				class="mt-3.5 flex flex-wrap items-baseline justify-center gap-x-2 text-[11px] md:mt-4 {hasCover
					? 'text-fade md:text-white/60'
					: 'text-fade'}"
			>
				{#if data.article.author}
					{#if data.article.author.slug}
						<a
							href="/library/author/{data.article.author.slug}"
							class="pointer-events-auto font-extrabold tracking-[0.12em] uppercase {hasCover
								? 'text-ink hover:text-warm md:text-white/90 md:hover:text-warm-light'
								: 'text-ink hover:text-warm'}"
						>
							By {data.article.author.name}
						</a>
					{:else}
						<span
							class="font-extrabold tracking-[0.12em] uppercase {hasCover
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
					<span class="self-center"><PremiumTag /></span>
				{/if}
			</div>
		</div>
	</section>

	{#if data.article.videoLocked}
		<!-- Premium video, non-member: paywalled frame, no player -->
		<figure class="m-0 mx-auto w-full max-w-[1200px] px-5 pt-4 md:px-8 md:pt-6">
			<div
				class="fp-plate relative overflow-hidden bg-[#080b15] md:aspect-video"
				data-premium-cta="video-gate"
			>
				{#if videoPoster}
					<img
						src={videoPoster}
						alt=""
						class="absolute inset-0 h-full w-full scale-105 object-cover blur-lg brightness-[0.4]"
					/>
				{/if}
				<div
					class="relative flex items-center justify-center px-5 py-8 md:absolute md:inset-0 md:px-6 md:py-0"
				>
					<div
						class="max-w-[560px] border-[3px] border-double border-paper-bg/80 px-6 py-8 text-center md:px-10 md:py-10"
					>
						<span
							class="mb-3 flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase"
						>
							<span aria-hidden="true">◆</span>Premium · Members only<span aria-hidden="true"
								>◆</span
							>
						</span>
						<h3
							class="m-0 mb-3 font-newsreader text-[clamp(28px,4vw,42px)] leading-[1] font-semibold tracking-[-0.02em] text-white"
						>
							Watch this video with a membership.
						</h3>
						<p
							class="mx-auto mb-6 max-w-[440px] font-newsreader text-[16px] leading-[1.5] italic"
							style="color: rgba(255,255,255,0.82);"
						>
							This video is for AGE Premium members. Membership unlocks every video, bonus match,
							and article on AGE.
						</p>
						<div class="flex flex-wrap items-center justify-center gap-3">
							<a
								href="/premium"
								class="inline-flex items-center border border-prem bg-prem px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
							>
								Become a member
							</a>
							{#if !data.user}
								<a
									href="/login?redirect=/library/{data.article.slug}"
									class="inline-flex items-center border border-white/60 px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10"
								>
									Sign in
								</a>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</figure>
	{:else if data.article.video}
		<figure class="m-0 mx-auto w-full max-w-[1200px] px-5 pt-4 md:px-8 md:pt-6">
			<div class="fp-plate">
				<LibraryVideoBlock video={data.article.video} poster={videoPoster} />
			</div>
		</figure>
	{/if}

	<!-- ============ READING LAYOUT ============ -->
	<div
		class="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-[72px] px-5 pt-[40px] pb-[30px] md:px-14 md:pt-[56px] lg:grid-cols-[232px_minmax(0,1fr)]"
	>
		<!-- ============ RAIL ============ -->
		<aside class="hidden lg:block">
			<div class="sticky top-[24px] max-h-[calc(100vh-48px)] overflow-y-auto pr-1">
				{#if data.article.author}
					<AuthorCard
						variant="rail"
						author={data.article.author}
						bioHtml={authorBioHtml}
						links={authorLinks}
					/>
				{/if}

				{#if !data.isPreview && tableOfContents.length > 0}
					<nav class="mt-5 border-t border-line pt-[15px]">
						<div
							class="mb-[10px] flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-ink uppercase"
						>
							<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
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
											class="flex items-baseline gap-[11px] pt-[12px] pb-[6px] font-newsreader text-[18px] leading-[1.2] font-semibold tracking-[-0.01em] transition-colors {_isActive
												? 'text-warm'
												: 'text-ink hover:text-warm'}"
										>
											<span
												class="font-mono-system text-[10px] font-bold {_isActive
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
											class="flex items-baseline gap-[11px] py-[4px] text-[12.5px] leading-[1.4] font-medium transition-colors {_isActive
												? 'text-warm'
												: 'text-soft hover:text-warm'}"
										>
											<span
												class="invisible font-mono-system text-[10px] font-bold"
												aria-hidden="true"
											>
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
				<div class="mt-[18px] flex gap-2">
					<button
						type="button"
						onclick={copyLink}
						data-share="copy_link"
						title="Copy link"
						aria-label="Copy link"
						class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-[10.5px] font-extrabold text-soft transition-colors hover:border-accent hover:text-accent"
					>
						⧉
					</button>
					<button
						type="button"
						onclick={shareTwitter}
						data-share="x"
						title="Share on X"
						aria-label="Share on X"
						class="flex h-8 w-8 cursor-pointer items-center justify-center border border-line2 bg-transparent text-[10.5px] font-extrabold text-soft transition-colors hover:border-accent hover:text-accent"
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
					class="{data.isPreview
						? 'pointer-events-none blur-[7px] select-none'
						: ''} {ARTICLE_PROSE}"
				>
					{#if data.article.content}
						<RenderLexical content={data.article.content} {cardImages} />
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
						class="border-[3px] border-double border-ink bg-paper px-6 py-9 text-center md:px-12 md:py-12"
					>
						<div
							class="flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase"
						>
							<span aria-hidden="true">◆</span>
							Premium · Members only
							<span aria-hidden="true">◆</span>
						</div>
						<h3
							class="mx-auto mt-3 max-w-[640px] font-newsreader text-[30px] leading-[1.05] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[40px]"
						>
							Keep reading with a membership.
						</h3>
						<p
							class="mx-auto mt-4 max-w-[520px] font-newsreader text-[16px] leading-[1.5] text-soft italic md:text-[18px]"
						>
							This story is for AGE Premium members. Membership funds every article, broadcast,
							course, and event we put on — and unlocks all of it.
						</p>
						<div
							class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 md:mt-8"
						>
							<a
								href="/premium"
								class="inline-flex items-center border border-prem bg-prem px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
							>
								Become a member
							</a>
							{#if !data.user}
								<a
									href="/login?redirect=/library/{data.article.slug}"
									class="inline-flex items-center border border-ink px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg"
								>
									Sign in
								</a>
							{/if}
						</div>
						<div class="mt-4 text-[11px] text-fade italic">$10 a month · cancel anytime</div>
					</div>
				</div>
			{/if}

			<!-- ============ TOPICS ============ -->
			{#if !data.isPreview && data.article.tags && data.article.tags.length > 0}
				<div class="mt-[44px] flex flex-wrap items-center gap-3">
					<span
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-ink uppercase"
					>
						<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
						Filed under
					</span>
					{#each data.article.tags as tag (tag.slug)}
						<a
							href="/library/tag/{tag.slug}"
							class="border border-line2 px-[12px] py-[6px] text-[10.5px] font-extrabold tracking-[0.12em] text-soft uppercase transition-colors hover:border-warm hover:text-warm"
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
</AgeShell>

<!-- ============ MOBILE TOC FAB ============ -->
{#if !data.isPreview && tableOfContents.length > 0}
	<button
		type="button"
		onclick={() => (mobileTocOpen = true)}
		class="fixed right-4 bottom-6 z-40 flex cursor-pointer items-center gap-2 border-none bg-ink px-4 py-[10px] text-[11px] font-extrabold tracking-[0.07em] text-paper-bg uppercase shadow-[0_18px_36px_-22px_rgba(20,16,8,0.6)] hover:brightness-110 lg:hidden"
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
			class="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden border-t-[1.5px] border-ink bg-paper-bg shadow-[0_-18px_36px_-22px_rgba(20,16,8,0.5)]"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-line2 bg-paper-bg px-5 py-4"
			>
				<div>
					<h3 class="font-newsreader text-[18px] font-semibold">Table of Contents</h3>
					<p class="text-[11px] font-semibold tracking-[0.04em] text-fade uppercase">
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
									class="flex items-baseline gap-3 pt-[14px] pb-[8px] font-newsreader text-[22px] leading-[1.2] font-semibold tracking-[-0.01em] transition-colors {_isActive
										? 'text-warm'
										: 'text-ink hover:text-warm'}"
								>
									<span
										class="font-mono-system text-[11px] font-bold {_isActive
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
									class="flex items-baseline gap-3 py-[6px] text-[14px] leading-[1.4] font-medium transition-colors {_isActive
										? 'text-warm'
										: 'text-soft hover:text-warm'}"
								>
									<span class="invisible font-mono-system text-[11px] font-bold" aria-hidden="true">
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
