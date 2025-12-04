<script>
	let { currentPage = '', sidebarOpen = false, onClose = () => {} } = $props();

	const navItems = [
		{ id: 'overview', name: 'Overview', icon: 'home', href: '/admin?tab=overview' },
		{ id: 'orders', name: 'Orders', icon: 'receipt', href: '/admin?tab=orders' },
		{ id: 'users', name: 'Users', icon: 'user', href: '/admin?tab=users' },
		{ id: 'events', name: 'Events', icon: 'ticket', href: '/admin?tab=events' },
		{ id: 'staff', name: 'Staff', icon: 'users', href: '/admin?tab=staff' },
		{ id: 'players', name: 'Standings', icon: 'trophy', href: '/admin?tab=players' },
		{ id: 'seasons', name: 'Calendar', icon: 'calendar-days', href: '/admin?tab=seasons' },
		{ id: 'import-matches', name: 'Import Matches', icon: 'upload', href: '/admin/import-matches' }
	];
</script>

<!-- Overlay for mobile -->
{#if sidebarOpen}
	<div
		class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="button"
		tabindex="0"
		aria-label="Close sidebar"
	></div>
{/if}

<!-- Sidebar Navigation -->
<aside
	class="fixed top-0 left-0 z-50 h-screen w-64 border-r border-gray-800 bg-gray-900/95 backdrop-blur-sm transition-transform duration-300 ease-in-out lg:translate-x-0 {sidebarOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
>
	<!-- Logo/Brand -->
	<div class="flex h-16 items-center justify-between border-b border-gray-800 px-4 lg:px-6">
		<a href="/admin" class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20"
			>
				<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</div>
			<div>
				<h2 class="font-bold text-white">Admin Panel</h2>
				<p class="text-xs text-gray-400">AGE</p>
			</div>
		</a>
		<!-- Close button for mobile -->
		<button
			onclick={onClose}
			class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-white lg:hidden"
			aria-label="Close menu"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Back to Site -->
	<div class="mt-4 px-3">
		<a
			href="/"
			class="flex items-center gap-2 rounded-lg border border-gray-800 px-4 py-2 text-sm text-gray-400 transition-colors hover:border-gray-700 hover:bg-gray-800/50 hover:text-white"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
			</svg>
			Back to Site
		</a>
	</div>

	<!-- Navigation -->
	<nav class="mt-4 space-y-1 px-3">
		{#each navItems as item}
			<a
				href={item.href}
				class="group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 {currentPage === item.id
					? 'border border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/5'
					: 'border border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'}"
			>
				{#if item.icon === 'home'}
					<svg
						class="h-5 w-5 {currentPage === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
						/>
					</svg>
				{:else if item.icon === 'ticket'}
					<svg
						class="h-5 w-5 {currentPage === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
						/>
					</svg>
				{:else if item.icon === 'calendar-days'}
					<svg
						class="h-5 w-5 {currentPage === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
						/>
					</svg>
				{:else if item.icon === 'receipt'}
					<svg
						class="h-5 w-5 {currentPage === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
						/>
					</svg>
				{:else if item.icon === 'users'}
					<svg
						class="h-5 w-5 {currentPage === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
				{:else if item.icon === 'user'}
					<svg
						class="h-5 w-5 {currentPage === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
				{:else if item.icon === 'trophy'}
					<svg
						class="h-5 w-5 {currentPage === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 15l-2 5h4l-2-5zm0 0V9m-4 6H4a1 1 0 01-1-1V6a1 1 0 011-1h4m8 9h4a1 1 0 001-1V6a1 1 0 00-1-1h-4m-8 0V4a2 2 0 012-2h4a2 2 0 012 2v1m-8 0h8"
						/>
					</svg>
				{:else if item.icon === 'upload'}
					<svg
						class="h-5 w-5 {currentPage === item.id ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
						/>
					</svg>
				{/if}
				{item.name}
			</a>
		{/each}
	</nav>

</aside>
