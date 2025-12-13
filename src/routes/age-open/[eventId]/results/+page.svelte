<script>
	import { fade, scale } from 'svelte/transition';
	import { getCircuit, DEFAULT_CIRCUIT } from '$lib/data/circuits.js';
	import DecklistCard from '$lib/components/DecklistCard.svelte';

	let { data } = $props();

	let activeTab = $state('standings');
	let selectedHeroModal = $state(null);

	function formatDate(date) {
		if (!date) return '';
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getCircuitConfig(circuit) {
		const config = getCircuit(circuit);
		return {
			bg: config.colors.bgDark,
			text: config.colors.text,
			border: config.colors.borderSolid,
			gradient: config.colors.gradient || 'from-purple-500 to-pink-500',
			image: config.image
		};
	}

	function openHeroModal(heroData) {
		selectedHeroModal = heroData;
	}

	function closeHeroModal() {
		selectedHeroModal = null;
	}

	const circuitConfig = $derived(getCircuitConfig(data.event.circuit));

	// Check if we have bracket data
	const hasBracket = $derived(data.top8Bracket !== null);
	const hasMatches = $derived(data.matchesByRound?.length > 0);
	const hasMetagame = $derived(data.metagameBreakdown?.length > 0);
	const hasDecklists = $derived(data.decklists?.length > 0);

	// Calculate best win rate hero (with at least 3 matches)
	const bestWinRateHero = $derived(
		[...(data.metagameBreakdown || [])]
			.filter((h) => h.totalMatches >= 3)
			.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))[0] || null
	);

	// Create a lookup map for player decklists by gemId or playerName
	const decklistByPlayer = $derived(() => {
		const map = new Map();
		for (const d of data.decklists || []) {
			if (d.gemId) map.set(d.gemId, d);
			if (d.playerName) map.set(d.playerName.toLowerCase(), d);
		}
		return map;
	});

	function getPlayerDecklist(gemId, playerName) {
		const map = decklistByPlayer();
		return (gemId && map.get(gemId)) || (playerName && map.get(playerName.toLowerCase())) || null;
	}

	// Helper to get hero image URL from hero name
	function getHeroImageUrl(heroName) {
		if (!heroName) return null;
		const slug = heroName
			.toLowerCase()
			.replace(/ð/g, 'd')
			.replace(/þ/g, 'th')
			.replace(/æ/g, 'ae')
			.replace(/ø/g, 'o')
			.replace(/å/g, 'a')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[!@#$%^&*()+=[\]{}|\\:;<>?/~`]/g, '')
			.replace(/[,'"]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
		return `/hero_images/${slug}.webp`;
	}
</script>

<svelte:head>
	<title>{data.event.title} Results - AGE Open</title>
	<meta name="description" content="Tournament results for {data.event.title}" />
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Section with Circuit Background -->
	<div class="relative overflow-hidden">
		<!-- Circuit Background Image -->
		{#if data.event.circuit && circuitConfig.image}
			<div class="absolute inset-0">
				<img src={circuitConfig.image} alt="" class="h-full w-full object-cover opacity-50" />
				<div
					class="absolute inset-0 bg-gradient-to-b from-gray-950/40 via-gray-950/70 to-gray-950"
				></div>
			</div>
		{:else}
			<div class="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950"></div>
		{/if}

		<div class="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<!-- Back Link -->
			<div class="mb-6">
				<a
					href="/age-open?tab=results"
					class="inline-flex items-center text-sm font-medium text-gray-400 transition-colors hover:text-white"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Tournament Archive
				</a>
			</div>

			<!-- Badges -->
			<div class="mb-4 flex flex-wrap gap-2">
				{#if data.event.format}
					<span
						class="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm"
					>
						{data.event.format}
					</span>
				{/if}
				{#if data.event.status === 'in_progress'}
					<span
						class="animate-pulse rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400 backdrop-blur-sm"
					>
						LIVE
					</span>
				{:else if data.event.status === 'completed'}
					<span
						class="rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-sm font-medium text-green-400 backdrop-blur-sm"
					>
						Completed
					</span>
				{/if}
			</div>

			<!-- Event Title -->
			<h1 class="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
				{data.event.title}
			</h1>

			<!-- Circuit Badge - Prominent -->
			{#if data.event.circuit}
				<div class="mt-4">
					<div
						class="inline-flex items-center gap-3 {circuitConfig.bg} rounded-lg px-4 py-2.5 shadow-lg"
					>
						<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						<span class="text-base font-black tracking-wider text-white uppercase">
							{data.event.circuit} Circuit
						</span>
					</div>
				</div>
			{/if}

			<!-- Quick Info -->
			<div class="mt-6 flex flex-wrap gap-6 text-gray-300">
				{#if data.event.eventDate}
					<div class="flex items-center gap-2">
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
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<span>{formatDate(data.event.eventDate)}</span>
					</div>
				{/if}
				{#if data.event.location}
					<div class="flex items-center gap-2">
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
								d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						<span>{data.event.location}</span>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Stats Summary Cards -->
		<div class="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:grid-cols-4 sm:gap-4">
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 sm:h-10 sm:w-10"
					>
						<svg
							class="h-4 w-4 text-blue-400 sm:h-5 sm:w-5"
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
					<div>
						<p class="text-xl font-bold text-white sm:text-2xl">{data.results.length}</p>
						<p class="text-[10px] text-gray-500 sm:text-xs">Players</p>
					</div>
				</div>
			</div>
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 sm:h-10 sm:w-10"
					>
						<svg
							class="h-4 w-4 text-purple-400 sm:h-5 sm:w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</div>
					<div>
						<p class="text-xl font-bold text-white sm:text-2xl">{data.totalRounds}</p>
						<p class="text-[10px] text-gray-500 sm:text-xs">Rounds</p>
					</div>
				</div>
			</div>
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/20 sm:h-10 sm:w-10"
					>
						<svg
							class="h-4 w-4 text-green-400 sm:h-5 sm:w-5"
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
					<div>
						<p class="text-xl font-bold text-green-400 sm:text-2xl">
							${data.results.find((r) => r.placement === 1)?.prizeAmount || 0}
						</p>
						<p class="text-[10px] text-gray-500 sm:text-xs">1st Prize</p>
					</div>
				</div>
			</div>
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 sm:h-10 sm:w-10"
					>
						<svg
							class="h-4 w-4 text-amber-400 sm:h-5 sm:w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
							/>
						</svg>
					</div>
					<div>
						<p class="text-xl font-bold text-amber-400 sm:text-2xl">
							+{data.results.find((r) => r.placement === 1)?.agePoints || 0}
						</p>
						<p class="text-[10px] text-gray-500 sm:text-xs">1st AGE Pts</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Tab Navigation -->
		<div class="mb-6">
			<nav
				class="scrollbar-hide flex w-full max-w-full overflow-x-auto rounded-xl bg-gray-800/80 p-1.5"
				aria-label="Tabs"
			>
				<button
					onclick={() => (activeTab = 'standings')}
					class="flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap sm:gap-2 sm:px-4 sm:text-sm md:flex-1
						{activeTab === 'standings'
						? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
						: 'bg-transparent text-gray-300'}"
				>
					<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
					Standings
				</button>
				{#if hasMetagame}
					<button
						onclick={() => (activeTab = 'metagame')}
						class="flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap sm:gap-2 sm:px-4 sm:text-sm md:flex-1
							{activeTab === 'metagame'
							? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
							: 'bg-transparent text-gray-300'}"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
							/>
						</svg>
						Metagame
					</button>
				{/if}
				{#if hasMatches}
					<button
						onclick={() => (activeTab = 'matches')}
						class="flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap sm:gap-2 sm:px-4 sm:text-sm md:flex-1
							{activeTab === 'matches'
							? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
							: 'bg-transparent text-gray-300'}"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
							/>
						</svg>
						Matches
					</button>
				{/if}
				{#if hasBracket}
					<button
						onclick={() => (activeTab = 'top8')}
						class="flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap sm:gap-2 sm:px-4 sm:text-sm md:flex-1
							{activeTab === 'top8'
							? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
							: 'bg-transparent text-gray-300'}"
					>
						<svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.992 0"
							/>
						</svg>
						Top 8
					</button>
				{/if}
				{#if hasDecklists}
					<button
						onclick={() => (activeTab = 'decklists')}
						class="flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap sm:gap-2 sm:px-4 sm:text-sm md:flex-1
							{activeTab === 'decklists'
							? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
							: 'bg-transparent text-gray-300'}"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
						Decks
						<span class="rounded-full bg-gray-700/80 px-1.5 py-0.5 text-[10px] sm:text-xs"
							>{data.decklists.length}</span
						>
					</button>
				{/if}
			</nav>
		</div>
		<!-- Standings Tab -->
		{#if activeTab === 'standings'}
			<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
				<div class="border-b border-gray-800 px-6 py-4">
					<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
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
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
						Final Standings
					</h2>
				</div>

				{#if data.results.length === 0}
					<div class="p-12 text-center">
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
									d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
								/>
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">No Results Yet</h3>
						<p class="text-gray-400">Results will appear once the tournament has match data.</p>
					</div>
				{:else}
					<!-- Mobile Card View -->
					<div class="block divide-y divide-gray-800 md:hidden">
						{#each data.results as result, i}
							{@const winPct =
								result.wins + result.losses > 0
									? Math.round((result.wins / (result.wins + result.losses)) * 100)
									: 0}
							{@const playerDecklist = hasMetagame
								? getPlayerDecklist(result.gemId, result.playerName)
								: null}
							<div class="p-4 {result.placement <= 8 ? 'bg-gray-800/20' : ''}">
								<div class="flex items-start gap-3">
									<!-- Placement Badge -->
									<span
										class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold
										{result.placement === 1
											? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
											: result.placement === 2
												? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
												: result.placement === 3
													? 'bg-gradient-to-br from-amber-500 to-amber-700 text-black'
													: result.placement <= 8
														? 'bg-blue-500/20 text-blue-400'
														: 'bg-gray-800 text-gray-400'}"
									>
										{result.placement}
									</span>
									<!-- Player Info -->
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											{#if result.gemId}
												<a
													href="/player/{result.gemId}"
													class="truncate font-semibold text-white transition-colors hover:text-blue-400"
												>
													{result.playerName}
												</a>
											{:else}
												<span class="truncate font-semibold text-white">{result.playerName}</span>
											{/if}
										</div>
										{#if result.hero}
											<p class="mt-0.5 truncate text-xs text-gray-400">{result.hero}</p>
										{/if}
										<!-- Stats Row -->
										<div class="mt-2 flex items-center gap-3 text-sm">
											<span class="text-gray-400">
												<span class="font-medium text-white">{result.wins}</span>-<span
													class="font-medium text-white">{result.losses}</span
												>{result.draws > 0 ? `-${result.draws}` : ''}
											</span>
											<span
												class={winPct >= 70
													? 'text-green-400'
													: winPct >= 50
														? 'text-gray-300'
														: 'text-gray-500'}
											>
												{winPct}%
											</span>
										</div>
									</div>
									<!-- Points, Prize & Decklist -->
									<div class="flex shrink-0 flex-col items-end gap-1 text-right">
										{#if result.agePoints > 0}
											<span class="text-sm font-semibold text-blue-400"
												>+{result.agePoints} pts</span
											>
										{/if}
										{#if result.prizeAmount > 0}
											<span class="text-sm font-semibold text-green-400">${result.prizeAmount}</span
											>
										{/if}
										{#if playerDecklist}
											<a
												href="/age-open/{data.event.id}/decklist/{playerDecklist.id}"
												class="inline-flex items-center gap-1 text-xs text-blue-400 transition-colors hover:text-blue-300"
											>
												<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
													/>
												</svg>
												Decklist
											</a>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Desktop Table View -->
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full">
							<thead>
								<tr class="border-b border-gray-700 bg-gray-800/50">
									<th
										class="px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase lg:px-6"
										>Place</th
									>
									<th
										class="px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase lg:px-6"
										>Player</th
									>
									{#if hasMetagame}
										<th
											class="px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase lg:px-6"
											>Hero</th
										>
									{/if}
									<th
										class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase lg:px-6"
										>Record</th
									>
									<th
										class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase lg:px-6"
										>Win %</th
									>
									<th
										class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase lg:px-6"
										>AGE Pts</th
									>
									<th
										class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase lg:px-6"
										>Prize</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-800">
								{#each data.results as result, i}
									{@const winPct =
										result.wins + result.losses > 0
											? Math.round((result.wins / (result.wins + result.losses)) * 100)
											: 0}
									<tr
										class="transition-colors hover:bg-gray-800/50 {result.placement <= 8
											? 'bg-gray-800/20'
											: ''}"
									>
										<td class="px-4 py-4 whitespace-nowrap lg:px-6">
											<span
												class="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold
												{result.placement === 1
													? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
													: result.placement === 2
														? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
														: result.placement === 3
															? 'bg-gradient-to-br from-amber-500 to-amber-700 text-black'
															: result.placement <= 8
																? 'bg-blue-500/20 text-blue-400'
																: 'bg-gray-800 text-gray-400'}"
											>
												{result.placement}
											</span>
										</td>
										<td class="px-4 py-4 lg:px-6">
											<div class="flex items-center gap-3">
												<div>
													{#if result.gemId}
														<a
															href="/player/{result.gemId}"
															class="font-medium text-white transition-colors hover:text-blue-400"
														>
															{result.playerName}
														</a>
													{:else}
														<span class="font-medium text-white">{result.playerName}</span>
													{/if}
													{#if result.gemId}
														<p class="text-xs text-gray-500">{result.gemId}</p>
													{/if}
												</div>
											</div>
										</td>
										{#if hasMetagame}
											<td class="px-4 py-4 lg:px-6">
												{#if result.hero}
													{@const playerDecklist = getPlayerDecklist(
														result.gemId,
														result.playerName
													)}
													<div>
														<span class="text-sm text-gray-300">{result.hero}</span>
														{#if playerDecklist}
															<a
																href="/age-open/{data.event.id}/decklist/{playerDecklist.id}"
																class="mt-0.5 flex items-center gap-1 text-xs text-blue-400 transition-colors hover:text-blue-300"
															>
																<svg
																	class="h-3 w-3"
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
																View Decklist
															</a>
														{/if}
													</div>
												{:else}
													<span class="text-gray-600">-</span>
												{/if}
											</td>
										{/if}
										<td class="px-4 py-4 text-center lg:px-6">
											<span class="font-medium text-white">{result.wins}</span>
											<span class="text-gray-500">-</span>
											<span class="font-medium text-white">{result.losses}</span>
											{#if result.draws > 0}
												<span class="text-gray-500">-</span>
												<span class="font-medium text-white">{result.draws}</span>
											{/if}
										</td>
										<td class="px-4 py-4 text-center lg:px-6">
											<span
												class={winPct >= 70
													? 'text-green-400'
													: winPct >= 50
														? 'text-white'
														: 'text-gray-400'}
											>
												{winPct}%
											</span>
										</td>
										<td class="px-4 py-4 text-center lg:px-6">
											{#if result.agePoints > 0}
												<span class="font-semibold text-blue-400">+{result.agePoints}</span>
											{:else}
												<span class="text-gray-500">-</span>
											{/if}
										</td>
										<td class="px-4 py-4 text-center lg:px-6">
											{#if result.prizeAmount > 0}
												<span class="font-semibold text-green-400">${result.prizeAmount}</span>
											{:else}
												<span class="text-gray-500">-</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Metagame Tab -->
		{#if activeTab === 'metagame' && hasMetagame}
			<div class="space-y-4 sm:space-y-6">
				<!-- Overview Stats - Enhanced cards like player profile -->
				<div class="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
					<div
						class="group relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/50 to-gray-900 p-3 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 sm:rounded-2xl sm:p-5"
					>
						<div
							class="absolute top-0 right-0 h-16 w-16 rounded-full bg-purple-500/10 blur-2xl transition-all group-hover:bg-purple-500/20 sm:h-20 sm:w-20"
						></div>
						<div class="relative">
							<div
								class="mb-1 flex items-center gap-1.5 text-xs font-medium text-purple-400 sm:mb-2 sm:gap-2 sm:text-sm"
							>
								<svg
									class="h-3.5 w-3.5 sm:h-4 sm:w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span class="xs:inline hidden">Unique</span> Heroes
							</div>
							<div class="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
								{data.metagameBreakdown.length}
							</div>
						</div>
					</div>
					<div
						class="group relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-900/50 to-gray-900 p-3 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 sm:rounded-2xl sm:p-5"
					>
						<div
							class="absolute top-0 right-0 h-16 w-16 rounded-full bg-blue-500/10 blur-2xl transition-all group-hover:bg-blue-500/20 sm:h-20 sm:w-20"
						></div>
						<div class="relative">
							<div
								class="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-400 sm:mb-2 sm:gap-2 sm:text-sm"
							>
								<svg
									class="h-3.5 w-3.5 sm:h-4 sm:w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								<span class="xs:inline hidden">Total</span> Players
							</div>
							<div class="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
								{data.totalPlayers}
							</div>
						</div>
					</div>
					<div
						class="group relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/50 to-gray-900 p-3 transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 sm:rounded-2xl sm:p-5"
					>
						<div
							class="absolute top-0 right-0 h-16 w-16 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20 sm:h-20 sm:w-20"
						></div>
						<div class="relative">
							<div
								class="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-400 sm:mb-2 sm:gap-2 sm:text-sm"
							>
								<svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
									<path
										d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
									/>
								</svg>
								Most Played
							</div>
							<div class="truncate text-base font-bold text-white sm:text-xl lg:text-2xl">
								{data.metagameBreakdown[0]?.hero || '-'}
							</div>
							<div class="mt-0.5 text-[10px] text-gray-500 sm:mt-1 sm:text-xs">
								{data.metagameBreakdown[0]?.count || 0} players
							</div>
						</div>
					</div>
					<div
						class="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/50 to-gray-900 p-3 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 sm:rounded-2xl sm:p-5"
					>
						<div
							class="absolute top-0 right-0 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20 sm:h-20 sm:w-20"
						></div>
						<div class="relative">
							<div
								class="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-400 sm:mb-2 sm:gap-2 sm:text-sm"
							>
								<svg
									class="h-3.5 w-3.5 sm:h-4 sm:w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
									/>
								</svg>
								Best Win Rate
							</div>
							<div class="truncate text-base font-bold text-white sm:text-xl lg:text-2xl">
								{bestWinRateHero?.hero || '-'}
							</div>
							<div class="mt-0.5 text-[10px] text-emerald-400 sm:mt-1 sm:text-xs">
								{bestWinRateHero?.winRate || 0}% WR
							</div>
						</div>
					</div>
				</div>

				<!-- Hero Distribution - Card Grid like player profile -->
				<div
					class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:rounded-2xl"
				>
					<div
						class="flex items-center justify-between border-b border-gray-800 px-4 py-3 sm:px-6 sm:py-4"
					>
						<h2 class="flex items-center gap-2 text-base font-bold text-white sm:gap-3 sm:text-xl">
							<svg
								class="h-4 w-4 text-amber-400 sm:h-5 sm:w-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
							Hero Distribution
						</h2>
						<span class="text-xs text-gray-400 sm:text-sm"
							>{data.metagameBreakdown.length} heroes</span
						>
					</div>
					<div class="p-3 sm:p-6">
						<p
							class="mb-3 text-[10px] font-medium tracking-wider text-gray-500 uppercase sm:mb-4 sm:text-xs"
						>
							Tap a hero to view player records
						</p>
						<div class="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
							{#each data.metagameBreakdown as heroData, idx}
								{@const isTop = idx === 0}
								{@const isTopThree = idx < 3}
								<button
									onclick={() => openHeroModal(heroData)}
									class="group relative overflow-hidden rounded-xl {isTop
										? 'border border-amber-500/30 sm:col-span-2 lg:col-span-1'
										: isTopThree
											? 'border border-gray-700/50'
											: 'border border-gray-800/50'} bg-gray-800/30 text-left transition-colors hover:bg-white/5"
								>
									<div class="flex">
										<!-- Left side: Data -->
										<div class="min-w-0 flex-1 p-4 pr-2">
											<!-- Hero Name -->
											<h3
												class="truncate text-base font-semibold {isTop
													? 'text-amber-400'
													: 'text-white'} mb-2"
											>
												{heroData.hero}
											</h3>

											<!-- Stats Grid -->
											<div class="space-y-1.5">
												<!-- Player Count & Field % -->
												<div class="flex items-center gap-2 text-sm">
													<span class="text-gray-400"
														>{heroData.count} player{heroData.count !== 1 ? 's' : ''}</span
													>
													<span class="text-gray-600">•</span>
													<span class="text-gray-500">{heroData.percentage}%</span>
												</div>

												<!-- Record & Win Rate -->
												{#if heroData.totalMatches > 0}
													<div class="flex items-center gap-2">
														<span class="text-sm text-gray-400"
															>{heroData.wins}W-{heroData.losses}L{heroData.draws > 0
																? `-${heroData.draws}D`
																: ''}</span
														>
														<span
															class="rounded-full px-2 py-0.5 text-xs font-medium {parseFloat(
																heroData.winRate
															) >= 55
																? 'bg-green-500/20 text-green-400'
																: parseFloat(heroData.winRate) >= 45
																	? 'bg-gray-700/80 text-gray-300'
																	: 'bg-red-500/20 text-red-400'}"
														>
															{heroData.winRate}% WR
														</span>
													</div>
												{/if}
											</div>

											<!-- View players hint -->
											{#if heroData.players?.length > 0}
												<div class="mt-3 flex items-center gap-1 text-xs text-gray-500">
													<span
														>View {heroData.players.length} player{heroData.players.length !== 1
															? 's'
															: ''}</span
													>
													<svg
														class="h-3 w-3"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M9 5l7 7-7 7"
														/>
													</svg>
												</div>
											{/if}
										</div>

										<!-- Right side: Hero Image -->
										<div class="relative w-28 shrink-0 sm:w-32">
											{#if heroData.imageUrl}
												<img
													src={heroData.imageUrl}
													alt={heroData.hero}
													class="absolute inset-0 h-full w-full object-cover object-right transition-transform group-hover:scale-105"
													onerror={(e) => (e.target.style.display = 'none')}
												/>
											{:else}
												<div
													class="absolute inset-0 {isTop
														? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20'
														: 'bg-gradient-to-br from-gray-700/50 to-gray-800/30'}"
												></div>
											{/if}
											{#if isTop}
												<div
													class="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-gray-900"
												>
													<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
														<path
															d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
														/>
													</svg>
													#1
												</div>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Matches Tab -->
		{#if activeTab === 'matches' && hasMatches}
			<!-- Match Card Snippet -->
			{#snippet matchPlayer(player, isWinner, isDraw, align = 'left')}
				{@const alignRight = align === 'right'}
				<div class="flex items-center gap-2 sm:gap-3 {alignRight ? 'flex-row-reverse' : ''}">
					<!-- Hero Image -->
					{#if player.hero}
						<div class="relative shrink-0">
							<img
								src={getHeroImageUrl(player.hero)}
								alt=""
								class="h-8 w-8 rounded-lg object-cover object-right ring-2 sm:h-10 sm:w-10 {isWinner
									? 'shadow-lg shadow-emerald-500/30 ring-emerald-500'
									: 'ring-gray-700/50'}"
								onerror={(e) => (e.target.style.display = 'none')}
							/>
							{#if isWinner}
								<div
									class="absolute -bottom-1 {alignRight
										? '-left-1'
										: '-right-1'} flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow-lg ring-2 shadow-emerald-500/50 ring-gray-900 sm:h-5 sm:w-5"
								>
									<svg
										class="h-2.5 w-2.5 text-white sm:h-3 sm:w-3"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							{/if}
						</div>
					{:else}
						<div
							class="h-8 w-8 shrink-0 rounded-lg bg-gray-800/80 ring-2 sm:h-10 sm:w-10 {isWinner
								? 'ring-emerald-500/50'
								: 'ring-gray-700/50'}"
						></div>
					{/if}
					<!-- Player Info -->
					<div class="min-w-0 flex-1 {alignRight ? 'text-right' : ''}">
						{#if player.gemId}
							<a
								href="/player/{player.gemId}"
								class="block truncate text-xs font-bold transition-colors sm:text-sm {isWinner
									? 'text-emerald-400'
									: isDraw
										? 'text-amber-400'
										: 'text-white hover:text-blue-400'}"
							>
								{player.name}
							</a>
						{:else}
							<span
								class="block truncate text-xs font-bold sm:text-sm {isWinner
									? 'text-emerald-400'
									: isDraw
										? 'text-amber-400'
										: 'text-white'}"
							>
								{player.name}
							</span>
						{/if}
						{#if player.hero}
							<p
								class="text-[10px] sm:text-xs {isWinner
									? 'text-emerald-400/60'
									: 'text-gray-500'} truncate"
							>
								{player.hero}
							</p>
						{/if}
					</div>
					<!-- Winner Badge - Icon only on mobile -->
					{#if isWinner}
						<div
							class="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400 uppercase sm:px-2"
						>
							<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="hidden sm:inline">Win</span>
						</div>
					{/if}
				</div>
			{/snippet}

			<div class="space-y-4 sm:space-y-6">
				{#each data.matchesByRound as roundData}
					<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
						<!-- Round Header -->
						<div
							class="flex items-center justify-between border-b border-gray-800 bg-gradient-to-r from-gray-800/50 to-transparent px-4 py-3 sm:px-6 sm:py-4"
						>
							<h3
								class="flex items-center gap-2 text-base font-semibold text-white sm:gap-3 sm:text-lg"
							>
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-1 ring-blue-500/20 sm:h-10 sm:w-10 sm:rounded-xl"
								>
									<span class="text-sm font-bold text-blue-400 sm:text-base">{roundData.round}</span
									>
								</div>
								<div>
									<span>Round {roundData.round}</span>
									<p class="text-[10px] font-normal text-gray-500 sm:text-xs">
										{roundData.matches.length} matches
									</p>
								</div>
							</h3>
						</div>

						<!-- Matches Grid -->
						<div class="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-3">
							{#each roundData.matches as match}
								<div
									class="group relative overflow-hidden rounded-lg bg-gray-800/30 ring-1 ring-gray-700/30 transition-all hover:ring-gray-600/50 sm:rounded-xl"
								>
									<!-- Match Content -->
									<div class="p-3 sm:p-4">
										<!-- Player 1 (Left aligned) -->
										<div
											class="relative rounded-lg {match.winner === 'player1'
												? '-mx-2 bg-gradient-to-r from-emerald-500/10 to-transparent px-2 py-2'
												: 'py-1'}"
										>
											{#if match.winner === 'player1'}
												<div
													class="absolute top-1 bottom-1 left-0 w-1 rounded-full bg-emerald-500"
												></div>
											{/if}
											{@render matchPlayer(
												match.player1,
												match.winner === 'player1',
												match.isDraw,
												'left'
											)}
										</div>

										<!-- VS Divider -->
										<div class="my-2 flex items-center gap-3">
											<div
												class="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"
											></div>
											<span class="text-[10px] font-bold tracking-wider text-gray-600 uppercase"
												>vs</span
											>
											<div
												class="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"
											></div>
										</div>

										<!-- Player 2 (Right aligned - mirrored) -->
										<div
											class="relative rounded-lg {match.winner === 'player2'
												? '-mx-2 bg-gradient-to-l from-emerald-500/10 to-transparent px-2 py-2'
												: 'py-1'}"
										>
											{#if match.winner === 'player2'}
												<div
													class="absolute top-1 right-0 bottom-1 w-1 rounded-full bg-emerald-500"
												></div>
											{/if}
											{@render matchPlayer(
												match.player2,
												match.winner === 'player2',
												match.isDraw,
												'right'
											)}
										</div>
									</div>

									<!-- Match Footer -->
									<div
										class="flex items-center justify-between border-t border-gray-700/30 bg-gray-800/20 px-3 py-1.5 sm:px-4 sm:py-2"
									>
										{#if match.table}
											<span
												class="text-[9px] font-medium tracking-wider text-gray-600 uppercase sm:text-[10px]"
												>Table {match.table}</span
											>
										{:else}
											<span></span>
										{/if}
										{#if match.isDraw}
											<span
												class="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400 sm:px-2 sm:text-[10px]"
											>
												<svg
													class="h-2.5 w-2.5 sm:h-3 sm:w-3"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
													/>
												</svg>
												Draw
											</span>
										{:else if !match.winner}
											<span class="text-[9px] font-medium text-gray-600 sm:text-[10px]"
												>Pending</span
											>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Top 8 Bracket Tab -->
		{#if activeTab === 'top8' && hasBracket}
			{@const bracket = data.top8Bracket}

			<!-- Bracket Match Component -->
			{#snippet bracketMatch(match, variant = 'default')}
				{@const isFinals = variant === 'finals'}
				<div
					class="overflow-hidden rounded-lg {isFinals
						? 'bg-gray-800/80 ring-1 ring-white/20'
						: 'bg-gray-800/50'}"
				>
					{#each [match.player1, match.player2] as player, idx}
						<div
							class="flex items-center gap-2 px-2.5 py-1.5 {idx === 0
								? 'border-b border-gray-700/40'
								: ''} {player.isWinner ? 'bg-emerald-500/10' : ''}"
						>
							<!-- Seed -->
							<span class="w-3 text-center text-[10px] font-medium text-gray-600"
								>{player.seed}</span
							>
							<!-- Hero Image -->
							{#if player.hero}
								<img
									src={getHeroImageUrl(player.hero)}
									alt=""
									class="h-7 w-7 shrink-0 rounded object-cover object-right"
									onerror={(e) => (e.target.style.display = 'none')}
								/>
							{:else}
								<div class="h-7 w-7 shrink-0 rounded bg-gray-700/50"></div>
							{/if}
							<!-- Player Info -->
							<div class="min-w-0 flex-1">
								{#if player.gemId}
									<a
										href="/player/{player.gemId}"
										class="block truncate text-[13px] font-medium {player.isWinner
											? 'text-emerald-400'
											: 'text-gray-200'} transition-colors hover:text-white"
									>
										{player.name}
									</a>
								{:else}
									<span
										class="block truncate text-[13px] font-medium {player.isWinner
											? 'text-emerald-400'
											: 'text-gray-200'}"
									>
										{player.name}
									</span>
								{/if}
								{#if player.hero}
									<p class="truncate text-[10px] text-gray-500">{player.hero}</p>
								{/if}
							</div>
							<!-- Winner Check -->
							{#if player.isWinner}
								<svg
									class="h-3.5 w-3.5 shrink-0 text-emerald-400"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						</div>
					{/each}
				</div>
			{/snippet}

			<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
				<div class="border-b border-gray-800 px-6 py-4">
					<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
						<svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.992 0"
							/>
						</svg>
						Top 8 Elimination Bracket
					</h2>
				</div>

				<!-- Champion Banner -->
				{#if data.top8Bracket.champion}
					<div
						class="border-b border-gray-800 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent px-6 py-5"
					>
						<div class="flex items-center gap-4">
							{#if data.top8Bracket.champion.hero}
								<div class="relative">
									<img
										src={getHeroImageUrl(data.top8Bracket.champion.hero)}
										alt=""
										class="h-16 w-16 rounded-xl object-cover object-right shadow-lg ring-2 shadow-yellow-500/20 ring-yellow-500/50"
										onerror={(e) => (e.target.style.display = 'none')}
									/>
									<div
										class="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg"
									>
										<svg class="h-3.5 w-3.5 text-black" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M10 1l2.928 6.472L20 8.236l-5 4.584L16.18 20 10 16.416 3.82 20 5 12.82 0 8.236l7.072-.764L10 1z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								</div>
							{:else}
								<div
									class="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/25"
								>
									<svg class="h-8 w-8 text-black" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M10 1l2.928 6.472L20 8.236l-5 4.584L16.18 20 10 16.416 3.82 20 5 12.82 0 8.236l7.072-.764L10 1z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							{/if}
							<div>
								<p class="text-xs font-semibold tracking-wider text-yellow-400/80 uppercase">
									Champion
								</p>
								{#if data.top8Bracket.champion.gemId}
									<a
										href="/player/{data.top8Bracket.champion.gemId}"
										class="text-xl font-bold text-white transition-colors hover:text-yellow-400 sm:text-2xl"
									>
										{data.top8Bracket.champion.name}
									</a>
								{:else}
									<p class="text-xl font-bold text-white sm:text-2xl">
										{data.top8Bracket.champion.name}
									</p>
								{/if}
								{#if data.top8Bracket.champion.hero}
									<p class="text-sm text-yellow-400/60">{data.top8Bracket.champion.hero}</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Bracket Visualization -->
				<div class="hidden overflow-x-auto p-4 sm:block sm:p-6">
					<div class="min-w-[700px]">
						<!-- Column Headers -->
						<div class="mb-4 grid grid-cols-[1fr_40px_1fr_40px_1fr] gap-0">
							<div
								class="text-center text-[11px] font-semibold tracking-wider text-gray-600 uppercase"
							>
								Quarterfinals
							</div>
							<div></div>
							<div
								class="text-center text-[11px] font-semibold tracking-wider text-gray-600 uppercase"
							>
								Semifinals
							</div>
							<div></div>
							<div
								class="text-center text-[11px] font-semibold tracking-wider text-gray-600 uppercase"
							>
								Finals
							</div>
						</div>

						<!-- Bracket Grid -->
						<div class="grid grid-cols-[1fr_40px_1fr_40px_1fr] gap-0">
							<!-- QF Column -->
							<div class="flex flex-col justify-between gap-3">
								{#if bracket.quarterfinals[0]}
									{@render bracketMatch(bracket.quarterfinals[0])}
								{/if}
								{#if bracket.quarterfinals[1]}
									{@render bracketMatch(bracket.quarterfinals[1])}
								{/if}
								{#if bracket.quarterfinals[2]}
									{@render bracketMatch(bracket.quarterfinals[2])}
								{/if}
								{#if bracket.quarterfinals[3]}
									{@render bracketMatch(bracket.quarterfinals[3])}
								{/if}
							</div>

							<!-- Connector QF -> SF -->
							<div class="relative">
								<svg class="absolute inset-0 h-full w-full" preserveAspectRatio="none">
									<!-- Top bracket connector -->
									<path
										d="M 0 12.5% L 50% 12.5% L 50% 37.5% L 100% 37.5%"
										fill="none"
										stroke="rgb(55, 65, 81)"
										stroke-width="1.5"
									/>
									<path
										d="M 0 37.5% L 50% 37.5%"
										fill="none"
										stroke="rgb(55, 65, 81)"
										stroke-width="1.5"
									/>
									<!-- Bottom bracket connector -->
									<path
										d="M 0 62.5% L 50% 62.5% L 50% 87.5% L 100% 87.5%"
										fill="none"
										stroke="rgb(55, 65, 81)"
										stroke-width="1.5"
									/>
									<path
										d="M 0 87.5% L 50% 87.5%"
										fill="none"
										stroke="rgb(55, 65, 81)"
										stroke-width="1.5"
									/>
								</svg>
							</div>

							<!-- SF Column -->
							<div class="flex flex-col justify-around gap-3 py-[12%]">
								{#if bracket.semifinals[0]}
									{@render bracketMatch(bracket.semifinals[0])}
								{/if}
								{#if bracket.semifinals[1]}
									{@render bracketMatch(bracket.semifinals[1])}
								{/if}
							</div>

							<!-- Connector SF -> Finals -->
							<div class="relative">
								<svg class="absolute inset-0 h-full w-full" preserveAspectRatio="none">
									<path
										d="M 0 37.5% L 50% 37.5% L 50% 62.5% L 100% 62.5%"
										fill="none"
										stroke="rgb(55, 65, 81)"
										stroke-width="1.5"
									/>
									<path
										d="M 0 62.5% L 50% 62.5%"
										fill="none"
										stroke="rgb(55, 65, 81)"
										stroke-width="1.5"
									/>
									<line
										x1="50%"
										y1="50%"
										x2="100%"
										y2="50%"
										stroke="rgb(55, 65, 81)"
										stroke-width="1.5"
									/>
								</svg>
							</div>

							<!-- Finals Column -->
							<div class="flex items-center justify-center">
								{#if bracket.finals}
									<div class="w-full">
										{@render bracketMatch(bracket.finals, 'finals')}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Alternative: Enhanced List View for Mobile -->
				<div class="block border-t border-gray-800 p-4 sm:hidden">
					<p class="mb-4 text-sm font-semibold tracking-wider text-gray-400 uppercase">
						All Matches
					</p>
					<div class="space-y-6">
						<!-- Quarterfinals -->
						<div>
							<p class="mb-3 text-xs font-semibold tracking-wider text-amber-500 uppercase">
								Quarterfinals
							</p>
							<div class="space-y-3">
								{#each bracket.quarterfinals as qf, i}
									{#if qf}
										<div class="rounded-lg bg-gray-800/50 p-3">
											<div class="flex items-center justify-between gap-2">
												<!-- Player 1 -->
												<div
													class="flex min-w-0 flex-1 items-center gap-2 {qf.player1.isWinner
														? ''
														: 'opacity-60'}"
												>
													{#if qf.player1.hero}
														<img
															src={getHeroImageUrl(qf.player1.hero)}
															alt={qf.player1.hero}
															class="h-10 w-10 rounded-full border-2 object-cover object-right {qf
																.player1.isWinner
																? 'border-green-500'
																: 'border-gray-600'}"
														/>
													{:else}
														<div
															class="h-10 w-10 rounded-full border-2 bg-gray-700 {qf.player1
																.isWinner
																? 'border-green-500'
																: 'border-gray-600'}"
														></div>
													{/if}
													<div class="min-w-0">
														{#if qf.player1.gemId}
															<a
																href="/player/{qf.player1.gemId}"
																class="block truncate text-sm font-medium hover:underline {qf
																	.player1.isWinner
																	? 'text-green-400'
																	: 'text-gray-300'}">{qf.player1.name}</a
															>
														{:else}
															<p
																class="truncate text-sm font-medium {qf.player1.isWinner
																	? 'text-green-400'
																	: 'text-gray-300'}"
															>
																{qf.player1.name}
															</p>
														{/if}
														{#if qf.player1.hero}
															<p class="truncate text-xs text-gray-500">{qf.player1.hero}</p>
														{/if}
													</div>
												</div>
												<!-- VS -->
												<span class="shrink-0 text-xs font-bold text-gray-600">VS</span>
												<!-- Player 2 -->
												<div
													class="flex min-w-0 flex-1 items-center justify-end gap-2 {qf.player2
														.isWinner
														? ''
														: 'opacity-60'}"
												>
													<div class="min-w-0 text-right">
														{#if qf.player2.gemId}
															<a
																href="/player/{qf.player2.gemId}"
																class="block truncate text-sm font-medium hover:underline {qf
																	.player2.isWinner
																	? 'text-green-400'
																	: 'text-gray-300'}">{qf.player2.name}</a
															>
														{:else}
															<p
																class="truncate text-sm font-medium {qf.player2.isWinner
																	? 'text-green-400'
																	: 'text-gray-300'}"
															>
																{qf.player2.name}
															</p>
														{/if}
														{#if qf.player2.hero}
															<p class="truncate text-xs text-gray-500">{qf.player2.hero}</p>
														{/if}
													</div>
													{#if qf.player2.hero}
														<img
															src={getHeroImageUrl(qf.player2.hero)}
															alt={qf.player2.hero}
															class="h-10 w-10 rounded-full border-2 object-cover object-right {qf
																.player2.isWinner
																? 'border-green-500'
																: 'border-gray-600'}"
														/>
													{:else}
														<div
															class="h-10 w-10 rounded-full border-2 bg-gray-700 {qf.player2
																.isWinner
																? 'border-green-500'
																: 'border-gray-600'}"
														></div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>

						<!-- Semifinals -->
						<div>
							<p class="mb-3 text-xs font-semibold tracking-wider text-amber-500 uppercase">
								Semifinals
							</p>
							<div class="space-y-3">
								{#each bracket.semifinals as sf, i}
									{#if sf}
										<div class="rounded-lg bg-gray-800/50 p-3">
											<div class="flex items-center justify-between gap-2">
												<!-- Player 1 -->
												<div
													class="flex min-w-0 flex-1 items-center gap-2 {sf.player1.isWinner
														? ''
														: 'opacity-60'}"
												>
													{#if sf.player1.hero}
														<img
															src={getHeroImageUrl(sf.player1.hero)}
															alt={sf.player1.hero}
															class="h-10 w-10 rounded-full border-2 object-cover object-right {sf
																.player1.isWinner
																? 'border-green-500'
																: 'border-gray-600'}"
														/>
													{:else}
														<div
															class="h-10 w-10 rounded-full border-2 bg-gray-700 {sf.player1
																.isWinner
																? 'border-green-500'
																: 'border-gray-600'}"
														></div>
													{/if}
													<div class="min-w-0">
														{#if sf.player1.gemId}
															<a
																href="/player/{sf.player1.gemId}"
																class="block truncate text-sm font-medium hover:underline {sf
																	.player1.isWinner
																	? 'text-green-400'
																	: 'text-gray-300'}">{sf.player1.name}</a
															>
														{:else}
															<p
																class="truncate text-sm font-medium {sf.player1.isWinner
																	? 'text-green-400'
																	: 'text-gray-300'}"
															>
																{sf.player1.name}
															</p>
														{/if}
														{#if sf.player1.hero}
															<p class="truncate text-xs text-gray-500">{sf.player1.hero}</p>
														{/if}
													</div>
												</div>
												<!-- VS -->
												<span class="shrink-0 text-xs font-bold text-gray-600">VS</span>
												<!-- Player 2 -->
												<div
													class="flex min-w-0 flex-1 items-center justify-end gap-2 {sf.player2
														.isWinner
														? ''
														: 'opacity-60'}"
												>
													<div class="min-w-0 text-right">
														{#if sf.player2.gemId}
															<a
																href="/player/{sf.player2.gemId}"
																class="block truncate text-sm font-medium hover:underline {sf
																	.player2.isWinner
																	? 'text-green-400'
																	: 'text-gray-300'}">{sf.player2.name}</a
															>
														{:else}
															<p
																class="truncate text-sm font-medium {sf.player2.isWinner
																	? 'text-green-400'
																	: 'text-gray-300'}"
															>
																{sf.player2.name}
															</p>
														{/if}
														{#if sf.player2.hero}
															<p class="truncate text-xs text-gray-500">{sf.player2.hero}</p>
														{/if}
													</div>
													{#if sf.player2.hero}
														<img
															src={getHeroImageUrl(sf.player2.hero)}
															alt={sf.player2.hero}
															class="h-10 w-10 rounded-full border-2 object-cover object-right {sf
																.player2.isWinner
																? 'border-green-500'
																: 'border-gray-600'}"
														/>
													{:else}
														<div
															class="h-10 w-10 rounded-full border-2 bg-gray-700 {sf.player2
																.isWinner
																? 'border-green-500'
																: 'border-gray-600'}"
														></div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>

						<!-- Finals -->
						<div>
							<p class="mb-3 text-xs font-semibold tracking-wider text-amber-500 uppercase">
								Finals
							</p>
							{#if bracket.finals}
								<div
									class="rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3"
								>
									<div class="flex items-center justify-between gap-2">
										<!-- Player 1 -->
										<div
											class="flex min-w-0 flex-1 items-center gap-2 {bracket.finals.player1.isWinner
												? ''
												: 'opacity-60'}"
										>
											{#if bracket.finals.player1.hero}
												<img
													src={getHeroImageUrl(bracket.finals.player1.hero)}
													alt={bracket.finals.player1.hero}
													class="h-10 w-10 rounded-full border-2 object-cover object-right {bracket
														.finals.player1.isWinner
														? 'border-amber-500'
														: 'border-gray-600'}"
												/>
											{:else}
												<div
													class="h-10 w-10 rounded-full border-2 bg-gray-700 {bracket.finals.player1
														.isWinner
														? 'border-amber-500'
														: 'border-gray-600'}"
												></div>
											{/if}
											<div class="min-w-0">
												{#if bracket.finals.player1.gemId}
													<a
														href="/player/{bracket.finals.player1.gemId}"
														class="block truncate text-sm font-medium hover:underline {bracket
															.finals.player1.isWinner
															? 'text-amber-400'
															: 'text-gray-300'}">{bracket.finals.player1.name}</a
													>
												{:else}
													<p
														class="truncate text-sm font-medium {bracket.finals.player1.isWinner
															? 'text-amber-400'
															: 'text-gray-300'}"
													>
														{bracket.finals.player1.name}
													</p>
												{/if}
												{#if bracket.finals.player1.hero}
													<p class="truncate text-xs text-gray-500">
														{bracket.finals.player1.hero}
													</p>
												{/if}
											</div>
										</div>
										<!-- VS -->
										<span class="shrink-0 text-xs font-bold text-gray-600">VS</span>
										<!-- Player 2 -->
										<div
											class="flex min-w-0 flex-1 items-center justify-end gap-2 {bracket.finals
												.player2.isWinner
												? ''
												: 'opacity-60'}"
										>
											<div class="min-w-0 text-right">
												{#if bracket.finals.player2.gemId}
													<a
														href="/player/{bracket.finals.player2.gemId}"
														class="block truncate text-sm font-medium hover:underline {bracket
															.finals.player2.isWinner
															? 'text-amber-400'
															: 'text-gray-300'}">{bracket.finals.player2.name}</a
													>
												{:else}
													<p
														class="truncate text-sm font-medium {bracket.finals.player2.isWinner
															? 'text-amber-400'
															: 'text-gray-300'}"
													>
														{bracket.finals.player2.name}
													</p>
												{/if}
												{#if bracket.finals.player2.hero}
													<p class="truncate text-xs text-gray-500">
														{bracket.finals.player2.hero}
													</p>
												{/if}
											</div>
											{#if bracket.finals.player2.hero}
												<img
													src={getHeroImageUrl(bracket.finals.player2.hero)}
													alt={bracket.finals.player2.hero}
													class="h-10 w-10 rounded-full border-2 object-cover object-right {bracket
														.finals.player2.isWinner
														? 'border-amber-500'
														: 'border-gray-600'}"
												/>
											{:else}
												<div
													class="h-10 w-10 rounded-full border-2 bg-gray-700 {bracket.finals.player2
														.isWinner
														? 'border-amber-500'
														: 'border-gray-600'}"
												></div>
											{/if}
										</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Champion -->
						{#if bracket.champion}
							<div class="pt-2">
								<p class="mb-3 text-xs font-semibold tracking-wider text-amber-500 uppercase">
									Champion
								</p>
								<div
									class="rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4"
								>
									<div class="flex items-center gap-3">
										{#if bracket.champion.hero}
											<img
												src={getHeroImageUrl(bracket.champion.hero)}
												alt={bracket.champion.hero}
												class="h-14 w-14 rounded-full border-2 border-amber-500 object-cover object-right shadow-lg shadow-amber-500/30"
											/>
										{:else}
											<div
												class="h-14 w-14 rounded-full border-2 border-amber-500 bg-gray-700"
											></div>
										{/if}
										<div>
											{#if bracket.champion.gemId}
												<a
													href="/player/{bracket.champion.gemId}"
													class="text-lg font-bold text-amber-400 hover:underline"
													>{bracket.champion.name}</a
												>
											{:else}
												<p class="text-lg font-bold text-amber-400">{bracket.champion.name}</p>
											{/if}
											{#if bracket.champion.hero}
												<p class="text-sm text-gray-400">{bracket.champion.hero}</p>
											{/if}
										</div>
										<svg
											class="ml-auto h-6 w-6 text-amber-500"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"
											/>
										</svg>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Decklists Tab -->
		{#if activeTab === 'decklists' && hasDecklists}
			<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
				<div class="border-b border-gray-800 px-6 py-4">
					<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
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
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
						Top 8 Decklists
						<span class="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400"
							>{data.decklists.length}</span
						>
					</h2>
				</div>

				<div class="p-6">
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each data.decklists as decklistItem (decklistItem.id)}
							<DecklistCard
								decklist={decklistItem}
								eventId={data.event.id}
								eventName={data.event.title}
								eventCircuit={data.event.circuit}
								showPlayerName={true}
								showEventName={false}
							/>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Hero Player Records Modal -->
{#if selectedHeroModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onkeydown={(e) => e.key === 'Escape' && closeHeroModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- Backdrop (clickable to close) -->
		<button
			transition:fade={{ duration: 200 }}
			class="absolute inset-0 cursor-default bg-black/90 backdrop-blur-sm"
			onclick={closeHeroModal}
			aria-label="Close modal"
		></button>

		<!-- Modal Content -->
		<div
			transition:scale={{ duration: 200, start: 0.95 }}
			class="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl"
		>
			<!-- Hero Header with Image -->
			<div class="relative h-32 overflow-hidden">
				{#if selectedHeroModal.imageUrl}
					<img
						src={selectedHeroModal.imageUrl}
						alt={selectedHeroModal.hero}
						class="absolute inset-0 h-full w-full object-cover object-right"
					/>
					<div
						class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"
					></div>
				{:else}
					<div class="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/20"></div>
				{/if}

				<!-- Close Button -->
				<button
					onclick={closeHeroModal}
					aria-label="Close hero details"
					class="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
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

				<!-- Hero Info -->
				<div class="absolute right-0 bottom-0 left-0 p-4">
					<h3 class="text-xl font-bold text-white">{selectedHeroModal.hero}</h3>
					<div class="mt-1 flex items-center gap-3 text-sm">
						<span class="text-gray-300"
							>{selectedHeroModal.count} player{selectedHeroModal.count !== 1 ? 's' : ''}</span
						>
						<span class="text-gray-500">•</span>
						<span class="text-gray-400">{selectedHeroModal.percentage}% of field</span>
						{#if selectedHeroModal.totalMatches > 0}
							<span class="text-gray-500">•</span>
							<span
								class="rounded-full px-2 py-0.5 text-xs font-medium {parseFloat(
									selectedHeroModal.winRate
								) >= 55
									? 'bg-green-500/20 text-green-400'
									: parseFloat(selectedHeroModal.winRate) >= 45
										? 'bg-gray-700 text-gray-300'
										: 'bg-red-500/20 text-red-400'}"
							>
								{selectedHeroModal.winRate}% WR
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Stats Bar -->
			{#if selectedHeroModal.totalMatches > 0}
				<div
					class="flex items-center justify-around border-b border-gray-800 bg-gray-800/50 px-4 py-3"
				>
					<div class="text-center">
						<p class="text-lg font-bold text-green-400">{selectedHeroModal.wins}</p>
						<p class="text-xs text-gray-500">Wins</p>
					</div>
					<div class="text-center">
						<p class="text-lg font-bold text-red-400">{selectedHeroModal.losses}</p>
						<p class="text-xs text-gray-500">Losses</p>
					</div>
					{#if selectedHeroModal.draws > 0}
						<div class="text-center">
							<p class="text-lg font-bold text-amber-400">{selectedHeroModal.draws}</p>
							<p class="text-xs text-gray-500">Draws</p>
						</div>
					{/if}
					<div class="text-center">
						<p class="text-lg font-bold text-white">{selectedHeroModal.totalMatches}</p>
						<p class="text-xs text-gray-500">Matches</p>
					</div>
				</div>
			{/if}

			<!-- Player List -->
			<div class="max-h-[45vh] overflow-y-auto p-4">
				<p class="mb-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
					Player Records
				</p>
				{#if selectedHeroModal.players?.length > 0}
					<div class="space-y-2">
						{#each selectedHeroModal.players as player}
							{@const playerWinPct = parseFloat(player.winRate)}
							<div
								class="flex items-center gap-3 rounded-lg bg-gray-800/50 px-3 py-2.5 transition-colors hover:bg-gray-800"
							>
								<div class="min-w-0 flex-1">
									{#if player.gemId}
										<a
											href="/player/{player.gemId}"
											class="block truncate text-sm font-medium text-white transition-colors hover:text-blue-400"
											onclick={closeHeroModal}
										>
											{player.name}
										</a>
									{:else}
										<span class="block truncate text-sm font-medium text-white">{player.name}</span>
									{/if}
								</div>
								<div class="flex shrink-0 items-center gap-3">
									<span class="text-sm text-gray-400"
										>{player.wins}-{player.losses}{player.draws > 0 ? `-${player.draws}` : ''}</span
									>
									<span
										class="rounded-full px-2 py-0.5 text-xs font-medium {playerWinPct >= 60
											? 'bg-green-500/20 text-green-400'
											: playerWinPct >= 40
												? 'bg-gray-700 text-gray-300'
												: 'bg-red-500/20 text-red-400'}"
									>
										{player.winRate}%
									</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-gray-500">No match data available for this hero.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
