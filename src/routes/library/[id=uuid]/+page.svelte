<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	const vodItem = $derived(data.vod);
	const canWatch = $derived(data.canWatch);
	const tokens = $derived(data.tokens);
	const vodThumbnailToken = $derived(data.vodThumbnailToken);
	const relatedVods = $derived(data.relatedVods || []);
	const publishedDate = $derived(
		vodItem?.publishedAt ? new Date(vodItem.publishedAt) : null
	);
	const matchup = $derived(
		[vodItem?.player1Name, vodItem?.player2Name].filter(Boolean).join(' vs ')
	);
	const isPremiumUser = $derived(
		data.user?.role === 'premium' || data.user?.role === 'admin'
	);

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
	<meta
		name="description"
		content={vodItem.description || `Watch ${vodItem.title} on AGE`}
	/>
	{#if canWatch}
		<link
			rel="modulepreload"
			href="https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs"
		/>
	{/if}
</svelte:head>

<AgeShell active="Library">
	<!-- ============ HEADER ============ -->
	<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[46px] pb-[34px]">
		<!-- kicker rail -->
		<div class="mb-[22px] flex flex-wrap items-center gap-[14px] md:gap-[18px]">
			<span
				class="bg-warm inline-flex items-center gap-[7px] px-3 py-[6px] text-[11px] font-extrabold tracking-[0.14em] text-white uppercase"
			>
				<svg class="h-[10px] w-[10px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M8 5v14l11-7z" />
				</svg>
				Video
			</span>
			{#if vodItem.isPremium}
				<span
					class="font-mono-system text-prem text-[11px] font-bold tracking-[0.14em] uppercase"
				>
					Premium
				</span>
			{/if}
			{#if vodItem.event || vodItem.circuit}
				<span
					class="font-mono-system text-fade text-[11px] font-bold tracking-[0.14em] uppercase"
				>
					{vodItem.event || vodItem.circuit}
				</span>
			{/if}
			<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
			{#if publishedDate}
				<span
					class="font-mono-system text-fade text-[11px] font-bold tracking-[0.14em] uppercase"
				>
					{publishedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
				</span>
			{/if}
		</div>

		<!-- headline -->
		<h1
			class="font-newsreader max-w-[1140px] text-[clamp(38px,6vw,72px)] leading-[0.95] font-semibold tracking-[-0.03em] [text-wrap:balance]"
		>
			{vodItem.title}
		</h1>

		<!-- sell row -->
		<div class="mt-[24px] flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
			{#if matchup}
				<p
					class="font-newsreader text-soft m-0 max-w-[680px] text-[19px] leading-[1.42] italic"
				>
					{matchup}
				</p>
			{:else if vodItem.description}
				<p
					class="font-newsreader text-soft m-0 max-w-[680px] text-[19px] leading-[1.42] italic"
				>
					{vodItem.description.split('\n')[0].slice(0, 180)}
				</p>
			{:else}
				<span class="block max-w-[680px]"></span>
			{/if}

			<div class="flex flex-shrink-0 flex-col gap-[6px] md:items-end">
				{#if vodItem.duration}
					<span
						class="font-mono-system text-warm text-[12px] font-extrabold tracking-[0.08em] uppercase"
					>
						Runtime · {formatDuration(vodItem.duration)}
					</span>
				{/if}
				{#if publishedDate}
					<span
						class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.06em] uppercase"
					>
						{formatDate(publishedDate)}
					</span>
				{/if}
			</div>
		</div>
	</header>

	<!-- ============ PLAYER ============ -->
	<figure class="mx-auto m-0 w-full max-w-[1600px] px-4 md:px-10 lg:px-14">
		<div class="border-ink vod-player-wrapper border-y-[3px] border-double bg-black">
			{#if canWatch && vodItem.muxPlaybackId}
				<mux-player
					playback-id={vodItem.muxPlaybackId}
					playback-token={tokens?.['playback-token'] || ''}
					thumbnail-token={tokens?.['thumbnail-token'] || ''}
					storyboard-token={tokens?.['storyboard-token'] || ''}
					accent-color="#e5703e"
					metadata-video-title={vodItem.title}
					stream-type="on-demand"
					default-hidden-captions
					forward-seek-offset="10"
					backward-seek-offset="10"
					style="aspect-ratio: {vodItem.aspectRatio ||
						'16/9'}; width: 100%; display: block;"
				></mux-player>
			{:else}
				<!-- Paywall / Premium CTA -->
				<div class="relative aspect-video overflow-hidden">
					{#if vodItem.muxPlaybackId}
						<img
							src="https://image.mux.com/{vodItem.muxPlaybackId}/thumbnail.webp?width=1600&height=900&fit_mode=smartcrop{vodThumbnailToken
								? `&token=${vodThumbnailToken}`
								: ''}"
							alt=""
							class="h-full w-full scale-105 object-cover blur-lg brightness-[0.4]"
						/>
					{:else}
						<div class="h-full w-full bg-[#080b15]"></div>
					{/if}

					<div class="absolute inset-0 flex items-center justify-center px-6">
						<div class="max-w-[520px] text-center">
							<span
								class="font-mono-system text-prem mb-4 inline-block bg-white px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>
								AGE Premium
							</span>
							<h3
								class="font-newsreader m-0 mb-3 text-[clamp(28px,4vw,42px)] leading-[1] font-semibold tracking-[-0.02em] text-white"
							>
								Members-only match.
							</h3>
							<p
								class="mx-auto mb-6 max-w-[420px] text-[14px] leading-[1.55]"
								style="color: rgba(255,255,255,0.78);"
							>
								This VOD is part of AGE Premium. Subscribe to unlock every AGE Open recording plus
								the full library.
							</p>
							<div class="flex flex-wrap items-center justify-center gap-3">
								<a
									href="/premium"
									class="bg-prem inline-flex items-center gap-2 border border-transparent px-[22px] py-[13px] text-[11px] font-bold tracking-[0.08em] text-white uppercase transition-[filter] hover:brightness-110"
								>
									Get Premium →
								</a>
								{#if !data.user}
									<a
										href="/login"
										class="font-mono-system inline-flex items-center border border-white/40 px-[18px] py-[12px] text-[11px] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-white/10"
									>
										Log in
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
		class="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-[48px] px-4 md:px-10 lg:px-14 pt-[46px] pb-[64px] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-[64px]"
	>
		<!-- LEFT COLUMN -->
		<section class="min-w-0">
			{#if vodItem.player1Hero || vodItem.player2Hero || vodItem.player1Name || vodItem.player2Name}
				<div class="border-ink border-[1.5px] p-6 md:p-7">
					<span
						class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						The Matchup
					</span>
					<div class="mt-[14px] grid grid-cols-[1fr_auto_1fr] items-center gap-4">
						<div class="min-w-0">
							<div
								class="font-newsreader truncate text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.1] tracking-[-0.01em]"
							>
								{vodItem.player1Name || '—'}
							</div>
							{#if vodItem.player1Hero}
								<div
									class="font-mono-system text-warm mt-[6px] text-[10.5px] font-bold tracking-[0.08em] uppercase"
								>
									{vodItem.player1Hero}
								</div>
							{/if}
						</div>
						<span
							class="font-mono-system text-fade text-[11px] font-extrabold tracking-[0.16em] uppercase"
						>
							vs
						</span>
						<div class="min-w-0 text-right">
							<div
								class="font-newsreader truncate text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.1] tracking-[-0.01em]"
							>
								{vodItem.player2Name || '—'}
							</div>
							{#if vodItem.player2Hero}
								<div
									class="font-mono-system text-warm mt-[6px] text-[10.5px] font-bold tracking-[0.08em] uppercase"
								>
									{vodItem.player2Hero}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			{#if vodItem.description}
				<div class="border-line2 mt-[36px] border-t pt-[24px]">
					<span
						class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						About this VOD
					</span>
					<div
						class="font-newsreader text-ink mt-[14px] text-[19px] leading-[1.55] whitespace-pre-line"
					>
						{vodItem.description}
					</div>
				</div>
			{/if}
		</section>

		<!-- RIGHT SIDEBAR -->
		<aside class="min-w-0 space-y-[36px]">
			{#if !isPremiumUser}
				<div class="bg-prem text-white">
					<div class="px-6 pt-6 pb-[22px]">
						<span
							class="font-mono-system text-prem mb-[14px] inline-block bg-white px-[9px] py-[5px] text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
						>
							Membership
						</span>
						<h3
							class="font-newsreader m-0 mb-2 text-[24px] leading-[1.1] font-semibold tracking-[-0.01em]"
						>
							Every VOD, unlocked.
						</h3>
						<p
							class="m-0 mb-[18px] text-[13px] leading-[1.5]"
							style="color: #d6eedf;"
						>
							Members get every AGE Open recording, bonus matches, premium articles, and course
							updates.
						</p>
						<a
							href="/premium"
							class="bg-white text-prem inline-flex w-full items-center justify-center border border-white py-[12px] text-[11px] font-bold tracking-[0.08em] uppercase transition-[filter] hover:brightness-95"
						>
							Get Premium →
						</a>
					</div>
				</div>
			{/if}

			{#if relatedVods.length > 0}
				<div>
					<div
						class="border-ink mb-[18px] flex items-baseline justify-between border-b-[1.5px] pb-[10px]"
					>
						<span
							class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase"
						>
							Related Videos
						</span>
						<a
							href="/library/vods"
							class="font-mono-system text-warm hover:text-accent text-[10px] font-bold tracking-[0.08em] uppercase"
						>
							All →
						</a>
					</div>
					<div class="space-y-[22px]">
						{#each relatedVods as related (related.id)}
							<a
								href="/library/{related.id}"
								class="group block"
							>
								<div class="border-line2 bg-panel relative aspect-video overflow-hidden border">
									{#if related.muxPlaybackId}
										<img
											src="https://image.mux.com/{related.muxPlaybackId}/thumbnail.webp?width=480&height=270&fit_mode=smartcrop{related.thumbnailToken
												? `&token=${related.thumbnailToken}`
												: ''}"
											alt=""
											class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
											loading="lazy"
										/>
									{:else}
										<div class="flex h-full items-center justify-center">
											<svg
												class="text-fade h-8 w-8"
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
											class="font-mono-system bg-ink absolute right-2 bottom-2 px-2 py-[3px] text-[10px] font-bold tracking-[0.06em] text-white"
										>
											{formatDuration(related.duration)}
										</div>
									{/if}
									{#if related.isPremium}
										<span
											class="font-mono-system text-prem absolute top-2 left-2 bg-white px-2 py-[3px] text-[9px] font-extrabold tracking-[0.14em] uppercase"
										>
											Premium
										</span>
									{/if}
								</div>
								<h4
									class="font-newsreader group-hover:text-warm mt-[10px] line-clamp-2 text-[17px] leading-[1.25] font-semibold tracking-[-0.01em] transition-colors"
								>
									{related.title}
								</h4>
								{#if related.player1Name && related.player2Name}
									<div
										class="font-mono-system text-fade mt-[6px] truncate text-[10px] font-bold tracking-[0.08em] uppercase"
									>
										{related.player1Name} vs {related.player2Name}
									</div>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<a
				href="/library/vods"
				class="border-line2 hover:border-ink group flex items-center justify-between border p-4 transition-colors"
			>
				<div>
					<div class="font-newsreader text-[16px] font-semibold tracking-[-0.01em]">
						Browse VODs
					</div>
					<div
						class="font-mono-system text-fade mt-[3px] text-[10px] font-bold tracking-[0.08em] uppercase"
					>
						Every match on tape
					</div>
				</div>
				<span
					class="font-mono-system text-fade group-hover:text-warm text-[14px] font-bold transition-colors"
				>
					→
				</span>
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
