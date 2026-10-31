<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import LibraryWordmark from '$lib/components/age/library/LibraryWordmark.svelte';
	/**
	 * Library index — the magazine's archive in the homepage's register:
	 * a department masthead, the latest release as a plate-framed spread,
	 * then the browse grid (search, kind, access and topic filters, nine
	 * to a page) as a hairline mosaic, the newest from the Studio, and
	 * a topic index. Filters mirror into the URL so a view can be shared.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import FrontByline from '$lib/components/age/home/FrontByline.svelte';
	import StoryCard from '$lib/components/age/library/StoryCard.svelte';
	import { storyCardSheet, toStories } from '$lib/components/age/library/stories.js';
	import { reveal } from '$lib/actions/reveal.js';
	import FilterSelect from '$lib/components/age/FilterSelect.svelte';
	import { page as pageStore } from '$app/stores';
	import { replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	import WatchFrame from '$lib/components/age/watch/WatchFrame.svelte';
	import WatchCard from '$lib/components/age/watch/WatchCard.svelte';
	import { KIND as STUDIO_KIND, byline as studioByline } from '$lib/studio/kinds.js';

	let { data } = $props();
	const member = $derived($pageStore.data?.isPremiumMember ?? false);

	// ============ stories ============
	const stories = $derived(toStories(data.articles));
	const featured = $derived(stories[0] ?? null);
	const counts = $derived({
		articles: stories.filter((s) => s.kind === 'article').length,
		videos: stories.filter((s) => s.kind === 'video').length,
		films: data.studio?.total ?? 0
	});
	const allTags = $derived([...new Set(stories.flatMap((s) => s.tags))].sort());
	const topicOptions = $derived([{ v: '', l: 'Any' }, ...allTags.map((t) => ({ v: t, l: t }))]);
	// The topic index links each tag to its own page.
	const topics = $derived.by(() => {
		const by = new Map();
		for (const s of stories) {
			if (!s.tagSlug) continue;
			const t = by.get(s.tagSlug) ?? { name: s.rubric, slug: s.tagSlug, n: 0 };
			t.n += 1;
			by.set(s.tagSlug, t);
		}
		return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
	});

	// ============ from the Studio ============
	const studioLead = $derived(data.studio?.lead ?? null);
	const studioStrip = $derived(data.studio?.strip ?? []);

	// ============ browse filters ============
	const KIND = [
		{ v: 'all', l: 'All' },
		{ v: 'article', l: 'Articles' },
		{ v: 'video', l: 'Video' }
	];
	const ACCESS = [
		{ v: 'all', l: 'All' },
		{ v: 'free', l: 'Free' },
		{ v: 'premium', l: 'Premium' }
	];
	// View: the composed mosaic (nine to a page, one sheet) or a plain grid
	// (twelve to a page, four rows of three). Remembered per browser.
	let view = $state('mosaic');
	const PER_PAGE = $derived(view === 'grid' ? 12 : 9);
	// Set once the reader switches views: from then on the cards fade up
	// on each switch instead of waiting for the scroll reveal.
	let switched = $state(false);
	function setView(v) {
		if (v === view) return;
		switched = true;
		view = v;
		try {
			localStorage.setItem('age:library:view', v);
		} catch {
			/* storage unavailable */
		}
	}
	let q = $state('');
	let kind = $state('all');
	let access = $state('all');
	let tag = $state('');
	let pageNo = $state(1);

	const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	const filtered = $derived.by(() => {
		const terms = norm(q).split(/\s+/).filter(Boolean);
		return stories.filter((s) => {
			if (kind !== 'all' && s.kind !== kind) return false;
			if (access === 'free' && s.premium) return false;
			if (access === 'premium' && !s.premium) return false;
			if (tag && !s.tags.includes(tag)) return false;
			if (terms.length) {
				const hay = norm(`${s.title} ${s.dek} ${s.author} ${s.tags.join(' ')}`);
				if (!terms.every((t) => hay.includes(t))) return false;
			}
			return true;
		});
	});
	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
	const curPage = $derived(Math.min(pageNo, pageCount));
	const shown = $derived(filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE));
	const activeCount = $derived(
		(q ? 1 : 0) + (kind !== 'all' ? 1 : 0) + (access !== 'all' ? 1 : 0) + (tag ? 1 : 0)
	);
	const resultLine = $derived.by(() => {
		const noun = filtered.length === 1 ? 'piece' : 'pieces';
		const scope =
			filtered.length === stories.length
				? `${stories.length} ${noun}`
				: `${filtered.length} of ${stories.length} pieces`;
		const where = pageCount > 1 ? `, page ${curPage} of ${pageCount}` : '';
		return `${scope}${q ? ` matching “${q}”` : ''}${where}.`;
	});
	// Any filter change returns to the first page.
	$effect(() => {
		q;
		kind;
		access;
		tag;
		view;
		pageNo = 1;
	});
	function clearAll() {
		q = '';
		kind = 'all';
		access = 'all';
		tag = '';
	}

	/** @type {HTMLElement | undefined} */
	let browseEl = $state();
	function gotoPage(n) {
		if (n < 1 || n > pageCount || n === curPage) return;
		pageNo = n;
		requestAnimationFrame(() => browseEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
	}
	const pageNumbers = $derived.by(() => {
		const total = pageCount;
		const cur = curPage;
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const out = [1];
		if (cur > 3) out.push('…');
		for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) out.push(i);
		if (cur < total - 2) out.push('…');
		out.push(total);
		return out;
	});

	// ============ URL sync ============
	let ready = $state(false);
	onMount(() => {
		const sp = new URLSearchParams(window.location.search);
		q = sp.get('q') || '';
		if (KIND.some((o) => o.v === sp.get('kind'))) kind = /** @type {string} */ (sp.get('kind'));
		if (ACCESS.some((o) => o.v === sp.get('access')))
			access = /** @type {string} */ (sp.get('access'));
		tag = sp.get('tag') || '';
		const p = parseInt(sp.get('page') || '1', 10);
		let v = sp.get('view');
		if (!v) {
			try {
				v = localStorage.getItem('age:library:view');
			} catch {
				v = null;
			}
		}
		if (v === 'grid' || v === 'mosaic') view = v;
		ready = true;
		// Set the page after the filter effect has reset it.
		if (p > 1) requestAnimationFrame(() => (pageNo = p));
	});
	$effect(() => {
		if (!ready) return;
		const sp = new URLSearchParams();
		if (q) sp.set('q', q);
		if (kind !== 'all') sp.set('kind', kind);
		if (access !== 'all') sp.set('access', access);
		if (tag) sp.set('tag', tag);
		if (view === 'grid') sp.set('view', 'grid');
		if (curPage > 1) sp.set('page', String(curPage));
		// Compare as sorted pairs so a hand-typed order of parameters is not
		// "different"; and never let a too-early replaceState break hydration.
		const canon = (x) =>
			[...new URLSearchParams(x).entries()]
				.sort()
				.map(([k, v]) => `${k}=${v}`)
				.join('&');
		if (canon(window.location.search) !== canon(sp)) {
			const next = sp.toString() ? `?${sp}` : '';
			try {
				replaceState(`${window.location.pathname}${next}${window.location.hash}`, {});
			} catch {
				/* router not ready yet; the next change will sync */
			}
		}
	});

	// Mosaic — each page of nine is composed, not listed: a feature that
	// spans two rows, standards beside it, an ink text-only card, a
	// thumbnail row, a full-width horizontal card, then two halves.
	const VARIANT = [
		'feature',
		'standard',
		'standard',
		'ink',
		'standard',
		'row',
		'wide',
		'half',
		'half'
	];
	const SPAN = {
		feature: 'sm:col-span-2 lg:col-span-8 lg:row-span-2',
		standard: 'lg:col-span-4',
		ink: 'lg:col-span-4',
		row: 'lg:col-span-4',
		wide: 'sm:col-span-2 lg:col-span-12',
		half: 'lg:col-span-6'
	};
	// Switching between mosaic and grid re-renders the cards and lets them
	// fade up into the new arrangement (skipped for reduced motion).
	const reduceMotion =
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	const viewIn = (i) => ({
		y: 10,
		opacity: 0,
		duration: reduceMotion ? 0 : 520,
		delay: reduceMotion ? 0 : Math.min(i, 8) * 45,
		easing: cubicOut
	});
	const variant = (i) => (view === 'grid' ? 'standard' : (VARIANT[i] ?? 'standard'));

	// Scroll cue — fixed in the viewport's corner, as on the homepage. The
	// Library hero fits above the fold, so the cue points at the archive:
	// it shows until the Browse section's heading scrolls into view.
	let cueVisible = $state(true);
	$effect(() => {
		if (!browseEl) return;
		const el = browseEl;
		const update = () => {
			cueVisible = el.getBoundingClientRect().top > window.innerHeight - 140;
		};
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});
</script>

