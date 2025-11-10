<script>
	export let amount = '0.00';
	export let description = '';
	export let submitUrl = '';
	export let submitText = 'Pay Now';
	export let isSubscription = false;
	export let gemId = '';

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
		address: '',
		city: '',
		state: '',
		zip: ''
	};

	async function handleSubmit(e) {
		e.preventDefault();
		console.log('Form submitted!');
		loading = true;
		error = '';

		try {
			// Format expiration date as MMYY
			const expirationDate = `${formData.expirationMonth.padStart(2, '0')}${formData.expirationYear.slice(-2)}`;

			console.log('Sending payment request to:', submitUrl);
			console.log('Amount:', amount);

			const response = await fetch(submitUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					amount,
					cardNumber: formData.cardNumber.replace(/\s/g, ''),
					expirationDate,
					cardCode: formData.cardCode,
					description,
					isSubscription,
					gemId: gemId || undefined,
					billTo: {
						firstName: formData.firstName,
						lastName: formData.lastName,
						address: formData.address,
						city: formData.city,
						state: formData.state,
						zip: formData.zip
					}
				})
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
	<div class="rounded-lg bg-green-50 p-6 text-center">
		<h3 class="mb-2 text-2xl font-bold text-green-800">Payment Successful!</h3>
		<p class="text-green-700">Thank you for your purchase.</p>
	</div>
{:else}
	<form on:submit={handleSubmit} class="mx-auto max-w-2xl space-y-6">
		{#if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-800">
				{error}
			</div>
		{/if}

		<!-- Test Data Helper -->
		<div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
			<p class="text-sm font-semibold text-blue-900 mb-2">🧪 Test Mode - Use these details:</p>
			<div class="grid grid-cols-2 gap-2 text-xs text-blue-800">
				<div><strong>Card:</strong> 4007 0000 0002 7 (or 5424000000000015)</div>
				<div><strong>Exp:</strong> 12/2028</div>
				<div><strong>CVV:</strong> 123</div>
				<div><strong>ZIP:</strong> 12345</div>
			</div>
		</div>

		<!-- Payment Summary -->
		<div class="rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-6">
			<h3 class="mb-2 text-xl font-bold text-[hsl(var(--foreground))]">Payment Summary</h3>
			<p class="mb-1 text-[hsl(var(--foreground))] opacity-80">{description}</p>
			<p class="text-2xl font-bold text-[hsl(var(--foreground))]">${amount}</p>
			{#if isSubscription}
				<p class="text-sm text-[hsl(var(--muted-foreground))]">Billed monthly</p>
			{/if}
		</div>

		<!-- Card Information -->
		<div class="space-y-4">
			<h3 class="text-xl font-bold text-[hsl(var(--foreground))]">Card Information</h3>

			<div>
				<label for="cardNumber" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">Card Number</label>
				<input
					id="cardNumber"
					type="text"
					inputmode="numeric"
					maxlength="19"
					required
					bind:value={formData.cardNumber}
					on:input={formatCardNumber}
					placeholder="4007 0000 0002 7"
					class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
				/>
				<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Test card: 4007 0000 0002 7</p>
			</div>

			<div class="grid grid-cols-3 gap-4">
				<div>
					<label for="expMonth" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">Exp. Month</label>
					<select
						id="expMonth"
						required
						bind:value={formData.expirationMonth}
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
					>
						<option value="">MM</option>
						{#each Array(12) as _, i}
							<option value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="expYear" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">Exp. Year</label>
					<select
						id="expYear"
						required
						bind:value={formData.expirationYear}
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
					>
						<option value="">YYYY</option>
						{#each years as year}
							<option value={String(year)}>{year}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="cardCode" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">CVV</label>
					<input
						id="cardCode"
						type="text"
						inputmode="numeric"
						minlength="3"
						maxlength="4"
						required
						bind:value={formData.cardCode}
						placeholder="123"
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
					/>
				</div>
			</div>
		</div>

		<!-- Billing Information -->
		<div class="space-y-4">
			<h3 class="text-xl font-bold text-[hsl(var(--foreground))]">Billing Information</h3>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="firstName" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">First Name</label>
					<input
						id="firstName"
						type="text"
						required
						bind:value={formData.firstName}
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
					/>
				</div>

				<div>
					<label for="lastName" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">Last Name</label>
					<input
						id="lastName"
						type="text"
						required
						bind:value={formData.lastName}
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
					/>
				</div>
			</div>

			<div>
				<label for="address" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">Address</label>
				<input
					id="address"
					type="text"
					required
					bind:value={formData.address}
					class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
				/>
			</div>

			<div class="grid grid-cols-3 gap-4">
				<div>
					<label for="city" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">City</label>
					<input
						id="city"
						type="text"
						required
						bind:value={formData.city}
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
					/>
				</div>

				<div>
					<label for="state" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">State</label>
					<input
						id="state"
						type="text"
						required
						minlength="2"
						maxlength="2"
						bind:value={formData.state}
						on:input={(e) => formData.state = e.target.value.toUpperCase()}
						placeholder="CA"
						class="w-full rounded-md border border-gray-300 px-4 py-2 uppercase"
					/>
				</div>

				<div>
					<label for="zip" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">ZIP Code</label>
					<input
						id="zip"
						type="text"
						required
						minlength="5"
						maxlength="10"
						bind:value={formData.zip}
						placeholder="12345"
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
					/>
				</div>
			</div>
		</div>

		<!-- Submit Button -->
		<button
			type="submit"
			disabled={loading}
			class="w-full rounded-lg bg-[hsl(var(--primary))] px-6 py-3 text-lg font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
		>
			{loading ? 'Processing...' : submitText}
		</button>

		<p class="text-center text-sm text-[hsl(var(--muted-foreground))]">
			Your payment information is securely processed by Authorize.net
		</p>
	</form>
{/if}
