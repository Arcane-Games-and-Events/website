<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
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

	function statusChip(status, readyToPay) {
		if (status === 'paid') return { label: 'Paid', tone: 'prem' };
		if (readyToPay) return { label: 'Processing', tone: 'accent' };
		return { label: 'Pending', tone: 'warm' };
	}

	function chipClass(tone) {
		if (tone === 'accent') return 'text-accent border-accent/40 bg-accent/10';
		if (tone === 'prem') return 'text-prem border-prem/40 bg-prem/10';
		if (tone === 'warm') return 'text-warm border-warm/40 bg-warm/10';
		return 'text-soft border-line2 bg-paper-bg';
	}
</script>

<svelte:head>
	<title>Partner Dashboard — AGE</title>
</svelte:head>

<AgeShell active="">
	<div class="mx-auto w-full max-w-[1600px] px-4 pt-10 pb-[52px] md:px-10 lg:px-14">
		<!-- ============ HEADER ============ -->
		<div
			class="bg-paper border-line2 border-t-prem mb-[26px] grid grid-cols-1 items-end gap-6 border border-t-[3px] px-[26px] py-[26px] md:grid-cols-[1fr_auto] md:px-[34px] md:py-[30px]"
		>
			<div>
				<div class="mb-[10px] flex flex-wrap items-center gap-[10px]">
					<span
						class="text-fade font-mono-system inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						<span class="bg-prem inline-block h-[6px] w-[6px] rounded-full"></span>
						AGE Partner
					</span>
					{#if p.isActive}
						<span
							class="border-prem/40 bg-prem/10 text-prem inline-flex items-center gap-[6px] border px-[10px] py-[4px] text-[10px] font-extrabold tracking-[0.1em] uppercase"
						>
							Active
						</span>
					{:else}
						<span
							class="border-warm/40 bg-warm/10 text-warm inline-flex items-center gap-[6px] border px-[10px] py-[4px] text-[10px] font-extrabold tracking-[0.1em] uppercase"
						>
							Paused
						</span>
					{/if}
				</div>
				<h1
					class="font-newsreader mb-2 text-[38px] leading-[0.9] font-semibold tracking-[-0.02em] sm:text-[46px]"
				>
					Partner Dashboard
				</h1>
				<p class="text-soft max-w-[560px] text-[14.5px] leading-[1.5]">
					Track your referrals and earnings. Payouts are sent every 30 days via direct deposit.
				</p>
			</div>

			<div
				class="border-line2 flex flex-col items-center justify-center self-stretch border px-[22px] py-[16px] text-center"
			>
				<div class="font-newsreader text-[38px] leading-[0.8] font-semibold tabular-nums">
					{totals.count}
				</div>
				<div class="text-fade mt-2 text-[10px] font-extrabold tracking-[0.12em] uppercase">
					Referrals
				</div>
			</div>
		</div>

		<!-- ============ PAUSED WARNING ============ -->
		{#if !p.isActive}
			<div
				class="border-warm/40 bg-warm/10 text-warm mb-[26px] flex items-start gap-[14px] border-[1.5px] px-[22px] py-[16px]"
			>
				<svg
					viewBox="0 0 24 24"
					class="mt-[2px] h-5 w-5 flex-shrink-0"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 8v5M12 16h.01" />
				</svg>
				<div class="text-[13px] leading-[1.5]">
					<div class="mb-[3px] font-extrabold tracking-[0.02em] uppercase">
						Your partner status is paused
					</div>
					<div class="text-warm/90 font-semibold">
						Your promo code is currently inactive — new signups won't be credited to you. Your past
						referrals and pending payouts are unaffected. Reach out if you have questions.
					</div>
				</div>
			</div>
		{/if}

		<!-- ============ PARTNER LINK CARD ============ -->
		<div
			class="bg-paper border-line2 mb-[26px] border p-[24px] md:p-[30px]"
		>
			<div class="mb-[14px] flex flex-wrap items-baseline justify-between gap-3">
				<div class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Your partner link
				</div>
				<div class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase">
					Promo Code
					<span class="text-ink ml-[6px] font-bold tracking-[0.04em]">{p.code}</span>
				</div>
			</div>
			<div class="flex flex-col gap-[10px] sm:flex-row sm:items-stretch">
				<code
					class="border-line2 bg-paper-bg text-ink font-mono-system min-w-0 flex-1 truncate border px-[15px] py-[13px] text-[13px] font-bold tracking-[0.02em]"
				>
					{partnerLink}
				</code>
				<button
					type="button"
					onclick={copyLink}
					class="border-prem bg-prem inline-flex items-center justify-center gap-2 border-[1.5px] px-[22px] py-[13px] text-[11px] font-extrabold tracking-[0.08em] text-white uppercase transition-[filter] hover:brightness-110"
				>
					{copied ? '✓ Copied' : 'Copy link'}
				</button>
			</div>
			<p class="text-soft mt-[16px] text-[13.5px] leading-[1.55]">
				Share this link in your content and social media. Anyone who signs up for AGE Premium
				through it gets <span class="text-ink font-bold">$5 off</span> their first charge, and you
				earn a <span class="text-prem font-bold">$5 commission</span>.
			</p>
		</div>

		<!-- ============ TOTALS ============ -->
		<div class="mb-[26px] grid grid-cols-1 gap-[14px] sm:grid-cols-3">
			<div class="bg-paper border-line2 border p-[22px]">
				<div class="text-fade font-mono-system mb-2 text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Total Referrals
				</div>
				<div class="font-newsreader text-[36px] leading-[0.8] font-semibold tabular-nums">
					{totals.count}
				</div>
			</div>
			<div class="bg-paper border-line2 border-t-warm border border-t-[3px] p-[22px]">
				<div class="text-warm font-mono-system mb-2 text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Pending Payout
				</div>
				<div class="text-warm font-newsreader text-[36px] leading-[0.8] font-semibold tabular-nums">
					{fmt(totals.pending)}
				</div>
			</div>
			<div class="bg-paper border-line2 border-t-prem border border-t-[3px] p-[22px]">
				<div class="text-prem font-mono-system mb-2 text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Total Earned
				</div>
				<div class="text-prem font-newsreader text-[36px] leading-[0.8] font-semibold tabular-nums">
					{fmt(totals.paid)}
				</div>
			</div>
		</div>

		<!-- ============ REFERRALS ============ -->
		<section class="bg-paper border-line2 overflow-hidden border">
			<header
				class="border-line2 flex flex-wrap items-center justify-between gap-3 border-b px-[24px] py-[16px]"
			>
				<h3
					class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
				>
					Your Referrals
				</h3>
				<span
					class="text-fade font-mono-system text-[11px] font-bold tracking-[0.06em] tabular-nums uppercase"
				>
					{referrals.length} on record
				</span>
			</header>

			{#if referrals.length === 0}
				<div class="flex flex-col items-center px-6 py-[60px] text-center">
					<span
						class="border-line2 text-fade mb-4 flex h-[52px] w-[52px] items-center justify-center border"
					>
						<svg
							viewBox="0 0 24 24"
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<circle cx="9" cy="8" r="3" />
							<path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
							<circle cx="17" cy="8" r="2.5" />
							<path d="M15 20c0-2.5 2-4 4-4s4 1.5 4 4" />
						</svg>
					</span>
					<h4
						class="font-newsreader mb-2 text-[22px] leading-[1] font-semibold tracking-[-0.01em]"
					>
						No referrals yet
					</h4>
					<p class="text-soft text-[13.5px]">
						Share your link to start earning — new signups appear here immediately.
					</p>
				</div>
			{:else}
				<!-- Desktop table -->
				<div class="hidden overflow-x-auto md:block">
					<table class="w-full">
						<thead>
							<tr
								class="border-line2 border-b"
								style="background: color-mix(in srgb, var(--ed-paper-bg) 60%, transparent);"
							>
								<th
									class="text-fade font-mono-system px-[20px] py-[14px] text-left text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Referred
								</th>
								<th
									class="text-fade font-mono-system px-[20px] py-[14px] text-left text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Plan
								</th>
								<th
									class="text-fade font-mono-system px-[20px] py-[14px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Commission
								</th>
								<th
									class="text-fade font-mono-system px-[20px] py-[14px] text-left text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Signed up
								</th>
								<th
									class="text-fade font-mono-system px-[20px] py-[14px] text-left text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Payout due
								</th>
								<th
									class="text-fade font-mono-system px-[20px] py-[14px] text-center text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Status
								</th>
							</tr>
						</thead>
						<tbody>
							{#each referrals as r, i (r.id)}
								{@const chip = statusChip(r.payoutStatus, r.readyToPay)}
								<tr
									class="border-line2 odd:bg-paper even:bg-paper-bg/40 hover:!bg-paper-bg transition-colors {i ===
									referrals.length - 1
										? ''
										: 'border-b'}"
								>
									<td class="px-[20px] py-[16px]">
										<span class="text-ink text-[14px] font-semibold">
											{r.referredFirstName || '—'}
										</span>
									</td>
									<td class="px-[20px] py-[16px]">
										<span
											class="border-line2 bg-paper-bg text-soft font-mono-system inline-block border px-[9px] py-[3px] text-[10px] font-extrabold tracking-[0.08em] uppercase"
										>
											{r.subscriptionType}
										</span>
									</td>
									<td class="px-[20px] py-[16px] text-right">
										<span class="text-ink font-mono-system text-[14px] font-bold tabular-nums">
											{fmt(r.commissionAmount)}
										</span>
									</td>
									<td class="text-soft font-mono-system px-[20px] py-[16px] text-[11.5px] font-bold tracking-[0.02em] tabular-nums uppercase">
										{fmtDate(r.createdAt)}
									</td>
									<td class="px-[20px] py-[16px]">
										{#if r.payoutStatus === 'paid'}
											<span class="text-fade">—</span>
										{:else}
											<span
												class="text-soft font-mono-system text-[11.5px] font-bold tracking-[0.02em] tabular-nums uppercase"
											>
												{fmtDate(r.payoutDueAt)}
											</span>
										{/if}
									</td>
									<td class="px-[20px] py-[16px] text-center">
										<span
											class="inline-flex items-center gap-[6px] border px-[10px] py-[4px] text-[10px] font-extrabold tracking-[0.1em] uppercase {chipClass(
												chip.tone
											)}"
										>
											{chip.label}
											{#if r.payoutStatus === 'paid' && r.paidAt}
												<span class="opacity-70">· {fmtDate(r.paidAt)}</span>
											{/if}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile cards -->
				<div class="divide-line2 divide-y md:hidden">
					{#each referrals as r (r.id)}
						{@const chip = statusChip(r.payoutStatus, r.readyToPay)}
						<div class="px-[20px] py-[18px]">
							<div class="mb-[10px] flex items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="text-ink text-[15px] font-semibold">
										{r.referredFirstName || '—'}
									</div>
									<div class="text-fade font-mono-system mt-[3px] text-[10.5px] font-bold tracking-[0.06em] uppercase">
										{r.subscriptionType} · {fmtDate(r.createdAt)}
									</div>
								</div>
								<span
									class="inline-flex flex-shrink-0 items-center gap-[6px] border px-[9px] py-[4px] text-[10px] font-extrabold tracking-[0.08em] uppercase {chipClass(
										chip.tone
									)}"
								>
									{chip.label}
								</span>
							</div>
							<div class="border-line2 mt-[10px] flex items-center justify-between border-t pt-[10px]">
								<span
									class="text-fade font-mono-system text-[10.5px] font-bold tracking-[0.08em] uppercase"
								>
									Commission
								</span>
								<span class="text-ink font-mono-system text-[14px] font-bold tabular-nums">
									{fmt(r.commissionAmount)}
								</span>
							</div>
							{#if r.payoutStatus !== 'paid'}
								<div class="flex items-center justify-between mt-[6px]">
									<span
										class="text-fade font-mono-system text-[10.5px] font-bold tracking-[0.08em] uppercase"
									>
										Payout due
									</span>
									<span
										class="text-soft font-mono-system text-[11.5px] font-bold tracking-[0.02em] tabular-nums uppercase"
									>
										{fmtDate(r.payoutDueAt)}
									</span>
								</div>
							{:else if r.paidAt}
								<div class="flex items-center justify-between mt-[6px]">
									<span
										class="text-fade font-mono-system text-[10.5px] font-bold tracking-[0.08em] uppercase"
									>
										Paid on
									</span>
									<span
										class="text-soft font-mono-system text-[11.5px] font-bold tracking-[0.02em] tabular-nums uppercase"
									>
										{fmtDate(r.paidAt)}
									</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<p class="text-fade mt-[26px] text-center text-[12px] font-semibold tracking-[0.02em]">
			Questions about the program? Reach out to us directly for support.
		</p>
	</div>
</AgeShell>
