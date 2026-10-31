<script>
	/**
	 * AGE Studios — a broadcast network for AGE's media. A station ident
	 * and ticker up top, a channel bar that sticks and follows you down the
	 * page, then one channel per kind: the featured piece with what's up
	 * next, bonus gameplay, podcasts, interviews, more video, and the AGE
	 * Network of outside creators. Rails swipe sideways on phones.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import WatchFrame from '$lib/components/age/watch/WatchFrame.svelte';
	import StudiosMasthead from '$lib/components/age/watch/StudiosMasthead.svelte';
	import ChannelBar from '$lib/components/age/watch/ChannelBar.svelte';
	import Rail from '$lib/components/age/watch/Rail.svelte';
	import StudiosCard from '$lib/components/age/watch/StudiosCard.svelte';
	import CreatorTile from '$lib/components/age/watch/CreatorTile.svelte';
	import { KIND, byline, episodeLabel } from '$lib/studio/kinds.js';
	import { clock } from '$lib/desk/video/format.js';

	let { data } = $props();
	const h = $derived(data.home);
	const net = $derived(data.network);
	const lead = $derived(h?.lead ?? net?.latest?.[0] ?? null);
	const pods = $derived((h?.shows ?? []).filter((s) => s.kind === 'podcast'));

	/** The channels on this page, in order; empty ones drop out. */
	const channels = $derived(
		[
			{ id: 'featured', label: 'Featured', href: '#featured', on: !!lead },
			{
				id: 'gameplay',
				label: 'Gameplay',
				href: '#gameplay',
				count: h?.counts?.gameplay,
				on: !!h?.gameplay?.length
			},
			{
				id: 'podcasts',
				label: 'Podcasts',
				href: '#podcasts',
				count: h?.counts?.podcast,
				on: !!(h?.podcasts?.length || pods.length)
			},
			{
				id: 'interviews',
				label: 'Interviews',
				href: '#interviews',
				count: h?.counts?.interview,
				on: !!h?.interviews?.length
			},
			{
				id: 'video',
				label: 'Video',
				href: '#video',
				count: h?.counts?.video,
				on: !!h?.video?.length
			},
			{
				id: 'network',
				label: 'Network',
				href: '#network',
				count: net?.creators?.length,
				on: !!net?.latest?.length
			}
		].filter((c) => c.on)
	);
	const ch = (id) => String(channels.findIndex((c) => c.id === id)).padStart(2, '0');

	/** Up next: the newest of each other kind, so the stack mixes them. */
	const upNext = $derived(
		[h?.gameplay?.[0], h?.podcasts?.[0], h?.interviews?.[0], h?.video?.[0], net?.latest?.[0]]
			.filter((i) => i && i.id !== lead?.id)
			.slice(0, 3)
	);
	const premiumOnSite = $derived(
		[h?.lead, ...(h?.gameplay ?? []), ...(h?.podcasts ?? []), ...(h?.interviews ?? [])].some(
			(i) => i?.isPremium
		)
	);
	const dateOf = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			: '';
	const tagOf = (i) =>
		i.network ? `Network · ${i.creator.name}` : i.audio ? 'Episode' : KIND[i.kind].short;
	const tag = 'st-wide text-[9.5px] font-bold tracking-[0.18em] uppercase';
</script>

<svelte:head>
	<title>AGE Studios</title>
	<meta
		name="description"
		content="Feature matches from the AGE Open main stage, AGE's podcasts and interviews, and videos from the AGE Network of creators."
	/>
</svelte:head>

