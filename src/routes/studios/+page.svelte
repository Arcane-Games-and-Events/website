<script>
	import { icons } from '$lib/icons';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	export let data;

	// Use podcasts from database
	$: podcasts = data.podcasts || [];

	// Get the first podcast's latest episode for the featured section
	$: latestEpisode = podcasts[0]?.episodes?.[0] || null;
	$: remainingEpisodes = podcasts[0]?.episodes?.slice(1, 6) || [];
	$: currentPodcast = podcasts[0] || null;

	// VODs
	$: vods = data.vods || [];
	$: vodPagination = data.vodPagination || { page: 1, totalPages: 0, total: 0 };
	$: vodFilters = data.vodFilters || { q: '', sort: 'newest' };

	let searchTimeout;
	function handleVodSearch(e) {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			updateVodFilters({ q: e.target.value, page: null });
		}, 300);
	}

	function updateVodFilters(updates) {
		const url = new URL($page.url);
		for (const [key, value] of Object.entries(updates)) {
			if (value) {
				url.searchParams.set(key, value);
			} else {
				url.searchParams.delete(key);
			}
		}
		// Reset to page 1 when filters change (unless page is explicitly set)
		if (!('page' in updates)) {
			url.searchParams.delete('page');
		}
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

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

<div class="min-h-screen">
	<!-- Hero Banner -->
	<section class="relative px-4 pt-6 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="relative overflow-hidden rounded-2xl bg-gray-900">
				<!-- Background gradients -->
				<div class="absolute inset-0 bg-gradient-to-br from-red-600/20 via-purple-500/10 to-transparent"></div>
				<div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent"></div>
				<div class="absolute top-0 right-0 h-[500px] w-[500px] translate-x-1/4 -translate-y-1/4 rounded-full bg-red-500/15 blur-[120px]"></div>
				<div class="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-500/10 blur-[100px]"></div>

				<!-- Content -->
				<div class="relative z-10 flex items-center px-6 py-10 md:px-10 md:py-14 lg:px-12 lg:py-16">
					<div class="max-w-2xl">
						<!-- Badge -->
						<div class="mb-3 flex items-center gap-2 md:mb-4">
							<div class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
								<svg class="h-3.5 w-3.5 text-red-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
								</svg>
								<span class="text-xs font-semibold tracking-wider text-red-400 uppercase">Watch & Listen</span>
							</div>
						</div>

						<!-- Title -->
						<h1 class="mb-2 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
							AGE Studios
						</h1>
						<p class="mb-2 bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-lg font-semibold text-transparent md:mb-4 md:text-2xl">
							Premium Content Hub
						</p>
						<p class="mb-6 max-w-lg text-sm text-gray-300 md:text-base">
							Tournament VODs, podcasts, and exclusive content. Your home for AGE media.
						</p>

						<!-- CTAs -->
						<div class="flex flex-wrap gap-3">
							<a
								href="#content"
								class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:scale-105"
							>
								Browse Content
								<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowDown} />
								</svg>
							</a>
							<a
								href="/premium"
								class="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
							>
								<svg class="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
									<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
								</svg>
								Get Premium
							</a>
						</div>
					</div>

					<!-- Decorative play icon (desktop) -->
					<div class="hidden lg:block lg:flex-1">
						<div class="flex justify-end">
							<div class="relative">
								<div class="absolute inset-0 animate-pulse rounded-full bg-red-500/20 blur-xl"></div>
								<div class="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
									<svg class="h-14 w-14 text-red-400" fill="currentColor" viewBox="0 0 24 24">
										<path d="M8 5v14l11-7z" />
									</svg>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Main Content + Sidebar Layout -->
	<section id="content" class="scroll-mt-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
		<div class="mx-auto max-w-7xl">
			<div class="grid gap-8 lg:grid-cols-3 lg:gap-10">
				<!-- Main Content (2/3) -->
				<div class="space-y-10 lg:col-span-2">

					<!-- Featured Podcast Episode -->
					{#if currentPodcast}
						<div>
							<!-- Section Header -->
							<div class="mb-5 flex items-end justify-between border-b border-white/10 pb-3">
								<h2 class="font-display text-2xl font-bold tracking-tight text-white">
									Latest Episode
								</h2>
								{#if currentPodcast.youtubePlaylistUrl}
									<a
										href={currentPodcast.youtubePlaylistUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-1 text-xs font-medium tracking-wide text-gray-400 uppercase transition-colors hover:text-white"
									>
										All episodes
										<svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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
									class="group block overflow-hidden rounded-xl border border-white/5 bg-gray-900/40 transition-all hover:border-white/15 hover:bg-gray-900/60"
								>
									<div class="sm:flex">
										<!-- Thumbnail -->
										<div class="relative aspect-video overflow-hidden bg-gray-800 sm:aspect-video sm:w-72 sm:shrink-0 lg:w-80">
											{#if latestEpisode.thumbnailUrl}
												<img
													src={latestEpisode.thumbnailUrl}
													alt=""
													class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
												/>
											{:else}
												<div class="flex h-full items-center justify-center bg-gradient-to-br from-orange-900/30 to-gray-900">
													<img
														src={currentPodcast.coverImage || '/c&b.png'}
														alt=""
														class="h-24 w-24 rounded-xl object-cover opacity-60"
													/>
												</div>
											{/if}
											<!-- Play overlay -->
											<div class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
												<div class="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/90 shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-110">
													<svg class="h-6 w-6 translate-x-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
														<path d="M8 5v14l11-7z" />
													</svg>
												</div>
											</div>
											{#if latestEpisode.duration}
												<div class="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-xs font-medium text-white">
													{latestEpisode.duration}
												</div>
											{/if}
										</div>
										<!-- Content -->
										<div class="flex flex-1 flex-col justify-center p-5">
											<div class="mb-2 flex flex-wrap items-center gap-2">
												{#if latestEpisode.season && latestEpisode.episode}
													<span class="rounded bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-400">
														S{latestEpisode.season}E{latestEpisode.episode}
													</span>
												{/if}
												<span class="text-xs font-semibold tracking-wide text-orange-400 uppercase">
													{currentPodcast.name}
												</span>
											</div>
											<h3 class="mb-2 text-lg font-bold text-white transition-colors group-hover:text-orange-400 sm:text-xl">
												{latestEpisode.title}
											</h3>
											{#if latestEpisode.description}
												<p class="mb-3 line-clamp-2 text-sm text-gray-400">
													{latestEpisode.description}
												</p>
											{/if}
											<div class="flex items-center gap-2 text-xs text-gray-500">
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
								<div class="overflow-hidden rounded-xl border border-white/5 bg-gray-900/40">
									<div class="flex items-center gap-6 p-6">
										<img
											src={currentPodcast.coverImage || '/c&b.png'}
											alt={currentPodcast.name}
											class="h-28 w-28 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
										/>
										<div>
											<h3 class="text-xl font-bold text-white">{currentPodcast.name}</h3>
											<p class="mt-1 text-sm text-orange-400">Hosted by Bryce Platz</p>
											{#if currentPodcast.description}
												<p class="mt-2 text-sm text-gray-400">{currentPodcast.description}</p>
											{/if}
											<p class="mt-3 text-sm text-gray-500">New episodes coming soon!</p>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<!-- No podcast data — show placeholder -->
						<div>
							<div class="mb-5 flex items-end justify-between border-b border-white/10 pb-3">
								<h2 class="font-display text-2xl font-bold tracking-tight text-white">
									Podcasts
								</h2>
							</div>
							<div class="overflow-hidden rounded-xl border border-white/5 bg-gray-900/40">
								<div class="flex flex-col items-center gap-5 p-6 sm:flex-row">
									<img
										src="/c&b.png"
										alt="Cardboard and Beyond"
										class="h-28 w-28 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
									/>
									<div>
										<h3 class="text-xl font-bold text-white">Cardboard & Beyond</h3>
										<p class="mt-1 text-sm text-orange-400">Hosted by Bryce Platz</p>
										<p class="mt-2 text-sm text-gray-400">
											The official AGE podcast covering Flesh and Blood strategy, meta analysis, and community stories. New episodes coming soon!
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- More Episodes -->
					{#if remainingEpisodes.length > 0}
						<div>
							<div class="mb-4 flex items-end justify-between border-b border-white/10 pb-3">
								<h2 class="font-display text-lg font-bold tracking-tight text-white">
									More Episodes
								</h2>
								<span class="text-xs text-gray-500">{currentPodcast?.episodes?.length || 0} total</span>
							</div>
							<div class="space-y-3">
								{#each remainingEpisodes as episode (episode.id)}
									<a
										href={episode.youtubeUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="group flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/40 p-3 transition-all hover:border-white/15 hover:bg-gray-900/60"
									>
										<!-- Thumbnail -->
										{#if episode.thumbnailUrl}
											<img
												src={episode.thumbnailUrl}
												alt=""
												class="h-14 w-24 shrink-0 rounded-lg object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
												<svg class="h-6 w-6 text-orange-400/60" fill="currentColor" viewBox="0 0 24 24">
													<path d="M8 5v14l11-7z" />
												</svg>
											</div>
										{/if}
										<!-- Info -->
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<h4 class="truncate text-sm font-semibold text-white group-hover:text-orange-400">{episode.title}</h4>
											</div>
											<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
												{#if episode.season && episode.episode}
													<span class="rounded bg-orange-500/10 px-1.5 py-0.5 text-orange-400/80">S{episode.season}E{episode.episode}</span>
												{/if}
												{#if episode.guest}
													<span>Guest: {episode.guest}</span>
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
											<div class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 transition-colors group-hover:bg-orange-500/25">
												<svg class="h-4 w-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
													<path d="M8 5v14l11-7z" />
												</svg>
											</div>
										</div>
									</a>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Tournament VODs -->
					<div>
						<div class="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
							<h2 class="font-display text-2xl font-bold tracking-tight text-white">
								Tournament VODs
							</h2>
							{#if vodPagination.total > 0}
								<span class="text-xs text-gray-500">{vodPagination.total} video{vodPagination.total !== 1 ? 's' : ''}</span>
							{/if}
						</div>

						<!-- Search & Filters -->
						<div class="mb-5 flex flex-wrap items-center gap-3">
							<div class="relative flex-1">
								<svg class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
								</svg>
								<input
									type="text"
									placeholder="Search VODs..."
									value={vodFilters.q}
									oninput={handleVodSearch}
									class="w-full rounded-lg border border-white/10 bg-gray-900/60 py-2 pr-4 pl-9 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
								/>
							</div>
							<select
								value={vodFilters.sort}
								onchange={(e) => updateVodFilters({ sort: e.target.value })}
								class="rounded-lg border border-white/10 bg-gray-900/60 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
							>
								<option value="newest">Newest</option>
								<option value="oldest">Oldest</option>
								<option value="longest">Longest</option>
							</select>
						</div>

						<!-- VOD Grid -->
						{#if vods.length > 0}
							<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{#each vods as vodItem (vodItem.id)}
									<a
										href="/studios/vod/{vodItem.id}"
										class="group overflow-hidden rounded-xl border border-white/5 bg-gray-900/40 transition-all hover:border-white/15 hover:bg-gray-900/60"
									>
										<!-- Thumbnail -->
										<div class="relative aspect-video overflow-hidden bg-gray-800">
											{#if vodItem.muxPlaybackId}
												<img
													src="https://image.mux.com/{vodItem.muxPlaybackId}/thumbnail.webp?width=480&height=270&fit_mode=smartcrop{vodItem.thumbnailToken ? `&token=${vodItem.thumbnailToken}` : ''}"
													alt=""
													class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
													loading="lazy"
												/>
											{:else}
												<div class="flex h-full items-center justify-center">
													<svg class="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
													</svg>
												</div>
											{/if}
											<!-- Play overlay -->
											<div class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
												<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/90 opacity-0 shadow-lg transition-all group-hover:opacity-100 group-hover:scale-110">
													<svg class="h-5 w-5 translate-x-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
														<path d="M8 5v14l11-7z" />
													</svg>
												</div>
											</div>
											<!-- Duration badge -->
											{#if vodItem.duration}
												<div class="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
													{formatDuration(vodItem.duration)}
												</div>
											{/if}
											<!-- Premium badge -->
											{#if vodItem.isPremium}
												<div class="absolute top-2 left-2 flex items-center gap-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-xs font-semibold text-white">
													<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
														<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
													</svg>
													Premium
												</div>
											{/if}
										</div>
										<!-- Info -->
										<div class="p-3">
											<h3 class="mb-1 line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-red-400">
												{vodItem.title}
											</h3>
											<div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
												{#if vodItem.player1Name && vodItem.player2Name}
													<span class="rounded bg-white/5 px-1.5 py-0.5">{vodItem.player1Name} vs {vodItem.player2Name}</span>
												{/if}
												{#if vodItem.publishedAt}
													<span>{formatDate(vodItem.publishedAt)}</span>
												{/if}
											</div>
										</div>
									</a>
								{/each}
							</div>

							<!-- Pagination -->
							{#if vodPagination.totalPages > 1}
								<div class="mt-6 flex items-center justify-center gap-2">
									{#if vodPagination.page > 1}
										<button
											onclick={() => updateVodFilters({ page: vodPagination.page - 1 })}
											class="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
										>
											Previous
										</button>
									{/if}
									<span class="px-3 text-sm text-gray-500">
										Page {vodPagination.page} of {vodPagination.totalPages}
									</span>
									{#if vodPagination.page < vodPagination.totalPages}
										<button
											onclick={() => updateVodFilters({ page: vodPagination.page + 1 })}
											class="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
										>
											Next
										</button>
									{/if}
								</div>
							{/if}
						{:else if vodFilters.q}
							<!-- No results with filters -->
							<div class="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gray-900/40 py-10 text-center">
								<svg class="mb-3 h-10 w-10 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
								</svg>
								<p class="text-sm font-medium text-gray-400">No VODs match your search</p>
								<button
									onclick={() => updateVodFilters({ q: null, sort: 'newest', page: null })}
									class="mt-3 text-sm text-red-400 transition-colors hover:text-red-300"
								>
									Clear filters
								</button>
							</div>
						{:else}
							<!-- No VODs at all -->
							<div class="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gray-900/40 py-12 text-center">
								<svg class="mb-3 h-10 w-10 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
								</svg>
								<p class="text-sm font-medium text-gray-400">Tournament VODs coming soon</p>
								<p class="mt-1 text-xs text-gray-500">Premium members will get full access to all tournament recordings</p>
							</div>
						{/if}
					</div>

					<!-- Premium CTA (inline) -->
					<div class="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 via-gray-900 to-purple-900/10">
						<div class="absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
						<div class="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl"></div>
						<div class="relative p-6 md:p-8">
							<div class="mb-3 flex items-center gap-2">
								<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
									<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
								</svg>
								<h2 class="font-display text-xl font-bold text-white">Unlock Everything with Premium</h2>
							</div>
							<p class="mb-5 max-w-lg text-sm text-gray-400">
								Get full access to all AGE Studios content and more with a premium membership.
							</p>
							<ul class="mb-6 space-y-2">
								<li class="flex items-center gap-2 text-sm text-gray-300">
									<svg class="h-4 w-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
									</svg>
									Full tournament VODs with expert commentary
								</li>
								<li class="flex items-center gap-2 text-sm text-gray-300">
									<svg class="h-4 w-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
									</svg>
									Exclusive premium articles and strategy guides
								</li>
								<li class="flex items-center gap-2 text-sm text-gray-300">
									<svg class="h-4 w-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
									</svg>
									Early access to new content and features
								</li>
							</ul>
							<a
								href="/premium"
								class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02]"
							>
								Subscribe to Premium
								<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowRight} />
								</svg>
							</a>
						</div>
					</div>
				</div>

				<!-- Sidebar (1/3) -->
				<div class="space-y-6">
					<!-- YouTube Channel Widget -->
					<a
						href="https://www.youtube.com/@ArcaneGamesandEvents?sub_confirmation=1"
						target="_blank"
						rel="noopener noreferrer"
						class="group relative block overflow-hidden rounded-xl border border-red-500/20 bg-gray-900/50 p-4 transition-all hover:border-red-500/40"
					>
						<div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-red-500/10 blur-2xl"></div>
						<div class="relative">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
									<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
										<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
									</svg>
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="text-sm font-semibold text-white transition-colors group-hover:text-red-400">AGE on YouTube</span>
									</div>
									<p class="text-xs text-gray-400">Streams, VODs & Highlights</p>
								</div>
								<svg class="h-4 w-4 text-gray-500 transition-colors group-hover:text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowTopRightOnSquare} />
								</svg>
							</div>
							<div class="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-400 transition-colors group-hover:bg-red-500/20">
								Subscribe on YouTube
							</div>
						</div>
					</a>

					<!-- Podcast Info Widget -->
					{#if currentPodcast}
						<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
							<div class="mb-4 flex items-center gap-2">
								<svg class="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
								</svg>
								<h3 class="font-semibold text-white">Podcast</h3>
							</div>
							<div class="flex items-center gap-3">
								<img
									src={currentPodcast.coverImage || '/c&b.png'}
									alt={currentPodcast.name}
									class="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
								/>
								<div>
									<h4 class="text-sm font-bold text-white">{currentPodcast.name}</h4>
									<p class="mt-0.5 text-xs text-orange-400">Hosted by Bryce Platz</p>
									<p class="mt-1 text-xs text-gray-500">
										{currentPodcast.episodes?.length || 0} episodes
									</p>
								</div>
							</div>
							{#if currentPodcast.youtubePlaylistUrl}
								<a
									href={currentPodcast.youtubePlaylistUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="mt-4 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition-all hover:border-white/20 hover:bg-white/10"
								>
									<svg class="h-3.5 w-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
										<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
									</svg>
									Watch on YouTube
								</a>
							{/if}
						</div>
					{/if}

					<!-- Premium Membership Widget -->
					<div class="rounded-xl border border-emerald-500/20 bg-gray-900/50 p-5">
						<div class="mb-3 flex items-center gap-2">
							<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
								<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
							</svg>
							<h3 class="font-semibold text-white">Premium</h3>
						</div>
						<p class="mb-4 text-sm text-gray-400">
							Unlock all VODs, premium articles, and exclusive content.
						</p>
						<ul class="mb-4 space-y-2">
							<li class="flex items-center gap-2 text-xs text-gray-300">
								<svg class="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
								</svg>
								Tournament VODs
							</li>
							<li class="flex items-center gap-2 text-xs text-gray-300">
								<svg class="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
								</svg>
								Exclusive articles
							</li>
							<li class="flex items-center gap-2 text-xs text-gray-300">
								<svg class="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.check} />
								</svg>
								Early access
							</li>
						</ul>
						<a
							href="/premium"
							class="block rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-green-500"
						>
							Get Premium
						</a>
					</div>

					<!-- Browse Videos CTA -->
					<a
						href="https://www.youtube.com/@ArcaneGamesandEvents/videos"
						target="_blank"
						rel="noopener noreferrer"
						class="group block rounded-xl border border-white/10 bg-gray-900/50 p-5 transition-all hover:border-white/20"
					>
						<div class="flex items-center gap-3">
							<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800">
								<svg class="h-4.5 w-4.5 text-gray-400 transition-colors group-hover:text-white" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.videoCamera} />
								</svg>
							</div>
							<div class="flex-1">
								<span class="text-sm font-medium text-white">Browse All Videos</span>
								<p class="text-xs text-gray-500">On YouTube</p>
							</div>
							<svg class="h-4 w-4 text-gray-500 transition-colors group-hover:text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowTopRightOnSquare} />
							</svg>
						</div>
					</a>
				</div>
			</div>
		</div>
	</section>
</div>
