<script>
	export let data;

	// Tab state management
	let activeTab = 'overview';

	const tabs = [
		{ id: 'overview', name: 'Overview' },
		{ id: 'decklists', name: 'Decklists' },
		{ id: 'standings', name: 'Standings' },
		{ id: 'tickets', name: 'Tickets' },
		{ id: 'event-finder', name: 'Event Finder' },
		{ id: 'age-open-details', name: 'AGE Open Details' }
	];

	// Standings search and filter
	let searchQuery = '';
	let selectedSeason = '2025';

	// Mock player standings data (3 seasons of history)
	const playerStandings = [
		{
			rank: 1,
			name: 'Zachary Wallach',
			agePoints: 156,
			wins: 42,
			losses: 8,
			winRate: 84.0,
			eventsPlayed: 8,
			topFinishes: 5,
			season: '2024'
		},
		{
			rank: 2,
			name: 'Sarah Chen',
			agePoints: 142,
			wins: 38,
			losses: 12,
			winRate: 76.0,
			eventsPlayed: 8,
			topFinishes: 4,
			season: '2024'
		},
		{
			rank: 3,
			name: 'Marcus Rodriguez',
			agePoints: 128,
			wins: 35,
			losses: 15,
			winRate: 70.0,
			eventsPlayed: 8,
			topFinishes: 3,
			season: '2024'
		},
		{
			rank: 4,
			name: 'Emily Thompson',
			agePoints: 115,
			wins: 32,
			losses: 18,
			winRate: 64.0,
			eventsPlayed: 8,
			topFinishes: 3,
			season: '2024'
		},
		{
			rank: 5,
			name: 'James Park',
			agePoints: 108,
			wins: 30,
			losses: 20,
			winRate: 60.0,
			eventsPlayed: 8,
			topFinishes: 2,
			season: '2024'
		},
		{
			rank: 6,
			name: 'Alexandra Kim',
			agePoints: 95,
			wins: 28,
			losses: 22,
			winRate: 56.0,
			eventsPlayed: 7,
			topFinishes: 2,
			season: '2024'
		},
		{
			rank: 7,
			name: 'David Martinez',
			agePoints: 88,
			wins: 25,
			losses: 25,
			winRate: 50.0,
			eventsPlayed: 7,
			topFinishes: 1,
			season: '2024'
		},
		{
			rank: 8,
			name: 'Jessica Lee',
			agePoints: 82,
			wins: 24,
			losses: 26,
			winRate: 48.0,
			eventsPlayed: 7,
			topFinishes: 1,
			season: '2024'
		},
		// 2025 Season
		{
			rank: 1,
			name: 'Sarah Chen',
			agePoints: 45,
			wins: 12,
			losses: 3,
			winRate: 80.0,
			eventsPlayed: 2,
			topFinishes: 2,
			season: '2025'
		},
		{
			rank: 2,
			name: 'Marcus Rodriguez',
			agePoints: 38,
			wins: 10,
			losses: 5,
			winRate: 66.7,
			eventsPlayed: 2,
			topFinishes: 1,
			season: '2025'
		},
		{
			rank: 3,
			name: 'Zachary Wallach',
			agePoints: 35,
			wins: 9,
			losses: 6,
			winRate: 60.0,
			eventsPlayed: 2,
			topFinishes: 1,
			season: '2025'
		},
		{
			rank: 4,
			name: 'Emily Thompson',
			agePoints: 28,
			wins: 8,
			losses: 7,
			winRate: 53.3,
			eventsPlayed: 2,
			topFinishes: 1,
			season: '2025'
		},
		// 2023 Season (Real Data)
		{
			rank: 1,
			name: 'Zachary Wallach',
			agePoints: 102,
			wins: 32,
			losses: 11,
			winRate: 74.0,
			eventsPlayed: 6,
			topFinishes: 3,
			season: '2023'
		},
		{
			rank: 2,
			name: 'Craig Pollack',
			agePoints: 97,
			wins: 33,
			losses: 17,
			winRate: 66.0,
			eventsPlayed: 7,
			topFinishes: 3,
			season: '2023'
		},
		{
			rank: 3,
			name: 'John Zapata',
			agePoints: 83,
			wins: 31,
			losses: 17,
			winRate: 65.0,
			eventsPlayed: 7,
			topFinishes: 3,
			season: '2023'
		},
		{
			rank: 4,
			name: 'Chris Iaali',
			agePoints: 81,
			wins: 28,
			losses: 15,
			winRate: 65.0,
			eventsPlayed: 6,
			topFinishes: 3,
			season: '2023'
		},
		{
			rank: 5,
			name: 'Andrew Rudin',
			agePoints: 74,
			wins: 28,
			losses: 18,
			winRate: 61.0,
			eventsPlayed: 7,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 6,
			name: 'Alan Chavarin',
			agePoints: 70,
			wins: 23,
			losses: 15,
			winRate: 61.0,
			eventsPlayed: 6,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 7,
			name: 'Alexander Vore',
			agePoints: 57,
			wins: 18,
			losses: 12,
			winRate: 60.0,
			eventsPlayed: 4,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 8,
			name: 'Anthony Pham',
			agePoints: 51,
			wins: 21,
			losses: 20,
			winRate: 51.0,
			eventsPlayed: 6,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 9,
			name: 'Aria How',
			agePoints: 51,
			wins: 16,
			losses: 12,
			winRate: 57.0,
			eventsPlayed: 4,
			topFinishes: 1,
			season: '2023'
		},
		{
			rank: 10,
			name: 'Alejandro Cuevas',
			agePoints: 50,
			wins: 18,
			losses: 21,
			winRate: 46.0,
			eventsPlayed: 6,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 11,
			name: 'Tyler Horspool',
			agePoints: 48,
			wins: 18,
			losses: 17,
			winRate: 51.0,
			eventsPlayed: 5,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 12,
			name: 'Fuzzy Delp',
			agePoints: 48,
			wins: 16,
			losses: 15,
			winRate: 52.0,
			eventsPlayed: 5,
			topFinishes: 1,
			season: '2023'
		},
		{
			rank: 13,
			name: 'Peter Buddensiek',
			agePoints: 48,
			wins: 17,
			losses: 10,
			winRate: 63.0,
			eventsPlayed: 4,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 14,
			name: 'Matthew Vore',
			agePoints: 47,
			wins: 15,
			losses: 7,
			winRate: 68.0,
			eventsPlayed: 3,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 15,
			name: 'Angel Benitez',
			agePoints: 45,
			wins: 16,
			losses: 17,
			winRate: 48.0,
			eventsPlayed: 5,
			topFinishes: 2,
			season: '2023'
		},
		{
			rank: 16,
			name: 'Travis Wagner',
			agePoints: 41,
			wins: 20,
			losses: 18,
			winRate: 53.0,
			eventsPlayed: 6,
			topFinishes: 2,
			season: '2023'
		}
	];

	// Filter events by circuit
	$: westEvents = (data.events || []).filter((e) => e.circuit === 'West');
	$: centralEvents = (data.events || []).filter((e) => e.circuit === 'Central');
	$: eastEvents = (data.events || []).filter((e) => e.circuit === 'East');

	// Count events per circuit
	$: westCount = westEvents.length;
	$: centralCount = centralEvents.length;
	$: eastCount = eastEvents.length;

	// Filter standings by season and search query
	$: filteredStandings = playerStandings
		.filter((p) => p.season === selectedSeason)
		.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
		.sort((a, b) => a.rank - b.rank);

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(date);
	}

	function formatPrice(price) {
		return parseFloat(price).toFixed(2);
	}
