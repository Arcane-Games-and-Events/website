<script>
	export let user = null;
	let mobileMenuOpen = false;

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<nav class="sticky top-0 z-50 border-b border-gray-700 bg-gray-950">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="flex h-16 items-center justify-between">
			<div class="flex items-center gap-8">
				<a href="/" class="text-xl font-bold text-white"> Arcane </a>
				<!-- Desktop Navigation -->
				<div class="hidden items-center gap-6 md:flex">
					<a
						href="/"
						class="text-sm font-medium text-gray-100 transition-colors hover:text-white"
					>
						Home
					</a>
					<a
						href="/read"
						class="text-sm font-medium text-gray-100 transition-colors hover:text-white"
					>
						Learn
					</a>
					<a
						href="/play"
						class="text-sm font-medium text-gray-100 transition-colors hover:text-white"
					>
						Play
					</a>
					<a
						href="/live"
						class="text-sm font-medium text-gray-100 transition-colors hover:text-white"
					>
						AGE Live
					</a>
					<a
						href="/academy"
						class="text-sm font-medium text-gray-100 transition-colors hover:text-white"
					>
						Academy
					</a>
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<a
							href="/premium"
							class="text-sm font-medium text-gray-100 transition-colors hover:text-white"
						>
							Premium
						</a>
					{/if}
				</div>
			</div>

			<!-- Desktop User Menu -->
			<div class="hidden items-center gap-4 md:flex">
				{#if user}
					<a
						href="/account"
						class="text-sm font-medium text-gray-400 transition-colors hover:text-white"
					>
						Account
					</a>
					{#if user.role === 'writer' || user.role === 'admin'}
						<a
							href="http://localhost:1337/admin"
							target="_blank"
							class="text-sm font-medium text-gray-400 transition-colors hover:text-white"
						>
							Writer
						</a>
					{/if}
					{#if user.role === 'tournament_staff'}
						<a
							href="/staff"
							class="text-sm font-medium text-gray-400 transition-colors hover:text-white"
						>
							Staff Dashboard
						</a>
					{/if}
					{#if user.role === 'admin'}
						<a
							href="/admin"
							class="text-sm font-medium text-gray-400 transition-colors hover:text-white"
						>
							Admin
						</a>
					{/if}
					<div
						class="hidden items-center gap-2 rounded-full bg-gray-800 px-3 py-1.5 lg:flex"
					>
						<span class="text-xs font-medium text-gray-400">
							{user.role}
						</span>
						<span class="text-xs text-gray-400">
							{user.email}
						</span>
					</div>
					<form method="POST" action="/logout" data-sveltekit-preload-data="off">
						<button
							type="submit"
							class="rounded-[var(--radius)] bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
						>
							Log out
						</button>
					</form>
				{:else}
					<a
						href="/login"
						class="text-sm font-medium text-gray-100 transition-colors hover:text-white"
					>
						Login
					</a>
					<a
						href="/signup"
						class="rounded-[var(--radius)] bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
					>
						Sign Up
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button
				on:click={toggleMobileMenu}
				class="rounded-[var(--radius)] p-2 transition-colors hover:bg-gray-800 md:hidden"
				aria-label="Toggle menu"
			>
				{#if mobileMenuOpen}
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				{:else}
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				{/if}
			</button>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div class="border-t border-gray-700 py-4 md:hidden">
				<div class="flex flex-col space-y-4">
					<a
						href="/"
						on:click={closeMobileMenu}
						class="px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
					>
						Home
					</a>
					<a
						href="/read"
						on:click={closeMobileMenu}
						class="px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
					>
						Learn
					</a>
					<a
						href="/play"
						on:click={closeMobileMenu}
						class="px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
					>
						Play
					</a>
					<a
						href="/live"
						on:click={closeMobileMenu}
						class="px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
					>
						AGE Live
					</a>
					<a
						href="/academy"
						on:click={closeMobileMenu}
						class="px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
					>
						Academy
					</a>
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<a
							href="/premium"
							on:click={closeMobileMenu}
							class="px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
						>
							Premium
						</a>
					{/if}

					{#if user}
						<div class="border-t border-gray-700 pt-4">
							<div class="mb-3 px-2 py-2">
								<div class="mb-1 text-xs text-gray-400">{user.role}</div>
								<div class="text-sm font-medium text-gray-100">{user.email}</div>
							</div>
							<a
								href="/account"
								on:click={closeMobileMenu}
								class="block px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
							>
								Account
							</a>
							{#if user.role === 'writer' || user.role === 'admin'}
								<a
									href="http://localhost:1337/admin"
									target="_blank"
									on:click={closeMobileMenu}
									class="block px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
								>
									Writer
								</a>
							{/if}
							{#if user.role === 'tournament_staff'}
								<a
									href="/staff"
									on:click={closeMobileMenu}
									class="block px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
								>
									Staff Dashboard
								</a>
							{/if}
							{#if user.role === 'admin'}
								<a
									href="/admin"
									on:click={closeMobileMenu}
									class="block px-2 py-2 text-base font-medium text-gray-100 transition-colors hover:text-white"
								>
									Admin
								</a>
							{/if}
							<form method="POST" action="/logout" data-sveltekit-preload-data="off" class="mt-3">
								<button
									type="submit"
									class="w-full rounded-[var(--radius)] bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
								>
									Log out
								</button>
							</form>
						</div>
					{:else}
						<div class="space-y-3 border-t border-gray-700 pt-4">
							<a
								href="/login"
								on:click={closeMobileMenu}
								class="block rounded-[var(--radius)] border border-gray-700 px-4 py-2.5 text-center text-sm font-medium text-gray-100 transition-colors hover:bg-gray-800"
							>
								Login
							</a>
							<a
								href="/signup"
								on:click={closeMobileMenu}
								class="block rounded-[var(--radius)] bg-white px-4 py-2.5 text-center text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
							>
								Sign Up
							</a>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</nav>
