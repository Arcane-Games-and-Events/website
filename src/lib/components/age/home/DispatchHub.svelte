<script>
	/**
	 * A3 unified homepage — Hub section. Tailwind-only.
	 *
	 * Two-column grid: main column = unified Library feed (featured video +
	 * queue + 3-up grid). Right column = sidebar (standings, upcoming
	 * events with circuit colors, featured decklists, premium card).
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
	 * @property {LibraryItem[]} queue
	 * @property {LibraryItem[]} grid
	 * @property {{ rank: number, name: string, points: number }[]} standings
	 * @property {{ day: string, month: string, city: string, format: string, venue: string, seats: string, status: 'open' | 'closed', circuit: 'la' | 'stl' | 'ne' }[]} events
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

	const F = $derived(D.featured);
	const isFeaturedVideo = $derived(F?.type === 'video');
</script>

<div class="border-ink border-b-[3px] border-double">
<div class="mx-auto grid w-full max-w-[min(94vw,1920px)] grid-cols-[1fr_350px]">
	<!-- main column -->
	<div class="border-ink border-r pb-8">
		<!-- mhead — its bottom ink rule extends past the cap into the
			 left gutter so the line reads as part of the page chrome on
			 wide screens. -->
		<div
			class="border-ink bg-ink/0 relative mb-[26px] flex items-end justify-between border-b-2 px-[44px] pt-[30px] pb-[14px] before:absolute before:right-full before:bottom-[-2px] before:h-[2px] before:w-screen before:bg-ink before:content-['']"
		>
			<div class="flex items-baseline gap-[14px]">
				<h2
					class="font-newsreader text-[40px] font-semibold tracking-[-0.02em]"
				>
					Library
				</h2>
				<span class="text-fade text-xs font-bold">
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

		<div class="px-[44px]">
			<!-- bcchips -->
			<div class="m-0 mb-[22px] flex flex-wrap gap-2">
				<a
					href="/library"
					class="border-ink bg-ink text-paper-bg cursor-pointer border px-[13px] py-[7px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase"
				>
					All
				</a>
				<a
					href="/library?seg=videos"
					class="border-line2 text-soft hover:text-ink cursor-pointer border px-[13px] py-[7px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase transition-colors"
				>
					Videos
				</a>
				<a
					href="/library?seg=articles"
					class="border-line2 text-soft hover:text-ink cursor-pointer border px-[13px] py-[7px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase transition-colors"
				>
					Articles
				</a>
				<span class="ml-auto flex items-center gap-2">
					<span
						class="border-line2 text-soft border px-[9px] py-[5px] text-[9px] font-extrabold tracking-[0.08em] uppercase"
					>
						Free
					</span>
					<span
						class="border-prem bg-prem border px-[9px] py-[5px] text-[9px] font-extrabold tracking-[0.08em] text-white uppercase"
					>
						Premium
					</span>
				</span>
			</div>

			<!-- vwatch: featured library item + queue -->
			<div class="border-line2 bg-paper mb-[30px] grid grid-cols-[1fr_344px] border">
				<!-- featured (article or video) -->
				<a
					href={F.href ?? '/library'}
					class="group border-line2 flex flex-col border-r"
				>
					<div
						class="bg-panel relative flex aspect-video items-center justify-center bg-cover bg-center"
						style="background-image: url('{F.image}');"
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
					<div class="flex flex-col px-8 pt-[26px] pb-7">
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
							class="font-newsreader group-hover:text-accent m-0 mb-3 text-4xl leading-none font-semibold tracking-[-0.02em] transition-colors"
						>
							{F.title}
						</h3>
						{#if F.summary}
							<div class="text-soft m-0 mb-4 text-[14.5px] leading-[1.55]">{F.summary}</div>
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
					{#each D.queue as item, i (i)}
						<a
							href="/library"
							class="group border-line hover:bg-panel grid grid-cols-[116px_1fr] items-center gap-[14px] border-b px-[18px] py-[14px] transition-colors last:border-b-0"
						>
							<div
								class="bg-panel relative flex aspect-video items-center justify-center bg-cover bg-center"
								style="background-image: url('{item.image}');"
							>
								{#if item.type === 'video'}
									<span
										class="text-ink flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/95 pl-[2px] text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
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
									class="font-newsreader group-hover:text-accent text-[15px] leading-[1.1] font-semibold tracking-[-0.01em] transition-colors"
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

			<!-- bcsub -->
			<div class="border-line2 mt-9 mb-[18px] flex items-baseline justify-between border-b pb-[11px]">
				<h3
					class="font-newsreader flex items-center gap-3 text-[26px] font-semibold tracking-[-0.01em]"
				>
					More in the Library
				</h3>
				<a class="text-accent text-[11px] font-bold tracking-[0.07em] uppercase" href="/library">
					Browse all →
				</a>
			</div>

			<!-- libgrid: 3-up unified cards -->
			<div class="border-line2 bg-line2 grid grid-cols-3 gap-px border">
				{#each D.grid as item, i (i)}
					<a
						href="/library"
						class="group bg-paper-bg flex flex-col border-t-[3px] {item.type === 'video'
							? 'border-t-warm'
							: 'border-t-accent'}"
					>
						<div
							class="bg-panel relative flex aspect-video items-center justify-center bg-cover bg-center"
							style="background-image: url('{item.image}');"
						>
							{#if item.type === 'video'}
								<span
									class="text-ink flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/95 pl-[3px] text-sm"
								>
									▶
								</span>
							{/if}
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
									class="inline-flex items-center gap-1.5 px-[9px] py-1 text-[9px] font-extrabold tracking-[0.09em] text-white uppercase {item.type ===
									'video'
										? 'bg-warm'
										: 'bg-accent'}"
								>
									{fmtLabel(item.type)}
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
		</div>
	</div>

	<!-- sidebar — extends its paper background past the content cap to
		 the viewport edge via a box-shadow (drawn outside the border so
		 the right ink rule remains visible). The right ink rule closes
		 off the sidebar against the gutter, mirroring the divider on
		 the main column. -->
	<aside
		class="bg-paper border-ink relative border-r"
		style="box-shadow: 100vw 0 0 var(--ed-paper);"
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
				{@const cc = CIRCUIT_HEX[e.circuit]}
				<a
					href="/age-open"
					class="border-line grid grid-cols-[50px_1fr] items-center gap-[13px] border-t py-3 first:border-t-0"
				>
					<div
						class="flex h-full flex-col items-center justify-center self-stretch border px-[2px] py-2"
						style="background: color-mix(in srgb, {cc} 13%, var(--ed-bg)); border-color: color-mix(in srgb, {cc} 34%, transparent); color: {cc};"
					>
						<div class="font-newsreader text-center text-[26px] leading-[0.8] font-semibold">
							{e.day}
						</div>
						<div
							class="mt-[3px] text-center text-[9px] font-extrabold tracking-[0.05em]"
							style="color: color-mix(in srgb, {cc} 55%, var(--ed-fade));"
						>
							{e.month}
						</div>
					</div>
					<div>
						<h4
							class="font-newsreader flex flex-wrap items-center gap-2 text-sm font-semibold"
						>
							{e.city}
							<span
								class="font-libre border-line2 text-soft border px-[6px] py-px text-[9px] font-extrabold tracking-[0.07em] uppercase"
							>
								{e.format}
							</span>
						</h4>
						<div class="text-fade mt-[2px] flex items-center gap-1.5 text-[10.5px] font-semibold">
							<span>{e.venue}</span>
							<span>·</span>
							<span
								class={e.status === 'open'
									? 'text-accent font-extrabold tracking-[0.05em] uppercase'
									: ''}
							>
								{e.seats}
							</span>
						</div>
					</div>
				</a>
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

		<!-- Premium card -->
		<div class="bg-prem px-7 py-6 text-white">
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
	</aside>
</div>
</div>
