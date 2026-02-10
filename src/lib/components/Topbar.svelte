<script>
	import { page } from '$app/stores';
	import { fade, slide } from 'svelte/transition';

	export let user;
	export let assignedEventsCount = 0;

	let mobileOpen = false;
	let userMenuOpen = false;

	function toggleMobile() {
		mobileOpen = !mobileOpen;
	}

	function closeMobile() {
		mobileOpen = false;
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	function closeUserMenu() {
		userMenuOpen = false;
	}

	// Navigation items
	const mainNavItems = [
		{ href: '/', label: 'Home' },
		{ href: '/articles', label: 'Articles' },
		{ href: '/age-open', label: 'AGE Open' },
		{ href: '/academy', label: 'Academy' },
		{ href: '/live', label: 'AGE Live' }
	];

	// Reactive active check
	function checkActive(href, pathname) {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}

	// Get user initials
	function getUserInitials(firstName, lastName) {
		if (!firstName) return 'U';
		if (lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
		return firstName.charAt(0).toUpperCase();
	}

	// Icon paths
	const icons = {
		menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
		close: 'M6 18 18 6M6 6l12 12',
		chevronDown: 'm19.5 8.25-7.5 7.5-7.5-7.5',
		dashboard: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
		user: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
		admin: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
		logout: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9',
		boltSolid: 'M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z',
		clipboard: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z'
	};

	$: isPremiumUser = user?.role === 'premium' || user?.role === 'admin';
</script>

<svelte:window on:click={() => userMenuOpen && closeUserMenu()} />

<!-- Top Navigation Bar -->
<header class="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-2xl">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Left: Logo + Nav -->
			<div class="flex items-center gap-8">
				<!-- Logo -->
				<a href="/" class="flex-shrink-0">
					<img src="/logo.svg" alt="AGE" class="h-8 w-auto" />
				</a>

				<!-- Desktop Nav -->
				<nav class="hidden lg:flex lg:items-center lg:gap-1">
					{#each mainNavItems as item}
						<a
							href={item.href}
							class="rounded-lg px-3 py-2 text-sm font-medium transition-colors
							{checkActive(item.href, $page.url.pathname)
								? 'bg-white/10 text-white'
								: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
						>
							{item.label}
						</a>
					{/each}
					{#if !user || !isPremiumUser}
						<a
							href="/premium"
							class="ml-2 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition-all hover:from-emerald-500/20 hover:to-green-500/20"
						>
							<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
								<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
							</svg>
							Premium
						</a>
					{/if}
				</nav>
			</div>

			<!-- Right: User Section -->
			<div class="flex items-center gap-4">
				{#if user}
					<!-- User Dropdown -->
					<div class="relative hidden lg:block">
						<button
							on:click|stopPropagation={toggleUserMenu}
							class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
						>
							<div class="relative">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white
									{isPremiumUser
										? 'bg-gradient-to-br from-emerald-400 to-green-600'
										: 'bg-gradient-to-br from-blue-500 to-purple-600'}"
								>
									{getUserInitials(user.firstName, user.lastName)}
								</div>
								{#if isPremiumUser}
									<div class="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500">
										<svg class="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 24 24">
											<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
										</svg>
									</div>
								{/if}
							</div>
							<span class="max-w-[120px] truncate">
								{user.firstName || 'User'}
							</span>
							<svg class="h-4 w-4 transition-transform {userMenuOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronDown} />
							</svg>
						</button>

						<!-- Dropdown Menu -->
						{#if userMenuOpen}
							<div
								transition:fade={{ duration: 150 }}
								class="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-white/10 bg-gray-900 p-2 shadow-xl"
								on:click|stopPropagation
							>
								<div class="border-b border-white/10 px-3 py-2 mb-2">
									<p class="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
									<p class="text-xs text-gray-400 truncate">{user.email}</p>
								</div>

								<a href="/dashboard" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.dashboard} />
									</svg>
									Dashboard
								</a>

								<a href="/account" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.user} />
									</svg>
									Account
								</a>

								{#if assignedEventsCount > 0}
									<a href="/my-age/events" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.clipboard} />
										</svg>
										My Events
										<span class="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">{assignedEventsCount}</span>
									</a>
								{/if}

								{#if user.role === 'admin'}
									<a href="/admin" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.admin} />
										</svg>
										Admin
									</a>
								{/if}

								<div class="my-2 border-t border-white/10"></div>

								<form method="POST" action="/logout">
									<button type="submit" class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.logout} />
										</svg>
										Logout
									</button>
								</form>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Login/Signup -->
					<div class="hidden items-center gap-3 lg:flex">
						<a
							href="/login"
							class="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
						>
							Login
						</a>
						<a
							href="/signup"
							class="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-400 hover:to-purple-500"
						>
							Sign Up
						</a>
					</div>
				{/if}

				<!-- Mobile menu button -->
				<button
					on:click={toggleMobile}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
					aria-label="Toggle menu"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d={mobileOpen ? icons.close : icons.menu} />
					</svg>
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile Menu -->
	{#if mobileOpen}
		<div
			transition:slide={{ duration: 200 }}
			class="border-t border-white/10 bg-gray-900 lg:hidden"
		>
			<div class="space-y-1 px-4 py-4">
				{#each mainNavItems as item}
					<a
						href={item.href}
						on:click={closeMobile}
						class="block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
						{checkActive(item.href, $page.url.pathname)
							? 'bg-white/10 text-white'
							: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
					>
						{item.label}
					</a>
				{/each}

				{#if !user || !isPremiumUser}
					<a
						href="/premium"
						on:click={closeMobile}
						class="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 px-3 py-2.5 text-sm font-medium text-emerald-400"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
							<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
						</svg>
						Premium
					</a>
				{/if}

				{#if user}
					<div class="my-3 border-t border-white/10"></div>
					<a href="/dashboard" on:click={closeMobile} class="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Dashboard</a>
					<a href="/account" on:click={closeMobile} class="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Account</a>
					{#if user.role === 'admin'}
						<a href="/admin" on:click={closeMobile} class="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Admin</a>
					{/if}
					<div class="my-3 border-t border-white/10"></div>
					<form method="POST" action="/logout">
						<button type="submit" class="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-400 hover:bg-red-500/10">Logout</button>
					</form>
				{:else}
					<div class="my-3 border-t border-white/10"></div>
					<div class="flex gap-3">
						<a href="/login" on:click={closeMobile} class="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white">Login</a>
						<a href="/signup" on:click={closeMobile} class="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-center text-sm font-medium text-white">Sign Up</a>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</header>

<!-- Page content -->
<slot />
