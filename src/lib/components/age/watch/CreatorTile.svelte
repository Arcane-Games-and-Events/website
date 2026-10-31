<!--
  CreatorTile — an AGE Network creator: their square picture, name, what
  they make and how many of their videos are on AGE Studios.
-->
<script>
	/** @type {{ creator: any, sizes?: string }} */
	let { creator: c } = $props();
</script>

<a href="/studios/network/{c.slug}" class="group block">
	<span class="relative block aspect-square overflow-hidden bg-studio-panel">
		{#if c.avatar}
			<img
				src={c.avatar}
				alt=""
				loading="lazy"
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
			/>
		{:else}
			<span
				class="st-wide absolute inset-0 flex items-center justify-center p-3 text-center text-[15px] font-black text-paper-bg uppercase"
				>{c.name}</span
			>
		{/if}
		<span
			class="st-wide absolute top-0 left-0 bg-studio-night/85 px-1.5 py-1 text-[8.5px] font-bold tracking-[0.16em] text-studio-light uppercase"
			>{c.kind === 'podcast' ? 'Podcast' : 'Video'}</span
		>
	</span>
	<span
		class="mt-2.5 block truncate font-newsreader text-[17px] font-semibold text-paper-bg group-hover:text-studio-light"
		>{c.name}</span
	>
	<span class="block text-[11.5px] text-studio-mute"
		>{c.videos} {c.videos === 1 ? 'video' : 'videos'} on AGE Studios</span
	>
</a>
