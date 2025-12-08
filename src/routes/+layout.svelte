<script>
	import '../app.css';
	import { page, navigating } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	export let data;

	// Auth pages that should not show the sidebar
	const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
	$: isAuthPage = authRoutes.some(route => $page.url.pathname.startsWith(route));

	// Admin pages have their own layout
	$: isAdminPage = $page.url.pathname.startsWith('/admin');
</script>

<!-- Skip to content link for accessibility -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
>
	Skip to main content
</a>

<!-- Navigation Loading Indicator -->
{#if $navigating}
	<div class="fixed top-0 left-0 right-0 z-[9999] h-0.5">
		<div class="h-full bg-blue-500 animate-loading-bar"></div>
	</div>
{/if}

{#if isAuthPage}
	<slot />
{:else if isAdminPage}
	<slot />
{:else}
	<Sidebar user={data.user}>
		<div class="flex min-h-screen flex-col bg-gray-950">
			<main id="main-content" class="flex-1 pb-16">
				<slot />
			</main>
			<Footer />
		</div>
	</Sidebar>
{/if}
