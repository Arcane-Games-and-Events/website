<script>
	import { fade, scale } from 'svelte/transition';
	import { getCircuit, DEFAULT_CIRCUIT } from '$lib/data/circuits.js';
	import DecklistCard from '$lib/components/DecklistCard.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	let { data } = $props();

	let activeTab = $state('standings');
	let selectedHeroModal = $state(null);

	// Matches tab — round selector + player search. Default to the most
	// recent round (last one with matches) so users land on the freshest
	// data instead of all-rounds-at-once.
	let selectedMatchRound = $state(/** @type {number | 'all'} */ ('all'));
	let matchesSearch = $state('');

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

	// Editorial circuit color tokens — matches the rest of the editorial chrome.
	const EDITORIAL_CIRCUIT = {
		'Los Angeles': 'var(--ed-cc-la)',
		'St. Louis': 'var(--ed-cc-stl)',
		'New England': 'var(--ed-cc-ne)'
	};
	function editorialCircuitColor(name) {
		return EDITORIAL_CIRCUIT[name] ?? 'var(--ed-accent)';
	}

	function openHeroModal(heroData) {
		selectedHeroModal = heroData;
	}

	function closeHeroModal() {
		selectedHeroModal = null;
	}

	const circuitConfig = $derived(getCircuitConfig(data.event.circuit));
	const edCircuit = $derived(editorialCircuitColor(data.event.circuit));

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
			.replace(/[̀-ͯ]/g, '')
			.replace(/[!@#$%^&*()+=[\]{}|\\:;<>?/~`]/g, '')
			.replace(/[,'"]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
		return `/hero_images/${slug}.webp`;
	}

	/**
	 * Split a Flesh and Blood hero name into "proper name" + "epithet"
	 * — same pattern used by the DecklistCard. Promotes the name to the
	 * headline and demotes the epithet to a mono caption.
	 */
	function splitHero(name) {
		if (!name) return { primary: '—', secondary: null };
		const idx = name.indexOf(',');
		if (idx === -1) return { primary: name, secondary: null };
		return { primary: name.slice(0, idx).trim(), secondary: name.slice(idx + 1).trim() };
	}

	/**
	 * Performance tier color for a hero based on win rate. Used to
	 * color the top rule + win-rate stat so cards are visually sorted
	 * by quality at a glance.
	 */
	function performanceColor(heroData) {
		if (!heroData || heroData.totalMatches < 3) return 'var(--ed-fade)';
		const wr = parseFloat(heroData.winRate);
		if (wr >= 60) return 'var(--ed-prem)';
		if (wr >= 50) return '#C8922E';
		if (wr >= 40) return 'var(--ed-ink)';
		return 'var(--ed-warm)';
	}

	function performanceLabel(heroData) {
		if (!heroData || heroData.totalMatches < 3) return 'Small sample';
		const wr = parseFloat(heroData.winRate);
		if (wr >= 60) return 'Top performer';
		if (wr >= 50) return 'Above average';
		if (wr >= 40) return 'Around even';
		return 'Below 40%';
	}

	// Per-rank pill color, matching the standings table treatment.
	function rankColor(placement) {
		if (placement === 1) return '#C8922E';
		if (placement === 2) return '#928B79';
		if (placement === 3) return '#C0461F';
		if (placement <= 8) return '#16489E';
		return 'var(--ed-fade)';
	}

	// Stat strip values + tab list — derived in script so the template
	// stays out of trouble with `{@const}` placement rules.
	const firstPrize = $derived(data.results.find((r) => r.placement === 1)?.prizeAmount || 0);
	const firstPts = $derived(data.results.find((r) => r.placement === 1)?.agePoints || 0);
	const heroStats = $derived([
		{ label: 'Players', value: data.results.length, color: 'var(--ed-ink)' },
		{ label: 'Rounds', value: data.totalRounds, color: 'var(--ed-ink)' },
		{ label: '1st Prize', value: `$${firstPrize}`, color: 'var(--ed-prem)' },
		{ label: '1st AGE Pts', value: `+${firstPts}`, color: 'var(--ed-accent)' }
	]);
	const visibleTabs = $derived(
		[
			{ id: 'standings', label: 'Standings', visible: true },
			{ id: 'metagame', label: 'Metagame', visible: hasMetagame },
			{ id: 'matches', label: 'Matches', visible: hasMatches },
			{ id: 'top8', label: 'Top 8', visible: hasBracket },
			{ id: 'decklists', label: `Decklists · ${data.decklists.length}`, visible: hasDecklists }
		].filter((t) => t.visible)
	);
	// Round filter + search reactive list. Each round entry carries a
	// stats line (decided / draws / pending) so the round header can
	// summarize before the user scans the row list.
	const filteredMatchRounds = $derived(() => {
		const q = matchesSearch.trim().toLowerCase();
		return (data.matchesByRound || [])
			.filter((r) => selectedMatchRound === 'all' || r.round === selectedMatchRound)
			.map((r) => {
				const matches = q
					? r.matches.filter((m) => {
							const p1 = (m.player1?.name || '').toLowerCase();
							const p2 = (m.player2?.name || '').toLowerCase();
							const h1 = (m.player1?.hero || '').toLowerCase();
							const h2 = (m.player2?.hero || '').toLowerCase();
							return p1.includes(q) || p2.includes(q) || h1.includes(q) || h2.includes(q);
						})
					: r.matches;
				const decided = matches.filter((m) => m.winner && !m.isDraw).length;
				const draws = matches.filter((m) => m.isDraw).length;
				const pending = matches.filter((m) => !m.winner && !m.isDraw).length;
				return { round: r.round, matches, decided, draws, pending };
			})
			.filter((r) => r.matches.length > 0);
	});

	// Per-stat treatments for the metagame strip — different visual
	// language for plain counts vs. hero-name stats.
	const metaTopHero = $derived(data.metagameBreakdown?.[0] ?? null);
	const metaTopHeroSplit = $derived(splitHero(metaTopHero?.hero));
	const metaBestWrSplit = $derived(splitHero(bestWinRateHero?.hero));
</script>

<svelte:head>
	<title>{data.event.title} Results — AGE Open</title>
	<meta name="description" content="Tournament results for {data.event.title}" />
</svelte:head>

<AgeShell active="AGE Open">
	<!--
		Hero band — paper background with a circuit-colored top hairline,
		a back link, chip strip with circuit + format + status, big
		serif title, and date/location/players quick-info strip.
		Circuit image bleeds in from the right with a mask so the
		photograph reads without competing with type.
	-->
	<section class="bg-paper border-ink relative overflow-hidden border-b-[3px] border-double">
		<!-- circuit accent top rule -->
		<div class="absolute inset-x-0 top-0 z-[1] h-[4px]" style="background: {edCircuit};"></div>

		<!-- Right-side image backdrop -->
		{#if data.event.circuit && circuitConfig.image}
			<div class="pointer-events-none absolute inset-0" aria-hidden="true">
				<img
					src={circuitConfig.image}
					alt=""
					class="absolute top-0 right-0 h-full w-[55%] object-cover opacity-40"
					style="-webkit-mask-image: linear-gradient(to right, transparent 0%, black 40%, black 100%); mask-image: linear-gradient(to right, transparent 0%, black 40%, black 100%);"
				/>
				<div
					class="absolute top-0 right-0 h-full w-[55%]"
					style="background: linear-gradient(to right, transparent 0%, color-mix(in srgb, var(--ed-paper) 38%, transparent) 40%, color-mix(in srgb, var(--ed-paper) 55%, transparent) 100%);"
				></div>
				<div
					class="absolute inset-x-0 bottom-0 h-[36%]"
					style="background: linear-gradient(to bottom, transparent 0%, var(--ed-paper) 100%);"
				></div>
			</div>
		{/if}

		<div class="relative z-[1] mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[44px] pb-[42px]">
			<!-- Back link -->
			<a
				href="/age-open?tab=results"
				class="text-fade hover:text-ink font-mono-system inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
			>
				← Tournament archive
			</a>

			<h1
				class="font-newsreader mt-[20px] text-[clamp(40px,5.5vw,68px)] leading-[0.96] font-semibold tracking-[-0.02em]"
			>
				{data.event.title}
			</h1>

			<!-- Chip strip: circuit (dominant) + format + status -->
			<div class="mt-6 flex flex-wrap items-center gap-2">
				{#if data.event.circuit}
					<span
						class="relative inline-flex items-center gap-[10px] px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-white uppercase shadow-[0_0_0_3px_var(--ed-paper),0_0_0_4px_currentColor]"
						style="background: {edCircuit}; color: {edCircuit};"
					>
						<span class="inline-block h-[9px] w-[9px] rounded-full bg-white" aria-hidden="true"></span>
						<span class="text-white">{data.event.circuit}</span>
					</span>
				{/if}
				{#if data.event.format}
					<span
						class="border-line2 text-ink inline-flex items-center border bg-transparent px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] uppercase"
					>
						{data.event.format}
					</span>
				{/if}
				{#if data.event.status === 'in_progress'}
					<span
						class="bg-warm inline-flex animate-pulse items-center gap-2 px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-white uppercase"
					>
						<span class="inline-block h-[8px] w-[8px] rounded-full bg-white"></span>
						Live
					</span>
				{:else if data.event.status === 'completed'}
					<span
						class="bg-prem inline-flex items-center px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-white uppercase"
					>
						Completed
					</span>
				{/if}
			</div>

			<!-- Date · Location strip -->
			{#if data.event.eventDate || data.event.location}
				<div
					class="border-line2 mt-9 grid grid-cols-1 gap-x-10 gap-y-5 border-t pt-6 sm:grid-cols-2"
				>
					{#if data.event.eventDate}
						<div>
							<div
								class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.16em] uppercase"
							>
								Date
							</div>
							<div class="font-newsreader text-[20px] leading-[1.15] font-semibold tracking-[-0.01em]">
								{formatDate(data.event.eventDate)}
							</div>
						</div>
					{/if}
					{#if data.event.location}
						<div>
							<div
								class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.16em] uppercase"
							>
								Venue
							</div>
							<div class="font-newsreader text-[20px] leading-[1.15] font-semibold tracking-[-0.01em]">
								{data.event.location}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<!--
		Stat strip — four key tournament numbers in editorial paper
		cards with mono uppercase labels and Archivo black numerals.
	-->
	<section class="bg-paper-bg border-ink border-b-[3px] border-double">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-9">
			<dl class="grid grid-cols-2 md:grid-cols-4">
				{#each heroStats as stat (stat.label)}
					<div class="border-line2 -mt-px -ml-px border bg-paper px-6 py-5">
						<dt
							class="text-fade font-mono-system mb-[8px] text-[10px] font-extrabold tracking-[0.16em] uppercase"
						>
							{stat.label}
						</dt>
						<dd
							class="font-archivo text-[34px] font-black leading-none tabular-nums tracking-[-0.02em]"
							style="color: {stat.color};"
						>
							{stat.value}
						</dd>
					</div>
				{/each}
			</dl>
		</div>
	</section>

	<!--
		Tab navigation — editorial square buttons. Active tab fills
		with ink + paper text, inactive sits in a paper outline.
	-->
	<section class="bg-paper border-ink border-b-[3px] border-double">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-7">
			<nav class="flex flex-wrap gap-2" aria-label="Results tabs">
				{#each visibleTabs as tab (tab.id)}
					<button
						type="button"
						onclick={() => (activeTab = tab.id)}
						class="font-mono-system cursor-pointer border-[1.5px] px-[18px] py-[10px] text-[11px] font-extrabold tracking-[0.1em] uppercase transition-colors {activeTab ===
						tab.id
							? 'border-ink bg-ink text-paper-bg'
							: 'border-line2 text-soft hover:border-ink hover:text-ink'}"
					>
						{tab.label}
					</button>
				{/each}
			</nav>
		</div>
	</section>

	<!--
		STANDINGS TAB — editorial table mirroring the AGE Open
		standings table treatment (rounded container, mono headers,
		podium pills for top 3, soft zebra rows, hover lift).
	-->
	{#if activeTab === 'standings'}
		<section class="bg-paper-bg border-ink border-b-[3px] border-double">
			<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-10">
				<div class="mb-6">
					<div
						class="text-accent font-mono-system mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase"
					>
						Final Order
					</div>
					<h2 class="font-newsreader m-0 text-[34px] font-semibold leading-none tracking-[-0.02em]">
						Standings
					</h2>
				</div>

				{#if data.results.length === 0}
					<div class="border-line2 bg-paper border py-14 text-center">
						<div class="font-newsreader text-ink mb-2 text-[22px] font-semibold">
							No results yet.
						</div>
						<p class="text-soft mx-auto max-w-[420px] text-[13px] leading-[1.55]">
							Results will appear once match data is in.
						</p>
					</div>
				{:else}
					<!-- Mobile card stack -->
					<div class="space-y-3 md:hidden">
						{#each data.results as result, i (result.id || i)}
							{@const winPct =
								result.wins + result.losses > 0
									? Math.round((result.wins / (result.wins + result.losses)) * 100)
									: 0}
							{@const playerDecklist = hasMetagame
								? getPlayerDecklist(result.gemId, result.playerName)
								: null}
							{@const _rankColor = rankColor(result.placement)}
							<div
								class="border-line2 bg-paper grid grid-cols-[44px_1fr_auto] items-start gap-3 border border-t-[3px] px-4 py-4"
								style="border-top-color: {_rankColor};"
							>
								<span
									class="font-newsreader text-[30px] font-semibold leading-[0.85] tabular-nums"
									style="color: {_rankColor};"
								>
									{result.placement}
								</span>
								<div class="min-w-0">
									{#if result.gemId}
										<a
											href="/player/{result.gemId}"
											class="text-ink hover:text-warm block truncate text-[15px] font-extrabold transition-colors"
										>
											{result.playerName}
										</a>
									{:else}
										<span class="text-ink truncate text-[15px] font-extrabold">{result.playerName}</span>
									{/if}
									{#if result.hero}
										<div class="text-fade mt-1 truncate text-[12px] font-semibold">
											{result.hero}
										</div>
									{/if}
								</div>
								<div class="text-right">
									{#if result.agePoints > 0}
										<div class="text-accent font-archivo text-[15px] font-black tabular-nums">
											+{result.agePoints}
										</div>
									{/if}
									{#if result.prizeAmount > 0}
										<div class="text-prem font-archivo text-[15px] font-black tabular-nums">
											${result.prizeAmount}
										</div>
									{/if}
								</div>
								<div class="border-line col-span-3 mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
									<div>
										<div class="text-[13px] font-bold tabular-nums">
											<span class="text-prem">{result.wins}</span>
											<span class="text-fade">–</span>
											<span class="text-warm">{result.losses}{result.draws > 0 ? `–${result.draws}` : ''}</span>
										</div>
										<div class="text-fade mt-[2px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
											Record
										</div>
									</div>
									<div>
										<div
											class="text-[13px] font-bold tabular-nums"
											style="color: {winPct >= 70 ? 'var(--ed-prem)' : winPct >= 50 ? 'var(--ed-ink)' : 'var(--ed-warm)'};"
										>
											{winPct}%
										</div>
										<div class="text-fade mt-[2px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
											Win %
										</div>
									</div>
									<div>
										{#if playerDecklist}
											<a
												href="/age-open/{data.event.id}/decklist/{playerDecklist.id}"
												class="text-accent text-[10.5px] font-extrabold tracking-[0.07em] uppercase"
											>
												Decklist →
											</a>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Desktop table -->
					<div
						class="border-line2 bg-paper hidden overflow-hidden rounded-[6px] border md:block"
					>
						<table class="w-full">
							<thead>
								<tr
									class="border-line2 border-b"
									style="background: color-mix(in srgb, var(--ed-paper-bg) 60%, transparent);"
								>
									<th
										class="text-fade font-mono-system w-[68px] px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
									>
										#
									</th>
									<th
										class="text-fade font-mono-system px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
									>
										Player
									</th>
									{#if hasMetagame}
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											Hero
										</th>
									{/if}
									<th
										class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
									>
										Record
									</th>
									<th
										class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
									>
										Win %
									</th>
									<th
										class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
									>
										AGE Pts
									</th>
									<th
										class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
									>
										Prize
									</th>
								</tr>
							</thead>
							<tbody>
								{#each data.results as result, i (result.id || i)}
									{@const winPct =
										result.wins + result.losses > 0
											? Math.round((result.wins / (result.wins + result.losses)) * 100)
											: 0}
									{@const _rankColor = rankColor(result.placement)}
									{@const _isTop3 = result.placement <= 3}
									{@const playerDecklist = getPlayerDecklist(result.gemId, result.playerName)}
									<tr
										class="border-line2 odd:bg-paper even:bg-paper-bg/40 hover:!bg-paper-bg group transition-colors {i ===
										data.results.length - 1
											? ''
											: 'border-b'}"
									>
										<td class="px-5 py-[16px]">
											{#if _isTop3}
												<span
													class="font-newsreader inline-flex h-[34px] w-[34px] items-center justify-center rounded-full text-[15px] font-semibold leading-none tabular-nums"
													style="background: color-mix(in srgb, {_rankColor} 14%, transparent); color: {_rankColor};"
												>
													{result.placement}
												</span>
											{:else}
												<span
													class="font-mono-system inline-flex h-[34px] w-[34px] items-center justify-center text-[14px] font-bold leading-none tabular-nums"
													style="color: {_rankColor};"
												>
													{result.placement}
												</span>
											{/if}
										</td>
										<td class="px-5 py-[16px]">
											{#if result.gemId}
												<a
													href="/player/{result.gemId}"
													class="text-ink group-hover:text-warm block text-[15px] font-bold transition-colors"
												>
													{result.playerName}
												</a>
												<div class="text-fade font-mono-system mt-[2px] text-[10px] font-bold tracking-[0.05em]">
													GEM {result.gemId}
												</div>
											{:else}
												<span class="text-ink text-[15px] font-bold">{result.playerName}</span>
											{/if}
										</td>
										{#if hasMetagame}
											<td class="px-5 py-[16px]">
												{#if result.hero}
													<div class="text-ink text-[13.5px] font-semibold">
														{result.hero}
													</div>
													{#if playerDecklist}
														<a
															href="/age-open/{data.event.id}/decklist/{playerDecklist.id}"
															class="text-accent mt-[3px] inline-flex items-center text-[10.5px] font-extrabold tracking-[0.07em] uppercase"
														>
															Decklist →
														</a>
													{/if}
												{:else}
													<span class="text-fade">—</span>
												{/if}
											</td>
										{/if}
										<td class="px-5 py-[16px] text-center">
											<span class="font-mono-system text-[13.5px] font-bold tabular-nums">
												<span class="text-prem">{result.wins}</span>
												<span class="text-fade mx-[2px]">–</span>
												<span class="text-warm">{result.losses}</span>
												{#if result.draws > 0}
													<span class="text-fade mx-[2px]">–</span>
													<span class="text-soft">{result.draws}</span>
												{/if}
											</span>
										</td>
										<td class="px-5 py-[16px] text-center">
											<span
												class="text-[13.5px] font-bold tabular-nums"
												style="color: {winPct >= 70 ? 'var(--ed-prem)' : winPct >= 50 ? 'var(--ed-ink)' : 'var(--ed-warm)'};"
											>
												{winPct}%
											</span>
										</td>
										<td class="px-5 py-[16px] text-center">
											{#if result.agePoints > 0}
												<span class="text-accent font-archivo text-[15px] font-black tabular-nums">
													+{result.agePoints}
												</span>
											{:else}
												<span class="text-fade">—</span>
											{/if}
										</td>
										<td class="px-5 py-[16px] text-center">
											{#if result.prizeAmount > 0}
												<span class="text-prem font-archivo text-[15px] font-black tabular-nums">
													${result.prizeAmount}
												</span>
											{:else}
												<span class="text-fade">—</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!--
		METAGAME TAB — editorial stat strip + hero distribution grid.
		Clicking a hero opens the player records modal.
	-->
	{#if activeTab === 'metagame' && hasMetagame}
		<section class="bg-paper-bg border-ink border-b-[3px] border-double">
			<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-10">
				<div class="mb-6">
					<div
						class="text-accent font-mono-system mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase"
					>
						Hero Field
					</div>
					<h2 class="font-newsreader m-0 text-[34px] font-semibold leading-none tracking-[-0.02em]">
						Metagame
					</h2>
				</div>

				<!--
					Stat strip — each card uses a layout tuned to its data
					type. Plain counts get a huge Archivo numeral; named
					stats (Most Played / Best Win Rate) lead with the hero
					name in serif and surface the actual metric in a smaller
					colored value beneath. Differentiated visual treatments
					stop the row from reading as four interchangeable cards.
				-->
				<dl class="mb-9 grid grid-cols-1 gap-px bg-line2 sm:grid-cols-2 lg:grid-cols-4">
					<!-- Unique heroes -->
					<div class="bg-paper flex flex-col justify-between px-6 py-5">
						<div
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.18em] uppercase"
						>
							Unique Heroes
						</div>
						<div class="font-archivo text-ink mt-2 text-[52px] font-black leading-[0.85] tabular-nums tracking-[-0.04em]">
							{data.metagameBreakdown.length}
						</div>
						<div class="text-fade font-mono-system mt-2 text-[10px] font-bold tracking-[0.1em] uppercase">
							in the field
						</div>
					</div>

					<!-- Total players -->
					<div class="bg-paper flex flex-col justify-between px-6 py-5">
						<div
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.18em] uppercase"
						>
							Total Players
						</div>
						<div class="font-archivo text-ink mt-2 text-[52px] font-black leading-[0.85] tabular-nums tracking-[-0.04em]">
							{data.totalPlayers}
						</div>
						<div class="text-fade font-mono-system mt-2 text-[10px] font-bold tracking-[0.1em] uppercase">
							competed
						</div>
					</div>

					<!-- Most played hero -->
					<div class="bg-paper relative flex flex-col justify-between px-6 py-5">
						<div
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.18em] uppercase"
						>
							Most Played
						</div>
						{#if metaTopHero}
							<div class="mt-2 flex flex-col gap-[3px]">
								<div class="font-newsreader text-ink truncate text-[22px] font-semibold leading-[1.1] tracking-[-0.01em]" title={metaTopHero.hero}>
									{metaTopHeroSplit.primary}
								</div>
								{#if metaTopHeroSplit.secondary}
									<div
										class="text-warm font-mono-system truncate text-[9.5px] font-extrabold tracking-[0.08em] uppercase"
										title={metaTopHeroSplit.secondary}
									>
										{metaTopHeroSplit.secondary}
									</div>
								{/if}
							</div>
							<div class="font-mono-system mt-2 text-[10px] font-extrabold tracking-[0.1em] uppercase">
								<span class="font-archivo text-ink text-[14px] tabular-nums">{metaTopHero.count}</span>
								<span class="text-soft ml-[5px]">players</span>
								<span class="text-fade ml-2">·</span>
								<span class="text-fade ml-2">{metaTopHero.percentage}% field</span>
							</div>
						{:else}
							<div class="text-fade font-newsreader mt-2 text-[22px] font-semibold">—</div>
						{/if}
					</div>

					<!-- Best win rate -->
					<div class="bg-paper relative flex flex-col justify-between px-6 py-5">
						<div
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.18em] uppercase"
						>
							Best Win Rate
						</div>
						{#if bestWinRateHero}
							<div class="mt-2 flex items-baseline gap-3">
								<span
									class="font-archivo text-[42px] font-black leading-[0.85] tabular-nums tracking-[-0.04em]"
									style="color: var(--ed-prem);"
								>
									{bestWinRateHero.winRate}%
								</span>
								<div class="min-w-0 flex-1 flex flex-col gap-[2px]">
									<div class="font-newsreader text-ink truncate text-[14px] font-semibold leading-[1.05]" title={bestWinRateHero.hero}>
										{metaBestWrSplit.primary}
									</div>
									{#if metaBestWrSplit.secondary}
										<div
											class="text-warm font-mono-system truncate text-[9px] font-extrabold tracking-[0.08em] uppercase"
											title={metaBestWrSplit.secondary}
										>
											{metaBestWrSplit.secondary}
										</div>
									{/if}
								</div>
							</div>
							<div class="text-fade font-mono-system mt-2 text-[10px] font-bold tracking-[0.08em] uppercase">
								<span class="text-prem font-mono-system font-extrabold tabular-nums">{bestWinRateHero.wins}</span><span class="text-fade">–</span><span class="text-warm font-mono-system font-extrabold tabular-nums">{bestWinRateHero.losses}</span>
								<span class="ml-2">record</span>
							</div>
						{:else}
							<div class="text-fade font-newsreader mt-2 text-[22px] font-semibold">—</div>
						{/if}
					</div>
				</dl>

				<!--
					Hero distribution grid — 2 columns on lg+ (was 3) so
					each card has more room for a clean 3-stat tile. Card
					layout: left hero image (full height, masked), right
					title + 3-stat block + action footer. The top rule is
					colored by the hero's win-rate tier so the page reads
					as a sorted tier list at a glance.
				-->
				<div class="border-line2 mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b pb-3">
					<h3 class="font-newsreader text-[24px] font-semibold leading-none tracking-[-0.01em]">
						Hero Distribution
					</h3>
					<span
						class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
					>
						Tap a hero to view player records
					</span>
				</div>
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{#each data.metagameBreakdown as heroData, idx (heroData.hero)}
						{@const isTop = idx === 0}
						{@const split = splitHero(heroData.hero)}
						{@const tierColor = performanceColor(heroData)}
						{@const tierLabel = performanceLabel(heroData)}
						{@const hasMatches = heroData.totalMatches > 0}
						<button
							type="button"
							onclick={() => openHeroModal(heroData)}
							class="group border-line2 bg-paper hover:border-ink relative grid cursor-pointer grid-cols-[140px_1fr] overflow-hidden border text-left transition-colors"
							style="border-top: 3px solid {isTop ? '#C8922E' : tierColor};"
						>
							<!-- Left: hero portrait (full card height) -->
							<div class="bg-panel relative">
								{#if heroData.imageUrl}
									<img
										src={heroData.imageUrl}
										alt={heroData.hero}
										class="absolute inset-0 h-full w-full object-cover object-right transition-transform duration-500 group-hover:scale-[1.04]"
										onerror={(e) => (e.target.style.display = 'none')}
									/>
								{/if}
								{#if isTop}
									<span
										class="absolute top-2 left-2 z-[1] font-mono-system inline-flex items-center px-[7px] py-[3px] text-[9px] font-extrabold tracking-[0.1em] text-white uppercase"
										style="background: #C8922E;"
									>
										Most Played
									</span>
								{/if}
							</div>

							<!-- Right: title + stat tile + action -->
							<div class="flex min-w-0 flex-col px-5 pt-4 pb-4">
								<!-- Title block -->
								<div class="mb-4 flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<h3
											class="font-newsreader text-ink group-hover:text-warm truncate text-[20px] font-semibold leading-[1.05] tracking-[-0.01em] transition-colors"
											title={heroData.hero}
										>
											{split.primary}
										</h3>
										{#if split.secondary}
											<div
												class="text-warm font-mono-system mt-[3px] truncate text-[10px] font-extrabold tracking-[0.1em] uppercase"
												title={split.secondary}
											>
												{split.secondary}
											</div>
										{/if}
									</div>
									{#if hasMatches}
										<span
											class="font-mono-system shrink-0 border px-[8px] py-[3px] text-[9.5px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap"
											style="color: {tierColor}; border-color: color-mix(in srgb, {tierColor} 45%, transparent); background-color: color-mix(in srgb, {tierColor} 8%, transparent);"
										>
											{tierLabel}
										</span>
									{/if}
								</div>

								<!--
									3-stat tile — Players · Win Rate · Record.
									Each stat sits in the same vertical
									position with the same caption pattern so
									the cards scan as a small table.
								-->
								<div class="border-line2 grid grid-cols-3 divide-x divide-[#E4DECF] border-y bg-paper-bg/40">
									<!-- Players -->
									<div class="px-3 py-3 text-center">
										<div class="font-archivo text-ink text-[22px] font-black leading-none tabular-nums tracking-[-0.02em]">
											{heroData.count}
										</div>
										<div
											class="text-fade font-mono-system mt-[6px] text-[9px] font-extrabold tracking-[0.14em] uppercase"
										>
											Players
										</div>
										<div
											class="text-fade font-mono-system mt-[3px] text-[9px] font-bold tracking-[0.06em] tabular-nums uppercase"
										>
											{heroData.percentage}% field
										</div>
									</div>
									<!-- Win Rate -->
									<div class="px-3 py-3 text-center">
										{#if hasMatches}
											<div
												class="font-archivo text-[22px] font-black leading-none tabular-nums tracking-[-0.02em]"
												style="color: {tierColor};"
											>
												{heroData.winRate}%
											</div>
											<div
												class="text-fade font-mono-system mt-[6px] text-[9px] font-extrabold tracking-[0.14em] uppercase"
											>
												Win Rate
											</div>
											<div
												class="text-fade font-mono-system mt-[3px] text-[9px] font-bold tracking-[0.06em] uppercase"
											>
												{heroData.totalMatches} games
											</div>
										{:else}
											<div class="text-fade font-archivo text-[22px] font-black leading-none">
												—
											</div>
											<div
												class="text-fade font-mono-system mt-[6px] text-[9px] font-extrabold tracking-[0.14em] uppercase"
											>
												Win Rate
											</div>
											<div
												class="text-fade font-mono-system mt-[3px] text-[9px] font-bold tracking-[0.06em] uppercase"
											>
												No data
											</div>
										{/if}
									</div>
									<!-- Record -->
									<div class="px-3 py-3 text-center">
										{#if hasMatches}
											<div class="font-archivo text-[22px] font-black leading-none tabular-nums tracking-[-0.02em]">
												<span class="text-prem">{heroData.wins}</span><span class="text-fade mx-[1px]">–</span><span class="text-warm">{heroData.losses}</span>
											</div>
											<div
												class="text-fade font-mono-system mt-[6px] text-[9px] font-extrabold tracking-[0.14em] uppercase"
											>
												Record
											</div>
											<div
												class="text-fade font-mono-system mt-[3px] text-[9px] font-bold tracking-[0.06em] uppercase"
											>
												{heroData.draws > 0 ? `${heroData.draws} draws` : 'no draws'}
											</div>
										{:else}
											<div class="text-fade font-archivo text-[22px] font-black leading-none">
												—
											</div>
											<div
												class="text-fade font-mono-system mt-[6px] text-[9px] font-extrabold tracking-[0.14em] uppercase"
											>
												Record
											</div>
											<div
												class="text-fade font-mono-system mt-[3px] text-[9px] font-bold tracking-[0.06em] uppercase"
											>
												No data
											</div>
										{/if}
									</div>
								</div>

								<!-- Footer: action hint, brightens on hover -->
								{#if heroData.players?.length > 0}
									<div
										class="text-accent font-mono-system mt-[14px] flex items-center justify-between text-[10px] font-extrabold tracking-[0.12em] uppercase"
									>
										<span>
											View {heroData.players.length} player{heroData.players.length !== 1 ? 's' : ''}
										</span>
										<span class="opacity-60 transition-opacity group-hover:opacity-100">→</span>
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!--
		MATCHES TAB — round selector + search filter at the top, then a
		flat list of compact match rows. One row per match makes the
		page scannable; the round pills + search input let users
		drill into a specific subset instead of scrolling all rounds.
		The old 3-up grid of bordered cards is gone — single horizontal
		rows are denser and faster to scan when there's lots of data.
	-->
	{#if activeTab === 'matches' && hasMatches}
		{#snippet playerSide(player, isWinner, isDraw, align = 'left')}
			{@const alignRight = align === 'right'}
			<div class="flex min-w-0 items-center gap-[10px] {alignRight ? 'flex-row-reverse' : ''}">
				{#if player.hero}
					<img
						src={getHeroImageUrl(player.hero)}
						alt=""
						class="border-line2 h-[36px] w-[36px] shrink-0 border object-cover object-right {isWinner
							? 'ring-1 ring-prem'
							: ''}"
						onerror={(e) => (e.target.style.display = 'none')}
					/>
				{:else}
					<div class="border-line2 bg-panel h-[36px] w-[36px] shrink-0 border"></div>
				{/if}
				<div class="min-w-0 {alignRight ? 'text-right' : ''}">
					{#if player.gemId}
						<a
							href="/player/{player.gemId}"
							class="block truncate text-[13.5px] font-bold transition-colors {isWinner
								? 'text-prem'
								: isDraw
									? 'text-warm'
									: 'text-ink hover:text-accent'}"
						>
							{player.name}
						</a>
					{:else}
						<span
							class="block truncate text-[13.5px] font-bold {isWinner
								? 'text-prem'
								: isDraw
									? 'text-warm'
									: 'text-ink'}"
						>
							{player.name}
						</span>
					{/if}
					{#if player.hero}
						<div class="text-fade truncate text-[10.5px] font-semibold">{player.hero}</div>
					{/if}
				</div>
			</div>
		{/snippet}

		<section class="bg-paper-bg border-ink border-b-[3px] border-double">
			<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-10">
				<div class="mb-6 flex flex-wrap items-end justify-between gap-5">
					<div>
						<div
							class="text-accent font-mono-system mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase"
						>
							Round by round
						</div>
						<h2 class="font-newsreader m-0 text-[34px] font-semibold leading-none tracking-[-0.02em]">
							Matches
						</h2>
					</div>
					<!-- Player search -->
					<div
						class="border-line2 bg-paper focus-within:border-ink relative flex items-center border"
					>
						<span class="text-fade pl-3 text-[14px]" aria-hidden="true">⌕</span>
						<input
							type="search"
							bind:value={matchesSearch}
							placeholder="Search players or heroes"
							class="text-ink placeholder:text-fade h-[40px] w-[260px] appearance-none border-0 bg-transparent px-2 text-[12px] font-bold shadow-none outline-none focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
						/>
					</div>
				</div>

				<!-- Round selector pills -->
				<div class="mb-7 flex flex-wrap items-center gap-[6px]">
					<button
						type="button"
						onclick={() => (selectedMatchRound = 'all')}
						class="font-mono-system cursor-pointer border-[1.5px] px-[14px] py-[8px] text-[10.5px] font-extrabold tracking-[0.1em] uppercase transition-colors {selectedMatchRound ===
						'all'
							? 'border-ink bg-ink text-paper-bg'
							: 'border-line2 text-soft hover:border-ink hover:text-ink'}"
					>
						All rounds
					</button>
					{#each data.matchesByRound as roundData (roundData.round)}
						<button
							type="button"
							onclick={() => (selectedMatchRound = roundData.round)}
							class="font-mono-system inline-flex cursor-pointer items-center gap-2 border-[1.5px] px-[14px] py-[8px] text-[10.5px] font-extrabold tracking-[0.1em] uppercase transition-colors {selectedMatchRound ===
							roundData.round
								? 'border-ink bg-ink text-paper-bg'
								: 'border-line2 text-soft hover:border-ink hover:text-ink'}"
						>
							R{roundData.round}
							<span
								class="font-mono-system text-[9.5px] tabular-nums {selectedMatchRound ===
								roundData.round
									? 'opacity-70'
									: 'opacity-60'}"
							>
								{roundData.matches.length}
							</span>
						</button>
					{/each}
				</div>

				{#if filteredMatchRounds().length === 0}
					<div class="border-line2 bg-paper border py-12 text-center">
						<div class="font-newsreader text-ink mb-2 text-[20px] font-semibold">
							No matches found.
						</div>
						<p class="text-soft mx-auto max-w-[380px] text-[13px] leading-[1.55]">
							Try a different round, or clear the search.
						</p>
					</div>
				{:else}
					<div class="space-y-9">
						{#each filteredMatchRounds() as roundData (roundData.round)}
							<div>
								<!-- Round header: title + stats line (decided · draws · pending) -->
								<div class="border-line2 mb-3 flex flex-wrap items-baseline justify-between gap-3 border-b pb-[10px]">
									<h3 class="font-newsreader text-[22px] font-semibold leading-none tracking-[-0.01em]">
										Round {roundData.round}
									</h3>
									<div class="font-mono-system flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.1em] uppercase">
										<span class="text-soft">
											<span class="text-ink font-archivo text-[15px] tabular-nums">{roundData.matches.length}</span>
											Matches
										</span>
										{#if roundData.decided > 0}
											<span class="text-fade" aria-hidden="true">·</span>
											<span class="text-prem">
												<span class="font-archivo text-[15px] tabular-nums">{roundData.decided}</span>
												Decided
											</span>
										{/if}
										{#if roundData.draws > 0}
											<span class="text-fade" aria-hidden="true">·</span>
											<span class="text-warm">
												<span class="font-archivo text-[15px] tabular-nums">{roundData.draws}</span>
												Draws
											</span>
										{/if}
										{#if roundData.pending > 0}
											<span class="text-fade" aria-hidden="true">·</span>
											<span class="text-fade">
												<span class="font-archivo text-[15px] tabular-nums">{roundData.pending}</span>
												Pending
											</span>
										{/if}
									</div>
								</div>

								<!-- Compact match rows -->
								<div class="border-line2 bg-paper overflow-hidden border">
									{#each roundData.matches as match, mi (mi)}
										{@const p1Wins = match.winner === 'player1'}
										{@const p2Wins = match.winner === 'player2'}
										{@const noWinner = !match.winner && !match.isDraw}
										<div
											class="border-line2 grid grid-cols-[60px_1fr_60px_1fr_120px] items-center {mi >
											0
												? 'border-t'
												: ''}"
										>
											<!-- Table # -->
											<div class="text-fade font-mono-system py-[14px] text-center text-[10px] font-extrabold tracking-[0.1em] uppercase tabular-nums">
												{#if match.table}
													T{match.table}
												{:else}
													—
												{/if}
											</div>
											<!-- Player 1 (left) — subtle prem-green tint when winning -->
											<div class="px-3 py-[12px] {p1Wins ? 'bg-prem/[0.06]' : ''}">
												{@render playerSide(match.player1, p1Wins, match.isDraw, 'left')}
											</div>
											<!-- vs marker — bigger if undecided -->
											<div class="font-mono-system flex flex-col items-center justify-center py-[12px] text-center">
												{#if match.isDraw}
													<span class="font-archivo text-warm text-[13px] font-black tracking-[0.04em] uppercase">=</span>
												{:else if p1Wins}
													<span class="text-prem text-[14px] font-bold" aria-hidden="true">←</span>
												{:else if p2Wins}
													<span class="text-prem text-[14px] font-bold" aria-hidden="true">→</span>
												{:else}
													<span class="text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">vs</span>
												{/if}
											</div>
											<!-- Player 2 (right) -->
											<div class="px-3 py-[12px] {p2Wins ? 'bg-prem/[0.06]' : ''}">
												{@render playerSide(match.player2, p2Wins, match.isDraw, 'right')}
											</div>
											<!-- Result pill — single clear badge per row -->
											<div class="border-line2 flex items-center justify-center border-l py-[12px]">
												{#if match.isDraw}
													<span
														class="border-warm bg-warm/[0.08] text-warm font-mono-system inline-flex items-center border px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.1em] uppercase"
													>
														Draw
													</span>
												{:else if p1Wins || p2Wins}
													<span
														class="border-prem bg-prem font-mono-system inline-flex items-center px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.1em] text-white uppercase"
													>
														✓ {p1Wins ? 'P1' : 'P2'} wins
													</span>
												{:else}
													<span
														class="border-line2 text-fade font-mono-system inline-flex items-center border px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.1em] uppercase"
													>
														Pending
													</span>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!--
		TOP 8 BRACKET TAB — editorial bracket layout. Champion banner
		sits above the bracket; SVG connectors use a paper-toned hairline
		so the bracket reads as a printed chart, not a glowing app UI.
	-->
	{#if activeTab === 'top8' && hasBracket}
		{@const bracket = data.top8Bracket}

		{#snippet bracketMatch(match, variant = 'default')}
			{@const isFinals = variant === 'finals'}
			<div class="border-line2 bg-paper border {isFinals ? '!border-[#C8922E]' : ''}">
				{#each [match.player1, match.player2] as player, idx}
					<div
						class="flex items-center gap-2 px-3 py-[8px] {idx === 0 ? 'border-line2 border-b' : ''} {player.isWinner
							? 'bg-prem/5'
							: ''}"
					>
						<span class="text-fade font-mono-system w-4 text-center text-[10px] font-bold tabular-nums">
							{player.seed}
						</span>
						{#if player.hero}
							<img
								src={getHeroImageUrl(player.hero)}
								alt=""
								class="h-7 w-7 shrink-0 object-cover object-right"
								onerror={(e) => (e.target.style.display = 'none')}
							/>
						{:else}
							<div class="bg-panel h-7 w-7 shrink-0"></div>
						{/if}
						<div class="min-w-0 flex-1">
							{#if player.gemId}
								<a
									href="/player/{player.gemId}"
									class="block truncate text-[13px] font-bold {player.isWinner
										? 'text-prem'
										: 'text-ink'} transition-colors hover:text-accent"
								>
									{player.name}
								</a>
							{:else}
								<span
									class="block truncate text-[13px] font-bold {player.isWinner
										? 'text-prem'
										: 'text-ink'}"
								>
									{player.name}
								</span>
							{/if}
							{#if player.hero}
								<div class="text-fade truncate text-[10px] font-semibold">{player.hero}</div>
							{/if}
						</div>
						{#if player.isWinner}
							<span class="text-prem text-[13px] font-bold" aria-hidden="true">✓</span>
						{/if}
					</div>
				{/each}
			</div>
		{/snippet}

		<section class="bg-paper-bg border-ink border-b-[3px] border-double">
			<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-10">
				<div class="mb-6">
					<div
						class="text-accent font-mono-system mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase"
					>
						Single elimination
					</div>
					<h2 class="font-newsreader m-0 text-[34px] font-semibold leading-none tracking-[-0.02em]">
						Top 8 Bracket
					</h2>
				</div>

				<!-- Champion banner -->
				{#if data.top8Bracket.champion}
					<div
						class="border-ink relative mb-8 flex flex-wrap items-center gap-5 overflow-hidden border-l-[3px] bg-paper p-6"
						style="border-left-color: #C8922E;"
					>
						{#if data.top8Bracket.champion.hero}
							<img
								src={getHeroImageUrl(data.top8Bracket.champion.hero)}
								alt=""
								class="border-line2 h-[80px] w-[80px] shrink-0 border object-cover object-right"
								onerror={(e) => (e.target.style.display = 'none')}
							/>
						{/if}
						<div class="flex-1 min-w-0">
							<div
								class="font-mono-system mb-[6px] text-[10.5px] font-extrabold tracking-[0.18em] uppercase"
								style="color: #C8922E;"
							>
								Champion
							</div>
							{#if data.top8Bracket.champion.gemId}
								<a
									href="/player/{data.top8Bracket.champion.gemId}"
									class="font-newsreader text-ink hover:text-[#C8922E] text-[32px] font-semibold leading-[1.05] tracking-[-0.01em] transition-colors"
								>
									{data.top8Bracket.champion.name}
								</a>
							{:else}
								<div class="font-newsreader text-ink text-[32px] font-semibold leading-[1.05] tracking-[-0.01em]">
									{data.top8Bracket.champion.name}
								</div>
							{/if}
							{#if data.top8Bracket.champion.hero}
								<div class="text-soft mt-[6px] text-[14px] font-semibold">
									{data.top8Bracket.champion.hero}
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Desktop bracket visualization -->
				<div class="hidden overflow-x-auto md:block">
					<div class="min-w-[700px]">
						<div class="mb-4 grid grid-cols-[1fr_40px_1fr_40px_1fr] gap-0">
							{#each ['Quarterfinals', 'Semifinals', 'Finals'] as label, i (label)}
								{#if i === 0}
									<div
										class="text-fade font-mono-system text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
									>
										{label}
									</div>
								{:else}
									<div></div>
									<div
										class="text-fade font-mono-system text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
									>
										{label}
									</div>
								{/if}
							{/each}
						</div>

						<div class="grid grid-cols-[1fr_40px_1fr_40px_1fr] gap-0">
							<!-- QF column -->
							<div class="flex flex-col justify-between gap-3">
								{#each bracket.quarterfinals as qf, i (i)}
									{#if qf}
										{@render bracketMatch(qf)}
									{/if}
								{/each}
							</div>

							<!-- QF -> SF connector -->
							<div class="relative">
								<svg class="absolute inset-0 h-full w-full" preserveAspectRatio="none">
									<path d="M 0 12.5% L 50% 12.5% L 50% 37.5% L 100% 37.5%" fill="none" stroke="var(--ed-line2)" stroke-width="1.5" />
									<path d="M 0 37.5% L 50% 37.5%" fill="none" stroke="var(--ed-line2)" stroke-width="1.5" />
									<path d="M 0 62.5% L 50% 62.5% L 50% 87.5% L 100% 87.5%" fill="none" stroke="var(--ed-line2)" stroke-width="1.5" />
									<path d="M 0 87.5% L 50% 87.5%" fill="none" stroke="var(--ed-line2)" stroke-width="1.5" />
								</svg>
							</div>

							<!-- SF column -->
							<div class="flex flex-col justify-around gap-3 py-[12%]">
								{#each bracket.semifinals as sf, i (i)}
									{#if sf}
										{@render bracketMatch(sf)}
									{/if}
								{/each}
							</div>

							<!-- SF -> Finals connector -->
							<div class="relative">
								<svg class="absolute inset-0 h-full w-full" preserveAspectRatio="none">
									<path d="M 0 37.5% L 50% 37.5% L 50% 62.5% L 100% 62.5%" fill="none" stroke="var(--ed-line2)" stroke-width="1.5" />
									<path d="M 0 62.5% L 50% 62.5%" fill="none" stroke="var(--ed-line2)" stroke-width="1.5" />
									<line x1="50%" y1="50%" x2="100%" y2="50%" stroke="var(--ed-line2)" stroke-width="1.5" />
								</svg>
							</div>

							<!-- Finals column -->
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

				<!-- Mobile list view -->
				<div class="space-y-6 md:hidden">
					{#each [{ label: 'Quarterfinals', list: bracket.quarterfinals }, { label: 'Semifinals', list: bracket.semifinals }, { label: 'Finals', list: bracket.finals ? [bracket.finals] : [] }] as round (round.label)}
						<div>
							<div
								class="text-fade font-mono-system mb-3 text-[10px] font-extrabold tracking-[0.16em] uppercase"
							>
								{round.label}
							</div>
							<div class="space-y-2">
								{#each round.list as m, i (i)}
									{#if m}
										{@render bracketMatch(m, round.label === 'Finals' ? 'finals' : 'default')}
									{/if}
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- DECKLISTS TAB — grid of DecklistCard components. -->
	{#if activeTab === 'decklists' && hasDecklists}
		<section class="bg-paper-bg border-ink border-b-[3px] border-double">
			<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-10">
				<div class="mb-6 flex flex-wrap items-baseline justify-between gap-4">
					<div>
						<div
							class="text-accent font-mono-system mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase"
						>
							Top finishers
						</div>
						<h2 class="font-newsreader m-0 text-[34px] font-semibold leading-none tracking-[-0.02em]">
							Decklists
						</h2>
					</div>
					<span class="text-fade font-mono-system text-[11px] font-extrabold tracking-[0.14em] uppercase">
						{data.decklists.length} on file
					</span>
				</div>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
		</section>
	{/if}
</AgeShell>

<!-- Hero player records modal — editorial paper card with ink hairlines. -->
{#if selectedHeroModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onkeydown={(e) => e.key === 'Escape' && closeHeroModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<button
			transition:fade={{ duration: 200 }}
			class="absolute inset-0 cursor-default bg-ink/70"
			onclick={closeHeroModal}
			aria-label="Close modal"
		></button>

		<div
			transition:scale={{ duration: 200, start: 0.96 }}
			class="border-ink bg-paper text-ink relative max-h-[85vh] w-full max-w-lg overflow-hidden border-[1.5px] shadow-2xl"
		>
			<!--
				Header — clean hero portrait cover, no paper fade overlay.
				The hero name now sits in its own paper section below the
				image so it always reads against an ink-on-paper field
				instead of fighting the bottom of the photograph.
			-->
			<div class="border-line2 relative h-[160px] overflow-hidden border-b">
				{#if selectedHeroModal.imageUrl}
					<img
						src={selectedHeroModal.imageUrl}
						alt={selectedHeroModal.hero}
						class="absolute inset-0 h-full w-full object-cover object-right"
					/>
				{:else}
					<div class="bg-panel absolute inset-0"></div>
				{/if}

				<button
					onclick={closeHeroModal}
					aria-label="Close hero details"
					class="border-line2 bg-paper text-ink hover:bg-ink hover:text-paper-bg absolute top-3 right-3 z-[1] flex h-9 w-9 items-center justify-center border-[1.5px] text-[16px] font-bold transition-colors"
				>
					×
				</button>
			</div>

			<!-- Hero name + summary -->
			<div class="border-line2 border-b px-6 py-5">
				<h3 class="font-newsreader text-ink text-[26px] font-semibold leading-[1.05] tracking-[-0.01em]">
					{selectedHeroModal.hero}
				</h3>
				<div class="text-soft mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold">
					<span>{selectedHeroModal.count} player{selectedHeroModal.count !== 1 ? 's' : ''}</span>
					<span class="text-fade">·</span>
					<span class="text-fade">{selectedHeroModal.percentage}% of field</span>
					{#if selectedHeroModal.totalMatches > 0}
						{@const _wr = parseFloat(selectedHeroModal.winRate)}
						<span class="text-fade">·</span>
						<span
							class="font-mono-system border px-[7px] py-[2px] text-[10px] font-extrabold tracking-[0.06em] uppercase"
							style="color: {_wr >= 55 ? 'var(--ed-prem)' : _wr >= 45 ? 'var(--ed-ink)' : 'var(--ed-warm)'}; border-color: color-mix(in srgb, {_wr >= 55 ? 'var(--ed-prem)' : _wr >= 45 ? 'var(--ed-ink)' : 'var(--ed-warm)'} 40%, transparent);"
						>
							{selectedHeroModal.winRate}% WR
						</span>
					{/if}
				</div>
			</div>

			<!-- Stats bar -->
			{#if selectedHeroModal.totalMatches > 0}
				<div class="border-line2 grid grid-cols-3 divide-x divide-[#E4DECF] border-b bg-paper-bg/40">
					{#each [{ label: 'Wins', value: selectedHeroModal.wins, color: 'var(--ed-prem)' }, { label: 'Losses', value: selectedHeroModal.losses, color: 'var(--ed-warm)' }, { label: 'Matches', value: selectedHeroModal.totalMatches, color: 'var(--ed-ink)' }] as stat (stat.label)}
						<div class="px-4 py-3 text-center">
							<div
								class="font-archivo text-[20px] font-black leading-none tabular-nums"
								style="color: {stat.color};"
							>
								{stat.value}
							</div>
							<div
								class="text-fade font-mono-system mt-[6px] text-[9px] font-extrabold tracking-[0.14em] uppercase"
							>
								{stat.label}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Player list -->
			<div class="max-h-[45vh] overflow-y-auto px-6 py-5">
				<div
					class="text-fade font-mono-system mb-3 text-[10px] font-extrabold tracking-[0.16em] uppercase"
				>
					Player records
				</div>
				{#if selectedHeroModal.players?.length > 0}
					<div class="space-y-2">
						{#each selectedHeroModal.players as player, i (i)}
							{@const playerWinPct = parseFloat(player.winRate)}
							<div
								class="border-line2 hover:bg-paper-bg flex items-center gap-3 border bg-paper px-3 py-[10px] transition-colors"
							>
								<div class="min-w-0 flex-1">
									{#if player.gemId}
										<a
											href="/player/{player.gemId}"
											class="text-ink hover:text-accent block truncate text-[14px] font-bold transition-colors"
											onclick={closeHeroModal}
										>
											{player.name}
										</a>
									{:else}
										<span class="text-ink block truncate text-[14px] font-bold">{player.name}</span>
									{/if}
								</div>
								<span class="font-mono-system text-[12px] font-bold tabular-nums">
									<span class="text-prem">{player.wins}</span><span class="text-fade">–</span><span class="text-warm">{player.losses}</span>{player.draws > 0 ? `–${player.draws}` : ''}
								</span>
								<span
									class="font-mono-system border px-[7px] py-[2px] text-[10px] font-extrabold tracking-[0.06em] uppercase"
									style="color: {playerWinPct >= 60 ? 'var(--ed-prem)' : playerWinPct >= 40 ? 'var(--ed-ink)' : 'var(--ed-warm)'}; border-color: color-mix(in srgb, {playerWinPct >= 60 ? 'var(--ed-prem)' : playerWinPct >= 40 ? 'var(--ed-ink)' : 'var(--ed-warm)'} 40%, transparent);"
								>
									{player.winRate}%
								</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-soft text-[13px] font-medium">No match data available for this hero.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
