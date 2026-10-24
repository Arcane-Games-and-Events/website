<script>
	import FrontDept from './FrontDept.svelte';

	/**
	 * AGE Open department — a recruitment poster for the circuit: a photo
	 * band with the pitch and series stats, then the next events with a
	 * sign-up link, the three circuits, and the season leaders.
	 */
	/** @type {{ data: { series: any, events: any[], circuits: any[], leaders: any[] } }} */
	let { data } = $props();
	const series = $derived(data?.series ?? {});
	const events = $derived(data?.events ?? []);
	const circuits = $derived(data?.circuits ?? []);
	const leaders = $derived(data?.leaders ?? []);
	const CIRCUIT_VAR = { la: 'var(--ed-cc-la)', stl: 'var(--ed-cc-stl)', ne: 'var(--ed-cc-ne)' };
	const stats = $derived(
		[
			{ n: series.events, l: 'Events a season' },
			{ n: series.prizePool, l: 'In prize pools' },
			{ n: series.regions, l: 'Regions' },
			series.players ? { n: series.players.toLocaleString('en-US'), l: 'Players ranked' } : null
		].filter(Boolean)
	);
</script>

<section class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
	<FrontDept
		id="age-open"
		title="AGE Open"
		strap="Three regions. Thousand-dollar prize pools. A seat at the Player's Championship."
		href="/age-open"
		label="The series"
	/>

	<!-- poster -->
	<a
		href="/age-open?tab=events"
		class="group fp-plate relative mt-8 block overflow-hidden bg-ink text-white md:mt-10"
	>
		<img
			src="/banner/age-open-banner.webp"
			alt="Rows of players at an AGE Open"
			class="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]"
			loading="lazy"
		/>
		<div
			class="absolute inset-0"
			style="background: linear-gradient(90deg, rgba(23,21,15,0.94) 0%, rgba(23,21,15,0.82) 45%, rgba(23,21,15,0.35) 100%);"
			aria-hidden="true"
		></div>
		<div class="relative grid gap-8 p-6 md:grid-cols-[1.1fr_1fr] md:items-end md:p-12">
			<div>
				<span
					class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.24em] text-warm uppercase"
				>
					<span aria-hidden="true">◆</span>
					2026 season · Registration open
				</span>
				<h3
					class="mt-4 font-newsreader text-[40px] leading-[0.98] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[clamp(44px,4.6vw,66px)]"
				>
					Play the circuit.
				</h3>
				<p
					class="mt-4 max-w-[520px] font-newsreader text-[17px] leading-[1.5] text-white/80 italic md:text-[19px]"
				>
					Independent, player-run Flesh and Blood tournaments with real prize pools, AGE Points
					every round, and a Player's Championship for the top sixteen in each region.
				</p>
				<div class="mt-7 flex flex-wrap gap-3">
					<span
						class="inline-flex items-center bg-white px-6 py-3.5 text-[11px] font-extrabold tracking-[0.14em] text-ink uppercase transition-[letter-spacing] group-hover:tracking-[0.2em]"
					>
						Find an event
					</span>
					<span
						class="inline-flex items-center border border-white/60 px-6 py-3.5 text-[11px] font-extrabold tracking-[0.14em] uppercase"
					>
						How it works
					</span>
				</div>
			</div>
			<dl class="grid grid-cols-2 gap-px bg-white/15 md:ml-auto md:w-full md:max-w-[380px]">
				{#each stats as s (s.l)}
					<div class="bg-ink/70 p-4 backdrop-blur-sm md:p-5">
						<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-gold uppercase">{s.l}</dt>
						<dd class="mt-1 font-newsreader text-[34px] leading-none font-semibold md:text-[40px]">
							{s.n}
						</dd>
					</div>
				{/each}
			</dl>
		</div>
	</a>

	<!-- next up — one standout card per event -->
	<div class="mt-10 md:mt-12">
		<div class="flex items-baseline justify-between border-t-[3px] border-double border-ink pt-3">
			<h4
				class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
			>
				<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
				Next up
			</h4>
			<a
				href="/age-open?tab=events"
				class="text-[10px] font-extrabold tracking-[0.14em] uppercase hover:text-warm"
				>All dates →</a
			>
		</div>
		{#if events.length}
			<div
				class="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] md:gap-6"
			>
				{#each events as e (e.href)}
					{@const accent = CIRCUIT_VAR[e.circuit]}
					<a
						href={e.href}
						class="group fp-plate relative flex min-h-[420px] flex-col overflow-hidden bg-ink text-white md:min-h-[460px]"
					>
						<img
							src={e.image}
							alt=""
							class="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.05]"
							loading="lazy"
						/>
						<div
							class="absolute inset-0"
							style="background: linear-gradient(180deg, color-mix(in srgb, {accent} 55%, rgba(23,21,15,0.55)) 0%, rgba(23,21,15,0.35) 38%, rgba(23,21,15,0.9) 72%, rgba(23,21,15,0.98) 100%);"
							aria-hidden="true"
						></div>
						<div class="relative flex items-start justify-between p-5 md:p-6">
							<span
								class="flex w-[72px] flex-col items-center bg-paper-bg py-2 text-center text-ink"
							>
								<span
									class="text-[9px] font-extrabold tracking-[0.18em] uppercase"
									style="color: {accent};">{e.month}</span
								>
								<span class="font-newsreader text-[40px] leading-[0.9] font-semibold tabular-nums"
									>{e.day}</span
								>
								<span class="mt-1 text-[8.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
									>{e.weekday.slice(0, 3)}</span
								>
							</span>
							<span class="flex flex-col items-end gap-2">
								<span
									class="inline-flex items-center gap-2 border border-white/40 bg-white/10 px-2.5 py-1.5 text-[9.5px] font-extrabold tracking-[0.16em] uppercase backdrop-blur-sm"
								>
									<span
										class="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-prem"
										aria-hidden="true"
									></span>
									Registration open
								</span>
								{#if e.daysUntil != null}
									<span class="font-newsreader text-[14px] text-white/85 italic">
										{e.daysUntil === 0
											? 'Today'
											: e.daysUntil === 1
												? 'Tomorrow'
												: `In ${e.daysUntil} days`}
									</span>
								{/if}
							</span>
						</div>
						<div class="relative mt-auto p-5 md:p-6">
							<span
								class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] uppercase"
								style="color: color-mix(in srgb, {accent} 45%, white);"
							>
								<span aria-hidden="true">◆</span>
								{e.circuitName || 'AGE Open'}
							</span>
							<span
								class="mt-2 block font-newsreader text-[30px] leading-[1.02] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[36px]"
							>
								{e.title}
							</span>
							<span class="mt-2 block text-[12px] font-semibold text-white/70">
								{[e.venue, e.format, e.cap ? `${e.cap} seats` : ''].filter(Boolean).join(' · ')}
							</span>
							<span class="mt-5 flex items-end justify-between gap-4 border-t border-white/20 pt-4">
								<span>
									<span class="block font-newsreader text-[34px] leading-none font-semibold"
										>{e.price}</span
									>
									<span
										class="mt-1 block text-[9.5px] font-extrabold tracking-[0.14em] uppercase {e.premiumDiscount
											? 'text-[#7fd6a4]'
											: 'text-white/55'}"
									>
										{e.premiumDiscount ? 'Members save 10%' : 'Per player'}
									</span>
								</span>
								<span
									class="inline-flex items-center gap-2 bg-white px-5 py-3 text-[11px] font-extrabold tracking-[0.14em] text-ink uppercase transition-[gap,background-color] group-hover:gap-3 group-hover:bg-paper-bg"
								>
									Sign up <span aria-hidden="true">→</span>
								</span>
							</span>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<p class="py-6 font-newsreader text-[16px] text-soft italic">
				The next season's dates are being finalised. Watch this space.
			</p>
		{/if}
	</div>

	<div class="mt-10 grid grid-cols-1 gap-10 md:mt-12 lg:grid-cols-2 lg:gap-14">
		<!-- circuits -->
		<div>
			<div class="flex items-baseline justify-between border-t-[3px] border-double border-ink pt-3">
				<h4
					class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
				>
					<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
					The circuits
				</h4>
			</div>
			<ul class="divide-y divide-line">
				{#each circuits as c (c.name)}
					<li>
						<a href={c.href} class="group grid grid-cols-[96px_1fr] items-center gap-4 py-4">
							<span class="fp-plate relative block aspect-video overflow-hidden bg-panel">
								<img
									src={c.image}
									alt=""
									class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
									loading="lazy"
								/>
							</span>
							<span class="min-w-0">
								<span
									class="block text-[9.5px] font-extrabold tracking-[0.16em] uppercase"
									style="color: {CIRCUIT_VAR[c.slug]};">{c.region}</span
								>
								<span class="mt-1 block font-newsreader text-[20px] leading-[1.1] font-semibold">
									<span class="fp-ul">{c.name}</span>
								</span>
								<span class="mt-1 block text-[11px] font-semibold text-fade">
									{c.next
										? `Next: ${c.next.month} ${c.next.day} · ${c.next.venue}`
										: 'Season dates coming soon'}
								</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
		<!-- leaders -->
		<div>
			{#if leaders.length}
				<div
					class="flex items-baseline justify-between border-t-[3px] border-double border-ink pt-3"
				>
					<h4
						class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
					>
						<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
						Season leaders
					</h4>
					<a
						href="/age-open?tab=standings"
						class="text-[10px] font-extrabold tracking-[0.14em] uppercase hover:text-warm"
						>Standings →</a
					>
				</div>
				<ol class="divide-y divide-line">
					{#each leaders as l (l.rank)}
						<li>
							<a
								href={l.href}
								class="group grid grid-cols-[36px_1fr_auto] items-baseline gap-3 py-3"
							>
								<span
									class="font-newsreader text-[26px] leading-none font-medium tabular-nums {l.rank ===
									1
										? 'text-gold'
										: 'text-warm'}">{l.rank}</span
								>
								<span class="truncate font-newsreader text-[17px] font-semibold"
									><span class="fp-ul">{l.name}</span></span
								>
								<span class="text-[11px] font-extrabold tracking-[0.08em] text-fade tabular-nums"
									>{l.points} PTS</span
								>
							</a>
						</li>
					{/each}
					<li class="py-3">
						<a
							href="/age-open?tab=events"
							class="group grid grid-cols-[36px_1fr] items-baseline gap-3"
						>
							<span
								class="font-newsreader text-[26px] leading-none font-medium text-line2"
								aria-hidden="true">?</span
							>
							<span
								class="font-newsreader text-[17px] font-semibold text-soft italic group-hover:text-warm"
								>Your name here →</span
							>
						</a>
					</li>
				</ol>
			{/if}
		</div>
	</div>
</section>
