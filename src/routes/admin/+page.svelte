<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { onMount } from 'svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	// ============ greeting + dateline (the admin's own clock) ============
	let greeting = $state('Welcome back');
	let dateline = $state('');
	onMount(() => {
		const h = new Date().getHours();
		greeting =
			h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
		dateline = new Date().toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	});

	const name = $derived(data.firstName || 'there');
	const money = (v) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(Number(v) || 0);
	const fmt = (v) => Number(v || 0).toLocaleString('en-US');
	const when = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const ago = (d) => {
		const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
		if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
		if (s < 86400) return `${Math.round(s / 3600)}h ago`;
		return when(d);
	};
	const orderKind = (meta) =>
		({
			ticket: 'Ticket',
			subscription: 'Membership',
			subscription_partner_first: 'Membership · partner code',
			subscription_member_first: 'Membership · referral',
			course: 'Course'
		})[meta?.type] || 'Order';

	// ============ needs attention ============
	const needs = $derived.by(() => {
		const a = data.needs;
		if (!a) return [];
		const one = (count, singular, plural, href, tone = 'text-warm') =>
			count ? [{ count, text: count === 1 ? singular : plural, href, tone }] : [];
		return [
			...one(
				a.paymentFailed,
				'member with a failed payment',
				'members with failed payments',
				'/admin/users',
				'text-hero-rb'
			),
			...one(
				a.payoutsDue,
				'partner payout due',
				'partner payouts due',
				'/admin/partners',
				'text-hero-rb'
			),
			...one(
				a.eventsUnclosed,
				'past event not closed out',
				'past events not closed out',
				'/admin/events',
				'text-hero-rb'
			),
			...one(
				a.eventsSoon,
				'event in the next two weeks',
				'events in the next two weeks',
				'/admin/events'
			),
			...one(a.deskReviews, 'Desk edit awaiting review', 'Desk edits awaiting review', '/desk'),
			...one(a.vodsUnpublished, 'VOD not yet published', 'VODs not yet published', '/admin/vods')
		];
	});
	const summary = $derived.by(() => {
		const urgent = needs.filter((x) => x.tone === 'text-hero-rb');
		if (urgent.length) return `${urgent[0].count} ${urgent[0].text}.`;
		if (needs.length) return `${needs[0].count} ${needs[0].text}.`;
		return 'Nothing needs your attention right now.';
	});

	// ============ figures ============
	const figures = $derived([
		data.ledger
			? {
					label: 'Revenue this month',
					value: money(data.ledger.thisMonth),
					note: `${money(data.ledger.lastMonth)} last month`
				}
			: { label: 'Revenue this month', value: money(data.revenue?.month), note: 'orders placed' },
		{
			label: 'Paying members',
			value: fmt(data.members?.paying),
			note: `${fmt(data.members?.monthly)} monthly · ${fmt(data.members?.yearly)} yearly`
		},
		{ label: 'Comped members', value: fmt(data.members?.comped), note: 'premium, no subscription' },
		{ label: 'MRR', value: money(data.members?.mrr), note: '$10 monthly · $110 yearly' },
		{
			label: 'Tickets sold',
			value: fmt(data.counts?.totalTicketsSold),
			note: `${fmt(data.counts?.totalRefunded)} refunded`
		},
		{
			label: 'Upcoming events',
			value: fmt(data.counts?.upcomingEvents),
			note: `${fmt(data.counts?.pastEvents)} past`
		}
	]);

	// ============ sections ============
	const sections = $derived([
		{ href: '/admin/analytics', label: 'Analytics', note: 'Revenue, members, projections, site' },
		{
			href: '/admin/orders',
			label: 'Orders',
			note: `${fmt(data.counts?.totalOrders)} orders`,
			count: data.counts?.totalOrders
		},
		{
			href: '/admin/users',
			label: 'Members',
			note: `${fmt(data.counts?.totalUsers)} accounts`,
			count: data.counts?.totalUsers
		},
		{
			href: '/admin/events',
			label: 'Events',
			note: `${fmt(data.counts?.totalEvents)} events`,
			count: data.counts?.totalEvents
		},
		{ href: '/admin/calendar', label: 'Calendar', note: 'LSS seasons and dates' },
		{ href: '/admin/vods', label: 'VODs', note: 'Tournament recordings' },
		{ href: '/admin/partners', label: 'Partners', note: 'Promo codes and payouts' },
		{ href: '/desk', label: 'Desk', note: 'Articles, videos and courses' }
	]);
