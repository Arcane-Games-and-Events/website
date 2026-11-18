<script>
	/**
	 * One order in admin, in the same register as a member's page: the
	 * receipt (amount, status, type) beside who paid, what was bought
	 * (the ticket, the course and its guides, or the membership), the
	 * record (IDs), and the refund, confirmed in a dialog.
	 */
	import AdminHeader from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

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
	const dateTime = (date) =>
		date
			? new Date(date).toLocaleString('en-US', {
					weekday: 'short',
					month: 'long',
					day: 'numeric',
					year: 'numeric',
					hour: 'numeric',
					minute: '2-digit'
				})
			: '—';

	const o = $derived(data.order);
	const t = $derived(o.meta?.type);
	const rel = $derived(data.relatedData);
	const c = $derived(data.customer);
	const isRefunded = $derived(rel?.ticket?.refunded || false);

	const TYPE = {
		ticket: { word: 'Ticket', tone: 'var(--color-warm)' },
		course: { word: 'Course', tone: 'var(--color-gold)' },
		subscription: { word: 'Membership', tone: 'var(--color-prem)' }
	};
	const type = $derived(TYPE[t] || { word: 'Payment', tone: 'var(--color-ink)' });
	const tone = $derived(isRefunded ? 'var(--color-hero-rb)' : type.tone);

	// Who paid, as on the Members list.
	const KIND = {
		paying: { label: 'Paying', tone: 'var(--color-prem)', ink: 'text-white' },
		comp: { label: 'Comped', tone: 'var(--color-gold)', ink: 'text-ink' },
		admin: { label: 'Admin', tone: 'var(--color-ink)', ink: 'text-paper-bg' },
		free: { label: 'Free', tone: 'var(--color-line2)', ink: 'text-ink' },
		guest: { label: 'No account', tone: 'var(--color-line2)', ink: 'text-ink' }
	};
	const K = $derived(
		KIND[
			!c
				? 'guest'
				: c.role === 'admin'
					? 'admin'
					: c.role === 'premium'
						? c.subscriptionId
							? 'paying'
							: 'comp'
						: 'free'
		]
	);
	const who = $derived(c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '');
	const initials = $derived(
		c
			? `${(c.firstName || '')[0] || ''}${(c.lastName || '')[0] || ''}`.toUpperCase() || '?'
			: (o.userEmail || '?')[0].toUpperCase()
	);

	const sectionTitle = 'ao-cond text-[36px] leading-none font-black uppercase md:text-[44px]';
	const ticketState = $derived(
		rel?.ticket
			? rel.ticket.refunded
				? {
						word: `Refunded${rel.ticket.refundedAt ? ` ${day(rel.ticket.refundedAt)}` : ''}`,
						tone: 'text-hero-rb'
					}
				: rel.ticket.checkedIn
					? { word: 'Checked in', tone: 'text-prem' }
					: { word: 'Valid', tone: 'text-prem' }
			: null
	);
	const consequences = $derived(
		t === 'ticket'
			? 'The ticket is marked refunded and won’t get them in.'
			: t === 'course'
				? 'Their access to the course is taken away.'
				: t === 'subscription'
					? 'The membership is cancelled and they go back to Free.'
					: ''
	);
	const pop = () =>
		prefersReducedMotion.current ? { duration: 0 } : { duration: 160, start: 0.96 };
</script>

<svelte:head><title>Order · {o.id.slice(0, 8)} · Admin</title></svelte:head>

<AdminHeader
	trail={[{ href: '/admin/orders', label: 'Orders' }]}
	title="Order {o.id.slice(0, 8)}"
	subtitle="{type.word} · {dateTime(o.createdAt)}"
/>
<AdminTabs />

