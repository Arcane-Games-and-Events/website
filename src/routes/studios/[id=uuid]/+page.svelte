<script>
	/**
	 * One Studio item on AGE Studios. Video plays in the video player;
	 * an audio episode plays over its cover art. Premium items show the
	 * membership offer instead of the player to anyone without Premium.
	 * Next to it: the matchup or show notes, the next and previous episode
	 * of a show, and what to watch next.
	 */
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import WatchFrame from '$lib/components/age/watch/WatchFrame.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import { KIND, byline, episodeLabel } from '$lib/studio/kinds.js';
	import { clock } from '$lib/desk/video/format.js';

	let { data } = $props();

	const item = $derived(data.item);
	const audio = $derived(item.audio);
	const verb = $derived(audio ? 'Listen' : 'Watch');
	const kicker = $derived(
		item.kind === 'gameplay'
			? item.event?.circuit
				? `Bonus match · ${item.event.circuit}`
				: 'Bonus match'
			: item.show
				? [item.show.name, episodeLabel(item)].filter(Boolean).join(' · ')
				: KIND[item.kind].short
	);
	const archive = $derived(
		item.kind === 'gameplay'
			? { href: '/studios/gameplay', label: 'Every match', note: 'All bonus gameplay' }
			: item.show
				? { href: `/studios/shows/${item.show.slug}`, label: item.show.name, note: 'Every episode' }
				: item.kind === 'interview'
					? { href: '/studios/interviews', label: 'Interviews', note: 'Every interview' }
					: { href: '/studios/video', label: 'Video', note: 'Everything on tape' }
	);
	const dateOf = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
			: '';

	// --- Analytics: one view per item, restarted when moving straight from
	// one to the next (same component). Non-members at the paywall count as
	// gated views. ---
	/** @type {{ stop: (next?: string) => void } | null} */
	let tracker = null;
	let trackedId = null;
	afterNavigate(({ to }) => {
		const id = data.item?.id;
		if (!id || id === trackedId) return;
		tracker?.stop(to?.url?.pathname);
		trackedId = id;
		tracker = createContentTracker({ vodId: id, gated: !data.canWatch });
	});
	onDestroy(() => tracker?.stop());

	// Patch mux-player shadow DOM so the transport chrome sits directly
	// over the video rather than fighting the paper header/footer bands.
	onMount(async () => {
		if (!data.canWatch) return;
		await customElements.whenDefined('mux-player');
		await new Promise((r) => setTimeout(r, 500));
		const player = document.querySelector('mux-player');
		if (!player) return;
		const patchShadow = (root) => {
			if (!root) return;
			const style = document.createElement('style');
			style.textContent = `
				.spacer { background: transparent !important; }
				[part="bottom"] { background: linear-gradient(transparent, rgba(0,0,0,0.6)) !important; }
				[part="top"] { background: transparent !important; }
				media-control-bar { background: transparent !important; }
				media-control-bar > * { background: transparent !important; }
				media-play-button, media-seek-backward-button, media-seek-forward-button,
				media-mute-button, media-volume-range, media-time-display,
				media-playback-rate-button, media-pip-button, media-fullscreen-button,
				media-rendition-menu-button, media-captions-menu-button,
				media-airplay-button, media-cast-button {
					background: transparent !important;
				}
				media-settings-menu, [role="listbox"], [role="menu"],
				media-rendition-listbox, media-captions-listbox,
				media-playback-rate-listbox {
					background: rgba(20, 20, 20, 0.92) !important;
					border-radius: 0 !important;
					backdrop-filter: blur(8px) !important;
					color: #fff !important;
				}
				[role="option"], [role="menuitem"], [role="menuitemradio"] {
					color: #fff !important;
				}
			`;
			root.appendChild(style);
			root.querySelectorAll('*').forEach((el) => {
				if (el.shadowRoot) patchShadow(el.shadowRoot);
			});
		};
		patchShadow(player.shadowRoot);
	});
</script>

