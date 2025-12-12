<script>
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

	let loading = false;
	let error = '';
	let success = false;

	// Payment method selection
	let paymentMethod = savedCards.length > 0 ? 'saved' : 'new'; // 'saved' or 'new'
	let selectedCardId = savedCards.find(c => c.isDefault)?.id || savedCards[0]?.id || '';
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
		selectedCardId = savedCards.find(c => c.isDefault)?.id || savedCards[0]?.id;
		paymentMethod = 'saved';
	}

	// Get card icon based on card type
	function getCardIcon(cardType) {
		switch (cardType?.toLowerCase()) {
			case 'visa':
				return '💳 Visa';
			case 'mastercard':
				return '💳 Mastercard';
			case 'amex':
			case 'american express':
				return '💳 Amex';
			case 'discover':
				return '💳 Discover';
			default:
				return '💳 Card';
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		console.log('Form submitted!');
		loading = true;
		error = '';

		try {
			let requestBody;

			if (paymentMethod === 'saved' && selectedCardId) {
				// Pay with saved card
				const selectedCard = savedCards.find(c => c.id === selectedCardId);
				console.log('Paying with saved card:', selectedCard?.lastFour);

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
					paymentProfileId: selectedCard?.paymentProfileId
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
					saveCard: saveCard && showSaveCardOption
				};
			}

			console.log('Sending payment request to:', submitUrl);
			console.log('Amount:', amount);

			const response = await fetch(submitUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			const result = await response.json();
			console.log('Response status:', response.status);
			console.log('Response data:', result);

			if (response.ok && result.success) {
				console.log('Payment successful!');
				success = true;
				// Redirect or show success message
				if (result.redirectUrl) {
					window.location.href = result.redirectUrl;
				}
			} else {
				console.error('Payment failed:', result.error);
				error = result.error || 'Payment failed. Please try again.';
			}
		} catch (err) {
			error = 'Network error. Please check your connection and try again.';
			console.error('Payment error:', err);
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
	<div class="rounded-xl border border-green-500/30 bg-green-500/10 p-8 text-center">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
			<svg class="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
		</div>
		<h3 class="mb-2 text-2xl font-bold text-white">Payment Successful!</h3>
		<p class="text-green-300">Thank you for your purchase. You will receive a confirmation email shortly.</p>
	</div>
{:else}
	<form on:submit={handleSubmit} class="space-y-6">
		{#if error}
			<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
				<svg class="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-sm text-red-300">{error}</p>
			</div>
		{/if}

		<!-- Payment Method Selection (only show if user has saved cards) -->
		{#if savedCards.length > 0}
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
					</svg>
					<h3 class="text-base font-semibold text-white">Payment Method</h3>
				</div>

				<!-- Payment method tabs -->
				<div class="flex gap-2">
					<button
						type="button"
						on:click={() => paymentMethod = 'saved'}
						class="flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all {paymentMethod === 'saved'
							? 'border-blue-500 bg-blue-500/10 text-blue-400'
							: 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'}"
					>
						Saved Card
					</button>
					<button
						type="button"
						on:click={() => paymentMethod = 'new'}
						class="flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all {paymentMethod === 'new'
							? 'border-blue-500 bg-blue-500/10 text-blue-400'
							: 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'}"
					>
						New Card
					</button>
				</div>

				<!-- Saved cards list -->
				{#if paymentMethod === 'saved'}
					<div class="space-y-2">
						{#each savedCards as card (card.id)}
							<label
								class="flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all {selectedCardId === card.id
									? 'border-blue-500 bg-blue-500/10'
									: 'border-gray-700 bg-gray-900 hover:border-gray-600'}"
							>
								<input
									type="radio"
									name="savedCard"
									value={card.id}
									bind:group={selectedCardId}
									class="h-4 w-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800 border-gray-600"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-white font-medium">
											{getCardIcon(card.cardType)} •••• {card.lastFour}
										</span>
										{#if card.isDefault}
											<span class="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">Default</span>
										{/if}
									</div>
									<div class="text-sm text-gray-400">
										Expires {card.expirationMonth}/{card.expirationYear}
										{#if card.nickname}
											<span class="text-gray-500">• {card.nickname}</span>
										{/if}
									</div>
								</div>
							</label>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- New Card Form (show if no saved cards or "new card" selected) -->
		{#if savedCards.length === 0 || paymentMethod === 'new'}
			<!-- Test Data Helper (only shown in sandbox/dev) -->
			{#if showTestData}
				<div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
					<div class="flex items-center gap-2 mb-2">
						<svg class="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-sm font-semibold text-amber-300">Test Mode</p>
					</div>
					<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-200/80">
						<div><span class="text-amber-300">Card:</span> 4007 0000 0002 7</div>
						<div><span class="text-amber-300">Exp:</span> 12/2028</div>
						<div><span class="text-amber-300">CVV:</span> 123</div>
						<div><span class="text-amber-300">ZIP:</span> 12345</div>
					</div>
				</div>
			{/if}

			<!-- Card Information -->
		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
				</svg>
				<h3 class="text-base font-semibold text-white">Card Information</h3>
			</div>

			<div>
				<label for="cardNumber" class="mb-1.5 block text-sm font-medium text-gray-300">
					Card Number <span class="text-red-400">*</span>
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
					class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
				/>
			</div>

			<div class="grid grid-cols-3 gap-3">
				<div>
					<label for="expMonth" class="mb-1.5 block text-sm font-medium text-gray-300">
						Month <span class="text-red-400">*</span>
					</label>
					<select
						id="expMonth"
						required={paymentMethod === 'new'}
						bind:value={formData.expirationMonth}
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
					>
						<option value="" class="text-gray-500">MM</option>
						{#each Array(12) as _, i}
							<option value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="expYear" class="mb-1.5 block text-sm font-medium text-gray-300">
						Year <span class="text-red-400">*</span>
					</label>
					<select
						id="expYear"
						required={paymentMethod === 'new'}
						bind:value={formData.expirationYear}
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
					>
						<option value="" class="text-gray-500">YYYY</option>
						{#each years as year}
							<option value={String(year)}>{year}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="cardCode" class="mb-1.5 block text-sm font-medium text-gray-300">
						CVV <span class="text-red-400">*</span>
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
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
					/>
				</div>
			</div>
		</div>

		<!-- Billing Information -->
		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
				<h3 class="text-base font-semibold text-white">Billing Info</h3>
			</div>

			<div class="grid grid-cols-5 gap-3">
				<div class="col-span-2">
					<label for="firstName" class="mb-1.5 block text-sm font-medium text-gray-300">
						First Name <span class="text-red-400">*</span>
					</label>
					<input
						id="firstName"
						type="text"
						required={paymentMethod === 'new'}
						bind:value={formData.firstName}
						placeholder="John"
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
					/>
				</div>

				<div class="col-span-2">
					<label for="lastName" class="mb-1.5 block text-sm font-medium text-gray-300">
						Last Name <span class="text-red-400">*</span>
					</label>
					<input
						id="lastName"
						type="text"
						required={paymentMethod === 'new'}
						bind:value={formData.lastName}
						placeholder="Doe"
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
					/>
				</div>

				<div class="col-span-1">
					<label for="zip" class="mb-1.5 block text-sm font-medium text-gray-300">
						ZIP <span class="text-red-400">*</span>
					</label>
					<input
						id="zip"
						type="text"
						required={paymentMethod === 'new'}
						minlength="5"
						maxlength="10"
						bind:value={formData.zip}
						placeholder="90001"
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
					/>
				</div>
			</div>
		</div>

			<!-- Save Card Option -->
			{#if showSaveCardOption}
				<label class="flex items-center gap-3 cursor-pointer group">
					<input
						type="checkbox"
						bind:checked={saveCard}
						class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
					/>
					<span class="text-sm text-gray-300 group-hover:text-white transition-colors">
						Save this card for faster checkout next time
					</span>
				</label>
			{/if}
		{/if}

		<!-- Submit Button -->
		<button
			type="submit"
			disabled={loading}
			class="w-full rounded-xl bg-gradient-to-r px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2
				{isSubscription
					? 'from-emerald-500 to-green-600 shadow-emerald-500/25 hover:shadow-emerald-500/30 hover:from-emerald-400 hover:to-green-500'
					: 'from-blue-500 to-blue-600 shadow-blue-500/25 hover:shadow-blue-500/30 hover:from-blue-400 hover:to-blue-500'}"
		>
			{#if loading}
				<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				Processing...
			{:else}
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
				</svg>
				{submitText}
			{/if}
		</button>

		<!-- Security Note -->
		<div class="flex items-center justify-center gap-2 text-xs text-gray-500">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
			</svg>
			<span>Secure 256-bit SSL encryption powered by Authorize.net</span>
		</div>
	</form>
{/if}
