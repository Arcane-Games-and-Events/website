<script>
	export let data;

	$: partners = data.partners || [];
	$: totals = data.totals || { totalReferrals: 0, totalPending: 0, totalPaid: 0 };

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

<svelte:head>
	<title>Partners - Admin</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">AGE Partners</h1>
			<p class="mt-1 text-sm text-gray-400">
				Manage partner accounts, promo codes, and commission payouts.
			</p>
		</div>
		<a
			href="/admin/partners/new"
			class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
		>
			+ New Partner
		</a>
	</div>

	<!-- Ready to pay alert -->
	{#if totals.readyToPayCount > 0}
		<div
			class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/40 bg-blue-500/10 p-4"
		>
			<div>
				<p class="text-sm font-semibold text-blue-300">
					{totals.readyToPayCount} referral{totals.readyToPayCount === 1 ? '' : 's'} ready to pay
				</p>
				<p class="text-xs text-blue-200/70">
					Total due: <span class="font-semibold text-white">{fmt(totals.readyToPayAmount)}</span>
					· Payout date (creation date + 30 days) has passed.
				</p>
			</div>
		</div>
	{/if}

	<!-- Totals -->
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
		<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
			<p class="text-xs tracking-wider text-gray-500 uppercase">Total Referrals</p>
			<p class="mt-1 text-2xl font-bold text-white">{totals.totalReferrals}</p>
		</div>
		<div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
			<p class="text-xs tracking-wider text-amber-400 uppercase">Pending Payout</p>
			<p class="mt-1 text-2xl font-bold text-white">{fmt(totals.totalPending)}</p>
		</div>
		<div class="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
			<p class="text-xs tracking-wider text-blue-400 uppercase">Ready to Pay</p>
			<p class="mt-1 text-2xl font-bold text-white">{fmt(totals.readyToPayAmount)}</p>
		</div>
		<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
			<p class="text-xs tracking-wider text-emerald-400 uppercase">Total Paid Out</p>
			<p class="mt-1 text-2xl font-bold text-white">{fmt(totals.totalPaid)}</p>
		</div>
	</div>

	<!-- Partners table -->
	<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
		{#if partners.length === 0}
			<div class="p-8 text-center text-gray-400">
				No partners yet. <a href="/admin/partners/new" class="text-emerald-400 hover:text-emerald-300"
					>Create the first one</a
				>.
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead class="border-b border-gray-800 bg-gray-900/80 text-left text-xs tracking-wider text-gray-500 uppercase">
					<tr>
						<th class="px-4 py-3">Partner</th>
						<th class="px-4 py-3">Code</th>
						<th class="px-4 py-3 text-right">Referrals</th>
						<th class="px-4 py-3 text-right">Pending</th>
						<th class="px-4 py-3 text-right">Paid</th>
						<th class="px-4 py-3">Status</th>
						<th class="px-4 py-3">Created</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each partners as p}
						<tr class="transition-colors hover:bg-gray-800/40">
							<td class="px-4 py-3">
								<div class="font-medium text-white">{p.firstName} {p.lastName}</div>
								{#if p.displayName}
									<div class="text-xs text-emerald-400">as "{p.displayName}"</div>
								{/if}
								<div class="text-xs text-gray-500">{p.email}</div>
							</td>
							<td class="px-4 py-3">
								<code class="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-emerald-400"
									>{p.code}</code
								>
							</td>
							<td class="px-4 py-3 text-right text-white">{p.referralCount}</td>
							<td class="px-4 py-3 text-right">
								<div class="text-amber-400">{fmt(p.pendingCommission)}</div>
								{#if Number(p.readyToPayAmount) > 0}
									<div class="mt-0.5 text-[10px] font-semibold text-blue-400">
										{fmt(p.readyToPayAmount)} ready
									</div>
								{/if}
							</td>
							<td class="px-4 py-3 text-right text-emerald-400">{fmt(p.paidCommission)}</td>
							<td class="px-4 py-3">
								{#if p.isActive}
									<span
										class="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
										>Active</span
									>
								{:else}
									<span
										class="rounded-full bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-400"
										>Inactive</span
									>
								{/if}
							</td>
							<td class="px-4 py-3 text-xs text-gray-400">{fmtDate(p.createdAt)}</td>
							<td class="px-4 py-3 text-right">
								<a
									href="/admin/partners/{p.id}"
									class="text-sm font-medium text-emerald-400 hover:text-emerald-300">Manage →</a
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