{#snippet head(id, kicker, title, href, more)}
	<div class="flex items-end justify-between gap-4 border-b border-paper-bg/15 pb-3">
		<div class="min-w-0">
			<p class="{tag} text-studio-light">CH {ch(id)} · {kicker}</p>
			<h2
				class="mt-1.5 font-newsreader text-[32px] leading-none font-semibold tracking-[-0.02em] md:text-[46px]"
			>
				{title}
			</h2>
		</div>
		{#if href}
			<a
				{href}
				class="{tag} shrink-0 border-b border-studio-light pb-1 text-paper-bg/85 transition-colors hover:text-studio-light"
				>{more} →</a
			>
		{/if}
	</div>
{/snippet}

{#snippet card(item)}
	<StudiosCard {item} />
{/snippet}

<AgeShell active="AGE Studios">
	<div class="bg-studio-night text-paper-bg">
		<StudiosMasthead big ticker={data.ticker} />
		{#if channels.length > 1}
			<ChannelBar {channels} spy current={channels[0].id} />
		{/if}

		{#if !lead}
			<section class="mx-auto w-full max-w-[1280px] px-5 py-20 text-center md:px-8">
				<p class="st-wide text-[11px] font-bold tracking-[0.18em] text-studio-light uppercase">
					Stand by
				</p>
				<p class="mt-3 font-newsreader text-[28px] font-semibold">
					The studio lights are warming up.
				</p>
				<p class="mt-2 font-newsreader text-[18px] text-studio-mute italic">
					New matches, episodes and interviews land here first.
				</p>
			</section>
		{:else}
			<!-- ============ featured ============ -->
			<section id="featured" class="scroll-mt-32">
				<div
					class="mx-auto grid w-full max-w-[1280px] gap-8 px-5 pt-8 pb-12 md:px-8 md:pt-10 md:pb-16 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-10"
				>
					<a href={lead.href} class="group block">
						<span class="st-screen relative block">
							<WatchFrame item={lead} sizes="(min-width: 1024px) 760px, 100vw" eager />
						</span>
						<span class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
							<span class="{tag} bg-studio px-2 py-1 text-white">Featured</span>
							<span class="{tag} text-studio-light">{tagOf(lead)}</span>
							{#if lead.isPremium}<PremiumTag size="sm" />{/if}
						</span>
						<span
							class="mt-3 block font-newsreader text-[30px] leading-[1.02] font-semibold tracking-[-0.02em] [text-wrap:balance] transition-colors group-hover:text-studio-light md:text-[44px]"
							>{lead.title}</span
						>
						{#if byline(lead)}
							<span
								class="mt-2 block font-newsreader text-[17px] text-paper-bg/75 italic md:text-[19px]"
								>{byline(lead)}</span
							>
						{/if}
						<span class="mt-5 flex flex-wrap items-center gap-4">
							<span
								class="st-wide inline-flex items-center gap-2.5 bg-studio-light px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-studio-night uppercase transition-colors group-hover:bg-paper-bg"
								>{lead.audio ? '♪ Listen now' : '▶ Watch now'}</span
							>
							<span class="text-[12.5px] text-studio-mute tabular-nums"
								>{[dateOf(lead.publishedAt), lead.duration ? clock(lead.duration) : '']
									.filter(Boolean)
									.join(' · ')}</span
							>
						</span>
					</a>

					{#if upNext.length}
						<aside aria-labelledby="up-next">
							<p id="up-next" class="{tag} border-b border-paper-bg/15 pb-3 text-studio-mute">
								Up next
							</p>
							<ol class="divide-y divide-paper-bg/10">
								{#each upNext as i (i.id)}
									<li>
										<a
											href={i.href}
											class="group grid grid-cols-[132px_minmax(0,1fr)] gap-4 py-4 md:grid-cols-[150px_minmax(0,1fr)]"
										>
											<WatchFrame item={i} sizes="150px" />
											<span class="min-w-0">
												<span class="{tag} block truncate text-[8.5px] text-studio-light"
													>{tagOf(i)}</span
												>
												<span
													class="mt-1 line-clamp-3 font-newsreader text-[17px] leading-[1.15] font-semibold transition-colors group-hover:text-studio-light"
													>{i.title}</span
												>
												{#if i.duration}<span
														class="mt-1 block text-[11.5px] text-studio-mute tabular-nums"
														>{clock(i.duration)}</span
													>{/if}
											</span>
										</a>
									</li>
								{/each}
							</ol>
						</aside>
					{/if}
				</div>
			</section>
		{/if}

		<!-- ============ gameplay ============ -->
		{#if h?.gameplay?.length}
			<section id="gameplay" class="scroll-mt-32 border-t border-paper-bg/10">
				<div class="mx-auto w-full max-w-[1280px] px-5 py-12 md:px-8 md:py-16">
					{@render head(
						'gameplay',
						'From the main stage',
						'Bonus gameplay',
						'/studios/gameplay',
						`All ${h.counts.gameplay}`
					)}
					<div class="mt-7">
						<Rail items={h.gameplay} grid={4} label="Bonus gameplay">
							{#snippet card(g)}
								<a href={g.href} class="group block">
									<WatchFrame item={g} sizes="(min-width: 1024px) 300px, 78vw" />
									{#if g.player1Hero || g.player2Hero}
										<span
											class="st-wide mt-3 flex flex-wrap items-center gap-1.5 text-[8.5px] font-bold tracking-[0.12em] uppercase"
										>
											<span class="border border-studio-light/60 px-1.5 py-[2px] text-studio-light"
												>{g.player1Hero || '—'}</span
											>
											<span
												class="font-newsreader text-[12px] tracking-normal text-studio-mute normal-case italic"
												>vs</span
											>
											<span class="border border-studio-light/60 px-1.5 py-[2px] text-studio-light"
												>{g.player2Hero || '—'}</span
											>
										</span>
									{/if}
									<span
										class="mt-2 block font-newsreader text-[18px] leading-[1.15] font-semibold transition-colors group-hover:text-studio-light"
										>{g.title}</span
									>
									{#if g.player1Name || g.player2Name}
										<span class="mt-1 block text-[12.5px] text-studio-mute"
											>{[g.player1Name, g.player2Name].filter(Boolean).join(' vs ')}{g.event
												?.circuit
												? ` · ${g.event.circuit}`
												: ''}</span
										>
									{/if}
								</a>
							{/snippet}
						</Rail>
					</div>
				</div>
			</section>
		{/if}

		<!-- ============ podcasts ============ -->
		{#if h?.podcasts?.length || pods.length}
			<section id="podcasts" class="scroll-mt-32 border-t border-paper-bg/10 bg-studio-panel">
				<div class="mx-auto w-full max-w-[1280px] px-5 py-12 md:px-8 md:py-16">
					{@render head('podcasts', 'On the mic', 'Podcasts', '/studios/podcasts', 'Every episode')}
					<div class="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-12">
						{#if pods.length}
							<div>
								<p class="{tag} text-studio-mute">Shows</p>
								<div class="mt-3">
									<Rail items={pods} grid={2} width="w-[44%] sm:w-[30%]" label="Shows">
										{#snippet card(s)}
											<a href="/studios/shows/{s.slug}" class="group block">
												<span class="relative block aspect-square overflow-hidden bg-studio-night">
													{#if s.cover}
														<Picture
															image={s.cover}
															alt=""
															sizes="(min-width: 1024px) 260px, 44vw"
															class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
														/>
													{:else}
														<span
															class="st-wide absolute inset-0 flex items-center justify-center p-4 text-center text-[16px] font-black uppercase"
															>{s.name}</span
														>
													{/if}
												</span>
												<span
													class="mt-2.5 block font-newsreader text-[17px] leading-tight font-semibold transition-colors group-hover:text-studio-light"
													>{s.name}</span
												>
												<span class="block text-[11.5px] text-studio-mute"
													>{s.host ? `${s.host} · ` : ''}{s.episodes}
													{s.episodes === 1 ? 'episode' : 'episodes'}</span
												>
											</a>
										{/snippet}
									</Rail>
								</div>
							</div>
						{/if}
						<div>
							<p class="{tag} text-studio-mute">Latest episodes</p>
							<ol class="mt-3 divide-y divide-paper-bg/10 border-y border-paper-bg/10">
								{#each h?.podcasts ?? [] as e (e.id)}
									<li>
										<a
											href={e.href}
											class="group grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 py-3.5"
										>
											<WatchFrame item={e} square sizes="64px" />
											<span class="min-w-0">
												<span class="{tag} block truncate text-[8.5px] text-studio-light"
													>{[e.show?.name, episodeLabel(e)].filter(Boolean).join(' · ')}</span
												>
												<span
													class="mt-0.5 block font-newsreader text-[17px] leading-tight font-semibold transition-colors group-hover:text-studio-light"
													>{e.title}</span
												>
												{#if e.guests}<span class="block truncate text-[12px] text-studio-mute"
														>with {e.guests}</span
													>{/if}
											</span>
											<span
												class="flex items-center gap-2.5 text-[11px] text-studio-mute tabular-nums"
											>
												<span class="hidden sm:inline">{e.duration ? clock(e.duration) : ''}</span>
												<span
													class="flex h-11 w-11 items-center justify-center border border-paper-bg/30 text-[13px] transition-colors group-hover:border-studio-light group-hover:bg-studio-light group-hover:text-studio-night"
													aria-hidden="true">{e.audio ? '♪' : '▶'}</span
												>
											</span>
										</a>
									</li>
								{:else}
									<li class="py-4 text-[13.5px] text-studio-mute">
										The first episodes are on their way.
									</li>
								{/each}
							</ol>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- ============ interviews ============ -->
		{#if h?.interviews?.length}
			<section id="interviews" class="scroll-mt-32 border-t border-paper-bg/10">
				<div class="mx-auto w-full max-w-[1280px] px-5 py-12 md:px-8 md:py-16">
					{@render head(
						'interviews',
						'In conversation',
						'Interviews',
						'/studios/interviews',
						'All interviews'
					)}
					<div class="mt-7">
						<Rail items={h.interviews} grid={3} width="w-[84%] sm:w-[48%]" label="Interviews">
							{#snippet card(item)}
								<StudiosCard {item} big sizes="(min-width: 1024px) 400px, 84vw" />
							{/snippet}
						</Rail>
					</div>
				</div>
			</section>
		{/if}

		<!-- ============ more video ============ -->
		{#if h?.video?.length}
			<section id="video" class="scroll-mt-32 border-t border-paper-bg/10">
				<div class="mx-auto w-full max-w-[1280px] px-5 py-12 md:px-8 md:py-16">
					{@render head('video', 'On tape', 'More video', '/studios/video', 'All video')}
					<div class="mt-7">
						<Rail items={h.video} {card} label="More video" />
					</div>
				</div>
			</section>
		{/if}

		<!-- ============ the AGE Network ============ -->
		{#if net?.latest?.length}
			<section
				id="network"
				class="relative scroll-mt-32 overflow-hidden border-t-[3px] border-studio bg-studio-panel"
			>
				<div
					class="pointer-events-none absolute -right-40 -bottom-40 h-[480px] w-[480px] bg-[radial-gradient(closest-side,rgb(192_70_31/0.22),transparent)]"
					aria-hidden="true"
				></div>
				<div class="relative mx-auto w-full max-w-[1280px] px-5 py-12 md:px-8 md:py-16">
					{@render head(
						'network',
						'Creators we love',
						'The AGE Network',
						'/studios/network',
						'All creators'
					)}
					<p
						class="mt-4 max-w-[640px] font-newsreader text-[17px] leading-snug text-paper-bg/75 italic"
					>
						Podcasts and channels from around the community, picked by the AGE team and playable
						right here.
					</p>
					<div class="mt-7">
						<Rail
							items={net.creators}
							width="w-[40%] sm:w-[26%] md:w-[20%] lg:w-[15.5%]"
							label="Creators"
						>
							{#snippet card(c)}
								<CreatorTile creator={c} />
							{/snippet}
						</Rail>
					</div>
					<p class="{tag} mt-10 border-b border-paper-bg/15 pb-3 text-studio-mute">
						Featured from the network
					</p>
					<div class="mt-5">
						<Rail items={net.latest} {card} label="Featured from the network" />
					</div>
				</div>
			</section>
		{/if}

		<!-- ============ members ============ -->
		{#if !data.member && premiumOnSite}
			<section class="border-t border-paper-bg/10 bg-studio text-white">
				<div
					class="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-6 px-5 py-10 md:px-8"
				>
					<div class="max-w-[640px]">
						<p class="{tag} text-white/80">AGE Premium</p>
						<p class="mt-2 font-newsreader text-[28px] leading-tight font-semibold md:text-[34px]">
							Every match, every episode, the whole archive.
						</p>
						<p class="mt-2 font-newsreader text-[16px] text-white/85 italic">
							Members get all of AGE Studios alongside Premium articles and course updates.
						</p>
					</div>
					<a
						href="/premium"
						class="st-wide bg-studio-night px-6 py-4 text-[11px] font-extrabold tracking-[0.14em] text-white uppercase transition-colors hover:bg-paper-bg hover:text-studio-night"
						>Become a member</a
					>
				</div>
			</section>
		{/if}
	</div>
</AgeShell>
