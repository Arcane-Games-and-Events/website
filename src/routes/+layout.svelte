<script>
	import '../app.css';
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	export let data;

	// Auth pages that should not show the sidebar
	const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
	$: isAuthPage = authRoutes.some(route => $page.url.pathname.startsWith(route));
</script>

{#if isAuthPage}
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
