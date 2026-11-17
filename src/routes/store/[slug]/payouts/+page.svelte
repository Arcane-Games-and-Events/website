<script>
	/**
	 * Store → Payouts: each event's payout — players, ticket sales, refunds,
	 * card fees and adjustments — and what's owed or paid. Read-only; AGE
	 * marks payouts paid.
	 */
	import PayoutList from '$lib/components/age/store/PayoutList.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data } = $props();

	const w = $derived(data.where);
	const p = $derived(data.payouts);
	const fee = $derived(
		`${Math.round(Number(data.fee.feePct) * 10000) / 100}% + $${(data.fee.feeFixedCents / 100).toFixed(2)}`
	);
</script>

<svelte:head><title>Payouts · {w.store.name}</title></svelte:head>

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8" style="--cc: {w.circuit.color};">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h2 class="ao-cond text-[44px] leading-none font-black uppercase md:text-[56px]">Payouts</h2>
			<p class="mt-1.5 max-w-[640px] text-[13px] text-soft">
				You keep your ticket sales minus the card fee ({fee} per card payment). AGE pays each event once
				it’s closed out. Refunded tickets come off in full, fee included.
			</p>
		</div>
		<a
			href="/store/{w.store.slug}/payouts/payouts.csv"
			class="inline-flex h-[40px] items-center border border-line2 bg-white px-4 text-[10.5px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
			>Download CSV ↓</a
		>
	</div>

	<dl class="mt-8 grid grid-cols-3 border-t-[3px] border-ink">
		{#each [{ label: 'Owed to you', value: p.owedCents, note: 'closed-out events', tone: p.owedCents ? 'text-prem' : '' }, { label: 'In progress', value: p.runningCents, note: 'events not closed out' }, { label: 'Paid so far', value: p.paidCents, note: 'all time' }] as f, i (f.label)}
			<div
				class="border-b border-line2 py-4 pr-4 {i ? 'pl-4 md:pl-5' : ''} border-r last:border-r-0"
			>
				<dt class={ui.label}>{f.label}</dt>
				<dd
					class="ao-cond mt-2 text-[30px] leading-none font-black tabular-nums md:text-[40px] {f.tone ||
						''}"
				>
					{ui.money(f.value / 100)}
				</dd>
				<dd class="mt-1.5 text-[11.5px] text-soft">{f.note}</dd>
			</div>
		{/each}
	</dl>

	<PayoutList list={p.payouts} carriedCents={p.carriedCents} />
</div>
