<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { getCircuit } from '$lib/data/circuits.js';

	let { data } = $props();

	let activeSection = $state('overview');
	let isLoading = $state(true);

	onMount(() => {
		// Brief delay to show loading animation, then reveal content
		setTimeout(() => {
			isLoading = false;
		}, 150);
	});

	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
	}

	function formatNumber(num) {
		return new Intl.NumberFormat('en-US').format(num || 0);
	}

	function formatDate(date) {
		if (!date) return '-';
		return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getGrowthColor(growth) {
		if (!growth) return 'text-gray-400';
		const num = parseFloat(growth);
		if (num > 0) return 'text-green-400';
		if (num < 0) return 'text-red-400';
		return 'text-gray-400';
	}

	function getGrowthIcon(growth) {
		if (!growth) return '';
		const num = parseFloat(growth);
		if (num > 0) return '↑';
		if (num < 0) return '↓';
		return '';
	}

	// Calculate max for chart scaling
	function getMaxRevenue(data) {
		if (!data || data.length === 0) return 100;
		return Math.max(...data.map(d => d.total)) || 100;
	}

	const sections = [
		{ id: 'overview', name: 'Overview', icon: 'chart-bar' },
		{ id: 'revenue', name: 'Revenue', icon: 'currency-dollar' },
		{ id: 'users', name: 'Users', icon: 'users' },
		{ id: 'premium', name: 'Premium', icon: 'star' },
		{ id: 'events', name: 'Events', icon: 'calendar' },
		{ id: 'tickets', name: 'Tickets', icon: 'ticket' },
		{ id: 'players', name: 'Players', icon: 'trophy' }
	];

	// Calculate premium metrics
	const premiumMetrics = $derived(() => {
		const breakdown = data.users?.subscriptionBreakdown || [];
		const activeMonthly = breakdown.find(s => s.type === 'monthly' && s.status === 'active')?.count || 0;
		const activeYearly = breakdown.find(s => s.type === 'yearly' && s.status === 'active')?.count || 0;
		const cancelledMonthly = breakdown.find(s => s.type === 'monthly' && s.status === 'cancelled')?.count || 0;
		const cancelledYearly = breakdown.find(s => s.type === 'yearly' && s.status === 'cancelled')?.count || 0;
		const failedPayments = breakdown.filter(s => s.status === 'payment_failed').reduce((sum, s) => sum + s.count, 0);

		const totalActive = activeMonthly + activeYearly;
		const totalCancelled = cancelledMonthly + cancelledYearly;

		// Monthly revenue estimate: $9.99/mo for monthly, $99/12 = $8.25/mo for yearly
		const monthlyMRR = (activeMonthly * 9.99) + (activeYearly * 8.25);
		const annualARR = monthlyMRR * 12;

		// Churn rate: cancelled / (active + cancelled)
		const churnRate = (totalActive + totalCancelled) > 0
			? ((totalCancelled / (totalActive + totalCancelled)) * 100).toFixed(1)
			: 0;

		return {
			activeMonthly,
			activeYearly,
			totalActive,
			cancelledMonthly,
			cancelledYearly,
			totalCancelled,
			failedPayments,
			monthlyMRR,
			annualARR,
			churnRate,
			breakdown
		};
	});
</script>

<svelte:head>
	<title>Analytics - Admin</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
		<!-- Page Header -->
		<div class="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/30 via-gray-900 to-gray-950 p-6 shadow-2xl shadow-indigo-500/5">
			<div class="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
			<div class="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl"></div>

			<div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-4">
					<div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
						<svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-bold text-white sm:text-3xl">Business Analytics</h1>
						<p class="mt-1 text-gray-400">Comprehensive insights into your business performance</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Section Navigation -->
		<div class="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-gray-900/50 p-1">
			{#each sections as section}
				<button
					onclick={() => (activeSection = section.id)}
					class="flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all {activeSection === section.id
						? 'bg-indigo-500/20 text-indigo-400'
						: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
				>
					{section.name}
				</button>
			{/each}
		</div>

		<!-- Loading Skeleton -->
		{#if isLoading}
			<div class="animate-pulse">
				<!-- Skeleton Key Metrics Grid -->
				<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{#each [1, 2, 3, 4] as _}
						<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
							<div class="flex items-center justify-between">
								<div class="h-12 w-12 rounded-xl bg-gray-700/50"></div>
								<div class="h-6 w-16 rounded-full bg-gray-700/50"></div>
							</div>
							<div class="mt-4 h-8 w-32 rounded bg-gray-700/50"></div>
							<div class="mt-2 h-4 w-20 rounded bg-gray-700/30"></div>
						</div>
					{/each}
				</div>

				<!-- Skeleton Charts -->
				<div class="grid gap-6 lg:grid-cols-2">
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
						<div class="mb-4 h-6 w-40 rounded bg-gray-700/50"></div>
						<div class="flex h-64 items-end justify-between gap-2">
							{#each [60, 80, 45, 90, 70, 85, 55, 75, 65, 95, 50, 88] as h}
								<div class="flex-1 rounded-t bg-gray-700/30" style="height: {h}%"></div>
							{/each}
						</div>
					</div>
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
						<div class="mb-4 h-6 w-40 rounded bg-gray-700/50"></div>
						<div class="space-y-4">
							{#each [1, 2, 3, 4, 5] as _}
								<div class="flex items-center gap-3">
									<div class="h-8 w-8 rounded bg-gray-700/50"></div>
									<div class="flex-1 h-4 rounded bg-gray-700/30"></div>
									<div class="h-4 w-16 rounded bg-gray-700/50"></div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{:else}

		<!-- Overview Section -->
		{#if activeSection === 'overview'}
			<!-- Key Metrics Grid -->
			<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Total Revenue -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<div class="flex items-center justify-between">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
							<svg class="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						{#if data.revenue?.growth}
							<span class="rounded-full bg-white/5 px-2 py-1 text-xs font-medium {getGrowthColor(data.revenue.growth)}">
								{getGrowthIcon(data.revenue.growth)} {Math.abs(parseFloat(data.revenue.growth))}%
							</span>
						{/if}
					</div>
					<p class="mt-4 text-2xl font-bold text-white">{formatCurrency(data.revenue?.allTime)}</p>
					<p class="mt-1 text-sm text-gray-400">All-time revenue</p>
				</div>

				<!-- Total Users -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<div class="flex items-center justify-between">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
							<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						</div>
						{#if data.users?.growth}
							<span class="rounded-full bg-white/5 px-2 py-1 text-xs font-medium {getGrowthColor(data.users.growth)}">
								{getGrowthIcon(data.users.growth)} {Math.abs(parseFloat(data.users.growth))}%
							</span>
						{/if}
					</div>
					<p class="mt-4 text-2xl font-bold text-white">{formatNumber(data.users?.total)}</p>
					<p class="mt-1 text-sm text-gray-400">Total users</p>
				</div>

				<!-- Total Events -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<div class="flex items-center justify-between">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20">
							<svg class="h-6 w-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
						</div>
						<span class="rounded-full bg-cyan-500/20 px-2 py-1 text-xs font-medium text-cyan-400">
							{data.events?.upcoming} upcoming
						</span>
					</div>
					<p class="mt-4 text-2xl font-bold text-white">{formatNumber(data.events?.total)}</p>
					<p class="mt-1 text-sm text-gray-400">Total events</p>
				</div>

				<!-- Total Tickets -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<div class="flex items-center justify-between">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
							<svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
							</svg>
						</div>
						{#if data.tickets?.growth}
							<span class="rounded-full bg-white/5 px-2 py-1 text-xs font-medium {getGrowthColor(data.tickets.growth)}">
								{getGrowthIcon(data.tickets.growth)} {Math.abs(parseFloat(data.tickets.growth))}%
							</span>
						{/if}
					</div>
					<p class="mt-4 text-2xl font-bold text-white">{formatNumber(data.tickets?.total)}</p>
					<p class="mt-1 text-sm text-gray-400">Tickets sold</p>
				</div>
			</div>

			<!-- Premium & Players Row -->
			<div class="mb-8 grid gap-4 sm:grid-cols-2">
				<!-- Premium Members -->
				<div class="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-5">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
								<svg class="h-6 w-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
								</svg>
							</div>
							<div>
								<p class="text-2xl font-bold text-white">{formatNumber(data.users?.activeSubscribers)}</p>
								<p class="text-sm text-gray-400">Premium members</p>
							</div>
						</div>
						<button
							onclick={() => (activeSection = 'premium')}
							class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
						>
							View details
						</button>
					</div>
					<div class="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
						<div class="flex-1">
							<p class="text-xs text-gray-500">Monthly MRR</p>
							<p class="text-lg font-semibold text-amber-400">{formatCurrency(premiumMetrics().monthlyMRR)}</p>
						</div>
						<div class="flex-1">
							<p class="text-xs text-gray-500">Annual ARR</p>
							<p class="text-lg font-semibold text-white">{formatCurrency(premiumMetrics().annualARR)}</p>
						</div>
					</div>
				</div>

				<!-- Total Players -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20">
								<svg class="h-6 w-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							</div>
							<div>
								<p class="text-2xl font-bold text-white">{formatNumber(data.players?.total)}</p>
								<p class="text-sm text-gray-400">Registered players</p>
							</div>
						</div>
						<button
							onclick={() => (activeSection = 'players')}
							class="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
						>
							View details
						</button>
					</div>
					<div class="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
						{#each (data.players?.byCircuit || []).slice(0, 3) as circuit}
							<div>
								<p class="text-xs text-gray-500">{circuit.circuit}</p>
								<p class="text-sm font-semibold text-white">{formatNumber(circuit.count)}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Revenue Period Cards -->
			<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
					<p class="text-xs font-medium uppercase tracking-wider text-gray-500">Today</p>
					<p class="mt-2 text-xl font-bold text-white">{formatCurrency(data.revenue?.today)}</p>
					<p class="text-xs text-gray-400">{data.revenue?.todayOrders} orders</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
					<p class="text-xs font-medium uppercase tracking-wider text-gray-500">This Week</p>
					<p class="mt-2 text-xl font-bold text-white">{formatCurrency(data.revenue?.week)}</p>
					<p class="text-xs text-gray-400">{data.revenue?.weekOrders} orders</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
					<p class="text-xs font-medium uppercase tracking-wider text-gray-500">This Month</p>
					<p class="mt-2 text-xl font-bold text-white">{formatCurrency(data.revenue?.month)}</p>
					<p class="text-xs text-gray-400">{data.revenue?.monthOrders} orders</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
					<p class="text-xs font-medium uppercase tracking-wider text-gray-500">Year to Date</p>
					<p class="mt-2 text-xl font-bold text-white">{formatCurrency(data.revenue?.ytd)}</p>
				</div>
			</div>

			<!-- Charts Row -->
			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Revenue by Type -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Type</h3>
					<div class="space-y-3">
						{#each data.revenue?.byType || [] as type}
							{@const maxTotal = Math.max(...(data.revenue?.byType || []).map(t => t.total)) || 1}
							<div>
								<div class="mb-1 flex items-center justify-between">
									<span class="text-sm capitalize text-gray-300">{type.type}</span>
									<span class="text-sm font-medium text-white">{formatCurrency(type.total)}</span>
								</div>
								<div class="h-2 overflow-hidden rounded-full bg-gray-800">
									<div
										class="h-full rounded-full {type.type === 'ticket' ? 'bg-blue-500' : type.type === 'subscription' ? 'bg-green-500' : type.type === 'course' ? 'bg-purple-500' : 'bg-gray-500'}"
										style="width: {(type.total / maxTotal) * 100}%"
									></div>
								</div>
								<p class="mt-1 text-xs text-gray-500">{type.count} orders</p>
							</div>
						{/each}
					</div>
				</div>

				<!-- Users by Role -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Users by Role</h3>
					<div class="space-y-3">
						{#each data.users?.byRole || [] as role}
							{@const maxCount = Math.max(...(data.users?.byRole || []).map(r => r.count)) || 1}
							<div>
								<div class="mb-1 flex items-center justify-between">
									<span class="text-sm capitalize text-gray-300">{role.role}</span>
									<span class="text-sm font-medium text-white">{formatNumber(role.count)}</span>
								</div>
								<div class="h-2 overflow-hidden rounded-full bg-gray-800">
									<div
										class="h-full rounded-full {role.role === 'admin' ? 'bg-red-500' : role.role === 'premium' ? 'bg-amber-500' : role.role === 'writer' ? 'bg-cyan-500' : role.role === 'tournament staff' ? 'bg-purple-500' : 'bg-gray-500'}"
										style="width: {(role.count / maxCount) * 100}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Revenue Section -->
		{#if activeSection === 'revenue'}
			<!-- Revenue Stats -->
			<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
					<p class="text-sm text-emerald-300">All-Time Revenue</p>
					<p class="mt-2 text-3xl font-bold text-white">{formatCurrency(data.revenue?.allTime)}</p>
					<p class="mt-1 text-xs text-emerald-400">{data.revenue?.allTimeOrders} total orders</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">This Month</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatCurrency(data.revenue?.month)}</p>
					{#if data.revenue?.growth}
						<p class="mt-1 text-xs {getGrowthColor(data.revenue.growth)}">
							{getGrowthIcon(data.revenue.growth)} {data.revenue.growth}% vs last month
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Last Month</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatCurrency(data.revenue?.lastMonth)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Avg Order Value</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatCurrency(data.customers?.avgOrderValue)}</p>
				</div>
			</div>

			<!-- Daily Revenue Chart -->
			<div class="mb-6 rounded-xl border border-white/10 bg-gray-900/50 p-6">
				<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Daily Revenue (Last 30 Days)</h3>
				<div class="h-48">
					<div class="flex h-full items-end gap-1">
						{#each data.revenue?.dailyTrend || [] as day}
							{@const maxRev = getMaxRevenue(data.revenue?.dailyTrend)}
							<div class="group relative flex-1">
								<div
									class="w-full rounded-t bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all hover:from-indigo-500 hover:to-indigo-300"
									style="height: {Math.max((day.total / maxRev) * 100, 2)}%"
								></div>
								<div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
									{formatDate(day.date)}: {formatCurrency(day.total)}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Revenue by Type & Monthly Trend -->
			<div class="grid gap-6 lg:grid-cols-2">
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Type</h3>
					<div class="space-y-4">
						{#each data.revenue?.byType || [] as type}
							<div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-lg {type.type === 'ticket' ? 'bg-blue-500/20' : type.type === 'subscription' ? 'bg-green-500/20' : type.type === 'course' ? 'bg-purple-500/20' : 'bg-gray-500/20'}">
										{#if type.type === 'ticket'}
											<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
											</svg>
										{:else if type.type === 'subscription'}
											<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
											</svg>
										{:else if type.type === 'course'}
											<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
											</svg>
										{:else}
											<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
											</svg>
										{/if}
									</div>
									<div>
										<p class="font-medium capitalize text-white">{type.type}</p>
										<p class="text-xs text-gray-400">{type.count} orders</p>
									</div>
								</div>
								<p class="text-lg font-bold text-white">{formatCurrency(type.total)}</p>
							</div>
						{/each}
					</div>
				</div>

				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Monthly Revenue</h3>
					<div class="space-y-3">
						{#each data.revenue?.monthlyTrend || [] as month}
							{@const maxMonthly = Math.max(...(data.revenue?.monthlyTrend || []).map(m => m.total)) || 1}
							<div>
								<div class="mb-1 flex items-center justify-between">
									<span class="text-sm text-gray-300">{month.monthName}</span>
									<span class="text-sm font-medium text-white">{formatCurrency(month.total)}</span>
								</div>
								<div class="h-2 overflow-hidden rounded-full bg-gray-800">
									<div
										class="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
										style="width: {(month.total / maxMonthly) * 100}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Users Section -->
		{#if activeSection === 'users'}
			<!-- User Stats -->
			<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
					<p class="text-sm text-blue-300">Total Users</p>
					<p class="mt-2 text-3xl font-bold text-white">{formatNumber(data.users?.total)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">New This Month</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatNumber(data.users?.newThisMonth)}</p>
					{#if data.users?.growth}
						<p class="mt-1 text-xs {getGrowthColor(data.users.growth)}">
							{getGrowthIcon(data.users.growth)} {data.users.growth}% vs last month
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Active Subscribers</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatNumber(data.users?.activeSubscribers)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">New Customers</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatNumber(data.customers?.new)}</p>
					<p class="mt-1 text-xs text-gray-400">{data.customers?.returning} returning</p>
				</div>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Users by Role -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Users by Role</h3>
					<div class="space-y-4">
						{#each data.users?.byRole || [] as role}
							<div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full {role.role === 'admin' ? 'bg-red-500/20 text-red-400' : role.role === 'premium' ? 'bg-amber-500/20 text-amber-400' : role.role === 'writer' ? 'bg-cyan-500/20 text-cyan-400' : role.role === 'tournament staff' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}">
										{role.role?.charAt(0).toUpperCase() || '?'}
									</div>
									<p class="font-medium capitalize text-white">{role.role}</p>
								</div>
								<p class="text-lg font-bold text-white">{formatNumber(role.count)}</p>
							</div>
						{/each}
					</div>
				</div>

				<!-- Top Customers -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Top Customers</h3>
					<div class="space-y-3">
						{#each data.customers?.topCustomers || [] as customer, i}
							<div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
								<div class="flex items-center gap-3">
									<span class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">
										{i + 1}
									</span>
									<div>
										<p class="text-sm font-medium text-white">{customer.email}</p>
										<p class="text-xs text-gray-400">{customer.orderCount} orders</p>
									</div>
								</div>
								<p class="font-bold text-emerald-400">{formatCurrency(customer.totalSpent)}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Premium Section -->
		{#if activeSection === 'premium'}
			<!-- Premium Stats -->
			<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-5">
					<p class="text-sm text-amber-300">Active Premium Members</p>
					<p class="mt-2 text-3xl font-bold text-white">{formatNumber(premiumMetrics().totalActive)}</p>
					<p class="mt-1 text-xs text-amber-400">{formatNumber(premiumMetrics().activeMonthly)} monthly, {formatNumber(premiumMetrics().activeYearly)} yearly</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Monthly Recurring Revenue</p>
					<p class="mt-2 text-2xl font-bold text-emerald-400">{formatCurrency(premiumMetrics().monthlyMRR)}</p>
					<p class="mt-1 text-xs text-gray-500">Estimated from active subs</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Annual Recurring Revenue</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatCurrency(premiumMetrics().annualARR)}</p>
					<p class="mt-1 text-xs text-gray-500">Projected yearly</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Churn Rate</p>
					<p class="mt-2 text-2xl font-bold {parseFloat(premiumMetrics().churnRate) > 10 ? 'text-red-400' : parseFloat(premiumMetrics().churnRate) > 5 ? 'text-yellow-400' : 'text-green-400'}">{premiumMetrics().churnRate}%</p>
					<p class="mt-1 text-xs text-gray-500">{formatNumber(premiumMetrics().totalCancelled)} cancelled</p>
				</div>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Subscription Breakdown -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Subscription Breakdown</h3>
					<div class="space-y-4">
						<!-- Monthly Subscriptions -->
						<div class="rounded-lg border border-white/5 bg-white/5 p-4">
							<div class="flex items-center justify-between mb-3">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
										<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
									<div>
										<p class="font-medium text-white">Monthly Plan</p>
										<p class="text-xs text-gray-400">$9.99/month</p>
									</div>
								</div>
								<p class="text-lg font-bold text-blue-400">{formatNumber(premiumMetrics().activeMonthly)}</p>
							</div>
							<div class="flex gap-4 text-xs">
								<span class="text-green-400">{formatNumber(premiumMetrics().activeMonthly)} active</span>
								<span class="text-red-400">{formatNumber(premiumMetrics().cancelledMonthly)} cancelled</span>
							</div>
						</div>

						<!-- Yearly Subscriptions -->
						<div class="rounded-lg border border-white/5 bg-white/5 p-4">
							<div class="flex items-center justify-between mb-3">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
										<svg class="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
											<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
										</svg>
									</div>
									<div>
										<p class="font-medium text-white">Yearly Plan</p>
										<p class="text-xs text-gray-400">$99/year (save 17%)</p>
									</div>
								</div>
								<p class="text-lg font-bold text-amber-400">{formatNumber(premiumMetrics().activeYearly)}</p>
							</div>
							<div class="flex gap-4 text-xs">
								<span class="text-green-400">{formatNumber(premiumMetrics().activeYearly)} active</span>
								<span class="text-red-400">{formatNumber(premiumMetrics().cancelledYearly)} cancelled</span>
							</div>
						</div>

						<!-- Payment Issues -->
						{#if premiumMetrics().failedPayments > 0}
							<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
											<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
											</svg>
										</div>
										<div>
											<p class="font-medium text-white">Failed Payments</p>
											<p class="text-xs text-red-400">Needs attention</p>
										</div>
									</div>
									<p class="text-lg font-bold text-red-400">{formatNumber(premiumMetrics().failedPayments)}</p>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Revenue Analysis -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue Analysis</h3>
					<div class="space-y-6">
						<!-- MRR Breakdown -->
						<div>
							<p class="mb-3 text-sm font-medium text-gray-300">Monthly Recurring Revenue</p>
							<div class="space-y-3">
								<div>
									<div class="mb-1 flex items-center justify-between">
										<span class="text-sm text-gray-400">Monthly Plans</span>
										<span class="text-sm font-medium text-white">{formatCurrency(premiumMetrics().activeMonthly * 9.99)}</span>
									</div>
									<div class="h-2 overflow-hidden rounded-full bg-gray-800">
										<div
											class="h-full rounded-full bg-blue-500"
											style="width: {premiumMetrics().monthlyMRR > 0 ? ((premiumMetrics().activeMonthly * 9.99) / premiumMetrics().monthlyMRR) * 100 : 0}%"
										></div>
									</div>
								</div>
								<div>
									<div class="mb-1 flex items-center justify-between">
										<span class="text-sm text-gray-400">Yearly Plans (monthly avg)</span>
										<span class="text-sm font-medium text-white">{formatCurrency(premiumMetrics().activeYearly * 8.25)}</span>
									</div>
									<div class="h-2 overflow-hidden rounded-full bg-gray-800">
										<div
											class="h-full rounded-full bg-amber-500"
											style="width: {premiumMetrics().monthlyMRR > 0 ? ((premiumMetrics().activeYearly * 8.25) / premiumMetrics().monthlyMRR) * 100 : 0}%"
										></div>
									</div>
								</div>
							</div>
						</div>

						<!-- Key Metrics -->
						<div class="border-t border-white/10 pt-4">
							<p class="mb-3 text-sm font-medium text-gray-300">Key Metrics</p>
							<div class="grid grid-cols-2 gap-4">
								<div class="rounded-lg bg-white/5 p-3">
									<p class="text-xs text-gray-500">Avg Revenue/Member</p>
									<p class="text-lg font-semibold text-white">
										{formatCurrency(premiumMetrics().totalActive > 0 ? premiumMetrics().monthlyMRR / premiumMetrics().totalActive : 0)}
									</p>
									<p class="text-xs text-gray-500">/month</p>
								</div>
								<div class="rounded-lg bg-white/5 p-3">
									<p class="text-xs text-gray-500">Plan Mix</p>
									<p class="text-lg font-semibold text-white">
										{premiumMetrics().totalActive > 0 ? Math.round((premiumMetrics().activeYearly / premiumMetrics().totalActive) * 100) : 0}%
									</p>
									<p class="text-xs text-gray-500">yearly subscribers</p>
								</div>
							</div>
						</div>

						<!-- Health Indicator -->
						<div class="border-t border-white/10 pt-4">
							<p class="mb-3 text-sm font-medium text-gray-300">Subscription Health</p>
							<div class="flex items-center gap-4">
								<div class="flex-1">
									<div class="flex items-center justify-between mb-1">
										<span class="text-xs text-gray-500">Active</span>
										<span class="text-xs text-green-400">{formatNumber(premiumMetrics().totalActive)}</span>
									</div>
									<div class="h-3 overflow-hidden rounded-full bg-gray-800">
										<div
											class="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400"
											style="width: {(premiumMetrics().totalActive + premiumMetrics().totalCancelled) > 0 ? (premiumMetrics().totalActive / (premiumMetrics().totalActive + premiumMetrics().totalCancelled)) * 100 : 100}%"
										></div>
									</div>
								</div>
								<div class="flex-1">
									<div class="flex items-center justify-between mb-1">
										<span class="text-xs text-gray-500">Churned</span>
										<span class="text-xs text-red-400">{formatNumber(premiumMetrics().totalCancelled)}</span>
									</div>
									<div class="h-3 overflow-hidden rounded-full bg-gray-800">
										<div
											class="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
											style="width: {(premiumMetrics().totalActive + premiumMetrics().totalCancelled) > 0 ? (premiumMetrics().totalCancelled / (premiumMetrics().totalActive + premiumMetrics().totalCancelled)) * 100 : 0}%"
										></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Full Breakdown Table -->
			{#if premiumMetrics().breakdown.length > 0}
				<div class="mt-6 rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Full Status Breakdown</h3>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b border-gray-800">
									<th class="pb-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan Type</th>
									<th class="pb-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
									<th class="pb-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Count</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-800">
								{#each premiumMetrics().breakdown as sub}
									<tr>
										<td class="py-3 text-sm capitalize text-white">{sub.type || 'Unknown'}</td>
										<td class="py-3">
											<span class="rounded-full px-2 py-1 text-xs font-medium capitalize
												{sub.status === 'active' ? 'bg-green-500/20 text-green-400' :
												sub.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
												sub.status === 'payment_failed' ? 'bg-yellow-500/20 text-yellow-400' :
												'bg-gray-500/20 text-gray-400'}">
												{sub.status?.replace('_', ' ') || 'unknown'}
											</span>
										</td>
										<td class="py-3 text-right text-sm font-medium text-white">{formatNumber(sub.count)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{/if}

		<!-- Events Section -->
		{#if activeSection === 'events'}
			<!-- Event Stats -->
			<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5">
					<p class="text-sm text-cyan-300">Total Events</p>
					<p class="mt-2 text-3xl font-bold text-white">{formatNumber(data.events?.total)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Upcoming</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatNumber(data.events?.upcoming)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Ticket Revenue</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatCurrency(data.tickets?.totalRevenue)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Tickets Sold</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatNumber(data.tickets?.total)}</p>
				</div>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Events by Circuit -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Events by Circuit</h3>
					<div class="space-y-4">
						{#each data.events?.byCircuit || [] as circuit}
							<div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4">
								<div class="flex items-center gap-3">
									<div class="h-3 w-3 rounded-full {getCircuit(circuit.circuit).colors.dot}"></div>
									<p class="font-medium text-white">{circuit.circuit}</p>
								</div>
								<p class="text-lg font-bold text-white">{formatNumber(circuit.count)}</p>
							</div>
						{/each}
					</div>
				</div>

				<!-- Events by Format -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Events by Format</h3>
					<div class="space-y-4">
						{#each data.events?.byFormat || [] as format}
							<div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4">
								<p class="font-medium text-white">{format.format}</p>
								<p class="text-lg font-bold text-white">{formatNumber(format.count)}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Tickets Section -->
		{#if activeSection === 'tickets'}
			<!-- Ticket Stats -->
			<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5">
					<p class="text-sm text-purple-300">Total Tickets</p>
					<p class="mt-2 text-3xl font-bold text-white">{formatNumber(data.tickets?.total)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">This Month</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatNumber(data.tickets?.thisMonth)}</p>
					{#if data.tickets?.growth}
						<p class="mt-1 text-xs {getGrowthColor(data.tickets.growth)}">
							{getGrowthIcon(data.tickets.growth)} {data.tickets.growth}% vs last month
						</p>
					{/if}
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Total Revenue</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatCurrency(data.tickets?.totalRevenue)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Refunded</p>
					<p class="mt-2 text-2xl font-bold text-red-400">{formatNumber(data.tickets?.refunded)}</p>
				</div>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Tickets by Circuit -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Tickets by Circuit</h3>
					<div class="space-y-4">
						{#each data.tickets?.byCircuit || [] as circuit}
							<div class="rounded-lg border border-white/5 bg-white/5 p-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="h-3 w-3 rounded-full {getCircuit(circuit.circuit).colors.dot}"></div>
										<p class="font-medium text-white">{circuit.circuit || 'Unassigned'}</p>
									</div>
									<p class="font-bold text-white">{formatNumber(circuit.count)} tickets</p>
								</div>
								<p class="mt-1 text-sm text-emerald-400">{formatCurrency(circuit.revenue)} revenue</p>
							</div>
						{/each}
					</div>
				</div>

				<!-- Top Selling Events -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Top Selling Events</h3>
					<div class="space-y-3">
						{#each data.tickets?.topEvents || [] as event, i}
							<div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
								<div class="flex items-center gap-3">
									<span class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
										{i + 1}
									</span>
									<div>
										<p class="text-sm font-medium text-white">{event.title || 'Unknown Event'}</p>
										<p class="text-xs text-gray-400">{event.circuit} &middot; {event.count} tickets</p>
									</div>
								</div>
								<p class="font-bold text-emerald-400">{formatCurrency(event.revenue)}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Players Section -->
		{#if activeSection === 'players'}
			<!-- Player Stats -->
			<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5">
					<p class="text-sm text-rose-300">Total Players</p>
					<p class="mt-2 text-3xl font-bold text-white">{formatNumber(data.players?.total)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Course Purchases</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatNumber(data.courses?.total)}</p>
				</div>
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
					<p class="text-sm text-gray-400">Active Tickets</p>
					<p class="mt-2 text-2xl font-bold text-white">{formatNumber((data.tickets?.total || 0) - (data.tickets?.refunded || 0))}</p>
				</div>
			</div>

			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Players by Circuit -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Players by Circuit</h3>
					<div class="space-y-4">
						{#each data.players?.byCircuit || [] as circuit}
							<div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4">
								<div class="flex items-center gap-3">
									<div class="h-3 w-3 rounded-full {getCircuit(circuit.circuit).colors.dot}"></div>
									<p class="font-medium text-white">{circuit.circuit}</p>
								</div>
								<p class="text-lg font-bold text-white">{formatNumber(circuit.count)}</p>
							</div>
						{/each}
					</div>
				</div>

				<!-- Top Players -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Top Players by Points</h3>
					<div class="space-y-3">
						{#each data.players?.topPlayers || [] as player, i}
							<div class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
								<div class="flex items-center gap-3">
									<span class="flex h-8 w-8 items-center justify-center rounded-full {i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-amber-600/20 text-amber-500' : 'bg-rose-500/20 text-rose-400'} text-sm font-bold">
										{i + 1}
									</span>
									<div>
										<p class="text-sm font-medium text-white">{player.name}</p>
										<p class="text-xs text-gray-400">{player.circuit} &middot; {player.matchesWon}W-{player.matchesPlayed - player.matchesWon}L</p>
									</div>
								</div>
								<p class="font-bold text-rose-400">{player.points} pts</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
		{/if}
</div>
