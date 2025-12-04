<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let refundLoading = $state(false);
	let refundError = $state(form?.error || '');
	let refundSuccess = $state(form?.success ? form.message : '');

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

	// Check if ticket is refunded
	let isRefunded = $derived(data.relatedData?.ticket?.refunded || false);
</script>

<svelte:head>
	<title>Order {data.order.id.slice(0, 8)}... | Admin</title>
</svelte:head>

<div class="px-4 py-8 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-4xl">
			<!-- Breadcrumb -->
			<nav class="mb-6 flex items-center gap-2 text-sm">
				<a href="/admin?tab=orders" class="text-gray-400 transition-colors hover:text-white">Orders</a>
				<svg class="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				<span class="text-white">{data.order.id.slice(0, 8)}...</span>
			</nav>

			<!-- Header -->
		<div class="mb-8 flex items-start justify-between">
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-xl {data.order.meta?.type ===
					'ticket'
						? 'bg-blue-500/20'
						: data.order.meta?.type === 'course'
							? 'bg-purple-500/20'
							: data.order.meta?.type === 'subscription'
								? 'bg-green-500/20'
								: 'bg-gray-500/20'}"
				>
					{#if data.order.meta?.type === 'ticket'}
						<svg class="h-7 w-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
							/>
						</svg>
					{:else if data.order.meta?.type === 'course'}
						<svg
							class="h-7 w-7 text-purple-400"
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
					{:else if data.order.meta?.type === 'subscription'}
						<svg
							class="h-7 w-7 text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					{:else}
						<svg class="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
					{/if}
				</div>
				<div>
					<h1 class="text-2xl font-bold text-white">Order Details</h1>
					<p class="text-sm text-gray-400">{formatDateTime(data.order.createdAt)}</p>
				</div>
			</div>
			<div class="text-right">
				<p class="text-3xl font-bold text-green-400">{formatCurrency(data.order.amount)}</p>
				<span
					class="mt-1 inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize {data.order
						.meta?.type === 'ticket'
						? 'bg-blue-500/20 text-blue-400'
						: data.order.meta?.type === 'course'
							? 'bg-purple-500/20 text-purple-400'
							: data.order.meta?.type === 'subscription'
								? 'bg-green-500/20 text-green-400'
								: 'bg-gray-500/20 text-gray-400'}"
				>
					{data.order.meta?.type || 'payment'}
				</span>
			</div>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Order Information -->
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
					Order Information
				</h2>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Order ID</span>
						<span class="font-mono text-sm text-gray-300">{data.order.id}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Transaction ID</span>
						<span class="font-mono text-sm text-gray-300">{data.order.providerRef || 'N/A'}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Provider</span>
						<span class="text-gray-300">{data.order.provider || 'Authorize.net'}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Currency</span>
						<span class="text-gray-300">{data.order.currency || 'USD'}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Status</span>
						{#if isRefunded}
							<span class="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
								Refunded
							</span>
						{:else}
							<span
								class="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400"
							>
								Completed
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Customer Information -->
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Customer</h2>
				<div class="space-y-4">
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 text-lg font-bold text-purple-400"
						>
							{data.order.userEmail?.charAt(0).toUpperCase() || '?'}
						</div>
						<div>
							<p class="font-medium text-white">{data.order.userEmail}</p>
							{#if data.customer}
								<p class="text-sm capitalize text-gray-400">{data.customer.role || 'free'} member</p>
							{/if}
						</div>
					</div>
					<a
						href="/admin/customers/{data.customer?.id || encodeURIComponent(data.order.userEmail)}"
						class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
						View Customer Profile
					</a>
				</div>
			</div>

			<!-- Order Type Details -->
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6 lg:col-span-2">
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
					{data.order.meta?.type === 'ticket'
						? 'Ticket Details'
						: data.order.meta?.type === 'course'
							? 'Course Details'
							: data.order.meta?.type === 'subscription'
								? 'Subscription Details'
								: 'Order Details'}
				</h2>

				{#if data.order.meta?.type === 'ticket'}
					<div class="grid gap-4 sm:grid-cols-2">
						{#if data.order.meta.eventTitle || data.relatedData?.event?.title}
							<div>
								<span class="text-sm text-gray-400">Event</span>
								<p class="mt-1 font-medium text-white">
									{data.order.meta.eventTitle || data.relatedData?.event?.title}
								</p>
							</div>
						{/if}
						{#if data.relatedData?.event?.eventDate}
							<div>
								<span class="text-sm text-gray-400">Event Date</span>
								<p class="mt-1 font-medium text-white">
									{formatDate(data.relatedData.event.eventDate)}
								</p>
							</div>
						{/if}
						{#if data.order.meta.ticketCode || data.relatedData?.ticket?.code}
							<div>
								<span class="text-sm text-gray-400">Ticket Code</span>
								<p class="mt-1 font-mono font-medium text-white">
									{data.order.meta.ticketCode || data.relatedData?.ticket?.code}
								</p>
							</div>
						{/if}
						{#if data.order.meta.gemId || data.relatedData?.ticket?.gemId}
							<div>
								<span class="text-sm text-gray-400">GEM ID</span>
								<p class="mt-1 font-medium text-white">
									{data.order.meta.gemId || data.relatedData?.ticket?.gemId}
								</p>
							</div>
						{/if}
						{#if data.relatedData?.ticket}
							<div>
								<span class="text-sm text-gray-400">Attendee Name</span>
								<p class="mt-1 font-medium text-white">
									{data.relatedData.ticket.firstName}
									{data.relatedData.ticket.lastName}
								</p>
							</div>
							<div>
								<span class="text-sm text-gray-400">Ticket Status</span>
								<p class="mt-1">
									{#if data.relatedData.ticket.refunded}
										<span class="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
											Refunded {data.relatedData.ticket.refundedAt ? `on ${formatDate(data.relatedData.ticket.refundedAt)}` : ''}
										</span>
									{:else if data.relatedData.ticket.checkedIn}
										<span class="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
											Checked In
										</span>
									{:else}
										<span class="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
											Valid
										</span>
									{/if}
								</p>
							</div>
						{/if}
					</div>
				{:else if data.order.meta?.type === 'course'}
					<div class="grid gap-4 sm:grid-cols-2">
						{#if data.order.meta.courseId}
							<div>
								<span class="text-sm text-gray-400">Course ID</span>
								<p class="mt-1 font-mono font-medium text-white">{data.order.meta.courseId}</p>
							</div>
						{/if}
						{#if data.relatedData?.entitlement}
							<div>
								<span class="text-sm text-gray-400">Entitlement Status</span>
								<p class="mt-1">
									<span class="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
										Active
									</span>
								</p>
							</div>
						{:else}
							<div>
								<span class="text-sm text-gray-400">Entitlement Status</span>
								<p class="mt-1">
									<span class="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
										Revoked
									</span>
								</p>
							</div>
						{/if}
					</div>
				{:else if data.order.meta?.type === 'subscription'}
					<div class="grid gap-4 sm:grid-cols-2">
						{#if data.order.meta.subscriptionType}
							<div>
								<span class="text-sm text-gray-400">Plan</span>
								<p class="mt-1 font-medium capitalize text-white">
									{data.order.meta.subscriptionType}
								</p>
							</div>
						{/if}
						{#if data.order.meta.subscriptionId}
							<div>
								<span class="text-sm text-gray-400">Subscription ID</span>
								<p class="mt-1 font-mono font-medium text-white">{data.order.meta.subscriptionId}</p>
							</div>
						{/if}
						{#if data.customer}
							<div>
								<span class="text-sm text-gray-400">Current Status</span>
								<p class="mt-1">
									{#if data.customer.subscriptionStatus === 'active'}
										<span class="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
											Active
										</span>
									{:else}
										<span class="rounded-full bg-gray-500/20 px-2.5 py-1 text-xs font-medium text-gray-400 capitalize">
											{data.customer.subscriptionStatus || 'Inactive'}
										</span>
									{/if}
								</p>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-gray-400">No additional details available for this order type.</p>
				{/if}
			</div>

			<!-- Refund Section -->
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6 lg:col-span-2">
				<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Actions</h2>

				{#if refundSuccess}
					<div class="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
						<div class="flex items-center gap-3">
							<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<p class="text-green-400">{refundSuccess}</p>
						</div>
					</div>
				{/if}

				{#if refundError}
					<div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
						<div class="flex items-center gap-3">
							<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
							<p class="text-red-400">{refundError}</p>
						</div>
					</div>
				{/if}

				{#if isRefunded || refundSuccess}
					<div class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
						<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-gray-400">This order has been refunded.</p>
					</div>
				{:else}
					<form
						method="POST"
						action="?/refund"
						use:enhance={() => {
							refundLoading = true;
							refundError = '';
							refundSuccess = '';
							return async ({ result, update }) => {
								refundLoading = false;
								if (result.type === 'success') {
									refundSuccess = result.data?.message || 'Order refunded successfully';
									await invalidateAll();
								} else if (result.type === 'failure') {
									refundError = result.data?.error || 'Failed to process refund';
								}
							};
						}}
					>
						<div class="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
							<div class="mb-4 flex items-start gap-3">
								<svg class="mt-0.5 h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<div>
									<p class="font-medium text-red-400">Process Refund</p>
									<p class="mt-1 text-sm text-gray-400">
										This will attempt to void or refund the transaction through Authorize.net.
										{#if data.order.meta?.type === 'ticket'}
											The ticket will be marked as refunded and will no longer be valid for check-in.
										{:else if data.order.meta?.type === 'course'}
											The customer's course access will be revoked.
										{:else if data.order.meta?.type === 'subscription'}
											The subscription will be cancelled and the customer will be downgraded to the free tier.
										{/if}
									</p>
								</div>
							</div>
							<button
								type="submit"
								disabled={refundLoading}
								class="w-full rounded-lg bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if refundLoading}
									<span class="inline-flex items-center gap-2">
										<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Processing Refund...
									</span>
								{:else}
									Process Refund
								{/if}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
		</div>
	</div>
