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

<nav class="sticky top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="flex h-16 items-center justify-between">
			<div class="flex items-center gap-8">
				<a href="/" class="text-xl font-bold text-[hsl(var(--primary))]"> Arcane </a>
				<!-- Desktop Navigation -->
				<div class="hidden items-center gap-6 md:flex">
					<a
						href="/"
						class="text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
					>
						Home
					</a>
					<a
						href="/articles"
						class="text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
					>
						Articles
					</a>
					<a
						href="/events"
						class="text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
					>
						Events
					</a>
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<a
							href="/premium"
							class="text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
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
						class="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
					>
						Account
					</a>
					{#if user.role === 'writer' || user.role === 'admin'}
						<a
							href="http://localhost:1337/admin"
							target="_blank"
							class="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
						>
							Writer
						</a>
					{/if}
					{#if user.role === 'tournament_staff'}
						<a
							href="/staff"
							class="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
						>
							Staff Dashboard
						</a>
					{/if}
					{#if user.role === 'admin'}
						<a
							href="/admin"
							class="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
						>
							Admin
						</a>
					{/if}
					<div
						class="hidden items-center gap-2 rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 lg:flex"
					>
						<span class="text-xs font-medium text-[hsl(var(--muted-foreground))]">
							{user.role}
						</span>
						<span class="text-xs text-[hsl(var(--muted-foreground))]">
							{user.email}
						</span>
					</div>
					<form method="POST" action="/logout" data-sveltekit-preload-data="off">
						<button
							type="submit"
							class="rounded-[var(--radius)] bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
						>
							Log out
						</button>
					</form>
				{:else}
					<a
						href="/login"
						class="text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
					>
						Login
					</a>
					<a
						href="/signup"
						class="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
					>
						Sign Up
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button
				on:click={toggleMobileMenu}
				class="rounded-[var(--radius)] p-2 transition-colors hover:bg-[hsl(var(--muted))] md:hidden"
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
			<div class="border-t border-[hsl(var(--border))] py-4 md:hidden">
				<div class="flex flex-col space-y-4">
					<a
						href="/"
						on:click={closeMobileMenu}
						class="px-2 py-2 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
					>
						Home
					</a>
					<a
						href="/articles"
						on:click={closeMobileMenu}
						class="px-2 py-2 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
					>
						Articles
					</a>
					<a
						href="/events"
						on:click={closeMobileMenu}
						class="px-2 py-2 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
					>
						Events
					</a>
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<a
							href="/premium"
							on:click={closeMobileMenu}
							class="px-2 py-2 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
						>
							Premium
						</a>
					{/if}

					{#if user}
						<div class="border-t border-[hsl(var(--border))] pt-4">
							<div class="mb-3 px-2 py-2">
								<div class="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{user.role}</div>
								<div class="text-sm font-medium text-[hsl(var(--foreground))]">{user.email}</div>
							</div>
							<a
								href="/account"
								on:click={closeMobileMenu}
								class="block px-2 py-2 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
							>
								Account
							</a>
							{#if user.role === 'writer' || user.role === 'admin'}
								<a
									href="http://localhost:1337/admin"
									target="_blank"
									on:click={closeMobileMenu}
									class="block px-2 py-2 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
								>
									Writer
								</a>
							{/if}
							{#if user.role === 'tournament_staff'}
								<a
									href="/staff"
									on:click={closeMobileMenu}
									class="block px-2 py-2 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
								>
									Staff Dashboard
								</a>
							{/if}
							{#if user.role === 'admin'}
								<a
									href="/admin"
									on:click={closeMobileMenu}
									class="block px-2 py-2 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
								>
									Admin
								</a>
							{/if}
							<form method="POST" action="/logout" data-sveltekit-preload-data="off" class="mt-3">
								<button
									type="submit"
									class="w-full rounded-[var(--radius)] bg-[hsl(var(--secondary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--secondary-foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
								>
									Log out
								</button>
							</form>
						</div>
					{:else}
						<div class="space-y-3 border-t border-[hsl(var(--border))] pt-4">
							<a
								href="/login"
								on:click={closeMobileMenu}
								class="block rounded-[var(--radius)] border border-[hsl(var(--border))] px-4 py-2.5 text-center text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
							>
								Login
							</a>
							<a
								href="/signup"
								on:click={closeMobileMenu}
								class="block rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2.5 text-center text-sm font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
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
