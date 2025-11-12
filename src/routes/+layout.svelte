<script>
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	export let data;
</script>

<Navbar user={data.user} />

<main class="p-8">
	<slot />
</main>
