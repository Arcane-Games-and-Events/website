<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let editMode = $state(false);
	let showAddStanding = $state(false);
	let expandedSeasonId = $state(null);

	// Calculate win rate
	const winRate = $derived(
		data.totalStats.matchesPlayed > 0
			? Math.round((data.totalStats.matchesWon / data.totalStats.matchesPlayed) * 100)
			: 0
	);

	// Get unique seasons played
	const seasonsPlayed = $derived([...new Set(data.standings.map(s => s.season))].sort().reverse());

	// Check if player qualified for championship (top 16 in any circuit for a season)
	const qualifiedSeasons = $derived(
		data.standings
			.filter(s => s.calculatedRank && s.calculatedRank <= 16)
			.map(s => s.season)
			.filter((v, i, a) => a.indexOf(v) === i)
	);

	// Group standings by season
	const standingsBySeason = $derived(
		data.standings.reduce((acc, standing) => {
			if (!acc[standing.season]) {
				acc[standing.season] = [];
			}
			acc[standing.season].push(standing);
			return acc;
		}, {})
	);

	const months = [
		{ key: 'january', label: 'Jan' },
		{ key: 'february', label: 'Feb' },
		{ key: 'march', label: 'Mar' },
		{ key: 'april', label: 'Apr' },
		{ key: 'may', label: 'May' },
		{ key: 'june', label: 'Jun' },
		{ key: 'july', label: 'Jul' },
		{ key: 'august', label: 'Aug' },
		{ key: 'september', label: 'Sep' },
		{ key: 'october', label: 'Oct' },
		{ key: 'november', label: 'Nov' },
		{ key: 'december', label: 'Dec' }
	];
</script>

