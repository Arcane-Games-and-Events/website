<script>
	import FrontDept from './FrontDept.svelte';

	/**
	 * AGE Open department — "Goings On" style: upcoming events with big
	 * serif dates in circuit colors, the standings with rust numerals
	 * (gold for first), and featured decklists.
	 */
	/** @type {{ n?: number, data: { events: any[], leaders: any[], decklists: any[] } | null }} */
	let { n = 0, data } = $props();
	const events = $derived(data?.events ?? []);
	const leaders = $derived(data?.leaders ?? []);
	const decklists = $derived(data?.decklists ?? []);
	const cols = $derived([events.length, leaders.length, decklists.length].filter(Boolean).length);
</script>

{#snippet subhead(label, href)}
	<div class="flex items-baseline justify-between border-t-[3px] border-double border-ink pt-3">
		<h4
			class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
		>
			<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
			{label}
		</h4>
		<a {href} class="text-[10px] font-extrabold tracking-[0.14em] uppercase hover:text-warm">
			All →
		</a>
	</div>
{/snippet}

{#if data}
	<section class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
		<FrontDept
			id="age-open"
			{n}
			title="AGE Open"
			strap="Our independent tournament series across Los Angeles, St. Louis, and New England."
			href="/age-open"
			label="The series"
		/>

		<div
			class="mt-8 grid grid-cols-1 gap-10 md:mt-10 md:gap-0 md:divide-x md:divide-line {cols === 3
				? 'md:grid-cols-3'
				: cols === 2
					? 'md:grid-cols-2'
					: ''}"
		>
			{#if events.length}
				<div class="md:pr-8">
					{@render subhead('Goings On', '/age-open?tab=events')}
					<ul class="mt-1 divide-y divide-line">
						{#each events as e (e.href)}
							<li>
								<a href={e.href} class="group grid grid-cols-[56px_1fr] items-center gap-4 py-4">
									<span class="text-center leading-none">
										<span class="block font-newsreader text-[40px] font-medium tabular-nums">
											{e.day}
										</span>
										<span
											class="mt-1 block text-[9.5px] font-extrabold tracking-[0.16em] uppercase"
											style="color: var(--ed-cc-{e.circuit});"
										>
											{e.month}
										</span>
									</span>
									<span class="min-w-0">
										<span class="block font-newsreader text-[18px] leading-[1.18] font-semibold">
											<span class="fp-ul">{e.title}</span>
										</span>
										<span class="mt-1 block text-[11px] font-semibold text-fade">
											{[e.venue, e.format].filter(Boolean).join(' · ')}
										</span>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if leaders.length}
				<div class="md:px-8 {events.length ? '' : 'md:pl-0'}">
					{@render subhead('Standings', '/age-open?tab=standings')}
					<ol class="mt-1 divide-y divide-line">
						{#each leaders as l (l.rank)}
							<li>
								<a
									href={l.href}
									class="group grid grid-cols-[40px_1fr_auto] items-baseline gap-3 py-3"
								>
									<span
										class="font-newsreader text-[30px] leading-none font-medium tabular-nums {l.rank ===
										1
											? 'text-gold'
											: 'text-warm'}"
									>
										{l.rank}
									</span>
									<span class="truncate font-newsreader text-[18px] font-semibold">
										<span class="fp-ul">{l.name}</span>
									</span>
									<span class="text-[11px] font-extrabold tracking-[0.08em] text-fade tabular-nums">
										{l.points} PTS
									</span>
								</a>
							</li>
						{/each}
					</ol>
				</div>
			{/if}

			{#if decklists.length}
				<div class="md:pl-8">
					{@render subhead('Decklists', '/age-open?tab=decklists')}
					<ul class="mt-1 divide-y divide-line">
						{#each decklists as d (d.href + d.hero)}
							<li>
								<a href={d.href} class="group grid grid-cols-[56px_1fr] items-center gap-5 py-4">
									<span
										class="fp-plate relative block aspect-square w-[56px] overflow-hidden bg-panel"
									>
										<span
											class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.06]"
											style="background-image: url('{d.image}');"
										></span>
									</span>
									<span class="min-w-0">
										<span class="block font-newsreader text-[18px] leading-[1.18] font-semibold">
											<span class="fp-ul">{d.hero}</span>
										</span>
										<span class="mt-1 block text-[11px] font-semibold text-fade">
											{[d.by, d.event].filter(Boolean).join(' · ')}
										</span>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</section>
{/if}
