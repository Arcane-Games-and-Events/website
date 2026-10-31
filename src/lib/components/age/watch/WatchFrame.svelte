<!--
  WatchFrame — the picture for a Studio item: its cover, else a frame from
  the video, else (audio with no cover) a dark plate with a note. The
  length sits in a corner, Premium in the other, and a play mark shows on
  hover. `square` is for podcast art.
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import { clock } from '$lib/desk/video/format.js';

	/** @type {{ item: any, square?: boolean, sizes?: string, eager?: boolean, class?: string }} */
	let {
		item,
		square = false,
		sizes = '(min-width: 1024px) 400px, 100vw',
		eager = false,
		class: cls = ''
	} = $props();
</script>

<span
	class="relative block overflow-hidden bg-[#0d0f12] {square
		? 'aspect-square'
		: 'aspect-video'} {cls}"
>
	{#if item.cover}
		<Picture
			image={item.cover}
			{sizes}
			alt=""
			loading={eager ? 'eager' : 'lazy'}
			class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
		/>
	{:else if item.still}
		<img
			src={item.still}
			alt=""
			loading={eager ? 'eager' : 'lazy'}
			class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
		/>
	{:else}
		<span
			class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1b2030] to-[#0d0f12] px-4 text-center font-newsreader text-[18px] text-paper-bg/70 italic"
			>{item.audio ? '♪' : item.title}</span
		>
	{/if}
	{#if item.isPremium}<PremiumTag variant="corner" size="sm" />{/if}
	<span
		class="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center bg-warm pl-[2px] text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
		aria-hidden="true">{item.audio ? '♪' : '▶'}</span
	>
	{#if item.duration}
		<span
			class="absolute bottom-0 left-0 bg-ink/85 px-2 py-0.5 font-newsreader text-[12px] text-paper-bg tabular-nums"
			>{clock(item.duration)}</span
		>
	{/if}
</span>
