<!--
  MediaCard — one Studio item in a grid: the picture, what it is, the title,
  and the matchup (matches) or show and guests (episodes, interviews).
  `dark` for cards on an ink band.
-->
<script>
	import MediaFrame from './MediaFrame.svelte';
	import { KIND, byline } from '$lib/studio/kinds.js';

	/** @type {{ item: any, dark?: boolean, sans?: boolean, label?: boolean, sizes?: string }} */
	let { item, dark = false, sans = false, label = true, sizes } = $props();

	// Each part of AGE Studios in its own colour: matches in the Library's
	// blue, shows in gold, partners in purple.
	const tone = $derived(
		dark
			? 'text-warm-light'
			: item.kind === 'gameplay'
				? 'text-warm'
				: item.kind === 'network'
					? 'text-cc-ne'
					: 'text-[#8a6116]'
	);
	const what = $derived(
		item.kind === 'gameplay'
			? 'Match'
			: item.kind === 'network'
				? 'Partner'
				: item.audio
					? 'Listen'
					: KIND[item.kind].short
	);
</script>

<a href={item.href} class="group block">
	<MediaFrame {item} {sizes} />
	{#if label}
		<span class="mt-3 block text-[9.5px] font-extrabold tracking-[0.2em] uppercase {tone}"
			>{what}{item.event?.circuit ? ` · ${item.event.circuit}` : ''}{item.round
				? ` · ${item.round}`
				: ''}</span
		>
	{/if}
	<!-- `sans`: set like the Library's own cards. -->
	<span
		class="mt-1.5 block text-[19px] [text-wrap:balance] {sans
			? 'font-libre leading-[1.2] font-bold tracking-[-0.02em] transition-colors'
			: 'font-newsreader leading-[1.15] font-semibold tracking-[-0.01em]'} {dark
			? 'text-paper-bg'
			: ''} {sans ? (dark ? 'group-hover:text-warm-light' : 'group-hover:text-warm') : ''}"
		>{#if sans}{item.title}{:else}<span class="fp-ul">{item.title}</span>{/if}</span
	>
	{#if byline(item)}
		<span
			class="mt-1 block text-[12.5px] {dark
				? 'text-paper-bg/45'
				: sans
					? 'text-fade'
					: 'text-soft'}">{byline(item)}</span
		>
	{/if}
</a>
