<script>
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { calculateAgeRating } from '$lib/age-rating.js';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import RatingBadge from '$lib/components/age/RatingBadge.svelte';
	import { CIRCUITS, circuitVar } from '$lib/data/circuits.js';
	import { calculateDerivedStats } from '$lib/players/standings.js';
	import { heroImageUrl } from '$lib/heroImage.js';
	import { MONTH_NAMES } from '$lib/data/months.js';

	// ============ helpers for editorial template ============
	const abbr = (name) => CIRCUITS[name]?.abbreviation ?? name;
	function tierHex(label) {
		return (
			{
				Provisional: '#928B79',
				Elite: '#C8922E',
				Premier: '#6A4A86',
				Distinguished: '#2C5BA8',
				Competitive: '#1C7A4B',
				Established: '#E5703E',
				Rising: '#928B79',
				Developing: '#C0461F',
				Newcomer: '#928B79',
				Unranked: '#928B79'
			}[label] || '#56503F'
		);
	}
	const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n ? `#${n}` : '—');
	const nth = (n) => {
		const r = Math.round(n);
		const m = r % 100;
		if (m >= 11 && m <= 13) return 'th';
		return r % 10 === 1 ? 'st' : r % 10 === 2 ? 'nd' : r % 10 === 3 ? 'rd' : 'th';
	};
	const KICK = 'text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase';
	const TH = 'text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase';
	const LBL = 'text-[8.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
	const MONTHS = [
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
	];

	let { data } = $props();

	let expandedSeasonId = $state(null);
	let expandedMonthKey = $state(null); // Tracks which month is expanded: "standingId|month"
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
		return allMatches.sort((a, b) => {
			if (a.event.year !== b.event.year) return b.event.year.localeCompare(a.event.year);
			const monthA = MONTH_NAMES.indexOf(a.event.month);
			const monthB = MONTH_NAMES.indexOf(b.event.month);
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

	// Toggle expanded month
	function toggleMonthExpand(standingId, monthKey) {
		const key = `${standingId}|${monthKey}`;
		expandedMonthKey = expandedMonthKey === key ? null : key;
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

	// ============ values for the template ============
	const rating = $derived(ageRating());
	const tier = $derived(ratingTier());
	const tierColor = $derived(tierHex(tier.label));
	const losses = $derived((data.totalStats.matchesPlayed || 0) - (data.totalStats.matchesWon || 0));
	const qualified = $derived(
		data.standings.filter((s) => s.calculatedRank && s.calculatedRank <= 16)
	);
	const seasonSpan = $derived.by(() => {
		const first = data.standings[data.standings.length - 1]?.season;
		const last = data.standings[0]?.season;
		return first && last && first !== last ? `${first}–${last}` : last || '';
	});
	const initials = $derived(
		(data.displayName || '')
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
	);
	const sig = $derived(data.heroUsage?.[0] ?? null);
	const sigBackdrop = $derived(sig ? heroImageUrl(sig.hero) : null);
	const bestList = $derived(data.decklists?.[0] ?? null);
	const opponentsFaced = $derived(data.matchHistory?.headToHead?.length || 0);
	const longestRun = $derived(data.matchHistory?.longestWinStreak || 0);
	const currentStreak = $derived(data.matchHistory?.currentWinStreak || 0);
	const careerWinPct = $derived(
		data.totalStats.matchesPlayed > 0
			? ((data.totalStats.matchesWon / data.totalStats.matchesPlayed) * 100).toFixed(1)
			: '0.0'
	);
	const components = $derived([
		{ nm: 'Win rate', wt: 25, sc: rating.breakdown.winRate, pc: rating.percentiles.winRate },
		{ nm: 'Top 8 rate', wt: 25, sc: rating.breakdown.top8, pc: rating.percentiles.top8Rate },
		{ nm: 'Peak rank', wt: 20, sc: rating.breakdown.peak, pc: rating.percentiles.bestRank },
		{
			nm: 'Efficiency',
			wt: 15,
			sc: rating.breakdown.efficiency,
			pc: rating.percentiles.efficiency
		},
		{
			nm: 'Experience',
			wt: 10,
			sc: rating.breakdown.experience,
			pc: rating.percentiles.experience
		},
		{
			nm: 'Championship',
			wt: 5,
			sc: rating.breakdown.championship,
			pc: rating.percentiles.championship
		}
	]);
	const h2h = $derived(data.matchHistory?.headToHead ?? []);
	const topWins = $derived(
		[...h2h]
			.filter((h) => h.wins > 0)
			.sort((a, b) => b.wins - a.wins)
			.slice(0, 4)
	);
	const topLoss = $derived(
		[...h2h]
			.filter((h) => h.losses > 0)
			.sort((a, b) => b.losses - a.losses)
			.slice(0, 4)
	);
	const topPlayed = $derived(
		[...h2h].sort((a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws)).slice(0, 4)
	);
	const activeMonthsFor = (s) =>
		MONTHS.filter((m) => (s[`${m.k}Points`] || 0) > 0 || (s[`${m.k}Matches`] || 0) > 0);
	const isMe = (match) =>
		match.player1GemId === data.gemId ||
		(!match.player1GemId && match.player1Name && match.player1Name === data.displayName);
	const outcome = (match) => {
		const p1 = isMe(match);
		if ((p1 && match.winner === 'player1') || (!p1 && match.winner === 'player2')) return 'W';
		if ((p1 && match.winner === 'player2') || (!p1 && match.winner === 'player1')) return 'L';
		return 'D';
	};
	const resultBg = (r) =>
		r === 'W' ? 'var(--ed-prem)' : r === 'L' ? 'var(--ed-hero-rb)' : 'var(--ed-fade)';
	const finishStyle = (rank) =>
		rank === 1
			? 'background: var(--ed-gold); color: #fff;'
			: rank && rank <= 8
				? 'background: color-mix(in srgb, var(--ed-warm) 14%, transparent); color: var(--ed-warm);'
				: 'border: 1px solid var(--ed-line2); color: var(--ed-soft);';
</script>

<svelte:head>
	<title>{data.displayName} ({rating.total} AGE) — Player Profile</title>
	<meta
		name="description"
		content="{data.displayName}'s competitive profile. AGE Rating: {rating.total}/100. {data
			.totalStats.totalPoints} total points across {data.totalStats.eventsPlayed} events."
	/>
</svelte:head>

<!--
	AGE Open player profile, in the series' "tournament day" register:
	an ink masthead (AGE Open logo, poster-face name, rating plate, stat
	strip), then paper sections — season standings with month and
	round-by-round drill-downs, box score, rating breakdown, heroes,
	head-to-head lookup and decklists.
-->

<AgeShell active="AGE Open">
	<!-- ============ masthead ============ -->
	<section class="relative overflow-hidden bg-ink text-paper-bg">
		<span
			class="ao-cond pointer-events-none absolute -right-4 -bottom-10 text-[260px] leading-none font-black text-paper-bg/[0.035] uppercase select-none md:-bottom-16 md:text-[420px]"
			aria-hidden="true">{initials}</span
		>
		<div
			class="relative mx-auto grid w-full max-w-[1200px] gap-10 px-5 pt-8 pb-12 md:px-8 md:pt-10 md:pb-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-16"
		>
			<div class="fp-rise min-w-0">
				<a
					href="/age-open?tab=standings"
					class="inline-block text-[9.5px] font-extrabold tracking-[0.2em] text-paper-bg/60 uppercase transition-colors hover:text-paper-bg"
					>← Standings</a
				>
				<a href="/age-open" class="mt-6 block w-fit" aria-label="AGE Open Series overview">
					<img
						src="/age_open_logo.svg"
						alt="AGE Open Series"
						width="629"
						height="294"
						class="h-auto w-[130px] md:w-[150px]"
					/>
				</a>
				<p
					class="mt-8 text-[9.5px] font-extrabold tracking-[0.26em] text-paper-bg/60 uppercase md:mt-10"
				>
					Player profile · GEM {data.gemId}{seasonSpan ? ` · ${seasonSpan}` : ''}
				</p>
				<h1
					class="ao-cond mt-3 text-[56px] leading-[0.86] font-black break-words uppercase md:text-[96px]"
				>
					{data.displayName}
				</h1>
				<div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
					<span
						class="text-[10.5px] font-extrabold tracking-[0.18em] uppercase"
						style="color: {tierColor};">{tier.label}</span
					>
					<span class="text-[10.5px] font-bold tracking-[0.12em] text-paper-bg/60 uppercase"
						>AGE Rating {rating.total} · vs {rating.totalPlayers} rated players</span
					>
					{#each circuitsPlayed as c (c)}
						<span
							class="px-1.5 py-[3px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
							style="background: {circuitVar(c)};">{c}</span
						>
					{/each}
				</div>
				{#if qualified.length}
					<div class="mt-4 flex flex-wrap items-center gap-2">
						<span class="text-[9px] font-extrabold tracking-[0.18em] text-paper-bg/55 uppercase"
							>Championship qualifier</span
						>
						{#each qualified as q (q.id)}
							<span
								class="inline-flex items-center gap-1.5 border border-gold/50 px-2 py-[3px] text-[10px] font-extrabold tracking-[0.1em] text-gold"
								><span class="text-[9px] leading-none">★</span>{q.season}</span
							>
						{/each}
					</div>
				{/if}
				<div class="mt-7 flex flex-wrap gap-x-5 gap-y-2">
					<button
						type="button"
						onclick={refreshData}
						disabled={isRefreshing}
						class="text-[9.5px] font-extrabold tracking-[0.16em] text-paper-bg/60 uppercase transition-colors hover:text-paper-bg disabled:opacity-50"
						>{isRefreshing ? 'Refreshing…' : 'Refresh ↻'}</button
					>
					<a
						href={xShareUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[9.5px] font-extrabold tracking-[0.16em] text-paper-bg/60 uppercase transition-colors hover:text-paper-bg"
						>Share on X</a
					>
					<a
						href={blueskyShareUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[9.5px] font-extrabold tracking-[0.16em] text-paper-bg/60 uppercase transition-colors hover:text-paper-bg"
						>Bluesky</a
					>
				</div>
			</div>

			<!-- player card: a classic trading card — a thick border in the
			     tier colour, paper stock with grain, a header band and card
			     number, an ink name plate with the rating, the heroes played
			     where the photo would be, and a season-by-season stat table
			     like the back of a baseball card -->
			<div class="fp-rise flex justify-center lg:justify-end" style="animation-delay: 160ms;">
				<div
					class="group relative aspect-[5/7] w-full max-w-[320px] rotate-[1.5deg] text-ink transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:rotate-0"
					style="background: {tierColor}; box-shadow: 0 2px 3px rgba(0,0,0,0.25), 0 18px 30px -12px rgba(0,0,0,0.55), 0 40px 60px -30px rgba(0,0,0,0.7);"
				>
					<!-- card stock inside the coloured border -->
					<div class="absolute inset-[8px] overflow-hidden bg-paper-bg">
						<svg
							class="absolute inset-0 h-full w-full opacity-[0.12] mix-blend-multiply"
							aria-hidden="true"
						>
							<filter id="player-card-grain">
								<feTurbulence
									type="fractalNoise"
									baseFrequency="0.9"
									numOctaves="3"
									stitchTiles="stitch"
								/>
								<feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.27  0 0 0 0 0.2  0 0 0 0.9 0" />
							</filter>
							<rect width="100%" height="100%" filter="url(#player-card-grain)" />
						</svg>
						<span
							class="pointer-events-none absolute inset-[4px] border border-ink/70"
							aria-hidden="true"
						></span>
						<!-- faded watermark of the series logo, centred on the card -->
						<img
							src="/age_open_logo.svg"
							alt=""
							aria-hidden="true"
							class="pointer-events-none absolute top-1/2 left-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 opacity-[0.045] invert select-none"
						/>
					</div>

					<div class="relative flex h-full flex-col p-[18px]">
						<!-- header band -->
						<div class="flex items-center justify-between gap-3">
							<p class="text-[7px] font-extrabold tracking-[0.26em] text-warm uppercase">
								<span aria-hidden="true">◆</span> AGE Open Series · Player card
							</p>
							<p
								class="text-[7px] font-extrabold tracking-[0.22em] whitespace-nowrap text-fade uppercase"
							>
								No. {data.gemId}
							</p>
						</div>

						<!-- name plate -->
						<div
							class="mt-3 flex items-center gap-3 px-3 py-2.5 text-paper-bg/90"
							style="background: var(--ed-ink);"
						>
							<RatingBadge
								size="md"
								rating={rating.total}
								label={tier.label}
								hex={tierColor}
								provisional={tier.label === 'Provisional'}
							/>
							<div class="min-w-0">
								<p class="ao-cond truncate text-[24px] leading-none font-black uppercase">
									{data.displayName}
								</p>
								<p class="mt-1.5 truncate text-[7px] font-extrabold tracking-[0.22em] uppercase">
									<span style="color: {tierColor};">{tier.label}</span>
									<span class="text-paper-bg/55">
										· {circuitsPlayed.map(abbr).join(' · ') || 'AGE Open'}{seasonSpan
											? ` · ${seasonSpan}`
											: ''}</span
									>
								</p>
							</div>
						</div>

						<!-- overall stats -->
						<dl class="mt-2.5 grid grid-cols-6 divide-x divide-ink/20 border border-ink/70">
							{#each [['Pts', data.totalStats.totalPoints], ['Top 8', data.totalStats.top8Finishes], ['Win', `${winRate}%`], ['W–L', `${data.totalStats.matchesWon}–${losses}`], ['Events', data.totalStats.eventsPlayed], ['Seasons', seasonsPlayed.length]] as [k, v] (k)}
								<div class="px-1 py-1.5 text-center">
									<dd class="ao-cond text-[17px] leading-none font-black tabular-nums">{v}</dd>
									<dt class="mt-1 text-[6px] font-extrabold tracking-[0.16em] text-fade uppercase">
										{k}
									</dt>
								</div>
							{/each}
						</dl>

						<!-- heroes -->
						<div class="mt-2.5">
							<p
								class="flex items-center gap-2 text-[7px] font-extrabold tracking-[0.26em] text-warm uppercase"
							>
								Heroes played <span class="h-px flex-1 bg-ink/20" aria-hidden="true"></span>
							</p>
							{#if data.heroUsage?.length}
								<ol class="mt-1.5">
									{#each data.heroUsage.slice(0, 3) as h (h.hero)}
										<li
											class="flex items-baseline justify-between gap-2 border-b border-dotted border-ink/25 py-[3px]"
										>
											<span class="truncate font-newsreader text-[12px] font-semibold"
												>{h.hero}</span
											>
											<span class="shrink-0 text-[9px] font-bold text-soft tabular-nums"
												>{h.count}×</span
											>
										</li>
									{/each}
									{#if data.heroUsage.length > 3}
										<li class="pt-1 text-[8px] font-bold text-fade">
											+{data.heroUsage.length - 3} more
										</li>
									{/if}
								</ol>
							{:else}
								<p class="mt-1.5 font-newsreader text-[12px] text-fade italic">
									No heroes logged yet.
								</p>
							{/if}
						</div>

						<!-- season table -->
						<div class="mt-2.5">
							<p
								class="flex items-center gap-2 text-[7px] font-extrabold tracking-[0.26em] text-warm uppercase"
							>
								Career record <span class="h-px flex-1 bg-ink/20" aria-hidden="true"></span>
							</p>
							<div
								class="mt-1.5 grid grid-cols-[40px_32px_28px_44px_36px_1fr] gap-x-1 border-b border-ink text-[6.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>
								<span>Year</span><span>Ckt</span><span class="text-center">Ev</span><span
									class="text-center">W–L</span
								><span class="text-center">Pts</span><span class="text-right">Fin</span>
							</div>
							{#each data.standings.slice(0, 5) as s (s.id)}
								<div
									class="grid grid-cols-[40px_32px_28px_44px_36px_1fr] gap-x-1 border-b border-dotted border-ink/25 py-[3px] text-[10px] tabular-nums"
								>
									<span class="font-extrabold">{s.season}</span>
									<span
										class="text-[8px] font-extrabold tracking-[0.1em] uppercase"
										style="color: {circuitVar(s.circuit)};">{abbr(s.circuit)}</span
									>
									<span class="text-center text-soft">{calculateDerivedStats(s).eventsPlayed}</span>
									<span class="text-center"
										>{s.matchesWon || 0}–{(s.matchesPlayed || 0) - (s.matchesWon || 0)}</span
									>
									<span class="text-center font-extrabold">{s.totalPoints || 0}</span>
									<span
										class="text-right font-extrabold {s.calculatedRank === 1
											? 'text-gold'
											: s.calculatedRank && s.calculatedRank <= 16
												? 'text-warm'
												: 'text-soft'}">{ordinal(s.calculatedRank)}</span
									>
								</div>
							{/each}
						</div>

						<!-- foot -->
						<div
							class="mt-auto flex items-center justify-between gap-3 border-t border-ink/70 pt-2"
						>
							<p class="text-[6.5px] font-extrabold tracking-[0.22em] text-fade uppercase">
								AGE Open Series
							</p>
							{#if qualified.length}
								<p class="text-[7px] font-extrabold tracking-[0.14em] text-gold uppercase">
									★ Championship qualifier ×{qualified.length}
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ season standings ============ -->
	{#if data.standings?.length}
		<section class="border-b border-line">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
				<div class="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p class={KICK}>Career</p>
						<h2 class="ao-cond mt-2 text-[40px] leading-none font-black uppercase">
							Season standings
						</h2>
					</div>
					<p class="font-newsreader text-[15px] text-soft italic">
						Tap a season with results to see every month and every round.
					</p>
				</div>

				<div class="mt-6">
					<div>
						<div
							class="hidden grid-cols-[88px_minmax(0,1fr)_64px_64px_64px_80px_80px_120px] items-end gap-3 border-b-[3px] border-ink px-4 pb-2 md:grid {TH}"
						>
							<span>Season</span><span>Circuit</span><span class="text-center">Events</span><span
								class="text-center">W</span
							><span class="text-center">L</span><span class="text-center">Win %</span><span
								class="text-center">Points</span
							><span class="text-center">Finish</span>
						</div>
						<ol class="border-t-[3px] border-ink md:border-t-0">
							{#each data.standings as s (s.id)}
								{@const sLosses = (s.matchesPlayed || 0) - (s.matchesWon || 0)}
								{@const winPct =
									(s.matchesPlayed || 0) > 0
										? `${Math.round(((s.matchesWon || 0) / s.matchesPlayed) * 100)}%`
										: '—'}
								{@const months = activeMonthsFor(s)}
								{@const open = expandedSeasonId === s.id}
								{@const selMonth = (expandedMonthKey || '').startsWith(`${s.id}|`)
									? (expandedMonthKey || '').split('|')[1]
									: null}
								<li class="border-b border-line {open ? 'bg-paper' : 'even:bg-paper/50'}">
									<!-- phone row -->
									<button
										type="button"
										disabled={!months.length}
										onclick={() => (expandedSeasonId = open ? null : s.id)}
										aria-expanded={open}
										class="flex w-full flex-col gap-3 px-4 py-4 text-left md:hidden"
									>
										<span class="flex items-center justify-between gap-3">
											<span class="flex items-center gap-3">
												<span class="ao-cond text-[28px] leading-none font-black tabular-nums"
													>{s.season}</span
												>
												<span
													class="px-1.5 py-[2px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
													style="background: {circuitVar(s.circuit)};">{s.circuit}</span
												>
											</span>
											<span class="flex items-center gap-2">
												<span
													class="px-2 py-[3px] text-[9px] font-extrabold tracking-[0.12em] uppercase"
													style={finishStyle(s.calculatedRank)}>{ordinal(s.calculatedRank)}</span
												>
												{#if months.length}
													<span
														class="text-[11px] text-fade transition-transform {open
															? 'rotate-180 text-ink'
															: ''}"
														aria-hidden="true">⌄</span
													>
												{/if}
											</span>
										</span>
										<span class="grid grid-cols-4 gap-2 border-t border-line pt-3 text-center">
											{#each [{ v: s.totalPoints || 0, l: 'Points', big: true }, { v: `${s.matchesWon || 0}–${sLosses}`, l: 'Record' }, { v: winPct, l: 'Win %' }, { v: calculateDerivedStats(s).eventsPlayed, l: 'Events' }] as st (st.l)}
												<span>
													<span
														class="block text-[13px] font-bold tabular-nums {st.big
															? 'ao-cond text-[22px] leading-none font-black'
															: ''}">{st.v}</span
													>
													<span class="mt-1 block {LBL}">{st.l}</span>
												</span>
											{/each}
										</span>
									</button>
									<!-- desktop row -->
									<button
										type="button"
										disabled={!months.length}
										onclick={() => (expandedSeasonId = open ? null : s.id)}
										aria-expanded={open}
										class="hidden w-full grid-cols-[88px_minmax(0,1fr)_64px_64px_64px_80px_80px_120px] items-center gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-paper md:grid"
									>
										<span class="ao-cond text-[24px] leading-none font-black tabular-nums"
											>{s.season}</span
										>
										<span class="flex items-center gap-2 text-[13px] font-bold">
											<span
												class="px-1.5 py-[2px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
												style="background: {circuitVar(s.circuit)};">{abbr(s.circuit)}</span
											>
											{s.circuit}
										</span>
										<span class="text-center text-[13px] font-semibold text-soft tabular-nums"
											>{calculateDerivedStats(s).eventsPlayed}</span
										>
										<span class="text-center text-[13px] font-bold tabular-nums"
											>{s.matchesWon || 0}</span
										>
										<span class="text-center text-[13px] text-fade tabular-nums">{sLosses}</span>
										<span class="text-center text-[13px] font-bold tabular-nums">{winPct}</span>
										<span
											class="ao-cond text-center text-[24px] leading-none font-black tabular-nums"
											>{s.totalPoints || 0}</span
										>
										<span class="flex items-center justify-center gap-2">
											<span
												class="px-2 py-[3px] text-[9px] font-extrabold tracking-[0.12em] uppercase"
												style={finishStyle(s.calculatedRank)}>{ordinal(s.calculatedRank)}</span
											>
											{#if months.length}
												<span
													class="text-[11px] text-fade transition-transform {open
														? 'rotate-180 text-ink'
														: ''}"
													aria-hidden="true">⌄</span
												>
											{/if}
										</span>
									</button>

									{#if open && months.length}
										<div class="border-t border-line px-4 py-5">
											<div class="flex flex-wrap items-baseline justify-between gap-3">
												<p class={LBL}>Monthly results</p>
												<p class="font-newsreader text-[13px] text-fade italic">
													Tap a month for the rounds
												</p>
											</div>
											<div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-12">
												{#each MONTHS as m (m.k)}
													{@const pts = s[`${m.k}Points`] || 0}
													{@const mp = s[`${m.k}Matches`] || 0}
													{@const active = pts > 0 || mp > 0}
													{@const hero = getHeroForEvent(s.season, s.circuit, m.k)}
													{@const sel = selMonth === m.k}
													{#if active}
														<button
															type="button"
															onclick={() => toggleMonthExpand(s.id, m.k)}
															aria-pressed={sel}
															class="relative flex min-h-[112px] flex-col items-center justify-end border bg-paper-bg px-1.5 pt-3 pb-2 transition-colors {sel
																? 'border-ink'
																: 'border-line2 hover:border-ink'}"
														>
															<span
																class="absolute top-0 right-0 px-1.5 py-[2px] text-[9px] font-extrabold text-paper-bg tabular-nums {sel
																	? 'bg-ink'
																	: 'bg-warm'}">{mp}</span
															>
															{#if hero?.imageUrl}
																<span
																	class="h-[36px] w-[36px] border border-line2 bg-cover bg-[right_center]"
																	style="background-image: url('{hero.imageUrl}');"
																></span>
															{/if}
															<span
																class="mt-2 text-[9.5px] font-extrabold tracking-[0.12em] text-warm uppercase"
																>{m.n}</span
															>
															<span
																class="ao-cond mt-[2px] text-[24px] leading-none font-black tabular-nums"
																>{pts}</span
															>
															<span
																class="mt-1 line-clamp-1 max-w-full text-[8px] font-extrabold tracking-[0.08em] text-soft uppercase"
																>{hero?.hero ? hero.hero.split(',')[0] : '—'}</span
															>
														</button>
													{:else}
														<div
															class="flex min-h-[112px] flex-col items-center justify-end border border-line px-1.5 pt-3 pb-2 opacity-50"
														>
															<span
																class="text-[9.5px] font-extrabold tracking-[0.12em] text-fade uppercase"
																>{m.n}</span
															>
															<span
																class="ao-cond mt-[2px] text-[24px] leading-none font-black text-fade tabular-nums"
																>0</span
															>
															<span class="mt-1 text-[8px] font-bold text-fade tabular-nums"
																>0–0</span
															>
														</div>
													{/if}
												{/each}
											</div>

											{#if selMonth}
												{@const rounds = getMatchesForEvent(s.season, s.circuit, selMonth)}
												{@const selHero = getHeroForEvent(s.season, s.circuit, selMonth)}
												{@const meta = MONTHS.find((m) => m.k === selMonth)}
												<div class="mt-5 border border-ink bg-paper-bg">
													<div
														class="flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-3 text-paper-bg"
													>
														<span class="ao-cond text-[26px] leading-none font-black uppercase"
															>{meta?.n} {s.season} · {s.circuit}</span
														>
														{#if selHero?.hero}
															<span
																class="text-[10px] font-extrabold tracking-[0.16em] text-warm-light uppercase"
																>{selHero.hero}</span
															>
														{/if}
													</div>
													{#if rounds.length}
														<ol>
															{#each rounds as { match }, mi (mi)}
																{@const r = outcome(match)}
																{@const p1 = isMe(match)}
																{@const oppName = p1 ? match.player2Name : match.player1Name}
																{@const oppGem = p1 ? match.player2GemId : match.player1GemId}
																{@const oppHero = getOpponentHero(
																	oppGem,
																	match.year,
																	match.circuit,
																	match.month
																)}
																{@const oppRank = p1
																	? match.player2Standing
																	: match.player1Standing}
																<li
																	class="grid grid-cols-[48px_28px_minmax(0,1fr)_56px] items-center gap-3 border-b border-line px-5 py-2.5 last:border-b-0 even:bg-paper/50"
																>
																	<span
																		class="text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
																		>R{match.round}</span
																	>
																	<span
																		class="ao-cond flex h-[26px] w-[26px] items-center justify-center text-[14px] font-black text-white"
																		style="background: {resultBg(r)};">{r}</span
																	>
																	<span class="flex min-w-0 items-center gap-3">
																		{#if oppHero?.imageUrl}
																			<span
																				class="h-[32px] w-[32px] shrink-0 border border-line2 bg-cover bg-[right_center]"
																				style="background-image: url('{oppHero.imageUrl}');"
																			></span>
																		{/if}
																		<span class="min-w-0">
																			{#if oppGem}
																				<a
																					href="/player/{oppGem}"
																					class="block truncate font-newsreader text-[16px] font-semibold"
																					><span class="fp-ul">{oppName}</span></a
																				>
																			{:else}
																				<span
																					class="block truncate font-newsreader text-[16px] font-semibold"
																					>{oppName}</span
																				>
																			{/if}
																			{#if oppHero?.hero}
																				<span class="block truncate text-[11px] font-bold text-soft"
																					>{oppHero.hero}</span
																				>
																			{/if}
																		</span>
																	</span>
																	<span
																		class="text-right text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
																		>{oppRank ? `T${oppRank}` : ''}</span
																	>
																</li>
															{/each}
														</ol>
													{:else}
														<p
															class="px-5 py-6 text-center font-newsreader text-[14px] text-fade italic"
														>
															No round-by-round data for {meta?.n}
															{s.season}.
														</p>
													{/if}
												</div>
											{/if}
										</div>
									{/if}
								</li>
							{/each}
							<li
								class="hidden grid-cols-[88px_minmax(0,1fr)_64px_64px_64px_80px_80px_120px] items-center gap-3 border-t-[3px] border-double border-ink px-4 py-3 md:grid"
							>
								<span class="text-[10px] font-extrabold tracking-[0.18em] uppercase">Career</span>
								<span class="text-[12px] font-semibold text-fade"
									>{seasonsPlayed.length} seasons</span
								>
								<span class="text-center text-[13px] font-bold tabular-nums"
									>{data.totalStats.eventsPlayed}</span
								>
								<span class="text-center text-[13px] font-bold tabular-nums"
									>{data.totalStats.matchesWon}</span
								>
								<span class="text-center text-[13px] text-fade tabular-nums">{losses}</span>
								<span class="text-center text-[13px] font-bold tabular-nums">{careerWinPct}%</span>
								<span class="ao-cond text-center text-[24px] leading-none font-black tabular-nums"
									>{data.totalStats.totalPoints}</span
								>
								<span></span>
							</li>
						</ol>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- ============ box score ============ -->
	<section class="border-b border-line bg-paper">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class={KICK}>Box score</p>
					<h2 class="ao-cond mt-2 text-[40px] leading-none font-black uppercase">By the numbers</h2>
				</div>
				<p class="font-newsreader text-[15px] text-soft italic">
					Career performance across every open.
				</p>
			</div>

			<div class="mt-6 grid gap-4 lg:grid-cols-[1.2fr_2fr]">
				<!-- featured: top 8 rate -->
				<div class="flex flex-col justify-between border border-ink bg-paper-bg p-6">
					<p class={LBL}>Featured · conversion</p>
					<div class="mt-4 flex items-baseline gap-1">
						<span class="ao-cond text-[96px] leading-[0.8] font-black text-warm tabular-nums"
							>{top8ConversionRate}</span
						>
						<span class="ao-cond text-[40px] leading-none font-black text-warm/60">%</span>
					</div>
					<p class="mt-3 text-[11px] font-extrabold tracking-[0.16em] uppercase">Top 8 rate</p>
					<p class="mt-1 font-newsreader text-[14px] text-soft">
						{data.totalStats.top8Finishes} Top 8 finish{data.totalStats.top8Finishes === 1
							? ''
							: 'es'} across
						{data.totalStats.eventsPlayed} events.
					</p>
					<div class="mt-5">
						<div class="relative h-[6px] bg-line">
							<span class="absolute inset-y-0 left-0 bg-warm" style="width: {top8ConversionRate}%;"
							></span>
							{#each [25, 50, 75] as t (t)}
								<span
									class="absolute inset-y-0 w-px bg-paper-bg"
									style="left: {t}%;"
									aria-hidden="true"
								></span>
							{/each}
						</div>
						<div
							class="mt-1.5 flex justify-between text-[8.5px] font-extrabold text-fade tabular-nums"
						>
							<span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
						</div>
					</div>
				</div>

				<!-- groups -->
				<div class="grid gap-4 sm:grid-cols-3">
					{#each [{ k: 'Output', sub: 'how productive', hex: 'var(--ed-prem)', stats: [{ v: `${winRate}%`, l: 'Win rate', s: `${data.totalStats.matchesWon} of ${data.totalStats.matchesPlayed}`, tone: 'text-prem' }, { v: avgPointsPerEvent, l: 'Pts / event', s: `${data.totalStats.totalPoints} total` }] }, { k: 'Reach', sub: 'how broad', hex: 'var(--ed-warm)', stats: [{ v: data.totalStats.eventsPlayed, l: 'Events', s: `${seasonsPlayed.length} seasons` }, { v: data.totalStats.matchesPlayed || 0, l: 'Matches', s: 'logged' }, { v: opponentsFaced, l: 'Opponents', s: 'faced' }] }, { k: 'Peak', sub: 'how high', hex: 'var(--ed-gold)', stats: [{ v: bestRank() ? `#${bestRank()}` : '—', l: 'Best rank', s: avgRank() ? `avg #${avgRank()}` : '', tone: 'text-gold' }, { v: longestRun, l: 'Best run', s: 'wins in a row' }, { v: currentStreak > 0 ? `W${currentStreak}` : '—', l: 'Current', s: 'streak', tone: currentStreak > 0 ? 'text-prem' : 'text-fade' }] }] as g (g.k)}
						<div class="flex flex-col border border-line2 bg-paper-bg">
							<div class="flex items-baseline justify-between border-b border-line2 px-4 py-2.5">
								<span
									class="inline-flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
								>
									<span class="h-2 w-2" style="background: {g.hex};" aria-hidden="true"></span>{g.k}
								</span>
								<span class="text-[9px] font-bold tracking-[0.08em] text-fade uppercase"
									>{g.sub}</span
								>
							</div>
							<div class="grid flex-1 divide-y divide-line">
								{#each g.stats as st (st.l)}
									<div class="flex items-center justify-between gap-3 px-4 py-3">
										<span>
											<span class="block text-[10px] font-extrabold tracking-[0.14em] uppercase"
												>{st.l}</span
											>
											{#if st.s}<span class="block text-[11px] text-fade">{st.s}</span>{/if}
										</span>
										<span
											class="ao-cond text-[30px] leading-none font-black tabular-nums {st.tone ??
												''}">{st.v}</span
										>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- ============ rating breakdown ============ -->
	<section class="border-b border-line">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class={KICK}>AGE Rating</p>
					<h2 class="ao-cond mt-2 text-[40px] leading-none font-black uppercase">
						How the rating is built
					</h2>
				</div>
				<p class="font-newsreader text-[15px] text-soft italic">
					Percentiles against {rating.totalPlayers} rated players.
				</p>
			</div>

			<div class="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
				<div class="overflow-x-auto">
					<div class="min-w-[560px]">
						<div
							class="grid grid-cols-[minmax(0,1fr)_56px_96px_72px_140px] items-end gap-3 border-b-[3px] border-ink px-4 pb-2 {TH}"
						>
							<span>Component</span><span class="text-center">Weight</span><span class="text-center"
								>Score</span
							><span class="text-center">Pctile</span><span>Distribution</span>
						</div>
						<ol>
							{#each components as r (r.nm)}
								<li
									class="grid grid-cols-[minmax(0,1fr)_48px_80px_56px] items-center gap-3 border-b border-line px-4 py-3 even:bg-paper/50 md:grid-cols-[minmax(0,1fr)_56px_96px_72px_140px]"
								>
									<span class="font-newsreader text-[16px] font-semibold">{r.nm}</span>
									<span class="text-center text-[13px] text-fade tabular-nums">{r.wt}</span>
									<span class="text-center text-[13px] font-bold tabular-nums"
										>{r.sc.toFixed(1)} <span class="font-normal text-fade">/ {r.wt}</span></span
									>
									<span
										class="text-center text-[13px] font-bold tabular-nums {r.pc >= 90
											? 'text-gold'
											: 'text-warm'}"
										>{Math.round(r.pc)}<sup class="text-[8px]">{nth(r.pc)}</sup></span
									>
									<span class="relative hidden h-[5px] bg-line md:block">
										<span class="absolute inset-y-0 left-0 bg-warm" style="width: {r.pc}%;"></span>
										<span
											class="absolute -top-[3px] -bottom-[3px] left-1/2 w-[2px] bg-ink/50"
											aria-hidden="true"
										></span>
									</span>
								</li>
							{/each}
							<li
								class="grid grid-cols-[minmax(0,1fr)_48px_80px_56px] items-center gap-3 border-t-[3px] border-double border-ink px-4 py-3 md:grid-cols-[minmax(0,1fr)_56px_96px_72px_140px]"
							>
								<span class="text-[10px] font-extrabold tracking-[0.18em] uppercase"
									>AGE Rating</span
								>
								<span class="text-center text-[13px] font-bold tabular-nums">100</span>
								<span
									class="ao-cond text-center text-[24px] leading-none font-black tabular-nums"
									style="color: {tierColor};">{rating.total}</span
								>
								<span
									class="text-center text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
									style="color: {tierColor};">{tier.label}</span
								>
								<span class="hidden text-[11px] text-fade md:block">{tier.description}</span>
							</li>
						</ol>
					</div>
				</div>

				<div class="flex flex-col border border-line2 bg-paper p-6">
					<div class="flex items-center gap-5">
						<RatingBadge
							size="lg"
							rating={rating.total}
							label={tier.label}
							hex={tierColor}
							provisional={tier.label === 'Provisional'}
						/>
						<div>
							<p
								class="text-[11px] font-extrabold tracking-[0.18em] uppercase"
								style="color: {tierColor};"
							>
								{tier.label}
							</p>
							<p class="mt-1 text-[11px] font-bold tracking-[0.1em] text-fade uppercase">
								{tier.description}
							</p>
						</div>
					</div>
					<p class="mt-5 font-newsreader text-[15px] leading-[1.55] text-soft">
						Weighted across six components. A harsh power curve makes high scores hard to reach, so
						the median player sits near 35. The dark tick on each bar marks the league median.
					</p>
					<p
						class="mt-auto border-t border-line2 pt-4 text-[10.5px] font-bold tracking-[0.08em] text-fade uppercase"
					>
						Elite 90+ · Premier 80+ · Distinguished 70+ · Competitive 60+ · Provisional under 3
						events
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ heroes ============ -->
	{#if data.heroUsage?.length}
		{@const maxUse = Math.max(...data.heroUsage.map((h) => h.count))}
		<section class="border-b border-line bg-paper">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
				<div class="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p class={KICK}>Arsenal</p>
						<h2 class="ao-cond mt-2 text-[40px] leading-none font-black uppercase">
							Heroes played
						</h2>
					</div>
					<p class="font-newsreader text-[15px] text-soft italic">
						{data.heroUsage.reduce((n, h) => n + h.count, 0)} logged events.
					</p>
				</div>

				<div class="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
					<div>
						<div
							class="grid grid-cols-[minmax(0,1fr)_48px_72px] items-end gap-3 border-b-[3px] border-ink px-4 pb-2 md:grid-cols-[minmax(0,1fr)_72px_140px] {TH}"
						>
							<span>Hero</span><span class="text-center">Events</span><span>Usage</span>
						</div>
						<ol>
							{#each data.heroUsage as h (h.hero)}
								<li
									class="grid grid-cols-[minmax(0,1fr)_48px_72px] items-center gap-3 border-b border-line px-4 py-2.5 even:bg-paper-bg/60 md:grid-cols-[minmax(0,1fr)_72px_140px]"
								>
									<span class="flex min-w-0 items-center gap-3">
										<span
											class="h-[34px] w-[34px] shrink-0 border border-line2 bg-cover bg-[right_center]"
											style={h.imageUrl ? `background-image: url('${h.imageUrl}');` : ''}
										></span>
										<span class="truncate font-newsreader text-[16px] font-semibold">{h.hero}</span>
									</span>
									<span class="ao-cond text-center text-[24px] leading-none font-black tabular-nums"
										>{h.count}</span
									>
									<span class="relative block h-[5px] bg-line">
										<span
											class="absolute inset-y-0 left-0 bg-warm"
											style="width: {(h.count / maxUse) * 100}%;"
										></span>
									</span>
								</li>
							{/each}
						</ol>
					</div>

					<div class="flex flex-col gap-4">
						{#if sig}
							<div
								class="relative flex min-h-[170px] flex-1 items-end overflow-hidden border border-ink bg-ink bg-cover bg-top"
								style={sigBackdrop ? `background-image: url('${sigBackdrop}');` : ''}
							>
								<span
									class="pointer-events-none absolute inset-0"
									style="background: linear-gradient(0deg, rgba(23,21,15,0.94) 18%, rgba(23,21,15,0.15) 75%);"
									aria-hidden="true"
								></span>
								<div class="relative p-5 text-paper-bg">
									<p class="text-[9px] font-extrabold tracking-[0.2em] text-warm-light uppercase">
										Signature hero · most played
									</p>
									<p class="ao-cond mt-2 text-[30px] leading-[0.9] font-black uppercase">
										{sig.hero}
									</p>
									<p class="mt-2 text-[11px] font-bold text-paper-bg/60">
										{sig.count} event{sig.count === 1 ? '' : 's'}
									</p>
								</div>
							</div>
						{/if}
						{#if bestList}
							{@const bb = heroImageUrl(bestList.decklist.hero)}
							<a
								href="/age-open/{bestList.event?.id}/decklist/{bestList.decklist.id}"
								class="group relative flex min-h-[170px] flex-1 items-end overflow-hidden border border-ink bg-ink bg-cover bg-top"
								style={bb ? `background-image: url('${bb}');` : ''}
							>
								<span
									class="pointer-events-none absolute inset-0"
									style="background: linear-gradient(0deg, rgba(23,21,15,0.94) 18%, rgba(23,21,15,0.15) 75%);"
									aria-hidden="true"
								></span>
								{#if bestList.decklist.placement && bestList.decklist.placement <= 3}
									<span
										class="absolute top-0 left-0 bg-gold px-2 py-1 text-[9px] font-extrabold tracking-[0.14em] text-white uppercase"
										>{ordinal(bestList.decklist.placement)}</span
									>
								{/if}
								<div class="relative p-5 text-paper-bg">
									<p class="text-[9px] font-extrabold tracking-[0.2em] text-warm-light uppercase">
										Latest decklist
									</p>
									<p class="ao-cond mt-2 text-[30px] leading-[0.9] font-black uppercase">
										{bestList.decklist.hero || 'Decklist'}
									</p>
									<p class="mt-2 text-[11px] font-bold text-paper-bg/60">
										{bestList.event?.circuit || ''}{bestList.decklist.format
											? ` · ${bestList.decklist.format}`
											: ''} · View →
									</p>
								</div>
							</a>
						{/if}
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- ============ head to head ============ -->
	{#if h2h.length}
		{@const nem = data.matchHistory.nemesis}
		{@const best = data.matchHistory.bestMatchup}
		<section class="border-b border-line">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
				<div class="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p class={KICK}>Head to head</p>
						<h2 class="ao-cond mt-2 text-[40px] leading-none font-black uppercase">
							Player vs player
						</h2>
					</div>
					<p class="font-newsreader text-[15px] text-soft italic">{h2h.length} opponents faced.</p>
				</div>

				<!-- lookup -->
				<div class="mt-6 max-w-[560px]">
					<label for="h2h-search" class={LBL}>Find an opponent</label>
					<div class="relative mt-2">
						<div
							class="flex items-center gap-2.5 border border-line2 bg-paper-bg px-3 transition-colors focus-within:border-ink hover:border-ink"
						>
							<svg
								class="h-4 w-4 shrink-0 text-warm"
								viewBox="0 0 20 20"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								aria-hidden="true"
							>
								<circle cx="8.5" cy="8.5" r="5.5" /><path
									d="M13 13l4.5 4.5"
									stroke-linecap="square"
								/>
							</svg>
							<input
								id="h2h-search"
								type="search"
								bind:value={opponentSearchQuery}
								placeholder="Type a name you’ve faced…"
								autocomplete="off"
								oninput={() => (showOpponentDropdown = true)}
								onfocus={() => (showOpponentDropdown = true)}
								onblur={() => setTimeout(() => (showOpponentDropdown = false), 140)}
								class="min-h-[44px] w-full border-0 bg-transparent font-newsreader text-[17px] leading-tight text-ink placeholder:text-fade focus:outline-none [&::-webkit-search-cancel-button]:hidden"
							/>
							{#if opponentSearchQuery}
								<button
									type="button"
									onmousedown={(e) => {
										e.preventDefault();
										clearOpponentSelection();
									}}
									aria-label="Clear search"
									class="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center text-[16px] leading-none text-fade hover:text-ink"
									>×</button
								>
							{/if}
						</div>
						{#if showOpponentDropdown}
							{@const found = filteredHeadToHead().slice(0, 30)}
							<div
								class="absolute inset-x-0 top-full z-30 max-h-[300px] overflow-auto border border-ink bg-paper-bg shadow-[0_18px_40px_rgba(23,21,15,0.16)]"
							>
								{#if !found.length}
									<p class="px-4 py-4 font-newsreader text-[14px] text-fade italic">
										No faced opponent matches “{opponentSearchQuery}”.
									</p>
								{:else}
									{#each found as m (m.opponentGemId || m.opponentName)}
										{@const games = m.wins + m.losses + (m.draws || 0)}
										<button
											type="button"
											onmousedown={(e) => {
												e.preventDefault();
												selectOpponent(m);
											}}
											class="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-b-0 hover:bg-paper {selectedOpponentKey ===
											(m.opponentGemId || m.opponentName)
												? 'bg-paper'
												: ''}"
										>
											<span>
												<span class="block font-newsreader text-[16px] font-semibold"
													>{m.opponentName}</span
												>
												<span class="block text-[11px] text-fade"
													>{games} game{games === 1 ? '' : 's'}</span
												>
											</span>
											<span class="text-[13px] font-bold tabular-nums"
												><span class="text-prem">{m.wins}</span><span class="text-fade">–</span
												><span class="text-hero-rb">{m.losses}</span></span
											>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- result card -->
				{#if selectedOpponent()}
					{@const o = selectedOpponent()}
					{@const games = o.wins + o.losses + (o.draws || 0)}
					{@const wr = games ? Math.round((o.wins / games) * 100) : 0}
					{@const meetings = opponentMatches()}
					{@const last = meetings[0] ? outcome(meetings[0].match) : null}
					<div class="mt-6 border border-ink bg-paper-bg">
						<div
							class="flex flex-wrap items-center justify-between gap-6 border-b border-line px-6 py-5"
						>
							<div>
								<p class={LBL}>Head-to-head record</p>
								<p class="ao-cond mt-2 text-[34px] leading-[0.9] font-black uppercase">
									{data.displayName}
									<span class="font-newsreader text-[22px] font-normal text-fade normal-case italic"
										>vs</span
									>
									{#if o.opponentGemId}
										<a href="/player/{o.opponentGemId}" class="fp-ul">{o.opponentName}</a>
									{:else}
										{o.opponentName}
									{/if}
								</p>
								<p class="mt-2 text-[10.5px] font-bold tracking-[0.1em] text-fade uppercase">
									{o.wins > o.losses
										? `${data.displayName} leads the series`
										: o.wins < o.losses
											? `${data.displayName} trails the series`
											: 'Series even'}
								</p>
							</div>
							<p class="ao-cond text-[56px] leading-none font-black tabular-nums">
								<span class="text-prem">{o.wins}</span><span class="mx-1 text-line2">–</span><span
									class="text-hero-rb">{o.losses}</span
								>
							</p>
						</div>
						<div class="grid grid-cols-2 border-b border-line sm:grid-cols-4">
							{#each [{ v: games, l: 'Matches' }, { v: `${wr}%`, l: 'Win rate', cls: wr >= 50 ? 'text-prem' : 'text-hero-rb' }, { v: last === 'W' ? 'Won' : last === 'L' ? 'Lost' : '—', l: 'Last meeting', cls: last === 'W' ? 'text-prem' : last === 'L' ? 'text-hero-rb' : '' }, { v: meetings.length, l: 'On record' }] as st (st.l)}
								<div class="border-r border-line px-5 py-3 last:border-r-0">
									<p
										class="ao-cond text-[26px] leading-none font-black tabular-nums {st.cls ?? ''}"
									>
										{st.v}
									</p>
									<p class="mt-1.5 {LBL}">{st.l}</p>
								</div>
							{/each}
						</div>
						{#if meetings.length}
							<ol>
								{#each meetings as { match, event }, mi (mi)}
									{@const r = outcome(match)}
									{@const myHero = getHeroForEvent(event.year, event.circuit, event.month)}
									{@const oppGem = isMe(match) ? match.player2GemId : match.player1GemId}
									{@const theirHero = getOpponentHero(
										oppGem,
										event.year,
										event.circuit,
										event.month
									)}
									<li
										class="grid grid-cols-[64px_64px_minmax(0,1fr)_minmax(0,1fr)_40px] items-center gap-3 border-b border-line px-6 py-3 last:border-b-0 even:bg-paper/50"
									>
										<span>
											<span class="block text-[13px] font-extrabold tabular-nums">{event.year}</span
											>
											<span class="block text-[9px] font-bold tracking-[0.1em] text-fade uppercase"
												>{event.month?.slice(0, 3) || ''}</span
											>
										</span>
										<span>
											<span class="block text-[11px] font-extrabold tracking-[0.1em] uppercase"
												>R{match.round}</span
											>
											{#if match.table}<span
													class="block text-[9px] font-bold tracking-[0.1em] text-fade uppercase"
													>Table {match.table}</span
												>{/if}
										</span>
										{#each [{ name: data.displayName, hero: myHero, gem: null }, { name: o.opponentName, hero: theirHero, gem: oppGem }] as side, si (si)}
											<span class="flex min-w-0 items-center gap-2.5">
												{#if side.hero?.imageUrl}
													<span
														class="h-[30px] w-[30px] shrink-0 border border-line2 bg-cover bg-[right_center]"
														style="background-image: url('{side.hero.imageUrl}');"
													></span>
												{/if}
												<span class="min-w-0">
													{#if side.gem}
														<a
															href="/player/{side.gem}"
															class="block truncate text-[13px] font-extrabold"
															><span class="fp-ul">{side.name}</span></a
														>
													{:else}
														<span class="block truncate text-[13px] font-extrabold"
															>{side.name}</span
														>
													{/if}
													{#if side.hero?.hero}<span
															class="block truncate text-[11px] font-bold text-soft"
															>{side.hero.hero}</span
														>{/if}
												</span>
											</span>
										{/each}
										<span
											class="ao-cond ml-auto flex h-[26px] w-[26px] items-center justify-center text-[14px] font-black text-white"
											style="background: {resultBg(r)};">{r}</span
										>
									</li>
								{/each}
							</ol>
						{/if}
					</div>
				{/if}

				<!-- nemesis / best matchup -->
				<div class="mt-6 grid gap-4 md:grid-cols-2">
					{#each [{ k: 'Nemesis', o: nem, tone: 'border-hero-rb', first: 'losses', second: 'wins', c1: 'text-hero-rb', c2: 'text-prem' }, { k: 'Best matchup', o: best, tone: 'border-prem', first: 'wins', second: 'losses', c1: 'text-prem', c2: 'text-hero-rb' }] as card (card.k)}
						{#if card.o}
							<div
								class="flex items-center justify-between gap-4 border border-l-[4px] border-line2 bg-paper-bg px-5 py-4 {card.tone}"
							>
								<div class="min-w-0">
									<p class={LBL}>{card.k}</p>
									{#if card.o.opponentGemId}
										<a
											href="/player/{card.o.opponentGemId}"
											class="mt-1.5 block truncate font-newsreader text-[22px] font-semibold"
											><span class="fp-ul">{card.o.opponentName}</span></a
										>
									{:else}
										<p class="mt-1.5 truncate font-newsreader text-[22px] font-semibold">
											{card.o.opponentName}
										</p>
									{/if}
								</div>
								<div class="shrink-0 text-right">
									<p class="ao-cond text-[30px] leading-none font-black tabular-nums">
										<span class={card.c1}>{card.o[card.first]}</span><span class="text-fade">–</span
										><span class={card.c2}>{card.o[card.second]}</span>
									</p>
									<p class="mt-1 {LBL}">{card.first} · {card.second}</p>
								</div>
							</div>
						{/if}
					{/each}
				</div>

				<!-- mini tables -->
				<div class="mt-6 grid gap-6 md:grid-cols-3">
					{#each [{ title: 'Most wins against', col: 'W–L', rows: topWins, fmt: (r) => `${r.wins}–${r.losses}` }, { title: 'Most losses against', col: 'W–L', rows: topLoss, fmt: (r) => `${r.wins}–${r.losses}` }, { title: 'Most played', col: 'Games', rows: topPlayed, fmt: (r) => r.wins + r.losses + r.draws }] as t (t.title)}
						<div>
							<div
								class="grid grid-cols-[28px_minmax(0,1fr)_56px] items-end gap-3 border-b-[3px] border-ink px-3 pb-2 {TH}"
							>
								<span>#</span><span>{t.title}</span><span class="text-center">{t.col}</span>
							</div>
							<ol>
								{#each t.rows as r, ri (r.opponentName + ri)}
									<li
										class="grid grid-cols-[28px_minmax(0,1fr)_56px] items-center gap-3 border-b border-line px-3 py-2.5 even:bg-paper/50"
									>
										<span class="ao-cond text-[18px] leading-none font-black text-fade tabular-nums"
											>{ri + 1}</span
										>
										{#if r.opponentGemId}
											<a
												href="/player/{r.opponentGemId}"
												class="truncate font-newsreader text-[15px] font-semibold"
												><span class="fp-ul">{r.opponentName}</span></a
											>
										{:else}
											<span class="truncate font-newsreader text-[15px] font-semibold"
												>{r.opponentName}</span
											>
										{/if}
										<span class="text-center text-[13px] font-bold tabular-nums">{t.fmt(r)}</span>
									</li>
								{/each}
							</ol>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- ============ decklists ============ -->
	{#if data.decklists?.length}
		<section class="border-b border-line bg-paper">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
				<div class="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p class={KICK}>Tournament lists</p>
						<h2 class="ao-cond mt-2 text-[40px] leading-none font-black uppercase">Decklists</h2>
					</div>
					<p class="font-newsreader text-[15px] text-soft italic">
						{data.decklists.length}
						{data.decklists.length === 1 ? 'list' : 'lists'} on record.
					</p>
				</div>
				<div class="mt-6 overflow-x-auto">
					<div class="min-w-[640px]">
						<div
							class="grid grid-cols-[minmax(0,1fr)_150px_130px_100px_72px] items-end gap-3 border-b-[3px] border-ink px-4 pb-2 {TH}"
						>
							<span>Hero</span><span>Event</span><span>Date</span><span class="text-center"
								>Finish</span
							><span></span>
						</div>
						<ol>
							{#each data.decklists.slice(0, 20) as { decklist, event } (decklist.id)}
								{@const hb = heroImageUrl(decklist.hero)}
								<li class="border-b border-line even:bg-paper-bg/60">
									<a
										href="/age-open/{event?.id}/decklist/{decklist.id}"
										class="grid grid-cols-[minmax(0,1fr)_150px_130px_100px_72px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-paper-bg"
									>
										<span class="flex min-w-0 items-center gap-3">
											<span
												class="h-[34px] w-[34px] shrink-0 border border-line2 bg-cover bg-[right_center]"
												style={hb ? `background-image: url('${hb}');` : ''}
											></span>
											<span class="truncate font-newsreader text-[16px] font-semibold"
												><span class="fp-ul">{decklist.hero || '—'}</span></span
											>
										</span>
										<span class="flex items-center gap-2 text-[12px] font-bold">
											{#if event?.circuit}
												<span
													class="px-1.5 py-[2px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
													style="background: {circuitVar(event.circuit)};"
													>{abbr(event.circuit)}</span
												>{event.circuit}
											{:else}
												<span class="text-fade">—</span>
											{/if}
										</span>
										<span class="text-[12px] font-semibold text-soft tabular-nums"
											>{event?.eventDate
												? new Date(event.eventDate).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
														year: 'numeric'
													})
												: '—'}</span
										>
										<span class="text-center">
											<span
												class="px-2 py-[3px] text-[9px] font-extrabold tracking-[0.12em] uppercase"
												style={finishStyle(decklist.placement)}
												>{decklist.placement === 1 ? 'Champion' : ordinal(decklist.placement)}</span
											>
										</span>
										<span
											class="text-right text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase"
											>View →</span
										>
									</a>
								</li>
							{/each}
						</ol>
					</div>
				</div>
			</div>
		</section>
	{/if}
</AgeShell>
