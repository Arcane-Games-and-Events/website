<script>
	import FrontByline from './FrontByline.svelte';
	import FormatTag from '../FormatTag.svelte';
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
	// Character count drives a CSS estimate of the headline size (see the
	// style block) so the server-rendered paint is already close to two
	// lines; fitTitle() then measures and sets the exact size.
	const titleChars = $derived(Math.max(12, (lead?.title || '').length));
	/** @type {HTMLElement | undefined} */
	let h1El = $state();
	const TITLE_MIN = 0.55; // of the max size
	function fitTitle() {
		const el = h1El;
		if (!el || typeof window === 'undefined') return;
		// Resolve the max size from the CSS variable, then shrink until the
		// headline sits on at most two lines.
		el.style.fontSize = 'var(--hero-title-max)';
		const cs = getComputedStyle(el);
		const max = parseFloat(cs.fontSize);
		const lh = parseFloat(cs.lineHeight) / max;
		if (!max || !lh) return;
		const fits = (px) => {
			el.style.fontSize = `${px}px`;
			return el.getBoundingClientRect().height <= px * lh * 2 + 1;
		};
		if (fits(max)) return;
		let lo = max * TITLE_MIN;
		let hi = max;
		if (!fits(lo)) return;
		for (let i = 0; i < 7; i++) {
			const mid = (lo + hi) / 2;
			if (fits(mid)) lo = mid;
			else hi = mid;
		}
		fits(Math.floor(lo));
	}
	$effect(() => {
		if (!h1El) return;
		fitTitle();
		document.fonts?.ready.then(fitTitle);
		window.addEventListener('resize', fitTitle);
		return () => window.removeEventListener('resize', fitTitle);
	});
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
		bind:this={h1El}
		class="hero-title mt-2 font-newsreader leading-[1.0] font-semibold tracking-[-0.02em] [text-wrap:balance] md:mt-3 md:leading-[0.96] {onDark
			? 'text-white'
			: ''}"
		style="--tc: {titleChars};"
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
			class="fp-rise mx-auto mt-2.5 line-clamp-2 max-w-[640px] text-center font-newsreader text-[17px] leading-[1.45] [text-wrap:balance] italic md:mt-3 md:text-[21px] lg:line-clamp-none {onDark
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
			stack
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
							srcset={lead.srcset}
							sizes="100vw"
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
					class="absolute inset-x-0 bottom-0 h-[340px] md:h-[380px] lg:h-[78%]"
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
						class="fp-fade absolute top-[28.125vw] right-6 z-[3] flex -translate-y-1/2 flex-col items-center gap-3 md:right-12 lg:top-1/2"
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
				<!-- below lg the box is a fixed size: the cover's 16:9 height plus
				     a constant band beneath it that holds the copy, centred, so
				     the text sits under the picture rather than over it and the
				     card never changes size with the length of the headline or
				     dek. The band's bottom padding pushes the copy down so the
				     gap above it (measured from where the feathered cover
				     visually ends) matches the gap below it to the plate frame.
				     At lg+ the copy is pinned to the bottom of the viewport-high
				     box as before. -->
				<div class="aspect-video w-full lg:hidden" aria-hidden="true"></div>
				<div class="h-[300px] w-full md:h-[352px] lg:hidden" aria-hidden="true"></div>
				<div
					bind:this={copyEl}
					class="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex h-[300px] items-center justify-center px-6 pb-9 text-center md:h-[352px] md:px-12 md:pb-[72px] lg:h-auto lg:items-stretch lg:pb-16"
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
								srcset={first.srcset}
								sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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
				<ol class="mt-8 border border-line bg-paper lg:mt-0 lg:self-start">
					{#each rest as s (s.href)}
						{#if s.kind === 'event'}
							<!-- event: the AGE Open ticket strip -->
							<li class="border-b border-line last:border-b-0">
								<a
									href={s.href}
									class="group grid min-h-[112px] grid-cols-[84px_1fr] md:grid-cols-[96px_1fr]"
								>
									<span
										class="relative flex flex-col items-center justify-center py-3"
										style="background: color-mix(in srgb, var(--ed-cc-{s.circuit}) 12%, var(--ed-paper));"
									>
										<span
											class="text-[9px] font-extrabold tracking-[0.18em] uppercase"
											style="color: var(--ed-cc-{s.circuit});">{s.month}</span
										>
										<span
											class="ao-cond text-[40px] leading-[0.85] font-black tabular-nums md:text-[46px]"
											>{s.day}</span
										>
										{#if s.weekday}<span
												class="mt-1 text-[8px] font-extrabold tracking-[0.14em] text-fade uppercase"
												>{s.weekday.slice(0, 3)}</span
											>{/if}
										<span
											class="ao-perf absolute inset-y-2 right-0 w-px text-line2"
											aria-hidden="true"
										></span>
									</span>
									<span class="flex min-w-0 flex-col justify-center px-4 py-3 lg:px-5">
										<span class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
											<span
												class="text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
												style="color: var(--ed-cc-{s.circuit});">{s.rubricShort || s.rubric}</span
											>
											{#if s.daysUntil != null}
												<span
													class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
												>
													<span
														class="h-[6px] w-[6px] animate-pulse-dot rounded-full"
														style="background: var(--ed-cc-{s.circuit});"
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
											class="ao-cond mt-1 line-clamp-1 text-[22px] leading-[0.95] font-black uppercase md:text-[24px]"
											>{s.title}</span
										>
										<span class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
											{#if s.format}<FormatTag format={s.format} size="sm" short />{/if}
											<span class="truncate text-[10.5px] font-semibold text-fade">{s.venue}</span>
											<span
												class="w-full text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap text-warm uppercase md:ml-auto md:w-auto"
												>{s.price}{s.price ? ' · ' : ''}Sign up →</span
											>
										</span>
									</span>
								</a>
							</li>
						{:else}
							<li class="border-b border-line last:border-b-0">
								<a
									href={s.href}
									class="group grid min-h-[112px] grid-cols-[84px_1fr] items-center gap-3 px-4 py-3 md:grid-cols-[96px_1fr] md:gap-3.5 md:py-3.5 lg:px-5"
								>
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
													: s.kind === 'event'
														? ''
														: 'text-warm'}"
												style={s.kind === 'event' ? `color: var(--ed-cc-${s.circuit});` : ''}
											>
												{#if s.rubricShort}
													<span class="md:hidden">{s.rubricShort}</span>
													<span class="hidden md:inline">{s.rubric}</span>
												{:else}
													{s.rubric}
												{/if}
											</span>
											{#if s.kind === 'event' && s.daysUntil != null}
												<span
													class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
												>
													<span
														class="h-[6px] w-[6px] animate-pulse-dot rounded-full"
														style="background: var(--ed-cc-{s.circuit});"
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
											class="mt-0.5 line-clamp-2 font-newsreader text-[15.5px] leading-[1.18] font-semibold md:text-[16.5px]"
										>
											<span class="fp-ul">{s.title}</span>
										</span>
										<span class="mt-1 block">
											{#if s.kind === 'event' || s.kind === 'course'}
												<span
													class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-fade"
												>
													{#if s.kind === 'event' && s.format}<FormatTag
															format={s.format}
															size="sm"
															short
														/>{/if}
													<span class="font-semibold">
														{#if s.metaShort}
															<span class="md:hidden">{s.metaShort}</span>
															<span class="hidden md:inline">{s.meta}</span>
														{:else}
															{s.meta}
														{/if}
													</span>
													<span aria-hidden="true">·</span>
													<span
														class="font-extrabold tracking-[0.12em] uppercase {s.kind === 'course'
															? 'text-gold'
															: s.kind === 'event'
																? ''
																: 'text-warm'}"
														style={s.kind === 'event' ? `color: var(--ed-cc-${s.circuit});` : ''}
														>{s.cta} →</span
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
						{/if}
					{/each}
				</ol>
			{/if}
		</div>
	</section>
{/if}

<style>
	/* Headline size: the max for the breakpoint, reduced by a character-
	   count estimate so long titles land near two lines before JS runs;
	   fitTitle() measures and overrides with the exact size. */
	.hero-title {
		--hero-title-max: 38px;
		--hero-w: calc(100vw - 48px);
		font-size: clamp(
			calc(var(--hero-title-max) * 0.55),
			calc(var(--hero-w) * 2 / (0.55 * var(--tc))),
			var(--hero-title-max)
		);
	}
	@media (min-width: 768px) {
		.hero-title {
			--hero-title-max: clamp(46px, 5.6vw, 84px);
			--hero-w: min(920px, 100vw - 96px);
		}
	}
</style>
