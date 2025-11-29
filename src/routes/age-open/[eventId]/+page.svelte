<script>
	export let data;

	// Circuit colors for badges
	const circuitColors = {
		'Los Angeles': { bg: 'bg-blue-500', text: 'text-blue-400', bgLight: 'bg-blue-500/10' },
		'St. Louis': { bg: 'bg-green-500', text: 'text-green-400', bgLight: 'bg-green-500/10' },
		'New England': { bg: 'bg-purple-500', text: 'text-purple-400', bgLight: 'bg-purple-500/10' }
	};

	function getCircuitColor(circuit) {
		return circuitColors[circuit] || { bg: 'bg-gray-500', text: 'text-gray-400', bgLight: 'bg-gray-500/10' };
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function formatTime(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(date);
	}

	function formatPrice(price) {
		return parseFloat(price).toFixed(2);
	}

	// Check if event is in the past
	$: isPastEvent = data.event.eventDate && new Date(data.event.eventDate) < new Date();
</script>

<svelte:head>
	<title>{data.event.title} - AGE Open Series</title>
	<meta name="description" content="{data.event.description || `Register for ${data.event.title} - AGE Open Series event`}" />
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Section -->
	<div class="relative bg-gradient-to-b from-gray-900 to-gray-950">
		<!-- Background pattern -->
		<div class="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>

		<div class="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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

			<!-- Event Header -->
			<div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
				<div class="flex-1">
					<!-- Badges -->
					<div class="flex flex-wrap gap-2 mb-4">
						{#if data.event.format}
							<span class="rounded-full bg-gray-700 px-3 py-1 text-sm font-medium text-gray-200">
								{data.event.format}
							</span>
						{/if}
						{#if data.event.circuit}
							{@const colors = getCircuitColor(data.event.circuit)}
							<span class="rounded-full {colors.bg} px-3 py-1 text-sm font-medium text-white">
								{data.event.circuit}
							</span>
						{/if}
						{#if data.event.premiumDiscount}
							<span class="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400">
								Premium: 10% Off
							</span>
						{/if}
						{#if isPastEvent}
							<span class="rounded-full bg-gray-600 px-3 py-1 text-sm font-medium text-gray-300">
								Past Event
							</span>
						{/if}
					</div>

					<!-- Title -->
					<h1 class="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
						{data.event.title}
					</h1>

					<!-- Quick Info -->
					<div class="mt-6 flex flex-wrap gap-6 text-gray-300">
						{#if data.event.eventDate}
							<div class="flex items-center gap-2">
								<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								<span>{formatDate(data.event.eventDate)}</span>
							</div>
						{/if}
						{#if data.event.eventDate}
							<div class="flex items-center gap-2">
								<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span>{formatTime(data.event.eventDate)}</span>
							</div>
						{/if}
						{#if data.event.location}
							<div class="flex items-center gap-2">
								<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
								<span>{data.event.location}</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Price & CTA Card -->
				<div class="lg:w-80 flex-shrink-0">
					<div class="rounded-xl border border-gray-800 bg-gray-900 p-6">
						<!-- Price -->
						<div class="mb-4">
							{#if data.hasPremiumDiscount}
								<div class="flex items-baseline gap-2">
									<span class="text-3xl font-bold text-white">${data.finalPrice}</span>
									<span class="text-lg text-gray-500 line-through">${formatPrice(data.event.price)}</span>
								</div>
								<p class="mt-1 text-sm text-green-400">Premium discount applied</p>
							{:else}
								<div class="flex items-baseline gap-2">
									<span class="text-3xl font-bold text-white">${formatPrice(data.event.price)}</span>
								</div>
								{#if data.event.premiumDiscount && !data.isPremium}
									<p class="mt-1 text-sm text-amber-400">Premium members save 10%</p>
								{/if}
							{/if}
						</div>

						<!-- Register Button -->
						{#if isPastEvent}
							<button
								disabled
								class="w-full rounded-lg bg-gray-700 px-6 py-3 text-center font-semibold text-gray-400 cursor-not-allowed"
							>
								Registration Closed
							</button>
						{:else}
							<a
								href="/age-open/{data.event.id}/checkout"
								class="block w-full rounded-lg bg-blue-500 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-600"
							>
								Register Now
							</a>
						{/if}

						<!-- Additional Info -->
						<div class="mt-4 space-y-2 text-sm text-gray-400">
							{#if data.event.gemIdRequired}
								<div class="flex items-center gap-2">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>GEM ID required</span>
								</div>
							{/if}
							{#if !data.user}
								<div class="flex items-center gap-2">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									<span>Login required to register</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Content Section -->
	<div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
		<div class="grid gap-8 lg:grid-cols-3">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-8">
				<!-- Description -->
				{#if data.event.description}
					<section>
						<h2 class="mb-4 text-xl font-bold text-white">About This Event</h2>
						<div class="prose prose-invert max-w-none">
							<p class="text-gray-300 leading-relaxed whitespace-pre-wrap">{data.event.description}</p>
						</div>
					</section>
				{/if}

				<!-- Event Details -->
				<section>
					<h2 class="mb-4 text-xl font-bold text-white">Event Details</h2>
					<div class="rounded-lg border border-gray-800 bg-gray-900 divide-y divide-gray-800">
						{#if data.event.format}
							<div class="flex items-center justify-between p-4">
								<span class="text-gray-400">Format</span>
								<span class="font-medium text-white">{data.event.format}</span>
							</div>
						{/if}
						{#if data.event.circuit}
							<div class="flex items-center justify-between p-4">
								<span class="text-gray-400">Circuit</span>
								<span class="font-medium text-white">{data.event.circuit}</span>
							</div>
						{/if}
						{#if data.event.eventDate}
							<div class="flex items-center justify-between p-4">
								<span class="text-gray-400">Date</span>
								<span class="font-medium text-white">{formatDate(data.event.eventDate)}</span>
							</div>
						{/if}
						{#if data.event.eventDate}
							<div class="flex items-center justify-between p-4">
								<span class="text-gray-400">Start Time</span>
								<span class="font-medium text-white">{formatTime(data.event.eventDate)}</span>
							</div>
						{/if}
						<div class="flex items-center justify-between p-4">
							<span class="text-gray-400">Entry Fee</span>
							<span class="font-medium text-white">${formatPrice(data.event.price)}</span>
						</div>
						{#if data.event.gemIdRequired}
							<div class="flex items-center justify-between p-4">
								<span class="text-gray-400">GEM ID</span>
								<span class="font-medium text-amber-400">Required</span>
							</div>
						{/if}
					</div>
				</section>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Location Card -->
				{#if data.event.location || data.event.address}
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
						<h3 class="mb-4 flex items-center gap-2 font-semibold text-white">
							<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							Location
						</h3>
						{#if data.event.location}
							<p class="font-medium text-white">{data.event.location}</p>
						{/if}
						{#if data.event.address}
							<p class="mt-1 text-sm text-gray-400">{data.event.address}</p>
						{/if}
					</div>
				{/if}

				<!-- Prize Info Card -->
				<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
					<h3 class="mb-4 flex items-center gap-2 font-semibold text-white">
						<svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
							<path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.992 0" />
						</svg>
						Prize Information
					</h3>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-400">1st Place</span>
							<span class="font-medium text-green-400">$400</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">2nd Place</span>
							<span class="font-medium text-green-400">$200</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">3rd-4th Place</span>
							<span class="font-medium text-green-400">$100</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">5th-8th Place</span>
							<span class="font-medium text-green-400">$50</span>
						</div>
						<div class="mt-3 pt-3 border-t border-gray-800">
							<p class="text-xs text-gray-500">Plus AGE Points for all participants toward the Player's Championship</p>
						</div>
					</div>
				</div>

				<!-- Need Help Card -->
				<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
					<h3 class="mb-2 font-semibold text-white">Need Help?</h3>
					<p class="text-sm text-gray-400 mb-3">
						Questions about this event? Check our Rules & Info page or contact us.
					</p>
					<a
						href="/age-open?tab=rules"
						class="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
					>
						View Rules & Info →
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
