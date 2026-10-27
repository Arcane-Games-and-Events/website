<script>
	/**
	 * AGE Open — Standings, in the series' "tournament day" register.
	 *
	 *   sub-header   logo, "Standings", section links
	 *   filter bar   search · season · circuit (sticky from md)
	 *   table        rank, player, circuit, points, record, win %, events,
	 *                top 8, rating — sortable; a card stack on phones; the
	 *                Championship cut drawn after 16th in a single circuit
	 *   pagination   25 per page
	 *   glossary     how to read the table
	 *
	 * Season is a server-side filter (the loader aggregates the chosen
	 * season), so changing it navigates with `?season=`. Circuit, search,
	 * sort and page are client-side.
	 */
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { reveal } from '$lib/actions/reveal.js';
	import { CIRCUITS } from '$lib/data/circuits.js';
	import AgeOpenSubHead from './AgeOpenSubHead.svelte';
	import RatingBadge from '$lib/components/age/RatingBadge.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	const SLUG = { 'Los Angeles': 'la', 'St. Louis': 'stl', 'New England': 'ne' };
	const ccVar = (name) => `var(--ed-cc-${SLUG[name] ?? 'la'})`;
	const abbr = (name) => CIRCUITS[name]?.abbreviation ?? name;
	const TIER_HEX = {
		yellow: '#C8922E',
		purple: '#6A4A86',
		cyan: '#2C5BA8',
		teal: '#1C7A4B',
		amber: '#E5703E',
		gray: '#928B79',
		orange: '#C0461F',
		stone: '#928B79',
		slate: '#928B79'
	};
	const tierHex = (p) =>
		p.isProvisional ? '#928B79' : (TIER_HEX[p.ratingTier?.color] ?? '#56503F');
	const tierLabel = (p) => (p.isProvisional ? 'Provisional' : (p.ratingTier?.label ?? 'Unranked'));
	const rankTone = (r) =>
		r === 1
			? 'text-gold'
			: r === 2
				? 'text-fade'
				: r === 3
					? 'text-hero-rb'
					: r <= 16
						? 'text-warm'
						: 'text-fade/60';

	// ============ season (server-side) ============
	const season = $derived(data.selectedSeason || 'all');
	const seasons = $derived(data.availableSeasons ?? ['all']);
	const circuitsForSeason = $derived(
		['Los Angeles', 'St. Louis', 'New England'].filter((c) =>
			(data.circuitsByYear?.[season] ?? []).includes(c)
		)
	);
	function changeSeason(s) {
		const url = new URL($page.url);
		url.searchParams.set('tab', 'standings');
		if (s === 'all') url.searchParams.delete('season');
		else url.searchParams.set('season', s);
		goto(url.toString(), { noScroll: true, keepFocus: true });
	}
	let refreshing = $state(false);
	async function refresh() {
		if (refreshing) return;
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	// ============ client-side filters ============
	let q = $state('');
	let circuit = $state('all');
	let sortKey = $state('rank');
	let sortDir = $state('asc');
	let pageNo = $state(1);
	const PER_PAGE = 25;
	const LABEL = 'text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
	const SORT_OPTIONS = [
		{ v: 'rank', l: 'Rank' },
		{ v: 'points', l: 'Most points' },
		{ v: 'winPct', l: 'Best win %' },
		{ v: 'events', l: 'Most events' },
		{ v: 'top8', l: 'Most top 8s' },
		{ v: 'ageRating', l: 'Highest rating' }
	];
	function setSort(key) {
		sortKey = key;
		sortDir = key === 'rank' ? 'asc' : 'desc';
		pageNo = 1;
	}

	const COLUMNS = [
		{ key: 'points', label: 'Points' },
		{ key: 'record', label: 'Record' },
		{ key: 'winPct', label: 'Win %' },
		{ key: 'events', label: 'Events' },
		{ key: 'top8', label: 'Top 8' }
	];
	function toggleSort(key) {
		if (sortKey === key) {
			if (key === 'rank') sortDir = sortDir === 'asc' ? 'desc' : 'asc';
			else if (sortDir === 'desc') sortDir = 'asc';
			else {
				sortKey = 'rank';
				sortDir = 'asc';
			}
		} else {
			sortKey = key;
			sortDir = key === 'rank' ? 'asc' : 'desc';
		}
		pageNo = 1;
	}
	const val = (p, key) =>
		({
			rank: p.calculatedRank || p.rank || 999,
			points: p.totalPoints || 0,
			record: p.matchesWon || 0,
			winPct: p.winPercentage || 0,
			events: p.eventsPlayed || 0,
			top8: p.top8Finishes || 0,
			ageRating: p.ageRating || 0
		})[key];
	const tiebreak = (a, b) =>
		(b.totalPoints || 0) - (a.totalPoints || 0) ||
		(b.top8Finishes || 0) - (a.top8Finishes || 0) ||
		(b.matchesWon || 0) - (a.matchesWon || 0) ||
		(b.eventsPlayed || 0) - (a.eventsPlayed || 0);

	const norm = (s) => (s || '').toLowerCase();
	const filtered = $derived.by(() => {
		const terms = norm(q).split(/\s+/).filter(Boolean);
		const list = (data.standings ?? [])
			.filter((p) => {
				if (circuit === 'all') return true;
				if (p.circuitsPlayed) return p.circuitsPlayed.includes(circuit);
				return p.circuit === circuit;
			})
			.filter((p) => !terms.length || terms.every((t) => norm(p.playerName).includes(t)))
			.sort((a, b) => {
				const d =
					sortKey === 'rank' ? val(a, 'rank') - val(b, 'rank') : val(b, sortKey) - val(a, sortKey);
				const s = sortDir === 'asc' ? (sortKey === 'rank' ? d : -d) : sortKey === 'rank' ? -d : d;
				return s || tiebreak(a, b);
			});
		// Ranks are positions within the filtered set
		return list.map((p, i) => ({
			...p,
			rankShown: sortKey === 'rank' ? i + 1 : p.calculatedRank || i + 1
		}));
	});
	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
	const curPage = $derived(Math.min(pageNo, pageCount));
	const shown = $derived(filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE));
	const activeCount = $derived((q ? 1 : 0) + (circuit !== 'all' ? 1 : 0));
	// Championship cut after 16th: only meaningful for one circuit in one season, in rank order
	const showCut = $derived(
		season !== 'all' && circuit !== 'all' && sortKey === 'rank' && sortDir === 'asc'
	);
	$effect(() => {
		q;
		circuit;
		pageNo = 1;
	});
	function clearAll() {
		q = '';
		circuit = 'all';
		sortKey = 'rank';
		sortDir = 'asc';
	}
	/** @type {HTMLElement | undefined} */
	let tableEl = $state();
	function gotoPage(n) {
		if (n < 1 || n > pageCount || n === curPage) return;
		pageNo = n;
		requestAnimationFrame(() => tableEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
	}
	const pageNumbers = $derived.by(() => {
		const total = pageCount;
		const cur = curPage;
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const out = [1];
		if (cur > 3) out.push('…');
		for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) out.push(i);
		if (cur < total - 2) out.push('…');
		out.push(total);
		return out;
	});

	const resultLine = $derived.by(() => {
		if (!filtered.length) return 'No players match.';
		const from = (curPage - 1) * PER_PAGE + 1;
		const to = Math.min(curPage * PER_PAGE, filtered.length);
		const scope = [
			season === 'all' ? 'All time' : season,
			circuit === 'all' ? 'every circuit' : circuit
		].join(' · ');
		return `Showing ${from}–${to} of ${filtered.length} players · ${scope}${q ? ` · “${q}”` : ''}.`;
	});
	const winTone = (p) =>
		p.winPercentage == null
			? 'text-fade'
			: p.winPercentage >= 60
				? 'text-prem'
				: p.winPercentage >= 50
					? 'text-gold'
					: 'text-hero-rb';
	const winBar = (p) =>
		p.winPercentage == null
			? 'var(--ed-line)'
			: p.winPercentage >= 60
				? 'var(--ed-prem)'
				: p.winPercentage >= 50
					? 'var(--ed-gold)'
					: 'var(--ed-hero-rb)';
	const pct = (p) => (p.winPercentage != null ? `${Math.round(p.winPercentage)}%` : '—');
	const record = (p) => `${p.matchesWon || 0}–${(p.matchesPlayed || 0) - (p.matchesWon || 0)}`;
	const circuitLabel = (p) => (p.circuit ? [p.circuit] : (p.circuitsPlayed ?? []));

	const GLOSSARY = [
		[
			'AGE Points',
			'Earned by placement at every open. The top 16 by points in each circuit qualify for the Player’s Championship.'
		],
		['Record', 'Match wins and losses across every event in the view.'],
		['Win %', 'Match win rate. Green at 60% and up, gold from 50%, red below.'],
		['Events', 'AGE Opens played in the view.'],
		['Top 8', 'Times the player made the Top 8 and cashed.'],
		[
			'Rating',
			'AGE Rating, a tier drawn from results over time. Provisional until three events have been played.'
		]
	];
