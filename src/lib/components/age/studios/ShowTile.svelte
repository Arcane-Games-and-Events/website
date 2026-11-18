<!--
  ShowTile — a show on AGE Studios: its square art set into a gold block
  with a halftone screen, then the name, what kind of show and who hosts,
  and how many episodes. Lifts off its plate on hover.

  Props: show (from studiosHub().shows or listShows({ publicOnly }))
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';

	/** @type {{ show: any }} */
	let { show: s } = $props();
	const kind = $derived(
		s.kind === 'podcast' ? 'Podcast' : s.kind === 'interview' ? 'Interviews' : 'Series'
	);
</script>

<a href="/studios/shows/{s.slug}" class="group block">
	<span class="st-lift block bg-gold p-2.5 text-gold-ink" style="--plate: var(--color-ink)">
		<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
		<span class="relative block aspect-square overflow-hidden bg-ink/15">
			{#if s.cover}
				<Picture
					image={s.cover}
					alt=""
					sizes="(min-width: 1024px) 280px, 50vw"
					class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
				/>
			{:else}
				<span
					class="absolute inset-0 flex items-center justify-center p-4 text-center font-newsreader text-2xl leading-tight font-semibold"
					>{s.name}</span
				>
			{/if}
		</span>
		<span
			class="relative mt-2.5 flex items-center justify-between gap-2 px-0.5 text-xs font-extrabold tracking-widest uppercase"
		>
			<span>◆ {kind}</span>
			<span class="tracking-widest tabular-nums">{s.episodes} ep.</span>
		</span>
	</span>
	<span class="mt-3 block font-newsreader text-xl leading-tight font-semibold"
		><span class="fp-ul">{s.name}</span></span
	>
	{#if s.host}<span class="mt-0.5 block text-xs text-soft italic">with {s.host}</span>{/if}
</a>
