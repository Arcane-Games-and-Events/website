<script>
	let { currentPage = '', sidebarOpen = false, onClose = () => {} } = $props();

	const navItems = [
		{
			id: 'analytics',
			name: 'Analytics',
			icon: 'chart-bar',
			href: '/admin/analytics',
			color: 'indigo'
		},
		{
			id: 'content-analytics',
			name: 'Content',
			icon: 'document-text',
			href: '/admin/content-analytics',
			color: 'teal'
		},
		{ id: 'orders', name: 'Orders', icon: 'receipt', href: '/admin/orders', color: 'emerald' },
		{ id: 'users', name: 'Users', icon: 'user', href: '/admin/users', color: 'purple' },
		{ id: 'events', name: 'Events', icon: 'ticket', href: '/admin/events', color: 'cyan' },
		{ id: 'players', name: 'Standings', icon: 'trophy', href: '/admin/players', color: 'rose' },
		{
			id: 'calendar',
			name: 'Calendar',
			icon: 'calendar-days',
			href: '/admin/calendar',
			color: 'amber'
		},
		{
			id: 'podcasts',
			name: 'Podcasts',
			icon: 'microphone',
			href: '/admin/podcasts',
			color: 'fuchsia'
		},
		{
			id: 'vods',
			name: 'VODs',
			icon: 'video',
			href: '/admin/vods',
			color: 'red'
		},
		{ id: 'cards', name: 'Cards', icon: 'cards', href: '/admin/cards', color: 'orange' }
	];

	function getActiveColor(color) {
		const colors = {
			blue: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
			emerald: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
			purple: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
			cyan: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400',
			rose: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
			indigo: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400',
			teal: 'bg-teal-500/15 border-teal-500/40 text-teal-400',
			amber: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
			orange: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
			fuchsia: 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-400',
			red: 'bg-red-500/15 border-red-500/40 text-red-400'
		};
		return colors[color] || colors.blue;
	}

	function getIconColor(color, isActive) {
		if (!isActive) return 'text-gray-500';
		const colors = {
			blue: 'text-blue-400',
			emerald: 'text-emerald-400',
			purple: 'text-purple-400',
			cyan: 'text-cyan-400',
			rose: 'text-rose-400',
			indigo: 'text-indigo-400',
			teal: 'text-teal-400',
			amber: 'text-amber-400',
			orange: 'text-orange-400',
			fuchsia: 'text-fuchsia-400',
			red: 'text-red-400'
		};
		return colors[color] || colors.blue;
	}
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
	class="fixed top-0 left-0 z-50 h-screen w-64 border-r border-white/5 bg-gray-900/98 backdrop-blur-sm transition-transform duration-300 ease-in-out lg:translate-x-0 {sidebarOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
>
	<!-- Logo/Brand -->
	<div class="flex h-16 items-center justify-between border-b border-white/5 px-4 lg:px-6">
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
				<p class="text-xs text-gray-500">AGE</p>
			</div>
		</a>
		<!-- Close button for mobile -->
		<button
			onclick={onClose}
			class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
			aria-label="Close menu"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<!-- Back to Site -->
	<div class="mt-4 px-3">
		<a
			href="/"
			class="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm text-gray-400 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			Back to Site
		</a>
	</div>

	<!-- Navigation -->
	<nav class="mt-6 space-y-1 px-3">
		{#each navItems as item}
			{@const isActive = currentPage === item.id}
			<a
				href={item.href}
				onclick={onClose}
				class="group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200
				{isActive
					? getActiveColor(item.color) + ' shadow-lg'
					: 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'}"
			>
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors
					{isActive ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'}"
				>
					{#if item.icon === 'chart-bar'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
							/>
						</svg>
					{:else if item.icon === 'document-text'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					{:else if item.icon === 'receipt'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
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
					{:else if item.icon === 'user'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
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
					{:else if item.icon === 'ticket'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
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
					{:else if item.icon === 'users'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
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
					{:else if item.icon === 'trophy'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
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
					{:else if item.icon === 'calendar-days'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
							/>
						</svg>
					{:else if item.icon === 'microphone'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
							/>
						</svg>
					{:else if item.icon === 'video'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
							/>
						</svg>
					{:else if item.icon === 'cards'}
						<svg
							class="h-4 w-4 {getIconColor(item.color, isActive)}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
					{/if}
				</div>
				{item.name}
			</a>
		{/each}
	</nav>
</aside>
