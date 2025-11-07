<script>
	export let user = null;
</script>

<nav class="flex gap-6 bg-gray-900 p-4 text-white">
	<a href="/" class="hover:underline">Home</a>
	<a href="/academy" class="hover:underline">Academy</a>
	<a href="/articles" class="hover:underline">Articles</a>
	<a href="/premium" class="hover:underline">Premium</a>

	{#if user}
		<!-- role-specific links on the right -->
		<div class="ml-auto flex items-center gap-4">
			{#if user.role === 'writer' || user.role === 'admin'}
				<a href="/writer" class="hover:underline">Writer</a>
			{/if}
			{#if user.role === 'admin'}
				<a href="/admin" class="hover:underline">Admin</a>
			{/if}
			<span class="text-sm opacity-80">({user.role}) {user.email}</span>

			<form method="POST" action="/logout" data-sveltekit-preload-data="off">
				<button type="submit" class="hover:underline">Log out</button>
			</form>
		</div>
	{:else}
		<a class="ml-auto hover:underline" href="/login">Login</a>
		<a class="hover:underline" href="/signup">Signup</a>
	{/if}
</nav>
