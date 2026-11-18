<script>
	import SeasonTrack from '$lib/components/age/store/SeasonTrack.svelte';
	import NextUp from '$lib/components/age/store/NextUp.svelte';
	import CircuitRace from '$lib/components/age/store/CircuitRace.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data } = $props();

	const w = $derived(data.where);
	const d = $derived(data.dash);
	const base = $derived(`/store/${w.store.slug}`);
	const color = $derived(w.circuit.color);
</script>

<svelte:head><title>Season · {w.store.name}</title></svelte:head>

<SeasonTrack season={d} {base} {color} canAdd={w.store.active} />

<div class="mx-auto w-full max-w-page px-5 pt-10 pb-20 md:px-8">
	<NextUp next={d.next} now={d.now} {base} {color} canAdd={w.store.active} />

	<!-- your numbers -->
	<dl class="mt-10 grid grid-cols-2 border-t-3 border-ink md:grid-cols-3">
		{#each [{ label: `Players in ${d.year}`, value: ui.fmt(d.players), note: 'across your Opens' }, { label: 'Ticket sales', value: ui.money(d.sales, 0), note: 'after refunds' }, { label: 'Owed to you', value: ui.money(data.owedCents / 100), note: 'paid after each event', tone: data.owedCents ? 'text-prem' : '' }] as f, i (f.label)}
			<div
				class="border-b border-line2 py-4 pr-4 {i % 2 ? 'pl-4 md:pl-5' : ''} {i > 1
					? 'md:pl-5'
					: ''} md:border-r md:last:border-r-0 {i === 0 ? 'md:pl-0' : ''}"
			>
				<dt class={ui.label}>{f.label}</dt>
				<dd class="ao-cond mt-2 text-4xl leading-none font-black tabular-nums {f.tone || ''}">
					{f.value}
				</dd>
				<dd class="mt-1.5 text-xs text-soft">{f.note}</dd>
			</div>
		{/each}
	</dl>

	<div class="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
		<section>
			<div class="flex items-baseline justify-between border-b-3 border-ink pb-2">
				<h2 class="flex items-center gap-2.5 text-xs font-extrabold tracking-widest uppercase">
					<span class="text-xs text-warm">◆</span>The AGE season
				</h2>
				<span class="text-xs text-fade">{d.year} · {d.target} Opens per circuit</span>
			</div>
			<div class="mt-5 grid grid-cols-2 gap-px border border-line2 bg-line2">
				<div class="bg-paper-bg px-4 py-3">
					<p class={ui.label}>Opens so far</p>
					<p class="ao-cond mt-1 text-3xl leading-none font-black tabular-nums">
						{ui.fmt(d.circuits.reduce((n, c) => n + c.played, 0))}<span class="text-lg text-fade">
							/ {d.circuits.length * d.target}</span
						>
					</p>
				</div>
				<div class="bg-paper-bg px-4 py-3">
					<p class={ui.label}>Players this season</p>
					<p class="ao-cond mt-1 text-3xl leading-none font-black tabular-nums">
						{ui.fmt(d.age.players)}
					</p>
				</div>
			</div>
			<div class="mt-6">
				<CircuitRace circuits={d.circuits} target={d.target} />
			</div>
			<a href="{base}/calendar" class="mt-6 inline-block {ui.textAction}"
				>See every Open on the calendar →</a
			>
		</section>

		<section>
			<div
				class="flex items-baseline justify-between border-b-3 pb-2"
				style="border-color: {color}"
			>
				<h2 class="flex items-center gap-2.5 text-xs font-extrabold tracking-widest uppercase">
					<span class="text-xs" style="color: {color}">◆</span>{w.circuit.name} leaders
				</h2>
				<a href="/ageopen?tab=standings" class="text-xs text-fade hover:text-warm">Standings →</a>
			</div>
			<ol class="mt-2">
				{#each d.leaders as p, i (p.gemId || p.name)}
					<li class="flex items-center gap-4 border-b border-line2 py-3">
						<span
							class="ao-cond w-9 shrink-0 text-3xl leading-none font-black tabular-nums"
							style={i === 0 ? `color: ${color}` : ''}>{i + 1}</span
						>
						<span class="min-w-0 flex-1 truncate font-newsreader text-lg font-semibold">
							{#if p.gemId}<a href="/player/{p.gemId}" class="hover:text-warm">{p.name}</a
								>{:else}{p.name}{/if}
						</span>
						<span class="shrink-0 text-xs text-soft tabular-nums"
							><b class="text-ink">{ui.fmt(p.points)}</b> pts</span
						>
					</li>
				{:else}
					<li class="py-6 font-newsreader text-base text-soft italic">
						No points yet this season. The first Open sets the table.
					</li>
				{/each}
			</ol>
		</section>
	</div>
</div>
