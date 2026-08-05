<script>
	/**
	 * A3 unified homepage — The Forge / AGE Labs section. Tailwind-only.
	 *
	 * Unique dark interactive module: marquee ticker on top, big Archivo
	 * "AGE Labs" headline, a featured project with a leaderboard preview,
	 * and a 2-up rail of more projects.
	 */

	/**
	 * @typedef {Object} ProjectPreviewRow
	 * @property {string | number} n
	 * @property {string} t
	 * @property {string} mv
	 */
	/**
	 * @typedef {Object} ForgeProject
	 * @property {string} kind
	 * @property {string} tag
	 * @property {string} title
	 * @property {string} desc
	 * @property {string} image
	 * @property {string} accent
	 * @property {string} cta
	 * @property {ProjectPreviewRow[]} [preview]
	 */
	/**
	 * @typedef {Object} ForgeData
	 * @property {string[]} ticker
	 * @property {ForgeProject} featured
	 * @property {ForgeProject[]} rail
	 */

	/** @type {{ data?: ForgeData }} */
	let { data } = $props();

	const FALLBACK = /** @type {ForgeData} */ ({
		ticker: [
			'AGE Labs',
			'Interactive Features',
			'Rankings',
			'Set Reviews',
			'Deep Dives',
			'Tier Lists'
		],
		featured: {
			kind: 'Rankings',
			tag: 'Hero Tier List · CC',
			title: 'The AGE Open Hero Tier List',
			desc:
				'A living tier list updated every Sunday from AGE Open match data. Drag heroes, see win-rate trends, and replay the meta week by week.',
			image: 'https://www.age.events/banner/age-open-banner.webp',
			accent: '#E5C06A',
			cta: 'Open the tier list',
			preview: [
				{ n: '01', t: 'Kayo, Armed & Dangerous', mv: '↑ +2' },
				{ n: '02', t: 'Prism, Awakener of Sol', mv: '— hold' },
				{ n: '03', t: 'Arakni, Marionette', mv: 'NEW' }
			]
		},
		rail: [
			{
				kind: 'Set Reviews',
				tag: 'Heavy Hitters',
				title: 'Heavy Hitters — interactive set scorecard',
				desc:
					'Score every card in the set, see how the AGE community rated it, and watch the consensus shift week by week.',
				image: 'https://www.age.events/banner/articles-banner.webp',
				accent: '#7FA6F0',
				cta: 'Score the set'
			},
			{
				kind: 'Deep Dives',
				tag: 'Match Replay',
				title: 'The replay archive',
				desc:
					'Every match from every AGE Open, indexed by hero, archetype, and decision. Filter, scrub, learn.',
				image: 'https://www.age.events/banner/studios-banner.webp',
				accent: '#3FBE7E',
				cta: 'Browse replays'
			}
		]
	});

	const D = $derived(data ?? FALLBACK);

	const FG_ACC = '#7fa6f0';

	/** @param {string} mv */
	function moveClass(mv) {
		if (mv.includes('↑')) return 'text-[#3fbe7e]';
		if (mv.toLowerCase().includes('new')) return 'text-[#7fa6f0]';
		if (mv.includes('↓')) return 'text-[#e5703e]';
		return 'text-[#d2ccbe]';
	}
</script>

<div
	class="border-ink relative overflow-hidden border-b-[3px] border-double bg-[#080b15] text-white"
