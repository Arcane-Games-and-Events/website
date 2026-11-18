<script>
	import AdminHeader, { btnLine as hbtnLine } from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { deserialize } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Pager from '$lib/components/age/admin/Pager.svelte';
	import AdminSubnav from '$lib/components/age/admin/AdminSubnav.svelte';
	import { ORDERS_SUBNAV } from '$lib/components/age/admin/subnav.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, form } = $props();

	let ordersSearchQuery = $state('');
	let ordersSearchResults = $state(null);
	let ordersSearchLoading = $state(false);
	let ordersSearchTimeout = $state(null);
	let ordersTypeFilter = $state('all');
	let ordersDateFilter = $state('all');
	let ordersPage = $state(1);
	let ordersPerPage = 25;
	let ordersSortBy = $state('date');
	let ordersSortDir = $state('desc');

	async function searchOrdersOnServer(query) {
		if (!query || query.length < 2) {
			ordersSearchResults = null;
			return;
		}
		ordersSearchLoading = true;
		try {
			const formData = new FormData();
			formData.append('query', query);
			const response = await fetch('?/searchOrders', { method: 'POST', body: formData });
			const text = await response.text();
			const result = deserialize(text);
			if (result.type === 'success' && result.data?.results) {
				ordersSearchResults = result.data.results;
			} else if (result.type === 'failure') {
				console.error('Order search action failed:', result.data?.error || 'Unknown error');
			}
		} catch (err) {
			console.error('Order search error:', err);
		} finally {
			ordersSearchLoading = false;
		}
	}

	function handleOrderSearch(event) {
		const query = event.target.value;
		ordersSearchQuery = query;
		ordersPage = 1;
		if (ordersSearchTimeout) clearTimeout(ordersSearchTimeout);
		if (!query || query.length < 2) {
			ordersSearchResults = null;
			return;
		}
		ordersSearchTimeout = setTimeout(() => searchOrdersOnServer(query), 300);
	}

	const filteredOrders = $derived.by(() => {
		const baseOrders = ordersSearchResults !== null ? ordersSearchResults : data.allOrders || [];
		return baseOrders
			.filter((ord) => {
				if (ordersSearchResults === null && ordersSearchQuery) {
					const q = ordersSearchQuery.toLowerCase();
					const matchesEmail = ord.userEmail?.toLowerCase().includes(q);
					const matchesName = getUserName(ord.userEmail).toLowerCase().includes(q);
					const matchesId = ord.id?.toLowerCase().includes(q);
					const matchesTxn = ord.providerRef?.toLowerCase().includes(q);
					if (!matchesEmail && !matchesName && !matchesId && !matchesTxn) return false;
				}
				if (ordersTypeFilter !== 'all' && ord.meta?.type !== ordersTypeFilter) return false;
				if (ordersDateFilter !== 'all') {
					const orderDate = new Date(ord.createdAt);
					const now = new Date();
					if (ordersDateFilter === 'today') {
						const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
						if (orderDate < todayStart) return false;
					} else if (ordersDateFilter === 'week') {
						const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
						if (orderDate < weekAgo) return false;
					} else if (ordersDateFilter === 'month') {
						const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
						if (orderDate < monthStart) return false;
					}
				}
				return true;
			})
			.sort((a, b) => {
				if (ordersSortBy === 'amount') {
					const diff = parseFloat(a.amount) - parseFloat(b.amount);
					return ordersSortDir === 'asc' ? diff : -diff;
				}
				const diff = new Date(a.createdAt) - new Date(b.createdAt);
				return ordersSortDir === 'asc' ? diff : -diff;
			});
	});

	const paginatedOrders = $derived(
		filteredOrders.slice((ordersPage - 1) * ordersPerPage, ordersPage * ordersPerPage)
	);

	$effect(() => {
		ordersSearchQuery;
		ordersTypeFilter;
		ordersDateFilter;
		ordersPage = 1;
	});

	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			amount || 0
		);
	}

	function formatDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
		return new Date(date).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
	}

	const usersByEmail = $derived(new Map((data.allUsers || []).map((u) => [u.email, u])));

	function getUserName(email) {
		const user = usersByEmail.get(email);
		if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
		return email || 'Unknown';
	}

	// Each kind of order's colour, as on a member's page.
	const TYPES = {
		ticket: { word: 'Ticket', tone: 'var(--color-warm)' },
		course: { word: 'Course', tone: 'var(--color-gold)' },
		subscription: { word: 'Membership', tone: 'var(--color-prem)' },
		subscription_partner_first: { word: 'Membership · partner', tone: 'var(--color-prem)' },
		subscription_member_first: { word: 'Membership · referral', tone: 'var(--color-prem)' }
	};
	const typeOf = (t) => TYPES[t] || { word: 'Payment', tone: 'var(--color-ink)' };
	const TYPE_CHIPS = [
		{ id: 'all', label: 'All' },
		{ id: 'ticket', label: 'Tickets', tone: TYPES.ticket.tone },
		{ id: 'subscription', label: 'Memberships', tone: TYPES.subscription.tone },
		{ id: 'course', label: 'Courses', tone: TYPES.course.tone }
	];
	const typeCounts = $derived.by(() => {
		const c = { all: 0, ticket: 0, subscription: 0, course: 0 };
		for (const o of data.allOrders || []) {
			c.all++;
			if (o.meta?.type in c) c[o.meta.type]++;
		}
		return c;
	});
	const DATES = [
		['all', 'All time'],
		['today', 'Today'],
		['week', 'Last 7 days'],
		['month', 'This month']
	];
	const orderTitle = (o) =>
		o.meta?.eventTitle ||
		o.meta?.courseTitle ||
		o.meta?.product ||
		(o.meta?.subscriptionType || o.meta?.plan
			? `${(o.meta.subscriptionType || o.meta.plan) === 'yearly' ? 'Annual' : 'Monthly'} membership`
			: typeOf(o.meta?.type).word);
	const SORTS = [
		['date-desc', 'Newest'],
		['date-asc', 'Oldest'],
		['amount-desc', 'Largest'],
		['amount-asc', 'Smallest']
	];
	const sortKey = $derived(`${ordersSortBy}-${ordersSortDir}`);
	const setSort = (k) => {
		[ordersSortBy, ordersSortDir] = k.split('-');
	};
	const filtering = $derived(
		!!ordersSearchQuery || ordersTypeFilter !== 'all' || ordersDateFilter !== 'all'
	);
