<!--
  StudiosTabs — AGE Studios' one row of tabs: All, Projects, Shows,
  Partners, and Matches (which live in the Library). Each tab carries its
  section's colour as a small square. On phones the row scrolls sideways,
  with fades and arrows at the edges when there's more.

  Props: current (all | projects | shows | partners)
-->
<script>
	/** @type {{ current: string }} */
	let { current } = $props();

	const TABS = [
		{ id: 'all', label: 'All', href: '/studios', dot: 'bg-ink' },
		{ id: 'projects', label: 'Projects', href: '/studios/projects', dot: 'bg-studio' },
		{ id: 'shows', label: 'Shows', href: '/studios/shows', dot: 'bg-gold' },
		{ id: 'partners', label: 'Partners', href: '/studios/partners', dot: 'bg-cc-ne' },
		{ id: 'matches', label: 'Matches', href: '/library/matches', dot: 'bg-warm', away: true }
	];

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

<nav class="relative border-t border-line" aria-label="AGE Studios">
	<div
		bind:this={row}
		onscroll={edges}
		class="tab-rail mx-auto flex w-full max-w-[1200px] gap-1 px-5 md:px-8"
	>
		{#each TABS as t (t.id)}
			{@const on = t.id === current}
			<a
				href={t.href}
				aria-current={on ? 'page' : undefined}
				class="group flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-3.5 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors first:pl-0 {on
					? 'border-ink text-ink'
					: 'border-transparent text-soft hover:text-ink'}"
			>
				<span class="h-2 w-2 {t.dot}" aria-hidden="true"></span>
				{t.label}
				{#if t.away}<span class="tracking-normal text-fade normal-case" title="In the Library"
						>· Library</span
					>{/if}
			</a>
		{/each}
	</div>
	{#if moreLeft}
		<button
			type="button"
			onclick={() => nudge(-160)}
			aria-label="More tabs"
			class="absolute inset-y-0 left-0 flex w-10 items-center justify-start bg-gradient-to-r from-paper-bg via-paper-bg/90 to-transparent pl-2 text-[13px] md:hidden"
			>‹</button
		>
	{/if}
	{#if moreRight}
		<button
			type="button"
			onclick={() => nudge(160)}
			aria-label="More tabs"
			class="absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-paper-bg via-paper-bg/90 to-transparent pr-2 text-[13px] md:hidden"
			>›</button
		>
	{/if}
</nav>
