<script>
	import AdminHeader, { btn as hbtn } from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
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

	let show = $state('all');
	const shown = $derived(
		partners.filter((p) =>
			show === 'ready'
				? Number(p.readyToPayAmount) > 0
				: show === 'active'
					? p.isActive
					: show === 'inactive'
						? !p.isActive
						: true
		)
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

<svelte:head><title>Partners · Admin</title></svelte:head>

<AdminHeader title="Partners" subtitle="Partner accounts, promo codes and commission payouts.">
	{#snippet actions()}
		<a href="/admin/partners/new" class={hbtn}>+ New partner</a>
	{/snippet}
</AdminHeader>
<AdminTabs />

{#if totals.readyToPayCount > 0}
	<AdminNotice
		tone="info"
		message="{totals.readyToPayCount} referral{totals.readyToPayCount === 1
			? ''
			: 's'} ready to pay out, {fmt(
			totals.readyToPayAmount
		)} in all. A referral is payable 30 days after it was made."
	/>
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	<Figures
		items={[
			{
				label: 'Partners',
				value: ui.fmt(partners.length),
				note: `${ui.fmt(partners.filter((p) => p.isActive).length)} active`
			},
			{ label: 'Referrals', value: ui.fmt(totals.totalReferrals) },
			{ label: 'Pending payout', value: fmt(totals.totalPending), tone: 'text-warm' },
			{
				label: 'Ready to pay',
				value: fmt(totals.readyToPayAmount),
				tone: totals.readyToPayCount ? 'text-hero-rb' : ''
			},
			{ label: 'Paid out', value: fmt(totals.totalPaid), tone: 'text-prem' }
		]}
		cols="md:grid-cols-5"
	/>

	<div class="mt-10 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Show">
			{#each [{ id: 'all', label: 'All', n: partners.length }, { id: 'ready', label: 'Ready to pay', n: partners.filter((p) => Number(p.readyToPayAmount) > 0).length, tone: 'var(--color-hero-rb)' }, { id: 'active', label: 'Active', n: partners.filter((p) => p.isActive).length, tone: 'var(--color-gold)' }, { id: 'inactive', label: 'Inactive', n: partners.filter((p) => !p.isActive).length, tone: 'var(--color-line2)' }] as f (f.id)}
				<button
					type="button"
					onclick={() => (show = f.id)}
					aria-pressed={show === f.id}
					class="inline-flex h-[36px] items-center gap-2 border px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {show ===
					f.id
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}"
				>
					{#if f.tone}<span class="h-2 w-2" style="background: {f.tone}" aria-hidden="true"
						></span>{/if}
					{f.label} <span class="tabular-nums opacity-60">{f.n}</span>
				</button>
			{/each}
		</div>
		<span class={ui.note}>A referral is payable 30 days after it was made.</span>
	</div>

	<ul class="mt-4 flex flex-col gap-2">
		{#each shown as p (p.id)}
			{@const ready = Number(p.readyToPayAmount) > 0}
			{@const tone = ready
				? 'var(--color-hero-rb)'
				: p.isActive
					? 'var(--color-gold)'
					: 'var(--color-line2)'}
			<li>
				<a
					href="/admin/partners/{p.id}"
					class="group grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 border border-l-[4px] px-3.5 py-3.5 transition-[border-color,background-color] duration-200 md:grid-cols-[52px_minmax(0,1fr)_150px_260px_20px] md:gap-x-5 md:px-4 {ready
						? 'border-hero-rb/30 bg-hero-rb/[0.04] hover:border-hero-rb/60'
						: p.isActive
							? 'border-line2 bg-white hover:border-ink'
							: 'border-line2 bg-paper/60 hover:border-ink'}"
					style="border-left-color: {tone}"
				>
					<span
						class="ao-cond flex h-[48px] w-[48px] items-center justify-center text-[21px] leading-none font-black md:h-[52px] md:w-[52px] {p.isActive
							? 'bg-gold text-ink'
							: 'bg-line text-soft'}"
						aria-hidden="true"
						>{`${(p.firstName || '')[0] || ''}${(p.lastName || '')[0] || ''}`.toUpperCase() ||
							'?'}</span
					>
					<span class="min-w-0">
						<span class="flex flex-wrap items-center gap-2">
							<span
								class="truncate font-newsreader text-[18px] leading-tight font-semibold group-hover:text-warm"
								>{p.displayName || `${p.firstName} ${p.lastName}`}</span
							>
							{#if !p.isActive}<span
									class="border border-line2 px-1.5 py-px text-[9px] font-extrabold tracking-[0.14em] text-soft uppercase"
									>Inactive</span
								>{/if}
						</span>
						<span class="mt-0.5 block truncate text-[12px] text-fade"
							>{p.displayName ? `${p.firstName} ${p.lastName} · ` : ''}{p.email} · since {fmtDate(
								p.createdAt
							)}</span
						>
					</span>
					<!-- the code: what they hand out -->
					<span class="col-start-3 row-start-1 md:col-start-3">
						<code
							class="inline-block border-2 border-dashed px-2.5 py-1 font-mono text-[14px] font-semibold tracking-[0.06em] {p.isActive
								? 'border-gold text-ink'
								: 'border-line2 text-fade'}">{p.code}</code
						>
					</span>
					<span
						class="col-span-2 col-start-2 row-start-2 grid grid-cols-3 gap-3 md:col-span-1 md:col-start-4 md:row-start-1"
					>
						<span>
							<span class="{ui.label} block">Referrals</span>
							<span class="ao-cond text-[22px] leading-none font-black tabular-nums"
								>{ui.fmt(p.referralCount)}</span
							>
						</span>
						<span>
							<span class="{ui.label} block">{ready ? 'Ready' : 'Pending'}</span>
							<span
								class="ao-cond text-[22px] leading-none font-black tabular-nums {ready
									? 'text-hero-rb'
									: ''}">{fmt(ready ? p.readyToPayAmount : p.pendingCommission)}</span
							>
						</span>
						<span>
							<span class="{ui.label} block">Paid</span>
							<span class="ao-cond text-[22px] leading-none font-black text-prem tabular-nums"
								>{fmt(p.paidCommission)}</span
							>
						</span>
					</span>
					<span
						class="hidden text-warm transition-transform duration-200 group-hover:translate-x-0.5 md:block"
						aria-hidden="true">→</span
					>
				</a>
			</li>
		{:else}
			<li class={ui.empty}>
				{#if partners.length}Nobody here.{:else}No partners yet. <a
						href="/admin/partners/new"
						class="{ui.textAction} not-italic">Create the first one →</a
					>{/if}
			</li>
		{/each}
	</ul>
</div>
