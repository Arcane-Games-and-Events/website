<script>
	/**
	 * The figures row: a hairline grid of big numerals with small-caps labels
	 * and an optional note under each.
	 *
	 * @type {{ items: { label: string, value: string, note?: string, tone?: string }[], cols?: string }}
	 */
	let { items = [], cols = 'md:grid-cols-3 xl:grid-cols-6' } = $props();
</script>

<dl class="grid grid-cols-2 gap-px border border-line2 bg-line2 {cols}">
	{#each items as f (f.label)}
		<div class="bg-paper-bg px-4 py-4 md:px-5">
			<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">{f.label}</dt>
			<dd class="ao-cond mt-2 text-[30px] leading-none font-black tabular-nums {f.tone || ''}">
				{f.value}
			</dd>
			{#if f.note}<dd class="mt-1.5 text-[11px] text-soft">{f.note}</dd>{/if}
		</div>
	{/each}
</dl>
