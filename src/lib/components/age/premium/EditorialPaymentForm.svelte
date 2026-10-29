<script>
	import { trackConversion } from '$lib/analytics/siteTracker.js';
	let checkoutNoted = false;
	function noteCheckout() {
		if (checkoutNoted) return;
		checkoutNoted = true;
		trackConversion('checkout_started');
	}
	/**
	 * Editorial Premium payment form.
	 *
	 * Same submit contract as `$lib/components/PaymentForm.svelte` — POSTs
	 * card + billing fields to `/api/subscribe` and redirects on success
	 * — but rendered with the editorial design language to match the
	 * `op-premium.jsx` handoff (card info / billing sections, big green
	 * CTA, no dark-mode dressing).
	 *
	 * Saved-card UX is intentionally omitted here because the handoff
	 * mockup shows a single-card flow. Returning users with saved cards
	 * still see this form; their existing cards are not touched.
	 */

	export let amount = '0.00';
	export let description = '';
	export let submitUrl = '';
	export let submitText = 'Get Premium';
	export let isSubscription = false;
	export let subscriptionType = 'monthly';
	export let gemId = '';
	export let showTestData = false;
	export let extraFields = {};

	let loading = false;
	let error = '';
	let success = false;

	let formData = {
		cardNumber: '',
		expirationMonth: '',
		expirationYear: '',
		cardCode: '',
		firstName: '',
		lastName: '',
		zip: ''
	};

	async function handleSubmit(e) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			const expirationDate = `${formData.expirationMonth.padStart(2, '0')}${formData.expirationYear.slice(-2)}`;

			const requestBody = {
				amount,
				cardNumber: formData.cardNumber.replace(/\s/g, ''),
				expirationDate,
				cardCode: formData.cardCode,
				description,
				isSubscription,
				subscriptionType: isSubscription ? subscriptionType : undefined,
				gemId: gemId || undefined,
				billTo: {
					firstName: formData.firstName,
					lastName: formData.lastName,
					zip: formData.zip
				},
				...extraFields
			};

			const response = await fetch(submitUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});
			const result = await response.json();

			if (response.ok && result.success) {
				success = true;
				if (result.redirectUrl) window.location.href = result.redirectUrl;
			} else {
				error = result.error || 'Payment failed. Please try again.';
			}
		} catch {
			error = 'Network error. Please check your connection and try again.';
		} finally {
			loading = false;
		}
	}

	function formatCardNumber(e) {
		const value = e.target.value.replace(/\s/g, '');
		formData.cardNumber = value.match(/.{1,4}/g)?.join(' ') || value;
	}

	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
</script>

