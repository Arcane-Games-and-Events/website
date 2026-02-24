<script>
	import { icons } from '$lib/icons';
	import { onMount } from 'svelte';
	export let data;

	$: vodItem = data.vod;
	$: canWatch = data.canWatch;
	$: tokens = data.tokens;
	$: vodThumbnailToken = data.vodThumbnailToken;
	$: relatedVods = data.relatedVods || [];

	// Patch mux-player shadow DOM for YouTube-style look
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
					border-radius: 8px !important;
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

	function formatDuration(seconds) {
		if (!seconds) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{vodItem.title} - AGE Studios</title>
	<meta
		name="description"
		content={vodItem.description || `Watch ${vodItem.title} on AGE Studios`}
	/>
	{#if canWatch}
		<link
			rel="modulepreload"
			href="https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs"
		/>
	{/if}
</svelte:head>

<div class="min-h-screen">
	<div class="mx-auto max-w-7xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
		<!-- Back link -->
		<a
			href="/studios"
			class="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white sm:mb-6"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowLeft} />
			</svg>
			Back to Studios
		</a>

		<div class="grid gap-6 sm:gap-8 lg:grid-cols-3 lg:gap-10">
			<!-- Main Content (2/3) -->
			<div class="lg:col-span-2">
				<!-- Video Player / Paywall -->
				<div class="vod-player-wrapper rounded-xl bg-black">
					{#if canWatch && vodItem.muxPlaybackId}
						<mux-player
							playback-id={vodItem.muxPlaybackId}
							playback-token={tokens?.['playback-token'] || ''}
							thumbnail-token={tokens?.['thumbnail-token'] || ''}
							storyboard-token={tokens?.['storyboard-token'] || ''}
							accent-color="#ff0000"
							metadata-video-title={vodItem.title}
							stream-type="on-demand"
							default-hidden-captions
							forward-seek-offset="10"
							backward-seek-offset="10"
							style="aspect-ratio: {vodItem.aspectRatio ||
								'16/9'}; width: 100%; border-radius: 0.75rem;"
						></mux-player>
					{:else}
						<!-- Paywall / Premium CTA -->
						<div class="relative aspect-video overflow-hidden">
							<!-- Blurred thumbnail background -->
							{#if vodItem.muxPlaybackId}
								<img
									src="https://image.mux.com/{vodItem.muxPlaybackId}/thumbnail.webp?width=960&height=540&fit_mode=smartcrop{vodThumbnailToken
										? `&token=${vodThumbnailToken}`
										: ''}"
									alt=""
									class="h-full w-full scale-110 object-cover blur-xl brightness-50"
								/>
							{:else}
								<div class="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
							{/if}

							<!-- Premium overlay -->
							<div
								class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 px-4 py-4 text-center sm:p-6"
							>
								<div
									class="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 sm:mb-4 sm:h-16 sm:w-16"
								>
									<svg
										class="h-5 w-5 text-emerald-400 sm:h-8 sm:w-8"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
									</svg>
								</div>
								<h3 class="mb-1 text-sm font-bold text-white sm:mb-2 sm:text-xl">
									Premium Content
								</h3>
								<p class="mb-3 max-w-sm text-xs text-gray-300 sm:mb-5 sm:text-sm">
									This VOD is available exclusively for AGE Premium members. Subscribe to unlock all
									tournament recordings.
								</p>
								<a
									href="/premium"
									class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] sm:gap-2 sm:px-6 sm:py-3 sm:text-sm"
								>
									<svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
										<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
									</svg>
									Get Premium Access
								</a>
								{#if !data.user}
									<p class="mt-2 text-[10px] text-gray-500 sm:mt-3 sm:text-xs">
										Already a member? <a
											href="/login"
											class="text-emerald-400 hover:text-emerald-300">Log in</a
										>
									</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Video Info -->
				<div class="mt-4 sm:mt-6">
					<h1 class="text-lg font-bold text-white sm:text-2xl">{vodItem.title}</h1>

					<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 sm:text-sm">
						{#if vodItem.publishedAt}
							<span>{formatDate(vodItem.publishedAt)}</span>
						{/if}
						{#if vodItem.duration}
							<span class="flex items-center gap-1">
								<svg
									class="h-3.5 w-3.5"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
									/>
								</svg>
								{formatDuration(vodItem.duration)}
							</span>
						{/if}
						{#if vodItem.player1Name && vodItem.player2Name}
							<span>{vodItem.player1Name} vs {vodItem.player2Name}</span>
						{/if}
					</div>

					<!-- Badges -->
					<div class="mt-3 flex flex-wrap gap-2">
						{#if vodItem.player1Hero}
							<span
								class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300"
							>
								{vodItem.player1Hero}
							</span>
						{/if}
						{#if vodItem.player2Hero}
							<span
								class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300"
							>
								{vodItem.player2Hero}
							</span>
						{/if}
						{#if vodItem.isPremium}
							<span
								class="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400"
							>
								<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
									<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
								</svg>
								Premium
							</span>
						{/if}
					</div>

					{#if vodItem.description}
						<div class="mt-4 rounded-xl border border-white/5 bg-gray-900/40 p-3 sm:p-4">
							<p class="text-sm leading-relaxed whitespace-pre-line text-gray-300">
								{vodItem.description}
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Sidebar (1/3) -->
			<div class="space-y-5 sm:space-y-6">
				<!-- Related VODs -->
				{#if relatedVods.length > 0}
					<div>
						<h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-400 uppercase sm:mb-4">
							Related Videos
						</h3>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-3">
							{#each relatedVods as related (related.id)}
								<a
									href="/studios/vod/{related.id}"
									class="group flex flex-col rounded-xl border border-white/5 bg-gray-900/40 transition-all hover:border-white/15 hover:bg-gray-900/60 sm:flex-row sm:items-center sm:gap-3 sm:p-2"
								>
									<div class="relative aspect-video w-full shrink-0 overflow-hidden rounded-t-xl bg-gray-800 sm:h-16 sm:w-28 sm:rounded-lg">
										{#if related.muxPlaybackId}
											<img
												src="https://image.mux.com/{related.muxPlaybackId}/thumbnail.webp?width=224&height=128&fit_mode=smartcrop{related.thumbnailToken
													? `&token=${related.thumbnailToken}`
													: ''}"
												alt=""
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="flex h-full items-center justify-center">
												<svg class="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
													<path d="M8 5v14l11-7z" />
												</svg>
											</div>
										{/if}
										{#if related.duration}
											<div
												class="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white"
											>
												{formatDuration(related.duration)}
											</div>
										{/if}
										{#if related.isPremium}
											<div
												class="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded bg-emerald-500/90"
											>
												<svg class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
													<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
												</svg>
											</div>
										{/if}
									</div>
									<div class="min-w-0 flex-1 p-2 sm:p-0">
										<h4
											class="line-clamp-2 text-xs font-medium text-white transition-colors group-hover:text-red-400 sm:text-sm"
										>
											{related.title}
										</h4>
										<div class="mt-1 flex items-center gap-2 text-[11px] text-gray-500 sm:text-xs">
											{#if related.player1Name && related.player2Name}
												<span class="truncate">{related.player1Name} vs {related.player2Name}</span>
											{/if}
										</div>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Premium CTA (if not premium) -->
				{#if !canWatch || !data.user || (data.user.role !== 'premium' && data.user.role !== 'admin')}
					<div class="rounded-xl border border-emerald-500/20 bg-gray-900/50 p-4 sm:p-5">
						<div class="mb-3 flex items-center gap-2">
							<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
								<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
							</svg>
							<h3 class="font-semibold text-white">AGE Premium</h3>
						</div>
						<p class="mb-4 text-sm text-gray-400">
							Unlock all tournament VODs, premium articles, and exclusive content.
						</p>
						<a
							href="/premium"
							class="block rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-green-500"
						>
							Get Premium
						</a>
					</div>
				{/if}

				<!-- Back to Studios -->
				<a
					href="/studios"
					class="group flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900/50 p-3 transition-all hover:border-white/20 sm:p-4"
				>
					<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800">
						<svg
							class="h-4 w-4 text-gray-400 transition-colors group-hover:text-white"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
						</svg>
					</div>
					<div class="flex-1">
						<span class="text-sm font-medium text-white">Browse All VODs</span>
						<p class="text-xs text-gray-500">Back to Studios</p>
					</div>
					<svg
						class="h-4 w-4 text-gray-500 transition-colors group-hover:text-white"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowRight} />
					</svg>
				</a>
			</div>
		</div>
	</div>
</div>

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
		--media-secondary-color: #aaa;
		--media-control-background: transparent;
		--media-control-hover-background: transparent;
	}
</style>
