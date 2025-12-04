<script>
	import AdminSidebar from '$lib/components/AdminSidebar.svelte';
	import { page } from '$app/stores';

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

		return 'overview';
	});

	// Page title based on current page
	let pageTitle = $derived.by(() => {
		switch (currentPage) {
			case 'overview': return 'Dashboard Overview';
			case 'events': return 'Events Management';
			case 'orders': return 'Order History';
			case 'staff': return 'Tournament Staff';
			case 'users': return 'User Management';
			case 'players': return 'Standings';
			case 'seasons': return 'Calendar';
			case 'import-matches': return 'Import Match History';
			default: return 'Admin';
		}
	});
</script>

<AdminSidebar {currentPage} {sidebarOpen} onClose={closeSidebar} />

<div class="min-h-screen bg-gray-950 pl-0 lg:pl-64">
	<!-- Mobile Header with Hamburger Menu -->
	<header class="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-800 bg-gray-950/95 px-4 backdrop-blur-sm lg:hidden">
		<button
			onclick={toggleSidebar}
			class="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
			aria-label="Toggle menu"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
		<h1 class="text-lg font-semibold text-white">{pageTitle}</h1>
	</header>

	{@render children()}
</div>
