<!--
  PayoutList — a store's payouts, one per event (payouts.js storePayouts):
  the event, where its payout stands (running, ready to pay, paid), and the
  breakdown — players, ticket sales, refunds, card fees, adjustments, money
  carried in — with what's owed or what was paid. The store sees it
  read-only; admins also get Mark paid on a payout that's ready.

  Props: list (storePayouts().payouts), carriedCents, admin (show Mark
  paid; the page has a ?/markPaid action), busy (the event being saved)
-->
<script>
	import { enhance } from '$app/forms';
	import * as F from './fields.js';

	/** @type {{ list: any[], carriedCents?: number, admin?: boolean }} */
	let { list, carriedCents = 0, admin = false } = $props();

	let open = $state(/** @type {string | null} */ (null));
	let saving = $state(false);

	const money = (c) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((c || 0) / 100);
	const day = (d, o) => new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...o });
	// Today on the admin's own calendar (toISOString would be UTC's, a day ahead in the evening).
	const now = new Date();
	const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

	const STATE = {
		running: { word: 'Running', tone: 'border-line2 text-soft', bar: 'var(--color-line2)' },
		ready: {
			word: 'Ready to pay',
			tone: 'border-transparent bg-hero-rb text-white',
			bar: 'var(--color-hero-rb)'
		},
		paid: { word: 'Paid', tone: 'border-transparent bg-prem text-white', bar: 'var(--color-prem)' },
		cancelled: { word: 'Cancelled', tone: 'border-line2 text-fade', bar: 'var(--color-line2)' }
	};
	// Cancelled events with no money in them aren't payouts.
	const shown = $derived(
		list.filter((p) => !(p.state === 'cancelled' && !p.gross && !p.owed && !p.adjust))
	);
</script>

{#if carriedCents}
	<p class="mt-6 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13px]">
		<strong class="tabular-nums">{money(carriedCents)}</strong> carried into the next payout: refunds
		or adjustments that came after an event was already paid.
	</p>
{/if}

{#if shown.length}
	<ul class="mt-6 flex flex-col gap-3">
		{#each shown as p (p.eventId)}
			{@const st = STATE[p.state]}
			<li class="border border-l-[4px] border-line2 bg-white" style="border-left-color: {st.bar}">
				<div
					class="grid gap-4 px-5 py-4 md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center md:gap-6"
				>
					<span class="flex items-baseline gap-2 leading-none md:flex-col md:items-center md:gap-1">
						<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>{p.eventDate ? day(p.eventDate, { month: 'short' }) : 'TBD'}</span
						>
						<span class="ao-cond text-[34px] font-black tabular-nums"
							>{p.eventDate ? day(p.eventDate, { day: 'numeric' }) : ''}</span
						>
					</span>
					<span class="min-w-0">
						<span class="flex flex-wrap items-center gap-2">
							<span
								class="border px-1.5 py-[2px] text-[9px] font-extrabold tracking-[0.14em] uppercase {st.tone}"
								>{st.word}</span
							>
							{#if p.state === 'running'}<span class="text-[11.5px] text-fade"
									>Ready once the event is closed out</span
								>{/if}
						</span>
						<span
							class="ao-cond mt-1.5 block truncate text-[24px] leading-tight font-black uppercase"
							>{p.title}</span
						>
						<span class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-soft tabular-nums">
							<span>{p.players} {p.players === 1 ? 'player' : 'players'}</span>
							<span>Sales {money(p.gross)}</span>
							{#if p.refunds}<span>Refunds {money(p.refunds)}</span>{/if}
							<span>Card fees −{money(p.fees)}</span>
							{#if p.adjust}<span>Adjustments {p.adjust > 0 ? '+' : ''}{money(p.adjust)}</span>{/if}
							{#if p.carried}<span>Carried in {money(p.carried)}</span>{/if}
						</span>
					</span>
					<span class="md:text-right">
						<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>{p.state === 'paid' ? 'Paid' : p.state === 'running' ? 'So far' : 'Owed'}</span
						>
						<span
							class="ao-cond block text-[36px] leading-none font-black tabular-nums {p.state ===
							'ready'
								? 'text-hero-rb'
								: p.state === 'paid'
									? 'text-prem'
									: ''}">{money(p.owed)}</span
						>
						{#if p.state === 'paid'}
							<span class="mt-1 block text-[11.5px] text-soft"
								>{day(p.paidAt, { month: 'short', day: 'numeric', year: 'numeric' })} · {p.method}{p.reference
									? ` · ${p.reference}`
									: ''}</span
							>
						{:else if admin && p.state === 'ready'}
							<button
								type="button"
								onclick={() => (open = open === p.eventId ? null : p.eventId)}
								class="mt-2 inline-flex h-[38px] items-center bg-hero-rb px-4 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110"
								aria-expanded={open === p.eventId}>Mark paid</button
							>
						{/if}
					</span>
				</div>

				{#if admin && open === p.eventId}
					<form
						method="POST"
						action="?/markPaid"
						class="grid gap-4 border-t border-line2 bg-paper/50 px-5 py-4 md:grid-cols-[170px_170px_minmax(0,1fr)_auto] md:items-end"
						use:enhance={() => {
							saving = true;
							return async ({ update }) => {
								await update();
								saving = false;
								open = null;
							};
						}}
					>
						<input type="hidden" name="eventId" value={p.eventId} />
						<label class="block">
							<span class={F.label}>Paid on</span>
							<input type="date" name="paidAt" value={today} max={today} class={F.field} />
						</label>
						<label class="block">
							<span class={F.label}>How</span>
							<input
								name="method"
								list="payout-methods"
								required
								maxlength="40"
								placeholder="ACH, check…"
								class={F.field}
							/>
						</label>
						<label class="block">
							<span class={F.label}>Reference (optional)</span>
							<input
								name="reference"
								maxlength="120"
								placeholder="Check number, transfer ID…"
								class={F.field}
							/>
						</label>
						<button
							disabled={saving}
							class="inline-flex h-[46px] items-center bg-prem px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-50"
							>{saving ? 'Saving…' : `Paid ${money(p.owed + carriedCents)}`}</button
						>
						{#if carriedCents}
							<p class="text-[11.5px] text-soft md:col-span-4">
								Includes {money(carriedCents)} carried in from earlier payouts.
							</p>
						{/if}
					</form>
				{/if}
			</li>
		{/each}
	</ul>
	<datalist id="payout-methods">
		<option value="ACH"></option>
		<option value="Check"></option>
		<option value="PayPal"></option>
		<option value="Zelle"></option>
		<option value="Venmo"></option>
	</datalist>
{:else}
	<p class="mt-6 border border-dashed border-line2 px-5 py-5 text-[13.5px] text-soft">
		No payouts yet. Each event’s payout starts with its first ticket sale.
	</p>
{/if}
