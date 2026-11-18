<script>
	/**
	 * The Library's front page, with the pictures doing the work: the top as
	 * one bento grid (a navy masthead tile with the wordmark, search and
	 * popular topics, the newest article big, then the newest video, match
	 * and one more piece); then the sections as colour buttons. On paper below: the rest of the newest as the
	 * mosaic (with the Premium tile in it for non-members), the newest
	 * matches as a filmstrip, the topics as picture tiles, and Premium for
	 * anyone without it.
	 */
	import Seo from '$lib/components/seo/Seo.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import LibraryTabs from '$lib/components/age/library/LibraryTabs.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';
	import LibraryMosaic from '$lib/components/age/library/LibraryMosaic.svelte';
	import LibraryHero from '$lib/components/age/library/LibraryHero.svelte';
	import LibraryPremiumTile from '$lib/components/age/home/LibraryPremiumTile.svelte';
	import { page } from '$app/state';
	import { reveal } from '$lib/actions/reveal.js';

	let { data } = $props();
	const member = $derived(!!page.data?.isPremiumMember);

	// The top shows the newest article, video and match and one more piece;
	// the mosaic takes the rest.
	const latest = $derived.by(() => {
		const shown = new Set([data.spotlight?.read?.href, data.spotlight?.watch?.href]);
		const extra = data.newest.find((s) => !shown.has(s.href));
		return data.newest.filter((s) => !shown.has(s.href) && s.href !== extra?.href);
	});
</script>

<!-- the cover story's words: over the picture from md up, under it on phones -->
<Seo
	title="Library — AGE"
	description="Every article, video and match from AGE, all searchable: strategy, reporting and gameplay from AGE Open."
	image={data.newest[0]?.image || '/banner/articles-banner.webp'}
/>

{#snippet premiumTile(cls)}<LibraryPremiumTile class={cls} />{/snippet}

{#snippet sectionHead(kicker, title, href, label)}
	<header class="flex items-end justify-between gap-4 border-b-3 border-ink pb-3">
		<div>
			<p class="font-libre text-xs font-extrabold tracking-widest text-warm uppercase">
				<span aria-hidden="true">◆</span>
				{kicker}
			</p>
			<h2
				class="mt-1.5 font-newsreader text-3xl leading-none font-semibold tracking-tight md:text-5xl"
			>
				{title}
			</h2>
		</div>
		{#if href}
			<a
				{href}
				class="group shrink-0 font-libre text-xs font-extrabold tracking-widest uppercase transition-colors hover:text-warm"
				>{label}
				<span class="inline-block transition-transform group-hover:translate-x-1">→</span></a
			>
		{/if}
	</header>
{/snippet}

<AgeShell active="Library">
	<!-- ============ the top: one bento grid ============ -->
	<LibraryHero spotlight={data.spotlight} topics={data.allTopics} stories={data.newest} />

	<!-- ============ the sections, as buttons ============ -->
	<LibraryTabs current="all" counts={data.drawers} />

	<div class="bg-paper-bg text-ink">
		<div
			class="mx-auto w-full max-w-page space-y-20 px-5 pt-12 pb-20 md:space-y-28 md:px-8 md:pt-16"
		>
			<!-- ============ the latest, as a mosaic ============ -->
			{#if latest.length}
				<section use:reveal>
					{@render sectionHead(
						'The latest',
						'More to read and watch',
						'/library/articles',
						'Everything'
					)}
					<div class="mt-8">
						<LibraryMosaic stories={latest} aside={member ? undefined : premiumTile} />
					</div>
				</section>
			{/if}
		</div>

		<!-- ============ the filmstrip of matches ============ -->
		{#if data.matches.length}
			<section use:reveal class="border-y border-line2 bg-paper py-14 md:py-16">
				<div class="mx-auto w-full max-w-page px-5 md:px-8">
					{@render sectionHead(
						'From AGE Open',
						'Matches to watch',
						'/library/matches',
						'All matches'
					)}
				</div>
				<ul
					class="st-rail mx-auto mt-8 flex w-full max-w-page snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-2 md:scroll-px-8 md:gap-6 md:px-8"
					aria-label="Matches"
				>
					{#each data.matches as item (item.id)}
						<li class="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-[31.5%]">
							<MediaCard {item} sans sizes="(min-width: 1024px) 380px, 80vw" />
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="mx-auto w-full max-w-page space-y-20 px-5 py-20 md:space-y-24 md:px-8">
			<!-- ============ topics as picture tiles ============ -->
			{#if data.topics.length}
				<section use:reveal>
					{@render sectionHead('Browse', 'Topics', '/library/topics', 'All topics')}
					<ul class="mt-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
						{#each data.topics as t, i (t.slug)}
							<li use:reveal={{ delay: (i % 4) * 70 }}>
								<a
									href="/library/tag/{t.slug}"
									class="group relative block aspect-video overflow-hidden bg-warm-deep"
								>
									{#if t.cover}
										<Picture
											image={t.cover}
											alt=""
											sizes="(min-width: 1024px) 290px, 50vw"
											class="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
										/>
									{/if}
									<span
										class="absolute inset-0 bg-[linear-gradient(to_top,rgb(10_14_32/0.88),rgb(10_14_32/0.15)_70%)]"
										aria-hidden="true"
									></span>
									<span
										class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5 md:p-4"
									>
										<span
											class="font-newsreader text-xl leading-none font-semibold text-white md:text-2xl"
											>{t.name}</span
										>
										<span class="shrink-0 font-libre text-xs font-bold text-white/70 tabular-nums"
											>{t.count}</span
										>
									</span>
									<span
										class="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-warm-light transition-transform duration-500 group-hover:scale-x-100"
										aria-hidden="true"
									></span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<!-- ============ Premium ============ -->
			{#if !member}
				<section
					use:reveal
					class="grid items-center gap-6 border-y-3 border-double border-prem px-1 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:px-2"
				>
					<div>
						<p class="font-libre text-xs font-extrabold tracking-widest text-prem uppercase">
							◆ AGE Premium
						</p>
						<p
							class="mt-2 font-newsreader text-3xl leading-none font-semibold tracking-tight md:text-4xl"
						>
							Unlock the whole Library.
						</p>
						<p class="mt-2 font-newsreader text-lg text-soft italic">
							Every article, every video and every match, and the courses you own kept current.
						</p>
					</div>
					<a
						href="/premium"
						class="inline-flex h-12 items-center justify-self-start bg-prem px-6 font-libre text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 md:justify-self-end"
						>Become a member →</a
					>
				</section>
			{/if}

			{#if !data.newest.length && !data.matches.length}
				<div class="border border-line2 px-6 py-16 text-center">
					<p class="font-newsreader text-2xl font-semibold">The Library is filling up.</p>
					<p class="mt-2 text-base text-fade">The first pieces arrive soon.</p>
				</div>
			{/if}
		</div>
	</div>
</AgeShell>
