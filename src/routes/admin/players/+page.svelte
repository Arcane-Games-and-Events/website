<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { calculateDerivedStats, compareStandings } from '$lib/players/standings.js';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';

	let { data, form } = $props();

	let standingsSearchQuery = $state('');
	let standingsSeasonFilter = $state('all');
	let standingsCircuitFilter = $state('all');

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

	const canDelete = $derived(
		deleteStandingData &&
			deleteConfirmationInput.toLowerCase().trim() ===
				deleteStandingData.playerName?.toLowerCase().trim()
	);

	let sortColumn = $state('points');
	let sortDirection = $state('desc');
	function toggleSort(column) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortColumn = column;
			sortDirection = 'desc';
		}
		adminStandingsPage = 1;
	}

	let adminStandingsPage = $state(1);
	const adminStandingsPerPage = 25;

	const uniqueSeasons = $derived(
		[...new Set((data.standings || []).map((s) => s.season))].sort().reverse()
	);
	const uniqueCircuits = $derived(
		[...new Set((data.standings || []).map((s) => s.circuit))].sort()
	);

	const filteredStandings = $derived.by(() => {
		function sortLocal(a, b) {
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
			if (diff === 0) return compareStandings(a, b);
			return diff;
		}
		return (data.standings || [])
			.filter((s) => {
				if (standingsSearchQuery) {
					const search = standingsSearchQuery.toLowerCase();
					const matchesName = s.playerName?.toLowerCase().includes(search);
					const matchesGemId = s.gemId?.toLowerCase().includes(search);
					if (!matchesName && !matchesGemId) return false;
				}
				if (standingsSeasonFilter !== 'all' && s.season !== standingsSeasonFilter) return false;
				if (standingsCircuitFilter !== 'all' && s.circuit !== standingsCircuitFilter) return false;
				return true;
			})
			.sort(sortLocal);
	});

	const totalAdminStandingsPages = $derived(
		Math.ceil(filteredStandings.length / adminStandingsPerPage)
	);
	const paginatedAdminStandings = $derived(
		filteredStandings.slice(
			(adminStandingsPage - 1) * adminStandingsPerPage,
			adminStandingsPage * adminStandingsPerPage
		)
	);

	$effect(() => {
		standingsSearchQuery;
		standingsSeasonFilter;
		standingsCircuitFilter;
		adminStandingsPage = 1;
	});

	let successMessage = $state('');
	let errorMessage = $state('');

	$effect(() => {
		if (form?.success && form?.message) {
			successMessage = form.message;
			errorMessage = '';
			setTimeout(() => (successMessage = ''), 5000);
		} else if (form?.error) {
			errorMessage = form.error;
			successMessage = '';
			setTimeout(() => (errorMessage = ''), 5000);
		}
	});

	function circuitChip(c) {
		if (c === 'Los Angeles') return 'bg-accent text-white';
		if (c === 'New England') return 'bg-warm text-white';
		if (c === 'St. Louis') return 'bg-prem text-white';
		return 'border-line2 text-fade border';
	}
</script>

<svelte:head><title>Standings · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase">
			Standings
		</span>
		<span class="hidden h-[1px] flex-1 bg-line2 md:block"></span>
		<button
			onclick={() => (showCreateStandingModal = true)}
			class="inline-flex items-center bg-ink px-[14px] py-[9px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125"
		>
			+ Add Standing
		</button>
	</div>
	<h1
		class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
	>
		The season table.
	</h1>
	<p class="mt-3 max-w-[720px] font-newsreader text-[19px] leading-[1.42] text-soft italic">
		{data.standings?.length || 0} standings records · edit on the player profile page.
	</p>
</header>

