<script>
	let { data, form } = $props();

	let selectedEventKey = $state(null);
	let pairingsFile = $state(null);

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
			const found = circuit.events.find(e => getEventKey(e) === selectedEventKey);
			if (found) return found;
		}
		return null;
	});
</script>

<svelte:head>
	<title>Import Match History - Admin</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-7xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-white">Import Match History</h1>
		<p class="text-gray-400 mt-2">Import pairings data for AGE Circuit events (derived from standings data)</p>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="rounded-lg bg-green-500/10 border border-green-500/30 p-4 mb-6">
			<p class="text-green-400">{form.message}</p>
		</div>
	{/if}
	{#if form?.error}
		<div class="rounded-lg bg-red-500/10 border border-red-500/30 p-4 mb-6">
			<p class="text-red-400">{form.error}</p>
		</div>
	{/if}

	<!-- Stats -->
	<div class="flex gap-4 mb-6">
		<div class="text-center px-4">
			<p class="text-2xl font-bold text-white">{data.totalEvents}</p>
			<p class="text-xs text-gray-400">Total Events</p>
		</div>
		<div class="text-center px-4 border-l border-gray-700">
			<p class="text-2xl font-bold text-green-400">{data.eventsWithMatches}</p>
			<p class="text-xs text-gray-400">Have Data</p>
		</div>
		<div class="text-center px-4 border-l border-gray-700">
			<p class="text-2xl font-bold text-red-400">{data.eventsMissingMatches}</p>
			<p class="text-xs text-gray-400">Missing</p>
		</div>
	</div>

	<!-- Circuits Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		{#each data.circuitGroups as circuit}
			<div class="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
				<!-- Circuit Header -->
				<div class="bg-gray-900 px-4 py-3 border-b border-gray-800">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold text-white">{circuit.name}</h2>
							<p class="text-xs text-gray-500">{circuit.totalPlayers} players in standings</p>
						</div>
						<div class="flex gap-3 text-sm">
							<span class="text-green-400">{circuit.eventsWithMatches} done</span>
							<span class="text-gray-500">|</span>
							<span class="text-red-400">{circuit.eventsMissing} missing</span>
						</div>
					</div>
					{#if circuit.totalMatches > 0}
						<p class="text-xs text-gray-500 mt-1">{circuit.totalMatches.toLocaleString()} total matches imported</p>
					{/if}
				</div>

				<!-- Events List -->
				<div class="divide-y divide-gray-800">
					{#each circuit.events as eventData (getEventKey(eventData))}
						<button
							type="button"
							class="w-full px-4 py-3 text-left transition-colors hover:bg-gray-800/50
								{selectedEventKey === getEventKey(eventData) ? 'bg-blue-900/20 border-l-2 border-blue-500' : ''}"
							onclick={() => selectEvent(eventData.season, eventData.circuit, eventData.month)}
						>
							<div class="flex items-center justify-between">
								<div class="min-w-0 flex-1">
									<h3 class="font-medium text-white truncate">{eventData.title}</h3>
									<p class="text-xs text-gray-500">
										{eventData.month} {eventData.season}
										{#if eventData.playerCount > 0}
											&middot; {eventData.playerCount} players
										{/if}
									</p>
								</div>
								<div class="ml-3 flex-shrink-0 flex items-center gap-2">
									{#if eventData.matchCount > 0}
										<span class="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
											{eventData.matchCount} matches
										</span>
									{:else}
										<span class="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
											No data
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
		<div class="fixed bottom-0 left-0 right-0 lg:left-64 bg-gray-950 border-t border-gray-700 shadow-2xl">
			<div class="container mx-auto max-w-5xl p-4">
				<!-- Event Info Header -->
				<div class="flex items-start justify-between mb-3">
					<div>
						<h3 class="text-lg font-semibold text-white">{selectedEvent.title}</h3>
						<p class="text-sm text-gray-400">
							{selectedEvent.circuit} &middot; {selectedEvent.month} {selectedEvent.season}
							&middot; {selectedEvent.playerCount} players in standings
						</p>
					</div>
					<button
						type="button"
						onclick={() => selectedEventKey = null}
						class="text-gray-400 hover:text-white p-1"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- CSV Format Info -->
				<div class="bg-gray-900/50 border border-gray-800 rounded-lg p-3 mb-3">
					<p class="text-xs text-gray-400 mb-1 font-medium">Expected CSV columns from GEM Pairings export:</p>
					<p class="text-xs text-gray-500 font-mono">Round, Table, Player 1 Name, Player 1 GEM ID, Player 2 Name, Player 2 GEM ID, Result</p>
					<p class="text-xs text-gray-500 mt-1">Result values: "1WIN" or "Player 1 Wins", "2WIN" or "Player 2 Wins", or empty for draw</p>
				</div>

				<!-- Upload Form -->
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
						<div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
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
							class="w-full text-sm rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100
								file:mr-3 file:py-1 file:px-3 file:rounded file:border-0
								file:text-sm file:font-semibold file:bg-blue-600 file:text-white"
						/>
					</div>

					<button
						type="submit"
						class="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-semibold transition-colors whitespace-nowrap"
					>
						Import Matches
					</button>
				</form>
			</div>
		</div>
		<!-- Spacer to prevent content from being hidden behind fixed footer -->
		<div class="h-48"></div>
	{:else if data.circuitGroups.length === 0}
		<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 text-center">
			<p class="text-gray-400">No circuit events found in standings data</p>
		</div>
	{/if}
</div>
