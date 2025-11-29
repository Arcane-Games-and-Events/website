<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	export let data;
	export let form;

	// Mobile sidebar state
	let sidebarOpen = false;

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}

	// Get active tab from URL, defaulting to 'overview'
	$: activeTab = $page.url.searchParams.get('tab') || 'overview';

	// Search and filter state
	let userSearchQuery = '';
	let selectedEventForStaff = '';

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
	$: filteredUsers = data.allUsers.filter((user) =>
		user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
	);

	// Function to switch tabs and update URL
	function switchTab(tabId) {
		const url = new URL($page.url);
		if (tabId === 'overview') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', tabId);
		}
		goto(url.toString(), { replaceState: false, noScroll: true });
		closeSidebar(); // Close sidebar on mobile after navigation
	}

	// Tab configuration with icons
	const tabs = [
		{ id: 'overview', name: 'Overview', icon: 'home' },
		{ id: 'events', name: 'Events', icon: 'calendar' },
		{ id: 'orders', name: 'Orders', icon: 'receipt' },
		{ id: 'staff', name: 'Staff', icon: 'users' },
		{ id: 'users', name: 'Users', icon: 'user' }
	];

	// Stats for overview
	$: upcomingEvents = data.events.filter(e => new Date(e.eventDate) > new Date()).length;
	$: pastEvents = data.events.filter(e => new Date(e.eventDate) <= new Date()).length;
</script>

