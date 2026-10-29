<script>
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
	let confirmCancel = $state(false);
	let confirmSwitch = $state(false);
	let changingCard = $state(false);
	let cardMode = $state('saved');
	let chosenCard = $state('');
	let fields = $state();
	let cardError = $state('');
	let reason = $state('');

	$effect(() => {
		if (!chosenCard)
			chosenCard =
				data.cards.find((c) => c.usable && !data.card?.id !== c.id)?.id ||
				data.cards.find((c) => c.usable)?.id ||
				'';
		if (data.cards.filter((c) => c.usable).length === 0) cardMode = 'new';
	});

	const enhanceWith = (name) => () => {
		busy = name;
		return async ({ update }) => {
			busy = '';
			confirmCancel = false;
			confirmSwitch = false;
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
				changingCard = false;
				await update();
				await invalidateAll();
			};
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
					? `We'll try your card again on ${ui.date(m.nextAttemptAt)}. Your access continues until ${ui.date(m.graceUntil)}.`
					: `Your access ends ${ui.date(m.graceUntil)} unless the card is updated.`;
			case 'cancelled':
				return `Nothing more will be charged. Your access continues until ${ui.date(m.currentPeriodEnd)}.`;
			default:
				return '';
		}
	});
</script>

<svelte:head><title>Membership — AGE</title></svelte:head>

<Panel
	rubric="Membership"
	title="AGE Premium"
	lead="Your plan, your renewal date, and the card it charges."
