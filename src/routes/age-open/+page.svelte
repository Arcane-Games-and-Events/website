<script>
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import CircuitMap from '$lib/components/CircuitMap.svelte';

	export let data;

	const tabs = [
		{ id: 'overview', name: 'Overview', icon: 'home' },
		{ id: 'events', name: 'Events', icon: 'calendar' },
		{ id: 'map', name: 'Map', icon: 'map' },
		{ id: 'standings', name: 'Standings', icon: 'trophy' },
		{ id: 'decklists', name: 'Decklists', icon: 'cards' },
		{ id: 'results', name: 'Results', icon: 'chart' },
		{ id: 'rules', name: 'Rules & Info', icon: 'info' }
	];

	// Get active tab from URL, defaulting to 'overview'
	$: activeTab = $page.url.searchParams.get('tab') || 'overview';

	// Function to switch tabs and update URL
	function switchTab(tabId) {
		const url = new URL($page.url);
		if (tabId === 'overview') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', tabId);
		}
		goto(url.toString(), { replaceState: false, noScroll: true });
	}

	// Map state
	let selectedMapCircuit = null;

	// FAB Event Search state
	let searchZipcode = '';
	let searchDistance = '50';
	let searchTimeframe = 'month';
	let fabEvents = [];
	let searchCenter = null;
	let isSearching = false;
	let searchError = '';
	let fabSortBy = 'distance'; // 'distance', 'date', 'name'

	// Sorted FAB events based on current sort option
	$: sortedFabEvents = [...fabEvents].sort((a, b) => {
		switch (fabSortBy) {
			case 'date':
				if (!a.startTime) return 1;
				if (!b.startTime) return -1;
				return new Date(a.startTime) - new Date(b.startTime);
			case 'name':
				return (a.title || '').localeCompare(b.title || '');
			case 'distance':
			default:
				return (a.distance || 999) - (b.distance || 999);
		}
	});

	async function searchFabEvents() {
		if (!searchZipcode || !/^\d{5}$/.test(searchZipcode)) {
			searchError = 'Please enter a valid 5-digit zipcode';
			return;
		}

		isSearching = true;
		searchError = '';
		fabEvents = [];
		searchCenter = null;

		try {
			// Call the FAB events API
			const response = await fetch('/api/fab-events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					zipcode: searchZipcode,
					distance: parseInt(searchDistance),
					timeframe: searchTimeframe
				})
			});

			const result = await response.json();

			if (result.error) {
				searchError = result.error;
			} else if (result.events && result.events.length > 0) {
				fabEvents = result.events;
				searchCenter = result.searchCenter;
			} else {
				searchError = 'No events found for your search criteria. Try expanding your distance or timeframe.';
				// Still set searchCenter for map centering
				if (result.searchCenter) {
					searchCenter = result.searchCenter;
				}
			}
		} catch (error) {
			console.error('Search error:', error);
			searchError = 'Failed to search for events. Please try again.';
		} finally {
			isSearching = false;
		}
	}

	function clearFabSearch() {
		fabEvents = [];
		searchCenter = null;
		searchError = '';
		searchZipcode = '';
	}

	// Circuit location data (coordinates match SVG viewBox 0 0 960 600)
	const circuitLocations = {
		'Los Angeles': {
			name: 'Los Angeles',
			region: 'Southern California',
			venues: ['Top Deck Keep, Riverside, CA'],
			coordinates: { x: 145, y: 390 },
			color: 'blue',
			description: 'The Los Angeles circuit covers Southern California, featuring events at premier gaming venues in the Riverside and greater LA area.'
		},
		'St. Louis': {
			name: 'St. Louis',
			region: 'Midwest',
			venues: ['TBA'],
			coordinates: { x: 480, y: 280 },
			color: 'green',
			description: 'The St. Louis circuit serves the Midwest region, bringing competitive Flesh and Blood to the heart of America.'
		},
		'New England': {
			name: 'New England',
			region: 'Northeast',
			venues: ['TBA'],
			coordinates: { x: 820, y: 200 },
			color: 'purple',
			description: 'The New England circuit covers the Northeast, with events throughout Massachusetts, Connecticut, and surrounding states.'
		}
	};

	// Get events for a specific circuit
	function getCircuitEvents(circuit) {
		return (data.events || []).filter(e => e.circuit === circuit);
	}

	// Circuit colors for badges
	const circuitColors = {
		'Los Angeles': { bg: 'bg-blue-500', text: 'text-blue-400', bgLight: 'bg-blue-500/10' },
		'St. Louis': { bg: 'bg-green-500', text: 'text-green-400', bgLight: 'bg-green-500/10' },
		'New England': { bg: 'bg-purple-500', text: 'text-purple-400', bgLight: 'bg-purple-500/10' }
	};

	// Standings search and filter
	let searchQuery = '';
	let standingsCircuit = 'all';

	// Decklists filters
	let decklistCircuit = 'all';
	let decklistHero = 'all';
	let decklistSearch = '';

	// FAQ accordion state
	let openFaqIndex = null;

	const faqItems = [
		{
			question: 'What is the AGE Open Series?',
			answer: 'The AGE Open Series is a year-long competitive Flesh and Blood tournament circuit featuring 8 monthly $1,000 Opens across Los Angeles, St. Louis, and New England. Players earn AGE Points based on their performance, with the top 16 players qualifying for the Player\'s Championship with a $3,000 prize pool.'
		},
		{
			question: 'How do I register for an event?',
			answer: 'You can register for any AGE Open event directly on this website. Browse the Events tab, select the event you want to attend, and complete the online registration with payment. Premium members receive a 10% discount on all event registrations.'
		},
		{
			question: 'What formats are played at AGE Opens?',
			answer: 'AGE Opens typically feature Classic Constructed as the primary format. Each event listing will specify the exact format being played. Check the event details page for format-specific rules and banned/restricted lists in effect for that tournament.'
		},
		{
			question: 'How do AGE Points work?',
			answer: 'AGE Points are earned based on tournament placement. 1st place earns 30 points, 2nd place 25 points, 3rd-4th 20 points, 5th-8th 15 points, 9th-12th 12 points, 13th-16th 8 points, and all participants receive 1 point. Points accumulate throughout the season to determine Player\'s Championship qualifiers.'
		},
		{
			question: 'How do I qualify for the Player\'s Championship?',
			answer: 'The top 16 players by total AGE Points accumulated throughout the season receive automatic invitations to the Player\'s Championship. Points are tracked per circuit (Los Angeles, St. Louis, New England), and you can view current standings in the Standings tab.'
		},
		{
			question: 'What is the prize structure for AGE Opens?',
			answer: 'Each AGE Open has a $1,000 cash prize pool: 1st place receives $400, 2nd place $200, 3rd-4th $100 each, and 5th-8th $50 each. Additionally, all players in Top 16 earn AGE Points toward Player\'s Championship qualification.'
		},
		{
			question: 'Do I need a GEM ID to participate?',
			answer: 'While a GEM ID is not always required, we strongly recommend having one for accurate tracking of your results and AGE Points. Some events may require GEM ID for registration. You can register for a free GEM ID through Legend Story Studios.'
		},
		{
			question: 'What should I bring to an AGE Open?',
			answer: 'Bring your registered deck (sleeved), dice/counters, a playmat (optional), pen and paper for life tracking, your GEM ID, and a valid photo ID. Arrive at least 30 minutes before the event start time to complete check-in.'
		},
		{
			question: 'Can I get a refund if I can\'t attend?',
			answer: 'Refund policies vary by event. Generally, refunds are available up to 48 hours before the event start time. Contact us directly for refund requests or special circumstances. Last-minute cancellations may not be eligible for refunds.'
		},
		{
			question: 'How can I follow event coverage?',
			answer: 'Live coverage and results are posted on our social media channels and this website. After events conclude, full standings, decklists (when made public), and coverage highlights are available in the Results and Decklists tabs.'
		}
	];

	function toggleFaq(index) {
		openFaqIndex = openFaqIndex === index ? null : index;
	}

	// Get unique heroes from decklists
	$: uniqueHeroes = [...new Set((data.decklists || []).map(d => d.hero).filter(Boolean))].sort();

	// Filter decklists
	$: filteredDecklists = (data.decklists || [])
		.filter(d => decklistCircuit === 'all' || d.circuit === decklistCircuit)
		.filter(d => decklistHero === 'all' || d.hero === decklistHero)
		.filter(d => {
			if (!decklistSearch) return true;
			const search = decklistSearch.toLowerCase();
			return d.playerName.toLowerCase().includes(search) ||
				(d.deckName && d.deckName.toLowerCase().includes(search)) ||
				(d.hero && d.hero.toLowerCase().includes(search));
		});

	// Filter events by circuit
	$: laEvents = (data.events || []).filter((e) => e.circuit === 'Los Angeles');
	$: stlEvents = (data.events || []).filter((e) => e.circuit === 'St. Louis');
	$: neEvents = (data.events || []).filter((e) => e.circuit === 'New England');

	// Count events per circuit
	$: laCount = laEvents.length;
	$: stlCount = stlEvents.length;
	$: neCount = neEvents.length;

	// All upcoming events sorted by date
	$: upcomingEvents = (data.events || []).filter((e) => new Date(e.eventDate) >= new Date());

	// Circuit filter state
	let selectedCircuit = 'all';

	// Filtered events based on circuit selection
	$: filteredEvents = selectedCircuit === 'all'
		? (data.events || [])
		: (data.events || []).filter((e) => e.circuit === selectedCircuit);

	// Get circuit color classes
	function getCircuitColor(circuit) {
		return circuitColors[circuit] || { bg: 'bg-gray-500', text: 'text-gray-400', bgLight: 'bg-gray-500/10' };
	}

	// Filter standings by circuit and search query
	$: filteredStandings = (data.standings || [])
		.filter((p) => standingsCircuit === 'all' || p.circuit === standingsCircuit)
		.filter((p) => p.playerName.toLowerCase().includes(searchQuery.toLowerCase()))
		.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
		.map((p, index) => ({ ...p, rank: index + 1 }));

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
	<title>AGE Open Series</title>
	<meta
		name="description"
		content="Join the AGE Open Series - premier competitive Flesh and Blood tournaments in Los Angeles, St. Louis, and New England"
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
	<nav class="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-4">
			<div class="flex space-x-1 overflow-x-auto py-2 scrollbar-hide">
				{#each tabs as tab}
					<button
						on:click={() => switchTab(tab.id)}
						class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all {activeTab === tab.id
							? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
							: 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}"
					>
						{#if tab.icon === 'home'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
							</svg>
						{:else if tab.icon === 'calendar'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
						{:else if tab.icon === 'map'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
							</svg>
						{:else if tab.icon === 'trophy'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
						{:else if tab.icon === 'cards'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
						{:else if tab.icon === 'chart'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						{:else if tab.icon === 'info'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						{/if}
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
			<div class="space-y-8">
				<!-- Animated Stats Row -->
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<!-- Upcoming Events Card -->
					<div class="group relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/50 via-gray-900 to-gray-950 p-5 transition-all duration-300 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
						<div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-colors"></div>
						<div class="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-600/10 rounded-full blur-xl"></div>
						<div class="relative flex items-center gap-4">
							<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
								<svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>
							<div>
								<div class="text-3xl font-bold text-white">{upcomingEvents.length}</div>
								<div class="text-sm text-blue-300/80">Upcoming Events</div>
							</div>
						</div>
					</div>

					<!-- Circuits Card -->
					<div class="group relative overflow-hidden rounded-xl border border-green-500/30 bg-gradient-to-br from-green-950/50 via-gray-900 to-gray-950 p-5 transition-all duration-300 hover:border-green-500/60 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-1">
						<div class="absolute top-0 right-0 w-24 h-24 bg-green-500/20 rounded-full blur-2xl group-hover:bg-green-500/30 transition-colors"></div>
						<div class="absolute -bottom-4 -left-4 w-16 h-16 bg-green-600/10 rounded-full blur-xl"></div>
						<div class="relative flex items-center gap-4">
							<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
								<svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							</div>
							<div>
								<div class="text-3xl font-bold text-white">3</div>
								<div class="text-sm text-green-300/80">Active Circuits</div>
							</div>
						</div>
					</div>

					<!-- Players Card -->
					<div class="group relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-gray-900 to-gray-950 p-5 transition-all duration-300 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1">
						<div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors"></div>
						<div class="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-600/10 rounded-full blur-xl"></div>
						<div class="relative flex items-center gap-4">
							<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
								<svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
							</div>
							<div>
								<div class="text-3xl font-bold text-white">{(data.standings || []).length}</div>
								<div class="text-sm text-purple-300/80">Ranked Players</div>
							</div>
						</div>
					</div>

					<!-- Prize Pool Card -->
					<div class="group relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/50 via-gray-900 to-gray-950 p-5 transition-all duration-300 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1">
						<div class="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors"></div>
						<div class="absolute -bottom-4 -left-4 w-16 h-16 bg-amber-600/10 rounded-full blur-xl"></div>
						<div class="relative flex items-center gap-4">
							<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
								<svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<div class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">$1,000</div>
								<div class="text-sm text-amber-300/80">Per Event Prize Pool</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Main Content Grid -->
				<div class="grid gap-8 lg:grid-cols-3">
					<!-- Left Column: Featured Event + Upcoming Events -->
					<div class="lg:col-span-2 space-y-6">
						<!-- Featured Next Event - Enhanced -->
						{#if upcomingEvents.length > 0}
							{@const nextEvent = upcomingEvents[0]}
							{@const colors = getCircuitColor(nextEvent.circuit)}
							<div class="group relative overflow-hidden rounded-2xl border-2 {colors.bg.replace('bg-', 'border-')}/40 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 transition-all duration-500 hover:border-opacity-80 hover:shadow-2xl hover:shadow-blue-500/10">
								<!-- Animated background effects -->
								<div class="absolute inset-0 bg-gradient-to-br {colors.bgLight} opacity-30"></div>
								<div class="absolute top-0 right-0 w-96 h-96 {colors.bgLight} rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-40 group-hover:opacity-60 transition-opacity"></div>
								<div class="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 opacity-40"></div>

								<!-- Decorative grid pattern -->
								<div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 24px 24px;"></div>

								<!-- Animated corner accent -->
								<div class="absolute top-0 right-0 w-32 h-32">
									<div class="absolute top-4 right-4 w-2 h-16 {colors.bg} rounded-full opacity-60"></div>
									<div class="absolute top-4 right-4 w-16 h-2 {colors.bg} rounded-full opacity-60"></div>
								</div>

								<div class="relative p-8">
									<div class="flex items-center gap-3 mb-5">
										<span class="relative px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-widest border border-white/20">
											<span class="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
											<span class="ml-2">Next Event</span>
										</span>
										{#if nextEvent.circuit}
											<span class="rounded-full {colors.bg} px-4 py-1.5 text-xs font-semibold text-white shadow-lg {colors.bg.replace('bg-', 'shadow-')}/30">
												{nextEvent.circuit}
											</span>
										{/if}
									</div>
									<h3 class="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all">{nextEvent.title}</h3>
									<div class="flex flex-wrap gap-6 mb-6">
										{#if nextEvent.eventDate}
											<div class="flex items-center gap-3 bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
												<div class="flex h-10 w-10 items-center justify-center rounded-lg {colors.bgLight}">
													<svg class="h-5 w-5 {colors.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
													</svg>
												</div>
												<span class="text-gray-200 font-medium">{formatDate(nextEvent.eventDate)}</span>
											</div>
										{/if}
										{#if nextEvent.location}
											<div class="flex items-center gap-3 bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
												<div class="flex h-10 w-10 items-center justify-center rounded-lg {colors.bgLight}">
													<svg class="h-5 w-5 {colors.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
													</svg>
												</div>
												<span class="text-gray-200 font-medium">{nextEvent.location}</span>
											</div>
										{/if}
									</div>
									<div class="flex items-center gap-5">
										<a href="/age-open/{nextEvent.id}" class="group/btn inline-flex items-center gap-2 rounded-xl {colors.bg} px-6 py-3 font-semibold text-white shadow-lg {colors.bg.replace('bg-', 'shadow-')}/40 hover:shadow-xl hover:scale-105 transition-all duration-300">
											View Event
											<svg class="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
											</svg>
										</a>
										<div class="flex items-center gap-2">
											<span class="text-sm text-gray-400">Entry:</span>
											<span class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">${formatPrice(nextEvent.price)}</span>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- Upcoming Events List - Enhanced -->
						<div class="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 overflow-hidden shadow-xl">
							<div class="flex items-center justify-between px-6 py-5 border-b border-gray-800/80 bg-gradient-to-r from-blue-500/5 to-transparent">
								<h3 class="font-bold text-white text-lg flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
										<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
									Upcoming Events
								</h3>
								<button on:click={() => switchTab('events')} class="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-blue-400 hover:text-white hover:bg-blue-500/20 transition-all">
									View All
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							</div>
							{#if upcomingEvents.length > 1}
								<div class="divide-y divide-gray-800/60">
									{#each upcomingEvents.slice(1, 5) as evt, i}
										{@const colors = getCircuitColor(evt.circuit)}
										<a href="/age-open/{evt.id}" class="group flex items-center gap-4 p-5 hover:bg-gradient-to-r hover:from-gray-800/50 hover:to-transparent transition-all duration-300">
											<!-- Event number badge -->
											<div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-800/80 font-bold text-gray-400 group-hover:bg-gradient-to-br group-hover:from-blue-500/20 group-hover:to-purple-500/20 group-hover:text-white transition-all">
												{i + 2}
											</div>
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 mb-1.5">
													{#if evt.circuit}
														<span class="h-2.5 w-2.5 rounded-full {colors.bg} ring-2 {colors.bg.replace('bg-', 'ring-')}/30"></span>
													{/if}
													<span class="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">{evt.title}</span>
												</div>
												<div class="flex flex-wrap items-center gap-4 text-sm text-gray-400">
													{#if evt.eventDate}
														<span class="flex items-center gap-1.5">
															<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
															</svg>
															{formatDate(evt.eventDate)}
														</span>
													{/if}
													{#if evt.location}
														<span class="hidden sm:flex items-center gap-1.5 truncate">
															<svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
															</svg>
															{evt.location}
														</span>
													{/if}
												</div>
											</div>
											<div class="flex-shrink-0 text-right">
												<span class="text-lg font-bold text-white">${formatPrice(evt.price)}</span>
												<div class="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<span class="text-xs text-blue-400">View →</span>
												</div>
											</div>
										</a>
									{/each}
								</div>
							{:else}
								<div class="p-8 text-center">
									<p class="text-gray-400">No additional upcoming events at this time.</p>
								</div>
							{/if}
						</div>

						<!-- Recent Results -->
						{#if (data.eventResults || []).length > 0}
							<div class="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
								<div class="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80">
									<h3 class="font-semibold text-white flex items-center gap-2">
										<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
										</svg>
										Recent Results
									</h3>
									<button on:click={() => switchTab('results')} class="text-sm text-blue-400 hover:text-blue-300 transition-colors">
										View All →
									</button>
								</div>
								<div class="divide-y divide-gray-800">
									{#each (data.eventResults || []).slice(0, 3) as eventResult}
										{@const colors = getCircuitColor(eventResult.event.circuit)}
										<div class="p-4">
											<div class="flex items-center gap-2 mb-3">
												{#if eventResult.event.circuit}
													<span class="h-2 w-2 rounded-full {colors.bg}"></span>
												{/if}
												<h4 class="font-medium text-white">{eventResult.event.title}</h4>
											</div>
											<div class="space-y-2">
												{#each eventResult.results.slice(0, 3) as result, i}
													<div class="flex items-center justify-between text-sm">
														<div class="flex items-center gap-3">
															<span class="flex h-6 w-6 items-center justify-center rounded-full {i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-amber-700/20 text-amber-600'} text-xs font-bold">
																{result.placement}
															</span>
															<span class="text-gray-300">{result.playerName}</span>
														</div>
														{#if result.hero}
															<span class="text-gray-500 text-xs">{result.hero}</span>
														{/if}
													</div>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Right Column: Standings + Decklists -->
					<div class="space-y-6">
						<!-- Top Standings - Enhanced -->
						<div class="relative rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/30 via-gray-900 to-gray-950 overflow-hidden shadow-xl">
							<div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
							<div class="relative flex items-center justify-between px-5 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-transparent">
								<h3 class="font-bold text-white flex items-center gap-3">
									<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
										<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
										</svg>
									</div>
									Leaderboard
								</h3>
								<button on:click={() => switchTab('standings')} class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all">
									Full Standings
									<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							</div>
							{#if (data.standings || []).length > 0}
								<div class="divide-y divide-gray-800/50">
									{#each (data.standings || []).slice(0, 8) as player, i}
										{@const colors = getCircuitColor(player.circuit)}
										<div class="group flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-transparent transition-all">
											<!-- Rank badge with special styling for top 3 -->
											{#if i === 0}
												<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white font-bold text-sm shadow-lg shadow-yellow-500/30">
													<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
														<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
													</svg>
												</div>
											{:else if i === 1}
												<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 font-bold text-sm shadow-lg">
													2
												</div>
											{:else if i === 2}
												<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 text-white font-bold text-sm shadow-lg">
													3
												</div>
											{:else}
												<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800/80 text-gray-400 font-medium text-sm group-hover:bg-gray-700 transition-colors">
													{i + 1}
												</div>
											{/if}
											<div class="flex-1 min-w-0">
												<div class="font-medium text-white truncate group-hover:text-purple-300 transition-colors">{player.playerName}</div>
												<div class="flex items-center gap-2 text-xs text-gray-500">
													<span class="h-2 w-2 rounded-full {colors.bg} ring-1 {colors.bg.replace('bg-', 'ring-')}/30"></span>
													{player.circuit}
												</div>
											</div>
											<div class="text-right">
												<span class="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{player.totalPoints || 0}</span>
												<div class="text-xs text-gray-500">pts</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="p-8 text-center">
									<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800/50">
										<svg class="h-7 w-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
										</svg>
									</div>
									<p class="text-gray-400 text-sm">No standings data yet</p>
								</div>
							{/if}
						</div>

						<!-- Latest Decklists - Enhanced -->
						<div class="relative rounded-2xl border border-green-500/30 bg-gradient-to-b from-green-950/30 via-gray-900 to-gray-950 overflow-hidden shadow-xl">
							<div class="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
							<div class="relative flex items-center justify-between px-5 py-4 border-b border-green-500/20 bg-gradient-to-r from-green-500/10 to-transparent">
								<h3 class="font-bold text-white flex items-center gap-3">
									<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30">
										<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
										</svg>
									</div>
									Decklists
								</h3>
								<button on:click={() => switchTab('decklists')} class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-green-400 hover:text-white hover:bg-green-500/20 transition-all">
									View All
									<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							</div>
							{#if (data.decklists || []).length > 0}
								<div class="divide-y divide-gray-800/50">
									{#each (data.decklists || []).slice(0, 5) as deck}
										{@const colors = getCircuitColor(deck.circuit)}
										<a href="/age-open/{deck.eventId}/decklist/{deck.id}" class="group block px-4 py-3 hover:bg-gradient-to-r hover:from-green-500/10 hover:to-transparent transition-all">
											<div class="flex items-start gap-3">
												<!-- Player initial avatar -->
												<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 text-sm font-bold text-white group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-colors">
													{deck.playerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
												</div>
												<div class="flex-1 min-w-0">
													<div class="flex items-center gap-2">
														<span class="font-medium text-white group-hover:text-green-300 transition-colors truncate">{deck.playerName}</span>
														{#if deck.circuit}
															<span class="h-2 w-2 rounded-full {colors.bg}"></span>
														{/if}
													</div>
													{#if deck.hero}
														<div class="text-sm text-green-400/80 truncate">{deck.hero}</div>
													{/if}
													<div class="text-xs text-gray-500 mt-0.5 truncate">{deck.eventTitle}</div>
												</div>
												<svg class="h-4 w-4 text-gray-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
												</svg>
											</div>
										</a>
									{/each}
								</div>
							{:else}
								<div class="p-8 text-center">
									<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800/50">
										<svg class="h-7 w-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
										</svg>
									</div>
									<p class="text-gray-400 text-sm">No public decklists yet</p>
								</div>
							{/if}
						</div>

						<!-- Circuit Summary - Enhanced -->
						<div class="relative rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-950/30 via-gray-900 to-gray-950 overflow-hidden shadow-xl">
							<div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
							<div class="relative px-5 py-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-transparent">
								<h3 class="font-bold text-white flex items-center gap-3">
									<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
										<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
										</svg>
									</div>
									Our Circuits
								</h3>
							</div>
							<div class="p-3">
								<div class="space-y-2">
									<!-- Los Angeles -->
									<button on:click={() => switchTab('map')} class="group w-full flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent hover:from-blue-500/15 border border-transparent hover:border-blue-500/30 transition-all text-left">
										<div class="relative">
											<div class="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center">
												<span class="text-white font-bold">LA</span>
											</div>
											<div class="absolute -top-1 -right-1 h-4 w-4 bg-blue-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-gray-900">
												{laCount}
											</div>
										</div>
										<div class="flex-1">
											<div class="font-semibold text-white group-hover:text-blue-300 transition-colors">Los Angeles</div>
											<div class="text-xs text-gray-500">Southern California</div>
										</div>
										<svg class="h-5 w-5 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</button>

									<!-- St. Louis -->
									<button on:click={() => switchTab('map')} class="group w-full flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-green-500/5 to-transparent hover:from-green-500/15 border border-transparent hover:border-green-500/30 transition-all text-left">
										<div class="relative">
											<div class="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30 flex items-center justify-center">
												<span class="text-white font-bold">STL</span>
											</div>
											<div class="absolute -top-1 -right-1 h-4 w-4 bg-green-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-gray-900">
												{stlCount}
											</div>
										</div>
										<div class="flex-1">
											<div class="font-semibold text-white group-hover:text-green-300 transition-colors">St. Louis</div>
											<div class="text-xs text-gray-500">Midwest</div>
										</div>
										<svg class="h-5 w-5 text-gray-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</button>

									<!-- New England -->
									<button on:click={() => switchTab('map')} class="group w-full flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/5 to-transparent hover:from-purple-500/15 border border-transparent hover:border-purple-500/30 transition-all text-left">
										<div class="relative">
											<div class="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30 flex items-center justify-center">
												<span class="text-white font-bold">NE</span>
											</div>
											<div class="absolute -top-1 -right-1 h-4 w-4 bg-purple-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-gray-900">
												{neCount}
											</div>
										</div>
										<div class="flex-1">
											<div class="font-semibold text-white group-hover:text-purple-300 transition-colors">New England</div>
											<div class="text-xs text-gray-500">Northeast</div>
										</div>
										<svg class="h-5 w-5 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</button>
								</div>
							</div>
							<div class="p-3 pt-0">
								<button on:click={() => switchTab('map')} class="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] transition-all">
									Explore Circuit Map
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Quick Info Banner - Enhanced -->
				<div class="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/50 via-purple-950/50 to-pink-950/50 p-8">
					<!-- Animated background elements -->
					<div class="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
					<div class="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
					<div class="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>

					<!-- Decorative elements -->
					<div class="absolute top-4 left-4 w-2 h-12 bg-gradient-to-b from-blue-500 to-transparent rounded-full opacity-60"></div>
					<div class="absolute top-4 left-4 w-12 h-2 bg-gradient-to-r from-blue-500 to-transparent rounded-full opacity-60"></div>
					<div class="absolute bottom-4 right-4 w-2 h-12 bg-gradient-to-t from-pink-500 to-transparent rounded-full opacity-60"></div>
					<div class="absolute bottom-4 right-4 w-12 h-2 bg-gradient-to-l from-pink-500 to-transparent rounded-full opacity-60"></div>

					<div class="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
						<div class="flex items-center gap-5">
							<div class="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl shadow-purple-500/30">
								<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
								</svg>
							</div>
							<div>
								<h3 class="text-2xl font-bold text-white mb-2">Ready to compete?</h3>
								<p class="text-gray-300 max-w-xl">Join the AGE Open Series and compete for <span class="text-amber-400 font-semibold">$1,000</span> prizes and AGE Points toward the <span class="text-purple-400 font-semibold">Player's Championship</span>.</p>
							</div>
						</div>
						<div class="flex flex-col sm:flex-row gap-3">
							<button on:click={() => switchTab('events')} class="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-300">
								Browse All Events
								<svg class="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
							</button>
							<button on:click={() => switchTab('rules')} class="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-6 py-3.5 font-medium text-white border border-white/20 hover:bg-white/20 transition-all">
								Learn More
							</button>
						</div>
					</div>
				</div>
			</div>

		<!-- Events Tab -->
		{:else if activeTab === 'events'}
			<div class="space-y-8">
				<!-- Circuit Filter -->
				<div class="flex flex-wrap items-center gap-3">
					<span class="text-sm font-medium text-gray-400">Filter by Circuit:</span>
					<div class="flex flex-wrap gap-2">
						<button
							on:click={() => (selectedCircuit = 'all')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-colors {selectedCircuit === 'all'
								? 'bg-white text-gray-900'
								: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
						>
							All Events
						</button>
						<button
							on:click={() => (selectedCircuit = 'Los Angeles')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-colors {selectedCircuit === 'Los Angeles'
								? 'bg-blue-500 text-white'
								: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}"
						>
							Los Angeles ({laCount})
						</button>
						<button
							on:click={() => (selectedCircuit = 'St. Louis')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-colors {selectedCircuit === 'St. Louis'
								? 'bg-green-500 text-white'
								: 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}"
						>
							St. Louis ({stlCount})
						</button>
						<button
							on:click={() => (selectedCircuit = 'New England')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-colors {selectedCircuit === 'New England'
								? 'bg-purple-500 text-white'
								: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}"
						>
							New England ({neCount})
						</button>
					</div>
				</div>

				<!-- Events Grid -->
				{#if filteredEvents.length > 0}
					<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{#each filteredEvents as evt}
							<article
								class="group overflow-hidden rounded-lg border border-gray-800 bg-gray-900 shadow-sm transition-all hover:border-gray-700 hover:shadow-lg"
							>
								<div class="p-6">
									<!-- Badges -->
									<div class="mb-3 flex flex-wrap gap-2">
										{#if evt.format}
											<span
												class="rounded-full bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-200"
											>
												{evt.format}
											</span>
										{/if}
										{#if evt.circuit}
											{@const colors = getCircuitColor(evt.circuit)}
											<span
												class="rounded-full {colors.bg} px-2.5 py-1 text-xs font-medium text-white"
											>
												{evt.circuit}
											</span>
										{/if}
										{#if evt.premiumDiscount}
											<span
												class="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-medium text-white"
											>
												Premium: 10% Off
											</span>
										{/if}
									</div>

									<!-- Title -->
									<h3 class="mb-3 text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
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
											href="/age-open/{evt.id}"
											class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
										>
											View Details
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
						<h3 class="mb-2 text-xl font-semibold text-white">No Events Found</h3>
						<p class="text-gray-400">
							{#if selectedCircuit !== 'all'}
								No events found for the {selectedCircuit} circuit. Try selecting a different circuit.
							{:else}
								Check back soon for new tournament announcements!
							{/if}
						</p>
					</div>
				{/if}

				<!-- Quick Info Card -->
				<div class="rounded-lg border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6">
					<div class="grid gap-6 md:grid-cols-3">
						<div class="flex gap-4">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10"
							>
								<svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white">$1,000 Opens</h3>
								<p class="text-sm text-gray-400">Cash prizes for Top 8 finishers</p>
							</div>
						</div>
						<div class="flex gap-4">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/10"
							>
								<svg class="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white">AGE Points</h3>
								<p class="text-sm text-gray-400">Earn points toward the Championship</p>
							</div>
						</div>
						<div class="flex gap-4">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10"
							>
								<svg class="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white">Premium Discount</h3>
								<p class="text-sm text-gray-400">Members save 10% on all events</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Map Tab -->
		{#if activeTab === 'map'}
			<div class="space-y-8">
				<!-- Header -->
				<div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600/20 via-gray-900 to-gray-900 border border-blue-500/20 p-8">
					<div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
					<div class="relative">
						<div class="flex items-center gap-3 mb-3">
							<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
								<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
								</svg>
							</div>
							<div>
								<h2 class="text-2xl font-bold text-white">Event Finder</h2>
								<p class="text-gray-400">Find AGE Open circuits and FAB TCG events near you</p>
							</div>
						</div>
					</div>
				</div>

				<!-- FAB Event Search Form -->
				<div class="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
					<div class="flex items-center gap-3 mb-5">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 ring-1 ring-amber-500/30">
							<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-white">Search FAB TCG Events</h3>
							<p class="text-sm text-gray-400">Find official Flesh and Blood events near your location</p>
						</div>
					</div>

					<form on:submit|preventDefault={searchFabEvents} class="flex flex-col gap-4">
						<div class="grid gap-4 sm:grid-cols-4">
							<div>
								<label for="zipcode" class="block text-sm font-medium text-gray-300 mb-1">Zipcode</label>
								<input
									id="zipcode"
									type="text"
									bind:value={searchZipcode}
									placeholder="e.g. 92503"
									maxlength="5"
									inputmode="numeric"
									class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
								/>
							</div>
							<div>
								<label for="distance" class="block text-sm font-medium text-gray-300 mb-1">Distance</label>
								<select
									id="distance"
									bind:value={searchDistance}
									class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
								>
									<option value="10">10 miles</option>
									<option value="25">25 miles</option>
									<option value="50">50 miles</option>
									<option value="100">100 miles</option>
								</select>
							</div>
							<div>
								<label for="timeframe" class="block text-sm font-medium text-gray-300 mb-1">Timeframe</label>
								<select
									id="timeframe"
									bind:value={searchTimeframe}
									class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
								>
									<option value="week">This Week</option>
									<option value="2weeks">Next 2 Weeks</option>
									<option value="month">This Month</option>
									<option value="3months">Next 3 Months</option>
								</select>
							</div>
							<div class="flex items-end gap-2">
								<button
									type="submit"
									disabled={isSearching}
									class="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{#if isSearching}
										<span class="flex items-center justify-center gap-2">
											<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Searching...
										</span>
									{:else}
										Search
									{/if}
								</button>
								{#if fabEvents.length > 0 || searchError}
									<button
										type="button"
										on:click={clearFabSearch}
										class="rounded-lg bg-gray-800 px-3 py-2.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
										title="Clear search"
									>
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								{/if}
							</div>
						</div>

						{#if searchError}
							<div class="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg px-4 py-2">
								<svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								{searchError}
							</div>
						{/if}
					</form>

					<p class="mt-3 text-xs text-gray-500">
						Data sourced from fabtcg.com event locator. Results are fetched in real-time and not stored.
					</p>
				</div>

				<div class="grid gap-6 lg:grid-cols-3">
					<!-- Interactive Map -->
					<div class="lg:col-span-2">
						<div class="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden shadow-xl shadow-black/20">
							<!-- Map Header -->
							<div class="px-5 py-4 border-b border-gray-800 bg-gray-900/80">
								<div class="flex items-center justify-between">
									<h3 class="font-semibold text-white">Circuit Map</h3>
									<div class="flex items-center gap-2 text-xs text-gray-500">
										<span class="flex items-center gap-1.5">
											<span class="h-2 w-2 rounded-full bg-blue-500"></span>
											AGE Circuits
										</span>
										{#if fabEvents.length > 0}
											<span class="flex items-center gap-1.5">
												<span class="h-2 w-2 rounded-full bg-amber-500"></span>
												FAB Events
											</span>
										{/if}
									</div>
								</div>
							</div>

							<!-- Leaflet Map -->
							<div class="h-[500px]">
								{#if browser}
									<CircuitMap
										circuits={Object.values(circuitLocations)}
										selectedCircuit={selectedMapCircuit}
										onCircuitSelect={(name) => selectedMapCircuit = selectedMapCircuit === name ? null : name}
										{fabEvents}
										{searchCenter}
									/>
								{:else}
									<div class="w-full h-full flex items-center justify-center bg-gray-800">
										<div class="flex flex-col items-center gap-3">
											<svg class="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											<p class="text-gray-400">Loading map...</p>
										</div>
									</div>
								{/if}
							</div>

							<!-- Circuit Selector -->
							<div class="p-4 border-t border-gray-800 bg-gray-950/50">
								<div class="flex flex-wrap items-center justify-center gap-2">
									{#each Object.entries(circuitLocations) as [name, location]}
										{@const colors = circuitColors[name]}
										<button
											on:click={() => selectedMapCircuit = selectedMapCircuit === name ? null : name}
											class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
												{selectedMapCircuit === name
													? colors.bg + ' text-white shadow-lg'
													: 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 ring-1 ring-gray-700'}"
										>
											<span class="h-2 w-2 rounded-full {colors.bg}"></span>
											{name}
										</button>
									{/each}
								</div>
							</div>
						</div>
					</div>

					<!-- Circuit Details Panel -->
					<div class="space-y-4">
						{#if selectedMapCircuit}
							{@const circuit = circuitLocations[selectedMapCircuit]}
							{@const colors = circuitColors[selectedMapCircuit]}
							{@const circuitEvents = getCircuitEvents(selectedMapCircuit)}

							<div class="rounded-lg border-2 {colors.bg.replace('bg-', 'border-')}/50 bg-gray-900 p-6">
								<div class="flex items-center gap-3 mb-4">
									<div class="flex h-12 w-12 items-center justify-center rounded-full {colors.bgLight}">
										<svg class="h-6 w-6 {colors.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
									</div>
									<div>
										<h3 class="text-xl font-bold text-white">{circuit.name}</h3>
										<p class="text-sm {colors.text}">{circuit.region}</p>
									</div>
								</div>

								<p class="text-sm text-gray-400 mb-4">{circuit.description}</p>

								<div class="border-t border-gray-800 pt-4">
									<h4 class="text-sm font-semibold text-gray-300 mb-2">Venues</h4>
									{#each circuit.venues as venue}
										<div class="flex items-start gap-2 text-sm text-gray-400">
											<svg class="h-4 w-4 mt-0.5 flex-shrink-0 {colors.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
											</svg>
											<span>{venue}</span>
										</div>
									{/each}
								</div>

								<!-- Upcoming Events for this circuit -->
								{#if circuitEvents.length > 0}
									<div class="border-t border-gray-800 pt-4 mt-4">
										<h4 class="text-sm font-semibold text-gray-300 mb-3">Upcoming Events ({circuitEvents.length})</h4>
										<div class="space-y-2">
											{#each circuitEvents.slice(0, 3) as evt}
												<a
													href="/age-open/{evt.id}"
													class="block rounded-lg bg-gray-800/50 p-3 hover:bg-gray-800 transition-colors"
												>
													<div class="font-medium text-white text-sm">{evt.title}</div>
													<div class="text-xs text-gray-500 mt-1">
														{evt.eventDate ? formatDate(evt.eventDate) : 'Date TBA'}
													</div>
												</a>
											{/each}
											{#if circuitEvents.length > 3}
												<button
													on:click={() => switchTab('events')}
													class="w-full text-center text-sm {colors.text} hover:underline py-2"
												>
													View all {circuitEvents.length} events →
												</button>
											{/if}
										</div>
									</div>
								{:else}
									<div class="border-t border-gray-800 pt-4 mt-4">
										<p class="text-sm text-gray-500">No upcoming events scheduled for this circuit.</p>
									</div>
								{/if}
							</div>
						{:else}
							<!-- No circuit selected -->
							<div class="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center">
								<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
									<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
									</svg>
								</div>
								<h3 class="text-lg font-semibold text-white mb-2">Select a Circuit</h3>
								<p class="text-sm text-gray-400">Click on a circuit marker or button to view details and upcoming events.</p>
							</div>

							<!-- Quick Stats -->
							<div class="grid gap-3">
								{#each Object.entries(circuitLocations) as [name, location]}
									{@const colors = circuitColors[name]}
									{@const eventCount = getCircuitEvents(name).length}
									<button
										on:click={() => selectedMapCircuit = name}
										class="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 transition-colors text-left"
									>
										<div class="flex items-center gap-3">
											<div class="h-3 w-3 rounded-full {colors.bg}"></div>
											<span class="font-medium text-white">{name}</span>
										</div>
										<span class="text-sm text-gray-400">{eventCount} event{eventCount !== 1 ? 's' : ''}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Circuit Summary Cards -->
				<div class="grid gap-4 md:grid-cols-3">
					{#each Object.entries(circuitLocations) as [name, location]}
						{@const colors = circuitColors[name]}
						{@const eventCount = getCircuitEvents(name).length}
						<div class="rounded-lg border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 {selectedMapCircuit === name ? 'ring-2 ' + colors.bg.replace('bg-', 'ring-') + '/50' : ''}">
							<div class="flex items-center gap-3 mb-4">
								<div class="h-4 w-4 rounded-full {colors.bg}"></div>
								<h3 class="text-lg font-semibold text-white">{name}</h3>
							</div>
							<div class="grid grid-cols-2 gap-4 text-center">
								<div>
									<div class="text-2xl font-bold {colors.text}">{eventCount}</div>
									<div class="text-xs text-gray-500">Events</div>
								</div>
								<div>
									<div class="text-2xl font-bold text-white">{location.venues.length}</div>
									<div class="text-xs text-gray-500">Venues</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- FAB Events List (when search results exist) -->
				{#if fabEvents.length > 0}
					<div class="rounded-lg border border-amber-800/50 bg-gray-900 overflow-hidden">
						<div class="bg-gradient-to-r from-amber-500/10 to-gray-900 px-6 py-4 border-b border-amber-800/30">
							<div class="flex items-center justify-between flex-wrap gap-4">
								<div class="flex items-center gap-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
										<svg class="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
									</div>
									<div>
										<h3 class="text-lg font-semibold text-white">FAB TCG Events Near You</h3>
										<p class="text-sm text-gray-400">Found {fabEvents.length} event{fabEvents.length !== 1 ? 's' : ''} within {searchDistance} miles of {searchZipcode}</p>
									</div>
								</div>
								<div class="flex items-center gap-3">
									<div class="flex items-center gap-2">
										<span class="text-xs text-gray-400">Sort by:</span>
										<select
											bind:value={fabSortBy}
											class="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
										>
											<option value="distance">Distance</option>
											<option value="date">Date</option>
											<option value="name">Name</option>
										</select>
									</div>
									<button
										on:click={clearFabSearch}
										class="text-gray-400 hover:text-white transition-colors"
										title="Clear results"
									>
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							</div>
						</div>
						<div class="divide-y divide-gray-800">
							{#each sortedFabEvents as event, index}
								<div class="p-4 hover:bg-gray-800/50 transition-colors">
									<div class="flex items-start gap-4">
										<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 font-bold text-sm">
											{index + 1}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-start justify-between gap-4">
												<div>
													<h4 class="font-medium text-white">{event.title || 'FAB Event'}</h4>
													{#if event.store}
														<p class="text-sm text-gray-400 mt-0.5">{event.store}</p>
													{/if}
												</div>
												{#if event.format}
													<span class="flex-shrink-0 rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300">
														{event.format}
													</span>
												{/if}
											</div>
											<div class="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
												{#if event.date}
													<div class="flex items-center gap-1.5">
														<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
														</svg>
														<span>{event.date}</span>
													</div>
												{/if}
												{#if event.distance}
													<div class="flex items-center gap-1.5 text-amber-500">
														<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
														</svg>
														<span>{event.distance} mi</span>
													</div>
												{/if}
												{#if event.location}
													<div class="flex items-center gap-1.5">
														<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
														</svg>
														<span class="truncate">{event.location}</span>
													</div>
												{/if}
											</div>
											<div class="flex flex-wrap items-center gap-3 mt-3">
												{#if event.tournamentType}
													<span class="text-xs text-gray-500">{event.tournamentType}</span>
												{/if}
												{#if event.storeUrl}
													<a
														href={event.storeUrl}
														target="_blank"
														rel="noopener noreferrer"
														class="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors"
													>
														<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
														</svg>
														View Store
													</a>
												{/if}
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
						<div class="px-6 py-3 bg-gray-800/50 border-t border-gray-800">
							<p class="text-xs text-gray-500 text-center">
								Events sourced from fabtcg.com. Visit the official site for registration and more details.
							</p>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Decklists Tab -->
		{#if activeTab === 'decklists'}
			<div class="space-y-6">
				<div>
					<h2 class="mb-2 text-3xl font-bold text-white">Decklists</h2>
					<p class="text-gray-400">Browse decklists from AGE Open Series events</p>
				</div>

				<!-- Search and Filters -->
				<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div class="relative flex-1 max-w-md">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<input
							type="text"
							bind:value={decklistSearch}
							placeholder="Search by player, deck name, or hero..."
							class="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<div class="flex flex-wrap gap-3">
						<!-- Hero Filter -->
						<select
							bind:value={decklistHero}
							class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						>
							<option value="all">All Heroes</option>
							{#each uniqueHeroes as hero}
								<option value={hero}>{hero}</option>
							{/each}
						</select>

						<!-- Circuit Filter -->
						<div class="flex flex-wrap gap-2">
							<button
								on:click={() => (decklistCircuit = 'all')}
								class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {decklistCircuit === 'all'
									? 'bg-white text-gray-900'
									: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
							>
								All
							</button>
							<button
								on:click={() => (decklistCircuit = 'Los Angeles')}
								class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {decklistCircuit === 'Los Angeles'
									? 'bg-blue-500 text-white'
									: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}"
							>
								LA
							</button>
							<button
								on:click={() => (decklistCircuit = 'St. Louis')}
								class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {decklistCircuit === 'St. Louis'
									? 'bg-green-500 text-white'
									: 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}"
							>
								STL
							</button>
							<button
								on:click={() => (decklistCircuit = 'New England')}
								class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {decklistCircuit === 'New England'
									? 'bg-purple-500 text-white'
									: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}"
							>
								NE
							</button>
						</div>
					</div>
				</div>

				{#if (data.decklists || []).length === 0}
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
						<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
							<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">No Decklists Yet</h3>
						<p class="text-gray-400">Decklists from completed events will appear here.</p>
					</div>
				{:else if filteredDecklists.length === 0}
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
						<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
							<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">No Matches Found</h3>
						<p class="text-gray-400">Try adjusting your search or filters.</p>
						<button
							on:click={() => { decklistSearch = ''; decklistCircuit = 'all'; decklistHero = 'all'; }}
							class="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
						>
							Clear Filters
						</button>
					</div>
				{:else}
					<!-- Results count -->
					<div class="text-sm text-gray-400">
						Showing {filteredDecklists.length} decklist{filteredDecklists.length !== 1 ? 's' : ''}
					</div>

					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each filteredDecklists as decklist}
							<a href="/age-open/{decklist.eventId}/decklist/{decklist.id}" class="group block rounded-lg border border-gray-800 bg-gray-900 p-6 hover:border-gray-700 transition-colors">
								<div class="flex items-start justify-between mb-3">
									<div>
										<h3 class="font-semibold text-white group-hover:text-blue-400 transition-colors">{decklist.playerName}</h3>
										{#if decklist.hero}
											<p class="text-sm text-blue-400">{decklist.hero}</p>
										{/if}
									</div>
									{#if decklist.circuit}
										{@const colors = getCircuitColor(decklist.circuit)}
										<span class="rounded-full {colors.bg} px-2 py-0.5 text-xs font-medium text-white">
											{decklist.circuit}
										</span>
									{/if}
								</div>
								{#if decklist.deckName}
									<p class="text-sm text-gray-300 mb-2">{decklist.deckName}</p>
								{/if}
								<div class="flex items-center justify-between text-xs text-gray-500">
									<span>{decklist.eventTitle}</span>
									<span>{decklist.cards?.length || 0} cards</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
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
							<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search players..."
							class="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<div class="flex flex-wrap gap-2">
						<button
							on:click={() => (standingsCircuit = 'all')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-colors {standingsCircuit === 'all'
								? 'bg-white text-gray-900'
								: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
						>
							All Circuits
						</button>
						<button
							on:click={() => (standingsCircuit = 'Los Angeles')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-colors {standingsCircuit === 'Los Angeles'
								? 'bg-blue-500 text-white'
								: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}"
						>
							Los Angeles
						</button>
						<button
							on:click={() => (standingsCircuit = 'St. Louis')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-colors {standingsCircuit === 'St. Louis'
								? 'bg-green-500 text-white'
								: 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}"
						>
							St. Louis
						</button>
						<button
							on:click={() => (standingsCircuit = 'New England')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-colors {standingsCircuit === 'New England'
								? 'bg-purple-500 text-white'
								: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}"
						>
							New England
						</button>
					</div>
				</div>

				<!-- Top 3 Spotlight -->
				{#if filteredStandings.length >= 3}
					<div class="grid grid-cols-3 gap-4">
						<!-- 2nd Place -->
						<div class="mt-8 rounded-xl border border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 p-6 text-center relative overflow-hidden">
							<div class="absolute inset-0 bg-gradient-to-b from-gray-400/10 to-transparent"></div>
							<div class="relative">
								<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-400/20 text-2xl font-bold text-gray-300">
									2
								</div>
								<div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-400/20 text-xl font-bold text-gray-300">
									{filteredStandings[1].playerName.split(' ').map((n) => n[0]).join('')}
								</div>
								<h3 class="mb-1 text-lg font-bold text-white truncate">{filteredStandings[1].playerName}</h3>
								{#if filteredStandings[1].circuit}
									{@const colors = getCircuitColor(filteredStandings[1].circuit)}
									<span class="inline-block rounded-full {colors.bg} px-2 py-0.5 text-xs font-medium text-white mb-2">
										{filteredStandings[1].circuit}
									</span>
								{/if}
								<div class="text-2xl font-bold text-gray-300">{filteredStandings[1].totalPoints || 0}</div>
								<div class="text-xs text-gray-500 mt-1">AGE Points</div>
								<div class="mt-3 flex justify-center gap-3 text-xs text-gray-400">
									<span>{filteredStandings[1].eventsPlayed || 0} events</span>
									<span>{filteredStandings[1].firstPlaceFinishes || 0} wins</span>
								</div>
							</div>
						</div>

						<!-- 1st Place -->
						<div class="rounded-xl border-2 border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-gray-900 p-6 text-center relative overflow-hidden">
							<div class="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent"></div>
							<div class="absolute top-2 left-1/2 -translate-x-1/2">
								<svg class="h-6 w-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
							</div>
							<div class="relative pt-4">
								<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/30 text-2xl font-bold text-yellow-400">
									1
								</div>
								<div class="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20 text-2xl font-bold text-yellow-400 ring-2 ring-yellow-500/50">
									{filteredStandings[0].playerName.split(' ').map((n) => n[0]).join('')}
								</div>
								<h3 class="mb-1 text-xl font-bold text-white truncate">{filteredStandings[0].playerName}</h3>
								{#if filteredStandings[0].circuit}
									{@const colors = getCircuitColor(filteredStandings[0].circuit)}
									<span class="inline-block rounded-full {colors.bg} px-2 py-0.5 text-xs font-medium text-white mb-2">
										{filteredStandings[0].circuit}
									</span>
								{/if}
								<div class="text-3xl font-bold text-yellow-400">{filteredStandings[0].totalPoints || 0}</div>
								<div class="text-xs text-yellow-500/70 mt-1">AGE Points</div>
								<div class="mt-3 flex justify-center gap-3 text-xs text-gray-400">
									<span>{filteredStandings[0].eventsPlayed || 0} events</span>
									<span>{filteredStandings[0].firstPlaceFinishes || 0} wins</span>
								</div>
							</div>
						</div>

						<!-- 3rd Place -->
						<div class="mt-8 rounded-xl border border-gray-700 bg-gradient-to-b from-amber-900/20 to-gray-900 p-6 text-center relative overflow-hidden">
							<div class="absolute inset-0 bg-gradient-to-b from-amber-700/10 to-transparent"></div>
							<div class="relative">
								<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-700/20 text-2xl font-bold text-amber-600">
									3
								</div>
								<div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-700/20 text-xl font-bold text-amber-600">
									{filteredStandings[2].playerName.split(' ').map((n) => n[0]).join('')}
								</div>
								<h3 class="mb-1 text-lg font-bold text-white truncate">{filteredStandings[2].playerName}</h3>
								{#if filteredStandings[2].circuit}
									{@const colors = getCircuitColor(filteredStandings[2].circuit)}
									<span class="inline-block rounded-full {colors.bg} px-2 py-0.5 text-xs font-medium text-white mb-2">
										{filteredStandings[2].circuit}
									</span>
								{/if}
								<div class="text-2xl font-bold text-amber-500">{filteredStandings[2].totalPoints || 0}</div>
								<div class="text-xs text-gray-500 mt-1">AGE Points</div>
								<div class="mt-3 flex justify-center gap-3 text-xs text-gray-400">
									<span>{filteredStandings[2].eventsPlayed || 0} events</span>
									<span>{filteredStandings[2].firstPlaceFinishes || 0} wins</span>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Standings Table -->
				<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-800">
								<tr>
									<th class="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase">Rank</th>
									<th class="px-6 py-4 text-left text-xs font-semibold text-gray-100 uppercase">Player</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">Circuit</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">AGE Points</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">Events</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">1st</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">Top 4</th>
									<th class="px-6 py-4 text-center text-xs font-semibold text-gray-100 uppercase">Top 8</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-800">
								{#each filteredStandings as player}
									<tr class="hover:bg-gray-800/50 transition-colors">
										<td class="px-6 py-4">
											<div class="flex h-8 w-8 items-center justify-center rounded-full {player.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' : player.rank === 2 ? 'bg-gray-400/20 text-gray-400' : player.rank === 3 ? 'bg-orange-900/20 text-orange-600' : 'bg-gray-700/20 text-gray-400'} text-sm font-bold">
												{player.rank}
											</div>
										</td>
										<td class="px-6 py-4">
											<div class="flex items-center gap-3">
												<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 font-semibold">
													{player.playerName.split(' ').map((n) => n[0]).join('')}
												</div>
												<div>
													<div class="font-medium text-white">{player.playerName}</div>
													{#if player.gemId}
														<div class="text-xs text-gray-500">{player.gemId}</div>
													{/if}
												</div>
											</div>
										</td>
										<td class="px-6 py-4 text-center">
											{#if player.circuit}
												{@const colors = getCircuitColor(player.circuit)}
												<span class="rounded-full {colors.bg} px-2 py-0.5 text-xs font-medium text-white">
													{player.circuit}
												</span>
											{:else}
												<span class="text-gray-500">-</span>
											{/if}
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-lg font-bold text-blue-400">{player.totalPoints || 0}</span>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-sm text-gray-300">{player.eventsPlayed || 0}</span>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-sm font-medium text-yellow-400">{player.firstPlaceFinishes || 0}</span>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-sm font-medium text-gray-300">{player.top4Finishes || 0}</span>
										</td>
										<td class="px-6 py-4 text-center">
											<span class="text-sm font-medium text-purple-400">{player.top8Finishes || 0}</span>
										</td>
									</tr>
								{/each}
								{#if filteredStandings.length === 0}
									<tr>
										<td colspan="8" class="px-6 py-12 text-center">
											<div class="flex flex-col items-center gap-2">
												<svg class="h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
												</svg>
												<p class="text-gray-400">No standings data yet</p>
												<p class="text-sm text-gray-500">Standings will appear once events are completed</p>
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

		<!-- Results Tab -->
		{#if activeTab === 'results'}
			<div class="space-y-8">
				<div>
					<h2 class="mb-2 text-3xl font-bold text-white">Event Results</h2>
					<p class="text-gray-400">View standings and results from completed AGE Open Series events</p>
				</div>

				{#if (data.eventResults || []).length === 0}
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
						<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
							<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">No Results Yet</h3>
						<p class="text-gray-400">Results from completed events will appear here.</p>
					</div>
				{:else}
					{#each data.eventResults as eventData}
						<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
							<!-- Event Header -->
							<div class="bg-gray-800 p-6">
								<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
									<div>
										<h3 class="text-xl font-bold text-white">{eventData.event.title}</h3>
										<div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
											{#if eventData.event.eventDate}
												<span>{formatDate(eventData.event.eventDate)}</span>
											{/if}
											{#if eventData.event.location}
												<span>• {eventData.event.location}</span>
											{/if}
										</div>
									</div>
									<div class="flex flex-wrap gap-2">
										{#if eventData.event.format}
											<span class="rounded-full bg-gray-700 px-3 py-1 text-sm font-medium text-gray-200">
												{eventData.event.format}
											</span>
										{/if}
										{#if eventData.event.circuit}
											{@const colors = getCircuitColor(eventData.event.circuit)}
											<span class="rounded-full {colors.bg} px-3 py-1 text-sm font-medium text-white">
												{eventData.event.circuit}
											</span>
										{/if}
									</div>
								</div>
							</div>

							<!-- Results Table -->
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gray-850">
										<tr class="border-b border-gray-700">
											<th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Place</th>
											<th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
											<th class="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Record</th>
											<th class="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">AGE Pts</th>
											<th class="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Prize</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each eventData.results.slice(0, 8) as result}
											<tr class="hover:bg-gray-800/50 {result.placement <= 3 ? 'bg-gray-800/30' : ''}">
												<td class="px-6 py-4">
													<span class="inline-flex items-center justify-center w-8 h-8 rounded-full {result.placement === 1 ? 'bg-yellow-500/20 text-yellow-400' : result.placement === 2 ? 'bg-gray-400/20 text-gray-300' : result.placement === 3 ? 'bg-amber-600/20 text-amber-500' : 'bg-gray-800 text-gray-400'} font-bold text-sm">
														{result.placement}
													</span>
												</td>
												<td class="px-6 py-4">
													<div class="font-medium text-white">{result.playerName}</div>
													{#if result.gemId}
														<div class="text-xs text-gray-500">{result.gemId}</div>
													{/if}
												</td>
												<td class="px-6 py-4 text-center text-gray-300">
													{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}
												</td>
												<td class="px-6 py-4 text-center">
													<span class="font-medium text-blue-400">{result.agePoints || 0}</span>
												</td>
												<td class="px-6 py-4 text-center">
													{#if result.prizeAmount}
														<span class="font-medium text-green-400">${result.prizeAmount}</span>
													{:else}
														<span class="text-gray-500">-</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>

							{#if eventData.results.length > 8}
								<div class="px-6 py-3 bg-gray-800/50 text-center">
									<a href="/age-open/{eventData.event.id}/results" class="text-sm font-medium text-blue-400 hover:text-blue-300">
										View all {eventData.results.length} results →
									</a>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}

		<!-- Rules & Info Tab -->
		{#if activeTab === 'rules'}
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

				<!-- FAQ Section -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">Frequently Asked Questions</h2>
					<div class="space-y-3">
						{#each faqItems as item, index}
							<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
								<button
									on:click={() => toggleFaq(index)}
									class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/50 transition-colors"
								>
									<span class="font-medium text-white pr-4">{item.question}</span>
									<svg
										class="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200 {openFaqIndex === index ? 'rotate-180' : ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								{#if openFaqIndex === index}
									<div class="px-6 pb-4 pt-0">
										<div class="border-t border-gray-800 pt-4">
											<p class="text-gray-300 leading-relaxed">{item.answer}</p>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>

				<!-- Contact Section -->
				<section class="rounded-lg border border-gray-800 bg-gray-900 p-8">
					<div class="text-center">
						<h2 class="mb-4 text-2xl font-bold text-white">Have More Questions?</h2>
						<p class="mb-6 text-gray-400 max-w-2xl mx-auto">
							If you have additional questions about the AGE Open Series, registration, or anything else,
							feel free to reach out to us. We're here to help!
						</p>
						<div class="flex flex-wrap justify-center gap-4">
							<a
								href="/contact"
								class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
								</svg>
								Contact Us
							</a>
							<a
								href="https://discord.gg/agesoftware"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-6 py-3 font-medium text-white hover:bg-gray-700 transition-colors"
							>
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
									<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
								</svg>
								Join Discord
							</a>
						</div>
					</div>
				</section>
			</div>
		{/if}
	</div>
</div>
