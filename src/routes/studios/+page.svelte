<script>
	/**
	 * AGE Studios — the Studio's front room. A dark screening-room
	 * masthead with the newest piece as a spread, then a reel of bonus
	 * gameplay, the podcasts (shows, then the latest episodes), interviews
	 * and other video, and a members' strip for everyone else.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import WatchFrame from '$lib/components/age/watch/WatchFrame.svelte';
	import WatchCard from '$lib/components/age/watch/WatchCard.svelte';
	import { KIND, byline, episodeLabel } from '$lib/studio/kinds.js';
	import { clock } from '$lib/desk/video/format.js';

	let { data } = $props();
	const h = $derived(data.home);
	const lead = $derived(h?.lead ?? null);
	const total = $derived(Object.values(h?.counts ?? {}).reduce((n, c) => n + c, 0));

	const JUMPS = $derived(
		[
			['gameplay', 'Bonus gameplay', '#gameplay'],
			['podcast', 'Podcasts', '#podcasts'],
			['interview', 'Interviews', '#interviews'],
			['video', 'Video', '#video']
		].filter(([k]) => h?.counts?.[k])
	);
	const dateOf = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			: '';
	const kicker = 'text-[10.5px] font-extrabold tracking-[0.24em] uppercase';
</script>

<svelte:head>
	<title>AGE Studios</title>
	<meta
		name="description"
		content="Bonus gameplay from the AGE Open, podcasts, interviews and video from AGE Studios."
	/>
</svelte:head>

<AgeShell active="AGE Studios">
	<!-- ============ masthead ============ -->
	<section class="relative bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-12 md:px-8 md:pt-14 md:pb-16">
			<div class="flex items-center gap-4 md:gap-6">
				<span class="h-px flex-1 bg-warm-light/40"></span>
				<p class="{kicker} flex items-center gap-3 text-warm-light">
					<span aria-hidden="true">◆</span> AGE Studios <span aria-hidden="true">◆</span>
				</p>
				<span class="h-px flex-1 bg-warm-light/40"></span>
			</div>
			<h1
				class="fp-rise mt-5 text-center font-newsreader text-[44px] leading-[0.95] font-semibold tracking-[-0.025em] md:text-[76px]"
			>
				Watch <span class="text-warm-light italic">&amp;</span> Listen
			</h1>
			<p
				class="fp-rise mx-auto mt-3 max-w-[600px] text-center font-newsreader text-[16px] leading-[1.45] text-paper-bg/70 italic md:text-[19px]"
				style="animation-delay: 100ms;"
			>
				Feature matches from the main stage, and conversations with the people who play at the top.
			</p>

			{#if JUMPS.length > 1}
				<nav class="mt-7 flex flex-wrap justify-center gap-2" aria-label="Jump to">
					{#each JUMPS as [k, label, href] (k)}
						<a
							{href}
							class="border border-paper-bg/25 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:border-warm-light hover:text-warm-light"
							>{label} <span class="text-paper-bg/50 tabular-nums">{h.counts[k]}</span></a
						>
					{/each}
				</nav>
			{/if}

			{#if lead}
				<a
					href={lead.href}
					class="group mt-10 grid border border-paper-bg/15 md:mt-12 md:grid-cols-[7fr_5fr]"
				>
					<WatchFrame item={lead} sizes="(min-width: 1024px) 700px, 100vw" eager />
					<span class="flex flex-col justify-center p-6 md:p-9">
						<span class="{kicker} text-warm-light"
							>Newest · {lead.audio ? 'Episode' : KIND[lead.kind].short}</span
						>
						<span
							class="mt-3 block font-newsreader text-[28px] leading-[1.04] font-semibold tracking-[-0.015em] [text-wrap:balance] group-hover:text-warm-light md:text-[38px]"
							>{lead.title}</span
						>
						{#if byline(lead)}
							<span class="mt-3 block font-newsreader text-[17px] text-paper-bg/70 italic"
								>{byline(lead)}</span
							>
						{/if}
						<span class="mt-5 flex flex-wrap items-center gap-3 text-[12px] text-paper-bg/60">
							{dateOf(lead.publishedAt)}{#if lead.duration}<span aria-hidden="true">·</span>{clock(
									lead.duration
								)}{/if}
							{#if lead.isPremium}<PremiumTag />{/if}
						</span>
						<span
							class="mt-6 inline-flex w-fit items-center gap-2 bg-warm px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors group-hover:bg-paper-bg group-hover:text-ink"
							>{lead.audio ? '♪ Listen now' : '▶ Watch now'}</span
						>
					</span>
				</a>
			{/if}
		</div>
	</section>

	{#if !total}
		<section class="mx-auto w-full max-w-[1200px] px-5 py-16 text-center md:px-8">
			<p class="font-newsreader text-[24px] font-semibold">The studio lights are warming up.</p>
			<p class="mt-2 font-newsreader text-[17px] text-soft italic">
				New matches, episodes and interviews land here first.
			</p>
		</section>
	{/if}

	<!-- ============ gameplay ============ -->
	{#if h?.gameplay?.length}
		<section id="gameplay" class="scroll-mt-20 border-t border-paper-bg/10 bg-ink text-paper-bg">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
				<div class="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p class="{kicker} text-warm-light">
							<span aria-hidden="true">◆</span> From the main stage
						</p>
						<h2
							class="mt-2 font-newsreader text-[34px] leading-none font-semibold tracking-[-0.02em] md:text-[46px]"
						>
							Bonus gameplay
						</h2>
					</div>
					<a
						href="/studios/gameplay"
						class="border-b-2 border-warm-light pb-1 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[letter-spacing] hover:tracking-[0.26em]"
						>All {h.counts.gameplay} {h.counts.gameplay === 1 ? 'match' : 'matches'} →</a
					>
				</div>
				<div class="mt-6 h-[5px] border-t border-b border-paper-bg/25" aria-hidden="true"></div>
				<ul class="mt-8 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
					{#each h.gameplay as g (g.id)}
						<li>
							<a href={g.href} class="group block">
								<WatchFrame
									item={g}
									sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw"
								/>
								{#if g.player1Hero || g.player2Hero}
									<span
										class="mt-3 flex flex-wrap items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.12em] uppercase"
									>
										<span class="border border-warm-light/50 px-1.5 py-[1px] text-warm-light"
											>{g.player1Hero || '—'}</span
										>
										<span class="text-paper-bg/40 normal-case italic">vs</span>
										<span class="border border-warm-light/50 px-1.5 py-[1px] text-warm-light"
											>{g.player2Hero || '—'}</span
										>
									</span>
								{/if}
								<span
									class="mt-2 block font-newsreader text-[18px] leading-[1.15] font-semibold group-hover:text-warm-light"
									>{g.title}</span
								>
								{#if g.player1Name || g.player2Name}
									<span class="mt-1 block text-[12px] text-paper-bg/55"
										>{[g.player1Name, g.player2Name].filter(Boolean).join(' vs ')}</span
									>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	<!-- ============ podcasts ============ -->
	{#if h?.podcasts?.length || h?.shows?.some((s) => s.kind === 'podcast')}
		{@const pods = h.shows.filter((s) => s.kind === 'podcast')}
		<section id="podcasts" class="scroll-mt-20 border-b border-line">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
				<div class="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-3">
					<div>
						<p class="{kicker} text-warm"><span aria-hidden="true">◆</span> On the mic</p>
						<h2
							class="mt-2 font-newsreader text-[34px] leading-none font-semibold tracking-[-0.02em] md:text-[46px]"
						>
							Podcasts
						</h2>
					</div>
					<a
						href="/studios/podcasts"
						class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:text-warm"
						>Every episode →</a
					>
				</div>
				<div class="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
					{#if pods.length}
						<ul class="grid grid-cols-2 gap-4">
							{#each pods.slice(0, 4) as s (s.id)}
								<li>
									<a href="/studios/shows/{s.slug}" class="group block">
										<span class="relative block aspect-square overflow-hidden bg-ink">
											{#if s.cover}
												<Picture
													image={s.cover}
													alt=""
													sizes="260px"
													class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
												/>
											{:else}
												<span
													class="absolute inset-0 flex items-center justify-center p-4 text-center font-newsreader text-[22px] font-semibold text-paper-bg"
													>{s.name}</span
												>
											{/if}
										</span>
										<span
											class="mt-2 block font-newsreader text-[17px] font-semibold group-hover:text-warm"
											>{s.name}</span
										>
										<span class="block text-[11.5px] text-fade"
											>{s.host ? `${s.host} · ` : ''}{s.episodes}
											{s.episodes === 1 ? 'episode' : 'episodes'}</span
										>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
					<div>
						<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
							Latest episodes
						</p>
						<ol class="mt-2 divide-y divide-line border-y border-line">
							{#each h.podcasts as e (e.id)}
								<li>
									<a
										href={e.href}
										class="group grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 py-3.5"
									>
										<WatchFrame item={e} square sizes="64px" />
										<span class="min-w-0">
											<span
												class="block truncate text-[10px] font-extrabold tracking-[0.12em] text-warm uppercase"
												>{[e.show?.name, episodeLabel(e)].filter(Boolean).join(' · ')}</span
											>
											<span
												class="mt-0.5 block font-newsreader text-[17px] leading-tight font-semibold group-hover:text-warm"
												>{e.title}</span
											>
											{#if e.guests}<span class="block truncate text-[12px] text-soft"
													>with {e.guests}</span
												>{/if}
										</span>
										<span class="flex items-center gap-2 text-[11px] text-fade tabular-nums">
											{e.duration ? clock(e.duration) : ''}
											<span
												class="flex h-8 w-8 items-center justify-center border border-ink text-[11px] transition-colors group-hover:bg-ink group-hover:text-paper-bg"
												aria-hidden="true">{e.audio ? '♪' : '▶'}</span
											>
										</span>
									</a>
								</li>
							{:else}
								<li class="py-4 text-[13.5px] text-soft">The first episodes are on their way.</li>
							{/each}
						</ol>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- ============ interviews ============ -->
	{#if h?.interviews?.length}
		<section id="interviews" class="scroll-mt-20 bg-paper">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
				<div class="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-3">
					<div>
						<p class="{kicker} text-warm"><span aria-hidden="true">◆</span> In conversation</p>
						<h2
							class="mt-2 font-newsreader text-[34px] leading-none font-semibold tracking-[-0.02em] md:text-[46px]"
						>
							Interviews
						</h2>
					</div>
					<a
						href="/studios/interviews"
						class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:text-warm"
						>All interviews →</a
					>
				</div>
				<ul class="mt-8 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
					{#each h.interviews as i (i.id)}
						<li><WatchCard item={i} sizes="(min-width: 1024px) 380px, 100vw" /></li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	<!-- ============ more video ============ -->
	{#if h?.video?.length}
		<section id="video" class="scroll-mt-20">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
				<div class="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-3">
					<h2
						class="font-newsreader text-[30px] leading-none font-semibold tracking-[-0.02em] md:text-[38px]"
					>
						More video
					</h2>
					<a
						href="/studios/video"
						class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:text-warm"
						>All video →</a
					>
				</div>
				<ul class="mt-8 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
					{#each h.video as v (v.id)}
						<li><WatchCard item={v} /></li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	<!-- ============ members ============ -->
	{#if !data.member && total}
		<section class="bg-academy text-paper-bg">
			<div
				class="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-6 px-5 py-10 md:px-8"
			>
				<div class="max-w-[640px]">
					<p class="{kicker} text-gold"><span aria-hidden="true">◆</span> AGE Premium</p>
					<p class="mt-2 font-newsreader text-[28px] leading-tight font-semibold md:text-[34px]">
						Every match, every episode, the whole library.
					</p>
					<p class="mt-2 font-newsreader text-[16px] text-paper-bg/70 italic">
						Members get the full Studio archive alongside Premium articles and course updates.
					</p>
				</div>
				<a
					href="/premium"
					class="bg-gold px-6 py-3.5 text-[11px] font-extrabold tracking-[0.14em] text-[#241b07] uppercase hover:bg-paper-bg"
					>Become a member</a
				>
			</div>
		</section>
	{/if}
</AgeShell>
