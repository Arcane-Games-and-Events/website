<!--
  LibraryMosaic — the latest nine pieces as a bento grid on a 12-column,
  fixed-row layout (wide screens), so the page reads as composed rather
  than listed:

    ┌──────────── 7 ────────────┬────── 5 ──────┐
    │ 0 photo (big)             │ 1 photo        │
    │                           ├────────────────┤
    │                           │ 2 framed words │
    ├───── 4 ─────┬───── 4 ─────┴──┬───── 4 ─────┤
    │ 3 card      │ 4 photo        │ 5 headline  │
    │ (tall)      ├────────────────┴─────────────┤
    │             │ 6 photo (wide)               │
    ├──────── 6 ──┴──────┬──────────── 6 ────────┤
    │ 7 picture | words  │ 8 picture | words     │
    └────────────────────┴───────────────────────┘

  Tiles: photo (words over the picture), framed (blue words in a blue
  frame, with a small picture), card (picture above words), headline (a
  big serif title on white), side (picture beside words). Phones get one column at natural
  heights; tablets two.

  `aside` (a snippet, given a class that fills its slot) takes one slot
  (the tall card's, 3, by default) — the homepage puts its Premium ad there for
  non-members — and the stories fill the rest.

  Props: stories (toStory()s, newest first), aside, asideAt
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';

	/** @type {{ stories: any[], aside?: import('svelte').Snippet<[string]>, asideAt?: number }} */
	let { stories, aside, asideAt = 3 } = $props();

	const LAYOUT = [
		{ tile: 'photo', big: true, span: 'sm:col-span-2 lg:col-span-7 lg:row-span-2' },
		{ tile: 'photo', span: 'lg:col-span-5' },
		{ tile: 'framed', span: 'lg:col-span-5' },
		{ tile: 'card', span: 'lg:col-span-4 lg:row-span-2' },
		{ tile: 'photo', span: 'lg:col-span-4' },
		{ tile: 'headline', span: 'lg:col-span-4' },
		{ tile: 'photo', span: 'sm:col-span-2 lg:col-span-8' },
		{ tile: 'side', span: 'sm:col-span-2 lg:col-span-6' },
		{ tile: 'side', span: 'sm:col-span-2 lg:col-span-6' }
	];
	const tiles = $derived.by(() => {
		const out = [];
		let next = 0;
		// Eight tiles would leave the last alone on its row: stop at seven.
		const count = Math.min(LAYOUT.length, stories.length + (aside ? 1 : 0));
		const slots = count === 8 ? 7 : count;
		for (let i = 0; i < slots; i++) {
			if (aside && i === asideAt) out.push({ aside: true, key: 'aside', ...LAYOUT[i] });
			else if (next < stories.length) {
				const s = stories[next++];
				out.push({ s, key: s.href, ...LAYOUT[i] });
			}
		}
		return out;
	});

	const imageOf = (s) => s.picture ?? { src: s.image, srcset: s.srcset, alt: s.alt };
	const kickerOf = (s) =>
		[
			s.rubric !== 'Video' && s.rubric !== 'Article' ? s.rubric : '',
			s.kind === 'video' ? 'Video' : ''
		]
			.filter(Boolean)
			.join(' · ') || 'Article';
	const metaOf = (s) => [s.author, s.length].filter(Boolean).join(' · ');
	const zoom =
		'transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100';
</script>

{#snippet picture(s, sizes, cls = '')}
	<Picture
		image={imageOf(s)}
		alt=""
		{sizes}
		class="absolute inset-0 h-full w-full object-cover {zoom} {cls}"
	/>
{/snippet}

{#snippet kicker(s, tone)}
	<span class="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.16em] uppercase {tone}">
		{#if s.kind === 'video'}<span
				class="flex h-5 w-5 items-center justify-center bg-warm pl-[1px] text-[7px] text-white"
				aria-hidden="true">▶</span
			>{/if}
		<span
			>{kickerOf(s)}{#if s.fresh}<span class="opacity-60"> · New</span>{/if}</span
		>
	</span>
{/snippet}

<ul
	class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[214px] lg:grid-cols-12 lg:gap-5 max-sm:[&>li:nth-child(n+7)]:hidden"
	aria-label="Latest in the Library"
>
	{#each tiles as { s, tile, big, span, key } (key)}
		<li class={span}>
			{#if !s}
				{@render aside?.('h-full')}
			{:else if tile === 'photo'}
				<a
					href={s.href}
					class="group relative block h-full overflow-hidden bg-ink {big
						? 'aspect-[4/5] sm:aspect-[16/10] lg:aspect-auto'
						: 'aspect-[16/10] lg:aspect-auto'}"
				>
					{@render picture(
						s,
						big ? '(min-width: 1024px) 680px, 100vw' : '(min-width: 1024px) 480px, 100vw'
					)}
					<span
						class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(23_21_15/0.92)_5%,rgb(23_21_15/0.45)_45%,transparent_78%)]"
						aria-hidden="true"
					></span>
					{#if s.premium}<PremiumTag variant="corner" size="sm" />{/if}
					<span class="absolute inset-x-0 bottom-0 block {big ? 'p-5 md:p-8' : 'p-4 md:p-5'}">
						{@render kicker(s, 'text-white/85')}
						<span
							class="mt-2 block font-libre font-extrabold tracking-[-0.025em] [text-wrap:balance] text-white {big
								? 'text-[28px] leading-[1.05] md:text-[40px]'
								: 'line-clamp-3 text-[19px] leading-[1.15]'}">{s.title}</span
						>
						{#if big && s.dek}
							<span
								class="mt-2.5 line-clamp-2 block max-w-[560px] text-[15px] leading-[1.5] text-white/75"
								>{s.dek}</span
							>
						{/if}
						<span class="mt-2 block text-[12px] text-white/60">{metaOf(s)}</span>
					</span>
				</a>
			{:else if tile === 'framed'}
				<a
					href={s.href}
					class="group relative flex h-full flex-col justify-between border-2 border-warm bg-white p-5 md:p-6"
				>
					<span class="flex items-start justify-between gap-4">
						<span class="block min-w-0">
							{@render kicker(s, 'text-warm')}
							<span
								class="mt-2.5 line-clamp-3 block font-newsreader text-[25px] leading-[1.1] font-semibold tracking-[-0.01em] [text-wrap:balance] text-ink transition-colors group-hover:text-warm"
								>{s.title}</span
							>
						</span>
						<span
							class="relative block h-16 w-16 shrink-0 overflow-hidden bg-panel md:h-[72px] md:w-[72px]"
						>
							{@render picture(s, '72px')}
						</span>
					</span>
					<span class="mt-4 flex items-end justify-between gap-3 text-[12px] text-fade">
						<span class="truncate">{metaOf(s)}</span>
						{#if s.premium}<span class="shrink-0 font-semibold text-prem">Premium</span>{/if}
					</span>
				</a>
			{:else if tile === 'card'}
				<a
					href={s.href}
					class="group flex h-full flex-col overflow-hidden border border-line bg-white"
				>
					<span
						class="relative block aspect-[16/10] shrink-0 overflow-hidden bg-panel lg:aspect-auto lg:flex-[1.15]"
					>
						{@render picture(s, '(min-width: 1024px) 380px, 100vw')}
						{#if s.premium}<PremiumTag variant="corner" size="sm" />{/if}
					</span>
					<span class="flex flex-1 flex-col p-5">
						{@render kicker(s, 'text-warm')}
						<span
							class="mt-2 line-clamp-3 block font-libre text-[20px] leading-[1.2] font-bold tracking-[-0.02em] [text-wrap:balance] transition-colors group-hover:text-warm"
							>{s.title}</span
						>
						{#if s.dek}<span class="mt-2 line-clamp-3 block text-[14px] leading-[1.5] text-soft"
								>{s.dek}</span
							>{/if}
						<span class="mt-auto block pt-3 text-[12px] text-fade">{metaOf(s)}</span>
					</span>
				</a>
			{:else if tile === 'headline'}
				<a
					href={s.href}
					class="group flex h-full flex-col justify-between border-t-[3px] border-warm bg-white p-5 shadow-[0_1px_0_0_var(--color-line)] md:p-6"
				>
					<span class="block">
						{@render kicker(s, 'text-warm')}
						<span
							class="mt-2.5 line-clamp-4 block font-newsreader text-[26px] leading-[1.08] font-semibold tracking-[-0.015em] [text-wrap:balance] transition-colors group-hover:text-warm"
							>{s.title}</span
						>
					</span>
					<span class="mt-4 flex items-center justify-between gap-3 text-[12px] text-fade">
						<span class="truncate">{metaOf(s)}</span>
						{#if s.premium}<span class="shrink-0 font-semibold text-prem">Premium</span>{/if}
					</span>
				</a>
			{:else}
				<a
					href={s.href}
					class="group grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] overflow-hidden border border-line bg-white"
				>
					<span class="relative block min-h-[150px] overflow-hidden bg-panel">
						{@render picture(s, '(min-width: 1024px) 280px, 45vw')}
						{#if s.premium}<PremiumTag variant="corner" size="sm" />{/if}
					</span>
					<span class="flex min-w-0 flex-col p-4 md:p-5">
						{@render kicker(s, 'text-warm')}
						<span
							class="mt-2 line-clamp-3 block font-libre text-[18px] leading-[1.2] font-bold tracking-[-0.02em] [text-wrap:balance] transition-colors group-hover:text-warm"
							>{s.title}</span
						>
						<span class="mt-auto block pt-3 text-[12px] text-fade">{metaOf(s)}</span>
					</span>
				</a>
			{/if}
		</li>
	{/each}
</ul>
