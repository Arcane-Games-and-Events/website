<script>
	/**
	 * Circuit pop-out — the story, figures, venues, top players and next
	 * dates for one AGE Open circuit. Shared by the AGE Open hub and the
	 * homepage. The caller decides when it is shown and passes `onclose`.
	 *
	 *   circuit  { name, region, abbreviation, image }
	 *   dates    [{ href, month, day, weekday, venue, format, price, when }]
	 *   top      [{ playerName, totalPoints }]
	 */
	import FormatTag from '../FormatTag.svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { circuitVar } from '$lib/data/circuits.js';

	/** @type {{ circuit: any, dates?: any[], top?: any[], count?: number, onclose: () => void }} */
	let { circuit, dates = [], top = [], count, onclose } = $props();

	const STORY = {
		'Los Angeles': {
			est: 'Flagship · Est. 2023',
			tagline: 'Where the AGE Open began, and where the bold decks come from.',
			body: 'The birthplace of the series. Los Angeles players build like nobody else: if a list has never been tried, someone here is already sleeving it up. It is also home to some of the most decorated players in Flesh and Blood, so the new ideas have to beat the very best.'
		},
		'St. Louis': {
			est: 'Newest · Est. 2026',
			tagline: 'The newest circuit, and the place to make your name.',
			body: 'St. Louis is where fresh faces are earning their reputations. The play is tight and the deck choices are solid, with some of the most consistent players on the circuit, but a specialist on the right hero can still walk away with the whole thing.'
		},
		'New England': {
			est: 'Rising scene · Est. 2025',
			tagline: 'Home of the specialists.',
			body: 'If you want to watch a master of one hero find lines no one else sees, this is where you go. New England is a tight-knit community that welcomes newcomers by throwing them in the deep end, which is exactly why players come here to get better.'
		}
	};

	// The Player's Champion of each circuit, by season (oldest first).
	const CHAMPIONS = {
		'Los Angeles': [
			[2023, 'Anthony Pham'],
			[2024, 'Zachary Wallach'],
			[2025, 'Peter Buddensiek'],
			[2026, 'Anthony Pham']
		],
		'New England': [[2025, 'Noah Beygelman']],
		'St. Louis': [[2026, 'Jason Feng']]
	};
	const champions = $derived(
		(CHAMPIONS[circuit.name] ?? []).map(([year, name], i, all) => ({
			year,
			name,
			reigning: i === all.length - 1,
			titles: all.filter(([, n]) => n === name).length,
			nth: all.slice(0, i + 1).filter(([, n]) => n === name).length
		}))
	);
	const ordinal = (n) => ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth'][n] ?? `${n}th`;

	const story = $derived(STORY[circuit.name] ?? { est: '', tagline: '', body: '' });
	const venues = $derived([...new Set(dates.map((d) => d.venue))].filter(Boolean));

	/** @type {HTMLElement | undefined} */
	let closeBtn = $state();
	$effect(() => {
		closeBtn?.focus();
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});
</script>

<div
	class="fixed inset-0 z-[200] flex items-end justify-center bg-ink/70 backdrop-blur-[2px] md:items-center md:px-6"
	transition:fade={{ duration: 220 }}
	onclick={onclose}
	role="presentation"
