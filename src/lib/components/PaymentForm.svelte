<script>
	/**
	 * Payment form — editorial styling (matches the player registration
	 * form on the AGE Open event signup page). Supports both one-off
	 * card payments and subscription flows via the `isSubscription` prop.
	 * Submit contract / API request shape is unchanged from the legacy
	 * version; only the presentation moved to the editorial palette.
	 */
	export let amount = '0.00';
	export let description = '';
	export let submitUrl = '';
	export let submitText = 'Pay Now';
	export let isSubscription = false;
	export let subscriptionType = 'monthly'; // 'monthly' or 'yearly'
	export let gemId = '';
	export let savedCards = []; // Array of saved cards
	export let showSaveCardOption = true; // Whether to show "save card" checkbox
	export let showTestData = false; // Show test card info (only in sandbox/dev)
	export let extraFields = {}; // Additional fields to send with the request body

	let loading = false;
	let error = '';
	let success = false;

	// Payment method selection
	let paymentMethod = savedCards.length > 0 ? 'saved' : 'new'; // 'saved' or 'new'
	let selectedCardId = savedCards.find((c) => c.isDefault)?.id || savedCards[0]?.id || '';
	let saveCard = false; // Whether to save the new card

	let formData = {
		cardNumber: '',
		expirationMonth: '',
		expirationYear: '',
		cardCode: '',
		firstName: '',
		lastName: '',
		zip: ''
	};

	// Update selected card when savedCards changes
	$: if (savedCards.length > 0 && !selectedCardId) {
		selectedCardId = savedCards.find((c) => c.isDefault)?.id || savedCards[0]?.id;
		paymentMethod = 'saved';
	}

	function cardTypeLabel(cardType) {
		switch (cardType?.toLowerCase()) {
			case 'visa':
				return 'Visa';
			case 'mastercard':
				return 'Mastercard';
			case 'amex':
			case 'american express':
				return 'Amex';
			case 'discover':
				return 'Discover';
			default:
				return 'Card';
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			let requestBody;

			if (paymentMethod === 'saved' && selectedCardId) {
				// Pay with saved card
				const selectedCard = savedCards.find((c) => c.id === selectedCardId);

				requestBody = {
					amount,
					description,
					isSubscription,
					subscriptionType: isSubscription ? subscriptionType : undefined,
					gemId: gemId || undefined,
					// Saved card payment
					useSavedCard: true,
					savedCardId: selectedCardId,
					customerProfileId: selectedCard?.customerProfileId,
					paymentProfileId: selectedCard?.paymentProfileId,
					...extraFields
				};
			} else {
				// Pay with new card
				const expirationDate = `${formData.expirationMonth.padStart(2, '0')}${formData.expirationYear.slice(-2)}`;

				requestBody = {
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
					// Option to save the card
					saveCard: saveCard && showSaveCardOption,
					...extraFields
				};
			}

			const response = await fetch(submitUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			const result = await response.json();

			if (response.ok && result.success) {
				success = true;
				// Redirect or show success message
				if (result.redirectUrl) {
					window.location.href = result.redirectUrl;
				}
			} else {
				error = result.error || 'Payment failed. Please try again.';
			}
		} catch (err) {
			error = 'Network error. Please check your connection and try again.';
		} finally {
			loading = false;
		}
	}

	// Auto-format card number with spaces
	function formatCardNumber(e) {
		let value = e.target.value.replace(/\s/g, '');
		let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
		formData.cardNumber = formatted;
	}

	// Get current year for expiration dropdown
	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
</script>

{#if success}
	<!-- Success card — prem-green editorial confirmation. Mirrors the
		 "already registered" surface on the event page so the user reads
		 the post-purchase state in the same visual register. -->
	<div class="border-prem bg-paper-bg border-l-[3px] border border-line2 px-7 py-7 text-center">
		<div
			class="text-prem font-mono-system mb-2 text-[10px] font-extrabold tracking-[0.16em] uppercase"
		>
			Payment successful
		</div>
		<h3 class="font-newsreader text-[24px] font-semibold tracking-[-0.01em]">
			Thank you for your purchase.
		</h3>
		<p class="text-soft mt-3 text-[14px] leading-[1.55]">
			You'll receive a confirmation email shortly with your order details.
		</p>
	</div>
{:else}
	<form on:submit={handleSubmit} class="space-y-6">
		{#if error}
			<!-- Error notice — warm-bordered editorial alert (same pattern
				 the player registration form uses for premium upsells / hints). -->
			<div class="border-warm bg-paper-bg border-l-[3px] border border-line2 px-4 py-3">
				<div
					class="text-warm font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
				>
					Payment error
				</div>
				<p class="text-soft mt-1 text-[13px] leading-[1.5]">{error}</p>
			</div>
		{/if}

		<!-- Payment method tabs — only when the user has saved cards -->
		{#if savedCards.length > 0}
			<div class="space-y-4">
				<div
					class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
				>
					Payment Method
				</div>

				<!-- Editorial tab pair: two square ink-bordered tabs, active
					 tab fills with ink + paper text. Same square-button
					 language used elsewhere in the editorial chrome. -->
				<div class="border-line2 grid grid-cols-2 gap-px border bg-[#E4DECF]">
					<button
						type="button"
						on:click={() => (paymentMethod = 'saved')}
						class="font-mono-system px-4 py-3 text-[11px] font-extrabold tracking-[0.1em] uppercase transition-colors {paymentMethod ===
						'saved'
							? 'bg-ink text-paper-bg'
							: 'bg-paper text-soft hover:text-ink'}"
					>
						Saved card
					</button>
					<button
						type="button"
						on:click={() => (paymentMethod = 'new')}
						class="font-mono-system px-4 py-3 text-[11px] font-extrabold tracking-[0.1em] uppercase transition-colors {paymentMethod ===
						'new'
							? 'bg-ink text-paper-bg'
							: 'bg-paper text-soft hover:text-ink'}"
					>
						New card
					</button>
				</div>

				<!-- Saved cards list — radio rows -->
				{#if paymentMethod === 'saved'}
					<div class="space-y-2">
						{#each savedCards as card (card.id)}
							<label
								class="border-line2 bg-paper-bg flex cursor-pointer items-center gap-3 border px-4 py-[14px] transition-colors {selectedCardId ===
								card.id
									? '!border-ink'
									: 'hover:border-ink/40'}"
							>
								<input
									type="radio"
									name="savedCard"
									value={card.id}
									bind:group={selectedCardId}
									class="text-ink focus:ring-ink h-4 w-4 border-line2 bg-paper focus:ring-offset-0"
								/>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="text-ink font-semibold">
											{cardTypeLabel(card.cardType)} <span class="text-fade font-mono-system">•••• {card.lastFour}</span>
										</span>
										{#if card.isDefault}
											<span
												class="border-line2 text-fade font-mono-system border px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.1em] uppercase"
											>
												Default
											</span>
										{/if}
									</div>
									<div class="text-fade mt-[3px] text-[12px] font-semibold">
										Expires {card.expirationMonth}/{card.expirationYear}
										{#if card.nickname}
											<span class="text-fade">· {card.nickname}</span>
										{/if}
									</div>
								</div>
							</label>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- New card branch — shown when no saved cards or "new" tab is active -->
		{#if savedCards.length === 0 || paymentMethod === 'new'}
			<!-- Test data helper — only renders in sandbox/dev. Editorial
				 warm-bordered card matching the Premium notice pattern. -->
			{#if showTestData}
				<div class="border-warm bg-paper-bg border-l-[3px] border border-line2 px-4 py-3">
					<div
						class="text-warm font-mono-system mb-2 text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						Test mode
					</div>
					<div class="text-soft grid grid-cols-2 gap-x-4 gap-y-[3px] text-[12px]">
						<div><span class="text-fade">Card:</span> <span class="font-mono-system">4007 0000 0002 7</span></div>
						<div><span class="text-fade">Exp:</span> <span class="font-mono-system">12/2028</span></div>
						<div><span class="text-fade">CVV:</span> <span class="font-mono-system">123</span></div>
						<div><span class="text-fade">ZIP:</span> <span class="font-mono-system">12345</span></div>
					</div>
				</div>
			{/if}

			<!-- Card Information -->
			<fieldset class="space-y-4">
				<legend
					class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.16em] uppercase"
				>
					Card Information
				</legend>

				<div>
					<label
						for="cardNumber"
						class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase"
					>
						Card Number <span class="text-warm">*</span>
					</label>
					<input
						id="cardNumber"
						type="text"
						inputmode="numeric"
						maxlength="19"
						required={paymentMethod === 'new'}
						bind:value={formData.cardNumber}
						on:input={formatCardNumber}
						placeholder="1234 5678 9012 3456"
						class="border-line2 bg-paper text-ink placeholder:text-fade focus:border-ink font-mono-system w-full border px-3 py-[10px] text-[14px] tracking-[0.04em] focus:outline-none"
					/>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div>
						<label
							for="expMonth"
							class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Month <span class="text-warm">*</span>
						</label>
						<select
							id="expMonth"
							required={paymentMethod === 'new'}
							bind:value={formData.expirationMonth}
							class="border-line2 bg-paper text-ink focus:border-ink w-full border px-3 py-[10px] text-[14px] focus:outline-none"
						>
							<option value="">MM</option>
							{#each Array(12) as _, i}
								<option value={String(i + 1).padStart(2, '0')}
									>{String(i + 1).padStart(2, '0')}</option
								>
							{/each}
						</select>
					</div>

					<div>
						<label
							for="expYear"
							class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Year <span class="text-warm">*</span>
						</label>
						<select
							id="expYear"
							required={paymentMethod === 'new'}
							bind:value={formData.expirationYear}
							class="border-line2 bg-paper text-ink focus:border-ink w-full border px-3 py-[10px] text-[14px] focus:outline-none"
						>
							<option value="">YYYY</option>
							{#each years as year}
								<option value={String(year)}>{year}</option>
							{/each}
						</select>
					</div>

					<div>
						<label
							for="cardCode"
							class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							CVV <span class="text-warm">*</span>
						</label>
						<input
							id="cardCode"
							type="text"
							inputmode="numeric"
							minlength="3"
							maxlength="4"
							required={paymentMethod === 'new'}
							bind:value={formData.cardCode}
							placeholder="123"
							class="border-line2 bg-paper text-ink placeholder:text-fade focus:border-ink font-mono-system w-full border px-3 py-[10px] text-[14px] focus:outline-none"
						/>
					</div>
				</div>
			</fieldset>

			<!-- Billing Information -->
			<fieldset class="space-y-4">
				<legend
					class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.16em] uppercase"
				>
					Billing Information
				</legend>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-5">
					<div class="sm:col-span-2">
						<label
							for="firstName"
							class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							First Name <span class="text-warm">*</span>
						</label>
						<input
							id="firstName"
							type="text"
							required={paymentMethod === 'new'}
							bind:value={formData.firstName}
							placeholder="Enter first name"
							class="border-line2 bg-paper text-ink placeholder:text-fade focus:border-ink w-full border px-3 py-[10px] text-[14px] focus:outline-none"
						/>
					</div>

					<div class="sm:col-span-2">
						<label
							for="lastName"
							class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Last Name <span class="text-warm">*</span>
						</label>
						<input
							id="lastName"
							type="text"
							required={paymentMethod === 'new'}
							bind:value={formData.lastName}
							placeholder="Enter last name"
							class="border-line2 bg-paper text-ink placeholder:text-fade focus:border-ink w-full border px-3 py-[10px] text-[14px] focus:outline-none"
						/>
					</div>

					<div class="sm:col-span-1">
						<label
							for="zip"
							class="text-fade font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							ZIP <span class="text-warm">*</span>
						</label>
						<input
							id="zip"
							type="text"
							required={paymentMethod === 'new'}
							minlength="5"
							maxlength="10"
							bind:value={formData.zip}
							placeholder="90001"
							class="border-line2 bg-paper text-ink placeholder:text-fade focus:border-ink font-mono-system w-full border px-3 py-[10px] text-[14px] focus:outline-none"
						/>
					</div>
				</div>
			</fieldset>

			<!-- Save card option -->
			{#if showSaveCardOption}
				<label class="group flex cursor-pointer items-center gap-3 pt-1">
					<input
						type="checkbox"
						bind:checked={saveCard}
						class="border-line2 bg-paper text-ink focus:ring-ink h-[16px] w-[16px] focus:ring-offset-0"
					/>
					<span class="text-soft group-hover:text-ink text-[13px] font-medium transition-colors">
						Save this card for faster checkout next time
					</span>
				</label>
			{/if}
		{/if}

		<!-- Submit button — solid prem-green for both purchases and
			 subscriptions, matching the "Get Premium" / "Become a member"
			 CTAs elsewhere in the editorial chrome. -->
		<button
			type="submit"
			disabled={loading}
			class="bg-prem border-prem inline-flex w-full items-center justify-center gap-2 border-[1.5px] px-6 py-[14px] text-[12px] font-bold tracking-[0.06em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{#if loading}
				<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Processing…
			{:else}
				{submitText}
			{/if}
		</button>

		<!-- Security note — mono caption, same pattern as the order summary -->
		<div
			class="text-fade font-mono-system flex items-center justify-center gap-2 text-center text-[10px] font-bold tracking-[0.12em] uppercase"
		>
			Secure 256-bit SSL · Authorize.Net
		</div>
	</form>
{/if}
