<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';
	import { getCircuit, DEFAULT_CIRCUIT } from '$lib/data/circuits.js';

	export let data;

	// Get circuit config with colors and image
	function getCircuitConfig(circuit) {
		const config = getCircuit(circuit);
		return {
			...config.colors,
			image: config.image
		};
	}

	// Ticket management
	let tickets = [
		{
			id: 1,
			gemId: data.userGemId || '',
			firstName: data.userFirstName || '',
			lastName: data.userLastName || '',
			isFromAccount: !!data.userGemId
		}
	];

	let nextTicketId = 2;

	function addTicket() {
		tickets = [
			...tickets,
			{
				id: nextTicketId++,
				gemId: '',
				firstName: '',
				lastName: '',
				isFromAccount: false
			}
		];
	}

	function removeTicket(ticketId) {
		if (tickets.length > 1) {
			tickets = tickets.filter((t) => t.id !== ticketId);
		}
	}

	// Calculate totals - only first ticket gets premium discount
	$: basePrice = parseFloat(data.event.price);
	$: discountedPrice = parseFloat(data.finalPrice);
	$: hasMultipleTickets = tickets.length > 1;
	$: totalAmount =
		data.hasPremiumDiscount && hasMultipleTickets
			? (discountedPrice + basePrice * (tickets.length - 1)).toFixed(2)
			: (discountedPrice * tickets.length).toFixed(2);

	// Validation
	$: allTicketsValid = tickets.every((t) => {
		if (data.event.gemIdRequired) {
			return (
				t.gemId.trim().length > 0 && t.firstName.trim().length > 0 && t.lastName.trim().length > 0
			);
		}
		return t.firstName.trim().length > 0 && t.lastName.trim().length > 0;
	});

	// Show payment form when at least one ticket has info entered
	$: showPaymentForm = allTicketsValid && data.user;

	// Check if event is in the past
	$: isPastEvent = data.event.eventDate && new Date(data.event.eventDate) < new Date();

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}

	function formatTime(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'UTC'
		}).format(date);
	}

	function formatPrice(price) {
		return parseFloat(price).toFixed(2);
	}

	// Build GEM IDs string for payment
	$: gemIdsForPayment = tickets
		.map((t) => t.gemId)
		.filter(Boolean)
		.join(',');

	// Get circuit config reactively
	$: circuitConfig = getCircuitConfig(data.event.circuit);
</script>

