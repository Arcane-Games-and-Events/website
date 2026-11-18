<script>
	import AgeOpenHeader, {
		btnLine as hbtnLine
	} from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance, deserialize } from '$app/forms';
	import { parseGemDecklist, toStorageFormat } from '$lib/utils/gem-decklist-parser.js';
	import { circuitVar } from '$lib/data/circuits.js';
	import { PLACEMENT_BANDS, placementBand, placementLabel } from '$lib/utils/placement.js';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import EventFields from '$lib/components/age/store/EventFields.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, form } = $props();

	// Always start on Overview when navigating to an event.
	// Tab state is not persisted — clicks within the page swap it in memory only.
	let activeTab = $state('overview');

	function setActiveTab(tab) {
		activeTab = tab;
	}

	// Edit mode for event details
	let saving = $state(false);
	// The details form's circuit and store chips, from the event (again when it changes).
	const circuitOf = () =>
		data.circuits.find(
			(c) => c.name.toLowerCase() === (data.event.circuit || '').trim().toLowerCase()
		)?.name || '';
	let circuitName = $state('');
	let storeId = $state('');
	$effect.pre(() => {
		data.event.id;
		untrack(() => {
			circuitName = circuitOf();
			storeId = data.event.storeId || '';
		});
	});
	const circuitRow = $derived(data.circuits.find((c) => c.name === circuitName));
	const circuitStores = $derived(
		circuitRow
			? data.stores.filter(
					(st) => st.circuitId === circuitRow.id && (st.active || st.id === storeId)
				)
			: []
	);
	// A store from another circuit can't run it.
	$effect(() => {
		if (storeId && circuitRow && !circuitStores.some((st) => st.id === storeId)) storeId = '';
	});
	const tz = $derived((circuitRow?.timezone || 'America/Chicago').split('/')[1].replace('_', ' '));

	const sectionTitle = 'ao-cond text-4xl leading-none font-black uppercase md:text-5xl';
	const figures = $derived([
		...(data.isAdmin
			? [{ label: 'Revenue', value: ui.money(data.stats.totalRevenue), note: 'before refunds' }]
			: []),
		{
			label: 'Tickets sold',
			value: ui.fmt(data.stats.totalTickets),
			note: data.event.playerCap ? `of ${data.event.playerCap} cap` : 'no cap'
		},
		{
			label: 'Refunds',
			value: ui.fmt(data.stats.totalRefunded),
			note: 'refunded tickets',
			tone: data.stats.totalRefunded > 0 ? 'text-hero-rb' : ''
		},
		{ label: 'Entry fee', value: ui.money(data.event.price), note: 'per player' }
	]);

	// Sorting state for registrations
	let sortColumn = $state('createdAt');
	let sortDirection = $state('desc');

	// Decklist form state
	let showDecklistForm = $state(false);
	let editingDecklist = $state(null);
	let decklistForm = $state({
		playerName: '',
		gemId: '',
		userId: '',
		hero: '',
		format: '',
		placement: '',
		cardsText: '',
		isPublic: true
	});

	// Initialize format from event data
	$effect(() => {
		if (data.event.format && !decklistForm.format) {
			decklistForm.format = data.event.format;
		}
	});

	// Hero search state
	let heroSearch = $state('');
	let showHeroDropdown = $state(false);
	let filteredHeroes = $derived(
		heroSearch.trim()
			? data.heroNames.filter((h) => h.toLowerCase().includes(heroSearch.toLowerCase()))
			: data.heroNames
	);

	// Decklist preview (parsed from cardsText)
	let decklistPreview = $derived(parseGemDecklist(decklistForm.cardsText));

	// CSV Import state
	let swissStandingsFile = $state(null);
	let pairingsFile = $state(null);
	let csvProcessing = $state(false);

	// Hero upload state
	let heroesFile = $state(null);
	let heroesProcessing = $state(false);

	// Uploads happen in place: the page (and its tab) stays, the data refreshes.
	const csvEnhance = () => {
		csvProcessing = true;
		return async ({ result, update }) => {
			await update();
			csvProcessing = false;
			if (result.type === 'success') {
				swissStandingsFile = null;
				pairingsFile = null;
				setActiveTab('results');
			}
		};
	};
	const heroesEnhance = () => {
		heroesProcessing = true;
		return async ({ result, update }) => {
			await update();
			heroesProcessing = false;
			if (result.type === 'success') heroesFile = null;
		};
	};

	// Staff management state
	let staffSearch = $state('');
	let staffSearchResults = $state([]);
	let staffSearchLoading = $state(false);
	let staffSearchTimeout = $state(null);

	async function searchStaffByEmail(email) {
		if (!email || email.length < 3) {
			staffSearchResults = [];
			return;
		}

		staffSearchLoading = true;
		try {
			const formData = new FormData();
			formData.append('email', email);
			const response = await fetch('?/searchUsers', {
				method: 'POST',
				body: formData
			});
			const text = await response.text();
			const result = deserialize(text);
			if (result.type === 'success' && result.data?.users) {
				staffSearchResults = result.data.users;
			} else {
				staffSearchResults = [];
			}
		} catch (err) {
			console.error('Error searching users:', err);
			staffSearchResults = [];
		} finally {
			staffSearchLoading = false;
		}
	}

	// Debounced email search
	function handleStaffSearchInput(email) {
		staffSearch = email;
		if (staffSearchTimeout) clearTimeout(staffSearchTimeout);
		staffSearchTimeout = setTimeout(() => {
			searchStaffByEmail(email);
		}, 300);
	}

	// Clear search after staff assignment
	function handleStaffAssign() {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				staffSearch = '';
				staffSearchResults = [];
			}
			await update();
		};
	}

	// Participant search dropdown state
	let participantSearch = $state('');
	let showParticipantDropdown = $state(false);
	let filteredParticipants = $derived(
		participantSearch.trim()
			? data.participants.filter(
					(p) =>
						p.playerName.toLowerCase().includes(participantSearch.toLowerCase()) ||
						(p.gemId && p.gemId.toLowerCase().includes(participantSearch.toLowerCase()))
				)
			: data.participants
	);

	// Track local gem entry status for each ticket (to avoid page reload)
	let gemEntryStatus = $derived(
		Object.fromEntries(data.tickets.map((t) => [t.ticketId, t.enteredIntoGem]))
	);
	let gemEntryLoading = $state({});

	async function toggleGemEntry(ticketId, currentValue) {
		gemEntryLoading[ticketId] = true;
		const newValue = !currentValue;

		try {
			const response = await fetch(`/api/events/${data.event.id}/toggle-gem-entry`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ticketId, enteredIntoGem: newValue })
			});

			if (response.ok) {
				gemEntryStatus[ticketId] = newValue;
			}
		} catch (err) {
			console.error('Toggle gem entry error:', err);
		} finally {
			gemEntryLoading[ticketId] = false;
		}
	}

	const formats = [
		'Classic Constructed',
		'Draft',
		'Silver Age',
		'Blitz',
		'Living Legend',
		'Sealed'
	];

	// Derived state
	let sortedTickets = $derived(
		[...data.tickets].sort((a, b) => {
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
					aVal = a.refunded ? 'refunded' : 'paid';
					bVal = b.refunded ? 'refunded' : 'paid';
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
		})
	);

	let sortedResults = $derived(
		[...(data.existingResults || [])].sort((a, b) => a.placement - b.placement)
	);

	// Metagame breakdown - group heroes by count
	let heroBreakdown = $derived(() => {
		const heroes = data.existingHeroes || [];
		const counts = {};
		for (const entry of heroes) {
			counts[entry.hero] = (counts[entry.hero] || 0) + 1;
		}
		return Object.entries(counts)
			.map(([hero, count]) => ({
				hero,
				count,
				percentage: ((count / heroes.length) * 100).toFixed(1)
			}))
			.sort((a, b) => b.count - a.count);
	});
	let displayStatus = $derived(data.event.status || 'upcoming');
	const datePassed = $derived(
		!!data.event.eventDate && new Date(data.event.eventDate) < new Date()
	);
	let isCompleted = $derived(displayStatus === 'completed');
	let hasResults = $derived((data.existingResults?.length || 0) > 0);
	// Check if there's a winner (placement 1 means finals were played)
	let hasWinner = $derived(data.existingResults?.some((r) => r.placement === 1) || false);

	// Delete confirmation state
	let showDeleteConfirm = $state(false);

	// Close event confirmation state
	let showCloseConfirm = $state(false);

	// ============ status menu ============
	const STATUSES = [
		{
			id: 'upcoming',
			label: 'Upcoming',
			note: 'Before the day. The public page takes sign-ups.',
			tone: 'var(--color-warm)'
		},
		{
			id: 'in_progress',
			label: 'In progress',
			note: 'Running now. The public page shows live standings.',
			tone: 'var(--color-hero-rb)'
		},
		{
			id: 'completed',
			label: 'Completed',
			note: 'Finished. Clears the staff assigned to it.',
			tone: 'var(--color-prem)'
		},
		{
			id: 'cancelled',
			label: 'Cancelled',
			note: 'Called off. Clears the staff assigned to it.',
			tone: 'var(--color-fade)'
		},
		{
			id: 'unpublished',
			label: 'Unpublished',
			note: 'Taken off the site; no new tickets. Tickets sold are kept. Set Upcoming to put it back.',
			tone: 'var(--color-ink)'
		}
	];
	const currentStatus = $derived(STATUSES.find((x) => x.id === displayStatus) ?? STATUSES[0]);
	let statusOpen = $state(false);
	let statusSaving = $state(false);
	/** @type {HTMLElement | undefined} */
	let statusBox = $state();

	// Helper functions
	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'UTC'
		}).format(new Date(dateStr));
	}

	function formatShortDate(dateStr) {
		if (!dateStr) return 'N/A';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'UTC'
		}).format(new Date(dateStr));
	}

	function confirmRefund(ticketCode) {
		return confirm(
			`Are you sure you want to refund ticket ${ticketCode}? This action cannot be undone.`
		);
	}

	// Copy to clipboard functionality with mobile fallback
	let copiedGemId = $state(null);
	async function copyGemId(gemId, event) {
		if (!gemId || gemId === 'N/A') return;

		// Prevent any default behavior and stop propagation
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		try {
			// Try the modern clipboard API first
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(gemId);
			} else {
				// Fallback for mobile/non-secure contexts
				const textArea = document.createElement('textarea');
				textArea.value = gemId;
				textArea.style.position = 'fixed';
				textArea.style.left = '-999999px';
				textArea.style.top = '-999999px';
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				document.execCommand('copy');
				textArea.remove();
			}
			copiedGemId = gemId;
			setTimeout(() => (copiedGemId = null), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
			// Last resort fallback - prompt user to copy manually
			window.prompt('Copy this GEM ID:', gemId);
		}
	}

	function sortBy(column) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	function startNewDecklist() {
		editingDecklist = null;
		decklistForm = {
			playerName: '',
			gemId: '',
			userId: '',
			hero: '',
			format: data.event.format || '',
			placement: '',
			cardsText: '',
			isPublic: true
		};
		heroSearch = '';
		showDecklistForm = true;
	}

	function editDecklist(decklist) {
		editingDecklist = decklist;
		// Use rawText if available, otherwise reconstruct from cards
		const cardsText =
			decklist.rawText || decklist.cards.map((c) => `${c.quantity} ${c.name}`).join('\n');
		decklistForm = {
			playerName: decklist.playerName,
			gemId: decklist.gemId || '',
			userId: decklist.userId || '',
			hero: decklist.hero || '',
			format: decklist.format || '',
			placement: placementBand(decklist.placement),
			cardsText,
			isPublic: decklist.isPublic
		};
		heroSearch = decklist.hero || '';
		showDecklistForm = true;
	}

	function selectHero(heroName) {
		decklistForm.hero = heroName;
		heroSearch = heroName;
		showHeroDropdown = false;
	}

	function cancelDecklistForm() {
		showDecklistForm = false;
		editingDecklist = null;
	}

	function parseCardsText(text) {
		// Use the GEM parser to parse the decklist
		const parsed = parseGemDecklist(text);
		return toStorageFormat(parsed);
	}

	function selectParticipant(participant) {
		decklistForm.playerName = participant.playerName;
		decklistForm.gemId = participant.gemId || '';
		decklistForm.userId = participant.userId || '';
	}
