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

	// ============ display helpers ============
	const type = data.order.meta?.type;
	const ticketData = data.additionalData?.ticket;
	const eventData = data.additionalData?.event;
	const isRefunded = !!ticketData?.refunded;

	const TYPE_LABEL = {
		ticket: 'Event ticket',
		course: 'Course purchase',
		subscription: 'Premium membership'
	};
	const typeLabel = TYPE_LABEL[type] || 'Purchase';

	// Kicker colour on the ink band, per order type.
	const KICKER = {
		ticket: 'text-warm-light',
		course: 'text-gold',
		subscription: 'text-prem-light'
	};
	const kicker = KICKER[type] || 'text-paper-bg/70';

	const headline =
		type === 'ticket'
			? data.order.meta?.eventTitle || eventData?.title || 'Event ticket'
			: type === 'course'
				? data.order.meta?.courseTitle || 'Course purchase'
				: type === 'subscription'
					? `${data.order.meta?.subscriptionType === 'yearly' ? 'Annual' : 'Monthly'} Premium`
					: 'Purchase';

	const amount = parseFloat(data.order.amount).toFixed(2);
	const shortId = data.order.id.substring(0, 8);
	const cardLastFour = data.order.meta?.cardLastFour;
	const ticketCode = ticketData?.code || data.order.meta?.ticketCode;
	const playerGem = ticketData?.gemId || data.order.meta?.gemId;

	// Status label + tone for the masthead chip.
	const subStatus = data.user.subscriptionStatus;
	const status = isRefunded
		? { label: 'Refunded', tone: 'bg-hero-rb text-white' }
		: type === 'subscription'
			? subStatus === 'cancelled'
				? { label: 'Cancelled', tone: 'border border-hero-rb text-hero-rb' }
				: subStatus === 'payment_failed'
					? { label: 'Payment failed', tone: 'bg-hero-rb text-white' }
					: subStatus === 'expired'
						? { label: 'Expired', tone: 'border border-paper-bg/40 text-paper-bg/70' }
						: { label: 'Active', tone: 'bg-prem text-white' }
			: { label: 'Paid', tone: 'bg-prem text-white' };

	// What a refund does, by order type (for the confirmation dialog).
	const refundEffects = [
		type === 'ticket'
			? 'Cancels your registration for this event'
			: type === 'course'
				? 'Removes your access to this course'
				: 'Revokes access granted by this purchase',
		`Returns $${amount} to your original payment method`,
		'Cannot be undone'
	];

	function formatEventDate(d) {
		return new Date(d).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});
	}

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
	<title>Order #{shortId} — AGE</title>
</svelte:head>

{#snippet row(label, value, mono = false)}
	<div class="flex items-baseline justify-between gap-4 border-b border-dashed border-line2 py-2.5">
		<dt class="shrink-0 text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
			{label}
		</dt>
		<dd
			class="min-w-0 text-right {mono
				? 'text-[12px] font-semibold tracking-[0.02em] break-all tabular-nums'
				: 'font-newsreader text-[15px] font-semibold'}"
		>
			{value}
		</dd>
	</div>
{/snippet}

