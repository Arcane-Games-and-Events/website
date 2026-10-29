<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminSubnav from '$lib/components/age/admin/AdminSubnav.svelte';
	import { getCircuit } from '$lib/data/circuits.js';

	/** Row wash + label colour per circuit, so a row reads as its circuit at a glance. */
	const CIRCUIT_ROW = {
		'Los Angeles': {
			row: 'bg-blue-500/[0.06] hover:bg-blue-500/[0.12]',
			text: 'text-blue-700'
		},
		'St. Louis': {
			row: 'bg-green-600/[0.06] hover:bg-green-600/[0.12]',
			text: 'text-green-700'
		},
		'New England': {
			row: 'bg-purple-500/[0.06] hover:bg-purple-500/[0.12]',
			text: 'text-purple-700'
		}
	};
	const circuitRow = (c) => CIRCUIT_ROW[c] || { row: 'hover:bg-paper', text: 'text-soft' };
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

	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			amount || 0
		);
	}

	function formatDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
		return new Date(date).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
	}

	const STATUS = {
		upcoming: 'Upcoming',
		in_progress: 'In progress',
		completed: 'Completed',
		cancelled: 'Cancelled'
	};
	const filtering = $derived(
		!!eventsSearchQuery || eventsStatusFilter !== 'active' || eventsCircuitFilter !== 'all'
	);
	const time = (d) =>
		new Date(d).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'UTC'
		});
	$effect(() => {
		eventsSearchQuery;
		eventsStatusFilter;
		eventsCircuitFilter;
		eventsPage = 1;
	});
</script>

<svelte:head><title>Events · Admin</title></svelte:head>

<DeskHeader
	kicker="Admin"
	title="Events"
	subtitle="Schedule, status, tickets and revenue across every circuit."
>
	{#snippet actions(compact)}
		<a
			href="/admin/events/new"
			class="inline-flex items-center bg-paper-bg px-3 text-[10px] font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-warm-light {compact
				? 'h-[30px]'
				: 'h-[36px]'}">+ New event</a
		>
	{/snippet}
</DeskHeader>
<AdminTabs />
<AdminSubnav
	label="Events"
	items={[
		{ href: '/admin/events', label: 'Events' },
		{ href: '/admin/events/new', label: 'New event' }
	]}
/>

{#if form?.success}
	<AdminNotice tone="success" message={form.message} />
{/if}
{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
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
		<label class="{ui.search} min-w-[240px] flex-1" aria-label="Search events">
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
				class="h-[38px] border px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase {eventsCircuitFilter ===
				'all'
					? 'border-ink bg-ink text-paper-bg'
					: 'border-line2 bg-paper-bg text-soft hover:text-ink'}">All circuits</button
			>
			{#each data.eventAnalytics?.byCircuit || [] as c (c.name || 'other')}
				<button
					type="button"
					onclick={() => (eventsCircuitFilter = c.name)}
					class="flex h-[38px] items-center gap-2 border px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase {eventsCircuitFilter ===
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
		<div class="{ui.rowHead} grid-cols-[minmax(0,1fr)_120px_130px_110px_70px_90px] gap-3">
			<span>Event</span><span>Circuit</span><span>Date</span><span>Status</span><span
				class="text-right">Tickets</span
			><span class="text-right">Revenue</span>
		</div>
		<ul>
			{#each paginatedEvents as event (event.id)}
				{@const stats = getEventTicketStats(event.id)}
				<li class={ui.row}>
					<a
						href="/admin/events/{event.id}"
						class="group block py-3 transition-colors md:grid md:grid-cols-[minmax(0,1fr)_120px_130px_110px_70px_90px] md:items-center md:gap-3 {circuitRow(
							event.circuit
						).row}"
					>
						<span class="flex min-w-0 items-center gap-3">
							<span
								class="h-9 w-[3px] shrink-0 {getCircuit(event.circuit).colors.dot}"
								aria-hidden="true"
							></span>
							<span class="min-w-0">
								<span class="{ui.titleText} block truncate group-hover:text-warm"
									>{event.title}</span
								>
								<span class="block truncate text-[11.5px] text-fade"
									>{[event.format, event.location].filter(Boolean).join(' · ') || '—'}</span
								>
							</span>
						</span>
						<span class="mt-1.5 flex flex-wrap items-center gap-1.5 md:contents">
							<span
								class="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.14em] uppercase {circuitRow(
									event.circuit
								).text}"
								><span
									class="h-2 w-2 shrink-0 {getCircuit(event.circuit).colors.dot}"
									aria-hidden="true"
								></span>{event.circuit || '—'}</span
							>
							<span class="text-[12.5px] text-soft tabular-nums md:block">
								{#if event.eventDate}{formatDate(event.eventDate)}<span
										class="block text-[10.5px] text-fade">{time(event.eventDate)}</span
									>{:else}<span class="text-hero-rb">No date</span>{/if}
							</span>
							<span class="{ui.pill} {ui.pillTone[event.status || 'upcoming'] || ''}"
								>{STATUS[event.status || 'upcoming'] || event.status}</span
							>
						</span>
						<span class="mt-1 block text-[12.5px] tabular-nums md:mt-0 md:text-right"
							><span class="text-fade md:hidden">Tickets </span>{ui.fmt(stats.sold)}</span
						>
						<span class="block font-semibold tabular-nums md:text-right"
							>{formatCurrency(stats.revenue)}</span
						>
					</a>
				</li>
			{:else}
				<li class={ui.empty}>
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
