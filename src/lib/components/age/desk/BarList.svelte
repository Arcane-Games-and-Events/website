<script>
	/**
	 * Ranked horizontal bars — label, a thin bar scaled to the largest
	 * value, and the value at the bar's tip. Single series, so no legend.
	 *
	 * @type {{ items: { key: string, n: number }[], color?: string, format?: (n: number) => string, total?: number }}
	 */
	let { items = [], color = '#2563eb', format = (n) => n.toLocaleString(), total = 0 } = $props();
	const max = $derived(Math.max(1, ...items.map((i) => i.n)));
	const sum = $derived(total || items.reduce((s, i) => s + i.n, 0));
</script>

{#if items.length}
	<ol class="space-y-2.5">
		{#each items as it (it.key)}
			<li>
				<div class="flex items-baseline justify-between gap-3 text-[13px]">
					<span class="min-w-0 truncate">{it.key}</span>
					<span class="shrink-0 tabular-nums"
						><span class="font-semibold">{format(it.n)}</span>{#if sum}<span
								class="ml-1.5 text-[11px] text-fade">{Math.round((it.n / sum) * 100)}%</span
							>{/if}</span
					>
				</div>
				<div class="mt-1 h-[6px] bg-line" aria-hidden="true">
					<div class="h-full" style="width: {(it.n / max) * 100}%; background: {color};"></div>
				</div>
			</li>
		{/each}
	</ol>
{:else}
	<p class="font-newsreader text-[15px] text-soft italic">No data for this period yet.</p>
{/if}
