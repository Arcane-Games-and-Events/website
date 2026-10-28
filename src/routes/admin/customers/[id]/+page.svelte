<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let activeTab = $state('orders');
	let roleLoading = $state(false);
	let cancelLoading = $state(false);
	let copySuccess = $state(false);

	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			amount || 0
		);
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

	async function copyEmail() {
		await navigator.clipboard.writeText(data.customerEmail);
		copySuccess = true;
		setTimeout(() => (copySuccess = false), 2000);
	}

	function roleChip(role) {
		switch (role) {
			case 'admin':
				return 'bg-warm text-white';
			case 'premium':
				return 'bg-prem text-white';
			case 'tournament staff':
				return 'bg-accent text-white';
			case 'writer':
				return 'bg-ink text-white';
			default:
				return 'border-line2 text-fade border';
		}
	}
	function subStatusChip(status) {
		switch (status) {
			case 'active':
				return 'bg-prem text-white';
			case 'cancelled':
				return 'bg-warm text-white';
			default:
				return 'border-line2 text-fade border';
		}
	}
	function orderTypeChip(t) {
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
</script>

<svelte:head>
	<title
		>{data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : data.customerEmail} ·
		AGE Ops</title
	>
</svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<nav
		class="flex items-center gap-2 font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
	>
		<a href="/admin/users" class="transition-colors hover:text-ink">Users</a>
		<span>›</span>
		<span class="truncate text-warm">
			{data.customer
				? `${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim() ||
					data.customerEmail
				: data.customerEmail}
		</span>
	</nav>

	{#if form?.success}
		<div class="mt-[18px] border-[1.5px] border-ink bg-prem p-4 text-white">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
				style="color: #d6eedf;">Success</span
			>
			<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{form.message}</p>
		</div>
	{/if}
	{#if form?.error}
		<div class="mt-[18px] border-[1.5px] border-ink bg-warm p-4 text-white">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
				style="color: rgba(255,255,255,0.75);">Error</span
			>
			<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{form.error}</p>
		</div>
	{/if}

	<div class="mt-[18px] flex flex-wrap items-start justify-between gap-[18px]">
		<div class="flex items-start gap-[18px]">
			<div
				class="flex h-[72px] w-[72px] items-center justify-center border-[1.5px] border-ink bg-panel font-newsreader text-[26px] font-semibold"
			>
				{#if data.customer}
					{data.customer.firstName.charAt(0)}{data.customer.lastName.charAt(0)}
				{:else}
					{data.customerEmail.charAt(0).toUpperCase()}
				{/if}
			</div>
			<div class="min-w-0">
				<div class="mb-[8px] flex flex-wrap items-center gap-[10px]">
					<span
						class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase"
					>
						Customer
					</span>
				</div>
				<h1
					class="font-newsreader text-[clamp(32px,4.8vw,52px)] leading-[0.95] font-semibold tracking-[-0.02em]"
				>
					{#if data.customer}{data.customer.firstName} {data.customer.lastName}{:else}Guest Customer{/if}
				</h1>
				<div class="mt-[10px] flex flex-wrap items-center gap-[10px]">
					<span
						class="font-mono-system text-[11px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						{data.customerEmail}
					</span>
					<button
						onclick={copyEmail}
						class="inline-flex items-center border border-line2 px-[8px] py-[3px] font-mono-system text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
						title="Copy email"
					>
						{copySuccess ? 'Copied' : 'Copy'}
					</button>
				</div>
				<div class="mt-[10px] flex flex-wrap items-center gap-[8px]">
					{#if data.customer}
						<span
							class="inline-flex items-center px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] uppercase {roleChip(
								data.customer.role
							)}"
						>
							{data.customer.role}
						</span>
						{#if data.customer.gemId}
							<span
								class="inline-flex items-center border border-line2 px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-warm uppercase"
							>
								GEM · {data.customer.gemId}
							</span>
						{/if}
					{:else}
						<span
							class="inline-flex items-center border border-line2 px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-fade uppercase"
						>
							No Account
						</span>
					{/if}
				</div>
				<p
					class="mt-[10px] font-mono-system text-[10px] font-bold tracking-[0.06em] text-fade uppercase"
				>
					{#if data.customer}
						Member since {formatDate(data.customer.createdAt)}
					{:else if data.stats.firstOrder}
						First order {formatDate(data.stats.firstOrder.createdAt)}
					{/if}
				</p>
			</div>
		</div>

		{#if data.customer}
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
					class="border-[1.5px] border-ink bg-paper-bg px-[12px] py-[9px] font-mono-system text-[11px] font-bold tracking-[0.06em] text-ink uppercase focus:outline-none"
				>
					<option value="free" selected={data.customer.role === 'free'}>Free</option>
					<option value="premium" selected={data.customer.role === 'premium'}>Premium</option>
					<option value="writer" selected={data.customer.role === 'writer'}>Writer</option>
					<option value="tournament staff" selected={data.customer.role === 'tournament staff'}
						>Tournament Staff</option
					>
					<option value="admin" selected={data.customer.role === 'admin'}>Admin</option>
				</select>
				<button
					type="submit"
					disabled={roleLoading}
					class="inline-flex items-center bg-ink px-[14px] py-[9px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125 disabled:opacity-50"
				>
					{roleLoading ? 'Updating…' : 'Update Role'}
				</button>
			</form>
		{/if}
	</div>
</header>

<!-- ============ STATS ============ -->
<section class="overflow-x-clip border-y-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[28px] md:px-10 lg:px-14">
		<div class="grid grid-cols-2 gap-[24px] md:grid-cols-4">
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Lifetime Value</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-prem"
				>
					{formatCurrency(data.stats.totalSpent)}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Total Orders</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{data.stats.totalOrders}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Avg Order</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{formatCurrency(data.stats.avgOrderValue)}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Active Tickets</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{data.activeTicketsCount}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ============ SUBSCRIPTION ============ -->
{#if data.customer && (data.customer.subscriptionId || data.customer.subscriptionStatus)}
	<section class="overflow-x-clip border-b-[3px] border-double border-ink">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[28px] md:px-10 lg:px-14">
			<div class="mb-[18px]">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					Subscription
				</span>
				<h2 class="mt-[6px] font-newsreader text-[26px] font-semibold tracking-[-0.01em]">
					Membership.
				</h2>
			</div>
			<div class="overflow-hidden border-[1.5px] border-ink p-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="grid grid-cols-2 gap-[24px] sm:grid-cols-4">
						<div>
							<span
								class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Status</span
							>
							<div class="mt-[6px]">
								<span
									class="inline-flex items-center px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] uppercase {subStatusChip(
										data.customer.subscriptionStatus
									)}"
								>
									{data.customer.subscriptionStatus || 'None'}
								</span>
							</div>
						</div>
						<div>
							<span
								class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Type</span
							>
							<p class="mt-[6px] font-newsreader text-[16px] font-semibold capitalize">
								{data.customer.subscriptionType || 'N/A'}
							</p>
						</div>
						<div>
							<span
								class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Started</span
							>
							<p class="mt-[6px] font-newsreader text-[16px] font-semibold">
								{formatDate(data.customer.subscriptionStartDate)}
							</p>
						</div>
						<div>
							<span
								class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Next Billing</span
							>
							<p class="mt-[6px] font-newsreader text-[16px] font-semibold">
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
										'Cancel this subscription? The user will be downgraded to the free tier.'
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
								class="inline-flex items-center bg-warm px-[18px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-50"
							>
								{cancelLoading ? 'Cancelling…' : 'Cancel Subscription'}
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</section>
{/if}

<!-- ============ ORDER BREAKDOWN ============ -->
<section class="overflow-x-clip border-b-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[28px] md:px-10 lg:px-14">
		<div class="mb-[18px]">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
			>
				Order Breakdown
			</span>
			<h2 class="mt-[6px] font-newsreader text-[26px] font-semibold tracking-[-0.01em]">
				Where it went.
			</h2>
		</div>
		<div class="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
			<div class="overflow-hidden border-[1.5px] border-ink p-5">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>Tickets</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(22px,3vw,32px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{data.ordersByType.ticket.count}
					<span class="font-mono-system text-[11px] font-bold tracking-[0.06em] text-fade uppercase"
						>orders</span
					>
				</div>
				<span
					class="mt-[6px] block font-mono-system text-[12px] font-bold tracking-[0.06em] text-warm uppercase"
				>
					{formatCurrency(data.ordersByType.ticket.total)}
				</span>
			</div>
			<div class="overflow-hidden border-[1.5px] border-ink p-5">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>Courses</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(22px,3vw,32px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{data.ordersByType.course.count}
					<span class="font-mono-system text-[11px] font-bold tracking-[0.06em] text-fade uppercase"
						>orders</span
					>
				</div>
				<span
					class="mt-[6px] block font-mono-system text-[12px] font-bold tracking-[0.06em] text-accent uppercase"
				>
					{formatCurrency(data.ordersByType.course.total)}
				</span>
			</div>
			<div class="overflow-hidden border-[1.5px] border-ink p-5">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>Subscriptions</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(22px,3vw,32px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{data.ordersByType.subscription.count}
					<span class="font-mono-system text-[11px] font-bold tracking-[0.06em] text-fade uppercase"
						>orders</span
					>
				</div>
				<span
					class="mt-[6px] block font-mono-system text-[12px] font-bold tracking-[0.06em] text-prem uppercase"
				>
					{formatCurrency(data.ordersByType.subscription.total)}
				</span>
			</div>
		</div>
	</div>
</section>

<!-- ============ TABS ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
		<div class="mb-[24px] flex gap-1 border-b-[1.5px] border-ink">
			<button
				onclick={() => (activeTab = 'orders')}
				class="relative px-[16px] py-[12px] font-mono-system text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab ===
				'orders'
					? 'text-ink'
					: 'text-fade hover:text-ink'}"
			>
				Orders · {data.orders.length}
				{#if activeTab === 'orders'}<span
						class="absolute inset-x-[10px] bottom-[-1.5px] h-[2px] bg-warm"
					></span>{/if}
			</button>
			<button
				onclick={() => (activeTab = 'tickets')}
				class="relative px-[16px] py-[12px] font-mono-system text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab ===
				'tickets'
					? 'text-ink'
					: 'text-fade hover:text-ink'}"
			>
				Tickets · {data.tickets.length}
				{#if activeTab === 'tickets'}<span
						class="absolute inset-x-[10px] bottom-[-1.5px] h-[2px] bg-warm"
					></span>{/if}
			</button>
			{#if data.customer}
				<button
					onclick={() => (activeTab = 'courses')}
					class="relative px-[16px] py-[12px] font-mono-system text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab ===
					'courses'
						? 'text-ink'
						: 'text-fade hover:text-ink'}"
				>
					Courses · {data.entitlements.length}
					{#if activeTab === 'courses'}<span
							class="absolute inset-x-[10px] bottom-[-1.5px] h-[2px] bg-warm"
						></span>{/if}
				</button>
			{/if}
		</div>

		{#if activeTab === 'orders'}
			<div class="overflow-hidden border-[1.5px] border-ink">
				{#if data.orders.length === 0}
					<div class="p-12 text-center">
						<p class="font-newsreader text-[19px] text-soft italic">No orders found.</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full min-w-[720px]">
							<thead class="border-b-[1.5px] border-ink">
								<tr class="text-left">
									<th
										class="px-5 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Date</th
									>
									<th
										class="px-5 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Type</th
									>
									<th
										class="px-5 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Description</th
									>
									<th
										class="px-5 py-[12px] text-right font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Amount</th
									>
									<th class="px-5 py-[12px]"></th>
								</tr>
							</thead>
							<tbody>
								{#each data.orders as order (order.id)}
									<tr class="border-b border-line2 transition-colors hover:bg-panel">
										<td
											class="px-5 py-[14px] font-mono-system text-[10.5px] font-bold tracking-[0.06em] text-fade uppercase"
										>
											{formatDate(order.createdAt)}
										</td>
										<td class="px-5 py-[14px]">
											<span
												class="inline-flex items-center px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.08em] uppercase {orderTypeChip(
													order.meta?.type
												)}"
											>
												{order.meta?.type || 'unknown'}
											</span>
										</td>
										<td class="max-w-xs truncate px-5 py-[14px] font-newsreader text-[15px]">
											{order.meta?.eventTitle || order.meta?.product || order.meta?.plan || 'Order'}
										</td>
										<td
											class="px-5 py-[14px] text-right font-archivo text-[15px] font-extrabold tracking-[-0.01em] text-prem"
										>
											{formatCurrency(order.amount)}
										</td>
										<td class="px-5 py-[14px] text-right">
											<a
												href="/admin/orders/{order.id}"
												class="font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] text-warm uppercase transition-colors hover:text-ink"
											>
												View →
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

		{#if activeTab === 'tickets'}
			<div class="overflow-hidden border-[1.5px] border-ink">
				{#if data.tickets.length === 0}
					<div class="p-12 text-center">
						<p class="font-newsreader text-[19px] text-soft italic">No tickets found.</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full min-w-[860px]">
							<thead class="border-b-[1.5px] border-ink">
								<tr class="text-left">
									<th
										class="px-5 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Event</th
									>
									<th
										class="px-5 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Ticket Code</th
									>
									<th
										class="px-5 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Player</th
									>
									<th
										class="px-5 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Date</th
									>
									<th
										class="px-5 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Status</th
									>
								</tr>
							</thead>
							<tbody>
								{#each data.tickets as { ticket, event } (ticket.id)}
									<tr class="border-b border-line2 transition-colors hover:bg-panel">
										<td class="px-5 py-[14px] font-newsreader text-[15px] font-semibold">
											{event?.title || 'Unknown Event'}
										</td>
										<td class="px-5 py-[14px]">
											<code
												class="inline-block border border-line2 bg-panel px-[8px] py-[3px] font-mono-system text-[11px] font-bold tracking-[0.04em] text-warm"
											>
												{ticket.code}
											</code>
										</td>
										<td class="px-5 py-[14px] font-newsreader text-[15px]">
											{ticket.firstName}
											{ticket.lastName}
											{#if ticket.gemId}
												<span
													class="ml-2 font-mono-system text-[10px] font-bold tracking-[0.06em] text-warm uppercase"
													>GEM · {ticket.gemId}</span
												>
											{/if}
										</td>
										<td
											class="px-5 py-[14px] font-mono-system text-[10.5px] font-bold tracking-[0.06em] text-fade uppercase"
										>
											{formatDate(event?.eventDate)}
										</td>
										<td class="px-5 py-[14px]">
											{#if ticket.refunded}
												<span
													class="inline-flex items-center bg-warm px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
													>Refunded</span
												>
											{:else if event?.eventDate && new Date(event.eventDate) < new Date()}
												<span
													class="inline-flex items-center border border-line2 px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-fade uppercase"
													>Past Event</span
												>
											{:else}
												<span
													class="inline-flex items-center bg-prem px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
													>Active</span
												>
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

		{#if activeTab === 'courses' && data.customer}
			<div class="overflow-hidden border-[1.5px] border-ink">
				{#if data.entitlements.length === 0}
					<div class="p-12 text-center">
						<p class="font-newsreader text-[19px] text-soft italic">No courses purchased.</p>
					</div>
				{:else}
					<div>
						{#each data.entitlements as ent (ent.id || ent.product + ent.createdAt)}
							<div
								class="flex items-center justify-between border-b border-line2 p-5 last:border-b-0"
							>
								<div>
									<p class="font-newsreader text-[16px] font-semibold">{ent.product}</p>
									<p
										class="mt-[4px] font-mono-system text-[10px] font-bold tracking-[0.06em] text-fade uppercase"
									>
										Purchased {formatDate(ent.createdAt)}
									</p>
								</div>
								<span
									class="inline-flex items-center bg-prem px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
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
</section>
