<!--
  LibraryMosaic — the latest pieces as a bento grid on 12 columns, so the
  page reads as composed rather than listed. Every picture keeps its 16:9
  shape (nothing is cropped): each row is as tall as its pictures, and the
  words-only tiles stretch to fill beside them.

    ┌──────────────── 8 ────────────────┬──── 4 ────┐
    │ 0 photo (big, words over it)      │ 1 navy    │
    ├────── 4 ──────┬────── 4 ──────┬───┴── 4 ─────┤
    │ 2 card        │ 3 card        │ 4 headline   │
    ├────────── 6 ──────────┬──────────── 6 ───────┤
    │ 5 photo               │ 6 photo              │
    ├────────── 6 ──────────┼──────────── 6 ───────┤
    │ 7 picture | words     │ 8 picture | words    │
    └───────────────────────┴──────────────────────┘

  Set like the rest of the Library: serif headlines, small-caps ◆ section
  labels, BY AUTHOR · DATE · LENGTH bylines, the green ◆ PREMIUM and gold
  NEW tags and a ▶ length chip on video pictures. Tiles: photo (words over
  the picture under a navy shade), navy (its picture above white words on
  the Library's navy), card (picture above words), headline (a big serif
  title and dek on toned paper), side (picture beside words). Pictures zoom
  a little and titles underline on hover. Phones get a plain list of cards
  instead (picture above words, all the same); tablets get the bento two
  across.

  `aside` (a snippet, given a class that fills its slot) takes one slot
  (the first card's, 2, by default) — the Premium ad for non-members — and
  the stories fill the rest. Only whole rows are shown.

  Props: stories (toStory()s, newest first), aside, asideAt
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';

	/** @type {{ stories: any[], aside?: import('svelte').Snippet<[string]>, asideAt?: number }} */
	let { stories, aside, asideAt = 2 } = $props();

	const LAYOUT = [
		{ tile: 'photo', big: true, span: 'sm:col-span-2 lg:col-span-8' },
		{ tile: 'framed', span: 'lg:col-span-4' },
		{ tile: 'card', span: 'lg:col-span-4' },
		{ tile: 'card', span: 'lg:col-span-4' },
		{ tile: 'headline', span: 'sm:col-span-2 lg:col-span-4' },
		{ tile: 'photo', span: 'lg:col-span-6' },
		{ tile: 'photo', span: 'lg:col-span-6' },
		{ tile: 'side', span: 'sm:col-span-2 lg:col-span-6' },
		{ tile: 'side', span: 'sm:col-span-2 lg:col-span-6' }
	];
	// Where each row ends: only whole rows are shown.
	const ROW_ENDS = [2, 5, 7, 9];
	const tiles = $derived.by(() => {
		const out = [];
		let next = 0;
		const have = Math.min(LAYOUT.length, stories.length + (aside ? 1 : 0));
		const slots = [...ROW_ENDS].reverse().find((n) => n <= have) ?? have;
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
			s.kind === 'video' ? 'Video' : '',
			s.rubric !== 'Video' && s.rubric !== 'Article' ? s.rubric : ''
		]
			.filter(Boolean)
			.join(' · ') || 'Article';
	const bylineOf = (s) => [s.date, s.kind !== 'video' ? s.length : ''].filter(Boolean).join(' · ');
	const zoom =
		'transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100';
	const shade =
		'pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(10_14_32/0.94)_8%,rgb(10_14_32/0.62)_50%,rgb(10_14_32/0.12)_82%,transparent)]';
</script>

{#snippet picture(s, sizes)}
	<Picture
		image={imageOf(s)}
		alt=""
		{sizes}
		class="absolute inset-0 h-full w-full object-cover {zoom}"
	/>
{/snippet}

<!-- the tags a picture carries: Premium, New, and a video's length -->
{#snippet tags(s, play = true)}
	{#if s.premium}
		<span
			class="absolute top-0 left-0 z-[1] bg-prem px-2 py-1 font-libre text-[9.5px] font-extrabold tracking-[0.16em] text-white uppercase"
			>◆ Premium</span
		>
	{/if}
	{#if s.fresh}
		<span
			class="absolute top-0 right-0 z-[1] bg-gold px-2 py-1 font-libre text-[9.5px] font-extrabold tracking-[0.16em] text-ink uppercase"
			>New</span
		>
	{/if}
	{#if play && s.kind === 'video'}
		<span
			class="absolute bottom-0 left-0 z-[1] flex items-center gap-1.5 bg-ink/85 px-2 py-1 font-libre text-[10.5px] font-bold text-white"
			><span aria-hidden="true">▶</span>{s.length || 'Video'}</span
		>
	{/if}
{/snippet}

{#snippet kicker(s, tone)}
	<span
		class="block font-libre text-[9.5px] font-extrabold tracking-[0.2em] uppercase md:text-[10px] {tone}"
		><span aria-hidden="true">◆</span> {kickerOf(s)}</span
	>
{/snippet}

{#snippet byline(s, dark = false)}
	<span
		class="block truncate font-libre text-[10.5px] font-bold tracking-[0.12em] uppercase {dark
			? 'text-white/60'
			: 'text-fade'}"
		>By <span class={dark ? 'text-white' : 'text-ink'}>{s.author}</span> · {bylineOf(s)}</span
	>
{/snippet}

<!-- phones: a plain list of cards, every one the same shape -->
<ul class="grid gap-8 sm:hidden" aria-label="Latest in the Library">
	{#each tiles.slice(0, 6) as { s, key } (key)}
		<li>
			{#if !s}
				{@render aside?.('')}
			{:else}
				<a href={s.href} class="group block">
					<span class="relative block aspect-video overflow-hidden bg-panel">
						{@render picture(s, '100vw')}
						{@render tags(s)}
					</span>
					<span class="mt-3.5 block">{@render kicker(s, 'text-warm')}</span>
					<span
						class="mt-1.5 block font-newsreader text-[23px] leading-[1.12] font-semibold tracking-[-0.01em] [text-wrap:balance] decoration-warm decoration-1 underline-offset-4 group-hover:underline"
						>{s.title}</span
					>
					{#if s.dek}<span
							class="mt-2 line-clamp-2 block font-newsreader text-[16px] leading-[1.45] text-soft italic"
							>{s.dek}</span
						>{/if}
					<span class="mt-2.5 block">{@render byline(s)}</span>
				</a>
			{/if}
		</li>
	{/each}
</ul>

<!-- from tablets up: the bento -->
<ul
	class="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-12 lg:gap-5"
	aria-label="Latest in the Library"
>
	{#each tiles as { s, tile, big, span, key } (key)}
		<li class={span}>
			{#if !s}
				{@render aside?.('h-full')}
			{:else if tile === 'photo'}
				<a href={s.href} class="group relative block aspect-video overflow-hidden bg-warm-deep">
					{@render picture(
						s,
						big ? '(min-width: 1024px) 680px, 100vw' : '(min-width: 1024px) 480px, 100vw'
					)}
					<span class={shade} aria-hidden="true"></span>
					{@render tags(s, false)}
					<span class="absolute inset-x-0 bottom-0 block {big ? 'p-5 md:p-8' : 'p-4 md:p-5'}">
						{@render kicker(s, 'text-warm-light')}
						<span
							class="mt-2 block font-newsreader font-semibold tracking-[-0.02em] [text-wrap:balance] text-white decoration-warm-light decoration-2 underline-offset-[5px] group-hover:underline {big
								? 'text-[30px] leading-[1.04] md:text-[44px]'
								: 'line-clamp-3 text-[21px] leading-[1.12] md:text-[22px]'}">{s.title}</span
						>
						{#if big && s.dek}
							<span
								class="mt-2.5 line-clamp-2 block max-w-[560px] font-newsreader text-[17px] leading-[1.45] text-white/75 italic"
								>{s.dek}</span
							>
						{/if}
						<span class="mt-2.5 block">{@render byline(s, true)}</span>
					</span>
				</a>
			{:else if tile === 'framed'}
				<a
					href={s.href}
					class="group relative flex h-full flex-col overflow-hidden bg-warm-deep text-white"
				>
					<span class="relative block aspect-video shrink-0 overflow-hidden bg-ink">
						{@render picture(s, '(min-width: 1024px) 380px, 100vw')}
						{@render tags(s)}
					</span>
					<span class="relative flex flex-1 flex-col p-5 md:p-6">
						<span
							class="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 bg-[radial-gradient(closest-side,rgb(96_165_250/0.22),transparent)]"
							aria-hidden="true"
						></span>
						{@render kicker(s, 'text-warm-light')}
						<span
							class="mt-2.5 line-clamp-3 block font-newsreader text-[24px] leading-[1.1] font-semibold tracking-[-0.01em] [text-wrap:balance] decoration-warm-light decoration-2 underline-offset-[5px] group-hover:underline"
							>{s.title}</span
						>
						<span class="mt-auto block pt-4">{@render byline(s, true)}</span>
					</span>
				</a>
			{:else if tile === 'card'}
				<a
					href={s.href}
					class="group flex h-full flex-col overflow-hidden border border-line2 bg-white"
				>
					<span class="relative block aspect-video shrink-0 overflow-hidden bg-panel">
						{@render picture(s, '(min-width: 1024px) 380px, 100vw')}
						{@render tags(s)}
					</span>
					<span class="flex flex-1 flex-col p-5">
						{@render kicker(s, 'text-warm')}
						<span
							class="mt-2 line-clamp-3 block font-newsreader text-[23px] leading-[1.12] font-semibold tracking-[-0.01em] [text-wrap:balance] decoration-warm decoration-1 underline-offset-4 group-hover:underline"
							>{s.title}</span
						>
						{#if s.dek}<span
								class="mt-2 line-clamp-3 block font-newsreader text-[15.5px] leading-[1.45] text-soft italic"
								>{s.dek}</span
							>{/if}
						<span class="mt-auto block pt-3">{@render byline(s)}</span>
					</span>
				</a>
			{:else if tile === 'headline'}
				<a
					href={s.href}
					class="group flex h-full flex-col justify-between border-t-[3px] border-ink bg-paper p-5 md:p-6"
				>
					<span class="block">
						{@render kicker(s, 'text-warm')}
						<span
							class="mt-2.5 line-clamp-3 block font-newsreader text-[25px] leading-[1.06] font-semibold tracking-[-0.015em] [text-wrap:balance] decoration-warm decoration-2 underline-offset-[5px] group-hover:underline"
							>{s.title}</span
						>
						{#if s.dek}<span
								class="mt-2 line-clamp-4 block font-newsreader text-[15px] leading-[1.45] text-soft italic"
								>{s.dek}</span
							>{/if}
					</span>
					<span class="mt-3 flex items-center justify-between gap-3">
						{@render byline(s)}
						{#if s.premium}<span
								class="shrink-0 font-libre text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase"
								>◆ Premium</span
							>{/if}
					</span>
				</a>
			{:else}
				<a
					href={s.href}
					class="group grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center overflow-hidden border border-line2 bg-white"
				>
					<span class="relative block aspect-video self-center overflow-hidden bg-panel">
						{@render picture(s, '(min-width: 1024px) 280px, 45vw')}
						{@render tags(s)}
					</span>
					<span class="flex min-w-0 flex-col p-4 md:p-5">
						{@render kicker(s, 'text-warm')}
						<span
							class="mt-2 line-clamp-2 block font-newsreader text-[21px] leading-[1.14] font-semibold tracking-[-0.01em] [text-wrap:balance] decoration-warm decoration-1 underline-offset-4 group-hover:underline"
							>{s.title}</span
						>
						<span class="mt-auto block pt-3">{@render byline(s)}</span>
					</span>
				</a>
			{/if}
		</li>
	{/each}
</ul>
