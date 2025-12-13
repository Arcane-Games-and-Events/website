<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let activeTab = $state('orders');
	let roleLoading = $state(false);
	let cancelLoading = $state(false);
	let copySuccess = $state(false);

	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount || 0);
	}

	function formatDate(date, options = {}) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			...options
		});
	}

	function formatDateTime(date) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	async function copyEmail() {
		await navigator.clipboard.writeText(data.customerEmail);
		copySuccess = true;
		setTimeout(() => (copySuccess = false), 2000);
	}

	function getRoleBadgeClasses(role) {
		switch (role) {
			case 'admin':
				return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
			case 'premium':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			case 'tournament staff':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			case 'writer':
				return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
			default:
				return 'bg-gray-700 text-gray-400 border-gray-600';
		}
	}

	function getSubscriptionStatusClasses(status) {
		switch (status) {
			case 'active':
				return 'bg-green-500/20 text-green-400';
			case 'cancelled':
				return 'bg-red-500/20 text-red-400';
			case 'expired':
				return 'bg-gray-500/20 text-gray-400';
			default:
				return 'bg-gray-700 text-gray-400';
		}
	}

	function getAvatarGradient(role) {
		switch (role) {
			case 'admin':
				return 'from-purple-500 to-violet-600';
			case 'premium':
				return 'from-blue-500 to-cyan-600';
			case 'tournament staff':
				return 'from-green-500 to-emerald-600';
			default:
				return 'from-gray-500 to-gray-600';
		}
	}
</script>

<svelte:head>
	<title
		>{data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : data.customerEmail} |
		Admin</title
	>
</svelte:head>

