<script>
	import AgeOpenHeader, { btn as hbtn } from '$lib/components/age/admin/AgeOpenHeader.svelte';
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
		if (c === 'Los Angeles') return '[--tone:#8a6116]';
		if (c === 'New England') return '[--tone:var(--color-warm)]';
		if (c === 'St. Louis') return '[--tone:var(--color-prem)]';
		return '[--tone:var(--color-fade)]';
	}
</script>

<svelte:head><title>Standings · Admin</title></svelte:head>

<!-- ============ HEADER ============ -->
<AgeOpenHeader
	title="Standings"
	subtitle="{data.standings?.length || 0} standings records · edit on the player profile page."
>
	{#snippet actions()}
		<button type="button" onclick={() => (showCreateStandingModal = true)} class={hbtn}
			>+ Add standing</button
		>
	{/snippet}
</AgeOpenHeader>

{#if successMessage}
	<AdminNotice tone="success" message={successMessage} />
{/if}
{#if errorMessage}
	<AdminNotice tone="error" message={errorMessage} />
{/if}

<!-- ============ FILTERS ============ -->
<section class="overflow-x-clip border-t border-line2">
	<div class="mx-auto w-full max-w-page px-5 py-6 md:px-8">
		<div class="grid gap-3.5 sm:grid-cols-2 md:grid-cols-4">
			<div class="sm:col-span-2 md:col-span-1">
				<input
					type="text"
					bind:value={standingsSearchQuery}
					placeholder="Search name or GEM ID"
					class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
				/>
			</div>
			<select
				bind:value={standingsSeasonFilter}
				class="h-10 border border-line2 bg-paper py-0 pr-8 pl-3 text-sm text-ink focus:border-ink focus:ring-0"
			>
				<option value="all">All Seasons</option>
				{#each uniqueSeasons as season (season)}
					<option value={season}>{season}</option>
				{/each}
			</select>
			<select
				bind:value={standingsCircuitFilter}
				class="h-10 border border-line2 bg-paper py-0 pr-8 pl-3 text-sm text-ink focus:border-ink focus:ring-0"
			>
				<option value="all">All Circuits</option>
				{#each uniqueCircuits as circuit (circuit)}
					<option value={circuit}>{circuit}</option>
				{/each}
			</select>
			<div class="flex items-center text-xs text-fade">
				Showing {filteredStandings.length} / {data.standings?.length || 0}
			</div>
		</div>

		<!-- Recalculate -->
		<div class="mt-4 border border-l-3 border-line2 border-l-warm bg-paper p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<span class="text-xs font-extrabold tracking-widest text-warm uppercase">
						Recalculate from Match Data
					</span>
					<p class="mt-1.5 text-sm leading-normal text-soft">
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
						class="inline-flex h-10 shrink-0 items-center gap-2 bg-ink px-4 text-xs font-extrabold tracking-widest whitespace-nowrap text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
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
	<div class="mx-auto w-full max-w-page px-5 py-9 md:px-8">
		<!-- Mobile -->
		<div class="space-y-3.5 lg:hidden">
			{#each paginatedAdminStandings as standing (standing.id)}
				<div class="overflow-hidden border border-line2 p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="truncate font-newsreader text-base font-semibold">
								{standing.playerName}
							</div>
							{#if standing.gemId}
								<div class="mt-0.5 text-xs font-medium text-warm">
									{standing.gemId}
								</div>
							{:else}
								<div class="text-xs text-fade">No GEM ID</div>
							{/if}
						</div>
						<div class="shrink-0 text-2xl font-semibold text-prem tabular-nums">
							{standing.totalPoints || 0}
						</div>
					</div>
					<div class="mt-3 grid grid-cols-3 gap-2 border-t border-line2 pt-2.5 text-center">
						<div>
							<span class="block text-xs text-fade">Win %</span>
							<span class="text-sm font-semibold text-ink tabular-nums"
								>{standing.winPercentage ? `${standing.winPercentage}%` : '—'}</span
							>
						</div>
						<div>
							<span class="block text-xs text-fade">Record</span>
							<span class="text-sm font-semibold text-ink tabular-nums">
								<span class="text-prem">{standing.matchesWon || 0}</span><span class="text-fade"
									>·</span
								><span class="text-warm"
									>{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span
								>
							</span>
						</div>
						<div>
							<span class="block text-xs text-fade">Top 8</span>
							<span class="text-sm font-semibold text-ink tabular-nums"
								>{calculateDerivedStats(standing).top8Finishes}</span
							>
						</div>
					</div>
					<div class="mt-2.5 flex flex-wrap items-center gap-2">
						<span
							class="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap text-ink text-soft capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-['']"
						>
							{standing.season}
						</span>
						<span
							class="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {circuitChip(
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
								class="inline-flex h-8 flex-1 shrink-0 items-center justify-center border border-line2 px-3 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
							>
								Edit
							</a>
						{:else}
							<span class="flex-1 items-center justify-center text-xs text-fade"> No GEM ID </span>
						{/if}
						<button
							onclick={() => openDeleteModal(standing)}
							class="inline-flex h-8 shrink-0 items-center border border-hero-rb/60 px-3 text-xs font-extrabold tracking-widest text-hero-rb uppercase transition-colors hover:border-hero-rb disabled:opacity-40"
						>
							Delete
						</button>
					</div>
				</div>
			{:else}
				<div class="border border-line2 p-8 text-center overflow-hidden">
					<p class="font-newsreader text-soft text-xl italic">No standings found.</p>
				</div>
			{/each}
		</div>

		<!-- Desktop -->
		<div class="hidden border border-line2 lg:block">
			<div class="overflow-x-auto">
				<table class="w-full min-w-225">
					<thead class="border-b border-line2">
						<tr class="text-left">
							<th class="px-4 py-3 text-xs font-extrabold tracking-widest text-fade uppercase"
								>Season</th
							>
							<th class="px-4 py-3 text-xs font-extrabold tracking-widest text-fade uppercase"
								>Circuit</th
							>
							<th class="px-4 py-3 text-xs font-extrabold tracking-widest text-fade uppercase"
								>Player</th
							>
							<th class="px-4 py-3 text-center">
								<button
									onclick={() => toggleSort('points')}
									class="inline-flex items-center gap-1 text-xs font-extrabold tracking-widest uppercase transition-colors {sortColumn ===
									'points'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Points {#if sortColumn === 'points'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th class="px-4 py-3 text-center">
								<button
									onclick={() => toggleSort('winPct')}
									class="inline-flex items-center gap-1 text-xs font-extrabold tracking-widest uppercase transition-colors {sortColumn ===
									'winPct'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Win % {#if sortColumn === 'winPct'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th class="px-4 py-3 text-center">
								<button
									onclick={() => toggleSort('record')}
									class="inline-flex items-center gap-1 text-xs font-extrabold tracking-widest uppercase transition-colors {sortColumn ===
									'record'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Record {#if sortColumn === 'record'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th class="px-4 py-3 text-center">
								<button
									onclick={() => toggleSort('events')}
									class="inline-flex items-center gap-1 text-xs font-extrabold tracking-widest uppercase transition-colors {sortColumn ===
									'events'
										? 'text-ink'
										: 'text-fade hover:text-ink'}"
								>
									Events {#if sortColumn === 'events'}<span
											>{sortDirection === 'desc' ? '↓' : '↑'}</span
										>{/if}
								</button>
							</th>
							<th class="px-4 py-3 text-center">
								<button
									onclick={() => toggleSort('top8')}
									class="inline-flex items-center gap-1 text-xs font-extrabold tracking-widest uppercase transition-colors {sortColumn ===
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
								class="px-4 py-3 text-center text-xs font-extrabold tracking-widest text-fade uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody>
						{#each paginatedAdminStandings as standing (standing.id)}
							<tr class="border-b border-line2 transition-colors hover:bg-paper">
								<td class="px-4 py-3.5 text-xs font-medium text-fade">{standing.season}</td>
								<td class="px-4 py-3.5">
									<span
										class="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-medium whitespace-nowrap text-ink text-soft capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {circuitChip(
											standing.circuit
										)}"
									>
										{standing.circuit}
									</span>
								</td>
								<td class="px-4 py-3.5">
									<div class="font-newsreader text-base font-semibold">{standing.playerName}</div>
									{#if standing.gemId}
										<div class="mt-0.5 text-xs font-medium text-warm">
											{standing.gemId}
										</div>
									{:else}
										<div class="text-xs text-fade">No GEM ID</div>
									{/if}
								</td>
								<td class="px-4 py-3.5 text-center text-lg font-semibold text-prem tabular-nums">
									{standing.totalPoints || 0}
								</td>
								<td class="px-4 py-3.5 text-center text-sm font-semibold text-ink tabular-nums">
									{standing.winPercentage ? `${standing.winPercentage}%` : '—'}
								</td>
								<td class="px-4 py-3.5 text-center">
									<span class="text-sm font-semibold tabular-nums">
										<span class="text-prem">{standing.matchesWon || 0}</span><span class="text-fade"
											>·</span
										><span class="text-warm"
											>{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span
										>
									</span>
								</td>
								<td class="px-4 py-3.5 text-center text-sm font-semibold text-ink tabular-nums">
									{calculateDerivedStats(standing).eventsPlayed}
								</td>
								<td class="px-4 py-3.5 text-center text-sm font-semibold text-ink tabular-nums">
									{calculateDerivedStats(standing).top8Finishes}
								</td>
								<td class="px-4 py-3.5 text-center">
									<div class="inline-flex items-center justify-center gap-2">
										{#if standing.gemId}
											<a
												href="/player/{standing.gemId}"
												class="inline-flex h-8 shrink-0 items-center border border-line2 px-3 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
												title="Edit on player profile page"
											>
												Edit
											</a>
										{:else}
											<span class="text-xs text-fade">No GEM ID</span>
										{/if}
										<button
											type="button"
											onclick={() => openDeleteModal(standing)}
											class="inline-flex h-8 shrink-0 items-center px-2 text-xs font-extrabold tracking-widest text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40"
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
									<p class="font-newsreader text-soft text-xl italic">
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
					class="flex flex-col items-center justify-between gap-4 border-t border-line2 px-5 py-3.5 sm:flex-row"
				>
					<span class="text-xs text-fade">
						{(adminStandingsPage - 1) * adminStandingsPerPage + 1}–{Math.min(
							adminStandingsPage * adminStandingsPerPage,
							filteredStandings.length
						)} of {filteredStandings.length}
					</span>
					<div class="flex items-center gap-2">
						<button
							onclick={() => (adminStandingsPage = 1)}
							disabled={adminStandingsPage === 1}
							class="border border-line2 px-3 py-1.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
						>
							First
						</button>
						<button
							onclick={() => (adminStandingsPage = Math.max(1, adminStandingsPage - 1))}
							disabled={adminStandingsPage === 1}
							class="border border-line2 px-3 py-1.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
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
										class="h-7 w-7 text-xs font-extrabold tracking-wider transition-colors {adminStandingsPage ===
										pageNum
											? 'bg-ink text-paper-bg'
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
							class="border border-line2 px-3 py-1.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Next page"
						>
							→
						</button>
						<button
							onclick={() => (adminStandingsPage = totalAdminStandingsPages)}
							disabled={adminStandingsPage === totalAdminStandingsPages}
							class="border border-line2 px-3 py-1.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
						>
							Last
						</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="mt-6 border border-line2 p-4">
			<span class="text-xs font-extrabold tracking-widest text-fade uppercase">Player Profiles</span
			>
			<p class="mt-1.5 text-sm leading-normal text-soft">
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
		<div class="relative w-full max-w-lg border border-t-3 border-line2 border-t-ink bg-paper-bg">
			<div class="flex items-start justify-between gap-3 border-b border-line2 p-6">
				<div>
					<span class="text-xs font-extrabold tracking-widest text-warm uppercase"
						>New Standing</span
					>
					<h2 class="mt-1.5 font-newsreader text-2xl font-semibold tracking-normal">
						Add a player.
					</h2>
				</div>
				<button
					onclick={() => {
						showCreateStandingModal = false;
						resetNewStanding();
					}}
					class="inline-flex h-8 w-8 items-center justify-center border border-line2 text-sm font-bold transition-colors hover:border-ink"
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
				class="space-y-4.5 p-6"
			>
				<div class="grid grid-cols-2 gap-3.5">
					<div>
						<label
							for="season"
							class="mb-2 block text-xs font-extrabold tracking-widest text-fade uppercase"
							>Season <span class="text-warm">*</span></label
						>
						<select
							id="season"
							name="season"
							bind:value={newStanding.season}
							required
							class="h-10 w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-sm text-ink focus:border-ink focus:ring-0"
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
							class="mb-2 block text-xs font-extrabold tracking-widest text-fade uppercase"
							>Circuit <span class="text-warm">*</span></label
						>
						<select
							id="circuit"
							name="circuit"
							bind:value={newStanding.circuit}
							required
							class="h-10 w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-sm text-ink focus:border-ink focus:ring-0"
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
						class="mb-2 block text-xs font-extrabold tracking-widest text-fade uppercase"
						>Player Name <span class="text-warm">*</span></label
					>
					<input
						type="text"
						id="playerName"
						name="playerName"
						bind:value={newStanding.playerName}
						required
						placeholder="Enter player name"
						class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
				</div>

				<div>
					<label
						for="gemId"
						class="mb-2 block text-xs font-extrabold tracking-widest text-fade uppercase"
						>GEM ID</label
					>
					<input
						type="text"
						id="gemId"
						name="gemId"
						bind:value={newStanding.gemId}
						placeholder="Optional — for linking to player profile"
						class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
				</div>

				<div>
					<label
						for="totalPoints"
						class="mb-2 block text-xs font-extrabold tracking-widest text-fade uppercase"
						>Total Points</label
					>
					<input
						type="number"
						id="totalPoints"
						name="totalPoints"
						bind:value={newStanding.totalPoints}
						min="0"
						class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3.5">
					<div>
						<label
							for="matchesWon"
							class="mb-2 block text-xs font-extrabold tracking-widest text-fade uppercase"
							>Matches Won</label
						>
						<input
							type="number"
							id="matchesWon"
							name="matchesWon"
							bind:value={newStanding.matchesWon}
							min="0"
							class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
						/>
					</div>
					<div>
						<label
							for="matchesPlayed"
							class="mb-2 block text-xs font-extrabold tracking-widest text-fade uppercase"
							>Matches Played</label
						>
						<input
							type="number"
							id="matchesPlayed"
							name="matchesPlayed"
							bind:value={newStanding.matchesPlayed}
							min="0"
							class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
						/>
					</div>
				</div>

				{#if newStanding.matchesPlayed > 0}
					<div class="border border-line2 bg-paper p-3">
						<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
							>Win Percentage</span
						>
						<div class="mt-0.5 text-xl font-semibold text-prem tabular-nums">
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
						class="inline-flex items-center border border-line2 px-4.5 py-3 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="inline-flex h-10 shrink-0 items-center bg-prem px-4 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
		<div class="w-full max-w-md border border-t-3 border-line2 border-t-ink bg-paper-bg p-6">
			<span class="text-xs font-extrabold tracking-widest text-hero-rb uppercase">Danger Zone</span>
			<h3 class="mt-1.5 font-newsreader text-2xl font-semibold tracking-normal">
				Delete standing record?
			</h3>
			<p class="mt-3 text-sm leading-normal text-soft">This cannot be undone.</p>

			<div class="mt-4 border border-line2 bg-paper p-4 text-center">
				<p class="font-newsreader text-lg font-semibold">{deleteStandingData.playerName}</p>
				{#if deleteStandingData.gemId}
					<p class="mt-0.5 text-xs font-medium text-warm">
						{deleteStandingData.gemId}
					</p>
				{/if}
				<p class="mt-1.5 text-xs text-fade">
					{deleteStandingData.season} · {deleteStandingData.circuit}
				</p>
			</div>

			<div class="mt-4.5">
				<label
					for="delete-confirmation"
					class="mb-2 block text-xs font-extrabold tracking-widest text-fade uppercase"
				>
					Type <span class="text-warm">"{deleteStandingData.playerName}"</span> to confirm
				</label>
				<input
					type="text"
					id="delete-confirmation"
					bind:value={deleteConfirmationInput}
					placeholder="Enter player name"
					class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					autocomplete="off"
				/>
			</div>

			<div class="mt-5.5 flex justify-end gap-3">
				<button
					type="button"
					onclick={closeDeleteModal}
					class="inline-flex h-10 shrink-0 items-center gap-2 border border-line2 px-4 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
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
						class="inline-flex h-10 shrink-0 items-center bg-hero-rb px-4 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{isDeleting ? 'Deleting…' : 'Delete Standing'}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
