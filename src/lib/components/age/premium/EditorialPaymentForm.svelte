<script>
	/**
	 * Membership checkout: pick a card (saved or new, tokenized by
	 * Accept.js), agree to automatic renewal, and POST to /api/subscribe.
	 * The price shown is the server's quote; the server never reads an
	 * amount from this form.
	 */
	import { trackConversion } from '$lib/analytics/siteTracker.js';
	import PaymentMethodPicker from '$lib/components/payments/PaymentMethodPicker.svelte';

	let {
		plan = 'monthly',
		promoCode = '',
		/** { amountCents, renewalCents, discountCents } from the server. */
		quote,
		cards = [],
		accept,
		user = null,
		submitText = 'Become a member'
	} = $props();

	let picker = $state();
	let consent = $state(false);
	let loading = $state(false);
	let error = $state('');
	let notice = $state('');
	let pendingId = $state(null);
	let checkoutNoted = false;

	const dollars = (c) => `$${(Number(c || 0) / 100).toFixed(Number(c) % 100 === 0 ? 0 : 2)}`;
	const noun = $derived(plan === 'yearly' ? 'year' : 'month');

	function noteCheckout() {
		if (checkoutNoted) return;
		checkoutNoted = true;
		trackConversion('checkout_started');
	}

	async function handleSubmit(e) {
		e.preventDefault();
		if (loading) return;
		error = '';
		notice = '';
		if (!consent) {
			error = 'Please agree to the automatic renewal terms to continue.';
			return;
		}
		loading = true;
		try {
			const payment = await picker.getPayment();
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan, promoCode: promoCode || undefined, payment, consent: true })
			});
			const body = await res.json().catch(() => ({}));
			if (res.status === 202 && body.subscriptionId) {
				pendingId = body.subscriptionId;
				notice = body.message || 'Confirming your payment…';
				await poll(body.subscriptionId);
				return;
			}
			if (res.ok && body.success) {
				window.location.href = body.redirectUrl || '/premium/confirmation';
				return;
			}
			if (body.retoken) {
				error =
					'This card is already saved with an older expiry. Update it from your account, then try again.';
				return;
			}
			if (body.resume) {
				error = `${body.error} `;
				notice = 'resume';
				return;
			}
			error = body.error || 'The payment could not be completed.';
		} catch (err) {
			if (!error) error = err?.message || 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function poll(id) {
		for (let i = 0; i < 40; i++) {
			await new Promise((r) => setTimeout(r, i < 5 ? 2000 : 5000));
			try {
				const res = await fetch(`/api/subscribe/status?id=${encodeURIComponent(id)}`);
				const body = await res.json();
				if (body.status === 'active') {
					window.location.href = body.redirectUrl || '/premium/confirmation';
					return;
				}
				if (body.status && body.status !== 'pending') {
					notice = '';
					error = body.error || 'The payment did not go through.';
					pendingId = null;
					return;
				}
			} catch {
				/* keep polling */
			}
		}
		notice =
			"We're still confirming this payment. You'll get an email either way; please don't pay again.";
	}
</script>

<form onsubmit={handleSubmit} onfocusin={noteCheckout} class="space-y-5">
	{#if error}
		<div
			class="border-[1.5px] border-hero-rb bg-hero-rb/[0.06] px-4 py-3 text-[12.5px] font-semibold text-hero-rb"
			role="alert"
		>
			{error}
			{#if notice === 'resume'}<a href="/account/membership" class="underline"
					>Go to your membership</a
				>{/if}
		</div>
	{/if}
	{#if notice && notice !== 'resume'}
		<div
			class="border-[1.5px] border-line2 bg-paper px-4 py-3 text-[12.5px] font-semibold text-ink"
			role="status"
		>
			{notice}
		</div>
	{/if}

	<PaymentMethodPicker
		bind:this={picker}
		{cards}
		{accept}
		firstName={user?.firstName || ''}
		lastName={user?.lastName || ''}
		forceSave={true}
		disabled={loading || !!pendingId}
	/>

	<label class="flex items-start gap-3 text-[12.5px] leading-snug text-soft">
		<input
			type="checkbox"
			bind:checked={consent}
			disabled={loading}
			class="mt-[2px] h-4 w-4 shrink-0 border-[1.5px] border-line2 text-ink focus:ring-0"
			required
		/>
		<span>
			I agree that AGE will charge
			<strong class="text-ink">{dollars(quote?.amountCents)}</strong>
			today{#if quote && quote.amountCents !== quote.renewalCents}, then
				<strong class="text-ink">{dollars(quote.renewalCents)}</strong> every {noun}{:else}
				and every {noun}{/if}
			until I cancel. I can cancel any time from my account, and cancelling stops future charges.
		</span>
	</label>

	<button
		type="submit"
		disabled={loading || !!pendingId || !accept?.ready}
		class="inline-flex h-[54px] w-full items-center justify-center gap-2 border-[1.5px] border-prem bg-prem text-[13px] font-bold tracking-[0.07em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
	>
		{loading || pendingId ? 'Processing…' : `${submitText} →`}
	</button>
</form>
