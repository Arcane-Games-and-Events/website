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
			class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
		/>
		{#if s.kind === 'video' && !feature}
			<span
				class="absolute bottom-2 left-2 flex items-center justify-center bg-warm pl-0.5 text-white {row
					? 'h-6 w-6 text-xs'
					: 'h-8 w-8 text-xs'}"
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
			<span class="flex items-center gap-2 text-xs font-bold tracking-widest text-warm uppercase">
				{#if s.kind === 'video'}<span
						class="flex h-6 w-6 items-center justify-center bg-warm pl-0.5 text-xs text-white"
						aria-hidden="true">▶</span
					>{/if}
				{kicker}{#if s.fresh}<span class="text-fade">· New</span>{/if}
			</span>
			<span
				class="mt-3 block font-libre text-3xl leading-none font-extrabold tracking-tight [text-wrap:balance] text-ink transition-colors group-hover:text-warm md:text-4xl"
				>{s.title}</span
			>
			{#if s.dek}
				<span class="mt-3 line-clamp-3 block text-base leading-normal text-soft md:text-lg"
					>{s.dek}</span
				>
			{/if}
			<span class="mt-4 block text-xs text-fade">{meta}</span>
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
			<span class="block truncate text-xs font-bold tracking-widest text-warm uppercase"
				>{kicker}{#if s.fresh}<span class="text-fade"> · New</span>{/if}{#if s.premium && row}<span
						class="text-prem"
					>
						· Premium</span
					>{/if}</span
			>
			<span
				class="mt-1.5 block font-libre font-bold tracking-tight [text-wrap:balance] text-ink transition-colors group-hover:text-warm {row
					? 'line-clamp-2 text-base leading-tight'
					: 'text-xl leading-tight'}">{s.title}</span
			>
			{#if s.dek && !row}
				<span class="mt-1.5 line-clamp-2 block text-sm leading-normal text-fade">{s.dek}</span>
			{/if}
			<span class="mt-2 block truncate text-xs text-fade">{meta}</span>
		</span>
	</a>
{/if}
