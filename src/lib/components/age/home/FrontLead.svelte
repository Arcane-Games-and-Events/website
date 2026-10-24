<script>
	import FrontByline from './FrontByline.svelte';
	import { fade } from 'svelte/transition';

	/**
	 * Latest release — a full-bleed photo with an inset plate frame that
	 * settles in on load, a headline block rising over its lower edge
	 * word by word, then "The Latest" as a five-across strip beneath.
	 */
	/** @type {{ leads?: any[], latest?: any[] }} */
	let { leads = [], latest = [] } = $props();

	// ============ rotation ============
	// The hero cycles through the three newest Library entries every 15s.
	// Picking a dot jumps to that item and restarts the clock.
	const ROTATE_MS = 15000;
	let activeIdx = $state(0);
	const lead = $derived(leads[Math.min(activeIdx, Math.max(0, leads.length - 1))] ?? null);
	/** @type {ReturnType<typeof setInterval> | null} */
	let timer = null;
	function startTimer() {
		if (timer) clearInterval(timer);
		timer = null;
		if (leads.length < 2) return;
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
		timer = setInterval(() => (activeIdx = (activeIdx + 1) % leads.length), ROTATE_MS);
	}
	function show(i) {
		activeIdx = i;
		startTimer();
	}
	$effect(() => {
		startTimer();
		return () => {
			if (timer) clearInterval(timer);
		};
	});

	const isVideo = $derived(lead?.kind === 'video');
	const words = $derived((lead?.title || '').split(/\s+/).filter(Boolean));
	// Headline words start rising once the photo has begun to settle.
	const WORD_BASE = 350;
	const WORD_STEP = 55;

	// Scroll cue — fixed in the viewport's corner while the hero's bottom
	// edge is still below the fold; gone as soon as it scrolls into view.
	/** @type {HTMLElement | undefined} */
	let heroEl = $state();
	let cueVisible = $state(true);
	// Hero geometry. At lg+ the box fills the viewport below the header
	// and the cover is centred inside it. Below lg the cover is anchored
	// to the top and the box is just tall enough for the copy to sit
	// beneath it over the blurred fill, overlapping its bottom edge — the
	// same composition as desktop, without the viewport fill.
	/** @type {number | null} */
	let heroH = $state(null);
	/** @type {HTMLImageElement | undefined} */
	let imgEl = $state();
	/** @type {HTMLElement | undefined} */
	let copyEl = $state();
	let imgStyle = $state('');
	let viewportH = 0;
	// Three layers make the seam invisible:
	//   1. cover blur — the image stretched over the whole box, heavily
	//      blurred (the far fill);
	//   2. aligned blur — the image at exactly the sharp image's geometry,
	//      lightly blurred, its own edge melting into layer 1;
	//   3. the sharp image, melting into layer 2 over a smooth S-curve.
	// Because layer 2 lines up pixel-for-pixel with the sharp image, the
	// sharp → blur hand-off continues the same picture, just softer.
	const FEATHER = 150;
	const BLUR_FEATHER = 90;
	let blurStyle = $state('');
	// S-curve opacity ramp from the edge inward, mirrored on the far side.
	const S = [
		[0, 0],
		[0.12, 0.04],
		[0.25, 0.14],
		[0.4, 0.32],
		[0.55, 0.55],
		[0.7, 0.76],
		[0.85, 0.92],
		[1, 1]
	];
	const ramp = (dir, f, far = true) => {
		const near = S.map(([t, o]) => `rgba(0,0,0,${o}) ${Math.round(t * f)}px`).join(', ');
		const farSide = far
			? ', ' +
				[...S]
					.reverse()
					.map(([t, o]) => `rgba(0,0,0,${o}) calc(100% - ${Math.round(t * f)}px)`)
					.join(', ')
			: '';
		return `linear-gradient(${dir}, ${near}${farSide})`;
	};
	const masks = (mx, my) =>
		`-webkit-mask-image:${mx},${my};mask-image:${mx},${my};` +
		`-webkit-mask-composite:source-in;mask-composite:intersect;`;

	function fit() {
		if (!heroEl || !imgEl) {
			imgStyle = '';
			blurStyle = 'display:none;';
			return;
		}
		const lg = window.innerWidth >= 1024;
		if (!lg) {
			// Below lg the layout is pure CSS (static 16:9 cover, copy flows
			// beneath it with an overlap) so the first paint is already right.
			heroH = null;
			imgStyle = '';
			blurStyle = '';
			return;
		}
		const boxW = heroEl.clientWidth;
		const ratio =
			imgEl.naturalWidth && imgEl.naturalHeight ? imgEl.naturalWidth / imgEl.naturalHeight : 16 / 9;
		let w = boxW;
		let h = w / ratio;
		const boxH = Math.max(480, viewportH);
		if (h > boxH) {
			h = boxH;
			w = h * ratio;
		}
		heroH = boxH;
		const top = (boxH - h) / 2;
		const left = (boxW - w) / 2;
		const solid = 'linear-gradient(#000, #000)';
		const hasX = w < boxW - 1;
		const hasY = h < boxH - 1;
		const fx = hasX ? Math.min(FEATHER, Math.round(w * 0.2)) : 0;
		const fy = hasY ? Math.min(FEATHER, Math.round(h * 0.3)) : 0;
		const geom = `width:${w}px;height:${h}px;left:${left}px;top:${top}px;`;
		// layer 3 — sharp
		const mx = fx ? ramp('to right', fx) : solid;
		const my = fy ? ramp('to bottom', fy) : solid;
		imgStyle = geom + masks(mx, my);
		// layer 2 — aligned blur, only needed where there is fill
		if (!hasX && !hasY) {
			blurStyle = 'display:none;';
		} else {
			const bx = hasX ? Math.min(BLUR_FEATHER, Math.round(w * 0.12)) : 0;
			const by = hasY ? Math.min(BLUR_FEATHER, Math.round(h * 0.15)) : 0;
			const bmx = bx ? ramp('to right', bx) : solid;
			const bmy = by ? ramp('to bottom', by) : solid;
			blurStyle = geom + masks(bmx, bmy);
		}
	}

	$effect(() => {
		if (!heroEl) return;
		const el = heroEl;
		const update = () => {
			const rect = el.getBoundingClientRect();
			viewportH = Math.round(window.innerHeight - (rect.top + window.scrollY));
			fit();
			// Visible while the hero's bottom edge is at or below the fold;
			// gone on the first pixel of scroll past it. Measured against the
			// height fit() just chose, not the pre-fit box.
			const bottom = heroH ? rect.top + heroH : rect.bottom;
			cueVisible = bottom >= window.innerHeight - 1;
		};
		update();
		const ro = typeof ResizeObserver !== 'undefined' && copyEl ? new ResizeObserver(update) : null;
		ro?.observe(/** @type {Element} */ (copyEl));
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			ro?.disconnect();
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});
</script>

