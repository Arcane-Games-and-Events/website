<script>
	export let data;
</script>

<svelte:head>
	<title>Dashboard - Arcane Games and Events</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="border-b border-gray-700 pb-6">
		<h1 class="text-3xl font-bold text-gray-100">Dashboard</h1>
		<p class="mt-2 text-gray-400">
			Welcome back{data.user?.firstName ? `, ${data.user.firstName}` : ''}!
		</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<!-- Stat Card 1 -->
		<div
			class="rounded-[var(--radius)] border border-gray-700 bg-gray-950 p-6 shadow-sm"
		>
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-400">Account Type</h3>
				<svg
					class="h-5 w-5 text-gray-400"
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
			</div>
			<div class="mt-3">
				<p class="text-2xl font-bold text-gray-100 capitalize">
					{data.user?.role || 'Free'}
				</p>
			</div>
		</div>

		<!-- Stat Card 2 -->
		<div
			class="rounded-[var(--radius)] border border-gray-700 bg-gray-950 p-6 shadow-sm"
		>
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-400">Member Since</h3>
				<svg
					class="h-5 w-5 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<div class="mt-3">
				<p class="text-2xl font-bold text-gray-100">
					{#if data.user?.createdAt}
						{new Date(data.user.createdAt).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'short'
						})}
					{:else}
						N/A
					{/if}
				</p>
			</div>
		</div>

		<!-- Stat Card 3 -->
		<div
			class="rounded-[var(--radius)] border border-gray-700 bg-gray-950 p-6 shadow-sm"
		>
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-400">GEM ID</h3>
				<svg
					class="h-5 w-5 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
					/>
				</svg>
			</div>
			<div class="mt-3">
				<p class="text-2xl font-bold text-gray-100">
					{data.user?.gemId || 'Not set'}
				</p>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="rounded-[var(--radius)] border border-gray-700 bg-gray-950 p-6">
		<h2 class="mb-4 text-xl font-semibold text-gray-100">Quick Actions</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<a
				href="/read"
				class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-950 p-4 transition-colors hover:bg-gray-800"
			>
				<svg
					class="h-6 w-6 text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
				<div>
					<h3 class="font-medium text-gray-100">Browse Articles</h3>
					<p class="text-sm text-gray-400">Read the latest content</p>
				</div>
			</a>

			<a
				href="/play"
				class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-950 p-4 transition-colors hover:bg-gray-800"
			>
				<svg
					class="h-6 w-6 text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<div>
					<h3 class="font-medium text-gray-100">Find Events</h3>
					<p class="text-sm text-gray-400">Browse upcoming tournaments</p>
				</div>
			</a>

			<a
				href="/account"
				class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-950 p-4 transition-colors hover:bg-gray-800"
			>
				<svg
					class="h-6 w-6 text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
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
				<div>
					<h3 class="font-medium text-gray-100">Account Settings</h3>
					<p class="text-sm text-gray-400">Manage your profile</p>
				</div>
			</a>

			{#if data.user?.role === 'free'}
				<a
					href="/premium"
					class="flex items-center gap-3 rounded-lg border border-gray-700 bg-gradient-to-r from-blue-500/10 to-transparent p-4 transition-colors hover:bg-gray-800"
				>
					<svg
						class="h-6 w-6 text-blue-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
						/>
					</svg>
					<div>
						<h3 class="font-medium text-blue-500">Upgrade to Premium</h3>
						<p class="text-sm text-gray-400">
							Get access to exclusive content
						</p>
					</div>
				</a>
			{/if}
		</div>
	</div>

	<!-- Recent Activity Placeholder -->
	<div class="rounded-[var(--radius)] border border-gray-700 bg-gray-950 p-6">
		<h2 class="mb-4 text-xl font-semibold text-gray-100">Recent Activity</h2>
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<svg
				class="mb-4 h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
				/>
			</svg>
			<p class="text-gray-400">No recent activity to display</p>
			<p class="mt-1 text-sm text-gray-400">
				Your activity will appear here once you start interacting with the platform
			</p>
		</div>
	</div>
</div>
