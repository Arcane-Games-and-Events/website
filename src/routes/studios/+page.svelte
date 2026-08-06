<script>
	import { icons } from '$lib/icons';
	export let data;

	// Check if user is premium/admin
	$: isPremiumUser = data.user?.role === 'premium' || data.user?.role === 'admin';

	// Use podcasts from database
	$: podcasts = data.podcasts || [];

	// Get the first podcast's latest episode for the featured section
	$: latestEpisode = podcasts[0]?.episodes?.[0] || null;
	$: remainingEpisodes = podcasts[0]?.episodes?.slice(1) || [];
	$: currentPodcast = podcasts[0] || null;

	// Episodes - show up to 3 remaining
	$: visibleEpisodes = remainingEpisodes.slice(0, 3);

	// VODs
	$: vods = data.vods || [];
	$: vodTotal = data.vodTotal || 0;

	function formatDate(dateStr) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatDuration(seconds) {
		if (!seconds) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>AGE Studios - Premium Content & Podcasts</title>
	<meta
		name="description"
		content="Premium tournament VODs, educational video courses, and podcasts from Arcane Games and Events."
	/>
</svelte:head>

<div class="min-h-screen overflow-x-hidden">
	<!-- Hero Banner -->
	<section class="relative px-3 pt-4 sm:px-6 sm:pt-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="relative overflow-hidden rounded-xl bg-gray-900 sm:rounded-2xl">
				<!-- Background image -->
				<img
					src="/banner/studios-banner.webp"
					alt=""
					class="absolute inset-0 h-full w-full object-cover opacity-20 sm:opacity-30 md:opacity-50"
				/>
				<!-- Background gradients -->
				<div
					class="absolute inset-0 bg-gradient-to-br from-red-600/20 via-purple-500/10 to-transparent"
				></div>
				<div
					class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-gray-900/70 sm:via-gray-900/70 sm:to-gray-900/60 md:to-transparent"
				></div>

				<!-- Content -->
				<div
					class="relative z-10 flex items-center px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-14 lg:px-12 lg:py-16"
				>
					<div class="max-w-2xl">
						<!-- Badge -->
						<div class="mb-2 flex items-center gap-2 sm:mb-3 md:mb-4">
							<div
								class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 backdrop-blur-sm sm:px-3 sm:py-1.5"
							>
								<svg
									class="h-3 w-3 text-red-400 sm:h-3.5 sm:w-3.5"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
								</svg>
								<span
									class="text-[10px] font-semibold tracking-wider text-red-400 uppercase sm:text-xs"
									>Watch & Listen</span
								>
							</div>
						</div>

						<!-- Title -->
						<h1
							class="mb-1.5 text-2xl font-bold text-white sm:mb-2 sm:text-3xl md:text-4xl lg:text-5xl"
						>
							AGE Studios
						</h1>
						<p
							class="mb-1.5 bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-base font-semibold text-transparent sm:mb-2 sm:text-lg md:mb-4 md:text-2xl"
						>
							Premium Content Hub
						</p>
						<p class="mb-4 max-w-lg text-xs text-gray-300 sm:mb-6 sm:text-sm md:text-base">
							Tournament VODs, podcasts, and exclusive content. Your home for AGE media.
						</p>

						<!-- CTAs -->
						<div class="flex flex-wrap gap-2 sm:gap-3">
							<a
								href="#content"
								class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:scale-105 sm:px-5 sm:py-2.5 sm:text-sm"
							>
								Browse Content
								<svg
									class="h-3.5 w-3.5 sm:h-4 sm:w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowDown} />
								</svg>
							</a>
							{#if !isPremiumUser}
								<a
									href="/premium"
									class="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10 sm:px-5 sm:py-2.5 sm:text-sm"
								>
									<svg
										class="h-3.5 w-3.5 text-emerald-400 sm:h-4 sm:w-4"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
									</svg>
									Get Premium
								</a>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Main Content + Sidebar Layout -->
	<section
		id="content"
		class="scroll-mt-6 overflow-hidden px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
	>
		<div class="mx-auto max-w-7xl">
			<div class="grid w-full gap-6 sm:gap-8 lg:grid-cols-3 lg:gap-10">
				<!-- Main Content (2/3) -->
				<div class="min-w-0 space-y-8 sm:space-y-10 lg:col-span-2">
					<!-- Tournament VODs -->
					<div>
						<div
							class="mb-4 flex items-center justify-between border-b border-white/10 pb-2.5 sm:mb-5 sm:pb-3"
						>
							<h2 class="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
								Tournament VODs
							</h2>
							<a
								href="/library/vods"
								class="flex items-center gap-1 text-[10px] text-gray-500 transition-colors hover:text-red-400 sm:text-xs"
							>
								{#if vodTotal > 0}
									View all {vodTotal}
								{:else}
									View all
								{/if}
								<svg
									class="h-3 w-3"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowRight} />
								</svg>
							</a>
						</div>

						<!-- VOD Grid -->
						{#if vods.length > 0}
							<div class="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
								{#each vods as vodItem (vodItem.id)}
									<a
										href="/library/{vodItem.id}"
										class="group min-w-0 overflow-hidden rounded-lg border border-white/5 bg-gray-900/40 transition-all hover:border-white/15 hover:bg-gray-900/60 sm:rounded-xl"
									>
										<!-- Thumbnail -->
										<div class="relative aspect-video overflow-hidden bg-gray-800">
											{#if vodItem.muxPlaybackId}
												<img
													src="https://image.mux.com/{vodItem.muxPlaybackId}/thumbnail.webp?width=480&height=270&fit_mode=smartcrop{vodItem.thumbnailToken
														? `&token=${vodItem.thumbnailToken}`
														: ''}"
													alt=""
													class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
													loading="lazy"
												/>
											{:else}
												<div class="flex h-full items-center justify-center">
													<svg
														class="h-10 w-10 text-gray-600"
														fill="none"
														stroke="currentColor"
														stroke-width="1.5"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d={icons.playCircle}
														/>
													</svg>
												</div>
											{/if}
											<!-- Play overlay -->
											<div
												class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20"
											>
												<div
													class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/90 opacity-0 shadow-lg transition-all group-hover:scale-110 group-hover:opacity-100"
												>
													<svg
														class="h-5 w-5 translate-x-0.5 text-white"
														fill="currentColor"
														viewBox="0 0 24 24"
													>
														<path d="M8 5v14l11-7z" />
													</svg>
												</div>
											</div>
											<!-- Duration badge -->
											{#if vodItem.duration}
												<div
													class="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white"
												>
													{formatDuration(vodItem.duration)}
												</div>
											{/if}
											<!-- Premium badge -->
											{#if vodItem.isPremium}
												<div
													class="absolute top-2 left-2 flex items-center gap-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-xs font-semibold text-white"
												>
													<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
														<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
													</svg>
													Premium
												</div>
											{/if}
										</div>
										<!-- Info -->
										<div class="min-w-0 overflow-hidden p-2 sm:p-3">
											<h3
												class="mb-0.5 line-clamp-2 text-xs leading-tight font-semibold text-white transition-colors group-hover:text-red-400 sm:mb-1 sm:text-sm"
											>
												{vodItem.title}
											</h3>
											<div
												class="flex flex-wrap items-center gap-1 text-[10px] text-gray-500 sm:gap-2 sm:text-xs"
											>
												{#if vodItem.player1Name && vodItem.player2Name}
													<span class="hidden rounded bg-white/5 px-1.5 py-0.5 sm:inline"
														>{vodItem.player1Name} vs {vodItem.player2Name}</span
													>
												{/if}
												{#if vodItem.publishedAt}
													<span>{formatDate(vodItem.publishedAt)}</span>
												{/if}
											</div>
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<!-- No VODs at all -->
							<div
								class="flex flex-col items-center justify-center rounded-lg border border-white/5 bg-gray-900/40 px-4 py-10 text-center sm:rounded-xl sm:py-12"
							>
								<svg
									class="mb-2 h-8 w-8 text-gray-600 sm:mb-3 sm:h-10 sm:w-10"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
								</svg>
								<p class="text-xs font-medium text-gray-400 sm:text-sm">
									Tournament VODs coming soon
								</p>
								<p class="mt-1 text-[10px] text-gray-500 sm:text-xs">
									Premium members will get full access to all tournament recordings
								</p>
							</div>
						{/if}
					</div>

					<!-- Featured Podcast Episode -->
					{#if currentPodcast}
						<div>
							<!-- Section Header -->
							<div
								class="mb-4 flex items-end justify-between border-b border-white/10 pb-2.5 sm:mb-5 sm:pb-3"
							>
								<h2 class="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
									Cardboard &amp; Beyond
								</h2>
								{#if currentPodcast.youtubePlaylistUrl}
									<a
										href={currentPodcast.youtubePlaylistUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-1 text-xs font-medium tracking-wide text-gray-400 uppercase transition-colors hover:text-white"
									>
										All episodes
										<svg
											class="h-3 w-3"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
										</svg>
									</a>
								{/if}
							</div>

							{#if latestEpisode}
								<!-- Featured Episode Card -->
								<a
									href={latestEpisode.youtubeUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="group block min-w-0 overflow-hidden rounded-lg border border-white/5 bg-gray-900/40 transition-all hover:border-white/15 hover:bg-gray-900/60 sm:rounded-xl"
								>
									<div class="sm:flex">
										<!-- Thumbnail -->
										<div
											class="relative aspect-video overflow-hidden bg-gray-800 sm:w-64 sm:shrink-0 md:w-72 lg:w-80"
										>
											{#if latestEpisode.thumbnailUrl}
												<img
													src={latestEpisode.thumbnailUrl}
													alt=""
													class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
												/>
											{:else}
												<div
													class="flex h-full items-center justify-center bg-gradient-to-br from-orange-900/30 to-gray-900"
												>
													<img
														src={currentPodcast.coverImage || '/c&b.png'}
														alt=""
														class="h-24 w-24 rounded-xl object-cover opacity-60"
													/>
												</div>
											{/if}
											<!-- Play overlay -->
											<div
												class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20"
											>
												<div
													class="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/90 shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-110"
												>
													<svg
														class="h-6 w-6 translate-x-0.5 text-white"
														fill="currentColor"
														viewBox="0 0 24 24"
													>
														<path d="M8 5v14l11-7z" />
													</svg>
												</div>
											</div>
											{#if latestEpisode.duration}
												<div
													class="absolute right-2 bottom-2 rounded bg-black/80 px-2 py-0.5 text-xs font-medium text-white"
												>
													{latestEpisode.duration}
												</div>
											{/if}
										</div>
										<!-- Content -->
										<div class="flex min-w-0 flex-1 flex-col justify-center p-3.5 sm:p-5">
											<div class="mb-1.5 flex flex-wrap items-center gap-2 sm:mb-2">
												{#if latestEpisode.season && latestEpisode.episode}
													<span
														class="rounded bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400 sm:text-xs"
													>
														S{latestEpisode.season}E{latestEpisode.episode}
													</span>
												{/if}
												<span
													class="text-[10px] font-semibold tracking-wide text-orange-400 uppercase sm:text-xs"
												>
													{currentPodcast.name}
												</span>
											</div>
											<h3
												class="mb-1.5 line-clamp-2 text-base leading-tight font-bold text-white transition-colors group-hover:text-orange-400 sm:mb-2 sm:text-lg md:text-xl"
											>
												{latestEpisode.title}
											</h3>
											{#if latestEpisode.description}
												<p class="mb-2 line-clamp-2 text-xs text-gray-400 sm:mb-3 sm:text-sm">
													{latestEpisode.description}
												</p>
											{/if}
											<div
												class="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 sm:gap-2 sm:text-xs"
											>
												{#if latestEpisode.guest}
													<span>Guest: {latestEpisode.guest}</span>
													<span class="text-gray-600">·</span>
												{/if}
												{#if latestEpisode.publishedAt}
													<span>{formatDate(latestEpisode.publishedAt)}</span>
												{/if}
											</div>
										</div>
									</div>
								</a>
							{:else}
								<!-- No episodes yet -->
								<div
									class="overflow-hidden rounded-lg border border-white/5 bg-gray-900/40 sm:rounded-xl"
								>
									<div
										class="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:p-6 sm:text-left"
									>
										<img
											src={currentPodcast.coverImage || '/c&b.png'}
											alt={currentPodcast.name}
											class="h-24 w-24 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10 sm:h-28 sm:w-28"
										/>
										<div>
											<h3 class="text-lg font-bold text-white sm:text-xl">{currentPodcast.name}</h3>
											<p class="mt-1 text-sm text-orange-400">Hosted by Bryce Platz</p>
											{#if currentPodcast.description}
												<p class="mt-2 text-xs text-gray-400 sm:text-sm">
													{currentPodcast.description}
												</p>
											{/if}
											<p class="mt-3 text-xs text-gray-500 sm:text-sm">New episodes coming soon!</p>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<!-- No podcast data — show placeholder -->
						<div>
							<div
								class="mb-4 flex items-end justify-between border-b border-white/10 pb-2.5 sm:mb-5 sm:pb-3"
							>
								<h2 class="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
									Podcasts
								</h2>
							</div>
							<div
								class="overflow-hidden rounded-lg border border-white/5 bg-gray-900/40 sm:rounded-xl"
							>
								<div
									class="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:items-center sm:gap-5 sm:p-6 sm:text-left"
								>
									<img
										src="/c&b.png"
										alt="Cardboard and Beyond"
										class="h-24 w-24 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10 sm:h-28 sm:w-28"
									/>
									<div>
										<h3 class="text-lg font-bold text-white sm:text-xl">Cardboard & Beyond</h3>
										<p class="mt-1 text-sm text-orange-400">Hosted by Bryce Platz</p>
										<p class="mt-2 text-xs text-gray-400 sm:text-sm">
											The official AGE podcast covering Flesh and Blood strategy, meta analysis, and
											community stories. New episodes coming soon!
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- More Episodes -->
					{#if remainingEpisodes.length > 0}
						<div>
							<div
								class="mb-3 flex items-end justify-between border-b border-white/10 pb-2.5 sm:mb-4 sm:pb-3"
							>
								<h2 class="font-display text-base font-bold tracking-tight text-white sm:text-lg">
									More Episodes
								</h2>
								{#if currentPodcast?.youtubePlaylistUrl}
									<a
										href={currentPodcast.youtubePlaylistUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-1 text-[10px] text-gray-500 transition-colors hover:text-orange-400 sm:text-xs"
									>
										{currentPodcast?.episodes?.length || 0} total
										<svg
											class="h-3 w-3"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d={icons.arrowTopRightOnSquare}
											/>
										</svg>
									</a>
								{:else}
									<span class="text-[10px] text-gray-500 sm:text-xs"
										>{currentPodcast?.episodes?.length || 0} total</span
									>
								{/if}
							</div>
							<div class="space-y-2 sm:space-y-3">
								{#each visibleEpisodes as episode (episode.id)}
									<a
										href={episode.youtubeUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="group flex items-center gap-3 overflow-hidden rounded-lg border border-white/5 bg-gray-900/40 p-2.5 transition-all hover:border-white/15 hover:bg-gray-900/60 sm:gap-4 sm:rounded-xl sm:p-3"
									>
										<!-- Thumbnail -->
										{#if episode.thumbnailUrl}
											<img
												src={episode.thumbnailUrl}
												alt=""
												class="h-12 w-20 shrink-0 rounded-md object-cover sm:h-14 sm:w-24 sm:rounded-lg"
												loading="lazy"
											/>
										{:else}
											<div
												class="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-orange-500/10 sm:h-14 sm:w-24 sm:rounded-lg"
											>
												<svg
													class="h-5 w-5 text-orange-400/60 sm:h-6 sm:w-6"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<path d="M8 5v14l11-7z" />
												</svg>
											</div>
										{/if}
										<!-- Info -->
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<h4
													class="truncate text-xs font-semibold text-white group-hover:text-orange-400 sm:text-sm"
												>
													{episode.title}
												</h4>
											</div>
											<div
												class="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 sm:mt-1 sm:gap-2 sm:text-xs"
											>
												{#if episode.season && episode.episode}
													<span
														class="rounded bg-orange-500/10 px-1 py-0.5 text-orange-400/80 sm:px-1.5"
														>S{episode.season}E{episode.episode}</span
													>
												{/if}
												{#if episode.guest}
													<span class="hidden sm:inline">Guest: {episode.guest}</span>
												{/if}
												{#if episode.publishedAt}
													<span>{formatDate(episode.publishedAt)}</span>
												{/if}
											</div>
										</div>
										<!-- Play + Duration -->
										<div class="hidden shrink-0 items-center gap-3 sm:flex">
											{#if episode.duration}
												<span class="text-xs text-gray-500">{episode.duration}</span>
											{/if}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 transition-colors group-hover:bg-orange-500/25"
											>
												<svg
													class="h-4 w-4 text-orange-400"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<path d="M8 5v14l11-7z" />
												</svg>
											</div>
										</div>
									</a>
								{/each}
							</div>
							{#if currentPodcast?.youtubePlaylistUrl && remainingEpisodes.length > 3}
								<a
									href={currentPodcast.youtubePlaylistUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
								>
									View All Episodes on YouTube
									<svg
										class="h-4 w-4"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d={icons.arrowTopRightOnSquare}
										/>
									</svg>
								</a>
							{/if}
						</div>
					{/if}

					<!-- Premium CTA (inline) -->
					{#if !isPremiumUser}
						<div
							class="relative isolate overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 via-gray-900 to-purple-900/10 sm:rounded-2xl"
						>
							<div
								class="pointer-events-none absolute top-0 right-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl sm:h-64 sm:w-64"
							></div>
							<div
								class="pointer-events-none absolute bottom-0 left-0 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl sm:h-48 sm:w-48"
							></div>
							<div class="relative p-5 sm:p-6 md:p-8">
								<div class="mb-2 flex items-center gap-2 sm:mb-3">
									<svg
										class="h-4.5 w-4.5 text-emerald-400 sm:h-5 sm:w-5"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
									</svg>
									<h2 class="font-display text-lg font-bold text-white sm:text-xl">
										Unlock Everything with Premium
									</h2>
								</div>
								<p class="mb-4 max-w-lg text-xs text-gray-400 sm:mb-5 sm:text-sm">
									Get full access to all AGE Studios content and more with a premium membership.
								</p>
								<ul class="mb-4 space-y-1.5 sm:mb-6 sm:space-y-2">
									<li class="flex items-center gap-2 text-xs text-gray-300 sm:text-sm">
										<svg
											class="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
										</svg>
										Full tournament VODs with expert commentary
									</li>
									<li class="flex items-center gap-2 text-xs text-gray-300 sm:text-sm">
										<svg
											class="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
										</svg>
										Exclusive premium articles and strategy guides
									</li>
									<li class="flex items-center gap-2 text-xs text-gray-300 sm:text-sm">
										<svg
											class="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
										</svg>
										Early access to new content and features
									</li>
								</ul>
								<a
									href="/premium"
									class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] sm:px-5 sm:py-2.5 sm:text-sm"
								>
									Subscribe to Premium
									<svg
										class="h-3.5 w-3.5 sm:h-4 sm:w-4"
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
					{/if}
				</div>

				<!-- Sidebar (1/3) -->
				<div class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
					<!-- YouTube Channel Widget -->
					<a
						href="https://www.youtube.com/@ArcaneGamesandEvents?sub_confirmation=1"
						target="_blank"
						rel="noopener noreferrer"
						class="group relative block overflow-hidden rounded-lg border border-red-500/20 bg-gray-900/50 p-3.5 transition-all hover:border-red-500/40 sm:rounded-xl sm:p-4"
					>
						<div
							class="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full bg-red-500/10 blur-2xl"
						></div>
						<div class="relative">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
									<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span
											class="text-sm font-semibold text-white transition-colors group-hover:text-red-400"
											>AGE on YouTube</span
										>
									</div>
									<p class="text-xs text-gray-400">Streams, VODs & Highlights</p>
								</div>
								<svg
									class="h-4 w-4 text-gray-500 transition-colors group-hover:text-red-400"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d={icons.arrowTopRightOnSquare}
									/>
								</svg>
							</div>
							<div
								class="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-400 transition-colors group-hover:bg-red-500/20"
							>
								Subscribe on YouTube
							</div>
						</div>
					</a>

					<!-- Podcast Info Widget -->
					{#if currentPodcast}
						<div class="rounded-lg border border-white/10 bg-gray-900/50 p-4 sm:rounded-xl sm:p-5">
							<div class="mb-3 flex items-center gap-2 sm:mb-4">
								<svg
									class="h-4.5 w-4.5 text-orange-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
									/>
								</svg>
								<h3 class="text-sm font-semibold text-white sm:text-base">Podcast</h3>
							</div>
							<div class="flex items-center gap-3">
								<img
									src={currentPodcast.coverImage || '/c&b.png'}
									alt={currentPodcast.name}
									class="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-white/10 sm:h-16 sm:w-16"
								/>
								<div>
									<h4 class="text-xs font-bold text-white sm:text-sm">{currentPodcast.name}</h4>
									<p class="mt-0.5 text-[10px] text-orange-400 sm:text-xs">Hosted by Bryce Platz</p>
									<p class="mt-1 text-[10px] text-gray-500 sm:text-xs">
										{currentPodcast.episodes?.length || 0} episodes
									</p>
								</div>
							</div>
							{#if currentPodcast.youtubePlaylistUrl}
								<a
									href={currentPodcast.youtubePlaylistUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="mt-3 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-medium text-white transition-all hover:border-white/20 hover:bg-white/10 sm:mt-4 sm:py-2 sm:text-xs"
								>
									<svg
										class="h-3 w-3 text-red-400 sm:h-3.5 sm:w-3.5"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"
										/>
									</svg>
									Watch on YouTube
								</a>
							{/if}
						</div>
					{/if}

					<!-- Premium Membership Widget -->
					{#if !isPremiumUser}
						<div
							class="rounded-lg border border-emerald-500/20 bg-gray-900/50 p-4 sm:rounded-xl sm:p-5"
						>
							<div class="mb-2 flex items-center gap-2 sm:mb-3">
								<svg
									class="h-4.5 w-4.5 text-emerald-400 sm:h-5 sm:w-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
								</svg>
								<h3 class="text-sm font-semibold text-white sm:text-base">Premium</h3>
							</div>
							<p class="mb-3 text-xs text-gray-400 sm:mb-4 sm:text-sm">
								Unlock all VODs, premium articles, and exclusive content.
							</p>
							<ul class="mb-3 space-y-1.5 sm:mb-4 sm:space-y-2">
								<li class="flex items-center gap-2 text-[10px] text-gray-300 sm:text-xs">
									<svg
										class="h-3 w-3 shrink-0 text-emerald-400 sm:h-3.5 sm:w-3.5"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
									</svg>
									Tournament VODs
								</li>
								<li class="flex items-center gap-2 text-[10px] text-gray-300 sm:text-xs">
									<svg
										class="h-3 w-3 shrink-0 text-emerald-400 sm:h-3.5 sm:w-3.5"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
									</svg>
									Exclusive articles
								</li>
								<li class="flex items-center gap-2 text-[10px] text-gray-300 sm:text-xs">
									<svg
										class="h-3 w-3 shrink-0 text-emerald-400 sm:h-3.5 sm:w-3.5"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
									</svg>
									Early access
								</li>
							</ul>
							<a
								href="/premium"
								class="block rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 py-2 text-center text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-green-500 sm:py-2.5 sm:text-sm"
							>
								Get Premium
							</a>
						</div>
					{/if}

					<!-- Browse Videos CTA -->
					<a
						href="https://www.youtube.com/@ArcaneGamesandEvents/videos"
						target="_blank"
						rel="noopener noreferrer"
						class="group block rounded-lg border border-white/10 bg-gray-900/50 p-3.5 transition-all hover:border-white/20 sm:rounded-xl sm:p-5"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 sm:h-9 sm:w-9"
							>
								<svg
									class="h-4 w-4 text-gray-400 transition-colors group-hover:text-white sm:h-4.5 sm:w-4.5"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.videoCamera} />
								</svg>
							</div>
							<div class="flex-1">
								<span class="text-xs font-medium text-white sm:text-sm">Browse All Videos</span>
								<p class="text-[10px] text-gray-500 sm:text-xs">On YouTube</p>
							</div>
							<svg
								class="h-3.5 w-3.5 text-gray-500 transition-colors group-hover:text-white sm:h-4 sm:w-4"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d={icons.arrowTopRightOnSquare}
								/>
							</svg>
						</div>
					</a>
				</div>
			</div>
		</div>
	</section>
</div>
