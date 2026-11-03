<script>
	/**
	 * The Library's one search: what was found in each section (articles,
	 * videos, matches), a few of each, with a way into that section already
	 * searched; and any topics whose names match.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import LibraryHeader from '$lib/components/age/library/LibraryHeader.svelte';
	import LibraryCard from '$lib/components/age/library/LibraryCard.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';

	let { data } = $props();
	const enc = $derived(encodeURIComponent(data.q));
	const groups = $derived(
		[
			{
				id: 'articles',
				label: 'Articles',
				...data.articles,
				href: `/library/articles?q=${enc}`,
				noun: ['article', 'articles']
			},
			{
				id: 'videos',
				label: 'Videos',
				...data.videos,
				href: `/library/videos?q=${enc}`,
				noun: ['video', 'videos']
			}
		].filter((g) => g.total)
	);
	const chip =
		'flex items-center gap-2 border border-line2 px-3.5 py-2 text-[13px] font-semibold transition-colors hover:border-warm';
</script>

<svelte:head>
	<title>“{data.q}” · Library · AGE</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet groupHead(label, total, href, noun)}
	<header class="flex items-end justify-between gap-4 border-b border-line pb-3">
		<h2 class="flex items-baseline gap-2.5">
			<span class="font-libre text-[22px] font-extrabold tracking-[-0.03em]">{label}</span>
			<span class="text-[13px] text-fade tabular-nums">{total}</span>
		</h2>
		<a {href} class="shrink-0 text-[13px] font-semibold text-soft transition-colors hover:text-warm"
			>See all {total} {total === 1 ? noun[0] : noun[1]} →</a
		>
	</header>
{/snippet}

<AgeShell active="Library">
	<LibraryHeader current="search" counts={data.drawers} title="Results for “{data.q}”" q={data.q} />

	<div class="bg-paper-bg text-ink">
		<div class="mx-auto w-full max-w-[1200px] space-y-14 px-5 pt-8 pb-20 md:px-8 md:pt-10">
			<p class="text-[15px] text-fade" aria-live="polite">
				{data.total
					? `${data.total} ${data.total === 1 ? 'result' : 'results'} across the Library`
					: `Nothing in the Library for “${data.q}”.`}
			</p>

			{#if data.topics.length}
				<section>
					<p class="text-[11px] font-bold tracking-[0.16em] text-fade uppercase">Topics</p>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each data.topics as t (t.slug)}
							<a href="/library/tag/{t.slug}" class={chip}
								>{t.name}<span class="text-[12px] font-normal text-fade">{t.count}</span></a
							>
						{/each}
					</div>
				</section>
			{/if}

			{#each groups as g (g.id)}
				<section>
					{@render groupHead(g.label, g.total, g.href, g.noun)}
					<ul class="mt-6 grid gap-x-8 gap-y-6 lg:grid-cols-2">
						{#each g.stories as s (s.href)}
							<li><LibraryCard story={s} layout="row" /></li>
						{/each}
					</ul>
				</section>
			{/each}

			{#if data.matches.total}
				<section>
					{@render groupHead('Matches', data.matches.total, `/library/matches?q=${enc}`, [
						'match',
						'matches'
					])}
					<ul class="mt-6 grid gap-x-6 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
						{#each data.matches.items as item (item.id)}
							<li>
								<MediaCard
									{item}
									sans
									sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
								/>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if !data.total}
				<section class="border border-line2 px-6 py-12 text-center">
					<p class="text-[20px] font-bold tracking-[-0.02em]">Try fewer words, or a topic:</p>
					<div class="mt-5 flex flex-wrap justify-center gap-2">
						{#each data.suggestions as t (t.slug)}
							<a href="/library/tag/{t.slug}" class={chip}>{t.name}</a>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	</div>
</AgeShell>
