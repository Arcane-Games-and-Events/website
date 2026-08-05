<script>
	import { invalidateAll } from '$app/navigation';
	import { enhance, deserialize } from '$app/forms';
	import heroes from '$lib/data/heroes.json';
	import {
		parseGemDecklist,
		toStorageFormat,
		fromStorageFormat,
		getPlacementSuffix
	} from '$lib/utils/gem-decklist-parser.js';
	import { getCircuitNames } from '$lib/data/circuits.js';

	let { data, form } = $props();

	// Always start on Overview when navigating to an event.
	// Tab state is not persisted — clicks within the page swap it in memory only.
	let activeTab = $state('overview');

	function setActiveTab(tab) {
		activeTab = tab;
	}

	// Edit mode for event details
	let isEditMode = $state(false);
	let premiumDiscount = $derived(data.event.premiumDiscount);
	let gemIdRequired = $derived(data.event.gemIdRequired);
	let hasPlayerCap = $state(!!data.event.playerCap);
	let playerCapValue = $state(data.event.playerCap || '');

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
			? heroes.filter((h) => h.name.toLowerCase().includes(heroSearch.toLowerCase()))
			: heroes
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

	const circuits = getCircuitNames();
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
	// Use computed status for display (dynamically calculated based on date)
	let displayStatus = $derived(data.event.computedStatus || data.event.status);
	let isCompleted = $derived(displayStatus === 'completed');
	let isInProgress = $derived(displayStatus === 'in_progress');
	let isUpcoming = $derived(displayStatus === 'upcoming');
	let isCancelled = $derived(displayStatus === 'cancelled');
	let hasResults = $derived((data.existingResults?.length || 0) > 0);
	// Check if there's a winner (placement 1 means finals were played)
	let hasWinner = $derived(data.existingResults?.some((r) => r.placement === 1) || false);

	// Delete confirmation state
	let showDeleteConfirm = $state(false);

	// Close event confirmation state
	let showCloseConfirm = $state(false);

	// Status form reference for auto-submit
	let statusForm;

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

	function formatDateForInput(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		// Format using UTC to preserve the original wall clock time
		const year = date.getUTCFullYear();
		const month = String(date.getUTCMonth() + 1).padStart(2, '0');
		const day = String(date.getUTCDate()).padStart(2, '0');
		const hours = String(date.getUTCHours()).padStart(2, '0');
		const minutes = String(date.getUTCMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
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
			placement: decklist.placement?.toString() || '',
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

<svelte:head>
	<title>{data.event.title} - Event Management</title>
</svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<a
		href="/admin/events"
		class="font-mono-system text-fade hover:text-ink inline-flex items-center text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
	>
		← Back to Events
	</a>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Event
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<div class="flex flex-wrap items-center gap-[10px]">
			<form
				method="POST"
				action="?/updateStatus"
				class="inline-flex items-center gap-2"
				bind:this={statusForm}
			>
				<select
					name="status"
					value={displayStatus}
					onchange={() => statusForm.submit()}
					class="border-ink bg-paper-bg text-ink font-mono-system border-[1.5px] py-[7px] pr-[24px] pl-[10px] text-[10.5px] font-bold tracking-[0.08em] uppercase focus:outline-none"
				>
					<option value="upcoming">Upcoming</option>
					<option value="in_progress">In Progress</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</form>

			{#if !isCompleted && hasWinner}
				<button
					type="button"
					onclick={() => (showCloseConfirm = true)}
					class="bg-prem font-mono-system inline-flex items-center px-[14px] py-[8px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white transition-[filter] hover:brightness-110"
				>
					Close Event ✓
				</button>
			{:else if !isCompleted && !hasWinner && hasResults}
				<span
					class="border-line2 text-fade font-mono-system inline-flex cursor-not-allowed items-center border px-[14px] py-[8px] text-[10px] font-bold tracking-[0.1em] uppercase"
					title="Finals match required to close event"
				>
					Awaiting Finals
				</span>
			{:else if isCompleted && data.isAdmin}
				<form method="POST" action="?/reopenEvent" class="inline">
					<button
						type="submit"
						class="border-warm text-warm hover:bg-warm hover:text-white font-mono-system inline-flex items-center border px-[14px] py-[8px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors"
					>
						Reopen
					</button>
				</form>
			{/if}
		</div>
	</div>
	<h1 class="font-newsreader text-[clamp(32px,4.8vw,52px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		{data.event.title}
	</h1>
	<p class="font-mono-system text-fade mt-[10px] text-[11px] font-bold tracking-[0.08em] uppercase">
		{formatDate(data.event.eventDate)}
	</p>
</header>

{#if form?.success}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.message}</p>
			{#if form.details}
				<ul class="font-mono-system mt-[8px] ml-4 list-disc text-[11px] font-bold tracking-[0.06em] uppercase" style="color: #d6eedf;">
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
{#if form?.error}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.error}</p>
		</div>
	</section>
{/if}

<!-- ============ TABS ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[16px]">
		<div class="flex gap-1 overflow-x-auto whitespace-nowrap">
			{#each [{ id: 'overview', label: 'Overview' }, { id: 'registrations', label: `Registrations · ${data.stats.totalTickets}` }, { id: 'import', label: 'Import CSV' }, { id: 'results', label: `Results · ${data.existingResults?.length || 0}` }, { id: 'decklists', label: `Decklists · ${data.existingDecklists?.length || 0}` }, { id: 'metagame', label: `Metagame · ${data.existingHeroes?.length || 0}` }, ...(data.isAdmin ? [{ id: 'staff', label: `Staff · ${data.assignedStaff?.length || 0}` }] : [])] as tab (tab.id)}
				<button
					onclick={() => setActiveTab(tab.id)}
					class="font-mono-system relative px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab === tab.id ? 'text-ink' : 'text-fade hover:text-ink'}"
				>
					{tab.label}
					{#if activeTab === tab.id}<span class="bg-warm absolute inset-x-[10px] bottom-0 h-[2px]"></span>{/if}
				</button>
			{/each}
		</div>
	</div>
</section>

<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">

		<!-- Tab Content -->

		<!-- Overview Tab -->
		{#if activeTab === 'overview'}
			<!-- Stat Strip -->
			<div class="border-ink border-[1.5px] mb-[24px] overflow-hidden">
				<div class="grid grid-cols-2 divide-x divide-line2 {data.isAdmin ? 'md:grid-cols-3' : ''}">
					{#if data.isAdmin}
						<div class="p-5">
							<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Total Revenue</span>
							<div class="font-archivo text-prem mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
								${data.stats.totalRevenue}
							</div>
							<span class="font-mono-system text-fade mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase">
								before refunds
							</span>
						</div>
					{/if}
					<div class="p-5">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Tickets Sold</span>
						<div class="font-archivo text-ink mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
							{data.stats.totalTickets}
						</div>
						{#if data.event.playerCap}
							<span class="font-mono-system text-fade mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase">
								of {data.event.playerCap} cap
							</span>
						{:else}
							<span class="font-mono-system text-fade mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase">
								no cap
							</span>
						{/if}
					</div>
					<div class="p-5">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Refunds</span>
						<div class="font-archivo {data.stats.totalRefunded > 0 ? 'text-warm' : 'text-ink'} mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
							{data.stats.totalRefunded}
						</div>
						<span class="font-mono-system text-fade mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase">
							refunded tickets
						</span>
					</div>
				</div>
			</div>

			<!-- Event Details -->
			<div class="border-ink border-[1.5px] overflow-hidden">
				<div class="border-line2 border-b p-5 flex items-center justify-between gap-3">
					<div>
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Event Details
						</span>
						<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
							Configuration.
						</h2>
					</div>
					<button
						onclick={() => (isEditMode = !isEditMode)}
						class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[14px] py-[8px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
					>
						{isEditMode ? 'Cancel' : 'Edit'}
					</button>
				</div>

				{#if isEditMode}
					<form method="POST" action="?/updateEvent" class="p-5 space-y-[18px]">
						<div class="grid grid-cols-1 gap-[16px] md:grid-cols-2">
							<div>
								<label for="title" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
									Event Name <span class="text-warm">*</span>
								</label>
								<input type="text" id="title" name="title" required value={data.event.title}
									class="border-ink bg-paper-bg text-ink font-newsreader w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none" />
							</div>
							<div>
								<label for="location" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
									Venue Name <span class="text-warm">*</span>
								</label>
								<input type="text" id="location" name="location" required value={data.event.location}
									class="border-ink bg-paper-bg text-ink font-newsreader w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none" />
							</div>
							<div>
								<label for="address" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Address</label>
								<input type="text" id="address" name="address" value={data.event.address || ''}
									class="border-ink bg-paper-bg text-ink font-newsreader w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none" />
							</div>
							<div>
								<label for="format" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
									Format <span class="text-warm">*</span>
								</label>
								<select id="format" name="format" required
									class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none">
									{#each formats as format}
										<option value={format} selected={data.event.format === format}>{format}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="circuit" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Circuit</label>
								<select id="circuit" name="circuit"
									class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none">
									<option value="">No circuit</option>
									{#each circuits as circuit}
										<option value={circuit} selected={data.event.circuit === circuit}>{circuit}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="month" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Month</label>
								<select id="month" name="month"
									class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none">
									<option value="">Select month</option>
									{#each months as month}
										<option value={month} selected={data.event.month === month}>{month}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="eventDate" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
									Event Date & Time <span class="text-warm">*</span>
								</label>
								<input type="datetime-local" id="eventDate" name="eventDate" required value={formatDateForInput(data.event.eventDate)}
									class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none" />
							</div>
							<div>
								<label for="price" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
									Entry Fee ($) <span class="text-warm">*</span>
									{#if data.isTournamentStaff}<span class="text-fade normal-case tracking-normal italic">(read-only)</span>{/if}
								</label>
								<input type="number" id="price" name="price" required min="0" step="0.01" value={data.event.price} disabled={data.isTournamentStaff}
									class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none {data.isTournamentStaff ? 'cursor-not-allowed opacity-60' : ''}" />
							</div>
						</div>

						<div>
							<label for="description" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Description</label>
							<textarea id="description" name="description" rows="3" value={data.event.description || ''}
								class="border-ink bg-paper-bg text-ink font-newsreader w-full border-[1.5px] px-[14px] py-[10px] text-[15px] leading-[1.5] focus:outline-none"></textarea>
						</div>

						<div class="border-line2 border-t pt-[16px] flex flex-wrap gap-[18px]">
							<label class="flex cursor-pointer items-center gap-2">
								<input type="checkbox" id="gemIdRequired" name="gemIdRequired" bind:checked={gemIdRequired}
									class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-ink)]" />
								<span class="font-newsreader text-[14px] font-semibold">GEM ID Required</span>
							</label>
							<label class="flex cursor-pointer items-center gap-2">
								<input type="checkbox" id="premiumDiscount" name="premiumDiscount" bind:checked={premiumDiscount}
									class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-prem)]" />
								<span class="font-newsreader text-[14px] font-semibold">Premium Discount</span>
							</label>
							<div class="flex items-center gap-3">
								<label class="flex cursor-pointer items-center gap-2">
									<input type="checkbox" bind:checked={hasPlayerCap}
										class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-warm)]" />
									<span class="font-newsreader text-[14px] font-semibold">Player Cap</span>
								</label>
								{#if hasPlayerCap}
									<input type="number" name="playerCap" min="1" bind:value={playerCapValue} placeholder="e.g., 32"
										class="border-ink bg-paper-bg text-ink font-mono-system w-[100px] border-[1.5px] px-[10px] py-[6px] text-[12px] focus:outline-none" />
								{/if}
							</div>
						</div>

						<div class="border-line2 border-t pt-[16px] flex gap-3">
							<button type="button" onclick={() => (isEditMode = false)}
								class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[18px] py-[11px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors">
								Cancel
							</button>
							<button type="submit"
								class="bg-ink font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125">
								Save Changes →
							</button>
						</div>
					</form>
				{:else}
					<dl class="grid grid-cols-1 gap-0 md:grid-cols-3">
						<div class="border-line2 border-b border-r p-5">
							<dt class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Location</dt>
							<dd class="font-newsreader mt-[6px] text-[16px] font-semibold">{data.event.location || 'N/A'}</dd>
							{#if data.event.address}
								<dd class="text-fade mt-[2px] text-[12px]">{data.event.address}</dd>
							{/if}
						</div>
						<div class="border-line2 border-b border-r p-5">
							<dt class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Format</dt>
							<dd class="font-newsreader mt-[6px] text-[16px] font-semibold">{data.event.format || 'N/A'}</dd>
						</div>
						<div class="border-line2 border-b p-5">
							{#if data.event.circuit}
								<dt class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Circuit</dt>
								<dd class="font-newsreader mt-[6px] text-[16px] font-semibold">{data.event.circuit}</dd>
								{#if data.event.month}
									<dd class="font-mono-system text-fade mt-[2px] text-[10px] font-bold tracking-[0.06em] uppercase">{data.event.month}</dd>
								{/if}
							{:else}
								<dt class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Entry Fee</dt>
								<dd class="font-archivo text-prem mt-[6px] text-[20px] font-extrabold tracking-[-0.01em]">
									${parseFloat(data.event.price).toFixed(2)}
								</dd>
							{/if}
						</div>
						{#if data.event.circuit}
							<div class="border-line2 border-b border-r p-5 md:col-span-3">
								<dt class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Entry Fee</dt>
								<dd class="font-archivo text-prem mt-[6px] text-[20px] font-extrabold tracking-[-0.01em]">
									${parseFloat(data.event.price).toFixed(2)}
								</dd>
							</div>
						{/if}
						<div class="p-5 md:col-span-3">
							<dt class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Settings</dt>
							<dd class="mt-[10px] flex flex-wrap gap-[8px]">
								<span class="font-mono-system inline-flex items-center gap-[6px] px-[10px] py-[5px] text-[10px] font-bold tracking-[0.1em] uppercase {data.event.gemIdRequired ? 'bg-accent text-white' : 'border-line2 text-fade border'}">
									{data.event.gemIdRequired ? '✓' : '—'} GEM ID Required
								</span>
								<span class="font-mono-system inline-flex items-center gap-[6px] px-[10px] py-[5px] text-[10px] font-bold tracking-[0.1em] uppercase {data.event.premiumDiscount ? 'bg-prem text-white' : 'border-line2 text-fade border'}">
									{data.event.premiumDiscount ? '✓' : '—'} Premium Discount
								</span>
								{#if data.event.playerCap}
									<span class="font-mono-system bg-warm inline-flex items-center px-[10px] py-[5px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
										Cap · {data.event.playerCap} players
									</span>
								{/if}
							</dd>
						</div>
						{#if data.event.description}
							<div class="border-line2 border-t p-5 md:col-span-3">
								<dt class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Description</dt>
								<dd class="font-newsreader text-soft mt-[8px] text-[16px] leading-[1.55]">
									{data.event.description}
								</dd>
							</div>
						{/if}
					</dl>
				{/if}
			</div>

			<!-- Danger zone -->
			{#if data.isAdmin}
				<div class="border-warm mt-[24px] border-[1.5px] p-5 flex flex-wrap items-center justify-between gap-3">
					<div>
						<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Danger Zone
						</span>
						<p class="text-soft mt-[4px] text-[13px] leading-[1.5]">
							Permanently delete this event and all its tickets, results, decklists, and staff assignments.
						</p>
					</div>
					<button
						type="button"
						onclick={() => (showDeleteConfirm = true)}
						class="bg-warm font-mono-system inline-flex items-center px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-110"
					>
						Delete Event
					</button>
				</div>
			{/if}
		{/if}

		<!-- Registrations Tab -->
		{#if activeTab === 'registrations'}
			<div class="border-ink border-[1.5px] overflow-hidden">
				<div class="border-line2 border-b p-5 flex flex-wrap items-center justify-between gap-3">
					<div>
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Registered Players
						</span>
						<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
							The roster.
						</h2>
					</div>
					<span class="font-mono-system bg-ink inline-flex items-center px-[10px] py-[5px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
						{data.tickets.length}{#if data.event.playerCap}/{data.event.playerCap}{/if} players
					</span>
				</div>

				{#if data.tickets.length === 0}
					<div class="p-12 text-center">
						<p class="font-newsreader text-soft text-[19px] italic">No tickets sold yet.</p>
						<p class="text-fade mt-2 text-[13px]">Registrations will appear here.</p>
					</div>
				{:else}
					<!-- Mobile Card View -->
					<div class="lg:hidden">
						{#each sortedTickets as ticket}
							<div class="border-line2 border-b p-4 last:border-b-0 {ticket.refunded ? 'bg-panel' : ''}">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="font-newsreader truncate text-[16px] font-semibold">
											{ticket.firstName || 'N/A'} {ticket.lastName || 'N/A'}
										</div>
										<div class="mt-1 flex items-center gap-2">
											<code class="font-mono-system text-warm text-[11px] font-bold tracking-[0.04em] truncate">
												{ticket.gemId || 'N/A'}
											</code>
											{#if ticket.gemId && ticket.gemId !== 'N/A'}
												<button
													type="button"
													onclick={(e) => copyGemId(ticket.gemId, e)}
													class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors"
													title="Copy GEM ID"
												>
													{copiedGemId === ticket.gemId ? 'Copied' : 'Copy'}
												</button>
											{/if}
										</div>
									</div>
									<span class="font-mono-system inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase {ticket.refunded ? 'bg-warm text-white' : 'bg-prem text-white'}">
										{ticket.refunded ? 'Refunded' : 'Paid'}
									</span>
								</div>
								<div class="border-line2 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
									<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.06em] uppercase">
										{formatShortDate(ticket.createdAt)}
									</span>
									<div class="flex items-center gap-2">
										<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">In GEM:</span>
										<button
											type="button"
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId]);
											}}
											disabled={gemEntryLoading[ticket.ticketId]}
											class="relative inline-flex h-[20px] w-[36px] items-center border {gemEntryStatus[ticket.ticketId] ? 'bg-prem border-prem' : 'bg-line2 border-line2'} transition-colors {gemEntryLoading[ticket.ticketId] ? 'opacity-50' : ''}"
											aria-label="Toggle entered into Gem"
										>
											<span class="inline-block h-[14px] w-[14px] bg-white transition-transform {gemEntryStatus[ticket.ticketId] ? 'translate-x-[19px]' : 'translate-x-[2px]'}"></span>
										</button>
									</div>
									{#if !ticket.refunded}
										<form method="POST" action="?/refund" onsubmit={(e) => { if (!confirmRefund(ticket.ticketCode)) e.preventDefault(); }} class="ml-auto">
											<input type="hidden" name="ticketId" value={ticket.ticketId} />
											<button type="submit" class="bg-warm font-mono-system inline-flex items-center px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]">
												Refund
											</button>
										</form>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<!-- Desktop Table View -->
					<div class="hidden lg:block overflow-x-auto">
						<table class="w-full">
							<thead class="border-line2 border-b-[1.5px]">
								<tr class="text-left">
									{#each [{ id: 'firstName', label: 'First Name' }, { id: 'lastName', label: 'Last Name' }, { id: 'gemId', label: 'GEM ID' }, { id: 'createdAt', label: 'Purchased' }, { id: 'status', label: 'Status' }, { id: 'enteredIntoGem', label: 'In GEM' }] as col (col.id)}
										<th class="px-4 py-[12px]">
											<button
												onclick={() => sortBy(col.id)}
												class="font-mono-system inline-flex items-center gap-1 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {sortColumn === col.id ? 'text-ink' : 'text-fade hover:text-ink'}"
											>
												{col.label}
												{#if sortColumn === col.id}
													<span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
												{/if}
											</button>
										</th>
									{/each}
									<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each sortedTickets as ticket (ticket.ticketId)}
									<tr class="border-line2 hover:bg-panel border-b transition-colors {ticket.refunded ? 'bg-panel' : ''}">
										<td class="font-newsreader px-4 py-[12px] text-[15px] font-semibold">{ticket.firstName || 'N/A'}</td>
										<td class="font-newsreader px-4 py-[12px] text-[15px] font-semibold">{ticket.lastName || 'N/A'}</td>
										<td class="px-4 py-[12px]">
											<div class="inline-flex items-center gap-2">
												<code class="font-mono-system text-warm text-[12px] font-bold tracking-[0.04em]">
													{ticket.gemId || 'N/A'}
												</code>
												{#if ticket.gemId && ticket.gemId !== 'N/A'}
													<button
														type="button"
														onclick={(e) => copyGemId(ticket.gemId, e)}
														class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors"
														title="Copy GEM ID"
													>
														{copiedGemId === ticket.gemId ? '✓' : 'Copy'}
													</button>
												{/if}
											</div>
										</td>
										<td class="font-mono-system text-fade px-4 py-[12px] text-[10.5px] font-bold tracking-[0.06em] uppercase">
											{formatShortDate(ticket.createdAt)}
										</td>
										<td class="px-4 py-[12px]">
											<span class="font-mono-system inline-flex items-center px-[9px] py-[3px] text-[10px] font-bold tracking-[0.1em] uppercase {ticket.refunded ? 'bg-warm text-white' : 'bg-prem text-white'}">
												{ticket.refunded ? 'Refunded' : 'Paid'}
											</span>
										</td>
										<td class="px-4 py-[12px]">
											<button
												type="button"
												onclick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId]);
												}}
												disabled={gemEntryLoading[ticket.ticketId]}
												class="relative inline-flex h-[22px] w-[40px] items-center border {gemEntryStatus[ticket.ticketId] ? 'bg-prem border-prem' : 'bg-line2 border-line2'} transition-colors {gemEntryLoading[ticket.ticketId] ? 'opacity-50' : ''}"
												aria-label="Toggle entered into Gem"
											>
												<span class="inline-block h-[16px] w-[16px] bg-white transition-transform {gemEntryStatus[ticket.ticketId] ? 'translate-x-[21px]' : 'translate-x-[2px]'}"></span>
											</button>
										</td>
										<td class="px-4 py-[12px] text-right">
											{#if !ticket.refunded}
												<form method="POST" action="?/refund" onsubmit={(e) => { if (!confirmRefund(ticket.ticketCode)) e.preventDefault(); }} class="inline-block">
													<input type="hidden" name="ticketId" value={ticket.ticketId} />
													<button type="submit" class="bg-warm font-mono-system inline-flex items-center px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]">
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
			<div class="mx-auto max-w-4xl">
				{#if isCompleted}
					<div class="border-warm border-[1.5px] p-8 text-center">
						<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Event Finalized
						</span>
						<h2 class="font-newsreader mt-[6px] text-[26px] font-semibold tracking-[-0.01em]">
							Locked.
						</h2>
						<p class="font-newsreader text-soft mt-[10px] text-[16px] italic">
							This event is finalized. Reopen from the Finalize tab to import new results.
						</p>
					</div>
				{:else}
					{#if form?.processedResults}
						<div class="border-ink bg-prem mb-[24px] border-[1.5px] p-6 text-white">
							<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">
								Success
							</span>
							<h3 class="font-newsreader mt-[4px] text-[22px] font-semibold">
								Results imported.
							</h3>
							<div class="mt-[16px] grid grid-cols-2 gap-[14px] sm:grid-cols-4">
								<div class="border border-white/30 p-3 text-center">
									<div class="font-archivo text-[24px] font-extrabold tracking-[-0.02em]">
										{form.processedResults.totalPlayers}
									</div>
									<span class="font-mono-system mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase" style="color: #d6eedf;">
										Players
									</span>
								</div>
								<div class="border border-white/30 p-3 text-center">
									<div class="font-archivo text-[24px] font-extrabold tracking-[-0.02em]">
										{form.processedResults.totalRounds}
									</div>
									<span class="font-mono-system mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase" style="color: #d6eedf;">
										Rounds
									</span>
								</div>
								<div class="border border-white/30 p-3 text-center">
									<div class="font-archivo text-[24px] font-extrabold tracking-[-0.02em]">
										{form.processedResults.totalPointsDistributed}
									</div>
									<span class="font-mono-system mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase" style="color: #d6eedf;">
										AGE Points
									</span>
								</div>
								<div class="border border-white/30 p-3 text-center">
									<div class="font-archivo text-[24px] font-extrabold tracking-[-0.02em]">
										${form.processedResults.totalPrizeDistributed}
									</div>
									<span class="font-mono-system mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase" style="color: #d6eedf;">
										Prize Pool
									</span>
								</div>
							</div>
							<button
								onclick={() => setActiveTab('results')}
								class="bg-white text-prem font-mono-system mt-[18px] inline-flex items-center px-[16px] py-[9px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-[filter] hover:brightness-95"
							>
								Review Results →
							</button>
						</div>
					{/if}

					<div class="border-ink border-[1.5px] overflow-hidden">
						<div class="border-line2 border-b p-5">
							<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
								Import Tournament Results
							</span>
							<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
								GEM CSV upload.
							</h2>
							<p class="text-soft mt-[6px] text-[13px] leading-[1.5]">
								Upload GEM CSV exports to calculate standings and record matches.
							</p>
						</div>
						<form method="POST" action="?/processCSV" enctype="multipart/form-data" class="p-5 space-y-[18px]">
							<div class="grid gap-[14px] sm:grid-cols-2">
								<!-- Swiss Standings -->
								<div class="border-line2 border-dashed hover:border-ink bg-panel border-[1.5px] p-4 transition-colors {swissStandingsFile && swissStandingsFile.length > 0 ? 'border-prem bg-prem/10' : ''}">
									<input type="file" id="swissStandings" name="swissStandings" accept=".csv" required bind:files={swissStandingsFile} class="sr-only" />
									<label for="swissStandings" class="flex cursor-pointer items-center gap-3">
										<span class="font-mono-system inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center text-[13px] font-extrabold {swissStandingsFile && swissStandingsFile.length > 0 ? 'bg-prem text-white' : 'border-line2 text-fade border'}">
											{swissStandingsFile && swissStandingsFile.length > 0 ? '✓' : '01'}
										</span>
										<div class="min-w-0 flex-1">
											<div class="font-newsreader text-[15px] font-semibold">
												Swiss Standings <span class="text-warm">*</span>
											</div>
											{#if swissStandingsFile && swissStandingsFile.length > 0}
												<p class="font-mono-system text-prem mt-[2px] truncate text-[11px] font-bold tracking-[0.02em]">
													{swissStandingsFile[0].name}
												</p>
											{:else}
												<p class="text-fade mt-[2px] text-[12px]">Click to select CSV</p>
											{/if}
										</div>
									</label>
								</div>

								<!-- Pairings -->
								<div class="border-line2 border-dashed hover:border-ink bg-panel border-[1.5px] p-4 transition-colors {pairingsFile && pairingsFile.length > 0 ? 'border-prem bg-prem/10' : ''}">
									<input type="file" id="pairings" name="pairings" accept=".csv" required bind:files={pairingsFile} class="sr-only" />
									<label for="pairings" class="flex cursor-pointer items-center gap-3">
										<span class="font-mono-system inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center text-[13px] font-extrabold {pairingsFile && pairingsFile.length > 0 ? 'bg-prem text-white' : 'border-line2 text-fade border'}">
											{pairingsFile && pairingsFile.length > 0 ? '✓' : '02'}
										</span>
										<div class="min-w-0 flex-1">
											<div class="font-newsreader text-[15px] font-semibold">
												Pairings Data <span class="text-warm">*</span>
											</div>
											{#if pairingsFile && pairingsFile.length > 0}
												<p class="font-mono-system text-prem mt-[2px] truncate text-[11px] font-bold tracking-[0.02em]">
													{pairingsFile[0].name}
												</p>
											{:else}
												<p class="text-fade mt-[2px] text-[12px]">Click to select CSV</p>
											{/if}
										</div>
									</label>
								</div>
							</div>

							{#if data.existingResults && data.existingResults.length > 0}
								<div class="border-warm bg-warm/10 border-[1.5px] p-3">
									<p class="font-mono-system text-warm text-[10.5px] font-bold tracking-[0.08em] uppercase">
										Warning · will replace {data.existingResults.length} existing results
									</p>
								</div>
							{/if}

							<button
								type="submit"
								disabled={csvProcessing || !swissStandingsFile || !pairingsFile}
								class="bg-ink font-mono-system flex w-full items-center justify-center gap-2 px-[22px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
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
			<div class="border-ink border-[1.5px] overflow-hidden">
				<div class="border-line2 border-b p-5 flex flex-wrap items-center justify-between gap-3">
					<div>
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Tournament Results
						</span>
						<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
							The final standings.
						</h2>
					</div>
					{#if sortedResults.length > 0}
						<span class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.08em] uppercase">
							{sortedResults.length} players · {data.existingMatches?.length || 0} matches
						</span>
					{/if}
				</div>

				{#if sortedResults.length === 0}
					<div class="p-12 text-center">
						<p class="font-newsreader text-soft text-[19px] italic">No results recorded yet.</p>
						<p class="text-fade mt-2 text-[13px]">
							Import tournament CSV files to see results here.
						</p>
					</div>
				{:else}
					<!-- Mobile -->
					<div class="lg:hidden">
						{#each sortedResults as result (result.playerName + result.placement)}
							<div class="border-line2 flex items-start gap-3 border-b p-4 last:border-b-0">
								<span class="font-mono-system inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center text-[13px] font-extrabold {result.placement === 1 ? 'bg-warm text-white' : result.placement <= 3 ? 'bg-ink text-white' : 'border-line2 text-fade border'}">
									{result.placement}
								</span>
								<div class="min-w-0 flex-1">
									<div class="font-newsreader truncate text-[16px] font-semibold">
										{result.playerName}
									</div>
									<div class="mt-[3px] flex items-center gap-2">
										<code class="font-mono-system text-warm text-[11px] font-bold tracking-[0.04em]">
											{result.gemId || '—'}
										</code>
										{#if result.gemId && result.gemId !== '-'}
											<button
												type="button"
												onclick={(e) => copyGemId(result.gemId, e)}
												class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors"
												title="Copy GEM ID"
											>
												{copiedGemId === result.gemId ? '✓' : 'Copy'}
											</button>
										{/if}
									</div>
									<div class="mt-[10px] flex flex-wrap items-center gap-x-4 gap-y-1">
										<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
											Record <span class="text-ink font-archivo text-[12px] tracking-[-0.01em]">
												{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}
											</span>
										</span>
										<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
											AGE Pts <span class="text-accent font-archivo text-[12px] tracking-[-0.01em]">{result.agePoints}</span>
										</span>
										{#if result.prizeAmount}
											<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
												Prize <span class="text-prem font-archivo text-[12px] tracking-[-0.01em]">${result.prizeAmount}</span>
											</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Desktop -->
					<div class="hidden lg:block overflow-x-auto">
						<table class="w-full">
							<thead class="border-line2 border-b-[1.5px]">
								<tr class="text-left">
									<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Place</th>
									<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Player</th>
									<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">GEM ID</th>
									<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Record</th>
									<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">AGE Pts</th>
									<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Prize</th>
								</tr>
							</thead>
							<tbody>
								{#each sortedResults as result (result.playerName + result.placement)}
									<tr class="border-line2 hover:bg-panel border-b transition-colors">
										<td class="px-4 py-[12px]">
											<span class="font-mono-system inline-flex h-[28px] w-[28px] items-center justify-center text-[11px] font-extrabold {result.placement === 1 ? 'bg-warm text-white' : result.placement <= 3 ? 'bg-ink text-white' : 'border-line2 text-fade border'}">
												{result.placement}
											</span>
										</td>
										<td class="font-newsreader px-4 py-[12px] text-[15px] font-semibold">{result.playerName}</td>
										<td class="px-4 py-[12px]">
											<div class="inline-flex items-center gap-2">
												<code class="font-mono-system text-warm text-[12px] font-bold tracking-[0.04em]">
													{result.gemId || '—'}
												</code>
												{#if result.gemId && result.gemId !== '-'}
													<button
														type="button"
														onclick={(e) => copyGemId(result.gemId, e)}
														class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors"
														title="Copy GEM ID"
													>
														{copiedGemId === result.gemId ? '✓' : 'Copy'}
													</button>
												{/if}
											</div>
										</td>
										<td class="font-archivo text-ink px-4 py-[12px] text-[15px] font-extrabold tracking-[-0.01em]">
											{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}
										</td>
										<td class="font-archivo text-accent px-4 py-[12px] text-right text-[15px] font-extrabold tracking-[-0.01em]">
											{result.agePoints}
										</td>
										<td class="font-archivo text-prem px-4 py-[12px] text-right text-[15px] font-extrabold tracking-[-0.01em]">
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
			<div class="space-y-[24px]">
				<div class="flex flex-wrap items-baseline justify-between gap-3">
					<div>
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Decklists
						</span>
						<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
							The bring-list.
						</h2>
					</div>
					{#if !isCompleted}
						<button
							onclick={startNewDecklist}
							class="bg-ink font-mono-system inline-flex items-center px-[14px] py-[9px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
						>
							+ Add Decklist
						</button>
					{/if}
				</div>

				<!-- Decklist Form Modal -->
				{#if showDecklistForm}
					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							{editingDecklist ? 'Edit Decklist' : 'New Decklist'}
						</span>
						<h3 class="font-newsreader mb-[18px] mt-[4px] text-[20px] font-semibold tracking-[-0.01em]">
							{editingDecklist ? editingDecklist.playerName : 'Details.'}
						</h3>

						{#if data.participants.length > 0 && !editingDecklist}
							<div class="mb-[16px]">
								<label for="participantSearchInput" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
									Select from Registered Players
								</label>
								<div class="relative">
									<input
										type="text"
										id="participantSearchInput"
										bind:value={participantSearch}
										onfocus={() => (showParticipantDropdown = true)}
										placeholder="Search by name or GEM ID"
										class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
									/>
									{#if participantSearch}
										<button
											type="button"
											onclick={() => { participantSearch = ''; }}
											aria-label="Clear search"
											class="text-fade hover:text-ink absolute top-1/2 right-3 -translate-y-1/2 text-[14px]"
										>
											×
										</button>
									{/if}
									{#if showParticipantDropdown}
										<div class="border-ink bg-paper-bg absolute z-10 mt-1 max-h-48 w-full overflow-auto border-[1.5px] shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
											{#if filteredParticipants.length === 0}
												<div class="text-fade font-newsreader px-4 py-3 text-[14px] italic">
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
														class="hover:bg-panel flex w-full items-center justify-between gap-2 px-[14px] py-[8px] text-left transition-colors"
													>
														<span class="font-newsreader text-[14px] font-semibold">{participant.playerName}</span>
														{#if participant.gemId}
															<code class="font-mono-system text-warm text-[11px] font-bold tracking-[0.04em]">
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
								<p class="font-mono-system text-fade mt-[8px] text-[10px] font-bold tracking-[0.08em] uppercase">
									Or enter details manually below
								</p>
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

							<div class="grid grid-cols-1 gap-[16px] md:grid-cols-2">
								<div>
									<label for="deckPlayerName" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
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
										class="border-ink bg-paper-bg text-ink font-newsreader w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
									/>
									<datalist id="participantNames">
										{#each data.participants as participant (participant.id || participant.playerName)}
											<option value={participant.playerName}></option>
										{/each}
									</datalist>
								</div>
								<div>
									<label for="deckGemId" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
										GEM ID
									</label>
									<input
										type="text"
										id="deckGemId"
										name="gemId"
										bind:value={decklistForm.gemId}
										list="participantGemIds"
										autocomplete="off"
										class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
									/>
									<datalist id="participantGemIds">
										{#each data.participants.filter((p) => p.gemId) as participant (participant.gemId)}
											<option value={participant.gemId}>{participant.playerName}</option>
										{/each}
									</datalist>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-[16px] md:grid-cols-3">
								<!-- Hero -->
								<div class="relative">
									<label for="heroSearch" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
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
											class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
										/>
										{#if heroSearch}
											<button
												type="button"
												onclick={() => { heroSearch = ''; decklistForm.hero = ''; }}
												class="text-fade hover:text-ink absolute top-1/2 right-3 -translate-y-1/2 text-[14px]"
												aria-label="Clear hero search"
											>
												×
											</button>
										{/if}
									</div>
									{#if showHeroDropdown}
										<div class="border-ink bg-paper-bg absolute z-20 mt-1 max-h-48 w-full overflow-auto border-[1.5px] shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
											{#if filteredHeroes.length === 0}
												<div class="text-fade font-newsreader px-4 py-3 text-[14px] italic">
													No matching heroes
												</div>
											{:else}
												{#each filteredHeroes.slice(0, 20) as hero (hero.name)}
													<button
														type="button"
														onclick={() => selectHero(hero.name)}
														class="hover:bg-panel font-newsreader w-full px-[14px] py-[7px] text-left text-[14px] transition-colors"
													>
														{hero.name}
													</button>
												{/each}
												{#if filteredHeroes.length > 20}
													<div class="border-line2 text-fade font-mono-system border-t px-4 py-2 text-[10px] font-bold tracking-[0.06em] uppercase">
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
									<label for="placement" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
										Placement
									</label>
									<select
										id="placement"
										name="placement"
										bind:value={decklistForm.placement}
										class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none"
									>
										<option value="">Select…</option>
										<option value="1">1st Place</option>
										<option value="2">2nd Place</option>
										<option value="3">3rd Place</option>
										<option value="4">4th Place</option>
										<option value="5">5th Place</option>
										<option value="6">6th Place</option>
										<option value="7">7th Place</option>
										<option value="8">8th Place</option>
									</select>
								</div>

								<div>
									<label for="deckFormat" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
										Format
									</label>
									<select
										id="deckFormat"
										name="format"
										bind:value={decklistForm.format}
										class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none"
									>
										{#each formats as fmt (fmt)}
											<option value={fmt}>{fmt}</option>
										{/each}
									</select>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-[24px] lg:grid-cols-2">
								<!-- Cards Textarea -->
								<div>
									<label for="cardsText" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
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
										class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[12px] leading-[1.5] focus:outline-none"
									></textarea>
									<p class="font-mono-system text-fade mt-[8px] text-[10px] font-bold tracking-[0.08em] uppercase">
										Paste decklist directly from GEM export
									</p>
								</div>

								<!-- Live Preview -->
								<div>
									<span class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
										Preview
									</span>
									<div class="border-ink bg-panel h-[400px] overflow-auto border-[1.5px] p-4">
										{#if decklistPreview.totals.total === 0}
											<p class="font-newsreader text-soft text-[15px] italic">
												Paste a decklist to see preview…
											</p>
										{:else}
											<div class="space-y-[16px]">
												{#if decklistPreview.equipment.length > 0}
													<div>
														<h4 class="font-mono-system text-fade mb-[8px] text-[10px] font-extrabold tracking-[0.14em] uppercase">
															Equipment · {decklistPreview.totals.equipment}
														</h4>
														<div class="space-y-[3px]">
															{#each decklistPreview.equipment as card, i (card.name + i)}
																<div class="font-newsreader flex justify-between text-[13px]">
																	<span>{card.name}</span>
																	<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em]">{card.quantity}</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}
												{#if decklistPreview.red.length > 0}
													<div>
														<h4 class="font-mono-system text-warm mb-[8px] text-[10px] font-extrabold tracking-[0.14em] uppercase">
															Red · {decklistPreview.totals.red}
														</h4>
														<div class="space-y-[3px]">
															{#each decklistPreview.red as card, i (card.name + i)}
																<div class="font-newsreader flex justify-between text-[13px]">
																	<span>{card.name}</span>
																	<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em]">{card.quantity}</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}
												{#if decklistPreview.yellow.length > 0}
													<div>
														<h4 class="font-mono-system text-accent mb-[8px] text-[10px] font-extrabold tracking-[0.14em] uppercase">
															Yellow · {decklistPreview.totals.yellow}
														</h4>
														<div class="space-y-[3px]">
															{#each decklistPreview.yellow as card, i (card.name + i)}
																<div class="font-newsreader flex justify-between text-[13px]">
																	<span>{card.name}</span>
																	<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em]">{card.quantity}</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}
												{#if decklistPreview.blue.length > 0}
													<div>
														<h4 class="font-mono-system text-prem mb-[8px] text-[10px] font-extrabold tracking-[0.14em] uppercase">
															Blue · {decklistPreview.totals.blue}
														</h4>
														<div class="space-y-[3px]">
															{#each decklistPreview.blue as card, i (card.name + i)}
																<div class="font-newsreader flex justify-between text-[13px]">
																	<span>{card.name}</span>
																	<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em]">{card.quantity}</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}
												<div class="border-line2 border-t pt-[10px]">
													<div class="flex justify-between">
														<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">Total Cards</span>
														<span class="font-archivo text-ink text-[15px] font-extrabold tracking-[-0.01em]">
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
									class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-warm)]"
								/>
								<span class="font-newsreader text-[14px] font-semibold">
									Make this decklist public
								</span>
							</label>

							<div class="border-line2 border-t pt-[16px] flex justify-end gap-3">
								<button
									type="button"
									onclick={cancelDecklistForm}
									class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[18px] py-[11px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									class="bg-ink font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
								>
									Save Decklist →
								</button>
							</div>
						</form>
					</div>
				{/if}

				<!-- Decklists Grid -->
				<div class="grid grid-cols-1 gap-[16px] md:grid-cols-2 lg:grid-cols-3">
					{#if data.existingDecklists?.length === 0}
						<div class="border-ink col-span-full border-[1.5px] p-12 text-center">
							<p class="font-newsreader text-soft text-[19px] italic">No decklists recorded yet.</p>
							{#if !isCompleted}
								<button
									onclick={startNewDecklist}
									class="font-mono-system text-warm hover:text-ink mt-4 text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
								>
									Add the first decklist →
								</button>
							{/if}
						</div>
					{:else}
						{#each data.existingDecklists.sort((a, b) => (a.placement || 99) - (b.placement || 99)) as decklist (decklist.id)}
							<div class="border-ink border-[1.5px] p-4 overflow-hidden">
								<div class="mb-[10px] flex items-start justify-between">
									<div class="flex items-start gap-3">
										{#if decklist.placement}
											<span class="font-mono-system inline-flex h-[28px] w-[28px] items-center justify-center text-[11px] font-extrabold {decklist.placement === 1 ? 'bg-warm text-white' : decklist.placement <= 3 ? 'bg-ink text-white' : 'border-line2 text-fade border'}">
												{decklist.placement}
											</span>
										{/if}
										<div>
											<h4 class="font-newsreader text-[16px] font-semibold">{decklist.playerName}</h4>
											{#if decklist.hero}
												<p class="font-mono-system text-warm mt-[2px] text-[11px] font-bold tracking-[0.06em] uppercase">
													{decklist.hero}
												</p>
											{/if}
										</div>
									</div>
									{#if !isCompleted}
										<div class="flex gap-2">
											<button
												onclick={() => editDecklist(decklist)}
												class="font-mono-system text-fade hover:text-ink text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors"
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
												<button type="submit" class="font-mono-system text-warm hover:text-ink text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors">
													Del
												</button>
											</form>
										</div>
									{/if}
								</div>
								<div class="border-line2 flex items-center gap-2 border-t pt-[10px] font-mono-system text-fade text-[10px] font-bold tracking-[0.06em] uppercase">
									<span>{decklist.cards?.reduce((sum, c) => sum + c.quantity, 0) || 0} cards</span>
									<span>·</span>
									<span>{decklist.format || 'Unknown'}</span>
									{#if decklist.gemId}
										<span>·</span>
										<span class="text-warm">{decklist.gemId}</span>
									{/if}
								</div>
								{#if !decklist.isPublic}
									<span class="font-mono-system bg-warm mt-[8px] inline-block px-[7px] py-[2px] text-[9px] font-bold tracking-[0.1em] uppercase text-white">
										Private
									</span>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<!-- Metagame Tab -->
		{#if activeTab === 'metagame'}
			<div class="space-y-[24px]">
				<!-- Upload -->
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 border-b p-5">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Upload Hero Data
						</span>
						<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
							Hero roster.
						</h2>
						<p class="text-soft mt-[6px] text-[13px] leading-[1.5]">
							Import hero choices from the GEM export.
						</p>
					</div>

					<div class="p-5">
						{#if !data.event.circuit || !data.event.month}
							<div class="border-warm bg-warm/10 border-[1.5px] p-4">
								<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.14em] uppercase">
									Setup Required
								</span>
								<p class="text-soft mt-[6px] text-[13px] leading-[1.5]">
									Set the Circuit and Month in the Overview tab before uploading hero data.
								</p>
							</div>
						{:else}
							<form method="POST" action="?/uploadHeroes" enctype="multipart/form-data" class="space-y-[16px]">
								<div class="border-line2 border-dashed hover:border-ink bg-panel border-[1.5px] p-4 transition-colors {heroesFile && heroesFile.length > 0 ? 'border-prem bg-prem/10' : ''}">
									<input type="file" id="heroesFile" name="heroesFile" accept=".csv" required bind:files={heroesFile} class="sr-only" />
									<label for="heroesFile" class="flex cursor-pointer items-center gap-3">
										<span class="font-mono-system inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center text-[13px] font-extrabold {heroesFile && heroesFile.length > 0 ? 'bg-prem text-white' : 'border-line2 text-fade border'}">
											{heroesFile && heroesFile.length > 0 ? '✓' : 'CSV'}
										</span>
										<div class="min-w-0 flex-1">
											{#if heroesFile && heroesFile.length > 0}
												<p class="font-mono-system text-prem truncate text-[13px] font-bold tracking-[0.02em]">
													{heroesFile[0].name}
												</p>
											{:else}
												<div class="font-newsreader text-[15px] font-semibold">Heroes CSV</div>
												<p class="text-fade mt-[2px] text-[11px]">
													Player Name, Player ID, Country/Region, Hero
												</p>
											{/if}
										</div>
									</label>
								</div>

								{#if data.existingHeroes?.length > 0}
									<div class="border-warm bg-warm/10 border-[1.5px] p-3">
										<p class="font-mono-system text-warm text-[10.5px] font-bold tracking-[0.08em] uppercase">
											Warning · will replace {data.existingHeroes.length} existing entries
										</p>
									</div>
								{/if}

								<div class="flex gap-3">
									<button
										type="submit"
										disabled={heroesProcessing || !heroesFile}
										class="bg-ink font-mono-system inline-flex flex-1 items-center justify-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{heroesProcessing ? 'Processing…' : 'Upload Heroes →'}
									</button>
									{#if data.existingHeroes?.length > 0}
										<button
											type="submit"
											formaction="?/deleteHeroes"
											class="border-warm text-warm hover:bg-warm hover:text-white font-mono-system inline-flex items-center border px-[14px] py-[11px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
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
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 border-b p-5">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Metagame Breakdown
						</span>
						<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
							The field.
						</h2>
						<p class="font-mono-system text-fade mt-[6px] text-[10.5px] font-bold tracking-[0.08em] uppercase">
							{data.existingHeroes?.length || 0} players registered
						</p>
					</div>

					{#if !data.existingHeroes?.length}
						<div class="p-12 text-center">
							<p class="font-newsreader text-soft text-[19px] italic">No hero data uploaded yet.</p>
							<p class="text-fade mt-2 text-[13px]">
								Upload a heroes CSV to see the metagame breakdown.
							</p>
						</div>
					{:else}
						<div class="space-y-[14px] p-5">
							{#each heroBreakdown() as { hero, count, percentage }, idx (hero + idx)}
								<div class="flex items-center gap-4">
									<span class="font-mono-system text-fade w-[24px] text-right text-[11px] font-extrabold tracking-[0.06em]">
										{idx + 1}
									</span>
									<div class="min-w-0 flex-1">
										<div class="mb-[6px] flex items-baseline justify-between gap-3">
											<span class="font-newsreader truncate text-[15px] font-semibold">{hero}</span>
											<span class="font-mono-system text-fade shrink-0 text-[10.5px] font-bold tracking-[0.08em] uppercase">
												{count}
												<span class="text-warm">· {percentage}%</span>
											</span>
										</div>
										<div class="bg-line2 h-[6px]">
											<div class="bg-warm h-full" style="width: {percentage}%"></div>
										</div>
									</div>
								</div>
							{/each}
						</div>

						<div class="border-line2 border-t p-5">
							<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
								All Players
							</span>
							<div class="mt-[14px] grid max-h-96 grid-cols-1 gap-[8px] overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
								{#each data.existingHeroes.sort((a, b) => a.playerName.localeCompare(b.playerName)) as entry (entry.playerName + entry.hero)}
									<div class="border-line2 bg-panel flex items-center gap-2 border p-2">
										<span class="font-newsreader flex-1 truncate text-[13px] font-semibold">{entry.playerName}</span>
										<span class="font-mono-system text-warm truncate text-[10.5px] font-bold tracking-[0.04em] uppercase">
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
			<div class="space-y-[24px]">
				<!-- Assigned Staff -->
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 border-b p-5">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Assigned Staff
						</span>
						<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
							Who's on the desk.
						</h2>
					</div>
					<div class="p-5">
						{#if data.assignedStaff?.length > 0}
							<div class="space-y-[10px]">
								{#each data.assignedStaff as staff (staff.userId)}
									<div class="border-line2 flex items-center justify-between border p-4">
										<div class="flex items-center gap-3">
											<span class="border-ink font-newsreader flex h-[36px] w-[36px] items-center justify-center border-[1.5px] bg-panel text-[15px] font-semibold">
												{staff.userEmail?.charAt(0).toUpperCase() || '?'}
											</span>
											<div>
												<div class="font-newsreader text-[15px] font-semibold">{staff.userEmail}</div>
												<div class="font-mono-system text-fade mt-[2px] text-[10px] font-bold tracking-[0.06em] uppercase">
													Assigned {formatShortDate(staff.createdAt)}
												</div>
											</div>
										</div>
										<form method="POST" action="?/unassignStaff">
											<input type="hidden" name="staffId" value={staff.userId} />
											<button type="submit" class="bg-warm font-mono-system inline-flex items-center px-[12px] py-[7px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]">
												Remove
											</button>
										</form>
									</div>
								{/each}
							</div>
						{:else}
							<div class="p-8 text-center">
								<p class="font-newsreader text-soft text-[19px] italic">No staff assigned to this event.</p>
								<p class="text-fade mt-2 text-[13px]">
									Use the search below to assign tournament staff.
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Add Staff -->
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 border-b p-5">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
							Add Staff
						</span>
						<h2 class="font-newsreader mt-[4px] text-[22px] font-semibold tracking-[-0.01em]">
							Bring someone in.
						</h2>
						<p class="text-soft mt-[6px] text-[13px] leading-[1.5]">
							Search any user by email to assign them to this event.
						</p>
					</div>
					<div class="p-5">
						<div class="mb-[16px]">
							<label for="staff-search" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
								Search by Email
							</label>
							<div class="relative">
								<input
									id="staff-search"
									type="email"
									value={staffSearch}
									oninput={(e) => handleStaffSearchInput(e.target.value)}
									placeholder="Email address · min 3 characters"
									class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
								/>
								{#if staffSearchLoading}
									<div class="absolute top-1/2 right-3 -translate-y-1/2">
										<svg class="text-warm h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
										</svg>
									</div>
								{/if}
							</div>
							<p class="font-mono-system text-fade mt-[8px] text-[10px] font-bold tracking-[0.08em] uppercase">
								Type at least 3 characters
							</p>
						</div>

						{#if staffSearchResults.length > 0}
							<div class="max-h-64 space-y-[8px] overflow-y-auto">
								{#each staffSearchResults as userResult (userResult.id)}
									<form
										method="POST"
										action="?/assignStaff"
										use:enhance={handleStaffAssign}
										class="border-line2 hover:border-ink flex items-center justify-between border p-3 transition-colors"
									>
										<input type="hidden" name="staffId" value={userResult.id} />
										<div class="flex items-center gap-3">
											<span class="border-line2 font-newsreader flex h-[36px] w-[36px] items-center justify-center border bg-panel text-[15px] font-semibold">
												{userResult.email?.charAt(0).toUpperCase() || '?'}
											</span>
											<div>
												<div class="font-newsreader text-[15px] font-semibold">{userResult.email}</div>
												<div class="font-mono-system text-fade mt-[2px] text-[10px] font-bold tracking-[0.08em] uppercase">
													Role · {userResult.role || 'user'}
												</div>
											</div>
										</div>
										<button type="submit" class="bg-prem font-mono-system inline-flex items-center px-[14px] py-[7px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]">
											Assign
										</button>
									</form>
								{/each}
							</div>
						{:else if staffSearch.length >= 3 && !staffSearchLoading}
							<div class="p-6 text-center">
								<p class="font-newsreader text-soft text-[17px] italic">
									No users found matching "{staffSearch}".
								</p>
							</div>
						{:else if staffSearch.length === 0}
							<div class="p-6 text-center">
								<p class="font-newsreader text-soft text-[17px] italic">
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
		<div class="border-ink bg-paper-bg w-full max-w-md border-[3px] border-double shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
			<div class="border-line2 border-b p-6">
				<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Danger Zone
				</span>
				<h3 class="font-newsreader mt-[6px] text-[26px] font-semibold tracking-[-0.01em]">
					Delete this event?
				</h3>
				<p class="font-newsreader text-soft mt-[4px] text-[15px] italic">This action cannot be undone.</p>
			</div>
			<div class="p-6">
				<p class="font-newsreader text-ink text-[16px] leading-[1.55]">
					You're about to delete <strong>{data.event.title}</strong>. All associated tickets, results, decklists, and staff assignments will be removed permanently.
				</p>
			</div>
			<div class="border-line2 flex justify-end gap-3 border-t p-6">
				<button
					type="button"
					onclick={() => (showDeleteConfirm = false)}
					class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
				>
					Cancel
				</button>
				<form method="POST" action="?/deleteEvent">
					<button
						type="submit"
						class="bg-warm font-mono-system inline-flex items-center px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white hover:brightness-110 transition-[filter]"
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
		<div class="border-ink bg-paper-bg w-full max-w-lg border-[3px] border-double shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
			<div class="border-line2 border-b p-6">
				<span class="font-mono-system text-prem text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Finalize
				</span>
				<h3 class="font-newsreader mt-[6px] text-[26px] font-semibold tracking-[-0.01em]">
					Close this event?
				</h3>
				<p class="font-newsreader text-soft mt-[4px] text-[15px] italic">
					Season standings will be updated with results.
				</p>
			</div>

			<div class="p-6 space-y-[16px]">
				<!-- Summary -->
				<div class="border-line2 bg-panel border p-4">
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Summary
					</span>
					<dl class="mt-[10px] space-y-[6px]">
						<div class="flex justify-between">
							<dt class="font-mono-system text-fade text-[11px] font-bold tracking-[0.06em] uppercase">Results Recorded</dt>
							<dd class="font-archivo text-ink text-[14px] font-extrabold tracking-[-0.01em]">
								{data.existingResults?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="font-mono-system text-fade text-[11px] font-bold tracking-[0.06em] uppercase">Decklists Recorded</dt>
							<dd class="font-archivo text-ink text-[14px] font-extrabold tracking-[-0.01em]">
								{data.existingDecklists?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="font-mono-system text-fade text-[11px] font-bold tracking-[0.06em] uppercase">Registered Players</dt>
							<dd class="font-archivo text-ink text-[14px] font-extrabold tracking-[-0.01em]">
								{data.participants?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="font-mono-system text-fade text-[11px] font-bold tracking-[0.06em] uppercase">Circuit</dt>
							<dd class="font-newsreader text-ink text-[13px] font-semibold">
								{data.event.circuit || 'Not set'}
							</dd>
						</div>
					</dl>
				</div>

				{#if !hasResults}
					<div class="border-warm border-[1.5px] p-3">
						<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.14em] uppercase">Warning</span>
						<p class="text-soft mt-[2px] text-[13px]">
							No results recorded yet. Import CSV or add results before closing.
						</p>
					</div>
				{/if}

				{#if !data.event.circuit}
					<div class="bg-warm border-[1.5px] border-warm p-3 text-white">
						<span class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
						<p class="font-newsreader mt-[2px] text-[14px] font-semibold">
							This event has no circuit assigned. Edit the event to add one before closing.
						</p>
					</div>
				{/if}

				<p class="text-soft text-[13px] leading-[1.5]">
					Closing will update season standings with AGE points and match data for all players.
				</p>
			</div>

			<div class="border-line2 flex justify-end gap-3 border-t p-6">
				<button
					type="button"
					onclick={() => (showCloseConfirm = false)}
					class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
				>
					Cancel
				</button>
				<form method="POST" action="?/finalizeEvent">
					<button
						type="submit"
						disabled={!hasResults || !data.event.circuit}
						class="bg-prem font-mono-system inline-flex items-center px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white hover:brightness-110 transition-[filter] disabled:cursor-not-allowed disabled:opacity-50"
					>
						Close Event →
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
