<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { getCircuit, getCircuitNames } from '$lib/data/circuits.js';

	let { data, form } = $props();

	/**
	 * Calculate derived stats from monthly data
	 * - eventsPlayed: count of months with points > 0
	 * - top8Finishes: count of months with points >= 15 (5th-8th or better)
	 */
	function calculateDerivedStats(standing) {
		const monthlyPoints = [
			standing.januaryPoints || 0,
			standing.februaryPoints || 0,
			standing.marchPoints || 0,
			standing.aprilPoints || 0,
			standing.mayPoints || 0,
			standing.junePoints || 0,
			standing.julyPoints || 0,
			standing.augustPoints || 0,
			standing.septemberPoints || 0,
			standing.octoberPoints || 0,
			standing.novemberPoints || 0,
			standing.decemberPoints || 0
		];

		const eventsPlayed = monthlyPoints.filter((p) => p > 0).length;
		const top8Finishes = monthlyPoints.filter((p) => p >= 15).length;

		return { eventsPlayed, top8Finishes };
	}

	/**
	 * Compare two standings using tiebreaker rules:
	 * 1. Total Points (primary)
	 * 2. Number of Top 8's made
	 * 3. Total match wins
	 * 4. Number of events attended
	 */
	function compareStandings(a, b) {
		const pointsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
		if (pointsDiff !== 0) return pointsDiff;

		const aDerived = calculateDerivedStats(a);
		const bDerived = calculateDerivedStats(b);

		const top8Diff = bDerived.top8Finishes - aDerived.top8Finishes;
		if (top8Diff !== 0) return top8Diff;
		const winsDiff = (b.matchesWon || 0) - (a.matchesWon || 0);
		if (winsDiff !== 0) return winsDiff;
		return bDerived.eventsPlayed - aDerived.eventsPlayed;
	}

	// Standings table state
	let standingsSearchQuery = $state('');
	let standingsSeasonFilter = $state('all');
	let standingsCircuitFilter = $state('all');

	// Create Standing Modal state
	let showCreateStandingModal = $state(false);
	let newStanding = $state({
		season: '2026',
		circuit: 'Los Angeles',
		playerName: '',
		gemId: '',
		totalPoints: 0,
		matchesPlayed: 0,
		matchesWon: 0
	});

	function resetNewStanding() {
		newStanding = {
			season: '2026',
			circuit: 'Los Angeles',
			playerName: '',
			gemId: '',
			totalPoints: 0,
			matchesPlayed: 0,
			matchesWon: 0
		};
	}

	// Delete confirmation modal state for standings
	let showDeleteModal = $state(false);
	let deleteStandingData = $state(null);
	let deleteConfirmationInput = $state('');
	let isDeleting = $state(false);

	function openDeleteModal(standing) {
		deleteStandingData = standing;
		deleteConfirmationInput = '';
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		deleteStandingData = null;
		deleteConfirmationInput = '';
		isDeleting = false;
	}

	// Check if delete confirmation matches player name (case-insensitive)
	let canDelete = $derived(
		deleteStandingData &&
			deleteConfirmationInput.toLowerCase().trim() ===
				deleteStandingData.playerName?.toLowerCase().trim()
	);

	// Sorting state for standings
	let sortColumn = $state('points'); // 'points', 'winPct', 'record', 'events', 'top8'
	let sortDirection = $state('desc'); // 'asc' or 'desc'

	function toggleSort(column) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortColumn = column;
			sortDirection = 'desc'; // Default to descending for new column
		}
		adminStandingsPage = 1; // Reset to first page when sorting
	}

	// Pagination for standings
	let adminStandingsPage = $state(1);
	const adminStandingsPerPage = 25;

	// Get unique seasons and circuits
	let uniqueSeasons = $derived(
		[...new Set((data.standings || []).map((s) => s.season))].sort().reverse()
	);
	let uniqueCircuits = $derived([...new Set((data.standings || []).map((s) => s.circuit))].sort());

	// Filter standings
	let filteredStandings = $derived.by(() => {
		// Custom sort function based on selected column
		function sortStandingsLocal(a, b) {
			let aVal, bVal;

			switch (sortColumn) {
				case 'points':
					aVal = a.totalPoints || 0;
					bVal = b.totalPoints || 0;
					break;
				case 'winPct':
					aVal = a.winPercentage || 0;
					bVal = b.winPercentage || 0;
					break;
				case 'record':
					// Sort by wins primarily
					aVal = a.matchesWon || 0;
					bVal = b.matchesWon || 0;
					break;
				case 'events':
					aVal = calculateDerivedStats(a).eventsPlayed;
					bVal = calculateDerivedStats(b).eventsPlayed;
					break;
				case 'top8':
					aVal = calculateDerivedStats(a).top8Finishes;
					bVal = calculateDerivedStats(b).top8Finishes;
					break;
				default:
					return compareStandings(a, b);
			}

			const diff = sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
			// Use tiebreaker rules if values are equal
			if (diff === 0) return compareStandings(a, b);
			return diff;
		}

		return (data.standings || [])
			.filter((s) => {
				// Search filter
				if (standingsSearchQuery) {
					const search = standingsSearchQuery.toLowerCase();
					const matchesName = s.playerName?.toLowerCase().includes(search);
					const matchesGemId = s.gemId?.toLowerCase().includes(search);
					if (!matchesName && !matchesGemId) return false;
				}
				// Season filter
				if (standingsSeasonFilter !== 'all' && s.season !== standingsSeasonFilter) return false;
				// Circuit filter
				if (standingsCircuitFilter !== 'all' && s.circuit !== standingsCircuitFilter) return false;
				return true;
			})
			.sort(sortStandingsLocal);
	});

	// Paginated standings for admin
	let totalAdminStandingsPages = $derived(
		Math.ceil(filteredStandings.length / adminStandingsPerPage)
	);
	let paginatedAdminStandings = $derived(
		filteredStandings.slice(
			(adminStandingsPage - 1) * adminStandingsPerPage,
			adminStandingsPage * adminStandingsPerPage
		)
	);

	// Reset page when filters change
	$effect(() => {
		standingsSearchQuery;
		standingsSeasonFilter;
		standingsCircuitFilter;
		adminStandingsPage = 1;
	});

	// Success/error banner state
	let successMessage = $state('');
	let errorMessage = $state('');

	$effect(() => {
		if (form?.success && form?.message) {
			successMessage = form.message;
			errorMessage = '';
			setTimeout(() => { successMessage = ''; }, 5000);
		} else if (form?.error) {
			errorMessage = form.error;
			successMessage = '';
			setTimeout(() => { errorMessage = ''; }, 5000);
		}
	});
