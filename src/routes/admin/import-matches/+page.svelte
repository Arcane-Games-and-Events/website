<script>
	let { data, form } = $props();

	let selectedEventKey = $state(null);
	let pairingsFile = $state(null);
	let heroesFile = $state(null);
	let uploadMode = $state('matches'); // 'matches' or 'heroes'

	function selectEvent(year, circuit, month) {
		selectedEventKey = `${year}|${circuit}|${month}`;
	}

	function getEventKey(eventData) {
		return `${eventData.season}|${eventData.circuit}|${eventData.month}`;
	}

	// Find selected event across all circuits
	let selectedEvent = $derived.by(() => {
		if (!selectedEventKey) return null;
		for (const circuit of data.circuitGroups) {
			const found = circuit.events.find((e) => getEventKey(e) === selectedEventKey);
			if (found) return found;
		}
		return null;
	});
</script>

<svelte:head>
	<title>Import Match History - Admin</title>
</svelte:head>

<div class="px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<!-- Page Header -->
		<div
			class="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-teal-900/30 via-gray-900 to-gray-950 p-6 shadow-2xl shadow-teal-500/5"
		>
			<!-- Decorative elements -->
			<div
				class="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl"
			></div>
			<div
				class="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"
			></div>

			<div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-4">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25"
					>
						<svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
							/>
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-bold text-white sm:text-3xl">Import Match History</h1>
						<p class="mt-1 text-gray-400">Import pairings data for AGE Circuit events</p>
					</div>
				</div>

				<!-- Stats -->
				<div
					class="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
				>
					<div class="text-center">
						<p class="text-xl font-bold text-white">{data.totalEvents}</p>
						<p class="text-xs text-gray-400">Events</p>
					</div>
					<div class="h-8 w-px bg-white/10"></div>
					<div class="text-center">
						<p class="text-xl font-bold text-green-400">{data.eventsWithMatches}</p>
						<p class="text-xs text-gray-400">Matches</p>
					</div>
					<div class="text-center">
						<p class="text-xl font-bold text-red-400">{data.eventsMissingMatches}</p>
						<p class="text-xs text-gray-400">Missing</p>
					</div>
					<div class="h-8 w-px bg-white/10"></div>
					<div class="text-center">
						<p class="text-xl font-bold text-purple-400">{data.eventsWithHeroes}</p>
						<p class="text-xs text-gray-400">Heroes</p>
					</div>
					<div class="text-center">
						<p class="text-xl font-bold text-orange-400">{data.eventsMissingHeroes}</p>
						<p class="text-xs text-gray-400">Missing</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Success/Error Messages -->
		{#if form?.success}
			<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
				<p class="text-green-400">{form.message}</p>
			</div>
		{/if}
		{#if form?.error}
			<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
				<p class="text-red-400">{form.error}</p>
			</div>
		{/if}

		<!-- Circuits Grid -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each data.circuitGroups as circuit}
				<div class="overflow-hidden rounded-xl border border-white/10 bg-gray-900/50">
					<!-- Circuit Header -->
					<div class="border-b border-white/10 bg-gray-800/50 px-5 py-4">
						<div class="flex items-center justify-between">
							<div>
								<h2 class="text-lg font-semibold text-white">{circuit.name}</h2>
								<p class="text-xs text-gray-500">{circuit.totalPlayers} players in standings</p>
							</div>
							<div class="flex flex-col items-end gap-1">
								<div class="flex items-center gap-2 text-sm">
									<span class="text-xs text-gray-500">Matches:</span>
									<span
										class="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400"
										>{circuit.eventsWithMatches}</span
									>
									<span
										class="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
										>{circuit.eventsMissing}</span
									>
								</div>
								<div class="flex items-center gap-2 text-sm">
									<span class="text-xs text-gray-500">Heroes:</span>
									<span
										class="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400"
										>{circuit.eventsWithHeroes}</span
									>
									<span
										class="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400"
										>{circuit.eventsMissingHeroes}</span
									>
								</div>
							</div>
						</div>
						{#if circuit.totalMatches > 0}
							<p class="mt-2 text-xs text-gray-500">
								{circuit.totalMatches.toLocaleString()} total matches imported
							</p>
						{/if}
					</div>

					<!-- Events List -->
					<div class="divide-y divide-white/5">
						{#each circuit.events as eventData (getEventKey(eventData))}
							<button
								type="button"
								class="w-full px-5 py-3.5 text-left transition-all hover:bg-white/5
									{selectedEventKey === getEventKey(eventData)
									? 'border-l-2 border-teal-500 bg-teal-500/10'
									: 'border-l-2 border-transparent'}"
								onclick={() => selectEvent(eventData.season, eventData.circuit, eventData.month)}
							>
								<div class="flex items-center justify-between">
									<div class="min-w-0 flex-1">
										<h3 class="truncate font-medium text-white">{eventData.title}</h3>
										<p class="text-xs text-gray-500">
											{eventData.month}
											{eventData.season}
											{#if eventData.playerCount > 0}
												&middot; {eventData.playerCount} players
											{/if}
										</p>
									</div>
									<div class="ml-3 flex shrink-0 flex-col items-end gap-1">
										<!-- Match status -->
										{#if eventData.matchCount > 0}
											<span
												class="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400"
											>
												{eventData.matchCount} matches
											</span>
										{:else}
											<span
												class="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
											>
												No matches
											</span>
										{/if}
										<!-- Hero status -->
										{#if eventData.heroCount > 0}
											<span
												class="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400"
											>
												{eventData.heroCount} heroes
											</span>
										{:else}
											<span
												class="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400"
											>
												No heroes
											</span>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Import Form (shows when event selected) -->
		{#if selectedEventKey && selectedEvent}
			<div
				class="fixed right-0 bottom-0 left-0 z-40 border-t border-white/10 bg-gray-950/95 shadow-2xl backdrop-blur-sm lg:left-64"
			>
				<div class="mx-auto max-w-5xl p-4">
					<!-- Event Info Header -->
					<div class="mb-3 flex items-start justify-between">
						<div>
							<h3 class="text-lg font-semibold text-white">{selectedEvent.title}</h3>
							<p class="text-sm text-gray-400">
								{selectedEvent.circuit} &middot; {selectedEvent.month}
								{selectedEvent.season}
								&middot; {selectedEvent.playerCount} players in standings
							</p>
						</div>
						<button
							type="button"
							onclick={() => (selectedEventKey = null)}
							class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
							aria-label="Close event panel"
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

					<!-- Upload Mode Toggle -->
					<div class="mb-3 flex gap-2">
						<button
							type="button"
							onclick={() => (uploadMode = 'matches')}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-all
								{uploadMode === 'matches'
								? 'bg-teal-600 text-white'
								: 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}"
						>
							Import Matches
						</button>
						<button
							type="button"
							onclick={() => (uploadMode = 'heroes')}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-all
								{uploadMode === 'heroes'
								? 'bg-purple-600 text-white'
								: 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}"
						>
							Import Heroes
						</button>
					</div>

					{#if uploadMode === 'matches'}
						<!-- Matches CSV Format Info -->
						<div class="mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
							<p class="mb-1 text-xs font-medium text-gray-400">
								Expected CSV columns from GEM Pairings export:
							</p>
							<p class="font-mono text-xs text-gray-500">
								Round, Table, Player 1 Name, Player 1 GEM ID, Player 2 Name, Player 2 GEM ID, Result
							</p>
							<p class="mt-1 text-xs text-gray-500">
								Result values: "1WIN" or "Player 1 Wins", "2WIN" or "Player 2 Wins", or empty for
								draw
							</p>
						</div>

						<!-- Matches Upload Form -->
						<form
							method="POST"
							action="?/importMatches"
							enctype="multipart/form-data"
							class="flex items-center gap-4"
						>
							<input type="hidden" name="eventCircuit" value={selectedEvent.circuit} />
							<input type="hidden" name="eventMonth" value={selectedEvent.month} />
							<input type="hidden" name="eventSeason" value={selectedEvent.season} />

							{#if selectedEvent.matchCount > 0}
								<div class="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
									<p class="text-xs text-yellow-400">
										<strong>Warning:</strong> This will replace {selectedEvent.matchCount} existing matches
									</p>
								</div>
							{/if}

							<div class="flex-1">
								<input
									type="file"
									id="pairings"
									name="pairings"
									accept=".csv"
									required
									bind:files={pairingsFile}
									class="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-100
										file:mr-3 file:rounded file:border-0 file:bg-teal-600 file:px-3
										file:py-1 file:text-sm file:font-semibold file:text-white"
								/>
							</div>

							<button
								type="submit"
								class="rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-2 font-semibold whitespace-nowrap text-white shadow-lg shadow-teal-500/25 transition-all hover:from-teal-500 hover:to-cyan-500"
							>
								Import Matches
							</button>
						</form>
					{:else}
						<!-- Heroes CSV Format Info -->
						<div class="mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
							<p class="mb-1 text-xs font-medium text-gray-400">
								Expected CSV columns for hero data:
							</p>
							<p class="font-mono text-xs text-gray-500">
								Name, Hero, GEM ID (optional), Country/Region (optional)
							</p>
							<p class="mt-1 text-xs text-gray-500">
								Each row should represent one player and their hero for this event
							</p>
						</div>

						<!-- Heroes Upload Form -->
						<form
							method="POST"
							action="?/importHeroes"
							enctype="multipart/form-data"
							class="flex items-center gap-4"
						>
							<input type="hidden" name="eventCircuit" value={selectedEvent.circuit} />
							<input type="hidden" name="eventMonth" value={selectedEvent.month} />
							<input type="hidden" name="eventSeason" value={selectedEvent.season} />

							{#if selectedEvent.heroCount > 0}
								<div class="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
									<p class="text-xs text-yellow-400">
										<strong>Warning:</strong> This will replace {selectedEvent.heroCount} existing hero
										entries
									</p>
								</div>
							{/if}

							<div class="flex-1">
								<input
									type="file"
									id="heroes"
									name="heroes"
									accept=".csv"
									required
									bind:files={heroesFile}
									class="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-100
										file:mr-3 file:rounded file:border-0 file:bg-purple-600 file:px-3
										file:py-1 file:text-sm file:font-semibold file:text-white"
								/>
							</div>

							<button
								type="submit"
								class="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 font-semibold whitespace-nowrap text-white shadow-lg shadow-purple-500/25 transition-all hover:from-purple-500 hover:to-pink-500"
							>
								Import Heroes
							</button>
						</form>
					{/if}
				</div>
			</div>
			<!-- Spacer to prevent content from being hidden behind fixed footer -->
			<div class="h-56"></div>
		{:else if data.circuitGroups.length === 0}
			<div class="mt-8 rounded-xl border border-white/10 bg-gray-900/50 p-12 text-center">
				<svg
					class="mx-auto mb-4 h-12 w-12 text-gray-600"
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
				<p class="text-gray-400">No circuit events found in standings data</p>
			</div>
		{/if}
	</div>
</div>
