<script>
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';

	export let user;

	let sidebarOpen = false;
	let profileDropdownOpen = false;

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}

	function toggleProfileDropdown() {
		profileDropdownOpen = !profileDropdownOpen;
	}

	// Close dropdowns when clicking outside
	function handleClickOutside(event) {
		if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
			profileDropdownOpen = false;
		}
	}

	// Get user's teams where they are admin
	$: adminTeams = user?.teamMemberships?.filter((m) => m.role === 'admin') || [];

	// Reactive active states for each route
	$: isHomeActive = $page.url.pathname === '/';
	$: isReadActive = $page.url.pathname.startsWith('/read');
	$: isPlayActive = $page.url.pathname.startsWith('/play');
	$: isPremiumActive = $page.url.pathname.startsWith('/premium');
	$: isDashboardActive = $page.url.pathname.startsWith('/dashboard');
	$: isAdminActive = $page.url.pathname.startsWith('/admin');

	// Function for team links
	function isTeamActive(slug) {
		return $page.url.pathname.startsWith(`/teams/${slug}`);
	}

	// Get user initials
	function getUserInitials(firstName) {
		if (!firstName) return 'U';
		return firstName.charAt(0).toUpperCase();
	}
</script>

<svelte:window on:click={handleClickOutside} />

<!-- Mobile sidebar -->
{#if sidebarOpen}
	<div class="relative z-50 lg:hidden">
		<div
			class="fixed inset-0 bg-gray-900/80"
			transition:fade={{ duration: 300 }}
			on:click={closeSidebar}
			on:keydown={(e) => e.key === 'Escape' && closeSidebar()}
			role="button"
			tabindex="-1"
			aria-label="Close sidebar"
		></div>

		<div class="fixed inset-0 flex">
			<div
				class="relative mr-16 flex w-full max-w-xs flex-1"
				transition:fly={{ x: -300, duration: 300 }}
			>
				<div class="absolute top-0 left-full flex w-16 justify-center pt-5">
					<button type="button" class="-m-2.5 p-2.5" on:click={closeSidebar}>
						<span class="sr-only">Close sidebar</span>
						<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<!-- Sidebar component -->
				<div
					class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 ring-1 ring-white/10 dark:bg-gray-900"
				>
					<div class="flex h-16 shrink-0 items-center justify-center">
						<a href="/" class="text-xl font-bold text-gray-900 dark:text-white">Arcane Events</a>
					</div>
					<nav class="flex flex-1 flex-col">
						<ul role="list" class="flex flex-1 flex-col gap-y-7">
							<li>
								<ul role="list" class="-mx-6 space-y-1">
									<li>
										<a
											href="/"
											class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isHomeActive
												? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
												: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
											on:click={closeSidebar}
										>
											<svg
												class="h-6 w-6 shrink-0 {isHomeActive
													? 'text-indigo-600 dark:text-white'
													: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
												/>
											</svg>
											Home
										</a>
									</li>
									<li>
										<a
											href="/read"
											class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isReadActive
												? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
												: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
											on:click={closeSidebar}
										>
											<svg
												class="h-6 w-6 shrink-0 {isReadActive
													? 'text-indigo-600 dark:text-white'
													: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
												/>
											</svg>
											Read
										</a>
									</li>
									<li>
										<a
											href="/play"
											class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isPlayActive
												? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
												: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
											on:click={closeSidebar}
										>
											<svg
												class="h-6 w-6 shrink-0 {isPlayActive
													? 'text-indigo-600 dark:text-white'
													: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
												/>
											</svg>
											Play
										</a>
									</li>
									<!-- Only show Premium link for free users -->
									{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
										<li>
											<a
												href="/premium"
												class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isPremiumActive
													? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
													: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
												on:click={closeSidebar}
											>
												<svg
													class="h-6 w-6 shrink-0 {isPremiumActive
														? 'text-indigo-600 dark:text-white'
														: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
													fill="none"
													stroke="currentColor"
													stroke-width="1.5"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
													/>
												</svg>
												Premium
											</a>
										</li>
									{/if}
								</ul>
							</li>
							<!-- My AGE section (only show when logged in) -->
							{#if user}
								<li>
									<div class="px-2 text-xs/6 font-semibold text-gray-400">My AGE</div>
									<ul role="list" class="-mx-6 mt-2 space-y-1">
										<li>
											<a
												href="/dashboard"
												class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isDashboardActive
													? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
													: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
												on:click={closeSidebar}
											>
												<svg
													class="h-6 w-6 shrink-0 {isDashboardActive
														? 'text-indigo-600 dark:text-white'
														: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
													fill="none"
													stroke="currentColor"
													stroke-width="1.5"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
													/>
												</svg>
												Dashboard
											</a>
										</li>
										<!-- Only show Admin link for admin users -->
										{#if user?.role === 'admin'}
											<li>
												<a
													href="/admin"
													class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isAdminActive
														? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
														: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
													on:click={closeSidebar}
												>
													<svg
														class="h-6 w-6 shrink-0 {isAdminActive
															? 'text-indigo-600 dark:text-white'
															: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
														fill="none"
														stroke="currentColor"
														stroke-width="1.5"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
														/>
													</svg>
													Admin
												</a>
											</li>
										{/if}
									</ul>
								</li>
							{/if}
							{#if adminTeams.length > 0}
								<li>
									<div class="px-8 text-xs/6 font-semibold text-gray-400">Your teams</div>
									<ul role="list" class="-mx-6 mt-2 space-y-1">
										{#each adminTeams as membership}
											<li>
												<a
													href="/teams/{membership.team.slug}"
													class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isTeamActive(
														membership.team.slug
													)
														? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
														: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
													on:click={closeSidebar}
												>
													<span
														class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium {isTeamActive(
															membership.team.slug
														)
															? 'border-indigo-600 bg-white text-indigo-600 dark:border-white/20 dark:bg-white/5 dark:text-white'
															: 'border-gray-200 bg-white text-gray-400 group-hover:border-indigo-600 group-hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:group-hover:border-white/20 dark:group-hover:text-white'}"
													>
														{membership.team.name
															.split(' ')
															.map((w) => w[0])
															.join('')
															.slice(0, 2)
															.toUpperCase()}
													</span>
													<span class="truncate">{membership.team.name}</span>
												</a>
											</li>
										{/each}
									</ul>
								</li>
							{/if}
							<li class="mt-auto">
								<!-- AGE Premium CTA (only for free users) -->
								{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
									<div
										class="relative -mx-2 mb-4 overflow-hidden rounded-lg bg-gradient-to-r from-gray-900 to-gray-800"
									>
										<div
											class="absolute inset-0 bg-gradient-to-r from-[hsl(var(--secondary))]/20 to-transparent"
										></div>
										<div class="relative p-4">
											<h3 class="mb-2 text-lg font-bold text-white">
												Join AGE<br />Premium
											</h3>
											<p class="mb-3 text-xs text-gray-300">Discover the best content anywhere.</p>
											<a
												href="/premium"
												class="block rounded-lg bg-[hsl(var(--secondary))] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--secondary))]/90"
												on:click={closeSidebar}
											>
												Join Now
											</a>
										</div>
									</div>
								{/if}
							</li>
						</ul>
					</nav>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Static sidebar for desktop -->
<div class="hidden bg-gray-900 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
	<div
		class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:border-white/10 dark:bg-black/10"
	>
		<div class="flex h-16 shrink-0 items-center justify-center">
			<a href="/" class="text-xl font-bold text-gray-900 dark:text-white">Arcane Events</a>
		</div>
		<nav class="flex flex-1 flex-col">
			<ul role="list" class="flex flex-1 flex-col gap-y-7">
				<li>
					<ul role="list" class="-mx-6 space-y-1">
						<li>
							<a
								href="/"
								class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isHomeActive
									? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
									: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
							>
								<svg
									class="h-6 w-6 shrink-0 {isHomeActive
										? 'text-indigo-600 dark:text-white'
										: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
									/>
								</svg>
								Home
							</a>
						</li>
						<li>
							<a
								href="/read"
								class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isReadActive
									? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
									: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
							>
								<svg
									class="h-6 w-6 shrink-0 {isReadActive
										? 'text-indigo-600 dark:text-white'
										: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
									/>
								</svg>
								Read
							</a>
						</li>
						<li>
							<a
								href="/play"
								class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isPlayActive
									? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
									: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
							>
								<svg
									class="h-6 w-6 shrink-0 {isPlayActive
										? 'text-indigo-600 dark:text-white'
										: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
									/>
								</svg>
								Play
							</a>
						</li>
						<!-- Only show Premium link for free users -->
						{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
							<li>
								<a
									href="/premium"
									class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isPremiumActive
										? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
										: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
								>
									<svg
										class="h-6 w-6 shrink-0 {isPremiumActive
											? 'text-indigo-600 dark:text-white'
											: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
										/>
									</svg>
									Premium
								</a>
							</li>
						{/if}
					</ul>
				</li>
				<!-- My AGE section (only show when logged in) -->
				{#if user}
					<li>
						<div class="px-2 text-xs/6 font-semibold text-gray-400">My AGE</div>
						<ul role="list" class="-mx-6 mt-2 space-y-1">
							<li>
								<a
									href="/dashboard"
									class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isDashboardActive
										? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
										: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
								>
									<svg
										class="h-6 w-6 shrink-0 {isDashboardActive
											? 'text-indigo-600 dark:text-white'
											: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
										/>
									</svg>
									Dashboard
								</a>
							</li>
							<!-- Only show Admin link for admin users -->
							{#if user?.role === 'admin'}
								<li>
									<a
										href="/admin"
										class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isAdminActive
											? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
											: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
									>
										<svg
											class="h-6 w-6 shrink-0 {isAdminActive
												? 'text-indigo-600 dark:text-white'
												: 'text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white'}"
											fill="none"
											stroke="currentColor"
											stroke-width="1.5"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
											/>
										</svg>
										Admin
									</a>
								</li>
							{/if}
						</ul>
					</li>
				{/if}
				{#if adminTeams.length > 0}
					<li>
						<div class="px-8 text-xs/6 font-semibold text-gray-400">Your teams</div>
						<ul role="list" class="-mx-6 mt-2 space-y-1">
							{#each adminTeams as membership}
								<li>
									<a
										href="/teams/{membership.team.slug}"
										class="group relative flex gap-x-3 px-8 py-2 text-sm/6 font-semibold {isTeamActive(
											membership.team.slug
										)
											? 'bg-gray-50 text-indigo-600 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[hsl(var(--secondary))] dark:bg-white/5 dark:text-white'
											: 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}"
									>
										<span
											class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium {isTeamActive(
												membership.team.slug
											)
												? 'border-indigo-600 bg-white text-indigo-600 dark:border-white/20 dark:bg-white/5 dark:text-white'
												: 'border-gray-200 bg-white text-gray-400 group-hover:border-indigo-600 group-hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:group-hover:border-white/20 dark:group-hover:text-white'}"
										>
											{membership.team.name
												.split(' ')
												.map((w) => w[0])
												.join('')
												.slice(0, 2)
												.toUpperCase()}
										</span>
										<span class="truncate">{membership.team.name}</span>
									</a>
								</li>
							{/each}
						</ul>
					</li>
				{/if}
				<li class="mt-auto">
					<!-- AGE Premium CTA (only for free users) -->
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<div
							class="relative -mx-2 mb-4 overflow-hidden rounded-lg bg-gradient-to-r from-gray-900 to-gray-800"
						>
							<div
								class="absolute inset-0 bg-gradient-to-r from-[hsl(var(--secondary))]/20 to-transparent"
							></div>
							<div class="relative p-4">
								<h3 class="mb-2 text-lg font-bold text-white">
									Join AGE<br />Premium
								</h3>
								<p class="mb-3 text-xs text-gray-300">Discover the best content anywhere.</p>
								<a
									href="/premium"
									class="block rounded-lg bg-[hsl(var(--secondary))] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--secondary))]/90"
								>
									Join Now
								</a>
							</div>
						</div>
					{/if}
				</li>
			</ul>
		</nav>
	</div>
</div>

<div class="lg:pl-72">
	<div
		class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-gray-900 dark:shadow-none"
	>
		<button
			type="button"
			class="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden dark:text-gray-400 dark:hover:text-white"
			on:click={toggleSidebar}
		>
			<span class="sr-only">Open sidebar</span>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
				/>
			</svg>
		</button>

		<!-- Separator -->
		<div class="h-6 w-px bg-gray-200 lg:hidden dark:bg-white/10" aria-hidden="true"></div>

		<div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
			<form action="#" method="GET" class="relative flex flex-1">
				<svg
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
					class="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
				>
					<path
						fill-rule="evenodd"
						d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
						clip-rule="evenodd"
					/>
				</svg>
				<input
					name="search"
					placeholder="Search..."
					type="search"
					aria-label="Search"
					class="block h-full w-full border-0 bg-transparent pr-0 pl-8 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm dark:text-white dark:placeholder:text-gray-500"
				/>
			</form>
			<div class="flex items-center gap-x-4 lg:gap-x-6">
				{#if user}
					<button
						type="button"
						class="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-white"
					>
						<span class="sr-only">View notifications</span>
						<svg
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
							/>
						</svg>
					</button>

					<!-- Separator -->
					<div
						class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-white/10"
						aria-hidden="true"
					></div>

					<!-- Profile dropdown -->
					<div class="profile-dropdown relative">
						<button type="button" class="flex items-center" on:click={toggleProfileDropdown}>
							<span class="sr-only">Open user menu</span>
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--secondary))] font-semibold text-white"
							>
								{getUserInitials(user?.firstName)}
							</div>
							<span class="hidden lg:flex lg:items-center">
								<span class="ml-4 text-sm/6 font-semibold text-gray-900 dark:text-white">
									{user?.firstName && user?.lastName
										? `${user.firstName} ${user.lastName}`
										: 'Guest'}
								</span>
								<svg
									class="ml-2 h-5 w-5 text-gray-400 dark:text-gray-500"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
										clip-rule="evenodd"
									/>
								</svg>
							</span>
						</button>
						{#if profileDropdownOpen}
							<div
								class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg outline outline-1 -outline-offset-1 outline-gray-900/5 dark:bg-gray-800 dark:shadow-none dark:outline-white/10"
								transition:fly={{ y: -10, duration: 200 }}
							>
								<a
									href="/account"
									class="block px-3 py-1 text-sm/6 text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
									>Account</a
								>
								<form method="POST" action="/logout">
									<button
										type="submit"
										class="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
										>Logout</button
									>
								</form>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Auth buttons when not logged in -->
					<div class="flex items-center gap-3">
						<a
							href="/login"
							class="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
						>
							Login
						</a>
						<a
							href="/signup"
							class="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
						>
							Sign Up
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Main content -->
	<slot />
</div>