</script>

<svelte:head>
	<title>AGE Open Series - Play</title>
	<meta
		name="description"
		content="Join the AGE Open Series - competitive Magic: The Gathering tournaments with premier event coverage"
	/>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950 py-16">
		<div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
		<div class="relative mx-auto max-w-7xl px-2">
			<div class="text-center">
				<div class="mb-4 inline-block rounded-full bg-blue-500/10 px-4 py-1.5">
					<span class="text-sm font-semibold text-blue-400"
						>The Premier Independent Flesh and Blood Series</span
					>
				</div>
				<h1 class="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
					AGE Open Series
				</h1>
				<p class="mx-auto max-w-3xl text-lg text-gray-400">
					Premier competitive Flesh and Blood events featuring top-tier competition, professional
					coverage, and opportunities to qualify for premier events.
				</p>
			</div>
		</div>
	</section>

	<!-- Tab Navigation -->
	<nav class="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
		<div class="mx-auto max-w-7xl px-2">
			<div class="flex space-x-8 overflow-x-auto">
				{#each tabs as tab}
					<button
						on:click={() => (activeTab = tab.id)}
						class="border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors {activeTab ===
						tab.id
							? 'border-blue-500 text-blue-500'
							: 'border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-100'}"
					>
						{tab.name}
					</button>
				{/each}
			</div>
		</div>
	</nav>

	<!-- Tab Content -->
	<div class="mx-auto max-w-7xl px-2 py-8">
		<!-- Overview Tab -->
		{#if activeTab === 'overview'}
			<div class="space-y-12">
				<!-- About the Series -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">About the AGE Open Series</h2>
					<div class="grid gap-6 md:grid-cols-2">
						<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
							<div
								class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10"
							>
								<svg
									class="h-6 w-6 text-blue-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-xl font-semibold text-white">Competitive Play</h3>
							<p class="text-gray-400">
								High-level Flesh and Blood tournaments featuring Standard, Modern, and other
								competitive formats with substantial prize support.
							</p>
						</div>

						<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
							<div
								class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10"
							>
								<svg
									class="h-6 w-6 text-purple-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-xl font-semibold text-white">Professional Coverage</h3>
							<p class="text-gray-400">
								Live streaming, match coverage, and content creation featuring top players and
								exciting matchups from our tournament series.
							</p>
						</div>

						<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
							<div
								class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10"
							>
								<svg
									class="h-6 w-6 text-green-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-xl font-semibold text-white">Prize Support</h3>
							<p class="text-gray-400">
								Competitive prize pools and premium rewards for top finishers, with special benefits
								for AGE Premium members.
							</p>
						</div>

						<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
							<div
								class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10"
							>
								<svg
									class="h-6 w-6 text-orange-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-xl font-semibold text-white">Community Driven</h3>
							<p class="text-gray-400">
								Building a strong competitive Magic community with regular events, player
								recognition, and opportunities to connect with other players.
							</p>
						</div>
					</div>
				</section>

				<!-- Upcoming Events -->
				<section>
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-3xl font-bold text-white">Upcoming Events</h2>
						<button
							on:click={() => (activeTab = 'event-finder')}
							class="text-sm font-medium text-blue-500 hover:text-blue-400"
						>
							View All Events →
						</button>
					</div>

					{#if data.events && data.events.length > 0}
						<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{#each data.events.slice(0, 3) as evt}
								<article
									class="overflow-hidden rounded-lg border border-gray-800 bg-gray-900 shadow-sm transition-all hover:border-gray-700 hover:shadow-lg"
								>
									<div class="p-6">
										<!-- Badges -->
										<div class="mb-3 flex flex-wrap gap-2">
											{#if evt.format}
												<span
													class="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-900"
												>
													{evt.format}
												</span>
											{/if}
											{#if evt.circuit}
												<span
													class="rounded-full bg-blue-500 px-2.5 py-1 text-xs font-medium text-white"
												>
													{evt.circuit}
												</span>
											{/if}
											{#if evt.premiumDiscount}
												<span
													class="rounded-full bg-green-500 px-2.5 py-1 text-xs font-medium text-white"
												>
													10% Off
												</span>
											{/if}
										</div>

										<!-- Title -->
										<h3 class="mb-3 text-xl font-semibold text-white">
											{evt.title}
										</h3>

										<!-- Event Details -->
										<div class="mb-4 space-y-2">
											{#if evt.eventDate}
												<div class="flex items-start gap-2 text-sm text-gray-400">
													<svg
														class="mt-0.5 h-4 w-4 flex-shrink-0"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
														/>
													</svg>
													<span>{formatDate(evt.eventDate)}</span>
												</div>
											{/if}

											{#if evt.location}
												<div class="flex items-start gap-2 text-sm text-gray-400">
													<svg
														class="mt-0.5 h-4 w-4 flex-shrink-0"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
														/>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
														/>
													</svg>
													<span>{evt.location}</span>
												</div>
											{/if}
										</div>

										<!-- Footer -->
										<div class="flex items-center justify-between border-t border-gray-800 pt-4">
											<div class="flex items-center gap-2">
												<span class="text-lg font-bold text-white">
													${formatPrice(evt.price)}
												</span>
											</div>
											<a
												href="/play/{evt.id}/checkout"
												class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
											>
												Register
											</a>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800"
							>
								<svg
									class="h-8 w-8 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-xl font-semibold text-white">No Upcoming Events</h3>
							<p class="text-gray-400">Check back soon for new tournament announcements!</p>
						</div>
					{/if}
				</section>

				<!-- How to Participate -->
				<section
					class="rounded-lg border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-8"
				>
					<h2 class="mb-6 text-2xl font-bold text-white">How to Participate</h2>
					<div class="grid gap-6 md:grid-cols-3">
						<div class="flex gap-4">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
							>
								1
							</div>
							<div>
								<h3 class="mb-1 font-semibold text-white">Find an Event</h3>
								<p class="text-sm text-gray-400">
									Browse upcoming tournaments and find one that fits your schedule and format
									preference.
								</p>
							</div>
						</div>

						<div class="flex gap-4">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
							>
								2
							</div>
							<div>
								<h3 class="mb-1 font-semibold text-white">Register Online</h3>
								<p class="text-sm text-gray-400">
									Complete your registration through our secure checkout process. Premium members
									get 10% off!
								</p>
							</div>
						</div>

						<div class="flex gap-4">
							<div
								class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
							>
								3
							</div>
							<div>
								<h3 class="mb-1 font-semibold text-white">Compete & Win</h3>
								<p class="text-sm text-gray-400">
									Show up ready to play, compete for prizes, and climb the leaderboard!
								</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		{/if}

		<!-- Decklists Tab -->
		{#if activeTab === 'decklists'}
			<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800"
				>
					<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-semibold text-white">Decklists Coming Soon</h3>
				<p class="text-gray-400">
					Browse top performing decklists from recent AGE Open Series events.
				</p>
			</div>
		{/if}

		<!-- Standings Tab -->
		{#if activeTab === 'standings'}
			<div class="space-y-6">
				<div>
					<h2 class="mb-2 text-3xl font-bold text-white">Circuit Standings</h2>
					<p class="text-gray-400">
						Track player performance across AGE Open Series seasons
					</p>
				</div>

				<!-- Search and Filters -->
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="relative flex-1 max-w-md">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<svg
								class="h-5 w-5 text-gray-400"
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
						</div>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search players..."
							class="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<div class="flex items-center gap-2">
						<label for="season-select" class="text-sm text-gray-400">Season:</label>
						<select
							id="season-select"
							bind:value={selectedSeason}
							class="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						>
							<option value="2025">2025</option>
							<option value="2024">2024</option>
							<option value="2023">2023</option>
						</select>
					</div>
				</div>

				<!-- Standings Table -->
				<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-800">
								<tr>
									<th class="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase">
										Rank
									</th>
									<th class="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase">
										Player
									</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">
										AGE Points
									</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">
										W-L
									</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">
										Win Rate
									</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">
										Events
									</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">
										Top 8s
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-800">
								{#each filteredStandings as player}
									<tr class="hover:bg-gray-800/50 transition-colors">
										<td class="px-6 py-4">
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full {player.rank ===
												1
													? 'bg-yellow-500/20 text-yellow-500'
													: player.rank === 2
														? 'bg-gray-400/20 text-gray-400'
														: player.rank === 3
															? 'bg-orange-900/20 text-orange-600'
															: 'bg-gray-700/20 text-gray-400'} text-sm font-bold"
											>
												{player.rank}
											</div>
										</td>
										<td class="px-6 py-4">
											<div class="flex items-center gap-3">
												<div
													class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 font-semibold"
												>
													{player.name
														.split(' ')
														.map((n) => n[0])
														.join('')}
												</div>
												<div>
													<div class="font-medium text-white">{player.name}</div>
												</div>
											</div>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-lg font-bold text-blue-400">{player.agePoints}</span>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-sm text-gray-300"
												>{player.wins}-{player.losses}</span
											>
										</td>
										<td class="px-6 py-4 text-center">
											<div class="flex flex-col items-center">
												<span
													class="text-sm font-medium {player.winRate >= 70
														? 'text-green-400'
														: player.winRate >= 50
															? 'text-yellow-400'
															: 'text-red-400'}"
												>
													{player.winRate.toFixed(1)}%
												</span>
												<div class="mt-1 h-1.5 w-16 rounded-full bg-gray-700 overflow-hidden">
													<div
														class="h-full {player.winRate >= 70
															? 'bg-green-500'
															: player.winRate >= 50
																? 'bg-yellow-500'
																: 'bg-red-500'}"
														style="width: {player.winRate}%"
													></div>
												</div>
											</div>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-sm text-gray-300">{player.eventsPlayed}</span>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-sm font-medium text-purple-400"
												>{player.topFinishes}</span
											>
										</td>
									</tr>
								{/each}
								{#if filteredStandings.length === 0}
									<tr>
										<td colspan="7" class="px-6 py-12 text-center">
											<div class="flex flex-col items-center gap-2">
												<svg
													class="h-12 w-12 text-gray-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
													/>
												</svg>
												<p class="text-gray-400">No players found</p>
											</div>
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Stats Legend -->
				<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
					<h3 class="mb-4 text-lg font-semibold text-white">Standings Information</h3>
					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">AGE Points</div>
							<p class="text-xs text-gray-500">
								Points earned based on tournament placement. Top 16 players qualify for the
								Player's Championship.
							</p>
						</div>
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">W-L Record</div>
							<p class="text-xs text-gray-500">
								Total wins and losses across all events in the selected season.
							</p>
						</div>
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">Win Rate</div>
							<p class="text-xs text-gray-500">
								Percentage of matches won. Green (70%+), Yellow (50-69%), Red (&lt;50%).
							</p>
						</div>
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">Events Played</div>
							<p class="text-xs text-gray-500">
								Number of AGE Opens participated in during the season.
							</p>
						</div>
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">Top 8 Finishes</div>
							<p class="text-xs text-gray-500">
								Number of times the player finished in the Top 8 and earned cash prizes.
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tickets Tab -->
		{#if activeTab === 'tickets'}
			<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800"
				>
					<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-semibold text-white">My Tickets</h3>
				<p class="mb-4 text-gray-400">View and manage your event registrations.</p>
				<a
					href="/account?tab=order-history"
					class="text-sm font-medium text-blue-500 hover:text-blue-400"
				>
					Go to Order History →
				</a>
			</div>
		{/if}

		<!-- Event Finder Tab -->
		{#if activeTab === 'event-finder'}
			<div class="space-y-6">
				<div>
					<h2 class="mb-2 text-3xl font-bold text-white">Event Schedule</h2>
					<p class="text-gray-400">
						Three regional circuits across the United States - West, Central, and East
					</p>
				</div>

				<!-- Circuit Badges -->
				<div class="flex flex-wrap gap-3">
					<div class="rounded-full bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400">
						West Circuit - {westCount} Events
					</div>
					<div class="rounded-full bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400">
						Central Circuit - {centralCount} Events
					</div>
					<div class="rounded-full bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-400">
						East Circuit - {eastCount} Events
					</div>
				</div>

				<!-- West Circuit Schedule -->
				{#if westEvents.length > 0}
					<section>
						<h3 class="mb-4 text-2xl font-bold text-white">
							<span class="inline-flex items-center gap-2">
								<div class="h-3 w-3 rounded-full bg-blue-500"></div>
								West Circuit
							</span>
						</h3>
						<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gray-800">
										<tr>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Event
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Date
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Location
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Action
											</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each westEvents as evt}
											<tr class="hover:bg-gray-800/50">
												<td class="px-6 py-4 text-sm text-white">{evt.title}</td>
												<td class="px-6 py-4 text-sm text-gray-300">
													{formatDate(evt.eventDate)}
												</td>
												<td class="px-6 py-4 text-sm text-gray-300">{evt.location}</td>
												<td class="px-6 py-4">
													<a
														href="/play/{evt.id}/checkout"
														class="text-sm font-medium text-blue-500 hover:text-blue-400"
													>
														Register →
													</a>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</section>
				{/if}

				<!-- Central Circuit Schedule -->
				{#if centralEvents.length > 0}
					<section>
						<h3 class="mb-4 text-2xl font-bold text-white">
							<span class="inline-flex items-center gap-2">
								<div class="h-3 w-3 rounded-full bg-green-500"></div>
								Central Circuit
							</span>
						</h3>
						<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gray-800">
										<tr>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Event
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Date
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Location
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Action
											</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each centralEvents as evt}
											<tr class="hover:bg-gray-800/50">
												<td class="px-6 py-4 text-sm text-white">{evt.title}</td>
												<td class="px-6 py-4 text-sm text-gray-300">
													{formatDate(evt.eventDate)}
												</td>
												<td class="px-6 py-4 text-sm text-gray-300">{evt.location}</td>
												<td class="px-6 py-4">
													<a
														href="/play/{evt.id}/checkout"
														class="text-sm font-medium text-blue-500 hover:text-blue-400"
													>
														Register →
													</a>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</section>
				{/if}

				<!-- East Circuit Schedule -->
				{#if eastEvents.length > 0}
					<section>
						<h3 class="mb-4 text-2xl font-bold text-white">
							<span class="inline-flex items-center gap-2">
								<div class="h-3 w-3 rounded-full bg-purple-500"></div>
								East Circuit
							</span>
						</h3>
						<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gray-800">
										<tr>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Event
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Date
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Location
											</th>
											<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
												Action
											</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each eastEvents as evt}
											<tr class="hover:bg-gray-800/50">
												<td class="px-6 py-4 text-sm text-white">{evt.title}</td>
												<td class="px-6 py-4 text-sm text-gray-300">
													{formatDate(evt.eventDate)}
												</td>
												<td class="px-6 py-4 text-sm text-gray-300">{evt.location}</td>
												<td class="px-6 py-4">
													<a
														href="/play/{evt.id}/checkout"
														class="text-sm font-medium text-blue-500 hover:text-blue-400"
													>
														Register →
													</a>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</section>
				{/if}

				<!-- Additional Info -->
				<div class="rounded-lg border border-blue-800 bg-blue-500/10 p-6">
					<h3 class="mb-3 text-lg font-semibold text-white">Circuit Information</h3>
					<div class="space-y-2 text-sm text-blue-300">
						<p>
							<span class="font-semibold">Prize Pool:</span> Each circuit features $1,000 Opens
							with cash prizes for Top 8 finishers and AGE Points for all participants.
						</p>
						<p>
							<span class="font-semibold">Championship Qualification:</span> Top 16 players by AGE
							Points from each circuit will be invited to compete in regional championships.
						</p>
						<p>
							<span class="font-semibold">Registration:</span> Click "Register →" on any event above to sign up.
							Dates and locations are subject to change.
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- AGE Open Details Tab -->
		{#if activeTab === 'age-open-details'}
			<div class="space-y-12">
				<!-- Circuit Overview -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">About the AGE Open Circuit</h2>
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-8">
						<p class="mb-4 text-lg text-gray-300">
							The AGE Open Circuit is a year-long competitive Flesh and Blood tournament series
							with an $11,000 prize pool. Compete in 8 AGE $1,000 Opens throughout the year to earn
							cash prizes and AGE Points. At the end of the season, the top 16 players by AGE Open
							points will be invited to compete in the Player's Championship for a $3,000 prize
							pool.
						</p>
						<div class="grid gap-6 md:grid-cols-3">
							<div class="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6">
								<div class="mb-2 text-3xl font-bold text-blue-500">$11,000</div>
								<div class="text-sm text-gray-400">Total Prize Pool</div>
							</div>
							<div class="rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
								<div class="mb-2 text-3xl font-bold text-green-500">8 Opens</div>
								<div class="text-sm text-gray-400">Monthly Tournaments</div>
							</div>
							<div class="rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6">
								<div class="mb-2 text-3xl font-bold text-purple-500">Top 16</div>
								<div class="text-sm text-gray-400">Championship Invites</div>
							</div>
						</div>
					</div>
				</section>

				<!-- 2025 Event Schedule -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">2025 Event Schedule</h2>
					<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gray-800">
									<tr>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
											Event
										</th>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">Date</th>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
											Location
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-800">
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">AGE $1,000 Open #1</td>
										<td class="px-6 py-4 text-sm text-gray-300">January 4, 2025</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											Top Deck Keep, Riverside, CA
										</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">AGE $1,000 Open #2</td>
										<td class="px-6 py-4 text-sm text-gray-300">February 1, 2025</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											Top Deck Keep, Riverside, CA
										</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">AGE $1,000 Open #3</td>
										<td class="px-6 py-4 text-sm text-gray-300">March 1, 2025</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											Top Deck Keep, Riverside, CA
										</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">AGE $1,000 Open #4</td>
										<td class="px-6 py-4 text-sm text-gray-300">April 5, 2025</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											Top Deck Keep, Riverside, CA
										</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">AGE $1,000 Open #5</td>
										<td class="px-6 py-4 text-sm text-gray-300">May 3, 2025</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											Top Deck Keep, Riverside, CA
										</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">AGE $1,000 Open #6</td>
										<td class="px-6 py-4 text-sm text-gray-300">June 7, 2025</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											Top Deck Keep, Riverside, CA
										</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">AGE $1,000 Open #7</td>
										<td class="px-6 py-4 text-sm text-gray-300">July 5, 2025</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											Top Deck Keep, Riverside, CA
										</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">AGE $1,000 Open #8</td>
										<td class="px-6 py-4 text-sm text-gray-300">August 2, 2025</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											Top Deck Keep, Riverside, CA
										</td>
									</tr>
									<tr class="bg-blue-500/10">
										<td class="px-6 py-4 text-sm font-semibold text-blue-400">
											Player's Championship
										</td>
										<td class="px-6 py-4 text-sm text-blue-300">TBA</td>
										<td class="px-6 py-4 text-sm text-blue-300">TBA</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div class="border-t border-gray-800 bg-gray-800/50 p-4">
							<p class="text-sm text-gray-400">
								<span class="font-semibold text-gray-300">Venue Address:</span> Top Deck Keep, 10128
								Indiana Ave, Riverside, CA 92503
							</p>
						</div>
					</div>
				</section>

				<!-- Prize Structure -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">Prize Structure (Per Open)</h2>
					<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gray-800">
									<tr>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
											Place
										</th>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
											Cash Prize
										</th>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
											AGE Points
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-800">
									<tr class="bg-yellow-500/10 hover:bg-yellow-500/20">
										<td class="px-6 py-4 text-sm font-semibold text-white">1st Place</td>
										<td class="px-6 py-4 text-sm font-bold text-green-400">$400</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">30 points</td>
									</tr>
									<tr class="bg-gray-400/5 hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm font-semibold text-white">2nd Place</td>
										<td class="px-6 py-4 text-sm font-bold text-green-400">$200</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">25 points</td>
									</tr>
									<tr class="bg-orange-900/10 hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm font-semibold text-white">3rd-4th Place</td>
										<td class="px-6 py-4 text-sm font-bold text-green-400">$100</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">20 points</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">5th-8th Place</td>
										<td class="px-6 py-4 text-sm font-bold text-green-400">$50</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">15 points</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">9th-12th Place</td>
										<td class="px-6 py-4 text-sm text-gray-400">-</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">12 points</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">13th-16th Place</td>
										<td class="px-6 py-4 text-sm text-gray-400">-</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">8 points</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">Participation</td>
										<td class="px-6 py-4 text-sm text-gray-400">-</td>
										<td class="px-6 py-4 text-sm text-blue-400">1 point</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
					<div class="mt-4 rounded-lg border border-blue-800 bg-blue-500/10 p-4">
						<p class="text-sm text-blue-300">
							<span class="font-semibold">Total Per Open:</span> $1,000 in cash prizes distributed
							to Top 8 finishers, plus AGE Points for Top 16 and all participants
						</p>
					</div>
				</section>

				<!-- Player's Championship -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">Player's Championship</h2>
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-8">
						<p class="mb-6 text-lg text-gray-300">
							At the end of the season, the top 16 players by AGE Open points will be invited to
							compete in the Player's Championship for a $3,000 prize pool. This prestigious event
							crowns the AGE Open Series champion and celebrates our top competitive players.
						</p>
						<div class="grid gap-6 md:grid-cols-2">
							<div class="rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6">
								<h3 class="mb-2 text-xl font-semibold text-white">Qualification</h3>
								<p class="text-sm text-gray-400">
									Top 16 players by total AGE Points accumulated throughout the season receive
									automatic invitations to the championship.
								</p>
							</div>
							<div class="rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
								<h3 class="mb-2 text-xl font-semibold text-white">Prize Pool</h3>
								<p class="text-sm text-gray-400">
									$3,000 prize pool distributed to top finishers, with the champion earning the
									title of AGE Open Series Champion.
								</p>
							</div>
						</div>
					</div>
				</section>

				<!-- 2024 Champion -->
				<section
					class="rounded-lg border border-yellow-700/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-8"
				>
					<div class="text-center">
						<div class="mb-3 inline-flex items-center justify-center">
							<svg
								class="h-12 w-12 text-yellow-500"
								fill="currentColor"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
								/>
							</svg>
						</div>
						<h2 class="mb-2 text-2xl font-bold text-white">2024 Champion</h2>
						<p class="mb-4 text-3xl font-bold text-yellow-500">Zachary Wallach</p>
						<p class="text-gray-400">
							Congratulations to Zachary Wallach, our 2024 AGE Open Series Champion!
						</p>
					</div>
				</section>
			</div>
		{/if}
	</div>
</div>
