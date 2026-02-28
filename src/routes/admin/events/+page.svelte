<script>
	import { getCircuit, getCircuitNames } from '$lib/data/circuits.js';

	let { data, form } = $props();

	// ========== EVENT MANAGEMENT STATE ==========
	let eventsSearchQuery = $state('');
	let eventsStatusFilter = $state('active'); // 'all', 'active', 'upcoming', 'in_progress', 'completed', 'cancelled'
	let eventsCircuitFilter = $state('all'); // 'all' or specific circuit
	let eventsPage = $state(1);
	let eventsPerPage = 10;

	// Filtered events
	let filteredEvents = $derived(
		(data.events || [])
			.filter((evt) => {
				// Search filter
				if (eventsSearchQuery) {
					const q = eventsSearchQuery.toLowerCase();
					const matchesTitle = evt.title?.toLowerCase().includes(q);
					const matchesCircuit = evt.circuit?.toLowerCase().includes(q);
					const matchesLocation = evt.location?.toLowerCase().includes(q);
					if (!matchesTitle && !matchesCircuit && !matchesLocation) return false;
				}
				// Status filter
				if (eventsStatusFilter !== 'all') {
					const status = evt.status || 'upcoming';
					if (eventsStatusFilter === 'active') {
						if (status !== 'upcoming' && status !== 'in_progress') return false;
					} else if (status !== eventsStatusFilter) return false;
				}
				// Circuit filter
				if (eventsCircuitFilter !== 'all' && evt.circuit !== eventsCircuitFilter) return false;
				return true;
			})
			.sort((a, b) => {
				// Sort by event date ascending (nearest upcoming first), then by creation date
				if (a.eventDate && b.eventDate) {
					return new Date(a.eventDate) - new Date(b.eventDate);
				}
				if (a.eventDate) return -1;
				if (b.eventDate) return 1;
				return new Date(a.createdAt) - new Date(b.createdAt);
			})
	);

	// Paginated events
	let paginatedEvents = $derived(
		filteredEvents.slice((eventsPage - 1) * eventsPerPage, eventsPage * eventsPerPage)
	);
	let totalEventsPages = $derived(Math.ceil(filteredEvents.length / eventsPerPage));

	// Get ticket stats for an event
	function getEventTicketStats(eventId) {
		return data.eventAnalytics?.ticketsByEvent?.[eventId] || { sold: 0, revenue: 0, refunded: 0 };
	}

	// Format currency helper
	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount || 0);
	}

	// Format date helper (using UTC to preserve wall clock time)
	function formatDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
		return new Date(date).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
	}

	// Get circuit border color
	function getCircuitBorderColor(circuit) {
		return getCircuit(circuit).colors.borderLeft;
	}
</script>

