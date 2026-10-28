<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let refundLoading = $state(false);
	let refundError = $state('');
	let refundSuccess = $state('');
	let showRefundModal = $state(false);
	let refundFormRef = $state();

	$effect(() => {
		if (form?.error) refundError = form.error;
		if (form?.success && form?.message) refundSuccess = form.message;
	});

	function openRefundModal() {
		showRefundModal = true;
	}
	function closeRefundModal() {
		showRefundModal = false;
	}
	function confirmRefund() {
		showRefundModal = false;
		refundFormRef.requestSubmit();
	}

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

	const isRefunded = $derived(data.relatedData?.ticket?.refunded || false);

	function typeLabel(t) {
		if (t === 'ticket') return 'Ticket';
		if (t === 'course') return 'Course';
		if (t === 'subscription') return 'Subscription';
		return 'Payment';
	}
</script>

<svelte:head><title>Order · {data.order.id.slice(0, 8)} · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<nav
		class="flex items-center gap-2 font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
	>
		<a href="/admin/orders" class="transition-colors hover:text-ink">Orders</a>
		<span>›</span>
		<span class="text-warm">{data.order.id.slice(0, 8)}</span>
	</nav>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase">
			{typeLabel(data.order.meta?.type)}
		</span>
		<span class="hidden h-[1px] flex-1 bg-line2 md:block"></span>
		<span
			class="font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
		>
			{formatDateTime(data.order.createdAt)}
		</span>
	</div>
	<div class="flex flex-wrap items-end justify-between gap-[24px]">
		<h1
			class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
		>
			Order details.
		</h1>
		<div class="text-right">
			<div
				class="font-archivo text-[clamp(32px,4.4vw,52px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-prem"
			>
				{formatCurrency(data.order.amount)}
			</div>
			<span
				class="mt-[6px] inline-flex items-center px-[10px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] uppercase {isRefunded
					? 'bg-warm text-white'
					: 'bg-prem text-white'}"
			>
				{isRefunded ? 'Refunded' : 'Completed'}
			</span>
		</div>
	</div>
</header>

