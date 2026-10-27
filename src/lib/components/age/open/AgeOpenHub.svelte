<script>
	/**
	 * AGE Open hub — the overview page of the series, in the homepage's
	 * register. Everything in the AGE Open is one click from here:
	 *
	 *   ink masthead       the pitch, season figures and the next event
	 *   the directory      a card per section (events, standings, decklists,
	 *                      archive, rules) with a live figure on each
	 *   upcoming events    the next few events as poster rows
	 *   the circuits       the three regions and their next date
	 *   standings + season the leaders beside how a season works
	 *   latest results     recently completed events
	 *   rules band         the rulebook, prize structure and FAQ
	 *
	 * Section links use `?tab=` so the navbar submenu, old bookmarks and
	 * these cards all land on the same pages.
	 */
	import FormatTag from '../FormatTag.svelte';
	import { reveal } from '$lib/actions/reveal.js';
	import CircuitModal from './CircuitModal.svelte';
	import { CIRCUITS } from '$lib/data/circuits.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const SLUG = { 'Los Angeles': 'la', 'St. Louis': 'stl', 'New England': 'ne' };
	const ccVar = (name) => `var(--ed-cc-${SLUG[name] ?? 'la'})`;
	const tab = (id) => `/age-open?tab=${id}`;

	const fmt = (d, opts) => new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
	const daysUntil = (d) => {
		const day = new Date(d);
		day.setUTCHours(23, 59, 59, 999);
		return Math.max(0, Math.floor((day.getTime() - Date.now()) / 86400000));
	};
	const countdown = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`);
	const price = (p) => (p != null && Number(p) > 0 ? `$${Math.round(Number(p))}` : 'Free');
	const shortFormat = (f) => (f === 'Classic Constructed' ? 'CC' : f || '');

	// ============ events ============
	const upcoming = $derived(
		(data.events ?? [])
			.filter((e) => {
				if (!e.eventDate) return false;
				const end = new Date(e.eventDate);
				end.setUTCHours(23, 59, 59, 999);
				return end >= new Date();
			})
			.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
			.map((e) => ({
				id: e.id,
				href: `/age-open/${e.id}`,
				title: e.title || `AGE Open · ${e.circuit || ''}`,
				circuit: e.circuit || '',
				venue: e.location || '',
				format: shortFormat(e.format),
				price: price(e.price),
				discount: !!e.premiumDiscount,
				cap: e.playerCap || null,
				registered: e.registeredCount || 0,
				day: fmt(e.eventDate, { day: 'numeric' }),
				month: fmt(e.eventDate, { month: 'short' }).toUpperCase(),
				weekday: fmt(e.eventDate, { weekday: 'long' }),
				long: fmt(e.eventDate, { weekday: 'long', month: 'long', day: 'numeric' }),
				days: daysUntil(e.eventDate),
				image: CIRCUITS[e.circuit]?.image || '/banner/age-open-banner.webp'
			}))
	);
	const next = $derived(upcoming[0] ?? null);
	const later = $derived(upcoming.slice(1, 5));

	const past = $derived(
		[...(data.archiveEvents ?? [])]
			.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
			.slice(0, 3)
			.map((e) => ({
				id: e.id,
				title: e.title || `AGE Open · ${e.circuit || ''}`,
				circuit: e.circuit || '',
				venue: e.location || '',
				date: fmt(e.eventDate, { month: 'long', day: 'numeric', year: 'numeric' }),
				live: e.status === 'in_progress'
			}))
	);

	// ============ standings ============
	const leaders = $derived((data.standings ?? []).slice(0, 5));
	const ranked = $derived((data.standings ?? []).length);

	// ============ circuits ============
	const circuits = $derived(
		Object.values(CIRCUITS).map((c) => ({
			name: c.name,
			region: c.region,
			abbreviation: c.abbreviation,
			image: c.image,
			next: upcoming.find((e) => e.circuit === c.name) ?? null,
			count: upcoming.filter((e) => e.circuit === c.name).length
		}))
	);

	// ============ circuit pop-out ============
	/** @type {string | null} */
	let openCircuit = $state(null);
	const active = $derived.by(() => {
		if (!openCircuit) return null;
		const c = circuits.find((x) => x.name === openCircuit);
		if (!c) return null;
		return {
			...c,
			dates: upcoming
				.filter((e) => e.circuit === c.name)
				.slice(0, 4)
				.map((e) => ({ ...e, when: countdown(e.days) })),
			venues: [...new Set(upcoming.filter((e) => e.circuit === c.name).map((e) => e.venue))].filter(
				Boolean
			),
			top: data.standingsByCircuit?.[c.name] ?? []
		};
	});
	/** @type {HTMLElement | undefined} */
	let lastTrigger;
	function openModal(name, e) {
		lastTrigger = e?.currentTarget;
		openCircuit = name;
	}
	function closeModal() {
		openCircuit = null;
		lastTrigger?.focus();
	}

	// ============ season figures ============
	// Players: everyone with AGE Points in the standings, across all circuits.
	const stats = $derived(
		[
			{ n: 24, l: 'Events this season' },
			{ n: '$30,000', l: 'Prize pool' },
			{ n: Object.keys(CIRCUITS).length, l: 'Regions' },
			ranked ? { n: ranked.toLocaleString('en-US'), l: 'AGE Open players' } : null
		].filter(Boolean)
	);

	// ============ directory ============
	const directory = $derived([
		{
			id: 'events',
			title: 'Events',
			blurb: 'Every upcoming open, by circuit and on the calendar, with sign-up.',
			figure: upcoming.length,
			unit: upcoming.length === 1 ? 'event ahead' : 'events ahead'
		},
		{
			id: 'standings',
			title: 'Standings',
			blurb: 'The season leaderboard, AGE Points by player, filterable by circuit.',
			figure: leaders[0]?.playerName ? leaders[0].totalPoints || 0 : ranked,
			unit: leaders[0]?.playerName ? `pts · ${leaders[0].playerName} leads` : 'players ranked'
		},
		{
			id: 'decklists',
			title: 'Decklists',
			blurb: 'The lists that made the cut, with heroes, placements and full card counts.',
			figure: 'T8',
			unit: 'Lists from every event'
		},
		{
			id: 'results',
			title: 'Tournament Archive',
			blurb: 'Final standings and Top 8 brackets from every completed open.',
			figure: data.archiveEvents?.length || 0,
			unit: (data.archiveEvents?.length || 0) === 1 ? 'event played' : 'events played'
		},
		{
			id: 'rules',
			title: 'Rules & Info',
			blurb: 'The rulebook, prize structure, the Player’s Championship and the FAQ.',
			figure: '§',
			unit: 'Before round one'
		}
	]);

	const STEPS = [
		['Register', 'Sign up for an open in your region; members save on entry.'],
		['Compete', 'Swiss rounds, then a Top 8 playoff for the prize pool.'],
		['Earn points', 'Every finish earns AGE Points toward the season leaderboard.'],
		['Championship', 'The season’s leaders qualify for the Player’s Championship.']
	];
</script>

<!-- ============ masthead: tournament poster ============ -->
<section class="relative overflow-hidden bg-ink text-paper-bg">
	<img
		src="/banner/age-open-banner.webp"
		alt=""
		aria-hidden="true"
		class="fp-kenburns absolute inset-0 h-full w-full object-cover opacity-30 grayscale"
	/>
	<div
		class="absolute inset-0"
		style="background: linear-gradient(100deg, rgba(23,21,15,0.97) 0%, rgba(23,21,15,0.9) 48%, rgba(23,21,15,0.6) 100%);"
		aria-hidden="true"
	></div>

	<div
		class="relative mx-auto grid w-full max-w-[1200px] gap-12 px-5 pt-12 pb-14 md:px-8 md:pt-16 md:pb-20 lg:grid-cols-[1fr_440px] lg:items-end lg:gap-14"
	>
		<div class="fp-rise min-w-0">
			<p
				class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-extrabold tracking-[0.3em] uppercase md:text-[10.5px]"
			>
				<span class="bg-warm px-2 py-1 text-white">Season ’26</span>
				<span class="text-paper-bg/70">Los Angeles · St. Louis · New England</span>
			</p>
			<h1 class="mt-7 md:mt-8">
				<img
					src="/age_open_logo.svg"
					alt="AGE Open Series"
					class="h-auto w-[300px] md:w-[460px]"
					width="629"
					height="294"
				/>
			</h1>
			<p
				class="mt-6 max-w-[520px] font-newsreader text-[17px] leading-[1.5] text-paper-bg/75 italic md:text-[20px]"
			>
				The premier independent Flesh and Blood circuit. Step up against the best players in your
				region, climb the leaderboard, and claim your seat at the AGE Player’s Championship. The
				next AGE champion could be you.
			</p>

			<!-- scoreboard: four equal cells, figures centred and sized to fit -->
			<dl class="mt-9 grid grid-cols-2 border-y border-paper-bg/20 sm:grid-cols-4 [&>div]:min-w-0">
				{#each stats as s, i (s.l)}
					<div
						class="@container flex flex-col items-center justify-center px-2 py-5 text-center {i % 2
							? 'border-l border-paper-bg/15'
							: ''} {i > 1 ? 'border-t border-paper-bg/15 sm:border-t-0' : ''} {i === 2
							? 'sm:border-l'
							: ''}"
					>
						<dt class="sr-only">{s.l}</dt>
						<dd
							class="ao-cond text-[clamp(26px,25cqw,50px)] leading-none font-black whitespace-nowrap tabular-nums"
						>
							{s.n}
						</dd>
						<dd
							class="mt-2 text-[8.5px] leading-[1.3] font-extrabold tracking-[0.16em] text-paper-bg/55 uppercase md:text-[9px]"
						>
							{s.l}
						</dd>
					</div>
				{/each}
			</dl>
		</div>

		<!-- next event: an admission ticket -->
		{#if next}
			<a
				href={next.href}
				class="fp-rise group relative block rotate-[1.5deg] transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:rotate-0"
				style="animation-delay: 160ms; filter: drop-shadow(0 24px 30px rgba(0,0,0,0.55));"
			>
				<span class="grid grid-cols-[1fr_92px] bg-paper-bg text-ink">
					<!-- body -->
					<span class="block min-w-0">
						<span class="relative block aspect-[16/7] overflow-hidden bg-ink">
							<img
								src={next.image}
								alt=""
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
							/>
							<span
								class="absolute inset-0"
								style="background: linear-gradient(90deg, color-mix(in srgb, {ccVar(
									next.circuit
								)} 72%, rgba(23,21,15,0.55)) 0%, rgba(23,21,15,0) 80%);"
								aria-hidden="true"
							></span>
							<span
								class="absolute bottom-3 left-4 text-[9.5px] font-extrabold tracking-[0.22em] text-white uppercase"
								>◆ Next up · {next.circuit}</span
							>
						</span>
						<span class="block px-5 pt-4 pb-5">
							<span class="ao-cond block text-[32px] leading-[0.95] font-black uppercase"
								>{next.title}</span
							>
							<span class="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5"
								>{#if next.format}<FormatTag format={next.format} />{/if}<span
									class="text-[11px] font-semibold text-fade">{next.long} · {next.venue}</span
								></span
							>
							<span class="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
								<span class="flex items-baseline gap-2">
									<span class="ao-cond text-[30px] leading-none font-black">{next.price}</span>
									{#if next.discount}<span
											class="text-[9px] font-extrabold tracking-[0.14em] text-prem uppercase"
											>Members save 10%</span
										>{/if}
								</span>
								<span
									class="inline-flex items-center bg-warm px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors group-hover:bg-ink"
									>Sign up →</span
								>
							</span>
						</span>
					</span>
					<!-- stub -->
					<span
						class="relative flex flex-col items-center justify-between border-l-0 bg-paper py-5 text-center"
					>
						<span class="ao-perf absolute inset-y-2 left-0 w-px text-line2" aria-hidden="true"
						></span>
						<span
							class="text-[8px] font-extrabold tracking-[0.24em] text-fade uppercase [writing-mode:vertical-rl]"
							>Admit one</span
						>
						<span>
							<span
								class="block text-[10px] font-extrabold tracking-[0.18em]"
								style="color: {ccVar(next.circuit)};">{next.month}</span
							>
							<span class="ao-cond block text-[46px] leading-[0.85] font-black tabular-nums"
								>{next.day}</span
							>
						</span>
						<span
							class="inline-flex items-center gap-1.5 text-[8.5px] font-extrabold tracking-[0.12em] text-warm uppercase"
						>
							<span
								class="h-[5px] w-[5px] animate-pulse-dot rounded-full bg-warm"
								aria-hidden="true"
							></span>
							{countdown(next.days)}
						</span>
					</span>
				</span>
			</a>
		{/if}
	</div>
</section>

<!-- ============ the series: numbered like bracket rounds ============ -->
<section class="mx-auto w-full max-w-[1200px] px-5 pt-14 md:px-8 md:pt-20" use:reveal>
	<div
		class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-ink pb-3"
	>
		<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
			The series
		</h2>
		<p
			class="hidden max-w-[300px] text-right font-newsreader text-[16px] text-soft italic md:block"
		>
			Everything in the AGE Open, one click away.
		</p>
	</div>

	<ul class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-6 lg:gap-6">
		{#each directory as d, i (d.id)}
			<li class={i < 2 ? 'lg:col-span-3' : 'lg:col-span-2'}>
				<a
					href={tab(d.id)}
					class="group relative flex h-full flex-col overflow-hidden border border-line bg-paper-bg p-6 transition-colors duration-500 hover:border-ink md:p-7 {i <
					2
						? 'lg:min-h-[230px]'
						: ''}"
				>
					<!-- the round number, set huge in the corner -->
					<span
						class="ao-cond pointer-events-none absolute -top-3 -right-1 text-[120px] leading-none font-black text-ink/[0.05] transition-colors duration-500 group-hover:text-warm/15"
						aria-hidden="true">{String(i + 1).padStart(2, '0')}</span
					>
					<span
						class="relative flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.22em] text-warm uppercase"
					>
						<span class="h-[2px] w-5 bg-warm" aria-hidden="true"></span>
						Round {String(i + 1).padStart(2, '0')}
					</span>
					<span
						class="ao-cond relative mt-3 block leading-[0.9] font-black uppercase {i < 2
							? 'text-[44px] md:text-[54px]'
							: 'text-[36px]'}"
					>
						{d.title}
					</span>
					<span
						class="relative mt-2 block font-newsreader text-[15.5px] leading-[1.45] text-soft italic"
					>
						{d.blurb}
					</span>
					<span
						class="relative mt-auto flex items-baseline justify-between gap-2.5 border-t border-line pt-4"
					>
						<span class="flex items-baseline gap-2.5">
							{#if d.figure != null}
								<span class="ao-cond text-[30px] leading-none font-black tabular-nums"
									>{d.figure}</span
								>
							{/if}
							<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>{d.unit}</span
							>
						</span>
						<span
							class="text-[15px] text-warm transition-transform duration-500 group-hover:translate-x-1"
							aria-hidden="true">→</span
						>
					</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<!-- ============ coming up: a strip of tickets ============ -->
{#if later.length}
	<section class="mx-auto w-full max-w-[1200px] px-5 pt-14 md:px-8 md:pt-20" use:reveal>
		<div
			class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-ink pb-3"
		>
			<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
				Coming up
			</h2>
			<a
				href={tab('events')}
				class="pb-1 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors hover:text-warm"
				>All events →</a
			>
		</div>
		<ul class="mt-6 grid gap-4">
			{#each later as e (e.id)}
				<li>
					<a
						href={e.href}
						class="group grid grid-cols-[76px_1fr] border border-line bg-paper-bg transition-colors duration-500 hover:border-ink md:grid-cols-[100px_200px_1fr_auto]"
					>
						<!-- date stub -->
						<span
							class="relative row-span-2 flex flex-col items-center justify-center py-4 md:row-span-1"
							style="background: color-mix(in srgb, {ccVar(e.circuit)} 10%, var(--ed-paper));"
						>
							<span
								class="text-[10px] font-extrabold tracking-[0.18em]"
								style="color: {ccVar(e.circuit)};">{e.month}</span
							>
							<span
								class="ao-cond text-[46px] leading-[0.85] font-black tabular-nums md:text-[54px]"
								>{e.day}</span
							>
							<span class="ao-perf absolute inset-y-2 right-0 w-px text-line2" aria-hidden="true"
							></span>
						</span>
						<span class="relative hidden overflow-hidden bg-ink md:block">
							<img
								src={e.image}
								alt=""
								loading="lazy"
								class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
							/>
							<span
								class="absolute inset-0"
								style="background: linear-gradient(90deg, color-mix(in srgb, {ccVar(
									e.circuit
								)} 55%, transparent) 0%, transparent 85%);"
								aria-hidden="true"
							></span>
						</span>
						<span class="min-w-0 px-4 pt-4 pb-2 md:px-6 md:py-5">
							<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
								<span
									class="text-[9.5px] font-extrabold tracking-[0.2em] uppercase"
									style="color: {ccVar(e.circuit)};">{e.circuit}</span
								>
								<span
									class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>
									<span
										class="h-[6px] w-[6px] animate-pulse-dot rounded-full"
										style="background: {ccVar(e.circuit)};"
										aria-hidden="true"
									></span>
									{countdown(e.days)}
								</span>
							</span>
							<span
								class="ao-cond mt-1 block text-[26px] leading-[0.95] font-black uppercase md:text-[30px]"
							>
								{e.title}
							</span>
							<span class="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5"
								>{#if e.format}<FormatTag format={e.format} />{/if}<span
									class="min-w-0 truncate text-[11px] font-semibold text-fade"
									>{e.weekday} · {e.venue}{#if e.cap}
										· {e.registered}/{e.cap} seats{/if}</span
								></span
							>
						</span>
						<span
							class="flex items-center justify-between gap-4 px-4 pb-4 md:justify-end md:px-6 md:pb-0"
						>
							<span class="ao-cond text-[28px] leading-none font-black">{e.price}</span>
							<span
								class="inline-flex items-center bg-warm px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors group-hover:bg-ink"
								>Sign up</span
							>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- ============ circuits ============ -->
<section class="mx-auto w-full max-w-[1200px] px-5 pt-14 md:px-8 md:pt-20" use:reveal>
	<div
		class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-ink pb-3"
	>
		<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
			The circuits
		</h2>
	</div>
	<ul class="mt-6 grid gap-5 md:grid-cols-3 md:gap-6">
		{#each circuits as c (c.name)}
			<li>
				<button
					type="button"
					onclick={(e) => openModal(c.name, e)}
					aria-haspopup="dialog"
					class="group relative block aspect-[4/5] w-full overflow-hidden bg-ink text-left text-paper-bg md:aspect-[3/4]"
				>
					<img
						src={c.image}
						alt=""
						loading="lazy"
						class="absolute inset-0 h-full w-full object-cover grayscale transition-[filter,scale] duration-[1400ms] ease-out group-hover:scale-[1.04] group-hover:grayscale-0"
					/>
					<span
						class="absolute inset-0 mix-blend-multiply"
						style="background: {ccVar(c.name)}; opacity: 0.55;"
						aria-hidden="true"
					></span>
					<span
						class="absolute inset-0"
						style="background: linear-gradient(180deg, rgba(23,21,15,0) 30%, rgba(23,21,15,0.92) 100%);"
						aria-hidden="true"
					></span>
					<span
						class="ao-cond absolute top-3 left-4 text-[88px] leading-none font-black text-white/20 md:text-[110px]"
						aria-hidden="true">{c.abbreviation}</span
					>
					<span class="absolute inset-x-0 bottom-0 p-5 md:p-6">
						<span class="text-[9.5px] font-extrabold tracking-[0.22em] text-paper-bg/75 uppercase"
							>{c.region}</span
						>
						<span class="ao-cond mt-1 block text-[46px] leading-[0.85] font-black uppercase"
							>{c.name}</span
						>
						<span
							class="mt-4 flex items-center justify-between gap-3 border-t border-paper-bg/30 pt-3 text-[10.5px] font-semibold text-paper-bg/85"
						>
							<span
								>{#if c.next}Next: {c.next.long}{:else}Dates to come{/if}</span
							>
							<span class="text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
								>About the circuit →</span
							>
						</span>
					</span>
				</button>
			</li>
		{/each}
	</ul>
</section>

<!-- ============ the leaderboard + how a season works ============ -->
<section class="mt-14 bg-ink text-paper-bg md:mt-20" use:reveal>
	<div
		class="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-12 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16"
	>
		<div>
			<div
				class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-warm-light pb-3"
			>
				<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
					Leaderboard
				</h2>
				<a
					href={tab('standings')}
					class="pb-1 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors hover:text-warm-light"
					>Full standings →</a
				>
			</div>
			{#if leaders.length}
				<ol class="mt-2">
					{#each leaders as s, i (s.gemId || s.playerName || i)}
						<li class="border-b border-paper-bg/15">
							<a
								href={s.gemId ? `/player/${s.gemId}` : tab('standings')}
								class="group grid grid-cols-[52px_1fr_auto] items-center gap-4 py-4"
							>
								<span
									class="ao-cond text-[44px] leading-none font-black tabular-nums {i === 0
										? 'text-gold'
										: 'text-paper-bg/30'}">{i + 1}</span
								>
								<span class="min-w-0">
									<span class="block truncate font-newsreader text-[21px] font-semibold">
										<span class="fp-ul">{s.playerName || 'Unknown player'}</span>
									</span>
									<span class="mt-0.5 block text-[10.5px] font-semibold text-paper-bg/50">
										{s.eventsPlayed || 0}
										{s.eventsPlayed === 1 ? 'event' : 'events'}{#if s.circuitsPlayed?.length}
											· {s.circuitsPlayed.join(', ')}{/if}
									</span>
								</span>
								<span class="text-right">
									<span class="ao-cond block text-[36px] leading-none font-black tabular-nums"
										>{s.totalPoints || 0}</span
									>
									<span
										class="text-[8.5px] font-extrabold tracking-[0.2em] text-paper-bg/45 uppercase"
										>points</span
									>
								</span>
							</a>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="mt-6 font-newsreader text-[16px] text-paper-bg/60 italic">
					The leaderboard opens after the season’s first event.
				</p>
			{/if}
		</div>

		<div>
			<div class="border-b-[3px] border-warm-light pb-3">
				<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
					How it works
				</h2>
			</div>
			<ol class="mt-2">
				{#each STEPS as [t, b], i (t)}
					<li class="grid grid-cols-[52px_1fr] gap-4 border-b border-paper-bg/15 py-4">
						<span class="ao-cond text-[44px] leading-none font-black text-warm-light tabular-nums"
							>{String(i + 1).padStart(2, '0')}</span
						>
						<span>
							<span class="block font-newsreader text-[20px] leading-tight font-semibold">{t}</span>
							<span
								class="mt-1 block font-newsreader text-[15px] leading-[1.45] text-paper-bg/60 italic"
								>{b}</span
							>
						</span>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>

<!-- ============ latest results ============ -->
{#if past.length}
	<section class="mx-auto w-full max-w-[1200px] px-5 pt-14 md:px-8 md:pt-20" use:reveal>
		<div
			class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-ink pb-3"
		>
			<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
				Results
			</h2>
			<a
				href={tab('results')}
				class="pb-1 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors hover:text-warm"
				>The archive →</a
			>
		</div>
		<ul class="mt-6 grid gap-5 md:grid-cols-3 md:gap-6">
			{#each past as r (r.id)}
				<li>
					<a
						href="/age-open/{r.id}/results"
						class="group flex h-full flex-col border border-line bg-paper-bg transition-colors duration-500 hover:border-ink"
					>
						<span class="h-[4px]" style="background: {ccVar(r.circuit)};" aria-hidden="true"></span>
						<span class="flex flex-1 flex-col p-5">
							<span class="flex items-center justify-between gap-3">
								<span
									class="text-[9.5px] font-extrabold tracking-[0.2em] uppercase"
									style="color: {ccVar(r.circuit)};">{r.circuit || 'AGE Open'}</span
								>
								{#if r.live}
									<span
										class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.14em] text-warm uppercase"
										><span
											class="h-[6px] w-[6px] animate-pulse-dot rounded-full bg-warm"
											aria-hidden="true"
										></span>Live</span
									>
								{:else}
									<span class="text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Final</span
									>
								{/if}
							</span>
							<span class="ao-cond mt-2 block text-[28px] leading-[0.95] font-black uppercase"
								>{r.title}</span
							>
							<span class="mt-1.5 block text-[11px] font-semibold text-fade"
								>{r.date} · {r.venue}</span
							>
							<span
								class="mt-auto pt-5 text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
								>Final standings →</span
							>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- ============ rules band ============ -->
<section class="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8 md:py-20" use:reveal>
	<div
		class="grid gap-8 border-t-[6px] border-warm bg-paper px-6 py-8 md:grid-cols-[1.1fr_1fr] md:items-center md:px-10 md:py-10"
	>
		<div>
			<p class="text-[10px] font-extrabold tracking-[0.22em] text-warm uppercase">
				◆ Before round one
			</p>
			<p class="ao-cond mt-3 text-[40px] leading-[0.9] font-black uppercase md:text-[52px]">
				Know the rules. Know the stakes.
			</p>
			<p class="mt-3 font-newsreader text-[16px] text-soft italic">
				The rulebook, the prize payout and the road to the Player’s Championship.
			</p>
		</div>
		<ul class="border-t border-line">
			{#each [['The rulebook', 'Formats, deck registration, conduct'], ['Prize structure', 'How the $1,000 pool is paid out'], ['The Player’s Championship', 'Who qualifies, and how'], ['FAQ', 'Everything else']] as [t, b] (t)}
				<li class="border-b border-line">
					<a href={tab('rules')} class="group flex items-baseline justify-between gap-4 py-3">
						<span>
							<span class="block font-newsreader text-[17px] font-semibold"
								><span class="fp-ul">{t}</span></span
							>
							<span class="block text-[11px] font-semibold text-fade">{b}</span>
						</span>
						<span
							class="text-[13px] text-warm transition-transform group-hover:translate-x-0.5"
							aria-hidden="true">→</span
						>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

{#if active}
	<CircuitModal
		circuit={active}
		dates={active.dates}
		top={active.top}
		count={active.count}
		onclose={closeModal}
	/>
{/if}
