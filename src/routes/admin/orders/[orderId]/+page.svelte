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
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
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
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<nav class="font-mono-system text-fade flex items-center gap-2 text-[10px] font-extrabold tracking-[0.14em] uppercase">
		<a href="/admin/orders" class="hover:text-ink transition-colors">Orders</a>
		<span>›</span>
		<span class="text-warm">{data.order.id.slice(0, 8)}</span>
	</nav>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			{typeLabel(data.order.meta?.type)}
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<span class="font-mono-system text-fade text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
			{formatDateTime(data.order.createdAt)}
		</span>
	</div>
	<div class="flex flex-wrap items-end justify-between gap-[24px]">
		<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
			Order details.
		</h1>
		<div class="text-right">
			<div class="font-archivo text-prem text-[clamp(32px,4.4vw,52px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
				{formatCurrency(data.order.amount)}
			</div>
			<span class="font-mono-system mt-[6px] inline-flex items-center px-[10px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase {isRefunded ? 'bg-warm text-white' : 'bg-prem text-white'}">
				{isRefunded ? 'Refunded' : 'Completed'}
			</span>
		</div>
	</div>
</header>

<!-- ============ GRID ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<div class="grid gap-[24px] lg:grid-cols-2">
			<!-- Order Info -->
			<div class="border-ink border-[1.5px] p-6 overflow-hidden">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Order
				</span>
				<h2 class="font-newsreader mt-[6px] text-[22px] font-semibold tracking-[-0.01em]">
					Transaction record.
				</h2>
				<dl class="border-line2 mt-[16px] space-y-[12px] border-t pt-[16px]">
					<div class="flex items-baseline justify-between gap-3">
						<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Order ID</dt>
						<dd class="font-mono-system text-ink text-right text-[12px] font-bold tracking-[0.02em]">{data.order.id}</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Transaction ID</dt>
						<dd class="font-mono-system text-ink text-right text-[12px] font-bold tracking-[0.02em]">{data.order.providerRef || 'N/A'}</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Provider</dt>
						<dd class="font-newsreader text-[14px] font-semibold">{data.order.provider || 'Authorize.net'}</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Currency</dt>
						<dd class="font-newsreader text-[14px] font-semibold">{data.order.currency || 'USD'}</dd>
					</div>
				</dl>
			</div>

			<!-- Customer -->
			<div class="border-ink border-[1.5px] p-6 overflow-hidden">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Customer
				</span>
				<h2 class="font-newsreader mt-[6px] text-[22px] font-semibold tracking-[-0.01em]">
					Who paid.
				</h2>
				<div class="mt-[16px] flex items-center gap-4">
					<div class="border-ink flex h-[48px] w-[48px] items-center justify-center border-[1.5px] bg-panel font-newsreader text-[22px] font-semibold">
						{data.order.userEmail?.charAt(0).toUpperCase() || '?'}
					</div>
					<div class="min-w-0">
						<div class="font-newsreader truncate text-[16px] font-semibold">{data.order.userEmail}</div>
						{#if data.customer}
							<div class="font-mono-system text-fade mt-[3px] text-[10px] font-bold tracking-[0.08em] uppercase">
								{data.customer.role || 'free'} member
							</div>
						{/if}
					</div>
				</div>
				<a
					href="/admin/customers/{data.customer?.id || encodeURIComponent(data.order.userEmail)}"
					class="border-line2 hover:border-ink font-mono-system mt-[18px] inline-flex w-full items-center justify-center border px-[16px] py-[11px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
				>
					View Customer Profile →
				</a>
			</div>

			<!-- Type-specific -->
			<div class="border-ink border-[1.5px] p-6 lg:col-span-2 overflow-hidden">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					{typeLabel(data.order.meta?.type)} Details
				</span>
				<h2 class="font-newsreader mt-[6px] text-[22px] font-semibold tracking-[-0.01em]">
					What was purchased.
				</h2>

				{#if data.order.meta?.type === 'ticket'}
					<dl class="border-line2 mt-[16px] grid gap-[18px] border-t pt-[16px] sm:grid-cols-2">
						{#if data.order.meta.eventTitle || data.relatedData?.event?.title}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Event</dt>
								<dd class="font-newsreader mt-[4px] text-[16px] font-semibold">
									{data.order.meta.eventTitle || data.relatedData?.event?.title}
								</dd>
							</div>
						{/if}
						{#if data.relatedData?.event?.eventDate}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Event Date</dt>
								<dd class="font-newsreader mt-[4px] text-[16px] font-semibold">{formatDate(data.relatedData.event.eventDate)}</dd>
							</div>
						{/if}
						{#if data.order.meta.ticketCode || data.relatedData?.ticket?.code}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Ticket Code</dt>
								<dd class="font-mono-system text-ink mt-[4px] text-[13px] font-bold tracking-[0.04em]">
									{data.order.meta.ticketCode || data.relatedData?.ticket?.code}
								</dd>
							</div>
						{/if}
						{#if data.order.meta.gemId || data.relatedData?.ticket?.gemId}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">GEM ID</dt>
								<dd class="font-mono-system text-ink mt-[4px] text-[13px] font-bold tracking-[0.04em]">
									{data.order.meta.gemId || data.relatedData?.ticket?.gemId}
								</dd>
							</div>
						{/if}
						{#if data.relatedData?.ticket}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Attendee</dt>
								<dd class="font-newsreader mt-[4px] text-[16px] font-semibold">
									{data.relatedData.ticket.firstName} {data.relatedData.ticket.lastName}
								</dd>
							</div>
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Ticket Status</dt>
								<dd class="mt-[4px]">
									{#if data.relatedData.ticket.refunded}
										<span class="font-mono-system bg-warm inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
											Refunded {data.relatedData.ticket.refundedAt ? `· ${formatDate(data.relatedData.ticket.refundedAt)}` : ''}
										</span>
									{:else if data.relatedData.ticket.checkedIn}
										<span class="font-mono-system bg-prem inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
											Checked In
										</span>
									{:else}
										<span class="font-mono-system bg-accent inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
											Valid
										</span>
									{/if}
								</dd>
							</div>
						{/if}
					</dl>
				{:else if data.order.meta?.type === 'course'}
					<dl class="border-line2 mt-[16px] grid gap-[18px] border-t pt-[16px] sm:grid-cols-2">
						{#if data.order.meta.courseId}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Course ID</dt>
								<dd class="font-mono-system text-ink mt-[4px] text-[13px] font-bold tracking-[0.04em]">{data.order.meta.courseId}</dd>
							</div>
						{/if}
						<div>
							<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Entitlement</dt>
							<dd class="mt-[4px]">
								{#if data.relatedData?.entitlement}
									<span class="font-mono-system bg-prem inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
										Active
									</span>
								{:else}
									<span class="font-mono-system bg-warm inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
										Revoked
									</span>
								{/if}
							</dd>
						</div>
					</dl>
				{:else if data.order.meta?.type === 'subscription'}
					<dl class="border-line2 mt-[16px] grid gap-[18px] border-t pt-[16px] sm:grid-cols-2">
						{#if data.order.meta.subscriptionType}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Plan</dt>
								<dd class="font-newsreader mt-[4px] text-[16px] font-semibold capitalize">
									{data.order.meta.subscriptionType}
								</dd>
							</div>
						{/if}
						{#if data.order.meta.subscriptionId}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Subscription ID</dt>
								<dd class="font-mono-system text-ink mt-[4px] text-[13px] font-bold tracking-[0.04em]">
									{data.order.meta.subscriptionId}
								</dd>
							</div>
						{/if}
						{#if data.customer}
							<div>
								<dt class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Current Status</dt>
								<dd class="mt-[4px]">
									{#if data.customer.subscriptionStatus === 'active'}
										<span class="font-mono-system bg-prem inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
											Active
										</span>
									{:else}
										<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase capitalize">
											{data.customer.subscriptionStatus || 'Inactive'}
										</span>
									{/if}
								</dd>
							</div>
						{/if}
					</dl>
				{:else}
					<p class="font-newsreader text-soft mt-[16px] text-[17px] italic">No additional details available for this order type.</p>
				{/if}
			</div>

			<!-- Refund -->
			<div class="border-ink border-[1.5px] p-6 lg:col-span-2 overflow-hidden">
				<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Danger Zone
				</span>
				<h2 class="font-newsreader mt-[6px] text-[22px] font-semibold tracking-[-0.01em]">
					Actions.
				</h2>

				{#if refundSuccess}
					<div class="border-ink bg-prem mt-4 border-[1.5px] p-4 text-white">
						<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
						<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{refundSuccess}</p>
					</div>
				{/if}
				{#if refundError}
					<div class="border-ink bg-warm mt-4 border-[1.5px] p-4 text-white">
						<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
						<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{refundError}</p>
					</div>
				{/if}

				{#if isRefunded || refundSuccess}
					<div class="border-line2 bg-panel mt-4 border p-4">
						<p class="font-newsreader text-soft text-[15px] italic">This order has been refunded.</p>
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
						<div class="border-warm border-[1.5px] p-4">
							<p class="font-newsreader text-warm text-[16px] font-semibold">Process Refund</p>
							<p class="text-soft mt-2 text-[13.5px] leading-[1.55]">
								This will attempt to void or refund the transaction through Authorize.net.
								{#if data.order.meta?.type === 'ticket'}
									The ticket will be marked as refunded and will no longer be valid for check-in.
								{:else if data.order.meta?.type === 'course'}
									The customer's course access will be revoked.
								{:else if data.order.meta?.type === 'subscription'}
									The subscription will be cancelled and the customer will be downgraded to the free tier.
								{/if}
							</p>
							<button
								type="button"
								onclick={openRefundModal}
								disabled={refundLoading}
								class="bg-warm font-mono-system mt-4 inline-flex w-full items-center justify-center px-[22px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
		<div class="border-ink bg-paper-bg relative w-full max-w-md border-[3px] border-double shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
			<div class="border-line2 border-b p-6">
				<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">Confirm Refund</span>
				<h3 class="font-newsreader mt-[6px] text-[26px] font-semibold tracking-[-0.01em]">Are you sure?</h3>
				<p class="font-newsreader text-soft mt-[4px] text-[15px] italic">This action cannot be undone.</p>
			</div>

			<div class="space-y-3 p-6">
				<p class="font-newsreader text-[15px]">Processing this refund will:</p>
				<ul class="text-soft space-y-2 text-[13.5px] leading-[1.5]">
					<li class="flex gap-2">
						<span class="text-warm">→</span>
						<span>Void or refund the transaction via Authorize.net</span>
					</li>
					<li class="flex gap-2">
						<span class="text-warm">→</span>
						<span>Issue a refund of <strong class="text-ink">{formatCurrency(data.order.amount)}</strong> to the customer</span>
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

			<div class="border-line2 flex gap-3 border-t p-6">
				<button
					type="button"
					onclick={closeRefundModal}
					class="border-line2 hover:border-ink font-mono-system flex-1 border px-[18px] py-[11px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmRefund}
					class="bg-warm font-mono-system flex-1 px-[18px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-110"
				>
					Yes, Process Refund
				</button>
			</div>
		</div>
	</div>
{/if}
