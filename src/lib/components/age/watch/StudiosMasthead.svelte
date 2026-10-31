<!--
  StudiosMasthead — AGE Studios' station ident. On the home page (`big`)
  it's the full wordmark with the on-air light and a tagline; on inner
  pages a slim ident over the page's own title. Underneath, a ticker crawls
  through the newest titles (it holds still for reduced motion).
-->
<script>
	/** @type {{ big?: boolean, kicker?: string, title?: string, lead?: string, ticker?: Array<{ id: string, href: string, label: string, title: string }> }} */
	let { big = false, kicker = '', title = '', lead = '', ticker = [] } = $props();
	// Twice over, so the crawl loops without a seam.
	const crawl = $derived(ticker.length ? [...ticker, ...ticker] : []);
</script>

<section class="relative overflow-hidden bg-studio-night text-paper-bg">
	<!-- a soft signal glow behind the wordmark -->
	<div
		class="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(192_70_31/0.28),transparent)]"
		aria-hidden="true"
	></div>
	<div
		class="relative mx-auto w-full max-w-[1280px] px-5 md:px-8 {big
			? 'pt-7 pb-8 md:pt-10 md:pb-12'
			: 'pt-5 pb-6 md:pt-7 md:pb-8'}"
	>
		<div
			class="st-wide flex items-center justify-between gap-4 text-[9.5px] font-bold tracking-[0.18em] uppercase"
		>
			<a href="/studios" class="flex items-center gap-2.5 text-paper-bg">
				<span class="flex items-center gap-1.5 bg-studio px-2 py-1 whitespace-nowrap text-white">
					<span class="st-onair inline-block h-1.5 w-1.5 bg-white" aria-hidden="true"></span>
					On air
				</span>
				{#if !big}<span>AGE Studios</span>{/if}
			</a>
			<span class="truncate text-right text-studio-mute"
				>{kicker || 'Matches · Podcasts · Interviews · Network'}</span
			>
		</div>

		{#if big}
			<h1
				class="st-wide fp-rise mt-6 text-[clamp(46px,13.5vw,168px)] leading-[0.84] font-black tracking-[-0.045em] uppercase md:mt-8"
			>
				<span class="block">AGE</span>
				<span
					class="block text-transparent [-webkit-text-stroke:1.5px_var(--color-studio-light)] md:[-webkit-text-stroke:2.5px_var(--color-studio-light)]"
					>Studios</span
				>
			</h1>
			<div class="mt-5 flex flex-col gap-4 md:mt-7 md:flex-row md:items-end md:justify-between">
				<p
					class="fp-rise max-w-[560px] font-newsreader text-[18px] leading-[1.4] text-paper-bg/80 italic md:text-[21px]"
					style="animation-delay: 120ms;"
				>
					{lead ||
						'Feature matches from the main stage, the shows we make, and the creators we love — all on one channel.'}
				</p>
			</div>
		{:else if title}
			<h1
				class="mt-4 font-newsreader text-[38px] leading-[0.98] font-semibold tracking-[-0.02em] md:text-[56px]"
			>
				{title}
			</h1>
			{#if lead}
				<p
					class="mt-2 max-w-[640px] font-newsreader text-[17px] leading-snug text-paper-bg/70 italic md:text-[19px]"
				>
					{lead}
				</p>
			{/if}
		{/if}
	</div>

	{#if crawl.length}
		<div class="relative flex overflow-hidden border-y border-paper-bg/10 bg-studio-panel">
			<span
				class="st-wide relative z-[1] flex shrink-0 items-center bg-studio-light px-3 text-[9.5px] font-extrabold tracking-[0.16em] text-studio-night uppercase"
				>New</span
			>
			<div class="min-w-0 flex-1 overflow-hidden">
				<ul class="st-ticker flex w-max">
					{#each crawl as t, i (`${t.id}-${i}`)}
						<li class="flex items-center" aria-hidden={i >= ticker.length ? 'true' : undefined}>
							<a
								href={t.href}
								tabindex={i >= ticker.length ? -1 : undefined}
								class="flex items-center gap-2.5 px-5 py-2.5 text-[12.5px] whitespace-nowrap text-paper-bg/85 hover:text-studio-light"
							>
								<span
									class="st-wide text-[9px] font-bold tracking-[0.16em] text-studio-light uppercase"
									>{t.label}</span
								>
								{t.title}
							</a>
							<span class="text-studio-mute" aria-hidden="true">◆</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</section>
