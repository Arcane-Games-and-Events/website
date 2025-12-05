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
			<main class="flex-1 pb-16">
				<slot />
			</main>
			<Footer />
		</div>
	</Sidebar>
{/if}
