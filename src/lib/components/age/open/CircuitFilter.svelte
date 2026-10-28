<script>
	/**
	 * "Circuit" filter: All plus one button per circuit, each with its colour
	 * swatch. Two columns on phones, a row from md. Used by the Results and
	 * Decklists tabs.
	 *
	 * @type {{ value: string, id: string, labelClass: string }}
	 */
	import { circuitVar, getCircuitNames } from '$lib/data/circuits.js';

	let { value = $bindable('all'), id, labelClass } = $props();

	const OPTIONS = [['all', 'All'], ...getCircuitNames().map((c) => [c, c])];
</script>

<div class="min-w-0 lg:shrink-0">
	<p class={labelClass} id="{id}-circuit-label">Circuit</p>
	<div
		class="mt-2 grid grid-cols-2 gap-px border border-line2 bg-line2 md:flex [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1"
		role="group"
		aria-labelledby="{id}-circuit-label"
	>
		{#each OPTIONS as [v, l] (v)}
			<button
				type="button"
				onclick={() => (value = v)}
				aria-pressed={value === v}
				class="flex min-h-[44px] items-center gap-2.5 px-3.5 text-left text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors md:px-3 {value ===
				v
					? 'bg-ink text-paper-bg'
					: 'bg-paper-bg text-soft hover:bg-paper hover:text-ink'}"
			>
				<span
					class="h-2.5 w-2.5 shrink-0"
					style="background: {v === 'all' ? 'var(--ed-warm)' : circuitVar(v)};"
					aria-hidden="true"
				></span>
				{l}
			</button>
		{/each}
	</div>
</div>
