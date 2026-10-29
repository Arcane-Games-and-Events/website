<script>
	/**
	 * AGE Open — Tournament Archive, in the series' "tournament day" register.
	 *
	 *   sub-header   logo, "Archive", section links
	 *   filter bar   find an event or player · season · circuit (sticky from md)
	 *   live         in-progress events, auto-refreshed by the page
	 *   seasons      every open grouped by year, newest first, as result
	 *                sheets: podium, rest of the Top 8, link to full results
	 *
	 * Data is `data.eventResults` ({ event, results[] } with placement,
	 * playerName, gemId, wins, losses, agePoints; results[] is empty for a live
	 * event before its first upload), built by the loader.
	 */
	import { invalidateAll } from '$app/navigation';
	import { reveal } from '$lib/actions/reveal.js';
	import { CIRCUITS, circuitVar } from '$lib/data/circuits.js';
	import FormatTag from '../FormatTag.svelte';
	import AgeOpenSubHead from './AgeOpenSubHead.svelte';
	import CircuitFilter from './CircuitFilter.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	const abbr = (name) => CIRCUITS[name]?.abbreviation ?? name;
	const LABEL = 'text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
	const fmt = (d, opts) => new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
	const yearOf = (e) => (e.eventDate ? String(new Date(e.eventDate).getUTCFullYear()) : '—');
	const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
	const PODIUM = [
		{ tone: 'var(--ed-gold)', label: 'Champion' },
		{ tone: 'var(--ed-fade)', label: 'Runner-up' },
		{ tone: 'var(--ed-hero-rb)', label: 'Third' }
	];
	const norm = (s) => (s || '').toLowerCase();

	// ============ filters ============
	let q = $state('');
	let circuit = $state('all');
	let season = $state('all');

	const all = $derived(data.eventResults ?? []);
	const seasons = $derived(
		[...new Set(all.map((r) => yearOf(r.event)).filter((y) => y !== '—'))].sort().reverse()
	);
	const live = $derived(all.filter((r) => r.event.status === 'in_progress'));
	const archived = $derived(all.filter((r) => r.event.status !== 'in_progress'));
	const filtered = $derived.by(() => {
		const terms = norm(q).split(/\s+/).filter(Boolean);
		return all
			.filter((r) => r.event.status !== 'in_progress')
			.filter((r) => circuit === 'all' || r.event.circuit === circuit)
			.filter((r) => season === 'all' || yearOf(r.event) === season)
			.filter(
				(r) =>
					!terms.length ||
					terms.every(
						(t) =>
							[r.event.title, r.event.location, r.event.circuit, r.event.month]
								.map(norm)
								.some((v) => v.includes(t)) || r.results.some((p) => norm(p.playerName).includes(t))
					)
			);
	});
	const groups = $derived.by(() => {
		const out = new Map();
		for (const r of filtered) {
			const y = yearOf(r.event);
			if (!out.has(y)) out.set(y, []);
			out.get(y).push(r);
		}
		return [...out.entries()];
	});
	const activeCount = $derived(
		(q ? 1 : 0) + (circuit !== 'all' ? 1 : 0) + (season !== 'all' ? 1 : 0)
	);
	const playerMatch = (r) => {
		const terms = norm(q).split(/\s+/).filter(Boolean);
		if (!terms.length) return null;
		return r.results.find((p) => terms.every((t) => norm(p.playerName).includes(t))) ?? null;
	};
	const totalPlayers = $derived(filtered.reduce((n, r) => n + r.results.length, 0));
	function clearAll() {
		q = '';
		circuit = 'all';
		season = 'all';
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
</script>

<AgeOpenSubHead
	active="results"
	title="Archive"
	strap="Every open on the books: who won, who made the cut, and how the bracket shook out, season by season."
/>

<!-- ============ filter bar ============ -->
<div class="z-[5] border-b border-line bg-paper-bg/95 backdrop-blur-sm md:sticky md:top-[59px]">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-4 md:px-8 md:py-5">
		<div class="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-8 lg:gap-y-4">
			<div class="min-w-0 lg:w-[260px] lg:shrink-0">
				<label for="archive-search" class={LABEL}>Find an event or player</label>
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
						id="archive-search"
						type="search"
						bind:value={q}
						placeholder="Event, city or player…"
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

			<div class="min-w-0 lg:shrink-0">
				<p class={LABEL} id="archive-season-label">Season</p>
				<div
					class="mt-2 flex gap-px border border-line2 bg-line2"
					role="group"
					aria-labelledby="archive-season-label"
				>
					{#each ['all', ...seasons] as s (s)}
						<button
							type="button"
							onclick={() => (season = s)}
							aria-pressed={season === s}
							class="min-h-[44px] flex-1 px-2 text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors md:flex-none md:px-3 {season ===
							s
								? 'bg-ink text-paper-bg'
								: 'bg-paper-bg text-soft hover:bg-paper hover:text-ink'}"
							>{s === 'all' ? 'All' : s}</button
						>
					{/each}
				</div>
			</div>

			<CircuitFilter bind:value={circuit} id="archive" labelClass={LABEL} />
		</div>

		<div
			class="mt-4 flex flex-col gap-3 border-t border-line pt-3 md:flex-row md:items-center md:justify-between md:gap-6"
		>
			<p class="font-newsreader text-[15px] text-ink" aria-live="polite">
				<strong class="font-semibold">{filtered.length}</strong>
				{filtered.length === 1 ? 'event' : 'events'}
				<span class="text-soft"
					>· {totalPlayers} player finishes · {season === 'all' ? 'every season' : season} · {circuit ===
					'all'
						? 'every circuit'
						: circuit}{q ? ` · “${q}”` : ''}</span
				>
			</p>
			<div class="flex items-center gap-5">
				{#if activeCount}
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
					>{refreshing ? 'Refreshing…' : 'Refresh ↻'}</button
				>
			</div>
		</div>
	</div>
</div>

<!-- ============ live now ============ -->
{#if live.length}
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-8 md:px-8">
			<p
				class="flex items-center gap-2.5 text-[9.5px] font-extrabold tracking-[0.22em] text-warm-light uppercase"
			>
				<span class="h-2 w-2 animate-pulse bg-hero-rb" aria-hidden="true"></span>
				Live now · standings refresh every minute
			</p>
			<ul class="mt-4 grid gap-4 md:grid-cols-2">
				{#each live as r (r.event.id)}
					{@const leader = r.results.find((p) => p.placement === 1)}
					<li>
						<a
							href="/age-open/{r.event.id}/results"
							class="group flex items-center justify-between gap-4 border border-paper-bg/20 px-5 py-4 transition-colors hover:border-paper-bg"
						>
							<span class="min-w-0">
								<span class="ao-cond block truncate text-[26px] leading-none font-black uppercase"
									>{r.event.title}</span
								>
								<span
									class="mt-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase"
								>
									{r.results.length
										? `${r.results.length} players${leader ? ` · ${leader.playerName} leads` : ''}`
										: 'Underway · results after the first round'}
								</span>
							</span>
							<span
								class="shrink-0 text-[9.5px] font-extrabold tracking-[0.18em] text-warm-light uppercase"
								>Standings →</span
							>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}

<!-- ============ seasons ============ -->
<section class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-16 md:px-8 md:pt-10 md:pb-20">
	{#if !archived.length}
		<div class="border border-line bg-paper px-6 py-14 text-center">
			<p class="ao-cond text-[32px] leading-none font-black uppercase">No results yet</p>
			<p class="mx-auto mt-3 max-w-[420px] font-newsreader text-[15px] text-soft italic">
				Results appear here as each open wraps up.
			</p>
		</div>
	{:else if !filtered.length}
		<div class="border border-line bg-paper px-6 py-14 text-center">
			<p class="ao-cond text-[32px] leading-none font-black uppercase">No events match</p>
			<p class="mx-auto mt-3 max-w-[420px] font-newsreader text-[15px] text-soft italic">
				Try another season, circuit or name.
			</p>
			<button
				type="button"
				onclick={clearAll}
				class="mt-6 border border-ink px-5 py-2.5 text-[10px] font-extrabold tracking-[0.18em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
				>Clear filters</button
			>
		</div>
	{:else}
		{#each groups as [year, rows] (year)}
			<div class="mb-14 last:mb-0">
				<div class="flex items-end justify-between gap-4 border-b-[3px] border-ink pb-2">
					<h2 class="ao-cond text-[56px] leading-[0.85] font-black md:text-[72px]">{year}</h2>
					<p class={LABEL}>{rows.length} {rows.length === 1 ? 'open' : 'opens'}</p>
				</div>

				<ol class="mt-6 grid gap-5 md:grid-cols-2">
					{#each rows as r, i (r.event.id)}
						{@const e = r.event}
						{@const sorted = [...r.results].sort((a, b) => a.placement - b.placement)}
						{@const podium = sorted.slice(0, 3)}
						{@const rest = sorted.slice(3, 8)}
						{@const found = playerMatch(r)}
						<li
							use:reveal={{ delay: (i % 2) * 70 }}
							class="flex flex-col border border-line2 bg-paper-bg"
						>
							<!-- head -->
							<div
								class="border-t-[4px] px-5 pt-4 pb-3"
								style="border-top-color: {e.circuit ? circuitVar(e.circuit) : 'var(--ed-ink)'};"
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p
											class="flex flex-wrap items-center gap-2 text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>
											{#if e.circuit}
												<span
													class="px-1.5 py-[2px] text-[8px] text-white"
													style="background: {circuitVar(e.circuit)};">{abbr(e.circuit)}</span
												>
											{/if}
											{e.eventDate ? fmt(e.eventDate, { month: 'long', day: 'numeric' }) : ''}
											{#if e.location}<span class="truncate tracking-[0.04em] normal-case"
													>· {e.location}</span
												>{/if}
										</p>
										<h3 class="ao-cond mt-2 text-[28px] leading-[0.9] font-black uppercase">
											<a href="/age-open/{e.id}/results" class="hover:text-warm">{e.title}</a>
										</h3>
									</div>
									<span class="shrink-0"><FormatTag format={e.format} size="sm" short /></span>
								</div>
								<p class="mt-2 text-[9.5px] font-extrabold tracking-[0.16em] text-soft uppercase">
									{r.results.length} players
								</p>
							</div>

							<!-- podium -->
							<ol class="grid grid-cols-3 border-y border-line">
								{#each PODIUM as slot, pi (pi)}
									{@const p = podium[pi]}
									<li
										class="border-r border-line px-3 py-3 last:border-r-0 {pi === 0
											? 'bg-paper'
											: ''}"
									>
										<p
											class="flex items-center gap-1.5 text-[8px] font-extrabold tracking-[0.18em] uppercase"
											style="color: {slot.tone};"
										>
											<span class="h-1.5 w-1.5" style="background: {slot.tone};" aria-hidden="true"
											></span>{slot.label}
										</p>
										{#if p}
											{#if p.gemId}
												<a
													href="/player/{p.gemId}"
													class="mt-1.5 block truncate font-newsreader text-[15px] leading-tight font-semibold {pi ===
													0
														? 'md:text-[17px]'
														: ''}"><span class="fp-ul">{p.playerName}</span></a
												>
											{:else}
												<p
													class="mt-1.5 truncate font-newsreader text-[15px] leading-tight font-semibold"
												>
													{p.playerName}
												</p>
											{/if}
											<p class="mt-1 text-[10px] font-bold text-fade tabular-nums">
												{p.wins}–{p.losses}{p.draws ? `–${p.draws}` : ''}
											</p>
										{:else}
											<p class="mt-1.5 font-newsreader text-[15px] text-fade">—</p>
										{/if}
									</li>
								{/each}
							</ol>

							<!-- rest of the top 8 -->
							{#if rest.length}
								<ol class="px-5 py-2">
									{#each rest as p (p.gemId || p.playerName)}
										<li
											class="flex items-center gap-3 border-b border-dotted border-line2 py-1.5 last:border-b-0"
										>
											<span
												class="ao-cond w-[34px] shrink-0 text-[16px] leading-none font-black text-warm tabular-nums"
												>{ordinal(p.placement)}</span
											>
											{#if p.gemId}
												<a
													href="/player/{p.gemId}"
													class="min-w-0 flex-1 truncate text-[13px] font-bold"
													><span class="fp-ul">{p.playerName}</span></a
												>
											{:else}
												<span class="min-w-0 flex-1 truncate text-[13px] font-bold"
													>{p.playerName}</span
												>
											{/if}
											<span class="shrink-0 text-[11px] text-fade tabular-nums"
												>{p.wins}–{p.losses}{p.draws ? `–${p.draws}` : ''}</span
											>
										</li>
									{/each}
								</ol>
							{/if}

							<!-- foot -->
							<div
								class="mt-auto flex items-center justify-between gap-3 border-t border-line px-5 py-3"
							>
								{#if found && found.placement > 8}
									<p class="truncate text-[10px] font-bold text-soft">
										<span class="text-warm">{found.playerName}</span> finished {ordinal(
											found.placement
										)} ({found.wins}–{found.losses}{found.draws ? `–${found.draws}` : ''})
									</p>
								{:else}
									<span></span>
								{/if}
								<a
									href="/age-open/{e.id}/results"
									class="shrink-0 text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase hover:text-ink"
									>Full results →</a
								>
							</div>
						</li>
					{/each}
				</ol>
			</div>
		{/each}
	{/if}
</section>
