<!--
  LibraryHero — the top of the Library's front page, on a deep navy of
  the Library's blue. On the
  left: the masthead wordmark, a line on what's inside, one big search,
  and popular topics to start from. On the right, a panel of the Library's
  blue with three tiles: the newest thing to read, to watch and to replay
  (on phones it sits under the search and swipes sideways). Underneath,
  the section tabs.

  Props: counts, spotlight ({ read, watch, replay }), topics
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import LibraryWordmark from './LibraryWordmark.svelte';
	import LibrarySearch from './LibrarySearch.svelte';
	import LibraryTabs from './LibraryTabs.svelte';

	/** @type {{ counts: any, spotlight: { read: any, watch: any, replay: any }, topics: { name: string, slug: string }[] }} */
	let { counts, spotlight, topics } = $props();

	// The three tiles, each a different way in; a story and a match have
	// slightly different shapes, so each is reduced to what a tile shows.
	const tiles = $derived(
		[
			spotlight.read && {
				verb: 'Read',
				what: 'Newest article',
				href: spotlight.read.href,
				title: spotlight.read.title,
				image: spotlight.read.picture ?? { src: spotlight.read.image },
				note: spotlight.read.length
			},
			spotlight.watch && {
				verb: 'Watch',
				what: 'Newest video',
				href: spotlight.watch.href,
				title: spotlight.watch.title,
				image: spotlight.watch.picture ?? { src: spotlight.watch.image },
				note: spotlight.watch.length
			},
			spotlight.replay && {
				verb: 'Replay',
				what: 'Newest match',
				href: spotlight.replay.href,
				title: spotlight.replay.title,
				image:
					spotlight.replay.cover ??
					(spotlight.replay.still ? { src: spotlight.replay.still } : null),
				note: [spotlight.replay.event?.title, spotlight.replay.round].filter(Boolean).join(' · ')
			}
		].filter(Boolean)
	);
</script>

<section class="relative isolate overflow-hidden bg-warm-deep text-white">
	<!-- a glow of lighter blue from the top left, so the navy isn't flat -->
	<div
		class="pointer-events-none absolute -top-48 -left-48 -z-10 h-[560px] w-[900px] bg-[radial-gradient(closest-side,rgb(96_165_250/0.22),transparent)]"
		aria-hidden="true"
	></div>

	<div
		class="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-8 px-5 pt-8 pb-8 md:px-8 md:pt-11 md:pb-11 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-14"
	>
		<div class="min-w-0">
			<h1 class="fp-rise"><LibraryWordmark size="lg" tone="dark" /></h1>
			<p
				class="fp-rise mt-3 max-w-[520px] font-newsreader text-[17px] leading-[1.45] text-white/70 italic md:mt-4 md:text-[19px]"
				style="animation-delay: 100ms;"
			>
				Strategy, reporting and gameplay from the players who define the format.
			</p>
			<div class="fp-rise mt-6 max-w-[640px]" style="animation-delay: 160ms;">
				<LibrarySearch large />
				{#if topics.length}
					<div
						class="mt-3.5 flex flex-wrap items-center gap-2 text-[12.5px]"
						aria-label="Popular topics"
					>
						<span class="text-white/50">Popular:</span>
						{#each topics.slice(0, 5) as t (t.slug)}
							<a
								href="/library/tag/{t.slug}"
								class="border border-white/20 bg-white/[0.07] px-3 py-1.5 font-semibold text-white/85 transition-colors hover:border-warm-light hover:bg-white/[0.12] hover:text-white"
								>{t.name}</a
							>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if tiles.length}
			<!-- the newest of each kind, on a panel of the Library's blue -->
			<div
				class="fp-rise relative -mx-5 bg-[linear-gradient(135deg,#2f5bd8,var(--color-warm))] px-5 py-5 md:-mx-8 md:px-8 lg:mx-0 lg:px-5 lg:shadow-[10px_10px_0_0_rgb(96_165_250/0.45)]"
				style="animation-delay: 240ms;"
			>
				<p
					class="relative flex items-center gap-3 text-[10.5px] font-bold tracking-[0.2em] text-white/85 uppercase"
				>
					New in the Library <span class="h-px flex-1 bg-white/30"></span>
				</p>
				<ul
					class="st-rail relative -mx-5 mt-3.5 flex scroll-px-5 gap-3 overflow-x-auto px-5 md:-mx-8 md:scroll-px-8 md:px-8 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
					aria-label="Newest in the Library"
				>
					{#each tiles as t (t.href)}
						<li class="w-[82%] shrink-0 sm:w-[46%] lg:w-auto">
							<a href={t.href} class="group flex h-full items-center gap-3.5 bg-paper-bg p-2.5">
								<span
									class="relative block aspect-video w-[104px] shrink-0 overflow-hidden bg-panel"
								>
									{#if t.image}
										<Picture
											image={t.image}
											alt=""
											sizes="104px"
											class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
										/>
									{/if}
								</span>
								<span class="min-w-0 flex-1">
									<span class="flex items-baseline gap-2">
										<span class="text-[10.5px] font-bold tracking-[0.16em] text-warm uppercase"
											>{t.verb}</span
										>
										<span class="truncate text-[11px] text-fade">{t.what}</span>
									</span>
									<span
										class="mt-1 line-clamp-2 block text-[14px] leading-[1.3] font-semibold text-ink transition-colors group-hover:text-warm"
										>{t.title}</span
									>
									{#if t.note}<span class="mt-0.5 block truncate text-[11.5px] text-fade"
											>{t.note}</span
										>{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
	<LibraryTabs current="all" {counts} />
</section>
