<script>
	/**
	 * AGE Open — Decklists, in the series' "tournament day" register.
	 *
	 *   sub-header   logo, "Decklists", section links
	 *   filter bar   find a list · circuit · hero · finish · sort (sticky from md)
	 *   champions    the latest winning lists, as hero-art plates
	 *   lists        every public list grouped by event, newest first;
	 *                placement, hero portrait, player, format, link
	 *   show more    40 lists at a time
	 *
	 * All filtering is client-side over `data.decklists` (public lists
	 * joined to their event by the loader).
	 */
	import { reveal } from '$lib/actions/reveal.js';
	import { CIRCUITS } from '$lib/data/circuits.js';
	import { heroImageUrl } from '$lib/heroImage.js';
	import FormatTag from '../FormatTag.svelte';
	import AgeOpenSubHead from './AgeOpenSubHead.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	const SLUG = { 'Los Angeles': 'la', 'St. Louis': 'stl', 'New England': 'ne' };
	const ccVar = (name) => `var(--ed-cc-${SLUG[name] ?? 'la'})`;
	const abbr = (name) => CIRCUITS[name]?.abbreviation ?? name;
	const CIRCUIT_NAMES = ['Los Angeles', 'St. Louis', 'New England'];
	const LABEL = 'text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
	const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n ? `${n}th` : '—');
	const fmt = (d, opts) => new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
	const finishTone = (p) =>
		p === 1 ? 'text-gold' : p && p <= 8 ? 'text-warm' : p ? 'text-fade' : 'text-fade/50';
	const norm = (s) => (s || '').toLowerCase();

	// ============ filters ============
	let q = $state('');
	let circuit = $state('all');
	let hero = $state('all');
	let finish = $state('all');
	let sortKey = $state('newest');
	let limit = $state(40);
	const PAGE = 40;

	const all = $derived(data.decklists ?? []);
	const heroOptions = $derived.by(() => {
		const counts = new Map();
		for (const d of all) if (d.hero) counts.set(d.hero, (counts.get(d.hero) ?? 0) + 1);
		return [...counts.entries()]
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([h, n]) => ({ v: h, l: `${h} (${n})` }));
	});
	const FINISHES = [
		{ v: 'all', l: 'Any finish' },
		{ v: 'champion', l: 'Champions' },
		{ v: 'top8', l: 'Top 8' }
	];
	const SORTS = [
		{ v: 'newest', l: 'Newest' },
		{ v: 'finish', l: 'Best finish' },
		{ v: 'player', l: 'Player A–Z' },
		{ v: 'hero', l: 'Hero A–Z' }
	];

	const filtered = $derived.by(() => {
		const terms = norm(q).split(/\s+/).filter(Boolean);
		return all
			.filter((d) => circuit === 'all' || d.circuit === circuit)
			.filter((d) => hero === 'all' || d.hero === hero)
			.filter((d) =>
				finish === 'all'
					? true
					: finish === 'champion'
						? d.placement === 1
						: d.placement != null && d.placement <= 8
			)
			.filter(
				(d) =>
					!terms.length ||
					terms.every((t) =>
						[d.playerName, d.hero, d.eventTitle, d.circuit, d.month]
							.map(norm)
							.some((v) => v.includes(t))
					)
			)
			.sort((a, b) => {
				if (sortKey === 'finish')
					return (a.placement ?? 999) - (b.placement ?? 999) || byDate(a, b);
				if (sortKey === 'player') return norm(a.playerName).localeCompare(norm(b.playerName));
				if (sortKey === 'hero') return norm(a.hero).localeCompare(norm(b.hero));
				return byDate(a, b);
			});
	});
	const byDate = (a, b) =>
		new Date(b.eventDate || b.createdAt).getTime() -
			new Date(a.eventDate || a.createdAt).getTime() || (a.placement ?? 999) - (b.placement ?? 999);

	const shown = $derived(filtered.slice(0, limit));
	// Grouped by event for the default order; a flat list when sorted otherwise
	const groups = $derived.by(() => {
		if (sortKey !== 'newest')
			return [{ key: 'flat', title: '', date: null, circuit: '', rows: shown }];
		const out = [];
		const idx = new Map();
		for (const d of shown) {
			const key = d.eventId;
			if (!idx.has(key)) {
				idx.set(key, out.length);
				out.push({
					key,
					title: d.eventTitle || `${d.circuit || 'AGE'} Open`,
					date: d.eventDate,
					circuit: d.circuit || '',
					eventId: d.eventId,
					rows: []
				});
			}
			out[idx.get(key)].rows.push(d);
		}
		return out;
	});
	const activeCount = $derived(
		(q ? 1 : 0) +
			(circuit !== 'all' ? 1 : 0) +
			(hero !== 'all' ? 1 : 0) +
			(finish !== 'all' ? 1 : 0)
	);
	$effect(() => {
		q;
		circuit;
		hero;
		finish;
		sortKey;
		limit = PAGE;
	});
	function clearAll() {
		q = '';
		circuit = 'all';
		hero = 'all';
		finish = 'all';
		sortKey = 'newest';
	}

	// ============ latest winning lists ============
	const champions = $derived(
		[...all]
			.filter((d) => d.placement === 1)
			.sort(byDate)
			.slice(0, 3)
	);
	const scope = $derived(
		[
			circuit === 'all' ? 'every circuit' : circuit,
			hero === 'all' ? null : hero,
			finish === 'all' ? null : FINISHES.find((f) => f.v === finish)?.l.toLowerCase()
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<AgeOpenSubHead
	active="decklists"
	title="Decklists"
	strap="Every public list from every open, card by card. See what won, what’s rising, and what your next opponent might be on."
/>

<!-- ============ filter bar ============ -->
<div class="z-[5] border-b border-line bg-paper-bg/95 backdrop-blur-sm md:sticky md:top-[59px]">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-4 md:px-8 md:py-5">
		<div class="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-8 lg:gap-y-4">
			<!-- find a list -->
			<div class="min-w-0 lg:w-[260px] lg:shrink-0">
				<label for="decklists-search" class={LABEL}>Find a list</label>
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
						id="decklists-search"
						type="search"
						bind:value={q}
						placeholder="Player, hero or event…"
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

			<!-- circuit -->
			<div class="min-w-0 lg:shrink-0">
				<p class={LABEL} id="decklists-circuit-label">Circuit</p>
				<div
					class="mt-2 grid grid-cols-2 gap-px border border-line2 bg-line2 md:flex [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1"
					role="group"
					aria-labelledby="decklists-circuit-label"
				>
					{#each [['all', 'All'], ...CIRCUIT_NAMES.map((c) => [c, c])] as [v, l] (v)}
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

			<!-- hero + finish -->
			<div class="grid min-w-0 grid-cols-2 gap-4 lg:flex lg:shrink-0 lg:gap-6">
				{#each [{ id: 'hero', label: 'Hero', get: () => hero, set: (v) => (hero = v), options: [{ v: 'all', l: 'All heroes' }, ...heroOptions] }, { id: 'finish', label: 'Finish', get: () => finish, set: (v) => (finish = v), options: FINISHES }] as f (f.id)}
					<div class="min-w-0">
						<label for="decklists-{f.id}" class={LABEL}>{f.label}</label>
						<span
							class="relative mt-2 flex min-h-[44px] items-center justify-between gap-3 border border-line2 bg-paper-bg px-3.5 transition-colors focus-within:border-ink hover:border-ink lg:min-w-[170px]"
						>
							<span class="truncate text-[10px] font-extrabold tracking-[0.14em] text-ink uppercase"
								>{f.options.find((o) => o.v === f.get())?.l ?? f.options[0].l}</span
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
								id="decklists-{f.id}"
								value={f.get()}
								onchange={(e) => f.set(e.currentTarget.value)}
								class="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-none opacity-0"
							>
								{#each f.options as o (o.v)}
									<option value={o.v}>{o.l}</option>
								{/each}
							</select>
						</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- what you're looking at -->
		<div
			class="mt-4 flex flex-col gap-3 border-t border-line pt-3 md:flex-row md:items-center md:justify-between md:gap-6"
		>
			<p class="font-newsreader text-[15px] text-ink" aria-live="polite">
				<strong class="font-semibold">{filtered.length}</strong>
				{filtered.length === 1 ? 'list' : 'lists'}
				<span class="text-soft">· {scope}{q ? ` · “${q}”` : ''}</span>
			</p>
			<div class="flex items-center gap-5">
				<label class="group flex items-baseline gap-2">
					<span class={LABEL}>Sort</span>
					<span
						class="relative inline-flex items-center gap-2 border-b border-line2 py-1.5 transition-colors group-hover:border-ink focus-within:border-warm"
					>
						<span
							class="text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap text-ink uppercase"
							>{SORTS.find((o) => o.v === sortKey)?.l}</span
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
							bind:value={sortKey}
							aria-label="Sort lists"
							class="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-none opacity-0"
						>
							{#each SORTS as o (o.v)}
								<option value={o.v}>{o.l}</option>
							{/each}
						</select>
					</span>
				</label>
				{#if activeCount || sortKey !== 'newest'}
					<button
						type="button"
						onclick={clearAll}
						class="text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase hover:text-ink"
						>Reset</button
					>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- ============ latest winning lists ============ -->
{#if champions.length && !activeCount && sortKey === 'newest'}
	<section class="border-b border-line bg-paper">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-8 md:px-8 md:py-10">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">
						Fresh off the podium
					</p>
					<h2 class="ao-cond mt-2 text-[36px] leading-none font-black uppercase">Winning lists</h2>
				</div>
				<p class="font-newsreader text-[15px] text-soft italic">
					The lists that took the last three opens.
				</p>
			</div>
			<ol class="mt-6 grid gap-4 md:grid-cols-3">
				{#each champions as d, i (d.id)}
					{@const img = heroImageUrl(d.hero)}
					<li use:reveal={{ delay: i * 70 }}>
						<a
							href="/age-open/{d.eventId}/decklist/{d.id}"
							class="group relative flex min-h-[220px] flex-col justify-end overflow-hidden border border-ink bg-ink text-paper-bg"
						>
							{#if img}
								<img
									src={img}
									alt=""
									loading="lazy"
									class="absolute inset-0 h-full w-full object-cover object-[80%_20%] transition-transform duration-700 ease-out group-hover:scale-[1.04]"
								/>
							{/if}
							<span
								class="pointer-events-none absolute inset-0"
								style="background: linear-gradient(0deg, rgba(23,21,15,0.95) 22%, rgba(23,21,15,0.35) 62%, rgba(23,21,15,0.1) 100%);"
								aria-hidden="true"
							></span>
							<span
								class="absolute top-0 left-0 bg-gold px-2 py-1 text-[9px] font-extrabold tracking-[0.16em] text-white uppercase"
								>Champion</span
							>
							<span class="absolute top-3 right-3"
								><FormatTag format={d.format} size="sm" short /></span
							>
							<span class="relative p-5">
								<span
									class="flex items-center gap-2 text-[9px] font-extrabold tracking-[0.2em] text-warm-light uppercase"
								>
									{#if d.circuit}<span
											class="px-1.5 py-[2px] text-[8px] text-white"
											style="background: {ccVar(d.circuit)};">{abbr(d.circuit)}</span
										>{/if}
									{d.month || ''}{d.eventDate ? ` ${fmt(d.eventDate, { year: 'numeric' })}` : ''}
								</span>
								<span class="ao-cond mt-2 block text-[30px] leading-[0.9] font-black uppercase"
									>{d.hero || 'Unknown hero'}</span
								>
								<span class="mt-2 block font-newsreader text-[15px] text-paper-bg/80"
									>{d.playerName}</span
								>
							</span>
						</a>
					</li>
				{/each}
			</ol>
		</div>
	</section>
{/if}

<!-- ============ lists ============ -->
<section class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-16 md:px-8 md:pt-10 md:pb-20">
	{#if !all.length}
		<div class="border border-line bg-paper px-6 py-14 text-center">
			<p class="ao-cond text-[32px] leading-none font-black uppercase">No lists yet</p>
			<p class="mx-auto mt-3 max-w-[420px] font-newsreader text-[15px] text-soft italic">
				Lists from completed opens appear here as soon as they’re published.
			</p>
		</div>
	{:else if !filtered.length}
		<div class="border border-line bg-paper px-6 py-14 text-center">
			<p class="ao-cond text-[32px] leading-none font-black uppercase">No lists match</p>
			<p class="mx-auto mt-3 max-w-[420px] font-newsreader text-[15px] text-soft italic">
				Try another circuit, hero or search.
			</p>
			<button
				type="button"
				onclick={clearAll}
				class="mt-6 border border-ink px-5 py-2.5 text-[10px] font-extrabold tracking-[0.18em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
				>Clear filters</button
			>
		</div>
	{:else}
		{#each groups as g (g.key)}
			<div class="mb-10 last:mb-0">
				{#if g.title}
					<div
						class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-2"
					>
						<div class="flex min-w-0 items-center gap-3">
							{#if g.circuit}
								<span
									class="shrink-0 px-1.5 py-[3px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
									style="background: {ccVar(g.circuit)};">{abbr(g.circuit)}</span
								>
							{/if}
							<h2 class="ao-cond truncate text-[26px] leading-none font-black uppercase">
								<a href="/age-open/{g.eventId}" class="hover:text-warm">{g.title}</a>
							</h2>
						</div>
						<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
							{g.date ? fmt(g.date, { month: 'long', day: 'numeric', year: 'numeric' }) : ''} · {g
								.rows.length}
							{g.rows.length === 1 ? 'list' : 'lists'}
						</p>
					</div>
				{:else}
					<div
						class="hidden grid-cols-[72px_minmax(0,1fr)_160px_120px_96px] items-end gap-4 border-b-[3px] border-ink px-4 pb-2 text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase md:grid"
					>
						<span class="text-center">Finish</span><span>Hero · player</span><span>Event</span><span
							>Format</span
						><span></span>
					</div>
				{/if}
				<ol>
					{#each g.rows as d (d.id)}
						{@const img = heroImageUrl(d.hero)}
						<li class="border-b border-line even:bg-paper/50">
							<a
								href="/age-open/{d.eventId}/decklist/{d.id}"
								class="group grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-2 py-2.5 transition-colors hover:bg-paper md:grid-cols-[72px_minmax(0,1fr)_160px_120px_96px] md:gap-4 md:px-4"
							>
								<span
									class="ao-cond text-center text-[24px] leading-none font-black tabular-nums {finishTone(
										d.placement
									)}">{d.placement ? ordinal(d.placement) : '—'}</span
								>
								<span class="flex min-w-0 items-center gap-3">
									<span
										class="h-[40px] w-[40px] shrink-0 border border-line2 bg-paper bg-cover bg-[right_center]"
										style={img ? `background-image: url('${img}');` : ''}
										aria-hidden="true"
									></span>
									<span class="min-w-0">
										<span
											class="block truncate font-newsreader text-[17px] leading-tight font-semibold"
											><span class="fp-ul">{d.hero || 'Unknown hero'}</span></span
										>
										<span class="mt-[2px] block truncate text-[12px] font-bold text-soft">
											{d.playerName}<span class="md:hidden">
												· {abbr(d.circuit)}{d.month ? ` ${d.month}` : ''}{d.eventDate
													? ` ${fmt(d.eventDate, { year: 'numeric' })}`
													: ''}</span
											>
										</span>
									</span>
								</span>
								<span
									class="hidden min-w-0 items-center gap-2 text-[12px] font-bold text-soft md:flex"
								>
									{#if d.circuit}<span
											class="shrink-0 px-1.5 py-[2px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
											style="background: {ccVar(d.circuit)};">{abbr(d.circuit)}</span
										>{/if}
									<span class="truncate"
										>{d.month || ''}{d.eventDate
											? ` ${fmt(d.eventDate, { year: 'numeric' })}`
											: ''}</span
									>
								</span>
								<span class="justify-self-end md:justify-self-start"
									><FormatTag format={d.format} size="sm" short /></span
								>
								<span
									class="hidden text-right text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase md:block"
									>View list →</span
								>
							</a>
						</li>
					{/each}
				</ol>
			</div>
		{/each}

		{#if filtered.length > shown.length}
			<div class="mt-10 flex flex-col items-center gap-3">
				<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					Showing {shown.length} of {filtered.length}
				</p>
				<button
					type="button"
					onclick={() => (limit += PAGE)}
					class="border border-ink px-6 py-3 text-[10px] font-extrabold tracking-[0.18em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
					>Show more lists</button
				>
			</div>
		{/if}
	{/if}
</section>
