<script>
	export let data;
</script>

<svelte:head>
	<title>Dashboard - AGE</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header (full width) -->
	<div
		class="relative overflow-hidden border-b border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 p-6 lg:p-8"
	>
		<div
			class="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5"
		></div>
		<div class="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl"></div>
		<div
			class="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl"
		></div>
		<div class="relative">
			<h1 class="text-2xl font-bold text-gray-100 lg:text-3xl">
				Welcome back{data.user?.firstName ? `, ${data.user.firstName}` : ''}!
			</h1>
			<p class="mt-2 text-gray-400">Here's an overview of your account</p>
		</div>
	</div>

	<!-- Content with padding -->
	<div class="space-y-8 px-4 pb-8 lg:px-8">
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
			<!-- Account Type Card -->
			<div
				class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
			>
				<div
					class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				></div>
				<div class="relative">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium text-gray-400">Account Type</h3>
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
							<svg
								class="h-5 w-5 text-blue-400"
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
					</div>
					<div class="mt-4">
						<p class="text-2xl font-bold text-gray-100 capitalize">
							{data.user?.role || 'Free'}
						</p>
						<p class="mt-1 text-xs text-gray-500">Your membership tier</p>
					</div>
				</div>
			</div>

			<!-- Member Since Card -->
			<div
				class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
			>
				<div
					class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				></div>
				<div class="relative">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium text-gray-400">Member Since</h3>
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
							<svg
								class="h-5 w-5 text-purple-400"
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
					</div>
					<div class="mt-4">
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
						<p class="mt-1 text-xs text-gray-500">Account created</p>
					</div>
				</div>
			</div>

			<!-- GEM ID Card -->
			<div
				class="group relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
			>
				<div
					class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				></div>
				<div class="relative">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium text-gray-400">GEM ID</h3>
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
							<svg
								class="h-5 w-5 text-cyan-400"
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
					</div>
					<div class="mt-4">
						<p class="font-mono text-2xl font-bold text-gray-100">
							{data.user?.gemId || 'Not set'}
						</p>
						<p class="mt-1 text-xs text-gray-500">Your unique identifier</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6">
			<div class="mb-6 flex items-center gap-3">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500"
				>
					<svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<h2 class="text-xl font-semibold text-gray-100">Quick Actions</h2>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<!-- Browse Articles -->
				<a
					href="/articles"
					class="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all duration-300 hover:border-amber-500/50 hover:bg-gray-800/50"
				>
					<div
						class="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div
						class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<svg
							class="h-6 w-6 text-amber-400"
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
					</div>
					<div class="relative">
						<h3
							class="font-semibold text-gray-100 transition-colors duration-300 group-hover:text-amber-400"
						>
							Browse Articles
						</h3>
						<p class="text-sm text-gray-400">Read the latest content</p>
					</div>
					<svg
						class="absolute right-4 h-5 w-5 text-gray-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-400 group-hover:opacity-100"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</a>

				<!-- Find Events -->
				<a
					href="/age-open"
					class="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all duration-300 hover:border-green-500/50 hover:bg-gray-800/50"
				>
					<div
						class="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div
						class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<svg
							class="h-6 w-6 text-green-400"
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
					<div class="relative">
						<h3
							class="font-semibold text-gray-100 transition-colors duration-300 group-hover:text-green-400"
						>
							Find Events
						</h3>
						<p class="text-sm text-gray-400">Browse upcoming tournaments</p>
					</div>
					<svg
						class="absolute right-4 h-5 w-5 text-gray-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-green-400 group-hover:opacity-100"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</a>

				<!-- Account Settings -->
				<a
					href="/account"
					class="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all duration-300 hover:border-gray-500/50 hover:bg-gray-800/50"
				>
					<div
						class="absolute inset-0 bg-gradient-to-r from-gray-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div
						class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<svg
							class="h-6 w-6 text-gray-400"
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
					</div>
					<div class="relative">
						<h3
							class="font-semibold text-gray-100 transition-colors duration-300 group-hover:text-gray-300"
						>
							Account Settings
						</h3>
						<p class="text-sm text-gray-400">Manage your profile</p>
					</div>
					<svg
						class="absolute right-4 h-5 w-5 text-gray-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-gray-400 group-hover:opacity-100"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</a>

				<!-- Upgrade to Premium (conditional) -->
				{#if data.user?.role === 'free'}
					<a
						href="/premium"
						class="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 p-4 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20"
					>
						<div
							class="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
						></div>
						<div
							class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 transition-transform duration-300 group-hover:scale-110"
						>
							<svg
								class="h-6 w-6 text-blue-400"
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
						</div>
						<div class="relative">
							<h3
								class="font-semibold text-blue-400 transition-colors duration-300 group-hover:text-blue-300"
							>
								Upgrade to Premium
							</h3>
							<p class="text-sm text-gray-400">Get access to exclusive content</p>
						</div>
						<svg
							class="absolute right-4 h-5 w-5 text-blue-500/50 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-blue-400 group-hover:opacity-100"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</a>
				{/if}
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6">
			<div class="mb-6 flex items-center gap-3">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"
				>
					<svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h2 class="text-xl font-semibold text-gray-100">Recent Activity</h2>
			</div>
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 bg-gray-900/30 py-12 text-center"
			>
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/50">
					<svg class="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
				</div>
				<p class="text-gray-400">No recent activity to display</p>
				<p class="mt-2 max-w-sm text-sm text-gray-500">
					Your activity will appear here once you start interacting with the platform
				</p>
			</div>
		</div>
	</div>
</div>
