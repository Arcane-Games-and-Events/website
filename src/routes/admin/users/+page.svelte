<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	// Search and filter state
	let userSearchQuery = $state('');
	let userSearchResults = $state(null); // Server-side search results
	let userSearchLoading = $state(false);
	let userSearchTimeout = $state(null);

	// Success/error banner state
	let successMessage = $state('');
	let errorMessage = $state('');

	// Auto-dismiss banners
	$effect(() => {
		if (form?.success) {
			successMessage = form.message || 'Action completed successfully';
			errorMessage = '';
			setTimeout(() => (successMessage = ''), 5000);
		}
		if (form?.error) {
			errorMessage = form.error;
			successMessage = '';
			setTimeout(() => (errorMessage = ''), 5000);
		}
	});

	// Filter users - use server results if available, otherwise filter locally
	let filteredUsers = $derived.by(() => {
		// If we have server search results, use those
		if (userSearchResults !== null) {
			return userSearchResults;
		}
		// Otherwise filter locally from loaded data
		const query = userSearchQuery.toLowerCase();
		if (!query) {
			return data.allUsers || [];
		}
		return (data.allUsers || []).filter(
			(user) =>
				user.email.toLowerCase().includes(query) ||
				(user.first_name && user.first_name.toLowerCase().includes(query)) ||
				(user.last_name && user.last_name.toLowerCase().includes(query))
		);
	});

	// Debounced server-side search for users
	async function searchUsersOnServer(query) {
		if (!query || query.length < 2) {
			userSearchResults = null; // Reset to local filtering
			return;
		}

		userSearchLoading = true;
		try {
			const formData = new FormData();
			formData.append('query', query);

			const response = await fetch('?/searchUsers', {
				method: 'POST',
				body: formData
			});

			const text = await response.text();
			const result = deserialize(text);

			if (result.type === 'success' && result.data?.results) {
				userSearchResults = result.data.results;
			} else if (result.type === 'failure') {
				console.error('Search action failed:', result.data?.error || 'Unknown error');
			} else {
				console.log('Search response:', result.type, result.data);
			}
		} catch (err) {
			console.error('Search error:', err);
		} finally {
			userSearchLoading = false;
		}
	}

	// Handle user search input with debounce
	function handleUserSearch(event) {
		const query = event.target.value;
		userSearchQuery = query;

		// Clear previous timeout
		if (userSearchTimeout) {
			clearTimeout(userSearchTimeout);
		}

		// Reset server results when clearing search
		if (!query || query.length < 2) {
			userSearchResults = null;
			return;
		}

		// Debounce server search (300ms)
		userSearchTimeout = setTimeout(() => {
			searchUsersOnServer(query);
		}, 300);
	}
</script>

