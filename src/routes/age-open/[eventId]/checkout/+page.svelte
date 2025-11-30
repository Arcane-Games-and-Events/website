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

	function formatShortDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}
</script>

<svelte:head>
	<title>{data.event.title} - Checkout</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Header -->
	<div class="relative overflow-hidden border-b border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800">
		<div class="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5"></div>
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
		<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl"></div>

		<div class="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<!-- Back Link -->
			<a
				href="/age-open"
				class="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
			>
				<svg class="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to Events
			</a>

			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div class="flex items-center gap-3 mb-2">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
							<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
							</svg>
						</div>
						<span class="text-sm font-medium text-blue-400 uppercase tracking-wider">Checkout</span>
					</div>
					<h1 class="text-2xl font-bold text-white sm:text-3xl">{data.event.title}</h1>
				</div>

				<!-- Badges -->
				<div class="flex flex-wrap gap-2">
					{#if data.event.format}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm border border-white/10">
							<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
							</svg>
							{data.event.format}
						</span>
					{/if}
					{#if data.event.circuit}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1.5 text-sm font-medium text-blue-400 border border-blue-500/30">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
							</svg>
							{data.event.circuit}
						</span>
					{/if}
					{#if data.hasPremiumDiscount}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 border border-emerald-500/30">
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
							</svg>
							Premium Discount
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Event Details Column -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Event Information Card -->
				<div class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-all duration-300 hover:border-gray-700">
					<div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

					<div class="relative">
						<div class="flex items-center gap-3 mb-6">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
								<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h2 class="text-xl font-semibold text-white">Event Details</h2>
						</div>

						<!-- Event Details Grid -->
						<div class="grid gap-6 sm:grid-cols-2">
							{#if data.event.eventDate}
								<div class="flex items-start gap-4 rounded-lg border border-gray-800 bg-gray-800/30 p-4 transition-colors hover:border-gray-700">
									<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
										<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
									<div class="min-w-0">
										<p class="text-sm font-medium text-gray-400">Date & Time</p>
										<p class="mt-1 font-semibold text-white">{formatDate(data.event.eventDate)}</p>
									</div>
								</div>
							{/if}

							{#if data.event.location}
								<div class="flex items-start gap-4 rounded-lg border border-gray-800 bg-gray-800/30 p-4 transition-colors hover:border-gray-700">
									<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
										<svg class="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
									</div>
									<div class="min-w-0">
										<p class="text-sm font-medium text-gray-400">Location</p>
										<p class="mt-1 font-semibold text-white">{data.event.location}</p>
										{#if data.event.address}
											<p class="mt-0.5 text-sm text-gray-500">{data.event.address}</p>
										{/if}
									</div>
								</div>
							{/if}
						</div>

						{#if data.event.description}
							<div class="mt-6 border-t border-gray-800 pt-6">
								<p class="text-sm font-medium text-gray-400 mb-3">About this Event</p>
								<p class="text-gray-300 leading-relaxed">{data.event.description}</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Gem ID Input (if required) -->
				{#if data.event.gemIdRequired}
					<div class="group relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-gray-900 to-gray-900 p-6">
						<div class="absolute top-0 right-0 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl"></div>

						<div class="relative">
							<div class="flex items-center gap-3 mb-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
									<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">GEM ID Required</h2>
									<p class="text-sm text-gray-400">Enter your GEM ID to continue</p>
								</div>
							</div>

							<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
								<label for="gemId" class="mb-2 block text-sm font-medium text-gray-300">
									GEM ID <span class="text-amber-400">*</span>
								</label>
								<input
									type="text"
									id="gemId"
									bind:value={gemId}
									required
									placeholder="Enter your GEM ID"
									class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
								/>
								<p class="mt-2 text-xs text-gray-500">
									Your GEM ID is required for event registration and pairing.
								</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Order Summary Column -->
			<div class="lg:col-span-1">
				<div class="sticky top-6 space-y-6">
					<!-- Order Summary Card -->
					<div class="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-6">
						<div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl"></div>

						<div class="relative">
							<div class="flex items-center gap-3 mb-6">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
									<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
									</svg>
								</div>
								<h2 class="text-lg font-semibold text-white">Order Summary</h2>
							</div>

							<div class="space-y-4">
								<!-- Event Info -->
								<div class="rounded-lg border border-gray-800 bg-gray-800/30 p-4">
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="text-sm font-medium text-gray-400">Event Registration</p>
											<p class="mt-1 font-semibold text-white truncate">{data.event.title}</p>
											{#if data.event.eventDate}
												<p class="mt-1 text-sm text-gray-500">{formatShortDate(data.event.eventDate)}</p>
											{/if}
										</div>
										<div class="shrink-0 text-right">
											{#if data.hasPremiumDiscount}
												<p class="text-sm text-gray-500 line-through">${parseFloat(data.event.price).toFixed(2)}</p>
											{/if}
											<p class="text-lg font-bold text-white">${data.finalPrice}</p>
										</div>
									</div>
								</div>

								{#if data.hasPremiumDiscount}
									<div class="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
										<div class="flex items-center gap-2">
											<svg class="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
												<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
											</svg>
											<span class="text-sm font-medium text-emerald-400">Premium Discount (10%)</span>
										</div>
										<span class="font-semibold text-emerald-400">-${(parseFloat(data.event.price) * 0.1).toFixed(2)}</span>
									</div>
								{/if}

								<!-- Total -->
								<div class="border-t border-gray-800 pt-4">
									<div class="flex items-center justify-between">
										<span class="text-lg font-semibold text-white">Total</span>
										<span class="text-3xl font-bold text-white">${data.finalPrice}</span>
									</div>
								</div>
							</div>

							<!-- Validation Messages -->
							{#if data.event.gemIdRequired && !gemId && error}
								<div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
									<div class="flex items-center gap-2">
										<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<p class="text-sm font-medium text-red-400">Please enter your GEM ID</p>
									</div>
								</div>
							{/if}

							{#if error && !(data.event.gemIdRequired && !gemId)}
								<div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
									<div class="flex items-center gap-2">
										<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<p class="text-sm font-medium text-red-400">{error}</p>
									</div>
								</div>
							{/if}

							<!-- Action Button -->
							{#if data.event.gemIdRequired && !canProceed}
								<div class="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
									<div class="flex items-center gap-2">
										<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
										<p class="text-sm font-medium text-amber-400">Enter GEM ID to continue</p>
									</div>
								</div>
							{:else}
								<a
									href="#payment"
									class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
									Proceed to Payment
								</a>
							{/if}

							<!-- Security Badge -->
							<div class="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
								<span>Secure checkout powered by Authorize.net</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Payment Form Section -->
		{#if !data.event.gemIdRequired || canProceed}
			<div id="payment" class="mt-12 scroll-mt-8">
				<div class="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-6 sm:p-8">
					<div class="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-green-500/5 blur-3xl"></div>
					<div class="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl"></div>

					<div class="relative">
						<div class="mb-8 flex items-center gap-4">
							<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
								<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
								</svg>
							</div>
							<div>
								<h2 class="text-2xl font-bold text-white">Complete Your Purchase</h2>
								<p class="text-gray-400">Enter your payment details to secure your spot</p>
							</div>
						</div>

						<PaymentForm
							amount={data.finalPrice}
							description={`Ticket for ${data.event.title}`}
							submitUrl={`/api/events/${data.event.id}/purchase`}
							submitText="Complete Purchase"
							gemId={gemId}
						/>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