>
	{#if form?.success}<Notice tone="success" message={form.message} />{/if}
	{#if form?.error}<Notice tone="error" message={form.error} />{/if}

	{#if m}
		<!-- ============ the membership ============ -->
		<div class={ui.panel}>
			<div class="grid gap-6 px-6 pt-5 pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:px-7">
				<div class="min-w-0">
					<span class="{ui.pill} {ui.tone[m.status]}">{ui.STATUS_LABEL[m.status]}</span>
					<p class="mt-3 font-newsreader text-[30px] leading-none font-semibold">
						{plan?.label} membership
						<span class="text-soft">· {price} / {plan?.noun}</span>
					</p>
					<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft">{statusLine}</p>
					{#if m.priceCents !== plan?.priceCents}
						<p class="mt-2 {ui.note}">
							You keep your current price of {price} for as long as you stay on this plan.
						</p>
					{/if}
				</div>
				<dl class="grid grid-cols-2 gap-x-8 gap-y-3 text-[13.5px] md:min-w-[260px]">
					<div>
						<dt class={ui.label}>Member since</dt>
						<dd class="mt-1 font-semibold">{ui.dateShort(m.startedAt)}</dd>
					</div>
					<div>
						<dt class={ui.label}>Paid through</dt>
						<dd class="mt-1 font-semibold">{ui.dateShort(m.currentPeriodEnd)}</dd>
					</div>
					<div class="col-span-2">
						<dt class={ui.label}>Card on file</dt>
						<dd class="mt-1 font-semibold">
							{#if data.card}{data.card.brand} •••• {data.card.lastFour}
								<span class="text-fade">· exp {data.card.expiry}</span>{#if !data.card.usable}<span
										class="ml-2 text-hero-rb">expired</span
									>{/if}{:else}<span class="text-hero-rb">None</span>{/if}
						</dd>
					</div>
				</dl>
			</div>

			<!-- ============ actions ============ -->
			<div class="flex flex-wrap gap-2 border-t border-line px-6 py-4 md:px-7">
				{#if m.status === 'past_due'}
					<form method="POST" action="?/retry" use:enhance={enhanceWith('retry')}>
						<button class={ui.btnGreen} disabled={!!busy}
							>{busy === 'retry' ? 'Charging…' : 'Try my card again'}</button
						>
					</form>
				{/if}
				<button
					type="button"
					class={m.status === 'past_due' ? ui.btn : ui.ghost}
					onclick={() => (changingCard = !changingCard)}
					disabled={!!busy}
				>
					{changingCard
						? 'Keep current card'
						: m.status === 'past_due'
							? 'Update card and pay'
							: 'Change card'}
				</button>
				{#if m.status === 'active'}
					{#if m.pendingPlan}
						<form method="POST" action="?/cancelSwitch" use:enhance={enhanceWith('switch')}>
							<button class={ui.ghost} disabled={!!busy}
								>Keep the {plan?.label.toLowerCase()} plan</button
							>
						</form>
					{:else}
						<button
							type="button"
							class={ui.ghost}
							onclick={() => (confirmSwitch = !confirmSwitch)}
							disabled={!!busy}
						>
							Switch to {otherPlan?.label.toLowerCase()}
						</button>
					{/if}
					<button
						type="button"
						class="{ui.ghost} ml-auto text-hero-rb hover:border-hero-rb"
						onclick={() => (confirmCancel = !confirmCancel)}
						disabled={!!busy}>Cancel membership</button
					>
				{:else if m.status === 'cancelled'}
					<form method="POST" action="?/resume" use:enhance={enhanceWith('resume')} class="ml-auto">
						<button class={ui.btnGreen} disabled={!!busy || !data.card?.usable}
							>{busy === 'resume' ? 'Resuming…' : 'Resume membership'}</button
						>
					</form>
				{:else if m.status === 'past_due'}
					<button
						type="button"
						class="{ui.ghost} ml-auto text-hero-rb hover:border-hero-rb"
						onclick={() => (confirmCancel = !confirmCancel)}
						disabled={!!busy}>Cancel membership</button
					>
				{/if}
			</div>

			{#if m.status === 'cancelled' && !data.card?.usable}
				<p class="border-t border-line px-6 py-3 text-[12.5px] text-hero-rb md:px-7">
					Add a valid card before resuming.
				</p>
			{/if}

			{#if confirmSwitch && otherPlan}
				<form
					method="POST"
					action="?/switchPlan"
					use:enhance={enhanceWith('switch')}
					class="border-t border-line bg-paper px-6 py-5 md:px-7"
				>
					<input type="hidden" name="plan" value={otherPlan.key} />
					<p class="font-newsreader text-[16px] leading-[1.5]">
						Switch to the <strong>{otherPlan.label.toLowerCase()} plan</strong> at {ui.dollars(
							otherPlan.priceCents
						)} per {otherPlan.noun}. The change happens on {ui.date(m.currentPeriodEnd)}, when your
						current period ends; nothing is charged today.
						{#if m.priceCents !== plan?.priceCents}<span class="text-hero-rb"
								>Switching ends your current price of {price}.</span
							>{/if}
					</p>
					<div class="mt-4 flex gap-2">
						<button class={ui.btn} disabled={!!busy}
							>{busy === 'switch' ? 'Saving…' : 'Confirm switch'}</button
						>
						<button type="button" class={ui.ghost} onclick={() => (confirmSwitch = false)}
							>Never mind</button
						>
					</div>
				</form>
			{/if}

			{#if confirmCancel}
				<form
					method="POST"
					action="?/cancel"
					use:enhance={enhanceWith('cancel')}
					class="border-t border-line bg-paper px-6 py-5 md:px-7"
				>
					<p class="font-newsreader text-[16px] leading-[1.5]">
						{#if m.status === 'past_due'}
							Cancelling now ends your membership today and stops every further charge.
						{:else}
							Cancelling stops every further charge. You keep AGE Premium until <strong
								>{ui.date(m.currentPeriodEnd)}</strong
							>, and you can resume any time before then.
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
							>{busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel my membership'}</button
						>
						<button type="button" class={ui.ghost} onclick={() => (confirmCancel = false)}
							>Keep it</button
						>
					</div>
				</form>
			{/if}

			{#if changingCard}
				<form
					method="POST"
					action="?/setCard"
					use:enhance={enhanceCard}
					class="border-t border-line bg-paper px-6 py-5 md:px-7"
				>
					{#if m.status === 'past_due'}<input type="hidden" name="chargeNow" value="1" />{/if}
					<p class={ui.label}>Charge renewals to</p>
					{#if data.cards.some((c) => c.usable)}
						<div class="mt-3 space-y-2">
							{#each data.cards.filter((c) => c.usable) as c (c.id)}
								<label
									class="flex items-center gap-3 border-[1.5px] px-4 py-3 {cardMode === 'saved' &&
									chosenCard === c.id
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
										<span class="text-fade">· exp {c.expiry}</span>{#if c.id === data.card?.id}<span
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
						<button type="button" class={ui.ghost} onclick={() => (changingCard = false)}
							>Never mind</button
						>
					</div>
				</form>
			{/if}
		</div>

		<!-- ============ history ============ -->
		{#if data.invoices.length}
			<h3 class="mt-10 {ui.label}">Billing history</h3>
			<ul class="mt-3 border-t border-line">
				{#each data.invoices as inv (inv.id)}
					<li class={ui.row}>
						<div class="min-w-0">
							<p class="font-semibold">
								{ui.dateShort(inv.periodStart)} – {ui.dateShort(inv.periodEnd)}
							</p>
							<p class={ui.note}>
								{inv.kind === 'first'
									? 'First period'
									: inv.kind === 'migrated'
										? 'Carried over'
										: 'Renewal'}{inv.invoiceNumber
									? ` · ${inv.invoiceNumber}`
									: ''}{inv.discountCents ? ` · ${ui.dollars(inv.discountCents)} off` : ''}
							</p>
						</div>
						<div class="text-right">
							<p class="font-semibold tabular-nums">
								{ui.dollars(inv.amountCents)}{#if inv.refundedCents}<span class="text-fade">
										· {ui.dollars(inv.refundedCents)} refunded</span
									>{/if}
							</p>
							<p class="{ui.pill} {ui.tone[inv.status]} justify-end">
								{inv.status === 'paid' ? 'Paid' : inv.status === 'failed' ? 'Declined' : inv.status}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if data.legacy}
		<!-- ============ still on the old system ============ -->
		<div class={ui.panel}>
			<div class="px-6 pt-5 pb-6 md:px-7">
				<span
					class="{ui.pill} {ui.tone[
						data.legacyUser.status === 'payment_failed'
							? 'past_due'
							: data.legacyUser.status === 'cancelled'
								? 'cancelled'
								: 'active'
					]}"
				>
					{data.legacyUser.status === 'payment_failed'
						? 'Payment failed'
						: data.legacyUser.status === 'cancelled'
							? 'Cancelled'
							: 'Active'}
				</span>
				<p class="mt-3 font-newsreader text-[30px] leading-none font-semibold">
					{data.legacyUser.plan === 'yearly' ? 'Annual' : 'Monthly'} membership
				</p>
				<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft">
					{#if data.legacyUser.status === 'cancelled'}
						Nothing more will be charged. Your access continues until {ui.date(
							data.legacyUser.endDate
						)}.
					{:else if data.legacyUser.status === 'payment_failed'}
						Your last renewal didn't go through. Your access continues until {ui.date(
							data.legacyUser.endDate
						)}; email
						<a href="mailto:info@arcanegamesandevents.com" class="underline"
							>info@arcanegamesandevents.com</a
						> and we'll sort the card out with you.
					{:else}
						Renews {ui.date(data.legacyUser.nextBillingDate)}.
					{/if}
				</p>
				<p class="mt-3 {ui.note}">
					Your billing is being moved to AGE's new membership system; your plan, price and renewal
					date carry over unchanged.
				</p>
			</div>
			{#if data.legacyUser.status !== 'cancelled'}
				<div class="flex flex-wrap gap-2 border-t border-line px-6 py-4 md:px-7">
					<button
						type="button"
						class="{ui.ghost} ml-auto text-hero-rb hover:border-hero-rb"
						onclick={() => (confirmCancel = !confirmCancel)}
						disabled={!!busy}>Cancel membership</button
					>
				</div>
				{#if confirmCancel}
					<form
						method="POST"
						action="?/cancel"
						use:enhance={enhanceWith('cancel')}
						class="border-t border-line bg-paper px-6 py-5 md:px-7"
					>
						<p class="font-newsreader text-[16px] leading-[1.5]">
							Cancelling stops every further charge. You keep AGE Premium to the end of the period
							you've paid for.
						</p>
						<div class="mt-4 flex gap-2">
							<button class="{ui.btn} bg-hero-rb hover:bg-ink" disabled={!!busy}
								>{busy === 'cancel' ? 'Cancelling…' : 'Yes, cancel my membership'}</button
							>
							<button type="button" class={ui.ghost} onclick={() => (confirmCancel = false)}
								>Keep it</button
							>
						</div>
					</form>
				{/if}
			{/if}
		</div>
	{:else if data.comp}
		<div class={ui.panel}>
			<div class="px-6 pt-5 pb-6 md:px-7">
				<span class="{ui.pill} {ui.tone.comp}">Complimentary</span>
				<p class="mt-3 font-newsreader text-[30px] leading-none font-semibold">
					AGE Premium, with our thanks
				</p>
				<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft">
					Your membership is on the house{data.compReason ? ` (${data.compReason})` : ''}. Nothing
					is charged, and nothing needs doing.
				</p>
			</div>
		</div>
	{:else}
		<div class={ui.panel}>
			<div class="px-6 pt-5 pb-6 md:px-7">
				{#if data.latest}
					<span class="{ui.pill} {ui.tone.ended}">Ended</span>
					<p class="mt-3 font-newsreader text-[30px] leading-none font-semibold">
						Your membership ended {ui.dateShort(data.latest.endedAt)}.
					</p>
					<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft">
						{data.latest.endReason === 'payment_failed'
							? "We couldn't collect the renewal, so it lapsed."
							: 'Thank you for your time with us.'} Everything is still here when you want to come back.
					</p>
				{:else}
					<p class="font-newsreader text-[30px] leading-none font-semibold">
						You're not a member yet.
					</p>
					<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft">
						AGE Premium opens the Library, the courses and member discounts on AGE Open tickets, and
						it is what pays the people who make them.
					</p>
				{/if}
				<a href="/premium" class="{ui.btnGreen} mt-5"
					>{data.latest ? 'Rejoin AGE Premium' : 'See membership'}</a
				>
			</div>
		</div>
	{/if}
</Panel>
