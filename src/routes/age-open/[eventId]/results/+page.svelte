<script>
	/**
	 * One AGE Open's results, in the series' "tournament day" register.
	 *
	 *   masthead    logo, event, champion, stat strip; champion's hero as backdrop
	 *   section bar Standings · Top 8 · Metagame · Matches · Decklists (sticky)
	 *   standings   final Swiss order with hero, record, points, prize, list;
	 *               the Top 8 cut drawn after 8th
	 *   top 8       quarterfinal → semifinal → final → champion bracket
	 *   metagame    hero share, record and win rate; rows open to list pilots
	 *   matches     round selector and search over every pairing
	 *   decklists   the event's public lists
	 */
	import { CIRCUITS, circuitVar } from '$lib/data/circuits.js';
	import { heroImageUrl } from '$lib/heroImage.js';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import FormatTag from '$lib/components/age/FormatTag.svelte';

	let { data } = $props();

	const abbr = (name) => CIRCUITS[name]?.abbreviation ?? name;
	const LABEL = 'text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
	const TH = 'text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase';
	const KICK = 'text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase';
	const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n ? `${n}th` : '—');
	const rankTone = (n) =>
		n === 1
			? 'text-gold'
			: n === 2
				? 'text-fade'
				: n === 3
					? 'text-hero-rb'
					: n <= 8
						? 'text-warm'
						: 'text-fade/60';
	const money = (n) => (Number(n) > 0 ? `$${Math.round(Number(n)).toLocaleString()}` : '—');
	const fmtDate = (d, opts) =>
		d ? new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts }) : '';
	const heroName = (h) => (h ? h.split(',')[0] : '');
	const norm = (s) => (s || '').toLowerCase();

	const event = $derived(data.event);
	const results = $derived(data.results ?? []);
	const champion = $derived(results.find((r) => r.placement === 1) ?? null);
	const backdrop = $derived(heroImageUrl(champion?.hero));
	const isLive = $derived(event.status === 'in_progress');
	const firstPrize = $derived(champion?.prizeAmount || 0);
	const prizePool = $derived(results.reduce((n, r) => n + (Number(r.prizeAmount) || 0), 0));
	const meta = $derived(data.metagameBreakdown ?? []);
	const topHero = $derived(meta[0] ?? null);
	const bestHero = $derived(
		[...meta]
			.filter((h) => h.totalMatches >= 3)
			.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))[0] ?? null
	);

	// ============ decklist lookup ============
	const listFor = $derived.by(() => {
		const map = new Map();
		for (const d of data.decklists ?? []) {
			if (d.gemId) map.set(d.gemId, d);
			if (d.playerName) map.set(norm(d.playerName), d);
		}
		return (gemId, name) => (gemId && map.get(gemId)) || (name && map.get(norm(name))) || null;
	});

	// ============ sections ============
	const SECTIONS = $derived(
		[
			{ id: 'standings', label: 'Standings', show: true },
			{ id: 'top8', label: 'Top 8', show: !!data.top8Bracket },
			{ id: 'metagame', label: 'Metagame', show: meta.length > 0 },
			{ id: 'matches', label: 'Matches', show: (data.matchesByRound?.length ?? 0) > 0 },
			{
				id: 'decklists',
				label: `Decklists${data.decklists?.length ? ` · ${data.decklists.length}` : ''}`,
				show: (data.decklists?.length ?? 0) > 0
			}
		].filter((s) => s.show)
	);
	let tab = $state('standings');

	// ============ standings search ============
	let standingsQ = $state('');
	const standingsShown = $derived.by(() => {
		const t = norm(standingsQ).trim();
		if (!t) return results;
		return results.filter((r) => norm(r.playerName).includes(t) || norm(r.hero).includes(t));
	});

	// ============ metagame ============
	let openHero = $state(/** @type {string | null} */ (null));
	const maxShare = $derived(Math.max(1, ...meta.map((h) => h.count)));
	const wrTone = (h) => {
		if (!h || h.totalMatches < 3) return 'text-fade';
		const wr = parseFloat(h.winRate);
		return wr >= 60 ? 'text-prem' : wr >= 50 ? 'text-gold' : wr >= 40 ? 'text-ink' : 'text-hero-rb';
	};

	// ============ matches ============
	let round = $state(/** @type {number | 'all'} */ ('all'));
	let matchQ = $state('');
	const rounds = $derived((data.matchesByRound ?? []).map((r) => r.round));
	const matchRounds = $derived.by(() => {
		const t = norm(matchQ).trim();
		return (data.matchesByRound ?? [])
			.filter((r) => round === 'all' || r.round === round)
			.map((r) => ({
				round: r.round,
				matches: t
					? r.matches.filter((m) =>
							[m.player1?.name, m.player2?.name, m.player1?.hero, m.player2?.hero]
								.map(norm)
								.some((v) => v.includes(t))
						)
					: r.matches
			}))
			.filter((r) => r.matches.length);
	});
	const matchCount = $derived(matchRounds.reduce((n, r) => n + r.matches.length, 0));
	// A round is a Top 8 round when the bracket exists and it is one of the last three
	const roundName = (n) => {
		if (!data.top8Bracket) return `Round ${n}`;
		const last = data.totalRounds;
		if (n === last) return 'Final';
		if (n === last - 1) return 'Semifinals';
		if (n === last - 2) return 'Quarterfinals';
		return `Round ${n}`;
	};
