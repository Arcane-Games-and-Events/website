<!--
  LedgerTable — every sale, referral bonus, pool share and deduction, newest
  first, each with where it stands (on hold, waiting for the payment to
  settle, on this
  month's statement, due, paid, refunded) and the date it's paid. Filter by
  status, and by teacher for admins. The first 50 rows show; the rest on
  request. A sale can be refunded from here: by admins any time, by the
  teacher within the refund window (refundable).

  Props: rows (ledgerDetail()), admin (adds the teacher, what the buyer paid
  and AGE's net), refundable (show the Refund action)
-->
<script>
	import { invalidateAll } from '$app/navigation';
	import { money, shortDate } from './format.js';
	import { withinRequestWindow } from '$lib/academy/partner/refundPolicy.js';

	/** @type {{ rows: any[], admin?: boolean, refundable?: boolean }} */
	let { rows, admin = false, refundable = false } = $props();

	// Refunding a sale: the row opens a confirm line with an optional note.
	let refunding = $state('');
	let refundNote = $state('');
	let refundBusy = $state(false);
	let refundError = $state('');
	let refundDone = $state('');
	const canRefund = (r) =>
		refundable &&
		r.entryType === 'sale' &&
		r.checkoutItemId &&
		r.status !== 'refunded' &&
		r.status !== 'charged_back' &&
		(admin || withinRequestWindow(r.occurredAt));
	async function refund(r) {
		if (refundBusy) return;
		refundBusy = true;
		refundError = '';
		const res = await fetch('/api/academy/refunds/staff', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ itemId: r.checkoutItemId, note: refundNote || null })
		});
		const body = await res.json().catch(() => ({}));
		refundBusy = false;
		if (!res.ok) {
			refundError = body.error || 'The refund didn’t go through.';
			return;
		}
		refundDone =
			body.request.refundStatus === 'refunded'
				? `Refunded ${r.courseTitle}. The buyer sees it on their purchase.`
				: `Refund of ${r.courseTitle} started; it completes once the charge settles.`;
		refunding = '';
		refundNote = '';
		await invalidateAll();
	}

	const STATUS = {
		on_hold: ['On hold', 'border-gold bg-gold/10 text-[#8a6116]'],
		this_month: ['This month', 'border-line2 text-soft'],
		due: ['Due', 'border-ink text-ink'],
		paid: ['Paid', 'border-prem bg-prem text-white'],
		refunded: ['Refunded', 'border-hero-rb text-hero-rb'],
		charged_back: ['Charged back', 'border-hero-rb text-hero-rb']
	};
	const KIND = {
		sale: 'Sale',
		reversal: 'Refund',
		referral_bonus: 'Referral bonus',
		pool_share: 'Teacher pool',
		adjustment: 'Adjustment'
	};
	const FILTERS = [
		['all', 'All'],
		['upcoming', 'Not yet paid'],
		['on_hold', 'On hold'],
		['paid', 'Paid'],
		['refunded', 'Refunds']
	];
	let filter = $state('all');
	let teacher = $state('');
	let showAll = $state(false);

	const teachers = $derived(
		admin
			? [...new Map(rows.map((r) => [r.teacherId, r.teacher || r.teacherId])).entries()].sort(
					(a, b) => String(a[1]).localeCompare(String(b[1]))
				)
			: []
	);
	const shown = $derived(
		rows.filter((r) => {
			if (teacher && r.teacherId !== teacher) return false;
			if (filter === 'upcoming') return ['on_hold', 'this_month', 'due'].includes(r.status);
			if (filter === 'refunded')
				return r.entryType === 'reversal' || r.status === 'refunded' || r.status === 'charged_back';
			return filter === 'all' || r.status === filter;
		})
	);
	const total = $derived(shown.reduce((n, r) => n + r.countsCents, 0));
	const pct = (r) => (r ? `${Math.round(Number(r) * 100)}%` : '');
	const payLabel = (r) =>
		r.status === 'refunded' || r.status === 'charged_back'
			? '—'
			: r.status === 'paid'
				? `Paid ${shortDate(`${r.payDate}T12:00:00Z`)}`
				: shortDate(`${r.payDate}T12:00:00Z`);
</script>

