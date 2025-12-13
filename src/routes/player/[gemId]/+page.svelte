<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { calculateAgeRating } from '$lib/age-rating.js';
	import DecklistCard from '$lib/components/DecklistCard.svelte';

	let { data } = $props();

	/**
	 * Calculate derived stats from monthly data
	 * - eventsPlayed: count of months with points > 0
	 * - top8Finishes: count of months with points >= 15 (5th-8th or better)
	 */
	function calculateDerivedStats(standing) {
		const monthlyPoints = [
			standing.januaryPoints || 0,
			standing.februaryPoints || 0,
			standing.marchPoints || 0,
			standing.aprilPoints || 0,
			standing.mayPoints || 0,
			standing.junePoints || 0,
			standing.julyPoints || 0,
			standing.augustPoints || 0,
			standing.septemberPoints || 0,
			standing.octoberPoints || 0,
			standing.novemberPoints || 0,
			standing.decemberPoints || 0
		];

		const eventsPlayed = monthlyPoints.filter((p) => p > 0).length;
		const top8Finishes = monthlyPoints.filter((p) => p >= 15).length;

		return { eventsPlayed, top8Finishes };
	}

	let editMode = $state(false);
	let showAddStanding = $state(false);
	let expandedSeasonId = $state(null);
	let expandedMonthKey = $state(null); // Tracks which month is expanded: "standingId|month"
	let linkCopied = $state(false);
	let isRefreshing = $state(false);

	// Refresh player data
	async function refreshData() {
		if (isRefreshing) return;
		isRefreshing = true;
		try {
			await invalidateAll();
		} finally {
			isRefreshing = false;
		}
	}
	let selectedOpponentKey = $state(''); // Selected opponent for head-to-head breakdown
	let opponentSearchQuery = $state(''); // Search query for combobox
	let showOpponentDropdown = $state(false); // Whether dropdown is visible

	// Head-to-head records sorted alphabetically
	const sortedHeadToHead = $derived(() => {
		if (!data.matchHistory?.headToHead) return [];
		return [...data.matchHistory.headToHead].sort((a, b) =>
			a.opponentName.localeCompare(b.opponentName)
		);
	});

	// Filtered head-to-head records based on search
	const filteredHeadToHead = $derived(() => {
		const sorted = sortedHeadToHead();
		if (!opponentSearchQuery.trim()) return sorted;
		const query = opponentSearchQuery.toLowerCase().trim();
		return sorted.filter((h2h) => h2h.opponentName.toLowerCase().includes(query));
	});

	// Select an opponent from the dropdown
	function selectOpponent(h2h) {
		selectedOpponentKey = h2h.opponentGemId || h2h.opponentName;
		opponentSearchQuery = h2h.opponentName;
		showOpponentDropdown = false;
	}

	// Clear selection
	function clearOpponentSelection() {
		selectedOpponentKey = '';
		opponentSearchQuery = '';
		showOpponentDropdown = false;
	}

	// Get selected opponent's record and matches
	const selectedOpponent = $derived(() => {
		if (!selectedOpponentKey || !data.matchHistory?.headToHead) return null;
		return data.matchHistory.headToHead.find(
			(h2h) => (h2h.opponentGemId || h2h.opponentName) === selectedOpponentKey
		);
	});

	// Get all matches against selected opponent
	const opponentMatches = $derived(() => {
		if (!selectedOpponent() || !data.matchHistory?.matchesByEvent) return [];
		const opponent = selectedOpponent();
		const allMatches = [];
		for (const matches of Object.values(data.matchHistory.matchesByEvent)) {
			for (const { match, event } of matches) {
				const isPlayer1 = match.player1GemId === data.gemId;
				const opponentGemId = isPlayer1 ? match.player2GemId : match.player1GemId;
				const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
				// Match by GEM ID if available, otherwise by name
				if (
					(opponent.opponentGemId && opponentGemId === opponent.opponentGemId) ||
					(!opponent.opponentGemId && opponentName === opponent.opponentName)
				) {
					allMatches.push({ match, event });
				}
			}
		}
		// Sort by year desc, then month desc (most recent first), then round asc
		const monthOrder = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		];
		return allMatches.sort((a, b) => {
			if (a.event.year !== b.event.year) return b.event.year.localeCompare(a.event.year);
			const monthA = monthOrder.indexOf(a.event.month);
			const monthB = monthOrder.indexOf(b.event.month);
			if (monthA !== monthB) return monthB - monthA; // Descending (most recent month first)
			return a.match.round - b.match.round;
		});
	});

	// Get matches for a specific event (year|circuit|month)
	function getMatchesForEvent(year, circuit, month) {
		if (!data.matchHistory?.matchesByEvent) return [];
		// Convert month key to proper case (e.g., "january" -> "January")
		const monthName = month.charAt(0).toUpperCase() + month.slice(1);
		const key = `${year}|${circuit}|${monthName}`;
		return data.matchHistory.matchesByEvent[key] || [];
	}

	// Get hero for a specific event (season|circuit|month)
	function getHeroForEvent(season, circuit, month) {
		if (!data.heroByEvent) return null;
		// Convert month key to proper case (e.g., "january" -> "January")
		const monthName = month.charAt(0).toUpperCase() + month.slice(1);
		const key = `${season}|${circuit}|${monthName}`;
		return data.heroByEvent[key] || null;
	}

	// Get opponent hero for a specific match
	function getOpponentHero(opponentGemId, year, circuit, month) {
		if (!data.opponentHeroMap || !opponentGemId) return null;
		const key = `${opponentGemId}|${year}|${circuit}|${month}`;
		return data.opponentHeroMap[key] || null;
	}

	// Sorted hero history (most recent first)
	const sortedHeroHistory = $derived(() => {
		if (!data.heroHistory) return [];
		const monthOrder = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		];
		return [...data.heroHistory].sort((a, b) => {
			// Sort by season descending
			if (a.season !== b.season) return b.season.localeCompare(a.season);
			// Sort by month descending (most recent first)
			const monthA = monthOrder.indexOf(a.month);
			const monthB = monthOrder.indexOf(b.month);
			return monthB - monthA;
		});
	});

	// Toggle expanded month
	function toggleMonthExpand(standingId, monthKey) {
		const key = `${standingId}|${monthKey}`;
		expandedMonthKey = expandedMonthKey === key ? null : key;
	}

	// Copy link to clipboard
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			linkCopied = true;
			setTimeout(() => (linkCopied = false), 2000);
		} catch (err) {
			console.error('Failed to copy link:', err);
		}
	}

	// Calculate win rate
	const winRate = $derived(
		data.totalStats.matchesPlayed > 0
			? Math.round((data.totalStats.matchesWon / data.totalStats.matchesPlayed) * 100)
			: 0
	);

	// Get unique seasons played
	const seasonsPlayed = $derived(
		[...new Set(data.standings.map((s) => s.season))].sort().reverse()
	);

	// Check if player qualified for championship (top 16 in any circuit for a season)
	const qualifiedSeasons = $derived(
		data.standings
			.filter((s) => s.calculatedRank && s.calculatedRank <= 16)
			.map((s) => s.season)
			.filter((v, i, a) => a.indexOf(v) === i)
	);

	// Group standings by season
	const standingsBySeason = $derived(
		data.standings.reduce((acc, standing) => {
			if (!acc[standing.season]) {
				acc[standing.season] = [];
			}
			acc[standing.season].push(standing);
			return acc;
		}, {})
	);

	const months = [
		{ key: 'january', label: 'Jan' },
		{ key: 'february', label: 'Feb' },
		{ key: 'march', label: 'Mar' },
		{ key: 'april', label: 'Apr' },
		{ key: 'may', label: 'May' },
		{ key: 'june', label: 'Jun' },
		{ key: 'july', label: 'Jul' },
		{ key: 'august', label: 'Aug' },
		{ key: 'september', label: 'Sep' },
		{ key: 'october', label: 'Oct' },
		{ key: 'november', label: 'Nov' },
		{ key: 'december', label: 'Dec' }
	];

	// === ADVANCED ANALYTICS ===

	// Top 8 Conversion Rate
	const top8ConversionRate = $derived(
		data.totalStats.eventsPlayed > 0
			? Math.round((data.totalStats.top8Finishes / data.totalStats.eventsPlayed) * 100)
			: 0
	);

	// Average Points Per Event
	const avgPointsPerEvent = $derived(
		data.totalStats.eventsPlayed > 0
			? (data.totalStats.totalPoints / data.totalStats.eventsPlayed).toFixed(1)
			: 0
	);

	// Best Rank Achieved (lowest rank number)
	const bestRank = $derived(() => {
		const ranks = data.standings.filter((s) => s.calculatedRank).map((s) => s.calculatedRank);
		return ranks.length > 0 ? Math.min(...ranks) : null;
	});

	// Average Rank
	const avgRank = $derived(() => {
		const ranks = data.standings.filter((s) => s.calculatedRank).map((s) => s.calculatedRank);
		if (ranks.length === 0) return null;
		return (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1);
	});

	// Circuits played
	const circuitsPlayed = $derived([...new Set(data.standings.map((s) => s.circuit))]);

	// Historical performance data (chronological timeline across all seasons)
	const historicalPerformance = $derived(() => {
		const timeline = [];

		// Get unique seasons sorted chronologically
		const seasons = [...new Set(data.standings.map((s) => s.season))].sort();

		// For each season, add monthly data points
		seasons.forEach((season) => {
			const seasonStandings = data.standings.filter((s) => s.season === season);

			months.forEach((m, monthIndex) => {
				let totalPoints = 0;
				let totalWins = 0;
				let totalMatches = 0;

				seasonStandings.forEach((s) => {
					totalPoints += s[`${m.key}Points`] || 0;
					totalWins += s[`${m.key}MatchesWon`] || 0;
					totalMatches += s[`${m.key}Matches`] || 0;
				});

				// Only add if there's data for this month
				if (totalPoints > 0 || totalMatches > 0) {
					timeline.push({
						season,
						month: m.label,
						monthKey: m.key,
						monthIndex,
						label: `${m.label} ${season}`,
						shortLabel: m.label,
						points: totalPoints,
						wins: totalWins,
						matches: totalMatches,
						winRate: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0,
						sortKey: `${season}-${String(monthIndex).padStart(2, '0')}`
					});
				}
			});
		});

		// Sort chronologically
		return timeline.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
	});

	// Check if we have monthly data or only aggregate data
	const hasMonthlyData = $derived(() => historicalPerformance().length > 0);

	// Season-level performance (fallback when no monthly data)
	const seasonPerformance = $derived(() => {
		// Group standings by season and aggregate
		const seasonMap = new Map();

		data.standings.forEach((s) => {
			if (!seasonMap.has(s.season)) {
				seasonMap.set(s.season, {
					season: s.season,
					points: 0,
					wins: 0,
					matches: 0,
					events: 0,
					circuits: new Set()
				});
			}
			const seasonData = seasonMap.get(s.season);
			const derived = calculateDerivedStats(s);
			seasonData.points += s.totalPoints || 0;
			seasonData.wins += s.matchesWon || 0;
			seasonData.matches += s.matchesPlayed || 0;
			seasonData.events += derived.eventsPlayed;
			seasonData.circuits.add(s.circuit);
		});

		return Array.from(seasonMap.values())
			.map((s) => ({
				...s,
				circuits: Array.from(s.circuits),
				winRate: s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0
			}))
			.sort((a, b) => a.season.localeCompare(b.season));
	});

	// Max points for season chart scaling
	const maxSeasonPoints = $derived(() => {
		const perf = seasonPerformance();
		if (perf.length === 0) return 1;
		return Math.max(...perf.map((s) => s.points), 1);
	});

	// Max points in any month (for chart scaling)
	const maxMonthlyPoints = $derived(() => {
		const perf = historicalPerformance();
		if (perf.length === 0) return 1;
		return Math.max(...perf.map((m) => m.points), 1);
	});

	// Months with activity
	const activeMonths = $derived(() => {
		return historicalPerformance().length;
	});

	// Performance trend (comparing recent months to earlier)
	const performanceTrend = $derived(() => {
		const perf = historicalPerformance();
		if (perf.length < 2) return 'neutral';
		const midpoint = Math.floor(perf.length / 2);
		const firstHalf = perf.slice(0, midpoint);
		const secondHalf = perf.slice(midpoint);
		const firstAvg = firstHalf.reduce((a, b) => a + b.points, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((a, b) => a + b.points, 0) / secondHalf.length;
		if (secondAvg > firstAvg * 1.1) return 'up';
		if (secondAvg < firstAvg * 0.9) return 'down';
		return 'neutral';
	});

	// Best month
	const bestMonth = $derived(() => {
		const perf = historicalPerformance();
		if (perf.length === 0) return null;
		const best = perf.reduce(
			(best, current) => (current.points > best.points ? current : best),
			perf[0]
		);
		return best.points > 0 ? best : null;
	});

	// === AGE RATING CALCULATION ===
	// Uses shared utility from $lib/age-rating.js for single source of truth
	const ageRating = $derived(() => {
		const p = data.percentiles;
		const stats = data.totalStats;

		// Use shared calculateAgeRating function
		const result = calculateAgeRating(p, stats.eventsPlayed);

		// Extend with additional display data needed for player profile
		return {
			...result,
			percentiles: {
				winRate: Math.round(p.winRate),
				top8Rate: Math.round(p.top8Rate),
				experience: Math.round(p.experience),
				bestRank: Math.round(p.bestRank),
				efficiency: Math.round(p.efficiency),
				championship: Math.round(p.championship)
			},
			totalPlayers: p.totalPlayers
		};
	});

	// Get rating tier/label based on score - Competition Style tiers
	// With harsh curve, these thresholds are much harder to reach
	const ratingTier = $derived(() => {
		const rating = ageRating().total;
		const isProvisional = ageRating().eventPenalty;

		// Provisional - players with fewer than 3 events
		if (isProvisional)
			return {
				label: 'Provisional',
				color: 'text-slate-400',
				bg: 'from-slate-600/30 to-slate-700/30',
				border: 'border-slate-500/40',
				description: 'Need 3+ events'
			};
		// Elite (90+) - Top 1%
		if (rating >= 90)
			return {
				label: 'Elite',
				color: 'text-yellow-300',
				bg: 'from-yellow-500/40 to-amber-600/40',
				border: 'border-yellow-400/60',
				description: 'Top 1%'
			};
		// Premier (80-89) - Top 5%
		if (rating >= 80)
			return {
				label: 'Premier',
				color: 'text-purple-300',
				bg: 'from-purple-500/35 to-fuchsia-500/35',
				border: 'border-purple-400/50',
				description: 'Top 5%'
			};
		// Distinguished (70-79) - Top 10%
		if (rating >= 70)
			return {
				label: 'Distinguished',
				color: 'text-cyan-300',
				bg: 'from-cyan-500/30 to-blue-500/30',
				border: 'border-cyan-400/50',
				description: 'Top 10%'
			};
		// Competitive (60-69) - Top 20%
		if (rating >= 60)
			return {
				label: 'Competitive',
				color: 'text-teal-300',
				bg: 'from-teal-500/30 to-emerald-500/30',
				border: 'border-teal-400/50',
				description: 'Top 20%'
			};
		// Established (50-59) - Top 35%
		if (rating >= 50)
			return {
				label: 'Established',
				color: 'text-amber-400',
				bg: 'from-amber-500/25 to-yellow-600/25',
				border: 'border-amber-500/40',
				description: 'Top 35%'
			};
		// Rising (40-49) - Top 50%
		if (rating >= 40)
			return {
				label: 'Rising',
				color: 'text-gray-300',
				bg: 'from-gray-400/25 to-slate-500/25',
				border: 'border-gray-400/40',
				description: 'Top 50%'
			};
		// Developing (30-39) - Below average
		if (rating >= 30)
			return {
				label: 'Developing',
				color: 'text-orange-400',
				bg: 'from-orange-600/25 to-amber-700/25',
				border: 'border-orange-500/40',
				description: 'Below average'
			};
		// Newcomer (20-29) - New player
		if (rating >= 20)
			return {
				label: 'Newcomer',
				color: 'text-stone-400',
				bg: 'from-stone-600/25 to-stone-700/25',
				border: 'border-stone-500/40',
				description: 'New player'
			};
		// Unranked (<20) - Insufficient data
		return {
			label: 'Unranked',
			color: 'text-slate-500',
			bg: 'from-slate-700/20 to-slate-800/20',
			border: 'border-slate-600/30',
			description: 'Insufficient data'
		};
	});

	// Social share URLs
	const shareUrl = $derived($page.url.href);
	const shareText = $derived(
		`Check out ${data.displayName}'s competitive stats on AGE! AGE Rating: ${ageRating().total}/100 | ${data.totalStats.totalPoints} points | ${winRate}% win rate | ${data.totalStats.top8Finishes} Top 8s`
	);
	const xShareUrl = $derived(
		`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
	);
	const blueskyShareUrl = $derived(
		`https://bsky.app/intent/compose?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
	);
</script>

<svelte:head>
	<title>{data.displayName} ({ageRating().total} AGE) - Player Profile</title>
	<meta
		name="description"
		content="{data.displayName}'s competitive profile. AGE Rating: {ageRating()
			.total}/100 ({ratingTier().label}). {data.totalStats
			.totalPoints} total points, {winRate}% win rate, {data.totalStats
			.top8Finishes} Top 8 finishes."
	/>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Banner -->
	<div class="relative overflow-x-clip">
		<!-- Animated background -->
		<div
			class="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-gray-950"
		></div>
		<div
			class="bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] absolute inset-0 opacity-50"
		></div>

		<!-- Glowing orbs -->
		<div
			class="absolute top-20 left-1/4 h-96 w-96 animate-pulse rounded-full bg-blue-500/20 blur-3xl"
		></div>
		<div
			class="absolute top-40 right-1/4 h-80 w-80 animate-pulse rounded-full bg-purple-500/20 blur-3xl"
			style="animation-delay: 1s;"
		></div>

		<div class="relative mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12 sm:pb-24 lg:px-8">
			<!-- Back to Standings Link -->
			<a
				href="/age-open?tab=standings"
				class="group mb-6 inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
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
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				<span class="text-sm font-medium">Back to Standings</span>
			</a>

			<div class="flex flex-col items-center gap-8 lg:flex-row">
				<!-- AGE Rating Badge (Primary) -->
				<div class="group relative cursor-pointer">
					<div
						class="h-32 w-32 rounded-2xl bg-gradient-to-br sm:h-40 sm:w-40 {ratingTier()
							.bg} border-3 {ratingTier()
							.border} flex flex-col items-center justify-center shadow-2xl shadow-purple-500/25 backdrop-blur-sm transition-transform hover:scale-105"
					>
						<span class="text-5xl font-black sm:text-6xl {ratingTier().color}"
							>{ageRating().total}</span
						>
						<span class="mt-1 text-xs font-bold tracking-widest text-gray-400 uppercase sm:text-sm"
							>AGE Rating</span
						>
						<span
							class="mt-2 rounded-full bg-gray-900/60 px-3 py-1 {ratingTier()
								.color} text-xs font-bold">{ratingTier().label}</span
						>
					</div>
					<!-- Tooltip on hover -->
					<div
						class="pointer-events-none absolute top-full left-1/2 z-50 mt-3 hidden -translate-x-1/2 group-hover:block"
					>
						<div
							class="min-w-[200px] rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 shadow-2xl"
						>
							<div class="mb-2 text-center">
								<span class="{ratingTier().color} font-bold">{ratingTier().label}</span>
								<span class="ml-1 text-xs text-gray-500">- {ratingTier().description}</span>
							</div>
							<div class="mb-3 text-center text-xs text-gray-500">
								vs {ageRating().totalPlayers} players
							</div>
							<div class="space-y-1.5 text-xs">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<div class="h-2 w-2 rounded-full bg-blue-400"></div>
										<span class="text-gray-400">Win Rate</span>
									</div>
									<span class="font-medium text-white"
										>{ageRating().percentiles.winRate}th %ile</span
									>
								</div>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<div class="h-2 w-2 rounded-full bg-purple-400"></div>
										<span class="text-gray-400">Top 8</span>
									</div>
									<span class="font-medium text-white"
										>{ageRating().percentiles.top8Rate}th %ile</span
									>
								</div>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<div class="h-2 w-2 rounded-full bg-emerald-400"></div>
										<span class="text-gray-400">Peak</span>
									</div>
									<span class="font-medium text-white"
										>{ageRating().percentiles.bestRank}th %ile</span
									>
								</div>
							</div>
							{#if ageRating().eventPenalty}
								<div
									class="mt-2 border-t border-gray-800 pt-2 text-center text-xs text-amber-500/80"
								>
									Rating reduced (need 3+ events)
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Player Info -->
				<div class="flex-1 text-center lg:text-left">
					<h1 class="mb-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
						{data.displayName}
					</h1>

					<!-- Championship Badges -->
					{#if qualifiedSeasons.length > 0}
						<div class="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
							{#each qualifiedSeasons as qualifiedSeason}
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-3 py-1 text-xs font-bold text-yellow-400"
								>
									<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
										/>
									</svg>
									{qualifiedSeason} Players Championship
								</span>
							{/each}
						</div>
					{/if}

					<!-- GEM ID and Aliases -->
					<div class="mb-4 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
						<span
							class="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-1.5 text-sm font-medium text-blue-400"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
								/>
							</svg>
							GEM ID: {data.gemId}
						</span>
					</div>

					<!-- Action Buttons -->
					<div class="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
						<!-- Refresh Button -->
						<button
							onclick={refreshData}
							disabled={isRefreshing}
							class="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 hover:text-white disabled:opacity-50"
							title="Refresh data"
						>
							<svg
								class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}"
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
							<span class="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
						</button>

						{#if data.isAdmin}
							<button
								onclick={() => (editMode = !editMode)}
								class="inline-flex items-center gap-2 rounded-lg px-4 py-2 {editMode
									? 'border-red-500/30 bg-red-500/20 text-red-400'
									: 'border-gray-700 bg-gray-800 text-gray-300'} hover:bg-opacity-80 border text-sm font-medium transition-all"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									{#if editMode}
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									{:else}
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									{/if}
								</svg>
								{editMode ? 'Exit Edit Mode' : 'Edit Profile'}
							</button>
						{/if}

						<!-- Share Buttons -->
						<button
							onclick={copyLink}
							class="inline-flex items-center gap-2 rounded-lg px-3 py-2 {linkCopied
								? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
								: 'border-gray-700 bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white'} border text-sm font-medium transition-all"
							title="Copy link"
						>
							{#if linkCopied}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span class="hidden sm:inline">Copied!</span>
							{:else}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
									/>
								</svg>
								<span class="hidden sm:inline">Copy Link</span>
							{/if}
						</button>
						<a
							href={xShareUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 hover:text-white"
							title="Share on X"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path
									d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
								/>
							</svg>
							<span class="hidden sm:inline">Share</span>
						</a>
						<a
							href={blueskyShareUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-400 transition-all hover:bg-sky-500/30"
							title="Share on Bluesky"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 568 501">
								<path
									d="M123.121 33.664C188.241 82.553 258.281 181.681 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.612 568-28.906 568 57.947c0 17.345-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748 114.875 19.551 144.097 84.311 80.986 149.071-119.86 122.992-172.272-30.859-185.702-70.281-2.462-9.223-3.614-13.522-3.631-11.4-.017-2.122-1.169 2.177-3.631 11.4-13.43 39.422-65.842 193.273-185.702 70.281-63.111-64.76-33.889-129.52 80.986-149.071-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.659 0 75.291 0 57.946 0-28.906 76.135-1.612 123.121 33.664z"
								/>
							</svg>
							<span class="hidden sm:inline">Share</span>
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
			<!-- Total Points -->
			<div
				class="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/50 to-gray-900 p-5 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
			>
				<div
					class="absolute top-0 right-0 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20"
				></div>
				<div class="relative">
					<div class="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-400">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
							/>
						</svg>
						Total Points
					</div>
					<div class="text-3xl font-bold text-white sm:text-4xl">{data.totalStats.totalPoints}</div>
				</div>
			</div>

			<!-- Win Rate -->
			<div
				class="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/50 to-gray-900 p-5 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
			>
				<div
					class="absolute top-0 right-0 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all group-hover:bg-blue-500/20"
				></div>
				<div class="relative">
					<div class="mb-2 flex items-center gap-2 text-sm font-medium text-blue-400">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
						Win Rate
					</div>
					<div class="text-3xl font-bold text-white sm:text-4xl">{winRate}%</div>
				</div>
			</div>

			<!-- Match Record -->
			<div
				class="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/50 to-gray-900 p-5 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
			>
				<div
					class="absolute top-0 right-0 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl transition-all group-hover:bg-purple-500/20"
				></div>
				<div class="relative">
					<div class="mb-2 flex items-center gap-2 text-sm font-medium text-purple-400">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
						Match Record
					</div>
					<div class="text-3xl font-bold text-white sm:text-4xl">
						<span class="text-green-400">{data.totalStats.matchesWon}</span>
						<span class="mx-1 text-xl text-gray-500">-</span>
						<span class="text-red-400"
							>{data.totalStats.matchesPlayed - data.totalStats.matchesWon}</span
						>
					</div>
				</div>
			</div>

			<!-- Events Played -->
			<div
				class="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/50 to-gray-900 p-5 transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10"
			>
				<div
					class="absolute top-0 right-0 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20"
				></div>
				<div class="relative">
					<div class="mb-2 flex items-center gap-2 text-sm font-medium text-amber-400">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						Events
					</div>
					<div class="text-3xl font-bold text-white sm:text-4xl">
						{data.totalStats.eventsPlayed}
					</div>
				</div>
			</div>

			<!-- Top 8 Finishes -->
			<div
				class="group relative col-span-2 overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-900/50 to-gray-900 p-5 transition-all hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/10 sm:col-span-1"
			>
				<div
					class="absolute top-0 right-0 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl transition-all group-hover:bg-rose-500/20"
				></div>
				<div class="relative">
					<div class="mb-2 flex items-center gap-2 text-sm font-medium text-rose-400">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
							/>
						</svg>
						Top 8 Finishes
					</div>
					<div class="text-3xl font-bold text-white sm:text-4xl">
						{data.totalStats.top8Finishes}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Performance Analytics Section -->
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<h2 class="mb-6 flex items-center gap-3 text-2xl font-bold text-white">
			<svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
			Performance Analytics
		</h2>

		<!-- AGE Rating Breakdown - Compact Visual Grid -->
		<div class="mb-6 rounded-2xl border border-gray-800 bg-gray-900/50">
			<div class="flex items-center justify-between border-b border-gray-800 px-6 py-4">
				<h3 class="flex items-center gap-2 text-lg font-semibold text-white">
					<svg class="h-5 w-5 {ratingTier().color}" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
						/>
					</svg>
					Rating Breakdown
				</h3>
				<span class="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-500"
					>vs {ageRating().totalPlayers} players</span
				>
			</div>
			<div class="overflow-visible p-4 sm:p-6">
				<div class="grid grid-cols-2 gap-3 overflow-visible sm:grid-cols-3 lg:grid-cols-6">
					<!-- Win Rate -->
					<div
						class="group relative cursor-help rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-900/40 to-gray-900 p-4 transition-all hover:border-blue-500/40"
					>
						<div class="flex flex-col items-center text-center">
							<div
								class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20"
							>
								<span class="text-lg font-bold text-blue-400"
									>{ageRating().breakdown.winRate.toFixed(0)}</span
								>
							</div>
							<div class="text-xs font-medium text-gray-400">Win Rate</div>
							<div class="mt-1 text-[10px] text-blue-400/80">
								{ageRating().percentiles.winRate}th %ile
							</div>
						</div>
						<!-- Tooltip -->
						<div
							class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover:block"
						>
							<div
								class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs whitespace-nowrap shadow-xl"
							>
								<div class="font-semibold text-blue-400">Win Rate Score</div>
								<div class="text-gray-300">{ageRating().breakdown.winRate.toFixed(1)} / 25 pts</div>
								<div class="text-gray-500">Match win percentage</div>
							</div>
						</div>
					</div>

					<!-- Top 8 -->
					<div
						class="group relative cursor-help rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-gray-900 p-4 transition-all hover:border-purple-500/40"
					>
						<div class="flex flex-col items-center text-center">
							<div
								class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20"
							>
								<span class="text-lg font-bold text-purple-400"
									>{ageRating().breakdown.top8.toFixed(0)}</span
								>
							</div>
							<div class="text-xs font-medium text-gray-400">Top 8</div>
							<div class="mt-1 text-[10px] text-purple-400/80">
								{ageRating().percentiles.top8Rate}th %ile
							</div>
						</div>
						<!-- Tooltip -->
						<div
							class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover:block"
						>
							<div
								class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs whitespace-nowrap shadow-xl"
							>
								<div class="font-semibold text-purple-400">Top 8 Conversion</div>
								<div class="text-gray-300">{ageRating().breakdown.top8.toFixed(1)} / 25 pts</div>
								<div class="text-gray-500">Playoff consistency</div>
							</div>
						</div>
					</div>

					<!-- Peak -->
					<div
						class="group relative cursor-help rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/40 to-gray-900 p-4 transition-all hover:border-emerald-500/40"
					>
						<div class="flex flex-col items-center text-center">
							<div
								class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20"
							>
								<span class="text-lg font-bold text-emerald-400"
									>{ageRating().breakdown.peak.toFixed(0)}</span
								>
							</div>
							<div class="text-xs font-medium text-gray-400">Peak</div>
							<div class="mt-1 text-[10px] text-emerald-400/80">
								{ageRating().percentiles.bestRank}th %ile
							</div>
						</div>
						<!-- Tooltip -->
						<div
							class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover:block"
						>
							<div
								class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs whitespace-nowrap shadow-xl"
							>
								<div class="font-semibold text-emerald-400">Peak Performance</div>
								<div class="text-gray-300">{ageRating().breakdown.peak.toFixed(1)} / 20 pts</div>
								<div class="text-gray-500">Best circuit rank achieved</div>
							</div>
						</div>
					</div>

					<!-- Experience -->
					<div
						class="group relative cursor-help rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-900/40 to-gray-900 p-4 transition-all hover:border-amber-500/40"
					>
						<div class="flex flex-col items-center text-center">
							<div
								class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20"
							>
								<span class="text-lg font-bold text-amber-400"
									>{ageRating().breakdown.experience.toFixed(0)}</span
								>
							</div>
							<div class="text-xs font-medium text-gray-400">Experience</div>
							<div class="mt-1 text-[10px] text-amber-400/80">
								{ageRating().percentiles.experience}th %ile
							</div>
						</div>
						<!-- Tooltip -->
						<div
							class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover:block"
						>
							<div
								class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs whitespace-nowrap shadow-xl"
							>
								<div class="font-semibold text-amber-400">Experience</div>
								<div class="text-gray-300">
									{ageRating().breakdown.experience.toFixed(1)} / 10 pts
								</div>
								<div class="text-gray-500">Total events played</div>
							</div>
						</div>
					</div>

					<!-- Efficiency -->
					<div
						class="group relative cursor-help rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/40 to-gray-900 p-4 transition-all hover:border-cyan-500/40"
					>
						<div class="flex flex-col items-center text-center">
							<div
								class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20"
							>
								<span class="text-lg font-bold text-cyan-400"
									>{ageRating().breakdown.efficiency.toFixed(0)}</span
								>
							</div>
							<div class="text-xs font-medium text-gray-400">Efficiency</div>
							<div class="mt-1 text-[10px] text-cyan-400/80">
								{ageRating().percentiles.efficiency}th %ile
							</div>
						</div>
						<!-- Tooltip -->
						<div
							class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover:block"
						>
							<div
								class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs whitespace-nowrap shadow-xl"
							>
								<div class="font-semibold text-cyan-400">Points Efficiency</div>
								<div class="text-gray-300">
									{ageRating().breakdown.efficiency.toFixed(1)} / 15 pts
								</div>
								<div class="text-gray-500">Avg points per event</div>
							</div>
						</div>
					</div>

					<!-- Championship -->
					<div
						class="group relative cursor-help rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-900/40 to-gray-900 p-4 transition-all hover:border-yellow-500/40"
					>
						<div class="flex flex-col items-center text-center">
							<div
								class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20"
							>
								<span class="text-lg font-bold text-yellow-400"
									>{ageRating().breakdown.championship.toFixed(0)}</span
								>
							</div>
							<div class="text-xs font-medium text-gray-400">Champ</div>
							<div class="mt-1 text-[10px] text-yellow-400/80">
								{ageRating().percentiles.championship}th %ile
							</div>
						</div>
						<!-- Tooltip -->
						<div
							class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover:block"
						>
							<div
								class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs whitespace-nowrap shadow-xl"
							>
								<div class="font-semibold text-yellow-400">Championship Bonus</div>
								<div class="text-gray-300">
									{ageRating().breakdown.championship.toFixed(1)} / 5 pts
								</div>
								<div class="text-gray-500">Top 16 qualifications</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Rating Explanation -->
				<div class="mt-4 border-t border-gray-800/50 pt-4">
					<div class="space-y-2 text-xs leading-relaxed text-gray-500">
						<p>
							<span class="font-medium text-gray-400">How AGE Rating works:</span> Your rating uses a
							harsh power curve that makes high scores extremely difficult to achieve. Percentiles are
							compressed (50th %ile = ~35% credit, 90th %ile = ~85% credit).
						</p>
						<p>
							<span class="font-medium text-gray-400">Weights:</span> Win Rate (25), Top 8 Rate (25),
							Peak Rank (20), Efficiency (15), Experience (10), Championship (5). Players with fewer
							than 3 events receive a penalty.
						</p>
						<p>
							<span class="font-medium text-gray-400">Tiers:</span> Elite (90+), Premier (80+), Distinguished
							(70+), Competitive (60+), Established (50+), Rising (40+), Developing (30+), Newcomer (20+).
						</p>
					</div>
					{#if ageRating().eventPenalty}
						<p class="mt-2 flex items-center gap-1 text-xs text-amber-500/80">
							<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clip-rule="evenodd"
								/>
							</svg>
							Rating reduced - need 3+ events for full credit
						</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Performance Stats Grid -->
			<div class="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
				<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
					<svg class="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
					Performance Stats
				</h3>
				<div class="grid grid-cols-2 gap-4">
					<!-- Top 8 Conversion -->
					<div
						class="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/30 to-gray-900 p-4"
					>
						<div class="mb-1 text-xs font-medium tracking-wide text-cyan-400/80 uppercase">
							Top 8 Rate
						</div>
						<div class="text-2xl font-bold text-white">{top8ConversionRate}%</div>
						<div class="mt-1 text-xs text-gray-500">
							{data.totalStats.top8Finishes} / {data.totalStats.eventsPlayed} events
						</div>
					</div>

					<!-- Avg Points Per Event -->
					<div
						class="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/30 to-gray-900 p-4"
					>
						<div class="mb-1 text-xs font-medium tracking-wide text-emerald-400/80 uppercase">
							Avg Pts/Event
						</div>
						<div class="text-2xl font-bold text-white">{avgPointsPerEvent}</div>
						<div class="mt-1 text-xs text-gray-500">per tournament</div>
					</div>

					<!-- Best Rank -->
					<div
						class="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-900/30 to-gray-900 p-4"
					>
						<div class="mb-1 text-xs font-medium tracking-wide text-yellow-400/80 uppercase">
							Best Rank
						</div>
						<div class="text-2xl font-bold text-white">
							{#if bestRank()}
								#{bestRank()}
							{:else}
								—
							{/if}
						</div>
						<div class="mt-1 text-xs text-gray-500">circuit standing</div>
					</div>

					<!-- Average Rank -->
					<div
						class="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-gray-900 p-4"
					>
						<div class="mb-1 text-xs font-medium tracking-wide text-violet-400/80 uppercase">
							Avg Rank
						</div>
						<div class="text-2xl font-bold text-white">
							{#if avgRank()}
								#{avgRank()}
							{:else}
								—
							{/if}
						</div>
						<div class="mt-1 text-xs text-gray-500">across circuits</div>
					</div>

					<!-- Circuits Played -->
					<div
						class="rounded-xl border border-pink-500/20 bg-gradient-to-br from-pink-900/30 to-gray-900 p-4"
					>
						<div class="mb-1 text-xs font-medium tracking-wide text-pink-400/80 uppercase">
							Circuits
						</div>
						<div class="text-2xl font-bold text-white">{circuitsPlayed.length}</div>
						<div class="mt-1 truncate text-xs text-gray-500" title={circuitsPlayed.join(', ')}>
							{circuitsPlayed.slice(0, 2).join(', ')}{circuitsPlayed.length > 2 ? '...' : ''}
						</div>
					</div>

					<!-- Seasons Played -->
					<div
						class="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-900/30 to-gray-900 p-4"
					>
						<div class="mb-1 text-xs font-medium tracking-wide text-orange-400/80 uppercase">
							Seasons
						</div>
						<div class="text-2xl font-bold text-white">{seasonsPlayed.length}</div>
						<div class="mt-1 text-xs text-gray-500">
							{seasonsPlayed[0] || '—'}{seasonsPlayed.length > 1
								? ` - ${seasonsPlayed[seasonsPlayed.length - 1]}`
								: ''}
						</div>
					</div>
				</div>
			</div>

			<!-- Historical Performance Chart -->
			<div class="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6">
				<h3
					class="mb-4 flex flex-wrap items-center gap-2 text-base font-semibold text-white sm:text-lg"
				>
					<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
						/>
					</svg>
					Performance History
					{#if performanceTrend() === 'up'}
						<span
							class="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400"
						>
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
								/>
							</svg>
							Trending Up
						</span>
					{:else if performanceTrend() === 'down'}
						<span
							class="ml-auto flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400"
						>
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
								/>
							</svg>
							Trending Down
						</span>
					{/if}
				</h3>

				<!-- Match Stats Row -->
				{#if data.matchHistory}
					<div class="mb-4 grid grid-cols-2 gap-2 sm:mb-5 sm:grid-cols-4 sm:gap-3">
						<!-- Total Matches -->
						<div class="rounded-lg bg-gray-800/50 p-2.5 text-center sm:p-3">
							<div class="text-lg font-bold text-white tabular-nums sm:text-xl">
								{data.matchHistory.totalMatches}
							</div>
							<div
								class="text-[9px] font-medium tracking-wide text-gray-500 uppercase sm:text-[10px]"
							>
								Matches
							</div>
						</div>
						<!-- Unique Opponents -->
						<div class="rounded-lg bg-gray-800/50 p-2.5 text-center sm:p-3">
							<div class="text-lg font-bold text-blue-400 tabular-nums sm:text-xl">
								{data.matchHistory.headToHead?.length || 0}
							</div>
							<div
								class="text-[9px] font-medium tracking-wide text-gray-500 uppercase sm:text-[10px]"
							>
								Opponents
							</div>
						</div>
						<!-- Current Streak -->
						<div class="rounded-lg bg-gray-800/50 p-2.5 text-center sm:p-3">
							<div
								class="text-lg font-bold tabular-nums sm:text-xl {data.matchHistory
									.currentWinStreak > 0
									? 'text-emerald-400'
									: 'text-gray-400'}"
							>
								{data.matchHistory.currentWinStreak > 0 ? data.matchHistory.currentWinStreak : '—'}
							</div>
							<div
								class="text-[9px] font-medium tracking-wide text-gray-500 uppercase sm:text-[10px]"
							>
								Streak
							</div>
						</div>
						<!-- Longest Streak -->
						<div class="rounded-lg bg-gray-800/50 p-2.5 text-center sm:p-3">
							<div class="text-lg font-bold text-yellow-400 tabular-nums sm:text-xl">
								{data.matchHistory.longestWinStreak || '—'}
							</div>
							<div
								class="text-[9px] font-medium tracking-wide text-gray-500 uppercase sm:text-[10px]"
							>
								Best Run
							</div>
						</div>
					</div>

					<!-- Recent Form -->
					{#if data.matchHistory.recentMatches?.length > 0}
						<div class="mb-4 sm:mb-5">
							<div class="mb-2 text-[10px] font-medium text-gray-500 sm:text-xs">Recent Form</div>
							<div class="flex flex-wrap items-center gap-1 sm:gap-1.5">
								{#each data.matchHistory.recentMatches.slice(0, 10) as { match }, i}
									{@const isPlayer1 = match.player1GemId === data.gemId}
									{@const won =
										(isPlayer1 && match.winner === 'player1') ||
										(!isPlayer1 && match.winner === 'player2')}
									{@const lost =
										(isPlayer1 && match.winner === 'player2') ||
										(!isPlayer1 && match.winner === 'player1')}
									<div
										class="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold sm:h-6 sm:w-6 sm:text-[10px]
											{won
											? 'bg-green-500/20 text-green-400'
											: lost
												? 'bg-red-500/20 text-red-400'
												: 'bg-gray-700 text-gray-400'}"
										title="Match {i + 1}"
									>
										{won ? 'W' : lost ? 'L' : 'D'}
									</div>
								{/each}
								{#if data.matchHistory.recentMatches.length > 10}
									<span class="text-[10px] text-gray-600 sm:text-xs"
										>+{data.matchHistory.recentMatches.length - 10}</span
									>
								{/if}
							</div>
						</div>
					{/if}
				{/if}

				{#if hasMonthlyData()}
					<!-- Historical Timeline Chart (Monthly) -->
					<div class="relative">
						<!-- Scrollable container for many data points -->
						<div class="-mx-2 overflow-x-auto px-2 pb-2">
							<div
								class="mb-2 flex items-end gap-1"
								style="height: 120px; min-width: {Math.max(
									historicalPerformance().length * 36,
									100
								)}px"
							>
								{#each historicalPerformance() as dataPoint, i}
									{@const heightPx =
										maxMonthlyPoints() > 0
											? Math.max((dataPoint.points / maxMonthlyPoints()) * 100, 10)
											: 10}
									{@const prevSeason = i > 0 ? historicalPerformance()[i - 1].season : null}
									{@const isNewSeason = dataPoint.season !== prevSeason}
									<div
										class="group relative flex h-full flex-col items-center justify-end {isNewSeason &&
										i > 0
											? 'ml-2 border-l border-gray-700 pl-2 sm:ml-3 sm:pl-3'
											: ''}"
										style="min-width: 32px; flex: 1;"
									>
										<!-- Tooltip -->
										<div
											class="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 group-hover:block"
										>
											<div
												class="max-w-[220px] min-w-[160px] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs shadow-xl"
											>
												<div class="mb-1 font-semibold text-white">{dataPoint.label}</div>
												<div class="text-emerald-400">{dataPoint.points} pts</div>
												{#if dataPoint.matches > 0}
													<div class="text-gray-400">
														{dataPoint.wins}W-{dataPoint.matches - dataPoint.wins}L ({dataPoint.winRate}%)
													</div>
												{/if}
											</div>
										</div>
										<!-- Bar -->
										<div
											class="w-full max-w-6 rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-300 group-hover:from-blue-500 group-hover:to-blue-300"
											style="height: {heightPx}px"
										></div>
									</div>
								{/each}
							</div>
							<!-- Labels -->
							<div
								class="flex gap-1"
								style="min-width: {Math.max(historicalPerformance().length * 36, 100)}px"
							>
								{#each historicalPerformance() as dataPoint, i}
									{@const prevSeason = i > 0 ? historicalPerformance()[i - 1].season : null}
									{@const isNewSeason = dataPoint.season !== prevSeason}
									<div
										class="flex flex-col items-center {isNewSeason && i > 0
											? 'ml-2 border-l border-gray-700 pl-2 sm:ml-3 sm:pl-3'
											: ''}"
										style="min-width: 32px; flex: 1;"
									>
										<span class="text-[9px] text-gray-500 sm:text-[10px]"
											>{dataPoint.shortLabel}</span
										>
										{#if isNewSeason}
											<span class="text-[8px] font-medium text-blue-400 sm:text-[9px]"
												>{dataPoint.season}</span
											>
										{/if}
									</div>
								{/each}
							</div>
						</div>
						<!-- Scroll hint for mobile -->
						{#if historicalPerformance().length > 8}
							<div
								class="pointer-events-none absolute top-0 right-0 bottom-8 flex w-8 items-center justify-center bg-gradient-to-l from-gray-900/90 to-transparent sm:hidden"
							>
								<svg
									class="h-4 w-4 animate-pulse text-gray-500"
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

					<!-- Best Month Highlight -->
					{#if bestMonth()}
						<div class="mt-3 border-t border-gray-800 pt-3 sm:mt-4 sm:pt-4">
							<div class="flex items-center justify-between gap-2">
								<div class="text-xs text-gray-400 sm:text-sm">Best Month</div>
								<div class="flex items-center gap-1.5 sm:gap-2">
									<span class="text-sm font-bold text-yellow-400 sm:text-lg"
										>{bestMonth().label}</span
									>
									<span class="text-xs text-gray-500 sm:text-sm">•</span>
									<span class="text-sm font-semibold text-emerald-400"
										>{bestMonth().points} pts</span
									>
								</div>
							</div>
						</div>
					{/if}
				{:else if seasonPerformance().length > 0}
					<!-- Season-Level Chart (Fallback when no monthly data) -->
					<div class="relative">
						<div class="mb-2 flex items-end justify-center gap-2 sm:gap-4" style="height: 120px;">
							{#each seasonPerformance() as seasonData}
								{@const heightPx =
									maxSeasonPoints() > 0
										? Math.max((seasonData.points / maxSeasonPoints()) * 100, 10)
										: 10}
								<div
									class="group relative flex h-full flex-col items-center justify-end"
									style="min-width: 60px; max-width: 100px; flex: 1;"
								>
									<!-- Tooltip -->
									<div
										class="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 group-hover:block"
									>
										<div
											class="max-w-[220px] min-w-[160px] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs shadow-xl"
										>
											<div class="mb-1 font-semibold text-white">{seasonData.season} Season</div>
											<div class="text-emerald-400">{seasonData.points} pts</div>
											<div class="text-gray-400">
												{seasonData.wins}W-{seasonData.matches - seasonData.wins}L ({seasonData.winRate}%)
											</div>
											<div class="mt-1 text-gray-500">
												{seasonData.events} events • {seasonData.circuits.join(', ')}
											</div>
										</div>
									</div>
									<!-- Bar -->
									<div
										class="w-full max-w-16 rounded-t bg-gradient-to-t from-purple-600 to-purple-400 transition-all duration-300 group-hover:from-purple-500 group-hover:to-purple-300"
										style="height: {heightPx}px"
									></div>
								</div>
							{/each}
						</div>
						<!-- Season Labels -->
						<div class="flex justify-center gap-4">
							{#each seasonPerformance() as seasonData}
								<div
									class="flex flex-col items-center"
									style="min-width: 80px; max-width: 120px; flex: 1;"
								>
									<span class="text-sm font-medium text-blue-400">{seasonData.season}</span>
									<span class="text-xs text-gray-500">{seasonData.points} pts</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Best Season Highlight -->
					{@const bestSeason = seasonPerformance().reduce(
						(best, current) => (current.points > best.points ? current : best),
						seasonPerformance()[0]
					)}
					{#if bestSeason && bestSeason.points > 0}
						<div class="mt-4 border-t border-gray-800 pt-4">
							<div class="flex items-center justify-between">
								<div class="text-sm text-gray-400">Best Season</div>
								<div class="flex items-center gap-2">
									<span class="text-lg font-bold text-yellow-400">{bestSeason.season}</span>
									<span class="text-sm text-gray-500">•</span>
									<span class="font-semibold text-emerald-400">{bestSeason.points} pts</span>
								</div>
							</div>
						</div>
					{/if}

					<p class="mt-3 text-center text-xs text-gray-600">
						Monthly breakdown available after event closeouts
					</p>
				{:else if !data.matchHistory}
					<!-- No Data State (no match or performance data at all) -->
					<div class="flex flex-col items-center justify-center py-8 text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/50"
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
									stroke-width="1.5"
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
						</div>
						<p class="text-sm font-medium text-gray-400">No match history yet</p>
						<p class="mt-1 text-xs text-gray-600">
							Performance data appears after events are processed
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Player vs Player Stats -->
		<div class="mt-6 rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
			<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
				<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
				Player vs Player
				{#if data.matchHistory?.headToHead?.length > 0}
					<span class="ml-auto rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-400">
						{data.matchHistory.headToHead.length} opponents faced
					</span>
				{/if}
			</h3>

			{#if data.matchHistory?.headToHead?.length > 0}
				<!-- Nemesis & Best Matchup Cards -->
				<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Nemesis -->
					<div
						class="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-900/20 to-gray-900 p-4"
					>
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex items-center gap-2">
									<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
										<svg
											class="h-4 w-4 text-red-400"
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
									</span>
									<span class="text-xs font-semibold tracking-wide text-red-400 uppercase"
										>Nemesis</span
									>
								</div>
								{#if data.matchHistory.nemesis}
									<div class="truncate text-lg font-bold text-white">
										{#if data.matchHistory.nemesis.opponentGemId}
											<a
												href="/player/{data.matchHistory.nemesis.opponentGemId}"
												class="hover:text-red-400"
											>
												{data.matchHistory.nemesis.opponentName}
											</a>
										{:else}
											{data.matchHistory.nemesis.opponentName}
										{/if}
									</div>
									<div class="mt-1 flex items-center gap-2 text-sm">
										<span
											class="rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
										>
											{data.matchHistory.nemesis.losses}L
										</span>
										<span class="text-gray-500">vs</span>
										<span class="text-green-400">{data.matchHistory.nemesis.wins}W</span>
									</div>
								{:else}
									<div class="text-gray-500">No nemesis yet</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Best Matchup -->
					<div
						class="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-900/20 to-gray-900 p-4"
					>
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex items-center gap-2">
									<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
										<svg class="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
											<path
												d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
											/>
										</svg>
									</span>
									<span class="text-xs font-semibold tracking-wide text-green-400 uppercase"
										>Best Matchup</span
									>
								</div>
								{#if data.matchHistory.bestMatchup}
									<div class="truncate text-lg font-bold text-white">
										{#if data.matchHistory.bestMatchup.opponentGemId}
											<a
												href="/player/{data.matchHistory.bestMatchup.opponentGemId}"
												class="hover:text-green-400"
											>
												{data.matchHistory.bestMatchup.opponentName}
											</a>
										{:else}
											{data.matchHistory.bestMatchup.opponentName}
										{/if}
									</div>
									<div class="mt-1 flex items-center gap-2 text-sm">
										<span
											class="rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400"
										>
											{data.matchHistory.bestMatchup.wins}W
										</span>
										<span class="text-gray-500">vs</span>
										<span class="text-red-400">{data.matchHistory.bestMatchup.losses}L</span>
									</div>
								{:else}
									<div class="text-gray-500">No best matchup yet</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Top Opponents Lists -->
				<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<!-- Most Wins Against -->
					<div class="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
						<h4 class="mb-3 flex items-center gap-2 text-sm font-medium text-gray-400">
							<svg
								class="h-4 w-4 text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Most Wins Against
						</h4>
						<div class="space-y-2">
							{#each [...data.matchHistory.headToHead]
								.sort((a, b) => b.wins - a.wins)
								.slice(0, 3) as opponent, i}
								<div class="flex items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400"
									>
										{i + 1}
									</span>
									<div class="min-w-0 flex-1">
										{#if opponent.opponentGemId}
											<a
												href="/player/{opponent.opponentGemId}"
												class="block truncate text-sm font-medium text-white hover:text-green-400"
											>
												{opponent.opponentName}
											</a>
										{:else}
											<span class="block truncate text-sm font-medium text-white"
												>{opponent.opponentName}</span
											>
										{/if}
									</div>
									<span class="text-sm font-bold text-green-400">{opponent.wins}W</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Most Losses Against -->
					<div class="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
						<h4 class="mb-3 flex items-center gap-2 text-sm font-medium text-gray-400">
							<svg
								class="h-4 w-4 text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
							Most Losses Against
						</h4>
						<div class="space-y-2">
							{#each [...data.matchHistory.headToHead]
								.sort((a, b) => b.losses - a.losses)
								.slice(0, 3) as opponent, i}
								<div class="flex items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400"
									>
										{i + 1}
									</span>
									<div class="min-w-0 flex-1">
										{#if opponent.opponentGemId}
											<a
												href="/player/{opponent.opponentGemId}"
												class="block truncate text-sm font-medium text-white hover:text-red-400"
											>
												{opponent.opponentName}
											</a>
										{:else}
											<span class="block truncate text-sm font-medium text-white"
												>{opponent.opponentName}</span
											>
										{/if}
									</div>
									<span class="text-sm font-bold text-red-400">{opponent.losses}L</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Most Played -->
					<div
						class="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4 sm:col-span-2 lg:col-span-1"
					>
						<h4 class="mb-3 flex items-center gap-2 text-sm font-medium text-gray-400">
							<svg
								class="h-4 w-4 text-blue-400"
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
							Most Played
						</h4>
						<div class="space-y-2">
							{#each [...data.matchHistory.headToHead]
								.sort((a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws))
								.slice(0, 3) as opponent, i}
								{@const totalGames = opponent.wins + opponent.losses + opponent.draws}
								<div class="flex items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2">
									<span
										class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400"
									>
										{i + 1}
									</span>
									<div class="min-w-0 flex-1">
										{#if opponent.opponentGemId}
											<a
												href="/player/{opponent.opponentGemId}"
												class="block truncate text-sm font-medium text-white hover:text-blue-400"
											>
												{opponent.opponentName}
											</a>
										{:else}
											<span class="block truncate text-sm font-medium text-white"
												>{opponent.opponentName}</span
											>
										{/if}
									</div>
									<span class="text-xs text-gray-400">{totalGames} games</span>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Head-to-Head Lookup -->
				<div class="border-t border-gray-800 pt-4">
					<div class="mb-3 flex items-center justify-between">
						<h4 class="text-sm font-medium text-gray-400">Look Up Opponent</h4>
						<span class="text-xs text-gray-500"
							>{data.matchHistory.headToHead.length} opponents</span
						>
					</div>
					<!-- Combobox Search + Select -->
					<div class="relative">
						<div class="relative">
							<svg
								class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500"
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
							<input
								type="text"
								bind:value={opponentSearchQuery}
								onfocus={() => (showOpponentDropdown = true)}
								oninput={() => {
									showOpponentDropdown = true;
									if (
										selectedOpponent() &&
										opponentSearchQuery !== selectedOpponent().opponentName
									) {
										selectedOpponentKey = '';
									}
								}}
								placeholder="Search opponent..."
								class="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pr-8 pl-10 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
							{#if opponentSearchQuery}
								<button
									type="button"
									onclick={clearOpponentSelection}
									aria-label="Clear search"
									class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-300"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							{/if}
						</div>
						<!-- Dropdown -->
						{#if showOpponentDropdown && filteredHeadToHead().length > 0}
							<div
								class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl"
							>
								{#each filteredHeadToHead() as h2h}
									{@const isSelected =
										selectedOpponentKey === (h2h.opponentGemId || h2h.opponentName)}
									<button
										type="button"
										onclick={() => selectOpponent(h2h)}
										class="w-full px-3 py-2 text-left text-sm transition-colors {isSelected
											? 'bg-blue-600/20 text-blue-400'
											: 'text-white hover:bg-gray-700'}"
									>
										{h2h.opponentName}
									</button>
								{/each}
							</div>
						{/if}
						{#if showOpponentDropdown && opponentSearchQuery && filteredHeadToHead().length === 0}
							<div
								class="absolute z-20 mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-center text-sm text-gray-500 shadow-xl"
							>
								No opponents found
							</div>
						{/if}
					</div>
					<!-- Click outside to close dropdown -->
					{#if showOpponentDropdown}
						<button
							type="button"
							class="fixed inset-0 z-10 cursor-default"
							onclick={() => (showOpponentDropdown = false)}
							aria-label="Close dropdown"
						></button>
					{/if}

					<!-- Selected Opponent Breakdown -->
					{#if selectedOpponent()}
						{@const opponent = selectedOpponent()}
						{@const totalGames = opponent.wins + opponent.losses + opponent.draws}
						{@const winPct = totalGames > 0 ? Math.round((opponent.wins / totalGames) * 100) : 0}
						<div class="mt-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
							<div class="mb-3 flex items-center justify-between">
								<div>
									<p class="font-semibold text-white">
										vs
										{#if opponent.opponentGemId}
											<a href="/player/{opponent.opponentGemId}" class="hover:text-blue-400">
												{opponent.opponentName}
											</a>
										{:else}
											{opponent.opponentName}
										{/if}
									</p>
									<p class="mt-1 flex items-center gap-2 text-sm">
										<span
											class="rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400"
											>{opponent.wins}W</span
										>
										<span class="rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
											>{opponent.losses}L</span
										>
										{#if opponent.draws > 0}
											<span
												class="rounded bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-400"
												>{opponent.draws}D</span
											>
										{/if}
									</p>
								</div>
								<div
									class="flex items-center justify-center rounded-lg px-3 py-2 {winPct >= 50
										? 'bg-green-500/20'
										: 'bg-red-500/20'}"
								>
									<span class="text-lg font-bold {winPct >= 50 ? 'text-green-400' : 'text-red-400'}"
										>{winPct}%</span
									>
								</div>
							</div>

							{#if opponentMatches().length > 0}
								<div class="border-t border-gray-700 pt-3">
									<p class="mb-2 text-xs font-medium text-gray-500 uppercase">Match History</p>
									<div class="max-h-48 space-y-1.5 overflow-y-auto">
										{#each opponentMatches() as { match, event }}
											{@const isPlayer1 = match.player1GemId === data.gemId}
											{@const opponentGemId = isPlayer1 ? match.player2GemId : match.player1GemId}
											{@const opponentHero = getOpponentHero(
												opponentGemId,
												event.year,
												event.circuit,
												event.month
											)}
											{@const playerHero = getHeroForEvent(event.year, event.circuit, event.month)}
											{@const won =
												(isPlayer1 && match.winner === 'player1') ||
												(!isPlayer1 && match.winner === 'player2')}
											{@const lost =
												(isPlayer1 && match.winner === 'player2') ||
												(!isPlayer1 && match.winner === 'player1')}
											<div class="rounded-lg bg-gray-900/50 px-3 py-2 text-sm">
												<div class="flex items-center gap-3">
													<span
														class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-bold {won
															? 'bg-green-500/20 text-green-400'
															: lost
																? 'bg-red-500/20 text-red-400'
																: 'bg-gray-500/20 text-gray-400'}"
													>
														{won ? 'W' : lost ? 'L' : 'D'}
													</span>
													<div class="min-w-0 flex-1">
														<p class="truncate text-gray-300">{event.circuit} {event.month} Open</p>
														<p class="text-xs text-gray-500">
															{event.year} · Round {match.round}
															{#if match.table}· Table {match.table}{/if}
														</p>
													</div>
												</div>
												<!-- Hero matchup display -->
												{#if playerHero || opponentHero}
													<div
														class="mt-2 flex items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/50 px-2 py-1.5"
													>
														<!-- Player's hero -->
														<div class="flex min-w-0 flex-1 items-center gap-2">
															{#if playerHero}
																<div
																	class="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full border border-amber-500/50 bg-gray-700"
																	title={playerHero.hero}
																>
																	<img
																		src={playerHero.imageUrl}
																		alt={playerHero.hero}
																		class="h-full w-full object-cover object-right"
																		onerror={(e) => (e.target.style.display = 'none')}
																	/>
																</div>
															{/if}
															<div class="min-w-0">
																<p class="truncate text-xs font-medium text-amber-400">
																	{data.displayName?.split(' ')[0] || 'You'}
																</p>
																{#if playerHero}
																	<p class="truncate text-xs text-gray-400">{playerHero.hero}</p>
																{:else}
																	<p class="text-xs text-gray-600">Unknown hero</p>
																{/if}
															</div>
														</div>
														<span class="flex-shrink-0 text-xs font-medium text-gray-500">vs</span>
														<!-- Opponent's hero -->
														<div
															class="flex min-w-0 flex-1 items-center justify-end gap-2 text-right"
														>
															<div class="min-w-0">
																<p class="truncate text-xs font-medium text-purple-400">
																	{selectedOpponent()?.opponentName.split(' ')[0] || 'Opponent'}
																</p>
																{#if opponentHero}
																	<p class="truncate text-xs text-gray-400">{opponentHero.hero}</p>
																{:else}
																	<p class="text-xs text-gray-600">Unknown hero</p>
																{/if}
															</div>
															{#if opponentHero}
																<div
																	class="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full border border-purple-500/50 bg-gray-700"
																	title={opponentHero.hero}
																>
																	<img
																		src={opponentHero.imageUrl}
																		alt={opponentHero.hero}
																		class="h-full w-full object-cover object-right"
																		onerror={(e) => (e.target.style.display = 'none')}
																	/>
																</div>
															{/if}
														</div>
													</div>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<div class="py-8 text-center">
					<svg
						class="mx-auto mb-3 h-12 w-12 text-gray-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					<p class="text-gray-500">No head-to-head data available yet</p>
					<p class="mt-1 text-xs text-gray-600">Match data will appear once imported</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Decklists Section -->
	{#if data.decklists && data.decklists.length > 0}
		<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="flex items-center gap-3 text-2xl font-bold text-white">
					<svg
						class="h-6 w-6 text-purple-400"
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
					Tournament Decklists
				</h2>
				{#if data.decklists.length > 3}
					<a
						href="/age-open?tab=decklists"
						class="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
					>
						View all
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</a>
				{/if}
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.decklists.slice(0, 3) as { decklist, event: eventData }}
					<DecklistCard
						{decklist}
						eventId={eventData?.id}
						eventName={eventData?.circuit
							? `${eventData.circuit} ${eventData.month || ''} Open`
							: 'AGE Open'}
						eventCircuit={eventData?.circuit}
						showPlayerName={false}
						showCardCount={true}
					/>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Hero History Section -->
	{#if data.heroHistory && data.heroHistory.length > 0}
		{@const totalEvents = data.heroHistory.length}
		{@const primaryHero = data.heroUsage?.[0]}
		{@const primaryHeroPercentage = primaryHero
			? Math.round((primaryHero.count / totalEvents) * 100)
			: 0}
		{@const isOneHeroPlayer = data.heroUsage?.length === 1}
		{@const hasDominantHero = primaryHeroPercentage >= 60}

		<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<div class="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50">
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-gray-800 px-6 py-4">
					<h2 class="flex items-center gap-3 text-xl font-bold text-white">
						<svg
							class="h-5 w-5 text-amber-400"
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
						Hero History
					</h2>
					<span class="text-sm text-gray-400"
						>{totalEvents} {totalEvents === 1 ? 'event' : 'events'}</span
					>
				</div>

				<div class="overflow-hidden p-6">
					{#if isOneHeroPlayer}
						<!-- Single Hero Player - Compact display with hero image -->
						<div class="flex min-w-0 items-center gap-5 overflow-hidden">
							<div
								class="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800 shadow-lg ring-2 ring-amber-500/30"
							>
								{#if primaryHero.imageUrl}
									<img
										src={primaryHero.imageUrl}
										alt={primaryHero.hero}
										class="h-full w-full object-cover object-right"
									/>
								{:else}
									<div
										class="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20"
									>
										<span class="px-1 text-center text-xs font-medium text-amber-400"
											>{primaryHero.hero}</span
										>
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<p class="mb-1 text-xs tracking-wider text-amber-400/80 uppercase">
									Dedicated Main
								</p>
								<p class="truncate text-2xl font-bold text-white">{primaryHero.hero}</p>
								<p class="mt-1 text-sm text-gray-400">
									{totalEvents} consecutive {totalEvents === 1 ? 'event' : 'events'}
								</p>
							</div>
						</div>
					{:else if hasDominantHero}
						<!-- Dominant Hero with Others -->
						<div class="grid gap-6 overflow-hidden lg:grid-cols-3">
							<!-- Primary Hero with Image -->
							<div class="min-w-0 lg:col-span-1">
								<div
									class="overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-4"
								>
									<div class="flex min-w-0 gap-4">
										<div
											class="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800 shadow-md"
										>
											{#if primaryHero.imageUrl}
												<img
													src={primaryHero.imageUrl}
													alt={primaryHero.hero}
													class="h-full w-full object-cover object-right"
												/>
											{:else}
												<div class="flex h-full w-full items-center justify-center bg-gray-700">
													<span class="px-1 text-center text-xs text-gray-400"
														>{primaryHero.hero}</span
													>
												</div>
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<p class="mb-1 text-xs tracking-wider text-amber-400/80 uppercase">
												Main Hero
											</p>
											<p class="truncate text-lg font-bold text-white">{primaryHero.hero}</p>
											<div class="mt-1 flex items-baseline gap-2">
												<span class="text-2xl font-bold text-amber-400"
													>{primaryHeroPercentage}%</span
												>
												<span class="text-xs text-gray-400">({primaryHero.count})</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Other Heroes with small images -->
							<div class="min-w-0 overflow-hidden lg:col-span-2">
								<p class="mb-3 text-xs tracking-wider text-gray-500 uppercase">Also Played</p>
								<div class="space-y-2">
									{#each data.heroUsage.slice(1) as usage}
										{@const percentage = Math.round((usage.count / totalEvents) * 100)}
										<div class="flex min-w-0 items-center gap-3 overflow-hidden">
											<div class="h-8 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-800">
												{#if usage.imageUrl}
													<img
														src={usage.imageUrl}
														alt={usage.hero}
														class="h-full w-full object-cover object-right"
													/>
												{:else}
													<div
														class="flex h-full w-full items-center justify-center bg-gray-700 text-[8px] text-gray-500"
													>
														?
													</div>
												{/if}
											</div>
											<div class="min-w-0 flex-1">
												<div class="mb-1 flex min-w-0 items-center justify-between gap-2">
													<span class="min-w-0 truncate text-sm font-medium text-gray-300"
														>{usage.hero}</span
													>
													<span class="flex-shrink-0 text-xs text-gray-500"
														>{usage.count} ({percentage}%)</span
													>
												</div>
												<div class="h-1.5 overflow-hidden rounded-full bg-gray-800">
													<div
														class="h-full rounded-full bg-gray-600"
														style="width: {percentage}%"
													></div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<!-- Diverse Hero Pool with images -->
						<div class="overflow-hidden">
							<p class="mb-4 text-xs tracking-wider text-gray-500 uppercase">Hero Distribution</p>
							<div class="grid gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
								{#each data.heroUsage as usage, idx}
									{@const percentage = Math.round((usage.count / totalEvents) * 100)}
									{@const isTop = idx === 0}
									<div
										class="flex min-w-0 items-center gap-3 overflow-hidden rounded-lg p-3 {isTop
											? 'border border-amber-500/20 bg-amber-500/10'
											: 'bg-gray-800/50'}"
									>
										<div
											class="h-10 w-14 flex-shrink-0 overflow-hidden rounded bg-gray-800 {isTop
												? 'ring-2 ring-amber-500/40'
												: ''}"
										>
											{#if usage.imageUrl}
												<img
													src={usage.imageUrl}
													alt={usage.hero}
													class="h-full w-full object-cover object-right"
												/>
											{:else}
												<div class="flex h-full w-full items-center justify-center bg-gray-700">
													<span class="text-center text-[10px] text-gray-500">{idx + 1}</span>
												</div>
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<div class="flex min-w-0 items-center justify-between gap-2">
												<span
													class="min-w-0 truncate font-medium {isTop
														? 'text-white'
														: 'text-gray-300'} text-sm">{usage.hero}</span
												>
												<span
													class="flex-shrink-0 text-sm {isTop ? 'text-amber-400' : 'text-gray-500'}"
													>{usage.count}×</span
												>
											</div>
											<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-700">
												<div
													class="h-full rounded-full {isTop
														? 'bg-gradient-to-r from-amber-500 to-orange-500'
														: 'bg-gray-500'}"
													style="width: {percentage}%"
												></div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Expandable Event History (only show if multiple events) -->
					{#if totalEvents > 1}
						<details class="group mt-6">
							<summary
								class="flex cursor-pointer items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-300"
							>
								<svg
									class="h-4 w-4 transition-transform group-open:rotate-90"
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
								View event-by-event breakdown
							</summary>
							<div class="mt-4 overflow-hidden rounded-lg border border-gray-800">
								<!-- Mobile: Card layout -->
								<div class="divide-y divide-gray-800 sm:hidden">
									{#each sortedHeroHistory() as entry}
										<div class="flex items-center justify-between gap-3 px-4 py-3">
											<div class="min-w-0 flex-1">
												<p class="text-sm font-medium text-gray-300">{entry.circuit}</p>
												<p class="text-xs text-gray-500">{entry.month} {entry.season}</p>
											</div>
											<span
												class="flex-shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400"
											>
												{entry.hero.split(',')[0]}
											</span>
										</div>
									{/each}
								</div>
								<!-- Desktop: Table layout -->
								<table class="hidden w-full text-sm sm:table">
									<thead>
										<tr class="bg-gray-800/50">
											<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
												>Event</th
											>
											<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
												>Hero</th
											>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each sortedHeroHistory() as entry}
											<tr class="hover:bg-gray-800/30">
												<td class="px-4 py-2 text-gray-400">
													{entry.circuit}
													{entry.month}
													{entry.season}
												</td>
												<td class="px-4 py-2">
													<span class="text-gray-200">{entry.hero}</span>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</details>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Season Standings -->
	<div class="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
		<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-xl font-bold text-white sm:text-2xl">Season Standings</h2>
			</div>
			{#if editMode}
				<button
					onclick={() => (showAddStanding = true)}
					class="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/30"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add Standing
				</button>
			{/if}
		</div>

		{#if Object.keys(standingsBySeason).length === 0}
			<div class="rounded-2xl border border-gray-800 bg-gray-900/50 py-16 text-center">
				<svg
					class="mx-auto mb-4 h-16 w-16 text-gray-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
				<p class="text-lg text-gray-500">No standings data yet</p>
				{#if editMode}
					<button
						onclick={() => (showAddStanding = true)}
						class="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/30"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add First Standing
					</button>
				{/if}
			</div>
		{:else}
			<div class="space-y-4">
				{#each Object.entries(standingsBySeason).sort( (a, b) => b[0].localeCompare(a[0]) ) as [season, seasonStandings]}
					<!-- Season Label -->
					<div class="flex items-center gap-3 pt-2 first:pt-0">
						<h3 class="text-sm font-medium text-gray-500">{season}</h3>
						<div class="h-px flex-1 bg-gray-800"></div>
					</div>

					<!-- Circuit Cards -->
					<div class="space-y-3">
						{#each seasonStandings as standing}
							{@const stats = calculateDerivedStats(standing)}
							{@const isExpanded = expandedSeasonId === standing.id}
							<button
								onclick={() => (expandedSeasonId = isExpanded ? null : standing.id)}
								class="group w-full overflow-hidden rounded-xl border text-left transition-all duration-200
									{isExpanded
									? 'border-blue-500/40 bg-gray-900/80 ring-1 ring-blue-500/20'
									: 'border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/60'}"
							>
								<!-- Card Content -->
								<div class="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
									<!-- Points - Hero stat -->
									<div
										class="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 sm:h-16 sm:w-16"
									>
										<span class="text-lg font-bold text-emerald-400 tabular-nums sm:text-2xl"
											>{standing.totalPoints || 0}</span
										>
										<span class="text-[9px] font-medium text-emerald-500/70 sm:text-[10px]"
											>PTS</span
										>
									</div>

									<!-- Info -->
									<div class="min-w-0 flex-1">
										<!-- Circuit + Rank -->
										<div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
											<h4 class="truncate text-sm font-semibold text-white sm:text-base">
												{standing.circuit}
											</h4>
											{#if standing.calculatedRank && standing.calculatedRank <= 16}
												<span
													class="inline-flex items-center gap-0.5 rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 sm:text-xs"
												>
													<svg
														class="h-2 w-2 sm:h-2.5 sm:w-2.5"
														fill="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
														/>
													</svg>
													{standing.calculatedRank}
												</span>
											{:else if standing.calculatedRank}
												<span class="text-[10px] text-gray-500 sm:text-xs"
													>#{standing.calculatedRank}</span
												>
											{/if}
										</div>

										<!-- Stats row -->
										<div
											class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:mt-1.5 sm:gap-x-4 sm:text-sm"
										>
											<span class="tabular-nums">
												<span class="font-medium text-green-400">{standing.matchesWon || 0}</span
												><span class="text-gray-600">-</span><span class="font-medium text-red-400"
													>{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span
												>
											</span>
											<span class="hidden text-gray-600 sm:inline">·</span>
											<span class="text-gray-400"
												>{stats.eventsPlayed} event{stats.eventsPlayed !== 1 ? 's' : ''}</span
											>
										</div>
									</div>

									<!-- Expand indicator -->
									<div class="flex-shrink-0">
										<svg
											class="h-4 w-4 text-gray-500 transition-transform duration-200 group-hover:text-gray-400 sm:h-5 sm:w-5 {isExpanded
												? 'rotate-180'
												: ''}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</div>
								</div>
							</button>

							<!-- Expanded Details -->
							{#if isExpanded}
								<div
									class="mt-2 mb-1 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60"
								>
									<div class="p-4">
										<!-- Player Info Editing (Admin Only) -->
										{#if editMode}
											<div class="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
												<h4
													class="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-400"
												>
													<svg
														class="h-4 w-4"
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
													Player Info
												</h4>
												<div class="grid gap-4 sm:grid-cols-2">
													<form
														method="POST"
														action="?/updateStanding"
														use:enhance={() => {
															return async ({ result, update }) => {
																if (result.type === 'success') {
																	await update();
																	await invalidateAll();
																}
															};
														}}
														class="space-y-1"
													>
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="playerName" />
														<label class="block text-xs text-gray-400">
															Player Name
															<input
																type="text"
																name="value"
																value={standing.playerName || ''}
																onchange={(e) => e.target.form.requestSubmit()}
																class="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-base text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none sm:text-sm"
																placeholder="Enter player name"
															/>
														</label>
													</form>
													<form
														method="POST"
														action="?/updateStanding"
														use:enhance={() => {
															return async ({ result, update }) => {
																if (result.type === 'success') {
																	await update();
																	await invalidateAll();
																}
															};
														}}
														class="space-y-1"
													>
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="gemId" />
														<label class="block text-xs text-gray-400">
															GEM ID
															<input
																type="text"
																name="value"
																value={standing.gemId || ''}
																onchange={(e) => e.target.form.requestSubmit()}
																class="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 font-mono text-base text-blue-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none sm:text-sm"
																placeholder="e.g., GEM00000001"
															/>
														</label>
													</form>
												</div>
												<p class="mt-3 text-xs text-amber-400/70">
													<svg
														class="mr-1 inline h-3 w-3"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
														/>
													</svg>
													Changing GEM ID will affect how this standing is linked to the player profile.
												</p>
											</div>
										{/if}
										<!-- Main Stats Grid -->
										{#if editMode}
											<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
												<form
													method="POST"
													action="?/updateStanding"
													use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}}
													class="space-y-1"
												>
													<input type="hidden" name="standingId" value={standing.id} />
													<input type="hidden" name="field" value="totalPoints" />
													<label class="block text-xs text-gray-500">
														Total Points
														<input
															type="number"
															name="value"
															value={standing.totalPoints || 0}
															onchange={(e) => e.target.form.requestSubmit()}
															class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-center font-bold text-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
														/>
													</label>
												</form>
												<form
													method="POST"
													action="?/updateStanding"
													use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}}
													class="space-y-1"
												>
													<input type="hidden" name="standingId" value={standing.id} />
													<input type="hidden" name="field" value="winPercentage" />
													<label class="block text-xs text-gray-500">
														Win %
														<input
															type="number"
															step="0.01"
															name="value"
															value={standing.winPercentage || ''}
															placeholder="-"
															onchange={(e) => e.target.form.requestSubmit()}
															class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-center text-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
														/>
													</label>
												</form>
												<form
													method="POST"
													action="?/updateStanding"
													use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}}
													class="space-y-1"
												>
													<input type="hidden" name="standingId" value={standing.id} />
													<input type="hidden" name="field" value="matchesWon" />
													<label class="block text-xs text-gray-500">
														Matches Won
														<input
															type="number"
															name="value"
															value={standing.matchesWon || 0}
															onchange={(e) => e.target.form.requestSubmit()}
															class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-center text-green-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
														/>
													</label>
												</form>
												<form
													method="POST"
													action="?/updateStanding"
													use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}}
													class="space-y-1"
												>
													<input type="hidden" name="standingId" value={standing.id} />
													<input type="hidden" name="field" value="matchesPlayed" />
													<label class="block text-xs text-gray-500">
														Matches Played
														<input
															type="number"
															name="value"
															value={standing.matchesPlayed || 0}
															onchange={(e) => e.target.form.requestSubmit()}
															class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-center text-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
														/>
													</label>
												</form>
											</div>
										{/if}

										<!-- Monthly Breakdown -->
										<div>
											<div class="mb-3 flex items-center justify-between">
												<h4 class="text-xs font-medium tracking-wide text-gray-500 uppercase">
													Monthly Results
												</h4>
												<span class="text-[10px] text-gray-600 italic">Tap month for details</span>
											</div>
											<div class="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
												{#each months as month}
													{@const points = standing[`${month.key}Points`] || 0}
													{@const wins = standing[`${month.key}MatchesWon`] || 0}
													{@const matches = standing[`${month.key}Matches`] || 0}
													{@const hasData = points > 0 || wins > 0 || matches > 0}
													{@const eventMatches = getMatchesForEvent(
														standing.season,
														standing.circuit,
														month.key
													)}
													{@const hasMatches = eventMatches.length > 0}
													{@const isExpanded = expandedMonthKey === `${standing.id}|${month.key}`}
													{@const monthHero = getHeroForEvent(
														standing.season,
														standing.circuit,
														month.key
													)}
													{#if editMode}
														<div
															class="rounded-lg border p-2 text-center {hasData
																? 'border-gray-700 bg-gray-800/50'
																: 'border-gray-800/50 bg-gray-900/30'}"
														>
															<div
																class="text-xs font-medium {hasData
																	? 'text-blue-400'
																	: 'text-gray-600'} mb-1"
															>
																{month.label}
															</div>
															<!-- Points input -->
															<form
																method="POST"
																action="?/updateStanding"
																use:enhance={() => {
																	return async ({ result, update }) => {
																		if (result.type === 'success') {
																			await update();
																			await invalidateAll();
																		}
																	};
																}}
															>
																<input type="hidden" name="standingId" value={standing.id} />
																<input type="hidden" name="field" value="{month.key}Points" />
																<input
																	type="text"
																	inputmode="numeric"
																	pattern="[0-9]*"
																	name="value"
																	value={points}
																	onchange={(e) => e.target.form.requestSubmit()}
																	class="mb-1 w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-center text-sm font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
																	title="Points"
																/>
															</form>
															<!-- Matches Won / Matches Played inputs -->
															<div class="flex items-center justify-center gap-1">
																<form
																	method="POST"
																	action="?/updateStanding"
																	use:enhance={() => {
																		return async ({ result, update }) => {
																			if (result.type === 'success') {
																				await update();
																				await invalidateAll();
																			}
																		};
																	}}
																	class="flex-1"
																>
																	<input type="hidden" name="standingId" value={standing.id} />
																	<input type="hidden" name="field" value="{month.key}MatchesWon" />
																	<input
																		type="text"
																		inputmode="numeric"
																		pattern="[0-9]*"
																		name="value"
																		value={wins}
																		onchange={(e) => e.target.form.requestSubmit()}
																		class="w-full rounded border border-gray-700 bg-gray-900 px-1 py-1 text-center text-sm text-green-400 focus:border-green-500 focus:outline-none"
																		title="Matches Won"
																	/>
																</form>
																<span class="text-sm font-medium text-gray-500">/</span>
																<form
																	method="POST"
																	action="?/updateStanding"
																	use:enhance={() => {
																		return async ({ result, update }) => {
																			if (result.type === 'success') {
																				await update();
																				await invalidateAll();
																			}
																		};
																	}}
																	class="flex-1"
																>
																	<input type="hidden" name="standingId" value={standing.id} />
																	<input type="hidden" name="field" value="{month.key}Matches" />
																	<input
																		type="text"
																		inputmode="numeric"
																		pattern="[0-9]*"
																		name="value"
																		value={matches}
																		onchange={(e) => e.target.form.requestSubmit()}
																		class="w-full rounded border border-gray-700 bg-gray-900 px-1 py-1 text-center text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
																		title="Matches Played"
																	/>
																</form>
															</div>
														</div>
													{:else}
														<button
															type="button"
															onclick={() =>
																hasMatches && toggleMonthExpand(standing.id, month.key)}
															disabled={!hasMatches}
															class="group relative rounded-xl border p-2 text-center transition-all {isExpanded
																? 'border-blue-500 bg-blue-900/30 ring-1 ring-blue-500/20'
																: hasData
																	? 'border-gray-700 bg-gray-800/50'
																	: 'border-gray-800/30 bg-gray-900/20'} {hasMatches
																? 'cursor-pointer hover:border-blue-500/50 hover:bg-gray-800/70 active:scale-95'
																: 'cursor-default'}"
														>
															<!-- Hero image (if available) -->
															{#if monthHero && hasData}
																<div
																	class="mx-auto mb-1 h-6 w-6 overflow-hidden rounded-full border border-gray-600 bg-gray-700"
																>
																	<img
																		src={monthHero.imageUrl}
																		alt={monthHero.hero}
																		class="h-full w-full object-cover object-right"
																		onerror={(e) => (e.target.style.display = 'none')}
																	/>
																</div>
															{/if}
															<!-- Month label -->
															<div
																class="mb-0.5 text-[10px] font-medium {isExpanded
																	? 'text-blue-300'
																	: hasData
																		? 'text-blue-400'
																		: 'text-gray-600'}"
															>
																{month.label}
															</div>
															<!-- Points - main value -->
															<div
																class="text-sm font-bold tabular-nums {hasData
																	? 'text-emerald-400'
																	: 'text-gray-700'}"
															>
																{points}
															</div>
															<!-- Hero name or Record -->
															<div
																class="mt-0.5 text-[10px] {hasData
																	? monthHero
																		? 'font-bold text-amber-400'
																		: 'text-gray-400'
																	: 'text-gray-700'} max-w-full truncate"
																title={monthHero?.hero || `${wins}/${matches}`}
															>
																{#if monthHero}
																	{monthHero.hero.split(',')[0]}
																{:else}
																	{wins}/{matches}
																{/if}
															</div>
															<!-- Tap indicator for months with matches -->
															{#if hasMatches && !isExpanded}
																<div
																	class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white shadow"
																>
																	{eventMatches.length}
																</div>
															{/if}
														</button>
													{/if}
												{/each}
											</div>

											<!-- Expanded Matches Section -->
											{#each months as month}
												{@const eventMatches = getMatchesForEvent(
													standing.season,
													standing.circuit,
													month.key
												)}
												{@const isExpanded = expandedMonthKey === `${standing.id}|${month.key}`}
												{@const expandedMonthHero = getHeroForEvent(
													standing.season,
													standing.circuit,
													month.key
												)}
												{#if isExpanded && eventMatches.length > 0}
													<div
														class="mt-3 overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-900/20 to-gray-900/50 sm:mt-4"
													>
														<!-- Header -->
														<div
															class="flex flex-col gap-1 border-b border-blue-500/20 bg-blue-900/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5"
														>
															<h5 class="text-xs font-semibold text-blue-300 sm:text-sm">
																{month.label}
																{standing.season}
															</h5>
															{#if expandedMonthHero}
																<span
																	class="w-fit rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 sm:text-xs"
																>
																	{expandedMonthHero.hero}
																</span>
															{:else}
																<span
																	class="w-fit rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400 sm:text-xs"
																>
																	{eventMatches.length} match{eventMatches.length !== 1 ? 'es' : ''}
																</span>
															{/if}
														</div>
														<!-- Match list -->
														<div class="divide-y divide-gray-800/50">
															{#each eventMatches.sort((a, b) => a.match.round - b.match.round) as { match, event }}
																{@const isPlayer1 = match.player1GemId === data.gemId}
																{@const opponent = isPlayer1
																	? match.player2Name
																	: match.player1Name}
																{@const opponentGemId = isPlayer1
																	? match.player2GemId
																	: match.player1GemId}
																{@const opponentHero = getOpponentHero(
																	opponentGemId,
																	event.year,
																	event.circuit,
																	event.month
																)}
																{@const won =
																	(isPlayer1 && match.winner === 'player1') ||
																	(!isPlayer1 && match.winner === 'player2')}
																{@const lost =
																	(isPlayer1 && match.winner === 'player2') ||
																	(!isPlayer1 && match.winner === 'player1')}
																<div
																	class="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
																>
																	<!-- Round number -->
																	<span
																		class="w-6 flex-shrink-0 text-[10px] font-medium text-gray-500 sm:w-8 sm:text-xs"
																		>R{match.round}</span
																	>
																	<!-- Result badge -->
																	<span
																		class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold sm:h-7 sm:w-7 sm:text-xs {won
																			? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
																			: lost
																				? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
																				: 'bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/30'}"
																	>
																		{won ? 'W' : lost ? 'L' : 'D'}
																	</span>
																	<!-- Opponent with hero -->
																	<div class="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
																		<span class="text-[10px] text-gray-500 sm:text-xs">vs</span>
																		{#if opponentHero}
																			<div
																				class="hidden h-5 w-5 flex-shrink-0 overflow-hidden rounded-full border border-purple-500/50 bg-gray-700 sm:block sm:h-6 sm:w-6"
																				title={opponentHero.hero}
																			>
																				<img
																					src={opponentHero.imageUrl}
																					alt={opponentHero.hero}
																					class="h-full w-full object-cover object-right"
																					onerror={(e) => (e.target.style.display = 'none')}
																				/>
																			</div>
																		{/if}
																		<div class="min-w-0 flex-1">
																			{#if opponentGemId}
																				<a
																					href="/player/{opponentGemId}"
																					class="block truncate text-xs font-medium text-white hover:text-blue-400 sm:text-sm"
																				>
																					{opponent}
																				</a>
																			{:else}
																				<span
																					class="block truncate text-xs font-medium text-white sm:text-sm"
																					>{opponent}</span
																				>
																			{/if}
																			{#if opponentHero}
																				<span
																					class="block truncate text-[10px] text-yellow-400 sm:inline sm:text-xs"
																				>
																					{opponentHero.hero}
																				</span>
																			{/if}
																		</div>
																	</div>
																	<!-- Table (if available) -->
																	{#if match.table}
																		<span class="hidden text-xs text-gray-600 sm:block"
																			>T{match.table}</span
																		>
																	{/if}
																</div>
															{/each}
														</div>
													</div>
												{/if}
											{/each}
										</div>

										<!-- Delete Button -->
										{#if editMode}
											<div class="mt-4 border-t border-gray-700/50 pt-4">
												<button
													type="button"
													onclick={() => {
														if (confirm('Delete this standing record?')) {
															const form = document.createElement('form');
															form.method = 'POST';
															form.action = '?/deleteStanding';
															const input = document.createElement('input');
															input.type = 'hidden';
															input.name = 'standingId';
															input.value = standing.id;
															form.appendChild(input);
															document.body.appendChild(form);
															form.submit();
														}
													}}
													class="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
												>
													<svg
														class="h-3.5 w-3.5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														/>
													</svg>
													Delete
												</button>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Add Standing Modal -->
	{#if showAddStanding}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		>
			<div class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
				<div class="border-b border-gray-700 px-6 py-4">
					<h3 class="text-lg font-semibold text-white">Add New Standing</h3>
				</div>
				<form
					method="POST"
					action="?/addStanding"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								showAddStanding = false;
								await update();
								await invalidateAll();
							}
						};
					}}
					class="space-y-4 p-6"
				>
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-gray-400">Season</span>
						<input
							type="text"
							name="season"
							placeholder="e.g., 2025"
							required
							class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
						/>
					</label>
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-gray-400">Circuit</span>
						<select
							name="circuit"
							required
							class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
						>
							<option value="">Select a circuit</option>
							<option value="Los Angeles">Los Angeles</option>
							<option value="New England">New England</option>
							<option value="St. Louis">St. Louis</option>
						</select>
					</label>
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-gray-400">Player Name</span>
						<input
							type="text"
							name="playerName"
							value={data.displayName}
							required
							class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
						/>
					</label>
					<div class="flex gap-3 pt-4">
						<button
							type="button"
							onclick={() => (showAddStanding = false)}
							class="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-medium text-gray-300 transition-all hover:bg-gray-700"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-all hover:bg-blue-500"
						>
							Add Standing
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
