<script>
	import { getCircuit } from '$lib/data/circuits.js';

	let { data, form } = $props();

	let eventsSearchQuery = $state('');
	let eventsStatusFilter = $state('active');
	let eventsCircuitFilter = $state('all');
	let eventsPage = $state(1);
	let eventsPerPage = 10;

	const filteredEvents = $derived(
		(data.events || [])
			.filter((evt) => {
				if (eventsSearchQuery) {
					const q = eventsSearchQuery.toLowerCase();
					const matchesTitle = evt.title?.toLowerCase().includes(q);
					const matchesCircuit = evt.circuit?.toLowerCase().includes(q);
					const matchesLocation = evt.location?.toLowerCase().includes(q);
					if (!matchesTitle && !matchesCircuit && !matchesLocation) return false;
				}
				if (eventsStatusFilter !== 'all') {
					const status = evt.status || 'upcoming';
					if (eventsStatusFilter === 'active') {
						if (status !== 'upcoming' && status !== 'in_progress') return false;
					} else if (status !== eventsStatusFilter) return false;
				}
				if (eventsCircuitFilter !== 'all' && evt.circuit !== eventsCircuitFilter) return false;
				return true;
			})
			.sort((a, b) => {
				if (a.eventDate && b.eventDate) return new Date(a.eventDate) - new Date(b.eventDate);
				if (a.eventDate) return -1;
				if (b.eventDate) return 1;
				return new Date(a.createdAt) - new Date(b.createdAt);
			})
	);

	const paginatedEvents = $derived(
		filteredEvents.slice((eventsPage - 1) * eventsPerPage, eventsPage * eventsPerPage)
	);
	const totalEventsPages = $derived(Math.ceil(filteredEvents.length / eventsPerPage));

	function getEventTicketStats(eventId) {
		return data.eventAnalytics?.ticketsByEvent?.[eventId] || { sold: 0, revenue: 0, refunded: 0 };
	}

	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			amount || 0
		);
	}

	function formatDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
		return new Date(date).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
	}

	function statusChip(status) {
		switch (status) {
			case 'completed':
				return 'bg-prem text-white';
			case 'in_progress':
				return 'bg-warm text-white';
			case 'cancelled':
				return 'border-line2 text-fade border';
			default:
				return 'bg-accent text-white';
		}
	}
</script>

<svelte:head><title>Events · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase">
			Events
		</span>
		<span class="hidden h-[1px] flex-1 bg-line2 md:block"></span>
		<a
			href="/admin/events/new"
			class="inline-flex items-center bg-ink px-[14px] py-[9px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125"
		>
			+ New Event
		</a>
	</div>
	<h1
		class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
	>
		Every AGE Open, one desk.
	</h1>
	<p class="mt-3 max-w-[680px] font-newsreader text-[19px] leading-[1.42] text-soft italic">
		Schedule, status, tickets, and revenue across every circuit.
	</p>
</header>

