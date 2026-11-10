<script>
	/**
	 * Classroom → Refunds. Requests waiting for a decision come first, each
	 * with the guide, the buyer, why they asked, whether they've opened it
	 * and when they bought it; teachers approve on their own guides, admins
	 * approve or decline any. Then (admins) refunds that failed at the
	 * gateway, sales that can be refunded without a request, and what was
	 * decided. Approving refunds the buyer at once.
	 */
	import { invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import LedgerTable from '$lib/desk/courses/LedgerTable.svelte';
	import { money, shortDate, waited } from '$lib/desk/courses/format.js';
	import { REFUND_REQUEST_WINDOW_DAYS } from '$lib/academy/partner/terms.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let busy = $state('');
	let notes = $state(/** @type {Record<string, string>} */ ({}));
	let message = $state('');
	let error = $state('');

	async function act(r, action) {
		if (busy) return;
		if (
			action === 'approve' &&
			!confirm(`Refund ${r.title} (${money(r.amountCents)}) to ${r.buyer}? This can’t be undone.`)
		)
			return;
		busy = r.id;
		error = '';
		message = '';
		const res = await fetch(`/api/academy/refunds/${r.id}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action, note: notes[r.id] || null })
		});
		const body = await res.json().catch(() => ({}));
		busy = '';
		if (!res.ok) {
			error = body.error || 'That didn’t go through.';
			return;
		}
		message =
			action === 'deny'
				? `Declined. ${r.buyer} sees it on their purchase.`
				: body.request?.refundStatus === 'refund_failed'
					? 'Approved, but the refund failed at the gateway. It’s under “Refunds to check”.'
					: body.request?.refundStatus === 'refunded'
						? `Refunded ${money(r.amountCents)} to ${r.buyer}.`
						: 'Approved. The refund goes through once the charge settles.';
		await invalidate('classroom:refunds');
	}

	const STATUS = {
		pending: 'Waiting',
		approved: 'Approved',
		auto_approved: 'Approved automatically',
		denied: 'Declined'
	};
	const REFUND = {
		processing: 'refund in progress',
		refunded: 'refunded',
		refund_failed: 'refund failed'
	};
	const ageOf = (d) => {
		const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
		return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
	};
	const kicker = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
</script>

<svelte:head><title>Refunds · Classroom</title></svelte:head>

<DeskHeader
	title="Refunds"
	subtitle={data.admin
		? 'Every guide refund: requests to decide, refunds to check, and sales you can refund.'
		: 'Refund requests on your guides, and sales you can refund.'}
/>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-12 px-5 pt-8 pb-20 font-libre md:px-8">
	{#if message}<p
			class="border-l-[3px] border-prem bg-prem/10 px-4 py-3 text-[13.5px] font-semibold"
			role="status"
		>
			{message}
		</p>{/if}
	{#if error}<p
			class="border-l-[3px] border-hero-rb bg-hero-rb/[0.06] px-4 py-3 text-[13.5px] font-semibold text-hero-rb"
			role="alert"
		>
			{error}
		</p>{/if}

	<!-- waiting for a decision -->
	<section aria-labelledby="pending-h">
		<h2
			id="pending-h"
			class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5"
		>
			<span><span class="text-hero-rb" aria-hidden="true">◆</span> Waiting for a decision</span>
			<span class="tracking-normal text-fade normal-case">{data.pending.length || 'None'}</span>
		</h2>
		{#if data.pending.length}
			<ul class="divide-y divide-line">
				{#each data.pending as r (r.id)}
					<li class="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_320px]">
						<div class="min-w-0">
							<p class="font-newsreader text-[19px] leading-snug font-semibold">
								{r.title} · {money(r.amountCents)}
							</p>
							<p class="mt-1 text-[13px] text-soft">
								{r.buyer}{r.buyerEmail ? ` · ${r.buyerEmail}` : ''} · bought {shortDate(r.orderAt)}
								({ageOf(r.orderAt)})
							</p>
							<p class="mt-2 text-[13.5px]">
								<span class="font-semibold">{r.reasonLabel}</span>
								{#if r.message}<span class="font-newsreader text-[15px] text-soft">
										“{r.message}”</span
									>{/if}
							</p>
							<p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-soft">
								<span>
									<span class="font-semibold text-ink">Opened:</span>
									{r.firstOpenedAt ? shortDate(r.firstOpenedAt) : 'never'}
								</span>
								<span>
									<span class="font-semibold text-ink">Refund policy:</span>
									{r.consent.given
										? `agreed ${shortDate(r.consent.at)}`
										: 'not recorded'}{data.admin && r.consent.ip ? ` from ${r.consent.ip}` : ''}
								</span>
								<span
									>Asked {waited(r.createdAt) === 'today'
										? 'today'
										: `${waited(r.createdAt)} ago`}</span
								>
							</p>
						</div>
						<div class="space-y-2">
							<input
								type="text"
								placeholder="Note to the buyer (optional)"
								bind:value={notes[r.id]}
								maxlength="300"
								class="h-[38px] w-full border border-line2 bg-white px-2.5 text-[13.5px] focus:border-ink focus:ring-0"
							/>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => act(r, 'approve')}
									disabled={!!busy}
									class="h-[38px] flex-1 bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
									>{busy === r.id ? 'Refunding…' : `Refund ${money(r.amountCents)}`}</button
								>
								{#if data.admin}
									<button
										type="button"
										onclick={() => act(r, 'deny')}
										disabled={!!busy}
										class="h-[38px] border border-hero-rb px-4 text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:bg-hero-rb hover:text-white disabled:opacity-50"
										>Decline</button
									>
								{/if}
							</div>
							{#if !data.admin}
								<p class="text-[11.5px] leading-snug text-fade">
									You can approve. If you’d rather not, leave it; AGE decides under the refund
									policy.
								</p>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-4 text-[13.5px] text-soft">
				<span class="mr-1 text-prem" aria-hidden="true">✓</span> No refund requests waiting.
			</p>
		{/if}
	</section>

	{#if data.admin && data.failed.length}
		<section aria-labelledby="failed-h">
			<h2 id="failed-h" class="{kicker} border-b-[3px] border-ink pb-2.5">Refunds to check</h2>
			<ul class="divide-y divide-line">
				{#each data.failed as r (r.id)}
					<li class="flex flex-wrap items-start justify-between gap-3 py-4">
						<div class="min-w-0 text-[13.5px]">
							<p class="font-semibold">{r.title} · {money(r.amountCents)} · {r.buyer}</p>
							<p class="text-[12px] text-soft">
								{REFUND[r.refundStatus]}{r.gatewayError ? ` · ${r.gatewayError}` : ''}
							</p>
						</div>
						{#if r.refundStatus === 'refund_failed'}
							<button
								type="button"
								onclick={() => act(r, 'retry')}
								disabled={!!busy}
								class="h-[34px] bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
								>{busy === r.id ? 'Trying…' : 'Retry the refund'}</button
							>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- refund without a request -->
	<section aria-labelledby="sales-h">
		<h2
			id="sales-h"
			class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5"
		>
			Refund a sale
			<span class="tracking-normal text-fade normal-case"
				>{data.admin
					? 'Last 90 days, any guide'
					: `Your guides, within ${REFUND_REQUEST_WINDOW_DAYS} days of purchase`}</span
			>
		</h2>
		<div class="mt-4">
			<LedgerTable rows={data.sales} admin={data.admin} refundable />
		</div>
	</section>

	<!-- what was decided -->
	<section aria-labelledby="decided-h">
		<h2 id="decided-h" class="{kicker} border-b-[3px] border-ink pb-2.5">Decided</h2>
		{#if data.decided.length}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[720px] text-left text-[13px]">
					<thead>
						<tr
							class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							<th class="py-2 pr-4 font-extrabold">Asked</th>
							<th class="py-2 pr-4 font-extrabold">Guide</th>
							<th class="py-2 pr-4 font-extrabold">Buyer</th>
							<th class="py-2 pr-4 text-right font-extrabold">Amount</th>
							<th class="py-2 pr-4 font-extrabold">Outcome</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each data.decided as r (r.id)}
							<tr>
								<td class="py-2 pr-4 whitespace-nowrap text-fade">{shortDate(r.createdAt)}</td>
								<td class="py-2 pr-4">
									<span class="font-semibold">{r.title}</span>
									<span class="block text-[11.5px] text-fade">{r.reasonLabel}</span>
								</td>
								<td class="py-2 pr-4">{r.buyer}</td>
								<td class="py-2 pr-4 text-right tabular-nums">{money(r.amountCents)}</td>
								<td class="py-2 pr-4">
									{STATUS[r.status]}{r.decidedBy && r.decidedBy !== 'system'
										? ` by ${r.decidedBy === 'admin' ? 'AGE' : 'the teacher'}`
										: ''}{REFUND[r.refundStatus] ? ` · ${REFUND[r.refundStatus]}` : ''}
									{#if r.decisionNote && r.decidedBy !== 'system'}<span
											class="block text-[11.5px] text-fade italic">“{r.decisionNote}”</span
										>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="py-4 text-[13.5px] text-soft">Nothing yet.</p>
		{/if}
		<p class="mt-4 text-[12px] text-fade">
			Refunds follow the <a href="/refund-policy" class="underline">guide refund policy</a>.
			Duplicate charges and unopened guides are refunded automatically. A refund comes off the
			teacher’s next statement and their lifetime copies.
		</p>
	</section>
</div>