</script>

<svelte:window
	onclick={(e) => {
		if (statusOpen && statusBox && !statusBox.contains(/** @type {Node} */ (e.target)))
			statusOpen = false;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') statusOpen = false;
	}}
/>

<svelte:head>
	<title>{data.event.title} · Admin</title>
</svelte:head>

<!-- ============ HEADER ============ -->
<AgeOpenHeader
	title={data.event.title}
	subtitle={formatDate(data.event.eventDate)}
	circuit={data.event.circuit}
	trail={[{ href: '/admin/events', label: 'Events' }]}
>
	{#snippet actions()}
		<a href="/ageopen/{data.event.id}" class={hbtnLine}>Public page ↗</a>
	{/snippet}
</AgeOpenHeader>
<!-- ============ TABS ============ -->
<!-- The page's one menu under the admin tabs: its sections. -->
<nav
	class="sticky top-[calc(var(--desk-header,0px)+var(--desk-tabs-h,46px))] z-30 border-b border-line2 bg-paper-bg/95 backdrop-blur-xs"
	aria-label="Event sections"
	style="--cc: {data.event.circuit ? circuitVar(data.event.circuit) : 'var(--color-warm)'};"
>
	<div class="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 px-5 md:px-8">
		<div
			class="-ml-3 flex h-11 max-w-full min-w-0 items-stretch gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		>
			{#each [{ id: 'overview', label: 'Overview' }, { id: 'registrations', label: `Registrations · ${data.stats.totalTickets}` }, { id: 'import', label: 'Import CSV' }, { id: 'results', label: `Results · ${data.existingResults?.length || 0}` }, { id: 'decklists', label: `Decklists · ${data.existingDecklists?.length || 0}` }, { id: 'metagame', label: `Metagame · ${data.existingHeroes?.length || 0}` }, ...(data.isAdmin ? [{ id: 'staff', label: `Staff · ${data.assignedStaff?.length || 0}` }] : [])] as tab (tab.id)}
				<button
					type="button"
					onclick={() => setActiveTab(tab.id)}
					aria-current={activeTab === tab.id ? 'true' : undefined}
					class="flex shrink-0 items-center border-b-3 px-3 text-xs font-extrabold tracking-widest whitespace-nowrap uppercase transition-colors {activeTab ===
					tab.id
						? 'text-ink'
						: 'border-transparent text-soft hover:text-ink'}"
					style={activeTab === tab.id ? 'border-color: var(--cc)' : ''}
				>
					{tab.label}
				</button>
			{/each}
		</div>
	</div>
</nav>

<!-- the event's status, under the tabs and in line with the page -->
<div class="mx-auto w-full max-w-page px-5 pt-6 md:px-8">
	<div class="flex flex-wrap items-center gap-2.5">
		<div class="relative" bind:this={statusBox}>
			<button
				type="button"
				onclick={() => (statusOpen = !statusOpen)}
				aria-haspopup="true"
				aria-expanded={statusOpen}
				disabled={statusSaving}
				class="inline-flex h-9 items-center gap-2.5 pr-3 pl-3.5 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:opacity-60"
				style="background: {currentStatus.tone}"
			>
				<span class="text-white/70">Status</span>
				<span class="h-3 w-px bg-white/40" aria-hidden="true"></span>
				<span class="relative flex h-2 w-2" aria-hidden="true">
					{#if displayStatus === 'in_progress'}
						<span class="absolute inset-0 animate-ping rounded-full bg-white/70"></span>
					{/if}
					<span class="relative h-2 w-2 rounded-full bg-white"></span>
				</span>
				{statusSaving ? 'Saving…' : currentStatus.label}
				<svg
					viewBox="0 0 12 12"
					class="h-2.5 w-2.5 transition-transform {statusOpen ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"><path d="m2.5 4.5 3.5 3.5 3.5-3.5" /></svg
				>
			</button>
			{#if statusOpen}
				<form
					method="POST"
					action="?/updateStatus"
					use:enhance={() => {
						statusOpen = false;
						statusSaving = true;
						return async ({ update }) => {
							await update();
							statusSaving = false;
						};
					}}
					class="absolute left-0 z-40 mt-1.5 w-75 max-w-[calc(100vw-2.5rem)] border border-ink bg-paper-bg shadow-xl"
				>
					<p
						class="border-b border-line2 px-4 py-2.5 text-xs font-extrabold tracking-widest text-fade uppercase"
					>
						Set the event’s status
					</p>
					{#each STATUSES as st (st.id)}
						{@const on = st.id === displayStatus}
						<button
							type="submit"
							name="status"
							value={st.id}
							disabled={on}
							class="group flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition-colors {on
								? 'bg-paper'
								: 'border-transparent hover:bg-paper'}"
							style={on ? `border-color: ${st.tone}` : ''}
						>
							<span class="mt-1 h-2.5 w-2.5 shrink-0" style="background: {st.tone}"></span>
							<span class="min-w-0 flex-1">
								<span
									class="ao-cond block text-xl leading-none font-black uppercase"
									style={on ? `color: ${st.tone}` : ''}>{st.label}</span
								>
								<span class="mt-1 block text-xs leading-snug text-soft">{st.note}</span>
							</span>
							{#if on}
								<span class="mt-0.5 text-xs font-extrabold tracking-widest text-fade uppercase"
									>Now</span
								>
							{/if}
						</button>
					{/each}
				</form>
			{/if}
		</div>
		{#if displayStatus === 'upcoming' && datePassed}
			<span
				class="inline-flex items-center text-xs text-fade"
				title="The event date is in the past but no results have been uploaded"
			>
				Date has passed · no results yet
			</span>
		{/if}

		{#if !isCompleted && hasWinner}
			<button
				type="button"
				onclick={() => (showCloseConfirm = true)}
				class="inline-flex h-8 shrink-0 items-center gap-1.5 bg-prem px-3 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Close Event ✓
			</button>
		{:else if !isCompleted && !hasWinner && hasResults}
			<span
				class="inline-flex items-center text-xs text-fade"
				title="Finals match required to close event"
			>
				Awaiting Finals
			</span>
		{:else if isCompleted && data.isAdmin}
			<form method="POST" action="?/reopenEvent" class="inline">
				<button
					type="submit"
					class="inline-flex h-8 shrink-0 items-center border border-warm px-3 text-xs font-extrabold tracking-widest text-warm uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
				>
					Reopen
				</button>
			</form>
		{/if}
	</div>
</div>

{#if form?.success && form.section !== 'details'}
	<section class="mx-auto w-full max-w-page overflow-x-clip px-5 pt-6 md:px-8">
		<div class="border-l-3 border-prem bg-prem/10 p-4">
			<span class="text-xs font-extrabold tracking-widest text-prem uppercase">Success</span>
			<p class="mt-0.5 font-newsreader text-base font-semibold">{form.message}</p>
			{#if form.details}
				<ul class="mt-2 ml-4 text-xs font-extrabold tracking-widest text-prem uppercase">
					<li>Players updated: {form.details.playersUpdated}</li>
					<li>New players added: {form.details.playersCreated}</li>
					{#if form.details.errors?.length > 0}
						<li>Errors: {form.details.errors.length}</li>
					{/if}
				</ul>
			{/if}
		</div>
	</section>
{/if}
{#if form?.error && form.section !== 'details'}
	<AdminNotice tone="error" message={form.error} />
{/if}
{#if data.monthMismatch}
	<AdminNotice
		tone="info"
		message="This event's month is set to {data.event
			.month}, but its date is in {data.monthMismatch}. Standings and match history file under the date — edit the event so the two agree."
	/>
{/if}

<div
	class="mx-auto w-full max-w-page px-5 pt-6 pb-24 md:px-8"
	style="--cc: {data.event.circuit ? circuitVar(data.event.circuit) : 'var(--color-warm)'};"
>
	<!-- Tab Content -->

	<!-- Overview Tab -->
	{#if activeTab === 'overview'}
		<!-- the numbers -->
		<dl class="grid grid-cols-2 border-t-3 border-ink md:grid-cols-4">
			{#each figures as f, i (f.label)}
				<div
					class="border-b border-line2 py-4 pr-4 {i % 2
						? 'pl-4'
						: ''} md:border-r md:pl-5 md:first:pl-0 md:last:border-r-0"
				>
					<dt class={ui.label}>{f.label}</dt>
					<dd class="ao-cond mt-2 text-4xl leading-none font-black tabular-nums {f.tone || ''}">
						{f.value}
					</dd>
					<dd class="mt-1.5 text-xs text-soft">{f.note}</dd>
				</div>
			{/each}
		</dl>

		<!-- details -->
		<section class="mt-16">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class={sectionTitle}>Details</h2>
				<p class="text-xs text-soft">Changes go live as soon as you save</p>
			</div>
			{#if form?.section === 'details' && form.error}<AdminNotice
					tone="error"
					message={form.error}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}
			{#if form?.section === 'details' && form.success}<AdminNotice
					tone="success"
					message={form.message}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}
			{#key data.event.id}
				<form
					method="POST"
					action="?/updateEvent"
					class="mt-6 border border-line2 bg-white"
					style={circuitRow ? `--cc: ${circuitRow.color}` : ''}
					use:enhance={() => {
						saving = true;
						return async ({ update }) => {
							await update({ reset: false });
							saving = false;
						};
					}}
				>
					<div class="flex flex-col gap-7 px-5 py-6 md:px-7">
						<!-- circuit and store -->
						<div class={F.groupFirst}>
							<div>
								<p class={F.groupTitle}>Circuit</p>
								<p class={F.groupNote}>Where it counts toward the standings, and who runs it.</p>
							</div>
							<div class="flex flex-col gap-5">
								<fieldset>
									<legend class={F.label}>Circuit</legend>
									<div class="flex flex-wrap gap-2">
										{#each data.circuits as c (c.id)}
											<label
												class={F.chip(circuitName === c.name)}
												style={circuitName === c.name ? `background: ${c.color}` : ''}
											>
												<input
													type="radio"
													name="circuit"
													value={c.name}
													bind:group={circuitName}
													class="sr-only"
												/>
												<span
													class="mr-2 h-2.5 w-2.5 shrink-0 {circuitName === c.name
														? 'bg-white'
														: ''}"
													style={circuitName === c.name ? '' : `background: ${c.color}`}
													aria-hidden="true"
												></span>
												{c.name}{c.active ? '' : ' (inactive)'}
											</label>
										{/each}
									</div>
									{#if !circuitRow}
										<p class={F.hint}>Not on a circuit, so it doesn’t count toward standings.</p>
									{/if}
								</fieldset>
								{#if circuitRow}
									<fieldset>
										<legend class={F.label}>Run by</legend>
										<div class="flex flex-wrap gap-2">
											<label class={F.chip(!storeId)} style={!storeId ? F.chipOn : ''}>
												<input
													type="radio"
													name="storeId"
													value=""
													bind:group={storeId}
													class="sr-only"
												/>
												AGE
											</label>
											{#each circuitStores as st (st.id)}
												<label
													class={F.chip(storeId === st.id)}
													style={storeId === st.id ? F.chipOn : ''}
												>
													<input
														type="radio"
														name="storeId"
														value={st.id}
														bind:group={storeId}
														class="sr-only"
													/>
													{st.name}
												</label>
											{/each}
										</div>
										<p class={F.hint}>
											{circuitStores.length
												? 'A store’s event counts toward its payouts and season.'
												: `${circuitRow.name} has no active store yet.`}
										</p>
									</fieldset>
								{/if}
							</div>
						</div>

						<div class="border-t border-line2 pt-6">
							<EventFields
								value={data.event}
								formats={data.formats}
								timezoneLabel={tz}
								today={new Date().toISOString().slice(0, 10)}
							/>
						</div>
					</div>
					<div
						class="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-line2 bg-white px-5 py-3.5 shadow-up md:px-7"
					>
						<span class="text-xs text-soft">Players see these changes right away.</span>
						<button
							class="inline-flex h-11 shrink-0 items-center px-6 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:opacity-50"
							style="background: var(--cc, var(--color-ink))"
							disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button
						>
					</div>
				</form>
			{/key}
		</section>

		<!-- danger zone -->
		{#if data.isAdmin}
			<section class="mt-16">
				<h2 class={sectionTitle}>Delete</h2>
				<div
					class="mt-6 flex flex-wrap items-center justify-between gap-4 border border-l-4 border-line2 border-l-hero-rb bg-white px-5 py-5 md:px-7"
				>
					<p class="max-w-xl text-sm leading-snug text-soft">
						Permanently delete this event and all its tickets, results, decklists, and staff
						assignments. This can’t be undone.
					</p>
					<button
						type="button"
						onclick={() => (showDeleteConfirm = true)}
						class="inline-flex h-11 shrink-0 items-center bg-hero-rb px-6 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
					>
						Delete event
					</button>
				</div>
			</section>
		{/if}
	{/if}

	<!-- Registrations Tab -->
	{#if activeTab === 'registrations'}
		<div class="flex flex-wrap items-end justify-between gap-3">
			<h2 class={sectionTitle}>Registrations</h2>
			<p class="text-xs text-soft">
				{data.tickets.length}{data.event.playerCap ? ` of ${data.event.playerCap}` : ''} players
			</p>
		</div>
		<div class="mt-6 overflow-hidden border border-line2 bg-white">
			{#if data.tickets.length === 0}
				<div class="p-12 text-center">
					<p class="font-newsreader text-lg text-soft italic">No tickets sold yet.</p>
					<p class="mt-2 text-sm text-fade">Registrations will appear here.</p>
				</div>
			{:else}
				<!-- Mobile Card View -->
				<div class="lg:hidden">
					{#each sortedTickets as ticket}
						<div
							class="border-b border-line2 p-4 last:border-b-0 {ticket.refunded ? 'bg-paper' : ''}"
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="truncate font-newsreader text-base font-semibold">
										{ticket.firstName || 'N/A'}
										{ticket.lastName || 'N/A'}
									</div>
									<div class="mt-1 flex items-center gap-2">
										<code class="truncate text-xs font-medium text-warm">
											{ticket.gemId || 'N/A'}
										</code>
										{#if ticket.gemId && ticket.gemId !== 'N/A'}
											<button
												type="button"
												onclick={(e) => copyGemId(ticket.gemId, e)}
												class="inline-flex items-center border border-line2 px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
												title="Copy GEM ID"
											>
												{copiedGemId === ticket.gemId ? 'Copied' : 'Copy'}
											</button>
										{/if}
									</div>
								</div>
								<span
									class="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {ticket.refunded
										? '[--tone:var(--color-hero-rb)]'
										: '[--tone:var(--color-prem)]'}"
								>
									{ticket.refunded ? 'Refunded' : 'Paid'}
								</span>
							</div>
							<div
								class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line2 pt-3"
							>
								<span class="text-xs text-fade">
									{formatShortDate(ticket.createdAt)}
								</span>
								<div class="flex items-center gap-2">
									<span class="text-xs text-fade">In GEM:</span>
									<button
										type="button"
										onclick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId]);
										}}
										disabled={gemEntryLoading[ticket.ticketId]}
										class="relative inline-flex h-5 w-9 items-center border {gemEntryStatus[
											ticket.ticketId
										]
											? 'border-prem bg-prem'
											: 'border-line2 bg-line2'} transition-colors {gemEntryLoading[ticket.ticketId]
											? 'opacity-50'
											: ''}"
										aria-label="Toggle entered into Gem"
									>
										<span
											class="inline-block h-3.5 w-3.5 bg-white transition-transform {gemEntryStatus[
												ticket.ticketId
											]
												? 'translate-x-5'
												: 'translate-x-0.5'}"
										></span>
									</button>
								</div>
								{#if !ticket.refunded}
									<form
										method="POST"
										action="?/refund"
										onsubmit={(e) => {
											if (!confirmRefund(ticket.ticketCode)) e.preventDefault();
										}}
										class="ml-auto"
									>
										<input type="hidden" name="ticketId" value={ticket.ticketId} />
										<button
											type="submit"
											class="inline-flex h-8 shrink-0 items-center px-2 text-xs font-extrabold tracking-widest text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40"
										>
											Refund
										</button>
									</form>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Desktop Table View -->
				<div class="hidden overflow-x-auto lg:block">
					<table class="w-full">
						<thead class="border-b-2 border-line2">
							<tr class="text-left">
								{#each [{ id: 'firstName', label: 'First Name' }, { id: 'lastName', label: 'Last Name' }, { id: 'gemId', label: 'GEM ID' }, { id: 'createdAt', label: 'Purchased' }, { id: 'status', label: 'Status' }, { id: 'enteredIntoGem', label: 'In GEM' }] as col (col.id)}
									<th class="px-4 py-3">
										<button
											onclick={() => sortBy(col.id)}
											class="inline-flex items-center gap-1 text-xs font-extrabold tracking-widest uppercase transition-colors {sortColumn ===
											col.id
												? 'text-ink'
												: 'text-fade hover:text-ink'}"
										>
											{col.label}
											{#if sortColumn === col.id}
												<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
											{/if}
										</button>
									</th>
								{/each}
								<th
									class="px-4 py-3 text-right text-xs font-extrabold tracking-widest text-fade uppercase"
									>Actions</th
								>
							</tr>
						</thead>
						<tbody>
							{#each sortedTickets as ticket (ticket.ticketId)}
								<tr
									class="border-b border-line2 transition-colors hover:bg-paper {ticket.refunded
										? 'bg-paper'
										: ''}"
								>
									<td class="px-4 py-3 font-newsreader text-base font-semibold"
										>{ticket.firstName || 'N/A'}</td
									>
									<td class="px-4 py-3 font-newsreader text-base font-semibold"
										>{ticket.lastName || 'N/A'}</td
									>
									<td class="px-4 py-3">
										<div class="inline-flex items-center gap-2">
											<code class="text-xs font-medium text-warm">
												{ticket.gemId || 'N/A'}
											</code>
											{#if ticket.gemId && ticket.gemId !== 'N/A'}
												<button
													type="button"
													onclick={(e) => copyGemId(ticket.gemId, e)}
													class="inline-flex items-center border border-line2 px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
													title="Copy GEM ID"
												>
													{copiedGemId === ticket.gemId ? '✓' : 'Copy'}
												</button>
											{/if}
										</div>
									</td>
									<td class="px-4 py-3 text-xs text-fade">
										{formatShortDate(ticket.createdAt)}
									</td>
									<td class="px-4 py-3">
										<span
											class="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {ticket.refunded
												? '[--tone:var(--color-hero-rb)]'
												: '[--tone:var(--color-prem)]'}"
										>
											{ticket.refunded ? 'Refunded' : 'Paid'}
										</span>
									</td>
									<td class="px-4 py-3">
										<button
											type="button"
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId]);
											}}
											disabled={gemEntryLoading[ticket.ticketId]}
											class="relative inline-flex h-5.5 w-10 items-center border {gemEntryStatus[
												ticket.ticketId
											]
												? 'border-prem bg-prem'
												: 'border-line2 bg-line2'} transition-colors {gemEntryLoading[
												ticket.ticketId
											]
												? 'opacity-50'
												: ''}"
											aria-label="Toggle entered into Gem"
										>
											<span
												class="inline-block h-4 w-4 bg-white transition-transform {gemEntryStatus[
													ticket.ticketId
												]
													? 'translate-x-5.5'
													: 'translate-x-0.5'}"
											></span>
										</button>
									</td>
									<td class="px-4 py-3 text-right">
										{#if !ticket.refunded}
											<form
												method="POST"
												action="?/refund"
												onsubmit={(e) => {
													if (!confirmRefund(ticket.ticketCode)) e.preventDefault();
												}}
												class="inline-block"
											>
												<input type="hidden" name="ticketId" value={ticket.ticketId} />
												<button
													type="submit"
													class="inline-flex h-8 shrink-0 items-center px-2 text-xs font-extrabold tracking-widest text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40"
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
	{/if}

	<!-- Import CSV Tab -->
	{#if activeTab === 'import'}
		<div>
			{#if isCompleted}
				<h2 class={sectionTitle}>Import results</h2>
				<p class="mt-6 border border-dashed border-line2 px-5 py-5 text-sm text-soft">
					This event is closed. Reopen it (top right) to import new results.
				</p>
			{:else}
				{#if form?.processedResults}
					<div
						class="mb-10 border border-l-4 border-line2 border-l-prem bg-white px-5 py-5 md:px-7"
					>
						<span class="text-xs font-extrabold tracking-widest text-prem uppercase">
							Success
						</span>
						<h3 class="ao-cond mt-1 text-3xl leading-none font-black uppercase">
							Results imported
						</h3>
						<div class="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
							<div class="border-t border-line2 pt-3">
								<div class="ao-cond text-3xl leading-none font-black tabular-nums">
									{form.processedResults.totalPlayers}
								</div>
								<span class="mt-1 block text-xs font-extrabold tracking-widest text-prem uppercase">
									Players
								</span>
							</div>
							<div class="border-t border-line2 pt-3">
								<div class="ao-cond text-3xl leading-none font-black tabular-nums">
									{form.processedResults.totalRounds}
								</div>
								<span class="mt-1 block text-xs font-extrabold tracking-widest text-prem uppercase">
									Rounds
								</span>
							</div>
							<div class="border-t border-line2 pt-3">
								<div class="ao-cond text-3xl leading-none font-black tabular-nums">
									{form.processedResults.totalPointsDistributed}
								</div>
								<span class="mt-1 block text-xs font-extrabold tracking-widest text-prem uppercase">
									AGE Points
								</span>
							</div>
							<div class="border-t border-line2 pt-3">
								<div class="ao-cond text-3xl leading-none font-black tabular-nums">
									${form.processedResults.totalPrizeDistributed}
								</div>
								<span class="mt-1 block text-xs font-extrabold tracking-widest text-prem uppercase">
									Prize Pool
								</span>
							</div>
						</div>
						<button
							onclick={() => setActiveTab('results')}
							class="mt-5 inline-flex h-10 items-center bg-prem px-5 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
						>
							Review Results →
						</button>
					</div>
				{/if}

				<div class="flex flex-wrap items-end justify-between gap-3">
					<h2 class={sectionTitle}>Import results</h2>
					<p class="text-xs text-soft">GEM CSV exports → standings and matches</p>
				</div>
				<div class="mt-6 overflow-hidden border border-line2 bg-white">
					<form
						method="POST"
						action="?/processCSV"
						enctype="multipart/form-data"
						use:enhance={csvEnhance}
						class="space-y-4.5 p-5"
					>
						<div class="grid gap-3.5 sm:grid-cols-2">
							<!-- Swiss Standings -->
							<div
								class="border border-dashed border-line2 bg-paper p-4 transition-colors hover:border-ink {swissStandingsFile &&
								swissStandingsFile.length > 0
									? 'border-prem bg-prem/10'
									: ''}"
							>
								<input
									type="file"
									id="swissStandings"
									name="swissStandings"
									accept=".csv"
									required
									bind:files={swissStandingsFile}
									class="sr-only"
								/>
								<label for="swissStandings" class="flex cursor-pointer items-center gap-3">
									<span
										class="inline-flex h-8 w-8 shrink-0 items-center justify-center text-sm font-extrabold {swissStandingsFile &&
										swissStandingsFile.length > 0
											? 'bg-prem text-white'
											: 'border border-line2 text-fade'}"
									>
										{swissStandingsFile && swissStandingsFile.length > 0 ? '✓' : '01'}
									</span>
									<div class="min-w-0 flex-1">
										<div class="font-newsreader text-base font-semibold">
											Swiss Standings <span class="text-warm">*</span>
										</div>
										{#if swissStandingsFile && swissStandingsFile.length > 0}
											<p class="mt-0.5 truncate text-xs font-medium text-prem">
												{swissStandingsFile[0].name}
											</p>
										{:else}
											<p class="mt-0.5 text-xs text-fade">Click to select CSV</p>
										{/if}
									</div>
								</label>
							</div>

							<!-- Pairings -->
							<div
								class="border border-dashed border-line2 bg-paper p-4 transition-colors hover:border-ink {pairingsFile &&
								pairingsFile.length > 0
									? 'border-prem bg-prem/10'
									: ''}"
							>
								<input
									type="file"
									id="pairings"
									name="pairings"
									accept=".csv"
									required
									bind:files={pairingsFile}
									class="sr-only"
								/>
								<label for="pairings" class="flex cursor-pointer items-center gap-3">
									<span
										class="inline-flex h-8 w-8 shrink-0 items-center justify-center text-sm font-extrabold {pairingsFile &&
										pairingsFile.length > 0
											? 'bg-prem text-white'
											: 'border border-line2 text-fade'}"
									>
										{pairingsFile && pairingsFile.length > 0 ? '✓' : '02'}
									</span>
									<div class="min-w-0 flex-1">
										<div class="font-newsreader text-base font-semibold">
											Pairings Data <span class="text-warm">*</span>
										</div>
										{#if pairingsFile && pairingsFile.length > 0}
											<p class="mt-0.5 truncate text-xs font-medium text-prem">
												{pairingsFile[0].name}
											</p>
										{:else}
											<p class="mt-0.5 text-xs text-fade">Click to select CSV</p>
										{/if}
									</div>
								</label>
							</div>
						</div>

						{#if data.existingResults && data.existingResults.length > 0}
							<div class="border-l-3 border-gold bg-gold/10 p-3">
								<p class="text-xs font-extrabold tracking-widest text-gold-deep uppercase">
									Warning · will replace {data.existingResults.length} existing results
								</p>
							</div>
						{/if}

						<button
							type="submit"
							disabled={csvProcessing || !swissStandingsFile || !pairingsFile}
							class="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 bg-ink px-4 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
						>
							{csvProcessing ? 'Processing…' : 'Import Results →'}
						</button>
					</form>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Results Tab -->
	{#if activeTab === 'results'}
		<div class="flex flex-wrap items-end justify-between gap-3">
			<h2 class={sectionTitle}>Results</h2>
			{#if sortedResults.length > 0}
				<p class="text-xs text-soft">
					{sortedResults.length} players · {data.existingMatches?.length || 0} matches
				</p>
			{/if}
		</div>
		<div class="mt-6 overflow-hidden border border-line2 bg-white">
			{#if sortedResults.length === 0}
				<div class="p-12 text-center">
					<p class="font-newsreader text-lg text-soft italic">No results recorded yet.</p>
					<p class="mt-2 text-sm text-fade">Import tournament CSV files to see results here.</p>
				</div>
			{:else}
				<!-- Mobile -->
				<div class="lg:hidden">
					{#each sortedResults as result (result.playerName + result.placement)}
						<div class="flex items-start gap-3 border-b border-line2 p-4 last:border-b-0">
							<span
								class="inline-flex h-9 w-9 shrink-0 items-center justify-center text-xs font-medium {result.placement ===
								1
									? 'bg-gold text-white'
									: result.placement <= 3
										? 'bg-ink text-paper-bg'
										: 'border border-line2 text-fade'}"
							>
								{result.placement}
							</span>
							<div class="min-w-0 flex-1">
								<div class="truncate font-newsreader text-base font-semibold">
									{result.playerName}
								</div>
								<div class="mt-1 flex items-center gap-2">
									<code class="text-xs font-medium text-warm">
										{result.gemId || '—'}
									</code>
									{#if result.gemId && result.gemId !== '-'}
										<button
											type="button"
											onclick={(e) => copyGemId(result.gemId, e)}
											class="inline-flex items-center border border-line2 px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
											title="Copy GEM ID"
										>
											{copiedGemId === result.gemId ? '✓' : 'Copy'}
										</button>
									{/if}
								</div>
								<div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
									<span class="text-xs text-fade">
										Record <span
											class="text-xs font-semibold tracking-normal text-ink tabular-nums"
										>
											{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}
										</span>
									</span>
									<span class="text-xs text-fade">
										AGE Pts <span
											class="text-xs font-semibold tracking-normal text-gold-deep tabular-nums"
											>{result.agePoints}</span
										>
									</span>
									{#if result.prizeAmount}
										<span class="text-xs text-fade">
											Prize <span
												class="text-xs font-semibold tracking-normal text-prem tabular-nums"
												>${result.prizeAmount}</span
											>
										</span>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Desktop -->
				<div class="hidden overflow-x-auto lg:block">
					<table class="w-full">
						<thead class="border-b-2 border-line2">
							<tr class="text-left">
								<th class="px-4 py-3 text-xs font-extrabold tracking-widest text-fade uppercase"
									>Place</th
								>
								<th class="px-4 py-3 text-xs font-extrabold tracking-widest text-fade uppercase"
									>Player</th
								>
								<th class="px-4 py-3 text-xs font-extrabold tracking-widest text-fade uppercase"
									>GEM ID</th
								>
								<th class="px-4 py-3 text-xs font-extrabold tracking-widest text-fade uppercase"
									>Record</th
								>
								<th
									class="px-4 py-3 text-right text-xs font-extrabold tracking-widest text-fade uppercase"
									>AGE Pts</th
								>
								<th
									class="px-4 py-3 text-right text-xs font-extrabold tracking-widest text-fade uppercase"
									>Prize</th
								>
							</tr>
						</thead>
						<tbody>
							{#each sortedResults as result (result.playerName + result.placement)}
								<tr class="border-b border-line2 transition-colors hover:bg-paper">
									<td class="px-4 py-3">
										<span
											class="inline-flex h-7 w-7 items-center justify-center text-xs font-medium {result.placement ===
											1
												? 'bg-gold text-white'
												: result.placement <= 3
													? 'bg-ink text-paper-bg'
													: 'border border-line2 text-fade'}"
										>
											{result.placement}
										</span>
									</td>
									<td class="px-4 py-3 font-newsreader text-base font-semibold"
										>{result.playerName}</td
									>
									<td class="px-4 py-3">
										<div class="inline-flex items-center gap-2">
											<code class="text-xs font-medium text-warm">
												{result.gemId || '—'}
											</code>
											{#if result.gemId && result.gemId !== '-'}
												<button
													type="button"
													onclick={(e) => copyGemId(result.gemId, e)}
													class="inline-flex items-center border border-line2 px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
													title="Copy GEM ID"
												>
													{copiedGemId === result.gemId ? '✓' : 'Copy'}
												</button>
											{/if}
										</div>
									</td>
									<td class="px-4 py-3 text-base font-semibold text-ink tabular-nums">
										{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}
									</td>
									<td
										class="px-4 py-3 text-right text-base font-semibold text-gold-deep tabular-nums"
									>
										{result.agePoints}
									</td>
									<td class="px-4 py-3 text-right text-base font-semibold text-prem tabular-nums">
										{result.prizeAmount ? `$${result.prizeAmount}` : '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Decklists Tab -->
	{#if activeTab === 'decklists'}
		<div class="space-y-6">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class={sectionTitle}>Decklists</h2>
				{#if !isCompleted}
					<button
						onclick={startNewDecklist}
						class="inline-flex h-9 items-center px-4 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
						style="background: var(--cc)"
					>
						+ Add decklist
					</button>
				{/if}
			</div>

			<!-- Decklist Form Modal -->
			{#if showDecklistForm}
				<div
					class="overflow-hidden border border-t-4 border-line2 border-t-(--cc) bg-white px-5 py-6 md:px-7"
				>
					<h3 class="ao-cond mb-6 text-3xl leading-none font-black uppercase">
						{editingDecklist ? `Edit ${editingDecklist.playerName}’s list` : 'New decklist'}
					</h3>

					{#if data.participants.length > 0 && !editingDecklist}
						<div class="mb-4">
							<label for="participantSearchInput" class={F.label}>
								Select from Registered Players
							</label>
							<div class="relative">
								<input
									type="text"
									id="participantSearchInput"
									bind:value={participantSearch}
									onfocus={() => (showParticipantDropdown = true)}
									placeholder="Search by name or GEM ID"
									class={F.field}
								/>
								{#if participantSearch}
									<button
										type="button"
										onclick={() => {
											participantSearch = '';
										}}
										aria-label="Clear search"
										class="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-fade hover:text-ink"
									>
										×
									</button>
								{/if}
								{#if showParticipantDropdown}
									<div
										class="absolute z-10 mt-1 max-h-48 w-full overflow-auto border border-line2 bg-paper-bg"
									>
										{#if filteredParticipants.length === 0}
											<div class="px-4 py-3 font-newsreader text-sm text-fade italic">
												No matching players found
											</div>
										{:else}
											{#each filteredParticipants as participant (participant.id || participant.playerName)}
												<button
													type="button"
													onclick={() => {
														selectParticipant(participant);
														participantSearch = '';
														showParticipantDropdown = false;
													}}
													class="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left transition-colors hover:bg-paper"
												>
													<span class="font-newsreader text-sm font-semibold"
														>{participant.playerName}</span
													>
													{#if participant.gemId}
														<code class="text-xs font-medium text-warm">
															{participant.gemId}
														</code>
													{/if}
												</button>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
							{#if showParticipantDropdown}
								<button
									type="button"
									class="fixed inset-0 z-0 cursor-default"
									onclick={() => (showParticipantDropdown = false)}
									tabindex="-1"
									aria-label="Close dropdown"
								></button>
							{/if}
							<p class="mt-2 text-xs text-fade">Or enter details manually below</p>
						</div>
					{/if}

					<form
						method="POST"
						action="?/saveDecklist"
						onsubmit={async (e) => {
							e.preventDefault();
							const cards = parseCardsText(decklistForm.cardsText);
							const formData = new FormData(e.target);
							formData.set('cards', JSON.stringify(cards));
							formData.set('rawText', decklistForm.cardsText);
							await fetch(e.target.action, { method: 'POST', body: formData });
							showDecklistForm = false;
							editingDecklist = null;
							await invalidateAll();
						}}
						class="space-y-4"
					>
						{#if editingDecklist}
							<input type="hidden" name="decklistId" value={editingDecklist.id} />
						{/if}
						<input type="hidden" name="userId" value={decklistForm.userId} />
						<input type="hidden" name="isPublic" value={decklistForm.isPublic} />
						<input type="hidden" name="hero" value={decklistForm.hero} />

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label for="deckPlayerName" class={F.label}>
									Player Name <span class="text-warm">*</span>
								</label>
								<input
									type="text"
									id="deckPlayerName"
									name="playerName"
									required
									bind:value={decklistForm.playerName}
									list="participantNames"
									autocomplete="off"
									class={F.field}
								/>
								<datalist id="participantNames">
									{#each data.participants as participant (participant.id || participant.playerName)}
										<option value={participant.playerName}></option>
									{/each}
								</datalist>
							</div>
							<div>
								<label for="deckGemId" class={F.label}> GEM ID </label>
								<input
									type="text"
									id="deckGemId"
									name="gemId"
									bind:value={decklistForm.gemId}
									list="participantGemIds"
									autocomplete="off"
									class={F.field}
								/>
								<datalist id="participantGemIds">
									{#each data.participants.filter((p) => p.gemId) as participant (participant.gemId)}
										<option value={participant.gemId}>{participant.playerName}</option>
									{/each}
								</datalist>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<!-- Hero -->
							<div class="relative">
								<label for="heroSearch" class={F.label}>
									Hero <span class="text-warm">*</span>
								</label>
								<div class="relative">
									<input
										type="text"
										id="heroSearch"
										bind:value={heroSearch}
										onfocus={() => (showHeroDropdown = true)}
										oninput={() => {
											showHeroDropdown = true;
											decklistForm.hero = heroSearch;
										}}
										placeholder="Search hero"
										autocomplete="off"
										class={F.field}
									/>
									{#if heroSearch}
										<button
											type="button"
											onclick={() => {
												heroSearch = '';
												decklistForm.hero = '';
											}}
											class="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-fade hover:text-ink"
											aria-label="Clear hero search"
										>
											×
										</button>
									{/if}
								</div>
								{#if showHeroDropdown}
									<div
										class="absolute z-20 mt-1 max-h-48 w-full overflow-auto border border-line2 bg-paper-bg"
									>
										{#if filteredHeroes.length === 0}
											<div class="px-4 py-3 font-newsreader text-sm text-fade italic">
												No matching heroes
											</div>
										{:else}
											{#each filteredHeroes.slice(0, 20) as hero (hero)}
												<button
													type="button"
													onclick={() => selectHero(hero)}
													class="w-full px-3.5 py-2 text-left font-newsreader text-sm transition-colors hover:bg-paper"
												>
													{hero}
												</button>
											{/each}
											{#if filteredHeroes.length > 20}
												<div class="text-xs text-fade">
													+{filteredHeroes.length - 20} more…
												</div>
											{/if}
										{/if}
									</div>
									<button
										type="button"
										class="fixed inset-0 z-10 cursor-default"
										onclick={() => (showHeroDropdown = false)}
										tabindex="-1"
										aria-label="Close dropdown"
									></button>
								{/if}
							</div>

							<div>
								<label for="placement" class={F.label}> Placement </label>
								<select
									id="placement"
									name="placement"
									bind:value={decklistForm.placement}
									class={F.select}
								>
									<option value="">Select…</option>
									{#each PLACEMENT_BANDS as band (band.value)}
										<option value={band.value}>{band.label}</option>
									{/each}
								</select>
							</div>

							<div>
								<label for="deckFormat" class={F.label}> Format </label>
								<select
									id="deckFormat"
									name="format"
									bind:value={decklistForm.format}
									class={F.select}
								>
									{#each formats as fmt (fmt)}
										<option value={fmt}>{fmt}</option>
									{/each}
								</select>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
							<!-- Cards Textarea -->
							<div>
								<label for="cardsText" class={F.label}>
									Decklist · GEM Format <span class="text-warm">*</span>
								</label>
								<textarea
									id="cardsText"
									bind:value={decklistForm.cardsText}
									rows="16"
									required
									placeholder="Weapon / Equipment
1 Balance of Justice
2 Cintari Saber
9 Total Weapon / Equipment
Pitch 0/1 (Red)
3 Blade Flurry
3 Sharpen Steel
..."
									class="{F.field} h-auto py-3 leading-relaxed"
								></textarea>
								<p class="mt-2 text-xs text-fade">Paste decklist directly from GEM export</p>
							</div>

							<!-- Live Preview -->
							<div>
								<span class={F.label}> Preview </span>
								<div class="h-100 overflow-auto border border-line2 bg-paper p-4">
									{#if decklistPreview.totals.total === 0}
										<p class="font-newsreader text-base text-soft italic">
											Paste a decklist to see preview…
										</p>
									{:else}
										<div class="space-y-4">
											{#if decklistPreview.equipment.length > 0}
												<div>
													<h4
														class="mb-2 text-xs font-extrabold tracking-widest text-fade uppercase"
													>
														Equipment · {decklistPreview.totals.equipment}
													</h4>
													<div class="space-y-1">
														{#each decklistPreview.equipment as card, i (card.name + i)}
															<div class="flex justify-between font-newsreader text-sm">
																<span>{card.name}</span>
																<span class="text-xs font-medium text-fade">{card.quantity}</span>
															</div>
														{/each}
													</div>
												</div>
											{/if}
											{#if decklistPreview.red.length > 0}
												<div>
													<h4
														class="mb-2 text-xs font-extrabold tracking-widest text-warm uppercase"
													>
														Red · {decklistPreview.totals.red}
													</h4>
													<div class="space-y-1">
														{#each decklistPreview.red as card, i (card.name + i)}
															<div class="flex justify-between font-newsreader text-sm">
																<span>{card.name}</span>
																<span class="text-xs font-medium text-fade">{card.quantity}</span>
															</div>
														{/each}
													</div>
												</div>
											{/if}
											{#if decklistPreview.yellow.length > 0}
												<div>
													<h4 class="mb-2 text-xs font-extrabold tracking-widest uppercase">
														Yellow · {decklistPreview.totals.yellow}
													</h4>
													<div class="space-y-1">
														{#each decklistPreview.yellow as card, i (card.name + i)}
															<div class="flex justify-between font-newsreader text-sm">
																<span>{card.name}</span>
																<span class="text-xs font-medium text-fade">{card.quantity}</span>
															</div>
														{/each}
													</div>
												</div>
											{/if}
											{#if decklistPreview.blue.length > 0}
												<div>
													<h4 class="mb-2 text-xs font-extrabold tracking-widest uppercase">
														Blue · {decklistPreview.totals.blue}
													</h4>
													<div class="space-y-1">
														{#each decklistPreview.blue as card, i (card.name + i)}
															<div class="flex justify-between font-newsreader text-sm">
																<span>{card.name}</span>
																<span class="text-xs font-medium text-fade">{card.quantity}</span>
															</div>
														{/each}
													</div>
												</div>
											{/if}
											<div class="border-t border-line2 pt-2.5">
												<div class="flex justify-between">
													<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
														>Total Cards</span
													>
													<span class="text-base font-semibold text-ink tabular-nums">
														{decklistPreview.totals.total}
													</span>
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								id="isPublicCheck"
								bind:checked={decklistForm.isPublic}
								class="h-4 w-4 border-line2 text-ink focus:ring-0"
							/>
							<span class="font-newsreader text-sm font-semibold"> Make this decklist public </span>
						</label>

						<div class="flex justify-end gap-3 border-t border-line2 pt-4">
							<button
								type="button"
								onclick={cancelDecklistForm}
								class="inline-flex h-10 shrink-0 items-center gap-2 border border-line2 px-4 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="inline-flex h-10 shrink-0 items-center gap-2 bg-ink px-4 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
							>
								Save Decklist →
							</button>
						</div>
					</form>
				</div>
			{/if}

			<!-- Decklists Grid -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#if data.existingDecklists?.length === 0}
					<div class="col-span-full border border-line2 p-12 text-center">
						<p class="font-newsreader text-lg text-soft italic">No decklists recorded yet.</p>
						{#if !isCompleted}
							<button
								onclick={startNewDecklist}
								class="mt-4 text-xs font-extrabold tracking-widest text-warm uppercase transition-colors hover:text-ink"
							>
								Add the first decklist →
							</button>
						{/if}
					</div>
				{:else}
					{#each data.existingDecklists.sort((a, b) => (a.placement || 99) - (b.placement || 99)) as decklist (decklist.id)}
						<div class="overflow-hidden border border-line2 p-4">
							<div class="mb-2.5 flex items-start justify-between">
								<div class="flex items-start gap-3">
									{#if decklist.placement}
										<span
											class="inline-flex h-7 shrink-0 items-center justify-center px-2 text-xs font-bold whitespace-nowrap {decklist.placement ===
											1
												? 'bg-gold text-white'
												: decklist.placement <= 4
													? 'bg-ink text-paper-bg'
													: 'border border-line2 text-fade'}"
										>
											{placementLabel(decklist.placement)}
										</span>
									{/if}
									<div>
										<h4 class="font-newsreader text-base font-semibold">{decklist.playerName}</h4>
										{#if decklist.hero}
											<p class="mt-0.5 text-xs font-extrabold tracking-widest uppercase">
												{decklist.hero}
											</p>
										{/if}
									</div>
								</div>
								{#if !isCompleted}
									<div class="flex gap-2">
										<button
											onclick={() => editDecklist(decklist)}
											class="text-xs font-extrabold tracking-widest text-fade uppercase transition-colors hover:text-ink"
										>
											Edit
										</button>
										<form
											method="POST"
											action="?/deleteDecklist"
											class="inline"
											onsubmit={async (e) => {
												e.preventDefault();
												if (!confirm('Delete this decklist?')) return;
												const formData = new FormData(e.target);
												await fetch(e.target.action, { method: 'POST', body: formData });
												await invalidateAll();
											}}
										>
											<input type="hidden" name="decklistId" value={decklist.id} />
											<button
												type="submit"
												class="text-xs font-extrabold tracking-widest text-warm uppercase transition-colors hover:text-ink"
											>
												Del
											</button>
										</form>
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-2 text-xs text-fade">
								<span>{decklist.cards?.reduce((sum, c) => sum + c.quantity, 0) || 0} cards</span>
								<span>·</span>
								<span>{decklist.format || 'Unknown'}</span>
								{#if decklist.gemId}
									<span>·</span>
									<span class="text-warm">{decklist.gemId}</span>
								{/if}
							</div>
							{#if !decklist.isPublic}
								<span class="mt-2 text-xs font-extrabold tracking-widest uppercase"> Private </span>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Metagame Tab -->
	{#if activeTab === 'metagame'}
		<div class="space-y-6">
			<!-- Upload -->
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class={sectionTitle}>Heroes</h2>
				<p class="text-xs text-soft">Hero choices from the GEM export</p>
			</div>
			<div class="overflow-hidden border border-line2 bg-white">
				<div class="p-5">
					{#if !data.event.circuit || !data.event.month}
						<div class="border-l-3 border-gold bg-gold/10 p-4">
							<span class="text-xs font-extrabold tracking-widest text-gold-deep uppercase">
								Setup Required
							</span>
							<p class="mt-1.5 text-sm leading-normal text-soft">
								Set the Circuit and Month in the Overview tab before uploading hero data.
							</p>
						</div>
					{:else}
						<form
							method="POST"
							action="?/uploadHeroes"
							enctype="multipart/form-data"
							use:enhance={heroesEnhance}
							class="space-y-4"
						>
							<div
								class="border border-dashed border-line2 bg-paper p-4 transition-colors hover:border-ink {heroesFile &&
								heroesFile.length > 0
									? 'border-prem bg-prem/10'
									: ''}"
							>
								<input
									type="file"
									id="heroesFile"
									name="heroesFile"
									accept=".csv"
									required
									bind:files={heroesFile}
									class="sr-only"
								/>
								<label for="heroesFile" class="flex cursor-pointer items-center gap-3">
									<span
										class="inline-flex h-9 w-9 shrink-0 items-center justify-center text-sm font-extrabold {heroesFile &&
										heroesFile.length > 0
											? 'bg-prem text-white'
											: 'border border-line2 text-fade'}"
									>
										{heroesFile && heroesFile.length > 0 ? '✓' : 'CSV'}
									</span>
									<div class="min-w-0 flex-1">
										{#if heroesFile && heroesFile.length > 0}
											<p class="truncate text-xs font-medium text-prem">
												{heroesFile[0].name}
											</p>
										{:else}
											<div class="font-newsreader text-base font-semibold">Heroes CSV</div>
											<p class="mt-0.5 text-xs text-fade">
												Player Name, Player ID, Country/Region, Hero
											</p>
										{/if}
									</div>
								</label>
							</div>

							{#if data.existingHeroes?.length > 0}
								<div class="border-l-3 border-gold bg-gold/10 p-3">
									<p class="text-xs font-extrabold tracking-widest text-gold-deep uppercase">
										Warning · will replace {data.existingHeroes.length} existing entries
									</p>
								</div>
							{/if}

							<div class="flex gap-3">
								<button
									type="submit"
									disabled={heroesProcessing || !heroesFile}
									class="inline-flex h-10 flex-1 shrink-0 items-center justify-center gap-2 bg-ink px-4 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
								>
									{heroesProcessing ? 'Processing…' : 'Upload Heroes →'}
								</button>
								{#if data.existingHeroes?.length > 0}
									<button
										type="submit"
										formaction="?/deleteHeroes"
										class="inline-flex h-10 shrink-0 items-center gap-2 border border-hero-rb/60 px-4 text-xs font-extrabold tracking-widest text-hero-rb uppercase transition-colors hover:border-hero-rb disabled:cursor-not-allowed disabled:opacity-40"
									>
										Clear All
									</button>
								{/if}
							</div>
						</form>
					{/if}
				</div>
			</div>

			<!-- Metagame Breakdown -->
			<div class="mt-10 flex flex-wrap items-end justify-between gap-3">
				<h2 class={sectionTitle}>Metagame</h2>
				<p class="text-xs text-soft">{data.existingHeroes?.length || 0} players</p>
			</div>
			<div class="overflow-hidden border border-line2 bg-white">
				{#if !data.existingHeroes?.length}
					<div class="p-12 text-center">
						<p class="font-newsreader text-lg text-soft italic">No hero data uploaded yet.</p>
						<p class="mt-2 text-sm text-fade">Upload a heroes CSV to see the metagame breakdown.</p>
					</div>
				{:else}
					<div class="space-y-3.5 p-5">
						{#each heroBreakdown() as { hero, count, percentage }, idx (hero + idx)}
							<div class="flex items-center gap-4">
								<span class="w-6 text-right text-xs font-medium text-fade">
									{idx + 1}
								</span>
								<div class="min-w-0 flex-1">
									<div class="mb-1.5 flex items-baseline justify-between gap-3">
										<span class="truncate font-newsreader text-base font-semibold">{hero}</span>
										<span class="shrink-0 text-xs text-fade">
											{count}
											<span class="text-warm">· {percentage}%</span>
										</span>
									</div>
									<div class="h-1.5 bg-line2">
										<div class="h-full bg-warm" style="width: {percentage}%"></div>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<div class="border-t border-line2 p-5">
						<span class="text-xs font-extrabold tracking-widest text-fade uppercase">
							All Players
						</span>
						<div
							class="mt-3.5 grid max-h-96 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3"
						>
							{#each data.existingHeroes.sort( (a, b) => a.playerName.localeCompare(b.playerName) ) as entry (entry.playerName + entry.hero)}
								<div class="flex items-center gap-2 border border-line2 bg-paper p-2">
									<span class="flex-1 truncate font-newsreader text-sm font-semibold"
										>{entry.playerName}</span
									>
									<span class="truncate text-xs font-extrabold tracking-widest uppercase">
										{entry.hero}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Staff Tab (Admin Only) -->
	{#if activeTab === 'staff' && data.isAdmin}
		<div class="space-y-6">
			<!-- Assigned Staff -->
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class={sectionTitle}>Staff</h2>
				<p class="text-xs text-soft">They run the event from their staff page</p>
			</div>
			<div class="overflow-hidden border border-line2 bg-white">
				<div class="p-5">
					{#if data.assignedStaff?.length > 0}
						<div class="space-y-2.5">
							{#each data.assignedStaff as staff (staff.userId)}
								<div class="flex items-center justify-between border border-line2 p-4">
									<div class="flex items-center gap-3">
										<span
											class="flex h-9 w-9 items-center justify-center border border-line2 bg-paper font-newsreader text-base font-semibold"
										>
											{staff.userEmail?.charAt(0).toUpperCase() || '?'}
										</span>
										<div>
											<div class="font-newsreader text-base font-semibold">{staff.userEmail}</div>
											<div class="mt-0.5 text-xs text-fade">
												Assigned {formatShortDate(staff.createdAt)}
											</div>
										</div>
									</div>
									<form method="POST" action="?/unassignStaff">
										<input type="hidden" name="staffId" value={staff.userId} />
										<button
											type="submit"
											class="inline-flex h-8 shrink-0 items-center px-2 text-xs font-extrabold tracking-widest text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40"
										>
											Remove
										</button>
									</form>
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-8 text-center">
							<p class="font-newsreader text-lg text-soft italic">
								No staff assigned to this event.
							</p>
							<p class="mt-2 text-sm text-fade">
								Search any AGE account below to add them. They run the event from their Staff page.
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Add Staff -->
			<div class="mt-10 flex flex-wrap items-end justify-between gap-3">
				<h2 class={sectionTitle}>Add staff</h2>
				<p class="text-xs text-soft">Search anyone by email</p>
			</div>
			<div class="overflow-hidden border border-line2 bg-white">
				<div class="p-5">
					<div class="mb-4">
						<label for="staff-search" class={F.label}> Search by Email </label>
						<div class="relative">
							<input
								id="staff-search"
								type="email"
								value={staffSearch}
								oninput={(e) => handleStaffSearchInput(e.target.value)}
								placeholder="Email address · min 3 characters"
								class={F.field}
							/>
							{#if staffSearchLoading}
								<div class="absolute top-1/2 right-3 -translate-y-1/2">
									<svg class="h-4 w-4 animate-spin text-warm" fill="none" viewBox="0 0 24 24">
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										></path>
									</svg>
								</div>
							{/if}
						</div>
						<p class="mt-2 text-xs text-fade">Type at least 3 characters</p>
					</div>

					{#if staffSearchResults.length > 0}
						<div class="max-h-64 space-y-2 overflow-y-auto">
							{#each staffSearchResults as userResult (userResult.id)}
								<form
									method="POST"
									action="?/assignStaff"
									use:enhance={handleStaffAssign}
									class="flex items-center justify-between border border-line2 p-3 transition-colors hover:border-ink"
								>
									<input type="hidden" name="staffId" value={userResult.id} />
									<div class="flex items-center gap-3">
										<span
											class="flex h-9 w-9 items-center justify-center border border-line2 bg-paper font-newsreader text-base font-semibold"
										>
											{userResult.email?.charAt(0).toUpperCase() || '?'}
										</span>
										<div>
											<div class="font-newsreader text-base font-semibold">
												{userResult.email}
											</div>
											<div class="mt-0.5 text-xs text-fade">
												Role · {userResult.role || 'user'}
											</div>
										</div>
									</div>
									<button
										type="submit"
										class="inline-flex h-8 shrink-0 items-center gap-1.5 bg-prem px-3 text-xs font-extrabold tracking-widest text-white uppercase transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Assign
									</button>
								</form>
							{/each}
						</div>
					{:else if staffSearch.length >= 3 && !staffSearchLoading}
						<div class="p-6 text-center">
							<p class="font-newsreader text-lg text-soft italic">
								No users found matching "{staffSearch}".
							</p>
						</div>
					{:else if staffSearch.length === 0}
						<div class="p-6 text-center">
							<p class="font-newsreader text-lg text-soft italic">
								Enter an email address to search.
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
		<div class="w-full max-w-md border border-t-3 border-line2 border-t-ink bg-paper-bg">
			<div class="border-b border-line2 p-6">
				<span class="text-xs font-extrabold tracking-widest text-hero-rb uppercase">
					Danger Zone
				</span>
				<h3 class="ao-cond mt-2 text-3xl leading-none font-black uppercase">Delete this event?</h3>
				<p class="mt-1 font-newsreader text-base text-soft italic">This action cannot be undone.</p>
			</div>
			<div class="p-6">
				<p class="font-newsreader text-base leading-normal text-ink">
					You're about to delete <strong>{data.event.title}</strong>. All associated tickets,
					results, decklists, and staff assignments will be removed permanently.
				</p>
			</div>
			<div class="flex justify-end gap-3 border-t border-line2 p-6">
				<button
					type="button"
					onclick={() => (showDeleteConfirm = false)}
					class="inline-flex items-center border border-line2 px-4 py-2.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
				>
					Cancel
				</button>
				<form method="POST" action="?/deleteEvent">
					<button
						type="submit"
						class="inline-flex h-10 shrink-0 items-center bg-hero-rb px-4 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Delete Event
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Close Event Confirmation Modal -->
{#if showCloseConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
		<div class="w-full max-w-lg border border-t-3 border-line2 border-t-ink bg-paper-bg">
			<div class="border-b border-line2 p-6">
				<span class="text-xs font-extrabold tracking-widest uppercase"> Finalize </span>
				<h3 class="ao-cond mt-2 text-3xl leading-none font-black uppercase">Close this event?</h3>
				<p class="mt-1 font-newsreader text-base text-soft italic">
					Season standings will be updated with results.
				</p>
			</div>

			<div class="space-y-4 p-6">
				<!-- Summary -->
				<div class="border border-line2 bg-paper p-4">
					<span class="text-xs font-extrabold tracking-widest text-fade uppercase"> Summary </span>
					<dl class="mt-2.5 space-y-1.5">
						<div class="flex justify-between">
							<dt class="text-xs text-fade">Results Recorded</dt>
							<dd class="text-sm font-semibold text-ink tabular-nums">
								{data.existingResults?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-xs text-fade">Decklists Recorded</dt>
							<dd class="text-sm font-semibold text-ink tabular-nums">
								{data.existingDecklists?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-xs text-fade">Registered Players</dt>
							<dd class="text-sm font-semibold text-ink tabular-nums">
								{data.participants?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-xs text-fade">Circuit</dt>
							<dd class="font-newsreader text-sm font-semibold text-ink">
								{data.event.circuit || 'Not set'}
							</dd>
						</div>
					</dl>
				</div>

				{#if !hasResults}
					<div class="border-l-3 border-gold bg-gold/10 p-3">
						<span class="text-xs font-extrabold tracking-widest text-gold-deep uppercase"
							>Warning</span
						>
						<p class="mt-0.5 text-sm text-soft">
							No results recorded yet. Import CSV or add results before closing.
						</p>
					</div>
				{/if}

				{#if !data.event.circuit}
					<div class="border-l-3 border-hero-rb bg-hero-rb/5 p-3">
						<span class="text-xs font-extrabold tracking-widest text-hero-rb uppercase">Error</span>
						<p class="mt-0.5 font-newsreader text-sm font-semibold">
							This event has no circuit assigned. Edit the event to add one before closing.
						</p>
					</div>
				{/if}

				<p class="text-sm leading-normal text-soft">
					Closing will update season standings with AGE points and match data for all players.
				</p>
			</div>

			<div class="flex justify-end gap-3 border-t border-line2 p-6">
				<button
					type="button"
					onclick={() => (showCloseConfirm = false)}
					class="inline-flex items-center border border-line2 px-4 py-2.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
				>
					Cancel
				</button>
				<form method="POST" action="?/finalizeEvent">
					<button
						type="submit"
						disabled={!hasResults || !data.event.circuit}
						class="inline-flex h-10 shrink-0 items-center bg-prem px-4 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Close Event →
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
