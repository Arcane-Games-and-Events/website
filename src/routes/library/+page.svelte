<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { page as pageStore } from '$app/stores';
	import { fade, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';

	$: isPremiumMember = $pageStore.data?.isPremiumMember ?? false;

	// One smooth easing curve + matched durations for in / out / flip
	// so the grid feels like a single choreographed motion rather than
	// three competing transitions. Out runs short and snappy so the
	// outgoing card releases its grid cell quickly; in + flip share a
	// longer, gently-decelerating curve for the slide into place.
	const GRID_IN = { y: 14, duration: 460, easing: quintOut, opacity: 0 };
	const GRID_OUT = { duration: 180 };
	const GRID_FLIP = { duration: 460, easing: quintOut };

	// ============ scroll-to-top on page change ============
	// Bound to the "Latest in the Library" header so a pagination
	// click slides the viewport back up to the new page's results
	// (the grid is too long to see the change otherwise).
	/** @type {HTMLElement | undefined} */
	let libraryAnchorEl;

	function gotoPage(n) {
		if (n < 1 || n > pageCount || n === curPage) return;
		page = n;
		// Defer until after Svelte commits the new `shown` slice and
		// the cards start their transitions; otherwise we'd scroll
		// to the OLD position of the anchor element.
		requestAnimationFrame(() => {
			libraryAnchorEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}
	export let data;

	// ============ derived data ============
	// All articles sorted newest first
	$: allArticles = [...data.articles].sort(
		(a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
	);

	// Featured spotlight: newest article (first item)
	$: featured = allArticles[0] || null;

	// Editor's picks rail: items 1-4 (4 picks)
	$: editorPicks = allArticles.slice(1, 5);

	// Unique tags from all articles for the filter pills
	$: allTags = [
		...new Set(
			allArticles.flatMap((a) => a.tags || []).map((t) => t.name)
		)
	].sort();

	// ============ filter + pagination state ============
	let tier = 'All'; // 'All' | 'Free' | 'Premium'
	let selectedTag = '';
	let searchQuery = '';
	let page = 1;
	const perPage = 9;

	// Reset to first page whenever filters change
	$: tier, selectedTag, searchQuery, (page = 1);

	// Filtered results
	$: filtered = allArticles.filter((a) => {
		if (tier === 'Free' && a.isPremium) return false;
		if (tier === 'Premium' && !a.isPremium) return false;
		if (selectedTag) {
			const names = (a.tags || []).map((t) => t.name);
			if (!names.includes(selectedTag)) return false;
		}
		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			const inTitle = (a.title || '').toLowerCase().includes(q);
			const inExcerpt = (a.excerpt || '').toLowerCase().includes(q);
			const inAuthor = (a.author?.name || '').toLowerCase().includes(q);
			if (!inTitle && !inExcerpt && !inAuthor) return false;
		}
		return true;
	});

	$: pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
	$: curPage = Math.min(page, pageCount);
	$: shown = filtered.slice((curPage - 1) * perPage, curPage * perPage);

	// ============ helpers ============
	function formatDate(d) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatDuration(seconds) {
		if (!seconds) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function vodThumbnail(v) {
		if (v?.muxPlaybackId) {
			const tokenParam = v.thumbnailToken ? `&token=${v.thumbnailToken}` : '';
			return `https://image.mux.com/${v.muxPlaybackId}/thumbnail.webp?width=720&height=405&fit_mode=smartcrop${tokenParam}`;
		}
		return v?.thumbnail || 'https://www.age.events/banner/articles-banner.webp';
	}

	function vodSubline(v) {
		const parts = [];
		if (v?.eventCircuit) parts.push(`AGE Open · ${v.eventCircuit}`);
		else if (v?.eventTitle) parts.push(v.eventTitle);
		if (v?.eventMonth) parts.push(v.eventMonth);
		return parts.join(' · ');
	}

	function coverSrc(a) {
		const c = a?.coverImage;
		if (!c) return 'https://www.age.events/banner/articles-banner.webp';
		if (typeof c === 'string') return c;
		return c.src || c.url || 'https://www.age.events/banner/articles-banner.webp';
	}

	function isNew(publishedAt) {
		if (!publishedAt) return false;
		const days = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
		return days <= 7;
	}

	// Build the pagination range (compact ellipsis form)
	function buildPageNumbers(current, total) {
		const out = [];
		if (total <= 7) {
			for (let i = 1; i <= total; i++) out.push(i);
			return out;
		}
		out.push(1);
		const start = Math.max(2, current - 1);
		const end = Math.min(total - 1, current + 1);
		if (start > 2) out.push('…');
		for (let i = start; i <= end; i++) out.push(i);
		if (end < total - 1) out.push('…');
		out.push(total);
		return out;
	}

	$: pageNumbers = buildPageNumbers(curPage, pageCount);
</script>

<svelte:head>
	<title>Library — AGE</title>
	<meta
		name="description"
		content="Articles, strategy, and reporting from the players who define the Flesh and Blood competitive scene."
	/>
</svelte:head>

<AgeShell active="Library">
	<!-- ============ FEATURED SPOTLIGHT ============ -->
	{#if featured}
		<!--
			Outer wrap keeps the 3px double bottom rule edge-to-edge so it
			reads as a section divider like the rest of the editorial
			design, while the inner cap pins the spotlight content to the
			same width as the article grid below (max-w + px-14).
		-->
		<div class="border-ink border-b-[3px] border-double">
		<section class="mx-auto grid w-full max-w-[1600px] grid-cols-1 px-14 lg:grid-cols-[1.62fr_1fr]">
			<!-- featured hero -->
			<a
				href="/library/{featured.slug}"
				class="border-line2 group relative flex aspect-video items-end overflow-hidden bg-[#0F1320] lg:border-r"
			>
				<div
					class="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700"
					style="background-image: url('{coverSrc(featured)}');"
				></div>
				<span
					class="pointer-events-none absolute inset-0 z-[1]"
					style="background: linear-gradient(7deg, rgba(8,11,21,0.96) 14%, rgba(8,11,21,0.55) 48%, rgba(8,11,21,0.1) 100%);"
					aria-hidden="true"
				></span>

				<!-- kicker -->
				<span
					class="absolute top-[26px] left-[32px] z-[3] inline-flex items-center gap-[10px] text-[10.5px] font-extrabold tracking-[0.15em] text-white uppercase before:block before:h-[2px] before:w-[26px] before:bg-warm before:content-['']"
				>
					Featured · Cover story
				</span>

				<!-- date pill -->
				{#if featured.publishedAt}
					<span
						class="absolute top-[23px] right-[24px] z-[3] border border-white/30 bg-white/15 px-[11px] py-[5px] text-[11.5px] font-bold text-white backdrop-blur-[4px]"
					>
						{formatDate(featured.publishedAt)}
					</span>
				{/if}

				<!-- content -->
				<div class="relative z-[3] px-[38px] pb-[34px]">
					<div class="mb-[15px] flex flex-wrap gap-2">
						<span
							class="bg-accent inline-flex items-center gap-[6px] px-[9px] py-1 text-[9px] font-extrabold tracking-[0.09em] text-white uppercase"
						>
							<svg width="9" height="9" viewBox="0 0 14 14" aria-hidden="true">
								<rect x="2" y="1.5" width="10" height="11" rx="1" stroke="currentColor" stroke-width="1.4" fill="none" />
								<line x1="4.3" y1="5" x2="9.7" y2="5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
								<line x1="4.3" y1="7.4" x2="9.7" y2="7.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
								<line x1="4.3" y1="9.8" x2="7.5" y2="9.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
							</svg>
							Article
						</span>
						{#if featured.isPremium}
							<span
								class="bg-prem border-prem inline-flex items-center border px-[9px] py-1 text-[9px] font-extrabold tracking-[0.08em] text-white uppercase"
							>
								Premium
							</span>
						{:else}
							<span
								class="inline-flex items-center border border-white/40 px-[9px] py-1 text-[9px] font-extrabold tracking-[0.08em] text-white uppercase"
							>
								Free
							</span>
						{/if}
					</div>
					<h2
						class="font-newsreader mb-[13px] max-w-[640px] text-[46px] leading-[0.98] font-semibold tracking-[-0.025em] text-white [text-wrap:balance]"
					>
						{featured.title}
					</h2>
					{#if featured.excerpt}
						<p class="mb-[15px] max-w-[560px] text-[14.5px] leading-[1.55] text-white/80">
							{featured.excerpt}
						</p>
					{/if}
					{#if featured.author?.name}
						<div class="mb-[21px] text-[12px]">
							<span class="font-extrabold text-white">{featured.author.name}</span>
							{#if featured.readTime}
								<span class="mx-[6px] font-bold text-white/40" aria-hidden="true">·</span>
								<span class="font-bold text-white/65">{featured.readTime} min read</span>
							{/if}
						</div>
					{/if}
					<span
						class="border-warm bg-warm inline-flex items-center gap-2 border-[1.5px] px-[19px] py-[12px] text-[12px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] group-hover:brightness-110"
					>
						Read the story →
					</span>
				</div>
			</a>

			<!-- editor's picks rail -->
			<aside class="bg-paper flex flex-col">
				<div
					class="border-ink flex items-baseline justify-between border-b-2 px-4 md:px-6 py-[16px]"
				>
					<span class="text-ink text-[11px] font-extrabold tracking-[0.14em] uppercase">
						Editor's Picks
					</span>
					<span class="text-warm text-[10px] font-extrabold tracking-[0.08em] uppercase">
						This week
					</span>
				</div>
				{#each editorPicks as p (p.slug)}
					<a
						href="/library/{p.slug}"
						class="border-line group grid items-center gap-[15px] border-b px-4 md:px-6 py-4 last:border-b-0 hover:bg-panel grid-cols-[132px_minmax(0,1fr)]"
					>
						<div
							class="border-line2 bg-panel relative aspect-video border bg-cover bg-center"
							style="background-image: url('{coverSrc(p)}');"
						></div>
						<div class="min-w-0">
							<div class="mb-2 flex flex-wrap items-center gap-[6px]">
								<span
									class="bg-accent inline-flex items-center gap-[6px] px-[9px] py-[3px] text-[9px] font-extrabold tracking-[0.09em] text-white uppercase"
								>
									<svg width="9" height="9" viewBox="0 0 14 14" aria-hidden="true">
										<rect x="2" y="1.5" width="10" height="11" rx="1" stroke="currentColor" stroke-width="1.4" fill="none" />
										<line x1="4.3" y1="5" x2="9.7" y2="5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
										<line x1="4.3" y1="7.4" x2="9.7" y2="7.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
										<line x1="4.3" y1="9.8" x2="7.5" y2="9.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
									</svg>
									Article
								</span>
								{#if p.isPremium}
									<span
										class="bg-prem border-prem inline-flex items-center border px-[9px] py-[3px] text-[9px] font-extrabold tracking-[0.08em] text-white uppercase"
									>
										Premium
									</span>
								{/if}
							</div>
							<h4
								class="font-newsreader mb-[6px] text-[15.5px] font-semibold leading-[1.1] group-hover:text-warm"
							>
								{p.title}
							</h4>
							<div class="text-[10px] uppercase tracking-[0.04em]">
								{#if p.author?.name}
									<span class="text-ink font-extrabold">{p.author.name}</span>
								{/if}
								{#if p.author?.name && p.publishedAt}
									<span class="text-fade mx-[6px] font-bold" aria-hidden="true">·</span>
								{/if}
								{#if p.publishedAt}
									<span class="text-fade font-bold">{formatDate(p.publishedAt)}</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</aside>
		</section>
		</div>
	{/if}

	<!-- ============ LIBRARY HEADER ============ -->
	<!--
		`scroll-mt-[24px]` keeps a small breathing space at the top when
		`scrollIntoView` lands on this anchor; otherwise the header
		would butt right against the editorial nav band.
	-->
	<div
		bind:this={libraryAnchorEl}
		class="mx-auto w-full max-w-[1600px] scroll-mt-[24px] px-14 pt-[44px] pb-[2px]"
	>
		<div class="text-warm mb-[11px] text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Read &amp; Watch
		</div>
		<h2
			class="font-newsreader m-0 text-[40px] font-semibold leading-none tracking-[-0.02em]"
		>
			Latest in the Library
		</h2>
		<p class="text-soft mt-3 max-w-[620px] text-[15px] leading-[1.55]">
			Reporting, strategy, deck techs, and originals — free and Premium, all in one feed.
		</p>
	</div>

	<!-- ============ STICKY FILTER BAR ============ -->
	<div
		class="bg-paper border-ink sticky top-0 z-[5] border-b-2"
	>
		<div
			class="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-14 py-[14px]"
		>
			<!-- segment (just Articles for now, since no video data yet) -->
			<div class="flex gap-[5px]">
				<span
					class="border-ink bg-ink text-paper-bg inline-flex cursor-default items-center gap-2 border px-[15px] py-[9px] text-[12px] font-bold whitespace-nowrap"
				>
					<span class="bg-paper-bg block h-2 w-2" aria-hidden="true"></span>
					Articles
				</span>
			</div>

			<span class="border-line2 hidden h-6 w-px bg-line2 lg:block" aria-hidden="true"></span>

			<!-- tier filter -->
			<div class="flex flex-wrap gap-[5px]">
				{#each ['All', 'Free', 'Premium'] as t (t)}
					<button
						type="button"
						onclick={() => (tier = t)}
						class="cursor-pointer border px-[13px] py-[9px] text-[11px] font-bold tracking-[0.04em] uppercase transition-colors {tier ===
						t
							? t === 'Premium'
								? 'border-prem bg-prem text-white'
								: 'border-ink bg-ink text-paper-bg'
							: 'border-line2 text-soft hover:text-ink'}"
					>
						{t}
					</button>
				{/each}
			</div>

			<!-- tag filter (compact, optional) -->
			{#if allTags.length > 0}
				<span class="border-line2 hidden h-6 w-px bg-line2 lg:block" aria-hidden="true"></span>
				<select
					bind:value={selectedTag}
					class="border-line2 text-soft hover:text-ink focus:border-ink h-[36px] cursor-pointer border bg-paper-bg px-3 text-[11px] font-bold tracking-[0.04em] uppercase outline-none"
				>
					<option value="">All tags</option>
					{#each allTags as t (t)}
						<option value={t}>{t}</option>
					{/each}
				</select>
			{/if}

			<span class="flex-1"></span>

			<!-- search -->
			<!--
				Reset the form input so the @tailwindcss/forms base styles
				(default border, ring on focus) don't fight with the
				editorial wrapper. `appearance-none` also strips the
				webkit search-clear button + inner border.
			-->
			<div
				class="border-line2 focus-within:border-ink relative flex items-center border bg-paper-bg"
			>
				<span class="text-fade pl-3 text-[14px]" aria-hidden="true">⌕</span>
				<input
					type="search"
					bind:value={searchQuery}
					placeholder="Search the Library"
					class="text-ink placeholder:text-fade h-[36px] w-[220px] appearance-none border-0 bg-transparent px-2 text-[12px] font-bold shadow-none outline-none focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
				/>
			</div>
		</div>
	</div>

	<!-- ============ RESULT LINE ============ -->
	<div
		class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[26px] text-[11.5px] font-bold tracking-[0.05em] text-fade uppercase"
	>
		Showing
		<b class="text-ink">
			{shown.length ? (curPage - 1) * perPage + 1 : 0}–{(curPage - 1) * perPage + shown.length}
		</b>
		of
		<b class="text-ink">{filtered.length}</b>
		· Articles{tier !== 'All' ? ` · ${tier}` : ''}{selectedTag ? ` · ${selectedTag}` : ''}
	</div>

	<!-- ============ GRID ============ -->
	<div
		class="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-14 pt-[22px] pb-[8px] md:grid-cols-2 lg:grid-cols-3"
	>
		{#if shown.length === 0}
			<div
				class="font-newsreader text-fade col-span-full py-[60px] text-center text-[17px] italic"
			>
				Nothing here yet — try another filter.
			</div>
		{:else}
			<!--
				When the filter list changes (segment / tier / tag /
				search) — outgoing cards fade out (short) so they release
				their grid cell quickly, the remaining cards FLIP to
				their new grid positions on a quintOut ease, and entering
				cards rise + fade with the matching curve. Same easing +
				duration on `in` and `flip` makes the whole motion read
				as one continuous choreography.
			-->
			{#each shown as it (it.slug)}
				<a
					href="/library/{it.slug}"
					in:fly={GRID_IN}
					out:fade={GRID_OUT}
					animate:flip={GRID_FLIP}
					class="border-line2 border-t-accent group bg-paper relative flex flex-col border border-t-[3px] transition-[border-color,box-shadow] hover:border-ink hover:shadow-[0_24px_42px_-28px_rgba(20,16,8,0.55)]"
				>
					<!-- cover -->
					<div class="bg-panel relative aspect-[16/10] overflow-hidden">
						<div
							class="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.07]"
							style="background-image: url('{coverSrc(it)}');"
						></div>
						<span
							class="pointer-events-none absolute inset-0 z-[1] opacity-30 transition-opacity group-hover:opacity-60"
							style="background: linear-gradient(0deg, rgba(8,11,21,0.5), transparent 58%);"
							aria-hidden="true"
						></span>
						{#if isNew(it.publishedAt)}
							<span
								class="bg-warm absolute top-[11px] left-[11px] z-[2] px-2 py-1 text-[9px] font-extrabold tracking-[0.1em] text-white uppercase"
							>
								New
							</span>
						{/if}
					</div>

					<!-- body -->
					<div class="flex flex-1 flex-col px-[18px] py-[15px] pb-[17px]">
						<div class="mb-[10px] flex flex-wrap items-center gap-[7px]">
							<span
								class="bg-accent inline-flex items-center gap-[6px] px-[9px] py-[3px] text-[9px] font-extrabold tracking-[0.09em] text-white uppercase"
							>
								<svg width="9" height="9" viewBox="0 0 14 14" aria-hidden="true">
									<rect x="2" y="1.5" width="10" height="11" rx="1" stroke="currentColor" stroke-width="1.4" fill="none" />
									<line x1="4.3" y1="5" x2="9.7" y2="5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
									<line x1="4.3" y1="7.4" x2="9.7" y2="7.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
									<line x1="4.3" y1="9.8" x2="7.5" y2="9.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
								</svg>
								Article
							</span>
							{#if it.isPremium}
								<span
									class="bg-prem border-prem inline-flex items-center border px-[9px] py-[3px] text-[9px] font-extrabold tracking-[0.08em] text-white uppercase"
								>
									Premium
								</span>
							{:else}
								<span
									class="border-line2 text-soft inline-flex items-center border px-[9px] py-[3px] text-[9px] font-extrabold tracking-[0.08em] uppercase"
								>
									Free
								</span>
							{/if}
						</div>
						<h3
							class="font-newsreader mb-2 text-[20px] leading-[1.08] font-semibold tracking-[-0.01em] group-hover:text-warm"
						>
							{it.title}
						</h3>
						{#if it.excerpt}
							<p class="text-soft mb-[14px] line-clamp-2 text-[13px] leading-[1.45]">
								{it.excerpt}
							</p>
						{/if}
						<div class="mt-auto flex items-baseline justify-between gap-[10px]">
							<span class="min-w-0 truncate text-[11px]">
								{#if it.author?.name}
									<span class="text-ink font-extrabold">{it.author.name}</span>
								{/if}
								{#if it.author?.name && it.publishedAt}
									<span class="text-fade mx-[6px] font-bold" aria-hidden="true">·</span>
								{/if}
								{#if it.publishedAt}
									<span class="text-fade font-bold">{formatDate(it.publishedAt)}</span>
								{/if}
							</span>
							<span
								class="text-accent flex-shrink-0 text-[10px] font-extrabold tracking-[0.06em] uppercase opacity-0 transition-[opacity,transform] -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
							>
								Read →
							</span>
						</div>
					</div>
				</a>
			{/each}
		{/if}
	</div>

	<!-- ============ PAGINATION ============ -->
	{#if pageCount > 1}
		<div
			class="mx-auto flex w-full max-w-[1600px] items-center justify-center gap-[18px] px-14 pt-[30px] pb-[52px]"
		>
			<button
				type="button"
				onclick={() => gotoPage(curPage - 1)}
				disabled={curPage === 1}
				class="border-ink text-ink hover:bg-ink hover:text-paper-bg cursor-pointer border-[1.5px] bg-transparent px-[22px] py-[11px] text-[12px] font-extrabold tracking-[0.06em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30"
			>
				← Prev
			</button>
			<div class="flex flex-wrap justify-center gap-[6px]">
				{#each pageNumbers as n, i (i)}
					{#if n === '…'}
						<span
							class="text-fade flex h-[38px] min-w-[20px] items-center justify-center text-[13px] font-bold"
						>
							…
						</span>
					{:else}
						<button
							type="button"
							onclick={() => gotoPage(n)}
							class="flex h-[38px] min-w-[38px] cursor-pointer items-center justify-center border-[1.5px] px-[6px] text-[13px] font-extrabold transition-colors {n ===
							curPage
								? 'border-ink bg-ink text-paper-bg'
								: 'text-ink border-transparent hover:border-line2'}"
						>
							{n}
						</button>
					{/if}
				{/each}
			</div>
			<button
				type="button"
				onclick={() => gotoPage(curPage + 1)}
				disabled={curPage === pageCount}
				class="border-ink text-ink hover:bg-ink hover:text-paper-bg cursor-pointer border-[1.5px] bg-transparent px-[22px] py-[11px] text-[12px] font-extrabold tracking-[0.06em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30"
			>
				Next →
			</button>
		</div>
	{/if}

	<!-- ============ BONUS MATCH VODs ============ -->
	{#if data.vods && data.vods.length > 0}
		<!--
			Two-layer wrap so the dark band runs edge-to-edge while the
			content area matches the article grid: the outer <section>
			provides the full-bleed background + double rule above/below,
			the inner <div> applies the same `max-w` + `px-14` cap the
			grid uses so cards above and below line up pixel-perfect.
		-->
		<section
			class="border-ink border-y-[3px] border-double bg-[#0F1320] py-[44px] text-white"
		>
			<div
				class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14"
			>
				<div class="mb-[26px] flex flex-wrap items-end justify-between gap-[26px] border-b border-white/15 pb-[18px]">
					<div>
						<div class="mb-3 text-[11px] font-extrabold tracking-[0.16em] uppercase" style="color: #E5703E;">
							AGE Studios · Match Film
						</div>
						<h2
							class="font-newsreader m-0 text-[40px] leading-none font-semibold tracking-[-0.02em] text-white"
						>
							Bonus Match VODs
						</h2>
						<p class="mt-[10px] max-w-[460px] text-[13.5px] leading-[1.5]" style="color: #AEB4C2;">
							Full bonus matches from across the circuit — every game, start to finish, with desk
							commentary.
						</p>
					</div>
					<a
						href="/library/vods"
						class="hover:text-ink whitespace-nowrap border-[1.5px] border-white/40 px-[19px] py-[13px] text-[11px] font-extrabold tracking-[0.06em] uppercase text-white transition-colors hover:bg-white"
					>
						{#if data.vodTotal && data.vodTotal > data.vods.length}
							All {data.vodTotal} matches →
						{:else}
							View all →
						{/if}
					</a>
				</div>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each data.vods as v (v.id)}
						<a
							href="/library/{v.id}"
							class="group flex flex-col border border-[#232A3B] bg-[#161B2B] border-t-[3px] border-t-[#E5703E] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_26px_44px_-28px_rgba(0,0,0,0.7)]"
						>
							<!-- thumbnail -->
							<div class="relative aspect-video overflow-hidden bg-[#0A0D16]">
								<div
									class="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.07]"
									style="background-image: url('{vodThumbnail(v)}');"
								></div>
								<span
									class="pointer-events-none absolute inset-0 z-[1]"
									style="background: linear-gradient(0deg, rgba(8,11,21,0.6), transparent 58%);"
									aria-hidden="true"
								></span>
								{#if v.eventCircuit}
									<span
										class="absolute top-[10px] left-[10px] z-[2] bg-black/80 px-2 py-1 text-[9px] font-extrabold tracking-[0.08em] text-white uppercase"
									>
										{v.eventCircuit}
									</span>
								{/if}
								<span
									class="absolute top-1/2 left-1/2 z-[2] flex h-[50px] w-[50px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 pl-[3px] text-[14px] text-[#0F1320] transition-transform group-hover:scale-110 group-hover:bg-white"
									aria-hidden="true"
								>
									▶
								</span>
								{#if v.duration}
									<span
										class="absolute right-[10px] bottom-[10px] z-[2] bg-black/85 px-[7px] py-[2px] text-[10.5px] font-bold text-white"
									>
										{formatDuration(v.duration)}
									</span>
								{/if}
							</div>

							<!-- body -->
							<div class="flex flex-1 flex-col px-[18px] py-[16px] pb-[18px]">
								<h3
									class="font-newsreader mb-2 text-[21px] leading-[1.05] font-semibold tracking-[-0.01em] text-white group-hover:text-[#E5703E]"
								>
									{v.title}
								</h3>
								{#if vodSubline(v)}
									<div class="mb-3 text-[10px] font-extrabold tracking-[0.09em] uppercase" style="color: #E5703E;">
										{vodSubline(v)}
									</div>
								{/if}
								<div class="mt-auto flex items-center justify-between gap-[10px] text-[11px] font-bold" style="color: #8B93A6;">
									{#if v.player1Name && v.player2Name}
										<span class="truncate">
											{v.player1Name} vs {v.player2Name}
										</span>
									{:else}
										<span></span>
									{/if}
									{#if v.isPremium}
										<span
											class="bg-prem border-prem flex-shrink-0 border px-[7px] py-[3px] text-[9.5px] font-extrabold tracking-[0.04em] uppercase text-white"
										>
											Premium
										</span>
									{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- ============ PREMIUM BAND ============ -->
	{#if !isPremiumMember}
	<section
		class="bg-prem border-ink relative overflow-hidden border-t-[3px] border-double px-14 py-[58px] text-center text-white"
	>
		<span
			class="font-newsreader pointer-events-none absolute -top-[72px] right-[50px] text-[330px] leading-none font-semibold text-white/10"
			aria-hidden="true"
		>
			&amp;
		</span>
		<div class="relative z-[1] mx-auto max-w-[760px]">
			<div class="mb-[14px] text-[11px] font-extrabold tracking-[0.18em] uppercase" style="color: #cfebd9;">
				Member-supported
			</div>
			<h2 class="font-newsreader mb-3 text-[44px] leading-[1.04] font-semibold text-white">
				One membership. The whole Library.
			</h2>
			<p class="mb-6 text-[15px] leading-[1.55]" style="color: #dcefe3;">
				Premium unlocks every member-only article and keeps independent coverage free for the
				whole community.
			</p>
			<a
				href="/premium"
				class="text-prem inline-flex items-center gap-2 border-[1.5px] border-white bg-white px-7 py-[14px] text-[12px] font-bold tracking-[0.05em] uppercase transition-colors hover:bg-white/90"
			>
				Get Premium →
			</a>
		</div>
	</section>
	{/if}
</AgeShell>
