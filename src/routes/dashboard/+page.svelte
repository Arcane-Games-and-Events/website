<script>
	import { icons } from '$lib/icons';
	import { getCircuit } from '$lib/data/circuits.js';
	import ArticlePreview from '$lib/components/ArticlePreview.svelte';

	export let data;

	$: user = data.user;
	$: upcomingTickets = data.upcomingTickets || [];
	$: playerStanding = data.playerStanding;
	$: articles = data.articles || [];
	$: vods = data.vods || [];
	$: latestPodcastEpisode = data.latestPodcastEpisode;
	$: podcastInfo = data.podcastInfo;
	$: featuredDecklists = data.featuredDecklists || [];
	$: leaderboard = data.leaderboard || [];
	$: upcomingEvents = data.upcomingEvents || [];
	$: completedEvents = data.completedEvents || [];
	$: trendingHeroes = data.trendingHeroes || [];
	$: isPremium = user?.role === 'premium' || user?.role === 'admin';

	// Active feed tab
	let activeTab = 'for_you';
	const tabs = [
		{ id: 'for_you', label: 'For You' },
		{ id: 'results', label: 'Results' },
		{ id: 'content', label: 'Content' },
		{ id: 'events', label: 'Events' }
	];

	// Build unified feed from all data sources
	$: feedItems = buildFeed(
		articles,
		vods,
		latestPodcastEpisode,
		podcastInfo,
		featuredDecklists,
		completedEvents,
		upcomingEvents
	);
	$: filteredFeed = filterFeed(feedItems, activeTab);

	function buildFeed(articles, vods, podcastEp, podInfo, decklists, completed, upcoming) {
		const items = [];

		for (const a of articles) {
			items.push({
				type: 'article',
				data: a,
				date: new Date(a.publishedAt),
				key: `article-${a.slug}`
			});
		}
		for (const v of vods) {
			items.push({
				type: 'vod',
				data: v,
				date: new Date(v.publishedAt || v.createdAt),
				key: `vod-${v.id}`
			});
		}
		if (podcastEp) {
			items.push({
				type: 'podcast',
				data: { episode: podcastEp, podcastInfo: podInfo },
				date: new Date(podcastEp.publishedAt || podcastEp.createdAt),
				key: `podcast-${podcastEp.id}`
			});
		}
		for (const d of decklists) {
			items.push({
				type: 'decklist',
				data: d,
				date: new Date(d.createdAt),
				key: `decklist-${d.id}`
			});
		}
		for (const e of completed) {
			items.push({
				type: 'event_result',
				data: e,
				date: new Date(e.closedAt || e.eventDate),
				key: `result-${e.id}`
			});
		}
		for (const e of upcoming) {
			items.push({
				type: 'upcoming_event',
				data: e,
				date: new Date(e.eventDate),
				key: `upcoming-${e.id}`
			});
		}

		items.sort((a, b) => b.date - a.date);
		return items;
	}

	function filterFeed(items, tab) {
		switch (tab) {
			case 'results':
				return items.filter((i) => i.type === 'event_result');
			case 'content':
				return items.filter((i) => ['article', 'vod', 'podcast'].includes(i.type));
			case 'events':
				return items.filter((i) => ['event_result', 'upcoming_event'].includes(i.type));
			default:
				return items.filter((i) => i.type !== 'upcoming_event');
		}
	}

	function getUserInitials(firstName, lastName) {
		if (!firstName) return 'U';
		if (lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
		return firstName.charAt(0).toUpperCase();
	}

	function formatRelativeTime(date) {
		if (!date) return '';
		const now = new Date();
		const diff = now - date;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d ago`;
		if (days < 30) return `${Math.floor(days / 7)}w ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function formatEventDate(dateStr) {
		if (!dateStr) return 'TBD';
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		});
	}

	function formatVodDuration(seconds) {
		if (!seconds) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function getHeroImage(heroName) {
		if (!heroName) return null;
		const slug = heroName
			.toLowerCase()
			.replace(/ð/g, 'd')
			.replace(/þ/g, 'th')
			.replace(/æ/g, 'ae')
			.replace(/ø/g, 'o')
			.replace(/å/g, 'a')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[!@#$%^&*()+=[\]{}|\\:;<>?/~`]/g, '')
			.replace(/[,'"]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
		return `/hero_images/${slug}.webp`;
	}

	function getTypeBadge(type) {
		switch (type) {
			case 'article':
				return {
					label: 'Article',
					bg: 'bg-amber-500/15',
					text: 'text-amber-400',
					icon: icons.newspaper
				};
			case 'vod':
				return { label: 'VOD', bg: 'bg-red-500/15', text: 'text-red-400', icon: icons.videoCamera };
			case 'podcast':
				return {
					label: 'Podcast',
					bg: 'bg-orange-500/15',
					text: 'text-orange-400',
					icon: icons.speakerWave
				};
			case 'decklist':
				return {
					label: 'Decklist',
					bg: 'bg-cyan-500/15',
					text: 'text-cyan-400',
					icon: icons.documentText
				};
			case 'event_result':
				return {
					label: 'Results',
					bg: 'bg-green-500/15',
					text: 'text-green-400',
					icon: icons.trophy
				};
			case 'upcoming_event':
				return {
					label: 'Event',
					bg: 'bg-blue-500/15',
					text: 'text-blue-400',
					icon: icons.calendar
				};
			default:
				return {
					label: type,
					bg: 'bg-gray-500/15',
					text: 'text-gray-400',
					icon: icons.informationCircle
				};
		}
	}

	$: winRate =
		playerStanding && playerStanding.matchesPlayed > 0
			? Math.round((playerStanding.matchesWon / playerStanding.matchesPlayed) * 100)
			: null;
</script>

<svelte:head>
	<title>Dashboard - AGE</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Profile Card Header -->
	<div class="relative overflow-hidden border-b border-white/10">
		<div
			class="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5"
		></div>
		<div class="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"></div>
		<div
			class="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl"
		></div>

		<div class="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
			<div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-4">
					<!-- Avatar -->
					<div class="relative">
						<div
							class="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg
							{isPremium
								? 'bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 ring-2 shadow-emerald-500/30 ring-emerald-400/50'
								: 'bg-gradient-to-br from-blue-500 to-purple-600 ring-2 shadow-blue-500/20 ring-white/10'}"
						>
							{getUserInitials(user?.firstName, user?.lastName)}
						</div>
						{#if isPremium}
							<div
								class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/50"
							>
								<svg class="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
									<path d={icons.boltSolid} />
								</svg>
							</div>
						{/if}
					</div>

					<div>
						<div class="flex items-center gap-3">
							<h1 class="text-xl font-bold text-white sm:text-2xl">
								{user?.firstName || 'User'}
								{user?.lastName || ''}
							</h1>
							{#if isPremium}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-green-600/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400"
								>
									<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
										<path d={icons.boltSolid} />
									</svg>
									Premium
								</span>
							{:else}
								<span
									class="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-400"
								>
									Free
								</span>
							{/if}
						</div>
						<div class="mt-1 flex items-center gap-3 text-sm text-gray-400">
							{#if user?.gemId}
								<span class="font-mono text-xs">GEM: {user.gemId}</span>
							{/if}
							{#if user?.createdAt}
								<span class="text-xs text-gray-500">
									Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
										month: 'short',
										year: 'numeric'
									})}
								</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Stats Bar + Actions -->
				<div class="flex items-center gap-4">
					{#if playerStanding}
						<div
							class="hidden items-center gap-6 rounded-xl border border-white/10 bg-white/5 px-5 py-3 sm:flex"
						>
							<div class="text-center">
								<p class="text-lg font-bold text-white">{playerStanding.totalPoints || 0}</p>
								<p class="text-[10px] font-medium tracking-wider text-gray-500 uppercase">Points</p>
							</div>
							<div class="h-8 w-px bg-white/10"></div>
							<div class="text-center">
								<p class="text-lg font-bold text-white">
									{playerStanding.matchesWon || 0}-{(playerStanding.matchesPlayed || 0) -
										(playerStanding.matchesWon || 0)}
								</p>
								<p class="text-[10px] font-medium tracking-wider text-gray-500 uppercase">Record</p>
							</div>
							{#if winRate !== null}
								<div class="h-8 w-px bg-white/10"></div>
								<div class="text-center">
									<p class="text-lg font-bold text-white">{winRate}%</p>
									<p class="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
										Win Rate
									</p>
								</div>
							{/if}
						</div>
					{/if}
					<div class="flex gap-2">
						<a
							href="/account"
							class="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
						>
							Account
						</a>
						{#if !isPremium}
							<a
								href="/premium"
								class="rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-green-600"
							>
								Go Premium
							</a>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Feed Tabs -->
	<div class="sticky top-0 z-10 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
		<div class="mx-auto max-w-7xl px-4 lg:px-8">
			<div class="-mb-px flex gap-1 overflow-x-auto">
				{#each tabs as tab}
					<button
						on:click={() => (activeTab = tab.id)}
						class="relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
						{activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}"
					>
						{tab.label}
						{#if activeTab === tab.id}
							<div
								class="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
							></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Feed Column (2/3) -->
			<div class="space-y-4 lg:col-span-2">
				{#if filteredFeed.length > 0}
					{#each filteredFeed as item (item.key)}
						{@const badge = getTypeBadge(item.type)}
						<div
							class="overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 transition-all hover:border-white/15"
						>
							<!-- Feed Item Header -->
							<div class="flex items-center gap-2 px-4 pt-3 pb-2">
								<span
									class="flex items-center gap-1.5 rounded-full {badge.bg} px-2.5 py-1 text-[10px] font-semibold {badge.text}"
								>
									<svg
										class="h-3 w-3"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d={badge.icon} />
									</svg>
									{badge.label}
								</span>
								<span class="text-xs text-gray-600">{formatRelativeTime(item.date)}</span>
							</div>

							<!-- Feed Item Content -->
							<div class="px-4 pb-4">
								{#if item.type === 'article'}
									<ArticlePreview article={item.data} variant="compact" />
								{:else if item.type === 'vod'}
									<a href="/studios/vod/{item.data.id}" class="group flex gap-4">
										<div
											class="relative w-36 shrink-0 overflow-hidden rounded-lg bg-gray-800 sm:w-44"
										>
											<div class="aspect-video">
												{#if item.data.muxPlaybackId}
													<img
														src="https://image.mux.com/{item.data
															.muxPlaybackId}/thumbnail.webp?width=640&height=360&fit_mode=smartcrop{item
															.data.thumbnailToken
															? `&token=${item.data.thumbnailToken}`
															: ''}"
														alt=""
														class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
														loading="lazy"
													/>
												{:else}
													<div class="flex h-full items-center justify-center">
														<svg
															class="h-8 w-8 text-gray-600"
															fill="currentColor"
															viewBox="0 0 24 24"
														>
															<path d="M8 5v14l11-7z" />
														</svg>
													</div>
												{/if}
												{#if item.data.duration}
													<div
														class="absolute right-1 bottom-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white"
													>
														{formatVodDuration(item.data.duration)}
													</div>
												{/if}
												{#if item.data.isPremium}
													<div
														class="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded bg-emerald-500/90"
													>
														<svg class="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
															<path d={icons.boltSolid} />
														</svg>
													</div>
												{/if}
											</div>
										</div>
										<div class="min-w-0 flex-1 py-1">
											<h4
												class="line-clamp-2 text-sm leading-snug font-bold text-white transition-colors group-hover:text-red-400 sm:text-base"
											>
												{item.data.title}
											</h4>
											{#if item.data.player1Name && item.data.player2Name}
												<p class="mt-1.5 text-xs text-gray-400">
													{item.data.player1Name} vs {item.data.player2Name}
												</p>
											{/if}
											{#if item.data.player1Hero || item.data.player2Hero}
												<div class="mt-2 flex items-center gap-2">
													{#if item.data.player1Hero}
														<span
															class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400"
														>
															{item.data.player1Hero}
														</span>
													{/if}
													{#if item.data.player1Hero && item.data.player2Hero}
														<span class="text-[10px] text-gray-600">vs</span>
													{/if}
													{#if item.data.player2Hero}
														<span
															class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400"
														>
															{item.data.player2Hero}
														</span>
													{/if}
												</div>
											{/if}
										</div>
									</a>
								{:else if item.type === 'podcast'}
									{@const ep = item.data.episode}
									{@const info = item.data.podcastInfo}
									<a
										href={ep.youtubeUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="group flex gap-4"
									>
										<div
											class="relative w-36 shrink-0 overflow-hidden rounded-lg bg-gray-800 sm:w-44"
										>
											<div class="aspect-video">
												{#if ep.thumbnailUrl}
													<img
														src={ep.thumbnailUrl}
														alt=""
														class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
														loading="lazy"
													/>
												{:else}
													<div
														class="flex h-full items-center justify-center bg-gradient-to-br from-orange-900/30 to-gray-900"
													>
														<img
															src={info?.coverImage || '/c&b.png'}
															alt=""
															class="h-16 w-16 rounded-lg object-cover opacity-60"
														/>
													</div>
												{/if}
												<!-- Play overlay -->
												<div
													class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20"
												>
													<div
														class="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/90 shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-110"
													>
														<svg
															class="h-4 w-4 translate-x-0.5 text-white"
															fill="currentColor"
															viewBox="0 0 24 24"
														>
															<path d="M8 5v14l11-7z" />
														</svg>
													</div>
												</div>
												{#if ep.duration}
													<div
														class="absolute right-1 bottom-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white"
													>
														{ep.duration}
													</div>
												{/if}
											</div>
										</div>
										<div class="min-w-0 flex-1 py-1">
											<div class="mb-1 flex flex-wrap items-center gap-2">
												{#if ep.season && ep.episode}
													<span
														class="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400"
													>
														S{ep.season}E{ep.episode}
													</span>
												{/if}
												<span
													class="text-[10px] font-semibold tracking-wide text-orange-400 uppercase"
												>
													{info?.name || 'Podcast'}
												</span>
											</div>
											<h4
												class="line-clamp-2 text-sm leading-snug font-bold text-white transition-colors group-hover:text-orange-400 sm:text-base"
											>
												{ep.title}
											</h4>
											{#if ep.guest}
												<p class="mt-1.5 text-xs text-gray-400">Guest: {ep.guest}</p>
											{/if}
										</div>
									</a>
								{:else if item.type === 'decklist'}
									{@const heroImg = getHeroImage(item.data.hero)}
									{@const circuit = getCircuit(item.data.eventCircuit)}
									<a
										href="/age-open/{item.data.eventId}/decklist/{item.data.id}"
										class="group flex items-center gap-4"
									>
										{#if heroImg}
											<div
												class="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-800"
											>
												<img
													src={heroImg}
													alt={item.data.hero}
													class="h-full w-full object-cover"
													loading="lazy"
												/>
												<div
													class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent py-0.5 text-center"
												>
													<span class="text-[8px] font-bold text-white uppercase">1st</span>
												</div>
											</div>
										{:else}
											<div
												class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10"
											>
												<svg
													class="h-6 w-6 text-cyan-400"
													fill="none"
													stroke="currentColor"
													stroke-width="1.5"
													viewBox="0 0 24 24"
												>
													<path stroke-linecap="round" stroke-linejoin="round" d={icons.trophy} />
												</svg>
											</div>
										{/if}
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<h4
													class="text-sm font-bold text-white transition-colors group-hover:text-cyan-400"
												>
													{item.data.hero}
												</h4>
												<span
													class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400"
												>
													1st Place
												</span>
											</div>
											<p class="mt-0.5 text-xs text-gray-400">
												{item.data.playerName}
												{#if item.data.format}
													<span class="text-gray-600"> · </span>{item.data.format}
												{/if}
											</p>
											{#if item.data.eventName}
												<p class="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
													{#if item.data.eventCircuit}
														<span class="h-1.5 w-1.5 rounded-full {circuit.colors.bg}"></span>
													{/if}
													{item.data.eventName}
												</p>
											{/if}
										</div>
									</a>
								{:else if item.type === 'event_result'}
									{@const circuit = getCircuit(item.data.circuit)}
									{@const results = item.data.tournamentResults}
									<a href="/age-open/{item.data.id}/results" class="group block">
										<div class="flex items-start gap-4">
											<div
												class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg {circuit
													.colors.bgLight}"
											>
												<svg
													class="h-6 w-6 {circuit.colors.text}"
													fill="none"
													stroke="currentColor"
													stroke-width="1.5"
													viewBox="0 0 24 24"
												>
													<path stroke-linecap="round" stroke-linejoin="round" d={icons.trophy} />
												</svg>
											</div>
											<div class="min-w-0 flex-1">
												<h4
													class="text-sm font-bold text-white transition-colors group-hover:text-green-400 sm:text-base"
												>
													{item.data.title}
												</h4>
												<div
													class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400"
												>
													{#if item.data.location}
														<span>{item.data.location}</span>
													{/if}
													{#if item.data.format}
														<span class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500"
															>{item.data.format}</span
														>
													{/if}
												</div>
												<!-- Podium -->
												{#if results && Array.isArray(results) && results.length > 0}
													<div class="mt-3 space-y-1.5">
														{#each results.slice(0, 3) as result, i}
															<div class="flex items-center gap-2">
																<span
																	class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold
																	{i === 0
																		? 'bg-amber-500/20 text-amber-400'
																		: i === 1
																			? 'bg-gray-400/20 text-gray-300'
																			: 'bg-orange-500/20 text-orange-400'}"
																>
																	{i + 1}
																</span>
																<span class="text-xs text-gray-300"
																	>{result.playerName || result.player || 'Unknown'}</span
																>
																{#if result.hero}
																	<span class="text-[10px] text-gray-600">({result.hero})</span>
																{/if}
															</div>
														{/each}
													</div>
												{/if}
											</div>
										</div>
									</a>
								{:else if item.type === 'upcoming_event'}
									{@const circuit = getCircuit(item.data.circuit)}
									<a href="/age-open/{item.data.id}" class="group flex items-center gap-4">
										<!-- Date Badge -->
										<div
											class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg {circuit
												.colors.bgLight} {circuit.colors.text}"
										>
											<span class="text-[10px] font-medium uppercase">
												{item.data.eventDate
													? new Date(item.data.eventDate).toLocaleDateString('en-US', {
															month: 'short',
															timeZone: 'UTC'
														})
													: 'TBD'}
											</span>
											<span class="text-lg leading-none font-bold">
												{item.data.eventDate
													? new Date(item.data.eventDate).toLocaleDateString('en-US', {
															day: 'numeric',
															timeZone: 'UTC'
														})
													: '--'}
											</span>
										</div>
										<div class="min-w-0 flex-1">
											<h4
												class="text-sm font-bold text-white transition-colors group-hover:text-blue-400"
											>
												{item.data.title}
											</h4>
											<div
												class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400"
											>
												{#if item.data.location}
													<span class="flex items-center gap-1">
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
																d={icons.mapPin}
															/>
														</svg>
														{item.data.location}
													</span>
												{/if}
												{#if item.data.format}
													<span class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500"
														>{item.data.format}</span
													>
												{/if}
												{#if item.data.circuit}
													<span class="flex items-center gap-1">
														<span class="h-1.5 w-1.5 rounded-full {circuit.colors.bg}"></span>
														<span class="text-[10px]">{item.data.circuit}</span>
													</span>
												{/if}
											</div>
										</div>
										<!-- Registered badge if user has ticket -->
										{#if upcomingTickets.some((t) => t.eventId === item.data.id)}
											<span
												class="hidden shrink-0 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-400 sm:inline-flex"
											>
												Registered
											</span>
										{/if}
									</a>
								{/if}
							</div>
						</div>
					{/each}
				{:else}
					<div
						class="rounded-xl border border-dashed border-white/10 bg-gray-900/30 px-6 py-16 text-center"
					>
						<svg
							class="mx-auto h-12 w-12 text-gray-600"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
						</svg>
						<p class="mt-4 text-sm text-gray-400">No items in this feed yet</p>
						<p class="mt-1 text-xs text-gray-600">
							Check back as new content, results, and events are added
						</p>
					</div>
				{/if}
			</div>

			<!-- Sidebar (1/3) -->
			<div class="space-y-5">
				<!-- Your Stats (mobile + desktop, only if standing exists) -->
				{#if playerStanding}
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5 sm:hidden">
						<h3 class="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Your Stats
						</h3>
						<div class="grid grid-cols-3 gap-3 text-center">
							<div>
								<p class="text-lg font-bold text-white">{playerStanding.totalPoints || 0}</p>
								<p class="text-[10px] text-gray-500">Points</p>
							</div>
							<div>
								<p class="text-lg font-bold text-white">
									{playerStanding.matchesWon || 0}-{(playerStanding.matchesPlayed || 0) -
										(playerStanding.matchesWon || 0)}
								</p>
								<p class="text-[10px] text-gray-500">Record</p>
							</div>
							<div>
								<p class="text-lg font-bold text-white">
									{winRate !== null ? `${winRate}%` : '--'}
								</p>
								<p class="text-[10px] text-gray-500">Win Rate</p>
							</div>
						</div>
					</div>

					<div
						class="hidden rounded-xl border border-white/10 bg-gray-900/50 p-5 sm:block lg:block"
					>
						<h3 class="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Your Stats
						</h3>
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-400">Total Points</span>
								<span class="text-base font-bold text-white">{playerStanding.totalPoints || 0}</span
								>
							</div>
							<div class="h-px bg-white/5"></div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-400">Match Record</span>
								<span class="text-sm font-medium text-gray-200">
									{playerStanding.matchesWon || 0}W - {(playerStanding.matchesPlayed || 0) -
										(playerStanding.matchesWon || 0)}L
								</span>
							</div>
							{#if winRate !== null}
								<div class="h-px bg-white/5"></div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-400">Win Rate</span>
									<span class="text-sm font-medium text-white">{winRate}%</span>
								</div>
							{/if}
							<div class="h-px bg-white/5"></div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-400">Season</span>
								<span class="text-sm font-medium text-gray-200"
									>{playerStanding.season || 'Current'}</span
								>
							</div>
						</div>
						<a
							href="/age-open?tab=standings"
							class="mt-4 block text-center text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
						>
							View full standings
						</a>
					</div>
				{/if}

				<!-- Leaderboard -->
				{#if leaderboard.length > 0}
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
								Leaderboard
							</h3>
							<a
								href="/age-open?tab=standings"
								class="text-[10px] font-medium text-gray-500 transition-colors hover:text-white"
							>
								View all
							</a>
						</div>
						<div class="space-y-2">
							{#each leaderboard as player}
								<div
									class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
								>
									<!-- Rank -->
									<span
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
										{player.rank === 1
											? 'bg-amber-500/20 text-amber-400'
											: player.rank === 2
												? 'bg-gray-400/20 text-gray-300'
												: player.rank === 3
													? 'bg-orange-500/20 text-orange-400'
													: 'bg-white/5 text-gray-500'}"
									>
										{player.rank}
									</span>
									<!-- Initials avatar -->
									<div
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[10px] font-bold text-gray-300"
									>
										{player.playerName
											? player.playerName
													.split(' ')
													.map((n) => n[0])
													.join('')
													.slice(0, 2)
													.toUpperCase()
											: '??'}
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-gray-200">{player.playerName}</p>
									</div>
									<span class="text-sm font-bold text-white">{player.totalPoints}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Upcoming Events -->
				{#if upcomingTickets.length > 0 || upcomingEvents.length > 0}
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Upcoming</h3>
							<a
								href="/age-open"
								class="text-[10px] font-medium text-gray-500 transition-colors hover:text-white"
							>
								All events
							</a>
						</div>
						<div class="space-y-3">
							<!-- User's registered events first -->
							{#each upcomingTickets as ticket}
								<a
									href="/age-open/{ticket.eventId}"
									class="group flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/5"
								>
									<div
										class="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded bg-blue-500/10 text-blue-400"
									>
										<span class="text-[8px] font-medium uppercase">
											{ticket.eventDate
												? new Date(ticket.eventDate).toLocaleDateString('en-US', {
														month: 'short',
														timeZone: 'UTC'
													})
												: ''}
										</span>
										<span class="text-sm leading-none font-bold">
											{ticket.eventDate
												? new Date(ticket.eventDate).toLocaleDateString('en-US', {
														day: 'numeric',
														timeZone: 'UTC'
													})
												: '--'}
										</span>
									</div>
									<div class="min-w-0 flex-1">
										<p
											class="truncate text-xs font-medium text-white transition-colors group-hover:text-blue-400"
										>
											{ticket.eventTitle}
										</p>
										<p class="text-[10px] text-gray-500">{ticket.eventLocation || ''}</p>
									</div>
									<span
										class="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold text-blue-400"
									>
										Going
									</span>
								</a>
							{/each}
							<!-- General upcoming -->
							{#each upcomingEvents.filter((e) => !upcomingTickets.some((t) => t.eventId === e.id)) as evt}
								{@const circuit = getCircuit(evt.circuit)}
								<a
									href="/age-open/{evt.id}"
									class="group flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/5"
								>
									<div
										class="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded {circuit
											.colors.bgLight} {circuit.colors.text}"
									>
										<span class="text-[8px] font-medium uppercase">
											{evt.eventDate
												? new Date(evt.eventDate).toLocaleDateString('en-US', {
														month: 'short',
														timeZone: 'UTC'
													})
												: ''}
										</span>
										<span class="text-sm leading-none font-bold">
											{evt.eventDate
												? new Date(evt.eventDate).toLocaleDateString('en-US', {
														day: 'numeric',
														timeZone: 'UTC'
													})
												: '--'}
										</span>
									</div>
									<div class="min-w-0 flex-1">
										<p
											class="truncate text-xs font-medium text-white transition-colors group-hover:{circuit
												.colors.text}"
										>
											{evt.title}
										</p>
										<p class="text-[10px] text-gray-500">{evt.location || ''}</p>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Trending Heroes -->
				{#if trendingHeroes.length > 0}
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
						<h3 class="mb-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Trending Heroes
						</h3>
						<div class="space-y-2">
							{#each trendingHeroes as { hero, count }}
								{@const heroImg = getHeroImage(hero)}
								<div class="flex items-center gap-3 rounded-lg px-2 py-1.5">
									{#if heroImg}
										<img
											src={heroImg}
											alt={hero}
											class="h-8 w-8 rounded-md object-cover"
											loading="lazy"
										/>
									{:else}
										<div
											class="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10"
										>
											<svg
												class="h-4 w-4 text-purple-400"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path stroke-linecap="round" stroke-linejoin="round" d={icons.fire} />
											</svg>
										</div>
									{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-gray-200">{hero}</p>
									</div>
									<span class="text-xs text-gray-500"
										>{count} {count === 1 ? 'appearance' : 'appearances'}</span
									>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Premium CTA (free users only) -->
				{#if !isPremium}
					<div
						class="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 via-gray-900 to-purple-900/10 p-5"
					>
						<div
							class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-emerald-500/15 blur-2xl"
						></div>
						<div class="relative">
							<div class="mb-2 flex items-center gap-2">
								<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
									<path d={icons.boltSolid} />
								</svg>
								<h3 class="font-semibold text-white">Go Premium</h3>
							</div>
							<p class="mb-4 text-sm text-gray-400">
								Unlock premium articles, event discounts, and exclusive tournament coverage.
							</p>
							<a
								href="/premium"
								class="block rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-green-600"
							>
								Upgrade Now
							</a>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
