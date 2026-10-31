<!--
  WatchCard — one Studio item in a grid: the picture, what it is, the title,
  and the matchup (gameplay) or show and guests (episodes, interviews).
  `dark` for cards on an ink band.
-->
<script>
	import WatchFrame from './WatchFrame.svelte';
	import { KIND, byline } from '$lib/studio/kinds.js';

	/** @type {{ item: any, dark?: boolean, label?: boolean, sizes?: string }} */
	let { item, dark = false, label = true, sizes } = $props();
</script>

<a href={item.href} class="group block">
	<WatchFrame {item} {sizes} />
	{#if label}
		<span
			class="mt-3 block text-[9.5px] font-extrabold tracking-[0.2em] uppercase {dark
				? 'text-warm-light'
				: 'text-warm'}"
			>{item.audio ? 'Listen' : KIND[item.kind].short}{item.event?.circuit
				? ` · ${item.event.circuit}`
				: ''}</span
		>
	{/if}
	<span
		class="mt-1.5 block font-newsreader text-[19px] leading-[1.15] font-semibold tracking-[-0.01em] [text-wrap:balance] transition-colors group-hover:text-warm {dark
			? 'text-paper-bg group-hover:text-warm-light'
			: ''}">{item.title}</span
	>
	{#if byline(item)}
		<span class="mt-1 block text-[12.5px] {dark ? 'text-paper-bg/60' : 'text-soft'}"
			>{byline(item)}</span
		>
	{/if}
</a>
