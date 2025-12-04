<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	/**
	 * Calculate derived stats from monthly data
	 * - eventsPlayed: count of months with points > 0
	 * - top8Finishes: count of months with points >= 15 (5th-8th or better)
	 */
	function calculateDerivedStats(standing) {
		const monthlyPoints = [
			standing.januaryPoints || 0,
			standing.februaryPoints || 0,
			standing.marchPoints || 0,
			standing.aprilPoints || 0,
			standing.mayPoints || 0,
			standing.junePoints || 0,
			standing.julyPoints || 0,
			standing.augustPoints || 0,
			standing.septemberPoints || 0,
			standing.octoberPoints || 0,
			standing.novemberPoints || 0,
			standing.decemberPoints || 0
		];

		const eventsPlayed = monthlyPoints.filter(p => p > 0).length;
		const top8Finishes = monthlyPoints.filter(p => p >= 15).length;

		return { eventsPlayed, top8Finishes };
	}

	/**
	 * Compare two standings using tiebreaker rules:
	 * 1. Total Points (primary)
	 * 2. Number of Top 8's made
	 * 3. Total match wins
	 * 4. Number of events attended
	 */
	function compareStandings(a, b) {
		const pointsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
		if (pointsDiff !== 0) return pointsDiff;

		const aDerived = calculateDerivedStats(a);
		const bDerived = calculateDerivedStats(b);

		const top8Diff = bDerived.top8Finishes - aDerived.top8Finishes;
		if (top8Diff !== 0) return top8Diff;
		const winsDiff = (b.matchesWon || 0) - (a.matchesWon || 0);
		if (winsDiff !== 0) return winsDiff;
		return bDerived.eventsPlayed - aDerived.eventsPlayed;
	}

	// Get active tab from URL, defaulting to 'overview'
	let activeTab = $derived($page.url.searchParams.get('tab') || 'overview');

	// Search and filter state
	let userSearchQuery = $state('');
	let selectedEventForStaff = $state('');

	// Get staff assignments for a specific event
	function getStaffForEvent(eventId) {
		return data.staffAssignments
			.filter((assignment) => assignment.eventId === eventId)
			.map((assignment) => assignment.userId);
	}

	// Check if a staff member is assigned to an event
	function isStaffAssigned(staffId, eventId) {
		return data.staffAssignments.some(
			(assignment) => assignment.userId === staffId && assignment.eventId === eventId
		);
	}

	// Filter users based on search query
	let filteredUsers = $derived((data.allUsers || []).filter((user) =>
		user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
	));

	// Function to switch tabs and update URL
	function switchTab(tabId) {
		const url = new URL($page.url);
		if (tabId === 'overview') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', tabId);
		}
		goto(url.toString(), { replaceState: false, noScroll: true });
	}

	// Tab configuration with icons
	const tabs = [
		{ id: 'overview', name: 'Overview', icon: 'home' },
		{ id: 'orders', name: 'Orders', icon: 'receipt' },
		{ id: 'users', name: 'Users', icon: 'user' },
		{ id: 'events', name: 'Events', icon: 'ticket' },
		{ id: 'staff', name: 'Staff', icon: 'users' },
		{ id: 'players', name: 'Standings', icon: 'trophy' },
		{ id: 'seasons', name: 'Calendar', icon: 'calendar-days' }
	];

	// LSS Seasons state
	let showAddSeasonForm = $state(false);
	let editingSeasonId = $state(null);
	let calendarSubTab = $state('upcoming'); // 'upcoming' or 'completed'

	// Filter LSS events based on sub-tab
	let upcomingLssEvents = $derived((data.lssSeasons || []).filter((s) => {
		const endDate = new Date(s.endDate);
		const now = new Date();
		return endDate >= now; // Include active and upcoming
	}));

	let completedLssEvents = $derived((data.lssSeasons || []).filter((s) => {
		const endDate = new Date(s.endDate);
		const now = new Date();
		return endDate < now;
	}));

	let displayedLssEvents = $derived(calendarSubTab === 'upcoming' ? upcomingLssEvents : completedLssEvents);

	// Stats for overview
	let upcomingEvents = $derived((data.events || []).filter((e) => new Date(e.eventDate) > new Date()).length);
	let pastEvents = $derived((data.events || []).filter((e) => new Date(e.eventDate) <= new Date()).length);

	// Standings table state
	let standingsSearchQuery = $state('');
	let standingsSeasonFilter = $state('all');
	let standingsCircuitFilter = $state('all');

	// Create Standing Modal state
	let showCreateStandingModal = $state(false);
	let newStanding = $state({
		season: '2026',
		circuit: 'Los Angeles',
		playerName: '',
		gemId: '',
		totalPoints: 0,
		matchesPlayed: 0,
		matchesWon: 0
	});

	function resetNewStanding() {
		newStanding = {
			season: '2026',
			circuit: 'Los Angeles',
			playerName: '',
			gemId: '',
			totalPoints: 0,
			matchesPlayed: 0,
			matchesWon: 0
		};
	}

	// Delete confirmation modal state for standings
	let showDeleteModal = $state(false);
	let deleteStandingData = $state(null);
	let deleteConfirmationInput = $state('');
	let isDeleting = $state(false);

	function openDeleteModal(standing) {
		deleteStandingData = standing;
		deleteConfirmationInput = '';
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		deleteStandingData = null;
		deleteConfirmationInput = '';
		isDeleting = false;
	}

	// Check if delete confirmation matches player name (case-insensitive)
	let canDelete = $derived(
		deleteStandingData &&
		deleteConfirmationInput.toLowerCase().trim() === deleteStandingData.playerName?.toLowerCase().trim()
	);

	// ========== ORDER MANAGEMENT STATE ==========
	// Orders tab state
	let ordersSearchQuery = $state('');
	let ordersTypeFilter = $state('all'); // 'all', 'ticket', 'course', 'subscription'
	let ordersStatusFilter = $state('all'); // 'all', 'completed', 'refunded'
	let ordersDateFilter = $state('all'); // 'all', 'today', 'week', 'month'
	let ordersPage = $state(1);
	let ordersPerPage = 25;
	let ordersSortBy = $state('date'); // 'date', 'amount'
	let ordersSortDir = $state('desc');

	// Format currency helper
	function formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount || 0);
	}

	// Format date helper
	function formatDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
		return new Date(date).toLocaleDateString('en-US', options);
	}

	// Filtered and sorted orders
	let filteredOrders = $derived((data.allOrders || [])
		.filter((ord) => {
			// Search filter
			if (ordersSearchQuery) {
				const q = ordersSearchQuery.toLowerCase();
				const matchesEmail = ord.userEmail?.toLowerCase().includes(q);
				const matchesId = ord.id?.toLowerCase().includes(q);
				const matchesTxn = ord.providerRef?.toLowerCase().includes(q);
				if (!matchesEmail && !matchesId && !matchesTxn) return false;
			}
			// Type filter
			if (ordersTypeFilter !== 'all' && ord.meta?.type !== ordersTypeFilter) return false;
			// Date filter
			if (ordersDateFilter !== 'all') {
				const orderDate = new Date(ord.createdAt);
				const now = new Date();
				if (ordersDateFilter === 'today') {
					const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
					if (orderDate < todayStart) return false;
				} else if (ordersDateFilter === 'week') {
					const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					if (orderDate < weekAgo) return false;
				} else if (ordersDateFilter === 'month') {
					const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
					if (orderDate < monthStart) return false;
				}
			}
			return true;
		})
		.sort((a, b) => {
			if (ordersSortBy === 'amount') {
				const diff = parseFloat(a.amount) - parseFloat(b.amount);
				return ordersSortDir === 'asc' ? diff : -diff;
			}
			const diff = new Date(a.createdAt) - new Date(b.createdAt);
			return ordersSortDir === 'asc' ? diff : -diff;
		}));

	let totalOrdersPages = $derived(Math.ceil(filteredOrders.length / ordersPerPage));
	let paginatedOrders = $derived(filteredOrders.slice(
		(ordersPage - 1) * ordersPerPage,
		ordersPage * ordersPerPage
	));

	// Reset page on filter change
	$effect(() => {
		// Track filter dependencies
		ordersSearchQuery;
		ordersTypeFilter;
		ordersDateFilter;
		ordersPage = 1;
	});

	// Generate SVG path for revenue trend chart
	function generateChartPath(data, width, height, padding = 20) {
		if (!data || data.length === 0) return '';

		const maxValue = Math.max(...data.map((d) => d.total), 1);
		const minValue = 0;
		const xStep = (width - padding * 2) / Math.max(data.length - 1, 1);
		const yScale = (height - padding * 2) / (maxValue - minValue || 1);

		const points = data.map((d, i) => {
			const x = padding + i * xStep;
			const y = height - padding - (d.total - minValue) * yScale;
			return `${x},${y}`;
		});

		return `M ${points.join(' L ')}`;
	}

	// Generate area path for chart fill
	function generateAreaPath(data, width, height, padding = 20) {
		if (!data || data.length === 0) return '';

		const maxValue = Math.max(...data.map((d) => d.total), 1);
		const minValue = 0;
		const xStep = (width - padding * 2) / Math.max(data.length - 1, 1);
		const yScale = (height - padding * 2) / (maxValue - minValue || 1);

		const points = data.map((d, i) => {
			const x = padding + i * xStep;
			const y = height - padding - (d.total - minValue) * yScale;
			return `${x},${y}`;
		});

		const baseline = height - padding;
		const firstX = padding;
		const lastX = padding + (data.length - 1) * xStep;

		return `M ${firstX},${baseline} L ${points.join(' L ')} L ${lastX},${baseline} Z`;
	}

	// Sorting state for standings
	let sortColumn = $state('points'); // 'points', 'winPct', 'record', 'events', 'top8'
	let sortDirection = $state('desc'); // 'asc' or 'desc'

	function toggleSort(column) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		} else {
			sortColumn = column;
			sortDirection = 'desc'; // Default to descending for new column
		}
		adminStandingsPage = 1; // Reset to first page when sorting
	}

	// Pagination for standings
	let adminStandingsPage = $state(1);
	const adminStandingsPerPage = 25;

	// Get unique seasons and circuits
	let uniqueSeasons = $derived([...new Set((data.standings || []).map((s) => s.season))].sort().reverse());
	let uniqueCircuits = $derived([...new Set((data.standings || []).map((s) => s.circuit))].sort());

	// Filter standings
	let filteredStandings = $derived.by(() => {
		// Custom sort function based on selected column
		function sortStandingsLocal(a, b) {
			let aVal, bVal;

			switch (sortColumn) {
				case 'points':
					aVal = a.totalPoints || 0;
					bVal = b.totalPoints || 0;
					break;
				case 'winPct':
					aVal = a.winPercentage || 0;
					bVal = b.winPercentage || 0;
					break;
				case 'record':
					// Sort by wins primarily
					aVal = a.matchesWon || 0;
					bVal = b.matchesWon || 0;
					break;
				case 'events':
					aVal = calculateDerivedStats(a).eventsPlayed;
					bVal = calculateDerivedStats(b).eventsPlayed;
					break;
				case 'top8':
					aVal = calculateDerivedStats(a).top8Finishes;
					bVal = calculateDerivedStats(b).top8Finishes;
					break;
				default:
					return compareStandings(a, b);
			}

			const diff = sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
			// Use tiebreaker rules if values are equal
			if (diff === 0) return compareStandings(a, b);
			return diff;
		}

		return (data.standings || [])
			.filter((s) => {
				// Search filter
				if (standingsSearchQuery) {
					const search = standingsSearchQuery.toLowerCase();
					const matchesName = s.playerName?.toLowerCase().includes(search);
					const matchesGemId = s.gemId?.toLowerCase().includes(search);
					if (!matchesName && !matchesGemId) return false;
				}
				// Season filter
				if (standingsSeasonFilter !== 'all' && s.season !== standingsSeasonFilter) return false;
				// Circuit filter
				if (standingsCircuitFilter !== 'all' && s.circuit !== standingsCircuitFilter) return false;
				return true;
			})
			.sort(sortStandingsLocal);
	});

	// Paginated standings for admin
	let totalAdminStandingsPages = $derived(Math.ceil(filteredStandings.length / adminStandingsPerPage));
	let paginatedAdminStandings = $derived(filteredStandings.slice(
		(adminStandingsPage - 1) * adminStandingsPerPage,
		adminStandingsPage * adminStandingsPerPage
	));

	// Reset page when filters change
	$effect(() => {
		standingsSearchQuery;
		standingsSeasonFilter;
		standingsCircuitFilter;
		adminStandingsPage = 1;
	});
