<script>
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	const vodItem = $derived(data.vod);
	const canWatch = $derived(data.canWatch);
	const tokens = $derived(data.tokens);
	const vodThumbnailToken = $derived(data.vodThumbnailToken);
	const relatedVods = $derived(data.relatedVods || []);
	const publishedDate = $derived(vodItem?.publishedAt ? new Date(vodItem.publishedAt) : null);
	const matchup = $derived(
		[vodItem?.player1Name, vodItem?.player2Name].filter(Boolean).join(' vs ')
	);
	const isPremiumUser = $derived(data.user?.role === 'premium' || data.user?.role === 'admin');

	// Patch mux-player shadow DOM so the transport chrome sits directly
	// over the video rather than fighting the paper header/footer bands.
	onMount(async () => {
		if (!canWatch) return;
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

	/** @param {number | null | undefined} seconds */
	function formatDuration(seconds) {
		if (!seconds) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	/** @param {Date | null} d */
	function formatDate(d) {
		if (!d) return '';
		return d.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{vodItem.title} · AGE Library</title>
	<meta name="description" content={vodItem.description || `Watch ${vodItem.title} on AGE`} />
	{#if canWatch}
		<link
			rel="modulepreload"
			href="https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs"
		/>
	{/if}
</svelte:head>

<AgeShell active="Library">
	<!-- back to the library -->
	<div class="mx-auto w-full max-w-[1680px] px-5 pt-4 md:px-8 md:pt-5">
		<a
			href="/library"
			class="inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[color,gap] hover:gap-3 hover:text-warm"
		>
			<span aria-hidden="true">←</span>
			Library
		</a>
	</div>

	<!-- ============ HEADER ============ -->
	<header
		class="fp-rise mx-auto w-full max-w-[960px] px-5 pt-8 pb-5 text-center md:px-8 md:pt-12 md:pb-7"
	>
		<div
			class="flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.24em] text-warm uppercase md:text-[11.5px]"
		>
			<span aria-hidden="true">◆</span>
			{vodItem.event || vodItem.circuit
				? `Bonus match · ${vodItem.event || vodItem.circuit}`
				: 'Bonus match'}
			<span aria-hidden="true">◆</span>
		</div>
		<h1
			class="mt-2 font-newsreader text-[38px] leading-[1.0] font-semibold tracking-[-0.02em] [text-wrap:balance] md:mt-3 md:text-[clamp(46px,5.6vw,84px)] md:leading-[0.96]"
		>
			{vodItem.title}
		</h1>
		{#if matchup || vodItem.description}
			<p
				class="mx-auto mt-2.5 max-w-[640px] font-newsreader text-[17px] leading-[1.45] [text-wrap:balance] text-soft italic md:mt-3 md:text-[21px]"
			>
				{matchup || vodItem.description.split('\n')[0].slice(0, 180)}
			</p>
		{/if}
		<div
			class="mt-3.5 flex flex-wrap items-baseline justify-center gap-x-2 text-[11px] text-fade md:mt-4"
		>
			<span class="font-extrabold tracking-[0.12em] text-ink uppercase">By AGE Studios</span>
			{#if publishedDate || vodItem.duration}
				<span aria-hidden="true">·</span>
				<span class="font-semibold">
					{[
						publishedDate ? formatDate(publishedDate) : '',
						vodItem.duration ? formatDuration(vodItem.duration) : ''
					]
						.filter(Boolean)
						.join(' · ')}
				</span>
			{/if}
			{#if vodItem.isPremium}
				<span class="self-center"><PremiumTag /></span>
			{/if}
		</div>
	</header>

	<!-- ============ PLAYER ============ -->
	<figure class="m-0 mx-auto w-full max-w-[1200px] px-5 md:px-8">
		<div class="vod-player-wrapper fp-plate bg-black">
			{#if canWatch && vodItem.muxPlaybackId}
				<mux-player
					playback-id={vodItem.muxPlaybackId}
					playback-token={tokens?.['playback-token'] || ''}
					thumbnail-token={tokens?.['thumbnail-token'] || ''}
					storyboard-token={tokens?.['storyboard-token'] || ''}
					accent-color="#1e40af"
					metadata-video-title={vodItem.title}
					stream-type="on-demand"
					default-hidden-captions
					forward-seek-offset="10"
					backward-seek-offset="10"
					style="aspect-ratio: {vodItem.aspectRatio || '16/9'}; width: 100%; display: block;"
				></mux-player>
			{:else}
				<!-- Paywall / Premium CTA -->
				<div class="relative overflow-hidden md:aspect-video">
					{#if vodItem.muxPlaybackId}
						<img
							src="https://image.mux.com/{vodItem.muxPlaybackId}/thumbnail.webp?width=1600&height=900&fit_mode=smartcrop{vodThumbnailToken
								? `&token=${vodThumbnailToken}`
								: ''}"
							alt=""
							class="absolute inset-0 h-full w-full scale-105 object-cover blur-lg brightness-[0.4]"
						/>
					{:else}
						<div class="absolute inset-0 bg-[#080b15]"></div>
					{/if}

					<div
						class="relative flex items-center justify-center px-5 py-8 md:absolute md:inset-0 md:px-6 md:py-0"
					>
						<div
							class="max-w-[560px] border-[3px] border-double border-paper-bg/80 px-6 py-8 text-center md:px-10 md:py-10"
						>
							<span
								class="mb-3 flex items-center justify-center gap-3 text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase"
							>
								<span aria-hidden="true">◆</span>Premium · Members only<span aria-hidden="true"
									>◆</span
								>
							</span>
							<h3
								class="m-0 mb-3 font-newsreader text-[clamp(28px,4vw,42px)] leading-[1] font-semibold tracking-[-0.02em] text-white"
							>
								Watch this match with a membership.
							</h3>
							<p
								class="mx-auto mb-6 max-w-[440px] font-newsreader text-[16px] leading-[1.5] italic"
								style="color: rgba(255,255,255,0.82);"
							>
								This VOD is part of AGE Premium. Subscribe to unlock every AGE Open recording plus
								the full library.
							</p>
							<div class="flex flex-wrap items-center justify-center gap-3">
								<a
									href="/premium"
									class="inline-flex items-center border border-prem bg-prem px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
								>
									Become a member
								</a>
								{#if !data.user}
									<a
										href="/login"
										class="inline-flex items-center border border-white/60 px-6 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10"
									>
										Sign in
									</a>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</figure>

	<!-- ============ CONTENT ============ -->
	<div
		class="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-[48px] px-5 pt-[40px] pb-[64px] md:px-8 md:pt-[56px] lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-[64px]"
	>
		<!-- LEFT COLUMN -->
		<section class="min-w-0">
			{#if vodItem.player1Hero || vodItem.player2Hero || vodItem.player1Name || vodItem.player2Name}
				<div class="border-[3px] border-double border-ink p-6 md:p-7">
					<span
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-ink uppercase"
					>
						<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
						The matchup
					</span>
					<div class="mt-[14px] grid grid-cols-[1fr_auto_1fr] items-center gap-4">
						<div class="min-w-0">
							<div
								class="truncate font-newsreader text-[clamp(20px,2.4vw,26px)] leading-[1.1] font-semibold tracking-[-0.01em]"
							>
								{vodItem.player1Name || '—'}
							</div>
							{#if vodItem.player1Hero}
								<div
									class="mt-[6px] text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase"
								>
									{vodItem.player1Hero}
								</div>
							{/if}
						</div>
						<span class="font-newsreader text-[18px] text-fade italic">vs</span>
						<div class="min-w-0 text-right">
							<div
								class="truncate font-newsreader text-[clamp(20px,2.4vw,26px)] leading-[1.1] font-semibold tracking-[-0.01em]"
							>
								{vodItem.player2Name || '—'}
							</div>
							{#if vodItem.player2Hero}
								<div
									class="mt-[6px] text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase"
								>
									{vodItem.player2Hero}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			{#if vodItem.description}
				<div class="mt-[36px] border-t border-line2 pt-[24px]">
					<span
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-ink uppercase"
					>
						<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
						About this match
					</span>
					<div
						class="mt-[14px] font-newsreader text-[19px] leading-[1.55] whitespace-pre-line text-ink first-letter:float-left first-letter:mt-[8px] first-letter:mr-3 first-letter:font-newsreader first-letter:text-[64px] first-letter:leading-[0.7] first-letter:font-semibold first-letter:text-warm"
					>
						{vodItem.description}
					</div>
				</div>
			{/if}
		</section>

		<!-- RIGHT SIDEBAR -->
		<aside class="min-w-0 space-y-[36px]">
			{#if !isPremiumUser}
				<div class="border-[3px] border-double border-ink bg-paper px-6 py-7 text-center">
					<span
						class="flex items-center justify-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-prem uppercase"
					>
						<span aria-hidden="true">◆</span>Powered by members<span aria-hidden="true">◆</span>
					</span>
					<h3
						class="mt-3 font-newsreader text-[26px] leading-[1.08] font-semibold tracking-[-0.01em] [text-wrap:balance]"
					>
						Every match, unlocked.
					</h3>
					<p class="mt-2.5 font-newsreader text-[15px] leading-[1.5] text-soft italic">
						Members get every AGE Open recording, bonus matches, premium articles, and course
						updates.
					</p>
					<a
						href="/premium"
						class="mt-5 inline-flex w-full items-center justify-center border border-prem bg-prem py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
					>
						Become a member
					</a>
					<div class="mt-3 text-[11px] text-fade italic">$10 a month · cancel anytime</div>
				</div>
			{/if}

			{#if relatedVods.length > 0}
				<div>
					<div
						class="mb-[14px] flex items-baseline justify-between border-t-[3px] border-double border-ink pt-3"
					>
						<span
							class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
						>
							<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
							More matches
						</span>
						<a
							href="/library/vods"
							class="text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:text-warm"
							>All →</a
						>
					</div>
					<div class="divide-y divide-line">
						{#each relatedVods as related, i (related.id)}
							<a
								href="/library/{related.id}"
								class="group grid grid-cols-[24px_104px_1fr] items-center gap-3 py-4"
							>
								<span
									class="font-newsreader text-[26px] leading-none font-medium text-warm tabular-nums"
									aria-hidden="true">{i + 1}</span
								>
								<div class="relative aspect-video overflow-hidden bg-panel">
									{#if related.muxPlaybackId}
										<img
											src="https://image.mux.com/{related.muxPlaybackId}/thumbnail.webp?width=480&height=270&fit_mode=smartcrop{related.thumbnailToken
												? `&token=${related.thumbnailToken}`
												: ''}"
											alt=""
											class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
											loading="lazy"
										/>
									{:else}
										<div class="flex h-full items-center justify-center">
											<svg
												class="h-8 w-8 text-fade"
												fill="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										</div>
									{/if}
									{#if related.duration}
										<div
											class="absolute right-0 bottom-0 bg-ink px-1.5 py-[2px] text-[9px] font-extrabold tracking-[0.06em] text-white"
										>
											{formatDuration(related.duration)}
										</div>
									{/if}
									{#if related.isPremium}<PremiumTag variant="corner" size="sm" />{/if}
								</div>
								<div class="min-w-0">
									<h4
										class="line-clamp-2 font-newsreader text-[16px] leading-[1.2] font-semibold tracking-[-0.01em] transition-colors group-hover:text-warm"
									>
										{related.title}
									</h4>
									{#if related.player1Name && related.player2Name}
										<div
											class="mt-[5px] truncate text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>
											{related.player1Name} vs {related.player2Name}
										</div>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<a
				href="/library/vods"
				class="group flex items-center justify-between border border-line p-4 transition-colors hover:border-ink"
			>
				<div>
					<div class="font-newsreader text-[16px] font-semibold tracking-[-0.01em]">
						Browse VODs
					</div>
					<div class="mt-[3px] text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
						Every match on tape
					</div>
				</div>
				<span
					class="text-[16px] text-fade transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-warm"
					>→</span
				>
			</a>
		</aside>
	</div>
</AgeShell>

{#if canWatch}
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
