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

<div class="container mx-auto max-w-4xl px-2 py-8 text-center">
	<p class="text-gray-600">Redirecting to premium page...</p>
</div>
