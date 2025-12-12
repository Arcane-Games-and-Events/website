<script>
	import { browser } from '$app/environment';
	import { getCircuit } from '$lib/data/circuits.js';

	let { data, form } = $props();

	// Tab state
	const storageKey = `staff-event-tab-${data.event.id}`;
	let activeTab = $state(browser ? (sessionStorage.getItem(storageKey) || 'overview') : 'overview');

	function setActiveTab(tab) {
		activeTab = tab;
		if (browser) {
			sessionStorage.setItem(storageKey, tab);
		}
	}

	// Track local gem entry status for each ticket
	let gemEntryStatus = $state(Object.fromEntries(data.tickets.map(t => [t.ticketId, t.enteredIntoGem])));
	let gemEntryLoading = $state({});

	// Track copied GEM ID for visual feedback
	let copiedGemId = $state(null);

	async function copyGemId(gemId) {
		if (!gemId) return;
		try {
			await navigator.clipboard.writeText(gemId);
			copiedGemId = gemId;
			setTimeout(() => {
				copiedGemId = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy GEM ID:', err);
		}
	}

	async function toggleGemEntry(ticketId, currentValue) {
		gemEntryLoading[ticketId] = true;
		const newValue = !currentValue;

		try {
			const formData = new FormData();
			formData.append('ticketId', ticketId);
			formData.append('enteredIntoGem', newValue.toString());

			const response = await fetch('?/toggleGemEntry', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				gemEntryStatus[ticketId] = newValue;
			}
		} catch (err) {
			console.error('Error toggling GEM entry:', err);
		} finally {
			gemEntryLoading[ticketId] = false;
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'TBD';
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatDateTime(dateStr) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status) {
		switch (status) {
			case 'upcoming':
				return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Upcoming' };
			case 'in_progress':
				return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' };
			case 'completed':
				return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' };
			case 'cancelled':
				return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' };
			default:
				return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };
		}
	}

	const circuit = $derived(getCircuit(data.event.circuit));
	const status = $derived(getStatusBadge(data.event.computedStatus));

	// Filter tickets (non-refunded only for registrations tab)
	const activeTickets = $derived(data.tickets.filter(t => !t.refunded));

	const tabs = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'registrations', label: `Registrations (${data.stats.totalTickets})` }
	];
</script>

