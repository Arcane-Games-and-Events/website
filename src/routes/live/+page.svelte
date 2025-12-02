<script>
	export let data;

	$: isPremium = data.user?.role === 'premium' || data.user?.role === 'admin';

	// Format date for display
	function formatDate(dateString) {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Get badge text and color based on stream type
	function getStreamBadge(type) {
		switch (type) {
			case 'live':
				return { text: 'LIVE NOW', color: 'bg-red-500', pulse: true };
			case 'upcoming':
				return { text: 'UPCOMING', color: 'bg-blue-500', pulse: false };
			case 'completed':
				return { text: 'LATEST STREAM', color: 'bg-purple-500', pulse: false };
			default:
				return null;
		}
	}

	$: streamBadge = data.streamType ? getStreamBadge(data.streamType) : null;

	// Fallback channel ID for when no specific video is available
	const CHANNEL_ID = 'UC8wNJqCM_VT-LAfMDkUPLJg';

	// Sample premium match videos - in production these would come from a database
	const premiumMatches = [
		{
			id: 1,
			title: 'Finals - LA Open December 2024',
			thumbnail: '/images/match-placeholder.jpg',
			duration: '32:15',
			event: 'LA Open',
			date: 'Dec 14, 2024',
			players: 'Player1 vs Player2'
		},
		{
			id: 2,
			title: 'Semifinals - LA Open December 2024',
			thumbnail: '/images/match-placeholder.jpg',
			duration: '28:42',
			event: 'LA Open',
			date: 'Dec 14, 2024',
			players: 'Player3 vs Player4'
		},
		{
			id: 3,
			title: 'Top 8 Feature Match',
			thumbnail: '/images/match-placeholder.jpg',
			duration: '45:20',
			event: 'LA Open',
			date: 'Dec 14, 2024',
			players: 'Player5 vs Player6'
		}
	];
</script>

<svelte:head>
	<title>AGE Live - Livestreams & Match Videos</title>
	<meta name="description" content="Watch AGE tournament livestreams, exclusive match videos, and experience our professional broadcasting tools." />
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Section -->
	<div class="relative overflow-hidden border-b border-gray-800">
		<div class="absolute inset-0 bg-gradient-to-br from-red-500/10 via-gray-900 to-purple-500/10"></div>
		<div class="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-red-500/20 blur-3xl"></div>
		<div class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"></div>

		<div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
			<div class="text-center">
				<!-- Live Badge -->
				<div class="mb-6 inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/30 px-4 py-2">
					<span class="relative flex h-3 w-3">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
					</span>
					<span class="text-sm font-semibold text-red-300">AGE Live</span>
				</div>

				<h1 class="text-5xl font-bold text-white sm:text-6xl lg:text-7xl mb-6">
					<span class="bg-gradient-to-r from-red-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
						AGE Live
					</span>
				</h1>
				<p class="mx-auto max-w-2xl text-xl text-gray-300 mb-8">
					Watch our tournament livestreams, exclusive match videos, and experience professional broadcasting with our Realtime Graphics Engine.
				</p>

				<!-- Quick Stats -->
				<div class="flex flex-wrap justify-center gap-8 text-center">
					<div>
						<div class="text-3xl font-bold text-white">Live</div>
						<div class="text-sm text-gray-400">Streams</div>
					</div>
					<div class="h-12 w-px bg-gray-700"></div>
					<div>
						<div class="text-3xl font-bold text-white">HD</div>
						<div class="text-sm text-gray-400">Quality</div>
					</div>
					<div class="h-12 w-px bg-gray-700"></div>
					<div>
						<div class="text-3xl font-bold text-white">VOD</div>
						<div class="text-sm text-gray-400">Archive</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Latest Livestream Section -->
		<section class="mb-16">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
				<div>
					<h2 class="text-3xl font-bold text-white flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
							<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
								<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
							</svg>
						</div>
						{#if data.streamType === 'live'}
							Live Now
						{:else if data.streamType === 'upcoming'}
							Upcoming Stream
						{:else}
							Latest Stream
						{/if}
					</h2>
					<p class="mt-2 text-gray-400">
						{#if data.streamType === 'live'}
							We're live! Watch the tournament now
						{:else if data.streamType === 'upcoming'}
							Don't miss our next broadcast
						{:else}
							Watch our most recent tournament broadcast
						{/if}
					</p>
				</div>
				<a
					href="https://www.youtube.com/@ArcaneGamesandEvents"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
					</svg>
					Subscribe on YouTube
				</a>
			</div>

			<!-- YouTube Embed -->
			<div class="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50">
				<div class="aspect-video w-full">
					{#if data.latestStream}
						<!-- Embed specific video with nocookie domain for better privacy/compatibility -->
						<iframe
							class="h-full w-full"
							src="https://www.youtube-nocookie.com/embed/{data.latestStream.id}?rel=0"
							title={data.latestStream.title}
							frameborder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowfullscreen
						></iframe>
					{:else}
						<!-- Fallback - show thumbnail with play button linking to channel -->
						<a
							href="https://www.youtube.com/@ArcaneGamesandEvents"
							target="_blank"
							rel="noopener noreferrer"
							class="block h-full w-full relative bg-gray-900 group"
						>
							<div class="absolute inset-0 flex items-center justify-center">
								<div class="text-center">
									<div class="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-red-600 group-hover:bg-red-500 transition-colors mb-4">
										<svg class="h-10 w-10 ml-1 text-white" fill="currentColor" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z"/>
										</svg>
									</div>
									<p class="text-white font-semibold">Watch on YouTube</p>
									<p class="text-gray-400 text-sm">Click to visit our channel</p>
								</div>
							</div>
						</a>
					{/if}
				</div>
			</div>

			<!-- Stream Info (below video) -->
			{#if data.latestStream}
				<div class="mt-4 flex flex-wrap items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						{#if streamBadge}
							<div class="flex items-center gap-2 rounded-full {streamBadge.color} px-3 py-1.5 text-sm font-semibold text-white">
								{#if streamBadge.pulse}
									<span class="relative flex h-2 w-2">
										<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
										<span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
									</span>
								{/if}
								{streamBadge.text}
							</div>
						{/if}
						<div>
							<h3 class="text-lg font-bold text-white line-clamp-1">{data.latestStream.title}</h3>
							<p class="text-sm text-gray-400">
								{#if data.streamType === 'upcoming'}
									Scheduled for {formatDate(data.latestStream.publishedAt)}
								{:else if data.streamType === 'completed' && data.latestStream.publishedAt}
									Streamed {formatDate(data.latestStream.publishedAt)}
								{:else if data.streamType === 'live'}
									Live on Arcane Games and Events
								{:else}
									Arcane Games and Events
								{/if}
							</p>
						</div>
					</div>
					<a
						href="https://www.youtube.com/watch?v={data.latestStream.id}"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
					>
						<span class="text-sm font-medium">Watch on YouTube</span>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>
				</div>
			{/if}

			<!-- Channel Links -->
			<div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
				<a
					href="https://www.youtube.com/@ArcaneGamesandEvents"
					target="_blank"
					rel="noopener noreferrer"
					class="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all hover:border-red-500/50 hover:bg-gray-900"
				>
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
						<svg class="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
							<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
						</svg>
					</div>
					<div>
						<div class="font-semibold text-white group-hover:text-red-400 transition-colors">YouTube Channel</div>
						<div class="text-sm text-gray-400">Subscribe for updates</div>
					</div>
				</a>

				<a
					href="https://www.youtube.com/@ArcaneGamesandEvents/videos"
					target="_blank"
					rel="noopener noreferrer"
					class="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all hover:border-purple-500/50 hover:bg-gray-900"
				>
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
						<svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					</div>
					<div>
						<div class="font-semibold text-white group-hover:text-purple-400 transition-colors">Past Broadcasts</div>
						<div class="text-sm text-gray-400">Watch VODs</div>
					</div>
				</a>

				<a
					href="https://www.youtube.com/@ArcaneGamesandEvents/streams"
					target="_blank"
					rel="noopener noreferrer"
					class="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all hover:border-cyan-500/50 hover:bg-gray-900"
				>
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
						<svg class="h-6 w-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
					</div>
					<div>
						<div class="font-semibold text-white group-hover:text-cyan-400 transition-colors">Live Streams</div>
						<div class="text-sm text-gray-400">Upcoming & past live</div>
					</div>
				</a>
			</div>
		</section>

		<!-- Past Broadcasts Section -->
		{#if data.pastBroadcasts && data.pastBroadcasts.length > 0}
			<section class="mb-16">
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
					<div>
						<h2 class="text-3xl font-bold text-white flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
								<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
							</div>
							Recent Broadcasts
						</h2>
						<p class="mt-2 text-gray-400">Catch up on past tournament streams</p>
					</div>
					<a
						href="https://www.youtube.com/@ArcaneGamesandEvents/streams"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
					>
						View All
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</a>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each data.pastBroadcasts as broadcast}
						<a
							href="https://www.youtube.com/watch?v={broadcast.id}"
							target="_blank"
							rel="noopener noreferrer"
							class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 transition-all hover:border-purple-500/50"
						>
							<!-- Thumbnail -->
							<div class="relative aspect-video bg-gray-800">
								{#if broadcast.thumbnail}
									<img
										src={broadcast.thumbnail}
										alt={broadcast.title}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
										<svg class="h-16 w-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									</div>
								{/if}
								<!-- Play Overlay -->
								<div class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
									<div class="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white">
										<svg class="h-7 w-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z"/>
										</svg>
									</div>
								</div>
							</div>
							<!-- Info -->
							<div class="p-4">
								<h3 class="font-semibold text-white group-hover:text-purple-400 transition-colors line-clamp-2">
									{broadcast.title}
								</h3>
								<p class="mt-2 text-sm text-gray-500">
									{formatDate(broadcast.publishedAt)}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Premium Match Videos Section -->
		<section class="mb-16">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
				<div>
					<h2 class="text-3xl font-bold text-white flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
							<svg class="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
							</svg>
						</div>
						Premium Match Videos
					</h2>
					<p class="mt-2 text-gray-400">Exclusive match recordings from our events</p>
				</div>
				{#if !isPremium}
					<a
						href="/premium"
						class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-amber-500/25"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
						</svg>
						Unlock with Premium
					</a>
				{/if}
			</div>

			{#if isPremium}
				<!-- Premium Content Grid -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each premiumMatches as match}
						<div class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 transition-all hover:border-amber-500/50">
							<!-- Thumbnail -->
							<div class="relative aspect-video bg-gray-800">
								<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
									<svg class="h-16 w-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<!-- Duration Badge -->
								<div class="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs font-medium text-white">
									{match.duration}
								</div>
								<!-- Play Overlay -->
								<div class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
									<div class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-white">
										<svg class="h-8 w-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z"/>
										</svg>
									</div>
								</div>
							</div>
							<!-- Info -->
							<div class="p-4">
								<h3 class="font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
									{match.title}
								</h3>
								<p class="mt-1 text-sm text-gray-400">{match.players}</p>
								<div class="mt-3 flex items-center gap-3 text-xs text-gray-500">
									<span class="flex items-center gap-1">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										{match.date}
									</span>
									<span class="flex items-center gap-1">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										{match.event}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Coming Soon Notice -->
				<div class="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
					<p class="text-amber-300">
						More match videos coming soon! We're uploading recordings from each event.
					</p>
				</div>
			{:else}
				<!-- Locked Premium Content -->
				<div class="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50">
					<!-- Blurred Preview -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 blur-sm opacity-40 pointer-events-none">
						{#each [1, 2, 3] as _}
							<div class="rounded-xl bg-gray-800 overflow-hidden">
								<div class="aspect-video bg-gray-700"></div>
								<div class="p-4 space-y-2">
									<div class="h-4 bg-gray-700 rounded w-3/4"></div>
									<div class="h-3 bg-gray-700 rounded w-1/2"></div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Lock Overlay -->
					<div class="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm p-8">
						<div class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 mb-6">
							<svg class="h-10 w-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
						<h3 class="text-2xl font-bold text-white mb-3">Premium Content</h3>
						<p class="text-gray-400 mb-8 text-center max-w-md px-4">
							Get access to exclusive match videos, extended coverage, and behind-the-scenes content from every AGE event.
						</p>
						<a
							href="/premium"
							class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-8 py-4 text-lg font-semibold text-white transition-all shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30"
						>
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
							</svg>
							Unlock Premium Access
						</a>
					</div>
				</div>
			{/if}
		</section>

		<!-- RGE Section -->
		<section class="mb-16">
			<div class="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/50 via-gray-900 to-purple-950/50">
				<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
				<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"></div>

				<div class="relative p-8 lg:p-12">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<!-- Content -->
						<div>
							<div class="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/30 px-4 py-2 mb-6">
								<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
								<span class="text-sm font-semibold text-blue-300">Coming Soon</span>
							</div>

							<h2 class="text-4xl font-bold text-white mb-4">
								Realtime Graphics Engine
							</h2>
							<p class="text-xl text-gray-300 mb-4">
								A broadcast overlay tool that integrates with OBS as a browser source. Design your own elements with dynamic information from RGE.
							</p>
							<p class="text-gray-400 mb-6">
								Put these elements into your OBS broadcast and get the flexibility to create custom overlays with real-time data.
							</p>

							<div class="space-y-4 mb-8">
								<div class="flex items-start gap-3">
									<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 mt-0.5">
										<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<div>
										<div class="font-semibold text-white">Life Total & Timer Controls</div>
										<div class="text-sm text-gray-400">Player-controlled life totals and match timers for your overlays</div>
									</div>
								</div>
								<div class="flex items-start gap-3">
									<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 mt-0.5">
										<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<div>
										<div class="font-semibold text-white">Player Graphics</div>
										<div class="text-sm text-gray-400">Name, record, and Hero selection display graphics</div>
									</div>
								</div>
								<div class="flex items-start gap-3">
									<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 mt-0.5">
										<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<div>
										<div class="font-semibold text-white">Top 8 Graphics Generator</div>
										<div class="text-sm text-gray-400">Automatically generate professional Top 8 bracket graphics</div>
									</div>
								</div>
								<div class="flex items-start gap-3">
									<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 mt-0.5">
										<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<div>
										<div class="font-semibold text-white">Metagame Breakdown</div>
										<div class="text-sm text-gray-400">Visual metagame breakdown graphics for your broadcast</div>
									</div>
								</div>
								<div class="flex items-start gap-3">
									<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 mt-0.5">
										<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<div>
										<div class="font-semibold text-white">Status & Break Screens</div>
										<div class="text-sm text-gray-400">Customizable status updates and break screen options</div>
									</div>
								</div>
							</div>

							<div class="flex flex-wrap gap-4">
								<a
									href="/premium"
									class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-6 py-3 font-semibold text-white transition-all shadow-lg shadow-blue-500/25"
								>
									<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
									</svg>
									Get Notified at Launch
								</a>
							</div>
						</div>

						<!-- Preview Image/Mockup -->
						<div class="relative">
							<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-4 shadow-2xl">
								<div class="rounded-lg bg-gray-900 aspect-video flex items-center justify-center">
									<div class="text-center p-8">
										<div class="flex h-24 w-24 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-6">
											<svg class="h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
											</svg>
										</div>
										<h3 class="text-xl font-bold text-white mb-2">RGE Preview</h3>
										<p class="text-gray-400 text-sm">Graphics engine interface coming soon</p>
									</div>
								</div>
								<!-- Mock Control Bar -->
								<div class="mt-4 flex items-center justify-between">
									<div class="flex items-center gap-2">
										<div class="h-3 w-3 rounded-full bg-red-500"></div>
										<div class="h-3 w-3 rounded-full bg-yellow-500"></div>
										<div class="h-3 w-3 rounded-full bg-green-500"></div>
									</div>
									<div class="text-xs text-gray-500">RGE v1.0 - Coming Soon</div>
								</div>
							</div>

							<!-- Floating Elements -->
							<div class="absolute -top-4 -right-4 rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-2 text-sm font-medium text-blue-300">
								OBS Ready
							</div>
							<div class="absolute -bottom-4 -left-4 rounded-lg bg-purple-500/20 border border-purple-500/30 px-3 py-2 text-sm font-medium text-purple-300">
								Premium Feature
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Upcoming Streams Section -->
		<section>
			<div class="text-center mb-8">
				<h2 class="text-3xl font-bold text-white mb-4">Upcoming Streams</h2>
				<p class="text-gray-400">Catch us live at our next event</p>
			</div>

			{#if data.upcomingStreams && data.upcomingStreams.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					{#each data.upcomingStreams as stream}
						<a
							href="https://www.youtube.com/watch?v={stream.id}"
							target="_blank"
							rel="noopener noreferrer"
							class="group rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-all hover:border-blue-500/50 hover:bg-gray-900"
						>
							<div class="flex items-start gap-4">
								<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
									<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
								</div>
								<div>
									<h3 class="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
										{stream.title}
									</h3>
									<p class="mt-1 text-sm text-gray-400">
										{formatDate(stream.publishedAt)}
									</p>
									<span class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-400">
										Set Reminder
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</span>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
					<div class="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gray-800 mb-4">
						<svg class="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
					<h3 class="text-xl font-semibold text-white mb-2">No Upcoming Streams</h3>
					<p class="text-gray-400 mb-6">
						Follow us on YouTube to get notified when we go live!
					</p>
					<a
						href="https://www.youtube.com/@ArcaneGamesandEvents?sub_confirmation=1"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-6 py-3 font-semibold text-white transition-colors"
					>
						<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
						</svg>
						Subscribe to AGE on YouTube
					</a>
				</div>
			{/if}
		</section>
	</div>
</div>
