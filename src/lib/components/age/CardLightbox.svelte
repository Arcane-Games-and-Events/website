<script>
	/**
	 * Full-screen card viewer for phones: the card on a dark backdrop, its
	 * pitch and name, and previous / next by button, arrow key or swipe.
	 * Used by the decklist page and by card links in articles (CardHover).
	 *
	 * `card`: { name, imageUrl, fallbackUrl, label, hex }
	 * `aside`: optional snippet on the right of the caption ("2× in deck",
	 * a link out).
	 *
	 * @type {{
	 *   card: { name: string, imageUrl?: string | null, fallbackUrl?: string | null, label: string, hex: string },
	 *   index?: number,
	 *   total?: number,
	 *   hint?: string,
	 *   onstep: (delta: number) => void,
	 *   onclose: () => void,
	 *   aside?: import('svelte').Snippet
	 * }}
	 */
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		card,
		index = 0,
		total = 1,
		hint = 'Swipe to flip through the list',
		onstep,
		onclose,
		aside
	} = $props();

	// Image state, keyed to the card so it resets when the reader steps
	const cardKey = $derived(`${card.name}|${card.imageUrl}`);
	let fallbackFor = $state(null);
	let loadedSrc = $state(null);
	let failedSrc = $state(null);
	const src = $derived(
		fallbackFor === cardKey ? card.fallbackUrl : card.imageUrl || card.fallbackUrl || null
	);
	const loaded = $derived(!!src && loadedSrc === src);
	const failed = $derived(!src || failedSrc === src);

	function onError() {
		if (fallbackFor !== cardKey && card.fallbackUrl && card.fallbackUrl !== src) {
			fallbackFor = cardKey;
		} else {
			failedSrc = src;
		}
	}

	const many = $derived(total > 1);

	function onKeydown(e) {
		if (e.key === 'Escape') onclose();
		else if (many && e.key === 'ArrowRight') onstep(1);
		else if (many && e.key === 'ArrowLeft') onstep(-1);
	}

	let touchX = 0;
	function onTouchStart(e) {
		touchX = e.touches[0].clientX;
	}
	function onTouchEnd(e) {
		const dx = e.changedTouches[0].clientX - touchX;
		if (many && Math.abs(dx) > 50) onstep(dx < 0 ? 1 : -1);
	}

	// Keep the page behind still while the viewer is open
	onMount(() => {
		const before = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => (document.body.style.overflow = before);
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div
	class="fixed inset-0 z-50 flex flex-col"
	role="dialog"
	aria-modal="true"
	aria-label="Card preview: {card.name}"
	tabindex="-1"
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
	transition:fade|global={{ duration: 180 }}
>
	<!-- backdrop: tap outside the card to close; Escape is handled on the window -->
	<button
		type="button"
		onclick={onclose}
		aria-label="Close card preview"
		class="absolute inset-0 cursor-default bg-ink/90 backdrop-blur-md"
		tabindex="-1"
	></button>

	<!-- top bar -->
	<div class="relative flex items-center justify-between px-5 pt-5 text-paper-bg">
		<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-paper-bg/60 uppercase tabular-nums">
			{#if many}Card {index + 1} <span class="text-paper-bg/35">/ {total}</span>{/if}
		</p>
		<button
			type="button"
			onclick={onclose}
			class="flex h-10 w-10 items-center justify-center border border-paper-bg/30 text-[18px] leading-none transition-colors hover:bg-paper-bg hover:text-ink"
			aria-label="Close">×</button
		>
	</div>

	<!-- card -->
	<div
		class="pointer-events-none relative flex min-h-0 flex-1 items-center justify-center px-8 py-4"
	>
		{#key cardKey}
			<div
				class="pointer-events-auto relative aspect-[488/680] h-full max-h-[62vh] max-w-full"
				in:fly={{ y: 14, duration: 260, easing: cubicOut }}
			>
				{#if !loaded && !failed}
					<div class="absolute inset-0 flex items-center justify-center">
						<span class="h-6 w-6 animate-spin border-2 border-paper-bg/20 border-t-warm-light"
						></span>
					</div>
				{/if}
				{#if failed}
					<p
						class="absolute inset-0 flex items-center justify-center border border-paper-bg/20 px-6 text-center text-[10px] font-extrabold tracking-[0.16em] text-paper-bg/60 uppercase"
					>
						Image unavailable
					</p>
				{:else}
					{#key src}
						<!-- Hero portraits stand in for missing hero cards; crop them like a card -->
						<img
							{src}
							alt={card.name || ''}
							class="h-full w-full {src.startsWith('/hero_images/')
								? 'object-cover object-[75%_20%]'
								: 'object-contain'} drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)] transition-opacity duration-300 {loaded
								? 'opacity-100'
								: 'opacity-0'}"
							onload={() => (loadedSrc = src)}
							onerror={onError}
						/>
					{/key}
				{/if}
			</div>
		{/key}
	</div>

	<!-- caption + controls -->
	<div class="relative px-5 pb-[max(20px,env(safe-area-inset-bottom))] text-paper-bg">
		<div
			class="flex items-end justify-between gap-4 border-t-[3px] pt-3"
			style="border-color: {card.hex};"
		>
			<div class="min-w-0">
				<p
					class="flex items-center gap-2 text-[9px] font-extrabold tracking-[0.2em] uppercase"
					style="color: {card.hex};"
				>
					<span class="h-2 w-2 bg-current" aria-hidden="true"></span>
					{card.label}
				</p>
				<p class="mt-1.5 truncate font-newsreader text-[22px] leading-tight font-semibold">
					{card.name}
				</p>
			</div>
			{#if aside}{@render aside()}{/if}
		</div>
		{#if many}
			<div class="mt-4 grid grid-cols-2 gap-px bg-paper-bg/20">
				<button
					type="button"
					onclick={() => onstep(-1)}
					class="flex min-h-[48px] items-center justify-center gap-2 bg-ink text-[10px] font-extrabold tracking-[0.18em] uppercase transition-colors hover:bg-paper-bg hover:text-ink"
					><span aria-hidden="true">←</span> Previous</button
				>
				<button
					type="button"
					onclick={() => onstep(1)}
					class="flex min-h-[48px] items-center justify-center gap-2 bg-ink text-[10px] font-extrabold tracking-[0.18em] uppercase transition-colors hover:bg-paper-bg hover:text-ink"
					>Next <span aria-hidden="true">→</span></button
				>
			</div>
			<p class="mt-3 text-center font-newsreader text-[12px] text-paper-bg/45 italic">{hint}</p>
		{/if}
	</div>
</div>
