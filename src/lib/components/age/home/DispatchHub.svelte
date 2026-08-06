<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import EventRow from '$lib/components/age/EventRow.svelte';

	/**
	 * A3 unified homepage — Hub section. Tailwind-only.
	 *
	 * Two-column grid: main column = unified Library feed. Right column =
	 * sidebar (standings, upcoming events with circuit colors, featured
	 * decklists, premium card).
	 *
	 * Library section structure:
	 *  1. "Latest in the Library" — interleaved article + video feed,
	 *     newest first. Left pane shows a big preview that cycles
	 *     slowly through items; right pane lists every item as a
	 *     hover / click target. Hovering an item pins the preview to
	 *     that item; clicking navigates to its `href`.
	 *  2. "More to read" — articles that didn't make it into the
	 *     Latest feed.
	 *  3. "More to watch" — videos that didn't make it into the
	 *     Latest feed.
	 */

	/**
	 * @typedef {Object} LibraryItem
	 * @property {'video' | 'article'} type
	 * @property {boolean} premium
	 * @property {string} image
	 * @property {string} title
	 * @property {string} meta
	 * @property {string} [duration]
	 * @property {string} [href]
	 */

	/**
	 * @typedef {LibraryItem & { summary?: string, event?: string }} FeaturedLibraryItem
	 */

	/**
	 * @typedef {Object} HubData
	 * @property {FeaturedLibraryItem} featured
	 * @property {FeaturedLibraryItem[]} [latest]
	 * @property {LibraryItem[]} [moreToRead]
	 * @property {LibraryItem[]} [moreToWatch]
	 * @property {LibraryItem[]} [queue]
	 * @property {LibraryItem[]} [grid]
	 * @property {{ rank: number, name: string, points: number }[]} standings
	 * @property {{ day: string, month: string, city: string, format: string, venue: string, seats: string, status: 'open' | 'closed', circuit: 'la' | 'stl' | 'ne', href?: string }[]} events
	 * @property {{ image: string, hero: string, format: string, by: string, city: string }[]} decklists
	 */

	/** @type {{ data?: HubData }} */
	let { data } = $props();

	const fallback = /** @type {HubData} */ ({
		featured: {
			type: 'article',
			premium: false,
			image: 'https://www.age.events/banner/articles-banner.webp',
			title: 'A weekend in Memphis — the AGE Open arc',
			summary:
				"Inside the season's biggest open: the rooms, the rivalries, and the Top 8 nobody saw coming.",
			event: 'AGE Open · Los Angeles',
			meta: 'Joaquin Park · 9 min',
			href: '/library'
		},
		queue: [
			{
				type: 'video',
				premium: true,
				image: 'https://www.age.events/banner/age-open-banner.webp',
				title: 'Kayo mirror, round 6',
				meta: 'NE Open · 24 min',
				duration: '24 min'
			},
			{
				type: 'article',
				premium: false,
				image: 'https://www.age.events/banner/articles-banner.webp',
				title: 'They reminisce over you — a weekend in Memphis',
				meta: 'Joaquin Park · 8 min'
			},
			{
				type: 'article',
				premium: true,
				image: 'https://www.age.events/banner/academy-banner.webp',
				title: 'Reading the board, not the hand',
				meta: 'Hayley Neighbors · 11 min'
			}
		],
		grid: [
			{
				type: 'video',
				premium: true,
				image: 'https://www.age.events/banner/studios-banner.webp',
				title: 'Bonus match: Iyslander vs Boltyn',
				meta: 'STL Open · 31 min',
				duration: '31 min'
			},
			{
				type: 'article',
				premium: false,
				image: 'https://www.age.events/banner/articles-banner.webp',
				title: 'The slow burn of attrition: a tier-2 hero rises',
				meta: 'Han Vi · 9 min'
			},
			{
				type: 'article',
				premium: true,
				image: 'https://www.age.events/banner/articles-banner.webp',
				title: 'SAGE Series: when to trade tempo for cards',
				meta: 'Peter Buddensiek · 14 min'
			}
		],
		standings: [
			{ rank: 1, name: 'Brian Gutierrez', points: 124 },
			{ rank: 2, name: 'Ian Hsu', points: 118 },
			{ rank: 3, name: 'Alexander Vore', points: 112 },
			{ rank: 4, name: 'Peter Buddensiek', points: 109 },
			{ rank: 5, name: 'Colin Eriksen', points: 104 }
		],
		events: [
			{
				day: '21',
				month: 'JUN',
				city: 'St. Louis',
				format: 'CC',
				venue: 'Convention Hall',
				seats: '42 / 80',
				status: 'open',
				circuit: 'stl'
			},
			{
				day: '12',
				month: 'JUL',
				city: 'Los Angeles',
				format: 'CC',
				venue: 'TopDeck Keep',
				seats: 'Sold out',
				status: 'closed',
				circuit: 'la'
			},
			{
				day: '03',
				month: 'AUG',
				city: 'Boston',
				format: 'Blitz',
				venue: 'Salem Gaming Co.',
				seats: '18 / 48',
				status: 'open',
				circuit: 'ne'
			},
			{
				day: '15',
				month: 'AUG',
				city: 'Los Angeles',
				format: 'CC',
				venue: 'Glendale GC',
				seats: '60 / 80',
				status: 'open',
				circuit: 'la'
			}
		],
		decklists: [
			{
				image: 'https://www.age.events/hero_images/kayo-armed-and-dangerous.webp',
				hero: 'Kayo, Armed & Dangerous',
				format: 'CC',
				by: 'Brian Gutierrez',
				city: 'LA Open'
			},
			{
				image: 'https://www.age.events/hero_images/prism-awakener-of-sol.webp',
				hero: 'Prism, Awakener of Sol',
				format: 'CC',
				by: 'Ian Hsu',
				city: 'NE Open'
			},
			{
				image: 'https://www.age.events/hero_images/arakni-marionette.webp',
				hero: 'Arakni, Marionette',
				format: 'CC',
				by: 'Alexander Vore',
				city: 'STL Open'
			}
		]
	});

	const D = $derived(data ?? fallback);

	const CIRCUIT_HEX = {
		la: 'var(--ed-cc-la)',
		stl: 'var(--ed-cc-stl)',
		ne: 'var(--ed-cc-ne)'
	};

	/** @param {'video' | 'article'} type */
	function fmtLabel(type) {
		return type === 'video' ? '▶ Video' : 'Article';
	}

	// "Latest" feed drives the cycling preview pane. Fall back to a
	// single-item array containing the static featured item so the
	// component still renders sensibly when the new adapter shape
	// isn't present.
	const LATEST = $derived(
		Array.isArray(D.latest) && D.latest.length > 0 ? D.latest : [D.featured]
	);

	const isPremiumMember = $derived($page.data?.isPremiumMember ?? false);

	let activeIdx = $state(0);
	// Cycle every 7s — slow enough to read a card, fast enough to
	// hint that the preview is alive.
	const CYCLE_MS = 7000;
	// Pause cycling while the user is interacting with the queue list
	// so a hovered preview stays put as long as they want it.
	let isPaused = $state(false);

	onMount(() => {
		if (typeof window === 'undefined') return;
		const id = window.setInterval(() => {
			if (isPaused) return;
			const len = LATEST.length;
			if (len <= 1) return;
			activeIdx = (activeIdx + 1) % len;
		}, CYCLE_MS);
		return () => window.clearInterval(id);
	});

	/** @param {number} i */
	function pinPreview(i) {
		if (i >= 0 && i < LATEST.length) activeIdx = i;
		isPaused = true;
	}

	function resumeCycle() {
		isPaused = false;
	}

	const F = $derived(LATEST[activeIdx] ?? D.featured);
	const isFeaturedVideo = $derived(F?.type === 'video');
