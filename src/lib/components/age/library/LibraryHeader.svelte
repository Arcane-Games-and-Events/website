<!--
  LibraryHeader — the top of a Library section's page (Articles, Videos,
  Matches, Topics, search), on a deep navy of the Library's blue, the same
  height on every one: the small wordmark at the top; at the bottom the
  section's name, a line on it and (where there is one) a search inside
  the section. Under it, the section buttons. The Library's front page has its own cover (src/routes/library/+page.svelte).

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
-->
<script>
	import LibraryWordmark from './LibraryWordmark.svelte';
	import LibrarySearch from './LibrarySearch.svelte';
	import LibraryTabs from './LibraryTabs.svelte';

	/**
	 * @type {{ current?: string, counts: any, title?: string, lead?: string, q?: string,
	 *   action?: string, placeholder?: string, search?: boolean, hidden?: Record<string, string> }}
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
		hidden = {}
	} = $props();
</script>

<section class="relative overflow-hidden bg-warm-deep text-white">
	<!-- the same height on every section's page (title and line sit at the
	     bottom; the search, when there is one, below them) -->
	<div
		class="relative mx-auto flex h-[300px] w-full max-w-[1200px] flex-col justify-end px-5 pt-7 pb-7 md:h-[268px] md:px-8 md:pt-8 md:pb-9"
	>
		<a
			href="/library"
			class="mb-auto inline-block self-start opacity-85 transition-opacity hover:opacity-100"
			><LibraryWordmark size="sm" tone="dark" /></a
		>
		<div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-10">
			{#if title}
				<h1
					class="fp-rise line-clamp-2 font-libre text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em] [text-wrap:balance] md:line-clamp-1 md:text-[48px]"
				>
					{title}
				</h1>
			{/if}
			{#if lead}
				<p
					class="line-clamp-2 max-w-[440px] shrink-0 text-[15px] leading-[1.5] text-white/65 md:pb-1.5 md:text-right"
				>
					{lead}
				</p>
			{/if}
		</div>
		{#if search}
			<div class="mt-5 max-w-[760px]"><LibrarySearch {action} {q} {placeholder} {hidden} /></div>
		{/if}
	</div>
</section>
<LibraryTabs {current} {counts} />