{#snippet copy(onDark)}
	<div
		class="fp-rise flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.24em] uppercase md:text-[11.5px] {onDark
			? 'text-white/90'
			: 'text-warm'}"
		style="animation-delay: 300ms;"
	>
		<span class={onDark ? 'text-warm-light' : 'text-warm'} aria-hidden="true">◆</span>
		Latest release · {lead.rubric}
		<span class={onDark ? 'text-warm-light' : 'text-warm'} aria-hidden="true">◆</span>
	</div>
	<h1
		class="mt-2 font-newsreader text-[38px] leading-[1.0] font-semibold tracking-[-0.02em] [text-wrap:balance] md:mt-3 md:text-[clamp(46px,5.6vw,84px)] md:leading-[0.96] {onDark
			? 'text-white'
			: ''}"
	>
		<a href={lead.href} class="pointer-events-auto">
			{#each words as w, i (i)}
				<span
					class="fp-word mr-[0.26em] last:mr-0"
					style="animation-delay: {WORD_BASE + i * WORD_STEP}ms;">{w}</span
				>
			{/each}
		</a>
	</h1>
	{#if lead.dek}
		<p
			class="fp-rise mx-auto mt-2.5 max-w-[640px] text-center font-newsreader text-[17px] leading-[1.45] [text-wrap:balance] italic md:mt-3 md:text-[21px] {onDark
				? 'text-white/85'
				: 'text-soft'}"
			style="animation-delay: 750ms;"
		>
			{lead.dek}
		</p>
	{/if}
	<div
		class="fp-rise mt-3.5 flex flex-col items-center gap-2.5 md:mt-4"
		style="animation-delay: 900ms;"
	>
		<FrontByline
			author={lead.author}
			date={lead.date}
			length={lead.length}
			premium={lead.premium}
			{onDark}
		/>
		<a
			href={lead.href}
			class="pointer-events-auto inline-block border-b-2 pb-1 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[letter-spacing] hover:tracking-[0.26em] md:text-[11px] {onDark
				? 'border-warm-light text-white'
				: 'border-warm text-warm'}"
		>
			{isVideo ? 'Watch the video' : 'Read the story'} →
		</a>
	</div>
{/snippet}

