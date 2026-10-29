<script>
	/**
	 * The member's club page: their standing (status, tenure, where they are
	 * in the current period), what membership gets them, and the controls to
	 * change card, switch plan, cancel or resume.
	 */
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Panel from '$lib/components/account/Panel.svelte';
	import Notice from '$lib/components/account/Notice.svelte';
	import CardFields from '$lib/components/payments/CardFields.svelte';
	import * as ui from '$lib/components/account/ui.js';

	let { data, form } = $props();

	const m = $derived(data.membership);
	const plan = $derived(data.plans.find((p) => p.key === m?.plan));
	const otherPlan = $derived(data.plans.find((p) => p.key !== m?.plan));
	const price = $derived(m ? ui.dollars(m.priceCents) : '');

	let busy = $state('');
	let open = $state(''); // which manage panel is open: card | switch | cancel
	let cardMode = $state('saved');
	let chosenCard = $state('');
	let fields = $state();
	let cardError = $state('');
	let reason = $state('');

	const toggle = (name) => (open = open === name ? '' : name);

	$effect(() => {
		const usable = data.cards.filter((c) => c.usable);
		if (!chosenCard) {
			// Offer a different card than the one on file, if there is one.
			chosenCard = (usable.find((c) => c.id !== data.card?.id) || usable[0])?.id || '';
		}
		if (usable.length === 0) cardMode = 'new';
	});

	const enhanceWith = (name) => () => {
		busy = name;
		return async ({ update }) => {
			busy = '';
			open = '';
			await update();
			await invalidateAll();
		};
	};

	/** Tokenize a new card in the browser before the form submits. */
	const enhanceCard =
		() =>
		async ({ formData, cancel }) => {
			busy = 'card';
			cardError = '';
			if (cardMode === 'new') {
				try {
					const t = await fields.tokenize();
					formData.set('dataDescriptor', t.opaqueData.dataDescriptor);
					formData.set('dataValue', t.opaqueData.dataValue);
					formData.set('expMonth', String(t.expiry.month));
					formData.set('expYear', String(t.expiry.year));
					formData.set('lastFour', t.lastFour);
					formData.set('firstName', t.billTo.firstName);
					formData.set('lastName', t.billTo.lastName);
					formData.set('zip', t.billTo.zip);
					formData.delete('savedCardId');
				} catch (err) {
					cardError = err.message;
					busy = '';
					cancel();
					return;
				}
			}
			return async ({ update }) => {
				busy = '';
				open = '';
				await update();
				await invalidateAll();
			};
		};

	// ---------------------------------------------------------------- standing

	const DAY = 86400000;
	const since = $derived(m?.startedAt || data.legacyUser?.startDate || null);
	const tenure = $derived.by(() => {
		if (!since) return null;
		const days = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / DAY));
		if (days === 0) return 'Joined today';
		if (days < 31) return `${days} day${days === 1 ? '' : 's'}`;
		const months = Math.floor(days / 30.44);
		if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
		const years = Math.floor(months / 12);
		const rest = months % 12;
		return `${years} year${years === 1 ? '' : 's'}${rest ? `, ${rest} month${rest === 1 ? '' : 's'}` : ''}`;
	});

	/** How far through the current period, for the track. */
	const period = $derived.by(() => {
		if (!m?.currentPeriodStart || !m?.currentPeriodEnd) return null;
		const start = new Date(m.currentPeriodStart).getTime();
		const end = new Date(m.currentPeriodEnd).getTime();
		const now = Date.now();
		const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
		const left = Math.max(0, Math.ceil((end - now) / DAY));
		return { start: m.currentPeriodStart, end: m.currentPeriodEnd, pct, left };
	});

	const SEAL = {
		active: { text: 'Active', tone: 'bg-prem text-white' },
		past_due: { text: 'Payment needed', tone: 'bg-hero-rb text-white' },
		cancelled: { text: 'Ending soon', tone: 'bg-gold text-ink' }
	};

	const statusLine = $derived.by(() => {
		if (!m) return '';
		switch (m.status) {
			case 'active':
				return m.pendingPlan
					? `Renews ${ui.date(m.nextChargeAt)} on the ${m.pendingPlan === 'yearly' ? 'annual' : 'monthly'} plan at ${ui.dollars(m.pendingPriceCents)}.`
					: `Renews ${ui.date(m.nextChargeAt)} for ${price}.`;
			case 'past_due':
				return m.nextAttemptAt
					? `Your last payment didn't go through. We'll try again ${ui.date(m.nextAttemptAt)}, and you keep access until ${ui.date(m.graceUntil)}.`
					: `Your last payment didn't go through. Access ends ${ui.date(m.graceUntil)} unless the card is updated.`;
			case 'cancelled':
				return `Cancelled. Nothing more will be charged, and you're a member until ${ui.date(m.currentPeriodEnd)}.`;
			default:
				return '';
		}
	});

	const PERKS = [
		{ href: '/library', title: 'The Library', text: 'Every premium article, deck tech and video.' },
		{ href: '/academy', title: 'The Academy', text: 'Courses from the players who write for us.' },
		{
			href: '/age-open?tab=events',
			title: 'Member ticket price',
			text: 'Money off your own ticket to every AGE Open.'
		},
		{
			href: '/account/referrals',
			title: 'Bring a friend',
			text: 'Your referral code earns you a free month.'
		}
	];
