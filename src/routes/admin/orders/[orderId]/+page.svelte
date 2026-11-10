<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
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

	/** Refund one guide or record a chargeback, then show the result like a refund. */
	const guideAction = () => {
		refundLoading = true;
		refundError = '';
		refundSuccess = '';
		return async ({ result }) => {
			refundLoading = false;
			if (result.type === 'success') {
				refundSuccess = result.data?.message || 'Done';
				await invalidateAll();
			} else if (result.type === 'failure') {
				refundError = result.data?.error || 'That didn’t work';
			}
		};
	};

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

<svelte:head><title>Order · {data.order.id.slice(0, 8)} · Admin</title></svelte:head>

<!-- ============ HEADER ============ -->
<DeskHeader
	kicker="Admin"
	title="Order {data.order.id.slice(0, 8)}"
	subtitle="{typeLabel(data.order.meta?.type)} · {formatDateTime(data.order.createdAt)}"
/>
<AdminTabs />
<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 md:px-8">
	<nav
		class="flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
	>
		<a href="/admin/orders" class="transition-colors hover:text-ink">Orders</a>
		<span>›</span>
		<span class="text-warm">{data.order.id.slice(0, 8)}</span>
	</nav>
	<div class="mt-4">
		<Figures
			cols="md:grid-cols-4"
			items={[
				{ label: 'Amount', value: formatCurrency(data.order.amount), tone: 'text-prem' },
				{
					label: 'Status',
					value: isRefunded ? 'Refunded' : 'Completed',
					tone: isRefunded ? 'text-hero-rb' : ''
				},
				{ label: 'Type', value: typeLabel(data.order.meta?.type) },
				{ label: 'Placed', value: formatDate(data.order.createdAt) }
			]}
		/>
	</div>
</div>

