<script>
	export let data;

	const { decklist, playerResult } = data;

	// Circuit colors for badges
	const circuitColors = {
		'Los Angeles': { bg: 'bg-blue-500', text: 'text-blue-400' },
		'St. Louis': { bg: 'bg-green-500', text: 'text-green-400' },
		'New England': { bg: 'bg-purple-500', text: 'text-purple-400' }
	};

	function getCircuitColor(circuit) {
		return circuitColors[circuit] || { bg: 'bg-gray-500', text: 'text-gray-400' };
	}

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

	// Group cards by type (if structured that way) or just display as list
	$: cardsList = Array.isArray(decklist.cards) ? decklist.cards : [];

	// Calculate card statistics
	$: totalCards = cardsList.reduce((sum, card) => sum + (card.quantity || 1), 0);
</script>

<svelte:head>
	<title>{decklist.playerName}'s {decklist.hero || 'Deck'} - AGE Open Series</title>
	<meta
		name="description"
		content="View {decklist.playerName}'s decklist from {decklist.eventTitle}"
	/>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Back Navigation -->
	<div class="border-b border-gray-800 bg-gray-900/50">
		<div class="mx-auto max-w-5xl px-4 py-4">
			<a
				href="/age-open"
				class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back to AGE Open
			</a>
		</div>
	</div>

	<div class="mx-auto max-w-5xl px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex flex-wrap items-start justify-between gap-4 mb-4">
				<div>
					<h1 class="text-3xl font-bold text-white mb-2">{decklist.playerName}'s Deck</h1>
					{#if decklist.deckName}
						<p class="text-xl text-gray-300">{decklist.deckName}</p>
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					{#if decklist.hero}
						<span class="rounded-full bg-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-400">
							{decklist.hero}
						</span>
					{/if}
					{#if decklist.format}
						<span class="rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium text-gray-200">
							{decklist.format}
						</span>
					{/if}
					{#if decklist.circuit}
						{@const colors = getCircuitColor(decklist.circuit)}
						<span class="rounded-full {colors.bg} px-4 py-1.5 text-sm font-medium text-white">
							{decklist.circuit}
						</span>
					{/if}
				</div>
			</div>

			<!-- Event & Player Info -->
			<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
				<div class="grid gap-6 md:grid-cols-2">
					<div>
						<h3 class="text-sm font-medium text-gray-400 mb-2">Event</h3>
						<a
							href="/age-open/{decklist.eventId}"
							class="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
						>
							{decklist.eventTitle}
						</a>
						<div class="mt-2 space-y-1 text-sm text-gray-400">
							<div class="flex items-center gap-2">
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								<span>{formatDate(decklist.eventDate)}</span>
							</div>
							{#if decklist.eventLocation}
								<div class="flex items-center gap-2">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									<span>{decklist.eventLocation}</span>
								</div>
							{/if}
						</div>
					</div>

					<div>
						<h3 class="text-sm font-medium text-gray-400 mb-2">Player</h3>
						<div class="flex items-center gap-3">
							<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-lg font-bold text-blue-400">
								{decklist.playerName.split(' ').map((n) => n[0]).join('')}
							</div>
							<div>
								<div class="font-semibold text-white">{decklist.playerName}</div>
								{#if decklist.gemId}
									<div class="text-sm text-gray-500">{decklist.gemId}</div>
								{/if}
							</div>
						</div>

						{#if playerResult}
							<div class="mt-4 flex flex-wrap gap-3">
								<div class="rounded-lg bg-gray-800 px-3 py-2 text-center">
									<div class="text-lg font-bold {playerResult.placement === 1 ? 'text-yellow-400' : playerResult.placement <= 3 ? 'text-gray-300' : 'text-white'}">
										{playerResult.placement}{playerResult.placement === 1 ? 'st' : playerResult.placement === 2 ? 'nd' : playerResult.placement === 3 ? 'rd' : 'th'}
									</div>
									<div class="text-xs text-gray-500">Place</div>
								</div>
								<div class="rounded-lg bg-gray-800 px-3 py-2 text-center">
									<div class="text-lg font-bold text-white">
										{playerResult.wins}-{playerResult.losses}{playerResult.draws > 0 ? `-${playerResult.draws}` : ''}
									</div>
									<div class="text-xs text-gray-500">Record</div>
								</div>
								{#if playerResult.agePoints > 0}
									<div class="rounded-lg bg-gray-800 px-3 py-2 text-center">
										<div class="text-lg font-bold text-blue-400">{playerResult.agePoints}</div>
										<div class="text-xs text-gray-500">AGE Pts</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Deck Statistics -->
		<div class="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-4">
			<div class="flex flex-wrap items-center gap-6 text-sm">
				<div class="flex items-center gap-2">
					<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					<span class="text-gray-400">Total Cards:</span>
					<span class="font-semibold text-white">{totalCards}</span>
				</div>
				<div class="flex items-center gap-2">
					<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
					<span class="text-gray-400">Unique Cards:</span>
					<span class="font-semibold text-white">{cardsList.length}</span>
				</div>
			</div>
		</div>

		<!-- Card List -->
		<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
			<div class="bg-gray-800 px-6 py-4">
				<h2 class="text-lg font-semibold text-white">Decklist</h2>
			</div>

			{#if cardsList.length === 0}
				<div class="p-12 text-center">
					<p class="text-gray-400">No cards in this decklist.</p>
				</div>
			{:else}
				<div class="divide-y divide-gray-800">
					{#each cardsList as card, index}
						<div class="flex items-center justify-between px-6 py-3 hover:bg-gray-800/50 transition-colors">
							<div class="flex items-center gap-4">
								<span class="flex h-8 w-8 items-center justify-center rounded bg-gray-800 text-sm font-medium text-gray-300">
									{card.quantity || 1}x
								</span>
								<span class="font-medium text-white">{card.name || card}</span>
							</div>
							{#if card.pitch}
								<span class="rounded px-2 py-0.5 text-xs font-medium
									{card.pitch === 'red' || card.pitch === 1 ? 'bg-red-500/20 text-red-400' :
									 card.pitch === 'yellow' || card.pitch === 2 ? 'bg-yellow-500/20 text-yellow-400' :
									 card.pitch === 'blue' || card.pitch === 3 ? 'bg-blue-500/20 text-blue-400' :
									 'bg-gray-700 text-gray-300'}">
									{card.pitch === 1 ? 'Red' : card.pitch === 2 ? 'Yellow' : card.pitch === 3 ? 'Blue' : card.pitch}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="mt-6 flex flex-wrap gap-4">
			<a
				href="/age-open/{decklist.eventId}"
				class="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				View Event
			</a>
			<button
				on:click={() => navigator.clipboard.writeText(window.location.href)}
				class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
				</svg>
				Share Deck
			</button>
		</div>
	</div>
</div>
