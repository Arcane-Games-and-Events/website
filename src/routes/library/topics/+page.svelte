<script>
	/** The Library → Topics: every topic, A to Z, with how many pieces each holds. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import LibraryHeader from '$lib/components/age/library/LibraryHeader.svelte';

	let { data } = $props();
	const az = $derived([...data.topics].sort((a, b) => a.name.localeCompare(b.name)));
</script>

<svelte:head>
	<title>Topics · Library · AGE</title>
	<meta name="description" content="Every topic in the AGE Library, A to Z." />
</svelte:head>

<AgeShell active="Library">
	<LibraryHeader
		current="topics"
		counts={data.drawers}
		title="Topics"
		lead="Every piece is filed under a topic. Pick one to see everything in it."
		search={false}
	/>

	<div class="bg-paper-bg text-ink">
		<section class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-20 md:px-8 md:pt-12">
			{#if az.length}
				<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each az as t (t.slug)}
						<li>
							<a
								href="/library/tag/{t.slug}"
								class="group flex items-center justify-between gap-4 border border-line bg-paper px-5 py-5 transition-colors hover:border-warm hover:bg-paper"
							>
								<span class="min-w-0">
									<span
										class="block truncate font-libre text-[19px] font-bold tracking-[-0.02em] transition-colors group-hover:text-warm"
										>{t.name}</span
									>
									<span class="mt-0.5 block text-[13px] text-fade"
										>{t.count} {t.count === 1 ? 'piece' : 'pieces'}</span
									>
								</span>
								<span
									class="text-[18px] text-fade transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-warm"
									aria-hidden="true">→</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-[16px] text-fade">No topics yet.</p>
			{/if}
		</section>
	</div>
</AgeShell>
