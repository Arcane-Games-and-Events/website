<script>
	export let data;

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
	<title>Tournament Staff Dashboard</title>
</svelte:head>

<div class="container mx-auto px-2 py-8 max-w-6xl">
	<h1 class="text-4xl font-bold mb-8 text-gray-100">Tournament Staff Dashboard</h1>
	<p class="mb-8 text-gray-400">Hi {data.user.email}. Here are your assigned events.</p>

	<!-- Debug Info -->
	<div class="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-4 mb-6">
		<p class="text-xs font-semibold text-yellow-800 dark:text-yellow-400 mb-2">Debug Info (for troubleshooting)</p>
		<p class="text-xs text-yellow-800 dark:text-yellow-400 font-mono">Your User ID: {data.user.id}</p>
		<p class="text-xs text-yellow-800 dark:text-yellow-400 font-mono">Your Email: {data.user.email}</p>
		<p class="text-xs text-yellow-800 dark:text-yellow-400 font-mono">Your Role: {data.user.role}</p>
		<p class="text-xs text-yellow-800 dark:text-yellow-400 font-mono">Assigned Events Count: {data.assignedEvents.length}</p>
	</div>

	<!-- Assigned Events -->
	<section>
		<h2 class="mb-4 text-2xl font-bold text-gray-100">My Assigned Events</h2>

		{#if data.assignedEvents.length === 0}
			<div class="rounded-lg border border-gray-700 bg-gray-950 p-12 text-center">
				<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<p class="text-gray-400">
					No events assigned yet. An admin will assign you to events.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.assignedEvents as event}
					<a
						href="/admin/events/{event.id}"
						class="rounded-lg border border-gray-700 bg-gray-950 p-6 hover:bg-gray-800 transition-colors"
					>
						<div class="mb-4">
							<h3 class="text-xl font-bold text-gray-100 mb-2">{event.title}</h3>
							<div class="flex items-center gap-2 text-sm text-gray-400">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								{formatShortDate(event.eventDate)}
							</div>
						</div>

						<div class="space-y-2 mb-4">
							{#if event.location}
								<div class="flex items-center gap-2 text-sm">
									<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									<span class="text-gray-100">{event.location}</span>
								</div>
							{/if}

							{#if event.format}
								<div class="flex items-center gap-2 text-sm">
									<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
									</svg>
									<span class="text-gray-100">{event.format}</span>
								</div>
							{/if}

							{#if event.circuit}
								<div class="flex items-center gap-2 text-sm">
									<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span class="text-gray-100">{event.circuit}</span>
								</div>
							{/if}
						</div>

						<!-- Stats -->
						<div class="pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
							<div>
								<p class="text-xs text-gray-400">Tickets Sold</p>
								<p class="text-lg font-bold text-gray-100">{event.ticketCount || 0}</p>
							</div>
							<div>
								<p class="text-xs text-gray-400">Refunds</p>
								<p class="text-lg font-bold text-gray-100">{event.refundCount || 0}</p>
							</div>
						</div>

						<div class="mt-4">
							<span class="inline-flex items-center gap-2 text-sm font-medium text-white">
								Manage Event
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Quick Actions -->
	<section class="mt-8">
		<h2 class="mb-4 text-2xl font-bold text-gray-100">Quick Actions</h2>
		<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
			<a
				href="/play"
				class="rounded-lg border border-gray-700 bg-gray-950 p-4 text-center text-gray-100 hover:bg-gray-800 transition-colors"
			>
				View All Events
			</a>
			<a
				href="/account"
				class="rounded-lg border border-gray-700 bg-gray-950 p-4 text-center text-gray-100 hover:bg-gray-800 transition-colors"
			>
				Account Settings
			</a>
		</div>
	</section>
</div>
