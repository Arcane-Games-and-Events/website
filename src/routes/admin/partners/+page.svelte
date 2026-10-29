<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
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

<DeskHeader
	kicker="Admin"
	title="Partners"
	subtitle="Partner accounts, promo codes and commission payouts."
>
	{#snippet actions(compact)}
		<a
			href="/admin/partners/new"
			class="inline-flex items-center bg-paper-bg px-3 text-[10px] font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-warm-light {compact
				? 'h-[30px]'
				: 'h-[36px]'}">+ New partner</a
		>
	{/snippet}
</DeskHeader>
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

	<Section
		title="Partners"
		class="mt-10"
		note="{ui.fmt(partners.length)} {partners.length === 1 ? 'partner' : 'partners'}"
	>
		<div class="{ui.rowHead} grid-cols-[minmax(0,1fr)_120px_80px_110px_90px_90px_100px_80px] gap-3">
			<span>Partner</span><span>Code</span><span class="text-right">Referrals</span><span
				class="text-right">Pending</span
			><span class="text-right">Paid</span><span>Status</span><span>Since</span><span></span>
		</div>
		<ul>
			{#each partners as p (p.id)}
				<li class={ui.row}>
					<a
						href="/admin/partners/{p.id}"
						class="group block py-3 transition-colors hover:bg-paper md:grid md:grid-cols-[minmax(0,1fr)_120px_80px_110px_90px_90px_100px_80px] md:items-center md:gap-3"
					>
						<span class="block min-w-0">
							<span class="{ui.titleText} block truncate group-hover:text-warm"
								>{p.firstName}
								{p.lastName}{#if p.displayName}<span class="font-normal text-soft">
										as “{p.displayName}”</span
									>{/if}</span
							>
							<span class="block truncate text-[11.5px] text-fade">{p.email}</span>
						</span>
						<span class="mt-1.5 flex flex-wrap items-center gap-1.5 md:contents">
							<span
								><code
									class="inline-block border border-line2 bg-paper px-1.5 py-[1px] text-[11px] tracking-[0.04em] text-warm"
									>{p.code}</code
								></span
							>
							<span class="text-[12.5px] tabular-nums md:text-right"
								><span class="text-fade md:hidden">Referrals </span>{ui.fmt(p.referralCount)}</span
							>
							<span class="text-[12.5px] tabular-nums md:text-right">
								<span class="text-fade md:hidden">Pending </span>{fmt(p.pendingCommission)}
								{#if Number(p.readyToPayAmount) > 0}<span class="block text-[10.5px] text-hero-rb"
										>{fmt(p.readyToPayAmount)} ready</span
									>{/if}
							</span>
							<span class="text-[12.5px] text-prem tabular-nums md:text-right"
								><span class="text-fade md:hidden">Paid </span>{fmt(p.paidCommission)}</span
							>
							<span
								><span class="{ui.pill} {p.isActive ? ui.pillTone.active : ui.pillTone.inactive}"
									>{p.isActive ? 'Active' : 'Inactive'}</span
								></span
							>
							<span class="text-[12.5px] text-soft tabular-nums">{fmtDate(p.createdAt)}</span>
						</span>
						<span class="hidden text-right md:block"
							><span class={ui.textAction}>Manage →</span></span
						>
					</a>
				</li>
			{:else}
				<li class={ui.empty}>
					No partners yet. <a href="/admin/partners/new" class="{ui.textAction} not-italic"
						>Create the first one →</a
					>
				</li>
			{/each}
		</ul>
	</Section>
</div>