<svelte:head>
	<title>Admin Dashboard - AGE</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<div class="flex">
		<!-- Mobile Overlay -->
		{#if sidebarOpen}
			<div
				class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
				on:click={closeSidebar}
				on:keydown={(e) => e.key === 'Escape' && closeSidebar()}
				role="button"
				tabindex="0"
				aria-label="Close sidebar"
			></div>
		{/if}

		<!-- Sidebar Navigation -->
		<aside class="fixed left-0 top-0 z-50 h-screen w-64 border-r border-gray-800 bg-gray-900/95 backdrop-blur-sm transition-transform duration-300 ease-in-out lg:translate-x-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}">
			<!-- Logo/Brand -->
			<div class="flex h-16 items-center justify-between border-b border-gray-800 px-4 lg:px-6">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
						<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
					<div>
						<h2 class="font-bold text-white">Admin Panel</h2>
						<p class="text-xs text-gray-400">AGE Software</p>
					</div>
				</div>
				<!-- Close button for mobile -->
				<button
					on:click={closeSidebar}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white lg:hidden"
					aria-label="Close menu"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Navigation -->
			<nav class="mt-6 px-3 space-y-1">
				{#each tabs as tab}
					<button
						on:click={() => switchTab(tab.id)}
						class="group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 {activeTab === tab.id
							? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/5 border border-blue-500/30'
							: 'text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent'}"
					>
						{#if tab.icon === 'home'}
							<svg class="h-5 w-5 {activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
							</svg>
						{:else if tab.icon === 'calendar'}
							<svg class="h-5 w-5 {activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
						{:else if tab.icon === 'receipt'}
							<svg class="h-5 w-5 {activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
						{:else if tab.icon === 'users'}
							<svg class="h-5 w-5 {activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						{:else if tab.icon === 'user'}
							<svg class="h-5 w-5 {activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						{/if}
						{tab.name}
						{#if activeTab === tab.id}
							<span class="ml-auto h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
						{/if}
					</button>
				{/each}
			</nav>

			<!-- Quick Actions in Sidebar -->
			<div class="absolute bottom-0 left-0 right-0 border-t border-gray-800 p-4">
				<a
					href="/"
					class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to Site
				</a>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="min-h-screen w-full lg:ml-64">
			<!-- Top Bar -->
			<header class="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
				<div class="flex h-16 items-center justify-between px-4 lg:px-8">
					<div class="flex items-center gap-3">
						<!-- Mobile Menu Toggle -->
						<button
							on:click={toggleSidebar}
							class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white lg:hidden"
							aria-label="Toggle menu"
						>
							{#if sidebarOpen}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							{:else}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
								</svg>
							{/if}
						</button>
						<div>
							<h1 class="text-lg font-bold text-white lg:text-xl">
								{#if activeTab === 'overview'}Dashboard Overview
								{:else if activeTab === 'events'}Events Management
								{:else if activeTab === 'orders'}Order History
								{:else if activeTab === 'staff'}Tournament Staff
								{:else if activeTab === 'users'}User Management
								{/if}
							</h1>
						</div>
					</div>
					<div class="flex items-center gap-4">
						<div class="hidden items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-1.5 sm:flex">
							<div class="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
							<span class="text-sm text-gray-300">{data.user.email}</span>
						</div>
						<!-- Mobile user indicator -->
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white sm:hidden">
							{data.user.email.charAt(0).toUpperCase()}
						</div>
					</div>
				</div>
			</header>

			<div class="p-4 lg:p-8">
				<!-- Success/Error Messages -->
				{#if form?.success}
					<div class="mb-6 rounded-xl border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/5 p-4 shadow-lg shadow-green-500/5">
						<div class="flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
								<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<p class="text-sm font-medium text-green-400">{form.message}</p>
						</div>
					</div>
				{/if}

				{#if form?.error}
					<div class="mb-6 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/5 p-4 shadow-lg shadow-red-500/5">
						<div class="flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
								<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</div>
							<p class="text-sm font-medium text-red-400">{form.error}</p>
						</div>
					</div>
				{/if}

				<!-- Overview Tab Content -->
				{#if activeTab === 'overview'}
					<!-- Stats Cards -->
					<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
						<div class="group relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/50 via-gray-900 to-gray-950 p-5 transition-all duration-300 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
							<div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-colors"></div>
							<div class="relative flex items-center gap-4">
								<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
									<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
								</div>
								<div>
									<div class="text-3xl font-bold text-white">{data.stats.totalEvents}</div>
									<div class="text-sm text-blue-300/80">Total Events</div>
								</div>
							</div>
						</div>

						<div class="group relative overflow-hidden rounded-xl border border-green-500/30 bg-gradient-to-br from-green-950/50 via-gray-900 to-gray-950 p-5 transition-all duration-300 hover:border-green-500/60 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-1">
							<div class="absolute top-0 right-0 w-24 h-24 bg-green-500/20 rounded-full blur-2xl group-hover:bg-green-500/30 transition-colors"></div>
							<div class="relative flex items-center gap-4">
								<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
									<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div>
									<div class="text-3xl font-bold text-white">{data.stats.totalOrders}</div>
									<div class="text-sm text-green-300/80">Total Orders</div>
								</div>
							</div>
						</div>

						<div class="group relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-gray-900 to-gray-950 p-5 transition-all duration-300 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1">
							<div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors"></div>
							<div class="relative flex items-center gap-4">
								<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
									<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
									</svg>
								</div>
								<div>
									<div class="text-3xl font-bold text-white">{data.stats.premiumUsers}</div>
									<div class="text-sm text-purple-300/80">Premium Members</div>
								</div>
							</div>
						</div>

						<div class="group relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/50 via-gray-900 to-gray-950 p-5 transition-all duration-300 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1">
							<div class="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors"></div>
							<div class="relative flex items-center gap-4">
								<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
									<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
									</svg>
								</div>
								<div>
									<div class="text-3xl font-bold text-white">{data.allUsers.length}</div>
									<div class="text-sm text-amber-300/80">Total Users</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Quick Actions & Recent Activity -->
					<div class="grid gap-6 lg:grid-cols-3">
						<!-- Quick Actions -->
						<div class="lg:col-span-1">
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
								<h3 class="mb-4 text-lg font-semibold text-white flex items-center gap-2">
									<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									Quick Actions
								</h3>
								<div class="space-y-3">
									<a
										href="/admin/events/new"
										class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4 transition-all hover:border-blue-500/50 hover:bg-gray-800 group"
									>
										<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
											</svg>
										</div>
										<div>
											<div class="font-medium text-white">Create Event</div>
											<div class="text-xs text-gray-400">Add a new tournament</div>
										</div>
									</a>

									<button
										on:click={() => switchTab('users')}
										class="flex w-full items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4 transition-all hover:border-purple-500/50 hover:bg-gray-800 group text-left"
									>
										<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 transition-colors">
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
											</svg>
										</div>
										<div>
											<div class="font-medium text-white">Manage Users</div>
											<div class="text-xs text-gray-400">Update roles & permissions</div>
										</div>
									</button>

									<button
										on:click={() => switchTab('staff')}
										class="flex w-full items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4 transition-all hover:border-green-500/50 hover:bg-gray-800 group text-left"
									>
										<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400 group-hover:bg-green-500/30 transition-colors">
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
								<div class="flex items-center justify-between mb-4">
									<h3 class="text-lg font-semibold text-white flex items-center gap-2">
										<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Recent Events
									</h3>
									<button
										on:click={() => switchTab('events')}
										class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
									>
										View all
									</button>
								</div>
								{#if data.events.length > 0}
									<div class="space-y-3">
										{#each data.events.slice(0, 5) as event, i}
											<a
												href="/admin/events/{event.id}"
												class="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 transition-all hover:border-gray-600 hover:bg-gray-800/50 group"
											>
												<div class="flex items-center gap-4">
													<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50 text-sm font-bold text-gray-300">
														{i + 1}
													</div>
													<div>
														<div class="font-medium text-white group-hover:text-blue-400 transition-colors">{event.title}</div>
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
												<svg class="h-5 w-5 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
												</svg>
											</a>
										{/each}
									</div>
								{:else}
									<div class="rounded-lg border border-dashed border-gray-700 p-8 text-center">
										<svg class="mx-auto h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										<p class="mt-4 text-gray-400">No events yet</p>
										<a
											href="/admin/events/new"
											class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
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
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold text-white flex items-center gap-2">
								<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
								</svg>
								Recent Orders
							</h3>
							<button
								on:click={() => switchTab('orders')}
								class="text-sm text-green-400 hover:text-green-300 transition-colors"
							>
								View all
							</button>
						</div>
						{#if data.recentOrders.length > 0}
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
										{#each data.recentOrders.slice(0, 5) as order}
											<tr class="group">
												<td class="py-3 text-sm text-gray-300">{order.userEmail}</td>
												<td class="py-3 text-sm font-semibold text-green-400">${order.amount}</td>
												<td class="py-3">
													<span class="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400">
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
					<div class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
						<div class="flex items-center justify-between border-b border-gray-800 bg-gray-800/30 px-6 py-4">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
									<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">All Events</h2>
									<p class="text-sm text-gray-400">{data.events.length} events total</p>
								</div>
							</div>
							<a
								href="/admin/events/new"
								class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 hover:scale-105"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								Create Event
							</a>
						</div>

						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gray-800/50">
									<tr>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Event</th>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Format</th>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Location</th>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Price</th>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-800">
									{#each data.events as event}
										<tr class="group transition-colors hover:bg-gray-800/50">
											<td class="px-6 py-4">
												<div class="flex items-center gap-3">
													<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50 text-sm font-bold text-gray-300">
														{event.title.charAt(0)}
													</div>
													<div>
														<div class="font-medium text-white group-hover:text-blue-400 transition-colors">{event.title}</div>
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
													<span class="rounded-full bg-gray-700 px-2 py-1 text-xs text-gray-400">TBA</span>
												{/if}
											</td>
											<td class="px-6 py-4">
												<span class="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
													{event.format || 'N/A'}
												</span>
											</td>
											<td class="px-6 py-4 text-sm text-gray-400">
												{event.location || 'TBA'}
											</td>
											<td class="px-6 py-4">
												<span class="text-sm font-semibold text-green-400">${parseFloat(event.price).toFixed(2)}</span>
											</td>
											<td class="px-6 py-4">
												<a
													href="/admin/events/{event.id}"
													class="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-600"
												>
													Manage
													<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
													</svg>
												</a>
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="6" class="px-6 py-12 text-center">
												<div class="flex flex-col items-center">
													<svg class="h-12 w-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
													</svg>
													<p class="text-gray-400">No events yet</p>
													<a
														href="/admin/events/new"
														class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
													>
														<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
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

				<!-- Orders Tab -->
				{#if activeTab === 'orders'}
					<div class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
						<div class="flex items-center justify-between border-b border-gray-800 bg-gray-800/30 px-6 py-4">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
									<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">Order History</h2>
									<p class="text-sm text-gray-400">{data.recentOrders.length} orders</p>
								</div>
							</div>
						</div>

						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gray-800/50">
									<tr>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Customer</th>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Amount</th>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Type</th>
										<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-800">
									{#each data.recentOrders as order}
										<tr class="group transition-colors hover:bg-gray-800/50">
											<td class="px-6 py-4">
												<div class="flex items-center gap-3">
													<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700/50 text-sm font-bold text-gray-300">
														{order.userEmail.charAt(0).toUpperCase()}
													</div>
													<span class="text-sm text-gray-300">{order.userEmail}</span>
												</div>
											</td>
											<td class="px-6 py-4">
												<span class="text-lg font-bold text-green-400">${order.amount}</span>
											</td>
											<td class="px-6 py-4">
												<span class="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400 capitalize">
													{order.meta?.type || 'payment'}
												</span>
											</td>
											<td class="px-6 py-4 text-sm text-gray-500">
												{new Date(order.createdAt).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="4" class="px-6 py-12 text-center">
												<div class="flex flex-col items-center">
													<svg class="h-12 w-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
													</svg>
													<p class="text-gray-400">No orders yet</p>
													<p class="text-sm text-gray-500 mt-1">Orders will appear here when customers make purchases</p>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Tournament Staff Tab -->
				{#if activeTab === 'staff'}
					<div class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
						<div class="flex items-center justify-between border-b border-gray-800 bg-gray-800/30 px-6 py-4">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
									<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">Tournament Staff</h2>
									<p class="text-sm text-gray-400">{data.tournamentStaff.length} staff members</p>
								</div>
							</div>
							<button
								on:click={() => switchTab('users')}
								class="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 hover:text-white"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								Add Staff
							</button>
						</div>

						<div class="p-6">
							{#if data.tournamentStaff.length === 0}
								<div class="rounded-xl border border-dashed border-gray-700 p-12 text-center">
									<svg class="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
									<p class="text-gray-400">No tournament staff members yet</p>
									<p class="text-sm text-gray-500 mt-2">Assign the "tournament_staff" role to users in User Management</p>
									<button
										on:click={() => switchTab('users')}
										class="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 transition-colors"
									>
										Go to User Management
									</button>
								</div>
							{:else}
								<div class="space-y-6">
									{#each data.tournamentStaff as staff}
										<div class="rounded-xl border border-gray-700 bg-gray-800/30 p-5">
											<div class="mb-4 flex items-center gap-4">
												<div class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-lg font-bold text-white">
													{staff.email.charAt(0).toUpperCase()}
												</div>
												<div>
													<h3 class="font-semibold text-white">{staff.email}</h3>
													<span class="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
														Tournament Staff
													</span>
												</div>
											</div>

											<div class="space-y-3">
												<p class="text-sm font-medium text-gray-300 flex items-center gap-2">
													<svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
													</svg>
													Event Assignments
												</p>
												<div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
													{#each data.events as event}
														{@const isAssigned = isStaffAssigned(staff.id, event.id)}
														<div
															class="flex items-center justify-between rounded-lg border p-3 transition-all {isAssigned
																? 'border-green-500/30 bg-green-500/10'
																: 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}"
														>
															<div class="min-w-0 flex-1">
																<p class="truncate text-sm font-medium {isAssigned ? 'text-green-400' : 'text-gray-300'}">
																	{event.title}
																</p>
																<p class="text-xs text-gray-500">
																	{event.eventDate
																		? new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
																		: 'TBA'}
																</p>
															</div>
															{#if isAssigned}
																<form method="POST" action="?/unassignStaff" use:enhance>
																	<input type="hidden" name="staffId" value={staff.id} />
																	<input type="hidden" name="eventId" value={event.id} />
																	<button
																		type="submit"
																		class="ml-2 rounded-md bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
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
																		class="ml-2 rounded-md bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/30"
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
					<div class="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
						<div class="flex items-center justify-between border-b border-gray-800 bg-gray-800/30 px-6 py-4">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
									<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">User Management</h2>
									<p class="text-sm text-gray-400">{data.allUsers.length} registered users</p>
								</div>
							</div>
						</div>

						<div class="p-6">
							<!-- Search Bar -->
							<div class="mb-6">
								<div class="relative">
									<svg class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									<input
										id="user-search"
										type="text"
										bind:value={userSearchQuery}
										placeholder="Search users by email..."
										class="w-full rounded-xl border border-gray-700 bg-gray-800/50 py-3 pl-10 pr-4 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
									/>
								</div>
							</div>

							<!-- Users Table -->
							<div class="overflow-x-auto rounded-xl border border-gray-700">
								<table class="w-full">
									<thead class="bg-gray-800/50">
										<tr>
											<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">User</th>
											<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Role</th>
											<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Joined</th>
											<th class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each filteredUsers.slice(0, 20) as user}
											<tr class="group transition-colors hover:bg-gray-800/50">
												<td class="px-6 py-4">
													<div class="flex items-center gap-3">
														<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br {user.role === 'admin' ? 'from-purple-500 to-violet-600' : user.role === 'premium' ? 'from-blue-500 to-cyan-600' : user.role === 'tournament_staff' ? 'from-green-500 to-emerald-600' : 'from-gray-500 to-gray-600'} text-sm font-bold text-white">
															{user.email.charAt(0).toUpperCase()}
														</div>
														<div>
															<div class="text-sm font-medium text-white">{user.email}</div>
															{#if user.id === data.user.id}
																<span class="text-xs text-blue-400">You</span>
															{/if}
														</div>
													</div>
												</td>
												<td class="px-6 py-4">
													<span
														class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize
														{user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : ''}
														{user.role === 'premium' ? 'bg-blue-500/20 text-blue-400' : ''}
														{user.role === 'tournament_staff' ? 'bg-green-500/20 text-green-400' : ''}
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
																class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
															>
																<option value="free" selected={user.role === 'free'}>Free</option>
																<option value="premium" selected={user.role === 'premium'}>Premium</option>
																<option value="writer" selected={user.role === 'writer'}>Writer</option>
																<option value="tournament_staff" selected={user.role === 'tournament_staff'}>Tournament Staff</option>
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
										<svg class="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
										<p class="text-gray-400">No users found matching "{userSearchQuery}"</p>
										<p class="text-sm text-gray-500 mt-1">Try a different search term</p>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>