{#if lead}
	<section class="relative">
		<div>
			<!-- cover (never cropped) inside a box that is viewport-high at
			     lg+ and copy-high below, with a blurred fill behind it -->
			<div
				bind:this={heroEl}
				class="relative mx-auto w-full overflow-hidden bg-ink lg:h-[calc(100svh-80px)] lg:min-h-[480px]"
				style={heroH ? `height: ${heroH}px;` : ''}
			>
				{#key activeIdx}
					<div class="absolute inset-0" in:fade={{ duration: 900 }} out:fade={{ duration: 900 }}>
						<img
							class="absolute inset-0 h-full w-full scale-105 object-cover blur-2xl brightness-[0.9]"
							src={lead.image}
							alt=""
							aria-hidden="true"
						/>
						<img
							class="fp-hero-m-blur absolute inset-x-0 top-0 aspect-video w-full object-cover blur-[14px] brightness-[0.95]"
							style={blurStyle}
							src={lead.image}
							alt=""
							aria-hidden="true"
						/>
						<img
							bind:this={imgEl}
							onload={fit}
							class="fp-kenburns fp-hero-m-sharp absolute inset-x-0 top-0 aspect-video w-full object-cover will-change-transform lg:object-contain"
							style={imgStyle}
							src={lead.image}
							alt={lead.alt}
							fetchpriority={activeIdx === 0 ? 'high' : 'auto'}
						/>
					</div>
				{/key}
				<!-- light top scrim; heavier lower scrim carries the copy -->
				<div
					class="absolute inset-x-0 top-0 h-24"
					style="background: linear-gradient(180deg, rgba(23,21,15,0.35), rgba(23,21,15,0));"
					aria-hidden="true"
				></div>
				<div
					class="absolute inset-x-0 bottom-0 h-[78%]"
					style="background: linear-gradient(180deg, rgba(23,21,15,0) 0%, rgba(23,21,15,0.3) 22%, rgba(23,21,15,0.72) 45%, rgba(23,21,15,0.92) 68%, rgba(23,21,15,0.98) 100%);"
					aria-hidden="true"
				></div>
				<!-- inset plate frame -->
				<div
					class="fp-fade pointer-events-none absolute inset-3 border border-white/70 md:inset-7"
					style="animation-delay: 500ms;"
					aria-hidden="true"
				></div>
				<!-- slide dots — one per item, right edge, vertically centred -->
				{#if leads.length > 1}
					<div
						class="fp-fade absolute top-1/2 right-6 z-[3] flex -translate-y-1/2 flex-col items-center gap-3 md:right-12"
						style="animation-delay: 900ms;"
						role="tablist"
						aria-label="Latest releases"
					>
						{#each leads as item, i (item.href)}
							<button
								type="button"
								role="tab"
								aria-selected={i === activeIdx}
								aria-label="Show {item.title}"
								title={item.title}
								onclick={() => show(i)}
								class="flex h-5 w-5 items-center justify-center"
							>
								<span
									class="block rounded-full border transition-[transform,background-color,border-color] duration-300 {i ===
									activeIdx
										? 'h-3 w-3 border-warm-light bg-warm-light'
										: 'h-2.5 w-2.5 border-white/80 bg-white/15 hover:bg-white/60'}"
								></span>
							</button>
						{/each}
					</div>
				{/if}
				<!-- below lg the cover is in flow (reserves its 16:9 height) and
				     the copy follows it with an overlap; at lg+ the copy is pinned
				     to the bottom of the viewport-high box -->
				<div class="aspect-video w-full lg:hidden" aria-hidden="true"></div>
				<div
					bind:this={copyEl}
					class="pointer-events-none relative z-[1] -mt-16 flex justify-center px-6 pb-9 text-center md:-mt-20 md:px-12 md:pb-14 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:pb-16"
				>
					{#key activeIdx}
						<div
							class="w-full max-w-[920px]"
							style="text-shadow: 0 1px 2px rgba(23,21,15,0.6), 0 6px 24px rgba(23,21,15,0.45);"
							in:fade={{ duration: 500 }}
						>
							{@render copy(true)}
						</div>
					{/key}
				</div>
			</div>
		</div>
	</section>

	<!-- scroll cue — pinned to the viewport corner, hidden once the
	     hero's bottom edge is on screen. The entrance fade lives on the
	     inner element so its fill-mode can't override the outer toggle. -->
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
{/if}

{#if latest.length}
	{@const first = latest[0]}
	{@const rest = latest.slice(1)}
	<section class="mx-auto w-full max-w-[1200px] px-5 pt-10 md:px-8 md:pt-14">
		<div class="flex items-baseline justify-between border-t-[3px] border-double border-ink pt-3">
			<h2
				class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
			>
				<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
				The Latest
			</h2>
			<a
				href="/library"
				class="text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:text-warm"
			>
				All →
			</a>
		</div>

		<div class="mt-5 md:mt-7 lg:grid lg:grid-cols-[1.35fr_1fr] lg:gap-10">
			<!-- lead item — plate-framed cover with the numeral set over its corner -->
			<a href={first.href} class="group block">
				<div class="relative">
					<div class="fp-plate relative aspect-video overflow-hidden bg-panel">
						{#if first.image}
							<img
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
								src={first.image}
								alt={first.alt}
								loading="lazy"
							/>
						{/if}
						{#if first.kind === 'video'}
							<span
								class="absolute right-0 bottom-0 flex h-10 w-10 items-center justify-center bg-warm pl-[3px] text-[13px] text-white"
								aria-hidden="true">▶</span
							>
						{/if}
					</div>
					<span
						class="absolute -top-4 -left-3 flex h-16 w-16 items-center justify-center bg-paper-bg font-newsreader text-[44px] leading-none font-medium text-warm tabular-nums md:-top-5 md:-left-4 md:h-20 md:w-20 md:text-[56px]"
						aria-hidden="true"
					>
						1
					</span>
				</div>
				<div class="pt-5 md:pt-6">
					<div class="text-[10px] font-extrabold tracking-[0.18em] text-warm uppercase">
						{first.rubric}
					</div>
					<h3
						class="mt-2 font-newsreader text-[26px] leading-[1.06] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[34px]"
					>
						<span class="fp-ul">{first.title}</span>
					</h3>
					{#if first.dek}
						<p
							class="mt-2.5 line-clamp-2 font-newsreader text-[15.5px] leading-[1.5] text-soft italic md:text-[17px]"
						>
							{first.dek}
						</p>
					{/if}
					<div class="mt-3">
						<FrontByline author={first.author} length={first.length} premium={first.premium} />
					</div>
				</div>
			</a>

			<!-- the rest — a toned ledger of thumbnail rows -->
			{#if rest.length}
				<ol class="mt-8 border border-line bg-paper px-5 lg:mt-0 lg:self-start lg:px-6">
					{#each rest as s, i (s.href)}
						<li class="border-b border-line last:border-b-0">
							<a
								href={s.href}
								class="group grid grid-cols-[22px_92px_1fr] items-center gap-3 py-4 md:grid-cols-[32px_112px_1fr] md:gap-4 md:py-5"
							>
								<span
									class="font-newsreader text-[30px] leading-none font-medium text-warm tabular-nums"
									aria-hidden="true"
								>
									{i + 2}
								</span>
								<span class="relative block aspect-video overflow-hidden bg-panel">
									{#if s.image}
										<img
											class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
											src={s.image}
											alt={s.alt}
											loading="lazy"
										/>
									{/if}
									{#if s.kind === 'video'}
										<span
											class="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center bg-warm pl-[2px] text-[9px] text-white"
											aria-hidden="true">▶</span
										>
									{:else if s.kind === 'event'}
										<!-- date tile set over the circuit photo -->
										<span
											class="absolute inset-0"
											style="background: linear-gradient(90deg, color-mix(in srgb, var(--ed-cc-{s.circuit}) 55%, rgba(23,21,15,0.6)) 0%, rgba(23,21,15,0.1) 80%);"
											aria-hidden="true"
										></span>
										<span
											class="absolute top-0 left-0 flex w-[40px] flex-col items-center bg-paper-bg py-1 text-center text-ink md:w-[46px]"
										>
											<span
												class="text-[7px] font-extrabold tracking-[0.14em] uppercase"
												style="color: var(--ed-cc-{s.circuit});">{s.month}</span
											>
											<span
												class="font-newsreader text-[20px] leading-[0.9] font-semibold tabular-nums md:text-[24px]"
												>{s.day}</span
											>
										</span>
									{:else if s.kind === 'course'}
										<span
											class="absolute top-0 left-0 bg-gold px-1.5 py-[2px] text-[7.5px] font-extrabold tracking-[0.14em] text-[#241b07] uppercase"
											>Course</span
										>
									{/if}
								</span>
								<span class="min-w-0">
									<span class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
										<span
											class="block text-[9.5px] font-extrabold tracking-[0.16em] uppercase {s.kind ===
											'course'
												? 'text-gold'
												: 'text-warm'}"
										>
											{s.rubric}
										</span>
										{#if s.kind === 'event' && s.daysUntil != null}
											<span
												class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
											>
												<span
													class="h-[6px] w-[6px] animate-pulse-dot rounded-full bg-prem"
													aria-hidden="true"
												></span>
												{s.daysUntil === 0
													? 'Today'
													: s.daysUntil === 1
														? 'Tomorrow'
														: `In ${s.daysUntil} days`}
											</span>
										{/if}
									</span>
									<span
										class="mt-1 block font-newsreader text-[17px] leading-[1.18] font-semibold md:text-[18px]"
									>
										<span class="fp-ul">{s.title}</span>
									</span>
									<span class="mt-1.5 block">
										{#if s.kind === 'event' || s.kind === 'course'}
											<span class="flex flex-wrap items-baseline gap-x-2 text-[10.5px] text-fade">
												<span class="font-semibold">{s.meta}</span>
												<span aria-hidden="true">·</span>
												<span
													class="font-extrabold tracking-[0.12em] uppercase {s.kind === 'course'
														? 'text-gold'
														: 'text-warm'}">{s.cta} →</span
												>
											</span>
										{:else}
											<FrontByline
												author={s.author}
												length={s.length}
												premium={s.premium}
												size="sm"
											/>
										{/if}
									</span>
								</span>
							</a>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	</section>
{/if}
