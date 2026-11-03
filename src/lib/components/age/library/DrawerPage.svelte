<!--
  DrawerPage — the Articles or Videos section: the Library header with a
  search inside the section, the filters, the cards, and pages. The two
  sections differ only in their words.

  Props: data (from drawerPage()), title, lead, noun ([one, many]), path, current
-->
<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import LibraryHeader from './LibraryHeader.svelte';
	import LibraryFilters from './LibraryFilters.svelte';
	import LibraryCard from './LibraryCard.svelte';
	import LibraryPager from './LibraryPager.svelte';
	import { filterHref } from './filterHref.js';

	/** @type {{ data: any, title: string, lead: string, noun: [string, string], path: string, current: string }} */
	let { data, title, lead, noun, path, current } = $props();
	const f = $derived(data.filters);
</script>

<svelte:head>
	<title>{title} · Library · AGE</title>
	<meta name="description" content={lead} />
</svelte:head>

<AgeShell active="Library">
	<LibraryHeader
		{current}
		counts={data.drawers}
		{title}
		{lead}
		q={f.q}
		action={path}
		placeholder="Search {noun[1]} by title, writer or topic"
		hidden={{ access: f.access, tag: f.tag, sort: f.sort === 'oldest' ? 'oldest' : '' }}
	/>

	<div class="bg-paper-bg text-ink">
		<section class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8 md:pt-10">
			<LibraryFilters filters={f} topics={data.topics} total={data.total} {noun} {path} />

			{#if data.stories.length}
				<ul class="mt-8 grid gap-x-6 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.stories as s, i (s.href)}
						<li><LibraryCard story={s} eager={i < 3} /></li>
					{/each}
				</ul>
			{:else}
				<div class="mt-8 border border-line2 px-6 py-14 text-center">
					<p class="text-[22px] font-bold tracking-[-0.02em]">Nothing here for that.</p>
					<p class="mt-2 text-[15px] text-fade">Try fewer words, or search the whole Library.</p>
					<div class="mt-6 flex flex-wrap justify-center gap-3">
						<a
							href={path}
							class="bg-ink px-5 py-3 text-[13px] font-bold text-paper-bg hover:bg-warm"
							>Show every {noun[0]}</a
						>
						{#if f.q}
							<a
								href="/library/search?q={encodeURIComponent(f.q)}"
								class="border border-line2 px-5 py-3 text-[13px] font-bold hover:border-ink"
								>Search everything</a
							>
						{/if}
					</div>
				</div>
			{/if}

			<LibraryPager
				page={data.page}
				totalPages={data.totalPages}
				href={(n) => filterHref(path, f, { page: n })}
			/>
		</section>
	</div>
</AgeShell>
