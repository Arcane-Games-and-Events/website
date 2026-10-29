<script>
	/**
	 * One 100% bar split into parts, with a legend (always) and direct labels
	 * inside segments wide enough to hold them. 2px surface gap between parts.
	 *
	 * @type {{ parts: { key: string, n: number, pct: number | null, color: string, ink?: string }[], format?: (n: number) => string }}
	 */
	let { parts = [], format = (n) => n.toLocaleString() } = $props();
	const shown = $derived(parts.filter((p) => p.n > 0));
</script>

{#if shown.length}
	<div
		class="flex h-9 gap-[2px]"
		role="img"
		aria-label={parts.map((p) => `${p.key} ${p.pct ?? 0}%`).join(', ')}
	>
		{#each shown as p (p.key)}
			<div
				class="flex h-full min-w-[3px] items-center overflow-hidden px-2"
				style="width: {p.pct}%; background: {p.color};"
				title="{p.key}: {p.pct}%"
			>
				{#if (p.pct ?? 0) >= 14}
					<span class="text-[11.5px] font-bold whitespace-nowrap" style="color: {p.ink || '#fff'};"
						>{p.pct}%</span
					>
				{/if}
			</div>
		{/each}
	</div>
	<ul class="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
		{#each parts as p (p.key)}
			<li class="flex items-center gap-2">
				<span class="h-3 w-3" style="background: {p.color};" aria-hidden="true"></span>
				<span class="font-semibold">{p.key}</span>
				<span class="text-soft tabular-nums">{p.pct ?? 0}% · {format(p.n)}</span>
			</li>
		{/each}
	</ul>
{:else}
	<p class="font-newsreader text-[15px] text-soft italic">No data for this period yet.</p>
{/if}
