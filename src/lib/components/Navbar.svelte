<script>
	import { theme, toggleTheme } from '$lib/stores/theme.js';
	export let user = null;
	let mobileMenuOpen = false;

	$: currentTheme = $theme;

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<nav class="sticky top-0 z-50 border-b bg-[hsl(var(--background))] border-[hsl(var(--border))]">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="flex h-16 items-center justify-between">
			<div class="flex items-center gap-8">
				<a href="/" class="text-xl font-bold text-[hsl(var(--primary))]">
					Arcane
				</a>
				<!-- Desktop Navigation -->
				<div class="hidden md:flex items-center gap-6">
					<a href="/" class="text-sm font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
						Home
					</a>
					<a href="/articles" class="text-sm font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
						Articles
					</a>
					<a href="/events" class="text-sm font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
						Events
					</a>
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<a href="/premium" class="text-sm font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
							Premium
						</a>
					{/if}
				</div>
			</div>

			<!-- Desktop User Menu -->
			<div class="hidden md:flex items-center gap-4">
				{#if user}
					<a
						href="/account"
						class="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
					>
						Account
					</a>
					{#if user.role === 'writer' || user.role === 'admin'}
						<a
							href="http://localhost:1337/admin"
							target="_blank"
							class="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
						>
							Writer
						</a>
					{/if}
					{#if user.role === 'admin'}
						<a
							href="/admin"
							class="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
						>
							Admin
						</a>
					{/if}
					<div class="hidden lg:flex items-center gap-2 rounded-full bg-[hsl(var(--muted))] px-3 py-1.5">
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
							class="rounded-[var(--radius)] bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
						>
							Log out
						</button>
					</form>
				{:else}
					<button
						on:click={toggleTheme}
						class="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] hover:bg-[hsl(var(--muted))] transition-colors"
						aria-label="Toggle dark mode"
					>
						{#if currentTheme === 'dark'}
							<svg class="h-5 w-5 text-[hsl(var(--foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
							</svg>
						{:else}
							<svg class="h-5 w-5 text-[hsl(var(--foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						{/if}
					</button>
					<a
						href="/login"
						class="text-sm font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
					>
						Login
					</a>
					<a
						href="/signup"
						class="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
					>
						Sign Up
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button
				on:click={toggleMobileMenu}
				class="md:hidden p-2 rounded-[var(--radius)] hover:bg-[hsl(var(--muted))] transition-colors"
				aria-label="Toggle menu"
			>
				{#if mobileMenuOpen}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div class="md:hidden py-4 border-t border-[hsl(var(--border))]">
				<div class="flex flex-col space-y-4">
					<a
						href="/"
						on:click={closeMobileMenu}
						class="text-base font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors px-2 py-2"
					>
						Home
					</a>
					<a
						href="/articles"
						on:click={closeMobileMenu}
						class="text-base font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors px-2 py-2"
					>
						Articles
					</a>
					<a
						href="/events"
						on:click={closeMobileMenu}
						class="text-base font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors px-2 py-2"
					>
						Events
					</a>
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<a
							href="/premium"
							on:click={closeMobileMenu}
							class="text-base font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors px-2 py-2"
						>
							Premium
						</a>
					{/if}

					{#if user}
						<div class="pt-4 border-t border-[hsl(var(--border))]">
							<div class="px-2 py-2 mb-3">
								<div class="text-xs text-[hsl(var(--muted-foreground))] mb-1">{user.role}</div>
								<div class="text-sm font-medium text-[hsl(var(--foreground))]">{user.email}</div>
							</div>
							<a
								href="/account"
								on:click={closeMobileMenu}
								class="block text-base font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors px-2 py-2"
							>
								Account
							</a>
							{#if user.role === 'writer' || user.role === 'admin'}
								<a
									href="http://localhost:1337/admin"
									target="_blank"
									on:click={closeMobileMenu}
									class="block text-base font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors px-2 py-2"
								>
									Writer
								</a>
							{/if}
							{#if user.role === 'admin'}
								<a
									href="/admin"
									on:click={closeMobileMenu}
									class="block text-base font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors px-2 py-2"
								>
									Admin
								</a>
							{/if}
							<form method="POST" action="/logout" data-sveltekit-preload-data="off" class="mt-3">
								<button
									type="submit"
									class="w-full rounded-[var(--radius)] bg-[hsl(var(--secondary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
								>
									Log out
								</button>
							</form>
						</div>
					{:else}
						<div class="pt-4 border-t border-[hsl(var(--border))] space-y-3">
							<button
								on:click={toggleTheme}
								class="w-full flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
							>
								{#if currentTheme === 'dark'}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
									</svg>
									<span>Dark Mode</span>
								{:else}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
									</svg>
									<span>Light Mode</span>
								{/if}
							</button>
							<a
								href="/login"
								on:click={closeMobileMenu}
								class="block text-center rounded-[var(--radius)] border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
							>
								Login
							</a>
							<a
								href="/signup"
								on:click={closeMobileMenu}
								class="block text-center rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
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
