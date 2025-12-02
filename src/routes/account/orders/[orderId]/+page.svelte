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

	// Calculate hours until event for tickets
	function getHoursUntilEvent() {
		if (data.order.meta?.type !== 'ticket' || !data.additionalData?.event?.eventDate) {
			return null;
		}
		const eventDate = new Date(data.additionalData.event.eventDate);
		const now = new Date();
		return (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
	}

	const hoursUntilEvent = getHoursUntilEvent();
	const isWithin24Hours = hoursUntilEvent !== null && hoursUntilEvent <= 24;
	const isEventPassed = hoursUntilEvent !== null && hoursUntilEvent < 0;

	// Determine if order can be refunded (self-service)
	const canRefund =
		data.order.meta?.type !== 'subscription' &&
		(!data.additionalData?.ticket || !data.additionalData.ticket.refunded) &&
		!isWithin24Hours;

	// Show refund section for tickets (even if within 24 hours, to show contact message)
	const showRefundSection =
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

	// Get order type icon and color
	function getOrderTypeStyle(type) {
		const styles = {
			ticket: { color: 'blue', icon: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z' },
			course: { color: 'emerald', icon: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5' },
			subscription: { color: 'purple', icon: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z' }
		};
		return styles[type] || { color: 'gray', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z' };
	}

	const typeStyle = getOrderTypeStyle(data.order.meta?.type);
</script>

<svelte:head>
	<title>Order Details - AGE</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
		<!-- Back Button -->
		<div class="mb-6">
			<a
				href="/account?tab=billing"
				class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
			>
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</div>
				Back to Purchase History
			</a>
		</div>

		<!-- Order Header Card -->
		<div class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 via-gray-900 to-gray-950 shadow-2xl shadow-black/20 mb-6">
			<!-- Decorative elements -->
			<div class="absolute inset-0 overflow-hidden pointer-events-none">
				<div class="absolute -top-32 -right-32 w-96 h-96 bg-{typeStyle.color}-500/5 rounded-full blur-3xl"></div>
				<div class="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
				<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
			</div>

			<div class="relative px-6 py-8 sm:px-10 sm:py-10">
				<div class="flex flex-col sm:flex-row sm:items-start gap-6">
					<!-- Order Type Icon -->
					<div class="relative shrink-0">
						<div class="flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl
							{typeStyle.color === 'blue' ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-blue-500/20' : ''}
							{typeStyle.color === 'purple' ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 shadow-purple-500/20' : ''}
							{typeStyle.color === 'emerald' ? 'bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-600 shadow-emerald-500/20' : ''}
							{typeStyle.color === 'gray' ? 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700 shadow-gray-500/20' : ''}">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={typeStyle.icon} />
							</svg>
						</div>
					</div>

					<!-- Order Info -->
					<div class="flex-1 min-w-0">
						<div class="flex flex-wrap items-center gap-3 mb-2">
							<h1 class="text-2xl sm:text-3xl font-bold text-white">
								{getOrderTypeName(data.order.meta?.type)}
							</h1>
							{#if data.additionalData?.ticket?.refunded}
								<span class="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-400">
									<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />
									</svg>
									Refunded
								</span>
							{:else if data.order.meta?.type === 'subscription'}
								<span class="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-xs font-semibold text-purple-400">
									<span class="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse"></span>
									Recurring
								</span>
							{:else}
								<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
									<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
									</svg>
									Completed
								</span>
							{/if}
						</div>
						<p class="text-gray-400 text-sm mb-4">
							Order placed on {new Date(data.order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
						</p>
						<div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
							<span class="flex items-center gap-2">
								<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
								</svg>
								<span class="font-mono text-xs">#{data.order.id.substring(0, 8)}</span>
							</span>
							<span class="flex items-center gap-2">
								<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
								</svg>
								{new Date(data.order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
							</span>
						</div>
					</div>

					<!-- Amount -->
					<div class="text-center sm:text-right px-4 py-3 rounded-xl bg-white/5 border border-white/5">
						<div class="text-3xl font-bold text-white">${parseFloat(data.order.amount).toFixed(2)}</div>
						<div class="text-xs text-gray-500 mt-0.5">{data.order.currency}</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Success/Error Messages -->
		{#if form?.success}
			<div class="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
				<div class="flex items-center gap-3">
					<svg class="h-5 w-5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
					</svg>
					<p class="text-sm font-medium text-emerald-300">{form.message}</p>
				</div>
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
				<div class="flex items-center gap-3">
					<svg class="h-5 w-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
					</svg>
					<p class="text-sm font-medium text-red-300">{form.error}</p>
				</div>
			</div>
		{/if}

		<!-- Order Details Card -->
		<div class="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-xl overflow-hidden">
			<!-- Order Information Section -->
			<div class="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
						</svg>
					</div>
					<div>
						<h2 class="text-lg font-semibold text-white">Order Information</h2>
						<p class="text-sm text-gray-400">Transaction and payment details</p>
					</div>
				</div>
			</div>

			<div class="p-6">
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
						<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Order ID</div>
						<div class="text-sm font-mono text-white">{data.order.id.substring(0, 13)}...</div>
					</div>
					<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
						<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Transaction ID</div>
						<div class="text-sm font-mono text-gray-400">{data.order.providerRef}</div>
					</div>
					<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
						<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Date & Time</div>
						<div class="text-sm font-medium text-white">
							{new Date(data.order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
						</div>
						<div class="text-xs text-gray-500 mt-0.5">
							{new Date(data.order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
						</div>
					</div>
					<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
						<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Payment Provider</div>
						<div class="text-sm font-medium text-white capitalize">{data.order.provider}</div>
					</div>
				</div>
			</div>

			<!-- Type-Specific Details -->
			{#if data.order.meta?.type === 'ticket' && data.additionalData?.ticket}
				<div class="px-6 py-5 border-t border-white/5 bg-white/[0.02]">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-semibold text-white">Ticket Details</h2>
							<p class="text-sm text-gray-400">Event registration information</p>
						</div>
					</div>
				</div>

				<div class="p-6 border-t border-white/5">
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
							<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Event</div>
							<div class="text-sm font-medium text-white">{data.order.meta.eventTitle}</div>
						</div>
						<div class="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
							<div class="text-xs text-blue-500/80 uppercase tracking-wider mb-1">Ticket Code</div>
							<div class="text-sm font-mono font-bold text-blue-400">{data.additionalData.ticket.code}</div>
						</div>
						{#if data.additionalData.ticket.firstName}
							<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
								<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Player Name</div>
								<div class="text-sm font-medium text-white">
									{data.additionalData.ticket.firstName} {data.additionalData.ticket.lastName}
								</div>
							</div>
						{/if}
						{#if data.additionalData.ticket.gemId}
							<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
								<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">GEM ID</div>
								<div class="text-sm font-medium text-white">{data.additionalData.ticket.gemId}</div>
							</div>
						{/if}
						{#if data.additionalData.ticket.refunded}
							<div class="p-4 rounded-xl bg-red-500/5 border border-red-500/20 sm:col-span-2">
								<div class="text-xs text-red-500/80 uppercase tracking-wider mb-1">Refunded On</div>
								<div class="text-sm font-medium text-red-400">
									{new Date(data.additionalData.ticket.refundedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{:else if data.order.meta?.type === 'course'}
				<div class="px-6 py-5 border-t border-white/5 bg-white/[0.02]">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-semibold text-white">Course Details</h2>
							<p class="text-sm text-gray-400">Course access information</p>
						</div>
					</div>
				</div>

				<div class="p-6 border-t border-white/5">
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
							<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Course ID</div>
							<div class="text-sm font-mono text-white">{data.order.meta.courseId}</div>
						</div>
						{#if data.additionalData?.entitlement}
							<div class="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
								<div class="text-xs text-emerald-500/80 uppercase tracking-wider mb-1">Status</div>
								<div class="text-sm font-medium text-emerald-400">Active Access</div>
							</div>
						{:else}
							<div class="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
								<div class="text-xs text-red-500/80 uppercase tracking-wider mb-1">Status</div>
								<div class="text-sm font-medium text-red-400">Access Revoked</div>
							</div>
						{/if}
					</div>
				</div>
			{:else if data.order.meta?.type === 'subscription'}
				<div class="px-6 py-5 border-t border-white/5 bg-white/[0.02]">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-semibold text-white">Subscription Details</h2>
							<p class="text-sm text-gray-400">Premium membership information</p>
						</div>
					</div>
				</div>

				<div class="p-6 border-t border-white/5">
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
							<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Subscription ID</div>
							<div class="text-sm font-mono text-white">{data.order.meta.subscriptionId}</div>
						</div>
						<div class="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
							<div class="text-xs text-purple-500/80 uppercase tracking-wider mb-1">Type</div>
							<div class="text-sm font-medium text-purple-400">
								{data.order.meta.subscriptionType === 'yearly' ? 'Annual' : 'Monthly'} Recurring
							</div>
						</div>
					</div>

					<div class="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
						<div class="flex items-start gap-3">
							<svg class="h-5 w-5 text-purple-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<p class="text-sm text-gray-300">
								To manage or cancel your subscription, visit the
								<a href="/account?tab=plan" class="text-purple-400 hover:text-purple-300 font-medium underline">Subscription</a>
								section of your account.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Refund Action -->
			{#if showRefundSection && !form?.success}
				<div class="px-6 py-5 border-t border-white/5 bg-white/[0.02]">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl {isWithin24Hours ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
							</svg>
						</div>
						<div>
							<h2 class="text-lg font-semibold text-white">
								{isWithin24Hours ? 'Refund Request' : 'Request Refund'}
							</h2>
							<p class="text-sm text-gray-400">
								{isWithin24Hours ? 'Contact us for refund assistance' : 'Refund this order and revoke access'}
							</p>
						</div>
					</div>
				</div>

				<div class="p-6 border-t border-white/5">
					{#if isWithin24Hours}
						<!-- Within 24 hours - show contact message -->
						<div class="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-4">
							<div class="flex items-start gap-3">
								<svg class="h-5 w-5 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div>
									<p class="text-sm text-amber-300 font-medium mb-1">
										{isEventPassed ? 'This event has already occurred' : 'This event starts within 24 hours'}
									</p>
									<p class="text-sm text-gray-400">
										Self-service refunds are only available until 24 hours before the event starts. To request a refund, please contact our support team.
									</p>
								</div>
							</div>
						</div>

						<a
							href="mailto:support@arcanegamesandevents.com?subject=Refund Request - Order #{data.order.id.substring(0, 8)}&body=Hi, I would like to request a refund for my ticket purchase.%0A%0AOrder ID: {data.order.id}%0AEvent: {data.order.meta?.eventTitle || 'N/A'}%0A%0APlease let me know if you need any additional information."
							class="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
							</svg>
							Contact Support
						</a>
					{:else}
						<!-- Outside 24 hours - show refund button -->
						<div class="p-4 rounded-xl bg-red-500/5 border border-red-500/20 mb-4">
							<div class="flex items-start gap-3">
								<svg class="h-5 w-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<p class="text-sm text-red-300">
									This action cannot be undone. Refunding this order will permanently revoke any access or benefits granted by this purchase.
								</p>
							</div>
						</div>

						<form method="POST" action="?/refund" use:enhance on:submit={handleRefund}>
							<button
								type="submit"
								disabled={refunding}
								class="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if refunding}
									<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Processing Refund...
								{:else}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
									</svg>
									Request Refund
								{/if}
							</button>
						</form>
					{/if}
				</div>
			{/if}

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-white/5 bg-white/[0.01]">
				<div class="flex items-center justify-center gap-4 text-xs text-gray-500">
					<span class="flex items-center gap-1.5">
						<svg class="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" />
						</svg>
						Secure transaction
					</span>
					<span class="text-gray-700">|</span>
					<span>Powered by Authorize.net</span>
				</div>
			</div>
		</div>
	</div>
</div>