<!-- ============ GRID ============ -->
<section class="overflow-x-clip border-y-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
		<div class="grid gap-[24px] lg:grid-cols-2">
			<!-- Order Info -->
			<div class="overflow-hidden border-[1.5px] border-ink p-6">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					Order
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
					Transaction record.
				</h2>
				<dl class="mt-[16px] space-y-[12px] border-t border-line2 pt-[16px]">
					<div class="flex items-baseline justify-between gap-3">
						<dt
							class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
						>
							Order ID
						</dt>
						<dd
							class="text-right font-mono-system text-[12px] font-bold tracking-[0.02em] text-ink"
						>
							{data.order.id}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt
							class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
						>
							Transaction ID
						</dt>
						<dd
							class="text-right font-mono-system text-[12px] font-bold tracking-[0.02em] text-ink"
						>
							{data.order.providerRef || 'N/A'}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt
							class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
						>
							Provider
						</dt>
						<dd class="font-newsreader text-[14px] font-semibold">
							{data.order.provider || 'Authorize.net'}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt
							class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
						>
							Currency
						</dt>
						<dd class="font-newsreader text-[14px] font-semibold">
							{data.order.currency || 'USD'}
						</dd>
					</div>
				</dl>
			</div>

			<!-- Customer -->
			<div class="overflow-hidden border-[1.5px] border-ink p-6">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					Customer
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
					Who paid.
				</h2>
				<div class="mt-[16px] flex items-center gap-4">
					<div
						class="flex h-[48px] w-[48px] items-center justify-center border-[1.5px] border-ink bg-panel font-newsreader text-[22px] font-semibold"
					>
						{data.order.userEmail?.charAt(0).toUpperCase() || '?'}
					</div>
					<div class="min-w-0">
						<div class="truncate font-newsreader text-[16px] font-semibold">
							{data.order.userEmail}
						</div>
						{#if data.customer}
							<div
								class="mt-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
							>
								{data.customer.role || 'free'} member
							</div>
						{/if}
					</div>
				</div>
				<a
					href="/admin/customers/{data.customer?.id || encodeURIComponent(data.order.userEmail)}"
					class="mt-[18px] inline-flex w-full items-center justify-center border border-line2 px-[16px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
				>
					View Customer Profile →
				</a>
			</div>

			<!-- Type-specific -->
			<div class="overflow-hidden border-[1.5px] border-ink p-6 lg:col-span-2">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					{typeLabel(data.order.meta?.type)} Details
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
					What was purchased.
				</h2>

				{#if data.order.meta?.type === 'ticket'}
					<dl class="mt-[16px] grid gap-[18px] border-t border-line2 pt-[16px] sm:grid-cols-2">
						{#if data.order.meta.eventTitle || data.relatedData?.event?.title}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Event
								</dt>
								<dd class="mt-[4px] font-newsreader text-[16px] font-semibold">
									{data.order.meta.eventTitle || data.relatedData?.event?.title}
								</dd>
							</div>
						{/if}
						{#if data.relatedData?.event?.eventDate}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Event Date
								</dt>
								<dd class="mt-[4px] font-newsreader text-[16px] font-semibold">
									{formatDate(data.relatedData.event.eventDate)}
								</dd>
							</div>
						{/if}
						{#if data.order.meta.ticketCode || data.relatedData?.ticket?.code}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Ticket Code
								</dt>
								<dd
									class="mt-[4px] font-mono-system text-[13px] font-bold tracking-[0.04em] text-ink"
								>
									{data.order.meta.ticketCode || data.relatedData?.ticket?.code}
								</dd>
							</div>
						{/if}
						{#if data.order.meta.gemId || data.relatedData?.ticket?.gemId}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									GEM ID
								</dt>
								<dd
									class="mt-[4px] font-mono-system text-[13px] font-bold tracking-[0.04em] text-ink"
								>
									{data.order.meta.gemId || data.relatedData?.ticket?.gemId}
								</dd>
							</div>
						{/if}
						{#if data.relatedData?.ticket}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Attendee
								</dt>
								<dd class="mt-[4px] font-newsreader text-[16px] font-semibold">
									{data.relatedData.ticket.firstName}
									{data.relatedData.ticket.lastName}
								</dd>
							</div>
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Ticket Status
								</dt>
								<dd class="mt-[4px]">
									{#if data.relatedData.ticket.refunded}
										<span
											class="inline-flex items-center bg-warm px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
										>
											Refunded {data.relatedData.ticket.refundedAt
												? `· ${formatDate(data.relatedData.ticket.refundedAt)}`
												: ''}
										</span>
									{:else if data.relatedData.ticket.checkedIn}
										<span
											class="inline-flex items-center bg-prem px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
										>
											Checked In
										</span>
									{:else}
										<span
											class="inline-flex items-center bg-accent px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
										>
											Valid
										</span>
									{/if}
								</dd>
							</div>
						{/if}
					</dl>
				{:else if data.order.meta?.type === 'course'}
					<dl class="mt-[16px] grid gap-[18px] border-t border-line2 pt-[16px] sm:grid-cols-2">
						{#if data.order.meta.courseId}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Course ID
								</dt>
								<dd
									class="mt-[4px] font-mono-system text-[13px] font-bold tracking-[0.04em] text-ink"
								>
									{data.order.meta.courseId}
								</dd>
							</div>
						{/if}
						<div>
							<dt
								class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
							>
								Entitlement
							</dt>
							<dd class="mt-[4px]">
								{#if data.relatedData?.entitlement}
									<span
										class="inline-flex items-center bg-prem px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
									>
										Active
									</span>
								{:else}
									<span
										class="inline-flex items-center bg-warm px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
									>
										Revoked
									</span>
								{/if}
							</dd>
						</div>
					</dl>
				{:else if data.order.meta?.type === 'subscription'}
					<dl class="mt-[16px] grid gap-[18px] border-t border-line2 pt-[16px] sm:grid-cols-2">
						{#if data.order.meta.subscriptionType}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Plan
								</dt>
								<dd class="mt-[4px] font-newsreader text-[16px] font-semibold capitalize">
									{data.order.meta.subscriptionType}
								</dd>
							</div>
						{/if}
						{#if data.order.meta.subscriptionId}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Subscription ID
								</dt>
								<dd
									class="mt-[4px] font-mono-system text-[13px] font-bold tracking-[0.04em] text-ink"
								>
									{data.order.meta.subscriptionId}
								</dd>
							</div>
						{/if}
						{#if data.customer}
							<div>
								<dt
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									Current Status
								</dt>
								<dd class="mt-[4px]">
									{#if data.customer.subscriptionStatus === 'active'}
										<span
											class="inline-flex items-center bg-prem px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-white uppercase"
										>
											Active
										</span>
									{:else}
										<span
											class="inline-flex items-center border border-line2 px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] text-fade capitalize uppercase"
										>
											{data.customer.subscriptionStatus || 'Inactive'}
										</span>
									{/if}
								</dd>
							</div>
						{/if}
					</dl>
				{:else}
					<p class="mt-[16px] font-newsreader text-[17px] text-soft italic">
						No additional details available for this order type.
					</p>
				{/if}
			</div>

			<!-- Refund -->
			<div class="overflow-hidden border-[1.5px] border-ink p-6 lg:col-span-2">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
				>
					Danger Zone
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
					Actions.
				</h2>

				{#if refundSuccess}
					<div class="mt-4 border-[1.5px] border-ink bg-prem p-4 text-white">
						<span
							class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
							style="color: #d6eedf;">Success</span
						>
						<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{refundSuccess}</p>
					</div>
				{/if}
				{#if refundError}
					<div class="mt-4 border-[1.5px] border-ink bg-warm p-4 text-white">
						<span
							class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
							style="color: rgba(255,255,255,0.75);">Error</span
						>
						<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{refundError}</p>
					</div>
				{/if}

				{#if isRefunded || refundSuccess}
					<div class="mt-4 border border-line2 bg-panel p-4">
						<p class="font-newsreader text-[15px] text-soft italic">
							This order has been refunded.
						</p>
					</div>
				{:else}
					<form
						method="POST"
						action="?/refund"
						bind:this={refundFormRef}
						use:enhance={() => {
							refundLoading = true;
							refundError = '';
							refundSuccess = '';
							return async ({ result }) => {
								refundLoading = false;
								if (result.type === 'success') {
									refundSuccess = result.data?.message || 'Order refunded successfully';
									await invalidateAll();
								} else if (result.type === 'failure') {
									refundError = result.data?.error || 'Failed to process refund';
								}
							};
						}}
						class="mt-4"
					>
						<div class="border-[1.5px] border-warm p-4">
							<p class="font-newsreader text-[16px] font-semibold text-warm">Process Refund</p>
							<p class="mt-2 text-[13.5px] leading-[1.55] text-soft">
								This will attempt to void or refund the transaction through Authorize.net.
								{#if data.order.meta?.type === 'ticket'}
									The ticket will be marked as refunded and will no longer be valid for check-in.
								{:else if data.order.meta?.type === 'course'}
									The customer's course access will be revoked.
								{:else if data.order.meta?.type === 'subscription'}
									The subscription will be cancelled and the customer will be downgraded to the free
									tier.
								{/if}
							</p>
							<button
								type="button"
								onclick={openRefundModal}
								disabled={refundLoading}
								class="mt-4 inline-flex w-full items-center justify-center bg-warm px-[22px] py-[13px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if refundLoading}Processing…{:else}Process Refund →{/if}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
</section>

<!-- ============ MODAL ============ -->
{#if showRefundModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={closeRefundModal}
			aria-label="Close modal"
		></button>
		<div
			class="relative w-full max-w-md border-[3px] border-double border-ink bg-paper-bg shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
		>
			<div class="border-b border-line2 p-6">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
					>Confirm Refund</span
				>
				<h3 class="mt-[6px] font-newsreader text-[26px] font-semibold tracking-[-0.01em]">
					Are you sure?
				</h3>
				<p class="mt-[4px] font-newsreader text-[15px] text-soft italic">
					This action cannot be undone.
				</p>
			</div>

			<div class="space-y-3 p-6">
				<p class="font-newsreader text-[15px]">Processing this refund will:</p>
				<ul class="space-y-2 text-[13.5px] leading-[1.5] text-soft">
					<li class="flex gap-2">
						<span class="text-warm">→</span>
						<span>Void or refund the transaction via Authorize.net</span>
					</li>
					<li class="flex gap-2">
						<span class="text-warm">→</span>
						<span
							>Issue a refund of <strong class="text-ink"
								>{formatCurrency(data.order.amount)}</strong
							> to the customer</span
						>
					</li>
					{#if data.order.meta?.type === 'ticket'}
						<li class="flex gap-2">
							<span class="text-warm">→</span>
							<span>Invalidate the ticket for check-in</span>
						</li>
					{:else if data.order.meta?.type === 'course'}
						<li class="flex gap-2">
							<span class="text-warm">→</span>
							<span>Revoke the customer's course access</span>
						</li>
					{:else if data.order.meta?.type === 'subscription'}
						<li class="flex gap-2">
							<span class="text-warm">→</span>
							<span>Cancel subscription and downgrade to free tier</span>
						</li>
					{/if}
				</ul>
			</div>

			<div class="flex gap-3 border-t border-line2 p-6">
				<button
					type="button"
					onclick={closeRefundModal}
					class="flex-1 border border-line2 px-[18px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmRefund}
					class="flex-1 bg-warm px-[18px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110"
				>
					Yes, Process Refund
				</button>
			</div>
		</div>
	</div>
{/if}