</script>

<AgeOpenSubHead
	active="standings"
	title="Standings"
	strap="Every point, every player. The top 16 in each circuit earn a seat at the Player’s Championship."
/>

<!-- ============ filter bar ============ -->
<div class="z-[5] border-b border-line bg-paper-bg/95 backdrop-blur-sm md:sticky md:top-[59px]">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-4 md:px-8 md:py-5">
		<div class="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-8 lg:gap-y-4">
			<!-- find a player -->
			<div class="min-w-0 lg:w-[240px] lg:shrink-0">
				<label for="standings-search" class={LABEL}>Find a player</label>
				<div
					class="mt-2 flex items-center gap-2.5 border border-line2 bg-paper-bg px-3 transition-colors focus-within:border-ink hover:border-ink"
				>
					<svg
						class="h-4 w-4 shrink-0 text-warm"
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						aria-hidden="true"
					>
						<circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4.5 4.5" stroke-linecap="square" />
					</svg>
					<input
						id="standings-search"
						type="search"
						bind:value={q}
						placeholder="Type a name…"
						autocomplete="off"
						enterkeyhint="search"
						class="min-h-[44px] w-full border-0 bg-transparent font-newsreader text-[17px] leading-tight text-ink placeholder:text-fade focus:outline-none [&::-webkit-search-cancel-button]:hidden"
					/>
					{#if q}
						<button
							type="button"
							onclick={() => (q = '')}
							aria-label="Clear search"
							class="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center text-[16px] leading-none text-fade hover:text-ink"
							>×</button
						>
					{/if}
				</div>
			</div>

			<!-- season -->
			<div class="min-w-0 lg:shrink-0">
				<p class={LABEL} id="standings-season-label">Season</p>
				<div
					class="mt-2 flex gap-px border border-line2 bg-line2"
					role="group"
					aria-labelledby="standings-season-label"
				>
					{#each seasons as s (s)}
						<button
							type="button"
							onclick={() => changeSeason(s)}
							aria-pressed={season === s}
							class="min-h-[44px] flex-1 px-2 text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors md:flex-none md:px-3 {season ===
							s
								? 'bg-ink text-paper-bg'
								: 'bg-paper-bg text-soft hover:bg-paper hover:text-ink'}"
							>{s === 'all' ? 'All time' : s}</button
						>
					{/each}
				</div>
			</div>

			<!-- circuit -->
			<div class="min-w-0 lg:shrink-0">
				<p class={LABEL} id="standings-circuit-label">Circuit</p>
				<div
					class="mt-2 grid grid-cols-2 gap-px border border-line2 bg-line2 md:flex [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1"
					role="group"
					aria-labelledby="standings-circuit-label"
				>
					{#each [['all', 'All'], ...circuitsForSeason.map((c) => [c, c])] as [v, l] (v)}
						<button
							type="button"
							onclick={() => (circuit = v)}
							aria-pressed={circuit === v}
							class="flex min-h-[44px] items-center gap-2.5 px-3.5 text-left text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors md:px-3 {circuit ===
							v
								? 'bg-ink text-paper-bg'
								: 'bg-paper-bg text-soft hover:bg-paper hover:text-ink'}"
						>
							<span
								class="h-2.5 w-2.5 shrink-0"
								style="background: {v === 'all' ? 'var(--ed-warm)' : ccVar(v)};"
								aria-hidden="true"
							></span>
							{l}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- what you're looking at -->
		<div
			class="mt-4 flex flex-col gap-3 border-t border-line pt-3 md:flex-row md:items-center md:justify-between md:gap-6"
		>
			<p class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" aria-live="polite">
				<span class="font-newsreader text-[15px] text-ink">
					<strong class="font-semibold">{filtered.length}</strong>
					{filtered.length === 1 ? 'player' : 'players'}
					<span class="text-soft"
						>· {season === 'all' ? 'all time' : season} · {circuit === 'all'
							? 'every circuit'
							: circuit}{q ? ` · “${q}”` : ''}</span
					>
				</span>
				{#if showCut}
					<span
						class="inline-flex items-center gap-1.5 text-[9px] font-extrabold tracking-[0.18em] text-warm uppercase"
						><span class="h-[7px] w-[7px] bg-warm" aria-hidden="true"></span>Top 16 qualify for the
						Player’s Championship</span
					>
				{:else if season !== 'all' && circuit === 'all' && !q}
					<span class="font-newsreader text-[14px] text-fade italic"
						>Pick a circuit to see who’s inside the championship cut.</span
					>
				{/if}
			</p>

			<div class="flex items-center gap-5">
				<!-- phones have no sortable header, so sort lives here -->
				<label class="group flex items-baseline gap-2 md:hidden">
					<span class={LABEL}>Sort</span>
					<span
						class="relative inline-flex items-center gap-2 border-b border-line2 py-1.5 transition-colors group-hover:border-ink focus-within:border-warm"
					>
						<span
							class="text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap text-ink uppercase"
							>{SORT_OPTIONS.find((o) => o.v === sortKey)?.l}</span
						>
						<svg
							class="h-[6px] w-[9px] shrink-0 text-fade"
							viewBox="0 0 10 6"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="square"
							aria-hidden="true"
						>
							<path d="M1 1l4 4 4-4" />
						</svg>
						<select
							value={sortKey}
							onchange={(e) => setSort(e.currentTarget.value)}
							aria-label="Sort players"
							class="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-none opacity-0"
						>
							{#each SORT_OPTIONS as o (o.v)}
								<option value={o.v}>{o.l}</option>
							{/each}
						</select>
					</span>
				</label>
				{#if activeCount || sortKey !== 'rank'}
					<button
						type="button"
						onclick={clearAll}
						class="text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase hover:text-ink"
						>Reset</button
					>
				{/if}
				<button
					type="button"
					onclick={refresh}
					disabled={refreshing}
					class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase transition-colors hover:text-ink disabled:opacity-50"
					title="Reload the latest standings">{refreshing ? 'Refreshing…' : 'Refresh ↻'}</button
				>
			</div>
		</div>
	</div>
</div>

<!-- ============ table ============ -->
<section
	bind:this={tableEl}
	class="mx-auto w-full max-w-[1200px] scroll-mt-28 px-5 pt-8 md:px-8 md:pt-10"
>
	<p class="font-newsreader text-[15px] text-soft italic">{resultLine}</p>

	{#if shown.length}
		<!-- desktop table -->
		<div class="mt-5 hidden md:block">
			<div
				class="grid grid-cols-[44px_minmax(0,1fr)_84px_88px_112px_64px_64px] items-end gap-4 border-b-[3px] border-ink px-4 pb-2 text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase"
			>
				<button
					type="button"
					onclick={() => toggleSort('rank')}
					class="text-center hover:text-ink {sortKey === 'rank' ? 'text-ink' : ''}"
				>
					Rank{sortKey === 'rank' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
				</button>
				<span class="flex items-baseline gap-3">
					<span>Player</span>
					<button
						type="button"
						onclick={() => toggleSort('ageRating')}
						class="text-left tracking-[0.16em] hover:text-ink {sortKey === 'ageRating'
							? 'text-ink'
							: 'text-fade/80'}"
						>Rating{sortKey === 'ageRating' ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}</button
					>
				</span>
				{#each COLUMNS as col (col.key)}
					<button
						type="button"
						onclick={() => toggleSort(col.key)}
						class="text-center hover:text-ink {sortKey === col.key ? 'text-ink' : ''}"
						>{col.label}{sortKey === col.key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}</button
					>
				{/each}
			</div>
			<ol>
				{#each shown as p, i (p.gemId || p.playerName + i)}
					{@const r = p.rankShown}
					{#if showCut && r === 17}
						<li class="flex items-center gap-3 px-4 py-2.5" aria-label="Championship cut">
							<span class="h-px flex-1 bg-warm"></span>
							<span class="text-[8.5px] font-extrabold tracking-[0.24em] text-warm uppercase"
								>Championship cut · top 16 qualify</span
							>
							<span class="h-px flex-1 bg-warm"></span>
						</li>
					{/if}
					<li class="border-b border-line even:bg-paper/50">
						<a
							href={p.gemId ? `/player/${p.gemId}` : '#'}
							class="group grid grid-cols-[44px_minmax(0,1fr)_84px_88px_112px_64px_64px] items-center gap-4 px-4 py-2 transition-colors hover:bg-paper"
						>
							<span
								class="ao-cond text-center text-[24px] leading-none font-black tabular-nums {rankTone(
									r
								)}">{r}</span
							>
							<span class="flex min-w-0 items-center gap-3">
								{#if p.ageRating != null}
									<RatingBadge
										rating={p.ageRating}
										label={tierLabel(p)}
										hex={tierHex(p)}
										provisional={p.isProvisional}
									/>
								{:else}
									<span
										class="flex aspect-square w-[36px] shrink-0 items-center justify-center border border-dashed border-line2 text-[10px] font-bold text-fade"
										title="No AGE Rating yet">—</span
									>
								{/if}
								<span class="min-w-0">
									<span
										class="block truncate font-newsreader text-[17px] leading-tight font-semibold"
									>
										<span class="fp-ul">{p.playerName}</span>
									</span>
									<span class="mt-[3px] flex items-center gap-2">
										{#if p.ageRating != null}
											<span
												class="text-[8.5px] font-extrabold tracking-[0.16em] uppercase"
												style="color: {tierHex(p)};">{tierLabel(p)}</span
											>
										{/if}
										{#each circuitLabel(p) as c (c)}
											<span
												class="shrink-0 px-1.5 py-[2px] text-[7.5px] font-extrabold tracking-[0.16em] text-white uppercase"
												style="background: {ccVar(c)};">{abbr(c)}</span
											>
										{/each}
									</span>
								</span>
							</span>
							<span class="ao-cond text-center text-[24px] leading-none font-black tabular-nums"
								>{p.totalPoints || 0}</span
							>
							<span class="text-center text-[13px] tabular-nums"
								><span class="font-bold">{p.matchesWon || 0}</span><span class="text-fade"
									>–{(p.matchesPlayed || 0) - (p.matchesWon || 0)}</span
								></span
							>
							<span class="flex flex-col items-center gap-1.5">
								<span class="text-[13px] leading-none font-bold tabular-nums {winTone(p)}"
									>{pct(p)}</span
								>
								<span class="block h-[3px] w-[56px] bg-line" aria-hidden="true"
									><span
										class="block h-full"
										style="width: {Math.max(
											0,
											Math.min(100, p.winPercentage ?? 0)
										)}%; background: {winBar(p)};"
									></span></span
								>
							</span>
							<span class="text-center text-[13px] font-semibold text-soft tabular-nums"
								>{p.eventsPlayed || 0}</span
							>
							<span class="text-center text-[13px] font-semibold text-soft tabular-nums"
								>{p.top8Finishes || 0}</span
							>
						</a>
					</li>
				{/each}
			</ol>
		</div>

		<!-- phone cards -->
		<ol class="mt-5 grid gap-3 md:hidden">
			{#each shown as p, i (p.gemId || p.playerName + i)}
				{@const r = p.rankShown}
				{#if showCut && r === 17}
					<li class="flex items-center gap-3 py-1" aria-label="Championship cut">
						<span class="h-px flex-1 bg-warm"></span>
						<span class="text-[8.5px] font-extrabold tracking-[0.2em] text-warm uppercase"
							>Championship cut</span
						>
						<span class="h-px flex-1 bg-warm"></span>
					</li>
				{/if}
				<li class="border border-line bg-paper-bg">
					<a
						href={p.gemId ? `/player/${p.gemId}` : '#'}
						class="grid grid-cols-[40px_auto_minmax(0,1fr)_auto] items-center gap-3 p-4"
					>
						<span class="ao-cond text-[32px] leading-[0.85] font-black tabular-nums {rankTone(r)}"
							>{r}</span
						>
						{#if p.ageRating != null}
							<RatingBadge
								size="md"
								rating={p.ageRating}
								label={tierLabel(p)}
								hex={tierHex(p)}
								provisional={p.isProvisional}
							/>
						{:else}
							<span
								class="flex aspect-square w-[42px] shrink-0 items-center justify-center border border-dashed border-line2 text-[10px] font-bold text-fade"
								>—</span
							>
						{/if}
						<span class="min-w-0">
							<span class="block truncate font-newsreader text-[17px] leading-tight font-semibold"
								>{p.playerName}</span
							>
							<span class="mt-1 flex flex-wrap items-center gap-2">
								{#if p.ageRating != null}
									<span
										class="text-[8.5px] font-extrabold tracking-[0.16em] uppercase"
										style="color: {tierHex(p)};">{tierLabel(p)}</span
									>
								{/if}
								{#each circuitLabel(p) as c (c)}
									<span
										class="px-1.5 py-[2px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
										style="background: {ccVar(c)};">{abbr(c)}</span
									>
								{/each}
							</span>
						</span>
						<span class="text-right">
							<span class="ao-cond block text-[30px] leading-none font-black tabular-nums"
								>{p.totalPoints || 0}</span
							>
							<span class="text-[8.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>pts</span
							>
						</span>
						<span
							class="col-span-4 grid grid-cols-4 gap-2 border-t border-line pt-3 text-center text-[12px] font-bold tabular-nums"
						>
							<span
								><span class="block">{record(p)}</span><span
									class="text-[8px] font-extrabold tracking-[0.16em] text-fade uppercase"
									>Record</span
								></span
							>
							<span
								><span class="block {winTone(p)}">{pct(p)}</span><span
									class="text-[8px] font-extrabold tracking-[0.16em] text-fade uppercase">Win</span
								></span
							>
							<span
								><span class="block">{p.eventsPlayed || 0}</span><span
									class="text-[8px] font-extrabold tracking-[0.16em] text-fade uppercase"
									>Events</span
								></span
							>
							<span
								><span class="block">{p.top8Finishes || 0}</span><span
									class="text-[8px] font-extrabold tracking-[0.16em] text-fade uppercase"
									>Top 8</span
								></span
							>
						</span>
					</a>
				</li>
			{/each}
		</ol>

		<!-- pagination -->
		<nav
			class="mt-8 flex items-center justify-between gap-6 border-t border-line pt-5"
			aria-label="Pages"
		>
			<button
				type="button"
				onclick={() => gotoPage(curPage - 1)}
				disabled={curPage <= 1}
				class="text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors enabled:hover:text-warm disabled:text-line2"
				>← Previous</button
			>
			<ol
				class="flex items-baseline gap-4 font-newsreader text-[17px] tabular-nums"
				aria-label="Page {curPage} of {pageCount}"
			>
				{#each pageNumbers as n, i (`${n}-${i}`)}
					<li>
						{#if n === '…'}<span class="text-fade">…</span>{:else}
							<button
								type="button"
								onclick={() => gotoPage(/** @type {number} */ (n))}
								aria-current={n === curPage ? 'page' : undefined}
								class="fp-ul pb-0.5 transition-colors hover:text-warm {n === curPage
									? '[background-size:100%_1.5px] font-semibold text-warm'
									: 'text-soft'}">{n}</button
							>
						{/if}
					</li>
				{/each}
			</ol>
			<button
				type="button"
				onclick={() => gotoPage(curPage + 1)}
				disabled={curPage >= pageCount}
				class="text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors enabled:hover:text-warm disabled:text-line2"
				>Next →</button
			>
		</nav>
	{:else}
		<div class="mt-6 border-y border-line py-14 text-center">
			<p class="ao-cond text-[40px] leading-none font-black uppercase">No players match</p>
			<p class="mt-2 font-newsreader text-[16px] text-soft italic">
				Try another season, circuit or name.
			</p>
			<button
				type="button"
				onclick={clearAll}
				class="mt-5 border-b-2 border-warm pb-1 text-[10.5px] font-extrabold tracking-[0.16em] text-warm uppercase"
				>Clear filters</button
			>
		</div>
	{/if}
</section>

<!-- ============ glossary ============ -->
<section class="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8 md:py-20" use:reveal>
	<div class="border-b-[3px] border-ink pb-3">
		<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
			How to read this
		</h2>
	</div>
	<ul class="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
		{#each GLOSSARY as [t, b] (t)}
			<li class="border-l-[3px] border-warm pl-4">
				<span class="block text-[10px] font-extrabold tracking-[0.2em] uppercase">{t}</span>
				<span class="mt-1 block font-newsreader text-[15px] leading-[1.5] text-soft italic"
					>{b}</span
				>
			</li>
		{/each}
	</ul>
</section>
