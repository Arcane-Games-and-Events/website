<script>
	/**
	 * A member's page in admin, in the site's poster register: who they are
	 * and what kind of member (paying, comped, free, admin) up top with the
	 * Access panel, their figures, the membership with its controls, every
	 * payment (refunds behind a button), the membership timeline, where
	 * their money went, and their orders, tickets and courses.
	 */
	import AdminHeader, { btnLine as hbtnLine } from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import MemberAccess from '$lib/components/age/admin/MemberAccess.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';

	let { data, form } = $props();

	const c = $derived(data.customer);
	const m = $derived(data.membership);
	const sub = $derived(m?.subscription);

	let activeTab = $state('orders');
	let editing = $state(false);
	let busy = $state(false);
	let copySuccess = $state(false);
	let refunding = $state(/** @type {string | null} */ (null));

	const motion = (ms) => ({ duration: prefersReducedMotion.current ? 0 : ms, easing: cubicOut });
	const money = (amount) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
	const day = (date, options = {}) =>
		date
			? new Date(date).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
					...options
				})
			: '—';
	const DAY = 86400000;

	async function copyEmail() {
		await navigator.clipboard.writeText(data.customerEmail);
		copySuccess = true;
		setTimeout(() => (copySuccess = false), 2000);
	}

	// What kind of member: the colour of the tile, badge and edges.
	const KIND = {
		paying: { label: 'Paying', tone: 'var(--color-prem)', ink: 'text-white' },
		comp: { label: 'Comped', tone: 'var(--color-gold)', ink: 'text-ink' },
		admin: { label: 'Admin', tone: 'var(--color-ink)', ink: 'text-paper-bg' },
		team: { label: 'Team', tone: 'var(--color-warm)', ink: 'text-white' },
		free: { label: 'Free', tone: 'var(--color-line2)', ink: 'text-ink' },
		guest: { label: 'No account', tone: 'var(--color-line2)', ink: 'text-ink' }
	};
	const kind = $derived(
		!c
			? 'guest'
			: c.role === 'admin'
				? 'admin'
				: c.role === 'premium'
					? c.subscriptionId
						? 'paying'
						: 'comp'
					: c.role === 'writer'
						? 'team'
						: 'free'
	);
	const K = $derived(KIND[kind]);
	const REASON = {
		staff: 'Staff',
		writer: 'Writer',
		teacher: 'Teacher',
		partner: 'Partner',
		friend: 'Friend',
		trial: 'Trial',
		other: 'Other'
	};
	const compEnd = $derived(c?.compEndsOn ? new Date(`${c.compEndsOn}T12:00:00Z`) : null);
	const compLeft = $derived(compEnd ? Math.ceil((compEnd.getTime() - Date.now()) / DAY) : null);
	const initials = $derived(
		c
			? `${(c.firstName || '')[0] || ''}${(c.lastName || '')[0] || ''}`.toUpperCase() || '?'
			: (data.customerEmail || '?')[0].toUpperCase()
	);
	const fullName = $derived(
		c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Member' : 'Guest customer'
	);
	const kindLine = $derived(
		kind === 'paying'
			? `${sub?.plan === 'yearly' || c?.subscriptionType === 'yearly' ? 'Annual' : 'Monthly'} membership`
			: kind === 'comp'
				? `${REASON[c.compReason] || 'Reason not recorded'} comp`
				: kind === 'admin'
					? 'Full access'
					: kind === 'team'
						? 'Writer (old role)'
						: kind === 'free'
							? 'No membership'
							: 'Bought without an account'
	);

	const STATUS = {
		active: { word: 'Active', tone: 'var(--color-prem)' },
		past_due: { word: 'Past due', tone: 'var(--color-hero-rb)' },
		payment_failed: { word: 'Payment failed', tone: 'var(--color-hero-rb)' },
		cancelled: { word: 'Cancelled', tone: 'var(--color-gold)' },
		expired: { word: 'Expired', tone: 'var(--color-fade)' },
		ended: { word: 'Ended', tone: 'var(--color-fade)' }
	};
	const statusOf = (s) =>
		STATUS[s] || { word: (s || 'None').replace('_', ' '), tone: 'var(--color-fade)' };

	const adminEnhance = () => {
		busy = true;
		return async ({ update }) => {
			busy = false;
			refunding = null;
			await update();
			await invalidateAll();
		};
	};

	// The membership timeline, in words.
	const EVENT = {
		subscribed: { word: 'Joined Premium', tone: 'var(--color-prem)' },
		resumed: { word: 'Billing resumed', tone: 'var(--color-prem)' },
		cancelled: { word: 'Cancelled', tone: 'var(--color-gold)' },
		expired: { word: 'Membership ended', tone: 'var(--color-hero-rb)' },
		payment_failed: { word: 'Payment failed', tone: 'var(--color-hero-rb)' },
		comped: { word: 'Comped', tone: 'var(--color-gold)' },
		comp_removed: { word: 'Comp removed', tone: 'var(--color-fade)' },
		comp_expired: { word: 'Comp ended', tone: 'var(--color-fade)' }
	};
	const eventOf = (h) =>
		h.kind === 'comped' && h.meta?.reasonChanged
			? { word: 'Comp reason changed', tone: 'var(--color-gold)' }
			: EVENT[h.kind] || {
					word: h.kind.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase()),
					tone: 'var(--color-ink)'
				};
	const metaLine = (meta) =>
		meta
			? Object.entries(meta)
					.filter(([k, v]) => k !== 'reasonChanged' && v != null && typeof v !== 'object')
					.map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${v}`)
					.join(' · ')
			: '';

	const TYPE = {
		ticket: { word: 'Ticket', tone: 'var(--color-warm)' },
		course: { word: 'Course', tone: 'var(--color-gold)' },
		subscription: { word: 'Membership', tone: 'var(--color-prem)' }
	};
	const orderTitle = (o) =>
		o.meta?.eventTitle ||
		o.meta?.courseTitle ||
		o.meta?.product ||
		(o.meta?.subscriptionType || o.meta?.plan
			? `${(o.meta.subscriptionType || o.meta.plan) === 'yearly' ? 'Annual' : 'Monthly'} membership`
			: 'Order');
	const typeOf = (t) => TYPE[t] || { word: t || 'Order', tone: 'var(--color-fade)' };
	const spentTotal = $derived(
		(data.ordersByType.ticket.total || 0) +
			(data.ordersByType.course.total || 0) +
			(data.ordersByType.subscription.total || 0)
	);

	const sectionTitle = 'ao-cond text-4xl leading-none font-black uppercase md:text-5xl';
	const smallBtn =
		'inline-flex h-10 items-center border border-line2 bg-white px-3.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:opacity-40';
</script>

<svelte:head>
	<title>{fullName} · Members · Admin</title>
</svelte:head>

<AdminHeader
	trail={[{ href: '/admin/users', label: 'Members' }]}
	title={fullName}
	subtitle={data.customerEmail}
>
	{#snippet actions()}
		<button type="button" onclick={copyEmail} class={hbtnLine}
			>{copySuccess ? 'Copied ✓' : 'Copy email'}</button
		>
	{/snippet}
</AdminHeader>
<AdminTabs />

{#if form?.success}
	<AdminNotice tone="success" message={form.message} />
{/if}
{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}

<div class="mx-auto w-full max-w-page px-5 pt-8 pb-20 md:px-8">
	<!-- ============ WHO ============ -->
	<section
		class="border border-l-6 {kind === 'comp'
			? 'border-gold/40 bg-gold/5'
			: 'border-line2 bg-white'}"
		style="border-left-color: {K.tone}"
	>
		<div class="flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-7 md:p-6">
			<span
				class="ao-cond flex h-19 w-19 shrink-0 items-center justify-center text-4xl leading-none font-black md:h-23 md:w-23 md:text-5xl {K.ink}"
				style="background: {K.tone}"
				aria-hidden="true">{initials}</span
			>
			<div class="min-w-0 flex-1">
				<p class="flex flex-wrap items-center gap-2.5">
					<span
						class="px-2 py-1 text-xs font-extrabold tracking-widest uppercase {K.ink}"
						style="background: {K.tone}">{K.label}</span
					>
					<span class="font-newsreader text-xl font-semibold">{kindLine}</span>
				</p>
				{#if kind === 'comp'}
					<p
						class="mt-1.5 text-sm {compLeft !== null && compLeft <= 14
							? 'font-semibold text-hero-rb'
							: 'text-soft'}"
					>
						{c.compedAt ? `Comped since ${day(c.compedAt)} · ` : ''}{compEnd
							? `ends ${day(compEnd, { timeZone: 'UTC', month: 'long' })} · ${compLeft} ${compLeft === 1 ? 'day' : 'days'} left`
							: 'no end date'}
					</p>
				{/if}
				<p class="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-soft">
					{#if c?.gemId}<span class="border border-line2 bg-white px-2 py-0.5 font-mono text-xs"
							>GEM {c.gemId}</span
						>{/if}
					{#each c?.additionalRoles || [] as r (r)}<span
							class="border border-line2 bg-white px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase"
							>{r}</span
						>{/each}
					<span class="ml-1"
						>{c
							? `Member since ${day(c.createdAt)}`
							: data.stats.firstOrder
								? `First order ${day(data.stats.firstOrder.createdAt)}`
								: ''}</span
					>
				</p>
			</div>
			{#if c}
				<button
					type="button"
					onclick={() => (editing = !editing)}
					aria-expanded={editing}
					class="inline-flex h-11 shrink-0 items-center gap-2 px-5 text-xs font-extrabold tracking-widest uppercase transition-colors {editing
						? 'bg-ink text-paper-bg'
						: 'border border-ink bg-white hover:bg-ink hover:text-paper-bg'}"
					>{editing ? 'Close' : 'Change access'}</button
				>
			{/if}
		</div>
		{#if c && editing}
			<MemberAccess
				member={{
					id: c.id,
					firstName: c.firstName,
					role: c.role,
					subscriptionId: c.subscriptionId,
					compReason: c.compReason,
					compEndsOn: c.compEndsOn
				}}
				action="?/updateRole"
				onclose={() => (editing = false)}
			/>
		{/if}
	</section>

	<!-- ============ FIGURES ============ -->
	<div class="mt-8">
		<Figures
			cols="md:grid-cols-4"
			items={[
				{ label: 'Lifetime value', value: money(data.stats.totalSpent), tone: 'text-prem' },
				{ label: 'Orders', value: String(data.stats.totalOrders) },
				{ label: 'Average order', value: money(data.stats.avgOrderValue) },
				{ label: 'Active tickets', value: String(data.activeTicketsCount) }
			]}
		/>
	</div>

	<!-- ============ MEMBERSHIP ============ -->
	{#if c && (sub || m?.legacy || m?.comp || c.subscriptionId || c.subscriptionStatus)}
		{@const st = statusOf(sub ? sub.status : c.subscriptionStatus)}
		<section class="mt-14">
			<div class="flex flex-wrap items-end justify-between gap-3 border-b-3 border-ink pb-3">
				<h2 class={sectionTitle}>Membership</h2>
				{#if sub?.legacyArbId}<span class="text-xs text-fade"
						>migrated from ARB {sub.legacyArbId}{sub.legacyArbCancelledAt
							? ''
							: ' · ARB not yet cancelled'}</span
					>{/if}
			</div>

			<div
				class="mt-5 border border-l-4 border-line2 bg-white"
				style="border-left-color: {sub || m?.legacy ? st.tone : K.tone}"
			>
				<div class="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 md:px-6">
					<div>
						<p class="ao-cond text-3xl leading-none font-black uppercase md:text-4xl">
							{#if sub}{sub.plan === 'yearly' ? 'Annual' : 'Monthly'} · {money(
									sub.priceCents / 100
								)}{:else if m?.legacy}Old Authorize.net subscription{:else if m?.comp}Complimentary{:else}Membership{/if}
						</p>
						{#if !sub && m?.comp}
							<p class="mt-1.5 text-sm text-soft">
								{REASON[c.compReason] || 'Reason not recorded'} comp · {compEnd
									? `ends ${day(compEnd, { timeZone: 'UTC', month: 'long' })}`
									: 'no end date'}.
								<button
									type="button"
									class="font-semibold underline"
									onclick={() => (editing = true)}>Change it</button
								>
							</p>
						{/if}
					</div>
					{#if sub || m?.legacy || c.subscriptionStatus}
						<span
							class="px-2 py-1 text-xs font-extrabold tracking-widest text-white uppercase"
							style="background: {st.tone}">{st.word}{sub?.hold ? ' · held' : ''}</span
						>
					{/if}
				</div>

				{#if sub || m?.legacy || c.subscriptionId}
					<dl class="mt-5 grid grid-cols-2 border-t border-line2 sm:grid-cols-4">
						{#each [{ label: 'Started', value: day(sub ? sub.startedAt : c.subscriptionStartDate) }, { label: 'Paid through', value: day(sub ? sub.currentPeriodEnd : c.subscriptionEndDate || c.nextBillingDate) }, { label: 'Next charge', value: sub ? (sub.status === 'past_due' ? `retry ${day(sub.nextAttemptAt)}` : day(sub.nextChargeAt)) : day(c.nextBillingDate) }, { label: 'Card', value: m?.card ? `${m.card.brand} •••• ${m.card.lastFour}` : '—' }] as f, i (f.label)}
							<div
								class="border-line2 px-5 py-4 md:px-6 {i % 2 ? 'border-l' : ''} {i > 1
									? 'border-t sm:border-t-0'
									: ''} {i ? 'sm:border-l' : ''}"
							>
								<dt class={F.label}>{f.label}</dt>
								<dd class="font-newsreader text-lg font-semibold">{f.value}</dd>
							</div>
						{/each}
					</dl>
				{:else}
					<div class="h-5"></div>
				{/if}
				{#if sub?.pendingPlan}<p class="border-t border-line2 px-5 py-3 text-xs text-soft md:px-6">
						Switching to {sub.pendingPlan} at {money(sub.pendingPriceCents / 100)} on {day(
							sub.currentPeriodEnd
						)}.
					</p>{/if}
				{#if sub?.flags?.length}<p
						class="border-t border-line2 bg-gold/10 px-5 py-3 text-xs md:px-6"
					>
						Flags: {sub.flags.join(', ')}
					</p>{/if}

				{#if sub && m.live}
					<div
						class="flex flex-wrap items-center gap-2 border-t border-line2 bg-paper/60 px-5 py-3 md:px-6"
					>
						{#if sub.status === 'past_due' || (sub.status === 'active' && sub.nextChargeAt && new Date(sub.nextChargeAt) <= new Date())}
							<form method="POST" action="?/chargeNow" use:enhance={adminEnhance}>
								<input type="hidden" name="subscriptionId" value={sub.id} /><button
									class="inline-flex h-10 items-center bg-ink px-4 text-xs font-extrabold tracking-widest text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
									disabled={busy}>Charge now</button
								>
							</form>
						{/if}
						<form method="POST" action="?/extend" use:enhance={adminEnhance} class="flex">
							<input type="hidden" name="subscriptionId" value={sub.id} />
							<label class="sr-only" for="extend-days">Days to add</label>
							<input
								id="extend-days"
								type="number"
								name="days"
								min="1"
								max="366"
								value="30"
								class="h-10 w-17 border border-r-0 border-line2 bg-white px-2 text-sm tabular-nums"
							/><button class={smallBtn} disabled={busy}>Add days</button>
						</form>
						<form method="POST" action="?/hold" use:enhance={adminEnhance}>
							<input type="hidden" name="subscriptionId" value={sub.id} /><input
								type="hidden"
								name="hold"
								value={sub.hold ? '0' : '1'}
							/><button class={smallBtn} disabled={busy}
								>{sub.hold ? 'Lift billing hold' : 'Hold billing'}</button
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
								<button class={smallBtn} disabled={busy}>Cancel at period end</button>
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
								class="inline-flex h-10 items-center px-2 text-xs font-extrabold tracking-widest text-hero-rb uppercase hover:underline disabled:opacity-40"
								disabled={busy}>End now</button
							>
						</form>
					</div>
				{:else if m?.legacy && c.subscriptionStatus !== 'cancelled'}
					<div
						class="flex flex-wrap items-center gap-2 border-t border-line2 bg-paper/60 px-5 py-3 md:px-6"
					>
						<a href="/admin/orders/migration" class={smallBtn}>Migrate on the ARB page</a>
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
								class="inline-flex h-10 items-center bg-hero-rb px-4 text-xs font-extrabold tracking-widest text-white uppercase hover:brightness-110 disabled:opacity-40"
								disabled={busy}>{busy ? 'Cancelling…' : 'Cancel ARB subscription'}</button
							>
						</form>
					</div>
				{/if}
			</div>

			{#if m?.invoices?.length}
				<p class="{F.label} mt-7">Periods</p>
				<ul class="border-t border-line2">
					{#each m.invoices as inv (inv.id)}
						<li
							class="grid gap-x-4 gap-y-0.5 border-b border-line2 py-3 text-sm md:grid-cols-[240px_150px_minmax(0,1fr)_140px] md:items-center"
						>
							<span class="font-semibold tabular-nums"
								>{day(inv.periodStart)} – {day(inv.periodEnd)}</span
							>
							<span
								class="text-xs font-extrabold tracking-widest uppercase {inv.status === 'paid'
									? 'text-prem'
									: inv.status === 'failed'
										? 'text-hero-rb'
										: 'text-soft'}">{inv.kind} · {inv.status}</span
							>
							<span class="truncate text-xs text-fade"
								>{inv.invoiceNumber || ''}{inv.transId ? ` · txn ${inv.transId}` : ''}{inv.lastError
									? ` · ${inv.lastError}`
									: ''}</span
							>
							<span class="tabular-nums md:text-right"
								>{money(inv.amountCents / 100)}{#if inv.refundedCents}<span class="text-hero-rb">
										−{money(inv.refundedCents / 100)}</span
									>{/if}</span
							>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	<!-- ============ PAYMENTS ============ -->
	{#if data.ledger?.length}
		<section class="mt-14">
			<div class="flex flex-wrap items-end justify-between gap-3 border-b-3 border-ink pb-3">
				<h2 class={sectionTitle}>Payments</h2>
				<span class="text-xs text-soft">Every charge, with refunds</span>
			</div>
			<ul class="mt-4 flex flex-col gap-2">
				{#each data.ledger as p (p.id)}
					{@const left = Number(p.amount) - Number(p.refundedAmount)}
					{@const refunded = Number(p.refundedAmount) > 0}
					{@const canRefund = left > 0.001 && /^\d+$/.test(p.transId)}
					<li
						class="border border-l-4 border-line2 bg-white"
						style="border-left-color: {refunded
							? 'var(--color-hero-rb)'
							: p.kind.startsWith('sub')
								? 'var(--color-prem)'
								: 'var(--color-warm)'}"
					>
						<div
							class="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[64px_minmax(0,1fr)_auto_auto] md:gap-x-5"
						>
							<span class="flex flex-col items-center leading-none">
								<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
									>{day(p.occurredAt, { month: 'short', day: undefined, year: undefined })}</span
								>
								<span class="ao-cond text-3xl font-black tabular-nums"
									>{new Date(p.occurredAt).getDate()}</span
								>
								<span class="text-xs text-fade">{new Date(p.occurredAt).getFullYear()}</span>
							</span>
							<span class="min-w-0">
								<span class="block text-xs font-extrabold tracking-widest uppercase"
									>{p.kind.replace(/_/g, ' ')}</span
								>
								<span class="mt-0.5 block truncate text-xs text-fade"
									>txn {p.transId}{p.subscriptionId
										? ` · sub ${p.subscriptionId}`
										: ''}{p.discountAmount > 0 ? ` · ${money(p.discountAmount)} off` : ''}</span
								>
								{#if refunded}<span class="mt-0.5 block text-xs font-semibold text-hero-rb"
										>{money(p.refundedAmount)} refunded {day(p.refundedAt)}</span
									>{/if}
							</span>
							<span
								class="ao-cond text-right text-3xl leading-none font-black tabular-nums {refunded &&
								left <= 0.001
									? 'text-fade line-through'
									: ''}">{money(p.amount)}</span
							>
							{#if canRefund}
								<button
									type="button"
									onclick={() => (refunding = refunding === p.id ? null : p.id)}
									aria-expanded={refunding === p.id}
									class="col-span-3 justify-self-start text-xs font-extrabold tracking-widest text-hero-rb uppercase hover:underline md:col-span-1 md:justify-self-end"
									>{refunding === p.id ? 'Close' : 'Refund…'}</button
								>
							{:else}
								<span class="hidden md:block"></span>
							{/if}
						</div>
						{#if canRefund && refunding === p.id}
							<form
								method="POST"
								action="?/refundTransaction"
								use:enhance={adminEnhance}
								class="flex flex-wrap items-end gap-3 border-t border-line2 bg-hero-rb/5 px-4 py-4 md:pl-25"
								style="--cc: var(--color-hero-rb)"
								transition:slide={motion(200)}
								onsubmit={(e) => {
									if (
										!confirm(
											`Refund ${money(e.currentTarget.amount.value)} of transaction ${p.transId}?`
										)
									)
										e.preventDefault();
								}}
							>
								<input type="hidden" name="transId" value={p.transId} />
								<label class="block w-38">
									<span class={F.label}>Amount</span>
									<input
										type="number"
										name="amount"
										step="0.01"
										min="0.01"
										max={left.toFixed(2)}
										value={left.toFixed(2)}
										class="{F.field} tabular-nums"
									/>
								</label>
								{#if p.kind.startsWith('sub')}
									<label class="block w-55">
										<span class={F.label}>The membership</span>
										<select name="subscriptionEffect" class={F.select}>
											<option value="keep">Keep it</option>
											<option value="cancel_at_period_end">Cancel at period end</option>
											<option value="end_now">End it now</option>
										</select>
									</label>
								{/if}
								<button
									class="inline-flex h-12 items-center bg-hero-rb px-5 text-xs font-extrabold tracking-widest text-white uppercase hover:brightness-110 disabled:opacity-40"
									disabled={busy}>{busy ? 'Refunding…' : 'Refund'}</button
								>
								<span class="w-full text-xs text-fade"
									>Up to {money(left)} left on this charge. It goes back to the card it came from.</span
								>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- ============ TIMELINE ============ -->
	{#if data.history?.length}
		<section class="mt-14">
			<div class="flex flex-wrap items-end justify-between gap-3 border-b-3 border-ink pb-3">
				<h2 class={sectionTitle}>Timeline</h2>
				<span class="text-xs text-soft">Their membership, newest first</span>
			</div>
			<ol class="relative mt-5 ml-2 border-l-2 border-line2">
				{#each data.history as h (h.id)}
					{@const ev = eventOf(h)}
					{@const extra = [h.reason ? REASON[h.reason] || h.reason : '', metaLine(h.meta)]
						.filter(Boolean)
						.join(' · ')}
					<li class="relative pb-5 pl-6 last:pb-0">
						<span
							class="absolute top-1.5 -left-2 h-3.5 w-3.5 border-2 border-paper-bg"
							style="background: {ev.tone}"
							aria-hidden="true"
						></span>
						<p class="flex flex-wrap items-baseline gap-x-3">
							<span class="ao-cond text-xl leading-none font-black uppercase [word-spacing:0.12em]"
								>{ev.word}</span
							>
							<span class="text-xs text-fade tabular-nums"
								>{day(h.at, { hour: 'numeric', minute: '2-digit' })}</span
							>
						</p>
						{#if extra}<p class="mt-1 text-xs text-soft">{extra}</p>{/if}
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	<!-- ============ WHERE IT WENT ============ -->
	<section class="mt-14">
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-3 border-ink pb-3">
			<h2 class={sectionTitle}>Where it went</h2>
			<span class="text-xs text-soft"
				>{money(spentTotal)} across {data.stats.totalOrders} orders</span
			>
		</div>
		{#if spentTotal > 0}
			<div class="mt-5 flex h-3 gap-0.5" aria-hidden="true">
				{#each ['ticket', 'course', 'subscription'] as t (t)}
					{#if data.ordersByType[t].total > 0}
						<span style="flex: {data.ordersByType[t].total}; background: {typeOf(t).tone}"></span>
					{/if}
				{/each}
			</div>
		{/if}
		<div class="mt-4 grid gap-3 sm:grid-cols-3">
			{#each [['ticket', 'Tickets'], ['course', 'Courses'], ['subscription', 'Membership']] as [t, label] (t)}
				{@const o = data.ordersByType[t]}
				<div
					class="border border-t-4 border-line2 bg-white p-5"
					style="border-top-color: {typeOf(t).tone}"
				>
					<p class={F.label}>{label}</p>
					<p class="ao-cond text-4xl leading-none font-black tabular-nums">{money(o.total)}</p>
					<p class="mt-1.5 text-xs text-soft">{o.count} {o.count === 1 ? 'order' : 'orders'}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- ============ ORDERS, TICKETS, COURSES ============ -->
	<section class="mt-14">
		<div class="flex gap-1 overflow-x-auto border-b-3 border-ink" role="tablist">
			{#each [{ id: 'orders', label: 'Orders', n: data.orders.length }, { id: 'tickets', label: 'Tickets', n: data.tickets.length }, ...(c ? [{ id: 'courses', label: 'Courses', n: data.entitlements.length }] : [])] as t (t.id)}
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === t.id}
					onclick={() => (activeTab = t.id)}
					class="ao-cond -mb-1 shrink-0 border-b-3 px-1 pr-4 pb-2 text-2xl leading-none font-black uppercase transition-colors md:text-3xl {activeTab ===
					t.id
						? 'border-warm text-ink'
						: 'border-transparent text-fade hover:text-ink'}"
					>{t.label} <span class="text-base tabular-nums opacity-60">{t.n}</span></button
				>
			{/each}
		</div>

		{#if activeTab === 'orders'}
			{#if data.orders.length === 0}
				<p
					class="mt-5 border border-dashed border-line2 px-5 py-6 font-newsreader text-base text-soft italic"
				>
					No orders yet.
				</p>
			{:else}
				<ul class="mt-4 flex flex-col gap-2">
					{#each data.orders as order (order.id)}
						{@const ty = typeOf(order.meta?.type)}
						<li>
							<a
								href="/admin/orders/{order.id}"
								class="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border border-l-4 border-line2 bg-white px-4 py-3 transition-colors hover:border-ink md:grid-cols-[120px_120px_minmax(0,1fr)_auto_24px]"
								style="border-left-color: {ty.tone}"
							>
								<span class="text-xs text-soft tabular-nums">{day(order.createdAt)}</span>
								<span
									class="order-first col-span-2 text-xs font-extrabold tracking-widest uppercase md:order-none md:col-span-1"
									style="color: {ty.tone}">{ty.word}</span
								>
								<span
									class="col-span-2 truncate font-newsreader text-base font-semibold md:col-span-1"
									>{orderTitle(order)}</span
								>
								<span class="ao-cond text-2xl leading-none font-black tabular-nums"
									>{money(order.amount)}</span
								>
								<span
									class="hidden text-warm transition-transform group-hover:translate-x-0.5 md:block"
									aria-hidden="true">→</span
								>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}

		{#if activeTab === 'tickets'}
			{#if data.tickets.length === 0}
				<p
					class="mt-5 border border-dashed border-line2 px-5 py-6 font-newsreader text-base text-soft italic"
				>
					No tickets yet.
				</p>
			{:else}
				<ul class="mt-4 flex flex-col gap-2">
					{#each data.tickets as { ticket, event } (ticket.id)}
						{@const past = event?.eventDate && new Date(event.eventDate) < new Date()}
						{@const state = ticket.refunded ? 'Refunded' : past ? 'Played' : 'Upcoming'}
						<li
							class="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border border-l-4 border-line2 bg-white px-4 py-3 md:grid-cols-[64px_minmax(0,1fr)_160px_110px]"
							style="border-left-color: {ticket.refunded
								? 'var(--color-hero-rb)'
								: past
									? 'var(--color-line2)'
									: 'var(--color-prem)'}"
						>
							<span class="flex flex-col items-center leading-none">
								<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
									>{event?.eventDate
										? new Date(event.eventDate).toLocaleDateString('en-US', {
												timeZone: 'UTC',
												month: 'short'
											})
										: 'TBD'}</span
								>
								<span class="ao-cond text-3xl font-black tabular-nums"
									>{event?.eventDate ? new Date(event.eventDate).getUTCDate() : ''}</span
								>
							</span>
							<span class="min-w-0">
								<span class="block truncate font-newsreader text-base font-semibold"
									>{event?.title || 'Unknown event'}</span
								>
								<span class="mt-0.5 block truncate text-xs text-soft"
									>{ticket.firstName}
									{ticket.lastName}{ticket.gemId ? ` · GEM ${ticket.gemId}` : ''}</span
								>
							</span>
							<code
								class="col-start-2 row-start-2 w-fit border border-line2 bg-paper px-2 py-0.5 text-xs text-warm md:col-start-3 md:row-start-1"
								>{ticket.code}</code
							>
							<span
								class="col-start-3 row-start-1 text-right text-xs font-extrabold tracking-widest uppercase md:col-start-4 {ticket.refunded
									? 'text-hero-rb'
									: past
										? 'text-fade'
										: 'text-prem'}">{state}</span
							>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}

		{#if activeTab === 'courses' && c}
			{#if data.entitlements.length === 0}
				<p
					class="mt-5 border border-dashed border-line2 px-5 py-6 font-newsreader text-base text-soft italic"
				>
					No courses yet.
				</p>
			{:else}
				<ul class="mt-4 grid gap-2 sm:grid-cols-2">
					{#each data.entitlements as ent (ent.id || ent.product + ent.createdAt)}
						<li
							class="flex items-center justify-between gap-4 border border-l-4 border-line2 bg-white px-4 py-3.5"
							style="border-left-color: {ent.active ? 'var(--color-gold)' : 'var(--color-line2)'}"
						>
							<span class="min-w-0">
								<span class="block truncate font-newsreader text-base font-semibold"
									>{ent.product}</span
								>
								<span class="mt-0.5 block text-xs text-fade"
									>{ent.source === 'comp' ? 'Added free' : 'Bought'} {day(ent.createdAt)}</span
								>
							</span>
							<span
								class="shrink-0 text-xs font-extrabold tracking-widest uppercase {ent.active
									? 'text-prem'
									: 'text-hero-rb'}">{ent.active ? 'Active' : 'Revoked'}</span
							>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</section>
</div>
