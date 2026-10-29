<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminSubnav from '$lib/components/age/admin/AdminSubnav.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import { ORDERS_SUBNAV } from '$lib/components/age/admin/subnav.js';

	let { data, form } = $props();
	let busy = $state('');
	let notes = $state({});

	const hoursUntil = (d) => (d ? Math.round((new Date(d).getTime() - Date.now()) / 3600000) : null);
	const when = (d) => {
		const h = hoursUntil(d);
		if (h == null) return 'date TBA';
		if (h < 0) return `started ${Math.abs(h)}h ago`;
		if (h < 48) return `in ${h}h`;
		return `in ${Math.round(h / 24)}d`;
	};
	const name = (r) => [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email;
</script>

<svelte:head><title>Refund requests — Admin</title></svelte:head>

<DeskHeader
	kicker="Admin"
	title="Refund requests"
	subtitle="Tickets members asked to refund inside the 24-hour window."
/>
<AdminTabs />
<AdminSubnav items={ORDERS_SUBNAV} label="Orders" />

{#if form?.success}
	<AdminNotice tone="success" message={form.message} />
{:else if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	<Section
		title={data.view === 'all' ? 'All requests' : 'Waiting for a decision'}
		note="{data.requests.length} shown"
	>
		<div class="mb-4 flex gap-2">
			<a href="/admin/orders/refunds" class={data.view === 'pending' ? ui.btnSm : ui.ghostSm}
				>Pending</a
			>
			<a href="/admin/orders/refunds?view=all" class={data.view === 'all' ? ui.btnSm : ui.ghostSm}
				>All</a
			>
		</div>

		{#if data.requests.length === 0}
			<p class={ui.empty}>No refund requests{data.view === 'pending' ? ' waiting' : ''}.</p>
		{:else}
			<div class="divide-y divide-line2 border-t border-line2">
				{#each data.requests as r (r.id)}
					<article class="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_320px]">
						<div class="min-w-0">
							<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<span class={ui.titleText}>{r.eventTitle}</span>
								<span class={ui.note}>{ui.dateShort(r.eventDate)} · {when(r.eventDate)}</span>
								<span
									class="{ui.pill} {ui.pillTone[
										r.status === 'approved'
											? 'refunded'
											: r.status === 'pending'
												? 'upcoming'
												: 'inactive'
									]}">{r.status}</span
								>
							</div>
							<p class="mt-1 text-[13px] text-soft">
								<a href="/admin/customers/{r.userId}" class="font-semibold text-ink hover:text-warm"
									>{name(r)}</a
								>
								· {r.email} · ticket {r.ticketCode} · {ui.money(r.amountPaid)}
							</p>
							<p class="mt-2 font-newsreader text-[15px] text-ink">
								{#if r.reason}“{r.reason}”{:else}<span class="text-fade italic"
										>No reason given.</span
									>{/if}
							</p>
							<p class={`mt-1 ${ui.note}`}>
								Asked {ui.dateTime(r.createdAt)}{r.decidedAt
									? ` · decided ${ui.dateTime(r.decidedAt)}`
									: ''}{r.decisionNote ? ` · “${r.decisionNote}”` : ''}
							</p>
						</div>
						{#if r.status === 'pending'}
							<div class="space-y-2">
								<input
									type="text"
									placeholder="Note to the member (optional)"
									class={ui.input}
									bind:value={notes[r.id]}
									maxlength="300"
								/>
								<div class="flex gap-2">
									<form
										method="POST"
										action="?/approve"
										use:enhance={() => {
											busy = r.id;
											return async ({ update }) => {
												busy = '';
												await update();
												await invalidateAll();
											};
										}}
									>
										<input type="hidden" name="id" value={r.id} />
										<input type="hidden" name="note" value={notes[r.id] || ''} />
										<button class={ui.btnSm} disabled={busy === r.id}
											>{busy === r.id ? 'Refunding…' : `Refund ${ui.money(r.amountPaid)}`}</button
										>
									</form>
									<form
										method="POST"
										action="?/decline"
										use:enhance={() => {
											busy = r.id;
											return async ({ update }) => {
												busy = '';
												await update();
												await invalidateAll();
											};
										}}
									>
										<input type="hidden" name="id" value={r.id} />
										<input type="hidden" name="note" value={notes[r.id] || ''} />
										<button class={ui.danger} disabled={busy === r.id}>Decline</button>
									</form>
								</div>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	</Section>
</div>
