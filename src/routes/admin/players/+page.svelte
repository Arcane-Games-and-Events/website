<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	function calculateDerivedStats(standing) {
		const monthlyPoints = [
			standing.januaryPoints || 0, standing.februaryPoints || 0, standing.marchPoints || 0,
			standing.aprilPoints || 0, standing.mayPoints || 0, standing.junePoints || 0,
			standing.julyPoints || 0, standing.augustPoints || 0, standing.septemberPoints || 0,
			standing.octoberPoints || 0, standing.novemberPoints || 0, standing.decemberPoints || 0
		];
		const eventsPlayed = monthlyPoints.filter((p) => p > 0).length;
		const top8Finishes = monthlyPoints.filter((p) => p >= 15).length;
		return { eventsPlayed, top8Finishes };
	}

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

	let standingsSearchQuery = $state('');
	let standingsSeasonFilter = $state('all');
	let standingsCircuitFilter = $state('all');

	let showCreateStandingModal = $state(false);
	let newStanding = $state({
		season: '2026', circuit: 'Los Angeles', playerName: '', gemId: '',
		totalPoints: 0, matchesPlayed: 0, matchesWon: 0
	});

	function resetNewStanding() {
		newStanding = {
			season: '2026', circuit: 'Los Angeles', playerName: '', gemId: '',
			totalPoints: 0, matchesPlayed: 0, matchesWon: 0
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
		deleteStandingData && deleteConfirmationInput.toLowerCase().trim() === deleteStandingData.playerName?.toLowerCase().trim()
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

	const uniqueSeasons = $derived([...new Set((data.standings || []).map((s) => s.season))].sort().reverse());
	const uniqueCircuits = $derived([...new Set((data.standings || []).map((s) => s.circuit))].sort());

	const filteredStandings = $derived.by(() => {
		function sortLocal(a, b) {
			let aVal, bVal;
			switch (sortColumn) {
				case 'points': aVal = a.totalPoints || 0; bVal = b.totalPoints || 0; break;
				case 'winPct': aVal = a.winPercentage || 0; bVal = b.winPercentage || 0; break;
				case 'record': aVal = a.matchesWon || 0; bVal = b.matchesWon || 0; break;
				case 'events': aVal = calculateDerivedStats(a).eventsPlayed; bVal = calculateDerivedStats(b).eventsPlayed; break;
				case 'top8': aVal = calculateDerivedStats(a).top8Finishes; bVal = calculateDerivedStats(b).top8Finishes; break;
				default: return compareStandings(a, b);
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

	const totalAdminStandingsPages = $derived(Math.ceil(filteredStandings.length / adminStandingsPerPage));
	const paginatedAdminStandings = $derived(filteredStandings.slice((adminStandingsPage - 1) * adminStandingsPerPage, adminStandingsPage * adminStandingsPerPage));

	$effect(() => {
		standingsSearchQuery; standingsSeasonFilter; standingsCircuitFilter;
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
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Standings
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<button
			onclick={() => (showCreateStandingModal = true)}
			class="bg-ink font-mono-system inline-flex items-center px-[14px] py-[9px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
		>
			+ Add Standing
		</button>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		The season table.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[720px] text-[19px] leading-[1.42] italic">
		{data.standings?.length || 0} standings records · edit on the player profile page.
	</p>
</header>

{#if successMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{successMessage}</p>
		</div>
	</section>
{/if}
{#if errorMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{errorMessage}</p>
		</div>
	</section>
{/if}

<!-- ============ FILTERS ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[24px]">
		<div class="grid gap-[14px] sm:grid-cols-2 md:grid-cols-4">
			<div class="sm:col-span-2 md:col-span-1">
				<input
					type="text"
					bind:value={standingsSearchQuery}
					placeholder="Search name or GEM ID"
					class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
				/>
			</div>
			<select
				bind:value={standingsSeasonFilter}
				class="border-ink bg-paper-bg text-ink font-mono-system border-[1.5px] px-[12px] py-[10px] text-[11px] font-bold tracking-[0.08em] uppercase focus:outline-none"
			>
				<option value="all">All Seasons</option>
				{#each uniqueSeasons as season (season)}
					<option value={season}>{season}</option>
				{/each}
			</select>
			<select
				bind:value={standingsCircuitFilter}
				class="border-ink bg-paper-bg text-ink font-mono-system border-[1.5px] px-[12px] py-[10px] text-[11px] font-bold tracking-[0.08em] uppercase focus:outline-none"
			>
				<option value="all">All Circuits</option>
				{#each uniqueCircuits as circuit (circuit)}
					<option value={circuit}>{circuit}</option>
				{/each}
			</select>
			<div class="font-mono-system text-fade flex items-center text-[10.5px] font-bold tracking-[0.08em] uppercase">
				Showing {filteredStandings.length} / {data.standings?.length || 0}
			</div>
		</div>

		<!-- Recalculate -->
		<div class="border-warm mt-[16px] border-[1.5px] p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
						Recalculate from Match Data
					</span>
					<p class="text-soft mt-[6px] text-[13px] leading-[1.5]">
						Rebuilds every player's standing in the selected season + circuit from source matches. Filter to a specific season and circuit first.
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
						if (!confirm(`Recalculate every player's standing for ${standingsCircuitFilter} ${standingsSeasonFilter}? This overwrites existing standings rows for that combo.`)) {
							e.preventDefault();
						}
					}}
				>
					<input type="hidden" name="season" value={standingsSeasonFilter} />
					<input type="hidden" name="circuit" value={standingsCircuitFilter} />
					<button
						type="submit"
						disabled={standingsSeasonFilter === 'all' || standingsCircuitFilter === 'all'}
						class="bg-warm font-mono-system inline-flex items-center px-[16px] py-[9px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
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
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<!-- Mobile -->
		<div class="space-y-[14px] lg:hidden">
			{#each paginatedAdminStandings as standing (standing.id)}
				<div class="border-ink border-[1.5px] p-4 overflow-hidden">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="font-newsreader truncate text-[16px] font-semibold">{standing.playerName}</div>
							{#if standing.gemId}
								<div class="font-mono-system text-warm mt-[2px] text-[10.5px] font-bold tracking-[0.04em]">{standing.gemId}</div>
							{:else}
								<div class="text-fade text-[11px]">No GEM ID</div>
							{/if}
						</div>
						<div class="font-archivo text-prem shrink-0 text-[22px] font-extrabold tracking-[-0.02em]">{standing.totalPoints || 0}</div>
					</div>
					<div class="border-line2 mt-[12px] grid grid-cols-3 gap-2 border-t pt-[10px] text-center">
						<div>
							<span class="font-mono-system text-fade block text-[10px] font-bold tracking-[0.08em] uppercase">Win %</span>
							<span class="font-archivo text-ink text-[14px] font-extrabold tracking-[-0.01em]">{standing.winPercentage ? `${standing.winPercentage}%` : '—'}</span>
						</div>
						<div>
							<span class="font-mono-system text-fade block text-[10px] font-bold tracking-[0.08em] uppercase">Record</span>
							<span class="font-archivo text-ink text-[14px] font-extrabold tracking-[-0.01em]">
								<span class="text-prem">{standing.matchesWon || 0}</span><span class="text-fade">·</span><span class="text-warm">{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span>
							</span>
						</div>
						<div>
							<span class="font-mono-system text-fade block text-[10px] font-bold tracking-[0.08em] uppercase">Top 8</span>
							<span class="font-archivo text-ink text-[14px] font-extrabold tracking-[-0.01em]">{calculateDerivedStats(standing).top8Finishes}</span>
						</div>
					</div>
					<div class="mt-[10px] flex flex-wrap items-center gap-2">
						<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[7px] py-[3px] text-[10px] font-bold tracking-[0.06em] uppercase">
							{standing.season}
						</span>
						<span class="font-mono-system inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase {circuitChip(standing.circuit)}">
							{standing.circuit}
						</span>
					</div>
					<div class="border-line2 mt-3 flex gap-2 border-t pt-3">
						{#if standing.gemId}
							<a href="/player/{standing.gemId}" class="border-line2 hover:border-ink font-mono-system inline-flex flex-1 items-center justify-center border px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors">
								Edit
							</a>
						{:else}
							<span class="font-mono-system border-line2 text-fade inline-flex flex-1 items-center justify-center border px-[10px] py-[6px] text-[10px] font-bold tracking-[0.08em] uppercase">
								No GEM ID
							</span>
						{/if}
						<button onclick={() => openDeleteModal(standing)} class="bg-warm font-mono-system inline-flex flex-1 items-center justify-center px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]">
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
		<div class="border-ink hidden border-[1.5px] lg:block">
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px]">
					<thead class="border-ink border-b-[1.5px]">
						<tr class="text-left">
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Season</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Circuit</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Player</th>
							<th class="px-4 py-[12px] text-center">
								<button onclick={() => toggleSort('points')} class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase inline-flex items-center gap-1 transition-colors {sortColumn === 'points' ? 'text-ink' : 'text-fade hover:text-ink'}">
									Points {#if sortColumn === 'points'}<span>{sortDirection === 'desc' ? '↓' : '↑'}</span>{/if}
								</button>
							</th>
							<th class="px-4 py-[12px] text-center">
								<button onclick={() => toggleSort('winPct')} class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase inline-flex items-center gap-1 transition-colors {sortColumn === 'winPct' ? 'text-ink' : 'text-fade hover:text-ink'}">
									Win % {#if sortColumn === 'winPct'}<span>{sortDirection === 'desc' ? '↓' : '↑'}</span>{/if}
								</button>
							</th>
							<th class="px-4 py-[12px] text-center">
								<button onclick={() => toggleSort('record')} class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase inline-flex items-center gap-1 transition-colors {sortColumn === 'record' ? 'text-ink' : 'text-fade hover:text-ink'}">
									Record {#if sortColumn === 'record'}<span>{sortDirection === 'desc' ? '↓' : '↑'}</span>{/if}
								</button>
							</th>
							<th class="px-4 py-[12px] text-center">
								<button onclick={() => toggleSort('events')} class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase inline-flex items-center gap-1 transition-colors {sortColumn === 'events' ? 'text-ink' : 'text-fade hover:text-ink'}">
									Events {#if sortColumn === 'events'}<span>{sortDirection === 'desc' ? '↓' : '↑'}</span>{/if}
								</button>
							</th>
							<th class="px-4 py-[12px] text-center">
								<button onclick={() => toggleSort('top8')} class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase inline-flex items-center gap-1 transition-colors {sortColumn === 'top8' ? 'text-ink' : 'text-fade hover:text-ink'}">
									Top 8 {#if sortColumn === 'top8'}<span>{sortDirection === 'desc' ? '↓' : '↑'}</span>{/if}
								</button>
							</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-center text-[10px] font-extrabold tracking-[0.14em] uppercase">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedAdminStandings as standing (standing.id)}
							<tr class="border-line2 hover:bg-panel border-b transition-colors">
								<td class="font-mono-system text-fade px-4 py-[14px] text-[11px] font-bold tracking-[0.06em]">{standing.season}</td>
								<td class="px-4 py-[14px]">
									<span class="font-mono-system inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.08em] uppercase whitespace-nowrap {circuitChip(standing.circuit)}">
										{standing.circuit}
									</span>
								</td>
								<td class="px-4 py-[14px]">
									<div class="font-newsreader text-[15px] font-semibold">{standing.playerName}</div>
									{#if standing.gemId}
										<div class="font-mono-system text-warm mt-[2px] text-[10.5px] font-bold tracking-[0.04em]">{standing.gemId}</div>
									{:else}
										<div class="text-fade text-[11px]">No GEM ID</div>
									{/if}
								</td>
								<td class="font-archivo text-prem px-4 py-[14px] text-center text-[18px] font-extrabold tracking-[-0.02em]">
									{standing.totalPoints || 0}
								</td>
								<td class="font-archivo text-ink px-4 py-[14px] text-center text-[14px] font-extrabold tracking-[-0.01em]">
									{standing.winPercentage ? `${standing.winPercentage}%` : '—'}
								</td>
								<td class="px-4 py-[14px] text-center">
									<span class="font-archivo text-[14px] font-extrabold tracking-[-0.01em]">
										<span class="text-prem">{standing.matchesWon || 0}</span><span class="text-fade">·</span><span class="text-warm">{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span>
									</span>
								</td>
								<td class="font-archivo text-ink px-4 py-[14px] text-center text-[14px] font-extrabold tracking-[-0.01em]">
									{calculateDerivedStats(standing).eventsPlayed}
								</td>
								<td class="font-archivo text-ink px-4 py-[14px] text-center text-[14px] font-extrabold tracking-[-0.01em]">
									{calculateDerivedStats(standing).top8Finishes}
								</td>
								<td class="px-4 py-[14px] text-center">
									<div class="inline-flex items-center justify-center gap-2">
										{#if standing.gemId}
											<a href="/player/{standing.gemId}" class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors" title="Edit on player profile page">
												Edit
											</a>
										{:else}
											<span class="text-fade text-[10.5px]">No GEM ID</span>
										{/if}
										<button type="button" onclick={() => openDeleteModal(standing)} class="bg-warm font-mono-system inline-flex items-center px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]" title="Delete standing">
											Del
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="9" class="px-6 py-12 text-center">
									<p class="font-newsreader text-soft text-[19px] italic">No standings found. Import data from CSV to get started.</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalAdminStandingsPages > 1}
				<div class="border-ink flex flex-col items-center justify-between gap-4 border-t-[1.5px] px-5 py-[14px] sm:flex-row">
					<span class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.08em] uppercase">
						{(adminStandingsPage - 1) * adminStandingsPerPage + 1}–{Math.min(adminStandingsPage * adminStandingsPerPage, filteredStandings.length)} of {filteredStandings.length}
					</span>
					<div class="flex items-center gap-2">
						<button onclick={() => (adminStandingsPage = 1)} disabled={adminStandingsPage === 1} class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40">
							First
						</button>
						<button onclick={() => (adminStandingsPage = Math.max(1, adminStandingsPage - 1))} disabled={adminStandingsPage === 1} class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page">
							←
						</button>
						<div class="flex items-center gap-1">
							{#each Array(Math.min(5, totalAdminStandingsPages)) as _, i}
								{@const pageNum = adminStandingsPage <= 3 ? i + 1 : adminStandingsPage >= totalAdminStandingsPages - 2 ? totalAdminStandingsPages - 4 + i : adminStandingsPage - 2 + i}
								{#if pageNum > 0 && pageNum <= totalAdminStandingsPages}
									<button onclick={() => (adminStandingsPage = pageNum)} class="font-mono-system h-[28px] w-[28px] text-[10.5px] font-extrabold tracking-[0.06em] transition-colors {adminStandingsPage === pageNum ? 'bg-ink text-white' : 'border-line2 hover:border-ink border'}">
										{pageNum}
									</button>
								{/if}
							{/each}
						</div>
						<button onclick={() => (adminStandingsPage = Math.min(totalAdminStandingsPages, adminStandingsPage + 1))} disabled={adminStandingsPage === totalAdminStandingsPages} class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page">
							→
						</button>
						<button onclick={() => (adminStandingsPage = totalAdminStandingsPages)} disabled={adminStandingsPage === totalAdminStandingsPages} class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40">
							Last
						</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="border-line2 mt-6 border p-4">
			<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Player Profiles</span>
			<p class="text-soft mt-[6px] text-[13px] leading-[1.5]">
				Click Edit on a row to open the player's profile page where you can view and edit all their standings data, including monthly breakdowns.
			</p>
		</div>
	</div>
</section>

<!-- ============ CREATE MODAL ============ -->
{#if showCreateStandingModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => { showCreateStandingModal = false; resetNewStanding(); }}
			aria-label="Close modal"
		></button>
		<div class="border-ink bg-paper-bg relative w-full max-w-lg border-[3px] border-double shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
			<div class="border-line2 flex items-start justify-between gap-3 border-b p-6">
				<div>
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">New Standing</span>
					<h2 class="font-newsreader mt-[6px] text-[24px] font-semibold tracking-[-0.01em]">Add a player.</h2>
				</div>
				<button onclick={() => { showCreateStandingModal = false; resetNewStanding(); }} class="border-line2 hover:border-ink font-mono-system inline-flex h-[32px] w-[32px] items-center justify-center border text-[14px] font-bold transition-colors" aria-label="Close modal">
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
						<label for="season" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Season <span class="text-warm">*</span></label>
						<select id="season" name="season" bind:value={newStanding.season} required class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none">
							<option value="2026">2026</option>
							<option value="2025">2025</option>
							<option value="2024">2024</option>
							<option value="2023">2023</option>
						</select>
					</div>
					<div>
						<label for="circuit" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Circuit <span class="text-warm">*</span></label>
						<select id="circuit" name="circuit" bind:value={newStanding.circuit} required class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none">
							<option value="Los Angeles">Los Angeles</option>
							<option value="New England">New England</option>
							<option value="St. Louis">St. Louis</option>
						</select>
					</div>
				</div>

				<div>
					<label for="playerName" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Player Name <span class="text-warm">*</span></label>
					<input type="text" id="playerName" name="playerName" bind:value={newStanding.playerName} required placeholder="Enter player name" class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none" />
				</div>

				<div>
					<label for="gemId" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">GEM ID</label>
					<input type="text" id="gemId" name="gemId" bind:value={newStanding.gemId} placeholder="Optional — for linking to player profile" class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none" />
				</div>

				<div>
					<label for="totalPoints" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Total Points</label>
					<input type="number" id="totalPoints" name="totalPoints" bind:value={newStanding.totalPoints} min="0" class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none" />
				</div>

				<div class="grid grid-cols-2 gap-[14px]">
					<div>
						<label for="matchesWon" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Matches Won</label>
						<input type="number" id="matchesWon" name="matchesWon" bind:value={newStanding.matchesWon} min="0" class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none" />
					</div>
					<div>
						<label for="matchesPlayed" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Matches Played</label>
						<input type="number" id="matchesPlayed" name="matchesPlayed" bind:value={newStanding.matchesPlayed} min="0" class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none" />
					</div>
				</div>

				{#if newStanding.matchesPlayed > 0}
					<div class="border-line2 bg-panel border p-3">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Win Percentage</span>
						<div class="font-archivo text-prem mt-[2px] text-[20px] font-extrabold tracking-[-0.02em]">
							{((newStanding.matchesWon / newStanding.matchesPlayed) * 100).toFixed(1)}%
						</div>
					</div>
				{/if}

				<div class="flex justify-end gap-3 pt-2">
					<button type="button" onclick={() => { showCreateStandingModal = false; resetNewStanding(); }} class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[18px] py-[11px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors">
						Cancel
					</button>
					<button type="submit" class="bg-prem font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white hover:brightness-110 transition-[filter]">
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
		<div class="border-ink bg-paper-bg w-full max-w-md border-[3px] border-double shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-6">
			<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">Danger Zone</span>
			<h3 class="font-newsreader mt-[6px] text-[24px] font-semibold tracking-[-0.01em]">Delete standing record?</h3>
			<p class="text-soft mt-3 text-[13.5px] leading-[1.5]">This cannot be undone.</p>

			<div class="border-line2 bg-panel mt-[16px] border p-4 text-center">
				<p class="font-newsreader text-[18px] font-semibold">{deleteStandingData.playerName}</p>
				{#if deleteStandingData.gemId}
					<p class="font-mono-system text-warm mt-[2px] text-[11px] font-bold tracking-[0.04em]">{deleteStandingData.gemId}</p>
				{/if}
				<p class="font-mono-system text-fade mt-[6px] text-[10px] font-bold tracking-[0.08em] uppercase">
					{deleteStandingData.season} · {deleteStandingData.circuit}
				</p>
			</div>

			<div class="mt-[18px]">
				<label for="delete-confirmation" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
					Type <span class="text-warm">"{deleteStandingData.playerName}"</span> to confirm
				</label>
				<input
					type="text"
					id="delete-confirmation"
					bind:value={deleteConfirmationInput}
					placeholder="Enter player name"
					class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[14px] focus:outline-none"
					autocomplete="off"
				/>
			</div>

			<div class="mt-[22px] flex justify-end gap-3">
				<button type="button" onclick={closeDeleteModal} class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors">
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
					<button type="submit" disabled={!canDelete || isDeleting} class="bg-warm font-mono-system inline-flex items-center px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white hover:brightness-110 transition-[filter] disabled:cursor-not-allowed disabled:opacity-50">
						{isDeleting ? 'Deleting…' : 'Delete Standing'}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
