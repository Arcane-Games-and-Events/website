<script>
	/** One topic in the Library: its pieces, the newest big, then the other topics. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import LibraryHeader from '$lib/components/age/library/LibraryHeader.svelte';
	import LibraryCard from '$lib/components/age/library/LibraryCard.svelte';
	import LibraryPager from '$lib/components/age/library/LibraryPager.svelte';

	let { data } = $props();
	const path = $derived(`/library/tag/${data.tag.slug}`);
	const lead = $derived(data.page === 1 ? (data.stories[0] ?? null) : null);
	const rest = $derived(lead ? data.stories.slice(1) : data.stories);
</script>

<svelte:head>
	<title>{data.tag.name} · Library · AGE</title>
	<meta name="description" content={`Every AGE Library piece on ${data.tag.name}.`} />
</svelte:head>

<AgeShell active="Library">
	<LibraryHeader
		current="topics"
		counts={data.drawers}
		title={data.tag.name}
		lead="{data.total} {data.total === 1 ? 'piece' : 'pieces'} in this topic."
		search={false}
	/>

	<div class="bg-paper-bg text-ink">
		<section class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-14 md:px-8 md:pt-10">
			<a
				href="/library/topics"
				class="text-[13px] font-semibold text-soft transition-colors hover:text-warm"
				>← All topics</a
			>
			{#if lead}
				<div class="mt-6"><LibraryCard story={lead} layout="feature" eager /></div>
			{/if}
			{#if rest.length}
				<ul class="mt-10 grid gap-x-6 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
					{#each rest as s, i (s.href)}
						<li><LibraryCard story={s} eager={i < 3} /></li>
					{/each}
				</ul>
			{:else if !lead}
				<p class="mt-6 text-[16px] text-fade">Nothing in this topic yet.</p>
			{/if}
			<LibraryPager
				page={data.page}
				totalPages={data.totalPages}
				href={(n) => (n > 1 ? `${path}?page=${n}` : path)}
			/>
		</section>

		{#if data.otherTopics.length}
			<section class="mx-auto w-full max-w-[1200px] px-5 pb-20 md:px-8">
				<p
					class="border-t border-line pt-8 text-[11px] font-bold tracking-[0.16em] text-fade uppercase"
				>
					More topics
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each data.otherTopics as t (t.slug)}
						<a
							href="/library/tag/{t.slug}"
							class="flex items-center gap-2 border border-line2 px-3.5 py-2 text-[13px] font-semibold transition-colors hover:border-warm"
							>{t.name}<span class="text-[12px] font-normal text-fade">{t.count}</span></a
						>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</AgeShell>
