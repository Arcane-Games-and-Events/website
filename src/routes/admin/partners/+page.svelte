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
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Partners
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<a
			href="/admin/partners/new"
			class="bg-ink font-mono-system inline-flex items-center px-[14px] py-[9px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
		>
			+ New Partner
		</a>
	</div>
	<h1
		class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
	>
		AGE Partners.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Partner accounts, promo codes, and commission payouts.
	</p>
</header>

{#if totals.readyToPayCount > 0}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[18px] overflow-x-clip">
		<div class="border-ink bg-prem flex flex-wrap items-center justify-between gap-3 border-[1.5px] p-4 text-white">
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
					style="color: #d6eedf;"
				>
					Payout Due
				</span>
				<p class="font-newsreader mt-[2px] text-[18px] font-semibold">
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
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[28px]">
		<div class="grid grid-cols-2 gap-x-[24px] gap-y-[22px] md:grid-cols-4">
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Total Referrals
				</span>
				<div class="font-archivo text-ink mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{totals.totalReferrals}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Pending Payout
				</span>
				<div class="font-archivo text-warm mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{fmt(totals.totalPending)}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Ready to Pay
				</span>
				<div class="font-archivo text-accent mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{fmt(totals.readyToPayAmount)}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Total Paid Out
				</span>
				<div class="font-archivo text-prem mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{fmt(totals.totalPaid)}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ============ PARTNERS TABLE ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		{#if partners.length === 0}
			<div class="border-ink border-[1.5px] p-8 text-center overflow-hidden">
				<p class="font-newsreader text-soft text-[19px] italic">
					No partners yet. <a
						href="/admin/partners/new"
						class="text-warm hover:text-ink underline underline-offset-2"
					>
						Create the first one
					</a>.
				</p>
			</div>
		{:else}
			<div class="border-ink border-[1.5px] overflow-x-auto">
				<table class="w-full min-w-[900px]">
					<thead class="border-ink border-b-[1.5px]">
						<tr class="text-left">
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Partner</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Code</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Referrals</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Pending</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Paid</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Status</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Created</th>
							<th class="font-mono-system px-4 py-[12px]"></th>
						</tr>
					</thead>
					<tbody>
						{#each partners as p (p.id)}
							<tr class="border-line2 hover:bg-panel border-b transition-colors">
								<td class="px-4 py-[14px]">
									<div class="font-newsreader text-[16px] font-semibold">
										{p.firstName} {p.lastName}
									</div>
									{#if p.displayName}
										<div class="font-mono-system text-warm mt-[2px] text-[10px] font-bold tracking-[0.06em] uppercase">
											as "{p.displayName}"
										</div>
									{/if}
									<div class="text-fade mt-[2px] text-[12px]">{p.email}</div>
								</td>
								<td class="px-4 py-[14px]">
									<code class="font-mono-system border-line2 text-warm inline-block border bg-panel px-[8px] py-[4px] text-[11px] font-bold tracking-[0.06em]">
										{p.code}
									</code>
								</td>
								<td class="font-archivo text-ink px-4 py-[14px] text-right text-[16px] font-extrabold tracking-[-0.01em]">
									{p.referralCount}
								</td>
								<td class="px-4 py-[14px] text-right">
									<div class="font-archivo text-warm text-[15px] font-extrabold tracking-[-0.01em]">
										{fmt(p.pendingCommission)}
									</div>
									{#if Number(p.readyToPayAmount) > 0}
										<div class="font-mono-system text-accent mt-[2px] text-[10px] font-bold tracking-[0.08em] uppercase">
											{fmt(p.readyToPayAmount)} ready
										</div>
									{/if}
								</td>
								<td class="font-archivo text-prem px-4 py-[14px] text-right text-[15px] font-extrabold tracking-[-0.01em]">
									{fmt(p.paidCommission)}
								</td>
								<td class="px-4 py-[14px]">
									{#if p.isActive}
										<span class="font-mono-system bg-prem inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
											Active
										</span>
									{:else}
										<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase">
											Inactive
										</span>
									{/if}
								</td>
								<td class="font-mono-system text-fade px-4 py-[14px] text-[10.5px] font-bold tracking-[0.06em] uppercase">
									{fmtDate(p.createdAt)}
								</td>
								<td class="px-4 py-[14px] text-right">
									<a
										href="/admin/partners/{p.id}"
										class="font-mono-system text-warm hover:text-ink text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
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