<svelte:head>
	<title>Events - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<main>
			{#if form?.success}
				<div
					class="mb-6 rounded-xl border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/5 p-4 shadow-lg shadow-green-500/5"
				>
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
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
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<p class="text-sm font-medium text-green-400">{form.message}</p>
					</div>
				</div>
			{/if}

			{#if form?.error}
				<div
					class="mb-6 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/5 p-4 shadow-lg shadow-red-500/5"
				>
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
							<svg
								class="h-5 w-5 text-red-400"
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
						</div>
						<p class="text-sm font-medium text-red-400">{form.error}</p>
					</div>
				</div>
			{/if}

			<div class="space-y-4">
				<!-- Stats Cards -->
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
								<svg
									class="h-5 w-5 text-cyan-400"
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
							</div>
							<div>
								<p class="text-xs text-gray-400">Total Events</p>
								<p class="text-xl font-bold text-white">
									{data.eventAnalytics?.totalEvents || 0}
								</p>
							</div>
						</div>
					</div>
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
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
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-400">Upcoming</p>
								<p class="text-xl font-bold text-green-400">
									{data.eventAnalytics?.upcomingEvents || 0}
								</p>
							</div>
						</div>
					</div>
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
								<svg
									class="h-5 w-5 text-purple-400"
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
							</div>
							<div>
								<p class="text-xs text-gray-400">Tickets Sold</p>
								<p class="text-xl font-bold text-purple-400">
									{data.eventAnalytics?.totalTicketsSold || 0}
								</p>
							</div>
						</div>
					</div>
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
								<svg
									class="h-5 w-5 text-emerald-400"
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
								<p class="text-xs text-gray-400">Revenue</p>
								<p class="text-xl font-bold text-emerald-400">
									{formatCurrency(data.eventAnalytics?.totalTicketRevenue || 0)}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Circuit Breakdown -->
				<div
					class="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-gray-900/50 px-4 py-3"
				>
					<span class="text-xs font-medium tracking-wider text-gray-500 uppercase">By Circuit:</span
					>
					{#each data.eventAnalytics?.byCircuit || [] as circuit}
						<div class="flex items-center gap-2">
							<div
								class="h-2.5 w-2.5 rounded-full {circuit.name === 'Los Angeles'
									? 'bg-blue-500'
									: circuit.name === 'St. Louis'
										? 'bg-green-500'
										: circuit.name === 'New England'
											? 'bg-purple-500'
											: 'bg-gray-500'}"
							></div>
							<span class="text-sm text-gray-300">{circuit.name || 'Other'}</span>
							<span class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white"
								>{circuit.count}</span
							>
						</div>
					{/each}
				</div>

				<!-- Search, Filters & Create Button -->
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<!-- Search -->
					<div class="relative flex-1 sm:max-w-xs">
						<svg
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<input
							type="text"
							bind:value={eventsSearchQuery}
							placeholder="Search events..."
							class="w-full rounded-lg border border-white/10 bg-gray-800 py-2 pr-8 pl-9 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
						/>
						{#if eventsSearchQuery}
							<button
								type="button"
								onclick={() => (eventsSearchQuery = '')}
								class="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-white"
								aria-label="Clear search"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

					<!-- Filters & Create -->
					<div class="flex flex-wrap items-center gap-2">
						<select
							bind:value={eventsStatusFilter}
							class="rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
						>
							<option value="active">Active</option>
							<option value="all">All Status</option>
							<option value="upcoming">Upcoming</option>
							<option value="in_progress">In Progress</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
						</select>
						<select
							bind:value={eventsCircuitFilter}
							class="rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
						>
							<option value="all">All Circuits</option>
							{#each data.eventAnalytics?.byCircuit || [] as circuit}
								<option value={circuit.name}>{circuit.name}</option>
							{/each}
						</select>
						<a
							href="/admin/events/new"
							class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Create Event
						</a>
					</div>
				</div>

				<!-- Events List -->
				<div class="overflow-hidden rounded-xl border border-white/10 bg-gray-900/50">
					<div
						class="flex items-center justify-between border-b border-white/10 bg-gray-800/30 px-4 py-2.5"
					>
						<p class="text-sm text-gray-400">{filteredEvents.length} events</p>
						{#if filteredEvents.length !== (data.events || []).length}
							<button
								onclick={() => {
									eventsSearchQuery = '';
									eventsStatusFilter = 'all';
									eventsCircuitFilter = 'all';
								}}
								class="text-xs text-cyan-400 hover:text-cyan-300"
							>
								Clear filters
							</button>
						{/if}
					</div>

					<!-- Mobile Card View -->
					<div class="divide-y divide-white/5 sm:hidden">
						{#each paginatedEvents as event}
							{@const ticketStats = getEventTicketStats(event.id)}
							<a
								href="/admin/events/{event.id}"
								class="flex items-center gap-3 p-4 transition-colors hover:bg-white/5 active:bg-white/10"
							>
								<!-- Circuit Color Indicator -->
								<div
									class="w-1 self-stretch rounded-full {getCircuit(event.circuit).colors.dot}"
								></div>

								<div class="min-w-0 flex-1">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<p class="truncate font-medium text-white">{event.title}</p>
											<div class="mt-1 flex flex-wrap items-center gap-2">
												{#if event.circuit}
													<span
														class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {event.circuit ===
														'Los Angeles'
															? 'bg-blue-500/20 text-blue-400'
															: event.circuit === 'St. Louis'
																? 'bg-green-500/20 text-green-400'
																: event.circuit === 'New England'
																	? 'bg-purple-500/20 text-purple-400'
																	: 'bg-gray-500/20 text-gray-400'}"
													>
														{event.circuit}
													</span>
												{/if}
												<span
													class="rounded-full px-2 py-0.5 text-xs font-medium capitalize {event.status ===
													'completed'
														? 'bg-green-500/20 text-green-400'
														: event.status === 'in_progress'
															? 'bg-amber-500/20 text-amber-400'
															: event.status === 'cancelled'
																? 'bg-red-500/20 text-red-400'
																: 'bg-cyan-500/20 text-cyan-400'}"
												>
													{event.status || 'upcoming'}
												</span>
											</div>
										</div>
										<svg
											class="h-5 w-5 shrink-0 text-gray-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</div>
									<div class="mt-2 flex items-center gap-4 text-xs text-gray-500">
										<span>
											{#if event.eventDate}
												{formatDate(event.eventDate)} @ {new Date(
													event.eventDate
												).toLocaleTimeString('en-US', {
													hour: 'numeric',
													minute: '2-digit',
													timeZone: 'UTC'
												})}
											{:else}
												No date
											{/if}
										</span>
										<span class="font-medium text-purple-400">{ticketStats.sold} tickets</span>
									</div>
								</div>
							</a>
						{:else}
							<div class="p-8 text-center">
								<svg
									class="mx-auto mb-3 h-10 w-10 text-gray-600"
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
								<p class="text-gray-400">
									{eventsSearchQuery ||
									eventsStatusFilter !== 'all' ||
									eventsCircuitFilter !== 'all'
										? 'No events match your filters'
										: 'No events yet'}
								</p>
							</div>
						{/each}
					</div>

					<!-- Desktop Table View -->
					<div class="hidden sm:block">
						<table class="w-full">
							<thead class="bg-gray-800/50">
								<tr>
									<th
										class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Event</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Circuit</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Date</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Status</th
									>
									<th
										class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Tickets</th
									>
									<th
										class="px-4 py-3 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Revenue</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/5">
								{#each paginatedEvents as event}
									{@const ticketStats = getEventTicketStats(event.id)}
									<tr
										class="group cursor-pointer transition-colors hover:bg-white/5"
										onclick={() => (window.location.href = `/admin/events/${event.id}`)}
									>
										<td class="px-4 py-3">
											<div class="flex items-center gap-3">
												<div
													class="h-8 w-1 rounded-full {getCircuit(event.circuit).colors.dot}"
												></div>
												<div class="min-w-0">
													<p
														class="truncate font-medium text-white transition-colors group-hover:text-cyan-400"
													>
														{event.title}
													</p>
													<p class="text-xs text-gray-500">{event.format || 'N/A'}</p>
												</div>
											</div>
										</td>
										<td class="px-4 py-3">
											{#if event.circuit}
												<span
													class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold {event.circuit ===
													'Los Angeles'
														? 'bg-blue-500/20 text-blue-400'
														: event.circuit === 'St. Louis'
															? 'bg-green-500/20 text-green-400'
															: event.circuit === 'New England'
																? 'bg-purple-500/20 text-purple-400'
																: 'bg-gray-500/20 text-gray-400'}"
												>
													{event.circuit}
												</span>
											{:else}
												<span class="text-gray-500">—</span>
											{/if}
										</td>
										<td class="px-4 py-3">
											{#if event.eventDate}
												<div>
													<span class="text-sm text-gray-300">{formatDate(event.eventDate)}</span>
													<p class="text-xs text-gray-500">
														{new Date(event.eventDate).toLocaleTimeString('en-US', {
															hour: 'numeric',
															minute: '2-digit',
															timeZone: 'UTC'
														})}
													</p>
												</div>
											{:else}
												<span
													class="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400"
													>No Date</span
												>
											{/if}
										</td>
										<td class="px-4 py-3">
											<span
												class="rounded-full px-2.5 py-1 text-xs font-medium capitalize {event.status ===
												'completed'
													? 'bg-green-500/20 text-green-400'
													: event.status === 'in_progress'
														? 'bg-amber-500/20 text-amber-400'
														: event.status === 'cancelled'
															? 'bg-red-500/20 text-red-400'
															: 'bg-cyan-500/20 text-cyan-400'}"
											>
												{event.status || 'upcoming'}
											</span>
										</td>
										<td class="px-4 py-3 text-right">
											<span class="text-sm font-medium text-white">{ticketStats.sold}</span>
										</td>
										<td class="px-4 py-3 text-right">
											<span class="text-sm font-medium text-emerald-400"
												>{formatCurrency(ticketStats.revenue)}</span
											>
										</td>
									</tr>
								{:else}
									<tr>
										<td colspan="6" class="px-4 py-12 text-center">
											<svg
												class="mx-auto h-10 w-10 text-gray-600 mb-3"
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
											<p class="text-gray-400">
												{eventsSearchQuery ||
												eventsStatusFilter !== 'all' ||
												eventsCircuitFilter !== 'all'
													? 'No events match your filters'
													: 'No events yet'}
											</p>
											{#if !eventsSearchQuery && eventsStatusFilter === 'all' && eventsCircuitFilter === 'all'}
												<a
													href="/admin/events/new"
													class="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition-colors"
												>
													<svg
														class="h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 4v16m8-8H4"
														/>
													</svg>
													Create First Event
												</a>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Pagination -->
					{#if totalEventsPages > 1}
						<div
							class="flex items-center justify-between border-t border-white/10 bg-gray-800/30 px-4 py-3"
						>
							<p class="text-sm text-gray-400">Page {eventsPage} of {totalEventsPages}</p>
							<div class="flex gap-2">
								<button
									onclick={() => (eventsPage = Math.max(1, eventsPage - 1))}
									disabled={eventsPage === 1}
									class="rounded-lg border border-white/10 bg-gray-800 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Previous
								</button>
								<button
									onclick={() => (eventsPage = Math.min(totalEventsPages, eventsPage + 1))}
									disabled={eventsPage === totalEventsPages}
									class="rounded-lg border border-white/10 bg-gray-800 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</main>
	</div>
</div>
