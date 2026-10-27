<script>
	import { onMount } from 'svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	export let data;

	let origin = '';
	let copied = false;
	let canShare = false;
	onMount(() => {
		origin = window.location.origin;
		canShare = typeof navigator !== 'undefined' && !!navigator.share;
	});

	$: code = data.referralCode?.code || '';
	$: link = origin && code ? `${origin}/premium/${code}` : '';
	$: displayLink = link.replace(/^https?:\/\//, '');
	$: referrals = data.referrals || [];
	$: totals = data.totals || { count: 0, earned: 0, pending: 0 };

	async function copyLink() {
		if (!link) return;
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			/* clipboard blocked: the link stays visible to copy by hand */
		}
	}

	async function shareLink() {
		if (!link) return;
		try {
			await navigator.share({
				title: 'Join me on AGE Premium',
				text: 'Use my link to get $10 off AGE Premium.',
				url: link
			});
		} catch {
			/* share sheet dismissed */
		}
	}

	function fmtDate(d) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	/** One-line summary under each referral on phones. */
	function metaLine(r) {
		const plan = r.subscriptionType
			? r.subscriptionType[0].toUpperCase() + r.subscriptionType.slice(1)
			: '';
		const parts = [plan, `joined ${fmtDate(r.createdAt)}`];
		if (r.rewardAppliedAt) parts.push(`reward applied ${fmtDate(r.rewardAppliedAt)}`);
		else if (r.rewardEarnedAt) parts.push(`reward earned ${fmtDate(r.rewardEarnedAt)}`);
		return parts.filter(Boolean).join(' · ');
	}

	/** Status tag label + tone. */
	function statusTag(status) {
		switch (status) {
			case 'pending':
				return { text: 'Awaiting 2nd payment', tone: 'border-gold text-[#8a6116] bg-gold/10' };
			case 'reward_earned':
				return { text: 'Reward queued', tone: 'border-warm/50 text-warm bg-warm/[0.06]' };
			case 'reward_applied':
				return { text: 'Free month applied', tone: 'border-prem bg-prem text-white' };
			case 'cancelled':
				return { text: 'Cancelled', tone: 'border-line2 text-fade' };
			default:
				return { text: status, tone: 'border-line2 text-fade' };
		}
	}

	const STEPS = [
		{
			t: 'Share your link',
			d: 'Send it to a friend, post it in your playgroup chat, or hand out your code at the next AGE Open.'
		},
		{
			t: 'They join for less',
			d: 'Your friend gets $10 off: their first month free on monthly, or $10 off their first year.'
		},
		{
			t: 'You get a month free',
			d: 'Once they pay for their second month, a free month of Premium is added to your account automatically.'
		}
	];
</script>

<svelte:head>
	<title>Refer a Friend — AGE</title>
</svelte:head>

