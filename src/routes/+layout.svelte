<script>
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	export let data;
</script>

<Sidebar user={data.user}>
	<main class="py-10">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<slot />
		</div>
	</main>
</Sidebar>