<!-- ============ GRID ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
		<div class="grid gap-[24px] lg:grid-cols-2">
			<!-- Order Info -->
			<div class="overflow-hidden border border-line2 p-6">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					Order
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
					Transaction record.
				</h2>
				<dl class="mt-[16px] space-y-[12px] border-t border-line2 pt-[16px]">
					<div class="flex items-baseline justify-between gap-3">
						<dt class="text-[11.5px] text-fade">Order ID</dt>
						<dd class="text-right text-[12.5px] font-medium text-ink">
							{data.order.id}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt class="text-[11.5px] text-fade">Transaction ID</dt>
						<dd class="text-right text-[12.5px] font-medium text-ink">
							{data.order.providerRef || 'N/A'}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt class="text-[11.5px] text-fade">Provider</dt>
						<dd class="font-newsreader text-[14px] font-semibold">
							{data.order.provider || 'Authorize.net'}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-3">
						<dt class="text-[11.5px] text-fade">Currency</dt>
						<dd class="font-newsreader text-[14px] font-semibold">
							{data.order.currency || 'USD'}
						</dd>
					</div>
				</dl>
			</div>

			<!-- Customer -->
			<div class="overflow-hidden border border-line2 p-6">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					Customer
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
					Who paid.
				</h2>
				<div class="mt-[16px] flex items-center gap-4">
					<div
						class="flex h-[48px] w-[48px] items-center justify-center border border-line2 bg-paper font-newsreader text-[22px] font-semibold"
					>
						{data.order.userEmail?.charAt(0).toUpperCase() || '?'}
					</div>
					<div class="min-w-0">
						<div class="truncate font-newsreader text-[16px] font-semibold">
							{data.order.userEmail}
						</div>
						{#if data.customer}
							<div class="mt-[3px] text-[11.5px] text-fade">
								{data.customer.role || 'free'} member
							</div>
						{/if}
					</div>
				</div>
				<a
					href="/admin/customers/{data.customer?.id || encodeURIComponent(data.order.userEmail)}"
					class="mt-[18px] inline-flex h-[40px] w-full shrink-0 items-center justify-center gap-2 border border-line2 px-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
				>
					View Customer Profile →
				</a>
			</div>

			<!-- Type-specific -->
			<div class="overflow-hidden border border-line2 p-6 lg:col-span-2">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					{typeLabel(data.order.meta?.type)} Details
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
					What was purchased.
				</h2>

				{#if data.order.meta?.type === 'ticket'}
					<dl class="mt-[16px] grid gap-[18px] border-t border-line2 pt-[16px] sm:grid-cols-2">
						{#if data.order.meta.eventTitle || data.relatedData?.event?.title}
							<div>
								<dt class="text-[11.5px] text-fade">Event</dt>
								<dd class="mt-[4px] font-newsreader text-[16px] font-semibold">
									{data.order.meta.eventTitle || data.relatedData?.event?.title}
								</dd>
							</div>
						{/if}
						{#if data.relatedData?.event?.eventDate}
							<div>
								<dt class="text-[11.5px] text-fade">Event Date</dt>
								<dd class="mt-[4px] font-newsreader text-[16px] font-semibold">
									{formatDate(data.relatedData.event.eventDate)}
								</dd>
							</div>
						{/if}
						{#if data.order.meta.ticketCode || data.relatedData?.ticket?.code}
							<div>
								<dt class="text-[11.5px] text-fade">Ticket Code</dt>
								<dd class="mt-[4px] text-[12.5px] font-medium text-ink">
									{data.order.meta.ticketCode || data.relatedData?.ticket?.code}
								</dd>
							</div>
						{/if}
						{#if data.order.meta.gemId || data.relatedData?.ticket?.gemId}
							<div>
								<dt class="text-[11.5px] text-fade">GEM ID</dt>
								<dd class="mt-[4px] text-[12.5px] font-medium text-ink">
									{data.order.meta.gemId || data.relatedData?.ticket?.gemId}
								</dd>
							</div>
						{/if}
						{#if data.relatedData?.ticket}
							<div>
								<dt class="text-[11.5px] text-fade">Attendee</dt>
								<dd class="mt-[4px] font-newsreader text-[16px] font-semibold">
									{data.relatedData.ticket.firstName}
									{data.relatedData.ticket.lastName}
								</dd>
							</div>
							<div>
								<dt class="text-[11.5px] text-fade">Ticket Status</dt>
								<dd class="mt-[4px]">
									{#if data.relatedData.ticket.refunded}
										<span
											class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-warm"
										>
											Refunded {data.relatedData.ticket.refundedAt
												? `· ${formatDate(data.relatedData.ticket.refundedAt)}`
												: ''}
										</span>
									{:else if data.relatedData.ticket.checkedIn}
										<span
											class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-prem"
										>
											Checked In
										</span>
									{:else}
										<span
											class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-[#8a6116]"
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
						<div>
							<dt class="text-[11.5px] text-fade">Course</dt>
							<dd class="mt-[4px] font-newsreader text-[16px] font-semibold">
								{#if data.relatedData?.course}
									<a href="/classroom/courses/{data.relatedData.course.id}" class="hover:text-warm"
										>{data.relatedData.course.title}</a
									>
								{:else}
									{data.order.meta.courseTitle || 'A deleted course'}
								{/if}
							</dd>
						</div>
						<div>
							<dt class="text-[11.5px] text-fade">Access</dt>
							<dd class="mt-[4px]">
								{#if data.relatedData?.enrollment && !data.relatedData.enrollment.revokedAt}
									<span
										class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-prem"
									>
										Active
									</span>
								{:else}
									<span
										class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-warm"
									>
										Revoked
									</span>
								{/if}
							</dd>
						</div>
					</dl>
					{#if data.relatedData?.guides?.length}
						<!-- A guides order (the Partner model): each guide on its own. -->
						<ul class="mt-[16px] divide-y divide-line border-y border-line2">
							{#each data.relatedData.guides as g (g.itemId)}
								<li class="flex flex-wrap items-center justify-between gap-3 py-3">
									<div class="min-w-0">
										<p class="font-newsreader text-[16px] font-semibold">{g.title}</p>
										<p class="text-[12px] text-fade tabular-nums">
											Paid {formatCurrency(g.paidCents / 100)} · list {formatCurrency(
												g.listCents / 100
											)}
											{#if g.sale}
												· teacher {formatCurrency(g.sale.teacherCents / 100)} ({g.sale.level}, copy
												#{g.sale.copyNumber}) ·
												<span class={g.sale.status === 'paid' ? '' : 'font-semibold text-hero-rb'}
													>{g.sale.status.replace('_', ' ')}</span
												>
											{/if}
										</p>
									</div>
									{#if g.sale?.status === 'paid'}
										<div class="flex gap-2">
											<form method="POST" action="?/refundGuide" use:enhance={guideAction}>
												<input type="hidden" name="itemId" value={g.itemId} />
												<button
													class="h-[34px] border border-hero-rb px-3 text-[9.5px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:bg-hero-rb hover:text-white"
													onclick={(e) => {
														if (
															!confirm(`Refund ${g.title} (${formatCurrency(g.paidCents / 100)})?`)
														)
															e.preventDefault();
													}}>Refund guide</button
												>
											</form>
											<form method="POST" action="?/chargeback" use:enhance={guideAction}>
												<input type="hidden" name="itemId" value={g.itemId} />
												<button
													class="h-[34px] border border-line2 px-3 text-[9.5px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
													onclick={(e) => {
														if (
															!confirm(
																`Record a chargeback for ${g.title}? This reverses the teacher's sale and removes the guide.`
															)
														)
															e.preventDefault();
													}}>Chargeback</button
												>
											</form>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
					{#if data.relatedData?.evidence}
						{@const e = data.relatedData.evidence}
						<!-- Dispute evidence: what the buyer agreed to, and when they opened each guide. -->
						<div class="mt-[16px] border border-line2 bg-paper p-4 text-[12.5px]">
							<div class="flex items-baseline justify-between gap-3">
								<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
									>Dispute evidence</span
								>
								<a
									href="/admin/orders/{data.order.id}/evidence"
									class="text-[10px] font-extrabold tracking-[0.14em] uppercase hover:text-warm"
									>Download summary</a
								>
							</div>
							{#if e.consent?.given}
								<p class="mt-2">
									Agreed to the refund policy at {formatDate(e.consent.at)}{e.consent.ip
										? ` from ${e.consent.ip}`
										: ''}:
								</p>
								<p class="mt-1 text-soft italic">“{e.consent.text}”</p>
							{:else}
								<p class="mt-2 text-soft">No refund-policy consent recorded for this order.</p>
							{/if}
							<ul class="mt-2 space-y-1">
								{#each e.guides as g, i (g.itemId || i)}
									<li>
										<span class="font-semibold">{g.title}</span>: {g.firstOpenedAt
											? `first opened ${formatDate(g.firstOpenedAt)}`
											: 'never opened'}{g.topicsCompleted
											? `, ${g.topicsCompleted} topics completed`
											: ''}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if !data.relatedData?.guides?.length && data.relatedData?.legacySale?.status === 'paid'}
						<form method="POST" action="?/chargeback" use:enhance={guideAction} class="mt-3">
							<button
								class="h-[34px] border border-line2 px-3 text-[9.5px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
								onclick={(e) => {
									if (!confirm('Record a chargeback for this order?')) e.preventDefault();
								}}>Record chargeback</button
							>
						</form>
					{/if}
				{:else if data.order.meta?.type === 'subscription'}
					<dl class="mt-[16px] grid gap-[18px] border-t border-line2 pt-[16px] sm:grid-cols-2">
						{#if data.order.meta.subscriptionType}
							<div>
								<dt class="text-[11.5px] text-fade">Plan</dt>
								<dd class="mt-[4px] font-newsreader text-[16px] font-semibold capitalize">
									{data.order.meta.subscriptionType}
								</dd>
							</div>
						{/if}
						{#if data.order.meta.subscriptionId}
							<div>
								<dt class="text-[11.5px] text-fade">Subscription ID</dt>
								<dd class="mt-[4px] text-[12.5px] font-medium text-ink">
									{data.order.meta.subscriptionId}
								</dd>
							</div>
						{/if}
						{#if data.customer}
							<div>
								<dt class="text-[11.5px] text-fade">Current Status</dt>
								<dd class="mt-[4px]">
									{#if data.customer.subscriptionStatus === 'active'}
										<span
											class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-prem"
										>
											Active
										</span>
									{:else}
										<span
											class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-medium whitespace-nowrap text-ink text-soft capitalize before:block before:h-[7px] before:w-[7px] before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-['']"
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
			<div class="overflow-hidden border border-line2 p-6 lg:col-span-2">
				<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
					Danger Zone
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
					Actions.
				</h2>

				{#if refundSuccess}
					<div class="mt-4 border-l-[3px] border-prem bg-prem/10 p-4">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase"
							>Success</span
						>
						<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{refundSuccess}</p>
					</div>
				{/if}
				{#if refundError}
					<div class="mt-4 border-l-[3px] border-hero-rb bg-hero-rb/[0.06] p-4">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-hero-rb uppercase"
							>Error</span
						>
						<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{refundError}</p>
					</div>
				{/if}

				{#if isRefunded || refundSuccess}
					<div class="mt-4 border border-line2 bg-paper p-4">
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
						<div class="border border-hero-rb/60 p-4">
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
								class="mt-4 inline-flex h-[40px] w-full shrink-0 items-center justify-center bg-hero-rb px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
			class="relative w-full max-w-md border border-t-[3px] border-line2 border-t-ink bg-paper-bg"
		>
			<div class="border-b border-line2 p-6">
				<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase"
					>Confirm Refund</span
				>
				<h3 class="mt-[6px] font-newsreader text-[22px] font-semibold">Are you sure?</h3>
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
					class="inline-flex h-[40px] flex-1 shrink-0 items-center gap-2 border border-line2 px-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmRefund}
					class="inline-flex h-[40px] flex-1 shrink-0 items-center bg-hero-rb px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Yes, Process Refund
				</button>
			</div>
		</div>
	</div>
{/if}
