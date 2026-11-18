<script>
	import AdminHeader from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { onMount } from 'svelte';
	import { circuitVar } from '$lib/data/circuits.js';
	import EventRow from '$lib/components/age/store/EventRow.svelte';

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

	const orderTone = (meta) =>
		meta?.type === 'ticket'
			? 'bg-warm'
			: meta?.type === 'course'
				? 'bg-academy'
				: String(meta?.type || '').startsWith('subscription')
					? 'bg-prem'
					: 'bg-fade';

	// ============ needs attention ============
	const needs = $derived.by(() => {
		const a = data.needs;
		if (!a) return [];
		const one = (count, singular, plural, href, tone = 'text-warm') =>
			count ? [{ count, text: count === 1 ? singular : plural, href, tone }] : [];
		return [
			...one(
				a.inboxUnread,
				'unread message in the inbox',
				'unread messages in the inbox',
				'/admin/inbox?show=unread',
				'text-hero-rb'
			),
			...one(
				a.refundRequests,
				'ticket refund request to review',
				'ticket refund requests to review',
				'/admin/orders/refunds',
				'text-hero-rb'
			),
			...one(
				a.unknownCharges,
				'membership charge with an unknown outcome',
				'membership charges with unknown outcomes',
				'/admin/orders/subscriptions',
				'text-hero-rb'
			),
			...one(
				a.arbReview,
				'old Authorize.net subscription to review',
				'old Authorize.net subscriptions to review',
				'/admin/orders/migration',
				'text-hero-rb'
			),
			...one(
				a.pastDue || a.paymentFailed,
				'member with a failed payment',
				'members with failed payments',
				'/admin/orders/subscriptions',
				'text-hero-rb'
			),
			...one(
				a.storePayouts,
				'store payout ready to pay',
				'store payouts ready to pay',
				'/admin/circuits',
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
			...one(
				a.compsEnding,
				'comp ending in the next two weeks',
				'comps ending in the next two weeks',
				'/admin/analytics?view=members'
			),
			...one(a.deskReviews, 'Desk edit awaiting review', 'Desk edits awaiting review', '/desk'),
			...one(a.vodsUnpublished, 'VOD not yet published', 'VODs not yet published', '/studio/media')
		];
	});
	const summary = $derived.by(() => {
		const urgent = needs.filter((x) => x.tone === 'text-hero-rb');
		if (urgent.length) return `${urgent[0].count} ${urgent[0].text}.`;
		if (needs.length) return `${needs[0].count} ${needs[0].text}.`;
		return 'Nothing needs your attention right now.';
	});

	// ============ revenue ============
	const thisMonth = $derived(
		data.ledger ? data.ledger.thisMonth : Number(data.revenue?.month) || 0
	);
	const lastMonth = $derived(data.ledger?.lastMonth ?? null);
	const months = $derived(data.months ?? []);
	const peak = $derived(Math.max(1, ...months.map((m) => m.net)));
	const year = $derived(months.reduce((t, m) => t + m.net, 0));
	const split = $derived.by(() => {
		const subs = Number(data.share?.subscriptions) || 0;
		const tix = Number(data.share?.tickets) || 0;
		const all = subs + tix;
		return all ? { subs, tix, subsPct: Math.round((subs / all) * 100) } : null;
	});

	// ============ figures ============
	const figures = $derived([
		{
			label: 'Paying members',
			value: fmt(data.members?.paying),
			note: `${fmt(data.members?.monthly)} monthly · ${fmt(data.members?.yearly)} yearly`,
			tone: 'border-prem'
		},
		{
			label: 'MRR',
			value: money(data.members?.mrr),
			note: '$10 monthly · $110 yearly',
			tone: 'border-prem'
		},
		{
			label: 'Comped members',
			value: fmt(data.members?.comped),
			note: 'premium, no subscription',
			tone: 'border-gold'
		},
		{
			label: 'Tickets sold',
			value: fmt(data.counts?.totalTicketsSold),
			note: `${fmt(data.counts?.totalRefunded)} refunded`,
			tone: 'border-warm'
		},
		{
			label: 'Upcoming events',
			value: fmt(data.counts?.upcomingEvents),
			note: `${fmt(data.counts?.pastEvents)} past`,
			tone: 'border-warm'
		}
	]);

	// ============ sections ============
	// The Studio is left out while AGE Studios is hidden from the site.
	const sections = $derived([
		{
			href: '/admin/analytics',
			label: 'Analytics',
			note: 'Revenue, members, projections, site',
			tone: 'bg-ink'
		},
		{
			href: '/admin/orders',
			label: 'Orders',
			note: `${fmt(data.counts?.totalOrders)} orders`,
			tone: 'bg-prem'
		},
		{
			href: '/admin/users',
			label: 'Members',
			note: `${fmt(data.counts?.totalUsers)} accounts`,
			tone: 'bg-warm'
		},
		{
			href: '/admin/events',
			label: 'Events',
			note: `${fmt(data.counts?.totalEvents)} ${data.counts?.totalEvents === 1 ? 'event' : 'events'}`,
			tone: 'bg-hero-rb'
		},
		{ href: '/admin/calendar', label: 'Calendar', note: 'LSS seasons and dates', tone: 'bg-gold' },
		{
			href: '/admin/partners',
			label: 'Partners',
			note: 'Promo codes and payouts',
			tone: 'bg-warm-deep'
		},
		{ href: '/desk', label: 'Desk', note: 'Articles and their videos', tone: 'bg-gold' },
		{
			href: '/classroom',
			label: 'Classroom',
			note: 'Courses, teachers and payouts',
			tone: 'bg-academy'
		}
	]);
</script>

<svelte:head><title>Admin · Arcane Games</title></svelte:head>

<AdminHeader title="{greeting}, {name}." subtitle={summary}>
	{#snippet lead()}
		<span class="text-gold">◆</span> Admin{#if dateline}&nbsp;<span class="text-paper-bg/50"
				>· {dateline}</span
			>{/if}
	{/snippet}
</AdminHeader>
<AdminTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 pb-20 md:px-8">
	<!-- the month at a glance -->
	<div
		class="mt-10 grid gap-px border border-line2 bg-line2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
	>
		<!-- revenue -->
		<section class="min-w-0 bg-paper-bg px-5 py-6 md:px-7 md:py-7">
			<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
				<h2
					class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
				>
					<span class="text-[8px] text-prem">◆</span>Revenue so far this month
				</h2>
				<a
					href="/admin/analytics"
					class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
					>Analytics →</a
				>
			</div>
			<div class="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
				<p class="ao-cond text-[72px] leading-[0.85] font-black tabular-nums md:text-[96px]">
					{money(thisMonth)}
				</p>
				{#if lastMonth !== null}
					<p class="pb-1.5 text-[12px] text-soft">
						{money(lastMonth)} in all of last month
					</p>
				{/if}
			</div>

			{#if months.length}
				<!-- twelve months, the current one in orange -->
				<div class="mt-7">
					<ol
						class="flex h-[132px] items-end gap-[3px] border-b border-ink"
						aria-label="Net revenue by month"
					>
						{#each months as m, i (m.month)}
							{@const current = i === months.length - 1}
							<li
								class="group relative flex h-full flex-1 items-end"
								aria-label="{m.label}: {money(m.net)}"
							>
								<span
									class="block w-full transition-colors {current
										? 'bg-warm'
										: 'bg-ink/80 group-hover:bg-ink'}"
									style="height: {Math.max(2, (Math.max(0, m.net) / peak) * 100)}%"
								></span>
								<span
									class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-paper-bg tabular-nums opacity-0 transition-opacity group-hover:opacity-100"
									>{m.label} · {money(m.net)}</span
								>
							</li>
						{/each}
					</ol>
					<ol class="mt-1.5 flex gap-[3px]" aria-hidden="true">
						{#each months as m, i (m.month)}
							<li
								class="flex-1 text-center text-[9px] font-extrabold tracking-[0.08em] uppercase {i ===
								months.length - 1
									? 'text-warm'
									: 'text-fade'}"
							>
								{m.label.slice(0, 1)}<span class="max-sm:hidden">{m.label.slice(1, 3)}</span>
							</li>
						{/each}
					</ol>
				</div>
				<div class="mt-5 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8">
					<p class="text-[12px] text-soft">
						<span class="ao-cond mr-1.5 text-[24px] leading-none font-black text-ink tabular-nums"
							>{money(year)}</span
						>in the last 12 months
					</p>
					{#if split}
						<div class="min-w-0">
							<div class="flex h-2 gap-[2px]" aria-hidden="true">
								<span class="bg-prem" style="width: {split.subsPct}%"></span>
								<span class="flex-1 bg-warm"></span>
							</div>
							<div
								class="mt-1.5 flex justify-between gap-3 text-[10px] font-extrabold tracking-[0.12em] uppercase"
							>
								<span class="text-prem">Memberships {money(split.subs)}</span>
								<span class="text-warm">Tickets {money(split.tix)}</span>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</section>

		<!-- briefing -->
		<section class="min-w-0 bg-ink px-5 py-6 text-paper-bg md:px-7 md:py-7">
			<h2
				class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
			>
				<span class="text-[8px] text-warm">◆</span>Your briefing
			</h2>
			{#if needs.length}
				<ul class="mt-4">
					{#each needs as item (item.text)}
						<li class="border-b border-paper-bg/15 last:border-b-0">
							<a href={item.href} class="group flex items-baseline gap-4 py-2.5">
								<span
									class="ao-cond w-10 shrink-0 text-[28px] leading-none font-black tabular-nums {item.tone ===
									'text-hero-rb'
										? 'text-warm-light'
										: 'text-paper-bg/60'}">{item.count}</span
								>
								<span class="font-newsreader text-[16px] leading-snug group-hover:underline"
									>{item.text}</span
								>
								<span class="ml-auto text-[12px] text-paper-bg/40 group-hover:text-paper-bg">→</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="ao-cond mt-6 text-[56px] leading-none font-black uppercase">All clear.</p>
				<p class="mt-3 font-newsreader text-[17px] text-paper-bg/70 italic">
					Nothing is waiting on you.
				</p>
			{/if}
		</section>
	</div>

	<!-- figures -->
	<dl class="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
		{#each figures as f (f.label)}
			<div class="border-t-[3px] pt-3 {f.tone}">
				<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">{f.label}</dt>
				<dd class="ao-cond mt-2 text-[40px] leading-none font-black tabular-nums">{f.value}</dd>
				<dd class="mt-1.5 text-[11px] text-soft">{f.note}</dd>
			</div>
		{/each}
	</dl>

	<!-- next events -->
	<section class="mt-14">
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
			<ul class="mt-4 flex flex-col gap-3">
				{#each data.events as e (e.id)}
					<EventRow {e} href="/admin/events/{e.id}" color={circuitVar(e.circuit)} now={data.now} />
				{/each}
			</ul>
		{:else}
			<p class="py-5 font-newsreader text-[16px] text-soft italic">No upcoming events.</p>
		{/if}
	</section>

	{#if data.storeEvents.length}
		<!-- events stores scheduled themselves (live without approval) -->
		<section class="mt-14">
			<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
				<h2
					class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
				>
					<span class="text-[8px] text-hero-rb">◆</span>New store events
				</h2>
				<span class="text-[11px] text-fade">Scheduled by stores in the last two weeks</span>
			</div>
			<ul class="mt-4 flex flex-col gap-5">
				{#each data.storeEvents as e (e.id)}
					<li>
						<p class="mb-1.5 text-[11.5px] text-soft">
							<a href="/admin/stores/{e.storeSlug}" class="font-semibold text-ink hover:underline"
								>{e.storeName}</a
							>
							· scheduled {ago(e.createdAt)}
						</p>
						<ul>
							<EventRow
								{e}
								href="/admin/events/{e.id}"
								color={circuitVar(e.circuit)}
								now={data.now}
							/>
						</ul>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- recent orders -->
	<section class="mt-14">
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
			<ul class="grid md:grid-cols-2 md:gap-x-10">
				{#each data.orders as o (o.id)}
					<li class="border-b border-line2">
						<a href="/admin/orders/{o.id}" class="flex items-center gap-3 py-3 hover:bg-paper">
							<span class="h-2 w-2 shrink-0 {orderTone(o.meta)}" aria-hidden="true"></span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[13px]">{o.userEmail || 'Guest'}</span>
								<span class="block text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
									>{orderKind(o.meta)} · {ago(o.createdAt)}</span
								>
							</span>
							<span class="ao-cond shrink-0 text-[20px] font-black tabular-nums"
								>{money(o.amount)}</span
							>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-5 font-newsreader text-[16px] text-soft italic">No orders yet.</p>
		{/if}
	</section>

	<!-- sections -->
	<section class="mt-14">
		<div class="border-b-[3px] border-ink pb-2">
			<h2
				class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
			>
				<span class="text-[8px] text-warm">◆</span>Sections
			</h2>
		</div>
		<ul class="mt-4 grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-4">
			{#each sections as s (s.href)}
				<li class="bg-paper-bg">
					<a href={s.href} class="group relative block h-full px-5 pt-6 pb-5 hover:bg-paper">
						<span
							class="absolute inset-x-0 top-0 h-[4px] transition-[height] group-hover:h-[7px] {s.tone}"
							aria-hidden="true"
						></span>
						<span class="ao-cond block text-[26px] leading-none font-black uppercase md:text-[30px]"
							>{s.label}</span
						>
						<span class="mt-2 block text-[12px] text-soft">{s.note}</span>
						<span
							class="mt-4 block text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase group-hover:text-warm"
							>Open →</span
						>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