{#if successMessage}
	<AdminNotice tone="success" message={successMessage} />
{/if}
{#if errorMessage}
	<AdminNotice tone="error" message={errorMessage} />
{/if}

<!-- ============ FILTERS ============ -->
<section class="overflow-x-clip border-y-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[24px] md:px-10 lg:px-14">
		<div class="grid gap-[14px] sm:grid-cols-2 md:grid-cols-4">
			<div class="sm:col-span-2 md:col-span-1">
				<input
					type="text"
					bind:value={standingsSearchQuery}
					placeholder="Search name or GEM ID"
					class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
				/>
			</div>
			<select
				bind:value={standingsSeasonFilter}
				class="border-[1.5px] border-ink bg-paper-bg px-[12px] py-[10px] font-mono-system text-[11px] font-bold tracking-[0.08em] text-ink uppercase focus:outline-none"
			>
				<option value="all">All Seasons</option>
				{#each uniqueSeasons as season (season)}
					<option value={season}>{season}</option>
				{/each}
			</select>
			<select
				bind:value={standingsCircuitFilter}
				class="border-[1.5px] border-ink bg-paper-bg px-[12px] py-[10px] font-mono-system text-[11px] font-bold tracking-[0.08em] text-ink uppercase focus:outline-none"
			>
				<option value="all">All Circuits</option>
				{#each uniqueCircuits as circuit (circuit)}
					<option value={circuit}>{circuit}</option>
				{/each}
			</select>
			<div
				class="flex items-center font-mono-system text-[10.5px] font-bold tracking-[0.08em] text-fade uppercase"
			>
				Showing {filteredStandings.length} / {data.standings?.length || 0}
			</div>
		</div>

		<!-- Recalculate -->
		<div class="mt-[16px] border-[1.5px] border-warm p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<span
						class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
					>
						Recalculate from Match Data
					</span>
					<p class="mt-[6px] text-[13px] leading-[1.5] text-soft">
						Rebuilds every player's standing in the selected season + circuit from source matches.
						Filter to a specific season and circuit first.
					</p>
				</div>
				<form
					method="POST"
					action="?/recalculateStandings"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') invalidateAll();
						};
					}}
					onsubmit={(e) => {
						if (
							!confirm(
								`Recalculate every player's standing for ${standingsCircuitFilter} ${standingsSeasonFilter}? This overwrites existing standings rows for that combo.`
							)
						) {
							e.preventDefault();
						}
					}}
				>
					<input type="hidden" name="season" value={standingsSeasonFilter} />
					<input type="hidden" name="circuit" value={standingsCircuitFilter} />
					<button
						type="submit"
						disabled={standingsSeasonFilter === 'all' || standingsCircuitFilter === 'all'}
						class="inline-flex items-center bg-warm px-[16px] py-[9px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] whitespace-nowrap text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Recalculate →
					</button>
				</form>
			</div>
		</div>
	</div>
</section>

<!-- ============ STANDINGS ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
		<!-- Mobile -->
		<div class="space-y-[14px] lg:hidden">
			{#each paginatedAdminStandings as standing (standing.id)}
				<div class="overflow-hidden border-[1.5px] border-ink p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="truncate font-newsreader text-[16px] font-semibold">
								{standing.playerName}
							</div>
							{#if standing.gemId}
								<div
									class="mt-[2px] font-mono-system text-[10.5px] font-bold tracking-[0.04em] text-warm"
								>
									{standing.gemId}
								</div>
							{:else}
								<div class="text-[11px] text-fade">No GEM ID</div>
							{/if}
						</div>
						<div
							class="shrink-0 font-archivo text-[22px] font-extrabold tracking-[-0.02em] text-prem"
						>
							{standing.totalPoints || 0}
						</div>
					</div>
					<div class="mt-[12px] grid grid-cols-3 gap-2 border-t border-line2 pt-[10px] text-center">
						<div>
							<span
								class="block font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>Win %</span
							>
							<span class="font-archivo text-[14px] font-extrabold tracking-[-0.01em] text-ink"
								>{standing.winPercentage ? `${standing.winPercentage}%` : '—'}</span
							>
						</div>
						<div>
							<span
								class="block font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>Record</span
							>
							<span class="font-archivo text-[14px] font-extrabold tracking-[-0.01em] text-ink">
								<span class="text-prem">{standing.matchesWon || 0}</span><span class="text-fade"
									>·</span
								><span class="text-warm"
									>{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span
								>
							</span>
						</div>
						<div>
							<span
								class="block font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>Top 8</span
							>
							<span class="font-archivo text-[14px] font-extrabold tracking-[-0.01em] text-ink"
								>{calculateDerivedStats(standing).top8Finishes}</span
							>
						</div>
					</div>
					<div class="mt-[10px] flex flex-wrap items-center gap-2">
						<span
							class="inline-flex items-center border border-line2 px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{standing.season}
						</span>
						<span
							class="inline-flex items-center px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] uppercase {circuitChip(
								standing.circuit
							)}"
						>
							{standing.circuit}
						</span>
					</div>
					<div class="mt-3 flex gap-2 border-t border-line2 pt-3">
						{#if standing.gemId}
							<a
								href="/player/{standing.gemId}"
								class="inline-flex flex-1 items-center justify-center border border-line2 px-[10px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
							>
								Edit
							</a>
						{:else}
							<span
								class="inline-flex flex-1 items-center justify-center border border-line2 px-[10px] py-[6px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
							>
								No GEM ID
							</span>
						{/if}
						<button
							onclick={() => openDeleteModal(standing)}
							class="inline-flex flex-1 items-center justify-center bg-warm px-[10px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
						>
							Delete
						</button>
					</div>
				</div>
			{:else}
				<div class="border-ink border-[1.5px] p-8 text-center overflow-hidden">
					<p class="font-newsreader text-soft text-[19px] italic">No standings found.</p>
				</div>
			{/each}
		</div>

		<!-- Desktop -->
		<div class="hidden border-[1.5px] border-ink lg:block">
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px]">
					<thead class="border-b-[1.5px] border-ink">
						<tr class="text-left">
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Season</th
							>
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Circuit</th
							>
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Player</th
							>
							<th class="px-4 py-[12px] text-center">
								<button
									onclick={() => toggleSort('points')}
									class="inline-flex items-center gap-1 font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {sortColumn ===
									'points'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Points {#if sortColumn === 'points'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th class="px-4 py-[12px] text-center">
								<button
									onclick={() => toggleSort('winPct')}
									class="inline-flex items-center gap-1 font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {sortColumn ===
									'winPct'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Win % {#if sortColumn === 'winPct'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th class="px-4 py-[12px] text-center">
								<button
									onclick={() => toggleSort('record')}
									class="inline-flex items-center gap-1 font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {sortColumn ===
									'record'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Record {#if sortColumn === 'record'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th class="px-4 py-[12px] text-center">
								<button
									onclick={() => toggleSort('events')}
									class="inline-flex items-center gap-1 font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {sortColumn ===
									'events'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Events {#if sortColumn === 'events'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th class="px-4 py-[12px] text-center">
								<button
									onclick={() => toggleSort('top8')}
									class="inline-flex items-center gap-1 font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {sortColumn ===
									'top8'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Top 8 {#if sortColumn === 'top8'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th
								class="px-4 py-[12px] text-center font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody>
						{#each paginatedAdminStandings as standing (standing.id)}
							<tr class="border-b border-line2 transition-colors hover:bg-panel">
								<td
									class="px-4 py-[14px] font-mono-system text-[11px] font-bold tracking-[0.06em] text-fade"
									>{standing.season}</td
								>
								<td class="px-4 py-[14px]">
									<span
										class="inline-flex items-center px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.08em] whitespace-nowrap uppercase {circuitChip(
											standing.circuit
										)}"
									>
										{standing.circuit}
									</span>
								</td>
								<td class="px-4 py-[14px]">
									<div class="font-newsreader text-[15px] font-semibold">{standing.playerName}</div>
									{#if standing.gemId}
										<div
											class="mt-[2px] font-mono-system text-[10.5px] font-bold tracking-[0.04em] text-warm"
										>
											{standing.gemId}
										</div>
									{:else}
										<div class="text-[11px] text-fade">No GEM ID</div>
									{/if}
								</td>
								<td
									class="px-4 py-[14px] text-center font-archivo text-[18px] font-extrabold tracking-[-0.02em] text-prem"
								>
									{standing.totalPoints || 0}
								</td>
								<td
									class="px-4 py-[14px] text-center font-archivo text-[14px] font-extrabold tracking-[-0.01em] text-ink"
								>
									{standing.winPercentage ? `${standing.winPercentage}%` : '—'}
								</td>
								<td class="px-4 py-[14px] text-center">
									<span class="font-archivo text-[14px] font-extrabold tracking-[-0.01em]">
										<span class="text-prem">{standing.matchesWon || 0}</span><span class="text-fade"
											>·</span
										><span class="text-warm"
											>{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span
										>
									</span>
								</td>
								<td
									class="px-4 py-[14px] text-center font-archivo text-[14px] font-extrabold tracking-[-0.01em] text-ink"
								>
									{calculateDerivedStats(standing).eventsPlayed}
								</td>
								<td
									class="px-4 py-[14px] text-center font-archivo text-[14px] font-extrabold tracking-[-0.01em] text-ink"
								>
									{calculateDerivedStats(standing).top8Finishes}
								</td>
								<td class="px-4 py-[14px] text-center">
									<div class="inline-flex items-center justify-center gap-2">
										{#if standing.gemId}
											<a
												href="/player/{standing.gemId}"
												class="inline-flex items-center border border-line2 px-[10px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
												title="Edit on player profile page"
											>
												Edit
											</a>
										{:else}
											<span class="text-[10.5px] text-fade">No GEM ID</span>
										{/if}
										<button
											type="button"
											onclick={() => openDeleteModal(standing)}
											class="inline-flex items-center bg-warm px-[10px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
											title="Delete standing"
										>
											Del
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="9" class="px-6 py-12 text-center">
									<p class="font-newsreader text-soft text-[19px] italic">
										No standings found. Import data from CSV to get started.
									</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalAdminStandingsPages > 1}
				<div
					class="flex flex-col items-center justify-between gap-4 border-t-[1.5px] border-ink px-5 py-[14px] sm:flex-row"
				>
					<span
						class="font-mono-system text-[10.5px] font-bold tracking-[0.08em] text-fade uppercase"
					>
						{(adminStandingsPage - 1) * adminStandingsPerPage + 1}–{Math.min(
							adminStandingsPage * adminStandingsPerPage,
							filteredStandings.length
						)} of {filteredStandings.length}
					</span>
					<div class="flex items-center gap-2">
						<button
							onclick={() => (adminStandingsPage = 1)}
							disabled={adminStandingsPage === 1}
							class="border border-line2 px-[12px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
						>
							First
						</button>
						<button
							onclick={() => (adminStandingsPage = Math.max(1, adminStandingsPage - 1))}
							disabled={adminStandingsPage === 1}
							class="border border-line2 px-[12px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Previous page"
						>
							←
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
										class="h-[28px] w-[28px] font-mono-system text-[10.5px] font-extrabold tracking-[0.06em] transition-colors {adminStandingsPage ===
										pageNum
											? 'bg-ink text-white'
											: 'border border-line2 hover:border-ink'}"
									>
										{pageNum}
									</button>
								{/if}
							{/each}
						</div>
						<button
							onclick={() =>
								(adminStandingsPage = Math.min(totalAdminStandingsPages, adminStandingsPage + 1))}
							disabled={adminStandingsPage === totalAdminStandingsPages}
							class="border border-line2 px-[12px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Next page"
						>
							→
						</button>
						<button
							onclick={() => (adminStandingsPage = totalAdminStandingsPages)}
							disabled={adminStandingsPage === totalAdminStandingsPages}
							class="border border-line2 px-[12px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
						>
							Last
						</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="mt-6 border border-line2 p-4">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
				>Player Profiles</span
			>
			<p class="mt-[6px] text-[13px] leading-[1.5] text-soft">
				Click Edit on a row to open the player's profile page where you can view and edit all their
				standings data, including monthly breakdowns.
			</p>
		</div>
	</div>
</section>

<!-- ============ CREATE MODAL ============ -->
{#if showCreateStandingModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => {
				showCreateStandingModal = false;
				resetNewStanding();
			}}
			aria-label="Close modal"
		></button>
		<div
			class="relative w-full max-w-lg border-[3px] border-double border-ink bg-paper-bg shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
		>
			<div class="flex items-start justify-between gap-3 border-b border-line2 p-6">
				<div>
					<span
						class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
						>New Standing</span
					>
					<h2 class="mt-[6px] font-newsreader text-[24px] font-semibold tracking-[-0.01em]">
						Add a player.
					</h2>
				</div>
				<button
					onclick={() => {
						showCreateStandingModal = false;
						resetNewStanding();
					}}
					class="inline-flex h-[32px] w-[32px] items-center justify-center border border-line2 font-mono-system text-[14px] font-bold transition-colors hover:border-ink"
					aria-label="Close modal"
				>
					×
				</button>
			</div>

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
				class="space-y-[18px] p-6"
			>
				<div class="grid grid-cols-2 gap-[14px]">
					<div>
						<label
							for="season"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Season <span class="text-warm">*</span></label
						>
						<select
							id="season"
							name="season"
							bind:value={newStanding.season}
							required
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[13px] font-bold tracking-[0.06em] text-ink uppercase focus:outline-none"
						>
							<option value="2026">2026</option>
							<option value="2025">2025</option>
							<option value="2024">2024</option>
							<option value="2023">2023</option>
						</select>
					</div>
					<div>
						<label
							for="circuit"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Circuit <span class="text-warm">*</span></label
						>
						<select
							id="circuit"
							name="circuit"
							bind:value={newStanding.circuit}
							required
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[13px] font-bold tracking-[0.06em] text-ink uppercase focus:outline-none"
						>
							<option value="Los Angeles">Los Angeles</option>
							<option value="New England">New England</option>
							<option value="St. Louis">St. Louis</option>
						</select>
					</div>
				</div>

				<div>
					<label
						for="playerName"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>Player Name <span class="text-warm">*</span></label
					>
					<input
						type="text"
						id="playerName"
						name="playerName"
						bind:value={newStanding.playerName}
						required
						placeholder="Enter player name"
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
					/>
				</div>

				<div>
					<label
						for="gemId"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>GEM ID</label
					>
					<input
						type="text"
						id="gemId"
						name="gemId"
						bind:value={newStanding.gemId}
						placeholder="Optional — for linking to player profile"
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[13px] text-ink placeholder:text-fade focus:outline-none"
					/>
				</div>

				<div>
					<label
						for="totalPoints"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>Total Points</label
					>
					<input
						type="number"
						id="totalPoints"
						name="totalPoints"
						bind:value={newStanding.totalPoints}
						min="0"
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[13px] text-ink focus:outline-none"
					/>
				</div>

				<div class="grid grid-cols-2 gap-[14px]">
					<div>
						<label
							for="matchesWon"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Matches Won</label
						>
						<input
							type="number"
							id="matchesWon"
							name="matchesWon"
							bind:value={newStanding.matchesWon}
							min="0"
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[13px] text-ink focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="matchesPlayed"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Matches Played</label
						>
						<input
							type="number"
							id="matchesPlayed"
							name="matchesPlayed"
							bind:value={newStanding.matchesPlayed}
							min="0"
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[13px] text-ink focus:outline-none"
						/>
					</div>
				</div>

				{#if newStanding.matchesPlayed > 0}
					<div class="border border-line2 bg-panel p-3">
						<span
							class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Win Percentage</span
						>
						<div
							class="mt-[2px] font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-prem"
						>
							{((newStanding.matchesWon / newStanding.matchesPlayed) * 100).toFixed(1)}%
						</div>
					</div>
				{/if}

				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => {
							showCreateStandingModal = false;
							resetNewStanding();
						}}
						class="inline-flex items-center border border-line2 px-[18px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="inline-flex items-center bg-prem px-[22px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110"
					>
						Create Standing →
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ============ DELETE MODAL ============ -->
{#if showDeleteModal && deleteStandingData}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
		<div
			class="w-full max-w-md border-[3px] border-double border-ink bg-paper-bg p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
		>
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
				>Danger Zone</span
			>
			<h3 class="mt-[6px] font-newsreader text-[24px] font-semibold tracking-[-0.01em]">
				Delete standing record?
			</h3>
			<p class="mt-3 text-[13.5px] leading-[1.5] text-soft">This cannot be undone.</p>

			<div class="mt-[16px] border border-line2 bg-panel p-4 text-center">
				<p class="font-newsreader text-[18px] font-semibold">{deleteStandingData.playerName}</p>
				{#if deleteStandingData.gemId}
					<p class="mt-[2px] font-mono-system text-[11px] font-bold tracking-[0.04em] text-warm">
						{deleteStandingData.gemId}
					</p>
				{/if}
				<p
					class="mt-[6px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
				>
					{deleteStandingData.season} · {deleteStandingData.circuit}
				</p>
			</div>

			<div class="mt-[18px]">
				<label
					for="delete-confirmation"
					class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
				>
					Type <span class="text-warm">"{deleteStandingData.playerName}"</span> to confirm
				</label>
				<input
					type="text"
					id="delete-confirmation"
					bind:value={deleteConfirmationInput}
					placeholder="Enter player name"
					class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[14px] text-ink placeholder:text-fade focus:outline-none"
					autocomplete="off"
				/>
			</div>

			<div class="mt-[22px] flex justify-end gap-3">
				<button
					type="button"
					onclick={closeDeleteModal}
					class="inline-flex items-center border border-line2 px-[16px] py-[10px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
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
						class="inline-flex items-center bg-warm px-[18px] py-[10px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isDeleting ? 'Deleting…' : 'Delete Standing'}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
