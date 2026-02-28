<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	// ========== ORDER MANAGEMENT STATE ==========
	let ordersSearchQuery = $state('');
	let ordersSearchResults = $state(null); // Server-side search results
	let ordersSearchLoading = $state(false);
	let ordersSearchTimeout = $state(null);
	let ordersTypeFilter = $state('all'); // 'all', 'ticket', 'course', 'subscription'
	let ordersStatusFilter = $state('all'); // 'all', 'completed', 'refunded'
	let ordersDateFilter = $state('all'); // 'all', 'today', 'week', 'month'
	let ordersPage = $state(1);
	let ordersPerPage = 25;
	let ordersSortBy = $state('date'); // 'date', 'amount'
	let ordersSortDir = $state('desc');

	// Debounced server-side search for orders
	async function searchOrdersOnServer(query) {
		if (!query || query.length < 2) {
			ordersSearchResults = null; // Reset to local filtering
			return;
		}

		ordersSearchLoading = true;
		try {
			const formData = new FormData();
			formData.append('query', query);

			const response = await fetch('?/searchOrders', {
				method: 'POST',
				body: formData
			});

			const text = await response.text();
			const result = deserialize(text);

			if (result.type === 'success' && result.data?.results) {
				ordersSearchResults = result.data.results;
			} else if (result.type === 'failure') {
				console.error('Order search action failed:', result.data?.error || 'Unknown error');
			} else {
				console.log('Order search response:', result.type, result.data);
			}
		} catch (err) {
			console.error('Order search error:', err);
		} finally {
			ordersSearchLoading = false;
		}
	}

	// Handle order search input with debounce
	function handleOrderSearch(event) {
		const query = event.target.value;
		ordersSearchQuery = query;
		ordersPage = 1; // Reset to first page

		// Clear previous timeout
		if (ordersSearchTimeout) {
			clearTimeout(ordersSearchTimeout);
		}

		// Reset server results when clearing search
		if (!query || query.length < 2) {
			ordersSearchResults = null;
			return;
		}

		// Debounce server search (300ms)
		ordersSearchTimeout = setTimeout(() => {
			searchOrdersOnServer(query);
		}, 300);
	}

	// Filtered and sorted orders - use server results if available for search
	let filteredOrders = $derived.by(() => {
		// Use server results if we have them (from deep search)
		const baseOrders = ordersSearchResults !== null ? ordersSearchResults : data.allOrders || [];

		return baseOrders
			.filter((ord) => {
				// Search filter (only apply if not using server results)
				if (ordersSearchResults === null && ordersSearchQuery) {
					const q = ordersSearchQuery.toLowerCase();
					const matchesEmail = ord.userEmail?.toLowerCase().includes(q);
					const matchesName = getUserName(ord.userEmail).toLowerCase().includes(q);
					const matchesId = ord.id?.toLowerCase().includes(q);
					const matchesTxn = ord.providerRef?.toLowerCase().includes(q);
					if (!matchesEmail && !matchesName && !matchesId && !matchesTxn) return false;
				}
				// Type filter
				if (ordersTypeFilter !== 'all' && ord.meta?.type !== ordersTypeFilter) return false;
				// Date filter
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

	let totalOrdersPages = $derived(Math.ceil(filteredOrders.length / ordersPerPage));
	let paginatedOrders = $derived(
		filteredOrders.slice((ordersPage - 1) * ordersPerPage, ordersPage * ordersPerPage)
	);

	// Reset page on filter change
	$effect(() => {
		// Track filter dependencies
		ordersSearchQuery;
		ordersTypeFilter;
		ordersDateFilter;
		ordersPage = 1;
	});

	// Format currency helper
	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount || 0);
	}

	// Format date helper (using UTC to preserve wall clock time)
	function formatDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
		return new Date(date).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
	}

	// Create a map of email -> user for quick lookups
	let usersByEmail = $derived(new Map((data.allUsers || []).map((u) => [u.email, u])));

	// Get user display name from email
	function getUserName(email) {
		const user = usersByEmail.get(email);
		if (user?.first_name && user?.last_name) {
			return `${user.first_name} ${user.last_name}`;
		}
		return email || 'Unknown';
	}
</script>

<svelte:head>
	<title>Orders - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<main>
			<!-- Success/Error Messages -->
			{#if form?.success}
				<div
					class="mb-6 rounded-xl border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/5 p-4 shadow-lg shadow-green-500/5"
				>
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
							<svg
								class="h-5 w-5 text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<p class="text-sm font-medium text-green-400">{form.message}</p>
					</div>
				</div>
			{/if}

			{#if form?.error}
				<div
					class="mb-6 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/5 p-4 shadow-lg shadow-red-500/5"
				>
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
							<svg
								class="h-5 w-5 text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</div>
						<p class="text-sm font-medium text-red-400">{form.error}</p>
					</div>
				</div>
			{/if}

			<!-- Orders Content -->
			<div class="space-y-6">
				<!-- Quick Stats Bar -->
				<div
					class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4"
				>
					<div class="flex flex-wrap items-center gap-6">
						<div>
							<p class="text-xs text-gray-500">Total Orders</p>
							<p class="text-lg font-bold text-white">{data.stats?.totalOrders || 0}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">This Month</p>
							<p class="text-lg font-bold text-emerald-400">
								{formatCurrency(data.revenueStats?.month || 0)}
							</p>
						</div>
					</div>
					<a
						href="/admin/analytics"
						class="inline-flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
						View Full Analytics
					</a>
				</div>

				<!-- Search & Filters -->
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
					<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<!-- Search -->
						<div class="relative flex-1 lg:max-w-md">
							<svg
								class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							<input
								type="text"
								value={ordersSearchQuery}
								oninput={handleOrderSearch}
								placeholder="Search all orders by email, ID..."
								class="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pr-10 pl-10 text-base text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none sm:text-sm"
							/>
							{#if ordersSearchLoading}
								<div class="absolute top-1/2 right-3 -translate-y-1/2">
									<svg class="h-5 w-5 animate-spin text-green-400" fill="none" viewBox="0 0 24 24">
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
								</div>
							{/if}
							{#if ordersSearchQuery.length >= 2 && ordersSearchResults !== null}
								<p class="absolute -bottom-5 left-0 text-xs text-gray-500">
									Searching all {data.stats.totalOrders} orders
								</p>
							{/if}
						</div>

						<!-- Filters -->
						<div class="flex flex-wrap gap-3">
							<select
								bind:value={ordersTypeFilter}
								class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-base text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none sm:text-sm"
							>
								<option value="all">All Types</option>
								<option value="ticket">Tickets</option>
								<option value="course">Courses</option>
								<option value="subscription">Subscriptions</option>
							</select>

							<select
								bind:value={ordersDateFilter}
								class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-base text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none sm:text-sm"
							>
								<option value="all">All Time</option>
								<option value="today">Today</option>
								<option value="week">Last 7 Days</option>
								<option value="month">This Month</option>
							</select>
						</div>
					</div>

					<!-- Results count -->
					<div class="mt-3 text-sm text-gray-500">
						Showing {paginatedOrders.length} of {filteredOrders.length} orders
					</div>
				</div>

				<!-- Orders - Mobile Card View -->
				<div class="space-y-3 lg:hidden">
					{#each paginatedOrders as order}
						<a
							href="/admin/orders/{order.id}"
							class="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-gray-700 hover:bg-gray-800/50"
						>
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-center gap-3">
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700/50 text-sm font-bold text-gray-300"
									>
										{getUserName(order.userEmail).charAt(0).toUpperCase()}
									</div>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium text-white">{getUserName(order.userEmail)}</p>
										<p class="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
									</div>
								</div>
								<div class="shrink-0 text-right">
									<p class="text-lg font-bold text-green-400">{formatCurrency(order.amount)}</p>
									<span
										class="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize
											{order.meta?.type === 'ticket'
											? 'bg-blue-500/20 text-blue-400'
											: order.meta?.type === 'course'
												? 'bg-purple-500/20 text-purple-400'
												: order.meta?.type === 'subscription'
													? 'bg-green-500/20 text-green-400'
													: 'bg-gray-500/20 text-gray-400'}"
									>
										{order.meta?.type || 'payment'}
									</span>
								</div>
							</div>
							<div class="mt-3 flex items-center justify-between border-t border-gray-800 pt-3">
								<span class="font-mono text-xs text-gray-500">ID: {order.id?.slice(0, 8)}...</span>
								<span class="flex items-center gap-1 text-xs text-gray-400">
									View details
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</span>
							</div>
						</a>
					{:else}
						<div class="rounded-xl border border-gray-800 bg-gray-900/50 px-6 py-12 text-center">
							<svg
								class="mx-auto mb-4 h-12 w-12 text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								/>
							</svg>
							<p class="text-gray-400">No orders found</p>
							<p class="mt-1 text-sm text-gray-500">
								{ordersSearchQuery || ordersTypeFilter !== 'all' || ordersDateFilter !== 'all'
									? 'Try adjusting your search or filters'
									: 'Orders will appear here when customers make purchases'}
							</p>
						</div>
					{/each}

					<!-- Mobile Pagination -->
					{#if totalOrdersPages > 1}
						<div
							class="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
						>
							<button
								onclick={() => (ordersPage = Math.max(1, ordersPage - 1))}
								disabled={ordersPage === 1}
								class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Prev
							</button>
							<span class="text-sm text-gray-400">
								{ordersPage} / {totalOrdersPages}
							</span>
							<button
								onclick={() => (ordersPage = Math.min(totalOrdersPages, ordersPage + 1))}
								disabled={ordersPage === totalOrdersPages}
								class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Next
							</button>
						</div>
					{/if}
				</div>

				<!-- Orders - Desktop Table View -->
				<div
					class="hidden overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 lg:block"
				>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-800/50">
								<tr>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Customer</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Order ID</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>
										<button
											onclick={() => {
												ordersSortBy = 'amount';
												ordersSortDir = ordersSortDir === 'desc' ? 'asc' : 'desc';
											}}
											class="flex items-center gap-1 hover:text-white"
										>
											Amount
											{#if ordersSortBy === 'amount'}
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d={ordersSortDir === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'}
													/>
												</svg>
											{/if}
										</button>
									</th>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Type</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Status</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>
										<button
											onclick={() => {
												ordersSortBy = 'date';
												ordersSortDir = ordersSortDir === 'desc' ? 'asc' : 'desc';
											}}
											class="flex items-center gap-1 hover:text-white"
										>
											Date
											{#if ordersSortBy === 'date'}
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d={ordersSortDir === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'}
													/>
												</svg>
											{/if}
										</button>
									</th>
									<th
										class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Actions</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-800">
								{#each paginatedOrders as order}
									<tr class="group transition-colors hover:bg-gray-800/50">
										<td class="px-6 py-4">
											<a
												href="/admin/customers/{encodeURIComponent(order.userEmail)}"
												class="flex items-center gap-3 hover:text-white"
											>
												<div
													class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700/50 text-sm font-bold text-gray-300"
												>
													{getUserName(order.userEmail).charAt(0).toUpperCase()}
												</div>
												<span class="text-sm text-gray-300 hover:text-white">{getUserName(order.userEmail)}</span
												>
											</a>
										</td>
										<td class="px-6 py-4">
											<span class="font-mono text-xs text-gray-500" title={order.id}
												>{order.id?.slice(0, 8)}...</span
											>
										</td>
										<td class="px-6 py-4">
											<span class="text-lg font-bold text-green-400"
												>{formatCurrency(order.amount)}</span
											>
										</td>
										<td class="px-6 py-4">
											<span
												class="rounded-full px-2.5 py-1 text-xs font-medium capitalize
													{order.meta?.type === 'ticket'
													? 'bg-blue-500/20 text-blue-400'
													: order.meta?.type === 'course'
														? 'bg-purple-500/20 text-purple-400'
														: order.meta?.type === 'subscription'
															? 'bg-green-500/20 text-green-400'
															: 'bg-gray-500/20 text-gray-400'}"
											>
												{order.meta?.type || 'payment'}
											</span>
										</td>
										<td class="px-6 py-4">
											<span
												class="rounded-full px-2.5 py-1 text-xs font-medium capitalize
													{order.status === 'refunded'
													? 'bg-red-500/20 text-red-400'
													: order.status === 'active'
														? 'bg-emerald-500/20 text-emerald-400'
														: 'bg-emerald-500/20 text-emerald-400'}"
											>
												{order.status || 'completed'}
											</span>
										</td>
										<td class="px-6 py-4 text-sm text-gray-500">
											{formatDate(order.createdAt)}
										</td>
										<td class="px-6 py-4 text-right">
											<a
												href="/admin/orders/{order.id}"
												class="rounded-lg bg-gray-700/50 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
											>
												View
											</a>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="7" class="px-6 py-12 text-center">
											<div class="flex flex-col items-center">
												<svg
													class="mb-4 h-12 w-12 text-gray-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
													/>
												</svg>
												<p class="text-gray-400">No orders found</p>
												<p class="mt-1 text-sm text-gray-500">
													{ordersSearchQuery ||
													ordersTypeFilter !== 'all' ||
													ordersDateFilter !== 'all'
														? 'Try adjusting your search or filters'
														: 'Orders will appear here when customers make purchases'}
												</p>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Desktop Pagination -->
					{#if totalOrdersPages > 1}
						<div class="flex items-center justify-between border-t border-gray-800 px-6 py-4">
							<button
								onclick={() => (ordersPage = Math.max(1, ordersPage - 1))}
								disabled={ordersPage === 1}
								class="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Previous
							</button>
							<span class="text-sm text-gray-400">
								Page {ordersPage} of {totalOrdersPages}
							</span>
							<button
								onclick={() => (ordersPage = Math.min(totalOrdersPages, ordersPage + 1))}
								disabled={ordersPage === totalOrdersPages}
								class="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Next
							</button>
						</div>
					{/if}
				</div>
			</div>
		</main>
	</div>
</div>
