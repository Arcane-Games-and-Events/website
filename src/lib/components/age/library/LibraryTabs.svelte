<!--
  LibraryTabs — the Library's sections in one row: All, Articles, Videos,
  Matches, Topics, each with how many it holds. The one you're on is
  underlined in the Library's blue. On phones the row scrolls sideways,
  with a fade and arrow at whichever edge has more.

  Props: current (all | articles | videos | matches | topics | search), counts
-->
<script>
	/** @type {{ current?: string, counts: { articles: number, videos: number, matches: number, topics: number } }} */
	let { current = '', counts } = $props();

	const TABS = $derived([
		{ id: 'all', label: 'All', href: '/library', n: null },
		{ id: 'articles', label: 'Articles', href: '/library/articles', n: counts.articles },
		{ id: 'videos', label: 'Videos', href: '/library/videos', n: counts.videos },
		{ id: 'matches', label: 'Matches', href: '/library/matches', n: counts.matches },
		{ id: 'topics', label: 'Topics', href: '/library/topics', n: counts.topics }
	]);

	/** @type {HTMLElement | undefined} */
	let row = $state();
	let moreLeft = $state(false);
	let moreRight = $state(false);
	function edges() {
		if (!row) return;
		moreLeft = row.scrollLeft > 4;
		moreRight = row.scrollLeft + row.clientWidth < row.scrollWidth - 4;
	}
	$effect(() => {
		if (!row) return;
		edges();
		const ro = new ResizeObserver(edges);
		ro.observe(row);
		return () => ro.disconnect();
	});
	const nudge = (by) => row?.scrollBy({ left: by, behavior: 'smooth' });
</script>

<nav class="relative border-t border-white/10" aria-label="The Library">
	<div
		bind:this={row}
		onscroll={edges}
		class="tab-rail mx-auto flex w-full max-w-[1200px] gap-7 px-5 md:gap-9 md:px-8"
	>
		{#each TABS as t (t.id)}
			{@const on = t.id === current}
			<a
				href={t.href}
				aria-current={on ? 'page' : undefined}
				aria-label={t.n == null ? t.label : `${t.label}: ${t.n}`}
				class="relative flex shrink-0 items-baseline gap-2 py-4 text-[14px] font-semibold whitespace-nowrap transition-colors {on
					? 'text-white'
					: 'text-white/55 hover:text-white'}"
			>
				{t.label}
				{#if t.n != null}<span
						class="text-[11px] font-medium tabular-nums {on ? 'text-warm-light' : 'text-white/40'}"
						>{t.n}</span
					>{/if}
				<span
					class="absolute inset-x-0 bottom-0 h-[2px] transition-colors {on
						? 'bg-warm-light'
						: 'bg-transparent'}"
					aria-hidden="true"
				></span>
			</a>
		{/each}
	</div>
	{#if moreLeft}
		<button
			type="button"
			onclick={() => nudge(-160)}
			aria-label="More sections"
			class="absolute inset-y-0 left-0 flex w-10 items-center justify-start bg-gradient-to-r from-warm-deep via-warm-deep/90 to-transparent pl-2 text-white md:hidden"
			>‹</button
		>
	{/if}
	{#if moreRight}
		<button
			type="button"
			onclick={() => nudge(160)}
			aria-label="More sections"
			class="absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-warm-deep via-warm-deep/90 to-transparent pr-2 text-white md:hidden"
			>›</button
		>
	{/if}
</nav>
