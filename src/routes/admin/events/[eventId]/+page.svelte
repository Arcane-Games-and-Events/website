<script>
	import { browser } from '$app/environment';
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

	// Tab state - persist to sessionStorage to survive reloads
	const storageKey = `event-tab-${data.event.id}`;
	let activeTab = $state(browser ? sessionStorage.getItem(storageKey) || 'overview' : 'overview');

	function setActiveTab(tab) {
		activeTab = tab;
		if (browser) {
			sessionStorage.setItem(storageKey, tab);
		}
	}

	// Edit mode for event details
	let isEditMode = $state(false);
	let premiumDiscount = $state(data.event.premiumDiscount);
	let gemIdRequired = $state(data.event.gemIdRequired);

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
		format: data.event.format || '',
		placement: '',
		cardsText: '',
		isPublic: true
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
	let gemEntryStatus = $state(
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
			hour12: true
		}).format(new Date(dateStr));
	}

	function formatShortDate(dateStr) {
		if (!dateStr) return 'N/A';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(dateStr));
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

<div class="px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<!-- Back Link -->
		<div class="mb-4">
			<a
				href="/admin?tab=events"
				class="group inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
			>
				<svg
					class="h-4 w-4 transition-transform group-hover:-translate-x-1"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Back to Events
			</a>
		</div>

		<!-- Header -->
		<div
			class="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-900/30 via-gray-900 to-gray-950 p-6 shadow-2xl shadow-cyan-500/5"
		>
			<!-- Decorative elements -->
			<div
				class="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
			></div>
			<div
				class="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"
			></div>

			<div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-4">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25"
					>
						<svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
							/>
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-bold text-white sm:text-3xl">{data.event.title}</h1>
						<p class="mt-1 text-gray-400">{formatDate(data.event.eventDate)}</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<!-- Event Status Dropdown -->
					<form
						method="POST"
						action="?/updateStatus"
						class="inline-flex items-center gap-2"
						bind:this={statusForm}
					>
						<select
							name="status"
							onchange={() => statusForm.submit()}
							class="rounded-lg border border-white/10 bg-gray-800 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none {displayStatus ===
							'completed'
								? 'text-green-400'
								: displayStatus === 'in_progress'
									? 'text-blue-400'
									: displayStatus === 'cancelled'
										? 'text-red-400'
										: 'text-yellow-400'}"
						>
							<option
								value="upcoming"
								selected={displayStatus === 'upcoming'}
								class="bg-gray-800 text-yellow-400">Upcoming</option
							>
							<option
								value="in_progress"
								selected={displayStatus === 'in_progress'}
								class="bg-gray-800 text-blue-400">In Progress</option
							>
							<option
								value="completed"
								selected={displayStatus === 'completed'}
								class="bg-gray-800 text-green-400">Completed</option
							>
							<option
								value="cancelled"
								selected={displayStatus === 'cancelled'}
								class="bg-gray-800 text-red-400">Cancelled</option
							>
						</select>
					</form>

					<!-- Close Event Button (shows when not completed AND has a winner) -->
					{#if !isCompleted && hasWinner}
						<button
							type="button"
							onclick={() => (showCloseConfirm = true)}
							class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg transition-all hover:from-green-500 hover:to-green-400"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Close Event
						</button>
					{:else if !isCompleted && !hasWinner && hasResults}
						<!-- Show disabled state with tooltip when results exist but no winner -->
						<span
							class="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-600 bg-gray-700/50 px-4 py-1.5 text-sm font-medium text-gray-400"
							title="Finals match required to close event"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 15v2m0 0v2m0-2h2m-2 0H10m10-6a8 8 0 11-16 0 8 8 0 0116 0z"
								/>
							</svg>
							Awaiting Finals
						</span>
					{:else if isCompleted && data.isAdmin}
						<form method="POST" action="?/reopenEvent" class="inline">
							<button
								type="submit"
								class="inline-flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								Reopen
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>

		<!-- Success/Error Messages -->
		{#if form?.success}
			<div class="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
				<div class="flex items-center gap-3">
					<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-sm text-green-400">{form.message}</p>
				</div>
				{#if form.details}
					<ul class="mt-2 ml-8 list-inside list-disc text-sm text-green-300">
						<li>Players updated: {form.details.playersUpdated}</li>
						<li>New players added: {form.details.playersCreated}</li>
						{#if form.details.errors?.length > 0}
							<li class="text-red-400">Errors: {form.details.errors.length}</li>
						{/if}
					</ul>
				{/if}
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
				<div class="flex items-center gap-3">
					<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-sm text-red-400">{form.error}</p>
				</div>
			</div>
		{/if}

		<!-- Tabs Navigation -->
		<div
			class="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-gray-900/50 p-1"
		>
			{#each [{ id: 'overview', label: 'Overview' }, { id: 'registrations', label: `Registrations (${data.stats.totalTickets})` }, { id: 'import', label: 'Import CSV' }, { id: 'results', label: `Results (${data.existingResults?.length || 0})` }, { id: 'decklists', label: `Decklists (${data.existingDecklists?.length || 0})` }, { id: 'metagame', label: `Metagame (${data.existingHeroes?.length || 0})` }, ...(data.isAdmin ? [{ id: 'staff', label: `Staff (${data.assignedStaff?.length || 0})` }] : [])] as tab}
				<button
					onclick={() => setActiveTab(tab.id)}
					class="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all {activeTab ===
					tab.id
						? 'bg-cyan-500/20 text-cyan-400'
						: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Tab Content -->

		<!-- Overview Tab -->
		{#if activeTab === 'overview'}
			<!-- Statistics Cards -->
			<div
				class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 {data.isAdmin ? 'lg:grid-cols-3' : ''}"
			>
				{#if data.isAdmin}
					<div
						class="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all hover:border-green-500/50"
					>
						<div
							class="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-green-500/10 blur-2xl"
						></div>
						<div class="relative flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-400">Total Revenue</p>
								<p class="mt-2 text-3xl font-bold text-white">${data.stats.totalRevenue}</p>
							</div>
							<div class="rounded-xl bg-green-500/20 p-3">
								<svg
									class="h-6 w-6 text-green-400"
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
						</div>
					</div>
				{/if}

				<div
					class="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all hover:border-blue-500/50"
				>
					<div
						class="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-500/10 blur-2xl"
					></div>
					<div class="relative flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-400">Tickets Sold</p>
							<p class="mt-2 text-3xl font-bold text-white">{data.stats.totalTickets}</p>
						</div>
						<div class="rounded-xl bg-blue-500/20 p-3">
							<svg
								class="h-6 w-6 text-blue-400"
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
					</div>
				</div>

				<div
					class="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all hover:border-red-500/50"
				>
					<div
						class="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-red-500/10 blur-2xl"
					></div>
					<div class="relative flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-400">Refunds</p>
							<p class="mt-2 text-3xl font-bold text-white">{data.stats.totalRefunded}</p>
						</div>
						<div class="rounded-xl bg-red-500/20 p-3">
							<svg
								class="h-6 w-6 text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			<!-- Event Details -->
			<div
				class="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6"
			>
				<div class="mb-6 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-purple-500/20 p-2">
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
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-white">Event Details</h2>
					</div>
					<button
						onclick={() => (isEditMode = !isEditMode)}
						class="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-700"
					>
						{#if isEditMode}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
							Cancel
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
							Edit
						{/if}
					</button>
				</div>

				{#if isEditMode}
					<form method="POST" action="?/updateEvent" class="space-y-4">
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label for="title" class="mb-2 block text-sm font-medium text-gray-300"
									>Event Name *</label
								>
								<input
									type="text"
									id="title"
									name="title"
									required
									value={data.event.title}
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label for="location" class="mb-2 block text-sm font-medium text-gray-300"
									>Venue Name *</label
								>
								<input
									type="text"
									id="location"
									name="location"
									required
									value={data.event.location}
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label for="address" class="mb-2 block text-sm font-medium text-gray-300"
									>Address</label
								>
								<input
									type="text"
									id="address"
									name="address"
									value={data.event.address || ''}
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label for="format" class="mb-2 block text-sm font-medium text-gray-300"
									>Format *</label
								>
								<select
									id="format"
									name="format"
									required
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
								>
									{#each formats as format}
										<option value={format} selected={data.event.format === format}>{format}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="circuit" class="mb-2 block text-sm font-medium text-gray-300"
									>Circuit</label
								>
								<select
									id="circuit"
									name="circuit"
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
								>
									<option value="">No circuit</option>
									{#each circuits as circuit}
										<option value={circuit} selected={data.event.circuit === circuit}
											>{circuit}</option
										>
									{/each}
								</select>
							</div>
							<div>
								<label for="month" class="mb-2 block text-sm font-medium text-gray-300">Month</label
								>
								<select
									id="month"
									name="month"
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
								>
									<option value="">Select month</option>
									{#each months as month}
										<option value={month} selected={data.event.month === month}>{month}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="eventDate" class="mb-2 block text-sm font-medium text-gray-300"
									>Event Date & Time *</label
								>
								<input
									type="datetime-local"
									id="eventDate"
									name="eventDate"
									required
									value={formatDateForInput(data.event.eventDate)}
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label for="price" class="mb-2 block text-sm font-medium text-gray-300">
									Entry Fee ($) * {#if data.isTournamentStaff}<span class="text-xs text-gray-500"
											>(Read-only)</span
										>{/if}
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
									class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none {data.isTournamentStaff
										? 'cursor-not-allowed opacity-60'
										: ''}"
								/>
							</div>
						</div>

						<div>
							<label for="description" class="mb-2 block text-sm font-medium text-gray-300"
								>Description</label
							>
							<textarea
								id="description"
								name="description"
								rows="3"
								value={data.event.description || ''}
								class="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
							></textarea>
						</div>

						<div class="flex flex-wrap gap-4 pt-2">
							<label class="flex cursor-pointer items-center gap-3">
								<input
									type="checkbox"
									id="gemIdRequired"
									name="gemIdRequired"
									bind:checked={gemIdRequired}
									class="h-4 w-4 border-gray-600 bg-gray-800 text-blue-500"
								/>
								<span class="text-sm font-medium text-gray-300">GEM ID Required</span>
							</label>
							<label class="flex cursor-pointer items-center gap-3">
								<input
									type="checkbox"
									id="premiumDiscount"
									name="premiumDiscount"
									bind:checked={premiumDiscount}
									class="h-4 w-4 border-gray-600 bg-gray-800 text-blue-500"
								/>
								<span class="text-sm font-medium text-gray-300">10% Premium Discount</span>
							</label>
						</div>

						<div class="flex gap-3 pt-4">
							<button
								type="button"
								onclick={() => (isEditMode = false)}
								class="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:from-blue-500 hover:to-blue-400"
							>
								Save Changes
							</button>
						</div>
					</form>
				{:else}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div class="rounded-lg bg-gray-800/30 p-3">
							<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Location</p>
							<p class="mt-1 font-medium text-white">{data.event.location || 'N/A'}</p>
							{#if data.event.address}
								<p class="text-sm text-gray-400">{data.event.address}</p>
							{/if}
						</div>
						<div class="rounded-lg bg-gray-800/30 p-3">
							<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Format</p>
							<p class="mt-1 font-medium text-white">{data.event.format || 'N/A'}</p>
						</div>
						{#if data.event.circuit}
							<div class="rounded-lg bg-gray-800/30 p-3">
								<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Circuit</p>
								<p class="mt-1 font-medium text-white">{data.event.circuit}</p>
								{#if data.event.month}
									<p class="text-sm text-gray-400">{data.event.month}</p>
								{/if}
							</div>
						{/if}
						<div class="rounded-lg bg-gray-800/30 p-3">
							<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Entry Fee</p>
							<p class="mt-1 text-lg font-bold text-green-400">
								${parseFloat(data.event.price).toFixed(2)}
							</p>
						</div>
						<div class="rounded-lg bg-gray-800/30 p-3 md:col-span-2">
							<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Settings</p>
							<div class="mt-2 flex flex-wrap gap-2">
								<span
									class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium {data
										.event.gemIdRequired
										? 'bg-blue-500/20 text-blue-400'
										: 'bg-gray-700 text-gray-400'}"
								>
									{#if data.event.gemIdRequired}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/></svg
										>
									{:else}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											/></svg
										>
									{/if}
									GEM ID Required
								</span>
								<span
									class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium {data
										.event.premiumDiscount
										? 'bg-amber-500/20 text-amber-400'
										: 'bg-gray-700 text-gray-400'}"
								>
									{#if data.event.premiumDiscount}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/></svg
										>
									{:else}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											/></svg
										>
									{/if}
									Premium Discount
								</span>
							</div>
						</div>
						{#if data.event.description}
							<div class="rounded-lg bg-gray-800/30 p-3 md:col-span-3">
								<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">
									Description
								</p>
								<p class="mt-2 text-gray-300">{data.event.description}</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Delete Event Button (Admin Only) -->
			{#if data.isAdmin}
				<div class="mt-6 flex justify-end">
					<button
						type="button"
						onclick={() => (showDeleteConfirm = true)}
						class="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
						Delete Event
					</button>
				</div>
			{/if}
		{/if}

		<!-- Registrations Tab -->
		{#if activeTab === 'registrations'}
			<div
				class="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6"
			>
				<div class="mb-6 flex items-center gap-3">
					<div class="rounded-lg bg-blue-500/20 p-2">
						<svg
							class="h-5 w-5 text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-white">Registered Players</h2>
					<span class="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-sm font-medium text-blue-400"
						>{data.tickets.length}</span
					>
				</div>

				{#if data.tickets.length === 0}
					<div class="py-12 text-center">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800"
						>
							<svg
								class="h-8 w-8 text-gray-500"
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
						<p class="text-gray-400">No tickets sold yet</p>
						<p class="mt-1 text-sm text-gray-500">Registrations will appear here</p>
					</div>
				{:else}
					<!-- Mobile Card View -->
					<div class="space-y-3 lg:hidden">
						{#each sortedTickets as ticket}
							<div
								class="rounded-lg border {ticket.refunded
									? 'border-red-500/30 bg-red-500/5'
									: 'border-gray-700 bg-gray-800/50'} p-4"
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium text-white">
											{ticket.firstName || 'N/A'}
											{ticket.lastName || 'N/A'}
										</p>
										<div class="mt-1 flex items-center gap-2">
											<span class="truncate font-mono text-xs text-gray-400"
												>{ticket.gemId || 'N/A'}</span
											>
											{#if ticket.gemId && ticket.gemId !== 'N/A'}
												<button
													type="button"
													onclick={(e) => copyGemId(ticket.gemId, e)}
													class="-m-1 flex-shrink-0 touch-manipulation rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-500/10 hover:text-blue-400 active:bg-blue-500/20"
													title="Copy GEM ID"
												>
													{#if copiedGemId === ticket.gemId}
														<svg
															class="h-4 w-4 text-green-400"
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
													{:else}
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
																d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
															/>
														</svg>
													{/if}
												</button>
											{/if}
										</div>
									</div>
									<div class="flex-shrink-0">
										{#if ticket.refunded}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
											>
												Refunded
											</span>
										{:else}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400"
											>
												Paid
											</span>
										{/if}
									</div>
								</div>
								<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
									<span>{formatShortDate(ticket.createdAt)}</span>
									<div class="flex items-center gap-2">
										<span>In GEM:</span>
										<button
											type="button"
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId]);
											}}
											disabled={gemEntryLoading[ticket.ticketId]}
											class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {gemEntryStatus[
												ticket.ticketId
											]
												? 'bg-green-600'
												: 'bg-gray-600'} {gemEntryLoading[ticket.ticketId] ? 'opacity-50' : ''}"
											aria-label="Toggle entered into Gem"
										>
											<span
												class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform {gemEntryStatus[
													ticket.ticketId
												]
													? 'translate-x-4'
													: 'translate-x-1'}"
											></span>
										</button>
									</div>
								</div>
								{#if !ticket.refunded}
									<div class="mt-3 border-t border-gray-700 pt-3">
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
												class="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
											>
												Refund
											</button>
										</form>
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Desktop Table View -->
					<div class="-mx-6 hidden overflow-x-auto px-6 lg:block">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-white/10">
									<th class="p-3 text-left font-semibold text-gray-400">
										<button
											onclick={() => sortBy('firstName')}
											class="flex items-center gap-1 transition-colors hover:text-white"
										>
											First Name
											{#if sortColumn === 'firstName'}
												<svg
													class="h-4 w-4 text-blue-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													{#if sortDirection === 'asc'}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 15l7-7 7 7"
														/>
													{:else}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 9l-7 7-7-7"
														/>
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="p-3 text-left font-semibold text-gray-400">
										<button
											onclick={() => sortBy('lastName')}
											class="flex items-center gap-1 transition-colors hover:text-white"
										>
											Last Name
											{#if sortColumn === 'lastName'}
												<svg
													class="h-4 w-4 text-blue-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													{#if sortDirection === 'asc'}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 15l7-7 7 7"
														/>
													{:else}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 9l-7 7-7-7"
														/>
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="p-3 text-left font-semibold text-gray-400">
										<button
											onclick={() => sortBy('gemId')}
											class="flex items-center gap-1 transition-colors hover:text-white"
										>
											Gem ID
											{#if sortColumn === 'gemId'}
												<svg
													class="h-4 w-4 text-blue-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													{#if sortDirection === 'asc'}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 15l7-7 7 7"
														/>
													{:else}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 9l-7 7-7-7"
														/>
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="p-3 text-left font-semibold text-gray-400">
										<button
											onclick={() => sortBy('createdAt')}
											class="flex items-center gap-1 transition-colors hover:text-white"
										>
											Purchase Date
											{#if sortColumn === 'createdAt'}
												<svg
													class="h-4 w-4 text-blue-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													{#if sortDirection === 'asc'}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 15l7-7 7 7"
														/>
													{:else}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 9l-7 7-7-7"
														/>
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="p-3 text-left font-semibold text-gray-400">
										<button
											onclick={() => sortBy('status')}
											class="flex items-center gap-1 transition-colors hover:text-white"
										>
											Status
											{#if sortColumn === 'status'}
												<svg
													class="h-4 w-4 text-blue-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													{#if sortDirection === 'asc'}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 15l7-7 7 7"
														/>
													{:else}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 9l-7 7-7-7"
														/>
													{/if}
												</svg>
											{/if}
										</button>
									</th>
									<th class="p-3 text-left font-semibold text-gray-400">
										<button
											onclick={() => sortBy('enteredIntoGem')}
											class="flex items-center gap-1 transition-colors hover:text-white"
										>
											In GEM
											{#if sortColumn === 'enteredIntoGem'}
												<svg
													class="h-4 w-4 text-blue-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													{#if sortDirection === 'asc'}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 15l7-7 7 7"
														/>
													{:else}
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M19 9l-7 7-7-7"
														/>
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
									<tr
										class="transition-colors {ticket.refunded
											? 'bg-red-500/5'
											: ''} hover:bg-gray-800/50"
									>
										<td class="p-3 font-medium text-white">{ticket.firstName || 'N/A'}</td>
										<td class="p-3 font-medium text-white">{ticket.lastName || 'N/A'}</td>
										<td class="p-3">
											<div class="flex items-center gap-2">
												<span class="font-mono text-sm text-gray-400">{ticket.gemId || 'N/A'}</span>
												{#if ticket.gemId && ticket.gemId !== 'N/A'}
													<button
														type="button"
														onclick={(e) => copyGemId(ticket.gemId, e)}
														class="rounded p-1 text-gray-500 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
														title="Copy GEM ID"
													>
														{#if copiedGemId === ticket.gemId}
															<svg
																class="h-4 w-4 text-green-400"
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
														{:else}
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
																	d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
																/>
															</svg>
														{/if}
													</button>
												{/if}
											</div>
										</td>
										<td class="p-3 text-xs text-gray-500">{formatShortDate(ticket.createdAt)}</td>
										<td class="p-3">
											{#if ticket.refunded}
												<span
													class="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400"
												>
													<svg
														class="h-3 w-3"
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
													Refunded
												</span>
											{:else}
												<span
													class="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400"
												>
													<svg
														class="h-3 w-3"
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
													Paid
												</span>
											{/if}
										</td>
										<td class="p-3">
											<button
												type="button"
												onclick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId]);
												}}
												disabled={gemEntryLoading[ticket.ticketId]}
												class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {gemEntryStatus[
													ticket.ticketId
												]
													? 'bg-green-600'
													: 'bg-gray-600'} {gemEntryLoading[ticket.ticketId] ? 'opacity-50' : ''}"
												aria-label="Toggle entered into Gem"
											>
												<span
													class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform {gemEntryStatus[
														ticket.ticketId
													]
														? 'translate-x-6'
														: 'translate-x-1'}"
												></span>
											</button>
										</td>
										<td class="p-3 text-right">
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
		{/if}

		<!-- Import CSV Tab -->
		{#if activeTab === 'import'}
			<div class="mx-auto max-w-4xl">
				{#if isCompleted}
					<div class="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20"
						>
							<svg
								class="h-8 w-8 text-yellow-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						</div>
						<h2 class="mb-2 text-xl font-semibold text-white">Event Finalized</h2>
						<p class="text-gray-400">
							This event is finalized. Reopen the event from the Finalize tab to import new results.
						</p>
					</div>
				{:else}
					<!-- Success Message -->
					{#if form?.processedResults}
						<div
							class="mb-8 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-6"
						>
							<div class="flex items-start gap-4">
								<div
									class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20"
								>
									<svg
										class="h-6 w-6 text-green-400"
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
								<div class="flex-1">
									<h3 class="mb-3 text-lg font-semibold text-green-400">
										Results Imported Successfully
									</h3>
									<div class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
										<div class="rounded-lg bg-gray-900/50 p-3 text-center">
											<p class="text-2xl font-bold text-white">
												{form.processedResults.totalPlayers}
											</p>
											<p class="text-xs text-gray-400">Players</p>
										</div>
										<div class="rounded-lg bg-gray-900/50 p-3 text-center">
											<p class="text-2xl font-bold text-white">
												{form.processedResults.totalRounds}
											</p>
											<p class="text-xs text-gray-400">Rounds</p>
										</div>
										<div class="rounded-lg bg-gray-900/50 p-3 text-center">
											<p class="text-2xl font-bold text-blue-400">
												{form.processedResults.totalPointsDistributed}
											</p>
											<p class="text-xs text-gray-400">AGE Points</p>
										</div>
										<div class="rounded-lg bg-gray-900/50 p-3 text-center">
											<p class="text-2xl font-bold text-green-400">
												${form.processedResults.totalPrizeDistributed}
											</p>
											<p class="text-xs text-gray-400">Prize Pool</p>
										</div>
									</div>
									<button
										onclick={() => setActiveTab('results')}
										class="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
											/>
										</svg>
										Review Results
									</button>
								</div>
							</div>
						</div>
					{/if}

					<form method="POST" action="?/processCSV" enctype="multipart/form-data" class="space-y-4">
						<!-- Compact Header -->
						<div class="mb-2 flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
								<svg
									class="h-5 w-5 text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
							</div>
							<div>
								<h2 class="text-lg font-semibold text-white">Import Tournament Results</h2>
								<p class="text-xs text-gray-500">
									Upload GEM CSV exports to calculate standings and record matches
								</p>
							</div>
						</div>

						<!-- Compact File Uploads -->
						<div class="grid gap-3 sm:grid-cols-2">
							<!-- Swiss Standings -->
							<div
								class="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-3 transition-colors hover:border-gray-600 {swissStandingsFile &&
								swissStandingsFile.length > 0
									? 'border-green-500/50 bg-green-500/5'
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
									<div
										class="h-8 w-8 flex-shrink-0 rounded-lg {swissStandingsFile &&
										swissStandingsFile.length > 0
											? 'bg-green-500/20'
											: 'bg-gray-800'} flex items-center justify-center"
									>
										{#if swissStandingsFile && swissStandingsFile.length > 0}
											<svg
												class="h-4 w-4 text-green-400"
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
										{:else}
											<svg
												class="h-4 w-4 text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-white">
											Swiss Standings <span class="text-red-400">*</span>
										</p>
										{#if swissStandingsFile && swissStandingsFile.length > 0}
											<p class="truncate text-xs text-green-400">{swissStandingsFile[0].name}</p>
										{:else}
											<p class="text-xs text-gray-500">Click to select CSV</p>
										{/if}
									</div>
								</label>
							</div>

							<!-- Pairings -->
							<div
								class="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-3 transition-colors hover:border-gray-600 {pairingsFile &&
								pairingsFile.length > 0
									? 'border-green-500/50 bg-green-500/5'
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
									<div
										class="h-8 w-8 flex-shrink-0 rounded-lg {pairingsFile && pairingsFile.length > 0
											? 'bg-green-500/20'
											: 'bg-gray-800'} flex items-center justify-center"
									>
										{#if pairingsFile && pairingsFile.length > 0}
											<svg
												class="h-4 w-4 text-green-400"
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
										{:else}
											<svg
												class="h-4 w-4 text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
												/>
											</svg>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-white">
											Pairings Data <span class="text-red-400">*</span>
										</p>
										{#if pairingsFile && pairingsFile.length > 0}
											<p class="truncate text-xs text-green-400">{pairingsFile[0].name}</p>
										{:else}
											<p class="text-xs text-gray-500">Click to select CSV</p>
										{/if}
									</div>
								</label>
							</div>
						</div>

						<!-- Warning (if exists) -->
						{#if data.existingResults && data.existingResults.length > 0}
							<div
								class="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
							>
								<svg
									class="h-4 w-4 flex-shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<span>This will replace {data.existingResults.length} existing results</span>
							</div>
						{/if}

						<!-- Submit Button -->
						<button
							type="submit"
							disabled={csvProcessing || !swissStandingsFile || !pairingsFile}
							class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if csvProcessing}
								<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Processing...
							{:else}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
									/>
								</svg>
								Import Results
							{/if}
						</button>
					</form>
				{/if}
			</div>
		{/if}

		<!-- Results Tab -->
		{#if activeTab === 'results'}
			<div class="space-y-6">
				<!-- Stats Header -->
				{#if sortedResults.length > 0}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<span class="text-sm text-gray-400">
								{sortedResults.length} players • {data.existingMatches?.length || 0} matches recorded
							</span>
						</div>
					</div>
				{/if}

				<!-- Results List -->
				<div class="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950">
					{#if sortedResults.length === 0}
						<div class="p-12 text-center">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								/>
							</svg>
							<p class="mt-4 text-gray-400">No results recorded yet</p>
							<p class="mt-2 text-sm text-gray-500">
								Import tournament CSV files to see results here
							</p>
						</div>
					{:else}
						<!-- Mobile Card View -->
						<div class="space-y-3 p-4 lg:hidden">
							{#each sortedResults as result}
								<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
									<div class="flex items-start gap-3">
										<span
											class="inline-flex h-10 w-10 items-center justify-center rounded-full {result.placement ===
											1
												? 'bg-yellow-500/20 text-yellow-400'
												: result.placement === 2
													? 'bg-gray-400/20 text-gray-300'
													: result.placement === 3
														? 'bg-amber-600/20 text-amber-500'
														: 'bg-gray-800 text-gray-400'} flex-shrink-0 text-lg font-bold"
										>
											{result.placement}
										</span>
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-white">{result.playerName}</p>
											<div class="mt-1 flex items-center gap-2">
												<span class="font-mono text-xs text-gray-400">{result.gemId || '-'}</span>
												{#if result.gemId && result.gemId !== '-'}
													<button
														type="button"
														onclick={(e) => copyGemId(result.gemId, e)}
														class="-m-1 touch-manipulation rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-500/10 hover:text-blue-400 active:bg-blue-500/20"
														title="Copy GEM ID"
													>
														{#if copiedGemId === result.gemId}
															<svg
																class="h-4 w-4 text-green-400"
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
														{:else}
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
																	d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
																/>
															</svg>
														{/if}
													</button>
												{/if}
											</div>
										</div>
									</div>
									<div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
										<span class="text-gray-400"
											>Record: <span class="text-white"
												>{result.wins}-{result.losses}{result.draws > 0
													? `-${result.draws}`
													: ''}</span
											></span
										>
										<span class="text-gray-400"
											>AGE Pts: <span class="font-medium text-blue-400">{result.agePoints}</span
											></span
										>
										{#if result.prizeAmount}
											<span class="text-gray-400"
												>Prize: <span class="text-green-400">${result.prizeAmount}</span></span
											>
										{/if}
									</div>
								</div>
							{/each}
						</div>

						<!-- Desktop Table View -->
						<div class="hidden overflow-x-auto lg:block">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-gray-700">
										<th class="p-4 text-left font-semibold text-gray-100">Place</th>
										<th class="p-4 text-left font-semibold text-gray-100">Player</th>
										<th class="p-4 text-left font-semibold text-gray-100">GEM ID</th>
										<th class="p-4 text-left font-semibold text-gray-100">Record</th>
										<th class="p-4 text-left font-semibold text-gray-100">AGE Pts</th>
										<th class="p-4 text-left font-semibold text-gray-100">Prize</th>
									</tr>
								</thead>
								<tbody>
									{#each sortedResults as result}
										<tr class="border-b border-white/10 hover:bg-gray-900">
											<td class="p-4">
												<span
													class="inline-flex h-8 w-8 items-center justify-center rounded-full {result.placement ===
													1
														? 'bg-yellow-500/20 text-yellow-400'
														: result.placement === 2
															? 'bg-gray-400/20 text-gray-300'
															: result.placement === 3
																? 'bg-amber-600/20 text-amber-500'
																: 'bg-gray-800 text-gray-400'} font-bold"
												>
													{result.placement}
												</span>
											</td>
											<td class="p-4 font-medium text-gray-100">{result.playerName}</td>
											<td class="p-4">
												<div class="flex items-center gap-2">
													<span class="text-gray-400">{result.gemId || '-'}</span>
													{#if result.gemId && result.gemId !== '-'}
														<button
															type="button"
															onclick={(e) => copyGemId(result.gemId, e)}
															class="rounded p-1 text-gray-500 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
															title="Copy GEM ID"
														>
															{#if copiedGemId === result.gemId}
																<svg
																	class="h-4 w-4 text-green-400"
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
															{:else}
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
																		d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
																	/>
																</svg>
															{/if}
														</button>
													{/if}
												</div>
											</td>
											<td class="p-4 text-gray-100"
												>{result.wins}-{result.losses}{result.draws > 0
													? `-${result.draws}`
													: ''}</td
											>
											<td class="p-4 font-medium text-blue-400">{result.agePoints}</td>
											<td class="p-4 text-green-400"
												>{result.prizeAmount ? `$${result.prizeAmount}` : '-'}</td
											>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Decklists Tab -->
		{#if activeTab === 'decklists'}
			<div class="space-y-6">
				{#if !isCompleted}
					<div class="flex justify-end">
						<button
							onclick={startNewDecklist}
							class="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
						>
							+ Add Decklist
						</button>
					</div>
				{/if}

				<!-- Decklist Form Modal -->
				{#if showDecklistForm}
					<div class="rounded-xl border border-gray-700 bg-gray-900 p-6">
						<h3 class="mb-4 text-lg font-semibold text-white">
							{editingDecklist ? 'Edit Decklist' : 'Add Decklist'}
						</h3>

						{#if data.participants.length > 0 && !editingDecklist}
							<div class="mb-4">
								<label
									for="participantSearchInput"
									class="mb-2 block text-sm font-medium text-gray-100"
									>Select from registered players</label
								>
								<div class="relative">
									<div class="relative">
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
											id="participantSearchInput"
											bind:value={participantSearch}
											onfocus={() => (showParticipantDropdown = true)}
											placeholder="Search by name or GEM ID..."
											class="w-full rounded-lg border border-gray-700 bg-gray-950 py-2.5 pr-4 pl-10 text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
										/>
										{#if participantSearch}
											<button
												type="button"
												onclick={() => {
													participantSearch = '';
												}}
												aria-label="Clear search"
												class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
									{#if showParticipantDropdown}
										<div
											class="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
										>
											{#if filteredParticipants.length === 0}
												<div class="px-4 py-3 text-sm text-gray-500">No matching players found</div>
											{:else}
												{#each filteredParticipants as participant}
													<button
														type="button"
														onclick={() => {
															selectParticipant(participant);
															participantSearch = '';
															showParticipantDropdown = false;
														}}
														class="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-gray-800"
													>
														<span class="font-medium text-gray-100">{participant.playerName}</span>
														{#if participant.gemId}
															<span class="font-mono text-xs text-gray-500"
																>{participant.gemId}</span
															>
														{/if}
													</button>
												{/each}
											{/if}
										</div>
									{/if}
								</div>
								{#if showParticipantDropdown}
									<!-- Invisible overlay to close dropdown when clicking outside -->
									<button
										type="button"
										class="fixed inset-0 z-0 cursor-default"
										onclick={() => (showParticipantDropdown = false)}
										tabindex="-1"
										aria-label="Close dropdown"
									></button>
								{/if}
								<p class="mt-2 text-xs text-gray-500">Or enter details manually below</p>
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
									<label for="deckPlayerName" class="mb-2 block text-sm font-medium text-gray-100"
										>Player Name *</label
									>
									<input
										type="text"
										id="deckPlayerName"
										name="playerName"
										required
										bind:value={decklistForm.playerName}
										list="participantNames"
										autocomplete="off"
										class="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
									<datalist id="participantNames">
										{#each data.participants as participant}
											<option value={participant.playerName}></option>
										{/each}
									</datalist>
								</div>
								<div>
									<label for="deckGemId" class="mb-2 block text-sm font-medium text-gray-100"
										>GEM ID</label
									>
									<input
										type="text"
										id="deckGemId"
										name="gemId"
										bind:value={decklistForm.gemId}
										list="participantGemIds"
										autocomplete="off"
										class="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									/>
									<datalist id="participantGemIds">
										{#each data.participants.filter((p) => p.gemId) as participant}
											<option value={participant.gemId}>{participant.playerName}</option>
										{/each}
									</datalist>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
								<!-- Hero Combo Search/Select -->
								<div class="relative">
									<label for="heroSearch" class="mb-2 block text-sm font-medium text-gray-100"
										>Hero *</label
									>
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
											placeholder="Search hero..."
											autocomplete="off"
											class="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
										/>
										{#if heroSearch}
											<button
												type="button"
												onclick={() => {
													heroSearch = '';
													decklistForm.hero = '';
												}}
												class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
												aria-label="Clear hero search"
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
									{#if showHeroDropdown}
										<div
											class="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
										>
											{#if filteredHeroes.length === 0}
												<div class="px-4 py-3 text-sm text-gray-500">No matching heroes</div>
											{:else}
												{#each filteredHeroes.slice(0, 20) as hero}
													<button
														type="button"
														onclick={() => selectHero(hero.name)}
														class="w-full px-4 py-2.5 text-left text-gray-100 transition-colors hover:bg-gray-800"
													>
														{hero.name}
													</button>
												{/each}
												{#if filteredHeroes.length > 20}
													<div class="border-t border-gray-800 px-4 py-2 text-xs text-gray-500">
														+{filteredHeroes.length - 20} more...
													</div>
												{/if}
											{/if}
										</div>
										<!-- Invisible overlay to close dropdown -->
										<button
											type="button"
											class="fixed inset-0 z-10 cursor-default"
											onclick={() => (showHeroDropdown = false)}
											tabindex="-1"
											aria-label="Close dropdown"
										></button>
									{/if}
								</div>

								<!-- Placement Dropdown -->
								<div>
									<label for="placement" class="mb-2 block text-sm font-medium text-gray-100"
										>Placement</label
									>
									<select
										id="placement"
										name="placement"
										bind:value={decklistForm.placement}
										class="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									>
										<option value="">Select placement...</option>
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

								<!-- Format -->
								<div>
									<label for="deckFormat" class="mb-2 block text-sm font-medium text-gray-100"
										>Format</label
									>
									<select
										id="deckFormat"
										name="format"
										bind:value={decklistForm.format}
										class="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									>
										{#each formats as fmt}
											<option value={fmt}>{fmt}</option>
										{/each}
									</select>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<!-- Cards Textarea -->
								<div>
									<label for="cardsText" class="mb-2 block text-sm font-medium text-gray-100">
										Decklist (GEM Format) *
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
										class="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 font-mono text-sm text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
									></textarea>
									<p class="mt-2 text-xs text-gray-500">Paste decklist directly from GEM export</p>
								</div>

								<!-- Live Preview -->
								<div>
									<span class="mb-2 block text-sm font-medium text-gray-100">Preview</span>
									<div
										class="h-[400px] overflow-auto rounded-lg border border-gray-700 bg-gray-950 p-4"
									>
										{#if decklistPreview.totals.total === 0}
											<p class="text-sm text-gray-500">Paste a decklist to see preview...</p>
										{:else}
											<div class="space-y-4 text-sm">
												<!-- Equipment Section -->
												{#if decklistPreview.equipment.length > 0}
													<div>
														<h4
															class="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase"
														>
															Equipment ({decklistPreview.totals.equipment})
														</h4>
														<div class="space-y-1">
															{#each decklistPreview.equipment as card}
																<div class="flex justify-between text-gray-300">
																	<span>{card.name}</span>
																	<span class="text-gray-500">{card.quantity}</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}

												<!-- Red Cards -->
												{#if decklistPreview.red.length > 0}
													<div>
														<h4
															class="mb-2 text-xs font-semibold tracking-wider text-red-400 uppercase"
														>
															Red ({decklistPreview.totals.red})
														</h4>
														<div class="space-y-1">
															{#each decklistPreview.red as card}
																<div class="flex justify-between text-gray-300">
																	<span>{card.name}</span>
																	<span class="text-gray-500">{card.quantity}</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}

												<!-- Yellow Cards -->
												{#if decklistPreview.yellow.length > 0}
													<div>
														<h4
															class="mb-2 text-xs font-semibold tracking-wider text-yellow-400 uppercase"
														>
															Yellow ({decklistPreview.totals.yellow})
														</h4>
														<div class="space-y-1">
															{#each decklistPreview.yellow as card}
																<div class="flex justify-between text-gray-300">
																	<span>{card.name}</span>
																	<span class="text-gray-500">{card.quantity}</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}

												<!-- Blue Cards -->
												{#if decklistPreview.blue.length > 0}
													<div>
														<h4
															class="mb-2 text-xs font-semibold tracking-wider text-blue-400 uppercase"
														>
															Blue ({decklistPreview.totals.blue})
														</h4>
														<div class="space-y-1">
															{#each decklistPreview.blue as card}
																<div class="flex justify-between text-gray-300">
																	<span>{card.name}</span>
																	<span class="text-gray-500">{card.quantity}</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}

												<!-- Total -->
												<div class="border-t border-gray-700 pt-3">
													<div class="flex justify-between font-semibold text-white">
														<span>Total Cards</span>
														<span>{decklistPreview.totals.total}</span>
													</div>
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>

							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									id="isPublicCheck"
									bind:checked={decklistForm.isPublic}
									class="h-4 w-4 border-gray-700"
								/>
								<label for="isPublicCheck" class="text-sm text-gray-100"
									>Make this decklist public</label
								>
							</div>

							<div class="flex justify-end gap-3 pt-4">
								<button
									type="button"
									onclick={cancelDecklistForm}
									class="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
									>Cancel</button
								>
								<button
									type="submit"
									class="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:opacity-90"
									>Save Decklist</button
								>
							</div>
						</form>
					</div>
				{/if}

				<!-- Decklists Grid -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#if data.existingDecklists?.length === 0}
						<div
							class="col-span-full rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-12 text-center"
						>
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
								/>
							</svg>
							<p class="mt-4 text-gray-400">No decklists recorded yet</p>
							{#if !isCompleted}
								<button
									onclick={startNewDecklist}
									class="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
									>Add the first decklist</button
								>
							{/if}
						</div>
					{:else}
						{#each data.existingDecklists.sort((a, b) => (a.placement || 99) - (b.placement || 99)) as decklist}
							<div
								class="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-4"
							>
								<div class="mb-3 flex items-start justify-between">
									<div class="flex items-start gap-3">
										{#if decklist.placement}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-lg {decklist.placement ===
												1
													? 'bg-yellow-500/20 text-yellow-400'
													: decklist.placement === 2
														? 'bg-gray-400/20 text-gray-300'
														: decklist.placement === 3
															? 'bg-amber-600/20 text-amber-500'
															: 'bg-gray-700 text-gray-400'} text-sm font-bold"
											>
												{decklist.placement}
											</div>
										{/if}
										<div>
											<h4 class="font-semibold text-white">{decklist.playerName}</h4>
											{#if decklist.hero}
												<p class="text-sm text-blue-400">{decklist.hero}</p>
											{/if}
										</div>
									</div>
									{#if !isCompleted}
										<div class="flex gap-2">
											<button
												onclick={() => editDecklist(decklist)}
												class="text-xs text-gray-400 hover:text-white">Edit</button
											>
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
												<button type="submit" class="text-xs text-red-400 hover:text-red-300">
													Delete
												</button>
											</form>
										</div>
									{/if}
								</div>
								<div class="flex items-center gap-2 text-xs text-gray-500">
									<span>{decklist.cards?.reduce((sum, c) => sum + c.quantity, 0) || 0} cards</span>
									<span>•</span>
									<span>{decklist.format || 'Unknown format'}</span>
									{#if decklist.gemId}
										<span>•</span>
										<span class="font-mono">{decklist.gemId}</span>
									{/if}
								</div>
								{#if !decklist.isPublic}
									<span class="mt-2 inline-block text-xs text-yellow-500">Private</span>
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
				<!-- Hero Upload Section -->
				<div
					class="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6"
				>
					<div class="mb-4 flex items-center gap-3">
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
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-white">Upload Hero Data</h3>
							<p class="text-sm text-gray-400">Import hero choices from GEM export</p>
						</div>
					</div>

					{#if !data.event.circuit || !data.event.month}
						<div
							class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400"
						>
							<p class="font-medium">Event Setup Required</p>
							<p class="mt-1 text-amber-400/80">
								Set the Circuit and Month in the Overview tab before uploading hero data.
							</p>
						</div>
					{:else}
						<form
							method="POST"
							action="?/uploadHeroes"
							enctype="multipart/form-data"
							class="space-y-4"
						>
							<div
								class="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-4 transition-colors hover:border-gray-600 {heroesFile &&
								heroesFile.length > 0
									? 'border-purple-500/50 bg-purple-500/5'
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
								<label for="heroesFile" class="flex cursor-pointer items-center gap-4">
									<div
										class="h-10 w-10 flex-shrink-0 rounded-lg {heroesFile && heroesFile.length > 0
											? 'bg-purple-500/20'
											: 'bg-gray-800'} flex items-center justify-center"
									>
										{#if heroesFile && heroesFile.length > 0}
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
													d="M5 13l4 4L19 7"
												/>
											</svg>
										{:else}
											<svg
												class="h-5 w-5 text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										{#if heroesFile && heroesFile.length > 0}
											<p class="truncate text-sm text-purple-400">{heroesFile[0].name}</p>
										{:else}
											<p class="text-sm text-gray-300">Heroes CSV</p>
											<p class="text-xs text-gray-500">
												Player Name, Player ID, Country/Region, Hero
											</p>
										{/if}
									</div>
								</label>
							</div>

							{#if data.existingHeroes?.length > 0}
								<div
									class="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
								>
									<svg
										class="h-4 w-4 flex-shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/>
									</svg>
									<span>This will replace {data.existingHeroes.length} existing hero entries</span>
								</div>
							{/if}

							<div class="flex gap-3">
								<button
									type="submit"
									disabled={heroesProcessing || !heroesFile}
									class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#if heroesProcessing}
										<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Processing...
									{:else}
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
											/>
										</svg>
										Upload Heroes
									{/if}
								</button>

								{#if data.existingHeroes?.length > 0}
									<button
										type="submit"
										formaction="?/deleteHeroes"
										class="rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
									>
										Clear All
									</button>
								{/if}
							</div>
						</form>
					{/if}
				</div>

				<!-- Metagame Breakdown -->
				<div class="rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950">
					<div class="border-b border-white/10 p-4">
						<h3 class="text-lg font-semibold text-white">Metagame Breakdown</h3>
						<p class="mt-1 text-sm text-gray-400">
							{data.existingHeroes?.length || 0} players registered
						</p>
					</div>

					{#if !data.existingHeroes?.length}
						<div class="p-12 text-center">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
							<p class="mt-4 text-gray-400">No hero data uploaded yet</p>
							<p class="mt-2 text-sm text-gray-500">
								Upload a heroes CSV to see the metagame breakdown
							</p>
						</div>
					{:else}
						<div class="space-y-3 p-4">
							{#each heroBreakdown() as { hero, count, percentage }, idx}
								<div class="flex items-center gap-4">
									<span class="w-6 text-right text-sm font-medium text-gray-500">{idx + 1}.</span>
									<div class="min-w-0 flex-1">
										<div class="mb-1 flex items-center justify-between">
											<span class="truncate text-sm font-medium text-white">{hero}</span>
											<span class="ml-2 flex-shrink-0 text-sm text-gray-400"
												>{count} ({percentage}%)</span
											>
										</div>
										<div class="h-2 overflow-hidden rounded-full bg-gray-800">
											<div
												class="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
												style="width: {percentage}%"
											></div>
										</div>
									</div>
								</div>
							{/each}
						</div>

						<!-- Player List -->
						<div class="border-t border-white/10 p-4">
							<h4 class="mb-3 text-sm font-medium text-gray-400">All Players</h4>
							<div
								class="grid max-h-96 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3"
							>
								{#each data.existingHeroes.sort( (a, b) => a.playerName.localeCompare(b.playerName) ) as entry}
									<div class="flex items-center gap-2 rounded-lg bg-gray-800/50 p-2 text-sm">
										<span class="flex-1 truncate text-white">{entry.playerName}</span>
										<span class="truncate text-xs text-gray-400">{entry.hero}</span>
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
				<!-- Assigned Staff Section -->
				<div
					class="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950"
				>
					<div class="border-b border-white/10 bg-gray-800/50 px-6 py-4">
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-purple-500/20 p-2">
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
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
							</div>
							<div>
								<h3 class="text-lg font-semibold text-white">Assigned Staff</h3>
								<p class="text-sm text-gray-400">Tournament staff assigned to manage this event</p>
							</div>
						</div>
					</div>
					<div class="p-6">
						{#if data.assignedStaff?.length > 0}
							<div class="space-y-3">
								{#each data.assignedStaff as staff}
									<div
										class="flex items-center justify-between rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3"
									>
										<div class="flex items-center gap-3">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20"
											>
												<span class="text-sm font-medium text-purple-400"
													>{staff.userEmail?.charAt(0).toUpperCase() || '?'}</span
												>
											</div>
											<div>
												<p class="font-medium text-white">{staff.userEmail}</p>
												<p class="text-xs text-gray-500">
													Assigned {formatShortDate(staff.createdAt)}
												</p>
											</div>
										</div>
										<form method="POST" action="?/unassignStaff">
											<input type="hidden" name="staffId" value={staff.userId} />
											<button
												type="submit"
												class="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
											>
												Remove
											</button>
										</form>
									</div>
								{/each}
							</div>
						{:else}
							<div class="py-8 text-center">
								<svg
									class="mx-auto mb-3 h-12 w-12 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
								<p class="text-gray-400">No staff assigned to this event</p>
								<p class="mt-1 text-sm text-gray-500">
									Use the form below to assign tournament staff
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Add Staff Section -->
				<div
					class="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950"
				>
					<div class="border-b border-white/10 bg-gray-800/50 px-6 py-4">
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-green-500/20 p-2">
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
										d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
									/>
								</svg>
							</div>
							<div>
								<h3 class="text-lg font-semibold text-white">Add Staff</h3>
								<p class="text-sm text-gray-400">
									Search any user by email to assign them to this event
								</p>
							</div>
						</div>
					</div>
					<div class="p-6">
						<!-- Email Search Input -->
						<div class="mb-4">
							<div class="relative">
								<svg
									class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
								<input
									type="email"
									value={staffSearch}
									oninput={(e) => handleStaffSearchInput(e.target.value)}
									placeholder="Search by email address (min 3 characters)..."
									class="w-full rounded-lg border border-white/10 bg-gray-800 py-2.5 pr-4 pl-10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
								/>
								{#if staffSearchLoading}
									<div class="absolute top-1/2 right-3 -translate-y-1/2">
										<svg
											class="h-5 w-5 animate-spin text-purple-400"
											fill="none"
											viewBox="0 0 24 24"
										>
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
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
									</div>
								{/if}
							</div>
							<p class="mt-1.5 text-xs text-gray-500">Type at least 3 characters to search</p>
						</div>

						<!-- Search Results -->
						{#if staffSearchResults.length > 0}
							<div class="max-h-64 space-y-2 overflow-y-auto">
								{#each staffSearchResults as userResult}
									<form
										method="POST"
										action="?/assignStaff"
										use:enhance={handleStaffAssign}
										class="flex items-center justify-between rounded-lg border border-white/10 bg-gray-800/30 px-4 py-3 transition-colors hover:bg-gray-800/50"
									>
										<input type="hidden" name="staffId" value={userResult.id} />
										<div class="flex items-center gap-3">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700"
											>
												<span class="text-sm font-medium text-gray-300"
													>{userResult.email?.charAt(0).toUpperCase() || '?'}</span
												>
											</div>
											<div>
												<p class="font-medium text-white">{userResult.email}</p>
												<p class="text-xs text-gray-500">Role: {userResult.role || 'user'}</p>
											</div>
										</div>
										<button
											type="submit"
											class="rounded-lg bg-green-500/20 px-3 py-1.5 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/30"
										>
											Assign
										</button>
									</form>
								{/each}
							</div>
						{:else if staffSearch.length >= 3 && !staffSearchLoading}
							<div class="py-6 text-center">
								<svg
									class="mx-auto mb-2 h-10 w-10 text-gray-600"
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
								<p class="text-gray-400">No users found matching "{staffSearch}"</p>
							</div>
						{:else if staffSearch.length === 0}
							<div class="py-6 text-center">
								<svg
									class="mx-auto mb-2 h-10 w-10 text-gray-600"
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
								<p class="text-gray-400">Enter an email address to search for users</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
		<div
			class="mx-4 w-full max-w-md rounded-xl border border-red-500/30 bg-gray-900 p-6 shadow-2xl"
		>
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
					<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-bold text-white">Delete Event</h3>
					<p class="text-sm text-gray-400">This action cannot be undone</p>
				</div>
			</div>
			<p class="mb-6 text-gray-300">
				Are you sure you want to delete <strong class="text-white">{data.event.title}</strong>? This
				will permanently remove the event and all associated tickets, results, decklists, and staff
				assignments.
			</p>
			<div class="flex justify-end gap-3">
				<button
					type="button"
					onclick={() => (showDeleteConfirm = false)}
					class="rounded-lg border border-white/10 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
				>
					Cancel
				</button>
				<form method="POST" action="?/deleteEvent">
					<button
						type="submit"
						class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
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
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
		<div
			class="mx-4 w-full max-w-lg rounded-xl border border-green-500/30 bg-gray-900 p-6 shadow-2xl"
		>
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
					<svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-bold text-white">Close Event</h3>
					<p class="text-sm text-gray-400">Update season standings with results</p>
				</div>
			</div>

			<!-- Summary -->
			<div class="mb-4 rounded-lg bg-gray-800/50 p-4">
				<h4 class="mb-2 font-medium text-white">Summary</h4>
				<ul class="space-y-1 text-sm text-gray-300">
					<li class="flex justify-between">
						<span>Results Recorded:</span><span class="font-medium"
							>{data.existingResults?.length || 0}</span
						>
					</li>
					<li class="flex justify-between">
						<span>Decklists Recorded:</span><span class="font-medium"
							>{data.existingDecklists?.length || 0}</span
						>
					</li>
					<li class="flex justify-between">
						<span>Registered Players:</span><span class="font-medium"
							>{data.participants?.length || 0}</span
						>
					</li>
					<li class="flex justify-between">
						<span>Circuit:</span><span class="font-medium">{data.event.circuit || 'Not set'}</span>
					</li>
				</ul>
			</div>

			{#if !hasResults}
				<div class="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
					<p class="text-sm text-yellow-400">
						<strong>Warning:</strong> No results have been recorded yet. Import CSV or add results before
						closing.
					</p>
				</div>
			{/if}

			{#if !data.event.circuit}
				<div class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
					<p class="text-sm text-red-400">
						<strong>Error:</strong> This event has no circuit assigned. Please edit the event to add
						a circuit before closing.
					</p>
				</div>
			{/if}

			<p class="mb-4 text-sm text-gray-400">
				Closing the event will update season standings with AGE points and match data for all
				players.
			</p>

			<div class="flex justify-end gap-3">
				<button
					type="button"
					onclick={() => (showCloseConfirm = false)}
					class="rounded-lg border border-white/10 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
				>
					Cancel
				</button>
				<form method="POST" action="?/finalizeEvent">
					<button
						type="submit"
						disabled={!hasResults || !data.event.circuit}
						class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Close Event
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
