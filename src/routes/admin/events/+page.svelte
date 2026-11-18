<script>
	import AgeOpenHeader, { btn as hbtn } from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { circuitVar, getCircuit } from '$lib/data/circuits.js';
	import EventRow from '$lib/components/age/store/EventRow.svelte';

	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import Pager from '$lib/components/age/admin/Pager.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';

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

	function getEventTicketStats(eventId) {
		return data.eventAnalytics?.ticketsByEvent?.[eventId] || { sold: 0, revenue: 0, refunded: 0 };
	}

	const filtering = $derived(
		!!eventsSearchQuery || eventsStatusFilter !== 'active' || eventsCircuitFilter !== 'all'
	);
	$effect(() => {
		eventsSearchQuery;
		eventsStatusFilter;
		eventsCircuitFilter;
		eventsPage = 1;
	});
</script>

<svelte:head><title>Events · Admin</title></svelte:head>

<AgeOpenHeader
	title="Events"
	subtitle="Schedule, status, tickets and revenue across every circuit."
>
	{#snippet actions()}
		<a href="/admin/events/new" class={hbtn}>+ New event</a>
	{/snippet}
</AgeOpenHeader>

{#if form?.success}
	<AdminNotice tone="success" message={form.message} />
{/if}
{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}

<div class="mx-auto w-full max-w-page px-5 pt-6 pb-20 md:px-8">
	<Figures
		items={[
			{
				label: 'Events',
				value: ui.fmt(data.eventAnalytics?.totalEvents),
				note: `${ui.fmt(data.eventAnalytics?.pastEvents)} past`
			},
			{ label: 'Upcoming', value: ui.fmt(data.eventAnalytics?.upcomingEvents), tone: 'text-warm' },
			{ label: 'In progress', value: ui.fmt(data.eventAnalytics?.byStatus?.in_progress) },
			{ label: 'Tickets sold', value: ui.fmt(data.eventAnalytics?.totalTicketsSold) },
			{
				label: 'Ticket revenue',
				value: ui.money(data.eventAnalytics?.totalTicketRevenue, 0),
				tone: 'text-prem'
			},
			{ label: 'Average ticket', value: ui.money(data.eventAnalytics?.avgTicketPrice, 0) }
		]}
	/>

	<!-- search + filters -->
	<div class="mt-8 flex flex-wrap items-center gap-3">
		<label class="{ui.search} min-w-60 flex-1" aria-label="Search events">
			<svg
				viewBox="0 0 20 20"
				class="h-4 w-4 shrink-0 text-fade"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				aria-hidden="true"
			>
				<circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" stroke-linecap="round" />
			</svg>
			<input
				type="search"
				bind:value={eventsSearchQuery}
				placeholder="Title, circuit or venue"
				class={ui.searchInput}
			/>
		</label>
		<select bind:value={eventsStatusFilter} class={ui.select} aria-label="Status">
			<option value="active">Upcoming and in progress</option>
			<option value="all">Every status</option>
			<option value="upcoming">Upcoming</option>
			<option value="in_progress">In progress</option>
			<option value="completed">Completed</option>
			<option value="cancelled">Cancelled</option>
		</select>
		<div class="flex flex-wrap gap-1" role="group" aria-label="Circuit">
			<button
				type="button"
				onclick={() => (eventsCircuitFilter = 'all')}
				class="h-10 border px-3 text-xs font-extrabold tracking-widest uppercase {eventsCircuitFilter ===
				'all'
					? 'border-ink bg-ink text-paper-bg'
					: 'border-line2 bg-paper-bg text-soft hover:text-ink'}">All circuits</button
			>
			{#each data.eventAnalytics?.byCircuit || [] as c (c.name || 'other')}
				<button
					type="button"
					onclick={() => (eventsCircuitFilter = c.name)}
					class="flex h-10 items-center gap-2 border px-3 text-xs font-extrabold tracking-widest uppercase {eventsCircuitFilter ===
					c.name
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 bg-paper-bg text-soft hover:text-ink'}"
				>
					<span class="inline-block h-2 w-2 {getCircuit(c.name).colors.dot}" aria-hidden="true"
					></span>{c.name || 'Other'}<span class="opacity-60">{c.count}</span>
				</button>
			{/each}
		</div>
	</div>

	<Section title="Events" class="mt-8" note="{ui.fmt(filteredEvents.length)} shown · soonest first">
		<ul class="mt-4 flex flex-col gap-3">
			{#each paginatedEvents as event (event.id)}
				{@const stats = getEventTicketStats(event.id)}
				<EventRow
					e={{ ...event, players: stats.sold, revenue: stats.revenue }}
					href="/admin/events/{event.id}"
					color={circuitVar(event.circuit)}
					now={data.now}
				/>
			{:else}
				<li class="border border-dashed border-line2 px-5 py-6 text-sm text-soft">
					{filtering ? 'No events match these filters.' : 'No events yet.'}
					{#if !filtering}<a href="/admin/events/new" class="{ui.textAction} ml-2 not-italic"
							>Create the first one →</a
						>{/if}
				</li>
			{/each}
		</ul>
		{#if filtering}
			<button
				type="button"
				onclick={() => {
					eventsSearchQuery = '';
					eventsStatusFilter = 'all';
					eventsCircuitFilter = 'all';
				}}
				class="{ui.textAction} mt-4">Clear filters</button
			>
		{/if}
		<Pager
			page={eventsPage}
			perPage={eventsPerPage}
			count={filteredEvents.length}
			label="events"
			onchange={(p) => (eventsPage = p)}
		/>
	</Section>
</div>
