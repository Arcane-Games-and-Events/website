<!--
  LibraryHeader — the top of a Library section's page (Articles, Videos,
  Matches, Topics, search), as tall as the Academy's hero (78% of the
  screen, at most 760px) on every one: on the Library's navy, with a
  picture from the section faded in from the right when there is one; the
  small wordmark at the top; at the bottom the section's name, a line on
  it and (where there is one) a search inside the section. Under it, the
  section buttons. The Library's front page has its own cover (src/routes/library/+page.svelte).

  Props:
    current   the tab: articles | videos | matches | topics | search
    counts    section counts
    title     the page's name
    lead      a line under it
    q         what's in the search box
    action    where the search goes (default: everything, /library/search)
    placeholder
    search    false to leave the search out (Matches has its own)
    hidden    other filters to keep when searching
    image     a picture for behind the header (Picture's image shape)
-->
<script>
	import LibraryWordmark from './LibraryWordmark.svelte';
	import LibrarySearch from './LibrarySearch.svelte';
	import LibraryTabs from './LibraryTabs.svelte';
	import Picture from '$lib/components/media/Picture.svelte';

	/**
	 * @type {{ current?: string, counts: any, title?: string, lead?: string, q?: string,
	 *   action?: string, placeholder?: string, search?: boolean, hidden?: Record<string, string>, image?: any }}
	 */
	let {
		current = '',
		counts,
		title = '',
		lead = '',
		q = '',
		action = '/library/search',
		placeholder = 'Search articles, videos and matches',
		search = true,
		hidden = {},
		image = null
	} = $props();
</script>

<section class="relative isolate overflow-hidden bg-warm-deep text-white">
	{#if image}
		<!-- a picture from the section, faded into the navy (as on the Academy) -->
		<div class="absolute inset-0 -z-10" aria-hidden="true">
			<Picture
				{image}
				alt=""
				sizes="100vw"
				loading="eager"
				fetchpriority="high"
				class="lib-head-zoom absolute inset-0 h-full w-full object-cover"
			/>
			<span
				class="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(13_27_69/0.8)_0%,rgb(13_27_69/0.35)_32%,rgb(13_27_69/0.75)_65%,rgb(13_27_69)_100%)] md:bg-gradient-to-r md:from-warm-deep md:via-warm-deep/80 md:to-transparent"
			></span>
		</div>
	{:else}
		<div
			class="pointer-events-none absolute -top-48 -left-48 -z-10 h-140 w-225 bg-[radial-gradient(closest-side,rgb(96_165_250/0.22),transparent)]"
			aria-hidden="true"
		></div>
	{/if}
	<!-- as tall as the Academy's hero on every section's page: the wordmark
	     at the top, the title, its line and any search at the bottom -->
	<div
		class="relative mx-auto flex min-h-[min(78vh,760px)] w-full max-w-page flex-col justify-end px-5 pt-8 pb-10 md:px-8 md:pt-10 md:pb-14"
	>
		<a
			href="/library"
			class="mb-auto inline-block self-start opacity-85 transition-opacity hover:opacity-100"
			><LibraryWordmark size="sm" tone="dark" /></a
		>
		<div class="flex max-w-3xl flex-col gap-3">
			{#if title}
				<h1
					class="fp-rise line-clamp-2 font-libre text-4xl leading-none font-extrabold tracking-tight [text-wrap:balance] md:text-6xl"
				>
					{title}
				</h1>
			{/if}
			{#if lead}
				<p class="line-clamp-3 max-w-xl text-base leading-normal text-white/75 md:text-lg">
					{lead}
				</p>
			{/if}
		</div>
		{#if search}
			<div class="mt-6 max-w-3xl"><LibrarySearch {action} {q} {placeholder} {hidden} /></div>
		{/if}
	</div>
</section>
<LibraryTabs {current} {counts} />

<style>
	/* the picture settles in slowly, like the Academy's */
	@media (prefers-reduced-motion: no-preference) {
		:global(.lib-head-zoom) {
			animation: lib-head-zoom 2.4s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
		}
	}
	@keyframes lib-head-zoom {
		from {
			transform: scale(1.06);
		}
	}
</style>
