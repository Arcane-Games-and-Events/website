<!--
  StudiosCard — one piece on AGE Studios' night surface: the picture, a
  channel tag in broadcast type, the title, the byline (matchup, show and
  guests, or the creator for AGE Network videos) and when and how long.
-->
<script>
	import WatchFrame from './WatchFrame.svelte';
	import { KIND, byline } from '$lib/studio/kinds.js';
	import { clock } from '$lib/desk/video/format.js';

	/** @type {{ item: any, sizes?: string, square?: boolean, big?: boolean }} */
	let { item, sizes = '(min-width: 1024px) 300px, 78vw', square = false, big = false } = $props();

	const tag = $derived(
		[
			item.audio ? 'Listen' : KIND[item.kind]?.short,
			item.event?.circuit,
			item.kind === 'podcast' && item.show?.name
		]
			.filter(Boolean)
			.join(' · ')
	);
	const line = $derived(
		item.kind === 'podcast' ? (item.guests ? `with ${item.guests}` : '') : byline(item)
	);
	const when = (d) =>
		d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
</script>

<a href={item.href} class="group block">
	<WatchFrame {item} {sizes} {square} />
	<span
		class="st-wide mt-3 block truncate text-[9px] font-bold tracking-[0.16em] text-studio-light uppercase"
		>{tag}</span
	>
	<span
		class="mt-1.5 block font-newsreader {big
			? 'text-[24px] md:text-[28px]'
			: 'text-[18px]'} leading-[1.14] font-semibold tracking-[-0.01em] [text-wrap:balance] text-paper-bg transition-colors group-hover:text-studio-light"
		>{item.title}</span
	>
	{#if line}
		<span class="mt-1 flex items-center gap-1.5 text-[12.5px] text-studio-mute">
			{#if item.network && item.creator?.avatar}
				<img src={item.creator.avatar} alt="" class="h-4 w-4 object-cover" loading="lazy" />
			{/if}
			<span class="truncate">{line}</span>
		</span>
	{/if}
	<span class="mt-1 block text-[11.5px] text-studio-mute/80 tabular-nums"
		>{[when(item.publishedAt), item.duration ? clock(item.duration) : '']
			.filter(Boolean)
			.join(' · ')}</span
	>
</a>
