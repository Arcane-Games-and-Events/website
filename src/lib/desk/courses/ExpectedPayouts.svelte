<!--
  ExpectedPayouts — what's still to be paid, by pay date: each unpaid
  monthly statement (this month's as it stands so far) with how much of it
  is still on hold (its hold, or waiting for the payment to settle).

  Props: rows (expectedPayouts()), admin (shows how many teachers)
-->
<script>
	import { money } from './format.js';

	/** @type {{ rows: any[], admin?: boolean }} */
	let { rows, admin = false } = $props();
	const monthName = (m) =>
		new Date(`${m}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	const longDate = (d) =>
		new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	const total = $derived(rows.reduce((n, r) => n + r.cents, 0));
</script>

{#if rows.length}
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		{#each rows as r (r.payDate)}
			<div class="border border-line2 bg-white px-5 py-4">
				<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
					{longDate(r.payDate)}
				</p>
				<p class="mt-1.5 font-newsreader text-[26px] leading-none font-semibold tabular-nums">
					{money(r.cents)}
				</p>
				<p class="mt-2 text-[11.5px] leading-snug text-fade">
					{monthName(r.month)} statement · {r.due ? 'month ended, due' : 'month in progress'}{admin
						? ` · ${r.teachers} ${r.teachers === 1 ? 'teacher' : 'teachers'}`
						: ''}
				</p>
				{#if r.onHoldCents > 0}
					<p class="mt-1 text-[11.5px] text-[#8a6116]">
						{money(r.onHoldCents)} still on hold
					</p>
				{/if}
			</div>
		{/each}
	</div>
	<p class="mt-2 text-[12px] text-fade">
		{money(total)} to come in all. Sales on hold are waiting out their hold or for Authorize.net to confirm
		the payment, and this month's figure grows until the month ends.
	</p>
{:else}
	<p class="py-4 text-[13.5px] text-fade">Nothing waiting to be paid.</p>
{/if}
