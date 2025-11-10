<script>
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import { onMount } from 'svelte';
	import { theme as themeStore } from '$lib/stores/theme.js';
	export let data;

	// Sync user's database theme with the theme store
	onMount(() => {
		if (data.user?.theme) {
			// User is logged in, use their database theme
			themeStore.set(data.user.theme);
			document.documentElement.classList.toggle('dark', data.user.theme === 'dark');
		}
		// If not logged in, the theme store will use localStorage (handled by theme.js)
	});

	// Watch for theme changes from the user object
	$: if (typeof document !== 'undefined' && data.user?.theme) {
		themeStore.set(data.user.theme);
		document.documentElement.classList.toggle('dark', data.user.theme === 'dark');
	}
</script>

<Navbar user={data.user} />

<main class="p-8">
	<slot />
</main>
