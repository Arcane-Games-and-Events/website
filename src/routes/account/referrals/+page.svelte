<script>
	import { onMount } from 'svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';

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

	/**
	 * Editorial status pill styling — colored by state, mono uppercase.
	 * @param {string} status
	 */
	function statusPill(status) {
		switch (status) {
			case 'pending':
				return {
					text: 'Awaiting 2nd month',
					color: 'var(--ed-warm)'
				};
			case 'reward_earned':
				return {
					text: 'Reward queued',
					color: 'var(--ed-accent)'
				};
			case 'reward_applied':
				return {
					text: 'Free month applied',
					color: 'var(--ed-prem)'
				};
			case 'cancelled':
				return {
					text: 'Cancelled',
					color: 'var(--ed-fade)'
				};
			default:
				return {
					text: status,
					color: 'var(--ed-fade)'
				};
		}
	}
</script>

<svelte:head>
	<title>Refer a Friend — AGE</title>
</svelte:head>

<AgeShell active="Account">
	<!--
		Referrals hero — paper field with a prem-green top hairline
		since the whole feature is a Premium perk. Same eyebrow /
		headline / lede rhythm the other account pages use.
	-->
	<section class="bg-paper border-ink relative overflow-hidden border-b-[3px] border-double">
		<div class="absolute inset-x-0 top-0 z-[1] h-[4px] bg-prem"></div>

		<div class="relative z-[1] mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[44px] pb-[42px]">
			<a
				href="/account"
				class="text-fade hover:text-ink font-mono-system inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
			>
				← Back to account
			</a>

			<div class="text-prem font-mono-system mt-6 block text-[11px] font-extrabold tracking-[0.18em] uppercase">
				AGE Premium · Referrals
			</div>

			<h1
				class="font-newsreader mt-[10px] text-[clamp(34px,4.5vw,52px)] leading-[0.96] font-semibold tracking-[-0.02em]"
			>
				Refer a friend, earn a month.
			</h1>
			<p class="text-soft mt-4 max-w-[640px] text-[16px] leading-[1.55]">
				Share your referral link with friends. They get their first month of AGE Premium free, and
				once they renew you earn a free month too.
			</p>
		</div>
	</section>

	<section class="bg-paper-bg border-ink border-b-[3px] border-double">
		<div class="mx-auto w-full max-w-[1600px] space-y-7 px-4 md:px-10 lg:px-14 py-10">
			{#if !data.eligible}
				<!-- Non-premium upsell -->
				<div class="border-line2 bg-paper border-l-[3px] border-warm border px-7 py-7">
					<div
						class="text-warm font-mono-system mb-[10px] text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						Premium members only
					</div>
					<h2 class="font-newsreader text-[26px] font-semibold tracking-[-0.01em]">
						This is a Premium perk.
					</h2>
					<p class="text-soft mt-3 max-w-[480px] text-[14.5px] leading-[1.55]">
						Become a Premium member to start referring friends and earning free months.
					</p>
					<a
						href="/premium"
						class="bg-prem border-prem mt-6 inline-flex items-center gap-2 border-[1.5px] px-6 py-[12px] text-[12px] font-bold tracking-[0.06em] text-white uppercase transition-[filter] hover:brightness-110"
					>
						Get AGE Premium →
					</a>
				</div>
			{:else}
				<!-- Referral link card -->
				<div class="border-line2 bg-paper border">
					<div class="border-line2 flex items-baseline justify-between border-b px-6 py-[14px]">
						<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
							Your Referral Link
						</h2>
						<span
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Share
						</span>
					</div>
					<div class="px-6 py-6">
						<div
							class="text-fade font-mono-system mb-[8px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Copy this URL
						</div>
						<div class="flex flex-wrap items-stretch gap-3">
							<code
								class="border-line2 bg-paper-bg font-mono-system text-ink flex-1 min-w-0 truncate border px-4 py-[12px] text-[13.5px] font-bold tracking-[0.02em]"
							>
								{link || '—'}
							</code>
							<button
								type="button"
								on:click={copyLink}
								disabled={!link}
								class="bg-prem border-prem font-mono-system inline-flex items-center border-[1.5px] px-6 py-[12px] text-[11px] font-extrabold tracking-[0.08em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{copied ? 'Copied ✓' : 'Copy'}
							</button>
						</div>

						<div class="border-line2 mt-6 border-t pt-5">
							<p class="text-soft text-[14px] leading-[1.6]">
								Anyone who signs up using your link gets
								<span class="text-ink font-bold">$10 off</span>
								(monthly = first month free, yearly = $10 off the first year). Once they pay for
								their second month, you get a
								<span class="text-prem font-bold">free month of premium</span>
								applied automatically.
							</p>
							<div
								class="text-fade font-mono-system mt-3 text-[11px] font-extrabold tracking-[0.14em] uppercase"
							>
								Promo Code
								<span class="text-prem ml-2 font-mono-system tracking-[0.06em]">{code}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Totals stat strip -->
				<dl class="grid grid-cols-1 gap-px bg-line2 sm:grid-cols-3">
					<div class="bg-paper flex flex-col justify-between px-6 py-5">
						<dt
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
						>
							Total Referrals
						</dt>
						<dd
							class="font-archivo text-ink mt-2 text-[42px] font-black leading-[0.85] tabular-nums tracking-[-0.03em]"
						>
							{totals.count}
						</dd>
					</div>
					<div class="bg-paper flex flex-col justify-between px-6 py-5">
						<dt
							class="text-warm font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
						>
							Awaiting 2nd Month
						</dt>
						<dd
							class="font-archivo text-warm mt-2 text-[42px] font-black leading-[0.85] tabular-nums tracking-[-0.03em]"
						>
							{totals.pending}
						</dd>
					</div>
					<div class="bg-paper flex flex-col justify-between px-6 py-5">
						<dt
							class="text-prem font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
						>
							Free Months Earned
						</dt>
						<dd
							class="font-archivo text-prem mt-2 text-[42px] font-black leading-[0.85] tabular-nums tracking-[-0.03em]"
						>
							{totals.earned}
						</dd>
					</div>
				</dl>

				<!-- Referrals list -->
				<div class="border-line2 bg-paper border">
					<div class="border-line2 flex items-baseline justify-between border-b px-6 py-[14px]">
						<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
							Your Referrals
						</h2>
						<span
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							{referrals.length} total
						</span>
					</div>

					{#if referrals.length === 0}
						<div class="px-6 py-14 text-center">
							<div class="font-newsreader text-ink mb-2 text-[22px] font-semibold">
								No referrals yet.
							</div>
							<p class="text-soft mx-auto max-w-[380px] text-[13.5px] leading-[1.55]">
								Share your link to start earning free months of Premium.
							</p>
						</div>
					{:else}
						<!-- Mobile card stack -->
						<div class="divide-y divide-[#E4DECF] md:hidden">
							{#each referrals as r}
								{@const sl = statusPill(r.status)}
								<div class="px-5 py-4">
									<div class="flex items-baseline justify-between gap-3">
										<div class="text-ink text-[15px] font-bold">
											{r.referredFirstName || '—'}
										</div>
										<span
											class="font-mono-system border px-[7px] py-[2px] text-[9.5px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap"
											style="color: {sl.color}; border-color: color-mix(in srgb, {sl.color} 45%, transparent); background-color: color-mix(in srgb, {sl.color} 8%, transparent);"
										>
											{sl.text}
										</span>
									</div>
									<div
										class="text-fade font-mono-system mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-bold tracking-[0.05em] uppercase"
									>
										<span class="text-soft capitalize">{r.subscriptionType}</span>
										<span aria-hidden="true">·</span>
										<span>{fmtDate(r.createdAt)}</span>
									</div>
									{#if r.rewardAppliedAt || r.rewardEarnedAt}
										<div class="text-fade font-mono-system mt-2 text-[10.5px] font-bold tracking-[0.05em] uppercase">
											{#if r.rewardAppliedAt}
												Reward applied {fmtDate(r.rewardAppliedAt)}
											{:else}
												Reward earned {fmtDate(r.rewardEarnedAt)}
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>

						<!-- Desktop table -->
						<div class="hidden overflow-x-auto md:block">
							<table class="w-full">
								<thead>
									<tr
										class="border-line2 border-b"
										style="background: color-mix(in srgb, var(--ed-paper-bg) 60%, transparent);"
									>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											Referred
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											Plan
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											Signed Up
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											Reward
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											Status
										</th>
									</tr>
								</thead>
								<tbody>
									{#each referrals as r, i (r.id)}
										{@const sl = statusPill(r.status)}
										<tr
											class="border-line2 odd:bg-paper even:bg-paper-bg/40 hover:!bg-paper-bg transition-colors {i ===
											referrals.length - 1
												? ''
												: 'border-b'}"
										>
											<td class="text-ink px-5 py-[14px] text-[14px] font-bold">
												{r.referredFirstName || '—'}
											</td>
											<td class="text-soft px-5 py-[14px] text-[13.5px] font-semibold capitalize">
												{r.subscriptionType}
											</td>
											<td class="text-fade font-mono-system px-5 py-[14px] text-[11.5px] font-bold tabular-nums">
												{fmtDate(r.createdAt)}
											</td>
											<td class="text-fade font-mono-system px-5 py-[14px] text-[11.5px] font-bold">
												{#if r.rewardAppliedAt}
													<span class="text-prem">Applied {fmtDate(r.rewardAppliedAt)}</span>
												{:else if r.rewardEarnedAt}
													<span class="text-accent">Earned {fmtDate(r.rewardEarnedAt)}</span>
												{:else}
													—
												{/if}
											</td>
											<td class="px-5 py-[14px]">
												<span
													class="font-mono-system inline-flex items-center border px-[8px] py-[3px] text-[9.5px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap"
													style="color: {sl.color}; border-color: color-mix(in srgb, {sl.color} 45%, transparent); background-color: color-mix(in srgb, {sl.color} 8%, transparent);"
												>
													{sl.text}
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</section>
</AgeShell>