>
	<div
		class="relative max-h-[92vh] w-full max-w-[880px] overflow-y-auto bg-paper-bg text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
		role="dialog"
		aria-modal="true"
		aria-labelledby="circuit-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
		in:fly={{ y: 24, duration: 380, easing: cubicOut }}
		out:fly={{ y: 12, duration: 180 }}
	>
		<!-- photo header in the circuit colour -->
		<div class="relative aspect-[16/7] overflow-hidden bg-ink text-paper-bg md:aspect-[16/6]">
			<img
				src={circuit.image}
				alt=""
				class="fp-kenburns absolute inset-0 h-full w-full object-cover"
			/>
			<span
				class="absolute inset-0 mix-blend-multiply"
				style="background: {circuitVar(circuit.name)}; opacity: 0.5;"
				aria-hidden="true"
			></span>
			<span
				class="absolute inset-0"
				style="background: linear-gradient(180deg, rgba(23,21,15,0.15) 0%, rgba(23,21,15,0.92) 100%);"
				aria-hidden="true"
			></span>
			<span
				class="absolute inset-x-0 top-0 h-[5px]"
				style="background: {circuitVar(circuit.name)};"
				aria-hidden="true"
			></span>
			<span
				class="ao-cond pointer-events-none absolute -top-2 right-4 text-[120px] leading-none font-black text-white/15 md:text-[170px]"
				aria-hidden="true">{circuit.abbreviation}</span
			>
			<button
				bind:this={closeBtn}
				type="button"
				onclick={onclose}
				class="absolute top-4 left-4 flex h-9 w-9 items-center justify-center border border-white/50 bg-ink/40 text-white transition-colors hover:bg-white hover:text-ink"
				aria-label="Close"
			>
				<svg
					viewBox="0 0 20 20"
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg
				>
			</button>
			<div class="absolute inset-x-0 bottom-0 px-6 pb-5 md:px-9 md:pb-7">
				<p class="text-[9.5px] font-extrabold tracking-[0.24em] text-paper-bg/75 uppercase">
					{circuit.region} · {story.est}
				</p>
				<h2
					id="circuit-title"
					class="ao-cond mt-1 text-[52px] leading-[0.85] font-black uppercase md:text-[72px]"
				>
					{circuit.name}
				</h2>
			</div>
		</div>

		<!-- ============ roll of champions ============ -->
		{#if champions.length}
			<section
				class="relative bg-ink px-6 pt-6 pb-7 text-paper-bg md:px-9"
				aria-label="Player’s Champions"
			>
				<span
					class="pointer-events-none absolute inset-x-0 top-0 h-px"
					style="background: linear-gradient(90deg, transparent, var(--ed-gold) 20%, var(--ed-gold) 80%, transparent);"
					aria-hidden="true"
				></span>
				<div class="flex items-baseline justify-between gap-4">
					<p class="text-[9.5px] font-extrabold tracking-[0.26em] text-gold uppercase">
						◆ Roll of champions
					</p>
					<p class="text-[9px] font-extrabold tracking-[0.2em] text-paper-bg/45 uppercase">
						Player’s Champion · by season
					</p>
				</div>
				<ol
					class="mt-4 grid gap-px bg-gold/25 {champions.length > 1
						? 'grid-cols-2 md:grid-cols-4'
						: 'grid-cols-1'}"
				>
					{#each [...champions].reverse() as ch (ch.year)}
						<li
							class="relative flex min-h-[132px] flex-col justify-between overflow-hidden bg-ink px-4 pt-3 pb-4"
							style={ch.reigning
								? 'background: linear-gradient(160deg, color-mix(in srgb, var(--ed-gold) 24%, var(--ed-ink)) 0%, var(--ed-ink) 72%);'
								: ''}
						>
							<span
								class="ao-cond pointer-events-none absolute -right-1 -bottom-5 text-[92px] leading-none font-black text-gold/10"
								aria-hidden="true">’{String(ch.year).slice(2)}</span
							>
							<span class="relative flex items-center justify-between gap-2">
								<span class="ao-cond text-[30px] leading-none font-black text-gold tabular-nums"
									>{ch.year}</span
								>
								{#if ch.reigning}
									<span
										class="border border-gold/60 px-1.5 py-[2px] text-[8px] font-extrabold tracking-[0.18em] text-gold uppercase"
										>Reigning</span
									>
								{/if}
							</span>
							<span class="relative mt-4 block">
								<span
									class="block font-newsreader text-[19px] leading-[1.1] font-semibold [text-wrap:balance] md:text-[20px]"
								>
									{ch.name}
								</span>
								<span
									class="mt-1.5 block text-[9px] font-extrabold tracking-[0.18em] text-paper-bg/50 uppercase"
								>
									{#if ch.titles > 1}{ordinal(ch.nth)} of {ch.titles} titles{:else}Champion{/if}
								</span>
							</span>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<div class="grid gap-8 px-6 py-7 md:grid-cols-[1.15fr_1fr] md:gap-10 md:px-9 md:py-9">
			<!-- story + venues -->
			<div>
				<p
					class="font-newsreader text-[22px] leading-[1.15] font-semibold tracking-[-0.01em] md:text-[26px]"
				>
					{story.tagline}
				</p>
				<p class="mt-3 font-newsreader text-[16.5px] leading-[1.55] text-soft">
					{story.body}
				</p>
				<dl class="mt-6 grid grid-cols-2 border-y border-line">
					<div class="py-3 pr-3">
						<dt class="text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase">
							Events ahead
						</dt>
						<dd class="ao-cond mt-1 text-[36px] leading-none font-black tabular-nums">
							{count ?? dates.length}
						</dd>
					</div>
					<div class="border-l border-line py-3 pl-4">
						<dt class="text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase">
							Prize pool
						</dt>
						<dd class="ao-cond mt-1 text-[36px] leading-none font-black">$1,000</dd>
					</div>
				</dl>
				{#if venues.length}
					<p class="mt-5 text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
						Venues
					</p>
					<p class="mt-1 font-newsreader text-[16px] text-ink">{venues.join(' · ')}</p>
				{/if}
			</div>

			<!-- upcoming dates -->
			<div>
				<p
					class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
				>
					<span class="text-[10px]" style="color: {circuitVar(circuit.name)};" aria-hidden="true"
						>◆</span
					>
					Upcoming
				</p>
				{#if dates.length}
					<ul class="mt-3 border-t border-line">
						{#each dates as e (e.href)}
							<li class="border-b border-line">
								<a
									href={e.href}
									class="group grid grid-cols-[56px_1fr_auto] items-center gap-3 py-3"
								>
									<span
										class="flex flex-col items-center py-1"
										style="background: color-mix(in srgb, {circuitVar(
											circuit.name
										)} 10%, var(--ed-paper));"
									>
										<span
											class="text-[8.5px] font-extrabold tracking-[0.16em]"
											style="color: {circuitVar(circuit.name)};">{e.month}</span
										>
										<span class="ao-cond text-[30px] leading-[0.9] font-black tabular-nums"
											>{e.day}</span
										>
									</span>
									<span class="min-w-0">
										<span class="block truncate text-[13px] font-bold">{e.weekday} · {e.venue}</span
										>
										<span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1"
											>{#if e.format}<FormatTag format={e.format} size="sm" />{/if}<span
												class="text-[10.5px] font-semibold text-fade">{e.when} · {e.price}</span
											></span
										>
									</span>
									<span
										class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase transition-transform group-hover:translate-x-0.5"
										>Sign up →</span
									>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-3 border-y border-line py-6 font-newsreader text-[15px] text-soft italic">
						New dates for {circuit.name} are coming soon.
					</p>
				{/if}
				<a
					href="/age-open?tab=events&region={encodeURIComponent(circuit.name)}"
					class="mt-6 flex items-center justify-center gap-2 bg-ink px-5 py-3.5 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-colors hover:bg-warm"
				>
					All {circuit.name} events →
				</a>
			</div>
		</div>

		<!-- ============ top ten ============ -->
		{#if top.length}
			<section
				class="border-t border-line px-6 pt-6 pb-8 md:px-9"
				aria-label="Top ten on this circuit"
			>
				<div
					class="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-[3px] border-ink pb-2"
				>
					<p
						class="ao-cond text-[34px] leading-[0.85] font-black uppercase [word-spacing:0.18em] md:text-[40px]"
					>
						Top 10
					</p>
					<p class="pb-0.5 text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase">
						AGE Points earned in {circuit.name}
					</p>
				</div>
				<ol class="grid md:grid-flow-col md:grid-cols-2 md:grid-rows-5 md:gap-x-10">
					{#each top as s, i (s.playerName + i)}
						<li class="border-b border-line">
							<a
								href={s.gemId ? `/player/${s.gemId}` : '/age-open?tab=standings'}
								class="group grid grid-cols-[38px_1fr_auto] items-baseline gap-3 py-2.5"
							>
								<span
									class="ao-cond text-[26px] leading-none font-black tabular-nums {i === 0
										? 'text-gold'
										: i < 3
											? 'text-ink'
											: 'text-fade/60'}">{i + 1}</span
								>
								<span class="truncate font-newsreader text-[16.5px] font-semibold">
									<span class="fp-ul">{s.playerName}</span
									>{#if champions.some((c) => c.name === s.playerName)}<span
											class="ml-1.5 text-[11px] text-gold"
											title="Player’s Champion">◆</span
										>{/if}
								</span>
								<span class="text-[11px] font-semibold text-fade tabular-nums"
									>{s.totalPoints || 0} pts</span
								>
							</a>
						</li>
					{/each}
				</ol>
				{#if top.some((t) => champions.some((c) => c.name === t.playerName))}
					<p class="mt-3 text-[9.5px] font-semibold text-fade">
						<span class="text-gold">◆</span> Player’s Champion
					</p>
				{/if}
			</section>
		{/if}
	</div>
</div>
