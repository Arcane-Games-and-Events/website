<!--
  StoryCard — one Library piece in a browse grid (the Library index and the
  tag pages). The variant sets its shape; the list item around it carries
  the grid span and the sheet colour (`storyCardSheet`).

    standard — picture over the copy (the default, and every card in grid view)
    feature  — standard, larger, spanning two rows in the mosaic
    ink      — text only, on ink
    row      — small thumbnail beside the title
    wide     — picture beside the copy, the full row
    half     — standard, half a row wide

  Props:
    story   — a story from `toStory()` (stories.js)
    variant — one of the above
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import FrontByline from '$lib/components/age/home/FrontByline.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';

	/** @type {{ story: any, variant?: 'standard' | 'feature' | 'ink' | 'row' | 'wide' | 'half' }} */
	let { story: s, variant: v = 'standard' } = $props();
</script>

{#if v === 'ink'}
	<a href={s.href} class="group flex h-full flex-col p-6 text-paper-bg md:p-7">
		<span
			class="flex items-center justify-between gap-3 text-[9.5px] font-extrabold tracking-[0.18em] text-warm-light uppercase"
		>
			<span class="flex items-center gap-2">
				{#if s.kind === 'video'}<span
						class="flex h-4 w-4 items-center justify-center bg-warm pl-[1px] text-[7px] text-white"
						aria-hidden="true">▶</span
					>{/if}
				{s.rubric}
			</span>
			{#if s.fresh}<span class="text-gold">New</span>{/if}
		</span>
		<span
			class="mt-4 block font-newsreader text-[26px] leading-[1.05] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[30px]"
		>
			<span class="fp-ul">{s.title}</span>
		</span>
		{#if s.dek}
			<span
				class="mt-3 line-clamp-4 font-newsreader text-[15px] leading-[1.5] text-paper-bg/70 italic"
				>{s.dek}</span
			>
		{/if}
		<span class="mt-auto block pt-5">
			<FrontByline author={s.author} length={s.length} premium={s.premium} size="sm" onDark />
		</span>
	</a>
{:else if v === 'row'}
	<a href={s.href} class="group grid h-full grid-cols-[112px_1fr] items-center gap-4 p-4 md:p-5">
		<span class="relative block aspect-video overflow-hidden bg-panel">
			<Picture
				image={s.picture ?? { src: s.image, srcset: s.srcset, alt: s.alt }}
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
				sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
				alt={s.alt}
				loading="lazy"
			/>
			{#if s.kind === 'video'}
				<span
					class="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center bg-warm pl-[1px] text-[8px] text-white"
					aria-hidden="true">▶</span
				>
			{/if}
		</span>
		<span class="min-w-0">
			<span class="block text-[9.5px] font-extrabold tracking-[0.18em] text-warm uppercase"
				>{s.rubric}</span
			>
			<span class="mt-1.5 block font-newsreader text-[18px] leading-[1.15] font-semibold">
				<span class="fp-ul">{s.title}</span>
			</span>
			<span class="mt-2 block">
				<FrontByline author={s.author} length={s.length} premium={s.premium} size="sm" />
			</span>
		</span>
	</a>
{:else if v === 'wide'}
	<a href={s.href} class="group grid h-full md:grid-cols-[5fr_7fr]">
		<span class="relative block aspect-video overflow-hidden bg-panel md:aspect-auto md:h-full">
			{#if s.premium}<PremiumTag variant="corner" />{/if}
			<Picture
				image={s.picture ?? { src: s.image, srcset: s.srcset, alt: s.alt }}
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
				sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
				alt={s.alt}
				loading="lazy"
			/>
			{#if s.kind === 'video'}
				<span
					class="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center bg-warm pl-[2px] text-[10px] text-white"
					aria-hidden="true">▶</span
				>
			{/if}
		</span>
		<span class="flex flex-col justify-center p-6 md:p-8 lg:p-10">
			<span
				class="flex items-baseline justify-between gap-3 text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
			>
				<span class="text-warm">{s.rubric}</span>
				{#if s.fresh}<span class="text-gold">New</span>{/if}
			</span>
			<span
				class="mt-3 block font-newsreader text-[26px] leading-[1.06] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[32px]"
			>
				<span class="fp-ul">{s.title}</span>
			</span>
			{#if s.dek}
				<span
					class="mt-3 line-clamp-3 font-newsreader text-[16px] leading-[1.5] text-soft italic md:text-[17px]"
					>{s.dek}</span
				>
			{/if}
			<span class="mt-5 block">
				<FrontByline author={s.author} length={s.length} premium={false} size="sm" />
			</span>
		</span>
	</a>
{:else}
	<a href={s.href} class="group flex h-full flex-col">
		<span class="relative block aspect-video overflow-hidden bg-panel">
			{#if s.premium}<PremiumTag variant="corner" size={v === 'feature' ? 'lg' : 'md'} />{/if}
			<Picture
				image={s.picture ?? { src: s.image, srcset: s.srcset, alt: s.alt }}
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
				sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
				alt={s.alt}
				loading="lazy"
			/>
			{#if s.kind === 'video'}
				<span
					class="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center bg-warm pl-[2px] text-[10px] text-white"
					aria-hidden="true">▶</span
				>
			{/if}
		</span>
		<span
			class="flex flex-1 flex-col {v === 'feature'
				? 'justify-center p-6 md:p-8 lg:p-10'
				: 'p-5 md:p-6'}"
		>
			<span
				class="flex items-baseline justify-between gap-3 text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
			>
				<span class="truncate text-warm">{s.rubric}</span>
				{#if s.fresh}<span class="shrink-0 text-gold">New</span>{/if}
			</span>
			<span
				class="mt-2.5 block font-newsreader leading-[1.1] font-semibold [text-wrap:balance] {v ===
				'feature'
					? 'text-[30px] leading-[1.02] tracking-[-0.015em] md:text-[40px]'
					: 'text-[21px] leading-[1.14]'}"
			>
				<span class="fp-ul">{s.title}</span>
			</span>
			{#if s.dek}
				<span
					class="font-newsreader leading-[1.45] text-soft italic {v === 'feature'
						? 'mt-4 line-clamp-4 text-[16.5px] md:text-[18px]'
						: 'mt-2.5 line-clamp-2 text-[14.5px]'}"
				>
					{s.dek}
				</span>
			{/if}
			<span class="block {v === 'feature' ? 'mt-6' : 'mt-auto pt-4'}">
				<FrontByline
					author={s.author}
					length={s.length}
					premium={false}
					size={v === 'feature' ? 'md' : 'sm'}
				/>
			</span>
		</span>
	</a>
{/if}
