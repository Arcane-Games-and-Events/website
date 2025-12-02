<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	let editMode = $state(false);
	let showAddStanding = $state(false);
	let expandedSeasonId = $state(null);
	let linkCopied = $state(false);

	// Copy link to clipboard
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			linkCopied = true;
			setTimeout(() => linkCopied = false, 2000);
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
	const seasonsPlayed = $derived([...new Set(data.standings.map(s => s.season))].sort().reverse());

	// Check if player qualified for championship (top 16 in any circuit for a season)
	const qualifiedSeasons = $derived(
		data.standings
			.filter(s => s.calculatedRank && s.calculatedRank <= 16)
			.map(s => s.season)
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
		const ranks = data.standings.filter(s => s.calculatedRank).map(s => s.calculatedRank);
		return ranks.length > 0 ? Math.min(...ranks) : null;
	});

	// Average Rank
	const avgRank = $derived(() => {
		const ranks = data.standings.filter(s => s.calculatedRank).map(s => s.calculatedRank);
		if (ranks.length === 0) return null;
		return (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1);
	});

	// Circuits played
	const circuitsPlayed = $derived([...new Set(data.standings.map(s => s.circuit))]);

	// Historical performance data (chronological timeline across all seasons)
	const historicalPerformance = $derived(() => {
		const timeline = [];

		// Get unique seasons sorted chronologically
		const seasons = [...new Set(data.standings.map(s => s.season))].sort();

		// For each season, add monthly data points
		seasons.forEach(season => {
			const seasonStandings = data.standings.filter(s => s.season === season);

			months.forEach((m, monthIndex) => {
				let totalPoints = 0;
				let totalWins = 0;
				let totalMatches = 0;

				seasonStandings.forEach(s => {
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

		data.standings.forEach(s => {
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
			seasonData.points += s.totalPoints || 0;
			seasonData.wins += s.matchesWon || 0;
			seasonData.matches += s.matchesPlayed || 0;
			seasonData.events += s.eventsPlayed || 0;
			seasonData.circuits.add(s.circuit);
		});

		return Array.from(seasonMap.values())
			.map(s => ({
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
		return Math.max(...perf.map(s => s.points), 1);
	});

	// Max points in any month (for chart scaling)
	const maxMonthlyPoints = $derived(() => {
		const perf = historicalPerformance();
		if (perf.length === 0) return 1;
		return Math.max(...perf.map(m => m.points), 1);
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
		const best = perf.reduce((best, current) =>
			current.points > best.points ? current : best
		, perf[0]);
		return best.points > 0 ? best : null;
	});

	// === AGE RATING CALCULATION (HARSH PERCENTILE-BASED) ===
	// A cumulative player rating out of 100 using power curves for harsher differentiation
	// Top ratings are extremely difficult to achieve - requires excellence across all metrics
	const ageRating = $derived(() => {
		const p = data.percentiles;
		const stats = data.totalStats;

		// Power curve function - makes high ratings exponentially harder
		// At 50th percentile, you only get ~35% of max points
		// At 90th percentile, you get ~85% of max points
		const harshCurve = (percentile) => Math.pow(percentile / 100, 1.4) * 100;

		// Minimum events penalty - need at least 3 events for full credit
		const minEvents = 3;
		const eventMultiplier = Math.min(1, stats.eventsPlayed / minEvents);

		// Apply harsh curve to all percentiles
		const adjustedWinRate = harshCurve(p.winRate);
		const adjustedTop8 = harshCurve(p.top8Rate);
		const adjustedExperience = harshCurve(p.experience);
		const adjustedPeak = harshCurve(p.bestRank);
		const adjustedEfficiency = harshCurve(p.efficiency);
		const adjustedChampionship = harshCurve(p.championship);

		// Rebalanced weights (total 100):
		// - Win Rate: 25 pts (fundamental but not everything)
		// - Top 8 Rate: 25 pts (consistency in making playoffs is key)
		// - Peak Performance: 20 pts (best finish matters)
		// - Efficiency: 15 pts (points per event - rewarding quality)
		// - Experience: 10 pts (sample size, capped)
		// - Championship: 5 pts (elite bonus for Top 16 qualifiers)
		const winRateScore = (adjustedWinRate / 100) * 25;
		const top8Score = (adjustedTop8 / 100) * 25;
		const peakScore = (adjustedPeak / 100) * 20;
		const efficiencyScore = (adjustedEfficiency / 100) * 15;
		const experienceScore = (adjustedExperience / 100) * 10;
		const championshipScore = (adjustedChampionship / 100) * 5;

		// Calculate raw total
		let total = winRateScore + top8Score + peakScore + efficiencyScore + experienceScore + championshipScore;

		// Apply minimum events penalty (reduces score if < 3 events)
		total = total * (0.6 + 0.4 * eventMultiplier);

		return {
			total: Math.round(Math.min(100, Math.max(0, total))),
			breakdown: {
				winRate: Math.round(winRateScore * 10) / 10,
				top8: Math.round(top8Score * 10) / 10,
				peak: Math.round(peakScore * 10) / 10,
				efficiency: Math.round(efficiencyScore * 10) / 10,
				experience: Math.round(experienceScore * 10) / 10,
				championship: Math.round(championshipScore * 10) / 10
			},
			percentiles: {
				winRate: Math.round(p.winRate),
				top8Rate: Math.round(p.top8Rate),
				experience: Math.round(p.experience),
				bestRank: Math.round(p.bestRank),
				efficiency: Math.round(p.efficiency),
				championship: Math.round(p.championship)
			},
			totalPlayers: p.totalPlayers,
			eventPenalty: eventMultiplier < 1
		};
	});

	// Get rating tier/label based on score - Competition Style tiers
	// With harsh curve, these thresholds are much harder to reach
	const ratingTier = $derived(() => {
		const rating = ageRating().total;
		const isProvisional = ageRating().eventPenalty;

		// Provisional - players with fewer than 3 events
		if (isProvisional) return { label: 'Provisional', color: 'text-slate-400', bg: 'from-slate-600/30 to-slate-700/30', border: 'border-slate-500/40', description: 'Need 3+ events' };
		// Elite (90+) - Top 1%
		if (rating >= 90) return { label: 'Elite', color: 'text-yellow-300', bg: 'from-yellow-500/40 to-amber-600/40', border: 'border-yellow-400/60', description: 'Top 1%' };
		// Premier (80-89) - Top 5%
		if (rating >= 80) return { label: 'Premier', color: 'text-purple-300', bg: 'from-purple-500/35 to-fuchsia-500/35', border: 'border-purple-400/50', description: 'Top 5%' };
		// Distinguished (70-79) - Top 10%
		if (rating >= 70) return { label: 'Distinguished', color: 'text-cyan-300', bg: 'from-cyan-500/30 to-blue-500/30', border: 'border-cyan-400/50', description: 'Top 10%' };
		// Competitive (60-69) - Top 20%
		if (rating >= 60) return { label: 'Competitive', color: 'text-teal-300', bg: 'from-teal-500/30 to-emerald-500/30', border: 'border-teal-400/50', description: 'Top 20%' };
		// Established (50-59) - Top 35%
		if (rating >= 50) return { label: 'Established', color: 'text-amber-400', bg: 'from-amber-500/25 to-yellow-600/25', border: 'border-amber-500/40', description: 'Top 35%' };
		// Rising (40-49) - Top 50%
		if (rating >= 40) return { label: 'Rising', color: 'text-gray-300', bg: 'from-gray-400/25 to-slate-500/25', border: 'border-gray-400/40', description: 'Top 50%' };
		// Developing (30-39) - Below average
		if (rating >= 30) return { label: 'Developing', color: 'text-orange-400', bg: 'from-orange-600/25 to-amber-700/25', border: 'border-orange-500/40', description: 'Below average' };
		// Newcomer (20-29) - New player
		if (rating >= 20) return { label: 'Newcomer', color: 'text-stone-400', bg: 'from-stone-600/25 to-stone-700/25', border: 'border-stone-500/40', description: 'New player' };
		// Unranked (<20) - Insufficient data
		return { label: 'Unranked', color: 'text-slate-500', bg: 'from-slate-700/20 to-slate-800/20', border: 'border-slate-600/30', description: 'Insufficient data' };
	});

	// Social share URLs
	const shareUrl = $derived($page.url.href);
	const shareText = $derived(`Check out ${data.displayName}'s competitive stats on AGE! AGE Rating: ${ageRating().total}/100 | ${data.totalStats.totalPoints} points | ${winRate}% win rate | ${data.totalStats.top8Finishes} Top 8s`);
	const xShareUrl = $derived(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`);
	const blueskyShareUrl = $derived(`https://bsky.app/intent/compose?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`);
</script>

<svelte:head>
	<title>{data.displayName} ({ageRating().total} AGE) - Player Profile</title>
	<meta name="description" content="{data.displayName}'s competitive profile. AGE Rating: {ageRating().total}/100 ({ratingTier().label}). {data.totalStats.totalPoints} total points, {winRate}% win rate, {data.totalStats.top8Finishes} Top 8 finishes." />
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Banner -->
	<div class="relative overflow-x-clip">
		<!-- Animated background -->
		<div class="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-gray-950"></div>
		<div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>

		<!-- Glowing orbs -->
		<div class="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
		<div class="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>

		<div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
			<div class="flex flex-col lg:flex-row items-center gap-8">
				<!-- AGE Rating Badge (Primary) -->
				<div class="relative group cursor-pointer">
					<div class="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br {ratingTier().bg} border-3 {ratingTier().border} flex flex-col items-center justify-center shadow-2xl shadow-purple-500/25 backdrop-blur-sm transition-transform hover:scale-105">
						<span class="text-5xl sm:text-6xl font-black {ratingTier().color}">{ageRating().total}</span>
						<span class="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">AGE Rating</span>
						<span class="mt-2 px-3 py-1 rounded-full bg-gray-900/60 {ratingTier().color} text-xs font-bold">{ratingTier().label}</span>
					</div>
					<!-- Tooltip on hover (positioned below to avoid cutoff) -->
					<div class="absolute top-full left-1/2 -translate-x-1/2 mt-3 hidden group-hover:block z-20">
						<div class="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl whitespace-nowrap">
							<div class="text-center mb-2">
								<span class="{ratingTier().color} font-bold">{ratingTier().label}</span>
								<span class="text-gray-500 text-xs ml-1">- {ratingTier().description}</span>
							</div>
							<div class="text-xs text-gray-500 mb-2 text-center border-t border-gray-800 pt-2">vs {ageRating().totalPlayers} players</div>
							<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
								<div class="flex items-center gap-2">
									<div class="w-2 h-2 rounded-full bg-blue-400"></div>
									<span class="text-gray-400">Win Rate</span>
								</div>
								<span class="text-white font-medium text-right">{ageRating().percentiles.winRate}th %ile</span>
								<div class="flex items-center gap-2">
									<div class="w-2 h-2 rounded-full bg-purple-400"></div>
									<span class="text-gray-400">Top 8</span>
								</div>
								<span class="text-white font-medium text-right">{ageRating().percentiles.top8Rate}th %ile</span>
								<div class="flex items-center gap-2">
									<div class="w-2 h-2 rounded-full bg-emerald-400"></div>
									<span class="text-gray-400">Peak</span>
								</div>
								<span class="text-white font-medium text-right">{ageRating().percentiles.bestRank}th %ile</span>
							</div>
							{#if ageRating().eventPenalty}
								<div class="mt-2 pt-2 border-t border-gray-800 text-xs text-amber-500/80 text-center">
									Rating reduced (need 5+ events)
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Player Info -->
				<div class="text-center lg:text-left flex-1">
					<h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
						{data.displayName}
					</h1>

					<!-- Championship Badges -->
					{#if qualifiedSeasons.length > 0}
						<div class="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4">
							{#each qualifiedSeasons as qualifiedSeason}
								<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
									<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									</svg>
									{qualifiedSeason} Players Championship
								</span>
							{/each}
						</div>
					{/if}

					<!-- GEM ID and Aliases -->
					<div class="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
						<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
							</svg>
							GEM ID: {data.gemId}
						</span>
						{#if data.aliases.length > 0}
							<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
								{data.aliases.length} Alias{data.aliases.length > 1 ? 'es' : ''}
							</span>
						{/if}
					</div>

					<!-- Action Buttons -->
					<div class="flex flex-wrap items-center justify-center lg:justify-start gap-2">
						{#if data.isAdmin}
							<button
								onclick={() => editMode = !editMode}
								class="inline-flex items-center gap-2 px-4 py-2 rounded-lg {editMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-gray-800 text-gray-300 border-gray-700'} border hover:bg-opacity-80 transition-all text-sm font-medium"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									{#if editMode}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									{/if}
								</svg>
								{editMode ? 'Exit Edit Mode' : 'Edit Profile'}
							</button>
						{/if}

						<!-- Share Buttons -->
						<button
							onclick={copyLink}
							class="inline-flex items-center gap-2 px-3 py-2 rounded-lg {linkCopied ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-800/80 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white'} border transition-all text-sm font-medium"
							title="Copy link"
						>
							{#if linkCopied}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<span class="hidden sm:inline">Copied!</span>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
								</svg>
								<span class="hidden sm:inline">Copy Link</span>
							{/if}
						</button>
						<a
							href={xShareUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white transition-all text-sm font-medium"
							title="Share on X"
						>
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
							</svg>
							<span class="hidden sm:inline">Share</span>
						</a>
						<a
							href={blueskyShareUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-all text-sm font-medium"
							title="Share on Bluesky"
						>
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 568 501">
								<path d="M123.121 33.664C188.241 82.553 258.281 181.681 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.612 568-28.906 568 57.947c0 17.345-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748 114.875 19.551 144.097 84.311 80.986 149.071-119.86 122.992-172.272-30.859-185.702-70.281-2.462-9.223-3.614-13.522-3.631-11.4-.017-2.122-1.169 2.177-3.631 11.4-13.43 39.422-65.842 193.273-185.702 70.281-63.111-64.76-33.889-129.52 80.986-149.071-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.659 0 75.291 0 57.946 0-28.906 76.135-1.612 123.121 33.664z"/>
							</svg>
							<span class="hidden sm:inline">Share</span>
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
			<!-- Total Points -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/50 to-gray-900 border border-emerald-500/30 p-5 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
				<div class="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
						Total Points
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">{data.totalStats.totalPoints}</div>
				</div>
			</div>

			<!-- Win Rate -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/50 to-gray-900 border border-blue-500/30 p-5 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
				<div class="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						Win Rate
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">{winRate}%</div>
				</div>
			</div>

			<!-- Match Record -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 to-gray-900 border border-purple-500/30 p-5 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
				<div class="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-purple-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						Match Record
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">
						<span class="text-green-400">{data.totalStats.matchesWon}</span>
						<span class="text-gray-500 text-xl mx-1">-</span>
						<span class="text-red-400">{data.totalStats.matchesPlayed - data.totalStats.matchesWon}</span>
					</div>
				</div>
			</div>

			<!-- Events Played -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/50 to-gray-900 border border-amber-500/30 p-5 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10">
				<div class="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						Events
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">{data.totalStats.eventsPlayed}</div>
				</div>
			</div>

			<!-- Top 8 Finishes -->
			<div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-900/50 to-gray-900 border border-rose-500/30 p-5 hover:border-rose-500/50 transition-all hover:shadow-lg hover:shadow-rose-500/10 col-span-2 sm:col-span-1">
				<div class="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
				<div class="relative">
					<div class="flex items-center gap-2 text-rose-400 text-sm font-medium mb-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
						</svg>
						Top 8 Finishes
					</div>
					<div class="text-3xl sm:text-4xl font-bold text-white">{data.totalStats.top8Finishes}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Performance Analytics Section -->
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<h2 class="text-2xl font-bold text-white flex items-center gap-3 mb-6">
			<svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
			Performance Analytics
		</h2>

		<!-- AGE Rating Breakdown - Compact Visual Grid -->
		<div class="mb-6 rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-white flex items-center gap-2">
					<svg class="w-5 h-5 {ratingTier().color}" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
					</svg>
					Rating Breakdown
				</h3>
				<span class="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">vs {ageRating().totalPlayers} players</span>
			</div>
			<div class="p-4 sm:p-6">
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					<!-- Win Rate -->
					<div class="group relative rounded-xl bg-gradient-to-br from-blue-900/40 to-gray-900 border border-blue-500/20 p-4 hover:border-blue-500/40 transition-all cursor-help">
						<div class="flex flex-col items-center text-center">
							<div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
								<span class="text-lg font-bold text-blue-400">{ageRating().breakdown.winRate.toFixed(0)}</span>
							</div>
							<div class="text-xs text-gray-400 font-medium">Win Rate</div>
							<div class="text-[10px] text-blue-400/80 mt-1">{ageRating().percentiles.winRate}th %ile</div>
						</div>
						<!-- Tooltip -->
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
							<div class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
								<div class="font-semibold text-blue-400 mb-1">Win Rate Score</div>
								<div class="text-gray-300">{ageRating().breakdown.winRate} / 25 points</div>
								<div class="text-gray-500 mt-1">Match win percentage (harsh curve)</div>
							</div>
						</div>
					</div>

					<!-- Top 8 -->
					<div class="group relative rounded-xl bg-gradient-to-br from-purple-900/40 to-gray-900 border border-purple-500/20 p-4 hover:border-purple-500/40 transition-all cursor-help">
						<div class="flex flex-col items-center text-center">
							<div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
								<span class="text-lg font-bold text-purple-400">{ageRating().breakdown.top8.toFixed(0)}</span>
							</div>
							<div class="text-xs text-gray-400 font-medium">Top 8</div>
							<div class="text-[10px] text-purple-400/80 mt-1">{ageRating().percentiles.top8Rate}th %ile</div>
						</div>
						<!-- Tooltip -->
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
							<div class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
								<div class="font-semibold text-purple-400 mb-1">Top 8 Conversion</div>
								<div class="text-gray-300">{ageRating().breakdown.top8} / 25 points</div>
								<div class="text-gray-500 mt-1">Playoff consistency (harsh curve)</div>
							</div>
						</div>
					</div>

					<!-- Peak -->
					<div class="group relative rounded-xl bg-gradient-to-br from-emerald-900/40 to-gray-900 border border-emerald-500/20 p-4 hover:border-emerald-500/40 transition-all cursor-help">
						<div class="flex flex-col items-center text-center">
							<div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
								<span class="text-lg font-bold text-emerald-400">{ageRating().breakdown.peak.toFixed(0)}</span>
							</div>
							<div class="text-xs text-gray-400 font-medium">Peak</div>
							<div class="text-[10px] text-emerald-400/80 mt-1">{ageRating().percentiles.bestRank}th %ile</div>
						</div>
						<!-- Tooltip -->
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
							<div class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
								<div class="font-semibold text-emerald-400 mb-1">Peak Performance</div>
								<div class="text-gray-300">{ageRating().breakdown.peak} / 20 points</div>
								<div class="text-gray-500 mt-1">Best circuit rank achieved</div>
							</div>
						</div>
					</div>

					<!-- Experience -->
					<div class="group relative rounded-xl bg-gradient-to-br from-amber-900/40 to-gray-900 border border-amber-500/20 p-4 hover:border-amber-500/40 transition-all cursor-help">
						<div class="flex flex-col items-center text-center">
							<div class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-2">
								<span class="text-lg font-bold text-amber-400">{ageRating().breakdown.experience.toFixed(0)}</span>
							</div>
							<div class="text-xs text-gray-400 font-medium">Experience</div>
							<div class="text-[10px] text-amber-400/80 mt-1">{ageRating().percentiles.experience}th %ile</div>
						</div>
						<!-- Tooltip -->
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
							<div class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
								<div class="font-semibold text-amber-400 mb-1">Experience</div>
								<div class="text-gray-300">{ageRating().breakdown.experience} / 10 points</div>
								<div class="text-gray-500 mt-1">Total events played</div>
							</div>
						</div>
					</div>

					<!-- Efficiency -->
					<div class="group relative rounded-xl bg-gradient-to-br from-cyan-900/40 to-gray-900 border border-cyan-500/20 p-4 hover:border-cyan-500/40 transition-all cursor-help">
						<div class="flex flex-col items-center text-center">
							<div class="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mb-2">
								<span class="text-lg font-bold text-cyan-400">{ageRating().breakdown.efficiency.toFixed(0)}</span>
							</div>
							<div class="text-xs text-gray-400 font-medium">Efficiency</div>
							<div class="text-[10px] text-cyan-400/80 mt-1">{ageRating().percentiles.efficiency}th %ile</div>
						</div>
						<!-- Tooltip -->
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
							<div class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
								<div class="font-semibold text-cyan-400 mb-1">Points Efficiency</div>
								<div class="text-gray-300">{ageRating().breakdown.efficiency} / 15 points</div>
								<div class="text-gray-500 mt-1">Avg points per event (harsh curve)</div>
							</div>
						</div>
					</div>

					<!-- Championship -->
					<div class="group relative rounded-xl bg-gradient-to-br from-yellow-900/40 to-gray-900 border border-yellow-500/20 p-4 hover:border-yellow-500/40 transition-all cursor-help">
						<div class="flex flex-col items-center text-center">
							<div class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
								<span class="text-lg font-bold text-yellow-400">{ageRating().breakdown.championship.toFixed(0)}</span>
							</div>
							<div class="text-xs text-gray-400 font-medium">Champ</div>
							<div class="text-[10px] text-yellow-400/80 mt-1">{ageRating().percentiles.championship}th %ile</div>
						</div>
						<!-- Tooltip -->
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
							<div class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
								<div class="font-semibold text-yellow-400 mb-1">Championship Bonus</div>
								<div class="text-gray-300">{ageRating().breakdown.championship} / 5 points</div>
								<div class="text-gray-500 mt-1">Top 16 qualifications</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Rating Explanation -->
				<div class="mt-4 pt-4 border-t border-gray-800/50">
					<p class="text-xs text-gray-500 leading-relaxed">
						<span class="text-gray-400 font-medium">How AGE Rating works:</span> Your rating uses a harsh power curve that makes high scores extremely difficult to achieve. Percentiles are compressed (50th %ile = ~35% credit, 90th %ile = ~85% credit). Weights: Win Rate (25), Top 8 Rate (25), Peak Rank (20), Efficiency (15), Experience (10), Championship (5). Players with fewer than 3 events receive a penalty. Tiers: Elite (90+), Premier (80+), Distinguished (70+), Competitive (60+), Established (50+), Rising (40+), Developing (30+), Newcomer (20+).
					</p>
					{#if ageRating().eventPenalty}
						<p class="text-xs text-amber-500/80 mt-2 flex items-center gap-1">
							<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
							Rating reduced - need 3+ events for full credit
						</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Advanced Stats Grid -->
			<div class="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
				<h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					Key Metrics
				</h3>
				<div class="grid grid-cols-2 gap-4">
					<!-- Top 8 Conversion -->
					<div class="rounded-xl bg-gradient-to-br from-cyan-900/30 to-gray-900 border border-cyan-500/20 p-4">
						<div class="text-xs text-cyan-400/80 uppercase tracking-wide font-medium mb-1">Top 8 Rate</div>
						<div class="text-2xl font-bold text-white">{top8ConversionRate}%</div>
						<div class="text-xs text-gray-500 mt-1">{data.totalStats.top8Finishes} / {data.totalStats.eventsPlayed} events</div>
					</div>

					<!-- Avg Points Per Event -->
					<div class="rounded-xl bg-gradient-to-br from-emerald-900/30 to-gray-900 border border-emerald-500/20 p-4">
						<div class="text-xs text-emerald-400/80 uppercase tracking-wide font-medium mb-1">Avg Pts/Event</div>
						<div class="text-2xl font-bold text-white">{avgPointsPerEvent}</div>
						<div class="text-xs text-gray-500 mt-1">per tournament</div>
					</div>

					<!-- Best Rank -->
					<div class="rounded-xl bg-gradient-to-br from-yellow-900/30 to-gray-900 border border-yellow-500/20 p-4">
						<div class="text-xs text-yellow-400/80 uppercase tracking-wide font-medium mb-1">Best Rank</div>
						<div class="text-2xl font-bold text-white">
							{#if bestRank()}
								#{bestRank()}
							{:else}
								—
							{/if}
						</div>
						<div class="text-xs text-gray-500 mt-1">circuit standing</div>
					</div>

					<!-- Average Rank -->
					<div class="rounded-xl bg-gradient-to-br from-violet-900/30 to-gray-900 border border-violet-500/20 p-4">
						<div class="text-xs text-violet-400/80 uppercase tracking-wide font-medium mb-1">Avg Rank</div>
						<div class="text-2xl font-bold text-white">
							{#if avgRank()}
								#{avgRank()}
							{:else}
								—
							{/if}
						</div>
						<div class="text-xs text-gray-500 mt-1">across circuits</div>
					</div>

					<!-- Circuits Played -->
					<div class="rounded-xl bg-gradient-to-br from-pink-900/30 to-gray-900 border border-pink-500/20 p-4">
						<div class="text-xs text-pink-400/80 uppercase tracking-wide font-medium mb-1">Circuits</div>
						<div class="text-2xl font-bold text-white">{circuitsPlayed.length}</div>
						<div class="text-xs text-gray-500 mt-1 truncate" title={circuitsPlayed.join(', ')}>{circuitsPlayed.slice(0, 2).join(', ')}{circuitsPlayed.length > 2 ? '...' : ''}</div>
					</div>

					<!-- Seasons Played -->
					<div class="rounded-xl bg-gradient-to-br from-orange-900/30 to-gray-900 border border-orange-500/20 p-4">
						<div class="text-xs text-orange-400/80 uppercase tracking-wide font-medium mb-1">Seasons</div>
						<div class="text-2xl font-bold text-white">{seasonsPlayed.length}</div>
						<div class="text-xs text-gray-500 mt-1">{seasonsPlayed[0] || '—'}{seasonsPlayed.length > 1 ? ` - ${seasonsPlayed[seasonsPlayed.length - 1]}` : ''}</div>
					</div>
				</div>
			</div>

			<!-- Historical Performance Chart -->
			<div class="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
				<h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
					</svg>
					Performance History
					{#if hasMonthlyData()}
						<span class="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full ml-2">
							{activeMonths()} month{activeMonths() !== 1 ? 's' : ''}
						</span>
						{#if performanceTrend() === 'up'}
							<span class="ml-auto text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full flex items-center gap-1">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
								</svg>
								Trending Up
							</span>
						{:else if performanceTrend() === 'down'}
							<span class="ml-auto text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full flex items-center gap-1">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
								</svg>
								Trending Down
							</span>
						{/if}
					{:else if seasonPerformance().length > 0}
						<span class="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full ml-2">
							{seasonPerformance().length} season{seasonPerformance().length !== 1 ? 's' : ''}
						</span>
					{/if}
				</h3>

				{#if hasMonthlyData()}
					<!-- Historical Timeline Chart (Monthly) -->
					<div class="relative">
						<!-- Scrollable container for many data points -->
						<div class="overflow-x-auto pb-2 -mx-2 px-2">
							<div class="flex items-end gap-1 mb-2" style="height: 160px; min-width: {Math.max(historicalPerformance().length * 40, 100)}px">
								{#each historicalPerformance() as dataPoint, i}
									{@const heightPx = maxMonthlyPoints() > 0 ? Math.max((dataPoint.points / maxMonthlyPoints()) * 140, 12) : 12}
									{@const prevSeason = i > 0 ? historicalPerformance()[i - 1].season : null}
									{@const isNewSeason = dataPoint.season !== prevSeason}
									<div class="flex flex-col items-center justify-end group relative h-full {isNewSeason && i > 0 ? 'ml-3 pl-3 border-l border-gray-700' : ''}" style="min-width: 36px; flex: 1;">
										<!-- Tooltip -->
										<div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
											<div class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
												<div class="font-semibold text-white mb-1">{dataPoint.label}</div>
												<div class="text-emerald-400">{dataPoint.points} pts</div>
												{#if dataPoint.matches > 0}
													<div class="text-gray-400">{dataPoint.wins}W-{dataPoint.matches - dataPoint.wins}L ({dataPoint.winRate}%)</div>
												{/if}
											</div>
										</div>
										<!-- Bar -->
										<div
											class="w-full max-w-6 rounded-t transition-all duration-300 bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300"
											style="height: {heightPx}px"
										></div>
									</div>
								{/each}
							</div>
							<!-- Labels -->
							<div class="flex gap-1" style="min-width: {Math.max(historicalPerformance().length * 40, 100)}px">
								{#each historicalPerformance() as dataPoint, i}
									{@const prevSeason = i > 0 ? historicalPerformance()[i - 1].season : null}
									{@const isNewSeason = dataPoint.season !== prevSeason}
									<div class="flex flex-col items-center {isNewSeason && i > 0 ? 'ml-3 pl-3 border-l border-gray-700' : ''}" style="min-width: 36px; flex: 1;">
										<span class="text-[10px] text-gray-500">{dataPoint.shortLabel}</span>
										{#if isNewSeason}
											<span class="text-[9px] text-blue-400 font-medium">{dataPoint.season}</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
						<!-- Scroll hint for mobile -->
						{#if historicalPerformance().length > 8}
							<div class="absolute right-0 top-0 bottom-8 w-8 bg-gradient-to-l from-gray-900/90 to-transparent pointer-events-none flex items-center justify-center sm:hidden">
								<svg class="w-4 h-4 text-gray-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</div>
						{/if}
					</div>

					<!-- Best Month Highlight -->
					{#if bestMonth()}
						<div class="mt-4 pt-4 border-t border-gray-800">
							<div class="flex items-center justify-between">
								<div class="text-sm text-gray-400">Best Month</div>
								<div class="flex items-center gap-2">
									<span class="text-lg font-bold text-yellow-400">{bestMonth().label}</span>
									<span class="text-sm text-gray-500">•</span>
									<span class="text-emerald-400 font-semibold">{bestMonth().points} pts</span>
								</div>
							</div>
						</div>
					{/if}
				{:else if seasonPerformance().length > 0}
					<!-- Season-Level Chart (Fallback when no monthly data) -->
					<div class="relative">
						<div class="flex items-end justify-center gap-4 mb-2" style="height: 160px;">
							{#each seasonPerformance() as seasonData}
								{@const heightPx = maxSeasonPoints() > 0 ? Math.max((seasonData.points / maxSeasonPoints()) * 140, 12) : 12}
								<div class="flex flex-col items-center justify-end group relative h-full" style="min-width: 80px; max-width: 120px; flex: 1;">
									<!-- Tooltip -->
									<div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
										<div class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
											<div class="font-semibold text-white mb-1">{seasonData.season} Season</div>
											<div class="text-emerald-400">{seasonData.points} pts</div>
											<div class="text-gray-400">{seasonData.wins}W-{seasonData.matches - seasonData.wins}L ({seasonData.winRate}%)</div>
											<div class="text-gray-500 mt-1">{seasonData.events} events • {seasonData.circuits.join(', ')}</div>
										</div>
									</div>
									<!-- Bar -->
									<div
										class="w-full max-w-16 rounded-t transition-all duration-300 bg-gradient-to-t from-purple-600 to-purple-400 group-hover:from-purple-500 group-hover:to-purple-300"
										style="height: {heightPx}px"
									></div>
								</div>
							{/each}
						</div>
						<!-- Season Labels -->
						<div class="flex justify-center gap-4">
							{#each seasonPerformance() as seasonData}
								<div class="flex flex-col items-center" style="min-width: 80px; max-width: 120px; flex: 1;">
									<span class="text-sm font-medium text-blue-400">{seasonData.season}</span>
									<span class="text-xs text-gray-500">{seasonData.points} pts</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Best Season Highlight -->
					{@const bestSeason = seasonPerformance().reduce((best, current) => current.points > best.points ? current : best, seasonPerformance()[0])}
					{#if bestSeason && bestSeason.points > 0}
						<div class="mt-4 pt-4 border-t border-gray-800">
							<div class="flex items-center justify-between">
								<div class="text-sm text-gray-400">Best Season</div>
								<div class="flex items-center gap-2">
									<span class="text-lg font-bold text-yellow-400">{bestSeason.season}</span>
									<span class="text-sm text-gray-500">•</span>
									<span class="text-emerald-400 font-semibold">{bestSeason.points} pts</span>
								</div>
							</div>
						</div>
					{/if}

					<p class="text-xs text-gray-600 text-center mt-3">Monthly breakdown available after event closeouts</p>
				{:else}
					<!-- No Data State -->
					<div class="flex flex-col items-center justify-center h-40 text-center">
						<svg class="w-12 h-12 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						<p class="text-gray-500 text-sm">No performance history available</p>
						<p class="text-gray-600 text-xs mt-1">Data shows after event closeouts</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Win Rate Visualization -->
		<div class="mt-6 rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
			<h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
				<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Win Rate Breakdown
			</h3>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<!-- Overall Win Rate Ring -->
				<div class="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50">
					<div class="relative w-16 h-16">
						<svg class="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
							<path
								class="text-gray-700"
								stroke="currentColor"
								stroke-width="3"
								fill="none"
								d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							/>
							<path
								class="text-green-500"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								fill="none"
								stroke-dasharray="{winRate}, 100"
								d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							/>
						</svg>
						<div class="absolute inset-0 flex items-center justify-center">
							<span class="text-sm font-bold text-white">{winRate}%</span>
						</div>
					</div>
					<div>
						<div class="text-sm font-medium text-white">Overall</div>
						<div class="text-xs text-gray-400">{data.totalStats.matchesWon}W - {data.totalStats.matchesPlayed - data.totalStats.matchesWon}L</div>
					</div>
				</div>

				<!-- Matches Won -->
				<div class="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50">
					<div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
						<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<div>
						<div class="text-2xl font-bold text-green-400">{data.totalStats.matchesWon}</div>
						<div class="text-xs text-gray-400">Matches Won</div>
					</div>
				</div>

				<!-- Matches Lost -->
				<div class="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50">
					<div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
						<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<div>
						<div class="text-2xl font-bold text-red-400">{data.totalStats.matchesPlayed - data.totalStats.matchesWon}</div>
						<div class="text-xs text-gray-400">Matches Lost</div>
					</div>
				</div>

				<!-- Total Matches -->
				<div class="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50">
					<div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
						<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
					<div>
						<div class="text-2xl font-bold text-blue-400">{data.totalStats.matchesPlayed}</div>
						<div class="text-xs text-gray-400">Total Matches</div>
					</div>
				</div>
			</div>

			<!-- Win Rate Progress Bar -->
			<div class="mt-4 pt-4 border-t border-gray-800">
				<div class="flex items-center justify-between text-sm mb-2">
					<span class="text-gray-400">Win/Loss Distribution</span>
					<span class="text-gray-500">{data.totalStats.matchesPlayed} matches</span>
				</div>
				<div class="h-4 rounded-full bg-gray-800 overflow-hidden flex">
					{#if data.totalStats.matchesPlayed > 0}
						<div
							class="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
							style="width: {winRate}%"
						></div>
						<div
							class="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
							style="width: {100 - winRate}%"
						></div>
					{:else}
						<div class="h-full w-full bg-gray-700"></div>
					{/if}
				</div>
				<div class="flex justify-between text-xs mt-1">
					<span class="text-green-400">{winRate}% Won</span>
					<span class="text-red-400">{100 - winRate}% Lost</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Season Standings -->
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-2xl font-bold text-white flex items-center gap-3">
				<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				Season Standings
			</h2>
			{#if editMode}
				<button
					onclick={() => showAddStanding = true}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all text-sm font-medium"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Add Standing
				</button>
			{/if}
		</div>

		{#if Object.keys(standingsBySeason).length === 0}
			<div class="text-center py-16 rounded-2xl border border-gray-800 bg-gray-900/50">
				<svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				<p class="text-gray-500 text-lg">No standings data yet</p>
				{#if editMode}
					<button
						onclick={() => showAddStanding = true}
						class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all text-sm font-medium"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Add First Standing
					</button>
				{/if}
			</div>
		{:else}
			<div class="space-y-6">
				{#each Object.entries(standingsBySeason).sort((a, b) => b[0].localeCompare(a[0])) as [season, seasonStandings]}
					<div class="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
						<!-- Season Header -->
						<div class="px-6 py-4 bg-gradient-to-r from-gray-800/80 to-gray-900 border-b border-gray-800">
							<h3 class="text-xl font-bold text-white flex items-center gap-3">
								<span class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
								</span>
								{season} Season
							</h3>
						</div>

						<!-- Circuit Cards -->
						<div class="p-4 sm:p-6 space-y-4">
							{#each seasonStandings as standing}
								<div class="rounded-xl border border-gray-700/50 bg-gray-800/30 overflow-hidden">
									<!-- Circuit Header -->
									<button
										onclick={() => expandedSeasonId = expandedSeasonId === standing.id ? null : standing.id}
										class="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-all"
									>
										<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
											<!-- Circuit badge and rank -->
											<div class="flex items-center gap-2 flex-wrap">
												<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold {standing.circuit === 'Los Angeles' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : standing.circuit === 'New England' ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30' : 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'}">
													{standing.circuit}
												</span>
												{#if standing.calculatedRank && standing.calculatedRank <= 16}
													<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 ring-1 ring-yellow-500/30">
														<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
															<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
														</svg>
														#{standing.calculatedRank}
													</span>
												{:else if standing.calculatedRank}
													<span class="text-xs text-gray-500">Rank #{standing.calculatedRank}</span>
												{/if}
											</div>
											<!-- Stats row -->
											<div class="grid grid-cols-3 gap-2 sm:gap-3 mt-2 text-xs sm:text-sm">
												<div class="flex flex-col items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5 sm:px-3 sm:py-2">
													<span class="text-[10px] sm:text-xs text-emerald-400/70 uppercase tracking-wide font-medium">Points</span>
													<span class="font-bold text-base sm:text-lg text-emerald-400">{standing.totalPoints || 0}</span>
												</div>
												<div class="flex flex-col items-center justify-center rounded-lg bg-gray-700/30 border border-gray-600/30 px-2 py-1.5 sm:px-3 sm:py-2">
													<span class="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide font-medium">Record</span>
													<span class="font-bold text-base sm:text-lg">
														<span class="text-green-400">{standing.matchesWon || 0}</span>
														<span class="text-gray-500">-</span>
														<span class="text-red-400">{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span>
													</span>
												</div>
												<div class="flex flex-col items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 px-2 py-1.5 sm:px-3 sm:py-2">
													<span class="text-[10px] sm:text-xs text-blue-400/70 uppercase tracking-wide font-medium">Events</span>
													<span class="font-bold text-base sm:text-lg text-blue-400">{standing.eventsPlayed || 0}</span>
												</div>
											</div>
										</div>
										<svg class="w-5 h-5 text-gray-400 transition-transform shrink-0 ml-2 {expandedSeasonId === standing.id ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</button>

									<!-- Expanded Details -->
									{#if expandedSeasonId === standing.id}
										<div class="px-4 sm:px-5 py-4 sm:py-5 border-t border-gray-700/50 bg-gray-900/50">
											<!-- Main Stats Grid -->
											{#if editMode}
												<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="totalPoints" />
														<label class="block text-xs text-gray-500">
															Total Points
															<input
																type="number"
																name="value"
																value={standing.totalPoints || 0}
																onchange={(e) => e.target.form.requestSubmit()}
																class="mt-1 w-full bg-gray-800 text-emerald-400 font-bold text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
															/>
														</label>
													</form>
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
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
																class="mt-1 w-full bg-gray-800 text-gray-300 text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
															/>
														</label>
													</form>
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="eventsPlayed" />
														<label class="block text-xs text-gray-500">
															Events Played
															<input
																type="number"
																name="value"
																value={standing.eventsPlayed || 0}
																onchange={(e) => e.target.form.requestSubmit()}
																class="mt-1 w-full bg-gray-800 text-gray-300 text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
															/>
														</label>
													</form>
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="matchesWon" />
														<label class="block text-xs text-gray-500">
															Matches Won
															<input
																type="number"
																name="value"
																value={standing.matchesWon || 0}
																onchange={(e) => e.target.form.requestSubmit()}
																class="mt-1 w-full bg-gray-800 text-green-400 text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
															/>
														</label>
													</form>
													<form method="POST" action="?/updateStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}} class="space-y-1">
														<input type="hidden" name="standingId" value={standing.id} />
														<input type="hidden" name="field" value="matchesPlayed" />
														<label class="block text-xs text-gray-500">
															Matches Played
															<input
																type="number"
																name="value"
																value={standing.matchesPlayed || 0}
																onchange={(e) => e.target.form.requestSubmit()}
																class="mt-1 w-full bg-gray-800 text-gray-300 text-center rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
															/>
														</label>
													</form>
												</div>
											{/if}

											<!-- Monthly Breakdown -->
											<div class="mb-4">
												<h4 class="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
													</svg>
													Monthly Breakdown
												</h4>
												<div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
													{#each months as month}
														{@const points = standing[`${month.key}Points`] || 0}
														{@const wins = standing[`${month.key}MatchesWon`] || 0}
														{@const matches = standing[`${month.key}Matches`] || 0}
														{@const hasData = points > 0 || wins > 0 || matches > 0}
														<div class="rounded-lg border {hasData ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800/50 bg-gray-900/30'} p-2 text-center">
															<div class="text-xs font-medium {hasData ? 'text-blue-400' : 'text-gray-600'} mb-1">{month.label}</div>
															{#if editMode}
																<!-- Points input -->
																<form method="POST" action="?/updateStanding" use:enhance={() => {
																	return async ({ result, update }) => {
																		if (result.type === 'success') {
																			await update();
																			await invalidateAll();
																		}
																	};
																}}>
																	<input type="hidden" name="standingId" value={standing.id} />
																	<input type="hidden" name="field" value="{month.key}Points" />
																	<input
																		type="text"
																		inputmode="numeric"
																		pattern="[0-9]*"
																		name="value"
																		value={points}
																		onchange={(e) => e.target.form.requestSubmit()}
																		class="w-full bg-gray-900 text-emerald-400 text-sm font-bold text-center rounded px-2 py-1.5 border border-gray-700 focus:border-emerald-500 focus:outline-none mb-1"
																		title="Points"
																	/>
																</form>
																<!-- Matches Won / Matches Played inputs -->
																<div class="flex gap-1 items-center justify-center">
																	<form method="POST" action="?/updateStanding" use:enhance={() => {
																		return async ({ result, update }) => {
																			if (result.type === 'success') {
																				await update();
																				await invalidateAll();
																			}
																		};
																	}} class="flex-1">
																		<input type="hidden" name="standingId" value={standing.id} />
																		<input type="hidden" name="field" value="{month.key}MatchesWon" />
																		<input
																			type="text"
																			inputmode="numeric"
																			pattern="[0-9]*"
																			name="value"
																			value={wins}
																			onchange={(e) => e.target.form.requestSubmit()}
																			class="w-full bg-gray-900 text-green-400 text-sm text-center rounded px-1 py-1 border border-gray-700 focus:border-green-500 focus:outline-none"
																			title="Matches Won"
																		/>
																	</form>
																	<span class="text-gray-500 text-sm font-medium">/</span>
																	<form method="POST" action="?/updateStanding" use:enhance={() => {
																		return async ({ result, update }) => {
																			if (result.type === 'success') {
																				await update();
																				await invalidateAll();
																			}
																		};
																	}} class="flex-1">
																		<input type="hidden" name="standingId" value={standing.id} />
																		<input type="hidden" name="field" value="{month.key}Matches" />
																		<input
																			type="text"
																			inputmode="numeric"
																			pattern="[0-9]*"
																			name="value"
																			value={matches}
																			onchange={(e) => e.target.form.requestSubmit()}
																			class="w-full bg-gray-900 text-gray-300 text-sm text-center rounded px-1 py-1 border border-gray-700 focus:border-blue-500 focus:outline-none"
																			title="Matches Played"
																		/>
																	</form>
																</div>
															{:else}
																<div class="text-sm font-bold {hasData ? 'text-emerald-400' : 'text-gray-700'}">{points}</div>
																<div class="text-xs {hasData ? 'text-gray-400' : 'text-gray-700'} mt-0.5">
																	{wins}/{matches}
																</div>
															{/if}
														</div>
													{/each}
												</div>
											</div>

											<!-- Delete Button -->
											{#if editMode}
												<div class="pt-4 border-t border-gray-700/50">
													<form method="POST" action="?/deleteStanding" use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await update();
																await invalidateAll();
															}
														};
													}}>
														<input type="hidden" name="standingId" value={standing.id} />
														<button
															type="submit"
															onclick={(e) => { if (!confirm('Delete this standing record?')) e.preventDefault(); }}
															class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all text-sm font-medium"
														>
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
															</svg>
															Delete Standing
														</button>
													</form>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Add Standing Modal -->
	{#if showAddStanding}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
			<div class="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
				<div class="px-6 py-4 border-b border-gray-700">
					<h3 class="text-lg font-semibold text-white">Add New Standing</h3>
				</div>
				<form method="POST" action="?/addStanding" use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showAddStanding = false;
							await update();
							await invalidateAll();
						}
					};
				}} class="p-6 space-y-4">
					<label class="block">
						<span class="block text-sm font-medium text-gray-400 mb-2">Season</span>
						<input
							type="text"
							name="season"
							placeholder="e.g., 2025"
							required
							class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
						/>
					</label>
					<label class="block">
						<span class="block text-sm font-medium text-gray-400 mb-2">Circuit</span>
						<select
							name="circuit"
							required
							class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
						>
							<option value="">Select a circuit</option>
							<option value="Los Angeles">Los Angeles</option>
							<option value="New England">New England</option>
							<option value="St. Louis">St. Louis</option>
						</select>
					</label>
					<label class="block">
						<span class="block text-sm font-medium text-gray-400 mb-2">Player Name</span>
						<input
							type="text"
							name="playerName"
							value={data.displayName}
							required
							class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
						/>
					</label>
					<div class="flex gap-3 pt-4">
						<button
							type="button"
							onclick={() => showAddStanding = false}
							class="flex-1 px-4 py-3 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 transition-all font-medium"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-all font-medium"
						>
							Add Standing
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