<div class="px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-6xl">
		<!-- Breadcrumb -->
		<nav class="mb-6 flex items-center gap-2 text-sm">
			<a href="/admin?tab=users" class="text-gray-400 transition-colors hover:text-white">Users</a>
			<svg class="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
			<span class="text-white"
				>{data.customer
					? `${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim() ||
						data.customerEmail
					: data.customerEmail}</span
			>
		</nav>

		<!-- Success/Error Messages -->
		{#if form?.success}
			<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
				<p class="text-green-400">{form.message}</p>
			</div>
		{/if}
		{#if form?.error}
			<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
				<p class="text-red-400">{form.error}</p>
			</div>
		{/if}

		<!-- Customer Header -->
		<div
			class="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-950 shadow-2xl shadow-purple-500/5"
		>
			<!-- Decorative elements -->
			<div
				class="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl"
			></div>
			<div
				class="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl"
			></div>

			<div class="relative p-6">
				<div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
					<!-- Customer Info -->
					<div class="flex items-start gap-4">
						<div
							class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-white {getAvatarGradient(
								data.customer?.role
							)}"
						>
							{#if data.customer}
								{data.customer.firstName.charAt(0)}{data.customer.lastName.charAt(0)}
							{:else}
								{data.customerEmail.charAt(0).toUpperCase()}
							{/if}
						</div>
						<div>
							{#if data.customer}
								<h1 class="text-2xl font-bold text-white">
									{data.customer.firstName}
									{data.customer.lastName}
								</h1>
							{:else}
								<h1 class="text-2xl font-bold text-white">Guest Customer</h1>
							{/if}
							<div class="mt-1 flex items-center gap-2">
								<p class="text-gray-400">{data.customerEmail}</p>
								<button
									onclick={copyEmail}
									class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
									title="Copy email"
								>
									{#if copySuccess}
										<svg
											class="h-4 w-4 text-green-400"
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
									{:else}
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											/>
										</svg>
									{/if}
								</button>
							</div>
							<div class="mt-2 flex flex-wrap items-center gap-2">
								{#if data.customer}
									<span
										class="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize {getRoleBadgeClasses(
											data.customer.role
										)}"
									>
										{data.customer.role}
									</span>
									{#if data.customer.gemId}
										<span
											class="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-400"
										>
											GEM: {data.customer.gemId}
										</span>
									{/if}
								{:else}
									<span
										class="inline-flex items-center rounded-full border border-gray-600 bg-gray-700 px-3 py-1 text-sm font-medium text-gray-400"
									>
										No Account
									</span>
								{/if}
							</div>
							<p class="mt-2 text-sm text-gray-500">
								{#if data.customer}
									Member since {formatDate(data.customer.createdAt)}
								{:else if data.stats.firstOrder}
									First order {formatDate(data.stats.firstOrder.createdAt)}
								{/if}
							</p>
						</div>
					</div>

					<!-- Role Update Form (only if user has account) -->
					{#if data.customer}
						<div class="flex flex-col gap-3">
							<form
								method="POST"
								action="?/updateRole"
								use:enhance={() => {
									roleLoading = true;
									return async ({ update }) => {
										await update();
										roleLoading = false;
										invalidateAll();
									};
								}}
								class="flex items-center gap-2"
							>
								<select
									name="role"
									class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
								>
									<option value="free" selected={data.customer.role === 'free'}>Free</option>
									<option value="premium" selected={data.customer.role === 'premium'}
										>Premium</option
									>
									<option value="writer" selected={data.customer.role === 'writer'}>Writer</option>
									<option
										value="tournament staff"
										selected={data.customer.role === 'tournament staff'}>Tournament Staff</option
									>
									<option value="admin" selected={data.customer.role === 'admin'}>Admin</option>
								</select>
								<button
									type="submit"
									disabled={roleLoading}
									class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-600 disabled:opacity-50"
								>
									{roleLoading ? 'Updating...' : 'Update Role'}
								</button>
							</form>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Stats Cards -->
		<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
			<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
				<p class="text-sm text-gray-400">Lifetime Value</p>
				<p class="mt-1 text-2xl font-bold text-emerald-400">
					{formatCurrency(data.stats.totalSpent)}
				</p>
			</div>
			<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
				<p class="text-sm text-gray-400">Total Orders</p>
				<p class="mt-1 text-2xl font-bold text-white">{data.stats.totalOrders}</p>
			</div>
			<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
				<p class="text-sm text-gray-400">Avg Order Value</p>
				<p class="mt-1 text-2xl font-bold text-white">{formatCurrency(data.stats.avgOrderValue)}</p>
			</div>
			<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
				<p class="text-sm text-gray-400">Active Tickets</p>
				<p class="mt-1 text-2xl font-bold text-white">{data.activeTicketsCount}</p>
			</div>
		</div>

		<!-- Subscription Section (only if user has account with subscription) -->
		{#if data.customer && (data.customer.subscriptionId || data.customer.subscriptionStatus)}
			<div class="mb-8 overflow-hidden rounded-xl border border-white/10 bg-gray-900/50">
				<div class="border-b border-white/10 bg-gray-800/30 px-6 py-4">
					<h2 class="text-lg font-semibold text-white">Subscription</h2>
				</div>
				<div class="p-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="grid grid-cols-2 gap-6 sm:grid-cols-4">
							<div>
								<p class="text-sm text-gray-400">Status</p>
								<span
									class="mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium capitalize {getSubscriptionStatusClasses(
										data.customer.subscriptionStatus
									)}"
								>
									{data.customer.subscriptionStatus || 'None'}
								</span>
							</div>
							<div>
								<p class="text-sm text-gray-400">Type</p>
								<p class="mt-1 font-medium text-white capitalize">
									{data.customer.subscriptionType || 'N/A'}
								</p>
							</div>
							<div>
								<p class="text-sm text-gray-400">Start Date</p>
								<p class="mt-1 font-medium text-white">
									{formatDate(data.customer.subscriptionStartDate)}
								</p>
							</div>
							<div>
								<p class="text-sm text-gray-400">Next Billing</p>
								<p class="mt-1 font-medium text-white">
									{formatDate(data.customer.nextBillingDate)}
								</p>
							</div>
						</div>
						{#if data.customer.subscriptionStatus === 'active'}
							<form
								method="POST"
								action="?/cancelSubscription"
								use:enhance={() => {
									if (
										!confirm(
											'Are you sure you want to cancel this subscription? The user will be downgraded to the free tier.'
										)
									) {
										return () => {};
									}
									cancelLoading = true;
									return async ({ update }) => {
										await update();
										cancelLoading = false;
										invalidateAll();
									};
								}}
							>
								<button
									type="submit"
									disabled={cancelLoading}
									class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
								>
									{cancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
								</button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Order Breakdown -->
		<div class="mb-8 overflow-hidden rounded-xl border border-white/10 bg-gray-900/50">
			<div class="border-b border-white/10 bg-gray-800/30 px-6 py-4">
				<h2 class="text-lg font-semibold text-white">Order Breakdown</h2>
			</div>
			<div class="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
				<div class="p-6">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
							<svg
								class="h-5 w-5 text-purple-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-sm text-gray-400">Tickets</p>
							<p class="text-lg font-semibold text-white">
								{data.ordersByType.ticket.count} orders
								<span class="text-sm font-normal text-gray-400"
									>({formatCurrency(data.ordersByType.ticket.total)})</span
								>
							</p>
						</div>
					</div>
				</div>
				<div class="p-6">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
							<svg
								class="h-5 w-5 text-cyan-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
								/>
							</svg>
						</div>
						<div>
							<p class="text-sm text-gray-400">Courses</p>
							<p class="text-lg font-semibold text-white">
								{data.ordersByType.course.count} orders
								<span class="text-sm font-normal text-gray-400"
									>({formatCurrency(data.ordersByType.course.total)})</span
								>
							</p>
						</div>
					</div>
				</div>
				<div class="p-6">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
							<svg
								class="h-5 w-5 text-amber-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
								/>
							</svg>
						</div>
						<div>
							<p class="text-sm text-gray-400">Subscriptions</p>
							<p class="text-lg font-semibold text-white">
								{data.ordersByType.subscription.count} orders
								<span class="text-sm font-normal text-gray-400"
									>({formatCurrency(data.ordersByType.subscription.total)})</span
								>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Tabs -->
		<div class="mb-6 flex gap-1 rounded-xl border border-white/10 bg-gray-900/50 p-1">
			<button
				onclick={() => (activeTab = 'orders')}
				class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all {activeTab ===
				'orders'
					? 'bg-purple-500/20 text-purple-400'
					: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
			>
				Orders ({data.orders.length})
			</button>
			<button
				onclick={() => (activeTab = 'tickets')}
				class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all {activeTab ===
				'tickets'
					? 'bg-purple-500/20 text-purple-400'
					: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
			>
				Tickets ({data.tickets.length})
			</button>
			{#if data.customer}
				<button
					onclick={() => (activeTab = 'courses')}
					class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all {activeTab ===
					'courses'
						? 'bg-purple-500/20 text-purple-400'
						: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
				>
					Courses ({data.entitlements.length})
				</button>
			{/if}
		</div>

		<!-- Orders Tab -->
		{#if activeTab === 'orders'}
			<div class="overflow-hidden rounded-xl border border-white/10 bg-gray-900/50">
				{#if data.orders.length === 0}
					<div class="p-12 text-center">
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
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-800/50">
								<tr>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Date</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Type</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Description</th
									>
									<th
										class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Amount</th
									>
									<th
										class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Actions</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/10">
								{#each data.orders as order}
									<tr class="transition-colors hover:bg-white/5">
										<td class="px-6 py-4 text-sm text-gray-300">{formatDate(order.createdAt)}</td>
										<td class="px-6 py-4">
											<span
												class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize
												{order.meta?.type === 'ticket' ? 'bg-purple-500/20 text-purple-400' : ''}
												{order.meta?.type === 'course' ? 'bg-cyan-500/20 text-cyan-400' : ''}
												{order.meta?.type === 'subscription' ? 'bg-amber-500/20 text-amber-400' : ''}
												{!order.meta?.type ? 'bg-gray-700 text-gray-400' : ''}"
											>
												{order.meta?.type || 'unknown'}
											</span>
										</td>
										<td class="max-w-xs truncate px-6 py-4 text-sm text-gray-400">
											{order.meta?.eventTitle || order.meta?.product || order.meta?.plan || 'Order'}
										</td>
										<td class="px-6 py-4 text-right text-sm font-medium text-white"
											>{formatCurrency(order.amount)}</td
										>
										<td class="px-6 py-4 text-right">
											<a
												href="/admin/orders/{order.id}"
												class="text-sm text-blue-400 transition-colors hover:text-blue-300"
											>
												View
											</a>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Tickets Tab -->
		{#if activeTab === 'tickets'}
			<div class="overflow-hidden rounded-xl border border-white/10 bg-gray-900/50">
				{#if data.tickets.length === 0}
					<div class="p-12 text-center">
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
								d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
							/>
						</svg>
						<p class="text-gray-400">No tickets found</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-800/50">
								<tr>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Event</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Ticket Code</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Player</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Date</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Status</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/10">
								{#each data.tickets as { ticket, event }}
									<tr class="transition-colors hover:bg-white/5">
										<td class="px-6 py-4 text-sm font-medium text-white"
											>{event?.title || 'Unknown Event'}</td
										>
										<td class="px-6 py-4">
											<code class="rounded bg-gray-800 px-2 py-1 text-sm text-gray-300"
												>{ticket.code}</code
											>
										</td>
										<td class="px-6 py-4 text-sm text-gray-300">
											{ticket.firstName}
											{ticket.lastName}
											{#if ticket.gemId}
												<span class="ml-2 text-xs text-amber-400">(GEM: {ticket.gemId})</span>
											{/if}
										</td>
										<td class="px-6 py-4 text-sm text-gray-400">{formatDate(event?.eventDate)}</td>
										<td class="px-6 py-4">
											{#if ticket.refunded}
												<span
													class="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400"
												>
													Refunded
												</span>
											{:else if event?.eventDate && new Date(event.eventDate) < new Date()}
												<span
													class="inline-flex items-center rounded-full bg-gray-500/20 px-2.5 py-1 text-xs font-medium text-gray-400"
												>
													Past Event
												</span>
											{:else}
												<span
													class="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400"
												>
													Active
												</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Courses Tab -->
		{#if activeTab === 'courses' && data.customer}
			<div class="overflow-hidden rounded-xl border border-white/10 bg-gray-900/50">
				{#if data.entitlements.length === 0}
					<div class="p-12 text-center">
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
								d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
							/>
						</svg>
						<p class="text-gray-400">No courses purchased</p>
					</div>
				{:else}
					<div class="divide-y divide-white/10">
						{#each data.entitlements as ent}
							<div class="flex items-center justify-between p-6">
								<div class="flex items-center gap-4">
									<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/20">
										<svg
											class="h-6 w-6 text-cyan-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
											/>
										</svg>
									</div>
									<div>
										<p class="font-medium text-white">{ent.product}</p>
										<p class="text-sm text-gray-400">Purchased {formatDate(ent.createdAt)}</p>
									</div>
								</div>
								<span
									class="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-400"
								>
									Active
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
