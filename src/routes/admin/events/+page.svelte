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
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
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
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Events
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<a
			href="/admin/events/new"
			class="bg-ink font-mono-system inline-flex items-center px-[14px] py-[9px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
		>
			+ New Event
		</a>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		Every AGE Open, one desk.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Schedule, status, tickets, and revenue across every circuit.
	</p>
</header>

{#if form?.success}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.message}</p>
		</div>
	</section>
{/if}
{#if form?.error}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.error}</p>
		</div>
	</section>
{/if}

<!-- ============ STATS ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[28px]">
		<div class="grid grid-cols-2 gap-[24px] md:grid-cols-4">
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Total Events</span>
				<div class="font-archivo text-ink mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{data.eventAnalytics?.totalEvents || 0}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Upcoming</span>
				<div class="font-archivo text-accent mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{data.eventAnalytics?.upcomingEvents || 0}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Tickets Sold</span>
				<div class="font-archivo text-ink mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{data.eventAnalytics?.totalTicketsSold || 0}
				</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Revenue</span>
				<div class="font-archivo text-prem mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
					{formatCurrency(data.eventAnalytics?.totalTicketRevenue || 0)}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ============ CIRCUIT ROW ============ -->
{#if (data.eventAnalytics?.byCircuit || []).length > 0}
	<section class="border-ink border-b-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[18px]">
			<div class="flex flex-wrap items-center gap-[16px]">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					By Circuit
				</span>
				{#each data.eventAnalytics?.byCircuit || [] as circuit (circuit.name || 'other')}
					<div class="flex items-center gap-[8px]">
						<span class="inline-block h-[10px] w-[10px] {getCircuit(circuit.name).colors.dot}"></span>
						<span class="font-newsreader text-[15px] font-semibold">{circuit.name || 'Other'}</span>
						<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase">
							{circuit.count}
						</span>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- ============ FILTERS ============ -->
<section class="border-ink border-b-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[24px]">
		<div class="flex flex-col gap-[14px] sm:flex-row sm:items-center sm:justify-between">
			<div class="relative flex-1 sm:max-w-md">
				<input
					type="text"
					bind:value={eventsSearchQuery}
					placeholder="Search title, circuit, or location"
					class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
				/>
				{#if eventsSearchQuery}
					<button
						type="button"
						onclick={() => (eventsSearchQuery = '')}
						class="text-fade hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 text-[16px]"
						aria-label="Clear search"
					>
						×
					</button>
				{/if}
			</div>
			<div class="flex flex-wrap items-center gap-[10px]">
				<select
					bind:value={eventsStatusFilter}
					class="border-ink bg-paper-bg text-ink font-mono-system border-[1.5px] px-[12px] py-[9px] text-[11px] font-bold tracking-[0.08em] uppercase focus:outline-none"
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
					class="border-ink bg-paper-bg text-ink font-mono-system border-[1.5px] px-[12px] py-[9px] text-[11px] font-bold tracking-[0.08em] uppercase focus:outline-none"
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
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<div class="mb-[16px] flex items-center justify-between">
			<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
				{filteredEvents.length} events shown
			</span>
			{#if filteredEvents.length !== (data.events || []).length}
				<button
					onclick={() => {
						eventsSearchQuery = '';
						eventsStatusFilter = 'all';
						eventsCircuitFilter = 'all';
					}}
					class="font-mono-system text-warm hover:text-ink text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
				>
					Clear filters
				</button>
			{/if}
		</div>

		<!-- Mobile -->
		<div class="border-ink border-[1.5px] sm:hidden overflow-hidden">
			{#each paginatedEvents as event (event.id)}
				{@const ticketStats = getEventTicketStats(event.id)}
				<a
					href="/admin/events/{event.id}"
					class="border-line2 hover:bg-panel flex items-center gap-3 border-b p-4 transition-colors last:border-b-0"
				>
					<span class="w-[3px] self-stretch {getCircuit(event.circuit).colors.dot}"></span>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<div class="font-newsreader truncate text-[16px] font-semibold">{event.title}</div>
								<div class="mt-[6px] flex flex-wrap items-center gap-2">
									{#if event.circuit}
										<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase">
											{event.circuit}
										</span>
									{/if}
									<span class="font-mono-system inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase {statusChip(event.status)}">
										{event.status || 'upcoming'}
									</span>
								</div>
							</div>
							<span class="font-mono-system text-fade shrink-0 text-[12px] font-bold">→</span>
						</div>
						<div class="font-mono-system text-fade mt-[8px] flex items-center gap-3 text-[10px] font-bold tracking-[0.06em] uppercase">
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
		<div class="border-ink hidden border-[1.5px] sm:block">
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px]">
					<thead class="border-ink border-b-[1.5px]">
						<tr class="text-left">
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Event</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Circuit</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Date</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Status</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Tickets</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Revenue</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedEvents as event (event.id)}
							{@const ticketStats = getEventTicketStats(event.id)}
							<tr
								class="border-line2 hover:bg-panel group border-b transition-colors cursor-pointer"
								onclick={() => (window.location.href = `/admin/events/${event.id}`)}
							>
								<td class="px-4 py-[14px]">
									<div class="flex items-center gap-3">
										<span class="h-[28px] w-[3px] {getCircuit(event.circuit).colors.dot}"></span>
										<div class="min-w-0">
											<div class="font-newsreader truncate text-[16px] font-semibold group-hover:text-warm transition-colors">
												{event.title}
											</div>
											<div class="text-fade text-[12px]">{event.format || '—'}</div>
										</div>
									</div>
								</td>
								<td class="px-4 py-[14px]">
									{#if event.circuit}
										<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[9px] py-[4px] text-[10px] font-bold tracking-[0.08em] uppercase">
											{event.circuit}
										</span>
									{:else}
										<span class="text-fade">—</span>
									{/if}
								</td>
								<td class="px-4 py-[14px]">
									{#if event.eventDate}
										<div class="font-newsreader text-[15px] font-semibold">{formatDate(event.eventDate)}</div>
										<div class="font-mono-system text-fade mt-[2px] text-[10px] font-bold tracking-[0.06em] uppercase">
											{new Date(event.eventDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}
										</div>
									{:else}
										<span class="font-mono-system bg-warm inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">
											No Date
										</span>
									{/if}
								</td>
								<td class="px-4 py-[14px]">
									<span class="font-mono-system inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.08em] uppercase {statusChip(event.status)}">
										{event.status || 'upcoming'}
									</span>
								</td>
								<td class="font-archivo text-ink px-4 py-[14px] text-right text-[15px] font-extrabold tracking-[-0.01em]">
									{ticketStats.sold}
								</td>
								<td class="font-archivo text-prem px-4 py-[14px] text-right text-[15px] font-extrabold tracking-[-0.01em]">
									{formatCurrency(ticketStats.revenue)}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-4 py-12 text-center">
									<p class="font-newsreader text-soft text-[19px] italic">
										{eventsSearchQuery || eventsStatusFilter !== 'all' || eventsCircuitFilter !== 'all'
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
				<div class="border-ink flex items-center justify-between border-t-[1.5px] px-5 py-[14px]">
					<span class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.08em] uppercase">
						Page {eventsPage} of {totalEventsPages}
					</span>
					<div class="flex gap-2">
						<button
							onclick={() => (eventsPage = Math.max(1, eventsPage - 1))}
							disabled={eventsPage === 1}
							class="border-line2 hover:border-ink font-mono-system border px-[14px] py-[8px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
						>
							← Previous
						</button>
						<button
							onclick={() => (eventsPage = Math.min(totalEventsPages, eventsPage + 1))}
							disabled={eventsPage === totalEventsPages}
							class="border-line2 hover:border-ink font-mono-system border px-[14px] py-[8px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
						>
							Next →
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>