</script>

<svelte:head><title>Admin · Arcane Games</title></svelte:head>

<DeskHeader kicker="Admin" title="{greeting}, {name}." subtitle={summary}>
	{#snippet lead()}
		<span aria-hidden="true">◆</span> Admin{#if dateline}<span class="text-paper-bg/50">
				· {dateline}</span
			>{/if}
	{/snippet}
</DeskHeader>
<AdminTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 pb-20 md:px-8">
	<!-- figures -->
	<dl class="grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-3 xl:grid-cols-6">
		{#each figures as f (f.label)}
			<div class="bg-paper-bg px-4 py-4 md:px-5">
				<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">{f.label}</dt>
				<dd class="ao-cond mt-2 text-[32px] leading-none font-black tabular-nums">{f.value}</dd>
				<dd class="mt-1.5 text-[11px] text-soft">{f.note}</dd>
			</div>
		{/each}
	</dl>

	<div class="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
		<div class="min-w-0">
			<!-- needs attention -->
			<section>
				<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
					<h2
						class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px] text-hero-rb">◆</span>Needs attention
					</h2>
				</div>
				{#if needs.length}
					<ul>
						{#each needs as item (item.text)}
							<li class="border-b border-line2">
								<a href={item.href} class="flex items-baseline gap-4 py-3 hover:bg-paper">
									<span
										class="ao-cond w-10 shrink-0 text-[24px] leading-none font-black tabular-nums {item.tone}"
										>{item.count}</span
									>
									<span class="font-newsreader text-[17px]">{item.text}</span>
									<span
										class="ml-auto text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase"
										>Open →</span
									>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="py-6 font-newsreader text-[17px] text-soft italic">
						All clear. Nothing is waiting on you.
					</p>
				{/if}
			</section>

			<!-- sections -->
			<section class="mt-12">
				<div class="border-b-[3px] border-ink pb-2">
					<h2
						class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px] text-warm">◆</span>Sections
					</h2>
				</div>
				<ul class="mt-4 grid gap-px border border-line2 bg-line2 sm:grid-cols-2 lg:grid-cols-3">
					{#each sections as s (s.href)}
						<li class="bg-paper-bg">
							<a href={s.href} class="group block px-5 py-5 hover:bg-paper">
								<span class="block font-newsreader text-[20px] font-semibold group-hover:text-warm"
									>{s.label}</span
								>
								<span class="mt-1 block text-[12px] text-soft">{s.note}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<aside class="min-w-0">
			<section>
				<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
					<h2
						class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px] text-warm">◆</span>Next events
					</h2>
					<a
						href="/admin/events"
						class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
						>All →</a
					>
				</div>
				{#if data.events.length}
					<ul>
						{#each data.events as e (e.id)}
							<li class="border-b border-line2">
								<a
									href="/admin/events/{e.id}"
									class="flex items-baseline gap-3 py-3 hover:bg-paper"
								>
									<span
										class="w-14 shrink-0 text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>{when(e.eventDate)}</span
									>
									<span class="min-w-0 truncate font-newsreader text-[16px] font-semibold"
										>{e.title}</span
									>
									<span class="ml-auto shrink-0 text-[11px] text-soft tabular-nums"
										>{e.sold}{e.playerCap ? `/${e.playerCap}` : ''}</span
									>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="py-5 font-newsreader text-[16px] text-soft italic">No upcoming events.</p>
				{/if}
			</section>

			<section class="mt-10">
				<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
					<h2
						class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px] text-prem">◆</span>Recent orders
					</h2>
					<a
						href="/admin/orders"
						class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
						>All →</a
					>
				</div>
				{#if data.orders.length}
					<ul>
						{#each data.orders as o (o.id)}
							<li class="border-b border-line2">
								<a
									href="/admin/orders/{o.id}"
									class="flex items-baseline gap-3 py-3 hover:bg-paper"
								>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-[13px]">{o.userEmail || 'Guest'}</span>
										<span
											class="block text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
											>{orderKind(o.meta)} · {ago(o.createdAt)}</span
										>
									</span>
									<span class="shrink-0 font-semibold tabular-nums">{money(o.amount)}</span>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="py-5 font-newsreader text-[16px] text-soft italic">No orders yet.</p>
				{/if}
			</section>
		</aside>
	</div>
</div>
