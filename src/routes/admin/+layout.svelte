<script>
	import AdminSidebar from '$lib/components/AdminSidebar.svelte';
	import { page, navigating } from '$app/stores';

	let { children } = $props();

	// Sidebar state
	let sidebarOpen = $state(false);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}

	// Determine current page for sidebar highlighting
	let currentPage = $derived.by(() => {
		const tab = $page.url.searchParams.get('tab');
		if (tab) return tab;

		// Check if we're on a subpage
		const pathname = $page.url.pathname;
		if (pathname.includes('/admin/customers/')) return 'users';
		if (pathname.includes('/admin/orders/')) return 'orders';
		if (pathname.includes('/admin/import-matches')) return 'import-matches';
		if (pathname.includes('/admin/analytics')) return 'analytics';
		if (pathname.includes('/admin/cards')) return 'cards';

		return 'overview';
	});

	// Page title based on current page
	let pageTitle = $derived.by(() => {
		switch (currentPage) {
			case 'overview':
				return 'Dashboard';
			case 'analytics':
				return 'Analytics';
			case 'events':
				return 'Events';
			case 'orders':
				return 'Orders';
			case 'staff':
				return 'Staff';
			case 'users':
				return 'Users';
			case 'players':
				return 'Standings';
			case 'calendar':
				return 'Calendar';
			case 'import-matches':
				return 'Import Matches';
			case 'cards':
				return 'Card Database';
			default:
				return 'Admin';
		}
	});
</script>

<!-- Navigation Loading Indicator -->
{#if $navigating}
	<div class="fixed top-0 right-0 left-0 z-[9999] h-0.5">
		<div class="animate-loading-bar h-full bg-blue-500"></div>
	</div>
{/if}

<AdminSidebar {currentPage} {sidebarOpen} onClose={closeSidebar} />

<div class="min-h-screen bg-gray-950 pl-0 lg:pl-64">
	<!-- Mobile Header with Hamburger Menu -->
	<header
		class="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-white/5 bg-gray-950/95 px-4 backdrop-blur-sm lg:hidden"
	>
		<button
			onclick={toggleSidebar}
			class="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
			aria-label="Toggle menu"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
		</button>
		<h1 class="text-lg font-semibold text-white">{pageTitle}</h1>
	</header>

	{@render children()}
</div>