</script>

<svelte:head>
	<title>Admin Dashboard - AGE</title>
</svelte:head>

		<!-- Main Content -->
		<main class="min-h-screen w-full">
			<!-- Top Bar (Desktop only - mobile header is in layout) -->
			<header class="sticky top-0 z-30 hidden border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm lg:block">
				<div class="flex h-16 items-center justify-between px-8">
					<div>
						<h1 class="text-xl font-bold text-white">
							{#if activeTab === 'overview'}Dashboard Overview
							{:else if activeTab === 'events'}Events Management
							{:else if activeTab === 'orders'}Order History
							{:else if activeTab === 'staff'}Tournament Staff
							{:else if activeTab === 'users'}User Management
							{:else if activeTab === 'players'}Standings
							{:else if activeTab === 'seasons'}Calendar
							{/if}
						</h1>
					</div>
					<div class="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-1.5">
						<div class="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
						<span class="text-sm text-gray-300">{data.user.email}</span>
					</div>
				</div>
			</header>

			<div class="p-4 lg:p-8">
				<!-- Success/Error Messages -->
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

				<!-- Overview Tab Content -->
				{#if activeTab === 'overview'}
					<!-- Stats Cards -->
					<div class="mb-6 sm:mb-8 grid grid-cols-2 gap-2 sm:gap-6 lg:grid-cols-4">
						<div
							class="group relative overflow-hidden rounded-lg sm:rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/50 via-gray-900 to-gray-950 p-3 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10"
						>
							<div
								class="absolute top-0 right-0 h-24 w-24 rounded-full bg-blue-500/20 blur-2xl transition-colors group-hover:bg-blue-500/30"
							></div>
							<div class="relative flex items-center gap-2 sm:gap-4">
								<div
									class="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-110"
								>
									<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
								</div>
								<div>
									<div class="text-xl sm:text-3xl font-bold text-white">{data.stats.totalEvents}</div>
									<div class="text-xs sm:text-sm text-blue-300/80">Total Events</div>
								</div>
							</div>
						</div>

						<div
							class="group relative overflow-hidden rounded-lg sm:rounded-xl border border-green-500/30 bg-gradient-to-br from-green-950/50 via-gray-900 to-gray-950 p-3 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-green-500/60 hover:shadow-lg hover:shadow-green-500/10"
						>
							<div
								class="absolute top-0 right-0 h-24 w-24 rounded-full bg-green-500/20 blur-2xl transition-colors group-hover:bg-green-500/30"
							></div>
							<div class="relative flex items-center gap-2 sm:gap-4">
								<div
									class="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 transition-transform group-hover:scale-110"
								>
									<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div>
									<div class="text-xl sm:text-3xl font-bold text-white">{data.stats.totalOrders}</div>
									<div class="text-xs sm:text-sm text-green-300/80">Total Orders</div>
								</div>
							</div>
						</div>

						<div
							class="group relative overflow-hidden rounded-lg sm:rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-gray-900 to-gray-950 p-3 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/10"
						>
							<div
								class="absolute top-0 right-0 h-24 w-24 rounded-full bg-purple-500/20 blur-2xl transition-colors group-hover:bg-purple-500/30"
							></div>
							<div class="relative flex items-center gap-2 sm:gap-4">
								<div
									class="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30 transition-transform group-hover:scale-110"
								>
									<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
									</svg>
								</div>
								<div>
									<div class="text-xl sm:text-3xl font-bold text-white">{data.stats.premiumUsers}</div>
									<div class="text-xs sm:text-sm text-purple-300/80">Premium</div>
								</div>
							</div>
						</div>

						<div
							class="group relative overflow-hidden rounded-lg sm:rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/50 via-gray-900 to-gray-950 p-3 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10"
						>
							<div
								class="absolute top-0 right-0 h-24 w-24 rounded-full bg-amber-500/20 blur-2xl transition-colors group-hover:bg-amber-500/30"
							></div>
							<div class="relative flex items-center gap-2 sm:gap-4">
								<div
									class="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 transition-transform group-hover:scale-110"
								>
									<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
									</svg>
								</div>
								<div>
									<div class="text-xl sm:text-3xl font-bold text-white">{(data.allUsers || []).length}</div>
									<div class="text-xs sm:text-sm text-amber-300/80">Total Users</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Quick Actions & Recent Activity -->
					<div class="grid gap-6 lg:grid-cols-3">
						<!-- Quick Actions -->
						<div class="lg:col-span-1">
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
								<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
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
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
									Quick Actions
								</h3>
								<div class="space-y-3">
									<a
										href="/admin/events/new"
										class="group flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4 transition-all hover:border-blue-500/50 hover:bg-gray-800"
									>
										<div
											class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 transition-colors group-hover:bg-blue-500/30"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 4v16m8-8H4"
												/>
											</svg>
										</div>
										<div>
											<div class="font-medium text-white">Create Event</div>
											<div class="text-xs text-gray-400">Add a new tournament</div>
										</div>
									</a>

									<button
										onclick={() => switchTab('users')}
										class="group flex w-full items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-left transition-all hover:border-purple-500/50 hover:bg-gray-800"
									>
										<div
											class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 transition-colors group-hover:bg-purple-500/30"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
												/>
											</svg>
										</div>
										<div>
											<div class="font-medium text-white">Manage Users</div>
											<div class="text-xs text-gray-400">Update roles & permissions</div>
										</div>
									</button>

									<button
										onclick={() => switchTab('staff')}
										class="group flex w-full items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-left transition-all hover:border-green-500/50 hover:bg-gray-800"
									>
										<div
											class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400 transition-colors group-hover:bg-green-500/30"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
												/>
											</svg>
										</div>
										<div>
											<div class="font-medium text-white">Staff Assignments</div>
											<div class="text-xs text-gray-400">Manage tournament staff</div>
										</div>
									</button>
								</div>
							</div>
						</div>

						<!-- Recent Events -->
						<div class="lg:col-span-2">
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
								<div class="mb-4 flex items-center justify-between">
									<h3 class="flex items-center gap-2 text-lg font-semibold text-white">
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
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
										Recent Events
									</h3>
									<button
										onclick={() => switchTab('events')}
										class="text-sm text-blue-400 transition-colors hover:text-blue-300"
									>
										View all
									</button>
								</div>
								{#if (data.events || []).length > 0}
									<div class="space-y-3">
										{#each (data.events || []).slice(0, 5) as event, i}
											<a
												href="/admin/events/{event.id}"
												class="group flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 transition-all hover:border-gray-600 hover:bg-gray-800/50"
											>
												<div class="flex items-center gap-4">
													<div
														class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50 text-sm font-bold text-gray-300"
													>
														{i + 1}
													</div>
													<div>
														<div
															class="font-medium text-white transition-colors group-hover:text-blue-400"
														>
															{event.title}
														</div>
														<div class="text-sm text-gray-400">
															{event.eventDate
																? new Date(event.eventDate).toLocaleDateString('en-US', {
																		month: 'short',
																		day: 'numeric',
																		year: 'numeric'
																	})
																: 'Date TBA'}
															{#if event.circuit}
																<span class="ml-2 text-xs text-gray-500">• {event.circuit}</span>
															{/if}
														</div>
													</div>
												</div>
												<svg
													class="h-5 w-5 text-gray-500 transition-colors group-hover:text-blue-400"
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
											</a>
										{/each}
									</div>
								{:else}
									<div class="rounded-lg border border-dashed border-gray-700 p-8 text-center">
										<svg
											class="mx-auto h-12 w-12 text-gray-600"
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
										<p class="mt-4 text-gray-400">No events yet</p>
										<a
											href="/admin/events/new"
											class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 4v16m8-8H4"
												/>
											</svg>
											Create First Event
										</a>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Recent Orders Section -->
					<div class="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="flex items-center gap-2 text-lg font-semibold text-white">
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
										d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
									/>
								</svg>
								Recent Orders
							</h3>
							<button
								onclick={() => switchTab('orders')}
								class="text-sm text-green-400 transition-colors hover:text-green-300"
							>
								View all
							</button>
						</div>
						{#if (data.allOrders || []).length > 0}
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead>
										<tr class="border-b border-gray-700">
											<th class="pb-3 text-left text-sm font-medium text-gray-400">Email</th>
											<th class="pb-3 text-left text-sm font-medium text-gray-400">Amount</th>
											<th class="pb-3 text-left text-sm font-medium text-gray-400">Type</th>
											<th class="pb-3 text-left text-sm font-medium text-gray-400">Date</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each (data.allOrders || []).slice(0, 5) as order}
											<tr class="group">
												<td class="py-3 text-sm text-gray-300">{order.userEmail}</td>
												<td class="py-3 text-sm font-semibold text-green-400">${order.amount}</td>
												<td class="py-3">
													<span
														class="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400"
													>
														{order.meta?.type || 'payment'}
													</span>
												</td>
												<td class="py-3 text-sm text-gray-500">
													{new Date(order.createdAt).toLocaleDateString()}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<div class="rounded-lg border border-dashed border-gray-700 p-8 text-center">
								<p class="text-gray-400">No orders yet</p>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Events Tab -->
				{#if activeTab === 'events'}
					<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
						<div
							class="flex flex-col gap-3 border-b border-gray-800 bg-gray-800/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
						>
							<div class="flex items-center gap-3">
								<div class="hidden h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 sm:flex">
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
											d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-base font-semibold text-white sm:text-lg">All Events</h2>
									<p class="text-xs text-gray-400 sm:text-sm">{(data.events || []).length} events total</p>
								</div>
							</div>
							<a
								href="/admin/events/new"
								class="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/30"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									/>
								</svg>
								<span class="sm:inline">Create Event</span>
							</a>
						</div>

						<!-- Events - Mobile Card View -->
						<div class="space-y-3 p-4 lg:hidden">
							{#each data.events || [] as event}
								<a
									href="/admin/events/{event.id}"
									class="block rounded-lg border border-gray-700 bg-gray-800/30 p-4 transition-colors hover:border-gray-600"
								>
									<div class="flex items-start justify-between gap-3">
										<div class="flex items-center gap-3 min-w-0">
											<div
												class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700/50 text-sm font-bold text-gray-300"
											>
												{event.title.charAt(0)}
											</div>
											<div class="min-w-0">
												<p class="truncate text-sm font-medium text-white">{event.title}</p>
												{#if event.circuit}
													<p class="text-xs text-gray-500">{event.circuit}</p>
												{/if}
											</div>
										</div>
										<span class="shrink-0 text-sm font-semibold text-green-400">
											${parseFloat(event.price).toFixed(2)}
										</span>
									</div>
									<div class="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-700 pt-3">
										{#if event.eventDate}
											<span class="text-xs text-gray-400">
												{new Date(event.eventDate).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
											</span>
										{:else}
											<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">TBA</span>
										{/if}
										<span class="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
											{event.format || 'N/A'}
										</span>
										{#if event.location}
											<span class="text-xs text-gray-500">{event.location}</span>
										{/if}
									</div>
								</a>
							{:else}
								<div class="rounded-lg border border-dashed border-gray-700 p-8 text-center">
									<svg
										class="mx-auto mb-4 h-10 w-10 text-gray-600"
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
									<p class="text-gray-400">No events yet</p>
									<a
										href="/admin/events/new"
										class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
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
								</div>
							{/each}
						</div>

						<!-- Events - Desktop Table View -->
						<div class="hidden overflow-x-auto lg:block">
							<table class="w-full">
								<thead class="bg-gray-800/50">
									<tr>
										<th
											class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Event</th
										>
										<th
											class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Date</th
										>
										<th
											class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Format</th
										>
										<th
											class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Location</th
										>
										<th
											class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Price</th
										>
										<th
											class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
											>Actions</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-800">
									{#each data.events || [] as event}
										<tr class="group transition-colors hover:bg-gray-800/50">
											<td class="px-6 py-4">
												<div class="flex items-center gap-3">
													<div
														class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50 text-sm font-bold text-gray-300"
													>
														{event.title.charAt(0)}
													</div>
													<div>
														<div
															class="font-medium text-white transition-colors group-hover:text-blue-400"
														>
															{event.title}
														</div>
														{#if event.circuit}
															<div class="text-xs text-gray-500">{event.circuit}</div>
														{/if}
													</div>
												</div>
											</td>
											<td class="px-6 py-4">
												{#if event.eventDate}
													<div class="text-sm text-gray-300">
														{new Date(event.eventDate).toLocaleDateString('en-US', {
															month: 'short',
															day: 'numeric',
															year: 'numeric'
														})}
													</div>
												{:else}
													<span class="rounded-full bg-gray-700 px-2 py-1 text-xs text-gray-400"
														>TBA</span
													>
												{/if}
											</td>
											<td class="px-6 py-4">
												<span
													class="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400"
												>
													{event.format || 'N/A'}
												</span>
											</td>
											<td class="px-6 py-4 text-sm text-gray-400">
												{event.location || 'TBA'}
											</td>
											<td class="px-6 py-4">
												<span class="text-sm font-semibold text-green-400"
													>${parseFloat(event.price).toFixed(2)}</span
												>
											</td>
											<td class="px-6 py-4">
												<a
													href="/admin/events/{event.id}"
													class="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-600"
												>
													Manage
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
															d="M9 5l7 7-7 7"
														/>
													</svg>
												</a>
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="6" class="px-6 py-12 text-center">
												<div class="flex flex-col items-center">
													<svg
														class="h-12 w-12 text-gray-600 mb-4"
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
													<p class="text-gray-400">No events yet</p>
													<a
														href="/admin/events/new"
														class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
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
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- LSS Seasons Tab -->
				{#if activeTab === 'seasons'}
					<div class="space-y-6">
						<!-- Header -->
						<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
							<div
								class="flex flex-col gap-3 border-b border-gray-800 bg-gray-800/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
							>
								<div class="flex items-center gap-3">
									<div
										class="hidden h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 sm:flex"
									>
										<svg
											class="h-5 w-5 text-amber-400"
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
										<h2 class="text-base font-semibold text-white sm:text-lg">Calendar Events</h2>
										<p class="hidden text-sm text-gray-400 sm:block">
											Manage LSS tournament seasons and competitive events
										</p>
									</div>
								</div>
								<button
									onclick={() => (showAddSeasonForm = !showAddSeasonForm)}
									class="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 4v16m8-8H4"
										/>
									</svg>
									Add Event
								</button>
							</div>

							<!-- Add Event Form -->
							{#if showAddSeasonForm}
								<form
									method="POST"
									action="?/createLssSeason"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												showAddSeasonForm = false;
												await invalidateAll();
											}
											await update();
										};
									}}
									class="border-b border-gray-800 bg-gray-800/20 p-4 sm:p-6"
								>
									<div class="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
										<div>
											<label for="seasonName" class="mb-1 block text-sm font-medium text-gray-300"
												>Season Name *</label
											>
											<input
												id="seasonName"
												name="name"
												type="text"
												required
												placeholder="e.g., Skirmish Season 5"
												class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base sm:text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
											/>
										</div>
										<div>
											<label for="eventType" class="mb-1 block text-sm font-medium text-gray-300"
												>Event Type</label
											>
											<select
												id="eventType"
												name="eventType"
												class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none"
											>
												<option value="">Select type</option>
												<option value="Skirmish">Skirmish</option>
												<option value="Road to Nationals">Road to Nationals</option>
												<option value="ProQuest">ProQuest</option>
												<option value="Pro Tour">Pro Tour</option>
												<option value="Worlds">Worlds</option>
												<option value="Calling">Calling</option>
												<option value="Battle Hardened">Battle Hardened</option>
												<option value="Other">Other</option>
											</select>
										</div>
										<div>
											<label for="startDate" class="mb-1 block text-sm font-medium text-gray-300"
												>Start Date *</label
											>
											<input
												id="startDate"
												name="startDate"
												type="date"
												required
												class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none"
											/>
										</div>
										<div>
											<label for="endDate" class="mb-1 block text-sm font-medium text-gray-300"
												>End Date *</label
											>
											<input
												id="endDate"
												name="endDate"
												type="date"
												required
												class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none"
											/>
										</div>
									</div>
									<div class="mt-3 sm:mt-4">
										<span class="mb-2 block text-sm font-medium text-gray-300">Format(s)</span>
										<div class="flex flex-wrap gap-2 sm:gap-3">
											{#each ['Classic Constructed', 'Blitz', 'Silver Age', 'Draft', 'Sealed', 'Team Event', 'Living Legend'] as fmt}
												<label class="flex cursor-pointer items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-300">
													<input
														type="checkbox"
														name="format"
														value={fmt}
														class="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
													/>
													{fmt}
												</label>
											{/each}
										</div>
									</div>
									<div class="mt-3 sm:mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
										<div>
											<label for="description" class="mb-1 block text-sm font-medium text-gray-300"
												>Description</label
											>
											<textarea
												id="description"
												name="description"
												rows="2"
												placeholder="Optional description..."
												class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base sm:text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
											></textarea>
										</div>
										<div>
											<label for="link" class="mb-1 block text-sm font-medium text-gray-300"
												>Official Link</label
											>
											<input
												id="link"
												name="link"
												type="url"
												placeholder="https://fabtcg.com/..."
												class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base sm:text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
											/>
										</div>
									</div>
									<div class="mt-4 flex justify-end gap-3">
										<button
											type="button"
											onclick={() => (showAddSeasonForm = false)}
											class="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
										>
											Cancel
										</button>
										<button
											type="submit"
											class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
										>
											Create LSS Event
										</button>
									</div>
								</form>
							{/if}

							<!-- Sub-tabs -->
							<div class="flex gap-1 border-b border-gray-800 bg-gray-800/20 px-4 py-3">
								<button
									onclick={() => (calendarSubTab = 'upcoming')}
									class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {calendarSubTab ===
									'upcoming'
										? 'bg-amber-500/20 text-amber-400'
										: 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
								>
									Upcoming/Active ({upcomingLssEvents.length})
								</button>
								<button
									onclick={() => (calendarSubTab = 'completed')}
									class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {calendarSubTab ===
									'completed'
										? 'bg-amber-500/20 text-amber-400'
										: 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
								>
									Completed ({completedLssEvents.length})
								</button>
							</div>

							<!-- Calendar Events - Mobile Card View -->
							{#if displayedLssEvents.length > 0}
								<div class="space-y-3 p-4 sm:hidden">
									{#each displayedLssEvents as season}
										{@const startDate = new Date(season.startDate)}
										{@const endDate = new Date(season.endDate)}
										{@const now = new Date()}
										{@const isActive = now >= startDate && now <= endDate}
										{@const isPast = now > endDate}
										<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-3">
											<div class="flex items-start justify-between gap-2">
												<div class="min-w-0 flex-1">
													<div class="flex items-center gap-2">
														<p class="truncate text-sm font-medium text-white">{season.name}</p>
														{#if season.link}
															<a
																href={season.link}
																target="_blank"
																rel="noopener noreferrer"
																class="shrink-0 text-amber-400"
																aria-label="View official page"
															>
																<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
																</svg>
															</a>
														{/if}
													</div>
													{#if season.eventType}
														<span class="mt-1 inline-block rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">{season.eventType}</span>
													{/if}
												</div>
												{#if isActive}
													<span class="shrink-0 rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">Active</span>
												{:else if isPast}
													<span class="shrink-0 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">Completed</span>
												{:else}
													<span class="shrink-0 rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">Upcoming</span>
												{/if}
											</div>
											<div class="mt-2 text-xs text-gray-400">
												{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
											</div>
											{#if season.format}
												<p class="mt-1 truncate text-xs text-gray-500">{season.format}</p>
											{/if}
											<div class="mt-2 flex items-center gap-2 border-t border-gray-700 pt-2">
												<button
													onclick={() => (editingSeasonId = season.id)}
													class="flex-1 rounded bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-400"
												>
													Edit
												</button>
												<form method="POST" action="?/deleteLssSeason" use:enhance class="flex-1">
													<input type="hidden" name="seasonId" value={season.id} />
													<button
														type="submit"
														onclick={(e) => { if (!confirm('Delete this event?')) e.preventDefault(); }}
														class="w-full rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400"
													>
														Delete
													</button>
												</form>
											</div>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Calendar Events - Desktop Table View -->
							{#if displayedLssEvents.length > 0}
								<div class="hidden overflow-x-auto sm:block">
									<table class="w-full text-sm">
										<thead class="bg-gray-800/50 text-gray-400">
											<tr>
												<th class="px-4 py-2 text-left font-medium">Name</th>
												<th class="hidden px-4 py-2 text-left font-medium sm:table-cell">Type</th>
												<th class="hidden px-4 py-2 text-left font-medium lg:table-cell">Format</th>
												<th class="px-4 py-2 text-left font-medium">Dates</th>
												<th class="hidden px-4 py-2 text-left font-medium md:table-cell">Status</th>
												<th class="px-4 py-2 text-right font-medium">Actions</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-800">
											{#each displayedLssEvents as season}
												{@const startDate = new Date(season.startDate)}
												{@const endDate = new Date(season.endDate)}
												{@const now = new Date()}
												{@const isActive = now >= startDate && now <= endDate}
												{@const isPast = now > endDate}
												{@const isEditing = editingSeasonId === season.id}

												{#if isEditing}
													<tr>
														<td colspan="6" class="p-0">
															<form
																method="POST"
																action="?/updateLssSeason"
																use:enhance={() => {
																	return async ({ result, update }) => {
																		if (result.type === 'success') {
																			editingSeasonId = null;
																			await invalidateAll();
																		}
																		await update();
																	};
																}}
																class="bg-gray-800/30 p-4"
															>
																<input type="hidden" name="seasonId" value={season.id} />
																<div class="grid gap-3 md:grid-cols-4">
																	<div>
																		<label
																			for="edit-name-{season.id}"
																			class="mb-1 block text-xs font-medium text-gray-400"
																			>Name</label
																		>
																		<input
																			id="edit-name-{season.id}"
																			name="name"
																			type="text"
																			required
																			value={season.name}
																			class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
																		/>
																	</div>
																	<div>
																		<label
																			for="edit-type-{season.id}"
																			class="mb-1 block text-xs font-medium text-gray-400"
																			>Type</label
																		>
																		<select
																			id="edit-type-{season.id}"
																			name="eventType"
																			class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
																		>
																			<option value="">Select</option>
																			<option
																				value="Skirmish"
																				selected={season.eventType === 'Skirmish'}>Skirmish</option
																			>
																			<option
																				value="Road to Nationals"
																				selected={season.eventType === 'Road to Nationals'}
																				>Road to Nationals</option
																			>
																			<option
																				value="ProQuest"
																				selected={season.eventType === 'ProQuest'}>ProQuest</option
																			>
																			<option
																				value="Pro Tour"
																				selected={season.eventType === 'Pro Tour'}>Pro Tour</option
																			>
																			<option
																				value="Worlds"
																				selected={season.eventType === 'Worlds'}>Worlds</option
																			>
																			<option
																				value="Calling"
																				selected={season.eventType === 'Calling'}>Calling</option
																			>
																			<option
																				value="Battle Hardened"
																				selected={season.eventType === 'Battle Hardened'}
																				>Battle Hardened</option
																			>
																			<option value="Other" selected={season.eventType === 'Other'}
																				>Other</option
																			>
																		</select>
																	</div>
																	<div>
																		<label
																			for="edit-start-{season.id}"
																			class="mb-1 block text-xs font-medium text-gray-400"
																			>Start</label
																		>
																		<input
																			id="edit-start-{season.id}"
																			name="startDate"
																			type="date"
																			required
																			value={startDate.toISOString().split('T')[0]}
																			class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
																		/>
																	</div>
																	<div>
																		<label
																			for="edit-end-{season.id}"
																			class="mb-1 block text-xs font-medium text-gray-400"
																			>End</label
																		>
																		<input
																			id="edit-end-{season.id}"
																			name="endDate"
																			type="date"
																			required
																			value={endDate.toISOString().split('T')[0]}
																			class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
																		/>
																	</div>
																</div>
																<div class="mt-3">
																	<span class="mb-1 block text-xs font-medium text-gray-400"
																		>Format(s)</span
																	>
																	<div class="flex flex-wrap gap-2">
																		{#each ['Classic Constructed', 'Blitz', 'Silver Age', 'Draft', 'Sealed', 'Team Event', 'Living Legend'] as fmt}
																			<label
																				class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-300"
																			>
																				<input
																					type="checkbox"
																					name="format"
																					value={fmt}
																					checked={(season.format || '').includes(fmt)}
																					class="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
																				/>
																				{fmt}
																			</label>
																		{/each}
																	</div>
																</div>
																<div class="mt-3 grid gap-3 md:grid-cols-2">
																	<div>
																		<label
																			for="edit-desc-{season.id}"
																			class="mb-1 block text-xs font-medium text-gray-400"
																			>Description</label
																		>
																		<input
																			id="edit-desc-{season.id}"
																			name="description"
																			type="text"
																			value={season.description || ''}
																			placeholder="Optional..."
																			class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
																		/>
																	</div>
																	<div>
																		<label
																			for="edit-link-{season.id}"
																			class="mb-1 block text-xs font-medium text-gray-400"
																			>Official Link</label
																		>
																		<input
																			id="edit-link-{season.id}"
																			name="link"
																			type="url"
																			value={season.link || ''}
																			placeholder="https://..."
																			class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
																		/>
																	</div>
																</div>
																<div class="mt-3 flex items-center justify-between">
																	<label class="flex items-center gap-2 text-xs text-gray-400">
																		<input
																			type="checkbox"
																			name="isActive"
																			value="true"
																			checked={season.isActive}
																			class="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
																		/>
																		Show on calendar
																	</label>
																	<div class="flex gap-2">
																		<button
																			type="button"
																			onclick={() => (editingSeasonId = null)}
																			class="px-3 py-1 text-xs text-gray-400 transition-colors hover:text-white"
																			>Cancel</button
																		>
																		<button
																			type="submit"
																			class="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
																			>Save</button
																		>
																	</div>
																</div>
															</form>
														</td>
													</tr>
												{:else}
													<tr class="transition-colors hover:bg-gray-800/30">
														<td class="px-4 py-2">
															<div class="flex items-center gap-2">
																<span class="max-w-[200px] truncate font-medium text-white"
																	>{season.name}</span
																>
																{#if season.link}
																	<a
																		href={season.link}
																		target="_blank"
																		rel="noopener noreferrer"
																		class="flex-shrink-0 text-amber-400 hover:text-amber-300"
																		aria-label="View official page"
																	>
																		<svg
																			class="h-3.5 w-3.5"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				stroke-width="2"
																				d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
																			/>
																		</svg>
																	</a>
																{/if}
																{#if !season.isActive}
																	<span
																		class="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-400"
																		>Hidden</span
																	>
																{/if}
															</div>
														</td>
														<td class="hidden px-4 py-2 sm:table-cell">
															{#if season.eventType}
																<span class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
																	>{season.eventType}</span
																>
															{:else}
																<span class="text-gray-500">-</span>
															{/if}
														</td>
														<td class="hidden px-4 py-2 lg:table-cell">
															{#if season.format}
																<span class="text-xs text-gray-300" title={season.format}
																	>{season.format.length > 25
																		? season.format.substring(0, 25) + '...'
																		: season.format}</span
																>
															{:else}
																<span class="text-gray-500">-</span>
															{/if}
														</td>
														<td class="px-4 py-2 whitespace-nowrap text-gray-400">
															{startDate.toLocaleDateString('en-US', {
																month: 'short',
																day: 'numeric'
															})} - {endDate.toLocaleDateString('en-US', {
																month: 'short',
																day: 'numeric',
																year: 'numeric'
															})}
														</td>
														<td class="hidden px-4 py-2 md:table-cell">
															{#if isActive}
																<span
																	class="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
																	>Active</span
																>
															{:else if isPast}
																<span
																	class="rounded bg-gray-500/20 px-2 py-0.5 text-xs text-gray-400"
																	>Completed</span
																>
															{:else}
																<span
																	class="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400"
																	>Upcoming</span
																>
															{/if}
														</td>
														<td class="px-4 py-2">
															<div class="flex items-center justify-end gap-1">
																<button
																	onclick={() => (editingSeasonId = season.id)}
																	class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
																	title="Edit"
																	aria-label="Edit event"
																>
																	<svg
																		class="h-3.5 w-3.5"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			stroke-linecap="round"
																			stroke-linejoin="round"
																			stroke-width="2"
																			d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																		/>
																	</svg>
																</button>
																<form
																	method="POST"
																	action="?/deleteLssSeason"
																	use:enhance={() => {
																		return async ({ result, update }) => {
																			if (result.type === 'success') {
																				await invalidateAll();
																			}
																			await update();
																		};
																	}}
																>
																	<input type="hidden" name="seasonId" value={season.id} />
																	<button
																		type="submit"
																		onclick={(e) => {
																			if (!confirm('Delete this event?')) e.preventDefault();
																		}}
																		class="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
																		title="Delete"
																		aria-label="Delete event"
																	>
																		<svg
																			class="h-3.5 w-3.5"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				stroke-linecap="round"
																				stroke-linejoin="round"
																				stroke-width="2"
																				d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
																			/>
																		</svg>
																	</button>
																</form>
															</div>
														</td>
													</tr>
												{/if}
											{/each}
										</tbody>
									</table>
								</div>
							{:else}
								<div class="p-8 text-center">
									<div
										class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800"
									>
										<svg
											class="h-6 w-6 text-gray-600"
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
									<p class="text-gray-400">
										No {calendarSubTab === 'upcoming' ? 'upcoming' : 'completed'} events
									</p>
									{#if calendarSubTab === 'upcoming'}
										<p class="mt-1 text-sm text-gray-500">
											Click "Add Event" to create a new tournament season
										</p>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Orders Tab -->
				{#if activeTab === 'orders'}
					<div class="space-y-6">
						<!-- Revenue Overview Cards -->
						<div class="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
							<!-- Today's Revenue -->
							<div class="group relative overflow-hidden rounded-lg sm:rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-3 sm:p-5 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-xs sm:text-sm font-medium text-blue-300">Today</p>
										<p class="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-white">{formatCurrency(data.revenueStats?.today || 0)}</p>
									</div>
									<div class="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
										<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									</div>
								</div>
							</div>

							<!-- This Week's Revenue -->
							<div class="group relative overflow-hidden rounded-lg sm:rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/20 to-green-600/10 p-3 sm:p-5 transition-all hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-xs sm:text-sm font-medium text-green-300">This Week</p>
										<p class="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-white">{formatCurrency(data.revenueStats?.week || 0)}</p>
									</div>
									<div class="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
										<svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
									</div>
								</div>
							</div>

							<!-- This Month's Revenue -->
							<div class="group relative overflow-hidden rounded-lg sm:rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-3 sm:p-5 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-xs sm:text-sm font-medium text-purple-300">This Month</p>
										<p class="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-white">{formatCurrency(data.revenueStats?.month || 0)}</p>
									</div>
									<div class="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
										<svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
								</div>
							</div>

							<!-- All Time Revenue -->
							<div class="group relative overflow-hidden rounded-lg sm:rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-3 sm:p-5 transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-xs sm:text-sm font-medium text-amber-300">All Time</p>
										<p class="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold text-white">{formatCurrency(data.revenueStats?.allTime || 0)}</p>
									</div>
									<div class="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
										<svg class="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
										</svg>
									</div>
								</div>
							</div>
						</div>

						<!-- Key Metrics & Revenue by Type -->
						<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
							<!-- Key Metrics -->
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
								<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Key Metrics</h3>
								<div class="space-y-4">
									<div class="flex items-center justify-between">
										<span class="text-gray-400">Total Orders</span>
										<span class="text-lg font-semibold text-white">{data.stats?.totalOrders || 0}</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-gray-400">Average Order Value</span>
										<span class="text-lg font-semibold text-white">
											{formatCurrency((data.revenueStats?.allTime || 0) / Math.max(data.stats?.totalOrders || 1, 1))}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-gray-400">Refund Rate</span>
										<span class="text-lg font-semibold text-white">
											{((data.refundStats?.refundedTickets || 0) / Math.max(data.refundStats?.totalTicketOrders || 1, 1) * 100).toFixed(1)}%
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-gray-400">Total Customers</span>
										<span class="text-lg font-semibold text-white">{data.customerInsights?.totalCustomers || 0}</span>
									</div>
								</div>
							</div>

							<!-- Revenue by Type -->
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
								<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Type</h3>
								<div class="space-y-3">
									{#each data.revenueStats?.byType || [] as typeData}
										{@const totalRevenue = data.revenueStats?.allTime || 1}
										{@const percentage = ((typeData.total / totalRevenue) * 100).toFixed(1)}
										<div>
											<div class="mb-1 flex items-center justify-between text-sm">
												<span class="capitalize {typeData.type === 'ticket' ? 'text-blue-400' : typeData.type === 'course' ? 'text-purple-400' : typeData.type === 'subscription' ? 'text-green-400' : 'text-gray-400'}">
													{typeData.type || 'Other'}
												</span>
												<span class="text-gray-300">{formatCurrency(typeData.total)} ({percentage}%)</span>
											</div>
											<div class="h-2 overflow-hidden rounded-full bg-gray-700">
												<div
													class="h-full rounded-full {typeData.type === 'ticket' ? 'bg-blue-500' : typeData.type === 'course' ? 'bg-purple-500' : typeData.type === 'subscription' ? 'bg-green-500' : 'bg-gray-500'}"
													style="width: {percentage}%"
												></div>
											</div>
											<p class="mt-1 text-xs text-gray-500">{typeData.count} orders</p>
										</div>
									{:else}
										<p class="text-gray-500">No revenue data yet</p>
									{/each}
								</div>
							</div>
						</div>

						<!-- Revenue Trend Chart -->
						<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
							<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue Trend (Last 30 Days)</h3>
							{#if data.dailyRevenueTrend && data.dailyRevenueTrend.length > 0}
								<div class="relative h-48">
									<svg class="h-full w-full" viewBox="0 0 600 180" preserveAspectRatio="none">
										<!-- Grid lines -->
										<line x1="20" y1="20" x2="20" y2="160" stroke="#374151" stroke-width="1" />
										<line x1="20" y1="160" x2="580" y2="160" stroke="#374151" stroke-width="1" />
										<line x1="20" y1="90" x2="580" y2="90" stroke="#374151" stroke-width="0.5" stroke-dasharray="4" />
										<!-- Area fill -->
										<path d={generateAreaPath(data.dailyRevenueTrend, 600, 180)} fill="url(#chartGradient)" opacity="0.3" />
										<!-- Line -->
										<path d={generateChartPath(data.dailyRevenueTrend, 600, 180)} fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
										<!-- Gradient definition -->
										<defs>
											<linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
												<stop offset="0%" stop-color="#10b981" />
												<stop offset="100%" stop-color="#10b981" stop-opacity="0" />
											</linearGradient>
										</defs>
									</svg>
									<!-- Max value label -->
									<div class="absolute left-0 top-2 text-xs text-gray-500">
										{formatCurrency(Math.max(...data.dailyRevenueTrend.map(d => d.total)))}
									</div>
								</div>
							{:else}
								<div class="flex h-48 items-center justify-center text-gray-500">
									No revenue data for the last 30 days
								</div>
							{/if}
						</div>

						<!-- Insights Section -->
						<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
							<!-- Top Events -->
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
								<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Top Events by Revenue</h3>
								<div class="space-y-3">
									{#each data.topEvents || [] as event, i}
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">{i + 1}</span>
												<span class="text-sm text-gray-300 truncate max-w-[140px]" title={event.eventTitle}>{event.eventTitle || 'Unknown Event'}</span>
											</div>
											<span class="text-sm font-semibold text-green-400">{formatCurrency(event.totalRevenue)}</span>
										</div>
									{:else}
										<p class="text-sm text-gray-500">No event data yet</p>
									{/each}
								</div>
							</div>

							<!-- Top Customers -->
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
								<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Top Customers</h3>
								<div class="space-y-3">
									{#each data.customerInsights?.topCustomers || [] as customer, i}
										<a
											href="/admin/customers/{encodeURIComponent(customer.email)}"
											class="flex w-full items-center justify-between rounded-lg p-1 -m-1 transition-colors hover:bg-gray-800/50"
										>
											<div class="flex items-center gap-2">
												<span class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">{i + 1}</span>
												<span class="text-sm text-gray-300 truncate max-w-[120px]" title={customer.email}>{customer.email}</span>
											</div>
											<span class="text-sm font-semibold text-green-400">{formatCurrency(customer.totalSpent)}</span>
										</a>
									{:else}
										<p class="text-sm text-gray-500">No customer data yet</p>
									{/each}
								</div>
							</div>

							<!-- Customer Mix -->
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
								<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Customer Mix</h3>
								{#if true}
									{@const totalCustomers = (data.customerInsights?.newCustomers || 0) + (data.customerInsights?.returningCustomers || 0)}
									{@const newPct = totalCustomers > 0 ? ((data.customerInsights?.newCustomers || 0) / totalCustomers * 100).toFixed(0) : 0}
									{@const retPct = totalCustomers > 0 ? ((data.customerInsights?.returningCustomers || 0) / totalCustomers * 100).toFixed(0) : 0}
									<div class="flex items-center justify-center">
										<!-- Simple pie chart using conic-gradient -->
										<div class="relative h-32 w-32">
											<div
												class="h-full w-full rounded-full"
												style="background: conic-gradient(#10b981 0% {newPct}%, #3b82f6 {newPct}% 100%)"
											></div>
											<div class="absolute inset-4 rounded-full bg-gray-900"></div>
										</div>
									</div>
									<div class="mt-4 space-y-2">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<div class="h-3 w-3 rounded-full bg-green-500"></div>
												<span class="text-sm text-gray-400">New Customers</span>
											</div>
											<span class="text-sm font-semibold text-white">{data.customerInsights?.newCustomers || 0} ({newPct}%)</span>
										</div>
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<div class="h-3 w-3 rounded-full bg-blue-500"></div>
												<span class="text-sm text-gray-400">Returning</span>
											</div>
											<span class="text-sm font-semibold text-white">{data.customerInsights?.returningCustomers || 0} ({retPct}%)</span>
										</div>
									</div>
								{/if}
							</div>
						</div>

						<!-- Search & Filters -->
						<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
							<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
								<!-- Search -->
								<div class="relative flex-1 lg:max-w-md">
									<svg class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									<input
										type="text"
										bind:value={ordersSearchQuery}
										placeholder="Search by email, order ID..."
										class="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-4 text-base sm:text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
									/>
								</div>

								<!-- Filters -->
								<div class="flex flex-wrap gap-3">
									<select
										bind:value={ordersTypeFilter}
										class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-base sm:text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
									>
										<option value="all">All Types</option>
										<option value="ticket">Tickets</option>
										<option value="course">Courses</option>
										<option value="subscription">Subscriptions</option>
									</select>

									<select
										bind:value={ordersDateFilter}
										class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-base sm:text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
									>
										<option value="all">All Time</option>
										<option value="today">Today</option>
										<option value="week">Last 7 Days</option>
										<option value="month">This Month</option>
									</select>
								</div>
							</div>

							<!-- Results count -->
							<div class="mt-3 text-sm text-gray-500">
								Showing {paginatedOrders.length} of {filteredOrders.length} orders
							</div>
						</div>

						<!-- Orders - Mobile Card View -->
						<div class="space-y-3 lg:hidden">
							{#each paginatedOrders as order}
								<a
									href="/admin/orders/{order.id}"
									class="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-gray-700 hover:bg-gray-800/50"
								>
									<div class="flex items-start justify-between gap-3">
										<div class="flex items-center gap-3 min-w-0">
											<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700/50 text-sm font-bold text-gray-300">
												{order.userEmail?.charAt(0).toUpperCase() || '?'}
											</div>
											<div class="min-w-0">
												<p class="truncate text-sm font-medium text-white">{order.userEmail}</p>
												<p class="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
											</div>
										</div>
										<div class="text-right shrink-0">
											<p class="text-lg font-bold text-green-400">{formatCurrency(order.amount)}</p>
											<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize
												{order.meta?.type === 'ticket' ? 'bg-blue-500/20 text-blue-400' :
												order.meta?.type === 'course' ? 'bg-purple-500/20 text-purple-400' :
												order.meta?.type === 'subscription' ? 'bg-green-500/20 text-green-400' :
												'bg-gray-500/20 text-gray-400'}">
												{order.meta?.type || 'payment'}
											</span>
										</div>
									</div>
									<div class="mt-3 flex items-center justify-between border-t border-gray-800 pt-3">
										<span class="font-mono text-xs text-gray-500">ID: {order.id?.slice(0, 8)}...</span>
										<span class="flex items-center gap-1 text-xs text-gray-400">
											View details
											<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
											</svg>
										</span>
									</div>
								</a>
							{:else}
								<div class="rounded-xl border border-gray-800 bg-gray-900/50 px-6 py-12 text-center">
									<svg class="mx-auto mb-4 h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
									</svg>
									<p class="text-gray-400">No orders found</p>
									<p class="mt-1 text-sm text-gray-500">
										{ordersSearchQuery || ordersTypeFilter !== 'all' || ordersDateFilter !== 'all'
											? 'Try adjusting your search or filters'
											: 'Orders will appear here when customers make purchases'}
									</p>
								</div>
							{/each}

							<!-- Mobile Pagination -->
							{#if totalOrdersPages > 1}
								<div class="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
									<button
										onclick={() => ordersPage = Math.max(1, ordersPage - 1)}
										disabled={ordersPage === 1}
										class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Prev
									</button>
									<span class="text-sm text-gray-400">
										{ordersPage} / {totalOrdersPages}
									</span>
									<button
										onclick={() => ordersPage = Math.min(totalOrdersPages, ordersPage + 1)}
										disabled={ordersPage === totalOrdersPages}
										class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Next
									</button>
								</div>
							{/if}
						</div>

						<!-- Orders - Desktop Table View -->
						<div class="hidden overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 lg:block">
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gray-800/50">
										<tr>
											<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Customer</th>
											<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Order ID</th>
											<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
												<button onclick={() => { ordersSortBy = 'amount'; ordersSortDir = ordersSortDir === 'desc' ? 'asc' : 'desc'; }} class="flex items-center gap-1 hover:text-white">
													Amount
													{#if ordersSortBy === 'amount'}
														<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={ordersSortDir === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
														</svg>
													{/if}
												</button>
											</th>
											<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Type</th>
											<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
												<button onclick={() => { ordersSortBy = 'date'; ordersSortDir = ordersSortDir === 'desc' ? 'asc' : 'desc'; }} class="flex items-center gap-1 hover:text-white">
													Date
													{#if ordersSortBy === 'date'}
														<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={ordersSortDir === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
														</svg>
													{/if}
												</button>
											</th>
											<th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each paginatedOrders as order}
											<tr class="group transition-colors hover:bg-gray-800/50">
												<td class="px-6 py-4">
													<a href="/admin/customers/{encodeURIComponent(order.userEmail)}" class="flex items-center gap-3 hover:text-white">
														<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700/50 text-sm font-bold text-gray-300">
															{order.userEmail?.charAt(0).toUpperCase() || '?'}
														</div>
														<span class="text-sm text-gray-300 hover:text-white">{order.userEmail}</span>
													</a>
												</td>
												<td class="px-6 py-4">
													<span class="font-mono text-xs text-gray-500" title={order.id}>{order.id?.slice(0, 8)}...</span>
												</td>
												<td class="px-6 py-4">
													<span class="text-lg font-bold text-green-400">{formatCurrency(order.amount)}</span>
												</td>
												<td class="px-6 py-4">
													<span class="rounded-full px-2.5 py-1 text-xs font-medium capitalize
														{order.meta?.type === 'ticket' ? 'bg-blue-500/20 text-blue-400' :
														order.meta?.type === 'course' ? 'bg-purple-500/20 text-purple-400' :
														order.meta?.type === 'subscription' ? 'bg-green-500/20 text-green-400' :
														'bg-gray-500/20 text-gray-400'}">
														{order.meta?.type || 'payment'}
													</span>
												</td>
												<td class="px-6 py-4 text-sm text-gray-500">
													{formatDate(order.createdAt)}
												</td>
												<td class="px-6 py-4 text-right">
													<a
														href="/admin/orders/{order.id}"
														class="rounded-lg bg-gray-700/50 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
													>
														View
													</a>
												</td>
											</tr>
										{:else}
											<tr>
												<td colspan="6" class="px-6 py-12 text-center">
													<div class="flex flex-col items-center">
														<svg class="mb-4 h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
														</svg>
														<p class="text-gray-400">No orders found</p>
														<p class="mt-1 text-sm text-gray-500">
															{ordersSearchQuery || ordersTypeFilter !== 'all' || ordersDateFilter !== 'all'
																? 'Try adjusting your search or filters'
																: 'Orders will appear here when customers make purchases'}
														</p>
													</div>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>

							<!-- Desktop Pagination -->
							{#if totalOrdersPages > 1}
								<div class="flex items-center justify-between border-t border-gray-800 px-6 py-4">
									<button
										onclick={() => ordersPage = Math.max(1, ordersPage - 1)}
										disabled={ordersPage === 1}
										class="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Previous
									</button>
									<span class="text-sm text-gray-400">
										Page {ordersPage} of {totalOrdersPages}
									</span>
									<button
										onclick={() => ordersPage = Math.min(totalOrdersPages, ordersPage + 1)}
										disabled={ordersPage === totalOrdersPages}
										class="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Next
									</button>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Tournament Staff Tab -->
				{#if activeTab === 'staff'}
					<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
						<div
							class="flex flex-col gap-3 border-b border-gray-800 bg-gray-800/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
						>
							<div class="flex items-center gap-3">
								<div class="hidden h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 sm:flex">
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
									<h2 class="text-base font-semibold text-white sm:text-lg">Tournament Staff</h2>
									<p class="text-xs text-gray-400 sm:text-sm">{(data.tournamentStaff || []).length} staff members</p>
								</div>
							</div>
							<button
								onclick={() => switchTab('users')}
								class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 hover:text-white"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									/>
								</svg>
								Add Staff
							</button>
						</div>

						<div class="p-4 sm:p-6">
							{#if (data.tournamentStaff || []).length === 0}
								<div class="rounded-xl border border-dashed border-gray-700 p-8 sm:p-12 text-center">
									<svg
										class="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-600"
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
									<p class="text-gray-400">No tournament staff members yet</p>
									<p class="mt-2 text-xs sm:text-sm text-gray-500">
										Assign the "tournament staff" role to users in User Management
									</p>
									<button
										onclick={() => switchTab('users')}
										class="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
									>
										Go to User Management
									</button>
								</div>
							{:else}
								<div class="space-y-4 sm:space-y-6">
									{#each data.tournamentStaff || [] as staff}
										<div class="rounded-xl border border-gray-700 bg-gray-800/30 p-4 sm:p-5">
											<div class="mb-3 sm:mb-4 flex items-center gap-3 sm:gap-4">
												<div
													class="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-base sm:text-lg font-bold text-white"
												>
													{staff.email.charAt(0).toUpperCase()}
												</div>
												<div class="min-w-0 flex-1">
													<h3 class="truncate text-sm sm:text-base font-semibold text-white">{staff.email}</h3>
													<span
														class="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400"
													>
														Tournament Staff
													</span>
												</div>
											</div>

											<div class="space-y-2 sm:space-y-3">
												<p class="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-300">
													<svg
														class="h-4 w-4 text-gray-500"
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
													Event Assignments
												</p>
												<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
													{#each data.events || [] as event}
														{@const isAssigned = isStaffAssigned(staff.id, event.id)}
														<div
															class="flex items-center justify-between rounded-lg border p-2.5 sm:p-3 transition-all {isAssigned
																? 'border-green-500/30 bg-green-500/10'
																: 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}"
														>
															<div class="min-w-0 flex-1">
																<p
																	class="truncate text-xs sm:text-sm font-medium {isAssigned
																		? 'text-green-400'
																		: 'text-gray-300'}"
																>
																	{event.title}
																</p>
																<p class="text-xs text-gray-500">
																	{event.eventDate
																		? new Date(event.eventDate).toLocaleDateString('en-US', {
																				month: 'short',
																				day: 'numeric'
																			})
																		: 'TBA'}
																</p>
															</div>
															{#if isAssigned}
																<form method="POST" action="?/unassignStaff" use:enhance>
																	<input type="hidden" name="staffId" value={staff.id} />
																	<input type="hidden" name="eventId" value={event.id} />
																	<button
																		type="submit"
																		class="ml-2 shrink-0 rounded-md bg-red-500/20 px-2 sm:px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
																	>
																		Remove
																	</button>
																</form>
															{:else}
																<form method="POST" action="?/assignStaff" use:enhance>
																	<input type="hidden" name="staffId" value={staff.id} />
																	<input type="hidden" name="eventId" value={event.id} />
																	<button
																		type="submit"
																		class="ml-2 shrink-0 rounded-md bg-green-500/20 px-2 sm:px-2.5 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/30"
																	>
																		Assign
																	</button>
																</form>
															{/if}
														</div>
													{/each}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- User Management Tab -->
				{#if activeTab === 'users'}
					<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
						<div
							class="flex items-center gap-3 border-b border-gray-800 bg-gray-800/30 px-4 py-3 sm:px-6 sm:py-4"
						>
							<div class="hidden h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 sm:flex">
								<svg
									class="h-5 w-5 text-amber-400"
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
								<h2 class="text-base font-semibold text-white sm:text-lg">User Management</h2>
								<p class="text-xs text-gray-400 sm:text-sm">{(data.allUsers || []).length} registered users</p>
							</div>
						</div>

						<div class="p-4 sm:p-6">
							<!-- Search Bar -->
							<div class="mb-6">
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
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
										/>
									</svg>
									<input
										id="user-search"
										type="text"
										bind:value={userSearchQuery}
										placeholder="Search users..."
										class="w-full rounded-xl border border-gray-700 bg-gray-800/50 py-3 pr-4 pl-10 text-base sm:text-sm text-gray-100 placeholder-gray-500 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
									/>
								</div>
							</div>

							<!-- Users - Mobile Card View -->
							<div class="space-y-3 lg:hidden">
								{#each filteredUsers.slice(0, 20) as user}
									<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-4">
										<div class="flex items-start justify-between gap-3">
											<a href="/admin/customers/{user.id}" class="flex items-center gap-3 min-w-0">
												<div
													class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br {user.role === 'admin'
														? 'from-purple-500 to-violet-600'
														: user.role === 'premium'
															? 'from-blue-500 to-cyan-600'
															: user.role === 'tournament staff'
																? 'from-green-500 to-emerald-600'
																: 'from-gray-500 to-gray-600'} text-sm font-bold text-white"
												>
													{user.email.charAt(0).toUpperCase()}
												</div>
												<div class="min-w-0">
													<p class="truncate text-sm font-medium text-white">{user.email}</p>
													<p class="text-xs text-gray-500">
														Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
														{#if user.id === data.user.id}
															<span class="text-blue-400"> (You)</span>
														{/if}
													</p>
												</div>
											</a>
											<span
												class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize
												{user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : ''}
												{user.role === 'premium' ? 'bg-blue-500/20 text-blue-400' : ''}
												{user.role === 'tournament staff' ? 'bg-green-500/20 text-green-400' : ''}
												{user.role === 'writer' ? 'bg-orange-500/20 text-orange-400' : ''}
												{user.role === 'free' ? 'bg-gray-700 text-gray-400' : ''}"
											>
												{user.role.replace('_', ' ')}
											</span>
										</div>
										<div class="mt-3 flex items-center gap-2 border-t border-gray-700 pt-3">
											{#if user.id !== data.user.id}
												<form method="POST" action="?/updateUserRole" use:enhance class="flex flex-1 items-center gap-2">
													<input type="hidden" name="userId" value={user.id} />
													<select
														name="role"
														class="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-base sm:text-xs text-gray-100 focus:border-blue-500 focus:outline-none"
													>
														<option value="free" selected={user.role === 'free'}>Free</option>
														<option value="premium" selected={user.role === 'premium'}>Premium</option>
														<option value="writer" selected={user.role === 'writer'}>Writer</option>
														<option value="tournament staff" selected={user.role === 'tournament staff'}>Staff</option>
														<option value="admin" selected={user.role === 'admin'}>Admin</option>
													</select>
													<button type="submit" class="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white">
														Update
													</button>
												</form>
											{:else}
												<span class="flex-1 text-xs text-gray-500">Current user</span>
											{/if}
											<a
												href="/admin/customers/{user.id}"
												class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300"
											>
												View
											</a>
										</div>
									</div>
								{:else}
									<div class="rounded-lg border border-gray-700 p-8 text-center">
										<p class="text-gray-400">No users found</p>
									</div>
								{/each}
								{#if filteredUsers.length > 20}
									<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-3 text-center">
										<p class="text-sm text-gray-400">Showing 20 of {filteredUsers.length}. Use search to find more.</p>
									</div>
								{/if}
							</div>

							<!-- Users - Desktop Table View -->
							<div class="hidden overflow-x-auto rounded-xl border border-gray-700 lg:block">
								<table class="w-full">
									<thead class="bg-gray-800/50">
										<tr>
											<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">User</th>
											<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">Role</th>
											<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">Joined</th>
											<th class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase">Actions</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each filteredUsers.slice(0, 20) as user}
											<tr class="group transition-colors hover:bg-gray-800/50">
												<td class="px-6 py-4">
													<a href="/admin/customers/{user.id}" class="flex items-center gap-3 hover:opacity-80">
														<div
															class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br {user.role ===
															'admin'
																? 'from-purple-500 to-violet-600'
																: user.role === 'premium'
																	? 'from-blue-500 to-cyan-600'
																	: user.role === 'tournament staff'
																		? 'from-green-500 to-emerald-600'
																		: 'from-gray-500 to-gray-600'} text-sm font-bold text-white"
														>
															{user.email.charAt(0).toUpperCase()}
														</div>
														<div>
															<div class="text-sm font-medium text-white hover:text-blue-400">{user.email}</div>
															{#if user.id === data.user.id}
																<span class="text-xs text-blue-400">You</span>
															{/if}
														</div>
													</a>
												</td>
												<td class="px-6 py-4">
													<span
														class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize
														{user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : ''}
														{user.role === 'premium' ? 'bg-blue-500/20 text-blue-400' : ''}
														{user.role === 'tournament staff' ? 'bg-green-500/20 text-green-400' : ''}
														{user.role === 'writer' ? 'bg-orange-500/20 text-orange-400' : ''}
														{user.role === 'free' ? 'bg-gray-700 text-gray-400' : ''}"
													>
														{user.role.replace('_', ' ')}
													</span>
												</td>
												<td class="px-6 py-4 text-sm text-gray-500">
													{new Date(user.createdAt).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
														year: 'numeric'
													})}
												</td>
												<td class="px-6 py-4 text-right">
													<div class="flex items-center justify-end gap-3">
														{#if user.id !== data.user.id}
															<form
																method="POST"
																action="?/updateUserRole"
																use:enhance
																class="inline-flex items-center gap-2"
															>
																<input type="hidden" name="userId" value={user.id} />
																<select
																	name="role"
																	class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-100 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
																>
																	<option value="free" selected={user.role === 'free'}>Free</option>
																	<option value="premium" selected={user.role === 'premium'}>Premium</option>
																	<option value="writer" selected={user.role === 'writer'}>Writer</option>
																	<option value="tournament staff" selected={user.role === 'tournament staff'}>Tournament Staff</option>
																	<option value="admin" selected={user.role === 'admin'}>Admin</option>
																</select>
																<button
																	type="submit"
																	class="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-600"
																>
																	Update
																</button>
															</form>
														{:else}
															<span class="rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-400">Current User</span>
														{/if}
														<a
															href="/admin/customers/{user.id}"
															class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-gray-600 hover:text-white"
														>
															View
														</a>
													</div>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
								{#if filteredUsers.length > 20}
									<div class="border-t border-gray-800 bg-gray-800/30 p-4 text-center">
										<p class="text-sm text-gray-400">
											Showing first 20 of {filteredUsers.length} users. Use search to find more.
										</p>
									</div>
								{/if}
								{#if filteredUsers.length === 0}
									<div class="border-t border-gray-800 p-12 text-center">
										<svg
											class="mx-auto mb-4 h-12 w-12 text-gray-600"
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
										<p class="text-gray-400">No users found matching "{userSearchQuery}"</p>
										<p class="mt-1 text-sm text-gray-500">Try a different search term</p>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Players Tab -->
				{#if activeTab === 'players'}
					<div class="space-y-6">
						<!-- Standings Table with Inline Editing -->
						<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
							<div
								class="flex flex-col gap-3 border-b border-gray-800 bg-gray-800/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
							>
								<div class="flex items-center gap-3">
									<div
										class="hidden h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20 sm:flex"
									>
										<svg
											class="h-5 w-5 text-yellow-400"
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
									</div>
									<div>
										<h2 class="text-base font-semibold text-white sm:text-lg">Standings Table</h2>
										<p class="hidden text-sm text-gray-400 sm:block">
											{data.standings?.length || 0} standings records - Click any cell to edit
										</p>
										<p class="text-xs text-gray-400 sm:hidden">
											{data.standings?.length || 0} records
										</p>
									</div>
								</div>
								<button
									onclick={() => (showCreateStandingModal = true)}
									class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/40"
								>
									<svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 6v6m0 0v6m0-6h6m-6 0H6"
										/>
									</svg>
									Add Standing
								</button>
							</div>

							<div class="p-4 sm:p-6">
								<!-- Filters -->
								<div class="mb-4 sm:mb-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
									<div class="relative sm:col-span-2 md:col-span-1">
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
												d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
											/>
										</svg>
										<input
											type="text"
											bind:value={standingsSearchQuery}
											placeholder="Search by name or GEM ID..."
											class="w-full rounded-lg border border-gray-700 bg-gray-800/50 py-2.5 pr-4 pl-10 text-base sm:text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
										/>
									</div>
									<select
										bind:value={standingsSeasonFilter}
										class="rounded-lg border border-gray-700 bg-gray-800/50 px-3 sm:px-4 py-2.5 text-base sm:text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
									>
										<option value="all">All Seasons</option>
										{#each uniqueSeasons as season}
											<option value={season}>{season}</option>
										{/each}
									</select>
									<select
										bind:value={standingsCircuitFilter}
										class="rounded-lg border border-gray-700 bg-gray-800/50 px-3 sm:px-4 py-2.5 text-base sm:text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
									>
										<option value="all">All Circuits</option>
										{#each uniqueCircuits as circuit}
											<option value={circuit}>{circuit}</option>
										{/each}
									</select>
									<div class="flex items-center text-xs sm:text-sm text-gray-400">
										Showing {filteredStandings.length} of {data.standings?.length || 0}
									</div>
								</div>

								<!-- Standings - Mobile Card View -->
								<div class="space-y-3 lg:hidden">
									{#each paginatedAdminStandings as standing}
										<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-3">
											<div class="flex items-start justify-between gap-3">
												<div class="flex items-center gap-3 min-w-0">
													<div
														class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white"
													>
														{standing.playerName?.charAt(0).toUpperCase() || '?'}
													</div>
													<div class="min-w-0">
														<p class="truncate text-sm font-medium text-white">{standing.playerName}</p>
														{#if standing.gemId}
															<p class="font-mono text-xs text-blue-400">{standing.gemId}</p>
														{:else}
															<p class="text-xs text-gray-600">No GEM ID</p>
														{/if}
													</div>
												</div>
												<span class="shrink-0 text-lg font-bold text-emerald-400">{standing.totalPoints || 0}</span>
											</div>
											<div class="mt-3 grid grid-cols-3 gap-2 border-t border-gray-700 pt-3 text-center text-xs">
												<div>
													<p class="text-gray-500">Win %</p>
													<p class="font-medium text-gray-300">{standing.winPercentage ? `${standing.winPercentage}%` : '-'}</p>
												</div>
												<div>
													<p class="text-gray-500">Record</p>
													<p class="font-medium">
														<span class="text-green-400">{standing.matchesWon || 0}</span>
														<span class="text-gray-600">-</span>
														<span class="text-red-400">{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span>
													</p>
												</div>
												<div>
													<p class="text-gray-500">Top 8</p>
													<p class="font-medium text-gray-300">{calculateDerivedStats(standing).top8Finishes}</p>
												</div>
											</div>
											<div class="mt-2 flex flex-wrap items-center gap-2">
												<span class="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">{standing.season}</span>
												<span class="rounded px-1.5 py-0.5 text-xs font-medium {standing.circuit === 'Los Angeles' ? 'bg-blue-500/20 text-blue-400' : standing.circuit === 'New England' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}">
													{standing.circuit}
												</span>
											</div>
											<div class="mt-2 flex items-center gap-2 border-t border-gray-700 pt-2">
												{#if standing.gemId}
													<a
														href="/player/{standing.gemId}"
														class="flex-1 rounded bg-amber-500/20 px-2 py-1.5 text-center text-xs font-medium text-amber-400"
													>
														Edit
													</a>
												{:else}
													<span class="flex-1 rounded bg-gray-700/50 px-2 py-1.5 text-center text-xs text-gray-500">
														No GEM ID
													</span>
												{/if}
												<button
													type="button"
													onclick={() => openDeleteModal(standing)}
													class="flex-1 rounded bg-red-500/20 px-2 py-1.5 text-xs font-medium text-red-400"
												>
													Delete
												</button>
											</div>
										</div>
									{:else}
										<div class="rounded-lg border border-gray-700 p-8 text-center">
											<p class="text-gray-400">No standings found</p>
										</div>
									{/each}
								</div>

								<!-- Standings Table - Desktop View -->
								<div class="hidden overflow-x-auto rounded-xl border border-gray-700 lg:block">
									<table class="w-full text-sm">
										<thead class="bg-gray-800/80">
											<tr>
												<th
													class="px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
													>Season</th
												>
												<th
													class="px-4 py-4 text-left text-xs font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase"
													>Circuit</th
												>
												<th
													class="px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
													>Player</th
												>
												<th class="px-4 py-4 text-center">
													<button
														onclick={() => toggleSort('points')}
														class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
														'points'
															? 'text-blue-400'
															: 'text-gray-400 hover:text-gray-200'}"
													>
														Points
														{#if sortColumn === 'points'}
															<svg
																class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fill-rule="evenodd"
																	d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
																	clip-rule="evenodd"
																/>
															</svg>
														{:else}
															<svg
																class="h-3 w-3 opacity-0 group-hover:opacity-50"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fill-rule="evenodd"
																	d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
																	clip-rule="evenodd"
																/>
															</svg>
														{/if}
													</button>
												</th>
												<th class="px-4 py-4 text-center">
													<button
														onclick={() => toggleSort('winPct')}
														class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
														'winPct'
															? 'text-blue-400'
															: 'text-gray-400 hover:text-gray-200'}"
													>
														Win %
														{#if sortColumn === 'winPct'}
															<svg
																class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fill-rule="evenodd"
																	d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
																	clip-rule="evenodd"
																/>
															</svg>
														{/if}
													</button>
												</th>
												<th class="px-4 py-4 text-center">
													<button
														onclick={() => toggleSort('record')}
														class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
														'record'
															? 'text-blue-400'
															: 'text-gray-400 hover:text-gray-200'}"
													>
														Record
														{#if sortColumn === 'record'}
															<svg
																class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fill-rule="evenodd"
																	d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
																	clip-rule="evenodd"
																/>
															</svg>
														{/if}
													</button>
												</th>
												<th class="px-4 py-4 text-center">
													<button
														onclick={() => toggleSort('events')}
														class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
														'events'
															? 'text-blue-400'
															: 'text-gray-400 hover:text-gray-200'}"
													>
														Events
														{#if sortColumn === 'events'}
															<svg
																class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fill-rule="evenodd"
																	d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
																	clip-rule="evenodd"
																/>
															</svg>
														{/if}
													</button>
												</th>
												<th class="px-4 py-4 text-center">
													<button
														onclick={() => toggleSort('top8')}
														class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors {sortColumn ===
														'top8'
															? 'text-blue-400'
															: 'text-gray-400 hover:text-gray-200'}"
													>
														Top 8
														{#if sortColumn === 'top8'}
															<svg
																class="h-3 w-3 {sortDirection === 'asc' ? 'rotate-180' : ''}"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fill-rule="evenodd"
																	d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
																	clip-rule="evenodd"
																/>
															</svg>
														{/if}
													</button>
												</th>
												<th
													class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase"
													>Actions</th
												>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-800/50">
											{#each paginatedAdminStandings as standing}
												<tr class="transition-colors hover:bg-gray-800/30">
													<td class="px-4 py-4 text-sm font-medium text-gray-400"
														>{standing.season}</td
													>
													<td class="px-4 py-4">
														<span
															class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap {standing.circuit ===
															'Los Angeles'
																? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
																: standing.circuit === 'New England'
																	? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
																	: 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'}"
														>
															{standing.circuit}
														</span>
													</td>
													<td class="px-4 py-4">
														<div class="flex items-center gap-3">
															<div
																class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white"
															>
																{standing.playerName?.charAt(0).toUpperCase() || '?'}
															</div>
															<div>
																<div class="font-medium text-white">{standing.playerName}</div>
																{#if standing.gemId}
																	<div class="font-mono text-xs text-blue-400">
																		{standing.gemId}
																	</div>
																{:else}
																	<div class="text-xs text-gray-600">No GEM ID</div>
																{/if}
															</div>
														</div>
													</td>
													<td class="px-4 py-4 text-center">
														<span class="text-lg font-bold text-emerald-400"
															>{standing.totalPoints || 0}</span
														>
													</td>
													<td class="px-4 py-4 text-center">
														<span class="text-gray-300"
															>{standing.winPercentage ? `${standing.winPercentage}%` : '-'}</span
														>
													</td>
													<td class="px-4 py-4 text-center">
														<span class="font-medium">
															<span class="text-green-400">{standing.matchesWon || 0}</span>
															<span class="mx-0.5 text-gray-600">-</span>
															<span class="text-red-400"
																>{(standing.matchesPlayed || 0) - (standing.matchesWon || 0)}</span
															>
														</span>
													</td>
													<td class="px-4 py-4 text-center text-gray-300"
														>{calculateDerivedStats(standing).eventsPlayed}</td
													>
													<td class="px-4 py-4 text-center text-gray-300"
														>{calculateDerivedStats(standing).top8Finishes}</td
													>
													<td class="px-4 py-4 text-center">
														<div class="flex items-center justify-center gap-2">
															<!-- Edit on Player Profile Link -->
															{#if standing.gemId}
																<a
																	href="/player/{standing.gemId}"
																	class="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-400 transition-all hover:border-amber-500/40 hover:bg-amber-500/20 hover:text-amber-300"
																	title="Edit on player profile page"
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
																			d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
																		/>
																	</svg>
																	<span class="text-xs font-medium">Edit</span>
																</a>
															{:else}
																<span class="text-xs text-gray-500">No GEM ID</span>
															{/if}
															<!-- Delete Button - Opens Modal -->
															<button
																type="button"
																onclick={() => openDeleteModal(standing)}
																class="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-red-500/10 hover:text-red-400"
																title="Delete standing"
																aria-label="Delete standing"
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
																		d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
																		/>
																	</svg>
																</button>
														</div>
													</td>
												</tr>
											{:else}
												<tr>
													<td colspan="9" class="px-6 py-12 text-center text-gray-500">
														No standings found. Import data from CSV to get started.
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>

								<!-- Pagination Controls -->
								{#if totalAdminStandingsPages > 1}
									<div
										class="mt-4 flex flex-col items-center justify-between gap-4 rounded-b-xl border-t border-gray-700 bg-gray-800/30 px-4 py-3 sm:flex-row"
									>
										<div class="text-sm text-gray-400">
											Showing {(adminStandingsPage - 1) * adminStandingsPerPage + 1} to {Math.min(
												adminStandingsPage * adminStandingsPerPage,
												filteredStandings.length
											)} of {filteredStandings.length} standings
										</div>
										<div class="flex items-center gap-2">
											<button
												onclick={() => (adminStandingsPage = 1)}
												disabled={adminStandingsPage === 1}
												class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium transition-all {adminStandingsPage ===
												1
													? 'cursor-not-allowed bg-gray-800/30 text-gray-600'
													: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
											>
												First
											</button>
											<button
												onclick={() => (adminStandingsPage = Math.max(1, adminStandingsPage - 1))}
												disabled={adminStandingsPage === 1}
												class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium transition-all {adminStandingsPage ===
												1
													? 'cursor-not-allowed bg-gray-800/30 text-gray-600'
													: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
												aria-label="Previous page"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 19l-7-7 7-7"
													/>
												</svg>
											</button>
											<div class="flex items-center gap-1">
												{#each Array(Math.min(5, totalAdminStandingsPages)) as _, i}
													{@const pageNum =
														adminStandingsPage <= 3
															? i + 1
															: adminStandingsPage >= totalAdminStandingsPages - 2
																? totalAdminStandingsPages - 4 + i
																: adminStandingsPage - 2 + i}
													{#if pageNum > 0 && pageNum <= totalAdminStandingsPages}
														<button
															onclick={() => (adminStandingsPage = pageNum)}
															class="h-8 w-8 rounded-lg text-sm font-medium transition-all {adminStandingsPage ===
															pageNum
																? 'bg-blue-500 text-white'
																: 'border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
														>
															{pageNum}
														</button>
													{/if}
												{/each}
											</div>
											<button
												onclick={() =>
													(adminStandingsPage = Math.min(
														totalAdminStandingsPages,
														adminStandingsPage + 1
													))}
												disabled={adminStandingsPage === totalAdminStandingsPages}
												class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium transition-all {adminStandingsPage ===
												totalAdminStandingsPages
													? 'cursor-not-allowed bg-gray-800/30 text-gray-600'
													: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
												aria-label="Next page"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</button>
											<button
												onclick={() => (adminStandingsPage = totalAdminStandingsPages)}
												disabled={adminStandingsPage === totalAdminStandingsPages}
												class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium transition-all {adminStandingsPage ===
												totalAdminStandingsPages
													? 'cursor-not-allowed bg-gray-800/30 text-gray-600'
													: 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}"
											>
												Last
											</button>
										</div>
									</div>
								{/if}

								<!-- Player Profiles Info -->
								<div class="mt-6 rounded-lg border border-gray-700 bg-gray-800/30 p-4">
									<h3 class="mb-3 text-sm font-medium text-gray-300">Player Profiles</h3>
									<p class="text-xs text-gray-500">
										Click the "Edit" button to open a player's profile page where you can view and
										edit all their standings data, including monthly breakdowns.
									</p>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</main>

<!-- Create Standing Modal -->
{#if showCreateStandingModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => {
				showCreateStandingModal = false;
				resetNewStanding();
			}}
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div class="relative w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-700 px-6 py-4">
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
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-lg font-semibold text-white">Create New Standing</h2>
						<p class="text-sm text-gray-400">Add a new player to the standings</p>
					</div>
				</div>
				<button
					onclick={() => {
						showCreateStandingModal = false;
						resetNewStanding();
					}}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
					aria-label="Close modal"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Form -->
			<form
				method="POST"
				action="?/createStanding"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showCreateStandingModal = false;
							resetNewStanding();
							await update();
						}
					};
				}}
				class="space-y-5 p-6"
			>
				<!-- Season and Circuit -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="season" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Season *</label
						>
						<select
							id="season"
							name="season"
							bind:value={newStanding.season}
							required
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						>
							<option value="2026">2026</option>
							<option value="2025">2025</option>
							<option value="2024">2024</option>
							<option value="2023">2023</option>
						</select>
					</div>
					<div>
						<label for="circuit" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Circuit *</label
						>
						<select
							id="circuit"
							name="circuit"
							bind:value={newStanding.circuit}
							required
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						>
							<option value="Los Angeles">Los Angeles</option>
							<option value="New England">New England</option>
							<option value="St. Louis">St. Louis</option>
						</select>
					</div>
				</div>

				<!-- Player Name -->
				<div>
					<label for="playerName" class="mb-1.5 block text-sm font-medium text-gray-300"
						>Player Name *</label
					>
					<input
						type="text"
						id="playerName"
						name="playerName"
						bind:value={newStanding.playerName}
						required
						placeholder="Enter player name"
						class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
					/>
				</div>

				<!-- GEM ID -->
				<div>
					<label for="gemId" class="mb-1.5 block text-sm font-medium text-gray-300">GEM ID</label>
					<input
						type="text"
						id="gemId"
						name="gemId"
						bind:value={newStanding.gemId}
						placeholder="Optional - for linking to player profile"
						class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
					/>
				</div>

				<!-- Points and Events -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="totalPoints" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Total Points</label
						>
						<input
							type="number"
							id="totalPoints"
							name="totalPoints"
							bind:value={newStanding.totalPoints}
							min="0"
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						/>
					</div>
				</div>

				<!-- Match Stats -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="matchesWon" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Matches Won</label
						>
						<input
							type="number"
							id="matchesWon"
							name="matchesWon"
							bind:value={newStanding.matchesWon}
							min="0"
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="matchesPlayed" class="mb-1.5 block text-sm font-medium text-gray-300"
							>Matches Played</label
						>
						<input
							type="number"
							id="matchesPlayed"
							name="matchesPlayed"
							bind:value={newStanding.matchesPlayed}
							min="0"
							class="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						/>
					</div>
				</div>

				<!-- Win Percentage Preview -->
				{#if newStanding.matchesPlayed > 0}
					<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
						<p class="text-sm text-gray-400">
							Win Percentage: <span class="font-semibold text-emerald-400"
								>{((newStanding.matchesWon / newStanding.matchesPlayed) * 100).toFixed(1)}%</span
							>
						</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => {
							showCreateStandingModal = false;
							resetNewStanding();
						}}
						class="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
					>
						Create Standing
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Standing Confirmation Modal -->
{#if showDeleteModal && deleteStandingData}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
		<div class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
			<div class="mb-6">
				<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
					<svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<h3 class="text-center text-lg font-semibold text-white">Delete Standing Record</h3>
				<p class="mt-2 text-center text-sm text-gray-400">
					This action cannot be undone. This will permanently delete the standing record for:
				</p>
				<div class="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-center">
					<p class="text-lg font-semibold text-white">{deleteStandingData.playerName}</p>
					{#if deleteStandingData.gemId}
						<p class="mt-1 font-mono text-sm text-blue-400">{deleteStandingData.gemId}</p>
					{/if}
					<p class="mt-2 text-xs text-gray-500">
						{deleteStandingData.season} • {deleteStandingData.circuit}
					</p>
				</div>
			</div>

			<div class="mb-6">
				<label for="delete-confirmation" class="block text-sm font-medium text-gray-300">
					Type <span class="font-semibold text-red-400">"{deleteStandingData.playerName}"</span> to confirm:
				</label>
				<input
					type="text"
					id="delete-confirmation"
					bind:value={deleteConfirmationInput}
					placeholder="Enter player name to confirm"
					class="mt-2 w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-base sm:text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
					autocomplete="off"
				/>
			</div>

			<div class="flex items-center justify-end gap-3">
				<button
					type="button"
					onclick={closeDeleteModal}
					class="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
				>
					Cancel
				</button>
				<form
					method="POST"
					action="?/deleteStanding"
					use:enhance={() => {
						isDeleting = true;
						return async ({ result, update }) => {
							isDeleting = false;
							if (result.type === 'success') {
								closeDeleteModal();
								await update();
							}
						};
					}}
				>
					<input type="hidden" name="standingId" value={deleteStandingData.id} />
					<button
						type="submit"
						disabled={!canDelete || isDeleting}
						class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isDeleting ? 'Deleting...' : 'Delete Standing'}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
