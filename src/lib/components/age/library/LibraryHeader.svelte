<!--
  LibraryHeader — the top of a Library section's page (Articles, Videos,
  Matches, Topics, search), on a deep navy of the Library's blue: the small
  wordmark, the section's name, a line on it, and a search inside the
  section; underneath, the section tabs. The Library's front page uses LibraryHero instead.

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
	<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-8 pb-7 md:px-8 md:pt-10 md:pb-9">
		<div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
			<div>
				<a href="/library" class="inline-block opacity-85 transition-opacity hover:opacity-100"
					><LibraryWordmark size="sm" tone="dark" /></a
				>
				{#if title}
					<h1
						class="fp-rise mt-4 font-libre text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em] [text-wrap:balance] md:text-[48px]"
					>
						{title}
					</h1>
				{/if}
			</div>
			{#if lead}
				<p class="max-w-[440px] text-[15px] leading-[1.5] text-white/65 md:pb-1.5 md:text-right">
					{lead}
				</p>
			{/if}
		</div>
		{#if search}
			<div class="mt-6 max-w-[760px]"><LibrarySearch {action} {q} {placeholder} {hidden} /></div>
		{/if}
	</div>
	<div class="relative"><LibraryTabs {current} {counts} /></div>
</section>