<svelte:head>
	<title>{data.event.title} - AGE Open Series</title>
	<meta
		name="description"
		content={data.event.description || `Register for ${data.event.title} - AGE Open Series event`}
	/>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Hero Section with Circuit Background -->
	<div class="relative overflow-hidden">
		<!-- Circuit Background Image -->
		<div class="absolute inset-0">
			<img src={circuitConfig.image} alt="" class="h-full w-full object-cover opacity-50" />
			<div
				class="absolute inset-0 bg-gradient-to-b from-gray-950/40 via-gray-950/70 to-gray-950"
			></div>
		</div>

		<div class="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<!-- Back Link -->
			<div class="mb-6">
				<a
					href="/age-open"
					class="inline-flex items-center text-sm font-medium text-gray-400 transition-colors hover:text-white"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Events
				</a>
			</div>

			<!-- Event Header -->
			<div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
				<div class="flex-1">
					<!-- Badges -->
					<div class="mb-4 flex flex-wrap gap-2">
						{#if data.event.format}
							<span
								class="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm"
							>
								{data.event.format}
							</span>
						{/if}
						{#if data.event.premiumDiscount}
							<span
								class="rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400"
							>
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

					<!-- Circuit Badge - Prominent -->
					<div class="mt-4">
						<div
							class="inline-flex items-center gap-3 {circuitConfig.bg} rounded-lg px-4 py-2.5 shadow-lg"
						>
							<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							<span class="text-base font-black tracking-wider text-white uppercase">
								{data.event.circuit || 'AGE Open'} Circuit
							</span>
						</div>
					</div>

					<!-- Quick Info -->
					<div class="mt-6 flex flex-wrap gap-6 text-gray-300">
						{#if data.event.eventDate}
							<div class="flex items-center gap-2">
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								<span>{formatDate(data.event.eventDate)}</span>
							</div>
							<div class="flex items-center gap-2">
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>{formatTime(data.event.eventDate)}</span>
							</div>
						{/if}
						{#if data.event.location}
							<div class="flex items-center gap-2">
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								<span>{data.event.location}</span>
							</div>
						{/if}
					</div>

					<!-- Description -->
					{#if data.event.description}
						<p class="mt-6 max-w-2xl leading-relaxed text-gray-400">
							{data.event.description}
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid gap-8 lg:grid-cols-3">
			<!-- Left Column - Event Details & Ticket Form -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Event Details Card -->
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
						<svg
							class="h-5 w-5 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						Event Details
					</h2>
					<div class="grid gap-4 sm:grid-cols-2">
						{#if data.event.format}
							<div
								class="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/30 p-3"
							>
								<div
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20"
								>
									<svg
										class="h-4 w-4 text-blue-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
										/>
									</svg>
								</div>
								<div>
									<p class="text-xs text-gray-500">Format</p>
									<p class="font-medium text-white">{data.event.format}</p>
								</div>
							</div>
						{/if}
						<div
							class="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/30 p-3"
						>
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/20"
							>
								<svg
									class="h-4 w-4 text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500">Entry Fee</p>
								<p class="font-medium text-white">${formatPrice(data.event.price)}</p>
							</div>
						</div>
						{#if data.event.location}
							<div
								class="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/30 p-3 sm:col-span-2"
							>
								<div
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20"
								>
									<svg
										class="h-4 w-4 text-cyan-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								</div>
								<div>
									<p class="text-xs text-gray-500">Location</p>
									<p class="font-medium text-white">{data.event.location}</p>
									{#if data.event.address}
										<p class="text-sm text-gray-500">{data.event.address}</p>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Registration Section -->
				{#if !isPastEvent}
					{#if !data.user}
						<!-- Login Required -->
						<div class="rounded-xl border border-amber-500/30 bg-amber-950/20 p-6">
							<div class="mb-4 flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
									<svg
										class="h-5 w-5 text-amber-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">Login Required</h2>
									<p class="text-sm text-gray-400">Sign in to register for this event</p>
								</div>
							</div>
							<a
								href="/login?redirect=/age-open/{data.event.id}"
								class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-black transition-colors hover:bg-amber-400"
							>
								Sign In to Register
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</a>
						</div>
					{:else if data.userTicket}
						<!-- Already Registered -->
						<div class="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6">
							<div class="flex items-start gap-4">
								<div
									class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20"
								>
									<svg
										class="h-6 w-6 text-emerald-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<h2 class="mb-2 text-xl font-bold text-white">You're Signed Up!</h2>
									<p class="leading-relaxed text-gray-300">
										We'll see you at <span class="font-semibold text-white"
											>{data.event.location}</span
										>
										{#if data.event.eventDate}
											at <span class="font-semibold text-white"
												>{formatTime(data.event.eventDate)}</span
											>
										{/if}. Good luck!
									</p>

									<!-- Ticket Details -->
									<div class="mt-4 space-y-3">
										{#each data.userTicket as ticket, index}
											<div class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
												{#if data.userTicket.length > 1}
													<p
														class="mb-3 text-xs font-medium tracking-wider text-emerald-400 uppercase"
													>
														Ticket {index + 1} of {data.userTicket.length}
													</p>
												{/if}
												<div class="grid gap-3 sm:grid-cols-2">
													<div>
														<p class="mb-1 text-xs tracking-wider text-gray-500 uppercase">
															Ticket Code
														</p>
														<p class="font-mono font-bold text-emerald-400">{ticket.code}</p>
													</div>
													<div>
														<p class="mb-1 text-xs tracking-wider text-gray-500 uppercase">
															Player Name
														</p>
														<p class="font-medium text-white">
															{ticket.firstName}
															{ticket.lastName}
														</p>
													</div>
													{#if ticket.gemId}
														<div>
															<p class="mb-1 text-xs tracking-wider text-gray-500 uppercase">
																GEM ID
															</p>
															<p class="font-medium text-white">{ticket.gemId}</p>
														</div>
													{/if}
												</div>

												<!-- GEM Status -->
												<div class="mt-3 border-t border-emerald-500/10 pt-3">
													{#if ticket.enteredIntoGem}
														<div class="flex items-start gap-2">
															<svg
																class="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fill-rule="evenodd"
																	d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
																	clip-rule="evenodd"
																/>
															</svg>
															<p class="text-sm text-emerald-300">Checked in on GEM</p>
														</div>
													{:else}
														<div class="flex items-start gap-2">
															<svg
																class="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
																/>
															</svg>
															<p class="text-sm text-amber-300">Pending GEM check-in</p>
														</div>
													{/if}
												</div>
											</div>
										{/each}
									</div>

									<!-- GEM Info Note (show once if any ticket is not entered) -->
									{#if data.userTicket.some((t) => !t.enteredIntoGem)}
										<p class="mt-3 text-xs text-gray-400">
											Keep an eye on your GEM account before the event. If you don't see it after
											check-in, please see a judge when you arrive.
										</p>
									{/if}

									<!-- View Order Link -->
									{#if data.userTicket[0]?.orderId}
										<a
											href="/account/orders/{data.userTicket[0].orderId}"
											class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
												/>
											</svg>
											View Order Details
										</a>
									{/if}
								</div>
							</div>
						</div>
					{:else}
						<!-- Ticket Entry Form -->
						<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
							<div class="mb-6 flex items-center justify-between">
								<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
									<svg
										class="h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
										/>
									</svg>
									Player Registration
								</h2>
								<span class="text-sm text-gray-500"
									>{tickets.length} ticket{tickets.length > 1 ? 's' : ''}</span
								>
							</div>

							<!-- Tickets -->
							<div class="space-y-4">
								{#each tickets as ticket, index (ticket.id)}
									<!-- Premium Discount Notice - shown above second player -->
									{#if data.hasPremiumDiscount && index === 1}
										<div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
											<div class="flex gap-3">
												<svg
													class="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
												<div>
													<p class="text-sm font-medium text-amber-300">
														Premium discount applies to your first ticket only
													</p>
													<p class="mt-1 text-xs text-amber-200/70">
														Other players can register from their own accounts to receive their
														discounts.
													</p>
												</div>
											</div>
										</div>
									{/if}
									<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
										<div class="mb-4 flex items-center justify-between">
											<h3 class="font-medium text-white">
												{#if tickets.length > 1}
													Player {index + 1}
												{:else}
													Player Information
												{/if}
												{#if ticket.isFromAccount}
													<span class="ml-2 text-xs text-green-400">(From your account)</span>
												{/if}
											</h3>
											{#if tickets.length > 1}
												<button
													type="button"
													on:click={() => removeTicket(ticket.id)}
													class="text-gray-500 transition-colors hover:text-red-400"
													aria-label="Remove player {index + 1}"
												>
													<svg
														class="h-5 w-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>
											{/if}
										</div>

										<div class="grid gap-4 sm:grid-cols-2">
											<div>
												<label
													for="firstName-{ticket.id}"
													class="mb-1 block text-sm font-medium text-gray-300"
												>
													First Name <span class="text-red-400">*</span>
												</label>
												<input
													type="text"
													id="firstName-{ticket.id}"
													bind:value={ticket.firstName}
													required
													placeholder="Enter first name"
													class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
												/>
											</div>
											<div>
												<label
													for="lastName-{ticket.id}"
													class="mb-1 block text-sm font-medium text-gray-300"
												>
													Last Name <span class="text-red-400">*</span>
												</label>
												<input
													type="text"
													id="lastName-{ticket.id}"
													bind:value={ticket.lastName}
													required
													placeholder="Enter last name"
													class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
												/>
											</div>
											{#if data.event.gemIdRequired}
												<div class="sm:col-span-2">
													<label
														for="gemId-{ticket.id}"
														class="mb-1 block text-sm font-medium text-gray-300"
													>
														GEM ID <span class="text-amber-400">*</span>
													</label>
													<input
														type="text"
														id="gemId-{ticket.id}"
														bind:value={ticket.gemId}
														required
														placeholder="Enter GEM ID"
														class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
													/>
													<p class="mt-1 text-xs text-gray-500">
														Required for tournament registration and pairing
													</p>
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>

							<!-- Add Another Ticket Button -->
							<button
								type="button"
								on:click={addTicket}
								class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 py-3 text-sm font-medium text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									/>
								</svg>
								Add Another Player
							</button>
						</div>

						<!-- Mobile Order Summary (shown above payment form on mobile, only if not already registered) -->
						{#if showPaymentForm && !data.userTicket}
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6 lg:hidden">
								<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
									<svg
										class="h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
										/>
									</svg>
									Order Summary
								</h2>

								<div class="space-y-3">
									{#each tickets as ticket, index}
										<div
											class="flex items-center justify-between py-2 {index > 0
												? 'border-t border-gray-800'
												: ''}"
										>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm text-white">
													{ticket.firstName || ticket.lastName
														? `${ticket.firstName} ${ticket.lastName}`.trim()
														: `Player ${index + 1}`}
												</p>
												{#if ticket.gemId}
													<p class="text-xs text-gray-500">GEM: {ticket.gemId}</p>
												{/if}
											</div>
											<div class="ml-4 text-right">
												{#if data.hasPremiumDiscount && index === 0}
													<p class="text-xs text-gray-500 line-through">
														${formatPrice(data.event.price)}
													</p>
													<p class="text-sm font-medium text-white">${data.finalPrice}</p>
												{:else}
													<p class="text-sm font-medium text-white">
														${formatPrice(data.event.price)}
													</p>
												{/if}
											</div>
										</div>
									{/each}

									{#if data.hasPremiumDiscount}
										<div
											class="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2"
										>
											<div class="flex items-center gap-2">
												<svg class="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
													<path
														d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
													/>
												</svg>
												<span class="text-sm text-green-400">Premium Discount (1st ticket)</span>
											</div>
											<span class="text-sm font-medium text-green-400">-10%</span>
										</div>
									{/if}

									<div class="mt-4 border-t border-gray-700 pt-4">
										<div class="flex items-center justify-between">
											<span class="text-base font-semibold text-white">Total</span>
											<span class="text-2xl font-bold text-white">${totalAmount}</span>
										</div>
										{#if data.hasPremiumDiscount && hasMultipleTickets}
											<p class="mt-1 text-xs text-gray-500">
												1 @ ${data.finalPrice} + {tickets.length - 1} @ ${formatPrice(
													data.event.price
												)}
											</p>
										{:else}
											<p class="mt-1 text-xs text-gray-500">
												{tickets.length} ticket{tickets.length > 1 ? 's' : ''} @ ${data.finalPrice} each
											</p>
										{/if}
									</div>
								</div>
							</div>
						{/if}

						<!-- Payment Form (shown when tickets are valid) -->
						{#if showPaymentForm}
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
								<div class="mb-6 flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20"
									>
										<svg
											class="h-5 w-5 text-green-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
											/>
										</svg>
									</div>
									<div>
										<h2 class="text-lg font-semibold text-white">Payment Information</h2>
										<p class="text-sm text-gray-400">Complete your registration</p>
									</div>
								</div>

								<PaymentForm
									amount={totalAmount}
									description={`${tickets.length}x Ticket for ${data.event.title}`}
									submitUrl={`/api/events/${data.event.id}/purchase`}
									submitText="Complete Purchase - ${totalAmount}"
									gemId={gemIdsForPayment}
									savedCards={data.savedCards || []}
									showSaveCardOption={true}
									showTestData={data.isSandbox}
								/>
							</div>
						{/if}
					{/if}
				{:else}
					<!-- Past Event -->
					<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-6 text-center">
						<svg
							class="mx-auto mb-4 h-12 w-12 text-gray-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<h3 class="mb-2 text-lg font-semibold text-white">Event Has Ended</h3>
						<p class="text-gray-400">Registration for this event is closed.</p>
						<a
							href="/age-open"
							class="mt-4 inline-flex items-center gap-2 font-medium text-blue-400 hover:text-blue-300"
						>
							View Upcoming Events
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</a>
					</div>
				{/if}
			</div>

			<!-- Right Column - Order Summary Sidebar (Desktop Only) -->
			<div class="hidden lg:col-span-1 lg:block">
				<div class="sticky top-6 space-y-6">
					<!-- Order Summary (only show if not already registered) -->
					{#if !data.userTicket}
						<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
							<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
									/>
								</svg>
								Order Summary
							</h2>

							<div class="space-y-3">
								<!-- Line Items -->
								{#each tickets as ticket, index}
									<div
										class="flex items-center justify-between py-2 {index > 0
											? 'border-t border-gray-800'
											: ''}"
									>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm text-white">
												{ticket.firstName || ticket.lastName
													? `${ticket.firstName} ${ticket.lastName}`.trim()
													: `Player ${index + 1}`}
											</p>
											{#if ticket.gemId}
												<p class="text-xs text-gray-500">GEM: {ticket.gemId}</p>
											{/if}
										</div>
										<div class="ml-4 text-right">
											{#if data.hasPremiumDiscount && index === 0}
												<p class="text-xs text-gray-500 line-through">
													${formatPrice(data.event.price)}
												</p>
												<p class="text-sm font-medium text-white">${data.finalPrice}</p>
											{:else}
												<p class="text-sm font-medium text-white">
													${formatPrice(data.event.price)}
												</p>
											{/if}
										</div>
									</div>
								{/each}

								<!-- Premium Discount Note -->
								{#if data.hasPremiumDiscount}
									<div
										class="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2"
									>
										<div class="flex items-center gap-2">
											<svg class="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
												<path
													d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
												/>
											</svg>
											<span class="text-sm text-green-400">Premium Discount (1st ticket)</span>
										</div>
										<span class="text-sm font-medium text-green-400">-10%</span>
									</div>
								{/if}

								<!-- Total -->
								<div class="mt-4 border-t border-gray-700 pt-4">
									<div class="flex items-center justify-between">
										<span class="text-base font-semibold text-white">Total</span>
										<span class="text-2xl font-bold text-white">${totalAmount}</span>
									</div>
									{#if data.hasPremiumDiscount && hasMultipleTickets}
										<p class="mt-1 text-xs text-gray-500">
											1 @ ${data.finalPrice} + {tickets.length - 1} @ ${formatPrice(
												data.event.price
											)}
										</p>
									{:else}
										<p class="mt-1 text-xs text-gray-500">
											{tickets.length} ticket{tickets.length > 1 ? 's' : ''} @ ${data.finalPrice} each
										</p>
									{/if}
								</div>
							</div>

							<!-- Validation Status -->
							{#if !isPastEvent && data.user && !allTicketsValid}
								<div class="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
									<p class="flex items-center gap-2 text-sm text-amber-400">
										<svg
											class="h-4 w-4 shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
											/>
										</svg>
										Complete player info to proceed
									</p>
								</div>
							{/if}

							<!-- Security Badge -->
							<div class="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									/>
								</svg>
								<span>Secure checkout via Authorize.net</span>
							</div>
						</div>
					{/if}

					<!-- Prize Info Card -->
					<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
						<h3 class="mb-4 flex items-center gap-2 font-semibold text-white">
							<svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
								<path
									d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.992 0"
								/>
							</svg>
							Prizes & Points
						</h3>
						<div class="space-y-2 text-sm">
							<div class="flex items-center justify-between">
								<span class="text-gray-400">1st Place</span>
								<div class="text-right">
									<span class="font-medium text-green-400">$400</span>
									<span class="ml-2 text-amber-400">+30 pts</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-400">2nd Place</span>
								<div class="text-right">
									<span class="font-medium text-green-400">$200</span>
									<span class="ml-2 text-amber-400">+25 pts</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-400">3rd-4th</span>
								<div class="text-right">
									<span class="font-medium text-green-400">$100</span>
									<span class="ml-2 text-amber-400">+20 pts</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-400">5th-8th</span>
								<div class="text-right">
									<span class="font-medium text-green-400">$50</span>
									<span class="ml-2 text-amber-400">+15 pts</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-400">Top 12</span>
								<span class="text-amber-400">+12 pts</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-400">Top 16</span>
								<span class="text-amber-400">+8 pts</span>
							</div>
							<div class="mt-2 flex items-center justify-between border-t border-gray-800 pt-2">
								<span class="text-gray-400">Participation</span>
								<span class="text-amber-400">+1 pt</span>
							</div>
						</div>
					</div>

					<!-- Need Help -->
					<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
						<h3 class="mb-2 font-semibold text-white">Need Help?</h3>
						<p class="mb-3 text-sm text-gray-400">Questions about registration or the event?</p>
						<a
							href="/age-open?tab=rules"
							class="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
						>
							View Rules & Info →
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
