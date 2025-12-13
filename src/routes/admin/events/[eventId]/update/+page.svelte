<script>
	export let data;
	export let form;

	let activeTab = 'import';
	let showResultForm = false;
	let showDecklistForm = false;
	let editingResult = null;
	let editingDecklist = null;

	// Result form state
	let resultForm = {
		playerName: '',
		gemId: '',
		userId: '',
		placement: 1,
		wins: 0,
		losses: 0,
		draws: 0,
		agePoints: 0,
		prizeAmount: ''
	};

	// Decklist form state
	let decklistForm = {
		playerName: '',
		gemId: '',
		userId: '',
		deckName: '',
		hero: '',
		format: data.event.format || '',
		placement: '',
		cardsText: '',
		isPublic: true
	};

	// AGE Open points presets based on placement
	const agePointsPresets = {
		1: 30,
		2: 25,
		3: 20,
		4: 20,
		5: 15,
		6: 15,
		7: 15,
		8: 15,
		9: 12,
		10: 12,
		11: 12,
		12: 12,
		13: 8,
		14: 8,
		15: 8,
		16: 8
	};

	// Prize presets
	const prizePresets = {
		1: 400,
		2: 200,
		3: 100,
		4: 100,
		5: 50,
		6: 50,
		7: 50,
		8: 50
	};

	// CSV Import state
	let swissStandingsFile = null;
	let pairingsFile = null;
	let csvProcessing = false;

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function startNewResult() {
		editingResult = null;
		resultForm = {
			playerName: '',
			gemId: '',
			userId: '',
			placement: (data.existingResults?.length || 0) + 1,
			wins: 0,
			losses: 0,
			draws: 0,
			agePoints: agePointsPresets[(data.existingResults?.length || 0) + 1] || 1,
			prizeAmount: prizePresets[(data.existingResults?.length || 0) + 1] || ''
		};
		showResultForm = true;
	}

	function editResult(result) {
		editingResult = result;
		resultForm = {
			playerName: result.playerName,
			gemId: result.gemId || '',
			userId: result.userId || '',
			placement: result.placement,
			wins: result.wins || 0,
			losses: result.losses || 0,
			draws: result.draws || 0,
			agePoints: result.agePoints || 0,
			prizeAmount: result.prizeAmount || ''
		};
		showResultForm = true;
	}

	function cancelResultForm() {
		showResultForm = false;
		editingResult = null;
	}

	function startNewDecklist() {
		editingDecklist = null;
		decklistForm = {
			playerName: '',
			gemId: '',
			userId: '',
			deckName: '',
			hero: '',
			format: data.event.format || '',
			placement: '',
			cardsText: '',
			isPublic: true
		};
		showDecklistForm = true;
	}

	function editDecklist(decklist) {
		editingDecklist = decklist;
		// Convert cards array back to text format
		const cardsText = decklist.cards.map((c) => `${c.quantity}x ${c.name}`).join('\n');
		decklistForm = {
			playerName: decklist.playerName,
			gemId: decklist.gemId || '',
			userId: decklist.userId || '',
			deckName: decklist.deckName || '',
			hero: decklist.hero || '',
			format: decklist.format || '',
			placement: decklist.placement ?? '',
			cardsText,
			isPublic: decklist.isPublic
		};
		showDecklistForm = true;
	}

	function cancelDecklistForm() {
		showDecklistForm = false;
		editingDecklist = null;
	}

	function parseCardsText(text) {
		// Parse cards from text format: "3x Card Name" or "3 Card Name"
		const lines = text.split('\n').filter((line) => line.trim());
		return lines.map((line) => {
			const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
			if (match) {
				return { quantity: parseInt(match[1]), name: match[2].trim() };
			}
			// If no quantity specified, assume 1
			return { quantity: 1, name: line.trim() };
		});
	}

	function selectParticipant(participant, formType) {
		if (formType === 'result') {
			resultForm.playerName = participant.playerName;
			resultForm.gemId = participant.gemId || '';
			resultForm.userId = participant.userId || '';
		} else {
			decklistForm.playerName = participant.playerName;
			decklistForm.gemId = participant.gemId || '';
			decklistForm.userId = participant.userId || '';
		}
	}

	function updateAgePoints() {
		resultForm.agePoints = agePointsPresets[resultForm.placement] || 1;
		resultForm.prizeAmount = prizePresets[resultForm.placement] || '';
	}

	// Sort results by placement
	$: sortedResults = [...(data.existingResults || [])].sort((a, b) => a.placement - b.placement);

	// Check if event is closed
	$: isCompleted = data.event.status === 'completed';
	$: isInProgress = data.event.status === 'in_progress';
	$: hasResults = (data.existingResults?.length || 0) > 0;