<AgeShell active="Account">
	<!-- ============ masthead: ink band ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-10 md:px-8 md:pt-10 md:pb-12">
			<a
				href="/account?tab=billing"
				class="inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase transition-[color,gap] hover:gap-3 hover:text-paper-bg"
			>
				<span aria-hidden="true">←</span> Purchase history
			</a>

			<div class="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
				<div class="fp-rise min-w-0">
					<p class="text-[10px] font-extrabold tracking-[0.24em] uppercase {kicker}">
						<span aria-hidden="true">◆</span>
						{typeLabel} · Receipt
					</p>
					<h1
						class="mt-3 font-newsreader text-[36px] leading-[1.02] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[52px]"
					>
						{headline}
					</h1>
					<p class="mt-3 font-newsreader text-[16px] text-paper-bg/65 italic md:text-[17px]">
						Placed {formatDateLong(data.order.createdAt)} at {formatTime(data.order.createdAt)}
					</p>
				</div>
				<div class="fp-rise shrink-0 md:text-right" style="animation-delay: 100ms;">
					<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-paper-bg/50 uppercase">
						Total · {data.order.currency}
					</p>
					<p class="ao-cond mt-1 text-[64px] leading-[0.85] font-black tabular-nums md:text-[80px]">
						${amount}
					</p>
					<span
						class="mt-3 inline-flex items-center px-2.5 py-[5px] text-[9.5px] font-extrabold tracking-[0.16em] uppercase {status.tone}"
						>{status.label}</span
					>
				</div>
			</div>
			<div class="mt-8 h-[5px] border-y border-paper-bg/30" aria-hidden="true"></div>
		</div>
	</section>

	<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
		<!-- refund result -->
		{#if form?.success}
			<div class="mb-8 border-l-[3px] border-prem bg-prem/[0.07] px-5 py-4">
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
					Refund processed
				</p>
				<p class="mt-1 font-newsreader text-[15.5px] text-soft">{form.message}</p>
			</div>
		{/if}
		{#if form?.error}
			<div class="mb-8 border-l-[3px] border-hero-rb bg-hero-rb/[0.07] px-5 py-4">
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
					Refund not processed
				</p>
				<p class="mt-1 font-newsreader text-[15.5px] text-soft">{form.error}</p>
			</div>
		{/if}

		<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
			<!-- ============ main ============ -->
			<div class="min-w-0 space-y-10">
				{#if type === 'ticket'}
					<section>
						<h2
							class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
						>
							<span class="text-[8px] text-warm" aria-hidden="true">◆</span> Your ticket
						</h2>
						<!-- admission ticket: details + tear-off stub with the code -->
						<div
							class="relative mt-4 grid border-[3px] border-double border-ink bg-paper sm:grid-cols-[minmax(0,1fr)_200px]"
						>
							<div class="p-5 md:p-7 {isRefunded ? 'opacity-55' : ''}">
								<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">
									Admit one{eventData?.circuit ? ` · ${eventData.circuit}` : ''}
								</p>
								<p
									class="mt-2 font-newsreader text-[26px] leading-[1.08] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[30px]"
								>
									{data.order.meta?.eventTitle || eventData?.title || 'AGE event'}
								</p>
								{#if eventData}
									<p class="mt-2 font-newsreader text-[15.5px] text-soft">
										{[
											eventData.eventDate ? formatEventDate(eventData.eventDate) : null,
											eventData.format,
											eventData.location
										]
											.filter(Boolean)
											.join(' · ')}
									</p>
								{/if}
								<dl class="mt-5 grid grid-cols-2 gap-4 border-t border-line2 pt-4">
									<div>
										<dt class="text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase">
											Player
										</dt>
										<dd class="mt-0.5 font-newsreader text-[16px] font-semibold">
											{ticketData?.firstName
												? `${ticketData.firstName} ${ticketData.lastName || ''}`.trim()
												: '—'}
										</dd>
									</div>
									<div>
										<dt class="text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase">
											GEM ID
										</dt>
										<dd class="mt-0.5 text-[15px] font-semibold tabular-nums">
											{playerGem || '—'}
										</dd>
									</div>
								</dl>
								{#if eventData?.id}
									<a
										href="/age-open/{eventData.id}"
										class="mt-5 inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.16em] text-warm uppercase transition-[gap] hover:gap-3"
										>View event <span aria-hidden="true">→</span></a
									>
								{/if}
							</div>
							<!-- stub -->
							<div
								class="relative flex flex-col items-center justify-center border-t-2 border-dashed border-ink/40 bg-paper-bg px-5 py-6 text-center sm:border-t-0 sm:border-l-2"
							>
								<p class="text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase">
									Ticket code
								</p>
								<p
									class="ao-cond mt-1 text-[34px] leading-none font-black tracking-[0.02em] break-all text-ink"
								>
									{ticketCode || '—'}
								</p>
								<p class="mt-2 font-newsreader text-[13px] text-soft italic">
									Show this at check-in
								</p>
								{#if isRefunded}
									<span
										class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] border-[3px] border-hero-rb bg-paper/80 px-4 py-1 text-[18px] font-extrabold tracking-[0.18em] text-hero-rb uppercase"
										>Refunded</span
									>
								{/if}
							</div>
						</div>
						{#if isRefunded && ticketData?.refundedAt}
							<p class="mt-3 font-newsreader text-[15px] text-soft">
								Refunded on {formatDateShort(ticketData.refundedAt)}.
							</p>
						{/if}
					</section>
				{:else if type === 'course'}
					<section>
						<h2
							class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
						>
							<span class="text-[8px] text-gold" aria-hidden="true">◆</span> Your course
						</h2>
						<div class="mt-4 border-[3px] border-double border-ink bg-paper p-5 md:p-7">
							<p
								class="font-newsreader text-[26px] leading-[1.08] font-semibold tracking-[-0.01em]"
							>
								{data.order.meta?.courseTitle || 'Academy course'}
							</p>
							<p class="mt-3">
								{#if data.additionalData?.entitlement}
									<span
										class="inline-flex bg-prem px-2.5 py-[5px] text-[9.5px] font-extrabold tracking-[0.16em] text-white uppercase"
										>Access active</span
									>
								{:else}
									<span
										class="inline-flex border border-hero-rb px-2.5 py-[5px] text-[9.5px] font-extrabold tracking-[0.16em] text-hero-rb uppercase"
										>Access removed</span
									>
								{/if}
							</p>
							{#if data.additionalData?.entitlement}
								<a
									href="/academy"
									class="mt-5 inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.16em] text-warm uppercase transition-[gap] hover:gap-3"
									>Go to the Academy <span aria-hidden="true">→</span></a
								>
							{/if}
						</div>
					</section>
				{:else if type === 'subscription'}
					<section>
						<h2
							class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
						>
							<span class="text-[8px] text-prem" aria-hidden="true">◆</span> Your membership
						</h2>
						<div class="mt-4 border-[3px] border-double border-ink bg-paper p-5 md:p-7">
							<p
								class="font-newsreader text-[26px] leading-[1.08] font-semibold tracking-[-0.01em]"
							>
								{headline}
							</p>
							<p class="mt-1 font-newsreader text-[15.5px] text-soft">
								{data.order.meta?.subscriptionType === 'yearly'
									? 'Billed once a year.'
									: 'Billed every month.'}
							</p>
							{#if subStatus === 'cancelled'}
								<div class="mt-5 border-l-[3px] border-hero-rb bg-hero-rb/[0.07] px-4 py-3">
									<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
										Cancelled
									</p>
									<p class="mt-1 font-newsreader text-[15px] text-soft">
										{data.user.subscriptionEndDate
											? `You keep access until ${formatDateShort(data.user.subscriptionEndDate)}.`
											: 'Your membership will not renew.'}
									</p>
								</div>
							{:else if subStatus === 'payment_failed'}
								<div class="mt-5 border-l-[3px] border-hero-rb bg-hero-rb/[0.07] px-4 py-3">
									<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
										Payment failed
									</p>
									<p class="mt-1 font-newsreader text-[15px] text-soft">
										Your last payment didn't go through.
										<a href="/account?tab=plan" class="font-semibold text-warm underline"
											>Update your payment method</a
										>
										to keep your access{#if data.user.subscriptionEndDate}&nbsp;past {formatDateShort(
												data.user.subscriptionEndDate
											)}{/if}.
									</p>
								</div>
							{:else if subStatus === 'expired'}
								<div class="mt-5 border-l-[3px] border-hero-rb bg-hero-rb/[0.07] px-4 py-3">
									<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
										Expired
									</p>
									<p class="mt-1 font-newsreader text-[15px] text-soft">
										Your membership has ended.
										<a href="/premium" class="font-semibold text-warm underline">Rejoin Premium</a>.
									</p>
								</div>
							{:else}
								<div class="mt-5 border-l-[3px] border-prem bg-prem/[0.07] px-4 py-3">
									<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
										Active
									</p>
									<p class="mt-1 font-newsreader text-[15px] text-soft">
										{data.user.nextBillingDate
											? `Next billing date: ${formatDateShort(data.user.nextBillingDate)}.`
											: 'Your membership is active.'}
									</p>
								</div>
							{/if}
							<a
								href="/account?tab=plan"
								class="mt-5 inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.16em] text-warm uppercase transition-[gap] hover:gap-3"
								>Manage membership <span aria-hidden="true">→</span></a
							>
						</div>
					</section>
				{/if}

				<!-- ============ refunds ============ -->
				{#if showRefundSection && !form?.success}
					<section class="border-t-[3px] border-ink pt-5">
						<h2
							class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
						>
							<span class="text-[8px] text-hero-rb" aria-hidden="true">◆</span> Refunds
						</h2>
						{#if isWithin24Hours}
							<p class="mt-3 max-w-[620px] font-newsreader text-[16px] leading-[1.55] text-soft">
								{isEventPassed
									? 'This event has already happened.'
									: 'This event is less than 24 hours away.'}
								Self-service refunds close 24 hours before an event starts, so please email us and we'll
								sort it out.
							</p>
							<a
								href={`mailto:info@arcanegamesandevents.com?subject=Refund Request - Order #${shortId}&body=Hi, I would like to request a refund for my ticket purchase.%0A%0AOrder ID: ${data.order.id}%0AEvent: ${data.order.meta?.eventTitle || 'N/A'}%0A%0APlease let me know if you need any additional information.`}
								class="mt-5 inline-flex min-h-[48px] items-center gap-2 border-[1.5px] border-ink px-6 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
							>
								Email support <span aria-hidden="true">→</span>
							</a>
						{:else}
							<p class="mt-3 max-w-[620px] font-newsreader text-[16px] leading-[1.55] text-soft">
								Changed your mind? You can refund this order yourself. It returns ${amount} to your card
								and removes anything this purchase gave you. This can't be undone.
							</p>
							<form method="POST" action="?/refund" use:enhance bind:this={refundFormRef}>
								<button
									type="button"
									onclick={openRefundModal}
									disabled={refunding}
									class="mt-5 inline-flex min-h-[48px] items-center gap-2 border-[1.5px] border-hero-rb px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-hero-rb uppercase transition-colors hover:bg-hero-rb hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
								>
									{refunding ? 'Processing refund…' : 'Request a refund'}
								</button>
							</form>
						{/if}
					</section>
				{/if}
			</div>

			<!-- ============ receipt slip ============ -->
			<aside class="lg:sticky lg:top-24 lg:self-start">
				<div class="border-t-[5px] border-ink bg-paper px-5 pt-5 pb-6">
					<p class="flex items-center justify-between">
						<span class="font-newsreader text-[20px] font-semibold">Receipt</span>
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>#{shortId}</span
						>
					</p>
					<dl class="mt-3">
						{@render row('Item', typeLabel)}
						{@render row('Date', formatDateShort(data.order.createdAt))}
						{@render row('Time', formatTime(data.order.createdAt))}
						{@render row('Paid with', cardLastFour ? `Card •••• ${cardLastFour}` : 'Card')}
						{@render row('Order ID', data.order.id, true)}
						{@render row('Transaction', data.order.providerRef || '—', true)}
					</dl>
					<div
						class="mt-4 flex items-baseline justify-between border-t-[3px] border-double border-ink pt-3"
					>
						<span class="text-[10px] font-extrabold tracking-[0.2em] uppercase">Total</span>
						<span class="ao-cond text-[34px] leading-none font-black tabular-nums">${amount}</span>
					</div>
					<p
						class="mt-4 text-center text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Secure transaction · Authorize.Net
					</p>
				</div>
				<p class="mt-4 font-newsreader text-[14px] leading-[1.5] text-soft">
					Questions about this order? Email
					<a href="mailto:info@arcanegamesandevents.com" class="font-semibold text-warm underline"
						>info@arcanegamesandevents.com</a
					>.
				</p>
			</aside>
		</div>
	</div>
</AgeShell>

<!-- ============ refund confirmation ============ -->
{#if showRefundModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onkeydown={(e) => e.key === 'Escape' && closeRefundModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="refund-title"
		tabindex="-1"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-ink/70 backdrop-blur-[2px]"
			onclick={closeRefundModal}
			aria-label="Close"
		></button>
		<div
			class="relative w-full max-w-md border-t-[5px] border-hero-rb bg-paper-bg text-ink shadow-2xl"
		>
			<div class="px-6 pt-6">
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
					Confirm refund
				</p>
				<h3
					id="refund-title"
					class="mt-2 font-newsreader text-[26px] leading-[1.08] font-semibold tracking-[-0.01em]"
				>
					Refund ${amount}?
				</h3>
				<ul class="mt-4 space-y-2.5">
					{#each refundEffects as line (line)}
						<li class="flex items-start gap-3 font-newsreader text-[15.5px] text-soft">
							<span class="mt-[9px] h-[6px] w-[6px] shrink-0 bg-hero-rb" aria-hidden="true"></span>
							{line}
						</li>
					{/each}
				</ul>
			</div>
			<div class="mt-6 grid grid-cols-2 gap-px border-t border-line2 bg-line2">
				<button
					type="button"
					onclick={closeRefundModal}
					class="min-h-[52px] bg-paper-bg text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-paper"
				>
					Keep order
				</button>
				<button
					type="button"
					onclick={confirmRefund}
					class="min-h-[52px] bg-hero-rb text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
				>
					Yes, refund
				</button>
			</div>
		</div>
	</div>
{/if}