</script>

<svelte:head>
	<title>Standings - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<main>
			<!-- Success Banner -->
			{#if successMessage}
				<div class="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
					<div class="flex items-center gap-2">
						<svg class="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-sm font-medium text-emerald-400">{successMessage}</p>
					</div>
				</div>
			{/if}

			<!-- Error Banner -->
			{#if errorMessage}
				<div class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
					<div class="flex items-center gap-2">
						<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-sm font-medium text-red-400">{errorMessage}</p>
					</div>
				</div>
			{/if}

			<div class="space-y-6">
				<!-- Standings Table with Inline Editing -->
				<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
					<div
						class="flex flex-col gap-3 border-b border-gray-800 bg-gray-800/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
					>
						<div class="flex items-center gap-3">
							<div
								class="hidden h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20 sm:flex"
							>
								<svg
									class="h-5 w-5 text-yellow-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>
							<div>
								<h2 class="text-base font-semibold text-white sm:text-lg">Standings Table</h2>
								<p class="hidden text-sm text-gray-400 sm:block">
									{data.standings?.length || 0} standings records - Click any cell to edit
								</p>
								<p class="text-xs text-gray-400 sm:hidden">
									{data.standings?.length || 0} records
								</p>
							</div>
						</div>
						<button
							onclick={() => (showCreateStandingModal = true)}
							class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/40"
						>
							<svg
								class="h-4 w-4 sm:h-5 sm:w-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								/>
							</svg>
							Add Standing
						</button>
					</div>

					<div class="p-4 sm:p-6">
						<!-- Filters -->
						<div
							class="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 md:grid-cols-4"
						>
							<div class="relative sm:col-span-2 md:col-span-1">
								<svg
									class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
								<input
									type="text"
									bind:value={standingsSearchQuery}
									placeholder="Search by name or GEM ID..."
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 py-2.5 pr-4 pl-10 text-base text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none sm:text-sm"
								/>
							</div>
							<select
								bind:value={standingsSeasonFilter}
								class="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-base text-gray-100 focus:border-blue-500 focus:outline-none sm:px-4 sm:text-sm"
							>
								<option value="all">All Seasons</option>
								{#each uniqueSeasons as season}
									<option value={season}>{season}</option>
								{/each}
							</select>
							<select
								bind:value={standingsCircuitFilter}
								class="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-base text-gray-100 focus:border-blue-500 focus:outline-none sm:px-4 sm:text-sm"
							>
								<option value="all">All Circuits</option>
								{#each uniqueCircuits as circuit}
									<option value={circuit}>{circuit}</option>
								{/each}
							</select>
							<div class="flex items-center text-xs text-gray-400 sm:text-sm">
								Showing {filteredStandings.length} of {data.standings?.length || 0}
							</div>
						</div>

						<!-- Standings - Mobile Card View -->
						<div class="space-y-3 lg:hidden">
							{#each paginatedAdminStandings as standing}
								<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-3">
									<div class="flex items-start justify-between gap-3">
										<div class="flex min-w-0 items-center gap-3">
											<div
												class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white"
											>
												{standing.playerName?.charAt(0).toUpperCase() || '?'}
											</div>
											<div class="min-w-0">
												<p class="truncate text-sm font-medium text-white">
													{standing.playerName}
												</p>
												{#if standing.gemId}
													<p class="font-mono text-xs text-blue-400">{standing.gemId}</p>
												{:else}
													<p class="text-xs text-gray-600">No GEM ID</p>
												{/if}
											</div>
										</div>
										<span class="shrink-0 text-lg font-bold text-emerald-400"
											>{standing.totalPoints || 0}</span
										>
									</div>
									<div
										class="mt-3 grid grid-cols-3 gap-2 border-t border-gray-700 pt-3 text-center text-xs"
									>
										<div>
											<p class="text-gray-500">Win %</p>
											<p class="font-medium text-gray-300">
												{standing.winPercentage ? `${standing.winPercentage}%` : '-'}
											</p>
										</div>
										<div>
											<p class="text-gray-500">Record</p>
											<p class="font-medium">
												<span class="text-green-400">{standing.matchesWon || 0}</span>
												<span class="text-gray-600">-</span>
												<span class="text-red-400"
													>{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span
												>
											</p>
										</div>
										<div>
											<p class="text-gray-500">Top 8</p>
											<p class="font-medium text-gray-300">
												{calculateDerivedStats(standing).top8Finishes}
											</p>
										</div>
									</div>
									<div class="mt-2 flex flex-wrap items-center gap-2">
										<span class="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400"
											>{standing.season}</span
										>
										<span
											class="rounded px-1.5 py-0.5 text-xs font-medium {standing.circuit ===
											'Los Angeles'
												? 'bg-blue-500/20 text-blue-400'
												: standing.circuit === 'New England'
													? 'bg-purple-500/20 text-purple-400'
													: 'bg-green-500/20 text-green-400'}"
										>
											{standing.circuit}
										</span>
									</div>
									<div class="mt-2 flex items-center gap-2 border-t border-gray-700 pt-2">
										{#if standing.gemId}
											<a
												href="/player/{standing.gemId}"
												class="flex-1 rounded bg-amber-500/20 px-2 py-1.5 text-center text-xs font-medium text-amber-400"
											>
												Edit
											</a>
										{:else}
											<span
												class="flex-1 rounded bg-gray-700/50 px-2 py-1.5 text-center text-xs text-gray-500"
											>
												No GEM ID
											</span>
										{/if}
										<button
											type="button"
											onclick={() => openDeleteModal(standing)}
											class="flex-1 rounded bg-red-500/20 px-2 py-1.5 text-xs font-medium text-red-400"
										>
											Delete
										</button>
									</div>
								</div>
							{:else}
								<div class="rounded-lg border border-gray-700 p-8 text-center">
									<p class="text-gray-400">No standings found</p>
								</div>
							{/each}
						</div>

						<!-- Standings Table - Desktop View -->
						<div class="hidden overflow-x-auto rounded-xl border border-gray-700 lg:block">
							<table class="w-full text-sm">
								<thead class="bg-gray-800/80">
									<tr>
										<th
											class="px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Season</th
										>
										<th
											class="px-4 py-4 text-left text-xs font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase"
											>Circuit</th
										>
										<th
											class="px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Player</th
										>
										<th class="px-4 py-4 text-center">
											<button
												onclick={() => toggleSort('points')}
												class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
												'points'
													? 'text-blue-400'
													: 'text-gray-400 hover:text-gray-200'}"
											>
												Points
												{#if sortColumn === 'points'}
													<svg
														class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else}
													<svg
														class="h-3 w-3 opacity-0 group-hover:opacity-50"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
											</button>
										</th>
										<th class="px-4 py-4 text-center">
											<button
												onclick={() => toggleSort('winPct')}
												class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
												'winPct'
													? 'text-blue-400'
													: 'text-gray-400 hover:text-gray-200'}"
											>
												Win %
												{#if sortColumn === 'winPct'}
													<svg
														class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
											</button>
										</th>
										<th class="px-4 py-4 text-center">
											<button
												onclick={() => toggleSort('record')}
												class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
												'record'
													? 'text-blue-400'
													: 'text-gray-400 hover:text-gray-200'}"
											>
												Record
												{#if sortColumn === 'record'}
													<svg
														class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
											</button>
										</th>
										<th class="px-4 py-4 text-center">
											<button
												onclick={() => toggleSort('events')}
												class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
												'events'
													? 'text-blue-400'
													: 'text-gray-400 hover:text-gray-200'}"
											>
												Events
												{#if sortColumn === 'events'}
													<svg
														class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
											</button>
										</th>
										<th class="px-4 py-4 text-center">
											<button
												onclick={() => toggleSort('top8')}
												class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
												'top8'
													? 'text-blue-400'
													: 'text-gray-400 hover:text-gray-200'}"
											>
												Top 8
												{#if sortColumn === 'top8'}
													<svg
														class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fill-rule="evenodd"
															d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
											</button>
										</th>
										<th
											class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Actions</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-800/50">
									{#each paginatedAdminStandings as standing}
										<tr class="transition-colors hover:bg-gray-800/30">
											<td class="px-4 py-4 text-sm font-medium text-gray-400"
												>{standing.season}</td
											>
											<td class="px-4 py-4">
												<span
													class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap {standing.circuit ===
													'Los Angeles'
														? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
														: standing.circuit === 'New England'
															? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
															: 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'}"
												>
													{standing.circuit}
												</span>
											</td>
											<td class="px-4 py-4">
												<div class="flex items-center gap-3">
													<div
														class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white"
													>
														{standing.playerName?.charAt(0).toUpperCase() || '?'}
													</div>
													<div>
														<div class="font-medium text-white">{standing.playerName}</div>
														{#if standing.gemId}
															<div class="font-mono text-xs text-blue-400">
																{standing.gemId}
															</div>
														{:else}
															<div class="text-xs text-gray-600">No GEM ID</div>
														{/if}
													</div>
												</div>
											</td>
											<td class="px-4 py-4 text-center">
												<span class="text-lg font-bold text-emerald-400"
													>{standing.totalPoints || 0}</span
												>
											</td>
											<td class="px-4 py-4 text-center">
												<span class="text-gray-300"
													>{standing.winPercentage ? `${standing.winPercentage}%` : '-'}</span
												>
											</td>
											<td class="px-4 py-4 text-center">
												<span class="font-medium">
													<span class="text-green-400">{standing.matchesWon || 0}</span>
													<span class="mx-0.5 text-gray-600">-</span>
													<span class="text-red-400"
														>{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span
													>
												</span>
											</td>
											<td class="px-4 py-4 text-center text-gray-300"
												>{calculateDerivedStats(standing).eventsPlayed}</td
											>
											<td class="px-4 py-4 text-center text-gray-300"
												>{calculateDerivedStats(standing).top8Finishes}</td
											>
											<td class="px-4 py-4 text-center">
												<div class="flex items-center justify-center gap-2">
													<!-- Edit on Player Profile Link -->
													{#if standing.gemId}
														<a
															href="/player/{standing.gemId}"
															class="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-400 transition-all hover:border-amber-500/40 hover:bg-amber-500/20 hover:text-amber-300"
															title="Edit on player profile page"
														>
															<svg
																class="h-4 w-4"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																/>
															</svg>
															<span class="text-xs font-medium">Edit</span>
														</a>
													{:else}
														<span class="text-xs text-gray-500">No GEM ID</span>
													{/if}
													<!-- Delete Button - Opens Modal -->
													<button
														type="button"
														onclick={() => openDeleteModal(standing)}
														class="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-red-500/10 hover:text-red-400"
														title="Delete standing"
														aria-label="Delete standing"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
													</button>
												</div>
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="9" class="px-6 py-12 text-center text-gray-500">
												No standings found. Import data from CSV to get started.
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						<!-- Pagination Controls -->
						{#if totalAdminStandingsPages > 1}
							<div
								class="mt-4 flex flex-col items-center justify-between gap-4 rounded-b-xl border-t border-gray-700 bg-gray-800/30 px-4 py-3 sm:flex-row"
							>
								<div class="text-sm text-gray-400">
									Showing {(adminStandingsPage - 1) * adminStandingsPerPage + 1} to {Math.min(
										adminStandingsPage * adminStandingsPerPage,
										filteredStandings.length
									)} of {filteredStandings.length} standings
								</div>
								<div class="flex items-center gap-2">
									<button
										onclick={() => (adminStandingsPage = 1)}
										disabled={adminStandingsPage === 1}
										class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium transition-all {adminStandingsPage ===
										1
											? 'cursor-not-allowed bg-gray-800/30 text-gray-600'
											: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
									>
										First
									</button>
									<button
										onclick={() => (adminStandingsPage = Math.max(1, adminStandingsPage - 1))}
										disabled={adminStandingsPage === 1}
										class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium transition-all {adminStandingsPage ===
										1
											? 'cursor-not-allowed bg-gray-800/30 text-gray-600'
											: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
										aria-label="Previous page"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 19l-7-7 7-7"
											/>
										</svg>
									</button>
									<div class="flex items-center gap-1">
										{#each Array(Math.min(5, totalAdminStandingsPages)) as _, i}
											{@const pageNum =
												adminStandingsPage <= 3
													? i + 1
													: adminStandingsPage >= totalAdminStandingsPages - 2
														? totalAdminStandingsPages - 4 + i
														: adminStandingsPage - 2 + i}
											{#if pageNum > 0 && pageNum <= totalAdminStandingsPages}
												<button
													onclick={() => (adminStandingsPage = pageNum)}
													class="h-8 w-8 rounded-lg text-sm font-medium transition-all {adminStandingsPage ===
													pageNum
														? 'bg-blue-500 text-white'
														: 'border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
												>
													{pageNum}
												</button>
											{/if}
										{/each}
									</div>
									<button
										onclick={() =>
											(adminStandingsPage = Math.min(
												totalAdminStandingsPages,
												adminStandingsPage + 1
											))}
										disabled={adminStandingsPage === totalAdminStandingsPages}
										class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium transition-all {adminStandingsPage ===
										totalAdminStandingsPages
											? 'cursor-not-allowed bg-gray-800/30 text-gray-600'
											: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
										aria-label="Next page"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</button>
									<button
										onclick={() => (adminStandingsPage = totalAdminStandingsPages)}
										disabled={adminStandingsPage === totalAdminStandingsPages}
										class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium transition-all {adminStandingsPage ===
										totalAdminStandingsPages
											? 'cursor-not-allowed bg-gray-800/30 text-gray-600'
											: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
									>
										Last
									</button>
								</div>
							</div>
						{/if}

						<!-- Player Profiles Info -->
						<div class="mt-6 rounded-lg border border-gray-700 bg-gray-800/30 p-4">
							<h3 class="mb-3 text-sm font-medium text-gray-300">Player Profiles</h3>
							<p class="text-xs text-gray-500">
								Click the "Edit" button to open a player's profile page where you can view and
								edit all their standings data, including monthly breakdowns.
							</p>
						</div>
					</div>
				</div>
			</div>
		</main>
	</div>
</div>

<!-- Create Standing Modal -->
{#if showCreateStandingModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => {
				showCreateStandingModal = false;
				resetNewStanding();
			}}
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div class="relative w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-700 px-6 py-4">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
						<svg
							class="h-5 w-5 text-emerald-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-lg font-semibold text-white">Create New Standing</h2>
						<p class="text-sm text-gray-400">Add a new player to the standings</p>
					</div>
				</div>
				<button
					onclick={() => {
						showCreateStandingModal = false;
						resetNewStanding();
					}}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
					aria-label="Close modal"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Form -->
			<form
				method="POST"
				action="?/createStanding"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showCreateStandingModal = false;
							resetNewStanding();
							await update();
						}
					};
				}}
				class="space-y-5 p-6"
			>
				<!-- Season and Circuit -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="season" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Season *</label
						>
						<select
							id="season"
							name="season"
							bind:value={newStanding.season}
							required
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						>
							<option value="2026">2026</option>
							<option value="2025">2025</option>
							<option value="2024">2024</option>
							<option value="2023">2023</option>
						</select>
					</div>
					<div>
						<label for="circuit" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Circuit *</label
						>
						<select
							id="circuit"
							name="circuit"
							bind:value={newStanding.circuit}
							required
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						>
							<option value="Los Angeles">Los Angeles</option>
							<option value="New England">New England</option>
							<option value="St. Louis">St. Louis</option>
						</select>
					</div>
				</div>

				<!-- Player Name -->
				<div>
					<label for="playerName" class="mb-1.5 block text-sm font-medium text-gray-300"
						>Player Name *</label
					>
					<input
						type="text"
						id="playerName"
						name="playerName"
						bind:value={newStanding.playerName}
						required
						placeholder="Enter player name"
						class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
					/>
				</div>

				<!-- GEM ID -->
				<div>
					<label for="gemId" class="mb-1.5 block text-sm font-medium text-gray-300">GEM ID</label>
					<input
						type="text"
						id="gemId"
						name="gemId"
						bind:value={newStanding.gemId}
						placeholder="Optional - for linking to player profile"
						class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
					/>
				</div>

				<!-- Points and Events -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="totalPoints" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Total Points</label
						>
						<input
							type="number"
							id="totalPoints"
							name="totalPoints"
							bind:value={newStanding.totalPoints}
							min="0"
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						/>
					</div>
				</div>

				<!-- Match Stats -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="matchesWon" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Matches Won</label
						>
						<input
							type="number"
							id="matchesWon"
							name="matchesWon"
							bind:value={newStanding.matchesWon}
							min="0"
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="matchesPlayed" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Matches Played</label
						>
						<input
							type="number"
							id="matchesPlayed"
							name="matchesPlayed"
							bind:value={newStanding.matchesPlayed}
							min="0"
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						/>
					</div>
				</div>

				<!-- Win Percentage Preview -->
				{#if newStanding.matchesPlayed > 0}
					<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
						<p class="text-sm text-gray-400">
							Win Percentage: <span class="font-semibold text-emerald-400"
								>{((newStanding.matchesWon / newStanding.matchesPlayed) * 100).toFixed(1)}%</span
							>
						</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => {
							showCreateStandingModal = false;
							resetNewStanding();
						}}
						class="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
					>
						Create Standing
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Standing Confirmation Modal -->
{#if showDeleteModal && deleteStandingData}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
			<div class="mb-6">
				<div
					class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20"
				>
					<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h3 class="text-center text-lg font-semibold text-white">Delete Standing Record</h3>
				<p class="mt-2 text-center text-sm text-gray-400">
					This action cannot be undone. This will permanently delete the standing record for:
				</p>
				<div class="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-center">
					<p class="text-lg font-semibold text-white">{deleteStandingData.playerName}</p>
					{#if deleteStandingData.gemId}
						<p class="mt-1 font-mono text-sm text-blue-400">{deleteStandingData.gemId}</p>
					{/if}
					<p class="mt-2 text-xs text-gray-500">
						{deleteStandingData.season} • {deleteStandingData.circuit}
					</p>
				</div>
			</div>

			<div class="mb-6">
				<label for="delete-confirmation" class="block text-sm font-medium text-gray-300">
					Type <span class="font-semibold text-red-400">"{deleteStandingData.playerName}"</span> to confirm:
				</label>
				<input
					type="text"
					id="delete-confirmation"
					bind:value={deleteConfirmationInput}
					placeholder="Enter player name to confirm"
					class="mt-2 w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-base text-gray-100 placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none sm:text-sm"
					autocomplete="off"
				/>
			</div>

			<div class="flex items-center justify-end gap-3">
				<button
					type="button"
					onclick={closeDeleteModal}
					class="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
				>
					Cancel
				</button>
				<form
					method="POST"
					action="?/deleteStanding"
					use:enhance={() => {
						isDeleting = true;
						return async ({ result, update }) => {
							isDeleting = false;
							if (result.type === 'success') {
								closeDeleteModal();
								await update();
							}
						};
					}}
				>
					<input type="hidden" name="standingId" value={deleteStandingData.id} />
					<button
						type="submit"
						disabled={!canDelete || isDeleting}
						class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isDeleting ? 'Deleting...' : 'Delete Standing'}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
