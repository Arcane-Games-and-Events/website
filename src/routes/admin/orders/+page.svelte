<script>
	import { deserialize } from '$app/forms';

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

	const totalOrdersPages = $derived(Math.ceil(filteredOrders.length / ordersPerPage));
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
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
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

	function typeChip(t) {
		switch (t) {
			case 'ticket':
				return 'bg-warm text-white';
			case 'course':
				return 'bg-accent text-white';
			case 'subscription':
				return 'bg-prem text-white';
			default:
				return 'border-line2 text-fade border';
		}
	}

	function statusChip(s) {
		if (s === 'refunded') return 'bg-warm text-white';
		return 'bg-prem text-white';
	}
</script>

<svelte:head><title>Orders · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Orders
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<a
			href="/admin/analytics"
			class="font-mono-system text-fade hover:text-ink text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
		>
			Full Analytics →
		</a>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		Every order, one desk.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Tickets, subscriptions, courses — search, filter, drill in.
	</p>
</header>

{#if form?.success}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.message}</p>
		</div>
	</section>
{/if}
{#if form?.error}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.error}</p>
		</div>
	</section>
{/if}

<!-- ============ QUICK STATS ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[28px]">
		<div class="grid grid-cols-2 gap-[24px] md:grid-cols-4">
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Total Orders</span>
				<div class="font-archivo text-ink mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{data.stats?.totalOrders || 0}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">This Month</span>
				<div class="font-archivo text-prem mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{formatCurrency(data.revenueStats?.month || 0)}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Filtered</span>
				<div class="font-archivo text-ink mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{filteredOrders.length}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Showing</span>
				<div class="font-archivo text-ink mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{paginatedOrders.length}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ============ FILTERS ============ -->
<section class="border-ink border-b-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[24px]">
		<div class="flex flex-col gap-[14px] lg:flex-row lg:items-center lg:justify-between">
			<div class="relative flex-1 lg:max-w-md">
				<input
					type="text"
					value={ordersSearchQuery}
					oninput={handleOrderSearch}
					placeholder="Search email, name, order ID, or transaction ref"
					class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
				/>
				{#if ordersSearchLoading}
					<div class="absolute top-1/2 right-3 -translate-y-1/2">
						<svg class="text-warm h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
					</div>
				{/if}
				{#if ordersSearchQuery.length >= 2 && ordersSearchResults !== null}
					<p class="font-mono-system text-fade mt-[6px] text-[10px] font-bold tracking-[0.08em] uppercase">
						Searching all {data.stats.totalOrders} orders
					</p>
				{/if}
			</div>

			<div class="flex flex-wrap gap-[10px]">
				<select
					bind:value={ordersTypeFilter}
					class="border-ink bg-paper-bg text-ink font-mono-system border-[1.5px] px-[12px] py-[9px] text-[11px] font-bold tracking-[0.08em] uppercase focus:outline-none"
				>
					<option value="all">All Types</option>
					<option value="ticket">Tickets</option>
					<option value="course">Courses</option>
					<option value="subscription">Subscriptions</option>
				</select>
				<select
					bind:value={ordersDateFilter}
					class="border-ink bg-paper-bg text-ink font-mono-system border-[1.5px] px-[12px] py-[9px] text-[11px] font-bold tracking-[0.08em] uppercase focus:outline-none"
				>
					<option value="all">All Time</option>
					<option value="today">Today</option>
					<option value="week">Last 7 Days</option>
					<option value="month">This Month</option>
				</select>
			</div>
		</div>
	</div>
</section>

<!-- ============ ORDERS ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<!-- Mobile cards -->
		<div class="space-y-[14px] lg:hidden">
			{#each paginatedOrders as order (order.id)}
				<a
					href="/admin/orders/{order.id}"
					class="border-ink hover:bg-panel block border-[1.5px] p-4 transition-colors"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="font-newsreader text-[16px] font-semibold">{getUserName(order.userEmail)}</div>
							<div class="text-fade text-[12px]">{order.userEmail}</div>
							<div class="font-mono-system text-fade mt-[4px] text-[10px] font-bold tracking-[0.06em] uppercase">
								{formatDate(order.createdAt)}
							</div>
						</div>
						<div class="shrink-0 text-right">
							<div class="font-archivo text-prem text-[18px] font-extrabold tracking-[-0.01em]">
								{formatCurrency(order.amount)}
							</div>
							<span class="font-mono-system mt-[6px] inline-flex items-center px-[8px] py-[3px] text-[9.5px] font-bold tracking-[0.08em] uppercase {typeChip(order.meta?.type)}">
								{order.meta?.type || 'payment'}
							</span>
						</div>
					</div>
					<div class="border-line2 mt-3 flex items-center justify-between border-t pt-3">
						<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.06em] uppercase">
							ID · {order.id?.slice(0, 8)}
						</span>
						<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.12em] uppercase">
							View →
						</span>
					</div>
				</a>
			{:else}
				<div class="border-ink border-[1.5px] p-8 text-center overflow-hidden">
					<p class="font-newsreader text-soft text-[19px] italic">No orders found.</p>
					<p class="text-fade mt-2 text-[13px]">
						{ordersSearchQuery || ordersTypeFilter !== 'all' || ordersDateFilter !== 'all'
							? 'Try adjusting your search or filters.'
							: 'Orders will appear here when customers make purchases.'}
					</p>
				</div>
			{/each}

			{#if totalOrdersPages > 1}
				<div class="border-ink flex items-center justify-between border-[1.5px] px-4 py-3">
					<button
						onclick={() => (ordersPage = Math.max(1, ordersPage - 1))}
						disabled={ordersPage === 1}
						class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
					>
						← Prev
					</button>
					<span class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.08em] uppercase">
						{ordersPage} / {totalOrdersPages}
					</span>
					<button
						onclick={() => (ordersPage = Math.min(totalOrdersPages, ordersPage + 1))}
						disabled={ordersPage === totalOrdersPages}
						class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
					>
						Next →
					</button>
				</div>
			{/if}
		</div>

		<!-- Desktop table -->
		<div class="border-ink hidden border-[1.5px] lg:block">
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px]">
					<thead class="border-ink border-b-[1.5px]">
						<tr class="text-left">
							<th class="font-mono-system text-fade px-5 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Customer</th>
							<th class="font-mono-system text-fade px-5 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Order ID</th>
							<th class="font-mono-system text-fade px-5 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">
								<button
									onclick={() => {
										ordersSortBy = 'amount';
										ordersSortDir = ordersSortDir === 'desc' ? 'asc' : 'desc';
									}}
									class="hover:text-ink inline-flex items-center gap-1"
								>
									Amount
									{#if ordersSortBy === 'amount'}
										<span>{ordersSortDir === 'desc' ? '↓' : '↑'}</span>
									{/if}
								</button>
							</th>
							<th class="font-mono-system text-fade px-5 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Type</th>
							<th class="font-mono-system text-fade px-5 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Status</th>
							<th class="font-mono-system text-fade px-5 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">
								<button
									onclick={() => {
										ordersSortBy = 'date';
										ordersSortDir = ordersSortDir === 'desc' ? 'asc' : 'desc';
									}}
									class="hover:text-ink inline-flex items-center gap-1"
								>
									Date
									{#if ordersSortBy === 'date'}
										<span>{ordersSortDir === 'desc' ? '↓' : '↑'}</span>
									{/if}
								</button>
							</th>
							<th class="font-mono-system text-fade px-5 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase"></th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedOrders as order (order.id)}
							<tr class="border-line2 hover:bg-panel border-b transition-colors">
								<td class="px-5 py-[14px]">
									<a
										href="/admin/customers/{encodeURIComponent(order.userEmail)}"
										class="hover:text-warm block transition-colors"
									>
										<div class="font-newsreader text-[15px] font-semibold">{getUserName(order.userEmail)}</div>
										<div class="text-fade text-[12px]">{order.userEmail}</div>
									</a>
								</td>
								<td class="px-5 py-[14px]">
									<code class="font-mono-system text-fade text-[11px] font-bold tracking-[0.02em]" title={order.id}>
										{order.id?.slice(0, 8)}
									</code>
								</td>
								<td class="font-archivo text-prem px-5 py-[14px] text-right text-[16px] font-extrabold tracking-[-0.01em]">
									{formatCurrency(order.amount)}
								</td>
								<td class="px-5 py-[14px]">
									<span class="font-mono-system inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.08em] uppercase {typeChip(order.meta?.type)}">
										{order.meta?.type || 'payment'}
									</span>
								</td>
								<td class="px-5 py-[14px]">
									<span class="font-mono-system inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.08em] uppercase {statusChip(order.status)}">
										{order.status || 'completed'}
									</span>
								</td>
								<td class="font-mono-system text-fade px-5 py-[14px] text-[10.5px] font-bold tracking-[0.06em] uppercase">
									{formatDate(order.createdAt)}
								</td>
								<td class="px-5 py-[14px] text-right">
									<a
										href="/admin/orders/{order.id}"
										class="font-mono-system text-warm hover:text-ink text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
									>
										View →
									</a>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="7" class="px-6 py-12 text-center">
									<p class="font-newsreader text-soft text-[19px] italic">No orders found.</p>
									<p class="text-fade mt-2 text-[13px]">
										{ordersSearchQuery || ordersTypeFilter !== 'all' || ordersDateFilter !== 'all'
											? 'Try adjusting your search or filters.'
											: 'Orders will appear here when customers make purchases.'}
									</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalOrdersPages > 1}
				<div class="border-ink flex items-center justify-between border-t-[1.5px] px-5 py-[14px]">
					<button
						onclick={() => (ordersPage = Math.max(1, ordersPage - 1))}
						disabled={ordersPage === 1}
						class="border-line2 hover:border-ink font-mono-system border px-[14px] py-[8px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
					>
						← Previous
					</button>
					<span class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.08em] uppercase">
						Page {ordersPage} of {totalOrdersPages}
					</span>
					<button
						onclick={() => (ordersPage = Math.min(totalOrdersPages, ordersPage + 1))}
						disabled={ordersPage === totalOrdersPages}
						class="border-line2 hover:border-ink font-mono-system border px-[14px] py-[8px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
					>
						Next →
					</button>
				</div>
			{/if}
		</div>
	</div>
</section>
