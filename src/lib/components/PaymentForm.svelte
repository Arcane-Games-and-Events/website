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
	<div class="border-[3px] border-double border-ink bg-paper px-7 py-9 text-center">
		<div class="mb-2 text-[10px] font-extrabold tracking-[0.22em] text-prem uppercase">
			Payment successful
		</div>
		<h3 class="ao-cond text-[40px] leading-[0.9] font-black uppercase">You’re all set.</h3>
		<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft italic">
			You'll receive a confirmation email shortly with your order details.
		</p>
	</div>
{:else}
	<form on:submit={handleSubmit} class="space-y-6">
		{#if error}
			<!-- Error notice — warm-bordered editorial alert (same pattern
				 the player registration form uses for premium upsells / hints). -->
			<div class="border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3">
				<div class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
					Payment error
				</div>
				<p class="mt-1 font-newsreader text-[15px] leading-[1.45] text-ink">{error}</p>
			</div>
		{/if}

		<!-- Payment method tabs — only when the user has saved cards -->
		{#if savedCards.length > 0}
			<div class="space-y-4">
				<div class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
					Payment Method
				</div>

				<!-- Editorial tab pair: two square ink-bordered tabs, active
					 tab fills with ink + paper text. Same square-button
					 language used elsewhere in the editorial chrome. -->
				<div class="grid grid-cols-2 border border-line2">
					<button
						type="button"
						on:click={() => (paymentMethod = 'saved')}
						class="px-4 py-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors {paymentMethod ===
						'saved'
							? 'bg-ink text-paper-bg'
							: 'bg-paper-bg text-soft hover:text-ink'}"
					>
						Saved card
					</button>
					<button
						type="button"
						on:click={() => (paymentMethod = 'new')}
						class="px-4 py-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors {paymentMethod ===
						'new'
							? 'bg-ink text-paper-bg'
							: 'bg-paper-bg text-soft hover:text-ink'}"
					>
						New card
					</button>
				</div>

				<!-- Saved cards list — radio rows -->
				{#if paymentMethod === 'saved'}
					<div class="space-y-2">
						{#each savedCards as card (card.id)}
							<label
								class="flex cursor-pointer items-center gap-3 border border-line2 bg-paper-bg px-4 py-4 transition-colors {selectedCardId ===
								card.id
									? '!border-ink'
									: 'hover:border-ink/40'}"
							>
								<input
									type="radio"
									name="savedCard"
									value={card.id}
									bind:group={selectedCardId}
									class="h-4 w-4 border-line2 bg-paper text-ink focus:ring-ink focus:ring-offset-0"
								/>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="font-newsreader text-[17px] font-semibold text-ink">
											{cardTypeLabel(card.cardType)}
											<span class="ml-1 text-[13px] tracking-[0.14em] text-fade tabular-nums"
												>•••• {card.lastFour}</span
											>
										</span>
										{#if card.isDefault}
											<span
												class="border border-ink px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.16em] uppercase"
											>
												Default
											</span>
										{/if}
									</div>
									<div class="mt-[3px] text-[12px] font-semibold text-fade">
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
				<div class="border-l-[3px] border-warm bg-warm/5 px-4 py-3">
					<div class="mb-2 text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">
						Test mode
					</div>
					<div class="grid grid-cols-2 gap-x-4 gap-y-[3px] text-[12px] text-soft">
						<div>
							<span class="text-fade">Card:</span>
							<span class="font-mono-system">4007 0000 0002 7</span>
						</div>
						<div>
							<span class="text-fade">Exp:</span> <span class="font-mono-system">12/2028</span>
						</div>
						<div><span class="text-fade">CVV:</span> <span class="font-mono-system">123</span></div>
						<div>
							<span class="text-fade">ZIP:</span> <span class="font-mono-system">12345</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Card Information -->
			<fieldset class="space-y-4">
				<legend
					class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
				>
					Card Information
				</legend>

				<div>
					<label
						for="cardNumber"
						class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Card Number <span class="text-warm" aria-hidden="true">◆</span>
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
						class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] tracking-[0.06em] text-ink tabular-nums transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
					/>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div>
						<label
							for="expMonth"
							class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Month <span class="text-warm" aria-hidden="true">◆</span>
						</label>
						<select
							id="expMonth"
							required={paymentMethod === 'new'}
							bind:value={formData.expirationMonth}
							class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
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
							class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Year <span class="text-warm" aria-hidden="true">◆</span>
						</label>
						<select
							id="expYear"
							required={paymentMethod === 'new'}
							bind:value={formData.expirationYear}
							class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
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
							class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							CVV <span class="text-warm" aria-hidden="true">◆</span>
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
							class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] tracking-[0.06em] text-ink tabular-nums transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
						/>
					</div>
				</div>
			</fieldset>

			<!-- Billing Information -->
			<fieldset class="space-y-4">
				<legend
					class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
				>
					Billing Information
				</legend>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-5">
					<div class="sm:col-span-2">
						<label
							for="firstName"
							class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							First Name <span class="text-warm" aria-hidden="true">◆</span>
						</label>
						<input
							id="firstName"
							type="text"
							required={paymentMethod === 'new'}
							bind:value={formData.firstName}
							placeholder="Enter first name"
							class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
						/>
					</div>

					<div class="sm:col-span-2">
						<label
							for="lastName"
							class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Last Name <span class="text-warm" aria-hidden="true">◆</span>
						</label>
						<input
							id="lastName"
							type="text"
							required={paymentMethod === 'new'}
							bind:value={formData.lastName}
							placeholder="Enter last name"
							class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
						/>
					</div>

					<div class="sm:col-span-1">
						<label
							for="zip"
							class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							ZIP <span class="text-warm" aria-hidden="true">◆</span>
						</label>
						<input
							id="zip"
							type="text"
							required={paymentMethod === 'new'}
							minlength="5"
							maxlength="10"
							bind:value={formData.zip}
							placeholder="90001"
							class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] tracking-[0.06em] text-ink tabular-nums transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
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
						class="h-[18px] w-[18px] shrink-0 cursor-pointer rounded-none border-[1.5px] border-ink bg-paper-bg text-ink checked:border-ink checked:bg-ink focus:ring-ink focus:ring-offset-0"
					/>
					<span class="text-[13px] font-medium text-soft transition-colors group-hover:text-ink">
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
			class="inline-flex w-full items-center justify-center gap-2 bg-prem px-6 py-4 text-[11px] font-extrabold tracking-[0.18em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
			class="flex items-center justify-center gap-2 text-center text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase"
		>
			Secure 256-bit SSL · Authorize.Net
		</div>
	</form>
{/if}
