<script>
	import { enhance } from '$app/forms';
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	export let data;
	export let form;

	// For refund confirmation
	let refunding = false;
	let showRefundModal = false;
	let refundFormRef;

	function openRefundModal() {
		showRefundModal = true;
	}

	function closeRefundModal() {
		showRefundModal = false;
	}

	function confirmRefund() {
		showRefundModal = false;
		refunding = true;
		refundFormRef.requestSubmit();
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

	// Show refund section for tickets (even if within 24 hours, to show contact message)
	const showRefundSection =
		data.order.meta?.type !== 'subscription' &&
		(!data.additionalData?.ticket || !data.additionalData.ticket.refunded);

	// Order type display name
	function getOrderTypeName(type) {
		const types = {
			ticket: 'Event Ticket',
			course: 'Course Purchase',
			subscription: 'Premium Subscription'
		};
		return types[type] || 'Purchase';
	}

	// Editorial accent color per order type. Used for the eyebrow line
	// and the top hairline of the header section.
	function getOrderAccent(type) {
		if (type === 'ticket') return 'var(--ed-accent)';
		if (type === 'course') return '#C8922E';
		if (type === 'subscription') return 'var(--ed-prem)';
		return 'var(--ed-ink)';
	}

	const accent = getOrderAccent(data.order.meta?.type);

	function formatDateLong(d) {
		return new Date(d).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
	function formatDateShort(d) {
		return new Date(d).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
	function formatTime(d) {
		return new Date(d).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Order Details — AGE</title>
</svelte:head>

<AgeShell active="Account">
	<!--
		Order detail header — editorial paper field with a colored top
		hairline keyed to the order type (accent blue for tickets, gold
		for courses, prem-green for subscriptions). Reads as a printed
		receipt with the order type as the section name and the amount
		as the dominant Archivo numeral.
	-->
	<section class="bg-paper border-ink relative overflow-hidden border-b-[3px] border-double">
		<div class="absolute inset-x-0 top-0 z-[1] h-[4px]" style="background: {accent};"></div>

		<div class="relative z-[1] mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[44px] pb-[42px]">
			<!-- Back link -->
			<a
				href="/account?tab=billing"
				class="text-fade hover:text-ink font-mono-system inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
			>
				← Purchase history
			</a>

			<!-- Eyebrow — sits as its own row between the back link and
				 the serif headline so the order type + ID reads cleanly
				 without a colored gutter mark next to it. -->
			<div
				class="font-mono-system mt-6 block text-[11px] font-extrabold tracking-[0.18em] uppercase"
				style="color: {accent};"
			>
				{getOrderTypeName(data.order.meta?.type)} · Order #{data.order.id.substring(0, 8)}
			</div>

			<!-- Title row: serif headline + amount column -->
			<div class="mt-[10px] flex flex-wrap items-end justify-between gap-7">
				<div class="min-w-0 flex-1">
					<h1
						class="font-newsreader text-[clamp(34px,4.5vw,52px)] leading-[0.96] font-semibold tracking-[-0.02em]"
					>
						{getOrderTypeName(data.order.meta?.type)}
					</h1>
					<div class="text-soft mt-3 text-[14px] font-semibold">
						Placed on {formatDateLong(data.order.createdAt)} at {formatTime(data.order.createdAt)}
					</div>
				</div>
				<div class="text-right">
					<div
						class="font-archivo text-[56px] font-black leading-[0.85] tabular-nums tracking-[-0.03em]"
					>
						${parseFloat(data.order.amount).toFixed(2)}
					</div>
					<div
						class="text-fade font-mono-system mt-1 text-[10px] font-extrabold tracking-[0.14em] uppercase"
					>
						{data.order.currency}
					</div>
				</div>
			</div>

			<!-- Status chip strip -->
			<div class="mt-7 flex flex-wrap items-center gap-2">
				{#if data.additionalData?.ticket?.refunded}
					<span
						class="bg-warm inline-flex items-center px-[14px] py-[7px] text-[11px] font-extrabold tracking-[0.12em] text-white uppercase"
					>
						Refunded
					</span>
				{:else if data.order.meta?.type === 'subscription'}
					{#if data.user.subscriptionStatus === 'cancelled'}
						<span
							class="border-warm text-warm inline-flex items-center border bg-transparent px-[14px] py-[7px] text-[11px] font-extrabold tracking-[0.12em] uppercase"
						>
							Cancelled
						</span>
					{:else if data.user.subscriptionStatus === 'payment_failed'}
						<span
							class="bg-warm inline-flex items-center px-[14px] py-[7px] text-[11px] font-extrabold tracking-[0.12em] text-white uppercase"
						>
							Payment Failed
						</span>
					{:else if data.user.subscriptionStatus === 'expired'}
						<span
							class="border-line2 text-fade inline-flex items-center border bg-transparent px-[14px] py-[7px] text-[11px] font-extrabold tracking-[0.12em] uppercase"
						>
							Expired
						</span>
					{:else}
						<span
							class="bg-prem inline-flex items-center px-[14px] py-[7px] text-[11px] font-extrabold tracking-[0.12em] text-white uppercase"
						>
							Active
						</span>
					{/if}
				{:else}
					<span
						class="bg-prem inline-flex items-center px-[14px] py-[7px] text-[11px] font-extrabold tracking-[0.12em] text-white uppercase"
					>
						Completed
					</span>
				{/if}
				<span
					class="border-line2 text-ink font-mono-system inline-flex items-center border bg-transparent px-[14px] py-[7px] text-[11px] font-extrabold tracking-[0.12em] uppercase"
				>
					{data.order.provider}
				</span>
			</div>
		</div>
	</section>

	<!-- Form messages -->
	{#if form?.success}
		<section class="bg-paper-bg border-ink border-b-[3px] border-double">
			<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-6">
				<div class="bg-paper border-prem border-line2 border-l-[3px] border px-5 py-4">
					<div
						class="text-prem font-mono-system mb-1 text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						Refund processed
					</div>
					<p class="text-soft text-[13.5px] leading-[1.5] font-semibold">{form.message}</p>
				</div>
			</div>
		</section>
	{/if}

	{#if form?.error}
		<section class="bg-paper-bg border-ink border-b-[3px] border-double">
			<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-6">
				<div class="bg-paper border-warm border-line2 border-l-[3px] border px-5 py-4">
					<div
						class="text-warm font-mono-system mb-1 text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						Refund error
					</div>
					<p class="text-soft text-[13.5px] leading-[1.5] font-semibold">{form.error}</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- Body — stacked editorial sections -->
	<section class="bg-paper-bg border-ink border-b-[3px] border-double">
		<div class="mx-auto w-full max-w-[1600px] space-y-7 px-14 py-10">
			<!--
				Order Information — editorial card with mono labels and
				ink values. Same dl pattern used on the event signup
				and results pages.
			-->
			<div class="border-line2 bg-paper border">
				<div class="border-line2 flex items-baseline justify-between border-b px-6 py-[14px]">
					<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						Order Information
					</h2>
					<span
						class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
					>
						Transaction details
					</span>
				</div>
				<dl class="grid grid-cols-1 sm:grid-cols-2">
					<div class="border-line2 -mt-px -ml-px border px-6 py-5">
						<dt
							class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Order ID
						</dt>
						<dd
							class="font-mono-system text-ink text-[13.5px] font-bold tracking-[0.02em] break-all"
						>
							{data.order.id}
						</dd>
					</div>
					<div class="border-line2 -mt-px -ml-px border px-6 py-5">
						<dt
							class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Transaction ID
						</dt>
						<dd
							class="font-mono-system text-soft text-[13.5px] font-bold tracking-[0.02em] break-all"
						>
							{data.order.providerRef}
						</dd>
					</div>
					<div class="border-line2 -mt-px -ml-px border px-6 py-5">
						<dt
							class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Date &amp; Time
						</dt>
						<dd class="font-newsreader text-[18px] font-semibold tracking-[-0.01em]">
							{formatDateShort(data.order.createdAt)}
						</dd>
						<div class="text-fade font-mono-system mt-1 text-[11px] font-bold">
							{formatTime(data.order.createdAt)}
						</div>
					</div>
					<div class="border-line2 -mt-px -ml-px border px-6 py-5">
						<dt
							class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Payment Provider
						</dt>
						<dd
							class="font-newsreader text-[18px] font-semibold tracking-[-0.01em] capitalize"
						>
							{data.order.provider}
						</dd>
					</div>
				</dl>
			</div>

			<!-- Ticket details -->
			{#if data.order.meta?.type === 'ticket' && data.additionalData?.ticket}
				<div class="border-line2 bg-paper border">
					<div class="border-line2 flex items-baseline justify-between border-b px-6 py-[14px]">
						<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
							Ticket Details
						</h2>
						<span
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Registration
						</span>
					</div>
					<div class="px-6 py-6 space-y-5">
						<!-- Event block -->
						<div class="border-line2 bg-paper-bg/40 border px-5 py-5">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div
										class="text-fade font-mono-system mb-[5px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										Event
									</div>
									<div
										class="font-newsreader text-[22px] font-semibold leading-[1.1] tracking-[-0.01em]"
									>
										{data.order.meta.eventTitle}
									</div>
									{#if data.additionalData?.event}
										<div
											class="text-fade font-mono-system mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-extrabold tracking-[0.08em] uppercase"
										>
											{#if data.additionalData.event.circuit}
												<span style="color: {accent};">{data.additionalData.event.circuit}</span>
											{/if}
											{#if data.additionalData.event.format}
												<span class="text-fade">·</span>
												<span class="text-soft">{data.additionalData.event.format}</span>
											{/if}
											{#if data.additionalData.event.eventDate}
												<span class="text-fade">·</span>
												<span class="text-soft normal-case tracking-[0.04em]">
													{new Date(data.additionalData.event.eventDate).toLocaleDateString(
														'en-US',
														{
															weekday: 'short',
															month: 'short',
															day: 'numeric',
															year: 'numeric',
															timeZone: 'UTC'
														}
													)}
												</span>
											{/if}
											{#if data.additionalData.event.location}
												<span class="text-fade">·</span>
												<span class="text-soft normal-case tracking-[0.04em]">
													{data.additionalData.event.location}
												</span>
											{/if}
										</div>
									{/if}
								</div>
								{#if data.additionalData?.event?.id}
									<a
										href="/age-open/{data.additionalData.event.id}"
										class="border-ink text-ink hover:bg-ink hover:text-paper-bg font-mono-system inline-flex shrink-0 items-center gap-2 border-[1.5px] bg-transparent px-4 py-[8px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase transition-colors"
									>
										View event →
									</a>
								{/if}
							</div>
						</div>

						<!-- Ticket info grid -->
						<dl class="grid grid-cols-1 sm:grid-cols-2">
							<div class="border-line2 -mt-px -ml-px border px-5 py-4" style="border-color: color-mix(in srgb, var(--ed-accent) 35%, transparent); background-color: color-mix(in srgb, var(--ed-accent) 6%, transparent);">
								<dt
									class="text-accent font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Ticket Code
								</dt>
								<dd
									class="font-mono-system text-accent text-[15px] font-extrabold tracking-[0.04em]"
								>
									{data.additionalData.ticket.code}
								</dd>
							</div>
							{#if data.additionalData.ticket.firstName}
								<div class="border-line2 -mt-px -ml-px border px-5 py-4">
									<dt
										class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										Player Name
									</dt>
									<dd class="font-newsreader text-[16px] font-semibold">
										{data.additionalData.ticket.firstName}
										{data.additionalData.ticket.lastName}
									</dd>
								</div>
							{/if}
							{#if data.additionalData.ticket.gemId}
								<div class="border-line2 -mt-px -ml-px border px-5 py-4">
									<dt
										class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										GEM ID
									</dt>
									<dd class="font-mono-system text-ink text-[14px] font-bold">
										{data.additionalData.ticket.gemId}
									</dd>
								</div>
							{/if}
							{#if data.additionalData.ticket.refunded}
								<div
									class="border-warm -mt-px -ml-px border border-l-[3px] px-5 py-4 sm:col-span-2"
									style="background-color: color-mix(in srgb, var(--ed-warm) 6%, transparent);"
								>
									<dt
										class="text-warm font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										Refunded On
									</dt>
									<dd class="font-newsreader text-warm text-[16px] font-semibold">
										{formatDateShort(data.additionalData.ticket.refundedAt)}
									</dd>
								</div>
							{/if}
						</dl>
					</div>
				</div>
			{:else if data.order.meta?.type === 'course'}
				<div class="border-line2 bg-paper border">
					<div class="border-line2 flex items-baseline justify-between border-b px-6 py-[14px]">
						<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
							Course Details
						</h2>
						<span
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Access
						</span>
					</div>
					<dl class="grid grid-cols-1 sm:grid-cols-2">
						<div class="border-line2 -mt-px -ml-px border px-6 py-5">
							<dt
								class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>
								Course ID
							</dt>
							<dd
								class="font-mono-system text-ink text-[13.5px] font-bold tracking-[0.02em] break-all"
							>
								{data.order.meta.courseId}
							</dd>
						</div>
						{#if data.additionalData?.entitlement}
							<div
								class="border-line2 -mt-px -ml-px border px-6 py-5"
								style="border-color: color-mix(in srgb, var(--ed-prem) 35%, transparent); background-color: color-mix(in srgb, var(--ed-prem) 6%, transparent);"
							>
								<dt
									class="text-prem font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Status
								</dt>
								<dd class="text-prem font-newsreader text-[18px] font-semibold">
									Active access
								</dd>
							</div>
						{:else}
							<div
								class="border-line2 -mt-px -ml-px border px-6 py-5"
								style="border-color: color-mix(in srgb, var(--ed-warm) 35%, transparent); background-color: color-mix(in srgb, var(--ed-warm) 6%, transparent);"
							>
								<dt
									class="text-warm font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Status
								</dt>
								<dd class="text-warm font-newsreader text-[18px] font-semibold">
									Access revoked
								</dd>
							</div>
						{/if}
					</dl>
				</div>
			{:else if data.order.meta?.type === 'subscription'}
				<div class="border-line2 bg-paper border">
					<div class="border-line2 flex items-baseline justify-between border-b px-6 py-[14px]">
						<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
							Premium Subscription
						</h2>
						<span
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Membership
						</span>
					</div>
					<dl class="grid grid-cols-1 sm:grid-cols-2">
						<div class="border-line2 -mt-px -ml-px border px-6 py-5">
							<dt
								class="text-fade font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>
								Subscription ID
							</dt>
							<dd
								class="font-mono-system text-ink text-[13.5px] font-bold tracking-[0.02em] break-all"
							>
								{data.order.meta.subscriptionId}
							</dd>
						</div>
						<div
							class="border-line2 -mt-px -ml-px border px-6 py-5"
							style="border-color: color-mix(in srgb, var(--ed-prem) 35%, transparent); background-color: color-mix(in srgb, var(--ed-prem) 6%, transparent);"
						>
							<dt
								class="text-prem font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>
								Plan
							</dt>
							<dd class="text-prem font-newsreader text-[18px] font-semibold">
								{data.order.meta.subscriptionType === 'yearly' ? 'Annual' : 'Monthly'} Premium
							</dd>
						</div>
						<!-- Subscription state -->
						{#if data.user.subscriptionStatus === 'cancelled'}
							<div
								class="border-warm -mt-px -ml-px border border-l-[3px] px-6 py-5 sm:col-span-2"
								style="background-color: color-mix(in srgb, var(--ed-warm) 6%, transparent);"
							>
								<dt
									class="text-warm font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Cancelled
								</dt>
								{#if data.user.subscriptionEndDate}
									<dd class="text-soft text-[13px] font-semibold">
										Access until {formatDateShort(data.user.subscriptionEndDate)}.
									</dd>
								{/if}
							</div>
						{:else if data.user.subscriptionStatus === 'payment_failed'}
							<div
								class="border-warm -mt-px -ml-px border border-l-[3px] px-6 py-5 sm:col-span-2"
								style="background-color: color-mix(in srgb, var(--ed-warm) 6%, transparent);"
							>
								<dt
									class="text-warm font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Payment failed
								</dt>
								<dd class="text-soft text-[13px] font-semibold leading-[1.5]">
									Your last payment failed. <a
										href="/account?tab=plan"
										class="text-accent font-extrabold tracking-[0.04em] uppercase">Update your payment method →</a
									> to avoid losing access.
									{#if data.user.subscriptionEndDate}
										<br />Grace period ends {formatDateShort(data.user.subscriptionEndDate)}.
									{/if}
								</dd>
							</div>
						{:else if data.user.subscriptionStatus === 'expired'}
							<div
								class="border-warm -mt-px -ml-px border border-l-[3px] px-6 py-5 sm:col-span-2"
								style="background-color: color-mix(in srgb, var(--ed-warm) 6%, transparent);"
							>
								<dt
									class="text-warm font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Expired
								</dt>
								<dd class="text-soft text-[13px] font-semibold">
									Your subscription has ended.
									<a
										href="/premium"
										class="text-accent font-extrabold tracking-[0.04em] uppercase">Resubscribe →</a
									>
								</dd>
							</div>
						{:else if data.user.subscriptionStatus === 'active'}
							<div
								class="border-line2 -mt-px -ml-px border border-l-[3px] px-6 py-5 sm:col-span-2"
								style="border-left-color: var(--ed-prem); background-color: color-mix(in srgb, var(--ed-prem) 5%, transparent);"
							>
								<dt
									class="text-prem font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Active
								</dt>
								{#if data.user.nextBillingDate}
									<dd class="text-soft text-[13px] font-semibold">
										Next billing: {formatDateShort(data.user.nextBillingDate)}
									</dd>
								{/if}
							</div>
						{/if}
					</dl>
					<div class="border-line2 border-t px-6 py-5">
						<p class="text-soft text-[13px] leading-[1.55] font-medium">
							To manage or cancel your subscription, visit the
							<a
								href="/account?tab=plan"
								class="text-accent font-extrabold tracking-[0.04em] uppercase"
								>Subscription</a
							>
							section of your account.
						</p>
					</div>
				</div>
			{/if}

			<!-- Refund section -->
			{#if showRefundSection && !form?.success}
				<div class="border-line2 bg-paper border">
					<div class="border-line2 flex items-baseline justify-between border-b px-6 py-[14px]">
						<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
							{isWithin24Hours ? 'Refund Request' : 'Request Refund'}
						</h2>
						<span
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							{isWithin24Hours ? 'Contact support' : 'Self-service'}
						</span>
					</div>
					<div class="px-6 py-6">
						{#if isWithin24Hours}
							<div
								class="border-warm border-line2 mb-5 border border-l-[3px] bg-paper-bg/40 px-5 py-4"
							>
								<div
									class="text-warm font-mono-system mb-1 text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									{isEventPassed ? 'Event has occurred' : 'Within 24 hours'}
								</div>
								<p class="text-soft text-[13.5px] leading-[1.55] font-semibold">
									Self-service refunds are only available until 24 hours before the event starts.
									To request a refund, please contact our support team.
								</p>
							</div>
							<a
								href={`mailto:info@arcanegamesandevents.com?subject=Refund Request - Order #${data.order.id.substring(0, 8)}&body=Hi, I would like to request a refund for my ticket purchase.%0A%0AOrder ID: ${data.order.id}%0AEvent: ${data.order.meta?.eventTitle || 'N/A'}%0A%0APlease let me know if you need any additional information.`}
								class="border-ink text-ink hover:bg-ink hover:text-paper-bg font-mono-system inline-flex items-center gap-2 border-[1.5px] bg-transparent px-6 py-[12px] text-[11px] font-extrabold tracking-[0.08em] uppercase transition-colors"
							>
								Contact support →
							</a>
						{:else}
							<div
								class="border-warm border-line2 mb-5 border border-l-[3px] bg-paper-bg/40 px-5 py-4"
							>
								<div
									class="text-warm font-mono-system mb-1 text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Permanent action
								</div>
								<p class="text-soft text-[13.5px] leading-[1.55] font-semibold">
									This action cannot be undone. Refunding this order will permanently revoke any
									access or benefits granted by this purchase.
								</p>
							</div>

							<form method="POST" action="?/refund" use:enhance bind:this={refundFormRef}>
								<button
									type="button"
									onclick={openRefundModal}
									disabled={refunding}
									class="bg-warm border-warm font-mono-system inline-flex items-center gap-2 border-[1.5px] px-6 py-[12px] text-[11px] font-extrabold tracking-[0.08em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{#if refunding}
										<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Processing refund…
									{:else}
										Request refund →
									{/if}
								</button>
							</form>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Secure transaction footnote -->
			<div
				class="text-fade font-mono-system text-center text-[10px] font-bold tracking-[0.14em] uppercase"
			>
				Secure transaction · Authorize.Net
			</div>
		</div>
	</section>
</AgeShell>

<!-- Refund confirmation modal — editorial paper card with ink hairlines. -->
{#if showRefundModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onkeydown={(e) => e.key === 'Escape' && closeRefundModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-ink/70"
			onclick={closeRefundModal}
			aria-label="Close modal"
		></button>

		<div
			class="border-ink bg-paper text-ink relative w-full max-w-md overflow-hidden border-[1.5px] shadow-2xl"
		>
			<!-- Header — warm top rule signals the destructive action -->
			<div
				class="border-line2 border-b border-t-[3px] px-6 py-5"
				style="border-top-color: var(--ed-warm);"
			>
				<div
					class="text-warm font-mono-system mb-[6px] text-[10px] font-extrabold tracking-[0.18em] uppercase"
				>
					Confirm refund
				</div>
				<h3
					class="font-newsreader text-[24px] font-semibold leading-[1.05] tracking-[-0.01em]"
				>
					This action cannot be undone.
				</h3>
			</div>

			<!-- Body -->
			<div class="px-6 py-5">
				<p class="text-soft mb-4 text-[13.5px] leading-[1.55] font-semibold">
					Refunding this order will:
				</p>
				<ul class="space-y-3 text-[13px] font-medium">
					{#each [`Cancel your ticket / registration for this event`, `Issue a refund of $${parseFloat(data.order.amount).toFixed(2)} to your payment method`, `Permanently revoke any access granted by this purchase`] as line, i (i)}
						<li class="flex items-start gap-3">
							<span
								class="bg-warm mt-[6px] inline-block h-[6px] w-[6px] shrink-0 rounded-full"
								aria-hidden="true"
							></span>
							<span class="text-soft leading-[1.55]">{@html line}</span>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Footer -->
			<div class="border-line2 flex gap-3 border-t bg-paper-bg/40 px-6 py-4">
				<button
					type="button"
					onclick={closeRefundModal}
					class="border-ink text-ink hover:bg-ink hover:text-paper-bg font-mono-system flex-1 border-[1.5px] bg-transparent px-4 py-[12px] text-[11px] font-extrabold tracking-[0.08em] uppercase transition-colors"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmRefund}
					class="bg-warm border-warm font-mono-system flex-1 border-[1.5px] px-4 py-[12px] text-[11px] font-extrabold tracking-[0.08em] text-white uppercase transition-[filter] hover:brightness-110"
				>
					Yes, refund order
				</button>
			</div>
		</div>
	</div>
{/if}
