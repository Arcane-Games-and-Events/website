<script>
	import Panel from '$lib/components/account/Panel.svelte';
	import Notice from '$lib/components/account/Notice.svelte';
	import * as ui from '$lib/components/account/ui.js';
	let { data } = $props();
	const o = $derived(data.order);
	const isMembership = $derived(
		o.kind?.startsWith('subscription') || o.kind === 'legacy_subscription'
	);
	const status = $derived(
		o.refunded >= o.amount - 0.001 && o.amount > 0
			? 'Refunded'
			: o.refunded > 0
				? 'Partly refunded'
				: o.refundedAt
					? 'Refunded'
					: 'Paid'
	);
</script>

<svelte:head><title>Receipt — AGE</title></svelte:head>

<Panel
	rubric="Receipt"
	title={o.title}
	lead="{ui.date(o.createdAt)}{o.invoiceNumber ? ` · ${o.invoiceNumber}` : ''}"
>
	{#snippet aside()}
		<a href="/account/purchases" class={ui.ghost}>← All purchases</a>
	{/snippet}

	{#if data.isNew}<Notice
			tone="success"
			message="You're in. Your tickets are below, and a copy is on its way by email."
		/>{/if}

	<div class={ui.panel}>
		<dl class="grid gap-x-8 gap-y-4 px-6 pt-5 pb-6 text-[13.5px] sm:grid-cols-2 md:px-7">
			<div>
				<dt class={ui.label}>Total</dt>
				<dd class="mt-1 font-newsreader text-[28px] leading-none font-semibold tabular-nums">
					{ui.money(o.amount)}
				</dd>
			</div>
			<div>
				<dt class={ui.label}>Status</dt>
				<dd class="mt-1">
					<span class="{ui.pill} {status === 'Paid' ? ui.tone.paid : ui.tone.refunded}"
						>{status}</span
					>{#if o.refunded > 0}<span class="ml-2 text-soft">{ui.money(o.refunded)} returned</span
						>{/if}
				</dd>
			</div>
			{#if o.cardLastFour}<div>
					<dt class={ui.label}>Paid with</dt>
					<dd class="mt-1 font-semibold">{o.cardType || 'Card'} •••• {o.cardLastFour}</dd>
				</div>{/if}
			{#if o.discountAmount > 0}<div>
					<dt class={ui.label}>Discount</dt>
					<dd class="mt-1 font-semibold">
						−{ui.money(o.discountAmount)}{o.promoCode ? ` (${o.promoCode})` : ' · member discount'}
					</dd>
				</div>{/if}
			{#if isMembership}
				<div>
					<dt class={ui.label}>Plan</dt>
					<dd class="mt-1 font-semibold">
						{o.subscriptionType === 'yearly' ? 'Annual' : 'Monthly'} membership
					</dd>
				</div>
				{#if o.periodStart}<div>
						<dt class={ui.label}>Period</dt>
						<dd class="mt-1 font-semibold">
							{ui.dateShort(o.periodStart)} – {ui.dateShort(o.periodEnd)}
						</dd>
					</div>{/if}
			{/if}
			{#if data.event}
				<div class="sm:col-span-2">
					<dt class={ui.label}>Event</dt>
					<dd class="mt-1 font-semibold">
						<a href="/age-open/{data.event.id}" class="hover:text-warm">{data.event.title}</a><span
							class="text-soft"
						>
							· {ui.date(data.event.eventDate)}{data.event.location
								? ` · ${data.event.location}`
								: ''}</span
						>
					</dd>
				</div>
			{/if}
		</dl>
	</div>

	{#if data.tickets.length}
		<h3 class="mt-10 {ui.label}">Tickets</h3>
		<ul class="mt-3 border-t border-line">
			{#each data.tickets as t (t.id)}
				<li class="flex flex-wrap items-center gap-4 border-b border-line py-4">
					<div class="min-w-0 flex-1">
						<p class="font-newsreader text-[18px] font-semibold">
							{[t.firstName, t.lastName].filter(Boolean).join(' ') || 'Player'}{t.gemId
								? ` · GEM ${t.gemId}`
								: ''}
						</p>
						<p class="mt-0.5 text-[12.5px] text-soft">
							<span class="font-mono tracking-wider">{t.code}</span> · {Number(t.amountPaid) > 0
								? ui.money(t.amountPaid)
								: 'Free'}{t.refunded
								? ` · refunded ${ui.dateShort(t.refundedAt)}`
								: t.requestPending
									? ' · refund requested'
									: ''}
						</p>
					</div>
					<div class="flex gap-2">
						<a href="/events/{t.eventId}/ticket/{t.id}" class={ui.ghostSm}>View ticket</a>
						{#if t.can.action !== 'none'}<a href="/account/tickets" class={ui.ghostSm}
								>{t.can.action === 'refund' ? 'Refund' : 'Request refund'}</a
							>{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if data.refunds.length}
		<h3 class="mt-10 {ui.label}">Refunds</h3>
		<ul class="mt-3 border-t border-line">
			{#each data.refunds as r (r.id)}
				<li class={ui.row}>
					<span
						>{ui.dateShort(r.completedAt)} · {r.method === 'void'
							? 'charge cancelled before settlement'
							: 'refund to card'}</span
					><span class="font-semibold tabular-nums">{ui.dollars(r.amountCents)}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if isMembership}
		<p class="mt-8 {ui.note}">
			Manage your plan, card and renewals under <a
				href="/account/membership"
				class="text-warm underline-offset-4 hover:underline">Membership</a
			>.
		</p>
	{/if}
</Panel>
