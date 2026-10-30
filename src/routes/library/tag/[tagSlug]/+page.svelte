<script>
	/**
	 * Tag page — one topic's shelf in the Library: an ink masthead with the
	 * topic's name, its newest piece across the full row, the rest beneath
	 * (three to a row once there are enough), and the other topics.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import StoryCard from '$lib/components/age/library/StoryCard.svelte';
	import { storyCardSheet, toStories } from '$lib/components/age/library/stories.js';
	import { reveal } from '$lib/actions/reveal.js';

	let { data } = $props();

	const PER_PAGE = 12;
	const stories = $derived(toStories(data.articles));
	const lead = $derived(stories[0] ?? null);
	const rest = $derived(stories.slice(1));
	let shownCount = $state(PER_PAGE);
	const shown = $derived(rest.slice(0, shownCount));
	// A small topic shouldn't leave one card stranded in a row of three:
	// one more piece runs the full row, two share it, then three to a row.
	const restVariant = $derived(rest.length === 1 ? 'wide' : 'standard');
	const restSpan = $derived(
		rest.length === 1
			? 'sm:col-span-2 lg:col-span-12'
			: rest.length === 2
				? 'lg:col-span-6'
				: 'lg:col-span-4'
	);

	const counts = $derived({
		articles: stories.filter((s) => s.kind === 'article').length,
		videos: stories.filter((s) => s.kind === 'video').length
	});
	const countLine = $derived(
		[
			counts.articles && `${counts.articles} ${counts.articles === 1 ? 'article' : 'articles'}`,
			counts.videos && `${counts.videos} ${counts.videos === 1 ? 'video' : 'videos'}`
		]
			.filter(Boolean)
			.join(' · ')
	);
	const description = $derived(
		stories.length
			? `${data.tag.name} in the AGE Library: ${countLine} on Flesh and Blood, newest first.`
			: `${data.tag.name} in the AGE Library.`
	);
</script>

<svelte:head>
	<title>{data.tag.name} — Library — AGE</title>
	<meta name="description" content={description} />
</svelte:head>

<AgeShell active="Library">
	<!-- ============ ink masthead ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-10 md:px-8 md:pt-12 md:pb-14">
			<nav
				class="fp-rise flex items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-paper-bg/60 uppercase"
				aria-label="Breadcrumb"
			>
				<a href="/library" class="transition-colors hover:text-warm-light">Library</a>
				<span aria-hidden="true">/</span>
				<a href="/library#topics" class="transition-colors hover:text-warm-light">Topics</a>
			</nav>
			<div
				class="mt-8 flex flex-col items-start gap-5 md:mt-12 md:flex-row md:items-end md:justify-between md:gap-10"
			>
				<div class="min-w-0">
					<p
						class="fp-rise flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.24em] text-warm-light uppercase"
						style="animation-delay: 80ms;"
					>
						<span class="text-[8px]" aria-hidden="true">◆</span> Topic
					</p>
					<h1
						class="fp-rise mt-3 font-newsreader text-[44px] leading-[0.95] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[72px]"
						style="animation-delay: 140ms;"
					>
						{data.tag.name}
					</h1>
				</div>
				{#if stories.length}
					<p
						class="fp-rise shrink-0 text-[10px] font-extrabold tracking-[0.22em] text-paper-bg/70 uppercase md:pb-2 md:text-right"
						style="animation-delay: 200ms;"
					>
						{countLine}
						{#if lead?.dateLong}<span class="block pt-1.5 text-paper-bg/45"
								>Latest {lead.dateLong}</span
							>{/if}
					</p>
				{/if}
			</div>
			<div
				class="fp-rise mt-6 h-[5px] border-t border-b border-paper-bg/30 md:mt-8"
				style="animation-delay: 240ms;"
				aria-hidden="true"
			></div>
		</div>
	</section>

	<!-- ============ the shelf ============ -->
	<section class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-12 md:px-8 md:pt-14 md:pb-16">
		{#if lead}
			<ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6">
				<li class="border border-line {storyCardSheet('wide')} sm:col-span-2 lg:col-span-12">
					<StoryCard story={lead} variant="wide" />
				</li>
				{#each shown as s, i (s.href)}
					<li
						class="border border-line {storyCardSheet(restVariant)} {restSpan}"
						use:reveal={{ delay: (i % 3) * 60 }}
					>
						<StoryCard story={s} variant={restVariant} />
					</li>
				{/each}
			</ul>
			{#if rest.length > shownCount}
				<div class="mt-8 flex justify-center border-t border-line pt-6">
					<button
						type="button"
						onclick={() => (shownCount += PER_PAGE)}
						class="border-[1.5px] border-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
					>
						Show more · {rest.length - shownCount} left
					</button>
				</div>
			{/if}
		{:else}
			<div class="border-[3px] border-double border-ink px-6 py-12 text-center">
				<p class="font-newsreader text-[24px] font-semibold">
					Nothing filed under {data.tag.name} yet.
				</p>
				<p class="mt-2 font-newsreader text-[16px] text-soft italic">
					New pieces land here as they're published.
				</p>
				<a
					href="/library"
					class="mt-5 inline-flex items-center bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
					>Browse the Library</a
				>
			</div>
		{/if}
	</section>

	<!-- ============ other topics ============ -->
	<section class="border-t border-line bg-paper" use:reveal>
		<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-14">
			<div class="flex items-baseline justify-between gap-4">
				<h2
					class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
				>
					<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
					More topics
				</h2>
				<a
					href="/library"
					class="shrink-0 text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors hover:text-warm"
					>All of the Library →</a
				>
			</div>
			{#if data.otherTopics.length}
				<ul class="mt-5 grid border-t border-line sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
					{#each data.otherTopics as t (t.slug)}
						<li class="border-b border-line">
							<a
								href="/library/tag/{t.slug}"
								class="group flex items-baseline justify-between gap-4 py-3.5"
							>
								<span class="font-newsreader text-[18px] font-semibold">
									<span class="fp-ul">{t.name}</span>
								</span>
								<span class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
									>{t.count} {t.count === 1 ? 'piece' : 'pieces'} →</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-4 font-newsreader text-[16px] text-soft italic">
					This is the only topic in the Library so far.
				</p>
			{/if}
		</div>
	</section>
</AgeShell>
