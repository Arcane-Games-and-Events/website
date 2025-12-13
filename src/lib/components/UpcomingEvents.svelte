<script>
	import EventCard from './EventCard.svelte';
	import { getCircuitNames } from '$lib/data/circuits.js';

	// Props
	export let events = [];
	export let title = 'Upcoming Events';
	export let showTitle = true;
	export let viewAllLink = '';
	export let viewAllText = 'View all';
	export let maxEvents = 0; // 0 = show all
	export let showFilters = false;
	export let showPremiumBadge = true;
	export let emptyMessage = 'No upcoming events scheduled';

	// Filter state
	let selectedCircuit = 'all';
	const circuits = getCircuitNames();

	// Filtered events by circuit
	$: filteredEvents = events.filter((e) => {
		if (selectedCircuit === 'all') return true;
		return e.circuit === selectedCircuit;
	});

	// Separate upcoming and past events, sort appropriately
	$: now = new Date();
	$: upcomingEvents = filteredEvents
		.filter((e) => e.eventDate && new Date(e.eventDate) >= now)
		.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)); // Closest first

	$: pastEvents = filteredEvents
		.filter((e) => e.eventDate && new Date(e.eventDate) < now)
		.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate)); // Most recent first

	// Combine: upcoming events first, then past events
	$: sortedEvents = [...upcomingEvents, ...pastEvents];

	$: displayedEvents = maxEvents > 0 ? sortedEvents.slice(0, maxEvents) : sortedEvents;
</script>

<div class="upcoming-events">
	<!-- Header -->
	{#if showTitle || viewAllLink}
		<div class="mb-4 flex items-center justify-between">
			{#if showTitle}
				<h3 class="text-lg font-semibold text-white">{title}</h3>
			{/if}
			{#if viewAllLink}
				<a
					href={viewAllLink}
					class="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
				>
					{viewAllText}
					<svg
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
					</svg>
				</a>
			{/if}
		</div>
	{/if}

	<!-- Circuit Filter Pills -->
	{#if showFilters}
		<div class="mb-6 flex flex-wrap items-center gap-3">
			<span class="text-sm font-medium text-gray-400">Browse Events:</span>
			<div class="flex flex-wrap gap-2">
				<button
					on:click={() => (selectedCircuit = 'all')}
					class="rounded-full px-4 py-2 text-sm font-medium transition-all {selectedCircuit ===
					'all'
						? 'bg-white text-gray-900 shadow-lg'
						: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
				>
					All Circuits
				</button>
				<button
					on:click={() => (selectedCircuit = 'Los Angeles')}
					class="rounded-full px-4 py-2 text-sm font-medium transition-all {selectedCircuit ===
					'Los Angeles'
						? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
						: 'border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}"
				>
					<span class="flex items-center gap-1.5">
						<span class="h-2 w-2 rounded-full bg-blue-400"></span>
						Los Angeles
					</span>
				</button>
				<button
					on:click={() => (selectedCircuit = 'New England')}
					class="rounded-full px-4 py-2 text-sm font-medium transition-all {selectedCircuit ===
					'New England'
						? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
						: 'border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}"
				>
					<span class="flex items-center gap-1.5">
						<span class="h-2 w-2 rounded-full bg-purple-400"></span>
						New England
					</span>
				</button>
				<button
					on:click={() => (selectedCircuit = 'St. Louis')}
					class="rounded-full px-4 py-2 text-sm font-medium transition-all {selectedCircuit ===
					'St. Louis'
						? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
						: 'border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'}"
				>
					<span class="flex items-center gap-1.5">
						<span class="h-2 w-2 rounded-full bg-green-400"></span>
						St. Louis
					</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Events List -->
	{#if displayedEvents.length > 0}
		<div class="space-y-4">
			{#each displayedEvents as event (event.id)}
				<EventCard {event} {showPremiumBadge} />
			{/each}
		</div>
	{:else}
		<div class="rounded-xl border border-white/10 bg-gray-900/50 p-8 text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
				<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<p class="text-sm text-gray-500">
				{#if showFilters && selectedCircuit !== 'all'}
					No events found for the {selectedCircuit} circuit. Try selecting a different circuit.
				{:else}
					{emptyMessage}
				{/if}
			</p>
		</div>
	{/if}
</div>
