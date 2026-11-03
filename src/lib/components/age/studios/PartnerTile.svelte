<!--
  PartnerTile — an AGE Studios partner (an AGE Network creator): their
  picture set into a purple block, their name, what they make and how many
  of their videos are on AGE Studios.

  Props: creator (from networkHome().creators)
-->
<script>
	/** @type {{ creator: any }} */
	let { creator: c } = $props();
</script>

<a href="/studios/partners/{c.slug}" class="group block">
	<span class="st-lift block bg-cc-ne p-2 text-white" style="--plate: var(--color-ink)">
		<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
		<span class="relative block aspect-square overflow-hidden bg-ink/20">
			{#if c.avatar}
				<img
					src={c.avatar}
					alt=""
					loading="lazy"
					class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
				/>
			{:else}
				<span
					class="st-wide absolute inset-0 flex items-center justify-center p-3 text-center text-[15px] font-black uppercase"
					>{c.name}</span
				>
			{/if}
		</span>
		<span class="relative mt-2 block px-0.5 text-[9px] font-extrabold tracking-[0.2em] uppercase"
			>◆ {c.kind === 'podcast' ? 'Podcast' : 'Video'}</span
		>
	</span>
	<span class="mt-2.5 block truncate font-newsreader text-[18px] font-semibold"
		><span class="fp-ul">{c.name}</span></span
	>
	<span class="block text-[11.5px] text-fade"
		>{c.videos} {c.videos === 1 ? 'video' : 'videos'} on AGE Studios</span
	>
</a>