</script>

<svelte:head>
	<title
		>{event.title} · {fmtDate(event.eventDate, { month: 'long', year: 'numeric' })} results — AGE Open</title
	>
	<meta
		name="description"
		content="Final standings, Top 8 bracket, metagame and decklists from the {event.circuit ||
			'AGE'} {event.title}{champion ? `, won by ${champion.playerName}` : ''}."
	/>
</svelte:head>

<AgeShell active="AGE Open">
	<!-- ============ masthead ============ -->
	<section class="relative overflow-hidden bg-ink text-paper-bg">
		{#if backdrop}
			<img
				src={backdrop}
				alt=""
				aria-hidden="true"
				class="absolute inset-y-0 right-0 h-full w-full object-cover object-[75%_20%] opacity-80 md:w-[58%]"
				style="-webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 35%, #000 70%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 35%, #000 70%);"
				onerror={(e) => (e.currentTarget.style.display = 'none')}
			/>
		{/if}
		<div
			class="absolute inset-0"
			style="background: linear-gradient(100deg, rgba(23,21,15,0.98) 0%, rgba(23,21,15,0.92) 42%, rgba(23,21,15,0.4) 100%), linear-gradient(0deg, rgba(23,21,15,0.92) 0%, rgba(23,21,15,0) 45%);"
			aria-hidden="true"
		></div>

		<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-8 md:px-8 md:pt-10">
			<a
				href="/age-open?tab=results"
				class="text-[9.5px] font-extrabold tracking-[0.2em] text-paper-bg/60 uppercase transition-colors hover:text-paper-bg"
				>← Archive</a
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

			<div class="fp-rise mt-8 max-w-[760px] md:mt-10">
				<p
					class="flex flex-wrap items-center gap-x-3 gap-y-2 text-[9.5px] font-extrabold tracking-[0.26em] text-paper-bg/60 uppercase"
				>
					{#if isLive}
						<span class="inline-flex items-center gap-1.5 bg-hero-rb px-2 py-[3px] text-white"
							><span class="h-1.5 w-1.5 animate-pulse bg-white" aria-hidden="true"></span>Live</span
						>
					{:else}
						Final results
					{/if}
					{#if event.circuit}
						<span
							class="px-1.5 py-[3px] text-[8px] tracking-[0.16em] text-white"
							style="background: {circuitVar(event.circuit)};">{abbr(event.circuit)}</span
						>
					{/if}
					{fmtDate(event.eventDate, {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
						year: 'numeric'
					})}
				</p>
				<h1 class="ao-cond mt-3 text-[52px] leading-[0.86] font-black uppercase md:text-[88px]">
					{event.circuit ? `${event.circuit} ` : ''}{event.month || ''} Open
				</h1>
				<p
					class="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase"
				>
					<FormatTag format={event.format} />
					{#if event.location}<span>{event.location}</span>{/if}
				</p>

				{#if champion}
					<div class="mt-7 flex items-center gap-4 border-l-[3px] border-gold pl-4">
						<div class="min-w-0">
							<p class="text-[9px] font-extrabold tracking-[0.24em] text-gold uppercase">
								{isLive ? 'Leading' : 'Champion'}
							</p>
							<p class="mt-1 font-newsreader text-[26px] leading-tight md:text-[30px]">
								{#if champion.gemId}
									<a href="/player/{champion.gemId}" class="fp-ul">{champion.playerName}</a>
								{:else}
									{champion.playerName}
								{/if}
							</p>
							{#if champion.hero}
								<p
									class="mt-1 text-[10px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase"
								>
									on {champion.hero} · {champion.wins}–{champion.losses}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- stat strip -->
			<dl class="mt-9 grid grid-cols-3 border-t border-paper-bg/15 md:mt-10 md:grid-cols-6">
				{#each [{ v: results.length, l: 'Players' }, { v: data.totalRounds || '—', l: 'Rounds' }, { v: money(prizePool), l: 'Prizes paid' }, { v: money(firstPrize), l: '1st prize', hl: true }, { v: topHero ? heroName(topHero.hero) : '—', l: 'Most played', small: true }, { v: data.decklists?.length || 0, l: 'Public lists' }] as t, i (i)}
					<div
						class="border-r border-paper-bg/15 px-3 pt-4 pb-5 text-center md:px-4 md:pt-5 md:pb-6 md:last:border-r-0 [&:nth-child(3n)]:border-r-0 md:[&:nth-child(3n)]:border-r"
					>
						<dd
							class="ao-cond truncate leading-none font-black tabular-nums {t.small
								? 'text-[24px] md:text-[28px]'
								: 'text-[34px] md:text-[40px]'} {t.hl ? 'text-warm-light' : ''}"
						>
							{t.v}
						</dd>
						<dt
							class="mt-2 text-[8.5px] font-extrabold tracking-[0.2em] text-paper-bg/55 uppercase"
						>
							{t.l}
						</dt>
					</div>
				{/each}
			</dl>
		</div>
	</section>

	<!-- ============ section bar ============ -->
	<div class="z-[5] border-b border-line bg-paper-bg/95 backdrop-blur-sm md:sticky md:top-[59px]">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-3 md:px-8">
			<div
				class="flex gap-px overflow-x-auto border border-line2 bg-line2 md:w-fit"
				role="tablist"
				aria-label="Results sections"
			>
				{#each SECTIONS as s (s.id)}
					<button
						type="button"
						role="tab"
						aria-selected={tab === s.id}
						onclick={() => (tab = s.id)}
						class="min-h-[44px] shrink-0 px-4 text-[10px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors {tab ===
						s.id
							? 'bg-ink text-paper-bg'
							: 'bg-paper-bg text-soft hover:bg-paper hover:text-ink'}">{s.label}</button
					>
				{/each}
			</div>
		</div>
	</div>

	<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-16 md:px-8 md:pt-10 md:pb-20">
		<!-- ============ standings ============ -->
		{#if tab === 'standings'}
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class={KICK}>Final Swiss order</p>
					<h2
						class="ao-cond mt-2 text-[40px] leading-none font-black uppercase [word-spacing:0.18em]"
					>
						Standings
					</h2>
				</div>
				<label class="w-full md:w-[280px]">
					<span class="sr-only">Find a player</span>
					<span
						class="flex items-center gap-2.5 border border-line2 bg-paper-bg px-3 transition-colors focus-within:border-ink hover:border-ink"
					>
						<svg
							class="h-4 w-4 shrink-0 text-warm"
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							aria-hidden="true"
							><circle cx="8.5" cy="8.5" r="5.5" /><path
								d="M13 13l4.5 4.5"
								stroke-linecap="square"
							/></svg
						>
						<input
							type="search"
							bind:value={standingsQ}
							placeholder="Find a player or hero…"
							autocomplete="off"
							class="min-h-[44px] w-full border-0 bg-transparent font-newsreader text-[17px] text-ink placeholder:text-fade focus:outline-none [&::-webkit-search-cancel-button]:hidden"
						/>
					</span>
				</label>
			</div>

			{#if !results.length}
				<p
					class="mt-8 border border-line bg-paper px-6 py-12 text-center font-newsreader text-[16px] text-soft italic"
				>
					Standings will appear here once the first round is reported.
				</p>
			{:else}
				<!-- desktop -->
				<div class="mt-6 hidden md:block">
					<div
						class="grid grid-cols-[56px_minmax(0,1fr)_88px_80px_96px_100px] items-end gap-4 border-b-[3px] border-ink px-4 pb-2 {TH}"
					>
						<span class="text-center">Place</span><span>Player · hero</span><span
							class="text-center">Record</span
						><span class="text-center">AGE pts</span><span class="text-center">Prize</span><span
							class="text-right">List</span
						>
					</div>
					<ol>
						{#each standingsShown as r, i (r.gemId || r.playerName + i)}
							{@const list = listFor(r.gemId, r.playerName)}
							{@const img = heroImageUrl(r.hero)}
							{#if !standingsQ && r.placement === 9}
								<li class="flex items-center gap-3 px-4 py-2.5" aria-label="Top 8 cut">
									<span class="h-px flex-1 bg-warm"></span>
									<span class="text-[8.5px] font-extrabold tracking-[0.24em] text-warm uppercase"
										>Top 8 cut</span
									>
									<span class="h-px flex-1 bg-warm"></span>
								</li>
							{/if}
							<li
								class="grid grid-cols-[56px_minmax(0,1fr)_88px_80px_96px_100px] items-center gap-4 border-b border-line px-4 py-2 even:bg-paper/50"
							>
								<span
									class="ao-cond text-center text-[24px] leading-none font-black tabular-nums {rankTone(
										r.placement
									)}">{r.placement}</span
								>
								<span class="flex min-w-0 items-center gap-3">
									<span
										class="h-[38px] w-[38px] shrink-0 border border-line2 bg-paper bg-cover bg-[right_center]"
										style={img ? `background-image: url('${img}');` : ''}
										aria-hidden="true"
									></span>
									<span class="min-w-0">
										<span
											class="block truncate font-newsreader text-[17px] leading-tight font-semibold"
										>
											{#if r.gemId}<a href="/player/{r.gemId}" class="fp-ul">{r.playerName}</a
												>{:else}{r.playerName}{/if}
										</span>
										<span class="mt-[2px] block truncate text-[11px] font-bold text-soft"
											>{r.hero || 'Hero not logged'}</span
										>
									</span>
								</span>
								<span class="text-center text-[13px] tabular-nums"
									><span class="font-bold">{r.wins}</span><span class="text-fade"
										>–{r.losses}{r.draws ? `–${r.draws}` : ''}</span
									></span
								>
								<span class="ao-cond text-center text-[22px] leading-none font-black tabular-nums"
									>{r.agePoints ?? '—'}</span
								>
								<span
									class="text-center text-[13px] font-bold tabular-nums {Number(r.prizeAmount) > 0
										? 'text-prem'
										: 'text-fade'}">{money(r.prizeAmount)}</span
								>
								<span class="text-right">
									{#if list}
										<a
											href="/age-open/{event.id}/decklist/{list.id}"
											class="text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase hover:text-ink"
											>View list →</a
										>
									{:else}
										<span class="text-[10px] text-fade/60">—</span>
									{/if}
								</span>
							</li>
						{/each}
					</ol>
				</div>

				<!-- phone -->
				<ol class="mt-6 border-t-[3px] border-ink md:hidden">
					{#each standingsShown as r, i (r.gemId || r.playerName + i)}
						{@const list = listFor(r.gemId, r.playerName)}
						{#if !standingsQ && r.placement === 9}
							<li class="flex items-center gap-3 py-2" aria-label="Top 8 cut">
								<span class="h-px flex-1 bg-warm"></span>
								<span class="text-[8.5px] font-extrabold tracking-[0.2em] text-warm uppercase"
									>Top 8 cut</span
								>
								<span class="h-px flex-1 bg-warm"></span>
							</li>
						{/if}
						<li
							class="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3"
						>
							<span
								class="ao-cond text-center text-[26px] leading-none font-black tabular-nums {rankTone(
									r.placement
								)}">{r.placement}</span
							>
							<span class="min-w-0">
								<span
									class="block truncate font-newsreader text-[16px] leading-tight font-semibold"
								>
									{#if r.gemId}<a href="/player/{r.gemId}" class="fp-ul">{r.playerName}</a
										>{:else}{r.playerName}{/if}
								</span>
								<span class="mt-[2px] block truncate text-[11px] font-bold text-soft"
									>{r.hero || 'Hero not logged'}</span
								>
								{#if list}
									<a
										href="/age-open/{event.id}/decklist/{list.id}"
										class="mt-1 inline-block text-[9px] font-extrabold tracking-[0.16em] text-warm uppercase"
										>View list →</a
									>
								{/if}
							</span>
							<span class="text-right">
								<span class="block text-[13px] font-bold tabular-nums">{r.wins}–{r.losses}</span>
								<span class="block text-[10px] font-bold text-fade tabular-nums"
									>{r.agePoints ?? 0} pts{Number(r.prizeAmount) > 0
										? ` · ${money(r.prizeAmount)}`
										: ''}</span
								>
							</span>
						</li>
					{/each}
				</ol>
				{#if standingsQ && !standingsShown.length}
					<p class="mt-6 font-newsreader text-[15px] text-soft italic">
						No player or hero matches “{standingsQ}”.
					</p>
				{/if}
			{/if}
		{/if}

		<!-- ============ top 8 ============ -->
		{#if tab === 'top8' && data.top8Bracket}
			{@const b = data.top8Bracket}
			<p class={KICK}>Single elimination</p>
			<h2 class="ao-cond mt-2 text-[40px] leading-none font-black uppercase [word-spacing:0.18em]">
				Top 8
			</h2>

			{#snippet slot(p, size = 'md')}
				<div
					class="flex items-center gap-2.5 border-l-[3px] px-3 py-2 {p?.isWinner
						? 'border-l-warm bg-paper-bg'
						: 'border-l-transparent bg-paper text-soft'}"
				>
					<span
						class="ao-cond w-[18px] shrink-0 text-[15px] leading-none font-black text-fade tabular-nums"
						>{p?.seed ?? ''}</span
					>
					<span
						class="h-[28px] w-[28px] shrink-0 border border-line2 bg-cover bg-[right_center]"
						style={p?.hero ? `background-image: url('${heroImageUrl(p.hero)}');` : ''}
						aria-hidden="true"
					></span>
					<span class="min-w-0 flex-1">
						<span
							class="block truncate {size === 'lg'
								? 'text-[15px]'
								: 'text-[13px]'} leading-tight {p?.isWinner
								? 'font-extrabold text-ink'
								: 'font-semibold'}"
						>
							{#if p?.gemId}<a href="/player/{p.gemId}" class="fp-ul">{p.name}</a>{:else}{p?.name ??
									'TBD'}{/if}
						</span>
						{#if p?.hero}<span class="block truncate text-[10px] font-bold text-fade"
								>{heroName(p.hero)}</span
							>{/if}
					</span>
				</div>
			{/snippet}

			<div class="mt-8 overflow-x-auto pb-2">
				<div class="grid min-w-[860px] grid-cols-[1fr_1fr_1fr_0.9fr] gap-6">
					{#each [{ label: 'Quarterfinals', matches: b.quarterfinals }, { label: 'Semifinals', matches: b.semifinals }, { label: 'Final', matches: [b.finals] }] as col (col.label)}
						<div class="flex flex-col">
							<p class="border-b-[3px] border-ink pb-2 {TH}">{col.label}</p>
							<div class="flex flex-1 flex-col justify-around gap-4 pt-4">
								{#each col.matches as m, mi (mi)}
									<div class="border border-line2">
										{@render slot(m.player1)}
										<div class="h-px bg-line2"></div>
										{@render slot(m.player2)}
									</div>
								{/each}
							</div>
						</div>
					{/each}
					<div class="flex flex-col">
						<p
							class="border-b-[3px] border-gold pb-2 text-[9px] font-extrabold tracking-[0.2em] text-gold uppercase"
						>
							Champion
						</p>
						<div class="flex flex-1 flex-col justify-center pt-4">
							{#if b.champion}
								{@const cimg = heroImageUrl(b.champion.hero)}
								<div class="relative overflow-hidden border border-ink bg-ink text-paper-bg">
									{#if cimg}<img
											src={cimg}
											alt=""
											class="absolute inset-0 h-full w-full object-cover object-[75%_20%] opacity-55"
										/>{/if}
									<span
										class="absolute inset-0"
										style="background: linear-gradient(0deg, rgba(23,21,15,0.95) 25%, rgba(23,21,15,0.2) 100%);"
										aria-hidden="true"
									></span>
									<div class="relative flex min-h-[200px] flex-col justify-end p-4">
										<span
											class="absolute top-0 left-0 bg-gold px-2 py-1 text-[8.5px] font-extrabold tracking-[0.16em] text-white uppercase"
											>Champion</span
										>
										<p class="ao-cond text-[28px] leading-[0.9] font-black uppercase">
											{#if b.champion.gemId}<a
													href="/player/{b.champion.gemId}"
													class="hover:text-warm-light">{b.champion.name}</a
												>{:else}{b.champion.name}{/if}
										</p>
										{#if b.champion.hero}<p
												class="mt-1.5 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg/65 uppercase"
											>
												{b.champion.hero}
											</p>{/if}
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
			<p class="mt-4 font-newsreader text-[14px] text-fade italic">
				Seeded by Swiss finish: 1 v 8, 4 v 5, 3 v 6, 2 v 7.
			</p>
		{/if}

		<!-- ============ metagame ============ -->
		{#if tab === 'metagame' && meta.length}
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class={KICK}>What the field brought</p>
					<h2
						class="ao-cond mt-2 text-[40px] leading-none font-black uppercase [word-spacing:0.18em]"
					>
						Metagame
					</h2>
				</div>
				<p class="font-newsreader text-[15px] text-soft italic">
					{data.totalPlayers} heroes logged. Tap a hero to see who played it.
				</p>
			</div>

			<div class="mt-6 grid gap-4 md:grid-cols-2">
				{#each [{ k: 'Most played', h: topHero, v: topHero ? `${topHero.percentage}%` : '', s: topHero ? `${topHero.count} of ${data.totalPlayers} players` : '' }, { k: 'Best win rate', h: bestHero, v: bestHero ? `${bestHero.winRate}%` : '', s: bestHero ? `${bestHero.wins}–${bestHero.losses} across ${bestHero.totalMatches} matches` : '' }] as card (card.k)}
					{#if card.h}
						{@const img = heroImageUrl(card.h.hero)}
						<div class="relative overflow-hidden border border-ink bg-ink text-paper-bg">
							{#if img}<img
									src={img}
									alt=""
									class="absolute inset-y-0 right-0 h-full w-[70%] object-cover object-[75%_20%] opacity-70"
									style="-webkit-mask-image: linear-gradient(to right, transparent, #000 60%); mask-image: linear-gradient(to right, transparent, #000 60%);"
								/>{/if}
							<div class="relative p-5">
								<p class="text-[9px] font-extrabold tracking-[0.22em] text-warm-light uppercase">
									{card.k}
								</p>
								<p class="ao-cond mt-2 text-[56px] leading-[0.85] font-black tabular-nums">
									{card.v}
								</p>
								<p class="mt-2 font-newsreader text-[19px] leading-tight">{card.h.hero}</p>
								<p class="mt-1 text-[10px] font-bold text-paper-bg/60">{card.s}</p>
							</div>
						</div>
					{/if}
				{/each}
			</div>

			<div class="mt-8">
				<div
					class="hidden grid-cols-[minmax(0,1fr)_200px_72px_80px_72px] items-end gap-4 border-b-[3px] border-ink px-4 pb-2 md:grid {TH}"
				>
					<span>Hero</span><span>Share of field</span><span class="text-center">Pilots</span><span
						class="text-center">Record</span
					><span class="text-center">Win %</span>
				</div>
				<ol class="border-t-[3px] border-ink md:border-t-0">
					{#each meta as h (h.hero)}
						{@const open = openHero === h.hero}
						{@const img = h.imageUrl || heroImageUrl(h.hero)}
						<li class="border-b border-line {open ? 'bg-paper' : 'even:bg-paper/50'}">
							<button
								type="button"
								onclick={() => (openHero = open ? null : h.hero)}
								aria-expanded={open}
								class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-paper md:grid-cols-[minmax(0,1fr)_200px_72px_80px_72px] md:gap-4 md:px-4"
							>
								<span class="flex min-w-0 items-center gap-3">
									<span
										class="h-[38px] w-[38px] shrink-0 border border-line2 bg-paper bg-cover bg-[right_center]"
										style={img ? `background-image: url('${img}');` : ''}
										aria-hidden="true"
									></span>
									<span class="min-w-0">
										<span
											class="block truncate font-newsreader text-[17px] leading-tight font-semibold"
											>{h.hero}</span
										>
										<span class="mt-[2px] block text-[11px] font-bold text-soft md:hidden"
											>{h.count} pilots · {h.percentage}% · {h.wins}–{h.losses}</span
										>
									</span>
								</span>
								<span class="hidden items-center gap-3 md:flex">
									<span class="relative block h-[6px] flex-1 bg-line"
										><span
											class="absolute inset-y-0 left-0 bg-warm"
											style="width: {(h.count / maxShare) * 100}%;"
										></span></span
									>
									<span class="w-[42px] text-right text-[12px] font-bold tabular-nums"
										>{h.percentage}%</span
									>
								</span>
								<span
									class="ao-cond hidden text-center text-[22px] leading-none font-black tabular-nums md:block"
									>{h.count}</span
								>
								<span class="hidden text-center text-[13px] tabular-nums md:block"
									><span class="font-bold">{h.wins}</span><span class="text-fade">–{h.losses}</span
									></span
								>
								<span
									class="text-right text-[13px] font-bold tabular-nums md:text-center {wrTone(h)}"
									>{h.totalMatches ? `${h.winRate}%` : '—'}</span
								>
							</button>
							{#if open && h.players?.length}
								<ul class="flex flex-wrap gap-x-5 gap-y-1.5 px-4 pb-3 pl-[66px]">
									{#each h.players as pl, pi (pi)}
										{@const name = pl.playerName ?? pl.name ?? pl}
										{@const gem = pl.gemId}
										<li class="text-[12px] font-bold text-soft">
											{#if gem}<a href="/player/{gem}" class="fp-ul text-ink">{name}</a
												>{:else}{name}{/if}{#if pl.wins != null}<span
													class="ml-1.5 text-fade tabular-nums"
												>
													{`· ${pl.wins}–${pl.losses}`}</span
												>{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ol>
				<p class="mt-4 font-newsreader text-[14px] text-fade italic">
					Win rate is coloured from three matches up: green 60%+, gold 50%+, red under 40%.
				</p>
			</div>
		{/if}

		<!-- ============ matches ============ -->
		{#if tab === 'matches'}
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class={KICK}>Every pairing</p>
					<h2
						class="ao-cond mt-2 text-[40px] leading-none font-black uppercase [word-spacing:0.18em]"
					>
						Matches
					</h2>
				</div>
				<label class="w-full md:w-[280px]">
					<span class="sr-only">Find a player or hero</span>
					<span
						class="flex items-center gap-2.5 border border-line2 bg-paper-bg px-3 transition-colors focus-within:border-ink hover:border-ink"
					>
						<svg
							class="h-4 w-4 shrink-0 text-warm"
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							aria-hidden="true"
							><circle cx="8.5" cy="8.5" r="5.5" /><path
								d="M13 13l4.5 4.5"
								stroke-linecap="square"
							/></svg
						>
						<input
							type="search"
							bind:value={matchQ}
							placeholder="Find a player or hero…"
							autocomplete="off"
							class="min-h-[44px] w-full border-0 bg-transparent font-newsreader text-[17px] text-ink placeholder:text-fade focus:outline-none [&::-webkit-search-cancel-button]:hidden"
						/>
					</span>
				</label>
			</div>

			<div class="mt-5">
				<p class={LABEL} id="round-label">Round</p>
				<div
					class="mt-2 flex flex-wrap gap-px border border-line2 bg-line2 md:w-fit"
					role="group"
					aria-labelledby="round-label"
				>
					{#each ['all', ...rounds] as r (r)}
						<button
							type="button"
							onclick={() => (round = r)}
							aria-pressed={round === r}
							class="min-h-[40px] min-w-[44px] flex-1 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors md:flex-none {round ===
							r
								? 'bg-ink text-paper-bg'
								: 'bg-paper-bg text-soft hover:bg-paper hover:text-ink'}"
							>{r === 'all' ? 'All' : r}</button
						>
					{/each}
				</div>
				<p class="mt-3 font-newsreader text-[15px] text-ink" aria-live="polite">
					<strong class="font-semibold">{matchCount}</strong>
					{matchCount === 1 ? 'match' : 'matches'}{matchQ ? ` · “${matchQ}”` : ''}
				</p>
			</div>

			{#each matchRounds as r (r.round)}
				<section class="mt-8">
					<div class="flex items-end justify-between gap-3 border-b-[3px] border-ink pb-2">
						<h3 class="ao-cond text-[26px] leading-none font-black uppercase [word-spacing:0.18em]">
							{roundName(r.round)}
						</h3>
						<p class={LABEL}>{r.matches.length} {r.matches.length === 1 ? 'table' : 'tables'}</p>
					</div>
					<ol>
						{#each r.matches as m, mi (mi)}
							{@const w1 = m.winner === 'player1'}
							{@const w2 = m.winner === 'player2'}
							<li
								class="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 border-b border-line px-2 py-2.5 even:bg-paper/50 md:grid-cols-[56px_minmax(0,1fr)_64px_minmax(0,1fr)] md:gap-4 md:px-4"
							>
								<span
									class="text-center text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
									>{m.table ? `T${m.table}` : ''}</span
								>
								{#each [{ p: m.player1, w: w1, l: w2 }, { p: m.player2, w: w2, l: w1 }] as side, si (si)}
									{#if si === 1}
										<span class="hidden text-center md:block">
											{#if m.isDraw}
												<span
													class="bg-fade px-2 py-1 text-[9px] font-extrabold tracking-[0.16em] text-white uppercase"
													>Draw</span
												>
											{:else if !m.winner}
												<span
													class="text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase"
													>vs</span
												>
											{:else}
												<span
													class="text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase"
													>def.</span
												>
											{/if}
										</span>
									{/if}
									<span
										class="flex min-w-0 items-center gap-2.5 {si === 1
											? 'col-start-2 md:col-start-auto md:flex-row-reverse md:text-right'
											: ''}"
									>
										<span
											class="ao-cond flex h-[22px] w-[22px] shrink-0 items-center justify-center text-[12px] font-black text-white"
											style="background: {side.w
												? 'var(--ed-prem)'
												: side.l
													? 'var(--ed-hero-rb)'
													: 'var(--ed-line2)'};"
											>{side.w ? 'W' : side.l ? 'L' : m.isDraw ? 'D' : ''}</span
										>
										<span class="min-w-0">
											<span
												class="block truncate text-[14px] leading-tight {side.w
													? 'font-extrabold text-ink'
													: 'font-semibold text-soft'}"
											>
												{#if side.p?.gemId}<a href="/player/{side.p.gemId}" class="fp-ul"
														>{side.p.name}</a
													>{:else}{side.p?.name ?? 'Bye'}{/if}
											</span>
											{#if side.p?.hero}<span
													class="block truncate text-[10.5px] font-bold text-fade"
													>{side.p.hero}</span
												>{/if}
										</span>
									</span>
								{/each}
							</li>
						{/each}
					</ol>
				</section>
			{:else}
				<p class="mt-8 font-newsreader text-[15px] text-soft italic">
					No matches match “{matchQ}”.
				</p>
			{/each}
		{/if}

		<!-- ============ decklists ============ -->
		{#if tab === 'decklists' && data.decklists?.length}
			<p class={KICK}>Registered lists</p>
			<h2 class="ao-cond mt-2 text-[40px] leading-none font-black uppercase [word-spacing:0.18em]">
				Decklists
			</h2>
			<ol class="mt-6 border-t-[3px] border-ink">
				{#each data.decklists as d (d.id)}
					{@const img = d.heroImageUrl || heroImageUrl(d.hero)}
					<li class="border-b border-line even:bg-paper/50">
						<a
							href="/age-open/{event.id}/decklist/{d.id}"
							class="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 px-2 py-2.5 transition-colors hover:bg-paper md:grid-cols-[64px_minmax(0,1fr)_120px_110px] md:gap-4 md:px-4"
						>
							<span
								class="ao-cond text-center text-[24px] leading-none font-black tabular-nums {d.placement
									? rankTone(d.placement)
									: 'text-fade/50'}">{d.placement ? ordinal(d.placement) : '—'}</span
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
									<span class="mt-[2px] block truncate text-[12px] font-bold text-soft"
										>{d.playerName}</span
									>
								</span>
							</span>
							<span class="justify-self-end md:justify-self-start"
								><FormatTag format={d.format || event.format} size="sm" short /></span
							>
							<span
								class="hidden text-right text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase md:block"
								>View list →</span
							>
						</a>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</AgeShell>
