<script>
	import { getCircuit } from '$lib/data/circuits.js';

	let { data } = $props();

	const fmt = (n) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(n || 0);
	const fmtD = (n) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
	const num = (n) => new Intl.NumberFormat('en-US').format(n || 0);
	const pct = (g) => {
		if (!g) return null;
		const n = parseFloat(g);
		if (n > 0) return { label: `+${g}%`, cls: 'text-emerald-400 bg-emerald-500/15' };
		if (n < 0) return { label: `${g}%`, cls: 'text-red-400 bg-red-500/15' };
		return { label: `${g}%`, cls: 'text-gray-400 bg-gray-500/15' };
	};
</script>

<svelte:head><title>Analytics - Admin</title></svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<main class="space-y-6 overflow-hidden">
			{#if data.error}
				<div
					class="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/5 p-4 shadow-lg shadow-red-500/5"
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
						<p class="text-sm font-medium text-red-400">{data.error}</p>
					</div>
				</div>
			{:else}
				<!-- TOP KPI ROW -->
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">All-Time Revenue</p>
								<p class="truncate text-lg font-bold text-emerald-400 sm:text-xl">
									{fmt(data.revenue?.allTime)}
								</p>
							</div>
						</div>
					</div>
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-amber-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">Premium Members</p>
								<p class="truncate text-lg font-bold text-amber-400 sm:text-xl">
									{num(data.premium?.totalPremium)}
								</p>
							</div>
						</div>
					</div>
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5"
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
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">Tickets Sold</p>
								<p class="truncate text-lg font-bold text-cyan-400 sm:text-xl">
									{num(data.tickets?.total)}
								</p>
							</div>
						</div>
					</div>
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-indigo-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">MRR</p>
								<p class="truncate text-lg font-bold text-indigo-400 sm:text-xl">
									{fmtD(data.premium?.mrr)}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- REVENUE -->
				<div
					class="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:p-5"
				>
					<div class="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
						<div class="flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
								<svg
									class="h-4 w-4 text-emerald-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div>
								<h2 class="text-sm font-semibold text-white">Revenue</h2>
								<p class="text-xs text-gray-500">{num(data.revenue?.allTimeOrders)} total orders</p>
							</div>
						</div>
						{#if data.revenue?.growth}
							{@const g = pct(data.revenue.growth)}
							{#if g}<span class="rounded-full px-2.5 py-1 text-xs font-medium {g.cls}"
									>{g.label} vs last month</span
								>{/if}
						{/if}
					</div>

					<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
						<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
							<p class="text-[10px] text-gray-500 sm:text-xs">Today</p>
							<p class="mt-1 text-base font-bold text-white sm:text-xl">
								{fmt(data.revenue?.today)}
							</p>
							<p class="mt-0.5 text-[10px] text-gray-600 sm:text-xs">
								{data.revenue?.todayOrders} orders
							</p>
						</div>
						<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
							<p class="text-[10px] text-gray-500 sm:text-xs">This Week</p>
							<p class="mt-1 text-base font-bold text-white sm:text-xl">
								{fmt(data.revenue?.week)}
							</p>
							<p class="mt-0.5 text-[10px] text-gray-600 sm:text-xs">
								{data.revenue?.weekOrders} orders
							</p>
						</div>
						<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
							<p class="text-[10px] text-gray-500 sm:text-xs">This Month</p>
							<p class="mt-1 text-base font-bold text-white sm:text-xl">
								{fmt(data.revenue?.month)}
							</p>
							<p class="mt-0.5 text-[10px] text-gray-600 sm:text-xs">
								{data.revenue?.monthOrders} orders
							</p>
						</div>
						<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
							<p class="text-[10px] text-gray-500 sm:text-xs">Year to Date</p>
							<p class="mt-1 text-base font-bold text-white sm:text-xl">{fmt(data.revenue?.ytd)}</p>
						</div>
						<div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 sm:p-3">
							<p class="text-[10px] text-emerald-400/70 sm:text-xs">All Time</p>
							<p class="mt-1 text-base font-bold text-emerald-400 sm:text-xl">
								{fmt(data.revenue?.allTime)}
							</p>
						</div>
					</div>

					<div class="grid gap-6 border-t border-white/5 pt-5 lg:grid-cols-2">
						<div>
							<h3 class="mb-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
								Revenue by Type
							</h3>
							{#each data.revenue?.byType || [] as type}
								{@const max = Math.max(...(data.revenue?.byType || []).map((t) => t.total)) || 1}
								<div class="mb-3 last:mb-0">
									<div class="mb-1 flex items-center justify-between">
										<span class="text-xs text-gray-300 capitalize sm:text-sm">{type.type}</span>
										<div class="flex items-center gap-1.5 sm:gap-2">
											<span class="text-xs font-medium text-white sm:text-sm"
												>{fmtD(type.total)}</span
											>
											<span
												class="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500 sm:px-2 sm:text-xs"
												>{type.count}</span
											>
										</div>
									</div>
									<div class="h-2 overflow-hidden rounded-full bg-gray-800">
										<div
											class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
											style="width: {(type.total / max) * 100}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
						<div>
							<h3 class="mb-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
								Monthly Trend
							</h3>
							{#each data.revenue?.monthlyTrend || [] as month}
								{@const max =
									Math.max(...(data.revenue?.monthlyTrend || []).map((m) => m.total)) || 1}
								<div class="flex items-center gap-2 py-1.5 sm:gap-3">
									<span class="w-12 shrink-0 text-[10px] text-gray-500 sm:w-16 sm:text-xs"
										>{month.monthName}</span
									>
									<div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
										<div
											class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
											style="width: {(month.total / max) * 100}%"
										></div>
									</div>
									<span
										class="w-12 shrink-0 text-right text-[10px] font-medium text-gray-300 sm:w-14 sm:text-xs"
										>{fmt(month.total)}</span
									>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- PREMIUM + TICKETS SIDE BY SIDE -->
				<div class="grid gap-6 lg:grid-cols-2">
					<!-- PREMIUM MEMBERS -->
					<div
						class="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:p-5"
					>
						<div class="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
							<div class="flex items-center gap-3">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
									<svg
										class="h-4 w-4 text-amber-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
										/>
									</svg>
								</div>
								<h2 class="text-sm font-semibold text-white">Premium Members</h2>
							</div>
							<div class="flex gap-1.5">
								<span
									class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 sm:px-2.5 sm:text-xs"
									>{data.premium?.paidPremium} paid</span
								>
								<span
									class="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400 sm:px-2.5 sm:text-xs"
									>{data.premium?.assignedPremium} staff</span
								>
							</div>
						</div>

						<div class="mb-4 grid grid-cols-2 gap-2 sm:gap-3">
							<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
								<div class="flex items-baseline justify-between">
									<p class="text-[10px] text-gray-500 sm:text-xs">Active</p>
									<p class="text-[10px] text-gray-600 sm:text-xs">
										{data.premium?.paidMonthlyActive}m / {data.premium?.paidYearlyActive}y
									</p>
								</div>
								<p class="mt-1 text-base font-bold text-emerald-400 sm:text-xl">
									{num(data.premium?.paidActive)}
								</p>
							</div>
							<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
								<div class="flex items-baseline justify-between">
									<p class="text-[10px] text-gray-500 sm:text-xs">Cancelled</p>
									<p class="text-[10px] text-gray-600 sm:text-xs">
										{data.premium?.paidMonthlyCancelled}m / {data.premium?.paidYearlyCancelled}y
									</p>
								</div>
								<p class="mt-1 text-base font-bold text-red-400 sm:text-xl">
									{num(data.premium?.paidCancelled)}
								</p>
							</div>
							<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
								<p class="text-[10px] text-gray-500 sm:text-xs">ARR</p>
								<p class="mt-1 text-base font-bold text-emerald-400 sm:text-xl">
									{fmtD(data.premium?.arr)}
								</p>
								<p class="mt-0.5 text-[10px] text-gray-600 sm:text-xs">
									{fmtD(data.premium?.mrr)} / mo
								</p>
							</div>
							<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
								<p class="text-[10px] text-gray-500 sm:text-xs">Churn Rate</p>
								<p
									class="mt-1 text-base font-bold sm:text-xl {parseFloat(data.premium?.churn) > 10
										? 'text-red-400'
										: parseFloat(data.premium?.churn) > 5
											? 'text-amber-400'
											: 'text-emerald-400'}"
								>
									{data.premium?.churn}%
								</p>
								{#if data.premium?.paidPaymentFailed > 0}
									<p class="mt-0.5 text-[10px] text-amber-400 sm:text-xs">
										{data.premium.paidPaymentFailed} payment failed
									</p>
								{/if}
							</div>
						</div>

						{#if data.premium?.totalPremium > 0}
							<div class="mb-4 flex items-center gap-3">
								<div class="flex h-2.5 flex-1 overflow-hidden rounded-full bg-gray-800">
									<div
										class="h-full bg-gradient-to-r from-amber-500 to-amber-400"
										style="width: {(data.premium.paidPremium / data.premium.totalPremium) * 100}%"
									></div>
									<div
										class="h-full bg-gradient-to-r from-blue-500 to-blue-400"
										style="width: {(data.premium.assignedPremium / data.premium.totalPremium) *
											100}%"
									></div>
								</div>
								<span class="shrink-0 text-xs text-gray-500"
									>{((data.premium.paidPremium / data.premium.totalPremium) * 100).toFixed(0)}% paid</span
								>
							</div>
						{/if}

						<div class="border-t border-white/5 pt-4">
							<h3 class="mb-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
								Recent Signups
							</h3>
							{#each (data.premium?.recentSignups || []).slice(0, 5) as s}
								<div
									class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.02]"
								>
									<div
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full {s.type ===
										'paid'
											? 'bg-amber-500/15 text-amber-400'
											: 'bg-blue-500/15 text-blue-400'}"
									>
										<span class="text-xs font-bold">{s.type === 'paid' ? '$' : 'A'}</span>
									</div>
									<span class="min-w-0 flex-1 truncate text-sm text-gray-300"
										>{s.firstName || ''} {s.lastName || ''}</span
									>
									<span
										class="shrink-0 rounded-full px-2 py-0.5 text-xs capitalize {s.type === 'paid'
											? 'bg-amber-500/10 text-amber-400'
											: 'bg-blue-500/10 text-blue-400'}"
										>{s.type === 'paid' ? s.subscriptionType || 'paid' : 'staff'}</span
									>
								</div>
							{/each}
							{#if (data.premium?.recentSignups || []).length === 0}
								<p class="py-3 text-center text-xs text-gray-600">No recent signups</p>
							{/if}
						</div>
					</div>

					<!-- TICKET SALES -->
					<div
						class="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:p-5"
					>
						<div class="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
							<div class="flex items-center gap-3">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
									<svg
										class="h-4 w-4 text-cyan-400"
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
									<h2 class="text-sm font-semibold text-white">Ticket Sales</h2>
									<p class="text-xs text-gray-500">{num(data.tickets?.total)} total sold</p>
								</div>
							</div>
							{#if data.tickets?.growth}
								{@const g = pct(data.tickets.growth)}
								{#if g}<span class="rounded-full px-2.5 py-1 text-xs font-medium {g.cls}"
										>{g.label}</span
									>{/if}
							{/if}
						</div>

						<div class="mb-4 grid grid-cols-2 gap-2 sm:gap-3">
							<div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 sm:p-3">
								<p class="text-[10px] text-emerald-400/70 sm:text-xs">Total Revenue</p>
								<p class="mt-1 text-base font-bold text-emerald-400 sm:text-xl">
									{fmt(data.tickets?.totalRevenue)}
								</p>
							</div>
							<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
								<p class="text-[10px] text-gray-500 sm:text-xs">This Month</p>
								<p class="mt-1 text-base font-bold text-white sm:text-xl">
									{num(data.tickets?.thisMonth)}
								</p>
								<p class="mt-0.5 text-[10px] text-gray-600 sm:text-xs">
									{fmtD(data.tickets?.thisMonthRevenue)}
								</p>
							</div>
							<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
								<p class="text-[10px] text-gray-500 sm:text-xs">Avg Price</p>
								<p class="mt-1 text-base font-bold text-white sm:text-xl">
									{fmtD(data.tickets?.avgTicketPrice)}
								</p>
							</div>
							<div class="rounded-xl border border-white/5 bg-gray-800/40 p-2.5 sm:p-3">
								<div class="flex items-baseline justify-between">
									<p class="text-[10px] text-gray-500 sm:text-xs">Refunded</p>
									<p class="text-[10px] text-gray-600 sm:text-xs">{data.tickets?.refundRate}%</p>
								</div>
								<p class="mt-1 text-base font-bold text-red-400 sm:text-xl">
									{num(data.tickets?.refunded)}
								</p>
							</div>
						</div>

						<div class="space-y-4 border-t border-white/5 pt-4">
							<div>
								<h3 class="mb-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
									By Circuit
								</h3>
								{#each data.tickets?.byCircuit || [] as c}
									{@const max =
										Math.max(...(data.tickets?.byCircuit || []).map((x) => x.count)) || 1}
									<div class="flex items-center gap-1.5 py-1.5 sm:gap-2.5">
										<div
											class="h-2.5 w-2.5 shrink-0 rounded-full {getCircuit(c.circuit).colors.dot}"
										></div>
										<span class="min-w-0 flex-1 truncate text-xs text-gray-300 sm:text-sm"
											>{c.circuit}</span
										>
										<span
											class="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400 sm:px-2 sm:text-xs"
											>{c.count}</span
										>
										<span
											class="w-14 shrink-0 text-right text-[10px] font-medium text-emerald-400 sm:w-16 sm:text-xs"
											>{fmtD(c.revenue)}</span
										>
									</div>
								{/each}
							</div>
							<div>
								<h3 class="mb-3 text-xs font-medium tracking-wider text-gray-500 uppercase">
									Top Events
								</h3>
								{#each (data.tickets?.topEvents || []).slice(0, 5) as e, i}
									<div class="flex items-center gap-1.5 py-1.5 sm:gap-2.5">
										<span
											class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-medium {i <
											3
												? 'bg-cyan-500/15 text-cyan-400'
												: 'bg-white/5 text-gray-600'}">{i + 1}</span
										>
										<span class="min-w-0 flex-1 truncate text-xs text-gray-300 sm:text-sm"
											>{e.title || 'Unknown'}</span
										>
										<span
											class="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400 sm:px-2 sm:text-xs"
											>{e.count}</span
										>
										<span
											class="w-14 shrink-0 text-right text-[10px] font-medium text-emerald-400 sm:w-16 sm:text-xs"
											>{fmtD(e.revenue)}</span
										>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- MONTHLY TRENDS ROW -->
				<div class="grid gap-6 lg:grid-cols-2">
					<!-- Ticket Monthly Trend -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:p-5">
						<h3 class="mb-4 text-xs font-medium tracking-wider text-gray-500 uppercase">
							Ticket Sales Trend
						</h3>
						{#each data.tickets?.monthlyTrend || [] as month}
							{@const max =
								Math.max(...(data.tickets?.monthlyTrend || []).map((m) => m.count)) || 1}
							<div class="flex items-center gap-2 py-1.5 sm:gap-3">
								<span class="w-12 shrink-0 text-[10px] text-gray-500 sm:w-16 sm:text-xs"
									>{month.monthName}</span
								>
								<div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
									<div
										class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
										style="width: {(month.count / max) * 100}%"
									></div>
								</div>
								<span
									class="w-6 shrink-0 text-right text-[10px] font-medium text-gray-300 sm:w-8 sm:text-xs"
									>{month.count}</span
								>
								<span
									class="w-12 shrink-0 text-right text-[10px] text-emerald-400 sm:w-14 sm:text-xs"
									>{fmt(month.revenue)}</span
								>
							</div>
						{/each}
					</div>

					<!-- Premium Monthly Trend -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:p-5">
						<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
							<h3 class="text-xs font-medium tracking-wider text-gray-500 uppercase">
								Premium Signups Trend
							</h3>
							<div class="flex items-center gap-3 text-xs">
								<span class="flex items-center gap-1.5"
									><span class="inline-block h-2 w-2 rounded-full bg-amber-500"></span> Paid</span
								>
								<span class="flex items-center gap-1.5 text-gray-500"
									><span class="inline-block h-2 w-2 rounded-full bg-blue-500"></span> Staff</span
								>
							</div>
						</div>
						{#each data.premium?.monthlyTrend || [] as month}
							{@const max =
								Math.max(...(data.premium?.monthlyTrend || []).map((m) => m.total)) || 1}
							{@const paidW = max > 0 ? (month.paid / max) * 100 : 0}
							{@const assignedW = max > 0 ? (month.assigned / max) * 100 : 0}
							<div class="flex items-center gap-2 py-1.5 sm:gap-3">
								<span class="w-12 shrink-0 text-[10px] text-gray-500 sm:w-16 sm:text-xs"
									>{month.monthName}</span
								>
								<div class="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
									<div
										class="h-full bg-gradient-to-r from-amber-500 to-amber-400"
										style="width: {paidW}%"
									></div>
									<div
										class="h-full bg-gradient-to-r from-blue-500 to-blue-400"
										style="width: {assignedW}%"
									></div>
								</div>
								<span
									class="w-6 shrink-0 text-right text-[10px] font-medium text-gray-400 sm:text-xs"
									>{month.total}</span
								>
							</div>
						{/each}
					</div>
				</div>

				<!-- BOTTOM: Events + Players + Customers -->
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:p-5">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
									<svg
										class="h-4 w-4 text-cyan-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
								<h2 class="text-sm font-semibold text-white">Events</h2>
							</div>
							<span
								class="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-400 sm:px-2.5 sm:text-xs"
								>{data.events?.upcoming} upcoming</span
							>
						</div>
						{#each (data.events?.byCircuit || []).slice(0, 5) as circuit}
							<div class="flex items-center justify-between py-1.5">
								<span class="flex items-center gap-2">
									<span class="h-2.5 w-2.5 rounded-full {getCircuit(circuit.circuit).colors.dot}"
									></span>
									<span class="text-xs text-gray-300 sm:text-sm">{circuit.circuit}</span>
								</span>
								<span class="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-white"
									>{num(circuit.count)}</span
								>
							</div>
						{/each}
					</div>

					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:p-5">
						<div class="mb-4 flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15">
								<svg
									class="h-4 w-4 text-rose-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 15l-2 5h4l-2-5zm0 0V9m-4 6H4a1 1 0 01-1-1V6a1 1 0 011-1h4m8 9h4a1 1 0 001-1V6a1 1 0 00-1-1h-4m-8 0V4a2 2 0 012-2h4a2 2 0 012 2v1m-8 0h8"
									/>
								</svg>
							</div>
							<h2 class="text-sm font-semibold text-white">Top Players</h2>
						</div>
						{#each (data.players?.topPlayers || []).slice(0, 7) as p, i}
							<div class="flex items-center gap-1.5 py-1.5 sm:gap-2.5">
								<span
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-medium {i <
									3
										? 'bg-amber-500/15 text-amber-400'
										: 'bg-white/5 text-gray-600'}">{i + 1}</span
								>
								<span class="min-w-0 flex-1 truncate text-xs text-gray-300 sm:text-sm"
									>{p.name}</span
								>
								<span class="shrink-0 text-[10px] text-gray-500 sm:text-xs"
									>{p.matchesWon}W-{p.matchesPlayed - p.matchesWon}L</span
								>
								<span class="shrink-0 text-xs font-semibold text-white sm:text-sm">{p.points}</span>
							</div>
						{/each}
					</div>

					<div
						class="rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:col-span-2 sm:p-5 lg:col-span-1"
					>
						<div class="mb-4 flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
								<svg
									class="h-4 w-4 text-purple-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
									/>
								</svg>
							</div>
							<h2 class="text-sm font-semibold text-white">Top Customers</h2>
						</div>
						{#each (data.customers?.topCustomers || []).slice(0, 7) as c, i}
							<div class="flex items-center gap-1.5 py-1.5 sm:gap-2.5">
								<span
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/5 text-xs font-medium text-gray-600"
									>{i + 1}</span
								>
								<span class="min-w-0 flex-1 truncate text-xs text-gray-300 sm:text-sm"
									>{c.email}</span
								>
								<span
									class="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500 sm:px-2 sm:text-xs"
									>{c.orderCount}</span
								>
								<span class="shrink-0 text-xs font-semibold text-emerald-400 sm:text-sm"
									>{fmtD(c.totalSpent)}</span
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>
