<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { onMount } from 'svelte';

	export let data;

	$: p = data.partner;
	$: referrals = data.referrals || [];
	$: totals = data.totals || { count: 0, pending: 0, paid: 0 };

	let origin = '';
	let copied = false;
	let canShare = false;
	onMount(() => {
		origin = window.location.origin;
		canShare = typeof navigator !== 'undefined' && !!navigator.share;
	});

	$: partnerLink = origin ? `${origin}/premium/${p.code}` : `/premium/${p.code}`;
	$: displayLink = partnerLink.replace(/^https?:\/\//, '');

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(partnerLink);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			/* clipboard blocked: the link stays visible to copy by hand */
		}
	}

	async function shareLink() {
		try {
			await navigator.share({
				title: 'AGE Premium',
				text: 'Get $5 off AGE Premium with my link.',
				url: partnerLink
			});
		} catch {
			/* share sheet dismissed */
		}
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

	/** Payout status tag. */
	function statusTag(status, readyToPay) {
		if (status === 'paid') return { text: 'Paid', tone: 'border-prem bg-prem text-white' };
		if (readyToPay) return { text: 'Processing', tone: 'border-warm/50 bg-warm/[0.06] text-warm' };
		return { text: 'Pending', tone: 'border-gold bg-gold/10 text-[#8a6116]' };
	}

	/** One-line summary under each referral on phones. */
	function metaLine(r) {
		const plan = r.subscriptionType
			? r.subscriptionType[0].toUpperCase() + r.subscriptionType.slice(1)
			: '';
		const parts = [plan, `joined ${fmtDate(r.createdAt)}`];
		parts.push(
			r.payoutStatus === 'paid'
				? `paid ${fmtDate(r.paidAt)}`
				: `payout due ${fmtDate(r.payoutDueAt)}`
		);
		return parts.filter(Boolean).join(' · ');
	}

	const STEPS = [
		{
			t: 'Share your link',
			d: 'Put it in your videos, streams, posts and show notes, or read out your code on air.'
		},
		{
			t: 'They save $5',
			d: 'Anyone who joins AGE Premium through your link or code gets $5 off their first charge.'
		},
		{
			t: 'You earn $5',
			d: 'Each signup earns you a $5 commission, paid by direct deposit about a month after they join.'
		}
	];
</script>

<svelte:head>
	<title>Partner Dashboard — AGE</title>
</svelte:head>

<AgeShell active="">
	<!-- ============ masthead: ink band + share box ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10 md:px-8 md:pt-14 md:pb-14">
			<div class="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14">
				<div class="fp-rise min-w-0">
					<div class="flex flex-wrap items-center gap-3">
						<p class="text-[10px] font-extrabold tracking-[0.24em] text-gold uppercase">
							<span aria-hidden="true">◆</span> AGE Partner{p.displayName
								? ` · ${p.displayName}`
								: ''}
						</p>
						{#if p.isActive}
							<span
								class="bg-prem px-2 py-[3px] text-[9px] font-extrabold tracking-[0.16em] text-white uppercase"
								>Active</span
							>
						{:else}
							<span
								class="border border-hero-rb px-2 py-[3px] text-[9px] font-extrabold tracking-[0.16em] text-hero-rb uppercase"
								>Paused</span
							>
						{/if}
					</div>
					<h1
						class="mt-4 text-[44px] leading-[0.95] font-extrabold tracking-[-0.035em] [text-wrap:balance] md:text-[64px]"
						style="font-family: var(--font-libre);"
					>
						Partner<br /><span class="text-gold">dashboard.</span>
					</h1>
					<p class="mt-5 max-w-[520px] font-newsreader text-[18px] leading-[1.55] text-paper-bg/75">
						Track your referrals and earnings. Every member you bring in helps keep AGE independent,
						and payouts are sent every 30 days by direct deposit.
					</p>
				</div>

				<div class="fp-rise flex justify-center lg:justify-end" style="animation-delay: 120ms;">
					<div
						class="w-full max-w-[440px] bg-paper-bg text-ink"
						style="box-shadow: 0 2px 3px rgba(0,0,0,0.25), 0 18px 30px -12px rgba(0,0,0,0.55);"
					>
						<div class="h-[5px] bg-gold" aria-hidden="true"></div>
						<div class="px-6 pt-5 pb-6 md:px-7">
							<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
								Your partner code
							</p>
							<p
								class="ao-cond mt-1 text-[56px] leading-[0.9] font-black tracking-[0.02em] break-all {p.isActive
									? 'text-ink'
									: 'text-fade line-through'}"
							>
								{p.code}
							</p>
							<p class="mt-4 text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
								Your link
							</p>
							<p
								class="mt-1.5 truncate border border-line2 bg-paper px-3.5 py-3 text-[14px] font-semibold"
								title={partnerLink}
							>
								{displayLink}
							</p>
							<div class="mt-3 grid gap-2 {canShare ? 'grid-cols-2' : ''}">
								<button
									type="button"
									onclick={copyLink}
									disabled={!p.isActive}
									class="min-h-[50px] bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-prem disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink"
								>
									{copied ? 'Copied ✓' : 'Copy link'}
								</button>
								{#if canShare}
									<button
										type="button"
										onclick={shareLink}
										disabled={!p.isActive}
										class="min-h-[50px] border-[1.5px] border-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
									>
										Share
									</button>
								{/if}
							</div>
							{#if p.isActive}
								<p class="mt-3 font-newsreader text-[14px] text-soft italic">
									Followers can also enter <span class="font-semibold text-ink not-italic"
										>{p.code}</span
									> at checkout for $5 off.
								</p>
							{:else}
								<p class="mt-3 font-newsreader text-[14px] font-semibold text-hero-rb">
									This code is paused and won't give a discount right now.
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
			<div class="mt-10 h-[5px] border-y border-paper-bg/30 md:mt-12" aria-hidden="true"></div>
		</div>
	</section>

	<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
		{#if !p.isActive}
			<div class="mb-12 border-l-[3px] border-hero-rb bg-hero-rb/[0.07] px-5 py-4">
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
					Your partner status is paused
				</p>
				<p class="mt-1 max-w-[720px] font-newsreader text-[16px] leading-[1.55] text-soft">
					Your code is inactive for now, so new signups won't be credited to you. Past referrals and
					pending payouts aren't affected. Reach out if you have questions.
				</p>
			</div>
		{/if}

		<!-- ============ tally ============ -->
		<section>
			<h2 class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
				<span class="text-[8px] text-gold" aria-hidden="true">◆</span> Your earnings
			</h2>
			<dl class="mt-5 grid grid-cols-3 border-y-[3px] border-double border-ink">
				{#each [['Referrals', String(totals.count), 'text-ink'], ['Pending payout', fmt(totals.pending), 'text-[#8a6116]'], ['Paid out', fmt(totals.paid), 'text-prem']] as [label, value, tone], i (label)}
					<div class="px-2 py-5 text-center {i ? 'border-l border-line2' : ''}">
						<dd
							class="ao-cond text-[34px] leading-none font-black tabular-nums sm:text-[48px] md:text-[64px] {tone}"
						>
							{value}
						</dd>
						<dt
							class="mt-2 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase md:text-[10px]"
						>
							{label}
						</dt>
					</div>
				{/each}
			</dl>
		</section>

		<!-- ============ how it works ============ -->
		<section class="mt-14">
			<h2 class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
				<span class="text-[8px] text-gold" aria-hidden="true">◆</span> How it works
			</h2>
			<ol class="mt-5 grid gap-px border-t-[3px] border-ink bg-line2 md:grid-cols-3">
				{#each STEPS as s, i (s.t)}
					<li class="bg-paper-bg pt-5 pb-6 md:px-6 md:first:pl-0">
						<span class="ao-cond text-[44px] leading-none font-black text-gold tabular-nums"
							>0{i + 1}</span
						>
						<h3 class="mt-3 font-newsreader text-[21px] leading-[1.15] font-semibold">{s.t}</h3>
						<p class="mt-2 font-newsreader text-[15.5px] leading-[1.55] text-soft">{s.d}</p>
					</li>
				{/each}
			</ol>
		</section>

		<!-- ============ referrals ============ -->
		<section class="mt-14">
			<div class="flex items-baseline justify-between gap-4">
				<h2
					class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
				>
					<span class="text-[8px] text-gold" aria-hidden="true">◆</span> Your referrals
				</h2>
				<span class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>{referrals.length} total</span
				>
			</div>

			{#if referrals.length === 0}
				<div class="mt-5 border-t-[3px] border-ink py-12 text-center">
					<p class="font-newsreader text-[24px] font-semibold">No referrals yet.</p>
					<p class="mx-auto mt-2 max-w-[400px] font-newsreader text-[16px] text-soft">
						Share your link and every Premium signup that comes through it earns you $5.
					</p>
					<button
						type="button"
						onclick={copyLink}
						class="mt-5 inline-flex min-h-[46px] items-center gap-2 border-[1.5px] border-ink px-6 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
					>
						{copied ? 'Copied ✓' : 'Copy your link'}
					</button>
				</div>
			{:else}
				<div
					class="mt-5 hidden grid-cols-[minmax(0,1.3fr)_100px_120px_100px_minmax(0,1fr)_120px] gap-4 border-b-[3px] border-ink pb-2 text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase md:grid"
				>
					<span>Member</span><span>Plan</span><span>Joined</span><span class="text-right"
						>Commission</span
					><span>Payout</span><span class="text-right">Status</span>
				</div>
				<ol class="border-t-[3px] border-ink md:border-t-0">
					{#each referrals as r (r.id)}
						{@const tag = statusTag(r.payoutStatus, r.readyToPay)}
						<li
							class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line2 py-3.5 even:bg-paper/50 md:grid-cols-[minmax(0,1.3fr)_100px_120px_100px_minmax(0,1fr)_120px] md:gap-4"
						>
							<span class="flex min-w-0 items-baseline gap-3">
								<span class="truncate font-newsreader text-[17px] font-semibold"
									>{r.referredFirstName || 'A member'}</span
								>
								<span class="ao-cond text-[20px] leading-none font-black tabular-nums md:hidden"
									>{fmt(r.commissionAmount)}</span
								>
							</span>
							<span class="hidden text-[13px] font-semibold text-soft capitalize md:block"
								>{r.subscriptionType}</span
							>
							<span class="hidden text-[13px] text-soft tabular-nums md:block"
								>{fmtDate(r.createdAt)}</span
							>
							<span
								class="ao-cond hidden text-right text-[22px] leading-none font-black tabular-nums md:block"
								>{fmt(r.commissionAmount)}</span
							>
							<span class="hidden text-[13px] text-soft md:block">
								{#if r.payoutStatus === 'paid'}
									<span class="font-semibold text-prem">Paid {fmtDate(r.paidAt)}</span>
								{:else}
									Due {fmtDate(r.payoutDueAt)}
								{/if}
							</span>
							<span class="text-right">
								<span
									class="inline-flex border px-2 py-[3px] text-[9px] font-extrabold tracking-[0.12em] whitespace-nowrap uppercase {tag.tone}"
									>{tag.text}</span
								>
							</span>
							<span class="col-span-2 text-[11.5px] text-soft md:hidden">{metaLine(r)}</span>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		<p class="mt-12 text-center font-newsreader text-[15px] text-soft">
			Questions about the partner program? Email
			<a href="mailto:info@arcanegamesandevents.com" class="font-semibold text-warm underline"
				>info@arcanegamesandevents.com</a
			>.
		</p>
	</div>
</AgeShell>