{#if refundSuccess}
	<AdminNotice tone="success" message={refundSuccess} ondismiss={() => (refundSuccess = '')} />
{/if}
{#if refundError}
	<AdminNotice tone="error" message={refundError} ondismiss={() => (refundError = '')} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8">
	<!-- ============ RECEIPT + WHO PAID ============ -->
	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
		<section class="border border-l-[6px] border-line2 bg-white" style="border-left-color: {tone}">
			<div class="flex flex-wrap items-start justify-between gap-4 p-5 md:p-7">
				<div>
					<p class="flex flex-wrap items-center gap-2">
						<span
							class="px-2 py-[3px] text-[10px] font-extrabold tracking-[0.16em] text-white uppercase"
							style="background: {type.tone}">{type.word}</span
						>
						<span
							class="px-2 py-[3px] text-[10px] font-extrabold tracking-[0.16em] uppercase {isRefunded
								? 'bg-hero-rb text-white'
								: 'border border-prem text-prem'}">{isRefunded ? 'Refunded' : 'Paid'}</span
						>
					</p>
					<p
						class="ao-cond mt-4 text-[64px] leading-[0.85] font-black tabular-nums md:text-[84px] {isRefunded
							? 'text-fade line-through decoration-[4px]'
							: ''}"
					>
						{money(o.amount)}
					</p>
					<p class="mt-3 text-[13px] text-soft">{dateTime(o.createdAt)}</p>
				</div>
				<p class="max-w-[260px] text-right font-newsreader text-[18px] leading-snug font-semibold">
					{o.meta?.eventTitle ||
						rel?.course?.title ||
						o.meta?.courseTitle ||
						o.meta?.product ||
						(o.meta?.subscriptionType ? `${o.meta.subscriptionType} membership` : '')}
				</p>
			</div>
		</section>

		<section class="flex flex-col border border-line2 bg-white">
			<div class="flex items-center gap-4 p-5">
				<span
					class="ao-cond flex h-[60px] w-[60px] shrink-0 items-center justify-center text-[26px] leading-none font-black {K.ink}"
					style="background: {K.tone}"
					aria-hidden="true">{initials}</span
				>
				<span class="min-w-0">
					<span class={F.label}>Who paid</span>
					<span class="block truncate font-newsreader text-[18px] leading-tight font-semibold"
						>{who || o.userEmail}</span
					>
					{#if who}<span class="block truncate text-[12px] text-fade">{o.userEmail}</span>{/if}
					<span class="mt-1.5 flex items-center gap-2">
						<span
							class="px-1.5 py-[2px] text-[9px] font-extrabold tracking-[0.14em] uppercase {K.ink}"
							style="background: {K.tone}">{K.label}</span
						>
						{#if c?.gemId}<span class="font-mono text-[11px] text-soft">GEM {c.gemId}</span>{/if}
					</span>
				</span>
			</div>
			<a
				href="/admin/customers/{c?.id || encodeURIComponent(o.userEmail)}"
				class="mt-auto flex h-[46px] items-center justify-between border-t border-line2 px-5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
				>Open their page <span aria-hidden="true">→</span></a
			>
		</section>
	</div>

	<!-- ============ WHAT WAS BOUGHT ============ -->
	<section class="mt-14">
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
			<h2 class={sectionTitle}>What was bought</h2>
			<span class="text-[12px] text-soft">{type.word}</span>
		</div>

		{#if t === 'ticket'}
			{@const ev = rel?.event}
			{@const tk = rel?.ticket}
			<div
				class="mt-5 grid border border-line2 bg-white md:grid-cols-[120px_minmax(0,1fr)]"
				style="--tone: {tone}"
			>
				<span
					class="flex items-center gap-3 p-4 text-white md:flex-col md:justify-center md:gap-1"
					style="background: {tone}"
				>
					<span class="text-[10px] font-extrabold tracking-[0.18em] uppercase opacity-85"
						>{ev?.eventDate
							? new Date(ev.eventDate).toLocaleDateString('en-US', {
									timeZone: 'UTC',
									month: 'short'
								})
							: 'TBD'}</span
					>
					<span class="ao-cond text-[48px] leading-none font-black tabular-nums"
						>{ev?.eventDate ? new Date(ev.eventDate).getUTCDate() : '—'}</span
					>
					<span class="text-[10px] font-bold uppercase opacity-85"
						>{ev?.eventDate
							? new Date(ev.eventDate).toLocaleDateString('en-US', {
									timeZone: 'UTC',
									weekday: 'long'
								})
							: ''}</span
					>
				</span>
				<div class="p-5 md:p-6">
					<p class="ao-cond text-[30px] leading-[0.95] font-black uppercase md:text-[38px]">
						{o.meta?.eventTitle || ev?.title || 'Event'}
					</p>
					{#if ev?.location}<p class="mt-1.5 text-[13px] text-soft">{ev.location}</p>{/if}
					<dl
						class="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line2 pt-4 sm:grid-cols-4"
					>
						{#if tk}
							<div>
								<dt class={F.label}>Player</dt>
								<dd class="font-newsreader text-[16px] font-semibold">
									{tk.firstName}
									{tk.lastName}
								</dd>
							</div>
						{/if}
						{#if o.meta?.ticketCode || tk?.code}
							<div>
								<dt class={F.label}>Ticket code</dt>
								<dd>
									<code class="border border-line2 bg-paper px-2 py-0.5 text-[13px] text-warm"
										>{o.meta?.ticketCode || tk?.code}</code
									>
								</dd>
							</div>
						{/if}
						{#if o.meta?.gemId || tk?.gemId}
							<div>
								<dt class={F.label}>GEM ID</dt>
								<dd class="font-mono text-[13px]">{o.meta?.gemId || tk?.gemId}</dd>
							</div>
						{/if}
						{#if ticketState}
							<div>
								<dt class={F.label}>Ticket</dt>
								<dd
									class="text-[11px] font-extrabold tracking-[0.14em] uppercase {ticketState.tone}"
								>
									{ticketState.word}
								</dd>
							</div>
						{/if}
					</dl>
					{#if ev?.id}
						<a
							href="/admin/events/{ev.id}"
							class="mt-5 inline-flex text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
							>Open the event →</a
						>
					{/if}
				</div>
			</div>
		{:else if t === 'course'}
			<div
				class="mt-5 border border-l-[4px] border-line2 bg-white p-5 md:p-6"
				style="border-left-color: {type.tone}"
			>
				<div class="flex flex-wrap items-start justify-between gap-4">
					<p class="ao-cond text-[30px] leading-[0.95] font-black uppercase md:text-[38px]">
						{#if rel?.course}
							<a href="/classroom/courses/{rel.course.id}" class="hover:text-warm"
								>{rel.course.title}</a
							>
						{:else}
							{o.meta?.courseTitle || 'A deleted course'}
						{/if}
					</p>
					{#if rel?.enrollment && !rel.enrollment.revokedAt}
						<span
							class="border border-prem px-2 py-[3px] text-[10px] font-extrabold tracking-[0.16em] text-prem uppercase"
							>Access active</span
						>
					{:else}
						<span
							class="bg-hero-rb px-2 py-[3px] text-[10px] font-extrabold tracking-[0.16em] text-white uppercase"
							>Access revoked</span
						>
					{/if}
				</div>

				{#if rel?.guides?.length}
					<!-- A guides order (the Partner model): each guide on its own. -->
					<p class="{F.label} mt-6">Guides in this order</p>
					<ul class="flex flex-col gap-2">
						{#each rel.guides as g (g.itemId)}
							{@const done = g.sale && g.sale.status !== 'paid'}
							<li
								class="flex flex-wrap items-center justify-between gap-3 border border-l-[4px] border-line2 bg-paper/40 px-4 py-3"
								style="border-left-color: {done ? 'var(--color-hero-rb)' : 'var(--color-gold)'}"
							>
								<div class="min-w-0">
									<p class="font-newsreader text-[16px] font-semibold">{g.title}</p>
									<p class="mt-0.5 text-[12px] text-fade tabular-nums">
										Paid {money(g.paidCents / 100)} · list {money(g.listCents / 100)}
										{#if g.sale}
											· teacher {money(g.sale.teacherCents / 100)} ({g.sale.level}, copy #{g.sale
												.copyNumber})
										{/if}
									</p>
								</div>
								<span class="flex items-center gap-2">
									{#if g.sale}
										<span
											class="text-[10px] font-extrabold tracking-[0.14em] uppercase {g.sale
												.status === 'paid'
												? 'text-prem'
												: 'text-hero-rb'}">{g.sale.status.replace('_', ' ')}</span
										>
									{/if}
									{#if g.sale?.status === 'paid'}
										<form method="POST" action="?/refundGuide" use:enhance={guideAction}>
											<input type="hidden" name="itemId" value={g.itemId} />
											<button
												class="h-[36px] border border-hero-rb bg-white px-3 text-[9.5px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:bg-hero-rb hover:text-white"
												onclick={(e) => {
													if (!confirm(`Refund ${g.title} (${money(g.paidCents / 100)})?`))
														e.preventDefault();
												}}>Refund guide</button
											>
										</form>
										<form method="POST" action="?/chargeback" use:enhance={guideAction}>
											<input type="hidden" name="itemId" value={g.itemId} />
											<button
												class="h-[36px] border border-line2 bg-white px-3 text-[9.5px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
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
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				{/if}

				{#if rel?.evidence}
					{@const e = rel.evidence}
					<!-- Dispute evidence: what the buyer agreed to, and when they opened each guide. -->
					<div class="mt-6 border border-dashed border-line2 bg-paper/50 p-4 text-[12.5px]">
						<div class="flex items-baseline justify-between gap-3">
							<span class={F.label}>Dispute evidence</span>
							<a
								href="/admin/orders/{o.id}/evidence"
								class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
								>Download summary ↓</a
							>
						</div>
						{#if e.consent?.given}
							<p>
								Agreed to the refund policy {dateTime(e.consent.at)}{e.consent.ip
									? ` from ${e.consent.ip}`
									: ''}:
							</p>
							<p class="mt-1 text-soft italic">“{e.consent.text}”</p>
						{:else}
							<p class="text-soft">No refund-policy consent recorded for this order.</p>
						{/if}
						<ul class="mt-2 space-y-1">
							{#each e.guides as g, i (g.itemId || i)}
								<li>
									<span class="font-semibold">{g.title}</span>: {g.firstOpenedAt
										? `first opened ${day(g.firstOpenedAt)}`
										: 'never opened'}{g.topicsCompleted
										? `, ${g.topicsCompleted} topics completed`
										: ''}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if !rel?.guides?.length && rel?.legacySale?.status === 'paid'}
					<form method="POST" action="?/chargeback" use:enhance={guideAction} class="mt-4">
						<button
							class="h-[36px] border border-line2 bg-white px-3 text-[9.5px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
							onclick={(e) => {
								if (!confirm('Record a chargeback for this order?')) e.preventDefault();
							}}>Record chargeback</button
						>
					</form>
				{/if}
			</div>
		{:else if t === 'subscription'}
			<div
				class="mt-5 border border-l-[4px] border-line2 bg-white"
				style="border-left-color: {type.tone}"
			>
				<p class="ao-cond p-5 text-[30px] leading-none font-black uppercase md:p-6 md:text-[38px]">
					{o.meta?.subscriptionType === 'yearly'
						? 'Annual'
						: o.meta?.subscriptionType === 'monthly'
							? 'Monthly'
							: ''} membership
				</p>
				<dl class="grid grid-cols-2 border-t border-line2 sm:grid-cols-3">
					<div class="px-5 py-4 md:px-6">
						<dt class={F.label}>Plan</dt>
						<dd class="font-newsreader text-[17px] font-semibold capitalize">
							{o.meta?.subscriptionType || '—'}
						</dd>
					</div>
					<div class="border-l border-line2 px-5 py-4 md:px-6">
						<dt class={F.label}>Subscription</dt>
						<dd class="font-mono text-[12.5px] break-all">{o.meta?.subscriptionId || '—'}</dd>
					</div>
					<div class="border-t border-line2 px-5 py-4 sm:border-t-0 sm:border-l md:px-6">
						<dt class={F.label}>Their status now</dt>
						<dd
							class="text-[11px] font-extrabold tracking-[0.14em] uppercase {c?.subscriptionStatus ===
							'active'
								? 'text-prem'
								: 'text-soft'}"
						>
							{(c?.subscriptionStatus || 'inactive').replace('_', ' ')}
						</dd>
					</div>
				</dl>
			</div>
		{:else}
			<p
				class="mt-5 border border-dashed border-line2 px-5 py-6 font-newsreader text-[16px] text-soft italic"
			>
				Nothing more is recorded for this kind of order.
			</p>
		{/if}
	</section>

	<!-- ============ THE RECORD ============ -->
	<section class="mt-14">
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
			<h2 class={sectionTitle}>The record</h2>
		</div>
		<dl class="mt-5 grid gap-px border border-line2 bg-line2 sm:grid-cols-2 lg:grid-cols-4">
			{#each [{ label: 'Order ID', value: o.id, mono: true }, { label: 'Transaction ID', value: o.providerRef || '—', mono: true }, { label: 'Provider', value: !o.provider || o.provider === 'authnet' ? 'Authorize.net' : o.provider }, { label: 'Currency', value: o.currency || 'USD' }] as f (f.label)}
				<div class="bg-white px-5 py-4">
					<dt class={F.label}>{f.label}</dt>
					<dd
						class={f.mono
							? 'font-mono text-[12.5px] break-all'
							: 'font-newsreader text-[17px] font-semibold'}
					>
						{f.value}
					</dd>
				</div>
			{/each}
		</dl>
	</section>

	<!-- ============ REFUND ============ -->
	<section class="mt-14">
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-hero-rb pb-3">
			<h2 class="{sectionTitle} text-hero-rb">Refund</h2>
		</div>
		{#if isRefunded || refundSuccess}
			<p
				class="mt-5 border-l-[4px] border-hero-rb bg-hero-rb/[0.06] px-5 py-4 font-newsreader text-[16px]"
			>
				This order has been refunded.
			</p>
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
							refundSuccess = result.data?.message || 'Order refunded';
							await invalidateAll();
						} else if (result.type === 'failure') {
							refundError = result.data?.error || 'The refund didn’t go through';
						}
					};
				}}
				class="mt-5 flex flex-col gap-4 border border-l-[4px] border-line2 border-l-hero-rb bg-white p-5 md:flex-row md:items-center md:justify-between md:p-6"
			>
				<div class="max-w-[640px]">
					<p class="font-newsreader text-[18px] font-semibold">
						Give back {money(o.amount)} to the card it came from.
					</p>
					<p class="mt-1 text-[13px] leading-[1.55] text-soft">
						Through Authorize.net: voided if it hasn’t settled yet, refunded if it has. {consequences}
					</p>
				</div>
				<button
					type="button"
					onclick={() => (showRefundModal = true)}
					disabled={refundLoading}
					class="inline-flex h-[46px] shrink-0 items-center justify-center bg-hero-rb px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-40"
					>{refundLoading ? 'Refunding…' : 'Refund this order →'}</button
				>
			</form>
		{/if}
	</section>
</div>

<!-- ============ CONFIRM ============ -->
{#if showRefundModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: prefersReducedMotion.current ? 0 : 140 }}
	>
		<button
			type="button"
			class="absolute inset-0 bg-ink/70 backdrop-blur-sm"
			onclick={() => (showRefundModal = false)}
			aria-label="Close"
		></button>
		<div
			class="relative w-full max-w-md border border-t-[4px] border-line2 border-t-hero-rb bg-paper-bg"
			role="dialog"
			aria-modal="true"
			aria-labelledby="refund-title"
			transition:scale={pop()}
		>
			<div class="p-6">
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">Refund</p>
				<h3 id="refund-title" class="ao-cond mt-1.5 text-[34px] leading-none font-black uppercase">
					{money(o.amount)} back?
				</h3>
				<p class="mt-2 font-newsreader text-[15px] text-soft italic">It can’t be undone.</p>
				<ul class="mt-5 space-y-2 border-t border-line2 pt-4 text-[13.5px] leading-[1.5]">
					<li class="flex gap-2">
						<span class="text-hero-rb">→</span>Voided or refunded through Authorize.net
					</li>
					<li class="flex gap-2">
						<span class="text-hero-rb">→</span><span
							>{money(o.amount)} back to {who || o.userEmail}</span
						>
					</li>
					{#if consequences}
						<li class="flex gap-2"><span class="text-hero-rb">→</span>{consequences}</li>
					{/if}
				</ul>
			</div>
			<div class="flex gap-2 border-t border-line2 bg-white p-4">
				<button
					type="button"
					onclick={() => (showRefundModal = false)}
					class="inline-flex h-[44px] flex-1 items-center justify-center border border-line2 text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:border-ink"
					>Keep it</button
				>
				<button
					type="button"
					onclick={confirmRefund}
					class="inline-flex h-[44px] flex-1 items-center justify-center bg-hero-rb text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase hover:brightness-110"
					>Yes, refund</button
				>
			</div>
		</div>
	</div>
{/if}