{#if success}
	<div class="border-prem/40 bg-prem/10 p-6 text-center">
		<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center bg-prem text-white">✓</div>
		<h3 class="mb-1 font-newsreader text-[24px] leading-[1.1] font-semibold text-ink">
			You're in.
		</h3>
		<p class="m-0 text-[13.5px] text-soft">
			Thank you. We'll send your receipt to your email shortly.
		</p>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="space-y-5">
		{#if error}
			<div
				class="border-[1.5px] border-warm bg-warm/10 px-4 py-3 text-[12px] font-semibold tracking-[0.04em] text-warm uppercase"
			>
				{error}
			</div>
		{/if}

		{#if showTestData}
			<div class="border-[1.5px] border-line2 bg-paper px-4 py-3 text-[11.5px] text-soft">
				<div class="mb-1 text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
					Test mode
				</div>
				<div class="grid grid-cols-2 gap-x-4 gap-y-[2px] tabular-nums">
					<div><span class="text-fade">Card</span> 4007 0000 0002 7</div>
					<div><span class="text-fade">Exp</span> 12 / 2028</div>
					<div><span class="text-fade">CVV</span> 123</div>
					<div><span class="text-fade">ZIP</span> 12345</div>
				</div>
			</div>
		{/if}

		<!-- card information -->
		<div>
			<div class="mb-[14px] text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
				Card information
			</div>

			<label
				for="cardNumber"
				class="mb-[7px] block text-[11px] font-bold tracking-[0.01em] text-soft"
			>
				Card number <span class="text-prem">*</span>
			</label>
			<input
				id="cardNumber"
				onfocus={noteCheckout}
				type="text"
				inputmode="numeric"
				maxlength="19"
				required
				bind:value={formData.cardNumber}
				oninput={formatCardNumber}
				placeholder="1234 5678 9012 3456"
				class="mb-[15px] h-[50px] w-full border-[1.5px] border-line2 bg-paper-bg px-[15px] text-[14.5px] font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
			/>

			<div class="grid grid-cols-3 gap-[11px]">
				<div>
					<label
						for="expMonth"
						class="mb-[7px] block text-[11px] font-bold tracking-[0.01em] text-soft"
					>
						Month <span class="text-prem">*</span>
					</label>
					<input
						id="expMonth"
						type="text"
						inputmode="numeric"
						maxlength="2"
						required
						bind:value={formData.expirationMonth}
						placeholder="MM"
						class="h-[50px] w-full border-[1.5px] border-line2 bg-paper-bg px-[15px] text-[14.5px] font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
					/>
				</div>
				<div>
					<label
						for="expYear"
						class="mb-[7px] block text-[11px] font-bold tracking-[0.01em] text-soft"
					>
						Year <span class="text-prem">*</span>
					</label>
					<input
						id="expYear"
						type="text"
						inputmode="numeric"
						maxlength="4"
						required
						bind:value={formData.expirationYear}
						placeholder="YYYY"
						list="exp-years"
						class="h-[50px] w-full border-[1.5px] border-line2 bg-paper-bg px-[15px] text-[14.5px] font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
					/>
					<datalist id="exp-years">
						{#each years as year (year)}
							<option value={String(year)}></option>
						{/each}
					</datalist>
				</div>
				<div>
					<label
						for="cardCode"
						class="mb-[7px] block text-[11px] font-bold tracking-[0.01em] text-soft"
					>
						CVV <span class="text-prem">*</span>
					</label>
					<input
						id="cardCode"
						type="text"
						inputmode="numeric"
						minlength="3"
						maxlength="4"
						required
						bind:value={formData.cardCode}
						placeholder="123"
						class="h-[50px] w-full border-[1.5px] border-line2 bg-paper-bg px-[15px] text-[14.5px] font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
					/>
				</div>
			</div>
		</div>

		<!-- billing -->
		<div>
			<div class="mb-[14px] text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
				Billing
			</div>

			<div class="grid grid-cols-[1fr_1fr_98px] gap-[11px]">
				<div>
					<label
						for="firstName"
						class="mb-[7px] block text-[11px] font-bold tracking-[0.01em] text-soft"
					>
						First name <span class="text-prem">*</span>
					</label>
					<input
						id="firstName"
						type="text"
						required
						bind:value={formData.firstName}
						placeholder="First"
						class="h-[50px] w-full border-[1.5px] border-line2 bg-paper-bg px-[15px] text-[14.5px] font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
					/>
				</div>
				<div>
					<label
						for="lastName"
						class="mb-[7px] block text-[11px] font-bold tracking-[0.01em] text-soft"
					>
						Last name <span class="text-prem">*</span>
					</label>
					<input
						id="lastName"
						type="text"
						required
						bind:value={formData.lastName}
						placeholder="Last"
						class="h-[50px] w-full border-[1.5px] border-line2 bg-paper-bg px-[15px] text-[14.5px] font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
					/>
				</div>
				<div>
					<label for="zip" class="mb-[7px] block text-[11px] font-bold tracking-[0.01em] text-soft">
						ZIP <span class="text-prem">*</span>
					</label>
					<input
						id="zip"
						type="text"
						inputmode="numeric"
						required
						minlength="5"
						maxlength="10"
						bind:value={formData.zip}
						placeholder="ZIP"
						class="h-[50px] w-full border-[1.5px] border-line2 bg-paper-bg px-[15px] text-[14.5px] font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink"
					/>
				</div>
			</div>
		</div>

		<button
			type="submit"
			disabled={loading}
			class="inline-flex h-[54px] w-full items-center justify-center gap-2 border-[1.5px] border-prem bg-prem text-[13px] font-bold tracking-[0.07em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{loading ? 'Processing…' : `${submitText} →`}
		</button>
	</form>
{/if}
