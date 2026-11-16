<!--
  CircuitRace — the AGE season across every circuit: each circuit's code
  block and name, its eight Opens as segments (played in its colour,
  scheduled outlined, open dashed) and the counts. The store's own circuit
  is marked.

  Props: circuits ({ name, short, color, mine, played, scheduled, open }[]),
  target (8)
-->
<script>
	/** @type {{ circuits: any[], target: number }} */
	let { circuits, target } = $props();
</script>

<ul class="flex flex-col gap-4">
	{#each circuits as c (c.name)}
		<li class="flex items-center gap-3.5">
			<span
				class="ao-cond flex h-[38px] w-[44px] shrink-0 items-center justify-center text-[19px] leading-none font-black text-white"
				style="background: {c.color};">{c.short}</span
			>
			<div class="min-w-0 flex-1">
				<p class="flex items-baseline justify-between gap-3">
					<span class="truncate text-[13px] font-bold"
						>{c.name}{#if c.mine}<span
								class="ml-2 text-[8.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>You</span
							>{/if}</span
					>
					<span class="shrink-0 text-[11px] text-soft tabular-nums"
						><b class="text-ink">{c.played}</b> played · {c.scheduled} ahead</span
					>
				</p>
				<span class="mt-1.5 grid grid-cols-8 gap-[3px]" aria-hidden="true">
					{#each Array.from({ length: target }) as _, i (i)}
						<span
							class="h-[8px] {i < c.played
								? ''
								: i < c.played + c.scheduled
									? 'border'
									: 'border border-dashed border-line2'}"
							style={i < c.played
								? `background: ${c.color}`
								: i < c.played + c.scheduled
									? `border-color: ${c.color}`
									: ''}
						></span>
					{/each}
				</span>
			</div>
		</li>
	{/each}
</ul>
