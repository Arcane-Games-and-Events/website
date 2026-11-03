<script>
	/**
	 * AGE Studios: everything AGE makes, printed on paper in flat colour.
	 * The featured project leads; then the projects (with a colour chart
	 * of their kinds), shows and their newest episodes, the partners we
	 * work with, and the newest matches, which live in the Library.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import StudiosMasthead from '$lib/components/age/studios/StudiosMasthead.svelte';
	import SectionHead from '$lib/components/age/studios/SectionHead.svelte';
	import ProjectBlock from '$lib/components/age/studios/ProjectBlock.svelte';
	import ShowTile from '$lib/components/age/studios/ShowTile.svelte';
	import PartnerTile from '$lib/components/age/studios/PartnerTile.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';
	import { PROJECT_TYPE, PROJECT_TYPES } from '$lib/studio/projects.js';
	import { reveal } from '$lib/actions/reveal.js';

	let { data } = $props();
	const hub = $derived(data.hub);
	const lead = $derived(hub.projects[0] ?? null);
	const projects = $derived(hub.projects.slice(1, 7));
	// The colour chart: each kind of project and how many there are.
	const chart = $derived(
		PROJECT_TYPES.map((t) => ({
			id: t,
			...PROJECT_TYPE[t],
			n: hub.projects.filter((p) => p.type === t).length
		})).filter((t) => t.n)
	);
	const creators = $derived(hub.partners?.creators ?? []);
	const picks = $derived(hub.partners?.latest ?? []);
	const empty = $derived(
		!hub.projects.length &&
			!hub.shows.length &&
			!hub.episodes.length &&
			!creators.length &&
			!hub.matches.length
	);
	const cards = '(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw';
	// On phones each section shows a few, so the page stays short; "See all" has the rest.
	const phoneFew = (n) =>
		n === 2 ? 'max-sm:[&>li:nth-child(n+3)]:hidden' : 'max-sm:[&>li:nth-child(n+5)]:hidden';
</script>

<svelte:head>
	<title>AGE Studios</title>
	<meta
		name="description"
		content="The creative side of AGE: interactive pages, stats, software, shows and films, and the creators we partner with."
	/>
</svelte:head>

<AgeShell active="AGE Studios">
	<StudiosMasthead big current="all" />

	<div
		class="mx-auto w-full max-w-[1200px] space-y-16 px-5 pt-10 pb-20 md:space-y-24 md:px-8 md:pt-14"
	>
		{#if lead}
			<section aria-label="Featured" class="fp-rise">
				<ProjectBlock project={lead} lead eager />
			</section>
		{/if}

		{#if projects.length || chart.length > 1}
			<section use:reveal>
				<SectionHead
					title="Projects"
					strap="Pages to play with, numbers to dig into, and things we’ve built."
					href="/studios/projects"
					label="Every project"
					block="bg-studio"
				/>
				{#if chart.length > 1}
					<nav class="mt-5 flex flex-wrap gap-2" aria-label="Kinds of project">
						{#each chart as t (t.id)}
							<a
								href="/studios/projects?type={t.id}"
								class="group flex items-stretch border border-ink/15 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink"
							>
								<span class="st-dots relative w-6 {t.block}" aria-hidden="true"></span>
								<span class="px-2.5 py-2">{t.plural}</span>
								<span
									class="border-l border-ink/15 px-2 py-2 tracking-normal text-fade tabular-nums"
									>{t.n}</span
								>
							</a>
						{/each}
					</nav>
				{/if}
				{#if projects.length}
					<ul class="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 {phoneFew(4)}">
						{#each projects as p (p.id)}
							<li><ProjectBlock project={p} /></li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if hub.shows.length || hub.episodes.length}
			<section use:reveal>
				<SectionHead
					title="Shows"
					strap="Podcasts, interviews and films from the AGE team."
					href="/studios/shows"
					label="Every show"
					block="bg-gold"
				/>
				{#if hub.shows.length}
					<ul class="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
						{#each hub.shows.slice(0, 4) as s (s.id)}
							<li><ShowTile show={s} /></li>
						{/each}
					</ul>
				{/if}
				{#if hub.episodes.length}
					<h3
						class="mt-12 flex items-center gap-2 border-t border-line pt-4 text-[10.5px] font-extrabold tracking-[0.18em] uppercase"
					>
						<span class="text-[8px] text-gold" aria-hidden="true">◆</span> Newest episodes
					</h3>
					<ul class="mt-5 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 {phoneFew(2)}">
						{#each hub.episodes.slice(0, 3) as item (item.id)}
							<li><MediaCard {item} sizes={cards} /></li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if creators.length}
			<section use:reveal>
				<SectionHead
					title="Partners"
					strap="Creators from around the community, picked by the AGE team and playable right here."
					href="/studios/partners"
					label="Every partner"
					block="bg-cc-ne"
				/>
				<ul class="mt-8 grid grid-cols-3 gap-x-4 gap-y-8 md:grid-cols-6">
					{#each creators.slice(0, 6) as c (c.id)}
						<li><PartnerTile creator={c} /></li>
					{/each}
				</ul>
				{#if picks.length}
					<h3
						class="mt-12 flex items-center gap-2 border-t border-line pt-4 text-[10.5px] font-extrabold tracking-[0.18em] uppercase"
					>
						<span class="text-[8px] text-cc-ne" aria-hidden="true">◆</span> Newest picks
					</h3>
					<ul class="mt-5 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 {phoneFew(2)}">
						{#each picks.slice(0, 3) as item (item.id)}
							<li><MediaCard {item} sizes={cards} /></li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if hub.matches.length}
			<section use:reveal>
				<SectionHead
					title="Matches"
					strap="Bonus gameplay from AGE Open lives in the Library, searchable by hero, event and format."
					href="/library/matches"
					label="Search every match"
					block="bg-warm"
				/>
				<ul class="mt-8 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4 {phoneFew(2)}">
					{#each hub.matches as item (item.id)}
						<li>
							<MediaCard {item} sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw" />
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if empty}
			<div class="relative overflow-hidden bg-studio px-6 py-16 text-center text-white md:py-24">
				<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
				<p class="st-wide relative text-[30px] leading-none font-black uppercase md:text-[48px]">
					On the press
				</p>
				<p
					class="relative mx-auto mt-3 max-w-[460px] font-newsreader text-[18px] italic opacity-90"
				>
					Our first projects, shows and partners are being printed. Check back soon.
				</p>
			</div>
		{/if}
	</div>
</AgeShell>
