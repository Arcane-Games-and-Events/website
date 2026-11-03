<!--
  LibraryCard — a Library piece on paper: the picture, then the topic and
  kind in the Library's blue, the title, and who made it and how long it
  is. No frame: on hover the picture zooms a touch and the title turns blue. Videos
  carry a play mark; Premium sits on the picture.

  layout: 'card' (grids) | 'row' (search results: a small picture beside the
  words) | 'feature' (the lead: a big picture with the words beside it)

  Props: story (toStory()), layout, eager
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';

	/** @type {{ story: any, layout?: 'card' | 'row' | 'feature', eager?: boolean }} */
	let { story: s, layout = 'card', eager = false } = $props();
	const row = $derived(layout === 'row');
	const feature = $derived(layout === 'feature');
	const image = $derived(s.picture ?? { src: s.image, srcset: s.srcset, alt: s.alt });
	const kicker = $derived(
		[
			s.rubric !== 'Video' && s.rubric !== 'Article' ? s.rubric : '',
			s.kind === 'video' ? 'Video' : ''
		]
			.filter(Boolean)
			.join(' · ') || 'Article'
	);
	const meta = $derived([s.author, s.length, s.date].filter(Boolean).join(' · '));
</script>

{#snippet frame(sizes, cls = '')}
	<span class="relative block overflow-hidden bg-panel {cls}">
		<Picture
			{image}
			alt=""
			{sizes}
			loading={eager ? 'eager' : 'lazy'}
			class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
		/>
		{#if s.kind === 'video' && !feature}
			<span
				class="absolute bottom-2 left-2 flex items-center justify-center bg-warm pl-[2px] text-white {row
					? 'h-6 w-6 text-[8px]'
					: 'h-8 w-8 text-[10px]'}"
				aria-hidden="true">▶</span
			>
		{/if}
		{#if s.premium && !row}<PremiumTag variant="corner" size="sm" />{/if}
	</span>
{/snippet}

{#if feature}
	<a href={s.href} class="group grid gap-5 md:grid-cols-[1.45fr_1fr] md:items-center md:gap-10">
		{@render frame('(min-width: 1024px) 680px, 100vw', 'aspect-video')}
		<span class="block min-w-0">
			<span
				class="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-warm uppercase"
			>
				{#if s.kind === 'video'}<span
						class="flex h-6 w-6 items-center justify-center bg-warm pl-[2px] text-[8px] text-white"
						aria-hidden="true">▶</span
					>{/if}
				{kicker}{#if s.fresh}<span class="text-fade">· New</span>{/if}
			</span>
			<span
				class="mt-3 block font-libre text-[30px] leading-[1.06] font-extrabold tracking-[-0.03em] [text-wrap:balance] text-ink transition-colors group-hover:text-warm md:text-[40px]"
				>{s.title}</span
			>
			{#if s.dek}
				<span class="mt-3 line-clamp-3 block text-[15px] leading-[1.55] text-soft md:text-[17px]"
					>{s.dek}</span
				>
			{/if}
			<span class="mt-4 block text-[12.5px] text-fade">{meta}</span>
		</span>
	</a>
{:else}
	<a
		href={s.href}
		class="group block {row
			? 'grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[168px_minmax(0,1fr)]'
			: ''}"
	>
		{@render frame(
			row ? '168px' : '(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw',
			'aspect-video'
		)}
		<span class="block min-w-0 {row ? '' : 'mt-3.5'}">
			<span class="block truncate text-[10.5px] font-bold tracking-[0.14em] text-warm uppercase"
				>{kicker}{#if s.fresh}<span class="text-fade"> · New</span>{/if}{#if s.premium && row}<span
						class="text-prem"
					>
						· Premium</span
					>{/if}</span
			>
			<span
				class="mt-1.5 block font-libre font-bold tracking-[-0.02em] [text-wrap:balance] text-ink transition-colors group-hover:text-warm {row
					? 'line-clamp-2 text-[16px] leading-[1.25]'
					: 'text-[19px] leading-[1.2]'}">{s.title}</span
			>
			{#if s.dek && !row}
				<span class="mt-1.5 line-clamp-2 block text-[14px] leading-[1.5] text-fade">{s.dek}</span>
			{/if}
			<span class="mt-2 block truncate text-[12px] text-fade">{meta}</span>
		</span>
	</a>
{/if}
