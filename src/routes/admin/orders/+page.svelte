<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { deserialize } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import Pager from '$lib/components/age/admin/Pager.svelte';
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

	const TYPE = {
		ticket: 'Ticket',
		course: 'Course',
		subscription: 'Membership',
		subscription_partner_first: 'Membership · partner',
		subscription_member_first: 'Membership · referral'
	};
	const typeLabel = (t) => TYPE[t] || 'Payment';
	const typeTone = (t) =>
		t === 'ticket'
			? ui.pillTone.in_progress
			: t?.startsWith('subscription')
				? ui.pillTone.premium
				: '';
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

<DeskHeader
	kicker="Admin"
	title="Orders"
	subtitle="Tickets and memberships — search, filter, drill in."
>
	{#snippet actions(compact)}
		<a
			href="/admin/analytics?view=revenue"
			class="inline-flex items-center border border-paper-bg/30 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-paper-bg/10 {compact
				? 'h-[30px]'
				: 'h-[36px]'}">Revenue →</a
		>
	{/snippet}
</DeskHeader>
<AdminTabs />

{#if form?.success}
	<AdminNotice tone="success" message={form.message} />
{/if}
{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
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

	<!-- search + filters -->
	<div class="mt-8 flex flex-wrap items-center gap-3">
		<label class="{ui.search} min-w-[260px] flex-1" aria-label="Search orders">
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
		<select bind:value={ordersTypeFilter} class={ui.select} aria-label="Type">
			<option value="all">All types</option>
			<option value="ticket">Tickets</option>
			<option value="subscription">Memberships</option>
			<option value="course">Courses</option>
		</select>
		<select bind:value={ordersDateFilter} class={ui.select} aria-label="Date">
			<option value="all">All time</option>
			<option value="today">Today</option>
			<option value="week">Last 7 days</option>
			<option value="month">This month</option>
		</select>
		<div class="flex gap-px border border-line2 bg-line2" role="group" aria-label="Sort">
			{#each SORTS as [k, l] (k)}
				<button
					type="button"
					onclick={() => setSort(k)}
					class="h-[38px] px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase {sortKey === k
						? 'bg-ink text-paper-bg'
						: 'bg-paper-bg text-soft hover:text-ink'}">{l}</button
				>
			{/each}
		</div>
	</div>
	{#if ordersSearchQuery.length >= 2 && ordersSearchResults !== null}
		<p class="{ui.note} mt-2">Searched all {ui.fmt(data.stats.totalOrders)} orders.</p>
	{/if}

	<Section
		title="Orders"
		class="mt-8"
		note="{ui.fmt(filteredOrders.length)} {filteredOrders.length === 1 ? 'order' : 'orders'}"
	>
		<div class="{ui.rowHead} grid-cols-[minmax(0,1fr)_150px_100px_110px_90px_60px] gap-3">
			<span>Customer</span><span>Type</span><span>Status</span><span>Date</span><span
				class="text-right">Amount</span
			><span></span>
		</div>
		<ul>
			{#each paginatedOrders as order (order.id)}
				<li class={ui.row}>
					<a
						href="/admin/orders/{order.id}"
						class="group block py-3 transition-colors hover:bg-paper md:grid md:grid-cols-[minmax(0,1fr)_150px_100px_110px_90px_60px] md:items-center md:gap-3"
					>
						<span class="block min-w-0">
							<span class="{ui.titleText} block truncate group-hover:text-warm"
								>{getUserName(order.userEmail)}</span
							>
							<span class="block truncate text-[11.5px] text-fade"
								>{order.userEmail}<span class="md:hidden">
									· {formatDate(order.createdAt)}</span
								></span
							>
						</span>
						<span class="mt-1.5 flex flex-wrap items-center gap-1.5 md:contents">
							<span class="{ui.pill} {typeTone(order.meta?.type)}"
								>{typeLabel(order.meta?.type)}</span
							>
							<span
								class="{ui.pill} {order.status === 'refunded'
									? ui.pillTone.refunded
									: order.status === 'active'
										? ui.pillTone.active
										: ''}">{order.status || 'completed'}</span
							>
						</span>
						<span class="hidden text-[12.5px] text-soft tabular-nums md:block"
							>{formatDate(order.createdAt)}</span
						>
						<span class="mt-1 block font-semibold tabular-nums md:mt-0 md:text-right"
							>{formatCurrency(order.amount)}</span
						>
						<span class="hidden text-right md:block"><span class={ui.textAction}>View →</span></span
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
	</Section>
</div>
