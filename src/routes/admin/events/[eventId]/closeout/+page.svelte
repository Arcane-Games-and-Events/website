<script>
	export let data;
	export let form;

	let activeTab = 'results';
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
		cardsText: '',
		isPublic: true
	};

	// AGE points presets based on placement
	const agePointsPresets = {
		1: 100,
		2: 75,
		3: 50,
		4: 50,
		5: 25,
		6: 25,
		7: 25,
		8: 25
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
			agePoints: agePointsPresets[(data.existingResults?.length || 0) + 1] || 0,
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
			cardsText: '',
			isPublic: true
		};
		showDecklistForm = true;
	}

	function editDecklist(decklist) {
		editingDecklist = decklist;
		// Convert cards array back to text format
		const cardsText = decklist.cards
			.map((c) => `${c.quantity}x ${c.name}`)
			.join('\n');
		decklistForm = {
			playerName: decklist.playerName,
			gemId: decklist.gemId || '',
			userId: decklist.userId || '',
			deckName: decklist.deckName || '',
			hero: decklist.hero || '',
			format: decklist.format || '',
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
		resultForm.agePoints = agePointsPresets[resultForm.placement] || 0;
		resultForm.prizeAmount = prizePresets[resultForm.placement] || '';
	}

	// Sort results by placement
	$: sortedResults = [...(data.existingResults || [])].sort((a, b) => a.placement - b.placement);

	// Check if event is closed
	$: isClosed = data.event.status === 'completed';
</script>

<svelte:head>
	<title>Closeout - {data.event.title}</title>
</svelte:head>

<div class="container mx-auto px-2 py-8 max-w-7xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-4 mb-4">
			<a
				href="/admin/events/{data.event.id}"
				class="text-gray-400 hover:text-white transition-colors"
			>
				← Back to Event
			</a>
		</div>
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold text-gray-100">{data.event.title}</h1>
				<p class="text-gray-400 mt-2">Event Closeout - {formatDate(data.event.eventDate)}</p>
			</div>
			<div class="flex items-center gap-4">
				<!-- Event Status Badge -->
				{#if isClosed}
					<span class="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-400">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						Completed
					</span>
				{:else}
					<span class="inline-flex items-center gap-2 rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-semibold text-yellow-400">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{data.event.status || 'Upcoming'}
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="rounded-[var(--radius)] bg-green-100 border border-green-400 p-4 mb-6">
			<p class="text-sm text-green-800">{form.message}</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-[var(--radius)] bg-red-700 bg-opacity-10 border border-red-700 p-4 mb-6">
			<p class="text-sm text-red-700">{form.error}</p>
		</div>
	{/if}

	<!-- Tabs -->
	<div class="border-b border-gray-700 mb-6">
		<nav class="flex gap-6">
			<button
				on:click={() => (activeTab = 'results')}
				class="pb-3 text-sm font-medium transition-colors {activeTab === 'results'
					? 'text-white border-b-2 border-white'
					: 'text-gray-400 hover:text-white'}"
			>
				Results ({data.existingResults?.length || 0})
			</button>
			<button
				on:click={() => (activeTab = 'decklists')}
				class="pb-3 text-sm font-medium transition-colors {activeTab === 'decklists'
					? 'text-white border-b-2 border-white'
					: 'text-gray-400 hover:text-white'}"
			>
				Decklists ({data.existingDecklists?.length || 0})
			</button>
			<button
				on:click={() => (activeTab = 'finalize')}
				class="pb-3 text-sm font-medium transition-colors {activeTab === 'finalize'
					? 'text-white border-b-2 border-white'
					: 'text-gray-400 hover:text-white'}"
			>
				Finalize
			</button>
		</nav>
	</div>

	<!-- Results Tab -->
	{#if activeTab === 'results'}
		<div class="space-y-6">
			<!-- Add Result Button -->
			{#if !isClosed}
				<div class="flex justify-end">
					<button
						on:click={startNewResult}
						class="rounded-[var(--radius)] bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
					>
						+ Add Result
					</button>
				</div>
			{/if}

			<!-- Result Form Modal -->
			{#if showResultForm}
				<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-700 p-6">
					<h3 class="text-lg font-semibold text-white mb-4">
						{editingResult ? 'Edit Result' : 'Add Result'}
					</h3>

					<!-- Quick Select from Participants -->
					{#if data.participants.length > 0 && !editingResult}
						<div class="mb-4">
							<p class="text-sm text-gray-400 mb-2">Quick select from registered players:</p>
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

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="playerName" class="block text-sm font-medium text-gray-100 mb-2">
									Player Name *
								</label>
								<input
									type="text"
									id="playerName"
									name="playerName"
									required
									bind:value={resultForm.playerName}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
							<div>
								<label for="gemId" class="block text-sm font-medium text-gray-100 mb-2">
									GEM ID
								</label>
								<input
									type="text"
									id="gemId"
									name="gemId"
									bind:value={resultForm.gemId}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
						</div>

						<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div>
								<label for="placement" class="block text-sm font-medium text-gray-100 mb-2">
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
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
							<div>
								<label for="wins" class="block text-sm font-medium text-gray-100 mb-2">
									Wins
								</label>
								<input
									type="number"
									id="wins"
									name="wins"
									min="0"
									bind:value={resultForm.wins}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
							<div>
								<label for="losses" class="block text-sm font-medium text-gray-100 mb-2">
									Losses
								</label>
								<input
									type="number"
									id="losses"
									name="losses"
									min="0"
									bind:value={resultForm.losses}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
							<div>
								<label for="draws" class="block text-sm font-medium text-gray-100 mb-2">
									Draws
								</label>
								<input
									type="number"
									id="draws"
									name="draws"
									min="0"
									bind:value={resultForm.draws}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="agePoints" class="block text-sm font-medium text-gray-100 mb-2">
									AGE Points
								</label>
								<input
									type="number"
									id="agePoints"
									name="agePoints"
									min="0"
									bind:value={resultForm.agePoints}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
							<div>
								<label for="prizeAmount" class="block text-sm font-medium text-gray-100 mb-2">
									Prize Amount ($)
								</label>
								<input
									type="number"
									id="prizeAmount"
									name="prizeAmount"
									min="0"
									step="0.01"
									bind:value={resultForm.prizeAmount}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
						</div>

						<div class="flex justify-end gap-3 pt-4">
							<button
								type="button"
								on:click={cancelResultForm}
								class="rounded-[var(--radius)] bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="rounded-[var(--radius)] bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:opacity-90"
							>
								Save Result
							</button>
						</div>
					</form>
				</div>
			{/if}

			<!-- Results List -->
			<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md">
				{#if sortedResults.length === 0}
					<div class="p-12 text-center">
						<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
						<p class="mt-4 text-gray-400">No results recorded yet</p>
						{#if !isClosed}
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
								<tr class="border-b border-gray-700">
									<th class="text-left p-4 font-semibold text-gray-100">Place</th>
									<th class="text-left p-4 font-semibold text-gray-100">Player</th>
									<th class="text-left p-4 font-semibold text-gray-100">GEM ID</th>
									<th class="text-left p-4 font-semibold text-gray-100">Record</th>
									<th class="text-left p-4 font-semibold text-gray-100">AGE Pts</th>
									<th class="text-left p-4 font-semibold text-gray-100">Prize</th>
									{#if !isClosed}
										<th class="text-right p-4 font-semibold text-gray-100">Actions</th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#each sortedResults as result}
									<tr class="border-b border-gray-800 hover:bg-gray-900">
										<td class="p-4">
											<span class="inline-flex items-center justify-center w-8 h-8 rounded-full {result.placement === 1 ? 'bg-yellow-500/20 text-yellow-400' : result.placement === 2 ? 'bg-gray-400/20 text-gray-300' : result.placement === 3 ? 'bg-amber-600/20 text-amber-500' : 'bg-gray-800 text-gray-400'} font-bold">
												{result.placement}
											</span>
										</td>
										<td class="p-4 text-gray-100 font-medium">{result.playerName}</td>
										<td class="p-4 text-gray-400">{result.gemId || '-'}</td>
										<td class="p-4 text-gray-100">{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}</td>
										<td class="p-4 text-blue-400 font-medium">{result.agePoints}</td>
										<td class="p-4 text-green-400">{result.prizeAmount ? `$${result.prizeAmount}` : '-'}</td>
										{#if !isClosed}
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
			{#if !isClosed}
				<div class="flex justify-end">
					<button
						on:click={startNewDecklist}
						class="rounded-[var(--radius)] bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
					>
						+ Add Decklist
					</button>
				</div>
			{/if}

			<!-- Decklist Form Modal -->
			{#if showDecklistForm}
				<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-700 p-6">
					<h3 class="text-lg font-semibold text-white mb-4">
						{editingDecklist ? 'Edit Decklist' : 'Add Decklist'}
					</h3>

					<!-- Quick Select from Participants -->
					{#if data.participants.length > 0 && !editingDecklist}
						<div class="mb-4">
							<p class="text-sm text-gray-400 mb-2">Quick select from registered players:</p>
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

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="deckPlayerName" class="block text-sm font-medium text-gray-100 mb-2">
									Player Name *
								</label>
								<input
									type="text"
									id="deckPlayerName"
									name="playerName"
									required
									bind:value={decklistForm.playerName}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
							<div>
								<label for="deckGemId" class="block text-sm font-medium text-gray-100 mb-2">
									GEM ID
								</label>
								<input
									type="text"
									id="deckGemId"
									name="gemId"
									bind:value={decklistForm.gemId}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label for="deckName" class="block text-sm font-medium text-gray-100 mb-2">
									Deck Name
								</label>
								<input
									type="text"
									id="deckName"
									name="deckName"
									bind:value={decklistForm.deckName}
									placeholder="e.g., Briar Aggro"
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
							<div>
								<label for="hero" class="block text-sm font-medium text-gray-100 mb-2">
									Hero
								</label>
								<input
									type="text"
									id="hero"
									name="hero"
									bind:value={decklistForm.hero}
									placeholder="e.g., Briar, Warden of Thorns"
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
							<div>
								<label for="deckFormat" class="block text-sm font-medium text-gray-100 mb-2">
									Format
								</label>
								<input
									type="text"
									id="deckFormat"
									name="format"
									bind:value={decklistForm.format}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
								/>
							</div>
						</div>

						<div>
							<label for="cardsText" class="block text-sm font-medium text-gray-100 mb-2">
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
								class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
							></textarea>
						</div>

						<div class="flex items-center gap-3">
							<input
								type="checkbox"
								id="isPublicCheck"
								bind:checked={decklistForm.isPublic}
								class="w-4 h-4 rounded border-gray-700"
							/>
							<label for="isPublicCheck" class="text-sm text-gray-100">
								Make this decklist public
							</label>
						</div>

						<div class="flex justify-end gap-3 pt-4">
							<button
								type="button"
								on:click={cancelDecklistForm}
								class="rounded-[var(--radius)] bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="rounded-[var(--radius)] bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:opacity-90"
							>
								Save Decklist
							</button>
						</div>
					</form>
				</div>
			{/if}

			<!-- Decklists List -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#if data.existingDecklists?.length === 0}
					<div class="col-span-full rounded-[var(--radius)] bg-gray-950 border shadow-md p-12 text-center">
						<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						<p class="mt-4 text-gray-400">No decklists recorded yet</p>
						{#if !isClosed}
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
						<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-4">
							<div class="flex items-start justify-between mb-3">
								<div>
									<h4 class="font-semibold text-white">{decklist.playerName}</h4>
									{#if decklist.hero}
										<p class="text-sm text-blue-400">{decklist.hero}</p>
									{/if}
								</div>
								{#if !isClosed}
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
								<p class="text-sm text-gray-400 mb-2">{decklist.deckName}</p>
							{/if}
							<p class="text-xs text-gray-500">
								{decklist.cards?.length || 0} cards • {decklist.format || 'Unknown format'}
							</p>
							{#if !decklist.isPublic}
								<span class="inline-block mt-2 text-xs text-yellow-500">Private</span>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Finalize Tab -->
	{#if activeTab === 'finalize'}
		<div class="max-w-2xl mx-auto">
			<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-8">
				<h2 class="text-2xl font-bold text-white mb-6">Finalize Event</h2>

				{#if isClosed}
					<div class="text-center py-8">
						<svg class="mx-auto h-16 w-16 text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<h3 class="text-xl font-semibold text-white mb-2">Event Completed</h3>
						<p class="text-gray-400 mb-6">
							This event was closed on {formatDate(data.event.closedAt)}.
						</p>
						{#if data.isAdmin}
							<form method="POST" action="?/reopenEvent">
								<button
									type="submit"
									class="rounded-[var(--radius)] bg-yellow-500/20 px-6 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/30"
								>
									Reopen Event
								</button>
							</form>
						{/if}
					</div>
				{:else}
					<div class="space-y-6">
						<div class="rounded-lg bg-gray-900 p-4">
							<h3 class="font-semibold text-white mb-2">Summary</h3>
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
							</ul>
						</div>

						<div class="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
							<h3 class="font-semibold text-blue-400 mb-2">What happens when you close?</h3>
							<ul class="space-y-1 text-sm text-gray-300 list-disc list-inside">
								<li>Results will be published to the public results page</li>
								<li>AGE Points will be added to player standings</li>
								<li>Season standings will be updated</li>
								<li>Results and decklists can no longer be edited (admin can reopen)</li>
							</ul>
						</div>

						{#if (data.existingResults?.length || 0) === 0}
							<div class="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4">
								<p class="text-sm text-yellow-400">
									<strong>Warning:</strong> No results have been recorded yet. Are you sure you want to close this event?
								</p>
							</div>
						{/if}

						<form method="POST" action="?/closeEvent">
							<button
								type="submit"
								class="w-full rounded-[var(--radius)] bg-green-600 px-6 py-3 text-lg font-semibold text-white hover:bg-green-700 transition-colors"
								on:click|preventDefault={(e) => {
									if (confirm('Are you sure you want to close this event? AGE points will be distributed and standings will be updated.')) {
										e.target.closest('form').submit();
									}
								}}
							>
								Close Event & Publish Results
							</button>
						</form>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
