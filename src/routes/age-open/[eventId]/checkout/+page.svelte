<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';

	export let data;

	let gemId = '';
	let error = '';
	let canProceed = true;

	$: if (data.event.gemIdRequired) {
		canProceed = gemId.trim().length > 0;
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(date);
	}
</script>

<svelte:head>
	<title>{data.event.title} - Checkout</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-800 to-gray-950 py-12">
	<div class="container mx-auto max-w-5xl px-4">
		<!-- Back Link -->
		<div class="mb-6">
			<a
				href="/age-open"
				class="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors"
			>
				<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to Events
			</a>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Event Details Column -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Event Information Card -->
				<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6">
					<h1 class="text-3xl font-bold text-gray-100 mb-4">
						{data.event.title}
					</h1>

					<!-- Badges -->
					<div class="flex flex-wrap gap-2 mb-6">
						{#if data.event.format}
							<span class="px-3 py-1 text-sm rounded-full bg-white text-gray-900 font-medium">
								{data.event.format}
							</span>
						{/if}
						{#if data.event.circuit}
							<span class="px-3 py-1 text-sm rounded-full bg-blue-500 text-white font-medium">
								{data.event.circuit}
							</span>
						{/if}
						{#if data.hasPremiumDiscount}
							<span class="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 font-medium">
								Premium Discount Applied
							</span>
						{/if}
					</div>

					<!-- Event Details -->
					<div class="space-y-4">
						{#if data.event.eventDate}
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								<div>
									<p class="text-sm font-medium text-gray-400">Date & Time</p>
									<p class="text-gray-100 font-medium">{formatDate(data.event.eventDate)}</p>
								</div>
							</div>
						{/if}

						{#if data.event.location}
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
								<div>
									<p class="text-sm font-medium text-gray-400">Location</p>
									<p class="text-gray-100 font-medium">{data.event.location}</p>
									{#if data.event.address}
										<p class="text-gray-300 text-sm mt-1">{data.event.address}</p>
									{/if}
								</div>
							</div>
						{/if}

						{#if data.event.description}
							<div class="pt-4 border-t border-gray-700">
								<p class="text-sm font-medium text-gray-400 mb-2">Description</p>
								<p class="text-gray-100">{data.event.description}</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Gem ID Input (if required) -->
				{#if data.event.gemIdRequired}
					<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6">
						<h2 class="text-xl font-semibold text-gray-100 mb-4">
							Gem ID Required
						</h2>
						<p class="text-sm text-gray-400 mb-4">
							This event requires a Gem ID for registration. Please enter your Gem ID below.
						</p>
						<div>
							<label for="gemId" class="block text-sm font-medium text-gray-100 mb-2">
								Gem ID *
							</label>
							<input
								type="text"
								id="gemId"
								bind:value={gemId}
								required
								placeholder="Enter your Gem ID"
								class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
							/>
						</div>
					</div>
				{/if}
			</div>

			<!-- Payment Column -->
			<div class="lg:col-span-1">
				<!-- Order Summary Card -->
				<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6 sticky top-6">
					<h2 class="text-xl font-semibold text-gray-100 mb-6">
						Order Summary
					</h2>

					<div class="space-y-4 mb-6">
						<div class="flex justify-between items-start">
							<span class="text-gray-400">Event</span>
							<span class="text-gray-100 font-medium text-right">{data.event.title}</span>
						</div>

						{#if data.hasPremiumDiscount}
							<div class="flex justify-between items-center">
								<span class="text-gray-400">Original Price</span>
								<span class="text-gray-400 line-through">${parseFloat(data.event.price).toFixed(2)}</span>
							</div>
							<div class="flex justify-between items-center text-green-600">
								<span>Premium Discount (10%)</span>
								<span>-${(parseFloat(data.event.price) * 0.1).toFixed(2)}</span>
							</div>
						{/if}

						<div class="border-t border-gray-700 pt-4 flex justify-between items-center">
							<span class="text-lg font-semibold text-gray-100">Total</span>
							<span class="text-2xl font-bold text-gray-100">
								${data.finalPrice}
							</span>
						</div>
					</div>

					<!-- Validation Error -->
					{#if data.event.gemIdRequired && !gemId && error}
						<div class="rounded-[var(--radius)] bg-red-700 bg-opacity-10 border border-red-700 p-4 mb-4">
							<p class="text-sm text-red-700">Please enter your Gem ID before proceeding with payment.</p>
						</div>
					{/if}

					<!-- General Error -->
					{#if error && !(data.event.gemIdRequired && !gemId)}
						<div class="rounded-[var(--radius)] bg-red-700 bg-opacity-10 border border-red-700 p-4 mb-4">
							<p class="text-sm text-red-700">{error}</p>
						</div>
					{/if}

					<!-- Proceed to Payment Button -->
					{#if data.event.gemIdRequired && !canProceed}
						<div class="border-t border-gray-700 pt-6">
							<div class="rounded-[var(--radius)] bg-yellow-50 border border-yellow-200 p-4">
								<p class="text-sm text-yellow-800 font-medium">
									Please enter your Gem ID above to continue with payment.
								</p>
							</div>
						</div>
					{:else}
						<div class="border-t border-gray-700 pt-6">
							<a
								href="#payment"
								class="block w-full rounded-[var(--radius)] bg-white px-6 py-3 text-center text-lg font-semibold text-gray-900 hover:opacity-90 transition-opacity"
							>
								Proceed to Payment
							</a>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Payment Form Section -->
		{#if !data.event.gemIdRequired || canProceed}
			<div id="payment" class="mt-12 scroll-mt-8">
				<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-8">
					<h2 class="text-2xl font-bold text-gray-100 mb-6">
						Complete Your Purchase
					</h2>

					<PaymentForm
						amount={data.finalPrice}
						description={`Ticket for ${data.event.title}`}
						submitUrl={`/api/events/${data.event.id}/purchase`}
						submitText="Complete Purchase"
						gemId={gemId}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
