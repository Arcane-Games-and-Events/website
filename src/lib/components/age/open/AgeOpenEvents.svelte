<script>
	/**
	 * AGE Open — Events, in the series' "tournament day" register.
	 *
	 *   sub-header      logo, "Events", section links
	 *   filter bar      circuit (All / LA / STL / NE) and List | Calendar
	 *   list            upcoming events grouped by month, as ticket strips
	 *   calendar        month grid with events and LSS seasons
	 *   season tracker  eight guaranteed opens per circuit, slot by slot
	 *   LSS seasons     official Legend Story Studios events alongside
	 *   at every open   what every event offers
	 *
	 * The circuit filter starts from `?region=` so the circuit cards and
	 * pop-outs elsewhere open this page pre-filtered.
	 */
	import FormatTag from '../FormatTag.svelte';
	import { page } from '$app/stores';
	import { reveal } from '$lib/actions/reveal.js';
	import { CIRCUITS, circuitVar } from '$lib/data/circuits.js';
	import AgeOpenSubHead from './AgeOpenSubHead.svelte';
	import EventRowLead from './EventRowLead.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	const CIRCUIT_NAMES = ['Los Angeles', 'St. Louis', 'New England'];

	const fmt = (d, opts) => new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
	const endOfDay = (d) => {
		const x = new Date(d);
		x.setUTCHours(23, 59, 59, 999);
		return x;
	};
	const daysUntil = (d) => Math.max(0, Math.floor((endOfDay(d).getTime() - Date.now()) / 86400000));
	const countdown = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`);
	const price = (p) => (p != null && Number(p) > 0 ? `$${Math.round(Number(p))}` : 'Free');
	const shortFormat = (f) => (f === 'Classic Constructed' ? 'CC' : f || '');

	// ============ filters ============
	let region = $state(
		CIRCUIT_NAMES.includes($page.url.searchParams.get('region') ?? '')
			? /** @type {string} */ ($page.url.searchParams.get('region'))
			: 'all'
	);
	let view = $state('list');

	// ============ upcoming events ============
	const upcoming = $derived(
		(data.events ?? [])
			.filter((e) => e.eventDate && endOfDay(e.eventDate) >= new Date())
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
				monthKey: fmt(e.eventDate, { month: 'long', year: 'numeric' }),
				weekday: fmt(e.eventDate, { weekday: 'long' }),
				days: daysUntil(e.eventDate),
				image: CIRCUITS[e.circuit]?.image || '/banner/age-open-banner.webp'
			}))
	);
	const shown = $derived(upcoming.filter((e) => region === 'all' || e.circuit === region));
	const byMonth = $derived.by(() => {
		/** @type {{ key: string, events: any[] }[]} */
		const groups = [];
		for (const e of shown) {
			const last = groups[groups.length - 1];
			if (last && last.key === e.monthKey) last.events.push(e);
			else groups.push({ key: e.monthKey, events: [e] });
		}
		return groups;
	});
	const counts = $derived(
		Object.fromEntries(
			CIRCUIT_NAMES.map((c) => [c, upcoming.filter((e) => e.circuit === c).length])
		)
	);

	// ============ calendar ============
	const now = new Date();
	let calMonth = $state(now.getMonth());
	let calYear = $state(now.getFullYear());
	const calTitle = $derived(
		new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	);
	const localFromUTC = (d) => {
		const x = new Date(d);
		return new Date(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
	};
	const sameDay = (a, b) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();
	const calendarDays = $derived.by(() => {
		const first = new Date(calYear, calMonth, 1);
		const start = new Date(calYear, calMonth, 1 - first.getDay());
		const all = (data.allEvents?.length ? data.allEvents : (data.events ?? [])).filter(
			(e) => e.eventDate && (region === 'all' || e.circuit === region)
		);
		return Array.from({ length: 42 }, (_, i) => {
			const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
			return {
				date,
				inMonth: date.getMonth() === calMonth,
				today: sameDay(date, now),
				events: all.filter((e) => sameDay(localFromUTC(e.eventDate), date)),
				seasons: (data.lssEvents ?? []).filter((s) => {
					const a = localFromUTC(s.startDate);
					const b = localFromUTC(s.endDate);
					b.setHours(23, 59, 59, 999);
					const mid = new Date(date);
					mid.setHours(12);
					return mid >= a && mid <= b;
				})
			};
		});
	});
	const calWeeks = $derived.by(() => {
		const weeks = [];
		for (let i = 0; i < 42; i += 7) weeks.push(calendarDays.slice(i, i + 7));
		// drop a trailing week that sits entirely in the next month
		return weeks.filter((w, i) => i < 5 || w.some((d) => d.inMonth));
	});
	function shiftMonth(by) {
		const d = new Date(calYear, calMonth + by, 1);
		calMonth = d.getMonth();
		calYear = d.getFullYear();
	}
	function today() {
		calMonth = now.getMonth();
		calYear = now.getFullYear();
	}

	// ============ season tracker ============
	const SLOTS = 8;
	const tracker = $derived(
		CIRCUIT_NAMES.map((name) => {
			const evs = (data.allEvents ?? [])
				.filter((e) => e.circuit === name)
				.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
			const slots = Array.from({ length: SLOTS }, (_, i) => {
				const e = evs[i];
				if (!e) return null;
				// Past dates count as played even if the event's status was never closed.
				const done =
					e.status === 'completed' ||
					e.status === 'in_progress' ||
					endOfDay(e.eventDate) < new Date();
				return {
					id: e.id,
					done,
					date: fmt(e.eventDate, { month: 'short', day: 'numeric' }),
					href: done ? `/age-open/${e.id}/results` : `/age-open/${e.id}`
				};
			});
			const done = slots.filter((s) => s?.done).length;
			const ahead = slots.filter((s) => s && !s.done).length;
			return {
				name,
				code: CIRCUITS[name]?.abbreviation ?? name,
				slots,
				done,
				ahead,
				open: SLOTS - done - ahead
			};
		})
	);

	// ============ LSS seasons ============
	const lss = $derived(
		(data.lssEvents ?? [])
			.filter((s) => new Date(s.endDate) >= new Date())
			.map((s) => ({
				...s,
				live: new Date(s.startDate) <= new Date() && new Date(s.endDate) >= new Date(),
				range: `${fmt(s.startDate, { month: 'short', day: 'numeric' })} – ${fmt(s.endDate, { month: 'short', day: 'numeric' })}`
			}))
	);

	const PERKS = [
		['$1K', '$1,000 opens', 'A guaranteed prize pool for the Top 8 at every AGE Open.', 'text-ink'],
		['◆', 'AGE Points', 'Every finish earns points toward the Player’s Championship.', 'text-gold'],
		[
			'−10%',
			'Member pricing',
			'AGE Premium members save 10% on every entry, all season.',
			'text-prem'
		]
	];
</script>

<AgeOpenSubHead
	active="events"
	title="Events"
	strap="Every open on the calendar. Find yours, lock in your seat, and start your run."
/>

<!-- ============ filter bar ============ -->
<div class="z-[5] border-b border-line bg-paper-bg/95 backdrop-blur-sm md:sticky md:top-[59px]">
	<div
		class="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between md:px-8"
	>
		<!-- circuit filter: a 2×2 grid of large buttons on phones, a row from md -->
		<div class="grid grid-cols-2 gap-2 md:flex md:gap-2" role="group" aria-label="Circuit">
			{#each [['all', 'All circuits'], ...CIRCUIT_NAMES.map((c) => [c, c])] as [v, l] (v)}
				<button
					type="button"
					onclick={() => (region = v)}
					aria-pressed={region === v}
					class="relative flex min-h-[48px] items-center justify-between gap-2 overflow-hidden border py-2.5 pr-3 pl-4 text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors md:min-h-0 md:justify-start md:py-2 md:pr-3.5 md:pl-4 md:text-[10px] md:tracking-[0.16em] md:whitespace-nowrap {region ===
					v
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 bg-paper-bg text-soft hover:border-ink hover:text-ink'}"
				>
					<span
						class="absolute inset-y-0 left-0 w-[4px]"
						style="background: {v === 'all' ? 'var(--ed-warm)' : circuitVar(v)};"
						aria-hidden="true"
					></span>
					<span class="leading-tight">{l}</span>
					<span
						class="ao-cond shrink-0 text-[20px] leading-none font-black tabular-nums md:text-[16px] {region ===
						v
							? 'text-paper-bg/80'
							: 'text-fade'}">{v === 'all' ? upcoming.length : counts[v]}</span
					>
				</button>
			{/each}
		</div>
		<div class="grid grid-cols-2 border border-line2 md:flex" role="group" aria-label="View">
			{#each [['list', 'List'], ['calendar', 'Calendar']] as [v, l] (v)}
				<button
					type="button"
					onclick={() => (view = v)}
					aria-pressed={view === v}
					class="min-h-[44px] px-4 py-2 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors md:min-h-0 md:text-[10px] {view ===
					v
						? 'bg-warm text-white'
						: 'text-soft hover:text-ink'}">{l}</button
				>
			{/each}
		</div>
	</div>
</div>

<!-- ============ list / calendar ============ -->
<section class="mx-auto w-full max-w-[1200px] px-5 pt-10 md:px-8 md:pt-14">
	{#if view === 'list'}
		{#if byMonth.length}
			{#each byMonth as g (g.key)}
				<div class="mb-10 last:mb-0">
					<div class="flex items-end justify-between gap-4 border-b-[3px] border-ink pb-2">
						<h2 class="ao-cond text-[40px] leading-[0.85] font-black uppercase md:text-[52px]">
							{g.key.split(' ')[0]}
							<span class="text-fade/50">{g.key.split(' ')[1]}</span>
						</h2>
						<span class="pb-1 text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>{g.events.length} {g.events.length === 1 ? 'event' : 'events'}</span
						>
					</div>
					<ul class="mt-4 grid gap-4">
						{#each g.events as e (e.id)}
							<li>
								<a
									href={e.href}
									class="group grid grid-cols-[76px_1fr] border border-line bg-paper-bg transition-colors duration-500 hover:border-ink md:grid-cols-[100px_200px_1fr_auto]"
								>
									<EventRowLead event={e} weekday={e.weekday.slice(0, 3)} />
									<span class="min-w-0 px-4 pt-4 pb-2 md:px-6 md:py-5">
										<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
											<span
												class="text-[9.5px] font-extrabold tracking-[0.2em] uppercase"
												style="color: {circuitVar(e.circuit)};">{e.circuit}</span
											>
											<span
												class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
											>
												<span
													class="h-[6px] w-[6px] animate-pulse-dot rounded-full"
													style="background: {circuitVar(e.circuit)};"
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
												>{e.weekday} · {e.venue}</span
											></span
										>
										<span class="mt-3 flex h-[14px] items-center gap-3">
											{#if e.cap}
												<span class="block h-[3px] w-full max-w-[200px] bg-line">
													<span
														class="block h-full"
														style="width: {Math.min(
															100,
															(e.registered / e.cap) * 100
														)}%; background: {circuitVar(e.circuit)};"
													></span>
												</span>
												<span
													class="shrink-0 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase tabular-nums"
													>{e.registered}/{e.cap} seats</span
												>
											{:else}
												<span
													class="text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
													>Open entry · no cap</span
												>
											{/if}
										</span>
									</span>
									<span
										class="flex items-center justify-between gap-4 px-4 pb-4 md:flex-col md:items-end md:justify-center md:px-6 md:pb-0"
									>
										<span class="md:text-right">
											<span class="ao-cond block text-[30px] leading-none font-black"
												>{e.price}</span
											>
											{#if e.discount}<span
													class="text-[8.5px] font-extrabold tracking-[0.14em] text-prem uppercase"
													>Members save 10%</span
												>{/if}
										</span>
										<span
											class="inline-flex items-center bg-warm px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] whitespace-nowrap text-white uppercase transition-colors group-hover:bg-ink"
											>Sign up →</span
										>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		{:else}
			<div class="border-y border-line py-14 text-center">
				<p class="ao-cond text-[40px] leading-none font-black uppercase">No events yet</p>
				<p class="mt-2 font-newsreader text-[16px] text-soft italic">
					{region === 'all'
						? 'New opens are announced through the season. Check back soon.'
						: `New ${region} dates are coming soon.`}
				</p>
				{#if region !== 'all'}
					<button
						type="button"
						onclick={() => (region = 'all')}
						class="mt-5 border-b-2 border-warm pb-1 text-[10.5px] font-extrabold tracking-[0.16em] text-warm uppercase"
						>See every circuit</button
					>
				{/if}
			</div>
		{/if}
	{:else}
		<!-- calendar -->
		<div class="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-2">
			<h2 class="ao-cond text-[40px] leading-[0.85] font-black uppercase md:text-[52px]">
				{calTitle}
			</h2>
			<div class="flex items-center gap-2 pb-1">
				<button
					type="button"
					onclick={() => shiftMonth(-1)}
					aria-label="Previous month"
					class="flex h-8 w-8 items-center justify-center border border-line2 transition-colors hover:border-ink"
					>←</button
				>
				<button
					type="button"
					onclick={today}
					class="h-8 border border-line2 px-3 text-[9.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink"
					>Today</button
				>
				<button
					type="button"
					onclick={() => shiftMonth(1)}
					aria-label="Next month"
					class="flex h-8 w-8 items-center justify-center border border-line2 transition-colors hover:border-ink"
					>→</button
				>
			</div>
		</div>
		<div class="mt-4 grid grid-cols-7 border-t border-l border-line">
			{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as d (d)}
				<div
					class="border-r border-b border-line bg-paper py-2 text-center text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase"
				>
					<span class="md:hidden">{d.charAt(0)}</span><span class="hidden md:inline">{d}</span>
				</div>
			{/each}
			{#each calWeeks as week, w (w)}
				{#each week as day, i (w * 7 + i)}
					<div
						class="min-h-[64px] border-r border-b border-line p-1.5 md:min-h-[110px] md:p-2 {day.inMonth
							? 'bg-paper-bg'
							: 'bg-paper/60'}"
					>
						<span
							class="ao-cond block text-[18px] leading-none font-black tabular-nums md:text-[22px] {day.today
								? 'text-warm'
								: day.inMonth
									? 'text-ink'
									: 'text-fade/50'}">{day.date.getDate()}</span
						>
						{#each day.events.slice(0, 3) as e (e.id)}
							<a
								href="/age-open/{e.id}"
								title="{e.title || 'AGE Open'} · {e.circuit || ''}"
								class="mt-1 block truncate border-l-[3px] px-1 py-[2px] text-[9.5px] font-bold transition-[filter] hover:brightness-95 md:px-1.5 md:text-[10px]"
								style="border-left-color: {circuitVar(
									e.circuit
								)}; background: color-mix(in srgb, {circuitVar(
									e.circuit
								)} 12%, var(--ed-bg)); color: {circuitVar(e.circuit)};"
							>
								<span class="hidden md:inline"
									>{CIRCUITS[e.circuit]?.abbreviation ?? ''} ·
								</span>{e.title || 'AGE Open'}
							</a>
						{/each}
						{#if day.events.length > 3}
							<span class="mt-0.5 block text-[9px] font-bold text-fade"
								>+{day.events.length - 3} more</span
							>
						{/if}
						{#each day.seasons.slice(0, 1) as s, si (si)}
							<span
								class="mt-1 hidden truncate border-l-[3px] border-gold/70 px-1.5 text-[9px] font-semibold text-fade md:block"
								>{s.name}</span
							>
						{/each}
					</div>
				{/each}
			{/each}
		</div>
		<p
			class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
		>
			{#each CIRCUIT_NAMES as c (c)}
				<span class="inline-flex items-center gap-1.5"
					><span class="h-2 w-2" style="background: {circuitVar(c)};" aria-hidden="true"
					></span>{c}</span
				>
			{/each}
			<span class="inline-flex items-center gap-1.5"
				><span class="h-2 w-[3px] bg-gold/70" aria-hidden="true"></span>LSS season</span
			>
		</p>
	{/if}
</section>

<!-- ============ season tracker ============ -->
<section class="mt-16 bg-ink text-paper-bg md:mt-20" use:reveal>
	<div class="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
		<div
			class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-[3px] border-warm-light pb-3"
		>
			<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
				Season tracker
			</h2>
			<p
				class="max-w-[360px] pb-1 font-newsreader text-[15px] text-paper-bg/65 italic md:text-right"
			>
				Eight guaranteed opens per circuit, filled as the {data.currentYear || '2026'} season unfolds.
			</p>
		</div>
		<div class="mt-8 grid gap-10">
			{#each tracker as t (t.name)}
				<div>
					<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
						<span
							class="ao-cond flex h-12 w-14 items-center justify-center text-[28px] leading-none font-black text-white"
							style="background: {circuitVar(t.name)};">{t.code}</span
						>
						<span class="ao-cond text-[34px] leading-none font-black uppercase">{t.name}</span>
						<span
							class="ml-auto flex items-center gap-4 text-[9.5px] font-extrabold tracking-[0.16em] uppercase"
						>
							<span class="text-paper-bg"
								><span class="ao-cond mr-1 text-[22px] tabular-nums">{t.done}</span>Played</span
							>
							<span class="text-warm-light"
								><span class="ao-cond mr-1 text-[22px] tabular-nums">{t.ahead}</span>Upcoming</span
							>
							<span class="text-paper-bg/45"
								><span class="ao-cond mr-1 text-[22px] tabular-nums">{t.open}</span>To announce</span
							>
						</span>
					</div>
					<ol class="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
						{#each t.slots as s, i (i)}
							<li>
								{#if s}
									<a
										href={s.href}
										class="group relative flex h-full flex-col items-center px-1 pt-3 pb-2.5 text-center transition-transform duration-500 hover:-translate-y-0.5 {s.done
											? 'bg-paper-bg/10 text-paper-bg'
											: 'bg-paper-bg text-ink'}"
									>
										<span
											class="absolute inset-x-0 top-0 h-[4px]"
											style="background: {s.done ? 'var(--ed-line2)' : circuitVar(t.name)};"
											aria-hidden="true"
										></span>
										<span class="ao-cond text-[30px] leading-none font-black tabular-nums"
											>{String(i + 1).padStart(2, '0')}</span
										>
										<span class="mt-1.5 text-[10px] font-bold tabular-nums">{s.date}</span>
										<span
											class="mt-1.5 text-[8.5px] font-extrabold tracking-[0.16em] uppercase {s.done
												? 'text-paper-bg/55'
												: 'text-warm'}">{s.done ? 'Results →' : 'Sign up →'}</span
										>
									</a>
								{:else}
									<div
										class="flex h-full flex-col items-center border border-dashed border-paper-bg/25 px-1 pt-3 pb-2.5 text-center text-paper-bg/40"
										aria-label="Open {i + 1}, date to be announced"
									>
										<span class="ao-cond text-[30px] leading-none font-black tabular-nums"
											>{String(i + 1).padStart(2, '0')}</span
										>
										<span class="mt-1.5 text-[10px] font-bold">TBA</span>
										<span class="mt-1.5 text-[8.5px] font-extrabold tracking-[0.16em] uppercase"
											>Soon</span
										>
									</div>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ============ LSS seasons ============ -->
{#if lss.length}
	<section class="mx-auto w-full max-w-[1200px] px-5 pt-14 md:px-8 md:pt-20" use:reveal>
		<div
			class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-ink pb-3"
		>
			<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
				Also on the calendar
			</h2>
			<p class="pb-1 font-newsreader text-[15px] text-soft italic">
				Official Legend Story Studios seasons running alongside the circuit.
			</p>
		</div>
		<ul class="mt-2">
			{#each lss as s, i (s.id || i)}
				<li
					class="grid gap-3 border-b border-line py-4 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-6"
				>
					<span class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
						<span class="font-newsreader text-[19px] font-semibold">{s.name}</span>
						{#if s.eventType}<span
								class="border border-gold/60 px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.16em] text-gold uppercase"
								>{s.eventType}</span
							>{/if}
						{#if s.format}<span
								class="border border-line2 px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.16em] text-soft uppercase"
								>{s.format}</span
							>{/if}
						{#if s.live}<span
								class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.14em] text-prem uppercase"
								><span
									class="h-[6px] w-[6px] animate-pulse-dot rounded-full bg-prem"
									aria-hidden="true"
								></span>Live now</span
							>{/if}
					</span>
					<span class="text-[11px] font-semibold text-fade tabular-nums">{s.range}</span>
					{#if s.link}
						<a
							href={s.link}
							target="_blank"
							rel="noopener noreferrer"
							class="text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase hover:text-ink"
							>Details →</a
						>
					{:else}
						<span></span>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- ============ at every open ============ -->
<section class="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8 md:py-20" use:reveal>
	<div class="border-b-[3px] border-ink pb-3">
		<h2 class="ao-cond text-[44px] leading-[0.85] font-black uppercase md:text-[64px]">
			At every open
		</h2>
	</div>
	<ul class="mt-6 grid gap-5 md:grid-cols-3 md:gap-6">
		{#each PERKS as [mark, t, b, tone] (t)}
			<li class="border border-line bg-paper-bg p-6 md:p-7">
				<span class="ao-cond block text-[56px] leading-none font-black {tone}">{mark}</span>
				<span class="mt-4 block font-newsreader text-[21px] font-semibold">{t}</span>
				<span class="mt-1.5 block font-newsreader text-[15.5px] leading-[1.45] text-soft italic"
					>{b}</span
				>
			</li>
		{/each}
	</ul>
</section>
