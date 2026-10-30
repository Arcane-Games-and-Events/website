<!--
  VideoThumb — a 16:9 picture for a video row: its cover image when it has
  one, otherwise a still from Mux; the length in the corner; a quiet
  placeholder while it's waiting or processing.
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import { clock, muxThumb } from './format.js';

	/** @type {{ video: any, cover?: any, width?: number, class?: string }} */
	let { video, cover = null, width = 320, class: cls = '' } = $props();
	const src = $derived(video?.status === 'ready' ? muxThumb(video, width) : null);
</script>

<span class="relative block aspect-video overflow-hidden bg-ink {cls}">
	{#if cover}
		<Picture
			image={cover}
			alt=""
			sizes="{width}px"
			class="absolute inset-0 h-full w-full object-cover"
		/>
	{:else if src}
		<img {src} alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" />
	{:else}
		<span
			class="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold tracking-[0.16em] text-paper-bg/50 uppercase"
		>
			{video?.status === 'errored' ? 'Failed' : video?.provider ? 'Processing' : 'No video'}
		</span>
	{/if}
	{#if video?.duration}
		<span
			class="absolute right-0 bottom-0 bg-ink/85 px-1.5 py-0.5 text-[10.5px] text-paper-bg tabular-nums"
			>{clock(video.duration)}</span
		>
	{/if}
</span>
