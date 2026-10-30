<script>
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import FrontByline from './FrontByline.svelte';
	import FormatTag from '../FormatTag.svelte';
	import Picture from '$lib/components/media/Picture.svelte';

	/**
	 * The front page's opening: the newest Library releases, one at a time,
	 * filling the screen under the header. Covers are 16:9 with the subject
	 * anywhere in the frame, so the sharp cover is never cropped: it is sized
	 * to fit the screen and feathers into a blurred copy of itself that fills
	 * whatever space is left. Copy sits bottom-left like a magazine cover; the
	 * releases are listed bottom-right with a bar that fills while each is
	 * showing. Below the hero, "The Latest" is a mixed strip of pieces, events
	 * and courses.
	 */
	/** @type {{ leads?: any[], latest?: any[] }} */
	let { leads = [], latest = [] } = $props();

	// ============ rotation ============
	// Every 15 seconds the next release takes over. Picking one jumps to
	// it. Hovering doesn't pause it; tabbing into the hero with the keyboard
	// does, so the copy can be read (a click focuses too, but only keyboard
	// focus counts).
	const ROTATE_MS = 15000;
	let activeIdx = $state(0);
	// The cover being replaced stays fully visible underneath while the new
	// one fades in over it, so the picture never dims mid-change.
	let prevIdx = $state(-1);
	let paused = $state(false);
	let reduced = $state(false);
	let cycle = $state(0); // restarts the progress bar animation
	const lead = $derived(leads[Math.min(activeIdx, Math.max(0, leads.length - 1))] ?? null);
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timer = null;

	function schedule() {
		if (timer) clearTimeout(timer);
		timer = null;
		cycle++;
		if (leads.length < 2 || paused || reduced) return;
		timer = setTimeout(() => {
			go((activeIdx + 1) % leads.length);
			schedule();
		}, ROTATE_MS);
	}
	// The first release's copy rises in line by line with the page; after a
	// switch, the new copy comes in as one block (see the {#key} below).
	let switched = $state(false);
	function go(i) {
		if (i === activeIdx) return;
		switched = true;
		prevIdx = activeIdx;
		activeIdx = i;
	}
	function show(i) {
		go(i);
		schedule();
	}
	function pause() {
		if (paused) return;
		paused = true;
		schedule();
	}
	function resume() {
		if (!paused) return;
		paused = false;
		schedule();
	}
	$effect(() => {
		// Runs once on mount. schedule() reads and writes rotation state, so
		// it must not become a dependency of this effect.
		untrack(() => {
			reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
			schedule();
		});
		return () => {
			if (timer) clearTimeout(timer);
		};
	});

	// ============ height ============
	// The hero runs from under the header to the bottom of the screen. CSS
	// gets it close before JS runs; this makes it exact.
	/** @type {HTMLElement | undefined} */
	let heroEl = $state();
	/** @type {number | null} */
	let heroH = $state(null);
	// Wider than 16:9: the cover fits the height and the sides feather out.
	let wide = $state(false);
	$effect(() => {
		if (!heroEl) return;
		const el = heroEl;
		const measure = () => {
			const top = el.getBoundingClientRect().top + window.scrollY;
			heroH = Math.max(560, Math.round(window.innerHeight - top));
			wide = window.innerWidth / heroH > 16 / 9;
		};
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	});

	// ============ headline ============
	// The headline is held to two lines. It starts at the screen's full size
	// and steps down until it fits, never below a floor; the two-line clamp
	// in the markup catches anything longer still. The size classes are the
	// first guess before JS runs.
	const titleSize = $derived.by(() => {
		const n = (lead?.title || '').length;
		if (n <= 34) return 'text-[38px] md:text-[52px] lg:text-[44px] xl:text-[52px]';
		if (n <= 60) return 'text-[30px] md:text-[40px] lg:text-[36px] xl:text-[42px]';
		return 'text-[26px] md:text-[34px] lg:text-[32px] xl:text-[36px]';
	});
	const TITLE_SIZES = [
		// [min screen width, largest size, smallest size]
		[1280, 52, 32],
		[1024, 44, 30],
		[768, 52, 30],
		[0, 38, 20]
	];
	/** @param {HTMLElement} node */
	function fitTwoLines(node) {
		const fit = () => {
			const [, max, min] = TITLE_SIZES.find(([w]) => window.innerWidth >= w) ?? TITLE_SIZES[3];
			let size = max;
			node.style.fontSize = `${size}px`;
			const tooTall = () =>
				node.scrollHeight > parseFloat(getComputedStyle(node).lineHeight) * 2 + 2;
			while (size > min && tooTall()) {
				size -= 2;
				node.style.fontSize = `${size}px`;
			}
		};
		fit();
		document.fonts?.ready.then(fit);
		window.addEventListener('resize', fit);
		return { destroy: () => window.removeEventListener('resize', fit) };
	}
	const cta = (item) => (item?.kind === 'video' ? 'Watch the video' : 'Read the story');
	const pad = (n) => String(n).padStart(2, '0');
	// The full image-library shape when the story has one (AVIF / WebP copies,
	// blur, credit), else just its plain image.
	const pic = (item) => item?.picture ?? { src: item?.image, srcset: item?.srcset, alt: item?.alt };
	const leadPic = $derived(pic(lead));
	// Stacking for a cover layer: the current one fades in on top; the one it
	// replaces stays put underneath (and keeps its slow zoom) until covered;
	// the rest are hidden.
	const FADE = 'transition-opacity duration-[1600ms] ease-[cubic-bezier(0.45,0,0.2,1)]';
	const layer = (i, shown) =>
		i === activeIdx ? `z-[2] ${shown} ${FADE}` : i === prevIdx ? `z-[1] ${shown}` : 'z-0 opacity-0';
	const heroFirst = $derived(leads[0] ? pic(leads[0]) : null);
