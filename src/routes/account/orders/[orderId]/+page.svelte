<script>
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	// For refund confirmation
	let refunding = false;

	function handleRefund(event) {
		if (
			!confirm(
				'Are you sure you want to refund this order? This action cannot be undone and will revoke any access granted by this purchase.'
			)
		) {
			event.preventDefault();
		}
	}

	// Determine if order can be refunded
	const canRefund =
		data.order.meta?.type !== 'subscription' &&
		(!data.additionalData?.ticket || !data.additionalData.ticket.refunded);

	// Get order type display name
	function getOrderTypeName(type) {
		const types = {
			ticket: 'Event Ticket',
			course: 'Course Purchase',
			subscription: 'Premium Subscription'
		};
		return types[type] || 'Purchase';
	}
</script>

<svelte:head>
	<title>Order Details - Arcane Games and Events</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 py-8">
	<div class="mx-auto max-w-4xl px-2">
		<!-- Back Button -->
		<div class="mb-6">
			<a
				href="/account?tab=order-history"
				class="inline-flex items-center text-sm text-gray-400 hover:text-gray-100 transition-colors"
			>
				<svg
					class="mr-2 h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Back to Order History
			</a>
		</div>

		<!-- Page Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-100">Order Details</h1>
			<p class="mt-2 text-sm text-gray-400">
				View and manage your order
			</p>
		</div>

		<!-- Success/Error Messages -->
		{#if form?.success}
			<div
				class="mb-6 rounded-lg border border-green-400 bg-green-100 p-4 dark:border-green-800 dark:bg-green-900/20"
			>
				<p class="text-sm text-green-800 dark:text-green-400">{form.message}</p>
			</div>
		{/if}

		{#if form?.error}
			<div
				class="mb-6 rounded-lg border border-red-700 bg-red-700/10 p-4"
			>
				<p class="text-sm text-red-700">{form.error}</p>
			</div>
		{/if}

		<!-- Order Information Card -->
		<div
			class="rounded-lg border border-gray-700 bg-gray-950 shadow-sm overflow-hidden"
		>
			<!-- Header with Status -->
			<div class="border-b border-gray-700 bg-gray-800 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-100">
						{getOrderTypeName(data.order.meta?.type)}
					</h2>
					{#if data.additionalData?.ticket?.refunded}
						<span
							class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/20 dark:text-red-400"
						>
							Refunded
						</span>
					{:else if data.order.meta?.type === 'subscription'}
						<span
							class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
						>
							Recurring
						</span>
					{:else}
						<span
							class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/20 dark:text-green-400"
						>
							Completed
						</span>
					{/if}
				</div>
			</div>

			<!-- Order Details -->
			<div class="p-6 space-y-6">
				<!-- Basic Order Info -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-gray-100">
						Order Information
					</h3>
					<dl class="space-y-3">
						<div class="flex justify-between">
							<dt class="text-sm font-medium text-gray-400">Order ID</dt>
							<dd class="text-sm font-mono text-gray-100">
								{data.order.id.substring(0, 13)}...
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-sm font-medium text-gray-400">Date</dt>
							<dd class="text-sm text-gray-100">
								{new Date(data.order.createdAt).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-sm font-medium text-gray-400">Amount</dt>
							<dd class="text-lg font-semibold text-gray-100">
								${parseFloat(data.order.amount).toFixed(2)} {data.order.currency}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-sm font-medium text-gray-400">
								Transaction ID
							</dt>
							<dd class="text-sm font-mono text-gray-400">
								{data.order.providerRef}
							</dd>
						</div>
					</dl>
				</div>

				<!-- Type-Specific Details -->
				{#if data.order.meta?.type === 'ticket' && data.additionalData?.ticket}
					<div class="border-t border-gray-700 pt-6">
						<h3 class="mb-4 text-lg font-semibold text-gray-100">
							Ticket Details
						</h3>
						<dl class="space-y-3">
							<div class="flex justify-between">
								<dt class="text-sm font-medium text-gray-400">Event</dt>
								<dd class="text-sm text-gray-100">
									{data.order.meta.eventTitle}
								</dd>
							</div>
							<div class="flex justify-between">
								<dt class="text-sm font-medium text-gray-400">
									Ticket Code
								</dt>
								<dd class="text-sm font-mono font-semibold text-gray-100">
									{data.additionalData.ticket.code}
								</dd>
							</div>
							{#if data.additionalData.ticket.firstName}
								<div class="flex justify-between">
									<dt class="text-sm font-medium text-gray-400">
										Player Name
									</dt>
									<dd class="text-sm text-gray-100">
										{data.additionalData.ticket.firstName}
										{data.additionalData.ticket.lastName}
									</dd>
								</div>
							{/if}
							{#if data.additionalData.ticket.gemId}
								<div class="flex justify-between">
									<dt class="text-sm font-medium text-gray-400">
										GEM ID
									</dt>
									<dd class="text-sm text-gray-100">
										{data.additionalData.ticket.gemId}
									</dd>
								</div>
							{/if}
							{#if data.additionalData.ticket.refunded}
								<div class="flex justify-between">
									<dt class="text-sm font-medium text-gray-400">
										Refunded On
									</dt>
									<dd class="text-sm text-gray-100">
										{new Date(data.additionalData.ticket.refundedAt).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										})}
									</dd>
								</div>
							{/if}
						</dl>
					</div>
				{:else if data.order.meta?.type === 'course'}
					<div class="border-t border-gray-700 pt-6">
						<h3 class="mb-4 text-lg font-semibold text-gray-100">
							Course Details
						</h3>
						<dl class="space-y-3">
							<div class="flex justify-between">
								<dt class="text-sm font-medium text-gray-400">Course ID</dt>
								<dd class="text-sm font-mono text-gray-100">
									{data.order.meta.courseId}
								</dd>
							</div>
							{#if data.additionalData?.entitlement}
								<div class="flex justify-between">
									<dt class="text-sm font-medium text-gray-400">Status</dt>
									<dd class="text-sm text-green-600 dark:text-green-400 font-medium">
										Active Access
									</dd>
								</div>
							{:else}
								<div class="flex justify-between">
									<dt class="text-sm font-medium text-gray-400">Status</dt>
									<dd class="text-sm text-red-600 dark:text-red-400 font-medium">
										Access Revoked
									</dd>
								</div>
							{/if}
						</dl>
					</div>
				{:else if data.order.meta?.type === 'subscription'}
					<div class="border-t border-gray-700 pt-6">
						<h3 class="mb-4 text-lg font-semibold text-gray-100">
							Subscription Details
						</h3>
						<dl class="space-y-3">
							<div class="flex justify-between">
								<dt class="text-sm font-medium text-gray-400">
									Subscription ID
								</dt>
								<dd class="text-sm font-mono text-gray-100">
									{data.order.meta.subscriptionId}
								</dd>
							</div>
							<div class="flex justify-between">
								<dt class="text-sm font-medium text-gray-400">Type</dt>
								<dd class="text-sm text-gray-100">Monthly Recurring</dd>
							</div>
						</dl>
						<div class="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 p-4">
							<p class="text-sm text-blue-800 dark:text-blue-400">
								To cancel your subscription, please visit the
								<a href="/account?tab=plans-billing" class="underline font-medium"
									>Plans & Billing</a
								>
								section of your account.
							</p>
						</div>
					</div>
				{/if}

				<!-- Refund Action -->
				{#if canRefund && !form?.success}
					<div class="border-t border-gray-700 pt-6">
						<h3 class="mb-4 text-lg font-semibold text-gray-100">
							Refund Request
						</h3>
						<p class="mb-4 text-sm text-gray-400">
							If you need to refund this order, click the button below. This action cannot be
							undone and will revoke any access granted by this purchase.
						</p>
						<form method="POST" action="?/refund" use:enhance on:submit={handleRefund}>
							<button
								type="submit"
								disabled={refunding}
								class="rounded-md bg-red-700 px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{refunding ? 'Processing...' : 'Request Refund'}
							</button>
						</form>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
