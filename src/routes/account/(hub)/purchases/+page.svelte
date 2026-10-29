<script>
	/**
	 * Purchase history as a ledger: a filter, then each month
	 * with its purchases. Every row says what was bought, for whom and for
	 * when, and opens the receipt.
	 */
	import Panel from '$lib/components/account/Panel.svelte';
	import * as ui from '$lib/components/account/ui.js';
	import { circuitVar } from '$lib/data/circuits.js';

	let { data } = $props();

	let filter = $state('all');
	const FILTERS = [
		{ key: 'all', label: 'All' },
		{ key: 'tickets', label: 'Tickets' },
		{ key: 'membership', label: 'Membership' }
	];

	const money = (v) => `$${(Number(v) || 0).toFixed(2)}`;
	const utc = (d, o) =>
		d ? new Date(d).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' }) : '';
	const local = (d, o) => (d ? new Date(d).toLocaleDateString('en-US', o) : '');

	const counts = $derived({
		all: data.orders.length,
		tickets: data.orders.filter((o) => o.type === 'tickets').length,
		membership: data.orders.filter((o) => o.type === 'membership').length
	});

	// Months, newest first.
	const months = $derived.by(() => {
		const shown = data.orders.filter((o) => filter === 'all' || o.type === filter);
		const groups = [];
		for (const o of shown) {
			const d = new Date(o.createdAt);
			const key = `${d.getFullYear()}-${d.getMonth()}`;
			let g = groups.at(-1);
			if (!g || g.key !== key) {
				g = { key, label: local(d, { month: 'long', year: 'numeric' }), orders: [] };
				groups.push(g);
			}
			g.orders.push(o);
		}
		return groups;
	});

	const accent = (o) => (o.type === 'membership' ? 'var(--color-prem)' : circuitVar(o.circuit));
	const kicker = (o) =>
		o.type === 'membership'
			? o.label
			: [
					'Tickets',
					o.circuit,
					o.eventDate
						? utc(o.eventDate, { weekday: 'short', month: 'short', day: 'numeric' })
						: null
				]
					.filter(Boolean)
					.join(' · ');
	const detail = (o) => {
		if (o.type === 'membership') {
			if (o.periodStart && o.periodEnd) {
				return `Covers ${utc(o.periodStart, { month: 'short', day: 'numeric' })} to ${utc(o.periodEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`;
			}
			return 'AGE Premium';
		}
		const seats = `${o.quantity} ticket${o.quantity === 1 ? '' : 's'}`;
		const who = o.players.length
			? o.players.length > 2
				? `${o.players.slice(0, 2).join(', ')} and ${o.players.length - 2} more`
				: o.players.join(' and ')
			: '';
		return [seats, who].filter(Boolean).join(' · ');
	};
	const statusLine = (o) => {
		if (o.status === 'refunded') return { text: 'Refunded', tone: 'text-hero-rb' };
		if (o.status === 'partly refunded') {
			return { text: `${money(o.refunded)} refunded`, tone: 'text-hero-rb' };
		}
		if (o.amount === 0) return { text: 'Free', tone: 'text-fade' };
		return { text: o.card ? `${o.card.brand} •••• ${o.card.lastFour}` : 'Paid', tone: 'text-fade' };
	};
</script>

<svelte:head><title>Purchases — AGE</title></svelte:head>

<Panel
	rubric="Purchases"
	title="Purchase history"
	lead="Every ticket and membership charge. Open one for the full receipt."
>
	{#if data.orders.length === 0}
		<div class="border border-dashed border-line2 px-6 py-12 text-center">
			<p class="ao-cond text-[34px] leading-none font-black uppercase">Nothing here yet.</p>
			<p class="mx-auto mt-3 max-w-[420px] font-newsreader text-[16px] text-soft italic">
				Tickets and membership charges show up here, each with its receipt.
			</p>
			<div class="mt-6 flex flex-wrap justify-center gap-2">
				<a href="/age-open?tab=events" class={ui.btn}>Find an event</a>
				<a href="/premium" class={ui.ghost}>See membership</a>
			</div>
		</div>
	{:else}
		<!-- ============ filter ============ -->
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="inline-flex gap-px border border-line2 bg-line2" role="tablist" aria-label="Show">
				{#each FILTERS as f (f.key)}
					<button
						type="button"
						role="tab"
						aria-selected={filter === f.key}
						onclick={() => (filter = f.key)}
						class="px-3.5 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {filter ===
						f.key
							? 'bg-ink text-paper-bg'
							: 'bg-paper-bg text-soft hover:text-ink'}"
					>
						{f.label} <span class="ml-1 tabular-nums opacity-60">{counts[f.key]}</span>
					</button>
				{/each}
			</div>
			<p class={ui.note}>Newest first</p>
		</div>

		<!-- ============ the ledger ============ -->
		{#if months.length === 0}
			<p class="mt-6 border-t border-line py-8 font-newsreader text-[17px] text-soft italic">
				No {filter === 'tickets' ? 'ticket purchases' : 'membership charges'} yet.
			</p>
		{/if}
		{#each months as m (m.key)}
			<section class="mt-8">
				<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
					<h3 class="text-[10.5px] font-extrabold tracking-[0.22em] uppercase">{m.label}</h3>
					<span class="text-[11px] font-semibold text-fade tabular-nums">
						{m.orders.length} purchase{m.orders.length === 1 ? '' : 's'}
					</span>
				</div>
				<ul>
					{#each m.orders as o (o.id)}
						{@const s = statusLine(o)}
						<li class="border-b border-line">
							<a
								href="/account/purchases/{o.id}"
								class="group grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 py-4 transition-colors hover:bg-paper md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center md:gap-x-5"
							>
								<!-- the day it was bought, edged in the colour of what it was -->
								<span
									class="row-span-2 flex flex-col items-center justify-center self-start border-l-[3px] bg-paper py-2 text-center md:row-span-1 md:self-center"
									style="border-color: {accent(o)};"
								>
									<span class="text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase">
										{local(o.createdAt, { month: 'short' })}
									</span>
									<span class="ao-cond text-[28px] leading-[0.9] font-black tabular-nums">
										{local(o.createdAt, { day: 'numeric' })}
									</span>
								</span>

								<span class="min-w-0">
									<span
										class="block text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
										style="color: {accent(o)};">{kicker(o)}</span
									>
									<span
										class="mt-0.5 block truncate font-newsreader text-[19px] leading-tight font-semibold group-hover:text-warm {o.status ===
										'refunded'
											? 'text-soft'
											: ''}">{o.title}</span
									>
									<span class="mt-0.5 block text-[12.5px] leading-snug text-soft">{detail(o)}</span>
									{#if o.discount > 0 || o.promoCode}
										<span
											class="mt-1 inline-block text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>
											{o.promoCode ? `${o.promoCode} · ` : 'Member discount · '}{money(o.discount)} off
										</span>
									{/if}
								</span>

								<span
									class="col-start-2 mt-2 flex items-baseline justify-between gap-3 md:col-start-auto md:mt-0 md:block md:text-right"
								>
									<span
										class="ao-cond block text-[26px] leading-none font-black tabular-nums {o.status ===
										'refunded'
											? 'text-fade line-through decoration-[2px]'
											: ''}">{money(o.amount)}</span
									>
									<span class="block text-[11px] font-semibold {s.tone} md:mt-1">{s.text}</span>
									<span
										class="hidden text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase opacity-0 transition-opacity group-hover:opacity-100 md:mt-1.5 md:block"
										>Receipt →</span
									>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</Panel>
