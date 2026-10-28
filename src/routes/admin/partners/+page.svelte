<script>
	let { data } = $props();

	const partners = $derived(data.partners || []);
	const totals = $derived(
		data.totals || {
			totalReferrals: 0,
			totalPending: 0,
			totalPaid: 0,
			readyToPayAmount: 0,
			readyToPayCount: 0
		}
	);

	function fmt(amount) {
		const n = Number(amount || 0);
		return `$${n.toFixed(2)}`;
	}

	function fmtDate(d) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head><title>Partners · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase">
			Partners
		</span>
		<span class="hidden h-[1px] flex-1 bg-line2 md:block"></span>
		<a
			href="/admin/partners/new"
			class="inline-flex items-center bg-ink px-[14px] py-[9px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125"
		>
			+ New Partner
		</a>
	</div>
	<h1
		class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
	>
		AGE Partners.
	</h1>
	<p class="mt-3 max-w-[680px] font-newsreader text-[19px] leading-[1.42] text-soft italic">
		Partner accounts, promo codes, and commission payouts.
	</p>
</header>

{#if totals.readyToPayCount > 0}
	<section class="mx-auto w-full max-w-[1600px] overflow-x-clip px-4 pb-[18px] md:px-10 lg:px-14">
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-[1.5px] border-ink bg-prem p-4 text-white"
		>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
					style="color: #d6eedf;"
				>
					Payout Due
				</span>
				<p class="mt-[2px] font-newsreader text-[18px] font-semibold">
					{totals.readyToPayCount} referral{totals.readyToPayCount === 1 ? '' : 's'} ready to pay ·
					{fmt(totals.readyToPayAmount)}
				</p>
			</div>
			<span
				class="font-mono-system text-[10px] font-bold tracking-[0.1em] uppercase"
				style="color: #d6eedf;"
			>
				Payout date (created + 30d) has passed.
			</span>
		</div>
	</section>
{/if}

<!-- ============ TOTALS ============ -->
<section class="overflow-x-clip border-y-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[28px] md:px-10 lg:px-14">
		<div class="grid grid-cols-2 gap-x-[24px] gap-y-[22px] md:grid-cols-4">
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					Total Referrals
				</span>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{totals.totalReferrals}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					Pending Payout
				</span>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-warm"
				>
					{fmt(totals.totalPending)}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					Ready to Pay
				</span>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-accent"
				>
					{fmt(totals.readyToPayAmount)}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					Total Paid Out
				</span>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-prem"
				>
					{fmt(totals.totalPaid)}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ============ PARTNERS TABLE ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
		{#if partners.length === 0}
			<div class="overflow-hidden border-[1.5px] border-ink p-8 text-center">
				<p class="font-newsreader text-[19px] text-soft italic">
					No partners yet. <a
						href="/admin/partners/new"
						class="text-warm underline underline-offset-2 hover:text-ink"
					>
						Create the first one
					</a>.
				</p>
			</div>
		{:else}
			<div class="overflow-x-auto border-[1.5px] border-ink">
				<table class="w-full min-w-[900px]">
					<thead class="border-b-[1.5px] border-ink">
						<tr class="text-left">
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Partner</th
							>
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Code</th
							>
							<th
								class="px-4 py-[12px] text-right font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Referrals</th
							>
							<th
								class="px-4 py-[12px] text-right font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Pending</th
							>
							<th
								class="px-4 py-[12px] text-right font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Paid</th
							>
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Status</th
							>
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Created</th
							>
							<th class="px-4 py-[12px] font-mono-system"></th>
						</tr>
					</thead>
					<tbody>
						{#each partners as p (p.id)}
							<tr class="border-b border-line2 transition-colors hover:bg-panel">
								<td class="px-4 py-[14px]">
									<div class="font-newsreader text-[16px] font-semibold">
										{p.firstName}
										{p.lastName}
									</div>
									{#if p.displayName}
										<div
											class="mt-[2px] font-mono-system text-[10px] font-bold tracking-[0.06em] text-warm uppercase"
										>
											as "{p.displayName}"
										</div>
									{/if}
									<div class="mt-[2px] text-[12px] text-fade">{p.email}</div>
								</td>
								<td class="px-4 py-[14px]">
									<code
										class="inline-block border border-line2 bg-panel px-[8px] py-[4px] font-mono-system text-[11px] font-bold tracking-[0.06em] text-warm"
									>
										{p.code}
									</code>
								</td>
								<td
									class="px-4 py-[14px] text-right font-archivo text-[16px] font-extrabold tracking-[-0.01em] text-ink"
								>
									{p.referralCount}
								</td>
								<td class="px-4 py-[14px] text-right">
									<div class="font-archivo text-[15px] font-extrabold tracking-[-0.01em] text-warm">
										{fmt(p.pendingCommission)}
									</div>
									{#if Number(p.readyToPayAmount) > 0}
										<div
											class="mt-[2px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-accent uppercase"
										>
											{fmt(p.readyToPayAmount)} ready
										</div>
									{/if}
								</td>
								<td
									class="px-4 py-[14px] text-right font-archivo text-[15px] font-extrabold tracking-[-0.01em] text-prem"
								>
									{fmt(p.paidCommission)}
								</td>
								<td class="px-4 py-[14px]">
									{#if p.isActive}
										<span
											class="inline-flex items-center bg-prem px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
										>
											Active
										</span>
									{:else}
										<span
											class="inline-flex items-center border border-line2 px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-fade uppercase"
										>
											Inactive
										</span>
									{/if}
								</td>
								<td
									class="px-4 py-[14px] font-mono-system text-[10.5px] font-bold tracking-[0.06em] text-fade uppercase"
								>
									{fmtDate(p.createdAt)}
								</td>
								<td class="px-4 py-[14px] text-right">
									<a
										href="/admin/partners/{p.id}"
										class="font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] text-warm uppercase transition-colors hover:text-ink"
									>
										Manage →
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
