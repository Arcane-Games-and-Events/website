<!--
  LibraryHero — the top of the Library's front page, as one bento grid (in
  the language of the mosaic below it). A navy
  masthead tile holds the wordmark, the search and popular topics; around
  it the newest article as a big picture, then the newest video, match and
  the next piece as smaller picture tiles.

  Props: spotlight ({ read, watch, replay }), topics, stories (toStory()s)
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import LibraryWordmark from './LibraryWordmark.svelte';
	import LibrarySearch from './LibrarySearch.svelte';
	import { spotlightTiles } from './spotlight.js';

	/** @type {{ spotlight: any, topics: { name: string, slug: string }[], stories: any[] }} */
	let { spotlight, topics, stories } = $props();
	const tiles = $derived.by(() => {
		const all = spotlightTiles(spotlight);
		const seen = new Set(all.map((t) => t.href));
		const extra = stories.find((s) => !seen.has(s.href));
		if (extra)
			all.push({
				verb: 'Also new',
				what: extra.rubric,
				href: extra.href,
				title: extra.title,
				dek: extra.dek,
				image: extra.picture ?? { src: extra.image, srcset: extra.srcset },
				note: extra.length,
				premium: extra.premium
			});
		return all;
	});
	const lead = $derived(tiles[0]);
	const rest = $derived(tiles.slice(1, 4));
</script>

{#snippet tile(t, big)}
	<a href={t.href} class="group relative block h-full overflow-hidden bg-warm-deep">
		{#if t.image}
			<Picture
				image={t.image}
				alt=""
				sizes={big ? '(min-width: 1024px) 700px, 100vw' : '(min-width: 1024px) 400px, 100vw'}
				loading="eager"
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
			/>
		{/if}
		<span
			class="absolute inset-0 bg-[linear-gradient(to_top,rgb(10_14_32/0.92)_5%,rgb(10_14_32/0.45)_45%,transparent_75%)]"
			aria-hidden="true"
		></span>
		{#if t.premium}
			<span
				class="absolute top-0 right-0 bg-prem px-2 py-1 font-libre text-xs font-extrabold tracking-widest text-white uppercase"
				>◆ Premium</span
			>
		{/if}
		<span
			class="absolute inset-x-0 bottom-0 block text-white {big
				? 'p-4 sm:p-6 md:p-8'
				: 'p-4 md:p-5'}"
		>
			<span
				class="flex min-w-0 items-center gap-2 font-libre text-xs font-extrabold tracking-widest uppercase"
				><span class="shrink-0 bg-paper-bg px-2 py-1 text-warm">{t.verb}</span><span
					class="min-w-0 truncate text-white/75">{t.what}</span
				></span
			>
			<span
				class="mt-2.5 block font-newsreader font-semibold tracking-tight [text-wrap:balance] decoration-warm-light decoration-2 underline-offset-5 group-hover:underline {big
					? 'line-clamp-2 text-2xl leading-none sm:line-clamp-3 sm:text-3xl md:text-5xl'
					: 'line-clamp-2 text-xl leading-none'}">{t.title}</span
			>
			{#if big && t.dek}
				<span
					class="mt-2 line-clamp-2 hidden max-w-[52ch] font-newsreader text-lg text-white/75 italic sm:block"
					>{t.dek}</span
				>
			{/if}
			{#if t.note}<span class="mt-2 block font-libre text-xs font-semibold text-white/60"
					>{t.note}</span
				>{/if}
		</span>
	</a>
{/snippet}

<section class="bg-paper-bg text-ink">
	<div
		class="mx-auto grid w-full max-w-page gap-4 px-5 pt-6 pb-10 md:px-8 md:pt-8 md:pb-14 lg:auto-rows-[200px] lg:grid-cols-12 lg:gap-5"
	>
		<!-- the masthead tile -->
		<div
			class="fp-rise relative flex flex-col justify-between overflow-hidden bg-warm-deep p-6 text-white md:p-8 lg:col-span-5 lg:row-span-2"
		>
			<div
				class="pointer-events-none absolute -top-40 -left-40 h-105 w-130 bg-[radial-gradient(closest-side,rgb(96_165_250/0.25),transparent)]"
				aria-hidden="true"
			></div>
			<div class="relative">
				<h1><LibraryWordmark size="lg" tone="dark" /></h1>
				<p class="mt-3 font-newsreader text-lg leading-normal text-white/70 italic">
					Strategy, reporting and gameplay from the players who define the format.
				</p>
			</div>
			<div class="relative mt-6">
				<LibrarySearch placeholder="Search the Library" />
				{#if topics.length}
					<div class="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Popular topics">
						{#each topics.slice(0, 4) as t (t.slug)}
							<a
								href="/library/tag/{t.slug}"
								class="border border-white/20 bg-white/5 px-2.5 py-1 font-semibold text-white/85 transition-colors hover:border-warm-light hover:text-white"
								>{t.name}</a
							>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if lead}
			<div
				class="fp-rise aspect-video lg:col-span-7 lg:row-span-2 lg:aspect-auto"
				style="animation-delay: 100ms;"
			>
				{@render tile(lead, true)}
			</div>
		{/if}
		{#each rest as t, i (t.href)}
			<div
				class="fp-rise aspect-video lg:col-span-4 lg:aspect-auto"
				style="animation-delay: {180 + i * 80}ms;"
			>
				{@render tile(t, false)}
			</div>
		{/each}
	</div>
</section>
