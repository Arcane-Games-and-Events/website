<!--
  Rail — a row of cards that scrolls sideways and snaps, with a peek of
  the next card so it reads as "there's more". On wide screens it can
  settle into a grid instead (`grid`), or stay a rail with ← → buttons.
-->
<script>
	/** @type {{ items: any[], card: import('svelte').Snippet<[any]>, grid?: 2 | 3 | 4 | 0, width?: string, label?: string }} */
	let {
		items,
		card,
		grid = 0,
		width = 'w-[78%] sm:w-[46%] md:w-[31%] lg:w-[23.5%]',
		label = 'More'
	} = $props();
	let el = $state(/** @type {HTMLElement | null} */ (null));
	let atStart = $state(true);
	let atEnd = $state(false);

	function measure() {
		if (!el) return;
		atStart = el.scrollLeft < 8;
		atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
	}
	$effect(() => {
		if (!el) return;
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	});
	const step = (dir) => el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
	const GRID = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };
</script>

<div class="relative">
	<ul
		bind:this={el}
		onscroll={measure}
		aria-label={label}
		class="st-rail -mx-5 flex scroll-px-5 gap-4 overflow-x-auto px-5 md:-mx-8 md:scroll-px-8 md:gap-5 md:px-8 {grid
			? `lg:mx-0 lg:grid lg:gap-x-6 lg:gap-y-9 lg:overflow-visible lg:px-0 ${GRID[grid]}`
			: ''}"
	>
		{#each items as item (item.id)}
			<li class="shrink-0 {width} {grid ? 'lg:w-auto' : ''}">{@render card(item)}</li>
		{/each}
	</ul>
	{#if !(atStart && atEnd)}
		{#each [[-1, '←', atStart, 'Back', 'left-0 -translate-x-1/2'], [1, '→', atEnd, 'Forward', 'right-0 translate-x-1/2']] as [dir, glyph, off, word, side] (dir)}
			{#if !off}
				<button
					type="button"
					onclick={() => step(dir)}
					aria-label={word}
					class="absolute top-[28%] z-[2] hidden h-11 w-11 items-center justify-center border border-paper-bg/30 bg-studio-night/90 text-[15px] text-paper-bg shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-colors hover:border-studio-light hover:text-studio-light md:flex {side} {grid
						? 'lg:hidden'
						: ''}">{glyph}</button
				>
			{/if}
		{/each}
	{/if}
</div>
