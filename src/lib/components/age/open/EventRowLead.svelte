<script>
	/**
	 * The first two cells of an upcoming-event row: the date stub (tinted in
	 * the circuit colour, perforated edge) and, from md, the circuit photo
	 * fading in from that colour. Used by the Events tab and the AGE Open
	 * hub, whose rows differ after these cells.
	 *
	 * @type {{ event: { circuit: string, month: string, day: string, image: string }, weekday?: string }}
	 */
	import { circuitVar } from '$lib/data/circuits.js';

	let { event: e, weekday = '' } = $props();
</script>

<span
	class="relative row-span-2 flex flex-col items-center justify-center py-4 md:row-span-1"
	style="background: color-mix(in srgb, {circuitVar(e.circuit)} 10%, var(--ed-paper));"
>
	<span class="text-[10px] font-extrabold tracking-[0.18em]" style="color: {circuitVar(e.circuit)};"
		>{e.month}</span
	>
	<span class="ao-cond text-[46px] leading-[0.85] font-black tabular-nums md:text-[54px]"
		>{e.day}</span
	>
	{#if weekday}
		<span class="mt-1 text-[8.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
			>{weekday}</span
		>
	{/if}
	<span class="ao-perf absolute inset-y-2 right-0 w-px text-line2" aria-hidden="true"></span>
</span>
<span class="relative hidden overflow-hidden bg-ink md:block">
	<img
		src={e.image}
		alt=""
		loading="lazy"
		class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
	/>
	<span
		class="absolute inset-0"
		style="background: linear-gradient(90deg, color-mix(in srgb, {circuitVar(
			e.circuit
		)} 55%, transparent) 0%, transparent 85%);"
		aria-hidden="true"
	></span>
</span>