</script>

<svelte:head>
	<title>Tournament Update - {data.event.title}</title>
</svelte:head>

<div class="px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<!-- Back Link -->
		<div class="mb-4">
			<a
				href="/admin/events/{data.event.id}"
				class="group inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
			>
				<svg
					class="h-4 w-4 transition-transform group-hover:-translate-x-1"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Back to Event
			</a>
		</div>

		<!-- Header -->
		<div
			class="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/30 via-gray-900 to-gray-950 p-6 shadow-2xl shadow-indigo-500/5"
		>
			<!-- Decorative elements -->
			<div
				class="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
			></div>
			<div
				class="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl"
			></div>

			<div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-4">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25"
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
						<h1 class="text-2xl font-bold text-white sm:text-3xl">{data.event.title}</h1>
						<p class="mt-1 text-gray-400">Tournament Update - {formatDate(data.event.eventDate)}</p>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<!-- Event Status Badge -->
					{#if isCompleted}
						<span
							class="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1.5 text-sm font-medium text-green-400"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Finalized
						</span>
					{:else if isInProgress}
						<span
							class="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1.5 text-sm font-medium text-blue-400"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							In Progress
						</span>
					{:else}
						<span
							class="inline-flex items-center gap-2 rounded-full bg-yellow-500/20 px-3 py-1.5 text-sm font-medium text-yellow-400"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Upcoming
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Success/Error Messages -->
		{#if form?.success}
			<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
				<div class="flex items-center gap-3">
					<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-sm text-green-400">{form.message}</p>
				</div>
				{#if form.details}
					<ul class="mt-2 ml-8 list-inside list-disc text-sm text-green-300">
						<li>Players updated: {form.details.playersUpdated}</li>
						<li>New players added: {form.details.playersCreated}</li>
						{#if form.details.errors?.length > 0}
							<li class="text-red-400">Errors: {form.details.errors.length}</li>
						{/if}
					</ul>
				{/if}
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
				<div class="flex items-center gap-3">
					<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-sm text-red-400">{form.error}</p>
				</div>
			</div>
		{/if}

		<!-- Tabs -->
		<div
			class="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-gray-900/50 p-1"
		>
			<button
				on:click={() => (activeTab = 'import')}
				class="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all {activeTab ===
				'import'
					? 'bg-indigo-500/20 text-indigo-400'
					: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
			>
				Import CSV
			</button>
			<button
				on:click={() => (activeTab = 'results')}
				class="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all {activeTab ===
				'results'
					? 'bg-indigo-500/20 text-indigo-400'
					: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
			>
				Results ({data.existingResults?.length || 0})
			</button>
			<button
				on:click={() => (activeTab = 'decklists')}
				class="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all {activeTab ===
				'decklists'
					? 'bg-indigo-500/20 text-indigo-400'
					: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
			>
				Decklists ({data.existingDecklists?.length || 0})
			</button>
			<button
				on:click={() => (activeTab = 'finalize')}
				class="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all {activeTab ===
				'finalize'
					? 'bg-indigo-500/20 text-indigo-400'
					: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
			>
				Finalize
			</button>
		</div>

		<!-- CSV Import Tab -->
		{#if activeTab === 'import'}
			<div class="mx-auto max-w-3xl space-y-6">
				<div class="rounded-xl border bg-gray-950 p-8 shadow-md">
					<h2 class="mb-2 text-2xl font-bold text-white">Import Tournament Results</h2>
					<p class="mb-6 text-gray-400">
						Upload CSV files from your tournament software to automatically calculate standings and
						distribute AGE points.
					</p>

					{#if isCompleted}
						<div class="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
							<p class="text-sm text-yellow-400">
								This event is finalized. Reopen the event to import new results.
							</p>
						</div>
					{:else}
						<form
							method="POST"
							action="?/processCSV"
							enctype="multipart/form-data"
							class="space-y-6"
						>
							<div>
								<label for="swissStandings" class="mb-2 block text-sm font-medium text-gray-100">
									Swiss Standings CSV *
								</label>
								<p class="mb-2 text-xs text-gray-400">
									Expected columns: Rank, Name, Player ID, Wins
								</p>
								<input
									type="file"
									id="swissStandings"
									name="swissStandings"
									accept=".csv"
									required
									bind:files={swissStandingsFile}
									class="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-gray-100 file:mr-4 file:rounded file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-900 hover:file:opacity-90"
								/>
							</div>

							<div>
								<label for="pairings" class="mb-2 block text-sm font-medium text-gray-100">
									Pairings CSV *
								</label>
								<p class="mb-2 text-xs text-gray-400">
									Expected columns: Round, Table, Player 1 Name, Player 1 ID, Player 2 Name, Player
									2 ID, Result
								</p>
								<input
									type="file"
									id="pairings"
									name="pairings"
									accept=".csv"
									required
									bind:files={pairingsFile}
									class="w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-gray-100 file:mr-4 file:rounded file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-900 hover:file:opacity-90"
								/>
							</div>

							<div class="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
								<h3 class="mb-2 font-semibold text-blue-400">What will be calculated:</h3>
								<ul class="list-inside list-disc space-y-1 text-sm text-gray-300">
									<li>Top 8 bracket results from elimination rounds</li>
									<li>Final standings with tiebreakers</li>
									<li>AGE Points distribution (30, 25, 20, 15, 12, 8, 1)</li>
									<li>Prize distribution ($400, $200, $100, $50)</li>
								</ul>
							</div>

							<div class="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
								<p class="text-sm text-yellow-400">
									<strong>Note:</strong> This will replace any existing results for this event. Make
									sure you have the correct CSV files before proceeding.
								</p>
							</div>

							<button
								type="submit"
								disabled={csvProcessing}
								class="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-lg font-semibold text-gray-900 transition-opacity hover:opacity-90 disabled:opacity-50"
							>
								{csvProcessing ? 'Processing...' : 'Process CSV Files'}
							</button>
						</form>
					{/if}

					{#if form?.processedResults}
						<div class="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
							<h3 class="mb-2 font-semibold text-green-400">Results Processed Successfully!</h3>
							<ul class="space-y-1 text-sm text-gray-300">
								<li>Total Players: {form.processedResults.totalPlayers}</li>
								<li>Swiss Rounds: {form.processedResults.swissRounds}</li>
								<li>Top 8: {form.processedResults.top8Players} players</li>
								{#if form.processedResults.winner}
									<li>
										Winner: <span class="font-semibold text-yellow-400"
											>{form.processedResults.winner.name}</span
										>
									</li>
								{/if}
								<li>Total Points Distributed: {form.processedResults.totalPointsDistributed}</li>
								<li>Total Prize Pool: ${form.processedResults.totalPrizeDistributed}</li>
							</ul>
							<p class="mt-4 text-sm text-gray-400">
								Switch to the <button
									on:click={() => (activeTab = 'results')}
									class="text-blue-400 hover:underline">Results tab</button
								>
								to review and edit the imported data, then go to
								<button
									on:click={() => (activeTab = 'finalize')}
									class="text-blue-400 hover:underline">Finalize</button
								> to update standings.
							</p>
						</div>
					{/if}
				</div>

				<!-- AGE Points Structure Reference -->
				<div class="rounded-xl border bg-gray-950 p-6 shadow-md">
					<h3 class="mb-4 text-lg font-semibold text-white">AGE Open Points Structure</h3>
					<div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
						<div class="rounded-lg bg-yellow-500/10 p-3 text-center">
							<p class="text-xl font-bold text-yellow-400">30 pts</p>
							<p class="text-gray-400">1st Place</p>
							<p class="text-green-400">$400</p>
						</div>
						<div class="rounded-lg bg-gray-400/10 p-3 text-center">
							<p class="text-xl font-bold text-gray-300">25 pts</p>
							<p class="text-gray-400">2nd Place</p>
							<p class="text-green-400">$200</p>
						</div>
						<div class="rounded-lg bg-amber-600/10 p-3 text-center">
							<p class="text-xl font-bold text-amber-500">20 pts</p>
							<p class="text-gray-400">3rd-4th Place</p>
							<p class="text-green-400">$100</p>
						</div>
						<div class="rounded-lg bg-gray-800 p-3 text-center">
							<p class="text-xl font-bold text-gray-300">15 pts</p>
							<p class="text-gray-400">5th-8th Place</p>
							<p class="text-green-400">$50</p>
						</div>
						<div class="rounded-lg bg-gray-800 p-3 text-center">
							<p class="text-xl font-bold text-gray-300">12 pts</p>
							<p class="text-gray-400">9th-12th Place</p>
						</div>
						<div class="rounded-lg bg-gray-800 p-3 text-center">
							<p class="text-xl font-bold text-gray-300">8 pts</p>
							<p class="text-gray-400">13th-16th Place</p>
						</div>
						<div class="col-span-2 rounded-lg bg-gray-800 p-3 text-center">
							<p class="text-xl font-bold text-gray-300">1 pt</p>
							<p class="text-gray-400">Participation</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Results Tab -->
		{#if activeTab === 'results'}
			<div class="space-y-6">
				<!-- Add Result Button -->
				{#if !isCompleted}
					<div class="flex justify-end">
						<button
							on:click={startNewResult}
							class="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
						>
							+ Add Result
						</button>
					</div>
				{/if}

				<!-- Result Form Modal -->
				{#if showResultForm}
					<div class="rounded-xl border border-white/10 bg-gray-900 p-6">
						<h3 class="mb-4 text-lg font-semibold text-white">
							{editingResult ? 'Edit Result' : 'Add Result'}
						</h3>

						<!-- Quick Select from Participants -->
						{#if data.participants.length > 0 && !editingResult}
							<div class="mb-4">
								<p class="mb-2 text-sm text-gray-400">Quick select from registered players:</p>
								<div class="flex flex-wrap gap-2">
									{#each data.participants as participant}
										<button
											type="button"
											on:click={() => selectParticipant(participant, 'result')}
											class="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
										>
											{participant.playerName}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<form method="POST" action="?/saveResult" class="space-y-4">
							{#if editingResult}
								<input type="hidden" name="resultId" value={editingResult.id} />
							{/if}
							<input type="hidden" name="userId" value={resultForm.userId} />

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<label for="playerName" class="mb-2 block text-sm font-medium text-gray-100">
										Player Name *
									</label>
									<input
										type="text"
										id="playerName"
										name="playerName"
										required
										bind:value={resultForm.playerName}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="gemId" class="mb-2 block text-sm font-medium text-gray-100">
										GEM ID
									</label>
									<input
										type="text"
										id="gemId"
										name="gemId"
										bind:value={resultForm.gemId}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
								<div>
									<label for="placement" class="mb-2 block text-sm font-medium text-gray-100">
										Placement *
									</label>
									<input
										type="number"
										id="placement"
										name="placement"
										required
										min="1"
										bind:value={resultForm.placement}
										on:change={updateAgePoints}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="wins" class="mb-2 block text-sm font-medium text-gray-100">
										Wins
									</label>
									<input
										type="number"
										id="wins"
										name="wins"
										min="0"
										bind:value={resultForm.wins}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="losses" class="mb-2 block text-sm font-medium text-gray-100">
										Losses
									</label>
									<input
										type="number"
										id="losses"
										name="losses"
										min="0"
										bind:value={resultForm.losses}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="draws" class="mb-2 block text-sm font-medium text-gray-100">
										Draws
									</label>
									<input
										type="number"
										id="draws"
										name="draws"
										min="0"
										bind:value={resultForm.draws}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<label for="agePoints" class="mb-2 block text-sm font-medium text-gray-100">
										AGE Points
									</label>
									<input
										type="number"
										id="agePoints"
										name="agePoints"
										min="0"
										bind:value={resultForm.agePoints}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="prizeAmount" class="mb-2 block text-sm font-medium text-gray-100">
										Prize Amount ($)
									</label>
									<input
										type="number"
										id="prizeAmount"
										name="prizeAmount"
										min="0"
										step="0.01"
										bind:value={resultForm.prizeAmount}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
							</div>

							<div class="flex justify-end gap-3 pt-4">
								<button
									type="button"
									on:click={cancelResultForm}
									class="rounded-xl bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
								>
									Cancel
								</button>
								<button
									type="submit"
									class="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-gray-900 hover:opacity-90"
								>
									Save Result
								</button>
							</div>
						</form>
					</div>
				{/if}

				<!-- Results List -->
				<div class="rounded-xl border bg-gray-950 shadow-md">
					{#if sortedResults.length === 0}
						<div class="p-12 text-center">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								/>
							</svg>
							<p class="mt-4 text-gray-400">No results recorded yet</p>
							{#if !isCompleted}
								<button
									on:click={startNewResult}
									class="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
								>
									Add the first result
								</button>
							{/if}
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-white/10">
										<th class="p-4 text-left font-semibold text-gray-100">Place</th>
										<th class="p-4 text-left font-semibold text-gray-100">Player</th>
										<th class="p-4 text-left font-semibold text-gray-100">GEM ID</th>
										<th class="p-4 text-left font-semibold text-gray-100">Record</th>
										<th class="p-4 text-left font-semibold text-gray-100">AGE Pts</th>
										<th class="p-4 text-left font-semibold text-gray-100">Prize</th>
										{#if !isCompleted}
											<th class="p-4 text-right font-semibold text-gray-100">Actions</th>
										{/if}
									</tr>
								</thead>
								<tbody>
									{#each sortedResults as result}
										<tr class="border-b border-white/10 hover:bg-gray-900">
											<td class="p-4">
												<span
													class="inline-flex h-8 w-8 items-center justify-center rounded-full {result.placement ===
													1
														? 'bg-yellow-500/20 text-yellow-400'
														: result.placement === 2
															? 'bg-gray-400/20 text-gray-300'
															: result.placement === 3
																? 'bg-amber-600/20 text-amber-500'
																: 'bg-gray-800 text-gray-400'} font-bold"
												>
													{result.placement}
												</span>
											</td>
											<td class="p-4 font-medium text-gray-100">{result.playerName}</td>
											<td class="p-4 text-gray-400">{result.gemId || '-'}</td>
											<td class="p-4 text-gray-100"
												>{result.wins}-{result.losses}{result.draws > 0
													? `-${result.draws}`
													: ''}</td
											>
											<td class="p-4 font-medium text-blue-400">{result.agePoints}</td>
											<td class="p-4 text-green-400"
												>{result.prizeAmount ? `$${result.prizeAmount}` : '-'}</td
											>
											{#if !isCompleted}
												<td class="p-4 text-right">
													<div class="flex justify-end gap-2">
														<button
															on:click={() => editResult(result)}
															class="text-gray-400 hover:text-white"
														>
															Edit
														</button>
														<form method="POST" action="?/deleteResult" class="inline">
															<input type="hidden" name="resultId" value={result.id} />
															<button
																type="submit"
																class="text-red-400 hover:text-red-300"
																on:click|preventDefault={(e) => {
																	if (confirm('Delete this result?')) {
																		e.target.closest('form').submit();
																	}
																}}
															>
																Delete
															</button>
														</form>
													</div>
												</td>
											{/if}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Decklists Tab -->
		{#if activeTab === 'decklists'}
			<div class="space-y-6">
				<!-- Add Decklist Button -->
				{#if !isCompleted}
					<div class="flex justify-end">
						<button
							on:click={startNewDecklist}
							class="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
						>
							+ Add Decklist
						</button>
					</div>
				{/if}

				<!-- Decklist Form Modal -->
				{#if showDecklistForm}
					<div class="rounded-xl border border-white/10 bg-gray-900 p-6">
						<h3 class="mb-4 text-lg font-semibold text-white">
							{editingDecklist ? 'Edit Decklist' : 'Add Decklist'}
						</h3>

						<!-- Quick Select from Participants -->
						{#if data.participants.length > 0 && !editingDecklist}
							<div class="mb-4">
								<p class="mb-2 text-sm text-gray-400">Quick select from registered players:</p>
								<div class="flex flex-wrap gap-2">
									{#each data.participants as participant}
										<button
											type="button"
											on:click={() => selectParticipant(participant, 'decklist')}
											class="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
										>
											{participant.playerName}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<form
							method="POST"
							action="?/saveDecklist"
							on:submit|preventDefault={(e) => {
								// Parse cards and add to form
								const cards = parseCardsText(decklistForm.cardsText);
								const formData = new FormData(e.target);
								formData.set('cards', JSON.stringify(cards));

								// Submit via fetch
								fetch(e.target.action, {
									method: 'POST',
									body: formData
								}).then(() => {
									showDecklistForm = false;
									editingDecklist = null;
									location.reload();
								});
							}}
							class="space-y-4"
						>
							{#if editingDecklist}
								<input type="hidden" name="decklistId" value={editingDecklist.id} />
							{/if}
							<input type="hidden" name="userId" value={decklistForm.userId} />
							<input type="hidden" name="isPublic" value={decklistForm.isPublic} />

							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<label for="deckPlayerName" class="mb-2 block text-sm font-medium text-gray-100">
										Player Name *
									</label>
									<input
										type="text"
										id="deckPlayerName"
										name="playerName"
										required
										bind:value={decklistForm.playerName}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="deckGemId" class="mb-2 block text-sm font-medium text-gray-100">
										GEM ID
									</label>
									<input
										type="text"
										id="deckGemId"
										name="gemId"
										bind:value={decklistForm.gemId}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
								<div>
									<label for="deckName" class="mb-2 block text-sm font-medium text-gray-100">
										Deck Name
									</label>
									<input
										type="text"
										id="deckName"
										name="deckName"
										bind:value={decklistForm.deckName}
										placeholder="e.g., Briar Aggro"
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="hero" class="mb-2 block text-sm font-medium text-gray-100">
										Hero
									</label>
									<input
										type="text"
										id="hero"
										name="hero"
										bind:value={decklistForm.hero}
										placeholder="e.g., Briar, Warden of Thorns"
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="deckFormat" class="mb-2 block text-sm font-medium text-gray-100">
										Format
									</label>
									<input
										type="text"
										id="deckFormat"
										name="format"
										bind:value={decklistForm.format}
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
								<div>
									<label for="deckPlacement" class="mb-2 block text-sm font-medium text-gray-100">
										Placement
									</label>
									<input
										type="number"
										id="deckPlacement"
										name="placement"
										bind:value={decklistForm.placement}
										placeholder="e.g., 1"
										min="1"
										class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
								</div>
							</div>

							<div>
								<label for="cardsText" class="mb-2 block text-sm font-medium text-gray-100">
									Cards * (one per line: "3x Card Name" or "3 Card Name")
								</label>
								<textarea
									id="cardsText"
									bind:value={decklistForm.cardsText}
									rows="12"
									required
									placeholder="3x Command and Conquer
2x Art of War
3x Fyendal's Spring Tunic"
									class="w-full rounded-xl border border-white/10 bg-gray-950 px-4 py-2.5 font-mono text-sm text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
								></textarea>
							</div>

							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									id="isPublicCheck"
									bind:checked={decklistForm.isPublic}
									class="h-4 w-4 border-white/10"
								/>
								<label for="isPublicCheck" class="text-sm text-gray-100">
									Make this decklist public
								</label>
							</div>

							<div class="flex justify-end gap-3 pt-4">
								<button
									type="button"
									on:click={cancelDecklistForm}
									class="rounded-xl bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
								>
									Cancel
								</button>
								<button
									type="submit"
									class="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-gray-900 hover:opacity-90"
								>
									Save Decklist
								</button>
							</div>
						</form>
					</div>
				{/if}

				<!-- Decklists List -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#if data.existingDecklists?.length === 0}
						<div class="col-span-full rounded-xl border bg-gray-950 p-12 text-center shadow-md">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
								/>
							</svg>
							<p class="mt-4 text-gray-400">No decklists recorded yet</p>
							{#if !isCompleted}
								<button
									on:click={startNewDecklist}
									class="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
								>
									Add the first decklist
								</button>
							{/if}
						</div>
					{:else}
						{#each data.existingDecklists as decklist}
							<div class="rounded-xl border bg-gray-950 p-4 shadow-md">
								<div class="mb-3 flex items-start justify-between">
									<div>
										<h4 class="font-semibold text-white">{decklist.playerName}</h4>
										{#if decklist.hero}
											<p class="text-sm text-blue-400">{decklist.hero}</p>
										{/if}
									</div>
									{#if !isCompleted}
										<div class="flex gap-2">
											<button
												on:click={() => editDecklist(decklist)}
												class="text-xs text-gray-400 hover:text-white"
											>
												Edit
											</button>
											<form method="POST" action="?/deleteDecklist" class="inline">
												<input type="hidden" name="decklistId" value={decklist.id} />
												<button
													type="submit"
													class="text-xs text-red-400 hover:text-red-300"
													on:click|preventDefault={(e) => {
														if (confirm('Delete this decklist?')) {
															e.target.closest('form').submit();
														}
													}}
												>
													Delete
												</button>
											</form>
										</div>
									{/if}
								</div>
								{#if decklist.deckName}
									<p class="mb-2 text-sm text-gray-400">{decklist.deckName}</p>
								{/if}
								<p class="text-xs text-gray-500">
									{decklist.cards?.length || 0} cards • {decklist.format || 'Unknown format'}
								</p>
								{#if !decklist.isPublic}
									<span class="mt-2 inline-block text-xs text-yellow-500">Private</span>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<!-- Finalize Tab -->
		{#if activeTab === 'finalize'}
			<div class="mx-auto max-w-2xl">
				<div class="rounded-xl border bg-gray-950 p-8 shadow-md">
					<h2 class="mb-6 text-2xl font-bold text-white">Finalize Event</h2>

					{#if isCompleted}
						<div class="py-8 text-center">
							<svg
								class="mx-auto mb-4 h-16 w-16 text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<h3 class="mb-2 text-xl font-semibold text-white">Event Finalized</h3>
							<p class="mb-6 text-gray-400">
								This event was finalized on {formatDate(data.event.closedAt)}. Season standings have
								been updated.
							</p>
							{#if data.isAdmin}
								<form method="POST" action="?/reopenEvent">
									<button
										type="submit"
										class="rounded-xl bg-yellow-500/20 px-6 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/30"
									>
										Reopen Event
									</button>
								</form>
							{/if}
						</div>
					{:else}
						<div class="space-y-6">
							<!-- Summary -->
							<div class="rounded-lg bg-gray-900 p-4">
								<h3 class="mb-2 font-semibold text-white">Summary</h3>
								<ul class="space-y-2 text-sm text-gray-300">
									<li class="flex justify-between">
										<span>Results Recorded:</span>
										<span class="font-medium">{data.existingResults?.length || 0}</span>
									</li>
									<li class="flex justify-between">
										<span>Decklists Recorded:</span>
										<span class="font-medium">{data.existingDecklists?.length || 0}</span>
									</li>
									<li class="flex justify-between">
										<span>Registered Players:</span>
										<span class="font-medium">{data.participants?.length || 0}</span>
									</li>
									<li class="flex justify-between">
										<span>Circuit:</span>
										<span class="font-medium">{data.event.circuit || 'Not set'}</span>
									</li>
								</ul>
							</div>

							<!-- Save Progress Option -->
							<div class="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
								<h3 class="mb-2 font-semibold text-blue-400">Save Progress</h3>
								<p class="mb-3 text-sm text-gray-300">
									Save results without updating season standings. Use this if you're still making
									changes or waiting for more data.
								</p>
								<form method="POST" action="?/saveProgress">
									<button
										type="submit"
										class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
									>
										Save Progress
									</button>
								</form>
							</div>

							<!-- Finalize Section -->
							<div class="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
								<h3 class="mb-2 font-semibold text-green-400">Finalize & Update Standings</h3>
								<p class="mb-3 text-sm text-gray-300">
									This will update season standings with AGE points and match data for all players.
									The event will be marked as complete.
								</p>
								<ul class="mb-4 list-inside list-disc space-y-1 text-sm text-gray-400">
									<li>AGE Points will be added to player standings</li>
									<li>Monthly match data will be updated</li>
									<li>Win percentages will be recalculated</li>
									<li>New players will be added to standings</li>
								</ul>

								{#if !hasResults}
									<div class="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
										<p class="text-sm text-yellow-400">
											<strong>Warning:</strong> No results have been recorded yet. Import CSV or add
											results before finalizing.
										</p>
									</div>
								{/if}

								{#if !data.event.circuit}
									<div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
										<p class="text-sm text-red-400">
											<strong>Error:</strong> This event has no circuit assigned. Please edit the event
											to add a circuit before finalizing.
										</p>
									</div>
								{/if}

								<form method="POST" action="?/finalizeEvent">
									<button
										type="submit"
										disabled={!hasResults || !data.event.circuit}
										class="w-full rounded-xl bg-green-600 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
										on:click|preventDefault={(e) => {
											if (
												confirm(
													'Are you sure you want to finalize this event? AGE points will be distributed and season standings will be updated.'
												)
											) {
												e.target.closest('form').submit();
											}
										}}
									>
										Finalize Event & Update Standings
									</button>
								</form>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
