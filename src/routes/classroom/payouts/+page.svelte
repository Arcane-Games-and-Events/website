<script>
	/**
	 * Classroom → Payouts (admins). Teachers are paid every two weeks, outside the
	 * site. This shows what each teacher is owed on a pay date (every unpaid
	 * sale past its 14-day hold) and records a payout once it's sent.
	 */
	import { goto, invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import { money, shortDate } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let paying = $state(/** @type {any} */ (null));
	let reference = $state('');
	let note = $state('');
	let busy = $state(false);
	let error = $state('');

	const longDate = (d) =>
		new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	const total = $derived(data.due.reduce((n, t) => n + t.cents, 0));

	function open(t) {
		paying = t;
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
			body: JSON.stringify({ teacherId: paying.teacherId, payDate: data.payDate, reference, note })
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

<svelte:head><title>Payouts · Classroom</title></svelte:head>

<DeskHeader title="Payouts" subtitle="Teachers earn 90% of each sale, paid every two weeks." />
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-10 px-5 pt-8 pb-16 font-libre md:px-8">
	<a
		href="/classroom"
		class="block text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink"
		>← Courses</a
	>

	<section>
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
			<div>
				<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">Pay date</p>
				<p class="mt-1 font-newsreader text-[24px] leading-tight font-semibold">
					{longDate(data.payDate)}
				</p>
			</div>
			<label class="flex items-center gap-2 text-[12.5px] text-soft">
				Show
				<select
					value={data.payDate}
					onchange={(e) => goto(`?date=${e.currentTarget.value}`)}
					class="h-[38px] border border-line2 bg-white px-2.5 pr-8 text-[13.5px] focus:border-ink focus:ring-0"
				>
					{#each data.dates as d (d)}<option value={d}
							>{shortDate(`${d}T12:00:00Z`)}{d === data.next ? ' (next)' : ''}</option
						>{/each}
				</select>
			</label>
		</div>

		{#if data.due.length}
			<table class="mt-2 w-full text-left text-[14px]">
				<thead>
					<tr
						class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						<th class="py-2 pr-4 font-extrabold">Teacher</th>
						<th class="py-2 pr-4 text-right font-extrabold">Sales</th>
						<th class="py-2 pr-4 text-right font-extrabold">Owed</th>
						<th class="py-2"><span class="sr-only">Action</span></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each data.due as t (t.teacherId)}
						<tr>
							<td class="py-3 pr-4">
								<p class="font-semibold">
									{t.name}
									{#if t.overdue}<span
											class="ml-1 bg-hero-rb px-1 align-[1px] text-[8px] font-extrabold tracking-[0.14em] text-white uppercase"
											>Includes missed</span
										>{/if}
								</p>
								<p class="text-[12px] text-fade">{t.email}</p>
							</td>
							<td class="py-3 pr-4 text-right tabular-nums">{t.sales}</td>
							<td
								class="py-3 pr-4 text-right font-newsreader text-[19px] font-semibold tabular-nums"
								>{money(t.cents)}</td
							>
							<td class="py-3 text-right">
								<button
									type="button"
									onclick={() => open(t)}
									class="bg-ink px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm"
									>Mark paid</button
								>
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="border-t-[3px] border-double border-ink">
						<td class="py-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase" colspan="2"
							>Total to pay</td
						>
						<td class="py-3 pr-4 text-right font-newsreader text-[19px] font-semibold tabular-nums"
							>{money(total)}</td
						>
						<td></td>
					</tr>
				</tfoot>
			</table>
		{:else}
			<p class="mt-6 text-[14px] text-soft">Nobody is owed anything on this date.</p>
		{/if}
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
						<tr class={data.openPayout === p.id ? 'bg-white' : ''}>
							<td class="py-2.5 pr-4 whitespace-nowrap">
								<a href="?payout={p.id}" class="underline-offset-2 hover:underline"
									>{shortDate(`${p.payDate}T12:00:00Z`)}</a
								>
							</td>
							<td class="py-2.5 pr-4">{p.teacher}</td>
							<td class="py-2.5 pr-4 text-right font-semibold tabular-nums"
								>{money(p.amountCents)}</td
							>
							<td class="max-w-[240px] truncate py-2.5 pr-4 text-soft">{p.reference || '—'}</td>
							<td class="py-2.5 whitespace-nowrap text-soft">{shortDate(p.paidAt)}</td>
						</tr>
						{#if data.openPayout === p.id}
							<tr class="bg-white">
								<td colspan="5" class="px-4 pb-4">
									{#if p.note}<p class="mb-2 text-[12.5px] text-soft">{p.note}</p>{/if}
									<ul class="divide-y divide-line border border-line">
										{#each data.openSales as s (s.id)}
											<li class="flex justify-between gap-3 px-3 py-2 text-[12.5px]">
												<span>{shortDate(s.soldAt)} · {s.courseTitle}</span>
												<span class="tabular-nums"
													>{money(s.grossCents - s.refundedCents)} → {money(
														Math.round(((s.grossCents - s.refundedCents) * s.sharePct) / 100)
													)}</span
												>
											</li>
										{/each}
									</ul>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="mt-4 text-[13.5px] text-soft">No payouts recorded yet.</p>
		{/if}
	</section>
</div>

<DialogShell
	open={!!paying}
	onclose={() => (paying = null)}
	kicker="Payout"
	title={paying ? `Mark ${paying.name} as paid` : ''}
>
	{#if paying}
		<p class="text-[14px]">
			<b class="font-newsreader text-[20px]">{money(paying.cents)}</b> for {paying.sales}
			{paying.sales === 1 ? 'sale' : 'sales'}, pay date {longDate(data.payDate)}. Only record this
			once the money has been sent.
		</p>
		<label class="mt-4 block">
			<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>Reference (optional)</span
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