<svelte:head>
	<title>{data.displayName} - AGE Player Profile</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Banner -->
	<div class="relative overflow-hidden">
		<!-- Animated background -->
		<div class="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-gray-950"></div>
		<div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>

		<!-- Glowing orbs -->
		<div class="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
		<div class="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>

		<div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
			<div class="flex flex-col lg:flex-row items-center gap-8">
				<!-- Avatar/Icon -->
				<div class="relative">
					<div class="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-purple-500/25">
						<span class="text-4xl sm:text-5xl font-bold text-white">
							{data.displayName.charAt(0).toUpperCase()}
						</span>
					</div>
				</div>

				<!-- Player Info -->
				<div class="text-center lg:text-left flex-1">
					<h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
						{data.displayName}
					</h1>

					<!-- Championship Badges -->
					{#if qualifiedSeasons.length > 0}
						<div class="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4">
							{#each qualifiedSeasons as qualifiedSeason}
								<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
									<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									</svg>
									{qualifiedSeason} Players Championship
								</span>
							{/each}
						</div>
					{/if}

					<!-- GEM ID and Aliases -->
					<div class="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
						<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
							</svg>
							GEM ID: {data.gemId}
						</span>
						{#if data.aliases.length > 0}
							<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
								{data.aliases.length} Alias{data.aliases.length > 1 ? 'es' : ''}
							</span>
						{/if}
					</div>

					{#if data.isAdmin}
						<button
							onclick={() => editMode = !editMode}
							class="inline-flex items-center gap-2 px-4 py-2 rounded-lg {editMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-gray-800 text-gray-300 border-gray-700'} border hover:bg-opacity-80 transition-all text-sm font-medium"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								{#if editMode}
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								{:else}
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
								{/if}
							</svg>
							{editMode ? 'Exit Edit Mode' : 'Edit Profile'}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
			<!-- Total Points -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/50 to-gray-900 border border-emerald-500/30 p-5 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
				<div class="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
						Total Points
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">{data.totalStats.totalPoints}</div>
				</div>
			</div>

			<!-- Win Rate -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/50 to-gray-900 border border-blue-500/30 p-5 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
				<div class="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						Win Rate
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">{winRate}%</div>
				</div>
			</div>

			<!-- Match Record -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 to-gray-900 border border-purple-500/30 p-5 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
				<div class="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-purple-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						Match Record
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">
						<span class="text-green-400">{data.totalStats.matchesWon}</span>
						<span class="text-gray-500 text-xl mx-1">-</span>
						<span class="text-red-400">{data.totalStats.matchesPlayed - data.totalStats.matchesWon}</span>
					</div>
				</div>
			</div>

			<!-- Events Played -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/50 to-gray-900 border border-amber-500/30 p-5 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10">
				<div class="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						Events
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">{data.totalStats.eventsPlayed}</div>
				</div>
			</div>

			<!-- Top 8 Finishes -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-900/50 to-gray-900 border border-rose-500/30 p-5 hover:border-rose-500/50 transition-all hover:shadow-lg hover:shadow-rose-500/10 col-span-2 sm:col-span-1">
				<div class="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-rose-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
						</svg>
						Top 8 Finishes
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">{data.totalStats.top8Finishes}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Season Standings -->
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-2xl font-bold text-white flex items-center gap-3">
				<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				Season Standings
			</h2>
			{#if editMode}
				<button
					onclick={() => showAddStanding = true}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all text-sm font-medium"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Add Standing
				</button>
			{/if}
		</div>

		{#if Object.keys(standingsBySeason).length === 0}
			<div class="text-center py-16 rounded-2xl border border-gray-800 bg-gray-900/50">
				<svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				<p class="text-gray-500 text-lg">No standings data yet</p>
				{#if editMode}
					<button
						onclick={() => showAddStanding = true}
						class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all text-sm font-medium"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Add First Standing
					</button>
				{/if}
			</div>
		{:else}
			<div class="space-y-6">
				{#each Object.entries(standingsBySeason).sort((a, b) => b[0].localeCompare(a[0])) as [season, seasonStandings]}
					<div class="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
						<!-- Season Header -->
						<div class="px-6 py-4 bg-gradient-to-r from-gray-800/80 to-gray-900 border-b border-gray-800">
							<h3 class="text-xl font-bold text-white flex items-center gap-3">
								<span class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
								</span>
								{season} Season
							</h3>
						</div>

						<!-- Circuit Cards -->
						<div class="p-6 space-y-4">
							{#each seasonStandings as standing}
								<div class="rounded-xl border border-gray-700/50 bg-gray-800/30 overflow-hidden">
									<!-- Circuit Header -->
									<button
										onclick={() => expandedSeasonId = expandedSeasonId === standing.id ? null : standing.id}
										class="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-all"
									>
										<div class="flex items-center gap-4">
											<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold {standing.circuit === 'Los Angeles' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : standing.circuit === 'New England' ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30' : 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'}">
												{standing.circuit}
											</span>
											{#if standing.calculatedRank && standing.calculatedRank <= 16}
												<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 ring-1 ring-yellow-500/30">
													<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
														<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
													</svg>
													#{standing.calculatedRank}
												</span>
											{:else if standing.calculatedRank}
												<span class="text-xs text-gray-500">Rank #{standing.calculatedRank}</span>
											{/if}
											<div class="flex items-center gap-6 text-sm">
												<div class="flex items-center gap-2">
													<span class="text-gray-500">Points:</span>
													<span class="font-bold text-emerald-400">{standing.totalPoints || 0}</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="text-gray-500">Record:</span>
													<span class="font-medium">
														<span class="text-green-400">{standing.matchesWon || 0}</span>
														<span class="text-gray-600">-</span>
														<span class="text-red-400">{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span>
													</span>
												</div>
												<div class="hidden sm:flex items-center gap-2">
													<span class="text-gray-500">Events:</span>
													<span class="font-medium text-gray-300">{standing.eventsPlayed || 0}</span>
												</div>
											</div>
										</div>
										<svg class="w-5 h-5 text-gray-400 transition-transform {expandedSeasonId === standing.id ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</button>

									<!-- Expanded Details -->
									{#if expandedSeasonId === standing.id}
										<div class="px-5 py-5 border-t border-gray-700/50 bg-gray-900/50">
											<!-- Main Stats Grid -->
											{#if editMode}
												<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<label class="text-xs text-gray-500">Total Points</label>
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="totalPoints" />
														<input
															type="number"
															name="value"
															value={standing.totalPoints || 0}
															onchange={(e) => e.target.form.requestSubmit()}
															class="w-full bg-gray-800 text-emerald-400 font-bold text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
														/>
													</form>
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<label class="text-xs text-gray-500">Win %</label>
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="winPercentage" />
														<input
															type="number"
															step="0.01"
															name="value"
															value={standing.winPercentage || ''}
															placeholder="-"
															onchange={(e) => e.target.form.requestSubmit()}
															class="w-full bg-gray-800 text-gray-300 text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
														/>
													</form>
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<label class="text-xs text-gray-500">Events Played</label>
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="eventsPlayed" />
														<input
															type="number"
															name="value"
															value={standing.eventsPlayed || 0}
															onchange={(e) => e.target.form.requestSubmit()}
															class="w-full bg-gray-800 text-gray-300 text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
														/>
													</form>
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<label class="text-xs text-gray-500">Matches Won</label>
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="matchesWon" />
														<input
															type="number"
															name="value"
															value={standing.matchesWon || 0}
															onchange={(e) => e.target.form.requestSubmit()}
															class="w-full bg-gray-800 text-green-400 text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
														/>
													</form>
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<label class="text-xs text-gray-500">Matches Played</label>
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="matchesPlayed" />
														<input
															type="number"
															name="value"
															value={standing.matchesPlayed || 0}
															onchange={(e) => e.target.form.requestSubmit()}
															class="w-full bg-gray-800 text-gray-300 text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
														/>
													</form>
												</div>
											{/if}

											<!-- Monthly Breakdown -->
											<div class="mb-4">
												<h4 class="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
													</svg>
													Monthly Breakdown
												</h4>
												<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
													{#each months as month}
														{@const points = standing[`${month.key}Points`] || 0}
														{@const wins = standing[`${month.key}MatchesWon`] || 0}
														{@const matches = standing[`${month.key}Matches`] || 0}
														{@const hasData = points > 0 || wins > 0 || matches > 0}
														<div class="rounded-lg border {hasData ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800/50 bg-gray-900/30'} p-2 text-center">
															<div class="text-xs font-medium {hasData ? 'text-blue-400' : 'text-gray-600'} mb-1">{month.label}</div>
															{#if editMode}
																<!-- Points input -->
																<form method="POST" action="?/updateStanding" use:enhance={() => {
																	return async ({ result, update }) => {
																		if (result.type === 'success') {
																			await update();
																			await invalidateAll();
																		}
																	};
																}}>
																	<input type="hidden" name="standingId" value={standing.id} />
																	<input type="hidden" name="field" value="{month.key}Points" />
																	<input
																		type="text"
																		inputmode="numeric"
																		pattern="[0-9]*"
																		name="value"
																		value={points}
																		onchange={(e) => e.target.form.requestSubmit()}
																		class="w-full bg-gray-900 text-emerald-400 text-sm font-bold text-center rounded px-2 py-1.5 border border-gray-700 focus:border-emerald-500 focus:outline-none mb-1"
																		title="Points"
																	/>
																</form>
																<!-- Matches Won / Matches Played inputs -->
																<div class="flex gap-1 items-center justify-center">
																	<form method="POST" action="?/updateStanding" use:enhance={() => {
																		return async ({ result, update }) => {
																			if (result.type === 'success') {
																				await update();
																				await invalidateAll();
																			}
																		};
																	}} class="flex-1">
																		<input type="hidden" name="standingId" value={standing.id} />
																		<input type="hidden" name="field" value="{month.key}MatchesWon" />
																		<input
																			type="text"
																			inputmode="numeric"
																			pattern="[0-9]*"
																			name="value"
																			value={wins}
																			onchange={(e) => e.target.form.requestSubmit()}
																			class="w-full bg-gray-900 text-green-400 text-sm text-center rounded px-1 py-1 border border-gray-700 focus:border-green-500 focus:outline-none"
																			title="Matches Won"
																		/>
																	</form>
																	<span class="text-gray-500 text-sm font-medium">/</span>
																	<form method="POST" action="?/updateStanding" use:enhance={() => {
																		return async ({ result, update }) => {
																			if (result.type === 'success') {
																				await update();
																				await invalidateAll();
																			}
																		};
																	}} class="flex-1">
																		<input type="hidden" name="standingId" value={standing.id} />
																		<input type="hidden" name="field" value="{month.key}Matches" />
																		<input
																			type="text"
																			inputmode="numeric"
																			pattern="[0-9]*"
																			name="value"
																			value={matches}
																			onchange={(e) => e.target.form.requestSubmit()}
																			class="w-full bg-gray-900 text-gray-300 text-sm text-center rounded px-1 py-1 border border-gray-700 focus:border-blue-500 focus:outline-none"
																			title="Matches Played"
																		/>
																	</form>
																</div>
															{:else}
																<div class="text-sm font-bold {hasData ? 'text-emerald-400' : 'text-gray-700'}">{points}</div>
																<div class="text-xs {hasData ? 'text-gray-400' : 'text-gray-700'} mt-0.5">
																	{wins}/{matches}
																</div>
															{/if}
														</div>
													{/each}
												</div>
											</div>

											<!-- Delete Button -->
											{#if editMode}
												<div class="pt-4 border-t border-gray-700/50">
													<form method="POST" action="?/deleteStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}}>
														<input type="hidden" name="standingId" value={standing.id} />
														<button
															type="submit"
															onclick={(e) => { if (!confirm('Delete this standing record?')) e.preventDefault(); }}
															class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all text-sm font-medium"
														>
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
															</svg>
															Delete Standing
														</button>
													</form>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Add Standing Modal -->
	{#if showAddStanding}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
			<div class="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
				<div class="px-6 py-4 border-b border-gray-700">
					<h3 class="text-lg font-semibold text-white">Add New Standing</h3>
				</div>
				<form method="POST" action="?/addStanding" use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showAddStanding = false;
							await update();
							await invalidateAll();
						}
					};
				}} class="p-6 space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-400 mb-2">Season</label>
						<input
							type="text"
							name="season"
							placeholder="e.g., 2025"
							required
							class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-400 mb-2">Circuit</label>
						<select
							name="circuit"
							required
							class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
						>
							<option value="">Select a circuit</option>
							<option value="Los Angeles">Los Angeles</option>
							<option value="New England">New England</option>
							<option value="St. Louis">St. Louis</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-400 mb-2">Player Name</label>
						<input
							type="text"
							name="playerName"
							value={data.displayName}
							required
							class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
						/>
					</div>
					<div class="flex gap-3 pt-4">
						<button
							type="button"
							onclick={() => showAddStanding = false}
							class="flex-1 px-4 py-3 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 transition-all font-medium"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-all font-medium"
						>
							Add Standing
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
