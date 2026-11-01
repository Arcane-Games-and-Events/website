<script>
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import FrontByline from './FrontByline.svelte';
	import FormatTag from '../FormatTag.svelte';
	import Picture from '$lib/components/media/Picture.svelte';

	/**
	 * The front page's opening, in the Academy hero's shape on black: the
	 * newest Library releases one at a time, the cover full-bleed behind the
	 * headline, the way in, and tabs along the foot whose bar fills while
	 * each release is showing. The picture fades into black behind the words:
	 * from the left on wide screens, from the bottom on phones. Below the hero, "The Latest" is a mixed
	 * strip of pieces, events and courses.
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

	// ============ headline ============
	// The headline is held to two lines. It starts at the screen's full size
	// and steps down until it fits, never below a floor; the two-line clamp
	// in the markup catches anything longer still. The size classes are the
	// first guess before JS runs.
	const titleSize = $derived.by(() => {
		const n = (lead?.title || '').length;
		if (n <= 34) return 'text-[38px] md:text-[52px] lg:text-[40px] xl:text-[46px]';
		if (n <= 60) return 'text-[30px] md:text-[40px] lg:text-[34px] xl:text-[38px]';
		return 'text-[26px] md:text-[34px] lg:text-[30px] xl:text-[33px]';
	});
	const TITLE_SIZES = [
		// [min screen width, largest size, smallest size]
		[1280, 46, 30],
		[1024, 40, 28],
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
	// The full image-library shape when the story has one (AVIF / WebP copies,
	// blur, credit), else just its plain image.
	const pic = (item) => item?.picture ?? { src: item?.image, srcset: item?.srcset, alt: item?.alt };
	const leadPic = $derived(pic(lead));
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
		class="relative isolate overflow-hidden bg-ink text-white"
		onfocusin={(e) => /** @type {HTMLElement} */ (e.target).matches?.(':focus-visible') && pause()}
		onfocusout={resume}
		aria-roledescription="carousel"
		aria-label="Latest releases"
	>
		<!-- the cover: full-bleed, fading into black where the words sit -->
		{#key lead.href}
			<div
				class="hl-fade relative aspect-video w-full overflow-hidden md:absolute md:inset-0 md:aspect-auto"
			>
				<Picture
					image={leadPic}
					class="hl-zoom absolute inset-0 h-full w-full object-cover"
					sizes="100vw"
					alt={lead.alt}
					loading="eager"
					fetchpriority={activeIdx === 0 ? 'high' : 'auto'}
				/>
				<span
					class="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent md:bg-gradient-to-r md:from-ink md:via-ink/75 md:to-transparent lg:bg-[linear-gradient(90deg,var(--ed-ink)_0%,rgb(23_21_15/0.75)_38%,rgb(23_21_15/0)_85%)]"
					aria-hidden="true"
				></span>
				<span
					class="absolute inset-x-0 bottom-0 hidden h-40 bg-gradient-to-t from-ink to-transparent md:block"
					aria-hidden="true"
				></span>
			</div>
		{/key}

		{#if leadPic?.credit}
			<p
				class="absolute right-5 bottom-3 z-10 hidden max-w-[40%] truncate text-right text-[10px] leading-none text-white/55 md:right-8 md:block"
			>
				{#if leadPic.creditUrl}<a
						href={leadPic.creditUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="hover:text-white">{leadPic.credit}</a
					>{:else}{leadPic.credit}{/if}
			</p>
		{/if}

		<div
			class="relative mx-auto -mt-12 w-full max-w-[1200px] px-5 pb-10 md:mt-0 md:flex md:min-h-[min(78vh,760px)] md:flex-col md:justify-end md:px-8 md:pt-28 md:pb-14"
		>
			<!-- the outgoing copy fades away in the same spot as the new copy rises in -->
			<div class="grid">
				{#key activeIdx}
					<div
						class="max-w-[680px] [grid-area:1/1] {switched ? 'hero-switched' : ''}"
						in:fly={{ y: 10, duration: 750, delay: 180, easing: cubicOut }}
						out:fade={{ duration: 400 }}
					>
						<p
							class="fp-rise flex items-center gap-2 text-[10px] font-extrabold tracking-[0.24em] text-warm-light uppercase"
						>
							<span aria-hidden="true">◆</span> Latest release · {lead.rubric}
						</p>
						<h1
							use:fitTwoLines
							class="fp-rise mt-3 line-clamp-2 font-newsreader leading-[1.04] font-semibold tracking-[-0.025em] [text-wrap:balance] {titleSize}"
							style="animation-delay: 120ms;"
						>
							<a href={lead.href} class="hover:text-white/90">{lead.title}</a>
						</h1>
						{#if lead.dek}
							<p
								class="fp-rise mt-3 line-clamp-3 max-w-[560px] font-newsreader text-[18px] leading-[1.35] text-white/80 italic md:text-[21px] lg:text-[19px]"
								style="animation-delay: 240ms;"
							>
								{lead.dek}
							</p>
						{/if}
						<div
							class="fp-rise mt-6 flex flex-col items-start gap-x-6 gap-y-4 sm:flex-row sm:items-center"
							style="animation-delay: 360ms;"
						>
							<a
								href={lead.href}
								class="inline-flex items-center gap-2 bg-paper-bg px-5 py-3.5 text-[11px] font-extrabold tracking-[0.14em] whitespace-nowrap text-ink uppercase transition-colors hover:bg-warm hover:text-white"
							>
								{cta(lead)} <span aria-hidden="true">→</span>
							</a>
							<FrontByline
								author={lead.author}
								date={lead.date}
								length={lead.length}
								premium={lead.premium}
								onDark
							/>
						</div>
						{#if leadPic?.credit}
							<p class="mt-5 text-[11px] text-white/55 md:hidden">
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

			<!-- the releases: a bar fills along the top of the one showing -->
			{#if leads.length > 1}
				<div
					class="st-rail -mx-5 mt-8 flex scroll-px-5 gap-2 overflow-x-auto px-5 md:mx-0 md:mt-12 md:px-0"
					role="tablist"
					aria-label="Choose a release"
				>
					{#each leads as item, i (item.href)}
						<button
							type="button"
							role="tab"
							aria-selected={i === activeIdx}
							onclick={() => show(i)}
							class="group relative w-[44%] shrink-0 pt-3 text-left sm:w-[30%] md:w-[260px]"
						>
							<span
								class="absolute inset-x-0 top-0 h-[2px] transition-colors {i === activeIdx
									? 'bg-white/25'
									: 'bg-white/20 group-hover:bg-white/60'}"
								aria-hidden="true"
							>
								{#if i === activeIdx}
									{#key cycle}
										<span
											class="hero-progress absolute inset-y-0 left-0 bg-warm-light"
											style="animation-duration: {ROTATE_MS}ms; animation-play-state: {paused ||
											reduced
												? 'paused'
												: 'running'}; {reduced ? 'width: 100%;' : ''}"
										></span>
									{/key}
								{/if}
							</span>
							<span
								class="block truncate font-jost text-[12px] font-bold tracking-[0.06em] uppercase {i ===
								activeIdx
									? 'text-white'
									: 'text-white/55 group-hover:text-white'}">{item.rubric}</span
							>
							<span
								class="mt-0.5 line-clamp-2 block font-newsreader text-[14px] leading-[1.25] {i ===
								activeIdx
									? 'text-white/80'
									: 'text-white/45 group-hover:text-white/75'}">{item.title}</span
							>
						</button>
					{/each}
				</div>
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
	/* A new cover fades in and settles from a slight zoom. */
	.hl-fade {
		animation: hl-fade 700ms ease both;
	}
	:global(.hl-zoom) {
		animation: hl-zoom 9s cubic-bezier(0.22, 0.61, 0.36, 1) both;
	}
	@keyframes hl-fade {
		from {
			opacity: 0;
		}
	}
	@keyframes hl-zoom {
		from {
			transform: scale(1.04);
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
		.hl-fade,
		:global(.hl-zoom) {
			animation: none;
		}
	}
</style>
