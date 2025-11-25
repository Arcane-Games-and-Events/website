<script>
	import '../app.css';
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	export let data;

	// Auth pages that should not show the sidebar
	const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
	$: isAuthPage = authRoutes.some(route => $page.url.pathname.startsWith(route));
</script>

{#if isAuthPage}
	<slot />
{:else}
	<Sidebar user={data.user}>
		<main class="py-10">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<slot />
			</div>
		</main>
	</Sidebar>
{/if}