</script>

<div class="border-ink border-b-[3px] border-double">
<div class="mx-auto grid w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[1fr_350px]">
	<!-- main column -->
	<div class="pb-8 lg:border-ink lg:border-r">
		<!-- mhead — its bottom ink rule extends past the cap into the
			 left gutter so the line reads as part of the page chrome on
			 wide screens. -->
		<div
			class="border-ink relative mb-[26px] flex flex-wrap items-baseline justify-between gap-3 border-b-2 px-4 pt-6 pb-[14px] md:px-10 md:pt-[30px] lg:px-[44px] lg:before:absolute lg:before:right-full lg:before:bottom-[-2px] lg:before:h-[2px] lg:before:w-screen lg:before:bg-ink lg:before:content-['']"
		>
			<div class="flex flex-wrap items-baseline gap-[14px]">
				<h2
					class="font-newsreader text-[clamp(28px,4.5vw,40px)] font-semibold tracking-[-0.02em]"
				>
					Library
				</h2>
				<span class="text-fade hidden text-xs font-bold sm:inline">
					Articles, matches & shows — one collection, free and Premium
				</span>
			</div>
			<a
				class="text-accent text-[11px] font-bold tracking-[0.07em] uppercase"
				href="/library"
			>
				Browse all →
			</a>
		</div>

		<div class="px-4 md:px-10 lg:px-[44px]">
			<!-- vwatch: featured library item + queue -->
			<div class="border-line2 bg-paper mb-[30px] grid grid-cols-1 border md:grid-cols-[1fr_344px]">
				<!--
					Featured preview. The <a> shell stays in place across
					cycle ticks (href updates reactively) while the cover
					image and text body live inside `{#key activeIdx}`
					wrappers so they crossfade in/out via Svelte's fade
					transition. We absolute-position the keyed content so
					old and new can co-exist during the transition without
					pushing layout — the parent containers (`aspect-video`
					cover, fixed min-height text area) reserve the space.
				-->
				<a
					href={F.href ?? '/library'}
					class="group border-line2 flex flex-col border-b md:border-r md:border-b-0"
				>
					<!-- COVER — cross-fades on activeIdx change -->
					<div class="bg-panel relative aspect-video overflow-hidden">
						{#key activeIdx}
							<div
								class="absolute inset-0 flex items-center justify-center bg-cover bg-center"
								style="background-image: url('{F.image}');"
								in:fade={{ duration: 420 }}
								out:fade={{ duration: 420 }}
							>
								{#if isFeaturedVideo}
									<span
										class="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent to-[54%]"
										aria-hidden="true"
									></span>
									<span
										class="bg-warm absolute top-[14px] left-[14px] z-[1] inline-flex items-center gap-[7px] px-[11px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] text-white uppercase"
									>
										<span class="inline-block h-[7px] w-[7px] rounded-full bg-white"></span>
										Featured · Video
									</span>
									<span
										class="text-ink relative z-[1] flex h-20 w-20 items-center justify-center rounded-full bg-white/95 pl-[5px] text-[25px] transition-transform group-hover:scale-[1.07]"
									>
										▶
									</span>
									{#if F.duration}
										<span
											class="absolute right-[14px] bottom-[14px] z-[1] bg-black/85 px-[10px] py-[4px] text-[11.5px] font-bold text-white"
										>
											{F.duration}
										</span>
									{/if}
								{:else}
									<span
										class="bg-accent absolute top-[14px] left-[14px] z-[1] inline-flex items-center gap-[7px] px-[11px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] text-white uppercase"
									>
										Featured · Article
									</span>
								{/if}
							</div>
						{/key}
					</div>

					<!--
						TEXT — cross-fades on activeIdx change. The parent
						reserves a fixed height AND clips overflow, so an
						unusually long title or summary in one carousel item
						can't push its box past the reserved footprint and
						overlap the "More in the Library" grid below.
						Title + summary are individually line-clamped so
						they never approach that ceiling in the first place.
					-->
					<div class="relative flex-1 overflow-hidden" style="min-height: 400px;">
						{#key activeIdx}
							<div
								class="absolute inset-0 flex flex-col px-8 pt-[26px] pb-7"
								in:fade={{ duration: 420 }}
								out:fade={{ duration: 420 }}
							>
								<div class="mb-[14px] flex gap-[7px]">
									<span
										class="inline-flex items-center gap-1.5 px-[9px] py-1 text-[9px] font-extrabold tracking-[0.09em] text-white uppercase {isFeaturedVideo
											? 'bg-warm'
											: 'bg-accent'}"
									>
										{isFeaturedVideo ? '▶ Video' : 'Article'}
									</span>
									<span
										class="border px-[9px] py-1 text-[10px] font-extrabold tracking-[0.08em] uppercase {F.premium
											? 'bg-prem border-prem text-white'
											: 'border-line2 text-soft'}"
									>
										{F.premium ? 'Premium' : 'Free'}
									</span>
								</div>
								<h3
									class="font-newsreader group-hover:text-accent m-0 mb-3 overflow-hidden text-4xl leading-[1.05] font-semibold tracking-[-0.02em] transition-colors"
									style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;"
								>
									{F.title}
								</h3>
								{#if F.summary}
									<div
										class="text-soft m-0 mb-4 overflow-hidden text-[14.5px] leading-[1.55]"
										style="display:-webkit-box; -webkit-line-clamp:7; -webkit-box-orient:vertical;"
									>
										{F.summary}
									</div>
								{/if}
								<div
									class="text-fade mb-5 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold"
								>
									{#if F.event}
										<b class="text-ink font-bold">{F.event}</b>
										<span>·</span>
									{/if}
									<span>{F.meta}</span>
								</div>
								<span
									class="text-accent mt-auto text-[11px] font-extrabold tracking-[0.08em] uppercase"
								>
									{isFeaturedVideo ? 'Watch now' : 'Read now'} →
								</span>
							</div>
						{/key}
					</div>
				</a>

				<!-- queue -->
				<div class="bg-paper-bg flex flex-col">
					<div class="border-ink flex items-center justify-between border-b-2 px-5 pt-[17px] pb-[13px]">
						<span
							class="flex items-center gap-[9px] text-[11px] font-extrabold tracking-[0.14em] uppercase"
						>
							<span class="bg-warm inline-block h-[9px] w-[9px]"></span>
							Latest in the Library
						</span>
						<a
							href="/library"
							class="text-accent text-[10px] font-bold tracking-[0.06em] uppercase"
						>
							Browse →
						</a>
					</div>
					<!--
						Each row pins the preview on hover (mouseenter) and
						resumes the slow auto-cycle on mouse leave. The whole
						row is an <a> so click navigates to the item itself.
					-->
					{#each LATEST as item, i (item.href + ':' + item.title)}
						<a
							href={item.href ?? '/library'}
							onmouseenter={() => pinPreview(i)}
							onmouseleave={resumeCycle}
							onfocus={() => pinPreview(i)}
							onblur={resumeCycle}
							class="group border-line grid grid-cols-[116px_1fr] items-center gap-[14px] border-b px-[18px] py-[14px] transition-colors last:border-b-0 {i ===
							activeIdx
								? 'bg-panel'
								: 'hover:bg-panel'}"
						>
							<div
								class="bg-panel relative flex aspect-video items-center justify-center bg-cover bg-center"
								style="background-image: url('{item.image}');"
							>
								{#if item.type === 'video'}
									<span
										class="text-ink flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/95 pl-[2px] text-[10px] {i ===
										activeIdx
											? 'opacity-100'
											: 'opacity-0 transition-opacity group-hover:opacity-100'}"
									>
										▶
									</span>
								{/if}
								{#if item.duration}
									<span
										class="absolute right-[5px] bottom-[5px] bg-black/85 px-[5px] py-px text-[9px] font-bold text-white"
									>
										{item.duration}
									</span>
								{/if}
							</div>
							<div class="min-w-0">
								<div
									class="text-warm mb-[5px] flex items-center gap-[9px] text-[9px] font-extrabold tracking-[0.09em] uppercase"
								>
									<span
										class="inline-flex items-center gap-1.5 px-[9px] py-1 text-[9px] font-extrabold tracking-[0.09em] text-white uppercase {item.type ===
										'video'
											? 'bg-warm'
											: 'bg-accent'}"
									>
										{fmtLabel(item.type)}
									</span>
									<span
										class="border-line2 text-soft border px-[6px] py-px text-[8.5px] font-extrabold tracking-[0.07em] uppercase {item.premium
											? 'bg-prem border-prem !text-white'
											: ''}"
									>
										{item.premium ? 'Premium' : 'Free'}
									</span>
								</div>
								<h4
									class="font-newsreader text-[15px] leading-[1.1] font-semibold tracking-[-0.01em] transition-colors {i ===
									activeIdx
										? 'text-accent'
										: 'group-hover:text-accent'}"
								>
									{item.title}
								</h4>
								<div class="text-fade mt-[5px] text-[10.5px] font-semibold">{item.meta}</div>
							</div>
						</a>
					{/each}
					<a
						href="/library"
						class="border-line2 text-accent mt-auto cursor-pointer border-t px-[18px] py-[15px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase"
					>
						See everything →
					</a>
				</div>
			</div>

			<!--
				More to Read — articles that didn't make the Latest feed.
				Skipped entirely when there's nothing to show so we don't
				leave an empty header sitting on the page.
			-->
			{#if D.moreToRead && D.moreToRead.length > 0}
				<div class="border-line2 mt-9 mb-[18px] flex items-baseline justify-between border-b pb-[11px]">
					<h3
						class="font-newsreader flex items-center gap-3 text-[26px] font-semibold tracking-[-0.01em]"
					>
						More to read
					</h3>
					<a class="text-accent text-[11px] font-bold tracking-[0.07em] uppercase" href="/library">
						All articles →
					</a>
				</div>

				<div class="border-line2 bg-line2 grid grid-cols-1 gap-px border sm:grid-cols-2 md:grid-cols-3">
					{#each D.moreToRead as item (item.href + ':' + item.title)}
						<a
							href={item.href ?? '/library'}
							class="group bg-paper-bg flex flex-col border-t-[3px] border-t-accent"
						>
							<div
								class="bg-panel relative flex aspect-video items-center justify-center bg-cover bg-center"
								style="background-image: url('{item.image}');"
							></div>
							<div class="flex flex-1 flex-col px-5 pt-4 pb-5">
								<div class="mb-[11px] flex items-center gap-[7px]">
									<span
										class="bg-accent inline-flex items-center gap-1.5 px-[9px] py-1 text-[9px] font-extrabold tracking-[0.09em] text-white uppercase"
									>
										Article
									</span>
									<span
										class="border-line2 text-soft border px-[9px] py-[3px] text-[10px] font-extrabold tracking-[0.08em] uppercase {item.premium
											? 'bg-prem border-prem !text-white'
											: ''}"
									>
										{item.premium ? 'Premium' : 'Free'}
									</span>
								</div>
								<h4
									class="font-newsreader group-hover:text-accent mb-[9px] text-[19px] leading-[1.1] font-semibold tracking-[-0.01em] transition-colors"
								>
									{item.title}
								</h4>
								<!--
									Article excerpt — clamped to 3 lines so cards
									within a row keep their bottoms aligned even
									when summaries vary in length. Skipped entirely
									when the article has no excerpt.
								-->
								{#if item.summary}
									<p
										class="text-soft mb-[10px] overflow-hidden text-[12.5px] leading-[1.45]"
										style="display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;"
									>
										{item.summary}
									</p>
								{/if}
								<div class="text-fade mt-auto text-[11px] font-semibold">{item.meta}</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}

			<!-- More to Watch — VODs that didn't make the Latest feed -->
			{#if D.moreToWatch && D.moreToWatch.length > 0}
				<div class="border-line2 mt-10 mb-[18px] flex items-baseline justify-between border-b pb-[11px]">
					<h3
						class="font-newsreader flex items-center gap-3 text-[26px] font-semibold tracking-[-0.01em]"
					>
						More to watch
					</h3>
					<a class="text-accent text-[11px] font-bold tracking-[0.07em] uppercase" href="/library">
						All videos →
					</a>
				</div>

				<div class="border-line2 bg-line2 grid grid-cols-1 gap-px border sm:grid-cols-2 md:grid-cols-3">
					{#each D.moreToWatch as item (item.href + ':' + item.title)}
						<a
							href={item.href ?? '/studios'}
							class="group bg-paper-bg flex flex-col border-t-[3px] border-t-warm"
						>
							<div
								class="bg-panel relative flex aspect-video items-center justify-center bg-cover bg-center"
								style="background-image: url('{item.image}');"
							>
								<span
									class="text-ink flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/95 pl-[3px] text-sm"
								>
									▶
								</span>
								{#if item.duration}
									<span
										class="absolute right-2 bottom-2 bg-black/85 px-1.5 py-[2px] text-[10.5px] font-semibold text-white"
									>
										{item.duration}
									</span>
								{/if}
							</div>
							<div class="flex flex-1 flex-col px-5 pt-4 pb-5">
								<div class="mb-[11px] flex items-center gap-[7px]">
									<span
										class="bg-warm inline-flex items-center gap-1.5 px-[9px] py-1 text-[9px] font-extrabold tracking-[0.09em] text-white uppercase"
									>
										▶ Video
									</span>
									<span
										class="border-line2 text-soft border px-[9px] py-[3px] text-[10px] font-extrabold tracking-[0.08em] uppercase {item.premium
											? 'bg-prem border-prem !text-white'
											: ''}"
									>
										{item.premium ? 'Premium' : 'Free'}
									</span>
								</div>
								<h4
									class="font-newsreader group-hover:text-accent mb-[9px] text-[19px] leading-[1.1] font-semibold tracking-[-0.01em] transition-colors"
								>
									{item.title}
								</h4>
								<div class="text-fade mt-auto text-[11px] font-semibold">{item.meta}</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- sidebar — extends its paper background past the content cap to
		 the viewport edge via a box-shadow (drawn outside the border so
		 the right ink rule remains visible). The right ink rule closes
		 off the sidebar against the gutter, mirroring the divider on
		 the main column. -->
	<aside
		class="bg-paper relative border-t lg:border-ink lg:border-t-0 lg:border-r lg:shadow-[100vw_0_0_var(--ed-paper)]"
	>
		<!-- Standings -->
		<div class="border-line2 border-b px-7 pt-[22px] pb-6">
			<div class="mb-3 flex items-center justify-between">
				<span class="text-[12px] font-extrabold tracking-[0.14em] uppercase">Standings</span>
				<a
					href="/age-open?tab=standings"
					class="text-accent text-[10px] font-bold tracking-[0.06em] uppercase"
				>
					All →
				</a>
			</div>
			{#each D.standings as row (row.rank)}
				<div
					class="border-line grid grid-cols-[26px_1fr_auto] items-center gap-[10px] border-t py-[9px] text-[13.5px] first:border-t-0"
				>
					<span class="font-newsreader text-gold text-[19px] leading-[0.8] font-semibold">
						{row.rank}
					</span>
					<span class="font-semibold">{row.name}</span>
					<span class="text-[12.5px] font-extrabold">{row.points} pts</span>
				</div>
			{/each}
		</div>

		<!-- Upcoming Events -->
		<div class="border-line2 border-b px-7 pt-[22px] pb-6">
			<div class="mb-3 flex items-center justify-between">
				<span class="text-[12px] font-extrabold tracking-[0.14em] uppercase">Upcoming Events</span>
				<a href="/age-open" class="text-accent text-[10px] font-bold tracking-[0.06em] uppercase">
					All →
				</a>
			</div>
			{#each D.events as e, i (i)}
				<div class={i === 0 ? '' : 'mt-[8px]'}>
					<EventRow
						day={e.day}
						month={e.month}
						circuit={e.circuit}
						title={e.city}
						format={e.format}
						venue={e.venue}
						href={e.href ?? '/age-open'}
						size="sm"
						showEyebrow={true}
					/>
				</div>
			{/each}
		</div>

		<!-- Featured Decklists -->
		<div class="border-line2 border-b px-7 pt-[22px] pb-6">
			<div class="mb-3 flex items-center justify-between">
				<span class="text-[12px] font-extrabold tracking-[0.14em] uppercase">Featured Decklists</span>
				<a
					href="/age-open?tab=decklists"
					class="text-accent text-[10px] font-bold tracking-[0.06em] uppercase"
				>
					All →
				</a>
			</div>
			{#each D.decklists as d, i (i)}
				<a
					href="/age-open?tab=decklists"
					class="border-line grid grid-cols-[42px_1fr] items-center gap-3 border-t py-[11px] first:border-t-0"
				>
					<div
						class="bg-panel h-[42px] w-[42px] bg-cover bg-center"
						style="background-image: url('{d.image}');"
					></div>
					<div>
						<div class="text-accent text-[9.5px] font-bold tracking-[0.08em] uppercase">
							{d.format}
						</div>
						<h4 class="font-newsreader my-[2px] text-sm font-semibold">{d.hero}</h4>
						<div class="text-fade text-[10.5px] font-semibold">{d.by} · {d.city}</div>
					</div>
				</a>
			{/each}
		</div>

		<!--
			Premium card — hidden on mobile because the page already ends
			with the full-width DispatchPledge Premium band; showing this
			smaller card too on phones is redundant. Hidden entirely for
			members who already have Premium.
		-->
		{#if !isPremiumMember}
		<div class="bg-prem hidden px-7 py-6 text-white lg:block">
			<span
				class="text-prem mb-3 inline-block bg-white px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
			>
				AGE Premium
			</span>
			<h4 class="font-newsreader mb-2 text-2xl leading-[1.05] font-semibold">
				Premium powers AGE.
			</h4>
			<p class="m-0 mb-[14px] text-[12.5px] leading-[1.5] text-[#d6eedf]">
				Your membership funds it all — and you get the best of AGE in return:
			</p>
			<ul class="m-0 mb-4 flex list-none flex-col gap-2 p-0">
				{#each ['Articles from the best players', 'Bonus matches', 'Author updates on your courses', 'Discounts on AGE Open events'] as perk (perk)}
					<li class="flex items-center gap-[9px] text-[12.5px] font-semibold text-white">
						<span
							class="flex h-[17px] w-[17px] flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-extrabold"
						>
							✓
						</span>
						{perk}
					</li>
				{/each}
			</ul>
			<a
				href="/premium"
				class="inline-flex items-center gap-2 border-[1.5px] border-white bg-transparent px-5 py-[13px] text-xs font-bold tracking-[0.05em] text-white uppercase transition-colors hover:bg-white/10"
			>
				Get Premium →
			</a>
		</div>
		{/if}
	</aside>
</div>
</div>