</script>

<svelte:head><title>Orders · Admin</title></svelte:head>

<AdminHeader title="Orders" subtitle="Tickets and memberships — search, filter, drill in.">
	{#snippet actions()}
		<a href="/admin/analytics?view=revenue" class={hbtnLine}>Revenue →</a>
	{/snippet}
</AdminHeader>
<AdminTabs />
<AdminSubnav items={ORDERS_SUBNAV} label="Orders" />

{#if form?.success}
	<AdminNotice tone="success" message={form.message} />
{/if}
{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}

<div class="mx-auto w-full max-w-page px-5 pt-6 pb-20 md:px-8">
	<Figures
		items={[
			{ label: 'Orders', value: ui.fmt(data.stats?.totalOrders) },
			{
				label: 'This month',
				value: ui.money(data.revenueStats?.month, 0),
				tone: 'text-prem',
				note: 'orders placed'
			},
			{ label: 'All time', value: ui.money(data.revenueStats?.allTime, 0) },
			{
				label: 'Refunded tickets',
				value: ui.fmt(data.refundStats?.refundedTickets),
				tone: data.refundStats?.refundedTickets ? 'text-hero-rb' : ''
			},
			{ label: 'Members', value: ui.fmt(data.stats?.premiumUsers), note: 'premium accounts' },
			{
				label: 'Matching',
				value: ui.fmt(filteredOrders.length),
				note: filtering ? 'with current filters' : 'all orders'
			}
		]}
	/>

	<!-- search, filters, sort -->
	<div class="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<label class="{ui.search} w-full lg:max-w-md" aria-label="Search orders">
			<svg
				viewBox="0 0 20 20"
				class="h-4 w-4 shrink-0 text-fade"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				aria-hidden="true"
			>
				<circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" stroke-linecap="round" />
			</svg>
			<input
				type="search"
				value={ordersSearchQuery}
				oninput={handleOrderSearch}
				placeholder="Email, name, order id or transaction"
				class={ui.searchInput}
			/>
			{#if ordersSearchLoading}
				<span
					class="h-3.5 w-3.5 shrink-0 animate-spin border-2 border-line2 border-t-ink"
					aria-hidden="true"
				></span>
			{/if}
		</label>
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Type">
			{#each TYPE_CHIPS as f (f.id)}
				<button
					type="button"
					onclick={() => (ordersTypeFilter = f.id)}
					aria-pressed={ordersTypeFilter === f.id}
					class="inline-flex h-9 items-center gap-2 border px-3 text-xs font-extrabold tracking-widest uppercase transition-colors {ordersTypeFilter ===
					f.id
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}"
				>
					{#if f.tone}<span class="h-2 w-2" style="background: {f.tone}" aria-hidden="true"
						></span>{/if}
					{f.label}
					<span class="tabular-nums opacity-60">{ui.fmt(typeCounts[f.id] || 0)}</span>
				</button>
			{/each}
		</div>
	</div>
	<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="When">
			{#each DATES as [k, l] (k)}
				<button
					type="button"
					onclick={() => (ordersDateFilter = k)}
					aria-pressed={ordersDateFilter === k}
					class="h-8 border px-3 text-xs font-extrabold tracking-widest uppercase transition-colors {ordersDateFilter ===
					k
						? 'border-warm bg-warm text-white'
						: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}">{l}</button
				>
			{/each}
		</div>
		<div class="flex w-full items-center gap-2 sm:w-auto">
			<span class={ui.label}>Sort</span>
			<div
				class="flex min-w-0 flex-1 gap-px border border-line2 bg-line2 sm:flex-none"
				role="group"
				aria-label="Sort"
			>
				{#each SORTS as [k, l] (k)}
					<button
						type="button"
						onclick={() => setSort(k)}
						aria-pressed={sortKey === k}
						class="h-8 flex-1 px-1.5 text-xs font-extrabold tracking-wide uppercase sm:px-3 sm:tracking-widest {sortKey ===
						k
							? 'bg-ink text-paper-bg'
							: 'bg-white text-soft hover:text-ink'}">{l}</button
					>
				{/each}
			</div>
		</div>
	</div>
	<p class="mt-3 {ui.note}">
		{#if ordersSearchQuery.length >= 2 && ordersSearchResults !== null}
			{ui.fmt(filteredOrders.length)} found across all {ui.fmt(data.stats.totalOrders)} orders
		{:else}
			Showing {ui.fmt(filteredOrders.length)}
			{filteredOrders.length === 1 ? 'order' : 'orders'}{filtering ? ' with these filters' : ''}
		{/if}
	</p>

	<ul class="mt-4 flex flex-col gap-2">
		{#each paginatedOrders as order (order.id)}
			{@const ty = typeOf(order.meta?.type)}
			{@const refunded = order.status === 'refunded'}
			{@const d = new Date(order.createdAt)}
			<li>
				<a
					href="/admin/orders/{order.id}"
					class="group grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 border border-l-4 px-3.5 py-3 transition duration-200 md:grid-cols-[60px_minmax(0,1fr)_200px_120px_20px] md:gap-x-5 md:px-4 {refunded
						? 'border-hero-rb/30 bg-hero-rb/5 hover:border-hero-rb/60'
						: 'border-line2 bg-white hover:border-ink'}"
					style="border-left-color: {refunded ? 'var(--color-hero-rb)' : ty.tone}"
				>
					<!-- the date stub -->
					<span class="flex flex-col items-center leading-none">
						<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
							>{formatDate(order.createdAt, { month: 'short' })}</span
						>
						<span class="ao-cond text-3xl font-black tabular-nums">{d.getUTCDate()}</span>
						<span class="text-xs text-fade tabular-nums">{d.getUTCFullYear()}</span>
					</span>
					<span class="min-w-0">
						<span
							class="block truncate font-newsreader text-lg leading-tight font-semibold group-hover:text-warm"
							>{getUserName(order.userEmail)}</span
						>
						<span class="mt-0.5 block truncate text-xs text-fade"
							>{getUserName(order.userEmail) !== order.userEmail
								? `${order.userEmail} · `
								: ''}{orderTitle(order)}</span
						>
					</span>
					<!-- type and status: what to scan for -->
					<span
						class="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-1.5 md:col-span-1 md:col-start-3 md:row-start-1"
					>
						<span
							class="px-2 py-1 text-xs font-extrabold tracking-widest text-white uppercase"
							style="background: {ty.tone}">{ty.word}</span
						>
						{#if refunded}
							<span
								class="bg-hero-rb px-2 py-1 text-xs font-extrabold tracking-widest text-white uppercase"
								>Refunded</span
							>
						{:else}
							<span
								class="border border-line2 px-2 py-0.5 text-xs font-extrabold tracking-widest text-soft uppercase"
								>{order.status === 'active' ? 'Active' : 'Paid'}</span
							>
						{/if}
					</span>
					<span
						class="ao-cond col-start-3 row-start-1 text-right text-2xl leading-none font-black tabular-nums md:col-start-4 md:text-3xl {refunded
							? 'text-fade line-through'
							: ''}">{formatCurrency(order.amount)}</span
					>
					<span
						class="hidden text-warm transition-transform duration-200 group-hover:translate-x-0.5 md:block"
						aria-hidden="true">→</span
					>
				</a>
			</li>
		{:else}
			<li class={ui.empty}>
				{filtering
					? 'No orders match these filters.'
					: 'No orders yet. They appear here as customers buy tickets and memberships.'}
			</li>
		{/each}
	</ul>
	<Pager
		page={ordersPage}
		perPage={ordersPerPage}
		count={filteredOrders.length}
		label="orders"
		onchange={(p) => (ordersPage = p)}
	/>
</div>
