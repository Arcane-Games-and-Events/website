<script>
	import { page } from '$app/stores';
	import { fade, fly } from 'svelte/transition';

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
		{ href: '/', label: 'Home', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
		{ href: '/articles', label: 'Articles', icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z' },
		{ href: '/age-open', label: 'AGE Open', icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0' },
		{ href: '/academy', label: 'Academy', icon: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5' },
		{ href: '/live', label: 'AGE Live', icon: 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z' }
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
<header class="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-gray-950/80 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<!-- Desktop Header -->
		<div class="hidden h-16 items-center justify-between lg:flex">
			<!-- Left: Logo + Nav -->
			<div class="flex items-center gap-8">
				<!-- Logo -->
				<a href="/" class="flex-shrink-0">
					<img src="/logo.svg" alt="AGE" class="h-8 w-auto" />
				</a>

				<!-- Desktop Nav -->
				<nav class="flex items-center gap-1">
					{#each mainNavItems as item}
						<a
							href={item.href}
							class="rounded-lg px-3 py-2 text-sm font-medium transition-all
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
					<div class="relative">
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
					<div class="flex items-center gap-3">
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
			</div>
		</div>

		<!-- Mobile Header -->
		<div class="flex h-14 items-center justify-between lg:hidden">
			<!-- Left: Hamburger -->
			<button
				on:click={toggleMobile}
				class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
				aria-label="Toggle menu"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d={icons.menu} />
				</svg>
			</button>

			<!-- Center: Logo -->
			<a href="/" class="absolute left-1/2 -translate-x-1/2">
				<img src="/logo.svg" alt="AGE" class="h-7 w-auto" />
			</a>

			<!-- Right: User avatar or empty space for balance -->
			<div class="w-10">
				{#if user}
					<a href="/account" class="block">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white
							{isPremiumUser
								? 'bg-gradient-to-br from-emerald-400 to-green-600'
								: 'bg-gradient-to-br from-blue-500 to-purple-600'}"
						>
							{getUserInitials(user.firstName, user.lastName)}
						</div>
					</a>
				{/if}
			</div>
		</div>
	</div>
</header>

<!-- Spacer to account for fixed header -->
<div class="h-14 lg:h-16"></div>

<!-- Mobile Sidebar Overlay -->
{#if mobileOpen}
	<div
		class="fixed inset-0 z-50 lg:hidden"
		on:click={closeMobile}
		on:keydown={(e) => e.key === 'Escape' && closeMobile()}
		role="button"
		tabindex="0"
	>
		<!-- Backdrop -->
		<div
			transition:fade={{ duration: 200 }}
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
		></div>

		<!-- Sidebar -->
		<nav
			transition:fly={{ x: -280, duration: 250 }}
			class="absolute inset-y-0 left-0 flex w-72 flex-col bg-gray-950 shadow-2xl"
			on:click|stopPropagation
		>
			<!-- Sidebar Header -->
			<div class="flex h-16 items-center justify-between border-b border-white/10 px-5">
				<a href="/" on:click={closeMobile}>
					<img src="/logo.svg" alt="AGE" class="h-7 w-auto" />
				</a>
				<button
					on:click={closeMobile}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
					aria-label="Close menu"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d={icons.close} />
					</svg>
				</button>
			</div>

			<!-- Navigation Links -->
			<div class="flex-1 overflow-y-auto px-3 py-4">
				<div class="space-y-1">
					{#each mainNavItems as item}
						<a
							href={item.href}
							on:click={closeMobile}
							class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
							{checkActive(item.href, $page.url.pathname)
								? 'bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-white'
								: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
						>
							<svg class="h-5 w-5 {checkActive(item.href, $page.url.pathname) ? 'text-blue-400' : ''}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
							</svg>
							{item.label}
							{#if checkActive(item.href, $page.url.pathname)}
								<span class="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></span>
							{/if}
						</a>
					{/each}
				</div>

				{#if !user || !isPremiumUser}
					<div class="mt-4 px-1">
						<a
							href="/premium"
							on:click={closeMobile}
							class="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 px-4 py-3 text-sm font-medium text-emerald-400 transition-all hover:from-emerald-500/20 hover:to-green-500/20"
						>
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
							</svg>
							Upgrade to Premium
						</a>
					</div>
				{/if}

				{#if user}
					<div class="mt-6 border-t border-white/10 pt-4">
						<p class="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Account</p>
						<div class="space-y-1">
							<a href="/dashboard" on:click={closeMobile} class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.dashboard} />
								</svg>
								Dashboard
							</a>
							<a href="/account" on:click={closeMobile} class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.user} />
								</svg>
								Account Settings
							</a>
							{#if assignedEventsCount > 0}
								<a href="/my-age/events" on:click={closeMobile} class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">
									<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.clipboard} />
									</svg>
									My Events
									<span class="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">{assignedEventsCount}</span>
								</a>
							{/if}
							{#if user.role === 'admin'}
								<a href="/admin" on:click={closeMobile} class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">
									<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.admin} />
									</svg>
									Admin Panel
								</a>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Sidebar Footer -->
			<div class="border-t border-white/10 p-4">
				{#if user}
					<!-- User Info + Logout -->
					<div class="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white
							{isPremiumUser
								? 'bg-gradient-to-br from-emerald-400 to-green-600'
								: 'bg-gradient-to-br from-blue-500 to-purple-600'}"
						>
							{getUserInitials(user.firstName, user.lastName)}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
							<p class="truncate text-xs text-gray-400">{user.email}</p>
						</div>
					</div>
					<form method="POST" action="/logout">
						<button type="submit" class="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.logout} />
							</svg>
							Sign Out
						</button>
					</form>
				{:else}
					<!-- Login/Signup Buttons -->
					<div class="space-y-2">
						<a
							href="/login"
							on:click={closeMobile}
							class="block rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-white/10"
						>
							Login
						</a>
						<a
							href="/signup"
							on:click={closeMobile}
							class="block rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg shadow-blue-500/25"
						>
							Sign Up
						</a>
					</div>
				{/if}
			</div>
		</nav>
	</div>
{/if}

<!-- Page content -->
<slot />