<AgeShell active="Account">
	<!-- ============ masthead: ink band + share box ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-10 md:px-8 md:pt-10 md:pb-14">
			<a
				href="/account"
				class="inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase transition-[color,gap] hover:gap-3 hover:text-paper-bg"
			>
				<span aria-hidden="true">←</span> Account
			</a>

			<div class="mt-8 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14">
				<div class="fp-rise min-w-0">
					<p class="text-[10px] font-extrabold tracking-[0.24em] text-prem-light uppercase">
						<span aria-hidden="true">◆</span> AGE Premium · Refer a friend
					</p>
					<h1
						class="mt-4 text-[44px] leading-[0.95] font-extrabold tracking-[-0.035em] [text-wrap:balance] md:text-[64px]"
						style="font-family: 'Libre Franklin', system-ui, sans-serif;"
					>
						Bring a friend.<br /><span class="text-prem-light">Earn a month.</span>
					</h1>
					<p class="mt-5 max-w-[520px] font-newsreader text-[18px] leading-[1.55] text-paper-bg/75">
						Every member who joins through you grows the community that keeps AGE going. They get
						$10 off, and you get a free month of Premium once they renew.
					</p>
				</div>

				<div class="fp-rise flex justify-center lg:justify-end" style="animation-delay: 120ms;">
					{#if data.eligible}
						<!-- share box -->
						<div
							class="w-full max-w-[440px] bg-paper-bg text-ink"
							style="box-shadow: 0 2px 3px rgba(0,0,0,0.25), 0 18px 30px -12px rgba(0,0,0,0.55);"
						>
							<div class="h-[5px] bg-prem" aria-hidden="true"></div>
							<div class="px-6 pt-5 pb-6 md:px-7">
								<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
									Your referral code
								</p>
								<p
									class="ao-cond mt-1 text-[56px] leading-[0.9] font-black tracking-[0.02em] break-all text-prem"
								>
									{code || '—'}
								</p>
								<p class="mt-4 text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
									Your link
								</p>
								<p
									class="mt-1.5 truncate border border-line2 bg-paper px-3.5 py-3 text-[14px] font-semibold"
									title={link}
								>
									{displayLink || '—'}
								</p>
								<div class="mt-3 grid gap-2 {canShare ? 'grid-cols-2' : ''}">
									<button
										type="button"
										onclick={copyLink}
										disabled={!link}
										class="min-h-[50px] bg-prem px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
									>
										{copied ? 'Copied ✓' : 'Copy link'}
									</button>
									{#if canShare}
										<button
											type="button"
											onclick={shareLink}
											class="min-h-[50px] border-[1.5px] border-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
										>
											Share
										</button>
									{/if}
								</div>
								<p class="mt-3 font-newsreader text-[14px] text-soft italic">
									Friends can also enter <span class="font-semibold text-ink not-italic"
										>{code}</span
									> at checkout.
								</p>
							</div>
						</div>
					{:else}
						<!-- not a member: upsell -->
						<div
							class="w-full max-w-[440px] bg-paper-bg px-6 py-7 text-ink md:px-7"
							style="box-shadow: 0 2px 3px rgba(0,0,0,0.25), 0 18px 30px -12px rgba(0,0,0,0.55);"
						>
							<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
								For Premium members
							</p>
							<p class="mt-2 font-newsreader text-[26px] leading-[1.1] font-semibold">
								Referrals are a member perk.
							</p>
							<p class="mt-2 font-newsreader text-[16px] leading-[1.5] text-soft">
								Become a member to get your own link and start earning free months.
							</p>
							<a
								href="/premium"
								class="mt-5 flex min-h-[50px] items-center justify-center gap-2 bg-prem px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors hover:bg-ink"
								>Become a member <span aria-hidden="true">→</span></a
							>
						</div>
					{/if}
				</div>
			</div>
			<div class="mt-10 h-[5px] border-y border-paper-bg/30 md:mt-12" aria-hidden="true"></div>
		</div>
	</section>

	<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
		<!-- ============ how it works ============ -->
		<section>
			<h2 class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
				<span class="text-[8px] text-prem" aria-hidden="true">◆</span> How it works
			</h2>
			<ol class="mt-5 grid gap-px border-t-[3px] border-ink bg-line2 md:grid-cols-3">
				{#each STEPS as s, i (s.t)}
					<li class="bg-paper-bg pt-5 pb-6 md:px-6 md:first:pl-0">
						<span class="ao-cond text-[44px] leading-none font-black text-prem tabular-nums"
							>0{i + 1}</span
						>
						<h3 class="mt-3 font-newsreader text-[21px] leading-[1.15] font-semibold">{s.t}</h3>
						<p class="mt-2 font-newsreader text-[15.5px] leading-[1.55] text-soft">{s.d}</p>
					</li>
				{/each}
			</ol>
		</section>

		{#if data.eligible}
			<!-- ============ tally ============ -->
			<section class="mt-14">
				<h2
					class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
				>
					<span class="text-[8px] text-prem" aria-hidden="true">◆</span> Your tally
				</h2>
				<dl class="mt-5 grid grid-cols-3 border-y-[3px] border-double border-ink">
					{#each [['Referrals', totals.count, 'text-ink'], ['Awaiting 2nd payment', totals.pending, 'text-[#8a6116]'], ['Free months earned', totals.earned, 'text-prem']] as [label, n, tone], i (label)}
						<div class="px-2 py-5 text-center {i ? 'border-l border-line2' : ''}">
							<dd
								class="ao-cond text-[48px] leading-none font-black tabular-nums md:text-[64px] {tone}"
							>
								{n}
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

			<!-- ============ referrals ============ -->
			<section class="mt-14">
				<div class="flex items-baseline justify-between gap-4">
					<h2
						class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px] text-prem" aria-hidden="true">◆</span> Your referrals
					</h2>
					<span class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
						>{referrals.length} total</span
					>
				</div>

				{#if referrals.length === 0}
					<div class="mt-5 border-t-[3px] border-ink py-12 text-center">
						<p class="font-newsreader text-[24px] font-semibold">No referrals yet.</p>
						<p class="mx-auto mt-2 max-w-[380px] font-newsreader text-[16px] text-soft">
							Share your link and your first free month could be one friend away.
						</p>
						<button
							type="button"
							onclick={copyLink}
							disabled={!link}
							class="mt-5 inline-flex min-h-[46px] items-center gap-2 border-[1.5px] border-ink px-6 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
						>
							{copied ? 'Copied ✓' : 'Copy your link'}
						</button>
					</div>
				{:else}
					<div
						class="mt-5 hidden grid-cols-[minmax(0,1.4fr)_110px_130px_minmax(0,1fr)_170px] gap-4 border-b-[3px] border-ink pb-2 text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase md:grid"
					>
						<span>Friend</span><span>Plan</span><span>Joined</span><span>Reward</span><span
							class="text-right">Status</span
						>
					</div>
					<ol class="border-t-[3px] border-ink md:border-t-0">
						{#each referrals as r (r.id)}
							{@const tag = statusTag(r.status)}
							<li
								class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line2 py-3.5 even:bg-paper/50 md:grid-cols-[minmax(0,1.4fr)_110px_130px_minmax(0,1fr)_170px] md:gap-4"
							>
								<span class="truncate font-newsreader text-[17px] font-semibold"
									>{r.referredFirstName || 'A friend'}</span
								>
								<span class="hidden text-[13px] font-semibold text-soft capitalize md:block"
									>{r.subscriptionType}</span
								>
								<span class="hidden text-[13px] text-soft tabular-nums md:block"
									>{fmtDate(r.createdAt)}</span
								>
								<span class="hidden text-[13px] md:block">
									{#if r.rewardAppliedAt}
										<span class="font-semibold text-prem">Applied {fmtDate(r.rewardAppliedAt)}</span
										>
									{:else if r.rewardEarnedAt}
										<span class="font-semibold text-warm">Earned {fmtDate(r.rewardEarnedAt)}</span>
									{:else}
										<span class="text-fade">—</span>
									{/if}
								</span>
								<span class="text-right md:row-auto">
									<span
										class="inline-flex border px-2 py-[3px] text-[9px] font-extrabold tracking-[0.12em] whitespace-nowrap uppercase {tag.tone}"
										>{tag.text}</span
									>
								</span>
								<!-- phone meta line -->
								<span class="col-span-2 text-[11.5px] text-soft md:hidden">{metaLine(r)}</span>
							</li>
						{/each}
					</ol>
				{/if}
			</section>
		{/if}
	</div>
</AgeShell>
