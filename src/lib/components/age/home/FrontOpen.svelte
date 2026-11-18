<script>
	/**
	 * AGE Open department — in the series' own "tournament day" register
	 * (as on /ageopen): the Open Series logo on an ink poster band with a
	 * scoreboard of season figures and the next event as an admission
	 * ticket, then the next events as ticket strips, the three circuits as
	 * colour-washed cards, and the season leaders.
	 */
	import { page } from '$app/state';
	import { circuitsFrom } from '$lib/data/circuits.js';
	import FormatTag from '../FormatTag.svelte';
	import CircuitModal from '../open/CircuitModal.svelte';

	/** @type {{ data: { series: any, events: any[], allEvents?: any[], topByCircuit?: Record<string, any[]>, circuits: any[], leaders: any[] } }} */
	let { data } = $props();
	const series = $derived(data?.series ?? {});
	const events = $derived(data?.events ?? []);
	const circuits = $derived(data?.circuits ?? []);
	const leaders = $derived(data?.leaders ?? []);
	const next = $derived(events[0] ?? null);
	const later = $derived(events.slice(1, 3));
	// A circuit's colour as CSS (from front-adapters: circuitVar).
	const cc = (color) => color || 'var(--ed-cc-la)';
	const countdown = (n) =>
		n == null ? '' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`;
	// Circuit pop-out (shared with /ageopen)
	/** @type {string | null} */
	let openCircuit = $state(null);
	/** @type {HTMLElement | undefined} */
	let lastTrigger;
	const active = $derived.by(() => {
		const c = circuits.find((x) => x.name === openCircuit);
		if (!c) return null;
		const all = (data?.allEvents ?? []).filter((e) => e.circuitName === c.name);
		return {
			...c,
			count: all.length,
			dates: all.slice(0, 4).map((e) => ({
				href: e.href,
				month: (e.month || '').toUpperCase(),
				day: e.day,
				weekday: e.weekday,
				venue: e.venue,
				format: e.format,
				price: e.price,
				when: countdown(e.daysUntil)
			})),
			top: data?.topByCircuit?.[c.name] ?? []
		};
	});
	function openModal(name, e) {
		lastTrigger = e?.currentTarget;
		openCircuit = name;
	}
	function closeModal() {
		openCircuit = null;
		lastTrigger?.focus();
	}

	const stats = $derived(
		[
			{ n: series.events, l: 'Events a season' },
			{ n: '$1,000', l: 'Prize pool, every event' },
			{ n: series.regions, l: 'Regions' },
			series.players ? { n: series.players.toLocaleString('en-US'), l: 'Players ranked' } : null
		].filter(Boolean)
	);

	// The circuits, from the database (the root layout), or the original three.
	const circuitLine = $derived(
		circuitsFrom(page.data?.circuits)
			.map((c) => c.name)
			.join(' · ')
	);
</script>

<section id="age-open" class="scroll-mt-6">
	<!-- ============ poster band ============ -->
	<div class="relative overflow-hidden bg-ink text-paper-bg">
		<img
			src="/banner/age-open-banner.webp"
			alt=""
			aria-hidden="true"
			loading="lazy"
			class="absolute inset-0 h-full w-full object-cover opacity-30 grayscale"
		/>
		<div
			class="absolute inset-0"
			style="background: linear-gradient(100deg, rgba(23,21,15,0.97) 0%, rgba(23,21,15,0.9) 48%, rgba(23,21,15,0.6) 100%);"
			aria-hidden="true"
		></div>
		<div
			class="relative mx-auto grid w-full max-w-page grid-cols-1 gap-10 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:gap-14"
		>
			<div class="min-w-0">
				<p
					class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-extrabold tracking-widest uppercase"
				>
					<span class="bg-warm px-2 py-1 text-white">Season ’26</span>
					<span class="text-paper-bg/70">{circuitLine}</span>
				</p>
				<a href="/ageopen" class="mt-6 block w-fit" aria-label="AGE Open Series">
					<img
						src="/age_open_logo.svg"
						alt="AGE Open Series"
						width="629"
						height="294"
						loading="lazy"
						class="h-auto w-65 md:w-95"
					/>
				</a>
				<p
					class="mt-5 max-w-lg font-newsreader text-lg leading-normal text-paper-bg/75 italic md:text-xl"
				>
					The premier independent Flesh and Blood circuit. Step up against the best players in your
					region, climb the leaderboard, and claim your seat at the AGE Player’s Championship. The
					next AGE champion could be you.
				</p>
				<dl class="mt-8 grid grid-cols-2 border-y border-paper-bg/20 sm:grid-cols-4">
					{#each stats as s, i (s.l)}
						<div
							class="py-4 pr-3 {i % 2 ? 'border-l border-paper-bg/15 pl-4' : ''} {i > 1
								? 'border-t border-paper-bg/15 sm:border-t-0'
								: ''} {i === 2 ? 'sm:border-l sm:border-paper-bg/15 sm:pl-4' : ''}"
						>
							<dt class="sr-only">{s.l}</dt>
							<dd class="ao-cond text-4xl leading-none font-black tabular-nums md:text-5xl">
								{s.n}
							</dd>
							<dd class="mt-2 text-xs font-extrabold tracking-widest text-paper-bg/55 uppercase">
								{s.l}
							</dd>
						</div>
					{/each}
				</dl>
				<div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
					<a
						href="/ageopen?tab=events"
						class="inline-flex items-center bg-warm px-5 py-3 text-xs font-extrabold tracking-widest text-white uppercase transition-colors hover:bg-white hover:text-ink"
						>Find an event</a
					>
					<a
						href="/ageopen"
						class="border-b-2 border-warm-light pb-1 text-xs font-extrabold tracking-wider uppercase transition-[letter-spacing] hover:tracking-widest"
						>The series →</a
					>
				</div>
			</div>

			<!-- next event: an admission ticket -->
			{#if next}
				<a
					href={next.href}
					class="group relative block rotate-2 transition-transform duration-700 ease-out hover:rotate-0"
					style="filter: drop-shadow(0 24px 30px rgba(0,0,0,0.55));"
				>
					<span class="grid grid-cols-[1fr_84px] bg-paper-bg text-ink">
						<span class="block min-w-0">
							<span class="relative block aspect-16/7 overflow-hidden bg-ink">
								<img
									src={next.image}
									alt=""
									loading="lazy"
									class="absolute inset-0 h-full w-full object-cover transition-transform duration-1400 ease-out group-hover:scale-105"
								/>
								<span
									class="absolute inset-0"
									style="background: linear-gradient(90deg, color-mix(in srgb, {cc(
										next.color
									)} 72%, rgba(23,21,15,0.55)) 0%, rgba(23,21,15,0) 80%);"
									aria-hidden="true"
								></span>
								<span
									class="absolute bottom-3 left-4 text-xs font-extrabold tracking-widest text-white uppercase"
									>◆ Next up · {next.circuitName}</span
								>
							</span>
							<span class="block px-5 pt-4 pb-5">
								<span class="ao-cond block text-3xl leading-none font-black uppercase"
									>{next.title}</span
								>
								<span class="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5"
									>{#if next.format}<FormatTag format={next.format} />{/if}<span
										class="text-xs font-semibold text-fade">{next.weekday} · {next.venue}</span
									></span
								>
								<span
									class="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4"
								>
									<span class="flex items-baseline gap-2">
										<span class="ao-cond text-3xl leading-none font-black">{next.price}</span>
										{#if next.premiumDiscount}<span
												class="text-xs font-extrabold tracking-widest text-prem uppercase"
												>Members save $5</span
											>{/if}
									</span>
									<span
										class="inline-flex items-center bg-warm px-4 py-2.5 text-xs font-extrabold tracking-widest text-white uppercase transition-colors group-hover:bg-ink"
										>Sign up →</span
									>
								</span>
							</span>
						</span>
						<span
							class="relative flex flex-col items-center justify-between bg-paper py-5 text-center"
						>
							<span class="ao-perf absolute inset-y-2 left-0 w-px text-line2" aria-hidden="true"
							></span>
							<span
								class="text-xs font-extrabold tracking-widest text-fade uppercase [writing-mode:vertical-rl]"
								>Admit one</span
							>
							<span>
								<span
									class="block text-xs font-extrabold tracking-widest uppercase"
									style="color: {cc(next.color)};">{next.month}</span
								>
								<span class="ao-cond block text-5xl leading-none font-black tabular-nums"
									>{next.day}</span
								>
							</span>
							<span class="text-xs font-extrabold tracking-widest text-warm uppercase"
								>{countdown(next.daysUntil)}</span
							>
						</span>
					</span>
				</a>
			{/if}
		</div>
	</div>

	<div class="mx-auto w-full max-w-page px-5 md:px-8">
		<!-- ============ the next events as tickets ============ -->
		{#if later.length}
			<ul class="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 md:gap-5">
				{#each later as e (e.href)}
					<li>
						<a
							href={e.href}
							class="group grid h-full grid-cols-[76px_1fr] border border-line bg-paper-bg transition-colors duration-500 hover:border-ink"
						>
							<span
								class="relative flex flex-col items-center justify-center py-4"
								style="background: color-mix(in srgb, {cc(e.color)} 10%, var(--ed-paper));"
							>
								<span
									class="text-xs font-extrabold tracking-widest uppercase"
									style="color: {cc(e.color)};">{e.month}</span
								>
								<span class="ao-cond text-5xl leading-none font-black tabular-nums">{e.day}</span>
								<span class="ao-perf absolute inset-y-2 right-0 w-px text-line2" aria-hidden="true"
								></span>
							</span>
							<span class="flex min-w-0 flex-col justify-center px-4 py-4 md:px-5">
								<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
									<span
										class="text-xs font-extrabold tracking-widest uppercase"
										style="color: {cc(e.color)};">{e.circuitName}</span
									>
									{#if e.daysUntil != null}
										<span
											class="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-fade uppercase"
										>
											<span
												class="h-1.5 w-1.5 animate-pulse-dot rounded-full"
												style="background: {cc(e.color)};"
												aria-hidden="true"
											></span>
											{countdown(e.daysUntil)}
										</span>
									{/if}
								</span>
								<span class="ao-cond mt-1 block text-2xl leading-none font-black uppercase"
									>{e.title}</span
								>
								<span class="mt-1.5 flex items-center justify-between gap-3">
									<span class="flex min-w-0 items-center gap-2"
										>{#if e.format}<FormatTag format={e.format} size="sm" short />{/if}<span
											class="truncate text-xs font-semibold text-fade">{e.weekday} · {e.venue}</span
										></span
									>
									<span class="shrink-0 text-xs font-extrabold tracking-widest text-warm uppercase"
										>{e.price} · Sign up →</span
									>
								</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- ============ circuits + leaders ============ -->
		<div class="mt-10 grid gap-8 md:mt-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10">
			<ul class="grid grid-cols-3 gap-3 md:gap-4">
				{#each circuits as c (c.name)}
					<li>
						<button
							type="button"
							onclick={(e) => openModal(c.name, e)}
							aria-haspopup="dialog"
							class="group relative block aspect-3/4 w-full overflow-hidden bg-ink text-left text-paper-bg"
						>
							<img
								src={c.image}
								alt=""
								loading="lazy"
								class="absolute inset-0 h-full w-full object-cover grayscale transition duration-1400 ease-out group-hover:scale-105 group-hover:grayscale-0"
							/>
							<span
								class="absolute inset-0 mix-blend-multiply"
								style="background: {cc(c.color)}; opacity: 0.55;"
								aria-hidden="true"
							></span>
							<span
								class="absolute inset-0"
								style="background: linear-gradient(180deg, rgba(23,21,15,0) 30%, rgba(23,21,15,0.92) 100%);"
								aria-hidden="true"
							></span>
							<span
								class="ao-cond absolute top-2 left-3 text-6xl leading-none font-black text-white/20 md:text-7xl"
								aria-hidden="true">{c.abbreviation}</span
							>
							<span class="absolute inset-x-0 bottom-0 p-3 md:p-4">
								<span
									class="hidden text-xs font-extrabold tracking-widest text-paper-bg/75 uppercase md:block"
									>{c.region}</span
								>
								<span class="ao-cond block text-2xl leading-none font-black uppercase md:text-3xl"
									>{c.name}</span
								>
								{#if c.next}
									<span class="mt-2 block text-xs font-semibold text-paper-bg/80"
										>Next: {c.next.month} {c.next.day}</span
									>
								{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>

			<div>
				<div class="flex items-end justify-between gap-4 border-b-3 border-ink pb-2">
					<p class="ao-cond text-4xl leading-none font-black uppercase">Leaders</p>
					<a
						href="/ageopen?tab=standings"
						class="pb-0.5 text-xs font-extrabold tracking-widest whitespace-nowrap uppercase transition-colors hover:text-warm"
						>Standings →</a
					>
				</div>
				<ol>
					{#each leaders as l, i (l.href + l.name)}
						<li class="border-b border-line">
							<a href={l.href} class="group grid grid-cols-[40px_1fr_auto] items-center gap-3 py-3">
								<span
									class="ao-cond text-4xl leading-none font-black tabular-nums {i === 0
										? 'text-gold'
										: 'text-fade/60'}">{i + 1}</span
								>
								<span class="truncate font-newsreader text-lg font-semibold"
									><span class="fp-ul">{l.name}</span></span
								>
								<span class="text-right">
									<span class="ao-cond block text-3xl leading-none font-black tabular-nums"
										>{l.points}</span
									>
									<span class="text-xs font-extrabold tracking-widest text-fade uppercase">pts</span
									>
								</span>
							</a>
						</li>
					{/each}
					<li>
						<a
							href="/ageopen?tab=events"
							class="flex items-center justify-between py-3 text-xs font-extrabold tracking-widest text-warm uppercase transition-colors hover:text-ink"
						>
							<span>Your name here</span><span aria-hidden="true">→</span>
						</a>
					</li>
				</ol>
			</div>
		</div>
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