<div class="flex flex-wrap items-center gap-2">
	<div
		class="inline-flex flex-wrap gap-px border border-line2 bg-line2"
		role="tablist"
		aria-label="Show"
	>
		{#each FILTERS as [k, l] (k)}
			<button
				type="button"
				role="tab"
				aria-selected={filter === k}
				onclick={() => (filter = k)}
				class="px-3 py-1.5 text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {filter ===
				k
					? 'bg-ink text-paper-bg'
					: 'bg-paper-bg text-soft hover:text-ink'}">{l}</button
			>
		{/each}
	</div>
	{#if admin && teachers.length > 1}
		<select
			bind:value={teacher}
			aria-label="Teacher"
			class="h-[34px] border border-line2 bg-white py-1 pr-8 pl-2.5 text-[12.5px] leading-tight focus:border-ink focus:ring-0"
		>
			<option value="">Every teacher</option>
			{#each teachers as [id, name] (id)}<option value={id}>{name}</option>{/each}
		</select>
	{/if}
	<p class="ml-auto text-[12px] text-fade tabular-nums">
		{shown.length}
		{shown.length === 1 ? 'entry' : 'entries'} · {admin ? 'teachers earn' : 'you earn'}
		<span class="font-semibold text-ink">{money(total)}</span>
	</p>
</div>

{#if refundDone}<p class="mt-3 text-[12.5px] font-semibold text-prem" role="status">
		{refundDone}
	</p>{/if}
{#if shown.length}
	<div class="mt-3 overflow-x-auto">
		<table class="w-full {admin ? 'min-w-[960px]' : 'min-w-[760px]'} text-left text-[13px]">
			<thead>
				<tr
					class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
				>
					<th class="py-2 pr-4 font-extrabold">Date</th>
					<th class="py-2 pr-4 font-extrabold">What</th>
					{#if admin}<th class="py-2 pr-4 font-extrabold">Teacher</th>{/if}
					<th class="py-2 pr-4 text-right font-extrabold">{admin ? 'Buyer paid' : 'List price'}</th>
					<th class="py-2 pr-4 text-right font-extrabold">{admin ? 'Teacher' : 'You earn'}</th>
					{#if admin}<th class="py-2 pr-4 text-right font-extrabold">AGE net</th>{/if}
					<th class="py-2 pr-4 font-extrabold">Status</th>
					<th class="py-2 font-extrabold">Pay date</th>
					{#if refundable}<th class="py-2"><span class="sr-only">Refund</span></th>{/if}
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each showAll ? shown : shown.slice(0, 50) as r (r.id)}
					<tr>
						<td class="py-2 pr-4 whitespace-nowrap text-fade">{shortDate(r.occurredAt)}</td>
						<td class="py-2 pr-4">
							<span class="font-semibold">{KIND[r.entryType] || r.entryType}</span>
							{#if r.courseTitle}· {r.courseTitle}{/if}
							<span class="block text-[11.5px] text-fade">
								{#if r.entryType === 'sale'}
									{r.buyerType === 'member' ? 'Premium member' : 'Non-member'} · {pct(
										r.shareRate
									)}{r.copyNumber ? ` · copy #${r.copyNumber.toLocaleString()}` : ''}
								{:else if r.note}{r.note}{/if}
							</span>
						</td>
						{#if admin}<td class="py-2 pr-4 whitespace-nowrap">{r.teacher || '—'}</td>{/if}
						<td class="py-2 pr-4 text-right text-soft tabular-nums">
							{admin
								? r.buyerPaidCents
									? money(r.buyerPaidCents)
									: ''
								: r.listCents
									? money(r.listCents)
									: ''}
						</td>
						<td
							class="py-2 pr-4 text-right font-semibold tabular-nums {r.teacherCents < 0
								? 'text-hero-rb'
								: ''} {r.countsCents === 0 && r.teacherCents !== 0 ? 'text-fade line-through' : ''}"
						>
							{money(r.teacherCents)}
						</td>
						{#if admin}<td class="py-2 pr-4 text-right text-soft tabular-nums"
								>{money(r.ageNetCents)}</td
							>{/if}
						<td class="py-2 pr-4">
							<span
								class="border px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase {STATUS[
									r.status
								]?.[1] || 'border-line2 text-soft'}">{STATUS[r.status]?.[0] || r.status}</span
							>
							{#if r.awaitingBank}
								<span class="mt-0.5 block text-[10.5px] text-fade">waiting for Authorize.net</span>
							{:else if r.status === 'on_hold'}
								<span class="mt-0.5 block text-[10.5px] text-fade"
									>until {shortDate(r.payableAt)}</span
								>
							{/if}
						</td>
						<td class="py-2 whitespace-nowrap text-soft">{payLabel(r)}</td>
						{#if refundable}
							<td class="py-2 pl-3 text-right">
								{#if canRefund(r) && refunding !== r.id}
									<button
										type="button"
										onclick={() => {
											refunding = r.id;
											refundError = '';
											refundDone = '';
										}}
										class="text-[9.5px] font-extrabold tracking-[0.14em] whitespace-nowrap text-fade uppercase hover:text-hero-rb"
										>Refund</button
									>
								{/if}
							</td>
						{/if}
					</tr>
					{#if refunding === r.id}
						<tr class="bg-paper">
							<td colspan="10" class="px-3 py-3">
								<div class="flex flex-wrap items-center gap-2">
									<span class="text-[12.5px]">
										Refund <b>{r.courseTitle}</b>: {money(r.buyerPaidCents)} back to the buyer, and it
										comes off {admin ? 'the teacher’s' : 'your'} next statement.
									</span>
									<input
										bind:value={refundNote}
										maxlength="500"
										placeholder="Why (optional, the buyer sees it)"
										class="h-[34px] min-w-[220px] flex-1 border border-line2 bg-white px-2.5 text-[13px] focus:border-ink focus:ring-0"
									/>
									<button
										type="button"
										onclick={() => refund(r)}
										disabled={refundBusy}
										class="h-[34px] bg-hero-rb px-4 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase hover:brightness-110 disabled:opacity-60"
										>{refundBusy ? 'Refunding…' : 'Refund'}</button
									>
									<button
										type="button"
										onclick={() => (refunding = '')}
										class="h-[34px] px-3 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
										>Cancel</button
									>
								</div>
								{#if refundError}<p class="mt-2 text-[12.5px] text-hero-rb" role="alert">
										{refundError}
									</p>{/if}
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
	{#if !showAll && shown.length > 50}
		<button
			type="button"
			onclick={() => (showAll = true)}
			class="mt-3 border border-ink px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:bg-ink hover:text-paper-bg"
			>Show all {shown.length}</button
		>
	{/if}
{:else}
	<p class="py-6 text-[13.5px] text-fade">Nothing here yet.</p>
{/if}
