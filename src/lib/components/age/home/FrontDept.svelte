<script>
	/**
	 * Department header — small-caps title between rules,
	 * a short rust accent beneath, optional italic strap + link.
	 */
	/** @type {{ id: string, title: string, strap?: string, href?: string, label?: string, dark?: boolean }} */
	let { id, title, strap = '', href = '', label = 'See all', dark = false } = $props();
	const rule = $derived(dark ? 'bg-paper-bg/30' : 'bg-ink');
</script>

<div {id} class="scroll-mt-6">
	<div class="flex items-center gap-4 md:gap-6">
		<span class="h-px flex-1 {rule}"></span>
		<h2 class="flex items-baseline gap-3 whitespace-nowrap md:gap-4">
			<span
				class="font-newsreader text-[17px] font-semibold tracking-[0.22em] uppercase md:text-[20px]"
			>
				{title}
			</span>
		</h2>
		<span class="h-px flex-1 {rule}"></span>
	</div>
	<div class="mt-2 flex justify-center" aria-hidden="true">
		<span class="h-[3px] w-10 bg-warm"></span>
	</div>
	{#if strap || href}
		<div class="mt-3 flex items-baseline justify-between gap-4 md:mt-4">
			<p
				class="font-newsreader text-[15px] italic md:text-[17px] {dark
					? 'text-paper-bg/70'
					: 'text-soft'}"
			>
				{strap}
			</p>
			{#if href}
				<a
					{href}
					class="shrink-0 text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors hover:text-warm"
				>
					{label} →
				</a>
			{/if}
		</div>
	{/if}
</div>
