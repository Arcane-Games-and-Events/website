<!--
  PartnerEarnings — a teacher's money under the AGE Partner terms: their
  level, lifetime copies and how far the next level is, their monthly
  statements (paid on the first Monday of the next month), their referral
  link and code, and every recent ledger row.

  Props: partner (teacherStatements() plus code, link, referrals, expected
  (expectedPayouts()) and detail (ledgerDetail()))
-->
<script>
	import { money } from './format.js';
	import ExpectedPayouts from './ExpectedPayouts.svelte';
	import LedgerTable from './LedgerTable.svelte';
	import { HOLD_DAYS, LEVELS, REFERRAL_BONUS_CENTS } from '$lib/academy/partner/terms.js';

	/** @type {{ partner: any }} */
	let { partner } = $props();
	const st = $derived(partner.standing);
	const pctOf = (r) => `${Math.round(Number(r) * 100)}%`;
	const monthName = (m) =>
		new Date(`${m}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	const longDate = (d) =>
		new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	// The progress bar toward the next level.
	const progress = $derived(
		st.next
			? Math.round(((st.lifetimeCopies - st.level.from) / (st.next.from - st.level.from)) * 100)
			: 100
	);
	let copied = $state(false);
	async function copy(text) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			/* the link is on screen to copy by hand */
		}
	}
</script>

{#snippet head(title, note = '')}
	<div class="flex items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5">
		<h2 class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">{title}</h2>
		{#if note}<p class="text-[11.5px] text-fade">{note}</p>{/if}
	</div>
{/snippet}

<div class="space-y-10">
	<div class="grid gap-px border border-line2 bg-line2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
		<div class="bg-ink px-6 py-5 text-paper-bg">
			<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-gold uppercase">Your level</p>
			<p class="mt-1.5 font-newsreader text-[38px] leading-none font-semibold">{st.level.name}</p>
			<p class="mt-2 text-[12.5px] text-paper-bg/70 tabular-nums">
				{st.lifetimeCopies.toLocaleString()} lifetime
				{st.lifetimeCopies === 1 ? 'copy' : 'copies'} ·
				{#if st.next}
					{st.copiesToNext.toLocaleString()} to {st.next.name}
				{:else}
					the top level
				{/if}
			</p>
			<div class="mt-3 h-[5px] bg-paper-bg/15" aria-hidden="true">
				<div class="h-full bg-gold" style="width: {progress}%"></div>
			</div>
		</div>
		{#each [['Due to you', partner.totals.dueCents, 'Months ended, not yet paid'], ['This month so far', partner.totals.openCents, 'Paid after the month ends'], ['Paid to you', partner.totals.paidCents, 'All time']] as [label, cents, sub] (label)}
			<div class="bg-white px-5 py-5">
				<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{label}</p>
				<p class="mt-1.5 font-newsreader text-[28px] leading-none font-semibold tabular-nums">
					{money(cents)}
				</p>
				<p class="mt-2 text-[11.5px] text-fade">{sub}</p>
			</div>
		{/each}
	</div>

	<div class="max-w-[820px] space-y-2 text-[13px] leading-relaxed text-soft">
		<p>
			Keep 90% of every sale (up to 95% as you reach Senior and Elite levels), no monthly fee,
			{money(REFERRAL_BONUS_CENTS)} for every Premium member you refer, free updates for all your buyers,
			and promotion across AGE.
		</p>
		<p>
			{#each LEVELS as l, i (l.key)}<span class="font-semibold text-ink">{l.name}</span>
				{l.from ? `from ${l.from.toLocaleString()} copies` : 'to start'}: {pctOf(l.share)}{i <
				LEVELS.length - 1
					? ' · '
					: ''}{/each}. Senior and Elite rates apply to non-member sales; sales to Premium members
			pay 90% at every level, always on your full list price. A sale is held {HOLD_DAYS} days, and until
			Authorize.net confirms the payment went through, then lands on that month’s statement, paid on
			the first Monday of the next month. A refund after that comes off your next statement.
		</p>
		<p>
			Refunds follow AGE’s <a href="/refund-policy" class="underline">guide refund policy</a>.
			Refunded sales are deducted from your next payout and don’t count toward your lifetime copies.
			You can approve refunds for your own guides; AGE handles duplicate charges, technical problems
			and chargebacks.
		</p>
	</div>

	<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
		<section class="space-y-10">
			<div>
				{@render head('Statements', 'Newest first')}
				{#if partner.statements.length}
					<div class="overflow-x-auto">
						<table class="w-full min-w-[620px] text-left text-[13.5px]">
							<thead>
								<tr
									class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>
									<th class="py-2 pr-4 font-extrabold">Month</th>
									<th class="py-2 pr-4 text-right font-extrabold">Sales</th>
									<th class="py-2 pr-4 text-right font-extrabold">Bonuses</th>
									<th class="py-2 pr-4 text-right font-extrabold">Refunds</th>
									<th class="py-2 pr-4 text-right font-extrabold">Net</th>
									<th class="py-2 font-extrabold">Status</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-line">
								{#each partner.statements as s (s.month)}
									<tr>
										<td class="py-2.5 pr-4">
											<p class="font-semibold">{monthName(s.month)}</p>
											<p class="text-[11.5px] text-fade">Pay date {longDate(s.payDate)}</p>
										</td>
										<td class="py-2.5 pr-4 text-right tabular-nums">{money(s.salesCents)}</td>
										<td class="py-2.5 pr-4 text-right tabular-nums"
											>{money(s.referralCents + s.poolCents)}</td
										>
										<td class="py-2.5 pr-4 text-right tabular-nums"
											>{s.deductedCents + s.carriedCents
												? money(s.deductedCents + s.carriedCents)
												: '—'}</td
										>
										<td
											class="py-2.5 pr-4 text-right font-newsreader text-[17px] font-semibold tabular-nums"
											>{money(s.payableCents)}</td
										>
										<td class="py-2.5">
											<span
												class="border px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-[0.14em] uppercase {s.status ===
												'paid'
													? 'border-prem bg-prem text-white'
													: s.open
														? 'border-line2 text-fade'
														: 'border-gold bg-gold/10 text-[#8a6116]'}"
												>{s.status === 'paid' ? 'Paid' : s.open ? 'In progress' : 'Due'}</span
											>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="py-6 text-[13.5px] text-fade">
						No sales yet. Your statements will appear here.
					</p>
				{/if}
			</div>
		</section>

		<aside class="space-y-8">
			<div class="border-[3px] border-double border-ink p-5">
				<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase">
					Refer Premium members
				</p>
				<p class="mt-2 text-[13px] leading-relaxed text-soft">
					Earn {money(REFERRAL_BONUS_CENTS)} for every new Premium member who joins through your link
					(within 30 days of clicking it) or uses your code. New members get money off their first month
					too.
				</p>
				{#if partner.code}
					<p class="mt-4 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase">
						Your link
					</p>
					<button
						type="button"
						onclick={() => copy(partner.link)}
						class="mt-1 block w-full truncate border border-line2 bg-white px-3 py-2 text-left font-mono-system text-[12px] hover:border-ink"
						title="Copy">{partner.link}</button
					>
					<p class="mt-3 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase">
						Your code
					</p>
					<p class="mt-1 font-mono-system text-[18px] font-bold tracking-[0.08em]">
						{partner.code}
					</p>
					<p class="mt-2 h-4 text-[11.5px] text-prem" role="status">
						{copied ? 'Link copied.' : ''}
					</p>
				{/if}
				<p class="mt-2 text-[12px] text-fade">
					{partner.referrals.filter((r) => r.status === 'bonus_recorded').length} paid ·
					{partner.referrals.filter((r) => r.status === 'pending').length} waiting out the member’s refund
					window
				</p>
			</div>
		</aside>
	</div>

	<section>
		{@render head('Expected payouts', 'By pay date')}
		<div class="mt-4"><ExpectedPayouts rows={partner.expected} /></div>
	</section>

	<section>
		{@render head('Every sale', 'Newest first, pending ones included')}
		<div class="mt-4"><LedgerTable rows={partner.detail} /></div>
		<p class="mt-3 text-[12px] text-fade">
			Refund requests, and refunding a sale yourself, are on
			<a href="/classroom/refunds" class="underline">Refunds</a>.
		</p>
	</section>
</div>
