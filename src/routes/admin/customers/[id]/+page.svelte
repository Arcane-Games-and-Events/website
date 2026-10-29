<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
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
				return '[--tone:var(--color-warm)]';
			case 'premium':
				return '[--tone:var(--color-prem)]';
			case 'tournament staff':
				return '[--tone:#8a6116]';
			case 'writer':
				return '[--tone:var(--color-ink)]';
			default:
				return '[--tone:var(--color-fade)]';
		}
	}
	function subStatusChip(status) {
		switch (status) {
			case 'active':
				return '[--tone:var(--color-prem)]';
			case 'past_due':
			case 'payment_failed':
				return '[--tone:var(--color-hero-rb)]';
			case 'cancelled':
				return '[--tone:#8a6116]';
			default:
				return '[--tone:var(--color-fade)]';
		}
	}
	const adminEnhance = () => {
		cancelLoading = true;
		return async ({ update }) => {
			cancelLoading = false;
			await update();
			await invalidateAll();
		};
	};
	function orderTypeChip(t) {
		switch (t) {
			case 'ticket':
				return '[--tone:var(--color-warm)]';
			case 'course':
				return '[--tone:#8a6116]';
			case 'subscription':
				return '[--tone:var(--color-prem)]';
			default:
				return '[--tone:var(--color-fade)]';
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
<DeskHeader
	kicker="Admin"
	title={data.customer
		? `${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim() || 'Customer'
		: 'Guest customer'}
	subtitle={data.customerEmail}
/>
<AdminTabs />
<section class="mx-auto w-full max-w-[1200px] px-5 pt-[24px] pb-[20px] md:px-8">
	<nav
		class="flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
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
		<div class="mt-[18px] border-l-[3px] border-prem bg-prem/10 p-4">
			<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase">Success</span>
			<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{form.message}</p>
		</div>
	{/if}
	{#if form?.error}
		<div class="mt-[18px] border-l-[3px] border-hero-rb bg-hero-rb/[0.06] p-4">
			<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-hero-rb uppercase">Error</span
			>
			<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{form.error}</p>
		</div>
	{/if}

	<div class="mt-[18px] flex flex-wrap items-start justify-between gap-[18px]">
		<div class="flex items-start gap-[18px]">
			<div
				class="flex h-[72px] w-[72px] items-center justify-center border border-line2 bg-paper font-newsreader text-[26px] font-semibold"
			>
				{#if data.customer}
					{data.customer.firstName.charAt(0)}{data.customer.lastName.charAt(0)}
				{:else}
					{data.customerEmail.charAt(0).toUpperCase()}
				{/if}
			</div>
			<div class="min-w-0">
				<div class="mt-[10px] flex flex-wrap items-center gap-[10px]">
					<span class="text-[11.5px] text-fade">
						{data.customerEmail}
					</span>
					<button
						onclick={copyEmail}
						class="inline-flex h-[32px] shrink-0 items-center border border-line2 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
						title="Copy email"
					>
						{copySuccess ? 'Copied' : 'Copy'}
					</button>
				</div>
				<div class="mt-[10px] flex flex-wrap items-center gap-[8px]">
					{#if data.customer}
						<span
							class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {roleChip(
								data.customer.role
							)}"
						>
							{data.customer.role}
						</span>
						{#if data.customer.gemId}
							<span class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-warm">
								GEM · {data.customer.gemId}
							</span>
						{/if}
					{:else}
						<span
							class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-medium whitespace-nowrap text-ink text-soft capitalize before:block before:h-[7px] before:w-[7px] before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-['']"
						>
							No Account
						</span>
					{/if}
				</div>
				<p class="mt-[10px] text-[11.5px] text-fade">
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
					class="h-[40px] border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
				>
					<option value="free" selected={data.customer.role === 'free'}>Free</option>
					<option value="premium" selected={data.customer.role === 'premium'}>Premium</option>
					<option value="writer" selected={data.customer.role === 'writer'}>Writer</option>
					<option value="tournament staff" selected={data.customer.role === 'tournament staff'}
						>Tournament Staff</option
					>
					<option value="admin" selected={data.customer.role === 'admin'}>Admin</option>
				</select>
				<select
					name="compReason"
					title="Why this member gets Premium without paying"
					class="h-[40px] border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
				>
					<option value="">Comp reason…</option>
					<option value="staff" selected={data.customer.compReason === 'staff'}>Staff</option>
					<option value="writer" selected={data.customer.compReason === 'writer'}>Writer</option>
					<option value="teacher" selected={data.customer.compReason === 'teacher'}>Teacher</option>
					<option value="partner" selected={data.customer.compReason === 'partner'}>Partner</option>
					<option value="friend" selected={data.customer.compReason === 'friend'}>Friend</option>
					<option value="trial" selected={data.customer.compReason === 'trial'}>Trial</option>
					<option value="other" selected={data.customer.compReason === 'other'}>Other</option>
				</select>
				<button
					type="submit"
					disabled={roleLoading}
					class="inline-flex h-[32px] shrink-0 items-center gap-1.5 bg-ink px-3 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
				>
					{roleLoading ? 'Updating…' : 'Update Role'}
				</button>
			</form>
		{/if}
	</div>
</section>

<!-- ============ STATS ============ -->
<section class="overflow-x-clip border-t border-line2">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[28px] md:px-8">
		<div class="grid grid-cols-2 gap-[24px] md:grid-cols-4">
			<div>
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>Lifetime Value</span
				>
				<div class="ao-cond mt-[6px] text-[30px] leading-none font-black text-prem tabular-nums">
					{formatCurrency(data.stats.totalSpent)}
				</div>
			</div>
			<div>
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>Total Orders</span
				>
				<div class="ao-cond mt-[6px] text-[30px] leading-none font-black text-ink tabular-nums">
					{data.stats.totalOrders}
				</div>
			</div>
			<div>
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>Avg Order</span
				>
				<div class="ao-cond mt-[6px] text-[30px] leading-none font-black text-ink tabular-nums">
					{formatCurrency(data.stats.avgOrderValue)}
				</div>
			</div>
			<div>
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>Active Tickets</span
				>
				<div class="ao-cond mt-[6px] text-[30px] leading-none font-black text-ink tabular-nums">
					{data.activeTicketsCount}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ============ MEMBERSHIP ============ -->
{#if data.customer && (data.membership?.subscription || data.membership?.legacy || data.membership?.comp || data.customer.subscriptionId || data.customer.subscriptionStatus)}
	{@const sub = data.membership?.subscription}
	<section class="overflow-x-clip border-t border-line2">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-[28px] md:px-8">
			<div class="mb-[18px] flex flex-wrap items-end justify-between gap-3">
				<div>
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>Membership</span
					>
					<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">
						{#if sub}{sub.plan === 'yearly' ? 'Annual' : 'Monthly'} at {formatCurrency(
								sub.priceCents / 100
							)}{:else if data.membership?.legacy}On the old Authorize.net subscription{:else if data.membership?.comp}Complimentary{:else}Membership.{/if}
					</h2>
				</div>
				{#if sub?.legacyArbId}<span class="text-[11px] text-fade"
						>migrated from ARB {sub.legacyArbId}{sub.legacyArbCancelledAt
							? ''
							: ' · ARB not yet cancelled'}</span
					>{/if}
			</div>

			<div class="border border-line2 p-6">
				<div class="grid grid-cols-2 gap-[24px] sm:grid-cols-5">
					<div>
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>Status</span
						>
						<div class="mt-[6px]">
							<span
								class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {subStatusChip(
									sub ? sub.status : data.customer.subscriptionStatus
								)}"
							>
								{(sub ? sub.status : data.customer.subscriptionStatus || 'None').replace(
									'_',
									' '
								)}{sub?.hold ? ' · held' : ''}
							</span>
						</div>
					</div>
					<div>
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>Started</span
						>
						<p class="mt-[6px] font-newsreader text-[16px] font-semibold">
							{formatDate(sub ? sub.startedAt : data.customer.subscriptionStartDate)}
						</p>
					</div>
					<div>
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>Paid through</span
						>
						<p class="mt-[6px] font-newsreader text-[16px] font-semibold">
							{formatDate(
								sub
									? sub.currentPeriodEnd
									: data.customer.subscriptionEndDate || data.customer.nextBillingDate
							)}
						</p>
					</div>
					<div>
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>Next charge</span
						>
						<p class="mt-[6px] font-newsreader text-[16px] font-semibold">
							{sub
								? sub.status === 'past_due'
									? `retry ${formatDate(sub.nextAttemptAt)}`
									: formatDate(sub.nextChargeAt)
								: formatDate(data.customer.nextBillingDate)}
						</p>
					</div>
					<div>
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>Card</span
						>
						<p class="mt-[6px] font-newsreader text-[16px] font-semibold">
							{data.membership?.card
								? `${data.membership.card.brand} •••• ${data.membership.card.lastFour}`
								: '—'}
						</p>
					</div>
				</div>
				{#if sub?.pendingPlan}<p class="mt-3 text-[12px] text-soft">
						Switching to {sub.pendingPlan} at {formatCurrency(sub.pendingPriceCents / 100)} on {formatDate(
							sub.currentPeriodEnd
						)}.
					</p>{/if}
				{#if sub?.flags?.length}<p class="mt-2 text-[12px] text-[#8a6116]">
						Flags: {sub.flags.join(', ')}
					</p>{/if}

				{#if sub && data.membership.live}
					<div class="mt-5 flex flex-wrap gap-2 border-t border-line2 pt-4">
						{#if sub.status === 'past_due' || (sub.status === 'active' && sub.nextChargeAt && new Date(sub.nextChargeAt) <= new Date())}
							<form method="POST" action="?/chargeNow" use:enhance={adminEnhance}>
								<input type="hidden" name="subscriptionId" value={sub.id} /><button
									class="inline-flex h-[32px] items-center bg-ink px-3 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
									disabled={cancelLoading}>Charge now</button
								>
							</form>
						{/if}
						<form method="POST" action="?/extend" use:enhance={adminEnhance} class="flex gap-1">
							<input type="hidden" name="subscriptionId" value={sub.id} /><input
								type="number"
								name="days"
								min="1"
								max="366"
								value="30"
								class="h-[32px] w-[72px] border border-line2 bg-paper px-2 text-[11px]"
							/><button
								class="inline-flex h-[32px] items-center border border-line2 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:border-ink disabled:opacity-40"
								disabled={cancelLoading}>Extend days</button
							>
						</form>
						<form method="POST" action="?/hold" use:enhance={adminEnhance}>
							<input type="hidden" name="subscriptionId" value={sub.id} /><input
								type="hidden"
								name="hold"
								value={sub.hold ? '0' : '1'}
							/><button
								class="inline-flex h-[32px] items-center border border-line2 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:border-ink disabled:opacity-40"
								disabled={cancelLoading}>{sub.hold ? 'Lift billing hold' : 'Hold billing'}</button
							>
						</form>
						{#if sub.status !== 'cancelled'}
							<form
								method="POST"
								action="?/cancelSubscription"
								use:enhance={adminEnhance}
								onsubmit={(e) => {
									if (
										!confirm(
											'Cancel at period end? The member keeps access until the period ends and is not charged again.'
										)
									)
										e.preventDefault();
								}}
							>
								<button
									class="inline-flex h-[32px] items-center border border-line2 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:border-ink disabled:opacity-40"
									disabled={cancelLoading}>Cancel at period end</button
								>
							</form>
						{/if}
						<form
							method="POST"
							action="?/endNow"
							use:enhance={adminEnhance}
							class="ml-auto"
							onsubmit={(e) => {
								if (
									!confirm(
										'End this membership right now? Access stops immediately. Refund charges separately below if owed.'
									)
								)
									e.preventDefault();
							}}
						>
							<input type="hidden" name="subscriptionId" value={sub.id} /><button
								class="inline-flex h-[32px] items-center px-2 text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:text-ink disabled:opacity-40"
								disabled={cancelLoading}>End now</button
							>
						</form>
					</div>
				{:else if data.membership?.legacy && data.customer.subscriptionStatus !== 'cancelled'}
					<div class="mt-5 flex flex-wrap gap-2 border-t border-line2 pt-4">
						<a
							href="/admin/orders/migration"
							class="inline-flex h-[32px] items-center border border-line2 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
							>Migrate on the ARB page</a
						>
						<form
							method="POST"
							action="?/cancelSubscription"
							use:enhance={adminEnhance}
							class="ml-auto"
							onsubmit={(e) => {
								if (
									!confirm(
										'Cancel the Authorize.net subscription? The member keeps access to the end of the paid period.'
									)
								)
									e.preventDefault();
							}}
						>
							<button
								class="inline-flex h-[32px] items-center bg-hero-rb px-3 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase hover:brightness-110 disabled:opacity-40"
								disabled={cancelLoading}
								>{cancelLoading ? 'Cancelling…' : 'Cancel ARB subscription'}</button
							>
						</form>
					</div>
				{/if}
			</div>

			{#if data.membership?.invoices?.length}
				<h3 class="mt-6 text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					Periods
				</h3>
				<ul class="mt-2 border-t border-line2 text-[13px]">
					{#each data.membership.invoices as inv (inv.id)}
						<li
							class="grid gap-x-4 border-b border-line2 py-2 md:grid-cols-[220px_120px_minmax(0,1fr)_120px]"
						>
							<span>{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</span>
							<span class="capitalize">{inv.kind} · {inv.status}</span>
							<span class="text-soft"
								>{inv.invoiceNumber || ''}{inv.transId ? ` · txn ${inv.transId}` : ''}{inv.lastError
									? ` · ${inv.lastError}`
									: ''}</span
							>
							<span class="text-right tabular-nums"
								>{formatCurrency(inv.amountCents / 100)}{inv.refundedCents
									? ` (−${formatCurrency(inv.refundedCents / 100)})`
									: ''}</span
							>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
{/if}

<!-- ============ LEDGER ============ -->
{#if data.ledger?.length}
	<section class="overflow-x-clip border-t border-line2">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-[28px] md:px-8">
			<div class="mb-[18px]">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>Payments</span
				>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">
					Every charge, with refunds.
				</h2>
			</div>
			<ul class="border-t border-line2 text-[13px]">
				{#each data.ledger as p (p.id)}
					{@const left = Number(p.amount) - Number(p.refundedAmount)}
					<li
						class="grid gap-x-4 gap-y-2 border-b border-line2 py-3 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center"
					>
						<span class="tabular-nums">{formatDate(p.occurredAt)}</span>
						<span class="min-w-0">
							<span class="font-semibold">{formatCurrency(p.amount)}</span>
							<span class="text-soft">
								· {p.kind.replace('_', ' ')} · txn {p.transId}{p.subscriptionId
									? ` · sub ${p.subscriptionId}`
									: ''}{p.discountAmount > 0
									? ` · ${formatCurrency(p.discountAmount)} off`
									: ''}</span
							>
							{#if Number(p.refundedAmount) > 0}<span class="text-hero-rb">
									· {formatCurrency(p.refundedAmount)} refunded {formatDate(p.refundedAt)}</span
								>{/if}
						</span>
						{#if left > 0.001 && /^\d+$/.test(p.transId)}
							<form
								method="POST"
								action="?/refundTransaction"
								use:enhance={adminEnhance}
								class="flex flex-wrap items-center gap-1"
								onsubmit={(e) => {
									if (
										!confirm(
											`Refund ${formatCurrency(e.currentTarget.amount.value)} of transaction ${p.transId}?`
										)
									)
										e.preventDefault();
								}}
							>
								<input type="hidden" name="transId" value={p.transId} />
								<input
									type="number"
									name="amount"
									step="0.01"
									min="0.01"
									max={left.toFixed(2)}
									value={left.toFixed(2)}
									class="h-[32px] w-[90px] border border-line2 bg-paper px-2 text-[11px] tabular-nums"
								/>
								{#if p.kind.startsWith('sub')}
									<select
										name="subscriptionEffect"
										class="h-[32px] border border-line2 bg-paper py-0 pr-7 pl-2 text-[11px]"
									>
										<option value="keep">keep membership</option>
										<option value="cancel_at_period_end">cancel at period end</option>
										<option value="end_now">end now</option>
									</select>
								{/if}
								<button
									class="inline-flex h-[32px] items-center px-2 text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:text-ink disabled:opacity-40"
									disabled={cancelLoading}>Refund</button
								>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}

{#if data.history?.length}
	<section class="overflow-x-clip border-t border-line2">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-[28px] md:px-8">
			<div class="mb-[18px]">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>History</span
				>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">Membership timeline.</h2>
			</div>
			<ul class="border-t border-line2 text-[12.5px]">
				{#each data.history as h (h.id)}
					<li
						class="grid gap-x-4 border-b border-line2 py-2 md:grid-cols-[170px_140px_minmax(0,1fr)]"
					>
						<span class="text-soft tabular-nums"
							>{formatDate(h.at, { hour: 'numeric', minute: '2-digit' })}</span
						>
						<span class="font-semibold capitalize">{h.kind.replace('_', ' ')}</span>
						<span class="text-soft"
							>{h.reason || ''}{h.meta ? ` ${JSON.stringify(h.meta).slice(0, 160)}` : ''}</span
						>
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}

<!-- ============ ORDER BREAKDOWN ============ -->
<section class="overflow-x-clip border-t border-line2">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[28px] md:px-8">
		<div class="mb-[18px]">
			<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
				Order Breakdown
			</span>
			<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">Where it went.</h2>
		</div>
		<div class="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
			<div class="overflow-hidden border border-line2 p-5">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>Tickets</span
				>
				<div class="ao-cond mt-[6px] text-[30px] leading-none font-black text-ink tabular-nums">
					{data.ordersByType.ticket.count}
					<span class="text-[11.5px] text-fade">orders</span>
				</div>
				<span class="mt-[6px] block text-[9.5px] font-extrabold tracking-[0.18em] uppercase">
					{formatCurrency(data.ordersByType.ticket.total)}
				</span>
			</div>
			<div class="overflow-hidden border border-line2 p-5">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>Courses</span
				>
				<div class="ao-cond mt-[6px] text-[30px] leading-none font-black text-ink tabular-nums">
					{data.ordersByType.course.count}
					<span class="text-[11.5px] text-fade">orders</span>
				</div>
				<span class="mt-[6px] block text-[9.5px] font-extrabold tracking-[0.18em] uppercase">
					{formatCurrency(data.ordersByType.course.total)}
				</span>
			</div>
			<div class="overflow-hidden border border-line2 p-5">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>Subscriptions</span
				>
				<div class="ao-cond mt-[6px] text-[30px] leading-none font-black text-ink tabular-nums">
					{data.ordersByType.subscription.count}
					<span class="text-[11.5px] text-fade">orders</span>
				</div>
				<span class="mt-[6px] block text-[9.5px] font-extrabold tracking-[0.18em] uppercase">
					{formatCurrency(data.ordersByType.subscription.total)}
				</span>
			</div>
		</div>
	</div>
</section>

<!-- ============ TABS ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
		<div class="mb-[24px] flex gap-1 border-b border-line2">
			<button
				onclick={() => (activeTab = 'orders')}
				class="relative px-[16px] py-[12px] text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab ===
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
				class="relative px-[16px] py-[12px] text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab ===
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
					class="relative px-[16px] py-[12px] text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab ===
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
			<div class="overflow-hidden border border-line2">
				{#if data.orders.length === 0}
					<div class="p-12 text-center">
						<p class="font-newsreader text-[17px] text-soft italic">No orders found.</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full min-w-[720px]">
							<thead class="border-b border-line2">
								<tr class="text-left">
									<th
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Date</th
									>
									<th
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Type</th
									>
									<th
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Description</th
									>
									<th
										class="px-4 py-[12px] text-right text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Amount</th
									>
									<th class="px-5 py-[12px]"></th>
								</tr>
							</thead>
							<tbody>
								{#each data.orders as order (order.id)}
									<tr class="border-b border-line2 transition-colors hover:bg-paper">
										<td class="px-4 py-[12px] text-[11.5px] text-fade">
											{formatDate(order.createdAt)}
										</td>
										<td class="px-5 py-[14px]">
											<span
												class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {orderTypeChip(
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
											class="px-5 py-[14px] text-right text-[15px] font-semibold text-prem tabular-nums"
										>
											{formatCurrency(order.amount)}
										</td>
										<td class="px-5 py-[14px] text-right">
											<a
												href="/admin/orders/{order.id}"
												class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase transition-colors hover:text-ink"
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
			<div class="overflow-hidden border border-line2">
				{#if data.tickets.length === 0}
					<div class="p-12 text-center">
						<p class="font-newsreader text-[17px] text-soft italic">No tickets found.</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full min-w-[860px]">
							<thead class="border-b border-line2">
								<tr class="text-left">
									<th
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Event</th
									>
									<th
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Ticket Code</th
									>
									<th
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Player</th
									>
									<th
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Date</th
									>
									<th
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Status</th
									>
								</tr>
							</thead>
							<tbody>
								{#each data.tickets as { ticket, event } (ticket.id)}
									<tr class="border-b border-line2 transition-colors hover:bg-paper">
										<td class="px-5 py-[14px] font-newsreader text-[15px] font-semibold">
											{event?.title || 'Unknown Event'}
										</td>
										<td class="px-5 py-[14px]">
											<code
												class="inline-block border border-line2 bg-paper px-[8px] py-[3px] text-[12.5px] font-medium text-warm"
											>
												{ticket.code}
											</code>
										</td>
										<td class="px-5 py-[14px] font-newsreader text-[15px]">
											{ticket.firstName}
											{ticket.lastName}
											{#if ticket.gemId}
												<span class="ml-2 text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
													>GEM · {ticket.gemId}</span
												>
											{/if}
										</td>
										<td class="px-4 py-[12px] text-[11.5px] text-fade">
											{formatDate(event?.eventDate)}
										</td>
										<td class="px-5 py-[14px]">
											{#if ticket.refunded}
												<span
													class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-warm"
													>Refunded</span
												>
											{:else if event?.eventDate && new Date(event.eventDate) < new Date()}
												<span
													class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-medium whitespace-nowrap text-ink text-soft capitalize before:block before:h-[7px] before:w-[7px] before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-['']"
													>Past Event</span
												>
											{:else}
												<span
													class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-prem"
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
			<div class="overflow-hidden border border-line2">
				{#if data.entitlements.length === 0}
					<div class="p-12 text-center">
						<p class="font-newsreader text-[17px] text-soft italic">No courses purchased.</p>
					</div>
				{:else}
					<div>
						{#each data.entitlements as ent (ent.id || ent.product + ent.createdAt)}
							<div
								class="flex items-center justify-between border-b border-line2 p-5 last:border-b-0"
							>
								<div>
									<p class="font-newsreader text-[16px] font-semibold">{ent.product}</p>
									<p class="mt-[4px] text-[11.5px] text-fade">
										Purchased {formatDate(ent.createdAt)}
									</p>
								</div>
								<span
									class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-prem"
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
