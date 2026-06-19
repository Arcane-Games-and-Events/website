<script>
	/**
	 * A3 unified homepage — Studios / Podcast Network section. Tailwind-only.
	 *
	 * Header: "AGE Podcast Network" + legend (Originals vs Partners).
	 * Featured podcast (dark, with player widget + platform links).
	 * 2-up grid of network show cards (originals get a gold stripe inset,
	 * partners get a neutral one).
	 */

	/**
	 * @typedef {Object} FeaturedPodcast
	 * @property {string} image
	 * @property {string} show
	 * @property {string | number} ep
	 * @property {string} title
	 * @property {string} host
	 * @property {number} pct
	 * @property {string} at
	 * @property {string} duration
	 */
	/**
	 * @typedef {Object} NetworkShow
	 * @property {'original' | 'network'} origin
	 * @property {string} name
	 * @property {string} image
	 * @property {string} host
	 * @property {string} [by]
	 * @property {string} cadence
	 * @property {string} latest
	 * @property {string} dur
	 */

	/**
	 * @typedef {Object} StudiosData
	 * @property {FeaturedPodcast} featured
	 * @property {NetworkShow[]} shows
	 */

	/** @type {{ data?: StudiosData }} */
	let { data } = $props();

	const FALLBACK = /** @type {StudiosData} */ ({
		featured: {
			image: 'https://www.age.events/banner/studios-banner.webp',
			show: 'Cardboard & Beyond',
			ep: 47,
			title: 'After Memphis: the season pivots, the data shifts',
			host: 'Joaquin Park & guests',
			pct: 38,
			at: '24:18',
			duration: '63:42'
		},
		shows: [
			{
				origin: 'original',
				name: 'Cardboard & Beyond',
				image: 'https://www.age.events/banner/studios-banner.webp',
				host: 'Joaquin Park',
				cadence: 'Weekly',
				latest: 'After Memphis: the season pivots',
				dur: '63 min'
			},
			{
				origin: 'original',
				name: 'The SAGE Series',
				image: 'https://www.age.events/banner/articles-banner.webp',
				host: 'Hayley Neighbors',
				cadence: 'Bi-weekly',
				latest: 'When to trade tempo for cards',
				dur: '41 min'
			},
			{
				origin: 'network',
				name: 'Pitch Perfect',
				image: 'https://www.age.events/banner/age-open-banner.webp',
				by: 'Independent',
				host: 'Wes & Patrick',
				cadence: 'Weekly',
				latest: 'Iyslander still alive? The case for slow',
				dur: '58 min'
			},
			{
				origin: 'network',
				name: 'The Local LGS',
				image: 'https://www.age.events/banner/academy-banner.webp',
				by: 'Glendale GC',
				host: 'Justin Liwag',
				cadence: 'Bi-weekly',
				latest: 'Building scenes that outlive the meta',
				dur: '52 min'
			}
		]
	});

	const D = $derived(data ?? FALLBACK);
</script>