>
	<!-- grid bg pattern -->
	<div
		class="pointer-events-none absolute inset-0"
		style="background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 46px 46px;"
		aria-hidden="true"
	></div>

	<!-- marquee ticker -->
	<div class="relative z-[1] overflow-hidden border-b border-white/10 bg-[#080b15]">
		<div
			class="font-mono-system motion-reduce:animate-none animate-marquee inline-flex py-[11px] text-[11px] font-bold tracking-[0.24em] whitespace-nowrap text-[#b6bdcd] uppercase"
		>
			<span>
				{#each D.ticker as t, i (i)}{t}<span class="px-1 text-[#7fa6f0]"> / </span>{/each}
			</span>
			<span>
				{#each D.ticker as t, i (`b-${i}`)}{t}<span class="px-1 text-[#7fa6f0]"> / </span>{/each}
			</span>
		</div>
	</div>

	<div class="relative z-[1] mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[50px]">
		<!-- head -->
		<div class="mb-[30px] flex flex-wrap items-end justify-between gap-[30px]">
			<div>
				<div
					class="font-mono-system mb-3 text-[11px] font-bold tracking-[0.26em] text-[{FG_ACC}] uppercase"
				>
					Interactive
				</div>
				<h2
					class="font-archivo m-0 text-[clamp(40px,7vw,68px)] leading-[0.86] font-extrabold tracking-[-0.035em] text-white uppercase"
				>
					AGE Labs
				</h2>
				<p class="mt-[14px] max-w-[540px] text-sm leading-[1.5] text-[#d2ccbe]">
					Cool, interactive web projects we build in-house — rankings, set reviews, and deep dives
					you can sort, filter, and replay.
				</p>
			</div>
			<a
				href="/labs"
				class="font-mono-system px-[22px] py-[14px] text-[11px] font-bold tracking-[0.1em] whitespace-nowrap text-[#080b15] uppercase transition-transform hover:translate-x-[3px]"
				style="background: {FG_ACC};"
			>
				Explore the Lab →
			</a>
		</div>

		<!-- featured project -->
		<div
			class="mb-[22px] grid grid-cols-1 border border-[#232a3b] bg-[#080b15] lg:grid-cols-[0.9fr_1.1fr]"
		>
			<div
				class="relative min-h-[404px] bg-cover bg-center"
				style="background-image: url('{D.featured.image}');"
			>
				<span
					class="absolute inset-0"
					style="background: linear-gradient(90deg, rgba(16,18,24,0) 58%, #080b15 100%), linear-gradient(0deg, rgba(10,11,16,0.55), transparent 50%);"
					aria-hidden="true"
				></span>
				<span
					class="font-mono-system absolute top-5 left-5 z-[1] inline-flex items-center gap-2 px-3 py-[7px] text-[10px] font-bold tracking-[0.12em] text-white uppercase"
					style="background: {D.featured.accent};"
				>
					<span
						class="motion-reduce:animate-none animate-pulse-dot inline-block h-[7px] w-[7px] rounded-full bg-white"
					></span>
					{D.featured.kind}
				</span>
			</div>
			<div class="flex flex-col px-9 py-8">
				<div
					class="font-mono-system mb-[10px] text-[11px] font-bold tracking-[0.16em] uppercase"
					style="color: {D.featured.accent};"
				>
					{D.featured.tag}
				</div>
				<h3
					class="font-archivo m-0 mb-[11px] text-[clamp(26px,4.5vw,38px)] leading-[0.98] font-extrabold tracking-[-0.02em] text-white"
				>
					{D.featured.title}
				</h3>
				<p class="m-0 mb-4 max-w-[480px] text-[13.5px] leading-[1.5] text-[#d2ccbe]">
					{D.featured.desc}
				</p>
				<div class="mb-[22px] flex flex-col">
					{#each D.featured.preview ?? [] as r, i (i)}
						<div
							class="grid grid-cols-[48px_1fr_auto] items-center gap-4 border-t border-[#232a3b] py-3 last:border-b last:border-[#232a3b]"
						>
							<span
								class="font-archivo text-[30px] leading-[0.7] font-extrabold"
								style="color: {D.featured.accent};"
							>
								{r.n}
							</span>
							<span class="text-[16.5px] font-bold text-white">{r.t}</span>
							<span
								class="font-mono-system text-[10.5px] font-bold tracking-[0.06em] uppercase {moveClass(
									r.mv
								)}"
							>
								{r.mv}
							</span>
						</div>
					{/each}
				</div>
				<a
					href="/labs"
					class="font-mono-system mt-auto inline-flex items-center gap-[9px] self-start bg-white px-6 py-[14px] text-xs font-bold tracking-[0.04em] text-[#080b15] uppercase transition-transform hover:translate-x-[3px]"
				>
					{D.featured.cta} →
				</a>
			</div>
		</div>

		<!-- rail -->
		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			{#each D.rail as p, i (i)}
				<a
					href="/labs"
					class="group relative grid grid-cols-[1fr_134px] overflow-hidden border border-[#232a3b] border-t-[3px] bg-[#080b15] transition-colors hover:bg-[#17150f]"
					style="border-top-color: {p.accent};"
				>
					<span
						class="font-archivo pointer-events-none absolute bottom-[-18px] left-4 z-0 text-[96px] leading-[0.7] font-extrabold text-white/[0.05]"
					>
						{String(i + 2).padStart(2, '0')}
					</span>
					<div class="relative z-[1] flex flex-col px-6 py-[22px] pl-6">
						<div
							class="font-mono-system mb-[9px] text-[10px] font-bold tracking-[0.12em] uppercase"
							style="color: {p.accent};"
						>
							{p.kind} / {p.tag}
						</div>
						<h4
							class="font-archivo m-0 mb-2 text-[23px] leading-none font-extrabold tracking-[-0.01em] text-white transition-colors"
							style="--pa: {p.accent};"
						>
							{p.title}
						</h4>
						<p class="m-0 mb-3 text-xs leading-[1.45] text-[#d2ccbe]">{p.desc}</p>
						<span
							class="font-mono-system mt-auto text-[10.5px] font-bold tracking-[0.06em] uppercase"
							style="color: {p.accent};"
						>
							{p.cta} →
						</span>
					</div>
					<div
						class="bg-cover bg-center bg-[#17150f]"
						style="background-image: url('{p.image}');"
					></div>
				</a>
			{/each}
		</div>
	</div>
</div>