</script>

<svelte:head>
	<!-- fetch the first cover before anything else on the page -->
	{#if heroFirst?.avifSrcset}
		<link
			rel="preload"
			as="image"
			type="image/avif"
			imagesrcset={heroFirst.avifSrcset}
			imagesizes="100vw"
			fetchpriority="high"
		/>
	{:else if heroFirst?.srcset}
		<link
			rel="preload"
			as="image"
			type="image/webp"
			imagesrcset={heroFirst.srcset}
			imagesizes="100vw"
			fetchpriority="high"
		/>
	{/if}
</svelte:head>

{#if lead}
	<section
		bind:this={heroEl}
		class="hero relative isolate flex flex-col overflow-hidden bg-ink text-white"
		style={heroH ? `--hero-h: ${heroH}px;` : ''}
		onfocusin={(e) => /** @type {HTMLElement} */ (e.target).matches?.(':focus-visible') && pause()}
		onfocusout={resume}
		aria-roledescription="carousel"
		aria-label="Latest releases"
	>
		<!-- the blur: each cover, enlarged and softened, fills the whole screen -->
		<div class="absolute inset-0 -z-20" aria-hidden="true">
			{#each leads as item, i (item.href)}
				<img
					class="absolute inset-0 h-full w-full scale-110 object-cover blur-[48px] saturate-[1.2] {layer(
						i,
						'opacity-80'
					)}"
					src={item.picture?.thumb ?? item.image}
					alt=""
					loading={i === 0 ? 'eager' : 'lazy'}
				/>
			{/each}
			<div class="absolute inset-0 bg-ink/60 lg:bg-ink/35"></div>
		</div>

		<!-- the cover itself: the largest 16:9 box that fits, never cropped -->
		<div class="cover-area relative -z-10 lg:absolute lg:inset-0">
			<div class="cover relative mx-auto {wide ? 'cover-wide' : ''}">
				{#each leads as item, i (item.href)}
					<Picture
						image={pic(item)}
						class="absolute inset-0 h-full w-full object-cover {layer(i, 'opacity-100')} {i ===
							activeIdx || i === prevIdx
							? 'hero-settle'
							: ''}"
						sizes="100vw"
						alt={i === activeIdx ? item.alt : ''}
						ariaHidden={i !== activeIdx}
						loading={i === 0 ? 'eager' : 'lazy'}
						fetchpriority={i === 0 ? 'high' : 'auto'}
					/>
				{/each}
			</div>
		</div>

		<!-- wide screens: shade where the words sit, the bottom and the left -->
		<div
			class="absolute inset-0 -z-10 hidden lg:block"
			style="background: linear-gradient(0deg, rgba(23,21,15,0.94) 0%, rgba(23,21,15,0.8) 20%, rgba(23,21,15,0.45) 42%, rgba(23,21,15,0) 62%), linear-gradient(90deg, rgba(23,21,15,0.6) 0%, rgba(23,21,15,0.25) 40%, rgba(23,21,15,0) 60%);"
			aria-hidden="true"
		></div>

		<!-- the plate frame; on wide screens the scroll label is set into its bottom edge -->
		<div
			class="fp-fade pointer-events-none absolute inset-3 border border-white/35 md:inset-6"
			style="animation-delay: 400ms;"
			aria-hidden="true"
		>
			<span
				class="absolute bottom-[25px] left-1/2 hidden -translate-x-1/2 px-3 text-[9px] leading-none font-extrabold tracking-[0.32em] text-white/70 uppercase lg:block"
				>Scroll ↓</span
			>
		</div>

		<!-- the cover's credit: on wide screens set into the frame's bottom edge -->
		{#if leadPic?.credit}
			<p
				class="absolute right-10 bottom-2.5 z-10 hidden max-w-[40%] truncate text-right text-[10px] leading-none text-white/65 lg:block"
			>
				{#if leadPic.creditUrl}<a
						href={leadPic.creditUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-white">{leadPic.credit}</a
					>{:else}{leadPic.credit}{/if}
			</p>
		{/if}

		<!-- copy and the release list -->
		<div
			class="flex flex-col px-8 pt-3 pb-10 md:px-16 md:pt-4 md:pb-14 lg:grid lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end lg:justify-end lg:gap-16 lg:px-20 lg:pt-0 lg:pb-20 xl:px-24"
		>
			<div class="min-w-0 [text-shadow:0_1px_14px_rgba(23,21,15,0.55)]">
				<!-- phones and tablets: one bar per release -->
				{#if leads.length > 1}
					<div class="mb-5 flex gap-1.5 lg:hidden" role="tablist" aria-label="Choose a release">
						{#each leads as item, i (item.href)}
							<button
								type="button"
								role="tab"
								aria-selected={i === activeIdx}
								aria-label="Show {item.title}"
								onclick={() => show(i)}
								class="relative h-6 flex-1"
							>
								<span class="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-white/25">
									{#if i === activeIdx}
										{#key cycle}
											<span
												class="hero-progress absolute inset-y-0 left-0 bg-white"
												style="animation-duration: {ROTATE_MS}ms; animation-play-state: {paused ||
												reduced
													? 'paused'
													: 'running'}; {reduced ? 'width: 100%;' : ''}"
											></span>
										{/key}
									{:else if i < activeIdx}
										<span class="absolute inset-0 bg-white/60"></span>
									{/if}
								</span>
							</button>
						{/each}
					</div>
				{/if}

				<!-- the outgoing copy fades away in the same spot as the new copy rises in -->
				<div class="grid">
					{#key activeIdx}
						<div
							class="self-start text-center [grid-area:1/1] lg:self-end lg:text-left {switched
								? 'hero-switched'
								: ''}"
							in:fly={{ y: 10, duration: 750, delay: 180, easing: cubicOut }}
							out:fade={{ duration: 400 }}
						>
							<p
								class="fp-rise text-[10.5px] font-extrabold tracking-[0.24em] text-white/90 uppercase md:text-[11.5px]"
							>
								Latest release · <span class="text-warm-light">{lead.rubric}</span>
							</p>
							<h1
								use:fitTwoLines
								class="fp-rise mx-auto mt-3 line-clamp-2 max-w-[22ch] font-newsreader leading-[1.04] font-semibold tracking-[-0.025em] [text-wrap:balance] md:mt-4 lg:mx-0 lg:max-w-[760px] {titleSize}"
								style="animation-delay: 120ms; text-shadow: 0 2px 30px rgba(23,21,15,0.45);"
							>
								<a href={lead.href} class="hover:text-white/90">{lead.title}</a>
							</h1>
							{#if lead.dek}
								<p
									class="fp-rise mx-auto mt-4 line-clamp-3 max-w-[600px] font-newsreader text-[17px] leading-[1.45] text-white/80 italic md:mt-5 md:text-[19px] lg:mx-0"
									style="animation-delay: 240ms;"
								>
									{lead.dek}
								</p>
							{/if}
							<div
								class="fp-rise mt-6 flex flex-col items-center gap-x-6 gap-y-4 md:mt-7 md:flex-row md:flex-wrap md:justify-center lg:justify-start"
								style="animation-delay: 360ms;"
							>
								<a
									href={lead.href}
									class="inline-flex h-[48px] items-center gap-2 bg-paper-bg px-6 text-[11px] font-extrabold tracking-[0.18em] text-ink uppercase transition-colors [text-shadow:none] hover:bg-warm hover:text-white"
									>{cta(lead)} <span aria-hidden="true">→</span></a
								>
								<FrontByline
									author={lead.author}
									date={lead.date}
									length={lead.length}
									premium={lead.premium}
									onDark
									stack
									class="lg:justify-start"
								/>
							</div>
							{#if leadPic?.credit}
								<p class="mt-5 text-[11px] text-white/55 lg:hidden">
									Cover: {#if leadPic.creditUrl}<a
											href={leadPic.creditUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="underline decoration-white/30 underline-offset-2">{leadPic.credit}</a
										>{:else}{leadPic.credit}{/if}
								</p>
							{/if}
						</div>
					{/key}
				</div>
			</div>

			<!-- wide screens: the releases, numbered -->
			{#if leads.length > 1}
				<ol
					class="hidden border border-white/15 bg-ink/60 px-5 py-1 backdrop-blur-md backdrop-saturate-150 lg:block"
					role="tablist"
					aria-label="Choose a release"
				>
					{#each leads as item, i (item.href)}
						<li class="border-b border-white/15 last:border-b-0">
							<button
								type="button"
								role="tab"
								aria-selected={i === activeIdx}
								onclick={() => show(i)}
								class="group relative grid w-full grid-cols-[34px_1fr] gap-3 py-3.5 text-left"
							>
								<span
									class="ao-cond text-[22px] leading-none font-black tabular-nums {i === activeIdx
										? 'text-warm-light'
										: 'text-white/55 group-hover:text-white/85'}">{pad(i + 1)}</span
								>
								<span class="min-w-0">
									<span
										class="block text-[9px] font-extrabold tracking-[0.2em] uppercase {i ===
										activeIdx
											? 'text-white/70'
											: 'text-white/55'}">{item.rubric}</span
									>
									<span
										class="mt-1 line-clamp-2 block font-newsreader text-[15px] leading-[1.25] font-semibold {i ===
										activeIdx
											? 'text-white'
											: 'text-white/75 group-hover:text-white'}">{item.title}</span
									>
								</span>
								{#if i === activeIdx}
									<span
										class="absolute inset-x-0 -bottom-px h-[2px] bg-white/15"
										aria-hidden="true"
									>
										{#key cycle}
											<span
												class="hero-progress absolute inset-y-0 left-0 bg-warm-light"
												style="animation-duration: {ROTATE_MS}ms; animation-play-state: {paused ||
												reduced
													? 'paused'
													: 'running'}; {reduced ? 'width: 100%;' : ''}"
											></span>
										{/key}
									</span>
								{/if}
							</button>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	</section>
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
							<Picture
								image={pic(first)}
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
								sizes="(min-width: 1024px) 640px, 100vw"
								alt={first.alt}
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
											<Picture
												image={pic(s)}
												class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
												sizes="96px"
												alt={s.alt}
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
	/* Phones and tablets: the whole cover, edge to edge, its bottom edge
	   melting into the blur, with the copy straight below it. The hero is as
	   tall as the two together.
	   The fade is masked on each image, not on .cover: iOS Safari can paint a
	   masked, clipped box with an animated child as nothing at all. */
	.cover {
		aspect-ratio: 16 / 9;
		width: 100%;
	}
	.cover :global(img) {
		-webkit-mask-image: linear-gradient(180deg, #000 80%, transparent);
		mask-image: linear-gradient(180deg, #000 80%, transparent);
	}
	/* Wide screens: the hero fills the screen under the header (JS makes it
	   exact). The cover is the largest 16:9 box that fits, pinned to the top;
	   on screens wider than 16:9 it fits the height and its sides feather out. */
	@media (min-width: 1024px) {
		.hero {
			min-height: 560px;
			height: var(--hero-h, calc(100svh - 70px));
		}
		.cover-area {
			container-type: size;
		}
		.cover {
			width: min(100cqw, 100cqh * 16 / 9);
		}
		.cover :global(img) {
			-webkit-mask-image: linear-gradient(180deg, #000 86%, transparent);
			mask-image: linear-gradient(180deg, #000 86%, transparent);
		}
		.cover-wide :global(img) {
			-webkit-mask-image: linear-gradient(180deg, #000 86%, transparent),
				linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
			-webkit-mask-composite: source-in;
			mask-image: linear-gradient(180deg, #000 86%, transparent),
				linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
			mask-composite: intersect;
		}
	}
	/* The active cover settles from a slight zoom, inside its own box. */
	.cover {
		overflow: hidden;
	}
	:global(.hero-settle) {
		animation: hero-settle 9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}
	@keyframes hero-settle {
		from {
			transform: scale(1.04);
		}
		to {
			transform: scale(1);
		}
	}
	/* After a switch the copy fades in as one block, so the page-load
	   line-by-line rise is switched off inside it. */
	.hero-switched :global(.fp-rise) {
		animation: none;
	}
	/* How long the current release has left on screen. */
	:global(.hero-progress) {
		width: 0;
		animation-name: hero-progress;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}
	@keyframes hero-progress {
		to {
			width: 100%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.hero-settle) {
			animation: none;
		}
	}
</style>
