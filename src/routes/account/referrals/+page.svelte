<script>
	import { onMount } from 'svelte';
	export let data;

	let origin = '';
	let copied = false;
	onMount(() => {
		origin = window.location.origin;
	});

	$: code = data.referralCode?.code || '';
	$: link = origin && code ? `${origin}/premium/${code}` : '';
	$: referrals = data.referrals || [];
	$: totals = data.totals || { count: 0, earned: 0, pending: 0 };

	function copyLink() {
		if (!link) return;
		navigator.clipboard.writeText(link);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function fmtDate(d) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function statusLabel(status) {
		switch (status) {
			case 'pending':
				return { text: 'Awaiting 2nd month', class: 'bg-amber-500/20 text-amber-400' };
			case 'reward_earned':
				return { text: 'Reward queued', class: 'bg-blue-500/20 text-blue-400' };
			case 'reward_applied':
				return { text: 'Free month applied', class: 'bg-emerald-500/20 text-emerald-400' };
			case 'cancelled':
				return { text: 'Cancelled', class: 'bg-gray-500/20 text-gray-400' };
			default:
				return { text: status, class: 'bg-gray-500/20 text-gray-400' };
		}
	}
</script>

<svelte:head>
	<title>Refer a Friend - AGE</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<a
				href="/account"
				class="inline-flex items-center text-sm text-gray-400 transition-colors hover:text-white"
			>
				← Back to Account
			</a>
			<h1 class="mt-4 text-3xl font-bold text-white sm:text-4xl">Refer a Friend</h1>
			<p class="mt-2 text-gray-400">
				Share your referral link with friends. They get their first month of AGE Premium free, and
				once they renew you earn a free month too.
			</p>
		</div>

		{#if !data.eligible}
			<div class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
				<h2 class="mb-2 text-xl font-semibold text-white">Premium members only</h2>
				<p class="mb-4 text-sm text-gray-300">
					Become a Premium member to start referring friends and earning free months.
				</p>
				<a
					href="/premium"
					class="inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
				>
					Get AGE Premium
				</a>
			</div>
		{:else}
			<!-- Promo link -->
			<div class="mb-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-gray-900 p-6">
				<p class="text-xs tracking-wider text-emerald-400 uppercase">Your referral link</p>
				<div class="mt-3 flex items-center gap-3">
					<code
						class="flex-1 truncate rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 font-mono text-sm text-white"
						>{link}</code
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
					Anyone who signs up using your link gets <span class="font-semibold text-white">$10 off</span>
					(monthly = first month free, yearly = $10 off the first year). Once they pay for their second
					month, you get a <span class="font-semibold text-emerald-400">free month of premium</span>
					applied automatically.
				</p>
				<p class="mt-2 text-xs text-gray-500">
					Promo code: <code class="font-mono font-medium text-emerald-400">{code}</code>
				</p>
			</div>

			<!-- Totals -->
			<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
					<p class="text-xs tracking-wider text-gray-500 uppercase">Total Referrals</p>
					<p class="mt-1 text-3xl font-bold text-white">{totals.count}</p>
				</div>
				<div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
					<p class="text-xs tracking-wider text-amber-400 uppercase">Awaiting 2nd Month</p>
					<p class="mt-1 text-3xl font-bold text-white">{totals.pending}</p>
				</div>
				<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
					<p class="text-xs tracking-wider text-emerald-400 uppercase">Free Months Earned</p>
					<p class="mt-1 text-3xl font-bold text-white">{totals.earned}</p>
				</div>
			</div>

			<!-- Referrals list -->
			<div class="rounded-xl border border-gray-800 bg-gray-900/50">
				<div class="border-b border-gray-800 px-6 py-4">
					<h2 class="text-lg font-semibold text-white">Your Referrals</h2>
				</div>

				{#if referrals.length === 0}
					<div class="px-6 py-12 text-center text-gray-400">
						<p>No referrals yet. Share your link to start earning free months!</p>
					</div>
				{:else}
					<table class="w-full text-sm">
						<thead
							class="border-b border-gray-800 text-left text-xs tracking-wider text-gray-500 uppercase"
						>
							<tr>
								<th class="px-6 py-3">Referred</th>
								<th class="px-6 py-3">Plan</th>
								<th class="px-6 py-3">Signed up</th>
								<th class="px-6 py-3">Reward</th>
								<th class="px-6 py-3">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-800">
							{#each referrals as r}
								{@const sl = statusLabel(r.status)}
								<tr class="hover:bg-gray-800/30">
									<td class="px-6 py-3 text-white">{r.referredFirstName || '—'}</td>
									<td class="px-6 py-3 text-gray-300 capitalize">{r.subscriptionType}</td>
									<td class="px-6 py-3 text-xs text-gray-400">{fmtDate(r.createdAt)}</td>
									<td class="px-6 py-3 text-xs text-gray-400">
										{#if r.rewardAppliedAt}
											Applied {fmtDate(r.rewardAppliedAt)}
										{:else if r.rewardEarnedAt}
											Earned {fmtDate(r.rewardEarnedAt)}
										{:else}
											—
										{/if}
									</td>
									<td class="px-6 py-3">
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium {sl.class}"
										>
											{sl.text}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		{/if}
	</div>
</div>
