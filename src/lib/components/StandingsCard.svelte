<script>
	/**
	 * StandingsCard - Reusable standings preview component
	 * Used on home page and age-open overview tab
	 */
	let {
		standings = [],
		seasons = [],
		circuits = [],
		selectedSeason = 'all',
		selectedCircuit = 'all',
		maxPlayers = 8,
		viewAllHref = '/age-open?tab=standings',
		onViewAll = null,
		onSeasonChange = () => {},
		onCircuitChange = () => {},
		showFilters = true
	} = $props();

	// Get display label for season
	function getSeasonLabel(season) {
		return season === 'all' ? 'All Time' : season;
	}

	// Get display label for circuit
	function getCircuitLabel(circuit) {
		return circuit === 'all' || circuit === '' ? 'All Circuits' : circuit;
	}

	// Get initials from player name
	function getInitials(name) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2);
	}

	// Get rank badge styling
	function getRankStyle(rank) {
		switch (rank) {
			case 1:
				return 'bg-yellow-500/20 text-yellow-500';
			case 2:
				return 'bg-gray-400/20 text-gray-400';
			case 3:
				return 'bg-orange-900/20 text-orange-600';
			default:
				return 'bg-gray-700/20 text-gray-400';
		}
	}

	// Players to display (limited by maxPlayers)
	let displayPlayers = $derived(standings.slice(0, maxPlayers));
</script>

<div
	class="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-900 p-5"
>
	<!-- Header -->
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<svg
				class="h-5 w-5 text-amber-400"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
				/>
			</svg>
			<h3 class="font-semibold text-white">Standings</h3>
		</div>
		{#if onViewAll}
			<button onclick={onViewAll} class="text-xs text-amber-400 hover:text-amber-300">
				View all
			</button>
		{:else}
			<a href={viewAllHref} class="text-xs text-amber-400 hover:text-amber-300">View all</a>
		{/if}
	</div>

	<!-- Filters -->
	{#if showFilters && seasons.length > 0}
		<div class="mb-3 flex gap-2">
			<select
				aria-label="Filter standings by season"
				class="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 focus:outline-none"
				value={selectedSeason}
				onchange={(e) => onSeasonChange(e.target.value)}
			>
				{#each seasons as season}
					<option value={season}>
						{getSeasonLabel(season)}
					</option>
				{/each}
			</select>
			<select
				aria-label="Filter standings by circuit"
				class="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 focus:outline-none"
				value={selectedCircuit}
				onchange={(e) => onCircuitChange(e.target.value)}
			>
				<option value="all">All Circuits</option>
				{#each circuits as circuit}
					<option value={circuit}>{circuit}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Standings List -->
	{#if displayPlayers.length > 0}
		<div class="space-y-1.5">
			{#each displayPlayers as player, i}
				{@const rank = player.rank || i + 1}
				<a
					href={player.gemId ? `/player/${player.gemId}` : viewAllHref}
					onclick={(e) => {
						if (!player.gemId && onViewAll) {
							e.preventDefault();
							onViewAll();
						}
					}}
					class="group flex items-center gap-2 rounded-lg bg-white/5 p-1.5 transition-colors hover:bg-white/10"
				>
					<!-- Rank Badge -->
					<div
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full {getRankStyle(rank)} text-[10px] font-bold"
					>
						{rank}
					</div>
					<!-- Avatar + Name -->
					<div class="flex min-w-0 flex-1 items-center gap-1.5">
						<div
							class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[8px] font-semibold text-blue-400"
						>
							{getInitials(player.playerName)}
						</div>
						<span
							class="truncate text-xs text-white transition-colors group-hover:text-blue-400"
						>
							{player.playerName}
						</span>
					</div>
					<!-- Points -->
					<div class="shrink-0 text-right">
						<span class="text-xs font-bold text-emerald-400">{player.totalPoints || 0}</span>
						<span class="ml-0.5 text-[9px] text-gray-500">pts</span>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<!-- Empty State -->
		<div class="flex flex-col items-center gap-2 py-6">
			<svg class="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
			<p class="text-sm text-gray-400">No standings data yet</p>
			<p class="text-xs text-gray-500">Check back after events complete</p>
		</div>
	{/if}
</div>
