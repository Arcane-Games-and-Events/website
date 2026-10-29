<script>
	import { untrack } from 'svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance, deserialize } from '$app/forms';
	import { parseGemDecklist, toStorageFormat } from '$lib/utils/gem-decklist-parser.js';
	import { getCircuitNames } from '$lib/data/circuits.js';
	import { MONTH_NAMES } from '$lib/data/months.js';
	import { PLACEMENT_BANDS, placementBand, placementLabel } from '$lib/utils/placement.js';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';

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
	// Seeded once for the edit form; the form owns them after that.
	let hasPlayerCap = $state(untrack(() => !!data.event.playerCap));
	let playerCapValue = $state(untrack(() => data.event.playerCap || ''));

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

	const circuits = getCircuitNames();
	const months = MONTH_NAMES;
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

<svelte:head>
	<title>{data.event.title} · Admin</title>
</svelte:head>

<!-- ============ HEADER ============ -->
<DeskHeader kicker="Admin" title={data.event.title} subtitle={formatDate(data.event.eventDate)} />
<AdminTabs />
<section class="mx-auto w-full max-w-[1200px] px-5 pt-[24px] pb-[20px] md:px-8">
	<a
		href="/admin/events"
		class="inline-flex items-center text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
	>
		← Back to Events
	</a>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
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
					class="h-[32px] border border-line2 bg-paper py-0 pr-7 pl-2 text-[11px] leading-none text-ink focus:border-ink focus:ring-0"
				>
					<option value="upcoming">Upcoming</option>
					<option value="in_progress">In Progress</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</form>
			{#if displayStatus === 'upcoming' && datePassed}
				<span
					class="inline-flex items-center text-[11.5px] text-fade"
					title="The event date is in the past but no results have been uploaded"
				>
					Date has passed · no results yet
				</span>
			{/if}

			{#if !isCompleted && hasWinner}
				<button
					type="button"
					onclick={() => (showCloseConfirm = true)}
					class="inline-flex h-[32px] shrink-0 items-center gap-1.5 bg-prem px-3 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Close Event ✓
				</button>
			{:else if !isCompleted && !hasWinner && hasResults}
				<span
					class="inline-flex items-center text-[11.5px] text-fade"
					title="Finals match required to close event"
				>
					Awaiting Finals
				</span>
			{:else if isCompleted && data.isAdmin}
				<form method="POST" action="?/reopenEvent" class="inline">
					<button
						type="submit"
						class="inline-flex h-[32px] shrink-0 items-center border border-warm px-3 text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
					>
						Reopen
					</button>
				</form>
			{/if}
		</div>
	</div>
</section>

{#if form?.success}
	<section class="mx-auto w-full max-w-[1200px] overflow-x-clip px-5 pb-[12px] md:px-8">
		<div class="border-l-[3px] border-prem bg-prem/10 p-4">
			<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase">Success</span>
			<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{form.message}</p>
			{#if form.details}
				<ul class="mt-[8px] ml-4 text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase">
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
	<AdminNotice tone="error" message={form.error} />
{/if}
{#if data.monthMismatch}
	<AdminNotice
		tone="info"
		message="This event's month is set to {data.event
			.month}, but its date is in {data.monthMismatch}. Standings and match history file under the date — edit the event so the two agree."
	/>
{/if}

<!-- ============ TABS ============ -->
<section class="overflow-x-clip border-t border-line2">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[16px] md:px-8">
		<div class="flex gap-1 overflow-x-auto whitespace-nowrap">
			{#each [{ id: 'overview', label: 'Overview' }, { id: 'registrations', label: `Registrations · ${data.stats.totalTickets}` }, { id: 'import', label: 'Import CSV' }, { id: 'results', label: `Results · ${data.existingResults?.length || 0}` }, { id: 'decklists', label: `Decklists · ${data.existingDecklists?.length || 0}` }, { id: 'metagame', label: `Metagame · ${data.existingHeroes?.length || 0}` }, ...(data.isAdmin ? [{ id: 'staff', label: `Staff · ${data.assignedStaff?.length || 0}` }] : [])] as tab (tab.id)}
				<button
					onclick={() => setActiveTab(tab.id)}
					class="relative px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab ===
					tab.id
						? 'text-ink'
						: 'text-fade hover:text-ink'}"
				>
					{tab.label}
					{#if activeTab === tab.id}<span class="absolute inset-x-[10px] bottom-0 h-[2px] bg-warm"
						></span>{/if}
				</button>
			{/each}
		</div>
	</div>
</section>

<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
	<!-- Tab Content -->

	<!-- Overview Tab -->
	{#if activeTab === 'overview'}
		<!-- Stat Strip -->
		<div class="mb-[24px] overflow-hidden border border-line2">
			<div class="grid grid-cols-2 divide-x divide-line2 {data.isAdmin ? 'md:grid-cols-3' : ''}">
				{#if data.isAdmin}
					<div class="p-5">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>Total Revenue</span
						>
						<div
							class="ao-cond mt-[6px] text-[30px] leading-none font-black text-prem tabular-nums"
						>
							${data.stats.totalRevenue}
						</div>
						<span class="mt-[4px] block text-[11.5px] text-fade"> before refunds </span>
					</div>
				{/if}
				<div class="p-5">
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>Tickets Sold</span
					>
					<div class="ao-cond mt-[6px] text-[30px] leading-none font-black text-ink tabular-nums">
						{data.stats.totalTickets}
					</div>
					{#if data.event.playerCap}
						<span class="mt-[4px] block text-[11.5px] text-fade">
							of {data.event.playerCap} cap
						</span>
					{:else}
						<span class="mt-[4px] block text-[11.5px] text-fade"> no cap </span>
					{/if}
				</div>
				<div class="p-5">
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>Refunds</span
					>
					<div
						class="ao-cond text-[30px] leading-none font-black tabular-nums {data.stats
							.totalRefunded > 0
							? 'text-warm'
							: 'text-ink'} mt-[6px] text-[clamp(28px,4vw,44px)] leading-[0.9] font-extrabold tracking-[-0.02em]"
					>
						{data.stats.totalRefunded}
					</div>
					<span class="mt-[4px] block text-[11.5px] text-fade"> refunded tickets </span>
				</div>
			</div>
		</div>

		<!-- Event Details -->
		<div class="overflow-hidden border border-line2">
			<div class="flex items-center justify-between gap-3 border-b border-line2 p-5">
				<div>
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Event Details
					</span>
					<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						Configuration.
					</h2>
				</div>
				<button
					onclick={() => (isEditMode = !isEditMode)}
					class="inline-flex items-center border border-line2 px-[14px] py-[8px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
				>
					{isEditMode ? 'Cancel' : 'Edit'}
				</button>
			</div>

			{#if isEditMode}
				<form method="POST" action="?/updateEvent" class="space-y-[18px] p-5">
					<div class="grid grid-cols-1 gap-[16px] md:grid-cols-2">
						<div>
							<label
								for="title"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>
								Event Name <span class="text-warm">*</span>
							</label>
							<input
								type="text"
								id="title"
								name="title"
								required
								value={data.event.title}
								class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
							/>
						</div>
						<div>
							<label
								for="location"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>
								Venue Name <span class="text-warm">*</span>
							</label>
							<input
								type="text"
								id="location"
								name="location"
								required
								value={data.event.location}
								class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
							/>
						</div>
						<div>
							<label
								for="address"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>Address</label
							>
							<input
								type="text"
								id="address"
								name="address"
								value={data.event.address || ''}
								class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
							/>
						</div>
						<div>
							<label
								for="format"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>
								Format <span class="text-warm">*</span>
							</label>
							<select
								id="format"
								name="format"
								required
								class="h-[40px] w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
							>
								{#each formats as format}
									<option value={format} selected={data.event.format === format}>{format}</option>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="circuit"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>Circuit</label
							>
							<select
								id="circuit"
								name="circuit"
								class="h-[40px] w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
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
							<label
								for="month"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>Month</label
							>
							<select
								id="month"
								name="month"
								class="h-[40px] w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
							>
								<option value="">Select month</option>
								{#each months as month}
									<option value={month} selected={data.event.month === month}>{month}</option>
								{/each}
							</select>
						</div>
						<div>
							<label
								for="eventDate"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>
								Event Date & Time <span class="text-warm">*</span>
							</label>
							<input
								type="datetime-local"
								id="eventDate"
								name="eventDate"
								required
								value={formatDateForInput(data.event.eventDate)}
								class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
							/>
						</div>
						<div>
							<label
								for="price"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>
								Entry Fee ($) <span class="text-warm">*</span>
								{#if data.isTournamentStaff}<span
										class="tracking-normal text-fade normal-case italic">(read-only)</span
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
								class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0 {data.isTournamentStaff
									? 'cursor-not-allowed opacity-60'
									: ''}"
							/>
						</div>
					</div>

					<div>
						<label
							for="description"
							class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>Description</label
						>
						<textarea
							id="description"
							name="description"
							rows="3"
							value={data.event.description || ''}
							class="w-full border border-line2 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
						></textarea>
					</div>

					<div class="flex flex-wrap gap-[18px] border-t border-line2 pt-[16px]">
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								id="gemIdRequired"
								name="gemIdRequired"
								bind:checked={gemIdRequired}
								class="h-4 w-4 border-line2 text-ink focus:ring-0"
							/>
							<span class="font-newsreader text-[14px] font-semibold">GEM ID Required</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								id="premiumDiscount"
								name="premiumDiscount"
								bind:checked={premiumDiscount}
								class="h-4 w-4 border-line2 text-ink focus:ring-0"
							/>
							<span class="font-newsreader text-[14px] font-semibold">Premium Discount</span>
						</label>
						<div class="flex items-center gap-3">
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									bind:checked={hasPlayerCap}
									class="h-4 w-4 border-line2 text-ink focus:ring-0"
								/>
								<span class="font-newsreader text-[14px] font-semibold">Player Cap</span>
							</label>
							{#if hasPlayerCap}
								<input
									type="number"
									name="playerCap"
									min="1"
									bind:value={playerCapValue}
									placeholder="e.g., 32"
									class="h-[40px] border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
								/>
							{/if}
						</div>
					</div>

					<div class="flex gap-3 border-t border-line2 pt-[16px]">
						<button
							type="button"
							onclick={() => (isEditMode = false)}
							class="inline-flex items-center border border-line2 px-[18px] py-[11px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="inline-flex h-[40px] shrink-0 items-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
						>
							Save Changes →
						</button>
					</div>
				</form>
			{:else}
				<dl class="grid grid-cols-1 gap-0 md:grid-cols-3">
					<div class="border-r border-b border-line2 p-5">
						<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
							Location
						</dt>
						<dd class="mt-[6px] font-newsreader text-[16px] font-semibold">
							{data.event.location || 'N/A'}
						</dd>
						{#if data.event.address}
							<dd class="mt-[2px] text-[12px] text-fade">{data.event.address}</dd>
						{/if}
					</div>
					<div class="border-r border-b border-line2 p-5">
						<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
							Format
						</dt>
						<dd class="mt-[6px] font-newsreader text-[16px] font-semibold">
							{data.event.format || 'N/A'}
						</dd>
					</div>
					<div class="border-b border-line2 p-5">
						{#if data.event.circuit}
							<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
								Circuit
							</dt>
							<dd class="mt-[6px] font-newsreader text-[16px] font-semibold">
								{data.event.circuit}
							</dd>
							{#if data.event.month}
								<dd class="mt-[2px] text-[11.5px] text-fade">
									{data.event.month}
								</dd>
							{/if}
						{:else}
							<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
								Entry Fee
							</dt>
							<dd class="mt-[6px] text-[20px] font-semibold text-prem tabular-nums">
								${parseFloat(data.event.price).toFixed(2)}
							</dd>
						{/if}
					</div>
					{#if data.event.circuit}
						<div class="border-r border-b border-line2 p-5 md:col-span-3">
							<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
								Entry Fee
							</dt>
							<dd class="mt-[6px] text-[20px] font-semibold text-prem tabular-nums">
								${parseFloat(data.event.price).toFixed(2)}
							</dd>
						</div>
					{/if}
					<div class="p-5 md:col-span-3">
						<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
							Settings
						</dt>
						<dd class="mt-[10px] flex flex-wrap gap-[8px]">
							<span
								class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {data
									.event.gemIdRequired
									? '[--tone:#8a6116]'
									: '[--tone:var(--color-fade)]'}"
							>
								{data.event.gemIdRequired ? '✓' : '—'} GEM ID Required
							</span>
							<span
								class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {data
									.event.premiumDiscount
									? '[--tone:var(--color-prem)]'
									: '[--tone:var(--color-fade)]'}"
							>
								{data.event.premiumDiscount ? '✓' : '—'} Premium Discount
							</span>
							{#if data.event.playerCap}
								<span
									class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-warm"
								>
									Cap · {data.event.playerCap} players
								</span>
							{/if}
						</dd>
					</div>
					{#if data.event.description}
						<div class="border-t border-line2 p-5 md:col-span-3">
							<dt class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
								Description
							</dt>
							<dd class="mt-[8px] font-newsreader text-[16px] leading-[1.55] text-soft">
								{data.event.description}
							</dd>
						</div>
					{/if}
				</dl>
			{/if}
		</div>

		<!-- Danger zone -->
		{#if data.isAdmin}
			<div
				class="mt-[24px] flex flex-wrap items-center justify-between gap-3 border border-hero-rb/60 p-5"
			>
				<div>
					<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
						Danger Zone
					</span>
					<p class="mt-[4px] text-[13px] leading-[1.5] text-soft">
						Permanently delete this event and all its tickets, results, decklists, and staff
						assignments.
					</p>
				</div>
				<button
					type="button"
					onclick={() => (showDeleteConfirm = true)}
					class="inline-flex h-[40px] shrink-0 items-center bg-hero-rb px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Delete Event
				</button>
			</div>
		{/if}
	{/if}

	<!-- Registrations Tab -->
	{#if activeTab === 'registrations'}
		<div class="overflow-hidden border border-line2">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-line2 p-5">
				<div>
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Registered Players
					</span>
					<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						The roster.
					</h2>
				</div>
				<span
					class="inline-flex h-[32px] shrink-0 items-center gap-1.5 bg-ink px-3 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
				>
					{data.tickets.length}{#if data.event.playerCap}/{data.event.playerCap}{/if} players
				</span>
			</div>

			{#if data.tickets.length === 0}
				<div class="p-12 text-center">
					<p class="font-newsreader text-[17px] text-soft italic">No tickets sold yet.</p>
					<p class="mt-2 text-[13px] text-fade">Registrations will appear here.</p>
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
									<div class="truncate font-newsreader text-[16px] font-semibold">
										{ticket.firstName || 'N/A'}
										{ticket.lastName || 'N/A'}
									</div>
									<div class="mt-1 flex items-center gap-2">
										<code class="truncate text-[12.5px] font-medium text-warm">
											{ticket.gemId || 'N/A'}
										</code>
										{#if ticket.gemId && ticket.gemId !== 'N/A'}
											<button
												type="button"
												onclick={(e) => copyGemId(ticket.gemId, e)}
												class="inline-flex items-center border border-line2 px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
												title="Copy GEM ID"
											>
												{copiedGemId === ticket.gemId ? 'Copied' : 'Copy'}
											</button>
										{/if}
									</div>
								</div>
								<span
									class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {ticket.refunded
										? '[--tone:var(--color-hero-rb)]'
										: '[--tone:var(--color-prem)]'}"
								>
									{ticket.refunded ? 'Refunded' : 'Paid'}
								</span>
							</div>
							<div
								class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line2 pt-3"
							>
								<span class="text-[11.5px] text-fade">
									{formatShortDate(ticket.createdAt)}
								</span>
								<div class="flex items-center gap-2">
									<span class="text-[11.5px] text-fade">In GEM:</span>
									<button
										type="button"
										onclick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											toggleGemEntry(ticket.ticketId, gemEntryStatus[ticket.ticketId]);
										}}
										disabled={gemEntryLoading[ticket.ticketId]}
										class="relative inline-flex h-[20px] w-[36px] items-center border {gemEntryStatus[
											ticket.ticketId
										]
											? 'border-prem bg-prem'
											: 'border-line2 bg-line2'} transition-colors {gemEntryLoading[ticket.ticketId]
											? 'opacity-50'
											: ''}"
										aria-label="Toggle entered into Gem"
									>
										<span
											class="inline-block h-[14px] w-[14px] bg-white transition-transform {gemEntryStatus[
												ticket.ticketId
											]
												? 'translate-x-[19px]'
												: 'translate-x-[2px]'}"
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
											class="inline-flex h-[32px] shrink-0 items-center px-2 text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40"
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
						<thead class="border-b-[1.5px] border-line2">
							<tr class="text-left">
								{#each [{ id: 'firstName', label: 'First Name' }, { id: 'lastName', label: 'Last Name' }, { id: 'gemId', label: 'GEM ID' }, { id: 'createdAt', label: 'Purchased' }, { id: 'status', label: 'Status' }, { id: 'enteredIntoGem', label: 'In GEM' }] as col (col.id)}
									<th class="px-4 py-[12px]">
										<button
											onclick={() => sortBy(col.id)}
											class="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {sortColumn ===
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
									class="px-4 py-[12px] text-right text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
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
									<td class="px-4 py-[12px] font-newsreader text-[15px] font-semibold"
										>{ticket.firstName || 'N/A'}</td
									>
									<td class="px-4 py-[12px] font-newsreader text-[15px] font-semibold"
										>{ticket.lastName || 'N/A'}</td
									>
									<td class="px-4 py-[12px]">
										<div class="inline-flex items-center gap-2">
											<code class="text-[12.5px] font-medium text-warm">
												{ticket.gemId || 'N/A'}
											</code>
											{#if ticket.gemId && ticket.gemId !== 'N/A'}
												<button
													type="button"
													onclick={(e) => copyGemId(ticket.gemId, e)}
													class="inline-flex items-center border border-line2 px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
													title="Copy GEM ID"
												>
													{copiedGemId === ticket.gemId ? '✓' : 'Copy'}
												</button>
											{/if}
										</div>
									</td>
									<td class="px-4 py-[12px] text-[11.5px] text-fade">
										{formatShortDate(ticket.createdAt)}
									</td>
									<td class="px-4 py-[12px]">
										<span
											class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {ticket.refunded
												? '[--tone:var(--color-hero-rb)]'
												: '[--tone:var(--color-prem)]'}"
										>
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
											class="relative inline-flex h-[22px] w-[40px] items-center border {gemEntryStatus[
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
												class="inline-block h-[16px] w-[16px] bg-white transition-transform {gemEntryStatus[
													ticket.ticketId
												]
													? 'translate-x-[21px]'
													: 'translate-x-[2px]'}"
											></span>
										</button>
									</td>
									<td class="px-4 py-[12px] text-right">
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
													class="inline-flex h-[32px] shrink-0 items-center px-2 text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40"
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
				<div class="border border-line2 bg-paper p-8 text-center">
					<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">
						Event Finalized
					</span>
					<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">Locked.</h2>
					<p class="mt-[10px] font-newsreader text-[16px] text-soft italic">
						This event is finalized. Reopen from the Finalize tab to import new results.
					</p>
				</div>
			{:else}
				{#if form?.processedResults}
					<div class="mb-[24px] border-l-[3px] border-prem bg-prem/10 p-6">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase">
							Success
						</span>
						<h3 class="mt-[4px] font-newsreader text-[22px] font-semibold">Results imported.</h3>
						<div class="mt-[16px] grid grid-cols-2 gap-[14px] sm:grid-cols-4">
							<div class="border border-white/30 p-3 text-center">
								<div class="text-[24px] font-semibold tabular-nums">
									{form.processedResults.totalPlayers}
								</div>
								<span
									class="mt-[4px] block text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase"
								>
									Players
								</span>
							</div>
							<div class="border border-white/30 p-3 text-center">
								<div class="text-[24px] font-semibold tabular-nums">
									{form.processedResults.totalRounds}
								</div>
								<span
									class="mt-[4px] block text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase"
								>
									Rounds
								</span>
							</div>
							<div class="border border-white/30 p-3 text-center">
								<div class="text-[24px] font-semibold tabular-nums">
									{form.processedResults.totalPointsDistributed}
								</div>
								<span
									class="mt-[4px] block text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase"
								>
									AGE Points
								</span>
							</div>
							<div class="border border-white/30 p-3 text-center">
								<div class="text-[24px] font-semibold tabular-nums">
									${form.processedResults.totalPrizeDistributed}
								</div>
								<span
									class="mt-[4px] block text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase"
								>
									Prize Pool
								</span>
							</div>
						</div>
						<button
							onclick={() => setActiveTab('results')}
							class="mt-[18px] inline-flex items-center bg-white px-[16px] py-[9px] text-[10.5px] font-extrabold tracking-[0.12em] text-prem uppercase transition-[filter] hover:brightness-95"
						>
							Review Results →
						</button>
					</div>
				{/if}

				<div class="overflow-hidden border border-line2">
					<div class="border-b border-line2 p-5">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
							Import Tournament Results
						</span>
						<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
							GEM CSV upload.
						</h2>
						<p class="mt-[6px] text-[13px] leading-[1.5] text-soft">
							Upload GEM CSV exports to calculate standings and record matches.
						</p>
					</div>
					<form
						method="POST"
						action="?/processCSV"
						enctype="multipart/form-data"
						use:enhance={csvEnhance}
						class="space-y-[18px] p-5"
					>
						<div class="grid gap-[14px] sm:grid-cols-2">
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
										class="inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center text-[13px] font-extrabold {swissStandingsFile &&
										swissStandingsFile.length > 0
											? 'bg-prem text-white'
											: 'border border-line2 text-fade'}"
									>
										{swissStandingsFile && swissStandingsFile.length > 0 ? '✓' : '01'}
									</span>
									<div class="min-w-0 flex-1">
										<div class="font-newsreader text-[15px] font-semibold">
											Swiss Standings <span class="text-warm">*</span>
										</div>
										{#if swissStandingsFile && swissStandingsFile.length > 0}
											<p class="mt-[2px] truncate text-[12.5px] font-medium text-prem">
												{swissStandingsFile[0].name}
											</p>
										{:else}
											<p class="mt-[2px] text-[12px] text-fade">Click to select CSV</p>
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
										class="inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center text-[13px] font-extrabold {pairingsFile &&
										pairingsFile.length > 0
											? 'bg-prem text-white'
											: 'border border-line2 text-fade'}"
									>
										{pairingsFile && pairingsFile.length > 0 ? '✓' : '02'}
									</span>
									<div class="min-w-0 flex-1">
										<div class="font-newsreader text-[15px] font-semibold">
											Pairings Data <span class="text-warm">*</span>
										</div>
										{#if pairingsFile && pairingsFile.length > 0}
											<p class="mt-[2px] truncate text-[12.5px] font-medium text-prem">
												{pairingsFile[0].name}
											</p>
										{:else}
											<p class="mt-[2px] text-[12px] text-fade">Click to select CSV</p>
										{/if}
									</div>
								</label>
							</div>
						</div>

						{#if data.existingResults && data.existingResults.length > 0}
							<div class="border-l-[3px] border-gold bg-gold/10 p-3">
								<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-[#8a6116] uppercase">
									Warning · will replace {data.existingResults.length} existing results
								</p>
							</div>
						{/if}

						<button
							type="submit"
							disabled={csvProcessing || !swissStandingsFile || !pairingsFile}
							class="inline-flex h-[40px] w-full shrink-0 items-center justify-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
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
		<div class="overflow-hidden border border-line2">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-line2 p-5">
				<div>
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Tournament Results
					</span>
					<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						The final standings.
					</h2>
				</div>
				{#if sortedResults.length > 0}
					<span class="text-[11.5px] text-fade">
						{sortedResults.length} players · {data.existingMatches?.length || 0} matches
					</span>
				{/if}
			</div>

			{#if sortedResults.length === 0}
				<div class="p-12 text-center">
					<p class="font-newsreader text-[17px] text-soft italic">No results recorded yet.</p>
					<p class="mt-2 text-[13px] text-fade">Import tournament CSV files to see results here.</p>
				</div>
			{:else}
				<!-- Mobile -->
				<div class="lg:hidden">
					{#each sortedResults as result (result.playerName + result.placement)}
						<div class="flex items-start gap-3 border-b border-line2 p-4 last:border-b-0">
							<span
								class="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center text-[12.5px] font-medium {result.placement ===
								1
									? 'bg-gold text-white'
									: result.placement <= 3
										? 'bg-ink text-paper-bg'
										: 'border border-line2 text-fade'}"
							>
								{result.placement}
							</span>
							<div class="min-w-0 flex-1">
								<div class="truncate font-newsreader text-[16px] font-semibold">
									{result.playerName}
								</div>
								<div class="mt-[3px] flex items-center gap-2">
									<code class="text-[12.5px] font-medium text-warm">
										{result.gemId || '—'}
									</code>
									{#if result.gemId && result.gemId !== '-'}
										<button
											type="button"
											onclick={(e) => copyGemId(result.gemId, e)}
											class="inline-flex items-center border border-line2 px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
											title="Copy GEM ID"
										>
											{copiedGemId === result.gemId ? '✓' : 'Copy'}
										</button>
									{/if}
								</div>
								<div class="mt-[10px] flex flex-wrap items-center gap-x-4 gap-y-1">
									<span class="text-[11.5px] text-fade">
										Record <span
											class="text-[12px] font-semibold tracking-[-0.01em] text-ink tabular-nums"
										>
											{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}
										</span>
									</span>
									<span class="text-[11.5px] text-fade">
										AGE Pts <span
											class="text-[12px] font-semibold tracking-[-0.01em] text-[#8a6116] tabular-nums"
											>{result.agePoints}</span
										>
									</span>
									{#if result.prizeAmount}
										<span class="text-[11.5px] text-fade">
											Prize <span
												class="text-[12px] font-semibold tracking-[-0.01em] text-prem tabular-nums"
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
						<thead class="border-b-[1.5px] border-line2">
							<tr class="text-left">
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Place</th
								>
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Player</th
								>
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>GEM ID</th
								>
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Record</th
								>
								<th
									class="px-4 py-[12px] text-right text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>AGE Pts</th
								>
								<th
									class="px-4 py-[12px] text-right text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Prize</th
								>
							</tr>
						</thead>
						<tbody>
							{#each sortedResults as result (result.playerName + result.placement)}
								<tr class="border-b border-line2 transition-colors hover:bg-paper">
									<td class="px-4 py-[12px]">
										<span
											class="inline-flex h-[28px] w-[28px] items-center justify-center text-[12.5px] font-medium {result.placement ===
											1
												? 'bg-gold text-white'
												: result.placement <= 3
													? 'bg-ink text-paper-bg'
													: 'border border-line2 text-fade'}"
										>
											{result.placement}
										</span>
									</td>
									<td class="px-4 py-[12px] font-newsreader text-[15px] font-semibold"
										>{result.playerName}</td
									>
									<td class="px-4 py-[12px]">
										<div class="inline-flex items-center gap-2">
											<code class="text-[12.5px] font-medium text-warm">
												{result.gemId || '—'}
											</code>
											{#if result.gemId && result.gemId !== '-'}
												<button
													type="button"
													onclick={(e) => copyGemId(result.gemId, e)}
													class="inline-flex items-center border border-line2 px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
													title="Copy GEM ID"
												>
													{copiedGemId === result.gemId ? '✓' : 'Copy'}
												</button>
											{/if}
										</div>
									</td>
									<td class="px-4 py-[12px] text-[15px] font-semibold text-ink tabular-nums">
										{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}
									</td>
									<td
										class="px-4 py-[12px] text-right text-[15px] font-semibold text-[#8a6116] tabular-nums"
									>
										{result.agePoints}
									</td>
									<td
										class="px-4 py-[12px] text-right text-[15px] font-semibold text-prem tabular-nums"
									>
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
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Decklists
					</span>
					<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						The bring-list.
					</h2>
				</div>
				{#if !isCompleted}
					<button
						onclick={startNewDecklist}
						class="inline-flex h-[32px] shrink-0 items-center gap-1.5 bg-ink px-3 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
					>
						+ Add Decklist
					</button>
				{/if}
			</div>

			<!-- Decklist Form Modal -->
			{#if showDecklistForm}
				<div class="overflow-hidden border border-line2 p-6">
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						{editingDecklist ? 'Edit Decklist' : 'New Decklist'}
					</span>
					<h3
						class="mt-[4px] mb-[18px] font-newsreader text-[20px] font-semibold tracking-[-0.01em]"
					>
						{editingDecklist ? editingDecklist.playerName : 'Details.'}
					</h3>

					{#if data.participants.length > 0 && !editingDecklist}
						<div class="mb-[16px]">
							<label
								for="participantSearchInput"
								class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>
								Select from Registered Players
							</label>
							<div class="relative">
								<input
									type="text"
									id="participantSearchInput"
									bind:value={participantSearch}
									onfocus={() => (showParticipantDropdown = true)}
									placeholder="Search by name or GEM ID"
									class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
								/>
								{#if participantSearch}
									<button
										type="button"
										onclick={() => {
											participantSearch = '';
										}}
										aria-label="Clear search"
										class="absolute top-1/2 right-3 -translate-y-1/2 text-[14px] text-fade hover:text-ink"
									>
										×
									</button>
								{/if}
								{#if showParticipantDropdown}
									<div
										class="absolute z-10 mt-1 max-h-48 w-full overflow-auto border border-line2 bg-paper-bg"
									>
										{#if filteredParticipants.length === 0}
											<div class="px-4 py-3 font-newsreader text-[14px] text-fade italic">
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
													class="flex w-full items-center justify-between gap-2 px-[14px] py-[8px] text-left transition-colors hover:bg-paper"
												>
													<span class="font-newsreader text-[14px] font-semibold"
														>{participant.playerName}</span
													>
													{#if participant.gemId}
														<code class="text-[12.5px] font-medium text-warm">
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
							<p class="mt-[8px] text-[11.5px] text-fade">Or enter details manually below</p>
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
								<label
									for="deckPlayerName"
									class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>
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
									class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
								/>
								<datalist id="participantNames">
									{#each data.participants as participant (participant.id || participant.playerName)}
										<option value={participant.playerName}></option>
									{/each}
								</datalist>
							</div>
							<div>
								<label
									for="deckGemId"
									class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>
									GEM ID
								</label>
								<input
									type="text"
									id="deckGemId"
									name="gemId"
									bind:value={decklistForm.gemId}
									list="participantGemIds"
									autocomplete="off"
									class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
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
								<label
									for="heroSearch"
									class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>
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
										class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
									/>
									{#if heroSearch}
										<button
											type="button"
											onclick={() => {
												heroSearch = '';
												decklistForm.hero = '';
											}}
											class="absolute top-1/2 right-3 -translate-y-1/2 text-[14px] text-fade hover:text-ink"
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
											<div class="px-4 py-3 font-newsreader text-[14px] text-fade italic">
												No matching heroes
											</div>
										{:else}
											{#each filteredHeroes.slice(0, 20) as hero (hero)}
												<button
													type="button"
													onclick={() => selectHero(hero)}
													class="w-full px-[14px] py-[7px] text-left font-newsreader text-[14px] transition-colors hover:bg-paper"
												>
													{hero}
												</button>
											{/each}
											{#if filteredHeroes.length > 20}
												<div class="text-[11.5px] text-fade">
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
								<label
									for="placement"
									class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>
									Placement
								</label>
								<select
									id="placement"
									name="placement"
									bind:value={decklistForm.placement}
									class="h-[40px] w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
								>
									<option value="">Select…</option>
									{#each PLACEMENT_BANDS as band (band.value)}
										<option value={band.value}>{band.label}</option>
									{/each}
								</select>
							</div>

							<div>
								<label
									for="deckFormat"
									class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>
									Format
								</label>
								<select
									id="deckFormat"
									name="format"
									bind:value={decklistForm.format}
									class="h-[40px] w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
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
								<label
									for="cardsText"
									class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>
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
									class="w-full border border-line2 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
								></textarea>
								<p class="mt-[8px] text-[11.5px] text-fade">
									Paste decklist directly from GEM export
								</p>
							</div>

							<!-- Live Preview -->
							<div>
								<span
									class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
								>
									Preview
								</span>
								<div class="h-[400px] overflow-auto border border-line2 bg-paper p-4">
									{#if decklistPreview.totals.total === 0}
										<p class="font-newsreader text-[15px] text-soft italic">
											Paste a decklist to see preview…
										</p>
									{:else}
										<div class="space-y-[16px]">
											{#if decklistPreview.equipment.length > 0}
												<div>
													<h4
														class="mb-[8px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
													>
														Equipment · {decklistPreview.totals.equipment}
													</h4>
													<div class="space-y-[3px]">
														{#each decklistPreview.equipment as card, i (card.name + i)}
															<div class="flex justify-between font-newsreader text-[13px]">
																<span>{card.name}</span>
																<span class="text-[12.5px] font-medium text-fade"
																	>{card.quantity}</span
																>
															</div>
														{/each}
													</div>
												</div>
											{/if}
											{#if decklistPreview.red.length > 0}
												<div>
													<h4
														class="mb-[8px] text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase"
													>
														Red · {decklistPreview.totals.red}
													</h4>
													<div class="space-y-[3px]">
														{#each decklistPreview.red as card, i (card.name + i)}
															<div class="flex justify-between font-newsreader text-[13px]">
																<span>{card.name}</span>
																<span class="text-[12.5px] font-medium text-fade"
																	>{card.quantity}</span
																>
															</div>
														{/each}
													</div>
												</div>
											{/if}
											{#if decklistPreview.yellow.length > 0}
												<div>
													<h4
														class="mb-[8px] text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
													>
														Yellow · {decklistPreview.totals.yellow}
													</h4>
													<div class="space-y-[3px]">
														{#each decklistPreview.yellow as card, i (card.name + i)}
															<div class="flex justify-between font-newsreader text-[13px]">
																<span>{card.name}</span>
																<span class="text-[12.5px] font-medium text-fade"
																	>{card.quantity}</span
																>
															</div>
														{/each}
													</div>
												</div>
											{/if}
											{#if decklistPreview.blue.length > 0}
												<div>
													<h4
														class="mb-[8px] text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
													>
														Blue · {decklistPreview.totals.blue}
													</h4>
													<div class="space-y-[3px]">
														{#each decklistPreview.blue as card, i (card.name + i)}
															<div class="flex justify-between font-newsreader text-[13px]">
																<span>{card.name}</span>
																<span class="text-[12.5px] font-medium text-fade"
																	>{card.quantity}</span
																>
															</div>
														{/each}
													</div>
												</div>
											{/if}
											<div class="border-t border-line2 pt-[10px]">
												<div class="flex justify-between">
													<span
														class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
														>Total Cards</span
													>
													<span class="text-[15px] font-semibold text-ink tabular-nums">
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
							<span class="font-newsreader text-[14px] font-semibold">
								Make this decklist public
							</span>
						</label>

						<div class="flex justify-end gap-3 border-t border-line2 pt-[16px]">
							<button
								type="button"
								onclick={cancelDecklistForm}
								class="inline-flex h-[40px] shrink-0 items-center gap-2 border border-line2 px-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="inline-flex h-[40px] shrink-0 items-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
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
					<div class="col-span-full border border-line2 p-12 text-center">
						<p class="font-newsreader text-[17px] text-soft italic">No decklists recorded yet.</p>
						{#if !isCompleted}
							<button
								onclick={startNewDecklist}
								class="mt-4 text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase transition-colors hover:text-ink"
							>
								Add the first decklist →
							</button>
						{/if}
					</div>
				{:else}
					{#each data.existingDecklists.sort((a, b) => (a.placement || 99) - (b.placement || 99)) as decklist (decklist.id)}
						<div class="overflow-hidden border border-line2 p-4">
							<div class="mb-[10px] flex items-start justify-between">
								<div class="flex items-start gap-3">
									{#if decklist.placement}
										<span
											class="inline-flex h-[28px] shrink-0 items-center justify-center px-2 text-[11px] font-bold whitespace-nowrap {decklist.placement ===
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
										<h4 class="font-newsreader text-[16px] font-semibold">{decklist.playerName}</h4>
										{#if decklist.hero}
											<p class="mt-[2px] text-[9.5px] font-extrabold tracking-[0.18em] uppercase">
												{decklist.hero}
											</p>
										{/if}
									</div>
								</div>
								{#if !isCompleted}
									<div class="flex gap-2">
										<button
											onclick={() => editDecklist(decklist)}
											class="text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase transition-colors hover:text-ink"
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
												class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase transition-colors hover:text-ink"
											>
												Del
											</button>
										</form>
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-2 text-[11.5px] text-fade">
								<span>{decklist.cards?.reduce((sum, c) => sum + c.quantity, 0) || 0} cards</span>
								<span>·</span>
								<span>{decklist.format || 'Unknown'}</span>
								{#if decklist.gemId}
									<span>·</span>
									<span class="text-warm">{decklist.gemId}</span>
								{/if}
							</div>
							{#if !decklist.isPublic}
								<span class="mt-[8px] text-[9.5px] font-extrabold tracking-[0.18em] uppercase">
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
			<div class="overflow-hidden border border-line2">
				<div class="border-b border-line2 p-5">
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Upload Hero Data
					</span>
					<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						Hero roster.
					</h2>
					<p class="mt-[6px] text-[13px] leading-[1.5] text-soft">
						Import hero choices from the GEM export.
					</p>
				</div>

				<div class="p-5">
					{#if !data.event.circuit || !data.event.month}
						<div class="border-l-[3px] border-gold bg-gold/10 p-4">
							<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-[#8a6116] uppercase">
								Setup Required
							</span>
							<p class="mt-[6px] text-[13px] leading-[1.5] text-soft">
								Set the Circuit and Month in the Overview tab before uploading hero data.
							</p>
						</div>
					{:else}
						<form
							method="POST"
							action="?/uploadHeroes"
							enctype="multipart/form-data"
							use:enhance={heroesEnhance}
							class="space-y-[16px]"
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
										class="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center text-[13px] font-extrabold {heroesFile &&
										heroesFile.length > 0
											? 'bg-prem text-white'
											: 'border border-line2 text-fade'}"
									>
										{heroesFile && heroesFile.length > 0 ? '✓' : 'CSV'}
									</span>
									<div class="min-w-0 flex-1">
										{#if heroesFile && heroesFile.length > 0}
											<p class="truncate text-[12.5px] font-medium text-prem">
												{heroesFile[0].name}
											</p>
										{:else}
											<div class="font-newsreader text-[15px] font-semibold">Heroes CSV</div>
											<p class="mt-[2px] text-[11px] text-fade">
												Player Name, Player ID, Country/Region, Hero
											</p>
										{/if}
									</div>
								</label>
							</div>

							{#if data.existingHeroes?.length > 0}
								<div class="border-l-[3px] border-gold bg-gold/10 p-3">
									<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-[#8a6116] uppercase">
										Warning · will replace {data.existingHeroes.length} existing entries
									</p>
								</div>
							{/if}

							<div class="flex gap-3">
								<button
									type="submit"
									disabled={heroesProcessing || !heroesFile}
									class="inline-flex h-[40px] flex-1 shrink-0 items-center justify-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
								>
									{heroesProcessing ? 'Processing…' : 'Upload Heroes →'}
								</button>
								{#if data.existingHeroes?.length > 0}
									<button
										type="submit"
										formaction="?/deleteHeroes"
										class="inline-flex h-[40px] shrink-0 items-center gap-2 border border-hero-rb/60 px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-hero-rb uppercase transition-colors hover:border-hero-rb disabled:cursor-not-allowed disabled:opacity-40"
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
			<div class="overflow-hidden border border-line2">
				<div class="border-b border-line2 p-5">
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Metagame Breakdown
					</span>
					<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						The field.
					</h2>
					<p class="mt-[6px] text-[11.5px] text-fade">
						{data.existingHeroes?.length || 0} players registered
					</p>
				</div>

				{#if !data.existingHeroes?.length}
					<div class="p-12 text-center">
						<p class="font-newsreader text-[17px] text-soft italic">No hero data uploaded yet.</p>
						<p class="mt-2 text-[13px] text-fade">
							Upload a heroes CSV to see the metagame breakdown.
						</p>
					</div>
				{:else}
					<div class="space-y-[14px] p-5">
						{#each heroBreakdown() as { hero, count, percentage }, idx (hero + idx)}
							<div class="flex items-center gap-4">
								<span class="w-[24px] text-right text-[12.5px] font-medium text-fade">
									{idx + 1}
								</span>
								<div class="min-w-0 flex-1">
									<div class="mb-[6px] flex items-baseline justify-between gap-3">
										<span class="truncate font-newsreader text-[15px] font-semibold">{hero}</span>
										<span class="shrink-0 text-[11.5px] text-fade">
											{count}
											<span class="text-warm">· {percentage}%</span>
										</span>
									</div>
									<div class="h-[6px] bg-line2">
										<div class="h-full bg-warm" style="width: {percentage}%"></div>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<div class="border-t border-line2 p-5">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
							All Players
						</span>
						<div
							class="mt-[14px] grid max-h-96 grid-cols-1 gap-[8px] overflow-y-auto sm:grid-cols-2 lg:grid-cols-3"
						>
							{#each data.existingHeroes.sort( (a, b) => a.playerName.localeCompare(b.playerName) ) as entry (entry.playerName + entry.hero)}
								<div class="flex items-center gap-2 border border-line2 bg-paper p-2">
									<span class="flex-1 truncate font-newsreader text-[13px] font-semibold"
										>{entry.playerName}</span
									>
									<span class="truncate text-[9.5px] font-extrabold tracking-[0.18em] uppercase">
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
			<div class="overflow-hidden border border-line2">
				<div class="border-b border-line2 p-5">
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Assigned Staff
					</span>
					<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						Who's on the desk.
					</h2>
				</div>
				<div class="p-5">
					{#if data.assignedStaff?.length > 0}
						<div class="space-y-[10px]">
							{#each data.assignedStaff as staff (staff.userId)}
								<div class="flex items-center justify-between border border-line2 p-4">
									<div class="flex items-center gap-3">
										<span
											class="flex h-[36px] w-[36px] items-center justify-center border border-line2 bg-paper font-newsreader text-[15px] font-semibold"
										>
											{staff.userEmail?.charAt(0).toUpperCase() || '?'}
										</span>
										<div>
											<div class="font-newsreader text-[15px] font-semibold">{staff.userEmail}</div>
											<div class="mt-[2px] text-[11.5px] text-fade">
												Assigned {formatShortDate(staff.createdAt)}
											</div>
										</div>
									</div>
									<form method="POST" action="?/unassignStaff">
										<input type="hidden" name="staffId" value={staff.userId} />
										<button
											type="submit"
											class="inline-flex h-[32px] shrink-0 items-center px-2 text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40"
										>
											Remove
										</button>
									</form>
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-8 text-center">
							<p class="font-newsreader text-[17px] text-soft italic">
								No staff assigned to this event.
							</p>
							<p class="mt-2 text-[13px] text-fade">
								Use the search below to assign tournament staff.
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Add Staff -->
			<div class="overflow-hidden border border-line2">
				<div class="border-b border-line2 p-5">
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Add Staff
					</span>
					<h2 class="mt-[4px] font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
						Bring someone in.
					</h2>
					<p class="mt-[6px] text-[13px] leading-[1.5] text-soft">
						Search any user by email to assign them to this event.
					</p>
				</div>
				<div class="p-5">
					<div class="mb-[16px]">
						<label
							for="staff-search"
							class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Search by Email
						</label>
						<div class="relative">
							<input
								id="staff-search"
								type="email"
								value={staffSearch}
								oninput={(e) => handleStaffSearchInput(e.target.value)}
								placeholder="Email address · min 3 characters"
								class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
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
						<p class="mt-[8px] text-[11.5px] text-fade">Type at least 3 characters</p>
					</div>

					{#if staffSearchResults.length > 0}
						<div class="max-h-64 space-y-[8px] overflow-y-auto">
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
											class="flex h-[36px] w-[36px] items-center justify-center border border-line2 bg-paper font-newsreader text-[15px] font-semibold"
										>
											{userResult.email?.charAt(0).toUpperCase() || '?'}
										</span>
										<div>
											<div class="font-newsreader text-[15px] font-semibold">
												{userResult.email}
											</div>
											<div class="mt-[2px] text-[11.5px] text-fade">
												Role · {userResult.role || 'user'}
											</div>
										</div>
									</div>
									<button
										type="submit"
										class="inline-flex h-[32px] shrink-0 items-center gap-1.5 bg-prem px-3 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Assign
									</button>
								</form>
							{/each}
						</div>
					{:else if staffSearch.length >= 3 && !staffSearchLoading}
						<div class="p-6 text-center">
							<p class="font-newsreader text-[17px] text-soft italic">
								No users found matching "{staffSearch}".
							</p>
						</div>
					{:else if staffSearch.length === 0}
						<div class="p-6 text-center">
							<p class="font-newsreader text-[17px] text-soft italic">
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
		<div class="w-full max-w-md border border-t-[3px] border-line2 border-t-ink bg-paper-bg">
			<div class="border-b border-line2 p-6">
				<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
					Danger Zone
				</span>
				<h3 class="mt-[6px] font-newsreader text-[22px] font-semibold">Delete this event?</h3>
				<p class="mt-[4px] font-newsreader text-[15px] text-soft italic">
					This action cannot be undone.
				</p>
			</div>
			<div class="p-6">
				<p class="font-newsreader text-[16px] leading-[1.55] text-ink">
					You're about to delete <strong>{data.event.title}</strong>. All associated tickets,
					results, decklists, and staff assignments will be removed permanently.
				</p>
			</div>
			<div class="flex justify-end gap-3 border-t border-line2 p-6">
				<button
					type="button"
					onclick={() => (showDeleteConfirm = false)}
					class="inline-flex items-center border border-line2 px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
				>
					Cancel
				</button>
				<form method="POST" action="?/deleteEvent">
					<button
						type="submit"
						class="inline-flex h-[40px] shrink-0 items-center bg-hero-rb px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
		<div class="w-full max-w-lg border border-t-[3px] border-line2 border-t-ink bg-paper-bg">
			<div class="border-b border-line2 p-6">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] uppercase"> Finalize </span>
				<h3 class="mt-[6px] font-newsreader text-[22px] font-semibold">Close this event?</h3>
				<p class="mt-[4px] font-newsreader text-[15px] text-soft italic">
					Season standings will be updated with results.
				</p>
			</div>

			<div class="space-y-[16px] p-6">
				<!-- Summary -->
				<div class="border border-line2 bg-paper p-4">
					<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Summary
					</span>
					<dl class="mt-[10px] space-y-[6px]">
						<div class="flex justify-between">
							<dt class="text-[11.5px] text-fade">Results Recorded</dt>
							<dd class="text-[14px] font-semibold text-ink tabular-nums">
								{data.existingResults?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-[11.5px] text-fade">Decklists Recorded</dt>
							<dd class="text-[14px] font-semibold text-ink tabular-nums">
								{data.existingDecklists?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-[11.5px] text-fade">Registered Players</dt>
							<dd class="text-[14px] font-semibold text-ink tabular-nums">
								{data.participants?.length || 0}
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-[11.5px] text-fade">Circuit</dt>
							<dd class="font-newsreader text-[13px] font-semibold text-ink">
								{data.event.circuit || 'Not set'}
							</dd>
						</div>
					</dl>
				</div>

				{#if !hasResults}
					<div class="border-l-[3px] border-gold bg-gold/10 p-3">
						<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-[#8a6116] uppercase"
							>Warning</span
						>
						<p class="mt-[2px] text-[13px] text-soft">
							No results recorded yet. Import CSV or add results before closing.
						</p>
					</div>
				{/if}

				{#if !data.event.circuit}
					<div class="border-l-[3px] border-hero-rb bg-hero-rb/[0.06] p-3">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-hero-rb uppercase"
							>Error</span
						>
						<p class="mt-[2px] font-newsreader text-[14px] font-semibold">
							This event has no circuit assigned. Edit the event to add one before closing.
						</p>
					</div>
				{/if}

				<p class="text-[13px] leading-[1.5] text-soft">
					Closing will update season standings with AGE points and match data for all players.
				</p>
			</div>

			<div class="flex justify-end gap-3 border-t border-line2 p-6">
				<button
					type="button"
					onclick={() => (showCloseConfirm = false)}
					class="inline-flex items-center border border-line2 px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
				>
					Cancel
				</button>
				<form method="POST" action="?/finalizeEvent">
					<button
						type="submit"
						disabled={!hasResults || !data.event.circuit}
						class="inline-flex h-[40px] shrink-0 items-center bg-prem px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Close Event →
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