</script>

<svelte:head><title>Membership — AGE</title></svelte:head>

{#snippet seal(text, tone)}
	<span
		class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-extrabold tracking-[0.18em] uppercase {tone}"
		><span aria-hidden="true">◆</span>{text}</span
	>
{/snippet}

{#snippet corners()}
	{#each ['-top-[7px] -left-[7px]', '-top-[7px] -right-[7px]', '-bottom-[7px] -left-[7px]', '-bottom-[7px] -right-[7px]'] as pos (pos)}
		<span
			class="pointer-events-none absolute {pos} bg-paper-bg px-[2px] text-[11px] leading-none text-warm"
			aria-hidden="true">◆</span
		>
	{/each}
{/snippet}

{#snippet perks(dim = false)}
	<section class="mt-12">
		<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
			<h3
				class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
			>
				<span class="text-[8px] text-prem">◆</span>What membership gets you
			</h3>
		</div>
		<ol
			class="mt-5 grid gap-px border border-line2 bg-line2 sm:grid-cols-2 {dim ? 'opacity-70' : ''}"
		>
			{#each PERKS as p, i (p.href)}
				<li class="bg-paper-bg">
					<a
						href={p.href}
						class="group flex h-full items-start gap-4 px-5 py-5 transition-colors hover:bg-paper"
					>
						<span class="ao-cond text-[34px] leading-none font-black text-prem tabular-nums"
							>{String(i + 1).padStart(2, '0')}</span
						>
						<span class="min-w-0">
							<span
								class="block font-newsreader text-[19px] leading-tight font-semibold group-hover:text-warm"
								>{p.title}
								<span
									class="inline-block text-[14px] text-warm transition-transform group-hover:translate-x-1"
									aria-hidden="true">→</span
								></span
							>
							<span class="mt-1 block text-[13px] leading-snug text-soft">{p.text}</span>
						</span>
					</a>
				</li>
			{/each}
		</ol>
	</section>
{/snippet}

<Panel
	rubric="Membership"
	title={m || data.legacy || data.comp ? 'Your membership' : 'Join the club'}
	lead={m || data.legacy || data.comp
		? 'Your plan, your renewal date and the card it charges.'
		: 'AGE Premium members keep the writing, the broadcasts and the AGE Open going.'}
>
	{#if form?.success}<Notice tone="success" message={form.message} />{/if}
	{#if form?.error}<Notice tone="error" message={form.error} />{/if}

	{#if m}
		<!-- ============ standing ============ -->
		<div class="relative border-[3px] border-double border-ink bg-paper-bg">
			{@render corners()}
			<div class="grid gap-8 px-6 pt-6 pb-6 md:grid-cols-[minmax(0,1fr)_240px] md:px-8 md:pt-7">
				<div class="min-w-0">
					{@render seal(
						SEAL[m.status]?.text || m.status,
						SEAL[m.status]?.tone || 'bg-line2 text-ink'
					)}
					<p class="ao-cond mt-4 text-[44px] leading-[0.9] font-black uppercase md:text-[56px]">
						AGE Premium
					</p>
					<p class="mt-1 text-[11px] font-extrabold tracking-[0.2em] text-fade uppercase">
						{plan?.label} member{since ? ` · since ${ui.dateShort(since)}` : ''}
					</p>
					<p
						class="mt-4 max-w-[520px] font-newsreader text-[17px] leading-[1.5] {m.status ===
						'past_due'
							? 'text-hero-rb'
							: 'text-soft'}"
					>
						{statusLine}
					</p>

					{#if period}
						<!-- where we are in this period -->
						<div class="mt-6 max-w-[520px]">
							<div
								class="flex items-baseline justify-between text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>
								<span>{ui.dateShort(period.start)}</span>
								<span>{ui.dateShort(period.end)}</span>
							</div>
							<div class="relative mt-1.5 h-[6px] bg-line" aria-hidden="true">
								<div
									class="absolute inset-y-0 left-0 {m.status === 'past_due'
										? 'bg-hero-rb'
										: m.status === 'cancelled'
											? 'bg-gold'
											: 'bg-prem'}"
									style="width: {period.pct}%;"
								></div>
								<span
									class="absolute -top-[7px] -translate-x-1/2 text-[13px] leading-none text-ink"
									style="left: {period.pct}%;">◆</span
								>
							</div>
							<p class="mt-2 text-[12px] font-semibold text-soft">
								{period.left} day{period.left === 1 ? '' : 's'}
								{m.status === 'active' ? 'until your renewal' : 'of membership left'}
							</p>
						</div>
					{/if}
				</div>

				<dl
					class="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5 text-[13.5px] md:grid-cols-1 md:border-t-0 md:border-l md:pt-0 md:pl-6"
				>
					<div>
						<dt class={ui.label}>Member for</dt>
						<dd class="ao-cond mt-1 text-[26px] leading-none font-black">{tenure || '—'}</dd>
					</div>
					<div>
						<dt class={ui.label}>Your rate</dt>
						<dd class="mt-1 font-semibold">{price} / {plan?.noun}</dd>
						{#if m.priceCents !== plan?.priceCents}
							<dd class="text-[11px] text-fade">Kept from when you joined</dd>
						{/if}
					</div>
					<div class="col-span-2 md:col-span-1">
						<dt class={ui.label}>Card on file</dt>
						<dd class="mt-1 font-semibold">
							{#if data.card}
								{data.card.brand} •••• {data.card.lastFour}
								<span class="font-normal {data.card.usable ? 'text-fade' : 'text-hero-rb'}"
									>· {data.card.usable ? `exp ${data.card.expiry}` : 'expired'}</span
								>
							{:else}<span class="text-hero-rb">None</span>{/if}
						</dd>
					</div>
				</dl>
			</div>

			<!-- the one thing to do now, when there is one -->
			{#if m.status === 'past_due'}
				<div
					class="flex flex-wrap items-center gap-3 border-t border-line bg-hero-rb/[0.05] px-6 py-4 md:px-8"
				>
					<form method="POST" action="?/retry" use:enhance={enhanceWith('retry')}>
						<button class={ui.btnGreen} disabled={!!busy}
							>{busy === 'retry' ? 'Charging…' : 'Try my card again'}</button
						>
					</form>
					<button type="button" class={ui.btn} onclick={() => toggle('card')} disabled={!!busy}
						>Use a different card</button
					>
				</div>
			{:else if m.status === 'cancelled'}
				<div
					class="flex flex-wrap items-center gap-3 border-t border-line bg-paper px-6 py-4 md:px-8"
				>
					<form method="POST" action="?/resume" use:enhance={enhanceWith('resume')}>
						<button class={ui.btnGreen} disabled={!!busy || !data.card?.usable}
							>{busy === 'resume' ? 'Resuming…' : 'Stay in the club'}</button
						>
					</form>
					<span class={ui.note}>
						{data.card?.usable
							? 'Resuming keeps your rate and renews on the same date.'
							: 'Add a valid card below first.'}
					</span>
				</div>
			{/if}
		</div>

		{@render perks(m.status === 'past_due')}

		<!-- ============ manage ============ -->
		<section class="mt-12">
			<div class="border-b-[3px] border-ink pb-2">
				<h3
					class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
				>
					<span class="text-[8px] text-warm">◆</span>Manage
				</h3>
			</div>
			<ul>
				<!-- card -->
				<li class="border-b border-line">
					<div class="flex flex-wrap items-center justify-between gap-3 py-4">
						<div>
							<p class="font-newsreader text-[17px] font-semibold">Payment card</p>
							<p class={ui.note}>
								{data.card
									? `${data.card.brand} ending ${data.card.lastFour} pays for your renewals.`
									: 'No card on file.'}
							</p>
						</div>
						<button
							type="button"
							class={ui.ghostSm}
							onclick={() => toggle('card')}
							disabled={!!busy}
						>
							{open === 'card'
								? 'Close'
								: m.status === 'past_due'
									? 'Update and pay'
									: 'Change card'}
						</button>
					</div>
					{#if open === 'card'}
						<form
							method="POST"
							action="?/setCard"
							use:enhance={enhanceCard}
							class="mb-5 border border-line2 bg-paper px-5 py-5"
						>
							{#if m.status === 'past_due'}<input type="hidden" name="chargeNow" value="1" />{/if}
							<p class={ui.label}>Charge renewals to</p>
							{#if data.cards.some((c) => c.usable)}
								<div class="mt-3 space-y-2">
									{#each data.cards.filter((c) => c.usable) as c (c.id)}
										<label
											class="flex items-center gap-3 border-[1.5px] px-4 py-3 {cardMode ===
												'saved' && chosenCard === c.id
												? 'border-ink bg-paper-bg'
												: 'border-line2'}"
										>
											<input
												type="radio"
												name="savedCardId"
												value={c.id}
												bind:group={chosenCard}
												onchange={() => (cardMode = 'saved')}
												class="h-3.5 w-3.5 border-line2 text-ink focus:ring-0"
											/>
											<span class="text-[13.5px] font-semibold"
												>{c.brand} •••• {c.lastFour}
												<span class="text-fade">· exp {c.expiry}</span
												>{#if c.id === data.card?.id}<span
														class="ml-2 text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
														>current</span
													>{/if}</span
											>
										</label>
									{/each}
									<label
										class="flex items-center gap-3 border-[1.5px] px-4 py-3 {cardMode === 'new'
											? 'border-ink bg-paper-bg'
											: 'border-line2'}"
									>
										<input
											type="radio"
											name="savedCardId"
											value=""
											checked={cardMode === 'new'}
											onchange={() => (cardMode = 'new')}
											class="h-3.5 w-3.5 border-line2 text-ink focus:ring-0"
										/>
										<span class="text-[13.5px] font-semibold">A new card</span>
									</label>
								</div>
							{/if}
							{#if cardMode === 'new'}
								<div class="mt-4">
									<CardFields
										bind:this={fields}
										accept={data.accept}
										firstName={data.user?.firstName}
										lastName={data.user?.lastName}
										compact
									/>
								</div>
								<input type="hidden" name="makeDefault" value="1" />
							{/if}
							{#if cardError}<p class="mt-3 text-[12.5px] font-semibold text-hero-rb">
									{cardError}
								</p>{/if}
							<div class="mt-4 flex gap-2">
								<button class={ui.btn} disabled={!!busy || !data.accept?.ready}
									>{busy === 'card'
										? 'Saving…'
										: m.status === 'past_due'
											? 'Save card and pay now'
											: 'Use this card'}</button
								>
								<button type="button" class={ui.ghost} onclick={() => (open = '')}
									>Never mind</button
								>
							</div>
						</form>
					{/if}
				</li>

				<!-- plan -->
				{#if m.status === 'active' && otherPlan}
					<li class="border-b border-line">
						<div class="flex flex-wrap items-center justify-between gap-3 py-4">
							<div>
								<p class="font-newsreader text-[17px] font-semibold">Plan</p>
								<p class={ui.note}>
									{#if m.pendingPlan}
										Switching to {m.pendingPlan === 'yearly' ? 'annual' : 'monthly'} at {ui.dollars(
											m.pendingPriceCents
										)} on {ui.date(m.currentPeriodEnd)}.
									{:else}
										{plan?.label} at {price} a {plan?.noun}. {otherPlan.label} is {ui.dollars(
											otherPlan.priceCents
										)} a {otherPlan.noun}.
									{/if}
								</p>
							</div>
							{#if m.pendingPlan}
								<form method="POST" action="?/cancelSwitch" use:enhance={enhanceWith('switch')}>
									<button class={ui.ghostSm} disabled={!!busy}
										>Keep {plan?.label.toLowerCase()}</button
									>
								</form>
							{:else}
								<button
									type="button"
									class={ui.ghostSm}
									onclick={() => toggle('switch')}
									disabled={!!busy}
								>
									{open === 'switch' ? 'Close' : `Switch to ${otherPlan.label.toLowerCase()}`}
								</button>
							{/if}
						</div>
						{#if open === 'switch'}
							<form
								method="POST"
								action="?/switchPlan"
								use:enhance={enhanceWith('switch')}
								class="mb-5 border border-line2 bg-paper px-5 py-5"
							>
								<input type="hidden" name="plan" value={otherPlan.key} />
								<p class="font-newsreader text-[16px] leading-[1.5]">
									Switch to the <strong>{otherPlan.label.toLowerCase()} plan</strong> at {ui.dollars(
										otherPlan.priceCents
									)} a {otherPlan.noun}. It starts {ui.date(m.currentPeriodEnd)}, when this period
									ends; nothing is charged today.
									{#if m.priceCents !== plan?.priceCents}<span class="text-hero-rb"
											>Switching ends the rate you've kept from when you joined.</span
										>{/if}
								</p>
								<div class="mt-4 flex gap-2">
									<button class={ui.btn} disabled={!!busy}
										>{busy === 'switch' ? 'Saving…' : 'Confirm switch'}</button
									>
									<button type="button" class={ui.ghost} onclick={() => (open = '')}
										>Never mind</button
									>
								</div>
							</form>
						{/if}
					</li>
				{/if}

				<!-- leave -->
				{#if m.status !== 'cancelled'}
					<li class="border-b border-line">
						<div class="flex flex-wrap items-center justify-between gap-3 py-4">
							<div>
								<p class="font-newsreader text-[17px] font-semibold">Cancel membership</p>
								<p class={ui.note}>
									{m.status === 'past_due'
										? 'Ends your membership today and stops every charge.'
										: `Stops every future charge. You stay a member until ${ui.date(m.currentPeriodEnd)}.`}
								</p>
							</div>
							<button
								type="button"
								class={ui.danger}
								onclick={() => toggle('cancel')}
								disabled={!!busy}
							>
								{open === 'cancel' ? 'Close' : 'Cancel'}
							</button>
						</div>
						{#if open === 'cancel'}
							<form
								method="POST"
								action="?/cancel"
								use:enhance={enhanceWith('cancel')}
								class="mb-5 border border-line2 bg-paper px-5 py-5"
							>
								<p class="font-newsreader text-[16px] leading-[1.5]">
									{#if m.status === 'past_due'}
										Cancelling now ends your membership today.
									{:else}
										You'll keep everything until <strong>{ui.date(m.currentPeriodEnd)}</strong>, and
										you can come back before then with one click.
									{/if}
								</p>
								<label class="mt-4 block">
									<span class={ui.fieldLabel}>Anything we should know? (optional)</span>
									<input
										type="text"
										name="reason"
										bind:value={reason}
										maxlength="300"
										class={ui.input}
										placeholder="What would have kept you?"
									/>
								</label>
								<div class="mt-4 flex gap-2">
									<button class="{ui.btn} bg-hero-rb hover:bg-ink" disabled={!!busy}
										>{busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}</button
									>
									<button type="button" class={ui.ghost} onclick={() => (open = '')}
										>Stay a member</button
									>
								</div>
							</form>
						{/if}
					</li>
				{/if}
			</ul>
		</section>

		<!-- ============ billing history ============ -->
		{#if data.invoices.length}
			<section class="mt-12">
				<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
					<h3
						class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px] text-warm">◆</span>Billing history
					</h3>
					<a href="/account/purchases" class={ui.textAction}>All purchases →</a>
				</div>
				<ul>
					{#each data.invoices as inv (inv.id)}
						<li class={ui.row}>
							<div class="min-w-0">
								<p class="font-semibold">
									{ui.dateShort(inv.periodStart)} to {ui.dateShort(inv.periodEnd)}
								</p>
								<p class={ui.note}>
									{inv.kind === 'first'
										? 'First period'
										: inv.kind === 'migrated'
											? 'Carried over'
											: 'Renewal'}{inv.invoiceNumber ? ` · ${inv.invoiceNumber}` : ''}
								</p>
							</div>
							<div class="text-right">
								<p class="font-semibold tabular-nums">
									{ui.dollars(inv.amountCents)}{#if inv.refundedCents}<span class="text-fade">
											· {ui.dollars(inv.refundedCents)} refunded</span
										>{/if}
								</p>
								<p class="{ui.pill} {ui.tone[inv.status]} justify-end">
									{inv.status === 'paid'
										? 'Paid'
										: inv.status === 'failed'
											? 'Declined'
											: inv.status}
								</p>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{:else if data.legacy}
		<!-- ============ still on the old billing ============ -->
		{@const lu = data.legacyUser}
		<div class="relative border-[3px] border-double border-ink bg-paper-bg">
			{@render corners()}
			<div class="px-6 pt-6 pb-6 md:px-8">
				{@render seal(
					lu.status === 'payment_failed'
						? 'Payment needed'
						: lu.status === 'cancelled'
							? 'Ending soon'
							: 'Active',
					lu.status === 'payment_failed'
						? 'bg-hero-rb text-white'
						: lu.status === 'cancelled'
							? 'bg-gold text-ink'
							: 'bg-prem text-white'
				)}
				<p class="ao-cond mt-4 text-[44px] leading-[0.9] font-black uppercase md:text-[56px]">
					AGE Premium
				</p>
				<p class="mt-1 text-[11px] font-extrabold tracking-[0.2em] text-fade uppercase">
					{lu.plan === 'yearly' ? 'Annual' : 'Monthly'} member{since
						? ` · since ${ui.dateShort(since)}`
						: ''}{tenure ? ` · ${tenure}` : ''}
				</p>
				<p class="mt-4 max-w-[560px] font-newsreader text-[17px] leading-[1.5] text-soft">
					{#if lu.status === 'cancelled'}
						Cancelled. Nothing more will be charged, and you're a member until {ui.date(
							lu.endDate
						)}.
					{:else if lu.status === 'payment_failed'}
						Your last renewal didn't go through. You keep access until {ui.date(lu.endDate)}; email
						<a href="mailto:info@arcanegamesandevents.com" class="underline"
							>info@arcanegamesandevents.com</a
						> and we'll sort the card out with you.
					{:else}
						Renews {ui.date(lu.nextBillingDate)}.
					{/if}
				</p>
				<p class="mt-3 {ui.note}">
					We're moving memberships to a new billing system. Your plan, rate and renewal date carry
					over unchanged.
				</p>
			</div>
			{#if lu.status !== 'cancelled'}
				<div
					class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 md:px-8"
				>
					<span class={ui.note}
						>Cancelling stops every further charge; you keep access to the end of what you've paid
						for.</span
					>
					<button type="button" class={ui.danger} onclick={() => toggle('cancel')} disabled={!!busy}
						>{open === 'cancel' ? 'Close' : 'Cancel'}</button
					>
				</div>
				{#if open === 'cancel'}
					<form
						method="POST"
						action="?/cancel"
						use:enhance={enhanceWith('cancel')}
						class="border-t border-line bg-paper px-6 py-5 md:px-8"
					>
						<div class="flex gap-2">
							<button class="{ui.btn} bg-hero-rb hover:bg-ink" disabled={!!busy}
								>{busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel'}</button
							>
							<button type="button" class={ui.ghost} onclick={() => (open = '')}
								>Stay a member</button
							>
						</div>
					</form>
				{/if}
			{/if}
		</div>
		{@render perks()}
	{:else if data.comp}
		<!-- ============ complimentary ============ -->
		<div class="relative border-[3px] border-double border-ink bg-paper-bg">
			{@render corners()}
			<div class="px-6 pt-6 pb-6 md:px-8">
				{@render seal('Complimentary', 'bg-gold text-ink')}
				<p class="ao-cond mt-4 text-[44px] leading-[0.9] font-black uppercase md:text-[56px]">
					AGE Premium
				</p>
				<p class="mt-4 max-w-[560px] font-newsreader text-[17px] leading-[1.5] text-soft">
					Your membership is on the house{data.compReason ? ` (${data.compReason})` : ''}, with our
					thanks. Nothing is charged and nothing needs doing.
				</p>
			</div>
		</div>
		{@render perks()}
	{:else}
		<!-- ============ not a member ============ -->
		<div class="relative border-[3px] border-double border-line2 bg-paper-bg">
			<div class="px-6 pt-6 pb-6 md:px-8">
				{#if data.latest}
					{@render seal(`Ended ${ui.dateShort(data.latest.endedAt)}`, 'bg-line2 text-ink')}
					<p class="ao-cond mt-4 text-[40px] leading-[0.9] font-black uppercase md:text-[52px]">
						Come back to the club
					</p>
					<p class="mt-4 max-w-[560px] font-newsreader text-[17px] leading-[1.5] text-soft">
						{data.latest.endReason === 'payment_failed'
							? "We couldn't collect your last renewal, so your membership lapsed."
							: 'Thank you for your time with us.'} Your account, tickets and history are all still here.
					</p>
				{:else}
					<p class="ao-cond text-[40px] leading-[0.9] font-black uppercase md:text-[52px]">
						AGE Premium
					</p>
					<p class="mt-4 max-w-[560px] font-newsreader text-[17px] leading-[1.5] text-soft">
						Membership is what pays the players who write, film and teach for AGE, and keeps the AGE
						Open on the calendar.
					</p>
				{/if}
				<a href="/premium" class="{ui.btnGreen} mt-6"
					>{data.latest ? 'Rejoin AGE Premium' : 'Become a member'}</a
				>
			</div>
		</div>
		{@render perks()}
	{/if}
</Panel>
