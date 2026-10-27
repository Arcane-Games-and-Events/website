<script>
	/**
	 * AGE Open — Rules & Info, in the series' "tournament day" register.
	 *
	 *   sub-header     logo, "Rules & Info", section links
	 *   the series     what the circuit is, with the season in numbers
	 *   every open     cash and AGE Points by finish
	 *   championship   how the top 16 per circuit qualify
	 *   rulebook       chapter index + searchable, expandable rules
	 *   faq            the questions players ask most
	 *   contact        email and Discord
	 *
	 * Copy lives in $lib/data/ageOpenRules.js.
	 */
	import { reveal } from '$lib/actions/reveal.js';
	import { rulebookSections, faqItems, prizeTable } from '$lib/data/ageOpenRules.js';
	import AgeOpenSubHead from './AgeOpenSubHead.svelte';

	const LABEL = 'text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
	const KICK = 'text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase';
	const H2 =
		'ao-cond mt-2 text-[40px] leading-none font-black uppercase [word-spacing:0.18em] md:text-[52px]';
	const norm = (s) => (s || '').toLowerCase();
	const pad = (n) => String(n).padStart(2, '0');
	const maxPts = Math.max(...prizeTable.map((r) => r.pts));

	// ============ rulebook ============
	let q = $state('');
	/** open rule keys, "chapterId:index" */
	let open = $state(/** @type {Set<string>} */ (new Set()));
	const chapters = $derived.by(() => {
		const terms = norm(q).split(/\s+/).filter(Boolean);
		return rulebookSections
			.map((c, ci) => ({
				...c,
				n: ci + 1,
				items: c.items
					.map((it, i) => ({ ...it, key: `${c.id}:${i}` }))
					.filter(
						(it) =>
							!terms.length ||
							terms.every((t) => norm(it.question).includes(t) || norm(it.answer).includes(t))
					)
			}))
			.filter((c) => c.items.length);
	});
	const hitCount = $derived(chapters.reduce((n, c) => n + c.items.length, 0));
	const totalRules = rulebookSections.reduce((n, c) => n + c.items.length, 0);
	function toggle(key) {
		const next = new Set(open);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		open = next;
	}
	const allOpen = $derived(
		hitCount > 0 && chapters.every((c) => c.items.every((it) => open.has(it.key)))
	);
	function toggleAll() {
		open = allOpen ? new Set() : new Set(chapters.flatMap((c) => c.items.map((it) => it.key)));
	}
	// Searching opens every match so the answer is visible
	$effect(() => {
		if (q.trim()) open = new Set(chapters.flatMap((c) => c.items.map((it) => it.key)));
	});
	/** Wrap matched terms so they read at a glance */
	function mark(text) {
		const terms = norm(q)
			.split(/\s+/)
			.filter((t) => t.length > 1);
		if (!terms.length) return [{ t: text, hit: false }];
		const re = new RegExp(
			`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
			'gi'
		);
		return text
			.split(re)
			.filter(Boolean)
			.map((t) => ({ t, hit: terms.includes(t.toLowerCase()) }));
	}

	// ============ faq ============
	let openFaq = $state(/** @type {number | null} */ (0));
</script>

<AgeOpenSubHead
	active="rules"
	title="Rules & Info"
	strap="How the series works, what every finish pays, and the full rulebook, searchable."
/>

<!-- ============ the series ============ -->
<section class="border-b border-line">
	<div
		class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16"
	>
		<div>
			<p class={KICK}>The series</p>
			<h2 class={H2}>One season. Three circuits.</h2>
			<p class="mt-5 max-w-[560px] font-newsreader text-[18px] leading-[1.6] text-soft">
				The AGE Open is a year-long competitive Flesh and Blood series across Los Angeles, St. Louis
				and New England. Every Open pays out cash and AGE Points. At season’s end, the top 16 in
				each circuit are invited to their circuit’s Player’s Championship.
			</p>
			<div class="mt-7 flex flex-wrap gap-x-6 gap-y-3">
				<a
					href="/age-open?tab=events"
					class="border-b-2 border-warm pb-1 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[letter-spacing] hover:tracking-[0.26em]"
					>Find an Open →</a
				>
				<a
					href="/age-open?tab=standings"
					class="border-b-2 border-line2 pb-1 text-[10.5px] font-extrabold tracking-[0.18em] text-soft uppercase transition-colors hover:border-ink hover:text-ink"
					>Season standings</a
				>
			</div>
		</div>
		<dl class="grid grid-cols-2 border-t-[3px] border-ink">
			{#each [{ v: '24', l: 'Opens this season', tone: '' }, { v: '$30K', l: 'Total prize pool', tone: 'text-prem' }, { v: '3', l: 'Championships', tone: 'text-gold' }, { v: 'Top 16', l: 'Qualify per circuit', tone: 'text-warm' }] as s, i (s.l)}
				<div
					class="border-b border-line px-1 py-6 {i % 2 === 0 ? 'border-r pr-6' : 'pl-6'}"
					use:reveal={{ delay: i * 60 }}
				>
					<dd
						class="ao-cond text-[56px] leading-[0.85] font-black tabular-nums md:text-[72px] {s.tone}"
					>
						{s.v}
					</dd>
					<dt class="mt-3 {LABEL}">{s.l}</dt>
				</div>
			{/each}
		</dl>
	</div>
</section>

<!-- ============ every open ============ -->
<section class="border-b border-line bg-paper">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class={KICK}>Payouts & points</p>
				<h2 class={H2}>What every Open pays</h2>
			</div>
			<p class="max-w-[360px] font-newsreader text-[15px] text-soft italic">
				$1,000 in cash to the Top 8 at every Open, and AGE Points for everyone who plays.
			</p>
		</div>
		<div class="mt-8">
			<div
				class="hidden grid-cols-[140px_120px_minmax(0,1fr)_72px] items-end gap-6 border-b-[3px] border-ink px-4 pb-2 text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase md:grid"
			>
				<span>Finish</span><span class="text-center">Cash</span><span>AGE Points</span><span
					class="text-right">Pts</span
				>
			</div>
			<ol class="border-t-[3px] border-ink md:border-t-0">
				{#each prizeTable as row, i (row.place)}
					<li
						class="grid grid-cols-[minmax(0,1fr)_auto_56px] items-center gap-4 border-b border-line bg-paper-bg/60 px-3 py-3 even:bg-paper-bg md:grid-cols-[140px_120px_minmax(0,1fr)_72px] md:gap-6 md:px-4"
						use:reveal={{ delay: i * 40 }}
					>
						<span
							class="ao-cond text-[24px] leading-none font-black uppercase {i === 0
								? 'text-gold'
								: i < 4
									? 'text-warm'
									: ''}">{row.place}</span
						>
						<span
							class="ao-cond text-right text-[24px] leading-none font-black tabular-nums md:text-center {row.cash
								? 'text-prem'
								: 'text-fade/50'}">{row.cash ? `$${row.cash}` : '—'}</span
						>
						<span class="relative hidden h-[8px] bg-line md:block">
							<span
								class="absolute inset-y-0 left-0 bg-warm"
								style="width: {(row.pts / maxPts) * 100}%;"
							></span>
						</span>
						<span class="text-right"
							><span class="ao-cond text-[24px] leading-none font-black tabular-nums"
								>{row.pts}</span
							><span class="ml-1 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>pts</span
							></span
						>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>

<!-- ============ championship ============ -->
<section class="relative overflow-hidden bg-ink text-paper-bg">
	<span
		class="ao-cond pointer-events-none absolute -right-4 -bottom-12 text-[240px] leading-none font-black text-paper-bg/[0.04] select-none md:text-[360px]"
		aria-hidden="true">T16</span
	>
	<div
		class="relative mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[1fr_1fr] lg:gap-16"
	>
		<div>
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm-light uppercase">
				End of season
			</p>
			<h2 class="{H2} text-paper-bg">The Player’s Championship</h2>
			<p class="mt-5 max-w-[520px] font-newsreader text-[18px] leading-[1.6] text-paper-bg/75">
				The top 16 by AGE Points in each circuit are invited to play for a $2,000 prize pool and the
				title of AGE Open Series Champion. Every Open you play moves you up the ladder.
			</p>
			<a
				href="/age-open?tab=standings"
				class="mt-7 inline-block border-b-2 border-warm-light pb-1 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[letter-spacing] hover:tracking-[0.26em]"
				>See who’s inside the cut →</a
			>
		</div>
		<ol class="grid content-start gap-px border border-paper-bg/20 bg-paper-bg/20">
			{#each [{ n: '01', k: 'Play the Opens', d: 'Eight Opens per circuit. Every finish earns AGE Points, and the Top 8 also cash.' }, { n: '02', k: 'Climb to the top 16', d: 'Your season total decides your rank. The top 16 per circuit qualify automatically.' }, { n: '03', k: 'Play for the title', d: 'A $2,000 prize pool, and the champion is crowned AGE Open Series Champion.' }] as step (step.n)}
				<li class="flex gap-5 bg-ink px-5 py-5">
					<span class="ao-cond text-[34px] leading-none font-black text-warm-light tabular-nums"
						>{step.n}</span
					>
					<span>
						<span class="block text-[11px] font-extrabold tracking-[0.18em] uppercase"
							>{step.k}</span
						>
						<span class="mt-1.5 block font-newsreader text-[15px] leading-[1.5] text-paper-bg/70"
							>{step.d}</span
						>
					</span>
				</li>
			{/each}
		</ol>
	</div>
</section>

<!-- ============ rulebook ============ -->
<section class="border-b border-line">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class={KICK}>Official rulebook</p>
				<h2 class={H2}>Tournament rules</h2>
			</div>
			<p class="max-w-[380px] font-newsreader text-[15px] text-soft italic">
				{totalRules} rules across {rulebookSections.length} chapters. Search, or open a chapter.
			</p>
		</div>

		<div class="mt-8 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
			<!-- index -->
			<aside class="lg:sticky lg:top-[84px] lg:self-start">
				<label for="rules-search" class={LABEL}>Search the rules</label>
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
						><circle cx="8.5" cy="8.5" r="5.5" /><path
							d="M13 13l4.5 4.5"
							stroke-linecap="square"
						/></svg
					>
					<input
						id="rules-search"
						type="search"
						bind:value={q}
						placeholder="Decklist, late, judge…"
						autocomplete="off"
						class="min-h-[44px] w-full border-0 bg-transparent font-newsreader text-[17px] text-ink placeholder:text-fade focus:outline-none [&::-webkit-search-cancel-button]:hidden"
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
				<p class="mt-3 font-newsreader text-[14px] text-ink" aria-live="polite">
					{#if q}<strong class="font-semibold">{hitCount}</strong>
						{hitCount === 1 ? 'rule matches' : 'rules match'}{:else}All {totalRules} rules{/if}
				</p>

				<nav aria-label="Rulebook chapters" class="mt-5 hidden border-t-[3px] border-ink lg:block">
					<ol>
						{#each chapters as c (c.id)}
							<li class="border-b border-line">
								<a
									href="#rules-{c.id}"
									class="group flex items-baseline gap-3 py-2 text-[12px] font-bold text-soft transition-colors hover:text-ink"
								>
									<span
										class="ao-cond w-[22px] shrink-0 text-[15px] leading-none font-black text-fade tabular-nums group-hover:text-warm"
										>{pad(c.n)}</span
									>
									<span class="min-w-0 flex-1">{c.title}</span>
									<span class="text-[10px] text-fade tabular-nums">{c.items.length}</span>
								</a>
							</li>
						{/each}
					</ol>
				</nav>
				<button
					type="button"
					onclick={toggleAll}
					class="mt-4 text-[9.5px] font-extrabold tracking-[0.18em] text-warm uppercase hover:text-ink"
					>{allOpen ? 'Collapse all' : 'Expand all'}</button
				>
			</aside>

			<!-- chapters -->
			<div class="min-w-0">
				{#each chapters as c (c.id)}
					<section id="rules-{c.id}" class="mb-10 scroll-mt-28 last:mb-0">
						<div class="flex items-end gap-4 border-b-[3px] border-ink pb-2">
							<span class="ao-cond text-[44px] leading-[0.8] font-black text-warm tabular-nums"
								>{pad(c.n)}</span
							>
							<h3
								class="ao-cond text-[28px] leading-none font-black uppercase [word-spacing:0.18em]"
							>
								{c.title}
							</h3>
						</div>
						<ol>
							{#each c.items as it (it.key)}
								{@const isOpen = open.has(it.key)}
								<li class="border-b border-line">
									<button
										type="button"
										onclick={() => toggle(it.key)}
										aria-expanded={isOpen}
										class="flex w-full items-start justify-between gap-4 py-3.5 text-left transition-colors hover:text-warm"
									>
										<span class="font-newsreader text-[18px] leading-snug font-semibold">
											{#each mark(it.question) as part, pi (pi)}{#if part.hit}<mark
														class="bg-warm-light/40 text-ink">{part.t}</mark
													>{:else}{part.t}{/if}{/each}
										</span>
										<span
											class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center border border-line2 text-[14px] leading-none text-soft transition-colors {isOpen
												? 'border-ink bg-ink text-paper-bg'
												: ''}"
											aria-hidden="true">{isOpen ? '−' : '+'}</span
										>
									</button>
									{#if isOpen}
										<p
											class="max-w-[720px] border-l-[3px] border-warm pb-5 pl-5 font-newsreader text-[16px] leading-[1.7] text-soft"
										>
											{#each mark(it.answer) as part, pi (pi)}{#if part.hit}<mark
														class="bg-warm-light/40 text-ink">{part.t}</mark
													>{:else}{part.t}{/if}{/each}
										</p>
									{/if}
								</li>
							{/each}
						</ol>
					</section>
				{:else}
					<div class="border border-line bg-paper px-6 py-12 text-center">
						<p class="ao-cond text-[28px] leading-none font-black uppercase">
							No rule matches “{q}”
						</p>
						<p class="mt-3 font-newsreader text-[15px] text-soft italic">
							Try a shorter word, or ask us below.
						</p>
					</div>
				{/each}

				<div class="mt-10 border-l-[3px] border-hero-rb bg-paper px-5 py-4">
					<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
						Important
					</p>
					<p class="mt-1.5 font-newsreader text-[15px] leading-[1.6] text-soft">
						These rules supplement the official Flesh and Blood Tournament Rules and Policy from
						Legend Story Studios. Where they conflict, the LSS rules apply unless AGE states
						otherwise. The Head Judge has final authority on every ruling at an event.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ============ faq ============ -->
<section class="border-b border-line bg-paper">
	<div
		class="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14"
	>
		<div>
			<p class={KICK}>Frequently asked</p>
			<h2 class={H2}>Questions players ask</h2>
		</div>
		<ol class="border-t-[3px] border-ink">
			{#each faqItems as item, i (i)}
				{@const isOpen = openFaq === i}
				<li class="border-b border-line">
					<button
						type="button"
						onclick={() => (openFaq = isOpen ? null : i)}
						aria-expanded={isOpen}
						class="flex w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:text-warm"
					>
						<span class="font-newsreader text-[20px] leading-snug font-semibold"
							>{item.question}</span
						>
						<span
							class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center border border-line2 text-[14px] leading-none text-soft {isOpen
								? 'border-ink bg-ink text-paper-bg'
								: ''}"
							aria-hidden="true">{isOpen ? '−' : '+'}</span
						>
					</button>
					{#if isOpen}
						<p class="max-w-[720px] pb-5 font-newsreader text-[16px] leading-[1.7] text-soft">
							{item.answer}
						</p>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
</section>

<!-- ============ contact ============ -->
<section class="bg-ink text-paper-bg">
	<div
		class="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8 md:py-16"
	>
		<div>
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm-light uppercase">
				Need a hand?
			</p>
			<h2 class="{H2} text-paper-bg">Still have questions?</h2>
			<p class="mt-4 max-w-[480px] font-newsreader text-[17px] leading-[1.6] text-paper-bg/70">
				Registration, formats, a ruling you want checked before the day: ask us and we’ll get back
				quickly.
			</p>
		</div>
		<div class="flex flex-wrap gap-3">
			<a
				href="mailto:info@arcanegamesandevents.com"
				class="border border-paper-bg bg-paper-bg px-6 py-3 text-[10.5px] font-extrabold tracking-[0.18em] text-ink uppercase transition-colors hover:bg-transparent hover:text-paper-bg"
				>Email us</a
			>
			<a
				href="https://discord.gg/aUF552mPUq"
				target="_blank"
				rel="noopener noreferrer"
				class="border border-paper-bg/40 px-6 py-3 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-colors hover:border-paper-bg"
				>Join the Discord</a
			>
		</div>
	</div>
</section>
