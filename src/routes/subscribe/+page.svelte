<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Redirect to /premium page
	onMount(() => {
		goto('/premium', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Redirecting...</title>
</svelte:head>

<div class="container mx-auto px-2 py-8 max-w-4xl text-center">
	<p class="text-gray-600">Redirecting to premium page...</p>
</div>
