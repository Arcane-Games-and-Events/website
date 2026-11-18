<!--
  SeasonTrack — the store's season on one ink band: the count (played of
  eight), the eight Opens as ticket stubs (played, scheduled with sign-ups
  filling, or an open slot to fill), and the twelve months of the year with
  each month's Open, so a gap shows at a glance. The next month without an
  Open gets a nudge.

  Props: season (seasonDashboard()), base (/store/<slug>), color (circuit),
  canAdd (the store is active)
-->
<script>
	/** @type {{ season: any, base: string, color: string, canAdd: boolean }} */
	let { season, base, color, canAdd } = $props();

	const day = (d) =>
		new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
	const monthName = (m) =>
		new Date(Date.UTC(2000, m, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
	// A new event in that month, on its second Saturday, 11 AM (editable).
	const addIn = (m) => {
		const d = new Date(Date.UTC(season.year, m, 1));
		const firstSat = (6 - d.getUTCDay() + 7) % 7;
		const date = new Date(Date.UTC(season.year, m, 1 + firstSat + 7));
		return `${base}/events/new?date=${date.toISOString().slice(0, 10)}`;
	};
	const nth = (n) => {
		const t = n % 100;
		if (t >= 11 && t <= 13) return `${n}th`;
		return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
	};
	const pct = $derived(Math.round((season.done / season.target) * 100));
</script>

<section class="bg-ink font-libre text-paper-bg" style="--cc: {color};">
	<div class="mx-auto max-w-page px-5 pt-9 pb-10 md:px-8 md:pt-12 md:pb-14">
		<div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
			<div>
				<p class="text-xs font-extrabold tracking-widest text-paper-bg/60 uppercase">
					<span style="color: var(--cc)">◆</span> Your {season.year} season
				</p>
				<p class="ao-cond mt-2 flex items-baseline gap-3 leading-none font-black uppercase">
					<span class="text-8xl tabular-nums md:text-9xl">{season.done}</span>
					<span class="text-3xl text-paper-bg/45 md:text-4xl">of {season.target} played</span>
				</p>
			</div>
			<dl class="grid grid-cols-3 gap-px bg-paper-bg/15 text-center">
				{#each [[season.done, 'Played', ''], [season.scheduled, 'On the books', ''], [season.toSchedule, 'To schedule', season.toSchedule ? 'text-gold' : '']] as [n, label, tone] (label)}
					<div class="bg-ink px-4 py-2.5 md:px-6">
						<dd class="ao-cond text-4xl leading-none font-black tabular-nums {tone}">{n}</dd>
						<dt class="mt-1 text-xs font-extrabold tracking-widest text-paper-bg/55 uppercase">
							{label}
						</dt>
					</div>
				{/each}
			</dl>
		</div>

		<!-- progress: played fills in the circuit colour -->
		<div
			class="mt-6 h-1.5 bg-paper-bg/10"
			role="progressbar"
			aria-valuenow={pct}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-label="Season progress"
		>
			<div
				class="h-full transition-[width] duration-700"
				style="width: {pct}%; background: var(--cc);"
			></div>
		</div>

		<!-- the eight Opens -->
		<ol class="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
			{#each season.slots as s, i (i)}
				<li class="min-w-0">
					{#if s}
						<a
							href="{base}/events/{s.id}"
							class="group relative flex h-full flex-col px-3 pt-4 pb-3 transition-transform duration-300 hover:-translate-y-1 {s.played
								? 'bg-paper-bg/5 text-paper-bg'
								: 'bg-paper-bg text-ink'}"
						>
							<span
								class="absolute inset-x-0 top-0 h-1"
								style="background: {s.played ? 'var(--cc)' : 'var(--cc)'}; opacity: {s.played
									? 1
									: 0.9}"
							></span>
							<span class="flex items-baseline justify-between">
								<span class="ao-cond text-4xl leading-none font-black tabular-nums"
									>{String(i + 1).padStart(2, '0')}</span
								>
								{#if s.played}<span class="text-sm" style="color: var(--cc)" aria-label="Played"
										>✓</span
									>{/if}
							</span>
							<span class="mt-2 text-xs font-bold">{day(s.eventDate)}</span>
							<span class="mt-0.5 text-xs {s.played ? 'text-paper-bg/55' : 'text-soft'}"
								>{s.players}{s.playerCap && !s.played ? ` / ${s.playerCap}` : ''} players</span
							>
							{#if !s.played && s.playerCap}
								<span class="mt-2 block h-1 bg-line2">
									<span
										class="block h-full"
										style="width: {Math.min(
											100,
											(s.players / s.playerCap) * 100
										)}%; background: var(--cc);"
									></span>
								</span>
							{/if}
							<span
								class="mt-auto pt-2.5 text-xs font-extrabold tracking-widest uppercase {s.played
									? 'text-paper-bg/50'
									: 'text-warm'}">{s.played ? 'Played' : 'Manage →'}</span
							>
						</a>
					{:else}
						<svelte:element
							this={canAdd ? 'a' : 'div'}
							href={canAdd ? `${base}/events/new` : undefined}
							class="flex h-full min-h-33 flex-col items-start border border-dashed border-paper-bg/25 px-3 pt-4 pb-3 text-paper-bg/40 transition-colors {canAdd
								? 'hover:border-paper-bg/70 hover:text-paper-bg'
								: ''}"
						>
							<span class="ao-cond text-4xl leading-none font-black tabular-nums"
								>{String(i + 1).padStart(2, '0')}</span
							>
							<span class="mt-auto text-xs font-extrabold tracking-widest uppercase"
								>{canAdd ? '+ Schedule' : 'Open slot'}</span
							>
						</svelte:element>
					{/if}
				</li>
			{/each}
		</ol>

		<!-- the year, month by month -->
		<div class="mt-9">
			<p class="text-xs font-extrabold tracking-widest text-paper-bg/55 uppercase">
				One Open a month
			</p>
			<ol class="mt-3 grid grid-cols-6 gap-px bg-paper-bg/10 md:grid-cols-12">
				{#each season.months as m (m.month)}
					{@const has = m.events.length > 0}
					<li class="relative bg-ink">
						<svelte:element
							this={!has && !m.past && canAdd ? 'a' : 'div'}
							href={!has && !m.past && canAdd ? addIn(m.month) : undefined}
							title={has
								? `${monthName(m.month)}: ${m.events.map((e) => `the ${nth(e.day)}`).join(', ')}`
								: m.past
									? `${monthName(m.month)}: no Open`
									: `Schedule ${monthName(m.month)}`}
							class="flex h-16 flex-col justify-between px-2 py-2 text-xs font-extrabold tracking-widest uppercase transition-colors {m.current
								? 'ring-1 ring-paper-bg/70 ring-inset'
								: ''} {!has && !m.past && canAdd ? 'group hover:bg-paper-bg/5' : ''}"
						>
							<span class={m.past && !has ? 'text-paper-bg/30' : 'text-paper-bg/75'}>{m.label}</span
							>
							{#if has}
								<span class="flex flex-wrap gap-1">
									{#each m.events as e (e.id)}
										<span
											class="ao-cond flex h-5.5 min-w-5.5 items-center justify-center px-1 text-sm leading-none tabular-nums {e.played
												? 'text-white'
												: 'text-ink'}"
											style={e.played
												? 'background: var(--cc)'
												: 'background: var(--color-paper-bg)'}>{e.day}</span
										>
									{/each}
								</span>
							{:else if m.past}
								<span class="text-paper-bg/25">—</span>
							{:else if canAdd}
								<span class="text-paper-bg/30 transition-colors group-hover:text-paper-bg">+</span>
							{/if}
						</svelte:element>
					</li>
				{/each}
			</ol>
		</div>

		{#if season.gap && canAdd && season.toSchedule > 0}
			<div
				class="mt-6 flex flex-wrap items-center justify-between gap-4 border-l-3 bg-paper-bg/5 px-4 py-3.5"
				style="border-color: var(--cc)"
			>
				<p class="text-sm text-paper-bg/85">
					<b class="text-paper-bg">{monthName(season.gap.month)} has no Open yet.</b>
					{season.toSchedule} more to schedule this season.
				</p>
				<a
					href={addIn(season.gap.month)}
					class="inline-flex h-10 items-center gap-2 bg-paper-bg px-4 text-xs font-extrabold tracking-widest text-ink uppercase transition-colors hover:bg-gold"
					>Schedule {monthName(season.gap.month)} <span aria-hidden="true">→</span></a
				>
			</div>
		{/if}
	</div>
</section>
