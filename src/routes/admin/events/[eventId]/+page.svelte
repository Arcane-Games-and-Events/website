<script>
	export let data;
	export let form;

	let isEditMode = false;
	let gemIdRequired = data.event.gemIdRequired;
	let premiumDiscount = data.event.premiumDiscount;

	// Sorting state
	let sortColumn = 'createdAt'; // Default sort by purchase date
	let sortDirection = 'desc'; // 'asc' or 'desc'

	const circuits = ['Los Angeles', 'St. Louis', 'New England'];

	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const formats = [
		'Classic Constructed',
		'Draft',
		'Silver Age',
		'Blitz',
		'Living Legend',
		'Sealed'
	];

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
		if (!dateStr) return 'N/A';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	}

	function formatDateForInput(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function confirmRefund(ticketCode) {
		return confirm(`Are you sure you want to refund ticket ${ticketCode}? This action cannot be undone.`);
	}

	function sortBy(column) {
		if (sortColumn === column) {
			// Toggle direction if clicking same column
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// New column, default to ascending
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	function getTicketStatus(ticket) {
		if (ticket.refunded) return 'refunded';
		return 'paid';
	}

	// Reactive sorted tickets
	$: sortedTickets = [...data.tickets].sort((a, b) => {
		let aVal, bVal;

		switch (sortColumn) {
			case 'firstName':
				aVal = (a.firstName || '').toLowerCase();
				bVal = (b.firstName || '').toLowerCase();
				break;
			case 'lastName':
				aVal = (a.lastName || '').toLowerCase();
				bVal = (b.lastName || '').toLowerCase();
				break;
			case 'gemId':
				aVal = (a.gemId || '').toLowerCase();
				bVal = (b.gemId || '').toLowerCase();
				break;
			case 'createdAt':
				aVal = new Date(a.createdAt);
				bVal = new Date(b.createdAt);
				break;
			case 'status':
				aVal = getTicketStatus(a);
				bVal = getTicketStatus(b);
				break;
			case 'enteredIntoGem':
				aVal = a.enteredIntoGem ? 1 : 0;
				bVal = b.enteredIntoGem ? 1 : 0;
				break;
			default:
				return 0;
		}

		if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
		if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
		return 0;
	});
</script>

<svelte:head>
	<title>{data.event.title} - Event Management</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mb-8">
			<div class="mb-4">
				<a
					href="/admin?tab=events"
					class="group inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
				>
					<svg class="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Events
				</a>
			</div>

			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-3xl font-bold text-white sm:text-4xl">{data.event.title}</h1>
					<p class="mt-2 text-gray-400">Event Management Dashboard</p>
				</div>
				<div class="flex flex-wrap items-center gap-3">
					<a
						href="/admin/events/{data.event.id}/closeout"
						class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:from-green-500 hover:to-emerald-500 hover:shadow-green-500/30"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Closeout Event
					</a>
					<button
						on:click={() => (isEditMode = !isEditMode)}
						class="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-gray-700"
					>
						{#if isEditMode}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
							Cancel Edit
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
							Edit Event
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Success/Error Messages -->
		{#if form?.success}
			<div class="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-sm text-green-400">{form.message}</p>
				</div>
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-sm text-red-400">{form.error}</p>
				</div>
			</div>
		{/if}

		<!-- Statistics Cards -->
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 {data.isAdmin ? 'lg:grid-cols-3' : ''}">
			<!-- Total Revenue - Admin Only -->
			{#if data.isAdmin}
				<div class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10">
					<div class="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-green-500/10 blur-2xl transition-all group-hover:bg-green-500/20"></div>
					<div class="relative flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-400">Total Revenue</p>
							<p class="mt-2 text-3xl font-bold text-white">${data.stats.totalRevenue}</p>
						</div>
						<div class="rounded-xl bg-green-500/20 p-3">
							<svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
			{/if}

			<!-- Tickets Sold -->
			<div class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
				<div class="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-500/10 blur-2xl transition-all group-hover:bg-blue-500/20"></div>
				<div class="relative flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-400">Tickets Sold</p>
						<p class="mt-2 text-3xl font-bold text-white">{data.stats.totalTickets}</p>
					</div>
					<div class="rounded-xl bg-blue-500/20 p-3">
						<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
						</svg>
					</div>
				</div>
			</div>

			<!-- Refunds -->
			<div class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10">
				<div class="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-red-500/10 blur-2xl transition-all group-hover:bg-red-500/20"></div>
				<div class="relative flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-400">Refunds</p>
						<p class="mt-2 text-3xl font-bold text-white">{data.stats.totalRefunded}</p>
					</div>
					<div class="rounded-xl bg-red-500/20 p-3">
						<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
						</svg>
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Event Details Column -->
			<div class="lg:col-span-1">
				{#if isEditMode}
					<!-- Edit Event Form -->
					<form method="POST" action="?/updateEvent" class="space-y-6">
						<div class="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6">
							<div class="mb-6 flex items-center gap-3">
								<div class="rounded-lg bg-blue-500/20 p-2">
									<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</div>
								<h2 class="text-xl font-semibold text-white">Edit Event Details</h2>
							</div>

							<div class="space-y-4">
								<!-- Title -->
								<div>
									<label for="title" class="mb-2 block text-sm font-medium text-gray-300">
										Event Name <span class="text-red-400">*</span>
									</label>
									<input
										type="text"
										id="title"
										name="title"
										required
										value={data.event.title}
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>

								<!-- Location -->
								<div>
									<label for="location" class="mb-2 block text-sm font-medium text-gray-300">
										Venue Name <span class="text-red-400">*</span>
									</label>
									<input
										type="text"
										id="location"
										name="location"
										required
										value={data.event.location}
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>

								<!-- Address -->
								<div>
									<label for="address" class="mb-2 block text-sm font-medium text-gray-300">
										Address
									</label>
									<input
										type="text"
										id="address"
										name="address"
										value={data.event.address || ''}
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>

								<!-- Format -->
								<div>
									<label for="format" class="mb-2 block text-sm font-medium text-gray-300">
										Format <span class="text-red-400">*</span>
									</label>
									<select
										id="format"
										name="format"
										required
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									>
										{#each formats as format}
											<option value={format} selected={data.event.format === format}>{format}</option>
										{/each}
									</select>
								</div>

								<!-- Circuit -->
								<div>
									<label for="circuit" class="mb-2 block text-sm font-medium text-gray-300">
										Circuit
									</label>
									<select
										id="circuit"
										name="circuit"
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									>
										<option value="">No circuit</option>
										{#each circuits as circuit}
											<option value={circuit} selected={data.event.circuit === circuit}>{circuit}</option>
										{/each}
									</select>
								</div>

								<!-- Month -->
								<div>
									<label for="month" class="mb-2 block text-sm font-medium text-gray-300">
										Month
									</label>
									<select
										id="month"
										name="month"
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									>
										<option value="">Select month</option>
										{#each months as month}
											<option value={month} selected={data.event.month === month}>{month}</option>
										{/each}
									</select>
								</div>

								<!-- Event Date -->
								<div>
									<label for="eventDate" class="mb-2 block text-sm font-medium text-gray-300">
										Event Date & Time <span class="text-red-400">*</span>
									</label>
									<input
										type="datetime-local"
										id="eventDate"
										name="eventDate"
										required
										value={formatDateForInput(data.event.eventDate)}
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>

								<!-- Price -->
								<div>
									<label for="price" class="mb-2 block text-sm font-medium text-gray-300">
										Entry Fee ($) <span class="text-red-400">*</span>
										{#if data.isTournamentStaff}
											<span class="text-xs text-gray-500">(Read-only)</span>
										{/if}
									</label>
									<input
										type="number"
										id="price"
										name="price"
										required
										min="0"
										step="0.01"
										value={data.event.price}
										disabled={data.isTournamentStaff}
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {data.isTournamentStaff ? 'cursor-not-allowed opacity-60' : ''}"
									/>
								</div>

								<!-- Description -->
								<div>
									<label for="description" class="mb-2 block text-sm font-medium text-gray-300">
										Description
									</label>
									<textarea
										id="description"
										name="description"
										rows="4"
										value={data.event.description || ''}
										class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									></textarea>
								</div>

								<!-- Checkboxes -->
								<div class="space-y-3 pt-2">
									<label class="flex cursor-pointer items-center gap-3">
										<input
											type="checkbox"
											id="gemIdRequired"
											name="gemIdRequired"
											bind:checked={gemIdRequired}
											class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
										/>
										<span class="text-sm font-medium text-gray-300">Require Gem ID</span>
									</label>

									<label class="flex cursor-pointer items-center gap-3">
										<input
											type="checkbox"
											id="premiumDiscount"
											name="premiumDiscount"
											bind:checked={premiumDiscount}
											class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
										/>
										<span class="text-sm font-medium text-gray-300">10% Premium Discount</span>
									</label>
								</div>
							</div>

							<div class="mt-6 flex gap-3">
								<button
									type="button"
									on:click={() => (isEditMode = false)}
									class="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
								>
									Cancel
								</button>
								<button
									type="submit"
									class="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-400"
								>
									Save Changes
								</button>
							</div>
						</div>
					</form>
				{:else}
					<!-- Event Details View -->
					<div class="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6">
						<div class="mb-6 flex items-center gap-3">
							<div class="rounded-lg bg-purple-500/20 p-2">
								<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h2 class="text-xl font-semibold text-white">Event Details</h2>
						</div>

						<div class="space-y-4">
							<div class="rounded-lg bg-gray-800/30 p-3">
								<p class="text-xs font-medium uppercase tracking-wider text-gray-500">Location</p>
								<p class="mt-1 font-medium text-white">{data.event.location || 'N/A'}</p>
							</div>

							<div class="rounded-lg bg-gray-800/30 p-3">
								<p class="text-xs font-medium uppercase tracking-wider text-gray-500">Date & Time</p>
								<p class="mt-1 font-medium text-white">{formatDate(data.event.eventDate)}</p>
							</div>

							<div class="rounded-lg bg-gray-800/30 p-3">
								<p class="text-xs font-medium uppercase tracking-wider text-gray-500">Format</p>
								<p class="mt-1 font-medium text-white">{data.event.format || 'N/A'}</p>
							</div>

							{#if data.event.circuit}
								<div class="rounded-lg bg-gray-800/30 p-3">
									<p class="text-xs font-medium uppercase tracking-wider text-gray-500">Circuit</p>
									<p class="mt-1 font-medium text-white">{data.event.circuit}</p>
								</div>
							{/if}

							<div class="rounded-lg bg-gray-800/30 p-3">
								<p class="text-xs font-medium uppercase tracking-wider text-gray-500">Entry Fee</p>
								<p class="mt-1 text-lg font-bold text-green-400">${parseFloat(data.event.price).toFixed(2)}</p>
							</div>

							{#if data.event.description}
								<div class="border-t border-gray-800 pt-4">
									<p class="text-xs font-medium uppercase tracking-wider text-gray-500">Description</p>
									<p class="mt-2 text-gray-300">{data.event.description}</p>
								</div>
							{/if}

							<div class="flex flex-wrap gap-2 border-t border-gray-800 pt-4">
								<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium {data.event.gemIdRequired ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}">
									{#if data.event.gemIdRequired}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									{:else}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									{/if}
									Gem ID Required
								</span>
								<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium {data.event.premiumDiscount ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'}">
									{#if data.event.premiumDiscount}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									{:else}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									{/if}
									Premium Discount
								</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Tickets Column -->
			<div class="lg:col-span-2">
				<div class="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6">
					<div class="mb-6 flex items-center gap-3">
						<div class="rounded-lg bg-blue-500/20 p-2">
							<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-white">Registered Players</h2>
						<span class="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-sm font-medium text-blue-400">
							{data.tickets.length}
						</span>
					</div>

					{#if data.tickets.length === 0}
						<div class="py-12 text-center">
							<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
								<svg class="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
								</svg>
							</div>
							<p class="text-gray-400">No tickets sold yet</p>
							<p class="mt-1 text-sm text-gray-500">Registrations will appear here</p>
						</div>
					{:else}
						<!-- Sortable Table -->
						<div class="-mx-6 overflow-x-auto px-6">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-gray-800">
										<th class="p-3 text-left font-semibold text-gray-400">
											<button on:click={() => sortBy('firstName')} class="flex items-center gap-1 transition-colors hover:text-white">
												First Name
												{#if sortColumn === 'firstName'}
													<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														{#if sortDirection === 'asc'}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
														{:else}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="p-3 text-left font-semibold text-gray-400">
											<button on:click={() => sortBy('lastName')} class="flex items-center gap-1 transition-colors hover:text-white">
												Last Name
												{#if sortColumn === 'lastName'}
													<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														{#if sortDirection === 'asc'}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
														{:else}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="p-3 text-left font-semibold text-gray-400">
											<button on:click={() => sortBy('gemId')} class="flex items-center gap-1 transition-colors hover:text-white">
												Gem ID
												{#if sortColumn === 'gemId'}
													<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														{#if sortDirection === 'asc'}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
														{:else}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="p-3 text-left font-semibold text-gray-400">
											<button on:click={() => sortBy('createdAt')} class="flex items-center gap-1 transition-colors hover:text-white">
												Purchase Date
												{#if sortColumn === 'createdAt'}
													<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														{#if sortDirection === 'asc'}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
														{:else}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="p-3 text-left font-semibold text-gray-400">
											<button on:click={() => sortBy('status')} class="flex items-center gap-1 transition-colors hover:text-white">
												Status
												{#if sortColumn === 'status'}
													<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														{#if sortDirection === 'asc'}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
														{:else}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="p-3 text-left font-semibold text-gray-400">
											<button on:click={() => sortBy('enteredIntoGem')} class="flex items-center gap-1 transition-colors hover:text-white">
												In GEM
												{#if sortColumn === 'enteredIntoGem'}
													<svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														{#if sortDirection === 'asc'}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
														{:else}
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
														{/if}
													</svg>
												{/if}
											</button>
										</th>
										<th class="p-3 text-right font-semibold text-gray-400">Actions</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-800/50">
									{#each sortedTickets as ticket}
										<tr class="transition-colors {ticket.refunded ? 'bg-red-500/5' : ''} hover:bg-gray-800/50">
											<td class="p-3 font-medium text-white">{ticket.firstName || 'N/A'}</td>
											<td class="p-3 font-medium text-white">{ticket.lastName || 'N/A'}</td>
											<td class="p-3 font-mono text-sm text-gray-400">{ticket.gemId || 'N/A'}</td>
											<td class="p-3 text-xs text-gray-500">{formatShortDate(ticket.createdAt)}</td>
											<td class="p-3">
												{#if ticket.refunded}
													<span class="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
														<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
														</svg>
														Refunded
													</span>
												{:else}
													<span class="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
														<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
														</svg>
														Paid
													</span>
												{/if}
											</td>
											<td class="p-3">
												<form method="POST" action="?/toggleGemEntry" class="inline-block">
													<input type="hidden" name="ticketId" value={ticket.ticketId} />
													<input type="hidden" name="enteredIntoGem" value={ticket.enteredIntoGem ? 'false' : 'true'} />
													<button
														type="submit"
														class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {ticket.enteredIntoGem ? 'bg-green-600' : 'bg-gray-600'}"
														aria-label="Toggle entered into Gem"
													>
														<span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform {ticket.enteredIntoGem ? 'translate-x-6' : 'translate-x-1'}"></span>
													</button>
												</form>
											</td>
											<td class="p-3 text-right">
												{#if !ticket.refunded}
													<form method="POST" action="?/refund" on:submit|preventDefault={(e) => confirmRefund(ticket.ticketCode) && e.target.submit()} class="inline-block">
														<input type="hidden" name="ticketId" value={ticket.ticketId} />
														<button
															type="submit"
															class="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
														>
															Refund
														</button>
													</form>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