<svelte:head>
	<title>Library — AGE</title>
	<meta
		name="description"
		content="Articles, strategy, video and gameplay from the players who define the Flesh and Blood competitive scene."
	/>
</svelte:head>

<AgeShell active="Library">
	<!-- scroll cue — pinned to the viewport corner, hidden once the hero's
	     bottom edge is on screen. The entrance fade sits on the inner
	     element so its fill-mode can't override the outer toggle. -->
	<div
		class="pointer-events-none fixed right-6 bottom-11 z-40 hidden transition-opacity duration-300 md:right-10 md:bottom-[52px] md:block {cueVisible
			? 'opacity-100'
			: 'opacity-0'}"
		aria-hidden="true"
	>
		<div
			class="fp-fade flex flex-col items-center gap-2.5 text-[11px] font-extrabold tracking-[0.32em] text-white uppercase mix-blend-difference"
			style="animation-delay: 1400ms;"
		>
			Scroll
			<span class="fp-cue block h-10 w-px bg-white"></span>
		</div>
	</div>
	<!-- ============ ink band: wordmark + latest release ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-12 md:px-8 md:pt-14 md:pb-16">
			<!-- wordmark row -->
			<div
				class="flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between md:gap-10"
			>
				<h1 class="fp-rise flex items-end self-center leading-none md:self-start">
					<LibraryWordmark size="lg" tone="dark" />
				</h1>
				<div
					class="fp-rise text-center md:max-w-[300px] md:pb-3 md:text-right"
					style="animation-delay: 120ms;"
				>
					<p
						class="font-newsreader text-[17px] leading-[1.4] text-paper-bg/70 italic md:text-[19px]"
					>
						Reporting, strategy and gameplay from the players who define the format.
					</p>
					<p class="mt-3 text-[9.5px] font-extrabold tracking-[0.22em] text-warm-light uppercase">
						{counts.articles}
						{counts.articles === 1 ? 'article' : 'articles'}
						{#if counts.videos}· {counts.videos} video{/if}
						{#if counts.films}· {counts.films} from the Studio{/if}
					</p>
				</div>
			</div>
			<!-- double rule closing the masthead -->
			<div
				class="fp-rise mt-6 h-[5px] border-t border-b border-paper-bg/30 md:mt-8"
				style="animation-delay: 180ms;"
				aria-hidden="true"
			></div>

			<!-- latest release: image-forward, the homepage hero at card size -->
			{#if featured}
				<article
					class="fp-rise fp-plate-light mt-10 flex flex-col overflow-hidden bg-ink md:relative md:mt-14 md:block md:h-[440px] lg:h-[480px]"
					style="animation-delay: 240ms;"
					aria-label="Latest release: {featured.title}"
				>
					<!-- picture: blurred fill (md+) under the sharp, uncropped cover -->
					<a
						href={featured.href}
						class="relative block aspect-video md:absolute md:inset-0 md:aspect-auto"
					>
						<img
							class="absolute inset-0 hidden h-full w-full scale-105 object-cover blur-2xl brightness-[0.8] md:block"
							src={featured.picture?.thumb ?? featured.image}
							alt=""
							aria-hidden="true"
						/>
						<!-- aligned light blur, exactly the sharp cover's box -->
						<span
							class="lib-hero-mid absolute inset-y-0 left-1/2 hidden aspect-video h-full -translate-x-1/2 md:block"
							aria-hidden="true"
						>
							<Picture
								image={featured.picture ?? {
									src: featured.image,
									srcset: featured.srcset,
									alt: featured.alt
								}}
								class="absolute inset-0 h-full w-full object-cover blur-[14px] brightness-[0.95]"
								sizes="(min-width: 1024px) 60vw, 100vw"
								alt=""
							/>
						</span>
						<!-- the sharp cover: full-bleed on phones, centred at its 16:9 size from md -->
						<span
							class="lib-hero-sharp absolute inset-0 block overflow-hidden md:right-auto md:left-1/2 md:aspect-video md:h-full md:w-auto md:-translate-x-1/2"
						>
							<Picture
								image={featured.picture ?? {
									src: featured.image,
									srcset: featured.srcset,
									alt: featured.alt
								}}
								class="fp-kenburns absolute inset-0 h-full w-full object-cover"
								sizes="(min-width: 1024px) 60vw, 100vw"
								alt={featured.alt}
								fetchpriority="high"
							/>
						</span>
						<span
							class="absolute inset-x-0 bottom-0 hidden h-[78%] md:block"
							style="background: linear-gradient(180deg, rgba(23,21,15,0) 0%, rgba(23,21,15,0.3) 22%, rgba(23,21,15,0.72) 48%, rgba(23,21,15,0.92) 72%, rgba(23,21,15,0.98) 100%);"
							aria-hidden="true"
						></span>
					</a>

					<!-- copy: beneath the cover on phones, over its lower third from md -->
					<div
						class="pointer-events-none relative z-[1] px-5 pt-6 pb-7 text-center md:absolute md:inset-x-0 md:bottom-0 md:px-12 md:pt-0 md:pb-9"
						style="text-shadow: 0 1px 2px rgba(23,21,15,0.6), 0 6px 24px rgba(23,21,15,0.45);"
					>
						<p
							class="flex items-center justify-center gap-3 text-[10px] font-extrabold tracking-[0.24em] text-paper-bg/90 uppercase md:text-[11px]"
						>
							<span class="text-warm-light" aria-hidden="true">◆</span>
							Latest release · {featured.rubric}
							<span class="text-warm-light" aria-hidden="true">◆</span>
						</p>
						<h2
							class="mx-auto mt-2.5 max-w-[880px] font-newsreader text-[30px] leading-[1.0] font-semibold tracking-[-0.02em] [text-wrap:balance] text-paper-bg md:text-[48px] md:leading-[0.96]"
						>
							<a href={featured.href} class="pointer-events-auto">
								{#each featured.title.split(/\s+/) as w, i (i)}
									<span
										class="fp-word mr-[0.26em] last:mr-0"
										style="animation-delay: {350 + i * 55}ms;">{w}</span
									>
								{/each}
							</a>
						</h2>
						{#if featured.dek}
							<p
								class="mx-auto mt-2.5 line-clamp-2 max-w-[640px] font-newsreader text-[15.5px] leading-[1.45] text-paper-bg/85 italic md:mt-3 md:text-[18px]"
							>
								{featured.dek}
							</p>
						{/if}
						<div class="mt-3.5 flex flex-col items-center gap-2.5 md:mt-4">
							<FrontByline
								author={featured.author}
								date={featured.date}
								length={featured.length}
								premium={featured.premium}
								onDark
								stack
							/>
							<a
								href={featured.href}
								class="pointer-events-auto inline-block border-b-2 border-warm-light pb-1 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-[letter-spacing] hover:tracking-[0.26em]"
							>
								{featured.kind === 'video' ? 'Watch the video' : 'Read the story'} →
							</a>
						</div>
					</div>
				</article>
			{/if}
		</div>
	</section>

	<!-- ============ browse ============ -->
	<section
		id="browse"
		bind:this={browseEl}
		class="mx-auto w-full max-w-[1200px] scroll-mt-20 px-5 pt-14 pb-12 md:px-8 md:pt-20 md:pb-16"
	>
		<div class="flex items-center gap-4 md:gap-6" use:reveal>
			<span class="h-px flex-1 bg-ink"></span>
			<h2
				class="font-newsreader text-[17px] font-semibold tracking-[0.22em] whitespace-nowrap uppercase md:text-[20px]"
			>
				Browse
			</h2>
			<span class="h-px flex-1 bg-ink"></span>
		</div>
		<div class="mt-2 flex justify-center" aria-hidden="true">
			<span class="h-[3px] w-10 bg-warm"></span>
		</div>

		<!-- filter bar -->
		<div
			class="mt-8 flex flex-col gap-5 border-y border-line py-5 md:mt-10 md:flex-row md:flex-wrap md:items-center md:gap-x-8 md:gap-y-3 md:py-4"
		>
			<label
				class="relative flex items-center gap-2.5 border border-line2 bg-paper-bg px-3.5 py-2.5 md:w-[280px] md:border-0 md:bg-transparent md:p-0"
			>
				<svg
					class="h-3.5 w-3.5 shrink-0 text-warm"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"
				>
					<circle cx="8.5" cy="8.5" r="5.5" />
					<path d="M13 13l4.5 4.5" stroke-linecap="square" />
				</svg>
				<span class="sr-only">Search the library</span>
				<input
					type="search"
					name="q"
					bind:value={q}
					placeholder="Search titles, authors, topics"
					autocomplete="off"
					class="w-full border-0 bg-transparent p-0 font-newsreader text-[16px] leading-tight text-ink placeholder:text-fade focus:outline-none md:border-b md:border-line2 md:py-1 md:focus:border-warm"
				/>
			</label>
			<div class="flex flex-col gap-1.5 md:contents">
				<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase md:hidden"
					>Type</span
				>
				<div
					class="grid grid-cols-3 border border-line2 text-[10px] font-extrabold tracking-[0.16em] uppercase md:flex md:items-center md:gap-5 md:border-0 md:text-[10.5px]"
					role="group"
					aria-label="Kind"
				>
					{#each KIND as o (o.v)}
						<button
							type="button"
							onclick={() => (kind = o.v)}
							aria-pressed={kind === o.v}
							class="fp-ul border-l border-line2 py-2.5 text-center transition-colors first-of-type:border-l-0 md:border-0 md:py-0 md:pb-0.5 md:hover:text-warm {kind ===
							o.v
								? 'bg-ink text-paper-bg md:bg-transparent md:[background-size:100%_1.5px] md:text-warm'
								: 'text-fade'}">{o.l}</button
						>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-1.5 md:contents">
				<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase md:hidden"
					>Access</span
				>
				<div
					class="grid grid-cols-3 border border-line2 text-[10px] font-extrabold tracking-[0.16em] uppercase md:flex md:items-center md:gap-5 md:border-0 md:text-[10.5px]"
					role="group"
					aria-label="Access"
				>
					<span class="hidden text-[9.5px] text-fade md:inline">Access</span>
					{#each ACCESS as o (o.v)}
						<button
							type="button"
							onclick={() => (access = o.v)}
							aria-pressed={access === o.v}
							class="fp-ul border-l border-line2 py-2.5 text-center transition-colors first-of-type:border-l-0 md:border-0 md:py-0 md:pb-0.5 md:hover:text-warm {access ===
							o.v
								? o.v === 'premium'
									? 'bg-prem text-white md:bg-transparent md:[background-size:100%_1.5px] md:text-prem'
									: 'bg-ink text-paper-bg md:bg-transparent md:[background-size:100%_1.5px] md:text-warm'
								: 'text-fade'}">{o.l}</button
						>
					{/each}
				</div>
			</div>
			<div
				class="grid grid-cols-2 items-end gap-x-5 gap-y-4 md:ml-auto md:flex md:items-center md:gap-6"
			>
				<div
					class="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2"
					role="group"
					aria-label="View"
				>
					<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase md:mr-1"
						>View</span
					>
					<span class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => setView('mosaic')}
							aria-pressed={view === 'mosaic'}
							title="Mosaic"
							class="flex h-7 w-7 items-center justify-center border transition-colors {view ===
							'mosaic'
								? 'border-ink bg-ink text-paper-bg'
								: 'border-line2 text-fade hover:border-ink hover:text-ink'}"
						>
							<svg viewBox="0 0 14 14" class="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
								<rect x="0" y="0" width="8" height="8" />
								<rect x="9.5" y="0" width="4.5" height="3.5" />
								<rect x="9.5" y="4.5" width="4.5" height="3.5" />
								<rect x="0" y="9.5" width="14" height="4.5" />
							</svg>
							<span class="sr-only">Mosaic</span>
						</button>
						<button
							type="button"
							onclick={() => setView('grid')}
							aria-pressed={view === 'grid'}
							title="Grid"
							class="flex h-7 w-7 items-center justify-center border transition-colors {view ===
							'grid'
								? 'border-ink bg-ink text-paper-bg'
								: 'border-line2 text-fade hover:border-ink hover:text-ink'}"
						>
							<svg viewBox="0 0 14 14" class="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
								<rect x="0" y="0" width="4" height="4" />
								<rect x="5" y="0" width="4" height="4" />
								<rect x="10" y="0" width="4" height="4" />
								<rect x="0" y="5" width="4" height="4" />
								<rect x="5" y="5" width="4" height="4" />
								<rect x="10" y="5" width="4" height="4" />
								<rect x="0" y="10" width="4" height="4" />
								<rect x="5" y="10" width="4" height="4" />
								<rect x="10" y="10" width="4" height="4" />
							</svg>
							<span class="sr-only">Grid</span>
						</button>
					</span>
				</div>
				{#if allTags.length}
					<FilterSelect label="Topic" bind:value={tag} options={topicOptions} />
				{/if}
				{#if activeCount}
					<button
						type="button"
						onclick={clearAll}
						class="col-span-2 justify-self-start text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase transition-[letter-spacing] hover:tracking-[0.22em] md:col-span-1"
						>Clear ×</button
					>
				{/if}
			</div>
		</div>

		<p class="mt-4 font-newsreader text-[15px] text-soft italic" aria-live="polite">{resultLine}</p>

		{#if shown.length}
			{#key view}
				<ul class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6">
					{#each shown as s, i (s.href)}
						{@const v = variant(i)}
						<li
							class="{SPAN[v]} {storyCardSheet(v)} border border-line"
							use:reveal={{ delay: Math.min(i, 5) * 60, disabled: switched }}
							in:fly|global={switched ? viewIn(i) : { duration: 0 }}
						>
							<StoryCard story={s} variant={v} />
						</li>
					{/each}
				</ul>
			{/key}

			<nav
				class="mt-8 flex items-center justify-between gap-6 border-t border-line pt-5"
				aria-label="Pages"
			>
				<button
					type="button"
					onclick={() => gotoPage(curPage - 1)}
					disabled={curPage <= 1}
					class="text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors enabled:hover:text-warm disabled:text-line2"
					>← Previous</button
				>
				<ol
					class="flex items-baseline gap-4 font-newsreader text-[17px] tabular-nums"
					aria-label="Page {curPage} of {pageCount}"
				>
					{#each pageNumbers as n, i (`${n}-${i}`)}
						<li>
							{#if n === '…'}
								<span class="text-fade">…</span>
							{:else}
								<button
									type="button"
									onclick={() => gotoPage(/** @type {number} */ (n))}
									aria-current={n === curPage ? 'page' : undefined}
									class="fp-ul pb-0.5 transition-colors hover:text-warm {n === curPage
										? '[background-size:100%_1.5px] font-semibold text-warm'
										: 'text-soft'}">{n}</button
								>
							{/if}
						</li>
					{/each}
				</ol>
				<button
					type="button"
					onclick={() => gotoPage(curPage + 1)}
					disabled={curPage >= pageCount}
					class="text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors enabled:hover:text-warm disabled:text-line2"
					>Next →</button
				>
			</nav>
		{:else}
			<div class="mt-8 border-[3px] border-double border-ink px-6 py-12 text-center">
				<p class="font-newsreader text-[24px] font-semibold">Nothing in the stacks for that.</p>
				<p class="mt-2 font-newsreader text-[16px] text-soft italic">
					Try a shorter search, or clear the filters to see everything.
				</p>
				<button
					type="button"
					onclick={clearAll}
					class="mt-5 inline-flex items-center bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
					>Show everything</button
				>
			</div>
		{/if}
	</section>

	<!-- ============ from the Studio ============
	     An ink band: the Studio's newest piece as a spread, then the latest
	     match, episode and interview, each labelled with what it is. -->
	{#if studioLead}
		<section class="bg-ink text-paper-bg" use:reveal>
			<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
				<div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
					<div>
						<p
							class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.24em] text-warm-light uppercase"
						>
							<span class="text-[8px]" aria-hidden="true">◆</span> AGE Studios
						</p>
						<h2
							class="mt-2 font-newsreader text-[34px] leading-[0.98] font-semibold tracking-[-0.02em] md:text-[46px]"
						>
							From the Studio
						</h2>
						<p class="mt-2 font-newsreader text-[16px] text-paper-bg/70 italic md:text-[17px]">
							Feature matches from the main stage, podcasts and interviews.
						</p>
					</div>
					<a
						href="/studios"
						class="inline-block border-b-2 border-warm-light pb-1 text-[10.5px] font-extrabold tracking-[0.18em] whitespace-nowrap uppercase transition-[letter-spacing] hover:tracking-[0.26em]"
					>
						Visit AGE Studios →
					</a>
				</div>
				<div class="mt-6 h-[5px] border-t border-b border-paper-bg/30" aria-hidden="true"></div>

				<a
					href={studioLead.href}
					class="group mt-8 grid overflow-hidden border border-paper-bg/20 md:grid-cols-[7fr_5fr]"
				>
					<WatchFrame item={studioLead} sizes="(min-width: 1024px) 700px, 100vw" />
					<span class="flex flex-col justify-center p-6 md:p-8 lg:p-10">
						<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm-light uppercase"
							>Newest · {studioLead.audio ? 'Episode' : STUDIO_KIND[studioLead.kind].short}</span
						>
						<span
							class="mt-3 block font-newsreader text-[26px] leading-[1.05] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[34px]"
						>
							<span class="fp-ul">{studioLead.title}</span>
						</span>
						{#if studioByline(studioLead)}
							<span class="mt-2 block font-newsreader text-[16px] text-paper-bg/70 italic"
								>{studioByline(studioLead)}</span
							>
						{/if}
						<span
							class="mt-6 inline-flex w-fit items-center gap-2 bg-warm px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors group-hover:bg-paper-bg group-hover:text-ink"
							>{studioLead.audio ? '♪ Listen' : '▶ Watch'}</span
						>
					</span>
				</a>

				{#if studioStrip.length}
					<ul class="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
						{#each studioStrip as item (item.id)}
							<li>
								<WatchCard
									{item}
									dark
									sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	{/if}

	<!-- ============ topics + premium ============ -->
	<section class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16" use:reveal>
		<div class="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
			{#if topics.length}
				<div id="topics" class="scroll-mt-24">
					<h2
						class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
					>
						<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
						Browse by topic
					</h2>
					<ul class="mt-4 border-t border-line">
						{#each topics as t (t.slug)}
							<li class="border-b border-line">
								<a
									href="/library/tag/{t.slug}"
									class="group flex w-full items-baseline justify-between gap-4 py-3.5 text-left"
								>
									<span class="font-newsreader text-[18px] font-semibold">
										<span class="fp-ul">{t.name}</span>
									</span>
									<span class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>{t.n} {t.n === 1 ? 'piece' : 'pieces'} →</span
									>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if !member}
				<div class="border-[3px] border-double border-ink bg-paper px-6 py-8 md:px-10 md:py-10">
					<div class="text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
						<span aria-hidden="true">◆</span> Premium
					</div>
					<p
						class="mt-3 font-newsreader text-[28px] leading-[1.05] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[34px]"
					>
						Read every word in the Library.
					</p>
					<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft italic">
						Premium opens every article, every video and all bonus gameplay, and keeps the courses
						you own current.
					</p>
					<a
						href="/premium"
						class="mt-6 inline-flex items-center gap-2 border-[1.5px] border-prem bg-prem px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
					>
						<span class="text-[8px] opacity-80" aria-hidden="true">◆</span>
						Get Premium
					</a>
				</div>
			{/if}
		</div>
	</section>
</AgeShell>