<svelte:head>
	<title>{item.title} · AGE Studios</title>
	<meta
		name="description"
		content={item.description?.slice(0, 160) || `${verb} ${item.title} on AGE`}
	/>
	{#if data.canWatch}
		<link
			rel="modulepreload"
			href="https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs"
		/>
	{/if}
</svelte:head>

<AgeShell active="AGE Studios">
	<div class="mx-auto w-full max-w-[1200px] px-5 pt-4 md:px-8 md:pt-5">
		<a
			href={item.show ? `/studios/shows/${item.show.slug}` : '/studios'}
			class="inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[color,gap] hover:gap-3 hover:text-warm"
		>
			<span aria-hidden="true">←</span>
			{item.show ? item.show.name : 'AGE Studios'}
		</a>
	</div>

	<!-- ============ header ============ -->
	<header
		class="fp-rise mx-auto w-full max-w-[960px] px-5 pt-8 pb-5 text-center md:px-8 md:pt-10 md:pb-7"
	>
		<div
			class="flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.24em] text-warm uppercase md:text-[11.5px]"
		>
			<span aria-hidden="true">◆</span>{kicker}<span aria-hidden="true">◆</span>
		</div>
		<h1
			class="mt-2 font-newsreader text-[36px] leading-[1.0] font-semibold tracking-[-0.02em] [text-wrap:balance] md:mt-3 md:text-[clamp(44px,5.2vw,76px)] md:leading-[0.96]"
		>
			{item.title}
		</h1>
		{#if item.kind === 'gameplay' ? item.player1Name || item.player2Name : item.guests}
			<p
				class="mx-auto mt-2.5 max-w-[640px] font-newsreader text-[17px] leading-[1.45] [text-wrap:balance] text-soft italic md:text-[21px]"
			>
				{item.kind === 'gameplay'
					? [item.player1Name, item.player2Name].filter(Boolean).join(' vs ')
					: `with ${item.guests}`}
			</p>
		{/if}
		<div
			class="mt-3.5 flex flex-wrap items-baseline justify-center gap-x-2 text-[11px] text-fade md:mt-4"
		>
			<span class="font-extrabold tracking-[0.12em] text-ink uppercase">AGE Studios</span>
			<span aria-hidden="true">·</span>
			<span class="font-semibold"
				>{[dateOf(item.publishedAt), item.duration ? clock(item.duration) : '']
					.filter(Boolean)
					.join(' · ')}</span
			>
			{#if item.isPremium}<span class="self-center"><PremiumTag /></span>{/if}
		</div>
	</header>

	<!-- ============ player ============ -->
	<figure class="m-0 mx-auto w-full max-w-[1200px] px-5 md:px-8">
		{#if data.canWatch && data.playbackId && audio}
			<div
				class="vod-player-wrapper grid gap-0 bg-ink text-paper-bg md:grid-cols-[320px_minmax(0,1fr)]"
			>
				<span class="relative block aspect-square overflow-hidden bg-[#1b2030]">
					{#if item.cover}
						<Picture
							image={item.cover}
							alt=""
							sizes="320px"
							loading="eager"
							class="absolute inset-0 h-full w-full object-cover"
						/>
					{:else}
						<span
							class="absolute inset-0 flex items-center justify-center text-[56px] text-paper-bg/40"
							>♪</span
						>
					{/if}
				</span>
				<div class="flex flex-col justify-center gap-4 p-6 md:p-8">
					<p class="text-[10px] font-extrabold tracking-[0.2em] text-warm-light uppercase">
						Now playing
					</p>
					<p class="font-newsreader text-[24px] leading-tight font-semibold md:text-[30px]">
						{item.title}
					</p>
					<mux-player
						audio
						playback-id={data.playbackId}
						playback-token={data.tokens?.['playback-token'] || ''}
						accent-color="#c8922e"
						metadata-video-title={item.title}
						metadata-video-id="vod:{item.id}"
						stream-type="on-demand"
						forward-seek-offset="30"
						backward-seek-offset="15"
						style="width: 100%; display: block;"
					></mux-player>
				</div>
			</div>
		{:else if data.canWatch && data.playbackId}
			<div class="vod-player-wrapper fp-plate bg-black">
				<mux-player
					playback-id={data.playbackId}
					playback-token={data.tokens?.['playback-token'] || ''}
					thumbnail-token={data.tokens?.['thumbnail-token'] || ''}
					storyboard-token={data.tokens?.['storyboard-token'] || ''}
					accent-color="#1e40af"
					poster={item.cover?.src || undefined}
					metadata-video-title={item.title}
					metadata-video-id="vod:{item.id}"
					stream-type="on-demand"
					default-hidden-captions
					forward-seek-offset="10"
					backward-seek-offset="10"
					style="aspect-ratio: {data.aspectRatio || '16/9'}; width: 100%; display: block;"
				></mux-player>
			</div>
		{:else}
			<!-- Premium: the membership offer instead of the player -->
			<div class="relative overflow-hidden bg-[#080b15] md:aspect-video">
				{#if item.cover || item.still}
					<img
						src={item.cover?.src || item.still}
						alt=""
						class="absolute inset-0 h-full w-full scale-105 object-cover blur-lg brightness-[0.4]"
					/>
				{/if}
				<div
					class="relative flex items-center justify-center px-5 py-8 md:absolute md:inset-0 md:px-6 md:py-0"
				>
					<div
						class="max-w-[560px] border-[3px] border-double border-paper-bg/80 px-6 py-8 text-center md:px-10 md:py-10"
					>
						<span
							class="mb-3 flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.2em] text-prem-light uppercase"
						>
							<span aria-hidden="true">◆</span>Premium · Members only<span aria-hidden="true"
								>◆</span
							>
						</span>
						<h3
							class="m-0 mb-3 font-newsreader text-[clamp(28px,4vw,42px)] leading-[1] font-semibold tracking-[-0.02em] text-white"
						>
							{verb} with a membership.
						</h3>
						<p
							class="mx-auto mb-6 max-w-[440px] font-newsreader text-[16px] leading-[1.5] text-white/80 italic"
						>
							This is part of AGE Premium. Members get every match and episode from the Studio, plus
							the full library.
						</p>
						<div class="flex flex-wrap items-center justify-center gap-3">
							<a
								href="/premium"
								class="inline-flex items-center border border-prem bg-prem px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
								>Become a member</a
							>
							{#if !data.user}
								<a
									href="/login"
									class="inline-flex items-center border border-white/60 px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10"
									>Sign in</a
								>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</figure>

	<!-- ============ content ============ -->
	<div
		class="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-12 px-5 pt-10 pb-16 md:px-8 md:pt-14 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16"
	>
		<section class="min-w-0">
			{#if item.kind === 'gameplay' && (item.player1Name || item.player2Name || item.player1Hero || item.player2Hero)}
				<div class="border-[3px] border-double border-ink p-6 md:p-7">
					<span
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] uppercase"
					>
						<span class="text-[8px] text-warm" aria-hidden="true">◆</span> The matchup
					</span>
					<div class="mt-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
						{#each [[item.player1Name, item.player1Hero, ''], [item.player2Name, item.player2Hero, 'text-right']] as [name, hero, align], n (n)}
							{#if n === 1}<span class="font-newsreader text-[18px] text-fade italic">vs</span>{/if}
							<div class="min-w-0 {align}">
								<div
									class="truncate font-newsreader text-[clamp(20px,2.4vw,26px)] leading-[1.1] font-semibold"
								>
									{name || '—'}
								</div>
								{#if hero}<div
										class="mt-1.5 text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase"
									>
										{hero}
									</div>{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if item.description}
				<div class={item.kind === 'gameplay' ? 'mt-9 border-t border-line2 pt-6' : ''}>
					<span
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] uppercase"
					>
						<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
						{item.kind === 'gameplay' ? 'About this match' : 'Show notes'}
					</span>
					<div
						class="mt-3.5 font-newsreader text-[19px] leading-[1.55] whitespace-pre-line first-letter:float-left first-letter:mt-[8px] first-letter:mr-3 first-letter:text-[64px] first-letter:leading-[0.7] first-letter:font-semibold first-letter:text-warm"
					>
						{item.description}
					</div>
				</div>
			{/if}

			{#if data.prev || data.next}
				<nav
					class="mt-10 grid gap-px border border-line2 bg-line2 sm:grid-cols-2"
					aria-label="Episodes"
				>
					{#each [[data.prev, '← Previous episode', ''], [data.next, 'Next episode →', 'sm:text-right']] as [ep, label, align], n (n)}
						{#if ep}
							<a href={ep.href} class="group block bg-paper-bg p-5 {align} hover:bg-white">
								<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
									>{label}</span
								>
								<span
									class="mt-1.5 block font-newsreader text-[18px] leading-tight font-semibold group-hover:text-warm"
									>{ep.title}</span
								>
							</a>
						{:else}
							<span class="hidden bg-paper-bg sm:block"></span>
						{/if}
					{/each}
				</nav>
			{/if}
		</section>

		<aside class="min-w-0 space-y-9">
			{#if !data.member}
				<div class="border-[3px] border-double border-ink bg-paper px-6 py-7 text-center">
					<span
						class="flex items-center justify-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-prem uppercase"
					>
						<span aria-hidden="true">◆</span>Powered by members<span aria-hidden="true">◆</span>
					</span>
					<h3
						class="mt-3 font-newsreader text-[26px] leading-[1.08] font-semibold [text-wrap:balance]"
					>
						Every match and episode, unlocked.
					</h3>
					<p class="mt-2.5 font-newsreader text-[15px] leading-[1.5] text-soft italic">
						Members get the whole Studio archive, Premium articles and course updates.
					</p>
					<a
						href="/premium"
						class="mt-5 inline-flex w-full items-center justify-center border border-prem bg-prem py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
						>Become a member</a
					>
				</div>
			{/if}

			{#if data.related.length}
				<div>
					<div
						class="mb-3.5 flex items-baseline justify-between border-t-[3px] border-double border-ink pt-3"
					>
						<span
							class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
						>
							<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
							{item.show
								? `More from ${item.show.name}`
								: item.kind === 'gameplay'
									? 'More matches'
									: 'Watch next'}
						</span>
						<a
							href={archive.href}
							class="text-[10.5px] font-extrabold tracking-[0.14em] uppercase hover:text-warm"
							>All →</a
						>
					</div>
					<div class="divide-y divide-line">
						{#each data.related as r (r.id)}
							<a
								href={r.href}
								class="group grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 py-4"
							>
								<WatchFrame item={r} sizes="112px" />
								<span class="min-w-0">
									<span
										class="line-clamp-2 block font-newsreader text-[16px] leading-[1.2] font-semibold group-hover:text-warm"
										>{r.title}</span
									>
									{#if byline(r)}<span
											class="mt-1 block truncate text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
											>{byline(r)}</span
										>{/if}
								</span>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<a
				href={archive.href}
				class="group flex items-center justify-between border border-line p-4 transition-colors hover:border-ink"
			>
				<span>
					<span class="block font-newsreader text-[16px] font-semibold">{archive.label}</span>
					<span
						class="mt-0.5 block text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>{archive.note}</span
					>
				</span>
				<span
					class="text-[16px] text-fade transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-warm"
					>→</span
				>
			</a>
		</aside>
	</div>
</AgeShell>

{#if data.canWatch}
	<script
		src="https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs"
		type="module"
		async
	></script>
{/if}

<style>
	.vod-player-wrapper :global(mux-player) {
		--media-background-color: #000;
		--media-primary-color: #fff;
		--media-secondary-color: #d2ccbe;
		--media-control-background: transparent;
		--media-control-hover-background: transparent;
	}
</style>
