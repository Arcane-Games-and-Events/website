<script>
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import FrontByline from './FrontByline.svelte';
	import Picture from '$lib/components/media/Picture.svelte';

	/**
	 * The front page's opening, in the Academy hero's shape on black: the
	 * newest Library releases one at a time, the cover full-bleed behind the
	 * headline, the way in, and tabs along the foot whose bar fills while
	 * each release is showing. The picture fades into black behind the words:
	 * from the left on wide screens, from the bottom on phones.
	 */
	/** @type {{ leads?: any[] }} */
	let { leads = [] } = $props();

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
