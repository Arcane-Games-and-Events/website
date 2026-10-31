<!--
  EarningsPanel — a teacher's money, for all their courses or one: the next
  payout (date and amount), what's still on hold and when it's paid, what
  they've earned and been paid, and every sale.

  Props: earnings (teacherEarnings()), single (true on one course's page).
-->
<script>
	import { money, shortDate } from './format.js';

	/** @type {{ earnings: any, single?: boolean }} */
	let { earnings, single = false } = $props();
	const t = $derived(earnings.totals);
	const longDate = (d) =>
		new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	const STATUS = { paid: 'Paid', on_hold: 'On hold', payable: 'Payable' };
	const TONE = {
		paid: 'border-prem bg-prem text-white',
		on_hold: 'border-gold bg-gold/10 text-[#8a6116]',
		payable: 'border-ink text-ink'
	};
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
			<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-gold uppercase">
				{single ? 'From this course, next payout' : 'Next payout'}
			</p>
			<p class="mt-1.5 font-newsreader text-[38px] leading-none font-semibold tabular-nums">
				{money(earnings.next.cents)}
			</p>
			<p class="mt-2 text-[12.5px] text-paper-bg/70">
				{longDate(earnings.next.payDate)} · {earnings.next.sales}
				{earnings.next.sales === 1 ? 'sale' : 'sales'}
			</p>
		</div>
		{#each [['On hold', t.onHoldCents, `Sales from the last ${earnings.holdDays} days`], ['Earned', t.earnedCents, `${earnings.sharePct}% of ${money(t.grossCents - t.refundedCents)} in sales`], ['Paid to you', t.paidCents, single ? 'From this course' : 'All time']] as [label, cents, sub] (label)}
			<div class="bg-white px-5 py-5">
				<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{label}</p>
				<p class="mt-1.5 font-newsreader text-[28px] leading-none font-semibold tabular-nums">
					{money(cents)}
				</p>
				<p class="mt-2 text-[11.5px] text-fade">{sub}</p>
			</div>
		{/each}
	</div>

	<p class="max-w-[760px] text-[13px] leading-relaxed text-soft">
		You earn {earnings.sharePct}% of what each student pays. A sale is held for {earnings.holdDays}
		days (the refund window), then paid on the next payout. AGE pays every two weeks, on Fridays, outside
		the site; this page is for your information.
	</p>

	<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
		<section>
			{@render head('Sales', single ? '' : 'Newest first')}
			{#if earnings.sales.length}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[560px] text-left text-[13.5px]">
						<thead>
							<tr
								class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>
								<th class="py-2 pr-4 font-extrabold">Date</th>
								{#if !single}<th class="py-2 pr-4 font-extrabold">Course</th>{/if}
								<th class="py-2 pr-4 text-right font-extrabold">Paid</th>
								<th class="py-2 pr-4 text-right font-extrabold">You earn</th>
								<th class="py-2 font-extrabold">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-line">
							{#each earnings.sales as s (s.id)}
								<tr>
									<td class="py-2.5 pr-4 whitespace-nowrap">{shortDate(s.soldAt)}</td>
									{#if !single}<td class="max-w-[260px] truncate py-2.5 pr-4">{s.courseTitle}</td
										>{/if}
									<td class="py-2.5 pr-4 text-right tabular-nums">
										{money(s.grossCents)}
										{#if s.refundedCents}<span class="block text-[11px] text-hero-rb"
												>−{money(s.refundedCents)} refunded</span
											>{/if}
									</td>
									<td class="py-2.5 pr-4 text-right font-semibold tabular-nums"
										>{money(s.earnedCents)}</td
									>
									<td class="py-2.5 whitespace-nowrap">
										<span
											class="border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.12em] uppercase {TONE[
												s.status
											]}">{STATUS[s.status]}</span
										>
										{#if s.payDate}<span class="ml-1 text-[11.5px] text-fade"
												>{shortDate(`${s.payDate}T12:00:00Z`)}</span
											>{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="mt-4 text-[13.5px] text-soft">No sales yet.</p>
			{/if}
		</section>

		<aside class="space-y-10">
			<section>
				{@render head('Coming up')}
				{#if earnings.schedule.length}
					<ul class="divide-y divide-line">
						{#each earnings.schedule as p (p.payDate)}
							<li class="flex items-baseline justify-between gap-3 py-2.5">
								<span class="text-[13.5px]">{longDate(p.payDate)}</span>
								<span class="font-semibold tabular-nums">{money(p.cents)}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-4 text-[13.5px] text-soft">Nothing waiting to be paid.</p>
				{/if}
			</section>
			{#if !single}
				<section>
					{@render head('Payouts')}
					{#if earnings.payouts.length}
						<ul class="divide-y divide-line">
							{#each earnings.payouts as p (p.id)}
								<li class="py-2.5">
									<div class="flex items-baseline justify-between gap-3">
										<span class="text-[13.5px]">{shortDate(`${p.payDate}T12:00:00Z`)}</span>
										<span class="font-semibold tabular-nums">{money(p.amountCents)}</span>
									</div>
									<p class="text-[11.5px] text-fade">
										{p.saleCount}
										{p.saleCount === 1 ? 'sale' : 'sales'}{#if p.reference}&nbsp;· {p.reference}{/if}
									</p>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="mt-4 text-[13.5px] text-soft">No payouts yet.</p>
					{/if}
				</section>
				{#if earnings.courses.length > 1}
					<section>
						{@render head('By course')}
						<ul class="divide-y divide-line">
							{#each earnings.courses as c (c.courseId)}
								<li class="flex items-baseline justify-between gap-3 py-2.5">
									<span class="min-w-0 truncate text-[13.5px]">{c.title}</span>
									<span class="font-semibold tabular-nums">{money(c.earnedCents)}</span>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			{/if}
		</aside>
	</div>
</div>