<svelte:head>
	<title>{data.event.title} | Staff View | AGE</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8">
	<!-- Back Link -->
	<a href="/my-age/events" class="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
		Back to My Events
	</a>

	<!-- Header -->
	<div class="mb-8">
		<div class="flex flex-wrap items-center gap-3 mb-2">
			<h1 class="text-2xl font-bold text-white sm:text-3xl">{data.event.title}</h1>
			<span class="rounded-full {status.bg} px-3 py-1 text-sm font-medium {status.text}">
				{status.label}
			</span>
			{#if data.event.circuit}
				<span class="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1 text-sm">
					<span class="h-2 w-2 rounded-full {circuit.colors.bg}"></span>
					<span class="text-gray-300">{data.event.circuit}</span>
				</span>
			{/if}
		</div>
		<p class="text-gray-400">Staff event management - limited access</p>
	</div>

	<!-- Form Messages -->
	{#if form?.error}
		<div class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div class="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-400">
			{form.message}
		</div>
	{/if}

	<!-- Tabs -->
	<div class="mb-6 border-b border-white/10">
		<nav class="-mb-px flex gap-4">
			{#each tabs as tab}
				<button
					onclick={() => setActiveTab(tab.id)}
					class="whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors
						{activeTab === tab.id
							? 'border-blue-500 text-blue-400'
							: 'border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
				>
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>

	<!-- Tab Content -->
	<div class="space-y-6">
		<!-- Overview Tab -->
		{#if activeTab === 'overview'}
			<div class="grid gap-6 lg:grid-cols-2">
				<!-- Event Details -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="text-lg font-semibold text-white mb-4">Event Details</h3>
					<dl class="space-y-4">
						<div>
							<dt class="text-sm text-gray-500">Date</dt>
							<dd class="text-white">{formatDate(data.event.eventDate)}</dd>
						</div>
						<div>
							<dt class="text-sm text-gray-500">Location</dt>
							<dd class="text-white">{data.event.location || 'TBD'}</dd>
						</div>
						{#if data.event.address}
							<div>
								<dt class="text-sm text-gray-500">Address</dt>
								<dd class="text-white">{data.event.address}</dd>
							</div>
						{/if}
						<div>
							<dt class="text-sm text-gray-500">Format</dt>
							<dd class="text-white">{data.event.format || 'TBD'}</dd>
						</div>
						{#if data.event.circuit}
							<div>
								<dt class="text-sm text-gray-500">Circuit</dt>
								<dd class="flex items-center gap-2">
									<span class="h-2 w-2 rounded-full {circuit.colors.bg}"></span>
									<span class="text-white">{data.event.circuit}</span>
								</dd>
							</div>
						{/if}
						<div>
							<dt class="text-sm text-gray-500">GEM ID Required</dt>
							<dd class="text-white">{data.event.gemIdRequired ? 'Yes' : 'No'}</dd>
						</div>
					</dl>
				</div>

				<!-- Stats -->
				<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
					<h3 class="text-lg font-semibold text-white mb-4">Registration Stats</h3>
					<div class="grid grid-cols-2 gap-4">
						<div class="rounded-lg bg-gray-800/50 p-4 text-center">
							<p class="text-3xl font-bold text-white">{data.stats.totalTickets}</p>
							<p class="text-sm text-gray-400">Registered</p>
						</div>
						<div class="rounded-lg bg-gray-800/50 p-4 text-center">
							<p class="text-3xl font-bold text-red-400">{data.stats.totalRefunded}</p>
							<p class="text-sm text-gray-400">Refunded</p>
						</div>
					</div>
				</div>

				<!-- Description -->
				{#if data.event.description}
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6 lg:col-span-2">
						<h3 class="text-lg font-semibold text-white mb-4">Description</h3>
						<p class="text-gray-300 whitespace-pre-wrap">{data.event.description}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Registrations Tab -->
		{#if activeTab === 'registrations'}
			<div class="rounded-xl border border-white/10 bg-gray-900/50 overflow-hidden">
				<div class="border-b border-white/10 bg-gray-800/50 px-6 py-4">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-white">Registered Players</h3>
						<span class="text-sm text-gray-400">{activeTickets.length} players</span>
					</div>
				</div>

				{#if activeTickets.length > 0}
					<!-- Desktop Table -->
					<div class="hidden md:block overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-800/30 text-left text-xs uppercase tracking-wider text-gray-500">
								<tr>
									<th class="px-6 py-3">Player</th>
									<th class="px-6 py-3">GEM ID</th>
									<th class="px-6 py-3">Ticket Code</th>
									<th class="px-6 py-3">Registered</th>
									<th class="px-6 py-3 text-center">In GEM?</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/5">
								{#each activeTickets as ticket}
									<tr class="hover:bg-gray-800/30 transition-colors">
										<td class="px-6 py-4">
											<div>
												<p class="font-medium text-white">
													{ticket.firstName || ''} {ticket.lastName || ''}
												</p>
												{#if ticket.userEmail}
													<p class="text-xs text-gray-500">{ticket.userEmail}</p>
												{/if}
											</div>
										</td>
										<td class="px-6 py-4 text-gray-300">
											{#if ticket.gemId}
												<button
													onclick={() => copyGemId(ticket.gemId)}
													class="group inline-flex items-center gap-1.5 hover:text-white transition-colors"
													title="Click to copy"
												>
													<span>{ticket.gemId}</span>
													{#if copiedGemId === ticket.gemId}
														<svg class="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
														</svg>
													{:else}
														<svg class="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
														</svg>
													{/if}
												</button>
											{:else}
												-
											{/if}
										</td>
										<td class="px-6 py-4">
											<code class="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{ticket.ticketCode}</code>
										</td>
										<td class="px-6 py-4 text-sm text-gray-400">
											{formatDateTime(ticket.createdAt)}
										</td>
										<td class="px-6 py-4 text-center">
											<button
												onclick={() => toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId])}
												disabled={gemEntryLoading[ticket.ticketId]}
												class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50
													{gemEntryStatus[ticket.ticketId]
														? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
														: 'bg-gray-700 text-gray-400 hover:bg-gray-600'}"
											>
												{#if gemEntryLoading[ticket.ticketId]}
													<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
														<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
														<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
													</svg>
												{:else if gemEntryStatus[ticket.ticketId]}
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
														<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
													</svg>
												{:else}
													-
												{/if}
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Mobile Cards -->
					<div class="md:hidden divide-y divide-white/5">
						{#each activeTickets as ticket}
							<div class="p-4 space-y-3">
								<div class="flex items-start justify-between">
									<div>
										<p class="font-medium text-white">
											{ticket.firstName || ''} {ticket.lastName || ''}
										</p>
										{#if ticket.gemId}
											<button
												onclick={() => copyGemId(ticket.gemId)}
												class="group inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
											>
												<span>GEM: {ticket.gemId}</span>
												{#if copiedGemId === ticket.gemId}
													<svg class="h-3.5 w-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
													</svg>
												{:else}
													<svg class="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
													</svg>
												{/if}
											</button>
										{/if}
									</div>
									<button
										onclick={() => toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId])}
										disabled={gemEntryLoading[ticket.ticketId]}
										class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50
											{gemEntryStatus[ticket.ticketId]
												? 'bg-green-500/20 text-green-400'
												: 'bg-gray-700 text-gray-400'}"
									>
										{gemEntryStatus[ticket.ticketId] ? 'In GEM' : 'Not in GEM'}
									</button>
								</div>
								<div class="flex items-center gap-4 text-sm text-gray-500">
									<code class="rounded bg-gray-800 px-2 py-0.5 text-xs">{ticket.ticketCode}</code>
									<span>{formatDateTime(ticket.createdAt)}</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="p-12 text-center">
						<svg class="mx-auto h-12 w-12 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						<p class="text-gray-400">No registered players yet</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