<div class="bg-paper-bg border-ink border-b-[3px] border-double">
<div class="mx-auto w-full max-w-[min(94vw,1920px)] px-14 pt-[42px] pb-[48px]">
	<!-- studhead / podnetsub -->
	<div class="border-ink mb-[26px] flex items-end justify-between border-b-2 pb-[14px]">
		<div class="flex flex-wrap items-baseline gap-5">
			<h2 class="font-newsreader text-[40px] font-semibold tracking-[-0.02em]">
				AGE Podcast Network
			</h2>
			<span class="flex gap-4">
				<span class="text-fade inline-flex items-center gap-[7px] text-[11px] font-bold">
					<span class="bg-gold inline-block h-[9px] w-[9px] flex-shrink-0"></span>
					AGE Original
				</span>
				<span class="text-fade inline-flex items-center gap-[7px] text-[11px] font-bold">
					<span class="border-line2 inline-block h-[9px] w-[9px] flex-shrink-0 border-[1.5px] bg-transparent"></span>
					Partner — independent shows we love
				</span>
			</span>
		</div>
		<a href="/podcasts" class="text-accent text-[11px] font-bold tracking-[0.07em] uppercase">
			All shows →
		</a>
	</div>

	<!-- featured podcast -->
	<a
		href="/podcasts"
		class="group border-t-warm mb-[30px] grid grid-cols-[300px_1fr] border-t-[3px] bg-[#17150f] text-white"
	>
		<div
			class="relative aspect-square bg-cover bg-center bg-[#23201a]"
			style="background-image: url('{D.featured.image}');"
		>
			<span
				class="absolute inset-0"
				style="background: linear-gradient(135deg, rgba(8,9,14,0.15), rgba(8,9,14,0.55));"
				aria-hidden="true"
			></span>
			<span
				class="bg-gold absolute top-[14px] left-[14px] z-[1] inline-block px-2 py-1 text-[9px] font-extrabold tracking-[0.1em] whitespace-nowrap text-[#17150f] uppercase"
			>
				AGE Original
			</span>
			<span
				class="absolute top-1/2 left-1/2 z-[1] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 pl-1 text-[21px] text-[#17150f] transition-transform group-hover:scale-[1.07]"
			>
				▶
			</span>
		</div>
		<div class="flex flex-col px-10 pt-8 pb-[30px]">
			<div
				class="mb-[14px] flex items-center gap-3 text-[10px] font-extrabold tracking-[0.16em] uppercase"
			>
				<span class="text-gold">{D.featured.show}</span>
				<span class="text-white/50">Episode {D.featured.ep} · New this week</span>
			</div>
			<h4
				class="font-newsreader group-hover:text-gold m-0 mb-[11px] text-[34px] leading-[1.04] font-semibold tracking-[-0.01em] text-white transition-colors"
			>
				{D.featured.title}
			</h4>
			<div class="mb-auto text-[13px] font-semibold text-white/60">
				Hosted by {D.featured.host}
			</div>
			<div class="mt-[26px] mb-5 flex items-center gap-4">
				<span
					class="hover:bg-warm hover:border-warm flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-white/40 pl-[3px] text-sm transition-colors"
				>
					▶
				</span>
				<div class="relative h-1 flex-1 bg-white/[0.18]">
					<i class="bg-warm block h-full" style="width: {D.featured.pct}%;"></i>
					<span
						class="absolute top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
						style="left: {D.featured.pct}%;"
					></span>
				</div>
				<span
					class="text-[11px] font-bold whitespace-nowrap text-white/65 tabular-nums"
				>
					{D.featured.at} / {D.featured.duration}
				</span>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each ['Apple Podcasts', 'Spotify', 'YouTube', 'RSS'] as plat (plat)}
					<span
						class="border border-white/[0.22] px-[11px] py-[6px] text-[10px] font-bold tracking-[0.03em] whitespace-nowrap text-white/70 transition-colors hover:border-white hover:text-white"
					>
						{plat}
					</span>
				{/each}
			</div>
		</div>
	</a>

	<!-- network grid -->
	<div class="border-line2 bg-line2 grid grid-cols-2 gap-px border">
		{#each D.shows as s, i (i)}
			<a
				href="/podcasts"
				class="group bg-paper-bg grid grid-cols-[118px_1fr]"
				style={s.origin === 'original'
					? 'box-shadow: inset 3px 0 0 var(--ed-gold);'
					: 'box-shadow: inset 3px 0 0 var(--ed-line2);'}
			>
				<div
					class="bg-panel relative bg-cover bg-center"
					style="background-image: url('{s.image}');"
				>
					<span
						class="text-ink absolute top-1/2 left-1/2 flex h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 pl-[2px] text-xs opacity-0 transition-[opacity,transform] group-hover:scale-105 group-hover:opacity-100"
					>
						▶
					</span>
				</div>
				<div class="flex flex-col px-[18px] pt-[15px] pb-4">
					<div class="mb-[11px] flex items-center justify-between gap-[10px]">
						{#if s.origin === 'original'}
							<span
								class="bg-gold inline-block px-2 py-1 text-[9px] font-extrabold tracking-[0.1em] whitespace-nowrap text-[#17150f] uppercase"
							>
								AGE Original
							</span>
						{:else}
							<span
								class="border-line2 text-soft inline-block border bg-transparent px-2 py-1 text-[9px] font-extrabold tracking-[0.1em] whitespace-nowrap uppercase"
							>
								Partner
							</span>
						{/if}
						<span
							class="text-fade text-[9.5px] font-extrabold tracking-[0.08em] uppercase"
						>
							{s.cadence}
						</span>
					</div>
					<div
						class="font-newsreader group-hover:text-accent mb-[5px] text-[21px] leading-[1.02] font-semibold tracking-[-0.01em] transition-colors"
					>
						{s.name}
					</div>
					<div class="text-soft mb-[11px] text-[11px] font-bold">
						{s.origin === 'original' ? `AGE Studios · ${s.host}` : `${s.by} · ${s.host}`}
					</div>
					<div class="text-fade mt-auto text-xs leading-[1.4]">
						<b
							class="text-fade mb-1 block text-[9px] font-extrabold tracking-[0.08em] uppercase"
						>
							Latest
						</b>
						{s.latest}
						<span class="text-soft font-semibold whitespace-nowrap">· {s.dur}</span>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
</div>
