<!--
  PartnerPayouts — the admin's monthly statements under the AGE Partner
  terms: each teacher's sales earnings, referral bonuses, pool share,
  refunds and chargebacks, carried balance and net payable for a month,
  with their level and lifetime copies; a CSV of the month; and marking a
  statement paid once the money has gone out.

  Props: partner ({ month, months, statements, closed })
-->
<script>
	import { goto, invalidate } from '$app/navigation';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import { money } from './format.js';

	/** @type {{ partner: any }} */
	let { partner } = $props();

	let paying = $state(/** @type {any} */ (null));
	let reference = $state('');
	let note = $state('');
	let busy = $state(false);
	let error = $state('');

	const monthName = (m) =>
		new Date(`${m}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	const longDate = (d) =>
		new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	const due = $derived(partner.statements.filter((s) => s.status !== 'paid'));
	const total = $derived(due.reduce((n, s) => n + s.payableCents, 0));

	function open(s) {
		paying = s;
		reference = '';
		note = '';
		error = '';
	}

	async function confirmPaid() {
		if (busy) return;
		busy = true;
		error = '';
		const res = await fetch('/api/desk/payouts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ teacherId: paying.teacherId, month: partner.month, reference, note })
		});
		const body = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			error = body.message || 'Couldn’t record it';
			return;
		}
		paying = null;
		await invalidate('desk:payouts');
	}
</script>

<section>
	<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
		<div>
			<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">Statement</p>
			<p class="mt-1 font-newsreader text-[24px] leading-tight font-semibold">
				{monthName(partner.month)}
			</p>
			<p class="mt-0.5 text-[12.5px] text-soft">
				{partner.closed
					? `Pay on ${longDate(partner.payDate)}`
					: `In progress. Payable once the month ends, on ${longDate(partner.payDate)}.`}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<label class="flex items-center gap-2 text-[12.5px] text-soft">
				Month
				<select
					value={partner.month}
					onchange={(e) => goto(`?month=${e.currentTarget.value}`)}
					class="h-[38px] border border-line2 bg-white px-2.5 pr-8 text-[13.5px] focus:border-ink focus:ring-0"
				>
					{#each partner.months as m (m)}<option value={m}>{monthName(m)}</option>{/each}
				</select>
			</label>
			<a
				href="/api/desk/payouts/csv?month={partner.month}"
				download
				class="flex h-[38px] items-center border border-ink px-4 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:bg-ink hover:text-paper-bg"
				>Download CSV</a
			>
		</div>
	</div>

	{#if partner.statements.length}
		<div class="overflow-x-auto">
			<table class="mt-2 w-full min-w-[900px] text-left text-[13.5px]">
				<thead>
					<tr
						class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						<th class="py-2 pr-4 font-extrabold">Teacher</th>
						<th class="py-2 pr-4 font-extrabold">Level</th>
						<th class="py-2 pr-4 text-right font-extrabold">Sales</th>
						<th class="py-2 pr-4 text-right font-extrabold">Referrals</th>
						<th class="py-2 pr-4 text-right font-extrabold">Pool</th>
						<th class="py-2 pr-4 text-right font-extrabold">Refunds</th>
						<th class="py-2 pr-4 text-right font-extrabold">Net payable</th>
						<th class="py-2"><span class="sr-only">Status</span></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each partner.statements as s (s.teacherId)}
						<tr>
							<td class="py-3 pr-4">
								<p class="font-semibold">{s.name}</p>
								<p class="text-[12px] text-fade">{s.email}</p>
							</td>
							<td class="py-3 pr-4">
								{s.level}
								<span class="block text-[11.5px] text-fade tabular-nums"
									>{s.lifetimeCopies.toLocaleString()} lifetime</span
								>
							</td>
							<td class="py-3 pr-4 text-right tabular-nums">
								{money(s.salesCents)}
								<span class="block text-[11.5px] text-fade">{s.copies} copies</span>
							</td>
							<td class="py-3 pr-4 text-right tabular-nums">{money(s.referralCents)}</td>
							<td class="py-3 pr-4 text-right tabular-nums">{money(s.poolCents)}</td>
							<td class="py-3 pr-4 text-right tabular-nums">
								{money(s.deductedCents)}
								{#if s.carriedCents}<span class="block text-[11.5px] text-hero-rb"
										>{money(s.carriedCents)} carried</span
									>{/if}
							</td>
							<td
								class="py-3 pr-4 text-right font-newsreader text-[19px] font-semibold tabular-nums"
								>{money(s.payableCents)}</td
							>
							<td class="py-3 text-right">
								{#if s.status === 'paid'}
									<span
										class="border border-prem bg-prem px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-[0.14em] text-white uppercase"
										>Paid</span
									>
									{#if s.paid?.reference}<span class="mt-1 block text-[11px] text-fade"
											>{s.paid.reference}</span
										>{/if}
								{:else if partner.closed && s.payableCents > 0}
									<button
										type="button"
										onclick={() => open(s)}
										class="bg-ink px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap text-paper-bg uppercase hover:bg-warm"
										>Mark paid</button
									>
								{:else}
									<span class="text-[11.5px] text-fade"
										>{s.payableCents > 0 ? 'Pending' : 'Carries over'}</span
									>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="border-t-[3px] border-double border-ink">
						<td class="py-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase" colspan="6"
							>Still to pay</td
						>
						<td class="py-3 pr-4 text-right font-newsreader text-[19px] font-semibold tabular-nums"
							>{money(total)}</td
						>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</div>
	{:else}
		<p class="mt-6 text-[14px] text-soft">No teacher earned anything this month.</p>
	{/if}
	<p class="mt-5 max-w-[760px] text-[12.5px] leading-relaxed text-fade">
		AGE collects every payment and pays teachers outside the site. A statement covers sales past
		their hold whose payment Authorize.net has confirmed, referral bonuses and pool shares that
		month, less refunds and chargebacks. A month that comes out negative carries into the next.
	</p>
</section>

<DialogShell
	open={!!paying}
	onclose={() => (paying = null)}
	kicker="Payout"
	title={paying ? `Mark ${paying.name} as paid` : ''}
>
	{#if paying}
		<p class="text-[14px]">
			<b class="font-newsreader text-[20px]">{money(paying.payableCents)}</b> for {monthName(
				partner.month
			)}. Only record this once the money has been sent.
		</p>
		<label class="mt-4 block">
			<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>Reference</span
			>
			<input
				bind:value={reference}
				maxlength="200"
				placeholder="e.g. the transfer ID"
				class="mt-1.5 h-[40px] w-full border border-line2 bg-white px-2.5 text-[14px] focus:border-ink focus:ring-0"
			/>
		</label>
		<label class="mt-3 block">
			<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>Note (optional)</span
			>
			<textarea
				bind:value={note}
				rows="2"
				maxlength="2000"
				class="mt-1.5 w-full border border-line2 bg-white px-2.5 py-2 text-[14px] focus:border-ink focus:ring-0"
			></textarea>
		</label>
		{#if error}<p class="mt-3 text-[12.5px] text-hero-rb" role="alert">{error}</p>{/if}
	{/if}
	{#snippet footer()}
		<button
			type="button"
			onclick={() => (paying = null)}
			class="h-10 px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
			>Cancel</button
		>
		<button
			type="button"
			onclick={confirmPaid}
			disabled={busy}
			class="h-10 bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
			>{busy ? 'Saving…' : 'It’s been paid'}</button
		>
	{/snippet}
</DialogShell>
