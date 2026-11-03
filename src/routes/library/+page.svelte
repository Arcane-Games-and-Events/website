<script>
	/**
	 * The Library's front page, on paper: the hero (the masthead, one
	 * search, popular topics, and the newest thing to read, watch and
	 * replay on a blue panel), then the latest as a bento mosaic, the
	 * newest matches, the topics, and Premium for anyone without it.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import LibraryHero from '$lib/components/age/library/LibraryHero.svelte';
	import LibraryMosaic from '$lib/components/age/library/LibraryMosaic.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';
	import LibraryPremiumTile from '$lib/components/age/home/LibraryPremiumTile.svelte';
	import { page } from '$app/state';
	import { reveal } from '$lib/actions/reveal.js';

	let { data } = $props();
	const member = $derived(!!page.data?.isPremiumMember);
	const latest = $derived(data.newest);
</script>

<svelte:head>
	<title>Library — AGE</title>
	<meta
		name="description"
		content="Every article, video and match from AGE, all searchable: strategy, reporting and gameplay from AGE Open."
	/>
</svelte:head>

{#snippet premium(cls)}<LibraryPremiumTile class={cls} />{/snippet}

{#snippet head(title, href, label)}
	<header class="flex items-end justify-between gap-4">
		<h2
			class="font-libre text-[24px] leading-none font-extrabold tracking-[-0.03em] md:text-[30px]"
		>
			{title}
		</h2>
		{#if href}
			<a
				{href}
				class="shrink-0 text-[13px] font-semibold text-soft transition-colors hover:text-warm"
				>{label} →</a
			>
		{/if}
	</header>
{/snippet}

<AgeShell active="Library">
	<LibraryHero counts={data.drawers} spotlight={data.spotlight} topics={data.topics} />

	<div class="bg-paper-bg text-ink">
		<div
			class="mx-auto w-full max-w-[1200px] space-y-20 px-5 pt-8 pb-20 md:space-y-24 md:px-8 md:pt-12"
		>
			{#if latest.length}
				<section use:reveal>
					{@render head('Latest', '/library/articles', 'All articles')}
					<div class="mt-6">
						<LibraryMosaic stories={latest} aside={member ? undefined : premium} />
					</div>
				</section>
			{/if}

			{#if data.matches.length}
				<section use:reveal>
					{@render head('From AGE Open', '/library/matches', 'All matches')}
					<ul class="mt-6 grid gap-x-6 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
						{#each data.matches as item (item.id)}
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

			<section
				use:reveal
				class="grid gap-12 {member ? '' : 'lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14'}"
			>
				{#if data.topics.length}
					<div>
						{@render head('Topics', '/library/topics', 'All topics')}
						<ul class="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
							{#each data.topics as t (t.slug)}
								<li>
									<a
										href="/library/tag/{t.slug}"
										class="flex h-full items-center justify-between gap-3 border border-line bg-paper px-4 py-3.5 transition-colors hover:border-warm hover:bg-paper"
									>
										<span class="min-w-0 truncate text-[14px] font-semibold">{t.name}</span>
										<span class="shrink-0 text-[12px] text-fade tabular-nums">{t.count}</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if !member}
					<aside
						class="relative h-fit overflow-hidden border border-prem/60 bg-[linear-gradient(140deg,rgb(28_122_75/0.12),rgb(28_122_75/0.03))] px-6 py-8 md:px-8"
					>
						<p class="text-[11px] font-bold tracking-[0.16em] text-prem uppercase">AGE Premium</p>
						<p
							class="mt-3 font-libre text-[26px] leading-[1.08] font-extrabold tracking-[-0.03em] [text-wrap:balance]"
						>
							Unlock the whole Library.
						</p>
						<p class="mt-3 text-[15px] leading-[1.55] text-soft">
							Every article, every video and every match, and the courses you own kept current.
						</p>
						<a
							href="/premium"
							class="mt-6 inline-flex items-center bg-prem px-5 py-3 text-[13px] font-bold text-white transition-[filter] hover:brightness-110"
							>Get Premium</a
						>
					</aside>
				{/if}
			</section>

			{#if !latest.length && !data.matches.length}
				<div class="border border-line2 px-6 py-16 text-center">
					<p class="text-[22px] font-bold tracking-[-0.02em]">The Library is filling up.</p>
					<p class="mt-2 text-[15px] text-fade">The first pieces arrive soon.</p>
				</div>
			{/if}
		</div>
	</div>
</AgeShell>
