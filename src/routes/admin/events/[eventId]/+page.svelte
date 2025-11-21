<script>
	export let data;
	export let form;

	let isEditMode = false;
	let gemIdRequired = data.event.gemIdRequired;
	let premiumDiscount = data.event.premiumDiscount;

	// Sorting state
	let sortColumn = 'createdAt'; // Default sort by purchase date
	let sortDirection = 'desc'; // 'asc' or 'desc'

	const circuits = ['West', 'East', 'Central'];

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

<div class="container mx-auto px-2 py-8 max-w-7xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-4 mb-4">
			<a
				href="/admin"
				class="text-gray-400 hover:text-white transition-colors"
			>
				← Back to Admin
			</a>
		</div>
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold text-gray-100">{data.event.title}</h1>
				<p class="text-gray-400 mt-2">Event Management</p>
			</div>
			<button
				on:click={() => (isEditMode = !isEditMode)}
				class="rounded-[var(--radius)] bg-white px-6 py-2.5 text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
			>
				{isEditMode ? 'Cancel Edit' : 'Edit Event'}
			</button>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="rounded-[var(--radius)] bg-green-100 border border-green-400 p-4 mb-6">
			<p class="text-sm text-green-800">{form.message}</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-[var(--radius)] bg-red-700 bg-opacity-10 border border-red-700 p-4 mb-6">
			<p class="text-sm text-red-700">{form.error}</p>
		</div>
	{/if}

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 {data.isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mb-8">
		<!-- Total Revenue - Admin Only -->
		{#if data.isAdmin}
			<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-400">Total Revenue</p>
						<p class="text-3xl font-bold text-gray-100 mt-2">${data.stats.totalRevenue}</p>
					</div>
					<div class="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
						<svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
				</div>
			</div>
		{/if}

		<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-400">Tickets Sold</p>
					<p class="text-3xl font-bold text-gray-100 mt-2">{data.stats.totalTickets}</p>
				</div>
				<div class="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
					<svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
					</svg>
				</div>
			</div>
		</div>

		<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-400">Refunds</p>
					<p class="text-3xl font-bold text-gray-100 mt-2">{data.stats.totalRefunded}</p>
				</div>
				<div class="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
					<svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
					</svg>
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Event Details Column -->
		<div class="lg:col-span-1">
			{#if isEditMode}
				<!-- Edit Event Form -->
				<form method="POST" action="?/updateEvent" class="space-y-6">
					<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6">
						<h2 class="text-xl font-semibold text-gray-100 mb-4">Edit Event Details</h2>

						<div class="space-y-4">
							<!-- Title -->
							<div>
								<label for="title" class="block text-sm font-medium text-gray-100 mb-2">
									Event Name *
								</label>
								<input
									type="text"
									id="title"
									name="title"
									required
									value={data.event.title}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
								/>
							</div>

							<!-- Location -->
							<div>
								<label for="location" class="block text-sm font-medium text-gray-100 mb-2">
									Venue Name *
								</label>
								<input
									type="text"
									id="location"
									name="location"
									required
									value={data.event.location}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
								/>
							</div>

							<!-- Address -->
							<div>
								<label for="address" class="block text-sm font-medium text-gray-100 mb-2">
									Address
								</label>
								<input
									type="text"
									id="address"
									name="address"
									value={data.event.address || ''}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
								/>
							</div>

							<!-- Format -->
							<div>
								<label for="format" class="block text-sm font-medium text-gray-100 mb-2">
									Format *
								</label>
								<select
									id="format"
									name="format"
									required
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
								>
									{#each formats as format}
										<option value={format} selected={data.event.format === format}>{format}</option>
									{/each}
								</select>
							</div>

							<!-- Circuit -->
							<div>
								<label for="circuit" class="block text-sm font-medium text-gray-100 mb-2">
									Circuit
								</label>
								<select
									id="circuit"
									name="circuit"
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
								>
									<option value="">No circuit</option>
									{#each circuits as circuit}
										<option value={circuit} selected={data.event.circuit === circuit}>{circuit}</option>
									{/each}
								</select>
							</div>

							<!-- Month -->
							<div>
								<label for="month" class="block text-sm font-medium text-gray-100 mb-2">
									Month
								</label>
								<select
									id="month"
									name="month"
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
								>
									<option value="">Select month</option>
									{#each months as month}
										<option value={month} selected={data.event.month === month}>{month}</option>
									{/each}
								</select>
							</div>

							<!-- Event Date -->
							<div>
								<label for="eventDate" class="block text-sm font-medium text-gray-100 mb-2">
									Event Date & Time *
								</label>
								<input
									type="datetime-local"
									id="eventDate"
									name="eventDate"
									required
									value={formatDateForInput(data.event.eventDate)}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
								/>
							</div>

							<!-- Price -->
							<div>
								<label for="price" class="block text-sm font-medium text-gray-100 mb-2">
									Entry Fee ($) *
									{#if data.isTournamentStaff}
										<span class="text-xs text-gray-400">(Read-only)</span>
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
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent {data.isTournamentStaff ? 'opacity-60 cursor-not-allowed' : ''}"
								/>
							</div>

							<!-- Description -->
							<div>
								<label for="description" class="block text-sm font-medium text-gray-100 mb-2">
									Description
								</label>
								<textarea
									id="description"
									name="description"
									rows="4"
									value={data.event.description || ''}
									class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
								></textarea>
							</div>

							<!-- Checkboxes -->
							<div class="space-y-3">
								<div class="flex items-center gap-3">
									<input
										type="checkbox"
										id="gemIdRequired"
										name="gemIdRequired"
										bind:checked={gemIdRequired}
										class="w-4 h-4 rounded border-gray-700 text-white focus:ring-2 focus:ring-gray-300"
									/>
									<label for="gemIdRequired" class="text-sm font-medium text-gray-100 cursor-pointer">
										Require Gem ID
									</label>
								</div>

								<div class="flex items-center gap-3">
									<input
										type="checkbox"
										id="premiumDiscount"
										name="premiumDiscount"
										bind:checked={premiumDiscount}
										class="w-4 h-4 rounded border-gray-700 text-white focus:ring-2 focus:ring-gray-300"
									/>
									<label for="premiumDiscount" class="text-sm font-medium text-gray-100 cursor-pointer">
										10% Premium Discount
									</label>
								</div>
							</div>
						</div>

						<div class="mt-6 flex gap-3">
							<button
								type="button"
								on:click={() => (isEditMode = false)}
								class="flex-1 rounded-[var(--radius)] bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="flex-1 rounded-[var(--radius)] bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
							>
								Save Changes
							</button>
						</div>
					</div>
				</form>
			{:else}
				<!-- Event Details View -->
				<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6 space-y-4">
					<h2 class="text-xl font-semibold text-gray-100 mb-4">Event Details</h2>

					<div>
						<p class="text-sm font-medium text-gray-400">Location</p>
						<p class="text-gray-100 font-medium">{data.event.location || 'N/A'}</p>
					</div>

					<div>
						<p class="text-sm font-medium text-gray-400">Date & Time</p>
						<p class="text-gray-100 font-medium">{formatDate(data.event.eventDate)}</p>
					</div>

					<div>
						<p class="text-sm font-medium text-gray-400">Format</p>
						<p class="text-gray-100 font-medium">{data.event.format || 'N/A'}</p>
					</div>

					{#if data.event.circuit}
						<div>
							<p class="text-sm font-medium text-gray-400">Circuit</p>
							<p class="text-gray-100 font-medium">{data.event.circuit}</p>
						</div>
					{/if}

					<div>
						<p class="text-sm font-medium text-gray-400">Entry Fee</p>
						<p class="text-gray-100 font-medium">${parseFloat(data.event.price).toFixed(2)}</p>
					</div>

					{#if data.event.description}
						<div class="pt-4 border-t border-gray-700">
							<p class="text-sm font-medium text-gray-400 mb-2">Description</p>
							<p class="text-gray-100">{data.event.description}</p>
						</div>
					{/if}

					<div class="pt-4 border-t border-gray-700 space-y-2">
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-400">Gem ID Required:</span>
							<span class="text-sm font-medium text-gray-100">
								{data.event.gemIdRequired ? 'Yes' : 'No'}
							</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-gray-400">Premium Discount:</span>
							<span class="text-sm font-medium text-gray-100">
								{data.event.premiumDiscount ? 'Yes' : 'No'}
							</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Tickets Column -->
		<div class="lg:col-span-2">
			<div class="rounded-[var(--radius)] bg-gray-950 border shadow-md p-6">
				<h2 class="text-xl font-semibold text-gray-100 mb-6">Registered Players</h2>

				{#if data.tickets.length === 0}
					<div class="text-center py-12">
						<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
						</svg>
						<p class="mt-4 text-gray-400">No tickets sold yet</p>
					</div>
				{:else}
					<!-- Sortable Table -->
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-gray-700">
									<th class="text-left p-3 font-semibold text-gray-100">
										<button on:click={() => sortBy('firstName')} class="flex items-center gap-1 hover:text-white">
											First Name
											{#if sortColumn === 'firstName'}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													{#if sortDirection === 'asc'}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
													{:else}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="text-left p-3 font-semibold text-gray-100">
										<button on:click={() => sortBy('lastName')} class="flex items-center gap-1 hover:text-white">
											Last Name
											{#if sortColumn === 'lastName'}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													{#if sortDirection === 'asc'}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
													{:else}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="text-left p-3 font-semibold text-gray-100">
										<button on:click={() => sortBy('gemId')} class="flex items-center gap-1 hover:text-white">
											Gem ID
											{#if sortColumn === 'gemId'}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													{#if sortDirection === 'asc'}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
													{:else}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="text-left p-3 font-semibold text-gray-100">
										<button on:click={() => sortBy('createdAt')} class="flex items-center gap-1 hover:text-white">
											Purchase Date
											{#if sortColumn === 'createdAt'}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													{#if sortDirection === 'asc'}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
													{:else}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="text-left p-3 font-semibold text-gray-100">
										<button on:click={() => sortBy('status')} class="flex items-center gap-1 hover:text-white">
											Status
											{#if sortColumn === 'status'}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													{#if sortDirection === 'asc'}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
													{:else}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="text-left p-3 font-semibold text-gray-100">
										<button on:click={() => sortBy('enteredIntoGem')} class="flex items-center gap-1 hover:text-white">
											Entered into Gem?
											{#if sortColumn === 'enteredIntoGem'}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													{#if sortDirection === 'asc'}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
													{:else}
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="text-right p-3 font-semibold text-gray-100">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each sortedTickets as ticket}
									<tr class="border-b border-gray-700 {ticket.refunded ? 'bg-red-500/5' : ''} hover:bg-gray-800 transition-colors">
										<td class="p-3 text-gray-100">{ticket.firstName || 'N/A'}</td>
										<td class="p-3 text-gray-100">{ticket.lastName || 'N/A'}</td>
										<td class="p-3 text-gray-100">{ticket.gemId || 'N/A'}</td>
										<td class="p-3 text-gray-400 text-xs">{formatShortDate(ticket.createdAt)}</td>
										<td class="p-3">
											{#if ticket.refunded}
												<span class="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
													Refunded
												</span>
											{:else}
												<span class="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
													class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {ticket.enteredIntoGem ? 'bg-green-600' : 'bg-gray-300'}"
													aria-label="Toggle entered into Gem"
												>
													<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {ticket.enteredIntoGem ? 'translate-x-6' : 'translate-x-1'}"></span>
												</button>
											</form>
										</td>
										<td class="p-3 text-right">
											{#if !ticket.refunded}
												<form method="POST" action="?/refund" on:submit|preventDefault={(e) => confirmRefund(ticket.ticketCode) && e.target.submit()} class="inline-block">
													<input type="hidden" name="ticketId" value={ticket.ticketId} />
													<button
														type="submit"
														class="rounded-[var(--radius)] bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
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
