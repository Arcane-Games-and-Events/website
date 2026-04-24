<script>
	import { onMount } from 'svelte';
	export let data;

	$: p = data.partner;
	$: referrals = data.referrals || [];
	$: totals = data.totals || { count: 0, pending: 0, paid: 0 };

	let origin = '';
	let copied = false;
	onMount(() => {
		origin = window.location.origin;
	});

	$: partnerLink = origin ? `${origin}/premium/${p.code}` : `/premium/${p.code}`;

	function copyLink() {
		navigator.clipboard.writeText(partnerLink);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function fmt(amount) {
		return `$${Number(amount || 0).toFixed(2)}`;
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
	<title>Partner Dashboard - AGE</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
				<svg class="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="text-xs font-semibold text-emerald-400">AGE Partner</span>
			</div>
			<h1 class="text-3xl font-bold text-white sm:text-4xl">Partner Dashboard</h1>
			<p class="mt-2 text-gray-400">
				Track your referrals and earnings. Payouts are sent every 30 days via direct deposit.
			</p>
		</div>

		<!-- Promo link -->
		<div class="mb-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-gray-900 p-6">
			<p class="text-xs tracking-wider text-emerald-400 uppercase">Your partner link</p>
			<div class="mt-3 flex items-center gap-3">
				<code
					class="flex-1 truncate rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 font-mono text-sm text-white"
					>{partnerLink}</code
				>
				<button
					type="button"
					on:click={copyLink}
					class="rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
				>
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>
			<p class="mt-3 text-sm text-gray-400">
				Share this link in your content and social media. Anyone who signs up for AGE Premium
				through it gets <span class="font-semibold text-white">$5 off</span> their first charge,
				and you earn a <span class="font-semibold text-emerald-400">$5 commission</span>.
			</p>
			<p class="mt-2 text-xs text-gray-500">
				Promo code: <code class="font-mono font-medium text-emerald-400">{p.code}</code>
			</p>
		</div>

		<!-- Totals -->
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
				<p class="text-xs tracking-wider text-gray-500 uppercase">Total Referrals</p>
				<p class="mt-1 text-3xl font-bold text-white">{totals.count}</p>
			</div>
			<div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
				<p class="text-xs tracking-wider text-amber-400 uppercase">Pending Payout</p>
				<p class="mt-1 text-3xl font-bold text-white">{fmt(totals.pending)}</p>
			</div>
			<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
				<p class="text-xs tracking-wider text-emerald-400 uppercase">Total Earned</p>
				<p class="mt-1 text-3xl font-bold text-white">{fmt(totals.paid)}</p>
			</div>
		</div>

		<!-- Referrals list -->
		<div class="rounded-xl border border-gray-800 bg-gray-900/50">
			<div class="border-b border-gray-800 px-6 py-4">
				<h2 class="text-lg font-semibold text-white">Your Referrals</h2>
			</div>

			{#if referrals.length === 0}
				<div class="px-6 py-12 text-center text-gray-400">
					<p>No referrals yet. Share your link to start earning!</p>
				</div>
			{:else}
				<table class="w-full text-sm">
					<thead
						class="border-b border-gray-800 text-left text-xs tracking-wider text-gray-500 uppercase"
					>
						<tr>
							<th class="px-6 py-3">Referred</th>
							<th class="px-6 py-3">Plan</th>
							<th class="px-6 py-3 text-right">Commission</th>
							<th class="px-6 py-3">Signed up</th>
							<th class="px-6 py-3">Payout due</th>
							<th class="px-6 py-3">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-800">
						{#each referrals as r}
							<tr class="hover:bg-gray-800/30">
								<td class="px-6 py-3 text-white">{r.referredFirstName || '—'}</td>
								<td class="px-6 py-3 text-gray-300 capitalize">{r.subscriptionType}</td>
								<td class="px-6 py-3 text-right text-white">{fmt(r.commissionAmount)}</td>
								<td class="px-6 py-3 text-xs text-gray-400">{fmtDate(r.createdAt)}</td>
								<td class="px-6 py-3 text-xs">
									{#if r.payoutStatus === 'paid'}
										<span class="text-gray-500">—</span>
									{:else}
										<span class="text-gray-300">{fmtDate(r.payoutDueAt)}</span>
									{/if}
								</td>
								<td class="px-6 py-3">
									{#if r.payoutStatus === 'paid'}
										<span
											class="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
										>
											Paid {r.paidAt ? fmtDate(r.paidAt) : ''}
										</span>
									{:else if r.readyToPay}
										<span
											class="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400"
											>Processing payout</span
										>
									{:else}
										<span
											class="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400"
											>Pending</span
										>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-gray-500">
			Questions about the program? Reach out to us directly for support.
		</p>
	</div>
</div>
