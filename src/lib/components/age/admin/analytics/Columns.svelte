<script>
	/**
	 * Monthly stacked columns. Each month has named parts stacked from the
	 * baseline; a legend names the parts. Hovering a month shows its values.
	 *
	 * @type {{
	 *   months: { label: string, [k: string]: any }[],
	 *   parts: { key: string, label: string, color: string }[],
	 *   format?: (n: number) => string,
	 *   height?: number
	 * }}
	 */
	let { months = [], parts = [], format = (n) => String(n), height = 200 } = $props();

	const totals = $derived(
		months.map((m) => parts.reduce((s, p) => s + (Number(m[p.key]) || 0), 0))
	);
	const max = $derived(Math.max(1, ...totals));
	let focus = $state(-1);
</script>

<div class="relative">
	<div
		class="flex items-end gap-[6px]"
		style="height: {height}px;"
		role="img"
		aria-label="Monthly columns"
	>
		{#each months as m, i (m.label)}
			<div
				class="group relative flex h-full flex-1 flex-col-reverse items-stretch"
				onmouseenter={() => (focus = i)}
				onmouseleave={() => (focus = -1)}
				role="presentation"
			>
				{#each parts as p (p.key)}
					{@const v = Number(m[p.key]) || 0}
					{#if v > 0}
						<div
							class="w-full"
							style="height: {(v / max) * 100}%; background: {p.color}; margin-top: 2px;"
							title="{m.label} · {p.label}: {format(v)}"
						></div>
					{/if}
				{/each}
				{#if focus === i}
					<div
						class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 border border-ink bg-paper-bg px-3 py-2 text-[11px]"
					>
						<div class="font-extrabold tracking-[0.12em] uppercase">{m.label}</div>
						{#each parts as p (p.key)}
							<div class="flex justify-between gap-4">
								<span class="flex items-center gap-1.5"
									><span class="inline-block h-2 w-2" style="background: {p.color};"
									></span>{p.label}</span
								>
								<span class="tabular-nums">{format(Number(m[p.key]) || 0)}</span>
							</div>
						{/each}
						<div class="mt-1 flex justify-between gap-4 border-t border-line2 pt-1 font-semibold">
							<span>Total</span><span class="tabular-nums">{format(totals[i])}</span>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
	<div class="mt-2 flex gap-[6px] border-t border-line2 pt-2">
		{#each months as m, i (m.label)}
			<div class="flex-1 truncate text-center text-[9px] tracking-[0.06em] text-fade uppercase">
				{months.length > 8 && i % 2 ? '' : m.label.split(' ')[0]}
			</div>
		{/each}
	</div>
	<ul class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-soft">
		{#each parts as p (p.key)}
			<li class="flex items-center gap-1.5">
				<span class="inline-block h-2.5 w-2.5" style="background: {p.color};"></span>{p.label}
			</li>
		{/each}
	</ul>
</div>
