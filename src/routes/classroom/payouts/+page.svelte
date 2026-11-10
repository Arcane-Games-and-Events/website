<script>
	/**
	 * Classroom → Payouts (admins). AGE pays teachers outside the site, from
	 * monthly statements, on the first Monday of the next month. This shows
	 * what's still to be paid by pay date, each month's statements (see
	 * PartnerPayouts), every sale with where it stands, and every payout
	 * recorded.
	 */
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import { money, shortDate } from '$lib/desk/courses/format.js';
	import PartnerPayouts from '$lib/desk/courses/PartnerPayouts.svelte';
	import ExpectedPayouts from '$lib/desk/courses/ExpectedPayouts.svelte';
	import LedgerTable from '$lib/desk/courses/LedgerTable.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();
</script>

<svelte:head><title>Payouts · Classroom</title></svelte:head>

<DeskHeader
	title="Payouts"
	subtitle="Monthly statements under the AGE Partner terms, paid on the first Monday of the next month."
/>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-10 px-5 pt-8 pb-16 font-libre md:px-8">
	<a
		href="/classroom"
		class="block text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink"
		>← Courses</a
	>

	<section>
		<h2
			class="border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
		>
			Expected payouts
		</h2>
		<div class="mt-4"><ExpectedPayouts rows={data.expected} admin /></div>
	</section>

	<PartnerPayouts partner={data.partner} />

	<section>
		<h2
			class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
		>
			Every sale
			<span class="text-[11px] font-normal tracking-normal text-fade normal-case"
				>Newest first, pending ones included</span
			>
		</h2>
		<div class="mt-4"><LedgerTable rows={data.detail} admin /></div>
	</section>

	<section>
		<h2
			class="border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
		>
			Paid
		</h2>
		{#if data.history.length}
			<table class="w-full text-left text-[13.5px]">
				<thead>
					<tr
						class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						<th class="py-2 pr-4 font-extrabold">Pay date</th>
						<th class="py-2 pr-4 font-extrabold">Teacher</th>
						<th class="py-2 pr-4 text-right font-extrabold">Amount</th>
						<th class="py-2 pr-4 font-extrabold">Reference</th>
						<th class="py-2 font-extrabold">Recorded</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each data.history as p (p.id)}
						<tr>
							<td class="py-2.5 pr-4 whitespace-nowrap">{shortDate(`${p.payDate}T12:00:00Z`)}</td>
							<td class="py-2.5 pr-4">{p.teacher}</td>
							<td class="py-2.5 pr-4 text-right font-semibold tabular-nums"
								>{money(p.amountCents)}</td
							>
							<td class="max-w-[240px] truncate py-2.5 pr-4 text-soft">{p.reference || '—'}</td>
							<td class="py-2.5 whitespace-nowrap text-soft">{shortDate(p.paidAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="mt-4 text-[13.5px] text-soft">No payouts recorded yet.</p>
		{/if}
	</section>
</div>
