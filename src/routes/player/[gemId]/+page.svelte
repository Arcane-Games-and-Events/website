<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { calculateAgeRating } from '$lib/age-rating.js';
	import DecklistCard from '$lib/components/DecklistCard.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	// ============ helpers for editorial template ============
	function heroSlug(name) {
		if (!name) return null;
		return name
			.toLowerCase()
			.replace(/[,'"]/g, '')
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
			.replace(/-+/g, '-')
			.trim();
	}
	function heroBackdropUrl(name) {
		const slug = heroSlug(name);
		return slug ? `/hero_images/${slug}.webp` : null;
	}
	function circuitHex(circuit) {
		return (
			{ 'Los Angeles': '#1B4F9C', 'New England': '#6A4A86', 'St. Louis': '#2F7D46' }[circuit] ||
			'#17150F'
		);
	}
	function tierHex(label) {
		return (
			{
				Provisional: '#928B79',
				Elite: '#C8922E',
				Premier: '#6A4A86',
				Distinguished: '#2C5BA8',
				Competitive: '#1C7A4B',
				Established: '#C8922E',
				Rising: '#56503F',
				Newcomer: '#56503F',
				Unranked: '#928B79'
			}[label] || '#56503F'
		);
	}

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
	<title>{data.displayName} ({ageRating().total} AGE) — Player Profile</title>
	<meta
		name="description"
		content="{data.displayName}'s competitive profile. AGE Rating: {ageRating().total}/100. {data.totalStats.totalPoints} total points across {data.totalStats.eventsPlayed} events."
	/>
</svelte:head>

<!--
	"Sports Stats" variation of the player profile. Compact dark hero
	card with a stat line, then table-heavy sections (Season Standings,
	Box Score, Rating Percentiles, Heroes, Head-to-Head) styled like a
	sports almanac / media guide.
-->

<AgeShell active="AGE Open">
	{@const _tier = ratingTier()}
	{@const _tierLabel = _tier.label}
	{@const _tierHex = tierHex(_tierLabel)}
	{@const _rating = ageRating()}
	{@const _primary = data.standings[0]}
	{@const _primaryCircuit = _primary?.circuit}
	{@const _primaryCircuitHex = _primaryCircuit ? circuitHex(_primaryCircuit) : null}
	{@const _qualifiedSeasons = data.standings.filter((s) => s.calculatedRank && s.calculatedRank <= 16)}
	{@const _losses = (data.totalStats.matchesPlayed || 0) - (data.totalStats.matchesWon || 0)}
	{@const _firstName = data.displayName.split(' ')[0] || ''}
	{@const _lastName = data.displayName.split(' ').slice(1).join(' ') || ''}

	<!-- ============ COMPACT SPORTS-CARD HERO ============ -->
	<section
		class="relative overflow-hidden border-b-[3px] bg-[#0E1220] text-white"
		style="border-bottom-color: {_tierHex};"
	>
		<!-- background grid -->
		<div
			class="pointer-events-none absolute inset-0 z-0"
			style="background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 48px 48px;"
			aria-hidden="true"
		></div>
		<!-- corner glow -->
		<div
			class="pointer-events-none absolute z-0"
			style="top: -55%; right: -4%; width: 560px; height: 560px; background: radial-gradient(circle, color-mix(in srgb, {_tierHex} 34%, transparent), transparent 68%);"
			aria-hidden="true"
		></div>
		<!-- giant watermark rating number -->
		<span
			class="font-archivo pointer-events-none absolute right-9 -bottom-[78px] z-0 text-[280px] leading-[0.7] font-black tabular-nums"
			style="color: color-mix(in srgb, {_tierHex} 13%, transparent); letter-spacing: -0.04em;"
			aria-hidden="true"
		>
			{_rating.total}
		</span>

		<!-- back link -->
		<div class="relative z-[1] mx-auto w-full max-w-[min(94vw,1920px)] px-14 pt-5">
			<a
				href="/age-open?tab=standings"
				class="font-mono-system hover:text-white inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-[#aeb6c6] uppercase transition-colors"
			>
				← Back to Standings
			</a>
		</div>

		<!-- main content row -->
		<div class="relative z-[1] mx-auto flex w-full max-w-[min(94vw,1920px)] flex-wrap items-center gap-8 px-14 pt-[22px] pb-[30px]">
			<!-- rating badge card -->
			<div
				class="relative w-[152px] flex-shrink-0 overflow-hidden border bg-[#0F172A] px-[18px] pt-5 pb-[18px] text-center"
				style="border-color: color-mix(in srgb, {_tierHex} 48%, #1e293b); background: linear-gradient(158deg, color-mix(in srgb, {_tierHex} 18%, #0f172a), #020617 82%);"
			>
				<span class="absolute inset-x-0 top-0 h-[3px]" style="background-color: {_tierHex};"></span>
				<div
					class="font-archivo text-[66px] leading-[0.78] font-black tracking-[-0.03em] tabular-nums"
					style="color: {_tierHex};"
				>
					{_rating.total}
				</div>
				<div class="font-mono-system mt-3 text-[9px] font-bold tracking-[0.2em] text-[#94a3b8] uppercase">
					AGE Rating
				</div>
				<div
					class="mt-[13px] inline-block px-[13px] py-[6px] text-[10.5px] font-extrabold tracking-[0.08em] text-[#0E1220] uppercase"
					style="background-color: {_tierHex};"
				>
					{_tierLabel}
				</div>
			</div>

			<!-- who -->
			<div class="min-w-0 flex-1">
				<div class="font-mono-system mb-3 text-[10.5px] font-bold tracking-[0.16em] uppercase" style="color: color-mix(in srgb, {_tierHex} 60%, #9aa1b3);">
					AGE Open · Player Card · {data.standings[data.standings.length - 1]?.season || ''} – {data.standings[0]?.season || ''}
				</div>
				<h1 class="font-newsreader text-[clamp(40px,5vw,62px)] leading-[0.9] font-semibold tracking-[-0.025em] text-white">
					{#if _lastName}
						<span class="text-white/80 font-medium italic">{_firstName}</span> {_lastName}
					{:else}
						{_firstName}
					{/if}
				</h1>
				<div class="mt-[18px] flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-semibold text-[#aeb6c6]">
					<span class="font-mono-system text-[#8c94a6] tracking-[0.03em]">GEM {data.gemId}</span>
					{#if _primaryCircuit}
						<span class="text-white/25">·</span>
						<span class="inline-flex items-center gap-[7px] font-bold text-[#cdd4e2]">
							<span class="block h-[9px] w-[9px]" style="background-color: {_primaryCircuitHex};"></span>
							{_primaryCircuit}
						</span>
					{/if}
					<span class="text-white/25">·</span>
					<span>vs {_rating.totalPlayers} rated players</span>
				</div>

				<!-- championships -->
				{#if _qualifiedSeasons.length > 0}
					<div class="mt-4 flex flex-wrap items-center gap-2">
						<span class="font-mono-system inline-flex items-center gap-2 text-[9.5px] font-bold tracking-[0.13em] text-[#8c94a6] uppercase after:block after:h-[13px] after:w-px after:bg-white/20 after:content-['']">
							Championship Qualifier
						</span>
						{#each _qualifiedSeasons as q (q.id)}
							<span class="hover:bg-[#F4C66A] hover:text-[#1a1305] inline-flex items-center gap-[6px] border border-[#F4C66A]/40 px-[10px] py-[5px] text-[11px] font-extrabold tracking-[0.03em] text-[#F4C66A] transition-colors">
								<b class="text-[10px] leading-none">★</b>{q.season}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- share actions -->
			<div class="flex flex-shrink-0 flex-col items-stretch gap-2 self-center">
				<button
					type="button"
					onclick={refreshData}
					disabled={isRefreshing}
					class="px-4 py-[10px] text-center text-[10.5px] font-extrabold tracking-[0.04em] uppercase whitespace-nowrap text-[#0E1220] transition-colors disabled:opacity-50"
					style="background-color: {_tierHex}; border: 1px solid {_tierHex};"
				>
					{isRefreshing ? '↻ Refreshing' : '↻ Refresh'}
				</button>
				<a
					href={xShareUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:bg-white hover:border-white hover:text-[#0E1220] border border-white/25 px-4 py-[10px] text-center text-[10.5px] font-bold tracking-[0.04em] text-white uppercase transition-colors"
				>
					Share on X
				</a>
				<a
					href={blueskyShareUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:bg-white hover:border-white hover:text-[#0E1220] border border-white/25 px-4 py-[10px] text-center text-[10.5px] font-bold tracking-[0.04em] text-white uppercase transition-colors"
				>
					Bluesky
				</a>
			</div>
		</div>

		<!-- stat line -->
		<div class="relative z-[1] mx-auto grid w-full max-w-[min(94vw,1920px)] grid-cols-3 px-14 pb-[36px] md:grid-cols-6">
			{#each [
				{ v: data.totalStats.totalPoints, l: 'Total Points', hl: true },
				{ v: data.totalStats.top8Finishes, l: "Top 8's" },
				{ v: `${winRate}%`, l: 'Win Rate' },
				{ v: `${data.totalStats.matchesWon}–${_losses}`, l: 'Match Record' },
				{ v: seasonsPlayed.length, l: 'Seasons' },
				{ v: data.totalStats.eventsPlayed, l: 'Events' }
			] as t, i (i)}
				<div class="border-r border-white/10 pt-[18px] pr-[22px] pb-1 first:pl-0 not-first:pl-[22px] last:border-r-0">
					<div class="font-archivo text-[26px] leading-[0.85] font-black tracking-[-0.02em] tabular-nums {t.hl ? 'text-[#F4C66A]' : 'text-white'}">
						{t.v}
					</div>
					<div class="mt-[9px] text-[9px] font-extrabold tracking-[0.1em] text-[#9aa1b3] uppercase">
						{t.l}
					</div>
				</div>
			{/each}
		</div>
		<!-- top border of stat line -->
		<div class="absolute right-14 left-14 z-[1] border-t border-white/15" style="top: calc(100% - 100px - 1px);" aria-hidden="true"></div>
	</section>

	<!-- ============ SEASON STANDINGS TABLE ============ -->
	{#if data.standings && data.standings.length > 0}
		{@const _careerWinPct = data.totalStats.matchesPlayed > 0
			? ((data.totalStats.matchesWon / data.totalStats.matchesPlayed) * 100).toFixed(1)
			: '0.0'}
		<section class="border-ink border-b-[3px] border-double px-14 py-[40px]">
			<div class="mb-5 flex flex-wrap items-end justify-between gap-5">
				<div>
					<div class="text-accent mb-[7px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
						Career
					</div>
					<h2 class="font-newsreader text-[30px] font-semibold leading-none tracking-[-0.02em]">
						Season Standings
					</h2>
				</div>
				<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em] uppercase">
					Per-season totals
				</span>
			</div>

			<div class="border-line2 overflow-hidden border bg-paper-bg">
				<table class="w-full border-collapse">
					<thead>
						<tr>
							{#each [
								{ k: 'Season', l: true },
								{ k: 'Circuit', l: true },
								{ k: 'EV' },
								{ k: 'W' },
								{ k: 'L' },
								{ k: 'Win %' },
								{ k: 'Pts' },
								{ k: 'Finish', l: true }
							] as h (h.k)}
								<th
									class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-[10px] font-extrabold tracking-[0.1em] uppercase {h.l ? 'text-left' : 'text-right'}"
								>
									{h.k}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each data.standings as s, i (s.id)}
							{@const _ccColor = circuitHex(s.circuit)}
							{@const _sLosses = (s.matchesPlayed || 0) - (s.matchesWon || 0)}
							{@const _winPct = (s.matchesWon || 0) + _sLosses > 0
								? (((s.matchesWon || 0) / ((s.matchesWon || 0) + _sLosses)) * 100).toFixed(1)
								: '—'}
							{@const _isChamp = s.calculatedRank === 1}
							{@const _isTop8 = s.calculatedRank && s.calculatedRank <= 8}
							{@const _isOpen = expandedSeasonId === s.id}
							{@const _allMonths = [
								{ k: 'january', n: 'Jan' },
								{ k: 'february', n: 'Feb' },
								{ k: 'march', n: 'Mar' },
								{ k: 'april', n: 'Apr' },
								{ k: 'may', n: 'May' },
								{ k: 'june', n: 'Jun' },
								{ k: 'july', n: 'Jul' },
								{ k: 'august', n: 'Aug' },
								{ k: 'september', n: 'Sep' },
								{ k: 'october', n: 'Oct' },
								{ k: 'november', n: 'Nov' },
								{ k: 'december', n: 'Dec' }
							]}
							{@const _months = _allMonths.filter((m) => (s[`${m.k}Points`] || 0) > 0 || (s[`${m.k}Matches`] || 0) > 0)}
							<tr
								class="border-line {_isOpen ? 'bg-accent/8' : i % 2 === 1 ? 'bg-ink/3' : ''} {_months.length > 0 ? 'cursor-pointer' : ''} hover:bg-accent/10 group border-t transition-colors"
								onclick={() => {
									if (_months.length > 0) expandedSeasonId = _isOpen ? null : s.id;
								}}
							>
								<td class="text-ink px-[14px] py-[13px] text-left">
									<span class="font-archivo text-[15px] font-black tracking-[-0.01em]">
										{s.season}
									</span>
								</td>
								<td class="text-ink px-[14px] py-[13px] text-left">
									<span class="inline-flex items-center gap-2 text-[14px] font-bold" style="color: {_ccColor};">
										<span class="block h-[9px] w-[9px]" style="background-color: {_ccColor};"></span>
										{s.circuit}
									</span>
								</td>
								<td class="font-mono-system text-ink px-[14px] py-[13px] text-right text-[14px] font-bold tabular-nums">
									{calculateDerivedStats(s).eventsPlayed}
								</td>
								<td class="font-mono-system text-prem px-[14px] py-[13px] text-right text-[14px] font-bold tabular-nums">
									{s.matchesWon || 0}
								</td>
								<td class="font-mono-system text-warm px-[14px] py-[13px] text-right text-[14px] font-bold tabular-nums">
									{_sLosses}
								</td>
								<td class="font-mono-system text-ink px-[14px] py-[13px] text-right text-[14px] font-bold tabular-nums">
									{_winPct}
								</td>
								<td class="font-mono-system text-accent px-[14px] py-[13px] text-right text-[14px] font-bold tabular-nums">
									{s.totalPoints || 0}
								</td>
								<td class="px-[14px] py-[13px] text-left">
									<span class="inline-flex items-center gap-2">
										<span
											class="inline-block px-[7px] py-[3px] text-[10px] font-extrabold tracking-[0.05em] uppercase"
											style={_isChamp
												? 'background-color: #C8922E; color: #17150F;'
												: _isTop8
													? 'background-color: color-mix(in srgb, #16489E 16%, transparent); color: #16489E;'
													: 'border: 1px solid var(--ed-line2); color: var(--ed-soft);'}
										>
											{s.calculatedRank === 1
												? '1st'
												: s.calculatedRank === 2
													? '2nd'
													: s.calculatedRank === 3
														? '3rd'
														: `#${s.calculatedRank || '—'}`}
										</span>
										{#if _months.length > 0}
											<span class="text-fade group-hover:text-accent inline-block text-[12px] transition-transform {_isOpen ? 'rotate-180 text-accent' : ''}" aria-hidden="true">
												⌄
											</span>
										{/if}
									</span>
								</td>
							</tr>

							{#if _isOpen && _months.length > 0}
								<!--
									Expansion row — monthly results strip for
									the season. Each cell shows the hero
									portrait, total matches as a badge, month
									label, monthly points (or "0" for inactive
									months), and the hero name in rust. Clicking
									an active cell selects it and opens a black
									detail header + round-by-round match table
									below (rounds pulled from
									`data.matchHistory.matchesByEvent`).
								-->
								{@const _selKey = `${s.id}|${(expandedMonthKey || '').split('|')[1] || ''}`}
								{@const _selMonthName = (expandedMonthKey || '').startsWith(`${s.id}|`)
									? (expandedMonthKey || '').split('|')[1]
									: null}
								<tr class="bg-paper">
									<td colspan="8" class="p-0">
										<div class="border-line2 border-t px-7 py-5">
											<div class="mb-3 flex flex-wrap items-baseline justify-between gap-3">
												<div class="text-soft text-[10px] font-extrabold tracking-[0.18em] uppercase">
													Monthly Results
												</div>
												<div class="font-newsreader text-fade text-[12px] italic">
													Tap a month for details
												</div>
											</div>

											<!-- 12-column month strip -->
											<div class="grid grid-cols-6 gap-2 md:grid-cols-12">
												{#each _allMonths as m (m.k)}
													{@const _pts = s[`${m.k}Points`] || 0}
													{@const _mp = s[`${m.k}Matches`] || 0}
													{@const _mw = s[`${m.k}MatchesWon`] || 0}
													{@const _ml = Math.max(0, _mp - _mw)}
													{@const _active = _pts > 0 || _mp > 0}
													{@const _heroEntry = getHeroForEvent(s.season, s.circuit, m.k)}
													{@const _isSel = _selMonthName === m.k}
													{#if _active}
														<button
															type="button"
															onclick={(e) => {
																e.stopPropagation();
																toggleMonthExpand(s.id, m.k);
															}}
															class="border-line2 bg-paper-bg hover:border-accent {_isSel ? 'border-[2px] border-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--ed-accent)_15%,transparent)]' : 'border'} relative flex min-h-[120px] cursor-pointer flex-col items-center justify-end px-2 pt-3 pb-2 transition-all"
														>
															<!-- score badge top-right -->
															<span class="bg-accent text-paper-bg absolute top-0 right-0 px-[6px] py-[2px] text-[10px] font-extrabold tabular-nums">
																{_mp}
															</span>
															<!--
																Hero portrait — render only when an image is
																available. Unknown / missing heroes simply
																skip the portrait and let the cell hug the
																label/points compactly.
															-->
															{#if _heroEntry?.imageUrl}
																<!--
																	Hero image: square crop, focal point
																	pinned to the right-center of the source
																	so the character's face dominates the
																	cell instead of being cut off.
																-->
																<span
																	class="border-line2 bg-panel h-[40px] w-[40px] border"
																	style={`background-image: url('${_heroEntry.imageUrl}'); background-size: cover; background-position: right center;`}
																></span>
															{/if}
															<!-- month abbreviation -->
															<span class="font-mono-system text-accent mt-[8px] text-[11.5px] font-extrabold tracking-[0.06em] uppercase">
																{m.n}
															</span>
															<!-- points -->
															<span class="font-newsreader text-ink mt-[1px] text-[24px] leading-[1] font-semibold tabular-nums">
																{_pts}
															</span>
															<!-- hero name -->
															{#if _heroEntry?.hero}
																<span class="text-warm mt-[5px] line-clamp-1 max-w-full text-center text-[9px] font-extrabold tracking-[0.07em] uppercase">
																	{_heroEntry.hero.split(',')[0]}
																</span>
															{:else}
																<span class="text-fade mt-[5px] text-[9px] font-extrabold tracking-[0.07em] uppercase">
																	—
																</span>
															{/if}
														</button>
													{:else}
														<!--
															Inactive month — no portrait, just the
															faded label / "0" / "0–0" stack.
														-->
														<div class="border-line bg-paper flex min-h-[120px] flex-col items-center justify-end px-2 pt-3 pb-2 opacity-50">
															<span class="text-fade text-[11.5px] font-extrabold tracking-[0.06em] uppercase">
																{m.n}
															</span>
															<span class="font-newsreader text-fade mt-[1px] text-[24px] leading-[1] font-semibold tabular-nums">
																0
															</span>
															<span class="font-mono-system text-fade mt-[5px] text-[9px] font-bold tabular-nums">
																0–0
															</span>
														</div>
													{/if}
												{/each}
											</div>

											<!-- selected month detail -->
											{#if _selMonthName}
												{@const _selMatches = getMatchesForEvent(s.season, s.circuit, _selMonthName)}
												{@const _selHero = getHeroForEvent(s.season, s.circuit, _selMonthName)}
												{@const _selMonthMeta = _allMonths.find((m) => m.k === _selMonthName)}
												<div class="border-ink mt-5 border bg-paper-bg">
													<!-- black header bar -->
													<div class="bg-ink flex flex-wrap items-center justify-between gap-3 px-6 py-[14px]">
														<div class="font-newsreader text-paper-bg text-[22px] font-semibold leading-none tracking-[-0.01em]">
															{_selMonthMeta?.n} {s.season}
														</div>
														{#if _selHero?.hero}
															<span class="inline-flex items-center bg-[#C8922E] px-[14px] py-[7px] text-[12px] font-extrabold tracking-[0.02em] text-[#17150F]">
																{_selHero.hero}
															</span>
														{/if}
													</div>

													<!-- round-by-round table -->
													{#if _selMatches.length > 0}
														<table class="w-full border-collapse">
															<tbody>
																{#each _selMatches as { match }, mi (mi)}
																	{@const _isP1 = match.player1GemId === data.gemId
																		|| (!match.player1GemId && match.player1Name && match.player1Name === data.displayName)}
																	{@const _won = (_isP1 && match.winner === 'player1') || (!_isP1 && match.winner === 'player2')}
																	{@const _lost = (_isP1 && match.winner === 'player2') || (!_isP1 && match.winner === 'player1')}
																	{@const _opponentName = _isP1 ? match.player2Name : match.player1Name}
																	{@const _opponentGemId = _isP1 ? match.player2GemId : match.player1GemId}
																	{@const _opponentHero = getOpponentHero(_opponentGemId, match.year, match.circuit, match.month)}
																	{@const _opponentRank = _isP1 ? match.player2Standing : match.player1Standing}
																	<tr class="border-line hover:bg-paper border-b last:border-b-0">
																		<!-- round -->
																		<td class="font-mono-system text-fade px-6 py-[14px] text-left text-[11.5px] font-extrabold tracking-[0.06em] uppercase">
																			R{match.round}
																		</td>
																		<!-- result badge -->
																		<td class="px-3 py-[14px] text-center">
																			<span
																				class="font-archivo inline-flex h-[26px] w-[26px] items-center justify-center text-[13px] font-black text-white"
																				style={_won
																					? 'background-color: var(--ed-prem);'
																					: _lost
																						? 'background-color: var(--ed-warm);'
																						: 'background-color: var(--ed-fade);'}
																			>
																				{_won ? 'W' : _lost ? 'L' : 'D'}
																			</span>
																		</td>
																		<!-- vs label -->
																		<td class="font-mono-system text-fade px-3 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.08em] uppercase">
																			vs
																		</td>
																		<!-- opponent block -->
																		<td class="px-3 py-[14px] text-left">
																			<div class="flex items-center gap-3">
																				{#if _opponentHero?.imageUrl}
																					<span
																						class="border-line2 bg-panel h-[36px] w-[36px] flex-shrink-0 border"
																						style={`background-image: url('${_opponentHero.imageUrl}'); background-size: cover; background-position: right center;`}
																					></span>
																				{/if}
																				<div class="min-w-0">
																					{#if _opponentGemId}
																						<a href="/player/{_opponentGemId}" class="text-ink hover:text-warm block text-[14.5px] font-extrabold transition-colors">
																							{_opponentName}
																						</a>
																					{:else}
																						<span class="text-ink block text-[14.5px] font-extrabold">
																							{_opponentName}
																						</span>
																					{/if}
																					{#if _opponentHero?.hero}
																						<span class="text-warm mt-[2px] block text-[12.5px] font-bold">
																							{_opponentHero.hero}
																						</span>
																					{/if}
																				</div>
																			</div>
																		</td>
																		<!-- opponent final standing -->
																		<td class="font-mono-system text-fade px-6 py-[14px] text-right text-[11.5px] font-extrabold tracking-[0.06em] uppercase">
																			{#if _opponentRank}
																				T{_opponentRank}
																			{/if}
																		</td>
																	</tr>
																{/each}
															</tbody>
														</table>
													{:else}
														<div class="text-fade px-6 py-8 text-center text-[13px]">
															No round-by-round data for {_selMonthMeta?.n} {s.season}.
														</div>
													{/if}
												</div>
											{/if}
										</div>
									</td>
								</tr>
							{/if}
						{/each}
						<tr class="border-ink bg-panel border-t-[3px] border-double">
							<td class="text-ink px-[14px] py-[13px] text-left text-[14px] font-extrabold">
								Career
							</td>
							<td class="text-fade font-mono-system px-[14px] py-[13px] text-left text-[13px] font-semibold">
								{seasonsPlayed.length} seasons
							</td>
							<td class="font-mono-system text-ink px-[14px] py-[13px] text-right text-[15px] font-extrabold tabular-nums">
								{data.totalStats.eventsPlayed}
							</td>
							<td class="font-mono-system text-prem px-[14px] py-[13px] text-right text-[15px] font-extrabold tabular-nums">
								{data.totalStats.matchesWon}
							</td>
							<td class="font-mono-system text-warm px-[14px] py-[13px] text-right text-[15px] font-extrabold tabular-nums">
								{_losses}
							</td>
							<td class="font-mono-system text-ink px-[14px] py-[13px] text-right text-[15px] font-extrabold tabular-nums">
								{_careerWinPct}
							</td>
							<td class="font-mono-system text-accent px-[14px] py-[13px] text-right text-[15px] font-extrabold tabular-nums">
								{data.totalStats.totalPoints}
							</td>
							<td class="px-[14px] py-[13px]"></td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- ============ BOX SCORE ============ -->
	{@const _winPct = data.totalStats.matchesPlayed > 0
		? Math.round((data.totalStats.matchesWon / data.totalStats.matchesPlayed) * 100)
		: 0}
	{@const _top8Rate = data.totalStats.eventsPlayed > 0
		? Math.round((data.totalStats.top8Finishes / data.totalStats.eventsPlayed) * 100)
		: 0}
	{@const _avgPts = data.totalStats.eventsPlayed > 0
		? (data.totalStats.totalPoints / data.totalStats.eventsPlayed).toFixed(1)
		: '0.0'}
	{@const _bestRank = data.standings.reduce(
		(min, s) => (s.calculatedRank && s.calculatedRank < min ? s.calculatedRank : min),
		Infinity
	)}
	{@const _avgRank = data.standings.length > 0
		? (
				data.standings.reduce((sum, s) => sum + (s.calculatedRank || 0), 0) / data.standings.length
			).toFixed(1)
		: '—'}
	{@const _uniqCircuits = [...new Set(data.standings.map((s) => s.circuit))]}
	{@const _opponentsFaced = data.matchHistory?.headToHead?.length || 0}
	{@const _longestRun = data.matchHistory?.longestWinStreak || 0}
	{@const _currentStreak = data.matchHistory?.currentWinStreak || 0}
	<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[40px]">
		<div class="mb-7 flex flex-wrap items-end justify-between gap-5">
			<div>
				<div class="text-accent mb-[7px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
					Box Score
				</div>
				<h2 class="font-newsreader text-[30px] font-semibold leading-none tracking-[-0.02em]">
					By the Numbers
				</h2>
			</div>
			<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em] uppercase">
				Career performance metrics
			</span>
		</div>

		<!--
			Reorganized into a magazine-style "stat spread":
			(1) a wide hero panel that anchors the eye with the most
			notable rate stat + a visual progress bar, and (2) three
			labeled category bands (Output / Reach / Peak) — each
			grouped on a colored top-rule so a reader can scan
			"how productive, how broad, how high" in three lateral
			passes instead of reading 10 cards in a flat grid.
		-->

		<!-- ============ HERO STAT ============ -->
		<div class="border-ink relative mb-5 overflow-hidden border bg-[#080B15] text-white">
			<!-- background watermark -->
			<span
				class="font-archivo pointer-events-none absolute -top-12 right-[40px] z-0 text-[280px] leading-[0.7] font-black tabular-nums opacity-[0.04]"
				aria-hidden="true"
			>
				{_top8Rate}
			</span>

			<div class="relative z-[1] grid grid-cols-1 gap-y-6 px-9 py-7 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-x-10">
				<!-- left: featured -->
				<div>
					<div class="mb-3 inline-flex items-center gap-[10px] text-[10px] font-extrabold tracking-[0.18em] text-[#F4C66A] uppercase before:block before:h-[2px] before:w-[22px] before:bg-[#F4C66A] before:content-['']">
						Featured Metric · Conversion
					</div>
					<div class="flex items-baseline gap-3">
						<span class="font-archivo text-[88px] leading-[0.78] font-black tracking-[-0.03em] tabular-nums text-[#F4C66A]">
							{_top8Rate}<span class="text-[44px] text-[#F4C66A]/70">%</span>
						</span>
					</div>
					<div class="mt-3 text-[13px] font-extrabold tracking-[0.05em] uppercase text-white">
						Top 8 Rate
					</div>
					<div class="text-fade mt-[6px] text-[13px] font-semibold" style="color: #8C93A6;">
						{data.totalStats.top8Finishes} Top 8 finish{data.totalStats.top8Finishes === 1 ? '' : 'es'} across {data.totalStats.eventsPlayed} events
					</div>
				</div>

				<!-- right: progress bar visualization -->
				<div>
					<div class="font-mono-system mb-[10px] flex items-baseline justify-between gap-2 text-[9.5px] font-bold tracking-[0.1em] uppercase">
						<span style="color: #8C93A6;">Conversion scale</span>
						<span class="text-[#F4C66A]">{_top8Rate} / 100</span>
					</div>
					<div class="relative h-[14px] overflow-hidden bg-white/10">
						<span
							class="absolute inset-y-0 left-0 block bg-[#F4C66A]"
							style="width: {_top8Rate}%;"
						></span>
						<!-- tick marks at 25 / 50 / 75 -->
						{#each [25, 50, 75] as t (t)}
							<span class="absolute inset-y-0 w-px bg-white/30" style="left: {t}%;" aria-hidden="true"></span>
						{/each}
					</div>
					<div class="font-mono-system mt-[6px] flex justify-between text-[9.5px] font-bold tabular-nums" style="color: #6B7280;">
						<span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
					</div>
				</div>
			</div>
		</div>

		<!-- ============ CATEGORY GROUPS ============ -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<!-- ============ OUTPUT ============ -->
			<div class="border-line2 bg-paper-bg border">
				<div class="border-line2 flex items-baseline justify-between border-b px-5 py-[10px]">
					<span class="font-mono-system inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.16em] uppercase" style="color: #1C7A4B;">
						<span class="block h-[8px] w-[8px]" style="background-color: #1C7A4B;"></span>
						Output
					</span>
					<span class="text-fade text-[10.5px] font-bold tracking-[0.04em] uppercase">
						how productive
					</span>
				</div>
				<div class="grid grid-cols-2 divide-x divide-[#E4DECF]">
					<div class="flex flex-col items-start justify-center px-5 py-[18px]">
						<div class="font-archivo text-[38px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums" style="color: #1C7A4B;">
							{_winPct}<span class="text-[22px] text-[#1C7A4B]/65">%</span>
						</div>
						<div class="text-ink mt-[10px] text-[11px] font-extrabold tracking-[0.1em] uppercase">
							Win Rate
						</div>
						<div class="text-fade mt-[3px] text-[11px] font-semibold">
							{data.totalStats.matchesWon} of {data.totalStats.matchesPlayed} matches
						</div>
					</div>
					<div class="flex flex-col items-start justify-center px-5 py-[18px]">
						<div class="font-archivo text-ink text-[38px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums">
							{_avgPts}
						</div>
						<div class="text-ink mt-[10px] text-[11px] font-extrabold tracking-[0.1em] uppercase">
							Avg Pts / Event
						</div>
						<div class="text-fade mt-[3px] text-[11px] font-semibold">
							{data.totalStats.totalPoints} total ÷ {data.totalStats.eventsPlayed} events
						</div>
					</div>
				</div>
			</div>

			<!-- ============ REACH ============ -->
			<div class="border-line2 bg-paper-bg border">
				<div class="border-line2 flex items-baseline justify-between border-b px-5 py-[10px]">
					<span class="font-mono-system inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.16em] uppercase" style="color: #16489E;">
						<span class="block h-[8px] w-[8px]" style="background-color: #16489E;"></span>
						Reach
					</span>
					<span class="text-fade text-[10.5px] font-bold tracking-[0.04em] uppercase">
						how broad
					</span>
				</div>
				<div class="grid grid-cols-3 divide-x divide-[#E4DECF]">
					<div class="flex flex-col items-start justify-center px-4 py-[18px]">
						<div class="font-archivo text-ink text-[34px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums">
							{data.totalStats.eventsPlayed}
						</div>
						<div class="text-ink mt-[10px] text-[10px] font-extrabold tracking-[0.1em] uppercase">
							Events
						</div>
						<div class="text-fade mt-[3px] text-[10.5px] font-semibold">
							{seasonsPlayed.length} seasons
						</div>
					</div>
					<div class="flex flex-col items-start justify-center px-4 py-[18px]">
						<div class="font-archivo text-ink text-[34px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums">
							{data.totalStats.matchesPlayed || 0}
						</div>
						<div class="text-ink mt-[10px] text-[10px] font-extrabold tracking-[0.1em] uppercase">
							Matches
						</div>
						<div class="text-fade mt-[3px] text-[10.5px] font-semibold">
							games logged
						</div>
					</div>
					<div class="flex flex-col items-start justify-center px-4 py-[18px]">
						<div class="font-archivo text-ink text-[34px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums">
							{_opponentsFaced}
						</div>
						<div class="text-ink mt-[10px] text-[10px] font-extrabold tracking-[0.1em] uppercase">
							Opponents
						</div>
						<div class="text-fade mt-[3px] text-[10.5px] font-semibold">
							faced
						</div>
					</div>
				</div>
			</div>

			<!-- ============ PEAK ============ -->
			<div class="border-line2 bg-paper-bg border">
				<div class="border-line2 flex items-baseline justify-between border-b px-5 py-[10px]">
					<span class="font-mono-system inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.16em] uppercase" style="color: #C0461F;">
						<span class="block h-[8px] w-[8px]" style="background-color: #C0461F;"></span>
						Peak
					</span>
					<span class="text-fade text-[10.5px] font-bold tracking-[0.04em] uppercase">
						how high
					</span>
				</div>
				<div class="grid grid-cols-3 divide-x divide-[#E4DECF]">
					<div class="flex flex-col items-start justify-center px-4 py-[18px]">
						<div class="font-archivo text-[34px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums" style="color: #C8922E;">
							{_bestRank === Infinity ? '—' : `#${_bestRank}`}
						</div>
						<div class="text-ink mt-[10px] text-[10px] font-extrabold tracking-[0.1em] uppercase">
							Best Rank
						</div>
						<div class="text-fade mt-[3px] text-[10.5px] font-semibold">
							avg #{_avgRank}
						</div>
					</div>
					<div class="flex flex-col items-start justify-center px-4 py-[18px]">
						<div class="font-archivo text-warm text-[34px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums">
							{_longestRun}
						</div>
						<div class="text-ink mt-[10px] text-[10px] font-extrabold tracking-[0.1em] uppercase">
							Best Run
						</div>
						<div class="text-fade mt-[3px] text-[10.5px] font-semibold">
							consecutive wins
						</div>
					</div>
					<div class="flex flex-col items-start justify-center px-4 py-[18px]">
						<div class="font-archivo text-[34px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums {_currentStreak > 0 ? 'text-warm' : 'text-fade'}">
							{_currentStreak > 0 ? `W${_currentStreak}` : '—'}
						</div>
						<div class="text-ink mt-[10px] text-[10px] font-extrabold tracking-[0.1em] uppercase">
							Current
						</div>
						<div class="text-fade mt-[3px] text-[10.5px] font-semibold">
							active streak
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ RATING PERCENTILES TABLE ============ -->
	<section class="border-ink border-b-[3px] border-double px-14 py-[40px]">
		<div class="mb-5 flex flex-wrap items-end justify-between gap-5">
			<div>
				<div class="text-accent mb-[7px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
					Advanced
				</div>
				<h2 class="font-newsreader text-[30px] font-semibold leading-none tracking-[-0.02em]">
					AGE Rating — Component Percentiles
				</h2>
			</div>
			<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em] uppercase">
				Percentile vs {_rating.totalPlayers} rated players
			</span>
		</div>

		<div class="border-line2 grid grid-cols-1 border bg-paper-bg lg:grid-cols-[1.7fr_1fr]">
			<!-- table -->
			<div class="border-line2 overflow-hidden lg:border-r">
				<table class="w-full border-collapse">
					<thead>
						<tr>
							{#each [
								{ k: 'Component', l: true },
								{ k: 'WT' },
								{ k: 'Score' },
								{ k: '%ile' },
								{ k: 'Distribution', l: true, w: 'w-[150px]' }
							] as h (h.k)}
								<th
									class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-[10px] font-extrabold tracking-[0.1em] uppercase {h.l ? 'text-left' : 'text-right'} {h.w || ''}"
								>
									{h.k}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each [
							{ nm: 'Win Rate', wt: 25, sc: _rating.breakdown.winRate, mx: 25, pc: _rating.percentiles.winRate },
							{ nm: 'Top 8 Rate', wt: 25, sc: _rating.breakdown.top8, mx: 25, pc: _rating.percentiles.top8Rate },
							{ nm: 'Peak Rank', wt: 20, sc: _rating.breakdown.peak, mx: 20, pc: _rating.percentiles.bestRank },
							{ nm: 'Efficiency', wt: 15, sc: _rating.breakdown.efficiency, mx: 15, pc: _rating.percentiles.efficiency },
							{ nm: 'Experience', wt: 10, sc: _rating.breakdown.experience, mx: 10, pc: _rating.percentiles.experience },
							{ nm: 'Championship', wt: 5, sc: _rating.breakdown.championship, mx: 5, pc: _rating.percentiles.championship }
						] as r, i (r.nm)}
							<tr class="border-line {i % 2 === 1 ? 'bg-ink/3' : ''} hover:bg-accent/10 border-t transition-colors">
								<td class="text-ink px-[14px] py-[12px] text-left text-[13.5px] font-bold">
									{r.nm}
								</td>
								<td class="font-mono-system text-fade px-[14px] py-[12px] text-right text-[13.5px] font-semibold tabular-nums">
									{r.wt}
								</td>
								<td class="font-mono-system text-ink px-[14px] py-[12px] text-right text-[13.5px] font-bold tabular-nums">
									{r.sc.toFixed(1)}
									<span class="text-fade font-semibold"> / {r.mx}</span>
								</td>
								<td class="font-mono-system px-[14px] py-[12px] text-right text-[13.5px] font-bold tabular-nums {r.pc >= 90 ? 'text-[#C8922E]' : 'text-accent'}">
									{Math.round(r.pc)}<sup class="text-[9px]">{r.pc >= 90 ? 'th' : Math.round(r.pc) % 10 === 1 && Math.round(r.pc) !== 11 ? 'st' : Math.round(r.pc) % 10 === 2 && Math.round(r.pc) !== 12 ? 'nd' : Math.round(r.pc) % 10 === 3 && Math.round(r.pc) !== 13 ? 'rd' : 'th'}</sup>
								</td>
								<td class="px-[14px] py-[12px]">
									<span class="bg-panel relative inline-block h-[7px] w-[110px] align-middle">
										<span class="bg-accent absolute inset-y-0 left-0 block" style="width: {r.pc}%;"></span>
										<span class="bg-ink/45 absolute top-[-3px] bottom-[-3px] w-[2px]" style="left: 50%;"></span>
									</span>
								</td>
							</tr>
						{/each}
						<tr class="border-ink bg-panel border-t-[3px] border-double">
							<td class="text-ink px-[14px] py-[13px] text-left text-[14px] font-extrabold">
								AGE Rating
							</td>
							<td class="font-mono-system text-ink px-[14px] py-[13px] text-right text-[14px] font-extrabold tabular-nums">
								100
							</td>
							<td class="font-mono-system text-[#C8922E] px-[14px] py-[13px] text-right text-[14px] font-extrabold tabular-nums">
								{_rating.total.toFixed(1)}
							</td>
							<td class="px-[14px] py-[13px] text-right text-[14px] font-extrabold tabular-nums" style="color: {_tierHex};">
								— · {_tierLabel}
							</td>
							<td class="text-fade px-[14px] py-[13px] text-left text-[12px] font-semibold">
								{_tier.description}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- summary -->
			<div class="bg-paper flex flex-col p-6">
				<div class="font-archivo text-[84px] leading-[0.8] font-black tracking-[-0.03em] tabular-nums" style="color: {_tierHex};">
					{_rating.total}<sup class="text-fade ml-1 text-[24px] font-extrabold">/100</sup>
				</div>
				<span
					class="font-mono-system mt-4 mb-[14px] inline-flex items-center gap-2 self-start px-[12px] py-[6px] text-[11px] font-bold tracking-[0.1em] text-[#0E1220] uppercase"
					style="background-color: {_tierHex};"
				>
					★ {_tierLabel} Tier
				</span>
				<p class="text-soft text-[13px] leading-[1.6]">
					Weighted across <b class="text-ink">six components</b>; a harsh power curve makes high
					scores hard to reach — the median player credits ~35%.
				</p>
				<div class="text-soft border-line2 mt-auto border-t pt-4 text-[11px] leading-[1.55]">
					<b class="text-ink">Tiers:</b> Elite 90+ · Premier 80+ · Distinguished 70+ · Competitive 60+.
					The dark tick marks league median (50th).
				</div>
			</div>
		</div>
	</section>

	<!-- ============ ARSENAL ============ -->
	{#if data.heroUsage && data.heroUsage.length > 0}
		{@const _maxUse = Math.max(...data.heroUsage.map((h) => h.count))}
		{@const _sig = data.heroUsage[0]}
		{@const _sigBackdrop = heroBackdropUrl(_sig.hero)}
		{@const _best = data.decklists?.[0] || null}
		{@const _bestBackdrop = _best ? heroBackdropUrl(_best.decklist.hero) : null}
		<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[40px]">
			<div class="mb-5 flex flex-wrap items-end justify-between gap-5">
				<div>
					<div class="text-accent mb-[7px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
						Arsenal
					</div>
					<h2 class="font-newsreader text-[30px] font-semibold leading-none tracking-[-0.02em]">
						Heroes Played
					</h2>
				</div>
				<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em] uppercase">
					Usage · {data.heroUsage.reduce((s, h) => s + h.count, 0)} logged events
				</span>
			</div>

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1.55fr_1fr]">
				<!-- heroes table -->
				<div class="border-line2 overflow-hidden border bg-paper-bg">
					<table class="w-full border-collapse">
						<thead>
							<tr>
								<th class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-left text-[10px] font-extrabold tracking-[0.1em] uppercase">
									Hero
								</th>
								<th class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-right text-[10px] font-extrabold tracking-[0.1em] uppercase">
									Events
								</th>
								<th class="bg-ink text-paper-bg whitespace-nowrap w-[150px] px-[14px] py-3 text-left text-[10px] font-extrabold tracking-[0.1em] uppercase">
									Usage
								</th>
							</tr>
						</thead>
						<tbody>
							{#each data.heroUsage as h, i (h.hero)}
								<tr class="border-line {i % 2 === 1 ? 'bg-ink/3' : ''} hover:bg-accent/10 border-t transition-colors">
									<td class="px-[14px] py-[12px] text-left">
										<span class="inline-flex items-center gap-[11px]">
											<span class="border-line2 bg-panel h-[30px] w-[30px] flex-shrink-0 rounded-full border bg-cover bg-top" style={h.imageUrl ? `background-image: url('${h.imageUrl}');` : ''}></span>
											<span class="text-ink text-[13.5px] font-bold">{h.hero}</span>
										</span>
									</td>
									<td class="font-mono-system text-ink px-[14px] py-[12px] text-right text-[14px] font-bold tabular-nums">
										{h.count}×
									</td>
									<td class="px-[14px] py-[12px]">
										<span class="bg-panel relative inline-block h-[8px] w-[120px] align-middle">
											<span class="bg-warm absolute inset-y-0 left-0 block" style="width: {(h.count / _maxUse) * 100}%;"></span>
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- callouts -->
				<div class="flex flex-col gap-4">
					<div
						class="border-line2 relative flex min-h-[150px] flex-1 items-end overflow-hidden border bg-[#17150F] bg-cover bg-top"
						style={_sigBackdrop ? `background-image: url('${_sigBackdrop}');` : ''}
					>
						<span class="pointer-events-none absolute inset-0" style="background: linear-gradient(0deg, rgba(12,13,18,0.92) 16%, rgba(12,13,18,0.15) 75%);" aria-hidden="true"></span>
						<div class="relative z-[1] p-5 text-white">
							<div class="font-mono-system mb-[7px] text-[9.5px] font-bold tracking-[0.14em] uppercase" style="color: #F4C66A;">
								Signature Hero · Most Played
							</div>
							<h4 class="font-newsreader text-[22px] leading-[1.02] font-semibold text-white">
								{_sig.hero}
							</h4>
							<div class="mt-[7px] text-[11.5px] font-semibold" style="color: #C7BFA9;">
								{_sig.count} event{_sig.count === 1 ? '' : 's'}
							</div>
						</div>
					</div>

					{#if _best}
						<a
							href="/age-open/{_best.event?.id}/decklist/{_best.decklist.id}"
							class="border-line2 relative flex min-h-[150px] flex-1 items-end overflow-hidden border bg-[#17150F] bg-cover bg-top"
							style={_bestBackdrop ? `background-image: url('${_bestBackdrop}');` : ''}
						>
							<span class="pointer-events-none absolute inset-0" style="background: linear-gradient(0deg, rgba(12,13,18,0.92) 16%, rgba(12,13,18,0.15) 75%);" aria-hidden="true"></span>
							{#if _best.decklist.placement && _best.decklist.placement <= 3}
								<span class="font-archivo absolute top-0 left-0 z-[1] px-[9px] py-[5px] text-[11px] font-black uppercase" style="background-color: #C8922E; color: #17150F;">
									{_best.decklist.placement === 1 ? '1st' : _best.decklist.placement === 2 ? '2nd' : '3rd'}
								</span>
							{/if}
							<div class="relative z-[1] p-5 text-white">
								<div class="font-mono-system mb-[7px] text-[9.5px] font-bold tracking-[0.14em] uppercase" style="color: #F4C66A;">
									Best Result · Decklist
								</div>
								<h4 class="font-newsreader text-[22px] leading-[1.02] font-semibold text-white">
									{_best.decklist.hero || 'Decklist'}
								</h4>
								<div class="mt-[7px] text-[11.5px] font-semibold" style="color: #C7BFA9;">
									{_best.event?.circuit || ''}{_best.decklist.format ? ` · ${_best.decklist.format}` : ''}
								</div>
							</div>
						</a>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<!-- ============ HEAD TO HEAD ============ -->
	{#if data.matchHistory && data.matchHistory.headToHead && data.matchHistory.headToHead.length > 0}
		{@const _nem = data.matchHistory.nemesis}
		{@const _best = data.matchHistory.bestMatchup}
		{@const _topWins = [...data.matchHistory.headToHead].filter((h) => h.wins > 0).sort((a, b) => b.wins - a.wins).slice(0, 4)}
		{@const _topLoss = [...data.matchHistory.headToHead].filter((h) => h.losses > 0).sort((a, b) => b.losses - a.losses).slice(0, 4)}
		{@const _topPlayed = [...data.matchHistory.headToHead].sort((a, b) => (b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws)).slice(0, 4)}
		<section class="border-ink border-b-[3px] border-double px-14 py-[40px]">
			<div class="mb-5 flex flex-wrap items-end justify-between gap-5">
				<div>
					<div class="text-accent mb-[7px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
						Head to Head
					</div>
					<h2 class="font-newsreader text-[30px] font-semibold leading-none tracking-[-0.02em]">
						Player vs Player
					</h2>
				</div>
				<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em] uppercase">
					{data.matchHistory.headToHead.length} opponents faced
				</span>
			</div>

			<!-- ============ H2H LOOKUP ============ -->
			<!--
				Searchable opponent lookup. Filtered by `opponentSearchQuery`
				through the existing `filteredHeadToHead` derived value;
				picking a row populates `selectedOpponent`, which drives
				the result card below (summary + meeting table from
				`data.matchHistory.matchesByEvent`).
			-->
			<div class="mb-6">
				<div class="mb-3 flex flex-wrap items-baseline gap-3">
					<span class="text-ink text-[13px] font-extrabold tracking-[0.02em]">
						Look up an opponent
					</span>
					<span class="text-soft text-[12.5px]">
						Search any of the {data.matchHistory.headToHead.length} players for a full head-to-head breakdown.
					</span>
				</div>

				<div
					class="border-ink bg-paper-bg relative flex h-[54px] items-center gap-3 border-[1.5px] px-4 {showOpponentDropdown ? 'outline-[3px] outline-accent/20' : ''}"
				>
					<svg class="text-fade h-[19px] w-[19px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
						<circle cx="11" cy="11" r="7" />
						<line x1="21" y1="21" x2="16.5" y2="16.5" />
					</svg>
					<input
						type="text"
						bind:value={opponentSearchQuery}
						placeholder="Search a player you've faced…"
						oninput={() => (showOpponentDropdown = true)}
						onfocus={() => (showOpponentDropdown = true)}
						onblur={() => setTimeout(() => (showOpponentDropdown = false), 140)}
						class="text-ink placeholder:text-fade min-w-0 flex-1 appearance-none border-0 bg-transparent text-[16px] font-semibold shadow-none outline-none focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
					/>
					{#if opponentSearchQuery}
						<button
							type="button"
							onmousedown={(e) => {
								e.preventDefault();
								clearOpponentSelection();
							}}
							class="bg-panel text-soft hover:bg-ink hover:text-paper-bg flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center border-0 text-[15px] leading-none"
							aria-label="Clear search"
						>
							×
						</button>
					{/if}

					{#if showOpponentDropdown}
						{@const _matches = filteredHeadToHead().slice(0, 30)}
						<!-- dropdown panel -->
						<div
							class="border-ink bg-paper-bg absolute -inset-x-[1.5px] top-[calc(100%+5px)] z-30 max-h-[288px] overflow-auto border-[1.5px] shadow-[0_18px_40px_rgba(23,21,15,0.16)]"
						>
							{#if _matches.length === 0}
								<div class="text-soft px-4 py-4 text-[13px]">
									No faced opponent matches “{opponentSearchQuery}”.
								</div>
							{:else}
								{#each _matches as m, mi (m.opponentGemId || m.opponentName)}
									{@const _games = m.wins + m.losses + (m.draws || 0)}
									{@const _isAct = selectedOpponentKey === (m.opponentGemId || m.opponentName)}
									<button
										type="button"
										onmousedown={(e) => {
											e.preventDefault();
											selectOpponent(m);
										}}
										class="border-line {_isAct ? 'bg-paper' : 'hover:bg-paper'} grid w-full grid-cols-[1fr_auto] items-center gap-3 border-0 border-b bg-transparent px-4 py-3 text-left cursor-pointer last:border-b-0"
									>
										<div>
											<div class="font-newsreader text-ink text-[17px] font-semibold">
												{m.opponentName}
											</div>
											<div class="text-fade mt-[2px] text-[11.5px] font-semibold">
												{_games} game{_games === 1 ? '' : 's'}
												{#if m.opponentGemId} · GEM {m.opponentGemId}{/if}
											</div>
										</div>
										<div class="font-mono-system text-[14px] font-bold tabular-nums">
											<span class="text-prem">{m.wins}</span>
											<span class="text-fade">–</span>
											<span class="text-warm">{m.losses}</span>
										</div>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				<!-- result card -->
				{#if selectedOpponent()}
					{@const o = selectedOpponent()}
					{@const _games = o.wins + o.losses + (o.draws || 0)}
					{@const _wr = _games ? Math.round((o.wins / _games) * 100) : 0}
					{@const _lead = o.wins > o.losses
						? `${data.displayName} leads the series`
						: o.wins < o.losses
							? `${data.displayName} trails the series`
							: 'Series even'}
					{@const _meetings = opponentMatches()}
					{@const _lastResult = _meetings[0]?.match.winner
						? (_meetings[0].match.player1GemId === data.gemId
								? _meetings[0].match.winner === 'player1'
								: _meetings[0].match.winner === 'player2')
							? 'Won'
							: 'Lost'
						: '—'}
					<div class="border-ink bg-paper mt-[18px] border-[1.5px]">
						<!-- header -->
						<div class="border-line2 flex flex-wrap items-center justify-between gap-6 border-b px-[26px] py-[22px]">
							<div>
								<div class="text-accent mb-[9px] text-[10px] font-extrabold tracking-[0.14em] uppercase">
									Head-to-Head Record
								</div>
								<div class="font-newsreader text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">
									{data.displayName}
									<span class="font-newsreader text-fade text-[20px] italic font-normal">vs</span>
									{#if o.opponentGemId}
										<a href="/player/{o.opponentGemId}" class="hover:text-warm transition-colors">
											{o.opponentName}
										</a>
									{:else}
										{o.opponentName}
									{/if}
								</div>
								<div class="text-soft mt-[11px] text-[12.5px] font-semibold">
									{#if o.opponentGemId}GEM {o.opponentGemId}{:else}Local opponent{/if}
								</div>
							</div>
							<div class="flex-shrink-0 text-right">
								<div class="font-archivo text-[52px] leading-[0.85] font-black tracking-[-0.03em] tabular-nums">
									<span class="text-prem">{o.wins}</span>
									<span class="text-line2 mx-1">–</span>
									<span class="text-warm">{o.losses}</span>
								</div>
								<div class="font-mono-system text-soft mt-[9px] text-[10px] font-bold tracking-[0.08em] uppercase">
									{_lead}
								</div>
							</div>
						</div>

						<!-- mini stat row -->
						<div class="border-line2 grid grid-cols-2 border-b sm:grid-cols-4">
							{#each [
								{ v: _games, l: 'Matches', cls: '' },
								{ v: `${_wr}%`, l: 'Win Rate', cls: _wr >= 50 ? 'text-prem' : 'text-warm' },
								{ v: _lastResult, l: 'Last Meeting', cls: _lastResult === 'Won' ? 'text-prem' : _lastResult === 'Lost' ? 'text-warm' : '' },
								{ v: _meetings.length, l: 'On Record', cls: '' }
							] as st (st.l)}
								<div class="border-line border-r px-5 py-[15px] last:border-r-0">
									<div class="font-archivo text-[23px] leading-[0.85] font-black tabular-nums {st.cls || ''}">
										{st.v}
									</div>
									<div class="text-fade mt-2 text-[9px] font-extrabold tracking-[0.1em] uppercase">
										{st.l}
									</div>
								</div>
							{/each}
						</div>

						<!--
							Meetings table — for each match, show the year and
							round/table on the left, then this player and the
							opponent side-by-side with their hero portraits
							pulled from `heroByEvent` / `opponentHeroMap`,
							then the result badge from this player's POV.
						-->
						{#if _meetings.length > 0}
							<table class="w-full border-collapse">
								<thead>
									<tr>
										{#each [
											{ k: 'Year', l: true },
											{ k: 'Round / Table', l: true },
											{ k: data.displayName, l: true },
											{ k: o.opponentName, l: true },
											{ k: 'Result' }
										] as h (h.k)}
											<th class="border-line2 text-fade border-b px-[20px] py-[11px] text-[9.5px] font-extrabold tracking-[0.12em] uppercase {h.l ? 'text-left' : 'text-right'}">
												{h.k}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each _meetings as { match, event }, mi (mi)}
										{@const _isP1 = match.player1GemId === data.gemId
											|| (!match.player1GemId && match.player1Name && match.player1Name === data.displayName)}
										{@const _won = (_isP1 && match.winner === 'player1') || (!_isP1 && match.winner === 'player2')}
										{@const _lost = (_isP1 && match.winner === 'player2') || (!_isP1 && match.winner === 'player1')}
										{@const _myHero = getHeroForEvent(event.year, event.circuit, event.month)}
										{@const _opponentGemId = _isP1 ? match.player2GemId : match.player1GemId}
										{@const _theirHero = getOpponentHero(_opponentGemId, event.year, event.circuit, event.month)}
										<tr class="border-line hover:bg-paper-bg border-b last:border-b-0">
											<!-- year -->
											<td class="font-mono-system text-soft px-[20px] py-[14px] text-left align-middle text-[12.5px] font-bold tabular-nums">
												<div class="text-ink text-[13.5px] font-extrabold">
													{event.year}
												</div>
												<div class="text-fade mt-[2px] text-[10.5px] font-bold tracking-[0.04em] uppercase">
													{event.month?.slice(0, 3) || ''}
												</div>
											</td>
											<!-- round / table -->
											<td class="px-[20px] py-[14px] text-left align-middle">
												<div class="font-mono-system text-ink text-[12.5px] font-extrabold tracking-[0.06em] uppercase">
													R{match.round}
												</div>
												{#if match.table}
													<div class="font-mono-system text-fade mt-[2px] text-[10.5px] font-bold tracking-[0.04em] uppercase">
														Table {match.table}
													</div>
												{/if}
											</td>
											<!-- player's hero -->
											<td class="px-[20px] py-[14px] text-left align-middle">
												<div class="flex items-center gap-3">
													{#if _myHero?.imageUrl}
														<span
															class="border-line2 bg-panel h-[32px] w-[32px] flex-shrink-0 rounded-full border bg-cover bg-top"
															style={`background-image: url('${_myHero.imageUrl}');`}
														></span>
													{/if}
													<div class="min-w-0">
														<div class="text-ink truncate text-[13px] font-extrabold leading-tight">
															{data.displayName}
														</div>
														{#if _myHero?.hero}
															<div class="text-warm mt-[2px] truncate text-[11.5px] font-bold leading-tight">
																{_myHero.hero}
															</div>
														{/if}
													</div>
												</div>
											</td>
											<!-- opponent's hero -->
											<td class="px-[20px] py-[14px] text-left align-middle">
												<div class="flex items-center gap-3">
													{#if _theirHero?.imageUrl}
														<span
															class="border-line2 bg-panel h-[32px] w-[32px] flex-shrink-0 rounded-full border bg-cover bg-top"
															style={`background-image: url('${_theirHero.imageUrl}');`}
														></span>
													{/if}
													<div class="min-w-0">
														{#if _opponentGemId}
															<a href="/player/{_opponentGemId}" class="text-ink hover:text-warm block truncate text-[13px] font-extrabold leading-tight transition-colors">
																{o.opponentName}
															</a>
														{:else}
															<span class="text-ink block truncate text-[13px] font-extrabold leading-tight">
																{o.opponentName}
															</span>
														{/if}
														{#if _theirHero?.hero}
															<div class="text-warm mt-[2px] truncate text-[11.5px] font-bold leading-tight">
																{_theirHero.hero}
															</div>
														{/if}
													</div>
												</div>
											</td>
											<!-- result -->
											<td class="px-[20px] py-[14px] text-right align-middle">
												<span
													class="font-archivo inline-flex h-[26px] w-[26px] items-center justify-center text-[13px] font-black text-white"
													style={_won
														? 'background-color: var(--ed-prem);'
														: _lost
															? 'background-color: var(--ed-warm);'
															: 'background-color: var(--ed-fade);'}
												>
													{_won ? 'W' : _lost ? 'L' : 'D'}
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				{/if}
			</div>

			<div class="grid grid-cols-1 gap-[18px] mb-6 md:grid-cols-2">
				{#if _nem}
					<div class="border-line2 border-warm bg-paper-bg flex items-center justify-between border border-l-[4px] px-[22px] py-5">
						<div>
							<div class="text-fade text-[10px] font-extrabold tracking-[0.12em] uppercase">
								Nemesis
							</div>
							{#if _nem.opponentGemId}
								<a href="/player/{_nem.opponentGemId}" class="font-newsreader hover:text-warm mt-2 block text-[24px] font-semibold transition-colors">
									{_nem.opponentName}
								</a>
							{:else}
								<div class="font-newsreader mt-2 text-[24px] font-semibold">{_nem.opponentName}</div>
							{/if}
						</div>
						<div class="text-right">
							<div class="font-mono-system text-[15px] font-bold tabular-nums">
								<span class="text-warm">{_nem.losses}</span>
								<span class="text-fade">–</span>
								<span class="text-prem">{_nem.wins}</span>
							</div>
							<div class="text-fade mt-[5px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
								Player record
							</div>
						</div>
					</div>
				{/if}
				{#if _best}
					<div class="border-line2 border-prem bg-paper-bg flex items-center justify-between border border-l-[4px] px-[22px] py-5">
						<div>
							<div class="text-fade text-[10px] font-extrabold tracking-[0.12em] uppercase">
								Best Matchup
							</div>
							{#if _best.opponentGemId}
								<a href="/player/{_best.opponentGemId}" class="font-newsreader hover:text-warm mt-2 block text-[24px] font-semibold transition-colors">
									{_best.opponentName}
								</a>
							{:else}
								<div class="font-newsreader mt-2 text-[24px] font-semibold">{_best.opponentName}</div>
							{/if}
						</div>
						<div class="text-right">
							<div class="font-mono-system text-[15px] font-bold tabular-nums">
								<span class="text-prem">{_best.wins}</span>
								<span class="text-fade">–</span>
								<span class="text-warm">{_best.losses}</span>
							</div>
							<div class="text-fade mt-[5px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
								Player record
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- mini tables -->
			<div class="grid grid-cols-1 gap-[18px] md:grid-cols-3">
				{#each [
					{ title: 'Most Wins Against', col3: 'W–L', rows: _topWins, color: 'text-accent', fmt: (r) => `${r.wins}–${r.losses}` },
					{ title: 'Most Losses Against', col3: 'W–L', rows: _topLoss, color: 'text-warm', fmt: (r) => `${r.wins}–${r.losses}` },
					{ title: 'Most Played', col3: 'Games', rows: _topPlayed, color: 'text-accent', fmt: (r) => r.wins + r.losses + r.draws }
				] as t, i (i)}
					<div class="border-line2 overflow-hidden border bg-paper-bg">
						<table class="w-full border-collapse">
							<thead>
								<tr>
									<th class="bg-ink text-paper-bg px-[14px] py-3 text-right text-[10px] font-extrabold tracking-[0.1em] uppercase">#</th>
									<th class="bg-ink text-paper-bg px-[14px] py-3 text-left text-[10px] font-extrabold tracking-[0.1em] uppercase">
										{t.title}
									</th>
									<th class="bg-ink text-paper-bg px-[14px] py-3 text-right text-[10px] font-extrabold tracking-[0.1em] uppercase">
										{t.col3}
									</th>
								</tr>
							</thead>
							<tbody>
								{#each t.rows as r, ri (r.opponentName + ri)}
									<tr class="border-line {ri % 2 === 1 ? 'bg-ink/3' : ''} border-t">
										<td class="font-mono-system text-fade px-[14px] py-[13px] text-right text-[13px] font-bold tabular-nums">
											{ri + 1}
										</td>
										<td class="text-ink px-[14px] py-[13px] text-left text-[13px] font-bold">
											{#if r.opponentGemId}
												<a href="/player/{r.opponentGemId}" class="hover:text-warm transition-colors">
													{r.opponentName}
												</a>
											{:else}
												{r.opponentName}
											{/if}
										</td>
										<td class="font-mono-system px-[14px] py-[13px] text-right text-[13px] font-bold tabular-nums {t.color}">
											{t.fmt(r)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- ============ DECKLISTS ============ -->
	{#if data.decklists && data.decklists.length > 0}
		<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[40px]">
			<div class="mb-5 flex flex-wrap items-end justify-between gap-5">
				<div>
					<div class="text-accent mb-[7px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
						Tournament Lists
					</div>
					<h2 class="font-newsreader text-[30px] font-semibold leading-none tracking-[-0.02em]">
						Decklists
					</h2>
				</div>
				<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em] uppercase">
					{data.decklists.length} {data.decklists.length === 1 ? 'list' : 'lists'}
				</span>
			</div>

			<div class="border-line2 overflow-hidden border bg-paper-bg">
				<table class="w-full border-collapse">
					<thead>
						<tr>
							<th class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-left text-[10px] font-extrabold tracking-[0.1em] uppercase">
								Hero
							</th>
							<th class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-left text-[10px] font-extrabold tracking-[0.1em] uppercase">
								Event
							</th>
							<th class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-left text-[10px] font-extrabold tracking-[0.1em] uppercase">
								Date
							</th>
							<th class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-right text-[10px] font-extrabold tracking-[0.1em] uppercase">
								Finish
							</th>
							<th class="bg-ink text-paper-bg whitespace-nowrap px-[14px] py-3 text-right text-[10px] font-extrabold tracking-[0.1em] uppercase"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.decklists.slice(0, 20) as { decklist, event }, i (decklist.id)}
							{@const _hb = heroBackdropUrl(decklist.hero)}
							{@const _ccColor = event?.circuit ? circuitHex(event.circuit) : 'var(--ed-soft)'}
							{@const _isChamp = decklist.placement === 1}
							<tr class="border-line {i % 2 === 1 ? 'bg-ink/3' : ''} hover:bg-accent/10 border-t transition-colors">
								<td class="px-[14px] py-[12px] text-left">
									<span class="inline-flex items-center gap-[11px]">
										<span class="border-line2 bg-panel h-[30px] w-[30px] flex-shrink-0 rounded-full border bg-cover bg-top" style={_hb ? `background-image: url('${_hb}');` : ''}></span>
										<span class="text-ink text-[13.5px] font-bold">{decklist.hero || '—'}</span>
									</span>
								</td>
								<td class="px-[14px] py-[12px] text-left">
									{#if event?.circuit}
										<span class="inline-flex items-center gap-2 text-[13px] font-bold" style="color: {_ccColor};">
											<span class="block h-[8px] w-[8px]" style="background-color: {_ccColor};"></span>
											{event.circuit}
										</span>
									{:else}
										<span class="text-fade">—</span>
									{/if}
								</td>
								<td class="font-mono-system text-soft px-[14px] py-[12px] text-left text-[12.5px] font-bold tabular-nums">
									{event?.eventDate
										? new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
										: '—'}
								</td>
								<td class="px-[14px] py-[12px] text-right">
									<span
										class="inline-block px-[7px] py-[3px] text-[10px] font-extrabold tracking-[0.05em] uppercase"
										style={_isChamp
											? 'background-color: #C8922E; color: #17150F;'
											: decklist.placement && decklist.placement <= 8
												? 'background-color: color-mix(in srgb, #16489E 16%, transparent); color: #16489E;'
												: 'border: 1px solid var(--ed-line2); color: var(--ed-soft);'}
									>
										{decklist.placement
											? decklist.placement === 1
												? 'Champion'
												: decklist.placement === 2
													? '2nd'
													: decklist.placement === 3
														? '3rd'
														: `#${decklist.placement}`
											: '—'}
									</span>
								</td>
								<td class="px-[14px] py-[12px] text-right">
									<a
										href="/age-open/{event?.id}/decklist/{decklist.id}"
										class="text-accent hover:text-warm text-[11px] font-extrabold tracking-[0.07em] uppercase transition-colors"
									>
										View →
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</AgeShell>