{#if form?.success}
	<section class="mx-auto w-full max-w-[1600px] overflow-x-clip px-4 pb-[12px] md:px-10 lg:px-14">
		<div class="border-[1.5px] border-ink bg-prem p-4 text-white">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
				style="color: #d6eedf;">Success</span
			>
			<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{form.message}</p>
		</div>
	</section>
{/if}
{#if form?.error}
	<section class="mx-auto w-full max-w-[1600px] overflow-x-clip px-4 pb-[12px] md:px-10 lg:px-14">
		<div class="border-[1.5px] border-ink bg-warm p-4 text-white">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
				style="color: rgba(255,255,255,0.75);">Error</span
			>
			<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{form.error}</p>
		</div>
	</section>
{/if}

<!-- ============ STATS ============ -->
<section class="overflow-x-clip border-y-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[28px] md:px-10 lg:px-14">
		<div class="grid grid-cols-2 gap-[24px] md:grid-cols-4">
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Total Events</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{data.eventAnalytics?.totalEvents || 0}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Upcoming</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-accent"
				>
					{data.eventAnalytics?.upcomingEvents || 0}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Tickets Sold</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{data.eventAnalytics?.totalTicketsSold || 0}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Revenue</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-prem"
				>
					{formatCurrency(data.eventAnalytics?.totalTicketRevenue || 0)}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ============ CIRCUIT ROW ============ -->
{#if (data.eventAnalytics?.byCircuit || []).length > 0}
	<section class="overflow-x-clip border-b-[3px] border-double border-ink">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[18px] md:px-10 lg:px-14">
			<div class="flex flex-wrap items-center gap-[16px]">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					By Circuit
				</span>
				{#each data.eventAnalytics?.byCircuit || [] as circuit (circuit.name || 'other')}
					<div class="flex items-center gap-[8px]">
						<span class="inline-block h-[10px] w-[10px] {getCircuit(circuit.name).colors.dot}"
						></span>
						<span class="font-newsreader text-[15px] font-semibold">{circuit.name || 'Other'}</span>
						<span
							class="inline-flex items-center border border-line2 px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
						>
							{circuit.count}
						</span>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- ============ FILTERS ============ -->
<section class="overflow-x-clip border-b-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[24px] md:px-10 lg:px-14">
		<div class="flex flex-col gap-[14px] sm:flex-row sm:items-center sm:justify-between">
			<div class="relative flex-1 sm:max-w-md">
				<input
					type="text"
					bind:value={eventsSearchQuery}
					placeholder="Search title, circuit, or location"
					class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
				/>
				{#if eventsSearchQuery}
					<button
						type="button"
						onclick={() => (eventsSearchQuery = '')}
						class="absolute top-1/2 right-2 -translate-y-1/2 text-[16px] text-fade hover:text-ink"
						aria-label="Clear search"
					>
						×
					</button>
				{/if}
			</div>
			<div class="flex flex-wrap items-center gap-[10px]">
				<select
					bind:value={eventsStatusFilter}
					class="border-[1.5px] border-ink bg-paper-bg px-[12px] py-[9px] font-mono-system text-[11px] font-bold tracking-[0.08em] text-ink uppercase focus:outline-none"
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
					class="border-[1.5px] border-ink bg-paper-bg px-[12px] py-[9px] font-mono-system text-[11px] font-bold tracking-[0.08em] text-ink uppercase focus:outline-none"
				>
					<option value="all">All Circuits</option>
					{#each data.eventAnalytics?.byCircuit || [] as circuit (circuit.name)}
						<option value={circuit.name}>{circuit.name}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>
</section>

<!-- ============ LIST ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
		<div class="mb-[16px] flex items-center justify-between">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
			>
				{filteredEvents.length} events shown
			</span>
			{#if filteredEvents.length !== (data.events || []).length}
				<button
					onclick={() => {
						eventsSearchQuery = '';
						eventsStatusFilter = 'all';
						eventsCircuitFilter = 'all';
					}}
					class="font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] text-warm uppercase transition-colors hover:text-ink"
				>
					Clear filters
				</button>
			{/if}
		</div>

		<!-- Mobile -->
		<div class="overflow-hidden border-[1.5px] border-ink sm:hidden">
			{#each paginatedEvents as event (event.id)}
				{@const ticketStats = getEventTicketStats(event.id)}
				<a
					href="/admin/events/{event.id}"
					class="flex items-center gap-3 border-b border-line2 p-4 transition-colors last:border-b-0 hover:bg-panel"
				>
					<span class="w-[3px] self-stretch {getCircuit(event.circuit).colors.dot}"></span>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<div class="truncate font-newsreader text-[16px] font-semibold">{event.title}</div>
								<div class="mt-[6px] flex flex-wrap items-center gap-2">
									{#if event.circuit}
										<span
											class="inline-flex items-center border border-line2 px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
										>
											{event.circuit}
										</span>
									{/if}
									<span
										class="inline-flex items-center px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] uppercase {statusChip(
											event.status
										)}"
									>
										{event.status || 'upcoming'}
									</span>
								</div>
							</div>
							<span class="shrink-0 font-mono-system text-[12px] font-bold text-fade">→</span>
						</div>
						<div
							class="mt-[8px] flex items-center gap-3 font-mono-system text-[10px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							<span>
								{#if event.eventDate}
									{formatDate(event.eventDate)}
								{:else}
									No date
								{/if}
							</span>
							<span class="text-warm">{ticketStats.sold} tickets</span>
						</div>
					</div>
				</a>
			{:else}
				<div class="p-8 text-center">
					<p class="font-newsreader text-soft text-[17px] italic">
						{eventsSearchQuery || eventsStatusFilter !== 'all' || eventsCircuitFilter !== 'all'
							? 'No events match your filters.'
							: 'No events yet.'}
					</p>
				</div>
			{/each}
		</div>

		<!-- Desktop -->
		<div class="hidden border-[1.5px] border-ink sm:block">
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px]">
					<thead class="border-b-[1.5px] border-ink">
						<tr class="text-left">
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Event</th
							>
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Circuit</th
							>
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Date</th
							>
							<th
								class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Status</th
							>
							<th
								class="px-4 py-[12px] text-right font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Tickets</th
							>
							<th
								class="px-4 py-[12px] text-right font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>Revenue</th
							>
						</tr>
					</thead>
					<tbody>
						{#each paginatedEvents as event (event.id)}
							{@const ticketStats = getEventTicketStats(event.id)}
							<tr
								class="group cursor-pointer border-b border-line2 transition-colors hover:bg-panel"
								onclick={() => (window.location.href = `/admin/events/${event.id}`)}
							>
								<td class="px-4 py-[14px]">
									<div class="flex items-center gap-3">
										<span class="h-[28px] w-[3px] {getCircuit(event.circuit).colors.dot}"></span>
										<div class="min-w-0">
											<div
												class="truncate font-newsreader text-[16px] font-semibold transition-colors group-hover:text-warm"
											>
												{event.title}
											</div>
											<div class="text-[12px] text-fade">{event.format || '—'}</div>
										</div>
									</div>
								</td>
								<td class="px-4 py-[14px]">
									{#if event.circuit}
										<span
											class="inline-flex items-center border border-line2 px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
										>
											{event.circuit}
										</span>
									{:else}
										<span class="text-fade">—</span>
									{/if}
								</td>
								<td class="px-4 py-[14px]">
									{#if event.eventDate}
										<div class="font-newsreader text-[15px] font-semibold">
											{formatDate(event.eventDate)}
										</div>
										<div
											class="mt-[2px] font-mono-system text-[10px] font-bold tracking-[0.06em] text-fade uppercase"
										>
											{new Date(event.eventDate).toLocaleTimeString('en-US', {
												hour: 'numeric',
												minute: '2-digit',
												timeZone: 'UTC'
											})}
										</div>
									{:else}
										<span
											class="inline-flex items-center bg-warm px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
										>
											No Date
										</span>
									{/if}
								</td>
								<td class="px-4 py-[14px]">
									<span
										class="inline-flex items-center px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.08em] uppercase {statusChip(
											event.status
										)}"
									>
										{event.status || 'upcoming'}
									</span>
								</td>
								<td
									class="px-4 py-[14px] text-right font-archivo text-[15px] font-extrabold tracking-[-0.01em] text-ink"
								>
									{ticketStats.sold}
								</td>
								<td
									class="px-4 py-[14px] text-right font-archivo text-[15px] font-extrabold tracking-[-0.01em] text-prem"
								>
									{formatCurrency(ticketStats.revenue)}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-4 py-12 text-center">
									<p class="font-newsreader text-soft text-[19px] italic">
										{eventsSearchQuery ||
										eventsStatusFilter !== 'all' ||
										eventsCircuitFilter !== 'all'
											? 'No events match your filters.'
											: 'No events yet.'}
									</p>
									{#if !eventsSearchQuery && eventsStatusFilter === 'all' && eventsCircuitFilter === 'all'}
										<a
											href="/admin/events/new"
											class="bg-ink font-mono-system mt-4 inline-flex items-center px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white hover:brightness-125 transition-[filter]"
										>
											+ Create First Event
										</a>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if totalEventsPages > 1}
				<div class="flex items-center justify-between border-t-[1.5px] border-ink px-5 py-[14px]">
					<span
						class="font-mono-system text-[10.5px] font-bold tracking-[0.08em] text-fade uppercase"
					>
						Page {eventsPage} of {totalEventsPages}
					</span>
					<div class="flex gap-2">
						<button
							onclick={() => (eventsPage = Math.max(1, eventsPage - 1))}
							disabled={eventsPage === 1}
							class="border border-line2 px-[14px] py-[8px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
						>
							← Previous
						</button>
						<button
							onclick={() => (eventsPage = Math.min(totalEventsPages, eventsPage + 1))}
							disabled={eventsPage === totalEventsPages}
							class="border border-line2 px-[14px] py-[8px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
						>
							Next →
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>