<svelte:head>
	<title>Users - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<main>
			<!-- Success Banner -->
			{#if successMessage}
				<div class="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
					<div class="flex items-center gap-3">
						<svg
							class="h-5 w-5 text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<p class="text-sm text-green-400">{successMessage}</p>
						<button
							onclick={() => (successMessage = '')}
							class="ml-auto text-green-400 hover:text-green-300"
							aria-label="Dismiss success message"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
			{/if}

			<!-- Error Banner -->
			{#if errorMessage}
				<div class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
					<div class="flex items-center gap-3">
						<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p class="text-sm text-red-400">{errorMessage}</p>
						<button
							onclick={() => (errorMessage = '')}
							class="ml-auto text-red-400 hover:text-red-300"
							aria-label="Dismiss error message"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
			{/if}

			<!-- User Management -->
			<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
				<div
					class="flex items-center gap-3 border-b border-gray-800 bg-gray-800/30 px-4 py-3 sm:px-6 sm:py-4"
				>
					<div
						class="hidden h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 sm:flex"
					>
						<svg
							class="h-5 w-5 text-amber-400"
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
					<div>
						<h2 class="text-base font-semibold text-white sm:text-lg">User Management</h2>
						<p class="text-xs text-gray-400 sm:text-sm">
							{data.stats.totalUsers} registered users
						</p>
					</div>
				</div>

				<div class="p-4 sm:p-6">
					<!-- Search Bar -->
					<div class="mb-6">
						<div class="relative">
							<svg
								class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							<input
								id="user-search"
								type="text"
								value={userSearchQuery}
								oninput={handleUserSearch}
								placeholder="Search all users..."
								class="w-full rounded-xl border border-gray-700 bg-gray-800/50 py-3 pr-10 pl-10 text-base text-gray-100 placeholder-gray-500 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none sm:text-sm"
							/>
							{#if userSearchLoading}
								<div class="absolute top-1/2 right-3 -translate-y-1/2">
									<svg class="h-5 w-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
								</div>
							{/if}
						</div>
						{#if userSearchQuery.length >= 2 && userSearchResults !== null}
							<p class="mt-2 text-xs text-gray-500">
								Searching all {data.stats.totalUsers} users · Found {filteredUsers.length} result{filteredUsers.length !==
								1
									? 's'
									: ''}
							</p>
						{:else if userSearchQuery.length >= 2}
							<p class="mt-2 text-xs text-gray-500">
								Filtering from recent {(data.allUsers || []).length} users · Type to search all {data
									.stats.totalUsers}
							</p>
						{/if}
					</div>

					<!-- Users - Mobile Card View -->
					<div class="space-y-3 lg:hidden">
						{#each filteredUsers.slice(0, 20) as user}
							<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-4">
								<div class="flex items-start justify-between gap-3">
									<a href="/admin/customers/{user.id}" class="flex min-w-0 items-center gap-3">
										<div
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br {user.role ===
											'admin'
												? 'from-purple-500 to-violet-600'
												: user.role === 'premium'
													? 'from-blue-500 to-cyan-600'
													: user.role === 'tournament staff'
														? 'from-green-500 to-emerald-600'
														: 'from-gray-500 to-gray-600'} text-sm font-bold text-white"
										>
											{user.email.charAt(0).toUpperCase()}
										</div>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium text-white">{user.email}</p>
											<p class="text-xs text-gray-500">
												Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
												{#if user.id === data.user.id}
													<span class="text-blue-400"> (You)</span>
												{/if}
											</p>
										</div>
									</a>
									<span
										class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize
											{user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : ''}
											{user.role === 'premium' ? 'bg-blue-500/20 text-blue-400' : ''}
											{user.role === 'tournament staff' ? 'bg-green-500/20 text-green-400' : ''}
											{user.role === 'writer' ? 'bg-orange-500/20 text-orange-400' : ''}
											{user.role === 'free' ? 'bg-gray-700 text-gray-400' : ''}"
									>
										{user.role.replace('_', ' ')}
									</span>
								</div>
								<div class="mt-3 flex items-center gap-2 border-t border-gray-700 pt-3">
									{#if user.id !== data.user.id}
										<form
											method="POST"
											action="?/updateUserRole"
											use:enhance
											class="flex flex-1 items-center gap-2"
										>
											<input type="hidden" name="userId" value={user.id} />
											<select
												name="role"
												class="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-base text-gray-100 focus:border-blue-500 focus:outline-none sm:text-xs"
											>
												<option value="free" selected={user.role === 'free'}>Free</option>
												<option value="premium" selected={user.role === 'premium'}>Premium</option>
												<option value="writer" selected={user.role === 'writer'}>Writer</option>
												<option value="tournament staff" selected={user.role === 'tournament staff'}
													>Staff</option
												>
												<option value="admin" selected={user.role === 'admin'}>Admin</option>
											</select>
											<button
												type="submit"
												class="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white"
											>
												Update
											</button>
										</form>
									{:else}
										<span class="flex-1 text-xs text-gray-500">Current user</span>
									{/if}
									<a
										href="/admin/customers/{user.id}"
										class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300"
									>
										View
									</a>
								</div>
							</div>
						{:else}
							<div class="rounded-lg border border-gray-700 p-8 text-center">
								<p class="text-gray-400">No users found</p>
							</div>
						{/each}
						{#if filteredUsers.length > 20}
							<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-3 text-center">
								<p class="text-sm text-gray-400">
									Showing 20 of {filteredUsers.length}. Use search to find more.
								</p>
							</div>
						{/if}
					</div>

					<!-- Users - Desktop Table View -->
					<div class="hidden overflow-x-auto rounded-xl border border-gray-700 lg:block">
						<table class="w-full">
							<thead class="bg-gray-800/50">
								<tr>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>User</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Role</th
									>
									<th
										class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Joined</th
									>
									<th
										class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
										>Actions</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-800">
								{#each filteredUsers.slice(0, 20) as user}
									<tr class="group transition-colors hover:bg-gray-800/50">
										<td class="px-6 py-4">
											<a
												href="/admin/customers/{user.id}"
												class="flex items-center gap-3 hover:opacity-80"
											>
												<div
													class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br {user.role ===
													'admin'
														? 'from-purple-500 to-violet-600'
														: user.role === 'premium'
															? 'from-blue-500 to-cyan-600'
															: user.role === 'tournament staff'
																? 'from-green-500 to-emerald-600'
																: 'from-gray-500 to-gray-600'} text-sm font-bold text-white"
												>
													{user.email.charAt(0).toUpperCase()}
												</div>
												<div>
													<div class="text-sm font-medium text-white hover:text-blue-400">
														{user.email}
													</div>
													{#if user.id === data.user.id}
														<span class="text-xs text-blue-400">You</span>
													{/if}
												</div>
											</a>
										</td>
										<td class="px-6 py-4">
											<span
												class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize
													{user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : ''}
													{user.role === 'premium' ? 'bg-blue-500/20 text-blue-400' : ''}
													{user.role === 'tournament staff' ? 'bg-green-500/20 text-green-400' : ''}
													{user.role === 'writer' ? 'bg-orange-500/20 text-orange-400' : ''}
													{user.role === 'free' ? 'bg-gray-700 text-gray-400' : ''}"
											>
												{user.role.replace('_', ' ')}
											</span>
										</td>
										<td class="px-6 py-4 text-sm text-gray-500">
											{new Date(user.createdAt).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
										</td>
										<td class="px-6 py-4 text-right">
											<div class="flex items-center justify-end gap-3">
												{#if user.id !== data.user.id}
													<form
														method="POST"
														action="?/updateUserRole"
														use:enhance
														class="inline-flex items-center gap-2"
													>
														<input type="hidden" name="userId" value={user.id} />
														<select
															name="role"
															class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-100 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
														>
															<option value="free" selected={user.role === 'free'}>Free</option>
															<option value="premium" selected={user.role === 'premium'}
																>Premium</option
															>
															<option value="writer" selected={user.role === 'writer'}
																>Writer</option
															>
															<option
																value="tournament staff"
																selected={user.role === 'tournament staff'}>Tournament Staff</option
															>
															<option value="admin" selected={user.role === 'admin'}>Admin</option>
														</select>
														<button
															type="submit"
															class="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-600"
														>
															Update
														</button>
													</form>
												{:else}
													<span class="rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-400"
														>Current User</span
													>
												{/if}
												<a
													href="/admin/customers/{user.id}"
													class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-gray-600 hover:text-white"
												>
													View
												</a>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
						{#if filteredUsers.length > 20}
							<div class="border-t border-gray-800 bg-gray-800/30 p-4 text-center">
								<p class="text-sm text-gray-400">
									Showing first 20 of {filteredUsers.length} users. Use search to find more.
								</p>
							</div>
						{/if}
						{#if filteredUsers.length === 0}
							<div class="border-t border-gray-800 p-12 text-center">
								<svg
									class="mx-auto mb-4 h-12 w-12 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
								<p class="text-gray-400">No users found matching "{userSearchQuery}"</p>
								<p class="mt-1 text-sm text-gray-500">Try a different search term</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</main>
	</div>
</div>
